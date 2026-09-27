/**
 * Ambiente luminoso generato via codice.
 *
 * PERCHE' SERVE
 * Con le sole luci dirette i materiali di Three.js risultano opachi: ogni
 * punto riceve luce solo da due o tre direzioni precise, e tutto il resto
 * resta buio piatto. Nella realta' (e in Blender) la luce arriva da ogni
 * direzione, rimbalzata da cielo, pareti e pavimento: e' quello che da'
 * volume alle superfici.
 *
 * Qui disegniamo su un canvas una specie di studio fotografico in miniatura
 * (cielo chiaro sopra, terra scura sotto, due pannelli luminosi davanti) e lo
 * diamo a Three.js come ambiente. Nessun file esterno, come per la texture
 * della pallina e per le "Z".
 *
 * L'immagine e' in proiezione equirettangolare: l'asse orizzontale e' il giro
 * completo attorno all'osservatore, quello verticale va dallo zenit al nadir.
 *
 * NOTA SUL MODELLO DEL CANE
 * E' uno scan fotogrammetrico: la sua texture contiene GIA' la luce del
 * momento in cui e' stato scansionato. Aggiungere troppa luce diretta sopra
 * una texture gia' illuminata e' il motivo per cui il pelo bianco si
 * sbiancava del tutto. Meglio poca luce diretta e molta luce d'ambiente, che
 * da' volume senza sommarsi due volte alle ombre gia' dipinte nella texture.
 */
import * as THREE from 'three';
import { config } from './config.js';

const LARGHEZZA = 512;
const ALTEZZA = 256;

export class Ambiente {
  constructor(renderer, scena) {
    this.renderer = renderer;
    this.scena = scena;
    this.texture = null;
    this.ricostruisci();
  }

  /**
   * Ridisegna l'ambiente leggendo i colori dal pannello.
   * Va richiamato quando cambiano cielo, terra o intensita' dei pannelli.
   */
  ricostruisci() {
    this._libera();

    const canvas = disegnaStudio(
      config.coloreCielo,
      config.coloreTerra,
      config.intensitaFari / 100
    );

    const equirettangolare = new THREE.CanvasTexture(canvas);
    equirettangolare.mapping = THREE.EquirectangularReflectionMapping;
    equirettangolare.colorSpace = THREE.SRGBColorSpace;

    // PMREM prepara la mappa in modo che Three.js possa usarla anche per le
    // superfici ruvide, non solo per quelle a specchio: e' quello che
    // trasforma un'immagine in vera illuminazione diffusa.
    const generatore = new THREE.PMREMGenerator(this.renderer);
    this.texture = generatore.fromEquirectangular(equirettangolare).texture;

    equirettangolare.dispose();
    generatore.dispose();

    this.applica();
  }

  /** Attacca o stacca l'ambiente dalla scena, secondo il pannello. */
  applica() {
    this.scena.environment = config.usaAmbiente ? this.texture : null;
    this.scena.environmentIntensity = config.intensitaAmbienteMappa;
  }

  _libera() {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
  }
}

/**
 * Disegna lo "studio": sfumatura verticale piu' due pannelli luminosi.
 */
function disegnaStudio(coloreCielo, coloreTerra, intensitaFari) {
  const canvas = document.createElement('canvas');
  canvas.width = LARGHEZZA;
  canvas.height = ALTEZZA;
  const ctx = canvas.getContext('2d');

  // --- sfumatura cielo/terra ---
  // L'orizzonte non e' netto: una fascia di passaggio evita lo stacco duro
  // che si vedrebbe come una riga sui bordi arrotondati del muso.
  const sfumatura = ctx.createLinearGradient(0, 0, 0, ALTEZZA);
  sfumatura.addColorStop(0.0, coloreCielo);
  sfumatura.addColorStop(0.42, coloreCielo);
  sfumatura.addColorStop(0.58, mescola(coloreCielo, coloreTerra, 0.55));
  sfumatura.addColorStop(1.0, coloreTerra);
  ctx.fillStyle = sfumatura;
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);

  // --- pannelli luminosi ---
  // Due "softbox" in alto, uno piu' forte a sinistra e uno di rinforzo a
  // destra: e' lo schema classico da ritratto e da' un rilievo asimmetrico,
  // molto piu' interessante di una luce frontale piatta.
  if (intensitaFari > 0) {
    disegnaFaro(ctx, LARGHEZZA * 0.30, ALTEZZA * 0.24, 150, 92, 1.0 * intensitaFari);
    disegnaFaro(ctx, LARGHEZZA * 0.74, ALTEZZA * 0.32, 120, 76, 0.55 * intensitaFari);
  }

  return canvas;
}

/** Un pannello luminoso sfumato, disegnato come macchia ellittica. */
function disegnaFaro(ctx, x, y, raggioX, raggioY, forza) {
  const gradiente = ctx.createRadialGradient(x, y, 0, x, y, raggioX);
  gradiente.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, forza)})`);
  gradiente.addColorStop(0.55, `rgba(255, 253, 245, ${Math.min(1, forza) * 0.35})`);
  gradiente.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, raggioY / raggioX);
  ctx.translate(-x, -y);
  ctx.fillStyle = gradiente;
  ctx.beginPath();
  ctx.arc(x, y, raggioX, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Mescola due colori esadecimali, con k da 0 (il primo) a 1 (il secondo). */
function mescola(colore1, colore2, k) {
  const a = new THREE.Color(colore1);
  const b = new THREE.Color(colore2);
  return a.lerp(b, k).getStyle();
}
