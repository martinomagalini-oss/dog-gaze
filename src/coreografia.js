/**
 * Coreografie: movimenti che i cani fanno da soli, senza guardare niente.
 *
 * I tre assi, detti in italiano:
 *   Y = si gira a destra e a sinistra   (la giravolta)
 *   X = si ruota in avanti              (la capriola)
 *   Z = si ruota di lato                (la ruota)
 *
 * GIRO COMPLETO O DONDOLIO
 * Di norma i cani fanno il giro intero: l'angolo cresce senza fermarsi e la
 * testa continua a girare sempre nello stesso verso. Con l'interruttore
 * "Giro completo" spento tornano invece a dondolare avanti e indietro
 * attorno alla posizione di riposo, con l'ampiezza scelta nel pannello.
 *
 * COME SI SOMMANO ALLO SGUARDO
 * Questo modulo non tocca la rotazione: scrive il proprio contributo sulla
 * testa e sara' posa.js a metterlo insieme a sguardo e sonno. Cosi' un cane
 * puo' girare MENTRE segue la pallina. Il cursore "Peso sguardo" decide
 * quanto conta il bersaglio: a 0 i cani girano e basta.
 *
 * LO SFASAMENTO
 * Quasi tutte le coreografie fanno fare a tutti lo stesso movimento,
 * cambiando solo QUANDO ognuno lo fa. E' la differenza fra un gruppo che si
 * muove all'unisono, che sembra un meccanismo, e uno che si muove a catena,
 * che sembra vivo.
 */
import * as THREE from 'three';
import { config } from './config.js';

// Quanto in fretta un cane raggiunge il movimento nuovo quando si cambia
// coreografia dal pannello. Senza, il cambio sarebbe uno scatto.
const MORBIDEZZA_CAMBIO = 5;

const DUE_PI = Math.PI * 2;

export const COREOGRAFIE = {
  Nessuna: 'nessuna',
  'Giravolta - asse Y': 'asseY',
  'Capriola in avanti - asse X': 'capriola',
  'Capriola alternata - asse X': 'asseX',
  'Ruota di lato - asse Z': 'asseZ',
  'Mista - tutti e tre': 'mista',
  Serpente: 'serpente',
  'Libera - ognuno per se': 'libera',
};

export class Coreografia {
  constructor(griglia) {
    this.griglia = griglia;

    // Angolo che avanza da solo: e' il "motore" di tutte le coreografie.
    // Tenerlo qui, invece di ricavarlo dal tempo assoluto, fa si' che
    // cambiare la velocita' dal pannello cambi il RITMO senza far saltare
    // le teste a un'altra posizione.
    this.angolo = 0;
  }

  aggiorna(dt) {
    const tipo = config.coreografia;
    const attiva = tipo !== 'nessuna';
    const giroCompleto = config.giroCompleto;
    const ampiezza = THREE.MathUtils.degToRad(config.intensitaCoreografia);
    const sfasamento = (config.sfasamentoCoreografia / 100) * Math.PI;
    const morbidezza = 1 - Math.exp(-MORBIDEZZA_CAMBIO * dt);

    this.angolo = avvolgi(this.angolo + config.velocitaCoreografia * DUE_PI * dt);

    for (const testa of this.griglia.teste) {
      if (testa.coreoYaw === undefined) {
        testa.coreoYaw = 0;
        testa.coreoPitch = 0;
        testa.coreoRollio = 0;
      }

      let yaw = 0;
      let pitch = 0;
      let rollio = 0;

      if (attiva && (giroCompleto || ampiezza > 0)) {
        // Scacchiera: un cane in un verso, il vicino nell'altro.
        const verso = (testa.riga + testa.colonna) % 2 === 0 ? 1 : -1;

        // Con il giro completo l'angolo e' quello del motore; col dondolio
        // e' un seno attorno allo zero.
        const moto = (fase, scala = 1) =>
          giroCompleto ? fase : Math.sin(fase) * ampiezza * scala;

        switch (tipo) {
          case 'asseY':
            yaw = moto(this.angolo * verso);
            break;

          case 'capriola':
            // Tutti in avanti insieme: e' la capriola vera e propria.
            pitch = moto(this.angolo);
            break;

          case 'asseX':
            pitch = moto(this.angolo * verso);
            break;

          case 'asseZ':
            rollio = moto(this.angolo * verso);
            break;

          case 'mista': {
            // Tre gruppi, uno per asse. Ogni gruppo parte da un punto
            // diverso del giro, altrimenti i tre movimenti si sincronizzano
            // e si leggono come uno solo, confuso.
            const gruppo = (testa.riga * 2 + testa.colonna) % 3;
            if (gruppo === 0) yaw = moto(this.angolo * verso);
            else if (gruppo === 1) rollio = moto(this.angolo * verso + 2.1);
            else pitch = moto(this.angolo * verso + 4.2, 0.75);
            break;
          }

          case 'serpente': {
            // Stesso giro per tutti, ma ognuno e' piu' indietro del
            // precedente lungo il percorso a serpentina. Imbardata e rollio
            // sfasati di un quarto di giro: ogni testa descrive un cerchio,
            // ed e' quel cerchio che si legge come una torsione che passa.
            const fase = this.angolo - this._indiceSerpente(testa) * sfasamento;
            yaw = moto(fase);
            rollio = moto(fase + Math.PI / 2, 0.8);
            break;
          }

          case 'libera': {
            // Ogni cane ha il suo ritmo e il suo punto di partenza su tutti
            // e tre gli assi, presi dal numero casuale che si porta dietro
            // dalla nascita. Le velocita' non sono multiple fra loro, quindi
            // l'insieme non torna mai uguale a se stesso.
            const a = testa.seme;
            const b = frazione(a * 7.31);
            const c = frazione(a * 13.77);
            const versoLibero = a > 0.5 ? 1 : -1;

            yaw = moto(this.angolo * (0.55 + a * 0.9) * versoLibero + a * 12.9);
            rollio = moto(this.angolo * (0.45 + b * 1.1) * versoLibero + b * 20.3, 0.85);
            pitch = moto(this.angolo * (0.4 + c * 0.8) + c * 31.7, 0.5);
            break;
          }
        }
      }

      // Avvicinamento per la via piu' corta. Serve sia quando si cambia
      // coreografia, sia durante il giro completo: senza, tornando a
      // "Nessuna" da un angolo di 170 gradi la testa srotolerebbe tutto il
      // giro lungo invece di raddrizzarsi dalla parte vicina.
      testa.coreoYaw = avvicinaAngolo(testa.coreoYaw, yaw, morbidezza);
      testa.coreoPitch = avvicinaAngolo(testa.coreoPitch, pitch, morbidezza);
      testa.coreoRollio = avvicinaAngolo(testa.coreoRollio, rollio, morbidezza);
    }
  }

  /**
   * Posizione del cane lungo un percorso a serpentina: la prima riga da
   * sinistra a destra, la seconda da destra a sinistra, e cosi' via.
   *
   * Contando invece sempre da sinistra, alla fine di ogni riga il percorso
   * farebbe un salto all'altro capo della griglia, e l'onda si spezzerebbe
   * a ogni cambio riga invece di scorrere continua.
   */
  _indiceSerpente(testa) {
    const colonne = Math.max(1, Math.round(config.colonne));
    const avanti = testa.riga % 2 === 0;
    const colonna = avanti ? testa.colonna : colonne - 1 - testa.colonna;
    return testa.riga * colonne + colonna;
  }
}

/** Riporta un angolo nell'intervallo da -pi greco a +pi greco. */
function avvolgi(angolo) {
  return ((angolo + Math.PI) % DUE_PI + DUE_PI) % DUE_PI - Math.PI;
}

/**
 * Avvicina un angolo a un altro seguendo la via piu' corta sul cerchio.
 *
 * Con una semplice interpolazione fra due numeri, passare da +179 a -179
 * gradi (che sono due gradi di distanza) farebbe percorrere 358 gradi nel
 * verso sbagliato: la testa si srotolerebbe all'indietro a ogni giro.
 */
function avvicinaAngolo(attuale, voluto, fattore) {
  const differenza = avvolgi(voluto - attuale);
  return avvolgi(attuale + differenza * fattore);
}

/** Parte decimale: un modo spiccio di ricavare piu' numeri da un seme solo. */
function frazione(x) {
  return x - Math.floor(x);
}
