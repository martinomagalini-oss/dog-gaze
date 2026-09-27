/**
 * Calcolo delle rotazioni dello sguardo.
 *
 * Ogni testa guarda un punto nello spazio posto DAVANTI al piano della
 * griglia, verso chi guarda lo schermo. Da li' si ricavano due angoli:
 *   - imbardata (yaw)    = rotazione sinistra/destra, attorno all'asse Y
 *   - beccheggio (pitch) = rotazione su/giu', attorno all'asse X
 * Il rollio non si usa mai: un cane non piega la testa di lato per guardare.
 *
 * L'ordine di rotazione e' 'YXZ': prima gira il collo di lato, poi alza o
 * abbassa il muso. Con l'ordine normale 'XYZ' la testa acquisirebbe un
 * rollio parassita quando guarda in diagonale, e sembrerebbe storta.
 *
 * AREA DI ATTENZIONE
 * L'imbardata da sola dipende solo dallo scostamento orizzontale: un cane in
 * cima alla griglia si girerebbe di lato esattamente quanto quello che ha il
 * bersaglio davanti, e intere righe sembrerebbero muoversi all'unisono.
 * Per questo la rotazione viene moltiplicata per un peso che dipende dalla
 * distanza vera nel piano: pieno entro il raggio, poi sfuma dolcemente fino
 * a un residuo minimo.
 *
 * EFFETTO ONDA
 * Nessun cane guarda dove sta il bersaglio adesso: guarda dov'era un attimo
 * fa, e piu' e' lontano piu' va indietro. I vicini partono per primi, gli
 * altri a seguire, e il movimento attraversa la griglia come un'onda.
 */
import * as THREE from 'three';
import {
  config,
  AREA_ALTEZZA,
  AREA_LARGHEZZA,
  VELOCITA_FILTRO_RITARDO,
} from './config.js';

// Distanza massima possibile fra un cane e il bersaglio dentro l'area.
// Fa da ripiego quando l'area di attenzione e' disattivata.
const DIAGONALE_AREA = Math.hypot(AREA_LARGHEZZA, AREA_ALTEZZA);

export class Sguardo {
  constructor(griglia) {
    this.griglia = griglia;
    // Vettore riutilizzato per leggere lo storico: evita di crearne uno
    // nuovo per ogni cane a ogni fotogramma.
    this._posizioneRitardata = new THREE.Vector3();
  }

  /**
   * Aggiorna la rotazione di tutte le teste.
   *
   * @param {number} dt         secondi trascorsi dall'ultimo fotogramma
   * @param {THREE.Vector3|null} bersaglio  dove sta il bersaglio adesso,
   *                            oppure null per far tornare le teste dritte
   * @param {StoricoBersaglio} storico  posizioni passate del bersaglio
   * @param {number} tempoOra   istante attuale in secondi
   */
  aggiorna(dt, bersaglio, storico, tempoOra) {
    const limiteYaw = THREE.MathUtils.degToRad(config.limiteYaw);
    const limitePitch = THREE.MathUtils.degToRad(config.limitePitch);

    const raggio = (AREA_ALTEZZA * config.raggioAttenzione) / 100;
    const sfumatura = (AREA_ALTEZZA * config.sfumaturaAttenzione) / 100;
    const minima = config.attenzioneMinima / 100;

    // Oltre questa distanza il gesto e' gia' spento: e' il metro su cui
    // distribuire il ritardo dell'onda.
    const estensioneAttenzione = raggio + sfumatura || DIAGONALE_AREA;

    const ritardoMassimo = config.ritardoMassimo / 1000; // da ms a secondi
    const intensitaOnda = config.intensitaOnda / 100;
    const variazione = config.variazionePerTesta / 100;

    const fattoreRitardo = 1 - Math.exp(-VELOCITA_FILTRO_RITARDO * dt);
    const velocitaBase = bersaglio
      ? config.velocitaSguardo
      : config.velocitaRitorno;

    for (const testa of this.griglia.teste) {
      if (testa.yawAttuale === undefined) {
        testa.yawAttuale = 0;
        testa.pitchAttuale = 0;
        testa.ritardoAttuale = 0;
      }

      // Ogni cane e' un po' piu' pronto o un po' piu' pigro degli altri,
      // sempre nello stesso modo: il seme non cambia finche' vive la testa.
      const carattere = 1 + (testa.seme * 2 - 1) * variazione;
      const fattore = 1 - Math.exp(-velocitaBase * carattere * dt);

      let yawVoluto = 0;
      let pitchVoluto = 0;

      if (bersaglio) {
        // --- ritardo dell'onda ---
        // Si misura sulla posizione ATTUALE del bersaglio: e' la distanza di
        // adesso che dice quanto questo cane e' "coinvolto", non quella di
        // mezzo secondo fa.
        const distanzaOra = Math.hypot(
          bersaglio.x - testa.posizione.x,
          bersaglio.y - testa.posizione.y
        );
        // Il ritardo si misura sulla ZONA DI ATTENZIONE, non sull'intera
        // area. Misurandolo sulla diagonale, un cane col ritardo massimo si
        // troverebbe gia' fuori dalla zona viva e si muoverebbe del 5%:
        // l'onda esisterebbe nei numeri ma non si vedrebbe. Agganciandola
        // alla zona di attenzione, il ritardo si distribuisce tutto fra i
        // cani che si muovono davvero. Se l'attenzione copre tutta l'area,
        // le due misure coincidono.
        const frazione = Math.min(distanzaOra / estensioneAttenzione, 1);
        const ritardoVoluto = frazione * intensitaOnda * ritardoMassimo;

        // Il ritardo si muove con calma verso il valore voluto, non a scatti:
        // vedi VELOCITA_FILTRO_RITARDO in config.js.
        testa.ritardoAttuale +=
          (ritardoVoluto - testa.ritardoAttuale) * fattoreRitardo;

        // --- dove guardare ---
        const meta = this._posizioneRitardata;
        if (!storico.posizioneA(tempoOra - testa.ritardoAttuale, meta)) {
          meta.copy(bersaglio);
        }

        const dx = meta.x - testa.posizione.x;
        const dy = meta.y - testa.posizione.y;
        const dz = meta.z;

        const lunghezza = Math.hypot(dx, dy, dz) || 1;

        // Il muso guarda verso +Z, cioe' fuori dallo schermo.
        yawVoluto = THREE.MathUtils.clamp(
          Math.atan2(dx, dz),
          -limiteYaw,
          limiteYaw
        );
        pitchVoluto = THREE.MathUtils.clamp(
          -Math.asin(dy / lunghezza),
          -limitePitch,
          limitePitch
        );

        // Peso dell'attenzione, calcolato sul punto che il cane sta davvero
        // guardando: cosi' l'intensita' del gesto e la sua direzione
        // raccontano la stessa cosa.
        const attenzione = pesoAttenzione(
          Math.hypot(dx, dy),
          raggio,
          sfumatura,
          minima
        );
        yawVoluto *= attenzione;
        pitchVoluto *= attenzione;
      }

      // Qui ci si ferma: gli angoli restano scritti sulla testa e sara'
      // posa.js a metterli davvero nella rotazione, dopo averli mescolati
      // con sonno e coreografia. Se ogni modulo scrivesse per conto suo,
      // l'ultimo a parlare cancellerebbe il lavoro degli altri.
      testa.yawAttuale += (yawVoluto - testa.yawAttuale) * fattore;
      testa.pitchAttuale += (pitchVoluto - testa.pitchAttuale) * fattore;
    }
  }
}

/**
 * Quanto una testa reagisce al bersaglio, da 1 (pienamente) a `minima`.
 *
 * Entro `raggio` vale 1. Oltre, scende lungo la banda `sfumatura` seguendo
 * una curva a S (smoothstep): senza di quella si vedrebbe una linea netta
 * fra i cani che reagiscono e quelli fermi, e muovendo il mouse si
 * noterebbe lo scatto delle teste che entrano ed escono dall'area.
 */
function pesoAttenzione(distanza, raggio, sfumatura, minima) {
  if (distanza <= raggio) return 1;
  if (sfumatura <= 0) return minima;

  const t = Math.min((distanza - raggio) / sfumatura, 1);
  const curvaS = t * t * (3 - 2 * t);
  return 1 - curvaS * (1 - minima);
}
