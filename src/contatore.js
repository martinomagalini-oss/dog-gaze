/**
 * Contatore di prestazioni mostrato in sovrimpressione sulla scena.
 *
 * Perche' in sovrimpressione e non nel pannello: cosi' e' sempre sotto gli
 * occhi mentre si guarda l'animazione, senza dover spostare lo sguardo.
 *
 * Accorgimento importante: quando la finestra perde il fuoco o la scheda
 * passa in secondo piano, il browser mette in pausa il rendering. Al ritorno
 * il primo intervallo misurato contiene un solo fotogramma su parecchi
 * secondi, e darebbe un valore falso (0 o 1 fps) che poi resta congelato.
 * Per questo i campioni troppo lunghi vengono scartati.
 */

// Ogni quanto aggiornare il numero (ms). Mezzo secondo: abbastanza
// reattivo ma senza far sfarfallare le cifre.
const INTERVALLO = 500;

// Oltre questa durata l'intervallo e' considerato una pausa, non una misura.
const PAUSA_SOSPETTA = 1500;

export function creaContatore(contenitore) {
  const elemento = document.createElement('div');
  elemento.id = 'contatore';
  elemento.innerHTML =
    '<div class="riga-fps"><span id="valore-fps">--</span><span class="unita">fps</span></div>' +
    '<div class="riga-dettagli"><span id="dettagli-contatore">in avvio...</span></div>';
  contenitore.appendChild(elemento);

  const valoreFps = elemento.querySelector('#valore-fps');
  const dettagli = elemento.querySelector('#dettagli-contatore');

  let fotogrammi = 0;
  let ultimoCalcolo = performance.now();
  let fps = null;

  return {
    /** Da chiamare a ogni fotogramma. */
    segnaFotogramma({ teste, triangoli }) {
      fotogrammi++;

      const adesso = performance.now();
      const intervallo = adesso - ultimoCalcolo;
      if (intervallo < INTERVALLO) return;

      if (intervallo <= PAUSA_SOSPETTA) {
        fps = Math.round((fotogrammi * 1000) / intervallo);
      }
      // Se l'intervallo e' piu' lungo, la finestra era in pausa:
      // azzeriamo e aspettiamo il prossimo intervallo buono.

      fotogrammi = 0;
      ultimoCalcolo = adesso;

      valoreFps.textContent = fps === null ? '--' : fps;
      valoreFps.className = classeColore(fps);
      dettagli.textContent =
        `${teste} teste · ${triangoli.toLocaleString('it-IT')} triangoli`;
    },

    /** Mostra o nasconde il contatore (interruttore nel pannello). */
    impostaVisibile(visibile) {
      elemento.style.display = visibile ? 'block' : 'none';
    },
  };
}

/** Verde se scorre bene, giallo se e' al limite, rosso se arranca. */
function classeColore(fps) {
  if (fps === null) return 'neutro';
  if (fps >= 55) return 'buono';
  if (fps >= 30) return 'medio';
  return 'scarso';
}
