/**
 * Pannello di controllo (lil-gui).
 *
 * Il pannello scrive direttamente dentro l'oggetto `config` e avvisa
 * il resto dell'applicazione tramite le callback passate qui sotto.
 */
import GUI from 'lil-gui';
import { config, MIN_CELLE, MAX_CELLE, MODELLI_INCLUSI } from './config.js';
import { COREOGRAFIE } from './coreografia.js';

export function creaPannello(contenitore, callback) {
  const {
    alCambioGriglia,
    alCambioAspetto,
    alCambioModello,
    alCambioCalibrazione,
    alCambioPerno,
    alCambioAmbiente,
    alCambioModalita,
    alClicPausa,
    alClicRilancia,
    alClicCarica,
  } = callback;

  const gui = new GUI({ container: contenitore, title: 'Controlli' });

  // Testo informativo sul modello in uso. lil-gui non ha un campo di sola
  // lettura, quindi usiamo due controlli disattivati agganciati a un oggetto.
  const statoModello = { nome: '(in caricamento)', formato: '-' };

  // ---------- Modello ----------
  const cartellaModello = gui.addFolder('Modello');

  cartellaModello
    .add(config, 'modelloIncluso', MODELLI_INCLUSI)
    .name('Modello incluso')
    .onChange(alCambioModello);

  cartellaModello
    .add({ carica: alClicCarica }, 'carica')
    .name('Carica modello...');

  cartellaModello.add(statoModello, 'nome').name('File').disable().listen();
  cartellaModello.add(statoModello, 'formato').name('Formato').disable().listen();

  // ---------- Calibrazione orientamento ----------
  // Chiusa di default: il modello del cane e' gia' dritto e non serve.
  // Resta come sicurezza se un domani si carica un modello storto.
  const cartellaCalibrazione = gui.addFolder('Calibrazione orientamento');

  const ruota = (asse) => () => {
    const chiave = 'calibrazione' + asse;
    config[chiave] = (config[chiave] + 90) % 360;
    alCambioCalibrazione();
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  };

  cartellaCalibrazione
    .add({ f: ruota('X') }, 'f')
    .name('Ruota 90 gradi su X');
  cartellaCalibrazione
    .add({ f: ruota('Y') }, 'f')
    .name('Ruota 90 gradi su Y');
  cartellaCalibrazione
    .add({ f: ruota('Z') }, 'f')
    .name('Ruota 90 gradi su Z');

  cartellaCalibrazione
    .add(
      {
        f: () => {
          config.calibrazioneX = 0;
          config.calibrazioneY = 0;
          config.calibrazioneZ = 0;
          alCambioCalibrazione();
          gui.controllersRecursive().forEach((c) => c.updateDisplay());
        },
      },
      'f'
    )
    .name('Azzera');

  for (const asse of ['X', 'Y', 'Z']) {
    cartellaCalibrazione
      .add(config, 'calibrazione' + asse, 0, 359, 1)
      .name(`Gradi ${asse}`)
      .onChange(alCambioCalibrazione);
  }

  cartellaCalibrazione.close();

  // ---------- Griglia ----------
  const cartellaGriglia = gui.addFolder('Griglia');

  cartellaGriglia
    .add(config, 'righe', MIN_CELLE, MAX_CELLE, 1)
    .name('Righe')
    .onChange(alCambioGriglia);

  cartellaGriglia
    .add(config, 'colonne', MIN_CELLE, MAX_CELLE, 1)
    .name('Colonne')
    .onChange(alCambioGriglia);

  cartellaGriglia
    .add(config, 'dimensioneTesta', 20, 100, 1)
    .name('Dimensione testa (%)')
    .onChange(alCambioGriglia);

  // ---------- Sguardo ----------
  const cartellaSguardo = gui.addFolder('Sguardo');

  cartellaSguardo
    .add(config, 'distanzaBersaglio', 1, 25, 0.5)
    .name('Distanza bersaglio');

  cartellaSguardo
    .add(config, 'centroRotazione', 0, 80, 1)
    .name('Perno verso la nuca (%)')
    .onChange(alCambioPerno);

  cartellaSguardo
    .add(config, 'raggioAttenzione', 0, 100, 1)
    .name('Raggio attenzione (%)');

  cartellaSguardo
    .add(config, 'sfumaturaAttenzione', 0, 100, 1)
    .name('Sfumatura attenzione (%)');

  cartellaSguardo
    .add(config, 'attenzioneMinima', 0, 100, 1)
    .name('Reazione dei lontani (%)');

  cartellaSguardo
    .add(config, 'limiteYaw', 0, 90, 1)
    .name('Limite sinistra/destra');

  cartellaSguardo
    .add(config, 'limitePitch', 0, 70, 1)
    .name('Limite su/giu');

  cartellaSguardo
    .add(config, 'velocitaSguardo', 1, 45, 0.5)
    .name('Prontezza');

  cartellaSguardo
    .add(config, 'velocitaRitorno', 0.5, 10, 0.1)
    .name('Ritorno a riposo');

  // ---------- Pallina ----------
  const cartellaPallina = gui.addFolder('Pallina');

  cartellaPallina
    .add(config, 'modalitaBersaglio', { 'Il mouse': 'mouse', 'La pallina': 'pallina' })
    .name('I cani guardano')
    .onChange(alCambioModalita);

  const comandoPausa = cartellaPallina
    .add({ f: () => alClicPausa(comandoPausa) }, 'f')
    .name('Pausa');

  cartellaPallina
    .add({ f: alClicRilancia }, 'f')
    .name('Rilancia dal centro');

  cartellaPallina
    .add(config, 'velocitaPallina', 0.5, 15, 0.1)
    .name('Velocita');

  cartellaPallina
    .add(config, 'raggioPallina', 0.08, 1.2, 0.01)
    .name('Dimensione');

  cartellaPallina
    .add(config, 'velocitaRotazione', 0, 400, 5)
    .name('Velocita rotazione (%)');

  cartellaPallina
    .add(config, 'deviazioneRimbalzo', 0, 45, 1)
    .name('Casualita rimbalzo');

  cartellaPallina
    .add(config, 'curvaturaVolo', 0, 90, 1)
    .name('Curvatura del volo');

  cartellaPallina
    .add(config, 'angoloMinimoMuro', 0, 45, 1)
    .name('Angolo minimo dal muro');

  // ---------- Onda ----------
  const cartellaOnda = gui.addFolder('Onda');

  cartellaOnda
    .add(config, 'intensitaOnda', 0, 100, 1)
    .name('Intensita onda (%)');

  cartellaOnda
    .add(config, 'ritardoMassimo', 0, 900, 10)
    .name('Ritardo max (ms)');

  cartellaOnda
    .add(config, 'variazionePerTesta', 0, 40, 1)
    .name('Variazione fra cani (%)');

  // ---------- Coreografie ----------
  const cartellaCoreo = gui.addFolder('Coreografie');

  cartellaCoreo
    .add(config, 'coreografia', COREOGRAFIE)
    .name('Coreografia');

  cartellaCoreo
    .add(config, 'giroCompleto')
    .name('Giro completo');

  cartellaCoreo
    .add(config, 'velocitaCoreografia', 0.02, 2, 0.01)
    .name('Giri al secondo');

  cartellaCoreo
    .add(config, 'intensitaCoreografia', 0, 70, 1)
    .name('Ampiezza dondolio');

  cartellaCoreo
    .add(config, 'sfasamentoCoreografia', 0, 100, 1)
    .name('Sfasamento fra cani (%)');

  cartellaCoreo
    .add(config, 'pesoSguardo', 0, 100, 1)
    .name('Peso sguardo (%)');

  // ---------- Sonno ----------
  const cartellaSonno = gui.addFolder('Sonno');

  cartellaSonno.add(config, 'sonnoAttivo').name('Sonno attivo');

  cartellaSonno
    .add(config, 'secondiPrimaDelSonno', 1, 60, 1)
    .name('Secondi prima del sonno');

  cartellaSonno
    .add(config, 'casualitaOrdineSonno', 0, 100, 1)
    .name('Casualita ordine (%)');

  cartellaSonno
    .add(config, 'intervalloAddormentamento', 0, 1.5, 0.05)
    .name('Ritmo addormentamento (s)');

  cartellaSonno
    .add(config, 'abbassamentoSonno', 0, 70, 1)
    .name('Muso in giu (gradi)');

  cartellaSonno
    .add(config, 'inclinazioneSonno', 0, 40, 1)
    .name('Piega laterale (gradi)');

  cartellaSonno.add(config, 'mostraZ').name('Mostra le Z');

  // ---------- Aspetto ----------
  const cartellaAspetto = gui.addFolder('Aspetto');

  cartellaAspetto
    .addColor(config, 'coloreSfondo')
    .name('Colore sfondo')
    .onChange(alCambioAspetto);

  cartellaAspetto
    .add(config, 'mostraBordoArea')
    .name('Mostra bordo area')
    .onChange(alCambioAspetto);

  cartellaAspetto
    .add(config, 'mostraContatore')
    .name('Mostra contatore fps')
    .onChange(alCambioAspetto);

  // ---------- Luci ----------
  const cartellaLuci = gui.addFolder('Luci');

  cartellaLuci
    .add(config, 'esposizione', 0.2, 2.5, 0.05)
    .name('Esposizione')
    .onChange(alCambioAspetto);

  cartellaLuci
    .add(config, 'usaAmbiente')
    .name('Luce d ambiente')
    .onChange(alCambioAspetto);

  cartellaLuci
    .add(config, 'intensitaAmbienteMappa', 0, 3, 0.05)
    .name('Forza ambiente')
    .onChange(alCambioAspetto);

  cartellaLuci
    .addColor(config, 'coloreCielo')
    .name('Colore dall alto')
    .onChange(alCambioAmbiente);

  cartellaLuci
    .addColor(config, 'coloreTerra')
    .name('Colore dal basso')
    .onChange(alCambioAmbiente);

  cartellaLuci
    .add(config, 'intensitaFari', 0, 200, 5)
    .name('Pannelli luminosi (%)')
    .onChange(alCambioAmbiente);

  cartellaLuci
    .add(config, 'intensitaAmbiente', 0, 3, 0.05)
    .name('Luce piatta')
    .onChange(alCambioAspetto);

  cartellaLuci
    .add(config, 'intensitaDirezionale', 0, 4, 0.05)
    .name('Luce diretta')
    .onChange(alCambioAspetto);

  cartellaLuci.close();

  return {
    gui,
    /** Aggiorna il nome e il formato del file mostrati nel pannello. */
    mostraModelloCaricato(nome, formato) {
      statoModello.nome = nome;
      statoModello.formato = formato;
    },
  };
}
