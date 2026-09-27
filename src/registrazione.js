/**
 * Registrazione video di quello che succede nell'area.
 *
 * COSA FINISCE NEL VIDEO
 * Solo il rettangolo 9:19,5, non tutta la finestra. Il video esce quindi
 * gia' in formato verticale, senza i margini vuoti attorno e senza il
 * contatore dei fotogrammi: quello e' scritto nella pagina, non dentro la
 * scena 3D, quindi non viene ripreso.
 *
 * COME FUNZIONA
 * A ogni fotogramma si ritaglia il rettangolo dal canvas della scena e lo si
 * copia su un secondo canvas nascosto, delle dimensioni esatte del video.
 * E' quel secondo canvas che viene registrato.
 *
 * Il ritaglio si decide una volta sola, alla partenza: se si ridimensiona la
 * finestra mentre si registra, l'immagine viene riadattata a quella misura
 * invece di cambiare formato a meta' video, cosa che spezzerebbe il file.
 */
import { config, AREA_ALTEZZA, AREA_LARGHEZZA } from './config.js';

// Formati provati in ordine: l'mp4 va dappertutto ed e' comodo da montare,
// il webm e' il ripiego quando il browser non sa produrre mp4.
const FORMATI = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export class Registratore {
  constructor(contenitore, renderer, camera, impostaScalaPixel) {
    this.renderer = renderer;
    this.impostaScalaPixel = impostaScalaPixel;
    this.camera = camera;
    this.canvasScena = renderer.domElement;

    this.formato = FORMATI.find(
      (t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)
    );

    // Canvas nascosto: e' quello che viene davvero registrato.
    this.canvasVideo = document.createElement('canvas');
    this.ctx = this.canvasVideo.getContext('2d');

    this.registratore = null;
    this.pezzi = [];
    this.inizio = 0;
    this.indirizzoScarico = null;
    this.ritaglio = null;

    this._creaInterfaccia(contenitore);
  }

  get staRegistrando() {
    return this.registratore !== null && this.registratore.state === 'recording';
  }

  /**
   * Dove si trova il rettangolo dell'area dentro il canvas, in pixel veri.
   *
   * La camera e' ortografica e centrata sull'origine, come l'area: basta
   * quindi sapere quanti pixel vale un'unita' di mondo e ricavare il resto.
   */
  _areaInPixel() {
    const canvas = this.canvasScena;
    const altezzaVista = this.camera.top - this.camera.bottom;
    if (altezzaVista <= 0) return null;

    const pixelPerUnita = canvas.height / altezzaVista;

    const larghezza = AREA_LARGHEZZA * pixelPerUnita;
    const altezza = AREA_ALTEZZA * pixelPerUnita;

    return {
      x: (canvas.width - larghezza) / 2,
      y: (canvas.height - altezza) / 2,
      larghezza,
      altezza,
    };
  }

  avvia() {
    if (this.staRegistrando) return;

    if (!this.formato) {
      this._mostraErrore('Questo browser non sa registrare video.');
      return;
    }


    // Si alza la definizione PRIMA di misurare il ritaglio, altrimenti si
    // registrerebbe a una misura e si disegnerebbe a un'altra.
    this.impostaScalaPixel(config.risoluzioneVideo);

    const area = this._areaInPixel();
    if (!area) {
      this.impostaScalaPixel(null);
      return;
    }

    const soloArea = config.registraSoloArea;
    const sorgente = soloArea
      ? area
      : {
          x: 0,
          y: 0,
          larghezza: this.canvasScena.width,
          altezza: this.canvasScena.height,
        };

    // I codec video vogliono lati pari: un numero dispari fa fallire
    // l'avvio senza dire perche'.
    this.canvasVideo.width = pari(sorgente.larghezza);
    this.canvasVideo.height = pari(sorgente.altezza);
    this.ritaglio = sorgente;

    const flusso = this.canvasVideo.captureStream(0);
    this.traccia = flusso.getVideoTracks()[0];

    this.pezzi = [];
    this.registratore = new MediaRecorder(flusso, {
      mimeType: this.formato,
      videoBitsPerSecond: config.qualitaVideo * 1000000,
    });

    this.registratore.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.pezzi.push(e.data);
    };
    this.registratore.onstop = () => this._concludi();

    this.registratore.start();
    this.inizio = performance.now();

    this._liberaScarico();
    this.elemento.classList.add('in-corso');
    this.etichetta.textContent = 'Stop';
  }

  ferma() {
    if (!this.staRegistrando) return;
    this.registratore.stop();
  }

  alterna() {
    if (this.staRegistrando) this.ferma();
    else this.avvia();
  }

  /**
   * Copia il fotogramma appena disegnato dentro il canvas del video.
   * Va chiamata SUBITO dopo renderer.render(), nello stesso giro: dopo, il
   * browser potrebbe aver gia' svuotato il buffer di disegno.
   */
  catturaFotogramma() {
    if (!this.staRegistrando) return;

    const r = this.ritaglio;
    this.ctx.drawImage(
      this.canvasScena,
      r.x,
      r.y,
      r.larghezza,
      r.altezza,
      0,
      0,
      this.canvasVideo.width,
      this.canvasVideo.height
    );

    this.traccia.requestFrame();

    const secondi = (performance.now() - this.inizio) / 1000;
    this.tempo.textContent = formattaDurata(secondi);
  }

  _concludi() {
    // Si torna subito alla definizione normale: tenerla alta costa lavoro
    // alla scheda video e non serve piu' a niente.
    this.impostaScalaPixel(null);

    const blob = new Blob(this.pezzi, { type: this.formato });
    this.pezzi = [];
    this.registratore = null;

    this.elemento.classList.remove('in-corso');
    this.etichetta.textContent = 'Registra';

    this.indirizzoScarico = URL.createObjectURL(blob);

    const estensione = this.formato.includes('mp4') ? 'mp4' : 'webm';
    this.scarico.href = this.indirizzoScarico;
    this.scarico.download = `cani-${marcaTemporale()}.${estensione}`;
    this.scarico.textContent = `Scarica il video (${megabyte(blob.size)} MB)`;
    this.scarico.hidden = false;
  }

  _liberaScarico() {
    if (this.indirizzoScarico) {
      URL.revokeObjectURL(this.indirizzoScarico);
      this.indirizzoScarico = null;
    }
    this.scarico.hidden = true;
    this.tempo.textContent = '0:00';
  }

  _mostraErrore(testo) {
    this.scarico.hidden = false;
    this.scarico.removeAttribute('href');
    this.scarico.textContent = testo;
  }

  _creaInterfaccia(contenitore) {
    const box = document.createElement('div');
    box.id = 'registratore';

    const bottone = document.createElement('button');
    bottone.id = 'bottone-rec';
    bottone.innerHTML =
      '<span class="pallino"></span><span class="etichetta">Registra</span>';
    bottone.addEventListener('click', () => this.alterna());

    const tempo = document.createElement('div');
    tempo.className = 'tempo-rec';
    tempo.textContent = '0:00';

    const scarico = document.createElement('a');
    scarico.className = 'scarico-rec';
    scarico.hidden = true;

    box.append(bottone, tempo, scarico);
    contenitore.appendChild(box);

    this.elemento = box;
    this.etichetta = bottone.querySelector('.etichetta');
    this.tempo = tempo;
    this.scarico = scarico;
  }
}

/** Arrotonda a un numero pari, mai sotto 2. */
function pari(n) {
  return Math.max(2, Math.round(n / 2) * 2);
}

function formattaDurata(secondi) {
  const m = Math.floor(secondi / 60);
  const s = Math.floor(secondi % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function megabyte(byte) {
  return (byte / (1024 * 1024)).toFixed(1);
}

/** Data e ora compatte, per non sovrascrivere i video precedenti. */
function marcaTemporale() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}
