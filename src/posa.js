/**
 * Composizione della posa finale di ogni testa.
 *
 * E' l'unico punto di tutto il progetto che scrive davvero dentro
 * `gruppoSguardo.rotation`. Gli altri moduli calcolano il proprio contributo
 * e lo lasciano scritto sulla testa:
 *
 *   lookAt.js      -> yawAttuale, pitchAttuale      (dove guarda)
 *   coreografia.js -> coreoYaw, coreoPitch, coreoRollio  (come balla)
 *   sonno.js       -> sonno, sonnoPitch, sonnoRollio, sussultoRad
 *
 * Finche' erano due, lasciare che scrivessero a turno funzionava per caso:
 * il sonno girava dopo lo sguardo e lo sovrascriveva. Con tre contributi
 * l'ultimo a parlare avrebbe cancellato il lavoro degli altri, e la
 * coreografia sarebbe sparita ogni volta che un cane si addormentava.
 *
 * Le regole della mescolanza:
 *  - piu' un cane dorme, meno contano sguardo e coreografia: un cane
 *    addormentato non guarda e non balla;
 *  - il sussulto del risveglio si somma sempre, perche' e' proprio il gesto
 *    che accompagna il passaggio da dormiente a sveglio;
 *  - il rollio da sveglio arriva solo dalla coreografia: guardando qualcosa
 *    un cane non piega mai la testa di lato.
 */
import { config } from './config.js';

export function componiPose(griglia) {
  const pesoSguardo = config.pesoSguardo / 100;

  for (const testa of griglia.teste) {
    const sonno = testa.sonno ?? 0;
    const sveglio = 1 - sonno;

    const pitch =
      (testa.pitchAttuale ?? 0) * pesoSguardo * sveglio +
      (testa.coreoPitch ?? 0) * sveglio +
      (testa.sonnoPitch ?? 0) * sonno -
      (testa.sussultoRad ?? 0);

    const yaw =
      (testa.yawAttuale ?? 0) * pesoSguardo * sveglio +
      (testa.coreoYaw ?? 0) * sveglio;

    const rollio =
      (testa.coreoRollio ?? 0) * sveglio + (testa.sonnoRollio ?? 0) * sonno;

    testa.gruppoSguardo.rotation.set(pitch, yaw, rollio);
  }
}
