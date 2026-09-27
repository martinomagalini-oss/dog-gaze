/**
 * Punto di ingresso: mette insieme scena, griglia, caricamento del modello,
 * contatore e pannello, e fa girare il ciclo di animazione.
 *
 * Stato attuale: fasi da 0 a 6.
 */
import * as THREE from 'three';
import { config, CARTELLA_MODELLI, DURATA_STORICO } from './config.js';
import { creaScena } from './scene.js';
import { Griglia } from './grid.js';
import { creaSegnaposto } from './segnaposto.js';
import { Sguardo } from './lookAt.js';
import { StoricoBersaglio } from './targetHistory.js';
import { Pallina } from './ball.js';
import { Sonno } from './sonno.js';
import { Coreografia } from './coreografia.js';
import { componiPose } from './posa.js';
import { creaContatore } from './contatore.js';
import {
  caricaDaUrl,
  caricaDaFile,
  collegaTrascinamento,
  apriSelettoreFile,
} from './modelLoader.js';
import { creaPannello } from './ui.js';

const contenitoreScena = document.getElementById('scena');
const contenitorePannello = document.getElementById('pannello');

// ---------- Scena ----------
const {
  renderer,
  scena,
  camera,
  adattaAllaFinestra,
  aggiornaDaConfig,
  ridisegnaAmbiente,
} = creaScena(contenitoreScena);

// Il pannello a destra cambia la larghezza disponibile per la scena:
// osserviamo il contenitore invece di affidarci solo all'evento resize.
new ResizeObserver(adattaAllaFinestra).observe(contenitoreScena);

// ---------- Griglia ----------
const griglia = new Griglia(scena);

// ---------- Contatore prestazioni ----------
const contatore = creaContatore(contenitoreScena);
contatore.impostaVisibile(config.mostraContatore);

// ---------- Messaggi di stato ----------
const messaggio = document.createElement('div');
messaggio.id = 'messaggio';
contenitoreScena.appendChild(messaggio);

let timerMessaggio = null;
function mostraMessaggio(testo, { errore = false, durata = 3000 } = {}) {
  clearTimeout(timerMessaggio);
  messaggio.textContent = testo;
  messaggio.classList.toggle('errore', errore);
  messaggio.classList.add('visibile');
  if (durata > 0) {
    timerMessaggio = setTimeout(
      () => messaggio.classList.remove('visibile'),
      durata
    );
  }
}

// ---------- Sguardo ----------
const sguardo = new Sguardo(griglia);

// Storico delle posizioni del bersaglio, per l'effetto onda.
const storico = new StoricoBersaglio(DURATA_STORICO);

// ---------- Pallina ----------
const pallina = new Pallina(scena);

// ---------- Coreografie ----------
const coreografia = new Coreografia(griglia);

// ---------- Sonno ----------
const sonno = new Sonno(griglia, scena);

// Da quanto tempo il bersaglio non si muove, e dov'era l'ultima volta.
// In modalita' pallina il conto parte da solo quando la pallina e' in pausa:
// finche' vola, la posizione cambia a ogni fotogramma.
let tempoImmobile = 0;
const ultimaPosizioneBersaglio = new THREE.Vector3();

// Sotto questo spostamento consideriamo il bersaglio fermo. Serve perche'
// un mouse appoggiato sulla scrivania manda comunque microspostamenti.
const SOGLIA_IMMOBILITA = 0.01;

// ---------- Bersaglio: il cursore del mouse ----------
// Il punto guardato non sta sul piano delle teste ma DAVANTI, verso chi
// guarda: e' cosi' che le teste sembrano guardare fuori dallo schermo.
const bersaglio = new THREE.Vector3();
const puntoSchermo = new THREE.Vector3();
let bersaglioAttivo = false;

function aggiornaBersaglioDalMouse(evento) {
  const area = contenitoreScena.getBoundingClientRect();
  if (area.width === 0 || area.height === 0) return;

  // Il mouse rientra dopo essere uscito: lo storico contiene ancora il
  // percorso di prima. Senza svuotarlo i cani andrebbero a pescare una
  // posizione vecchia e farebbero uno scatto verso un punto che non esiste.
  if (!bersaglioAttivo) storico.svuota();

  // Da pixel della finestra a coordinate normalizzate (-1 .. +1).
  const nx = ((evento.clientX - area.left) / area.width) * 2 - 1;
  const ny = -((evento.clientY - area.top) / area.height) * 2 + 1;

  // unproject() le riporta in unita' di mondo. Con la camera ortografica
  // x e y non dipendono dalla profondita', quindi va bene qualsiasi z.
  puntoSchermo.set(nx, ny, 0).unproject(camera);

  bersaglio.set(puntoSchermo.x, puntoSchermo.y, config.distanzaBersaglio);
  bersaglioAttivo = true;
}

contenitoreScena.addEventListener('pointermove', (evento) => {
  if (config.modalitaBersaglio !== 'mouse') return;
  aggiornaBersaglioDalMouse(evento);
});

contenitoreScena.addEventListener('pointerleave', () => {
  if (config.modalitaBersaglio !== 'mouse') return;
  bersaglioAttivo = false;
});

/**
 * Passaggio fra mouse e pallina. Lo storico va svuotato: contiene il
 * percorso del bersaglio precedente, e senza ripulirlo i cani andrebbero a
 * pescare posizioni che appartengono all'altra modalita'.
 */
function applicaModalita() {
  const conPallina = config.modalitaBersaglio === 'pallina';
  pallina.impostaVisibile(conPallina);
  storico.svuota();
  bersaglioAttivo = false;
  if (conPallina) pallina.reimposta();
}

// ---------- Pannello ----------
const pannello = creaPannello(contenitorePannello, {
  alCambioGriglia: () => griglia.ricostruisci(),
  alCambioAspetto: () => {
    aggiornaDaConfig();
    contatore.impostaVisibile(config.mostraContatore);
  },
  alCambioModello: () => caricaModelloIncluso(config.modelloIncluso),
  alCambioCalibrazione: applicaCalibrazione,
  alCambioPerno: () => griglia.aggiornaCentroRotazione(),
  alCambioAmbiente: ridisegnaAmbiente,
  alCambioModalita: applicaModalita,
  alClicPausa: (comando) => {
    config.pallinaInPausa = !config.pallinaInPausa;
    comando.name(config.pallinaInPausa ? 'Riprendi' : 'Pausa');
  },
  alClicRilancia: () => {
    pallina.reimposta();
    storico.svuota();
  },
  alClicCarica: () => apriSelettoreFile(caricaFileUtente),
});

// ---------- Caricamento del modello ----------

/** Traduce i gradi del pannello in radianti e li passa alla griglia. */
function applicaCalibrazione() {
  griglia.applicaCalibrazione(
    THREE.MathUtils.degToRad(config.calibrazioneX),
    THREE.MathUtils.degToRad(config.calibrazioneY),
    THREE.MathUtils.degToRad(config.calibrazioneZ)
  );
}

/** Mette il modello nella griglia e aggiorna il pannello. */
function usaModello(oggetto, nome, formato) {
  griglia.impostaSorgente(oggetto);
  applicaCalibrazione();
  pannello.mostraModelloCaricato(nome, formato);
}

/** Carica uno dei modelli gia' presenti nel progetto. */
async function caricaModelloIncluso(nomeFile) {
  if (nomeFile === 'segnaposto') {
    usaModello(creaSegnaposto(), 'segnaposto', 'interno');
    mostraMessaggio('Segnaposto attivo.');
    return;
  }

  mostraMessaggio(`Carico ${nomeFile}...`, { durata: 0 });
  try {
    const { oggetto, nome, formato } = await caricaDaUrl(
      CARTELLA_MODELLI + nomeFile
    );
    usaModello(oggetto, nome, formato);
    mostraMessaggio(`Caricato: ${nome}`);
  } catch (errore) {
    console.error(errore);
    mostraMessaggio(
      `Non sono riuscito a caricare ${nomeFile}. Uso il segnaposto.`,
      { errore: true, durata: 6000 }
    );
    usaModello(creaSegnaposto(), 'segnaposto', 'interno');
  }
}

/** Carica i file trascinati o scelti dall'utente. */
async function caricaFileUtente(elencoFile) {
  mostraMessaggio('Carico il file...', { durata: 0 });
  try {
    const { oggetto, nome, formato } = await caricaDaFile(elencoFile);
    usaModello(oggetto, nome, formato);
    mostraMessaggio(`Caricato: ${nome} (${formato})`);
  } catch (errore) {
    console.error(errore);
    mostraMessaggio(errore.message || 'Caricamento non riuscito.', {
      errore: true,
      durata: 6000,
    });
  }
}

collegaTrascinamento(contenitoreScena, caricaFileUtente);

applicaModalita();

// Partenza: carichiamo il modello scelto in config.
caricaModelloIncluso(config.modelloIncluso);

// ---------- Ciclo di animazione ----------
let ultimoIstante = performance.now();

renderer.setAnimationLoop(() => {
  const adesso = performance.now();

  // Limite di sicurezza sul passo temporale: se la scheda resta in secondo
  // piano il browser ferma il disegno, e al ritorno dt varrebbe parecchi
  // secondi. Senza il tetto le teste farebbero uno scatto improvviso.
  const dt = Math.min((adesso - ultimoIstante) / 1000, 0.1);
  ultimoIstante = adesso;

  // In modalita' pallina il bersaglio lo decide lei, non il mouse.
  if (config.modalitaBersaglio === 'pallina') {
    if (!config.pallinaInPausa) pallina.aggiorna(dt);
    bersaglio.copy(pallina.posizione);
    bersaglioAttivo = true;
  }

  // Lo storico si riempie solo quando il bersaglio esiste davvero.
  const tempoOra = adesso / 1000;
  if (bersaglioAttivo) storico.registra(bersaglio, tempoOra);

  // Il bersaglio si e' mosso? Se no, il conto verso il sonno avanza.
  if (
    bersaglioAttivo &&
    bersaglio.distanceTo(ultimaPosizioneBersaglio) > SOGLIA_IMMOBILITA
  ) {
    tempoImmobile = 0;
    ultimaPosizioneBersaglio.copy(bersaglio);
  } else {
    tempoImmobile += dt;
  }

  sguardo.aggiorna(
    dt,
    bersaglioAttivo ? bersaglio : null,
    storico,
    tempoOra
  );

  coreografia.aggiorna(dt);

  // Mentre e' in corso una coreografia il sonno resta sospeso: i cani stanno
  // ballando, non annoiandosi, anche se il bersaglio e' fermo.
  const puoDormire =
    config.coreografia === 'nessuna' &&
    tempoImmobile >= config.secondiPrimaDelSonno;

  sonno.aggiorna(dt, ultimaPosizioneBersaglio, puoDormire);

  // Ultimo passo: i tre contributi diventano una sola rotazione.
  componiPose(griglia);

  renderer.render(scena, camera);

  contatore.segnaFotogramma({
    teste: griglia.teste.length,
    triangoli: renderer.info.render.triangles,
  });
});
