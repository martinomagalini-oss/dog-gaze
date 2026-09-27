/**
 * Storico delle posizioni del bersaglio.
 *
 * Serve all'effetto onda: ogni cane non guarda dove sta il bersaglio adesso,
 * ma dov'era un attimo fa. Piu' e' lontano, piu' indietro va a pescare.
 *
 * E' un buffer circolare: si scrive sempre nella casella successiva e quando
 * si arriva in fondo si riparte dall'inizio, sovrascrivendo i campioni piu'
 * vecchi. Cosi' non si alloca memoria a ogni fotogramma e non serve spostare
 * nulla, cosa che con 60 scritture al secondo conterebbe.
 *
 * I dati stanno in array tipizzati separati invece che in un array di oggetti:
 * niente oggetti creati e buttati via a ogni fotogramma, quindi niente lavoro
 * per il garbage collector proprio mentre l'animazione deve restare fluida.
 */
export class StoricoBersaglio {
  /**
   * @param {number} durata  quanti secondi di passato conservare
   * @param {number} campioniAlSecondo  stima larga, serve solo a dimensionare
   */
  constructor(durata, campioniAlSecondo = 200) {
    this.durata = durata;
    this.capienza = Math.max(64, Math.ceil(durata * campioniAlSecondo));

    this.tempi = new Float64Array(this.capienza);
    this.px = new Float32Array(this.capienza);
    this.py = new Float32Array(this.capienza);
    this.pz = new Float32Array(this.capienza);

    this.prossimo = 0; // dove scrivero' il prossimo campione
    this.quanti = 0;   // quanti campioni validi ci sono
  }

  /**
   * Butta via tutto. Da chiamare quando il bersaglio ricompare dopo essere
   * sparito: senza, i cani andrebbero a pescare la posizione di prima che
   * sparisse e farebbero uno scatto verso un punto che non esiste piu'.
   */
  svuota() {
    this.prossimo = 0;
    this.quanti = 0;
  }

  /** Registra dove si trova il bersaglio adesso. */
  registra(posizione, tempo) {
    const i = this.prossimo;
    this.tempi[i] = tempo;
    this.px[i] = posizione.x;
    this.py[i] = posizione.y;
    this.pz[i] = posizione.z;

    this.prossimo = (i + 1) % this.capienza;
    this.quanti = Math.min(this.quanti + 1, this.capienza);
  }

  /**
   * Dov'era il bersaglio al tempo richiesto.
   *
   * I campioni cadono a intervalli irregolari (dipendono dai fotogrammi),
   * quindi quasi mai ce n'e' uno esattamente sul tempo cercato: si prendono
   * i due che lo racchiudono e si interpola fra loro. Senza interpolazione
   * il movimento sarebbe a scatti, al ritmo dei fotogrammi registrati.
   *
   * @param {number} tempo  istante cercato, in secondi
   * @param {THREE.Vector3} fuori  vettore dove scrivere il risultato
   * @returns {boolean} false se lo storico e' vuoto
   */
  posizioneA(tempo, fuori) {
    if (this.quanti === 0) return false;

    const cap = this.capienza;
    const recente = (this.prossimo - 1 + cap) % cap;

    // Chiesto un istante piu' recente di quanto abbiamo: diamo l'ultimo.
    if (this.tempi[recente] <= tempo) {
      fuori.set(this.px[recente], this.py[recente], this.pz[recente]);
      return true;
    }

    // Si cammina all'indietro finche' non si trova il campione precedente
    // all'istante cercato. Si parte dal piu' recente perche' i ritardi sono
    // brevi: quasi sempre bastano pochi passi.
    let dopo = recente;
    for (let salti = 1; salti < this.quanti; salti++) {
      const prima = (recente - salti + cap * 2) % cap;

      if (this.tempi[prima] <= tempo) {
        const t0 = this.tempi[prima];
        const t1 = this.tempi[dopo];
        const k = t1 > t0 ? (tempo - t0) / (t1 - t0) : 0;

        fuori.set(
          this.px[prima] + (this.px[dopo] - this.px[prima]) * k,
          this.py[prima] + (this.py[dopo] - this.py[prima]) * k,
          this.pz[prima] + (this.pz[dopo] - this.pz[prima]) * k
        );
        return true;
      }

      dopo = prima;
    }

    // Chiesto un istante piu' vecchio di tutto lo storico: diamo il piu'
    // vecchio che abbiamo. Capita solo nei primi istanti dopo uno svuota().
    fuori.set(this.px[dopo], this.py[dopo], this.pz[dopo]);
    return true;
  }
}
