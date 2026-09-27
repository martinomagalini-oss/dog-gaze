/**
 * La pallina da tennis.
 *
 * Si muove sullo stesso piano del bersaglio, cioe' DAVANTI alle teste, e
 * rimbalza sui bordi del rettangolo. La texture e' generata via codice su un
 * canvas: nessun file esterno da caricare.
 *
 * Il movimento deve sembrare casuale ma sensato. Tre accorgimenti:
 *  - a ogni rimbalzo, riflessione piu' una piccola deviazione casuale;
 *  - durante il volo, una curvatura lieve che cambia con dolcezza, cosi' la
 *    traiettoria non e' fatta solo di segmenti dritti;
 *  - un angolo minimo rispetto ai muri, altrimenti dopo qualche rimbalzo
 *    finisce per strisciare lungo un lato e li' resta.
 */
import * as THREE from 'three';
import { config, AREA_ALTEZZA, AREA_LARGHEZZA } from './config.js';

// Ogni quanto cambia la direzione verso cui tende la curvatura, in secondi.
// Troppo spesso e la traiettoria trema; troppo di rado e sembra un binario.
const INTERVALLO_CURVATURA = 0.8;

// Quanto rapidamente la curvatura raggiunge il nuovo valore (1/secondo).
// Bassa di proposito: e' quello che rende il movimento morbido.
const MORBIDEZZA_CURVATURA = 1.4;

export class Pallina {
  constructor(scena) {
    this.scena = scena;

    const geometria = new THREE.SphereGeometry(1, 32, 24);
    const materiale = new THREE.MeshStandardMaterial({
      map: creaTexturePallina(),
      roughness: 0.85,
      metalness: 0.0,
    });

    this.mesh = new THREE.Mesh(geometria, materiale);
    this.mesh.name = 'pallina';
    this.mesh.visible = false;
    scena.add(this.mesh);

    // Posizione nel piano e direzione di marcia (angolo in radianti).
    this.posizione = new THREE.Vector3(0, 0, config.distanzaBersaglio);
    this.angolo = Math.random() * Math.PI * 2;

    // Curvatura: valore attuale e valore verso cui sta tendendo.
    this.curvatura = 0;
    this.curvaturaObiettivo = 0;
    this.tempoAlCambio = 0;

    this._asse = new THREE.Vector3();
    this._giro = new THREE.Quaternion();

    this._evitaRadenza();
    this.aggiornaAspetto();
  }

  /** Rimette la pallina al centro con una direzione nuova. */
  reimposta() {
    this.posizione.set(0, 0, config.distanzaBersaglio);
    this.angolo = Math.random() * Math.PI * 2;
    this.curvatura = 0;
    this.curvaturaObiettivo = 0;
    this._evitaRadenza();
  }

  /** Raggio e profondita' seguono il pannello. */
  aggiornaAspetto() {
    this.mesh.scale.setScalar(config.raggioPallina);
    this.posizione.z = config.distanzaBersaglio;
  }

  impostaVisibile(visibile) {
    this.mesh.visible = visibile;
  }

  aggiorna(dt) {
    this.aggiornaAspetto();

    // --- curvatura del volo ---
    // Un nuovo obiettivo ogni tanto, raggiunto con dolcezza: cosi' la
    // traiettoria piega invece di spezzarsi.
    this.tempoAlCambio -= dt;
    if (this.tempoAlCambio <= 0) {
      this.tempoAlCambio = INTERVALLO_CURVATURA;
      const massima = THREE.MathUtils.degToRad(config.curvaturaVolo);
      this.curvaturaObiettivo = (Math.random() * 2 - 1) * massima;
    }
    this.curvatura +=
      (this.curvaturaObiettivo - this.curvatura) *
      (1 - Math.exp(-MORBIDEZZA_CURVATURA * dt));

    this.angolo += this.curvatura * dt;

    // Il vincolo sull'angolo minimo va riapplicato a ogni fotogramma, non
    // solo al rimbalzo: la curvatura del volo, lasciata fare, riporta la
    // direzione dentro la zona radente e la pallina finisce per strisciare
    // lungo un lato. Qui la direzione preme contro il limite e scivola via.
    this._evitaRadenza();

    // --- avanzamento ---
    const passo = config.velocitaPallina * dt;
    const dx = Math.cos(this.angolo) * passo;
    const dy = Math.sin(this.angolo) * passo;

    this.posizione.x += dx;
    this.posizione.y += dy;

    this._rimbalza();
    this._ruota(dx, dy);

    this.mesh.position.copy(this.posizione);
  }

  /** Riflette la direzione quando tocca un bordo. */
  _rimbalza() {
    const limiteX = AREA_LARGHEZZA / 2 - config.raggioPallina;
    const limiteY = AREA_ALTEZZA / 2 - config.raggioPallina;

    let rimbalzata = false;

    if (this.posizione.x > limiteX) {
      this.posizione.x = limiteX;
      this.angolo = Math.PI - this.angolo;
      rimbalzata = true;
    } else if (this.posizione.x < -limiteX) {
      this.posizione.x = -limiteX;
      this.angolo = Math.PI - this.angolo;
      rimbalzata = true;
    }

    if (this.posizione.y > limiteY) {
      this.posizione.y = limiteY;
      this.angolo = -this.angolo;
      rimbalzata = true;
    } else if (this.posizione.y < -limiteY) {
      this.posizione.y = -limiteY;
      this.angolo = -this.angolo;
      rimbalzata = true;
    }

    if (!rimbalzata) return;

    // Piccola deviazione casuale: senza, la pallina ripete all'infinito lo
    // stesso percorso a zigzag e dopo mezzo minuto si riconosce lo schema.
    const deviazione = THREE.MathUtils.degToRad(config.deviazioneRimbalzo);
    this.angolo += (Math.random() * 2 - 1) * deviazione;

    // La deviazione potrebbe aver reso la traiettoria quasi parallela a un
    // muro: la raddrizziamo prima che cominci a strisciare.
    this._evitaRadenza();

    // Riparte la curvatura da zero, cosi' il rimbalzo si legge pulito.
    this.curvatura = 0;
    this.tempoAlCambio = INTERVALLO_CURVATURA;
  }

  /**
   * Impedisce le traiettorie quasi parallele ai bordi.
   *
   * Se la pallina viaggia quasi orizzontale finisce per rimbalzare su e giu'
   * restando appiccicata al lato destro o sinistro; quasi verticale, fa lo
   * stesso in alto e in basso. In entrambi i casi esce dalla zona dove
   * stanno i cani e lo spettacolo si ferma. Qui la direzione viene spinta
   * via dal muro finche' non forma almeno `angoloMinimoMuro` con esso.
   *
   * Il calcolo lavora sull'ANGOLO, non sulle componenti del vettore.
   * Sostituire una componente e lasciare l'altra com'era sembra equivalente
   * ma non lo e': il vettore che ne esce non ha piu' lunghezza 1, e una
   * volta normalizzato l'angolo resta appena sotto la soglia. Un errore
   * piccolo che pero' lasciava passare il 12% delle traiettorie.
   */
  _evitaRadenza() {
    const quarto = Math.PI / 2;

    // Oltre i 45 gradi non resterebbe nessuna direzione ammessa: teniamoci
    // un margine, altrimenti la pallina si incastrerebbe sulle diagonali.
    const minimo = Math.min(
      THREE.MathUtils.degToRad(config.angoloMinimoMuro),
      quarto / 2 - 0.001
    );

    // Angolo riportato nel giro [0, 2pi).
    let angolo = this.angolo % (Math.PI * 2);
    if (angolo < 0) angolo += Math.PI * 2;

    // Lo scompongo in "quale quadrante" piu' "quanto dentro il quadrante":
    // cosi' il vincolo e' lo stesso per tutti e quattro i muri.
    const quadrante = Math.floor(angolo / quarto) * quarto;
    let dentro = angolo - quadrante;

    if (dentro < minimo) dentro = minimo;
    else if (dentro > quarto - minimo) dentro = quarto - minimo;

    this.angolo = quadrante + dentro;
  }

  /**
   * Fa girare la pallina su se stessa come se rotolasse nella direzione in
   * cui viaggia. L'asse di rotazione e' perpendicolare al movimento e giace
   * nel piano dello schermo; la velocita' angolare di partenza e' quella di
   * un corpo che rotola senza slittare, cioe' spazio percorso diviso raggio.
   *
   * Su quel valore agisce `velocitaRotazione`, che e' una percentuale: al
   * 100% la pallina gira esattamente come rotolerebbe davvero, sotto sembra
   * che slitti, sopra che abbia effetto. La scelta e' estetica, non fisica.
   */
  _ruota(dx, dy) {
    const spazio = Math.hypot(dx, dy);
    if (spazio === 0) return;

    this._asse.set(dy, -dx, 0).normalize();
    const rotolamento = spazio / Math.max(config.raggioPallina, 0.001);
    const angoloGiro = rotolamento * (config.velocitaRotazione / 100);
    if (angoloGiro === 0) return;

    this._giro.setFromAxisAngle(this._asse, angoloGiro);
    this.mesh.quaternion.premultiply(this._giro);
  }
}

/**
 * Texture della pallina disegnata su un canvas: giallo-verde con le due
 * cuciture bianche curve.
 *
 * L'immagine e' in proiezione equirettangolare (larga il doppio dell'altezza),
 * che e' come Three.js avvolge una texture su una sfera. La cucitura di una
 * pallina da tennis e' una curva chiusa che gira attorno alla palla: aperta su
 * un piano diventa due onde sfasate di mezzo periodo.
 */
function creaTexturePallina() {
  const larghezza = 512;
  const altezza = 256;

  const canvas = document.createElement('canvas');
  canvas.width = larghezza;
  canvas.height = altezza;
  const ctx = canvas.getContext('2d');

  // Fondo giallo-verde, con una leggera variazione verticale che da' corpo.
  const sfumatura = ctx.createLinearGradient(0, 0, 0, altezza);
  sfumatura.addColorStop(0, '#c8d92e');
  sfumatura.addColorStop(0.5, '#dced4a');
  sfumatura.addColorStop(1, '#c8d92e');
  ctx.fillStyle = sfumatura;
  ctx.fillRect(0, 0, larghezza, altezza);

  // Le due cuciture.
  const ampiezza = altezza * 0.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cuciture = [
    [altezza * 0.3, 0],
    [altezza * 0.7, Math.PI],
  ];

  for (const [centro, fase] of cuciture) {
    // Alone scuro sotto la cucitura: da' profondita' al solco.
    disegnaOnda(ctx, larghezza, centro, ampiezza, fase, 16, 'rgba(120,130,40,0.5)');
    disegnaOnda(ctx, larghezza, centro, ampiezza, fase, 10, '#f5f7ef');
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Disegna una singola onda sinusoidale che attraversa tutta la texture. */
function disegnaOnda(ctx, larghezza, centro, ampiezza, fase, spessore, colore) {
  ctx.beginPath();
  for (let x = 0; x <= larghezza; x += 2) {
    const y = centro + Math.sin((x / larghezza) * Math.PI * 2 + fase) * ampiezza;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = colore;
  ctx.lineWidth = spessore;
  ctx.stroke();
}
