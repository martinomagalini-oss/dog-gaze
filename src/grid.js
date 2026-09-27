/**
 * Creazione e aggiornamento della griglia di teste.
 *
 * Struttura di ogni testa (come da brief):
 *   gruppoCella        -> posizione nella griglia + scala
 *     gruppoSguardo    -> rotazione dello sguardo   (fasi 3-4-6)
 *       gruppoCalibrazione -> correzione orientamento del modello (fase 2)
 *         modello      -> mesh clonata (geometrie e materiali condivisi)
 *
 * Il resto del codice tocca SOLO `testa.gruppoSguardo`: cosi' se un domani
 * cambiassimo il modo di disegnare le teste (per esempio con InstancedMesh
 * per guadagnare prestazioni), lookAt.js non andrebbe riscritto.
 */
import * as THREE from 'three';
import { clone as clonaConScheletro } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { config, AREA_ALTEZZA, AREA_LARGHEZZA } from './config.js';

export class Griglia {
  constructor(scena) {
    this.scena = scena;

    // Contenitore di tutte le teste: cosi' svuotare la griglia e' immediato.
    this.radice = new THREE.Group();
    this.radice.name = 'griglia';
    this.scena.add(this.radice);

    // Modello da clonare, centrato sull'origine ma NON scalato.
    this.sorgente = null;

    // Ingombro del modello, usato per calcolare quanto rimpicciolirlo.
    this.dimensioniSorgente = new THREE.Vector3(1, 1, 1);

    // Correzione di orientamento del modello. La teniamo qui perche' deve
    // sopravvivere alla ricostruzione della griglia: altrimenti cambiando
    // righe o colonne si perderebbe.
    this.calibrazione = new THREE.Euler(0, 0, 0);

    // Elenco delle teste create dall'ultima ricostruzione.
    this.teste = [];
  }

  /**
   * Imposta il modello da usare per tutte le celle.
   * L'oggetto viene centrato sul suo bounding box; la scala vera e' calcolata
   * poi in ricostruisci(), perche' dipende dalla dimensione della cella.
   */
  impostaSorgente(oggetto) {
    if (this.sorgente) this._liberaSorgente();

    const riquadro = new THREE.Box3().setFromObject(oggetto);
    riquadro.getSize(this.dimensioniSorgente);
    const centro = riquadro.getCenter(new THREE.Vector3());

    // Sposto l'oggetto dentro un involucro in modo che il centro del
    // bounding box finisca esattamente sull'origine: cosi' la testa ruota
    // attorno al proprio centro e non attorno a un punto qualsiasi.
    const involucro = new THREE.Group();
    involucro.name = 'modelloCentrato';
    oggetto.position.sub(centro);
    involucro.add(oggetto);

    this.sorgente = involucro;
    this.ricostruisci();
  }

  /**
   * Ricrea tutte le teste leggendo righe/colonne/dimensione da config.
   * Va chiamata ogni volta che uno di quei valori cambia.
   */
  ricostruisci() {
    this._svuota();
    if (!this.sorgente) return;

    const righe = Math.max(1, Math.round(config.righe));
    const colonne = Math.max(1, Math.round(config.colonne));

    // Dimensioni di una cella in unita' di mondo.
    const larghezzaCella = AREA_LARGHEZZA / colonne;
    const altezzaCella = AREA_ALTEZZA / righe;

    // Usiamo il lato piu' corto della cella per non uscire dai bordi.
    const latoCorto = Math.min(larghezzaCella, altezzaCella);
    const scala = latoCorto * (config.dimensioneTesta / 100) * this._scalaUnitaria();

    for (let r = 0; r < righe; r++) {
      for (let c = 0; c < colonne; c++) {
        // Centro della cella. La riga 0 e' in alto.
        const x = -AREA_LARGHEZZA / 2 + (c + 0.5) * larghezzaCella;
        const y = AREA_ALTEZZA / 2 - (r + 0.5) * altezzaCella;

        this.teste.push(this._creaTesta(x, y, scala, r, c));
      }
    }
  }

  /**
   * Applica la correzione di orientamento a TUTTE le copie.
   * Gli angoli sono in radianti.
   *
   * Qui si ruota e basta: la scala non viene toccata. Vedi _scalaUnitaria()
   * per il motivo.
   */
  applicaCalibrazione(x, y, z) {
    this.calibrazione.set(x, y, z);
    for (const testa of this.teste) {
      testa.gruppoCalibrazione.rotation.copy(this.calibrazione);
    }
  }

  /**
   * Fattore che porta il modello dentro un cubo unitario.
   *
   * Usiamo solo LARGHEZZA e ALTEZZA, non la profondita': la camera e'
   * ortografica e guarda le teste di fronte, quindi la profondita' non
   * incide su quanto grande appare la testa. Tenerne conto la
   * rimpicciolirebbe inutilmente, perche' nel cane l'asse piu' lungo e' il
   * muso, che di fronte non si vede.
   *
   * Il valore NON dipende dalla calibrazione, di proposito: ruotare deve
   * solo ruotare, mai cambiare la dimensione. Vale anche per lo sguardo
   * delle fasi successive, dove le teste girano in continuazione: se la
   * scala inseguisse la rotazione, le teste pulserebbero a ogni movimento.
   *
   * Conseguenza accettata: un modello calibrato di 90 gradi mostra la sua
   * profondita' e puo' sbordare dalla cella. In quel caso si abbassa
   * "Dimensione testa" dal pannello.
   */
  _scalaUnitaria() {
    const d = this.dimensioniSorgente;
    return 1 / (Math.max(d.x, d.y) || 1);
  }

  /**
   * Di quanto spostare il modello in avanti perche' la rotazione avvenga
   * attorno a un punto arretrato verso la nuca invece che attorno al centro
   * del bounding box.
   *
   * Spostare il modello lungo Z non cambia nulla a video: la camera e'
   * ortografica, quindi la profondita' non sposta ne' rimpicciolisce niente.
   * Cambia pero' il punto attorno a cui ruota, e quindi l'ampiezza dell'arco
   * descritto dal muso: e' la differenza fra una testa che pivota su se
   * stessa e una attaccata a un collo.
   */
  _spostamentoPerno() {
    const profondita = this.dimensioniSorgente.z * this._scalaUnitaria();
    return profondita * (config.centroRotazione / 100);
  }

  /** Riapplica il perno a tutte le teste gia' create. */
  aggiornaCentroRotazione() {
    const spostamento = this._spostamentoPerno();
    for (const testa of this.teste) {
      testa.gruppoCalibrazione.position.z = spostamento;
    }
  }

  /**
   * Costruisce la catena di gruppi di una singola testa.
   */
  _creaTesta(x, y, scala, riga, colonna) {
    const gruppoCella = new THREE.Group();
    gruppoCella.position.set(x, y, 0);
    gruppoCella.scale.setScalar(scala);

    const gruppoSguardo = new THREE.Group();
    // 'YXZ': prima l'imbardata, poi il beccheggio. Con l'ordine normale
    // 'XYZ' la testa prenderebbe un rollio parassita guardando in diagonale.
    gruppoSguardo.rotation.order = 'YXZ';
    gruppoCella.add(gruppoSguardo);

    const gruppoCalibrazione = new THREE.Group();
    gruppoCalibrazione.rotation.copy(this.calibrazione);
    gruppoCalibrazione.position.z = this._spostamentoPerno();
    gruppoSguardo.add(gruppoCalibrazione);

    // Il clone duplica solo i nodi: geometrie, materiali e texture restano
    // condivisi con la sorgente, quindi la memoria non cresce con le copie.
    // Usiamo la versione di SkeletonUtils invece del semplice clone() perche'
    // gestisce anche i modelli con scheletro, che qualcuno potrebbe trascinare.
    const modello = clonaConScheletro(this.sorgente);
    gruppoCalibrazione.add(modello);

    this.radice.add(gruppoCella);

    return {
      gruppoCella,
      gruppoSguardo,
      gruppoCalibrazione,
      riga,
      colonna,
      // Posizione della testa nel piano, comoda per i calcoli delle fasi 3-4-6.
      posizione: new THREE.Vector2(x, y),
      // Numero casuale fisso, diverso per ogni cane: da' a ciascuno un
      // carattere leggermente suo. Lo usa l'onda per variare la prontezza e
      // servira' al sonno della fase 6 per sfasare respiro e ordine di
      // addormentamento. Cambia solo quando la griglia viene ricostruita.
      seme: Math.random(),
    };
  }

  /** Rimuove le teste dalla scena senza toccare geometrie e materiali. */
  _svuota() {
    for (const testa of this.teste) {
      this.radice.remove(testa.gruppoCella);
    }
    this.teste.length = 0;
  }

  /** Libera davvero geometrie, materiali e texture della sorgente. */
  _liberaSorgente() {
    this._svuota();
    this.sorgente.traverse((n) => {
      if (!n.isMesh) return;
      n.geometry?.dispose();
      const materiali = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of materiali) {
        if (!m) continue;
        for (const chiave of Object.keys(m)) {
          const valore = m[chiave];
          if (valore && valore.isTexture) valore.dispose();
        }
        m.dispose();
      }
    });
    this.sorgente = null;
  }
}
