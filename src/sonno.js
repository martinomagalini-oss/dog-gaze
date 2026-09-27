/**
 * Modalita' sonno.
 *
 * Quando il bersaglio smette di muoversi per un po', i cani si addormentano
 * uno alla volta; quando riparte si svegliano a onda, partendo dai piu'
 * vicini. Si muove solo la testa intera: niente bocche, niente occhi.
 *
 * COME SI INCASTRA CON LO SGUARDO
 * Questo modulo gira DOPO lookAt.js. Lo sguardo calcola i suoi angoli e li
 * lascia scritti su `testa.yawAttuale` e `testa.pitchAttuale`; qui si mescola
 * fra quella posa e quella del cane addormentato, in proporzione a quanto
 * profondamente dorme. Cosi' le due cose non litigano per la stessa
 * rotazione e il passaggio fra veglia e sonno e' continuo.
 *
 * IL ROLLIO
 * E' l'unico punto del progetto dove la testa si piega di lato. Da sveglio
 * non succede mai (un cane non inclina la testa per guardare), ma un cane
 * che dorme con la testa perfettamente dritta sembra spento, non addormentato.
 */
import * as THREE from 'three';
import { config } from './config.js';

// Quanto in fretta la testa scende nel sonno (1/secondo). Bassa: crollare
// di colpo sembrerebbe uno svenimento, non un appisolarsi.
const VELOCITA_ADDORMENTAMENTO = 1.1;

// Il risveglio e' molto piu' rapido dell'addormentarsi: e' un soprassalto.
const VELOCITA_RISVEGLIO = 7;

// Respiro: ampiezza in gradi e cicli al secondo. Volutamente piccolo, deve
// leggersi come un respiro e non come un cenno del capo.
const AMPIEZZA_RESPIRO = 2.6;
const VELOCITA_RESPIRO = 0.28;

// Sussulto del risveglio: il muso scatta un attimo all'insu' prima di
// mettersi a guardare. Senza, i cani si svegliano in modo troppo composto.
const SUSSULTO_GRADI = 11;
const DECADIMENTO_SUSSULTO = 5.5;

// Ogni quanto sale una "Z" da un cane addormentato, in secondi.
const INTERVALLO_Z = 1.6;

// Vita di una "Z": quanto ci mette a salire e svanire.
const DURATA_Z = 2.6;

// Quante "Z" possono esistere insieme. Sono riciclate: crearle e distruggerle
// in continuazione darebbe lavoro al garbage collector durante l'animazione.
const MAX_Z = 60;

export class Sonno {
  constructor(griglia, scena) {
    this.griglia = griglia;
    this.scena = scena;

    // true = i cani stanno dormendo o si stanno addormentando.
    this.dormendo = false;

    // Tempo trascorso dall'ultimo cambio di stato: serve a far partire i
    // cani uno alla volta invece che tutti insieme.
    this.tempoDaCambio = 0;

    this.tempo = 0;

    this.nuvola = new NuvolaZ(scena);
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} riferimento  ultima posizione nota del bersaglio,
   *                        usata per decidere chi si addormenta o si sveglia prima
   * @param {boolean} deveDormire  il bersaglio e' fermo da abbastanza tempo
   */
  aggiorna(dt, riferimento, deveDormire) {
    this.tempo += dt;

    const vuoleDormire = config.sonnoAttivo && deveDormire;

    if (vuoleDormire !== this.dormendo) {
      this.dormendo = vuoleDormire;
      this.tempoDaCambio = 0;
      this._pianifica(riferimento);
    }
    this.tempoDaCambio += dt;

    const abbassamento = THREE.MathUtils.degToRad(config.abbassamentoSonno);
    const ampiezzaRespiro = THREE.MathUtils.degToRad(AMPIEZZA_RESPIRO);
    const sussultoMax = THREE.MathUtils.degToRad(SUSSULTO_GRADI);

    for (const testa of this.griglia.teste) {
      this._preparaTesta(testa);

      // Ogni cane parte per conto suo, quando arriva il suo turno.
      if (this.tempoDaCambio >= testa.ritardoSonno) {
        const nuovoObiettivo = this.dormendo ? 1 : 0;

        // Passaggio da addormentato a sveglio: scatta il sussulto, ma solo
        // se dormiva davvero, altrimenti sobbalzerebbe anche chi era gia'
        // sveglio e non se ne era accorto nessuno.
        if (nuovoObiettivo === 0 && testa.obiettivoSonno === 1 && testa.sonno > 0.35) {
          testa.sussulto = 1;
        }
        testa.obiettivoSonno = nuovoObiettivo;
      }

      const velocita =
        testa.obiettivoSonno > testa.sonno
          ? VELOCITA_ADDORMENTAMENTO
          : VELOCITA_RISVEGLIO;

      testa.sonno +=
        (testa.obiettivoSonno - testa.sonno) * (1 - Math.exp(-velocita * dt));

      testa.sussulto *= Math.exp(-DECADIMENTO_SUSSULTO * dt);

      // ---- contributo del sonno ----
      // Non si scrive nulla nella rotazione: i valori restano sulla testa e
      // li mettera' insieme posa.js. Vedi il commento in lookAt.js.
      const s = testa.sonno;

      // Il respiro conta solo da addormentato, e ogni cane ha il suo tempo.
      const respiro =
        Math.sin(
          (this.tempo * VELOCITA_RESPIRO + testa.faseRespiro) * Math.PI * 2
        ) *
        ampiezzaRespiro *
        s;

      // Pitch positivo = muso in giu', nella convenzione usata da lookAt.js.
      testa.sonnoPitch = abbassamento + respiro;

      // Il rollio del sonno: la testa appoggiata di lato.
      testa.sonnoRollio = testa.inclinazioneSonno;

      // Sussulto del risveglio, gia' convertito in radianti.
      testa.sussultoRad = testa.sussulto * sussultoMax;

      // ---- le "Z" ----
      if (config.mostraZ && s > 0.65) {
        testa.tempoProssimaZ -= dt;
        if (testa.tempoProssimaZ <= 0) {
          testa.tempoProssimaZ = INTERVALLO_Z * (0.75 + testa.seme * 0.5);
          this.nuvola.emetti(testa);
        }
      }
    }

    this.nuvola.aggiorna(dt);
  }

  /** Valori che ogni testa si porta dietro, creati alla prima passata. */
  _preparaTesta(testa) {
    if (testa.sonno !== undefined) return;

    testa.sonno = 0;
    testa.obiettivoSonno = 0;
    testa.ritardoSonno = 0;
    testa.sussulto = 0;
    testa.tempoProssimaZ = 0;

    // Inclinazione laterale del sonno, fissa per ogni cane: uno appoggia la
    // testa a destra, uno a sinistra, e non cambiano mai idea.
    const gradi = THREE.MathUtils.degToRad(config.inclinazioneSonno);
    testa.inclinazioneSonno = (testa.seme * 2 - 1) * gradi;

    // Fase del respiro: se fosse uguale per tutti respirerebbero all'unisono
    // e sembrerebbe un meccanismo, non un gruppo di cani.
    testa.faseRespiro = testa.seme;
  }

  /**
   * Decide in che ordine i cani si addormentano o si svegliano.
   *
   * Addormentarsi: partono i piu' LONTANI dal bersaglio. Sono quelli che si
   * sono annoiati per primi, e il sonno cala verso il centro.
   * Svegliarsi: partono i piu' VICINI, come l'onda dello sguardo.
   *
   * `casualitaOrdineSonno` mescola le carte: a 0 l'ordine e' rigorosamente
   * per distanza e si vede troppo lo schema, a 100 e' pura lotteria.
   */
  _pianifica(riferimento) {
    const teste = this.griglia.teste;
    if (teste.length === 0) return;

    const casualita = config.casualitaOrdineSonno / 100;

    // Distanze normalizzate 0..1 rispetto alla piu' grande del momento.
    let massima = 0;
    const distanze = teste.map((testa) => {
      this._preparaTesta(testa);
      const d = Math.hypot(
        riferimento.x - testa.posizione.x,
        riferimento.y - testa.posizione.y
      );
      if (d > massima) massima = d;
      return d;
    });

    const ordine = teste.map((testa, i) => {
      // 0 = attaccato al bersaglio, 1 = il piu' lontano di tutti.
      const lontananza = massima > 0 ? distanze[i] / massima : 0;

      // Addormentandosi tocca prima ai lontani (si sono annoiati per primi),
      // svegliandosi tocca prima ai vicini, come l'onda dello sguardo.
      const merito = this.dormendo ? lontananza : 1 - lontananza;

      return {
        testa,
        punteggio: merito * (1 - casualita) + testa.seme * casualita,
      };
    });

    // Punteggio alto = tocca prima.
    ordine.sort((a, b) => b.punteggio - a.punteggio);

    const passo = this.dormendo
      ? config.intervalloAddormentamento
      : config.intervalloRisveglio;

    ordine.forEach((voce, posizione) => {
      voce.testa.ritardoSonno = posizione * passo;
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Le "Z" che salgono sopra i cani addormentati                       */
/* ------------------------------------------------------------------ */

class NuvolaZ {
  constructor(scena) {
    const materiale = new THREE.SpriteMaterial({
      map: creaTexturaZ(),
      transparent: true,
      depthWrite: false,
    });

    this.sprite = [];
    for (let i = 0; i < MAX_Z; i++) {
      const s = new THREE.Sprite(materiale.clone());
      s.visible = false;
      s.renderOrder = 10;
      scena.add(s);
      this.sprite.push({ oggetto: s, vita: 0, dx: 0, scala: 1 });
    }
  }

  /** Fa partire una Z sopra la testa indicata, se ce n'e' una libera. */
  emetti(testa) {
    const libera = this.sprite.find((v) => v.vita <= 0);
    if (!libera) return;

    libera.vita = DURATA_Z;
    // Deriva orizzontale casuale: senza, salgono tutte in colonna.
    libera.dx = (Math.random() * 2 - 1) * 0.35;
    libera.scala = 0.28 + Math.random() * 0.14;

    libera.origineX = testa.posizione.x;
    libera.origineY = testa.posizione.y + 0.55;

    libera.oggetto.visible = true;
  }

  aggiorna(dt) {
    for (const v of this.sprite) {
      if (v.vita <= 0) continue;

      v.vita -= dt;
      if (v.vita <= 0) {
        v.oggetto.visible = false;
        continue;
      }

      // avanzamento da 0 (appena nata) a 1 (sta per sparire)
      const t = 1 - v.vita / DURATA_Z;

      v.oggetto.position.set(
        v.origineX + v.dx * t,
        v.origineY + t * 1.3,
        1.2 // davanti alle teste, dietro alla pallina
      );

      // Cresce un po' salendo e svanisce sul finale.
      const scala = v.scala * (0.7 + t * 0.6);
      v.oggetto.scale.set(scala, scala, 1);

      // Compare in fretta, resta, poi sfuma: niente apparizioni di colpo.
      const opacita = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      v.oggetto.material.opacity = Math.max(0, opacita) * 0.85;
    }
  }
}

/** La lettera Z disegnata su un canvas, senza file esterni. */
function creaTexturaZ() {
  const lato = 128;
  const canvas = document.createElement('canvas');
  canvas.width = lato;
  canvas.height = lato;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, lato, lato);

  ctx.font = 'bold 92px system-ui, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Contorno scuro: la Z bianca deve restare leggibile anche sopra il pelo
  // chiaro del cane, che e' quasi bianco.
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(20, 24, 32, 0.75)';
  ctx.strokeText('Z', lato / 2, lato / 2 + 4);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('Z', lato / 2, lato / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
