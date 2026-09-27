/**
 * Tutti i parametri numerici del progetto stanno qui dentro.
 * Il pannello di controllo (ui.js) modifica direttamente questo oggetto,
 * cosi' non ci sono numeri sparsi nel resto del codice.
 */
export const config = {
  // ---------- Griglia ----------
  righe: 5,              // numero di righe di teste (1-12)
  colonne: 4,            // numero di colonne di teste (1-12)
  dimensioneTesta: 100,  // dimensione della testa in % della cella (20-100)

  // ---------- Modello ----------
  // Quale dei modelli inclusi usare. 'segnaposto' mostra la testa finta.
  modelloIncluso: 'cane_web.glb',

  // ---------- Calibrazione orientamento ----------
  // Correzione in GRADI applicata a tutte le copie. Il modello del cane
  // e' gia' dritto, quindi di default non serve nessuna correzione:
  // questi valori restano a zero e i pulsanti sono solo una sicurezza.
  calibrazioneX: 0,
  calibrazioneY: 0,
  calibrazioneZ: 0,

  // ---------- Sguardo (fase 3) ----------
  // Quanto e' "davanti" al piano delle teste il punto guardato. Piccolo =
  // le teste ai bordi si girano tantissimo; grande = guardano quasi tutte
  // dritte e l'effetto sparisce. E' il parametro che regola il carattere
  // dell'insieme: l'area e' alta 10 unita', quindi 6 e' una via di mezzo.
  distanzaBersaglio: 5,

  // Limiti di rotazione, in gradi. Nessuna testa deve girarsi all'indietro.
  limiteYaw: 78,    // sinistra/destra
  limitePitch: 68,  // su/giu'

  // Velocita' di inseguimento (1/secondo). Piu' alto = piu' pronto.
  velocitaSguardo: 24.5,
  // Quando il mouse esce dall'area le teste tornano dritte, ma con calma.
  velocitaRitorno: 2.3,

  // Dove sta il perno della rotazione, in % della profondita' della testa,
  // misurata all'indietro dal centro del bounding box. A 0 la testa ruota
  // attorno al proprio centro e il muso descrive un arco largo; spostando
  // il perno verso la nuca il movimento somiglia a un collo vero.
  centroRotazione: 10,

  // ---------- Area di attenzione (fase 3) ----------
  // Senza questi valori l'imbardata dipenderebbe solo dallo scostamento
  // orizzontale, e un cane lontanissimo in verticale si girerebbe esattamente
  // quanto quello che ha il bersaglio davanti: intere righe farebbero lo
  // stesso gesto all'unisono. Il peso qui sotto tiene conto della distanza
  // vera nel piano, cosi' reagiscono soprattutto i cani vicini.
  //
  // Le misure sono in % dell'altezza dell'area, non in unita' di mondo,
  // cosi' restano comprensibili e valgono anche se la griglia cambia.
  raggioAttenzione: 19,     // entro questo raggio il cane reagisce del tutto
  sfumaturaAttenzione: 18,  // banda in cui l'attenzione si spegne, oltre il raggio
  attenzioneMinima: 5,      // % di rotazione che conservano i cani lontani (0 = fermi)

  // ---------- Effetto onda (fase 4) ----------
  // I cani non reagiscono tutti insieme: quelli vicini al bersaglio partono
  // per primi, gli altri un attimo dopo, e il movimento si propaga come
  // un'onda. Ogni cane guarda dov'era il bersaglio `ritardo` secondi fa.
  intensitaOnda: 28,       // % (0 = tutti insieme, nessuna onda)
  ritardoMassimo: 90,      // millisecondi di ritardo per il cane piu' lontano

  // Piccola differenza di carattere fra un cane e l'altro: senza, i movimenti
  // sono troppo identici e si vede che sono copie dello stesso oggetto.
  variazionePerTesta: 9,   // ±% sulla prontezza, fissa per ogni cane

  // ---------- Pallina da tennis (fase 5) ----------
  modalitaBersaglio: 'mouse', // 'mouse' oppure 'pallina'
  pallinaInPausa: false,

  velocitaPallina: 4.5,     // unita' di mondo al secondo (l'area e' alta 10)
  raggioPallina: 0.32,

  // Quanto vorticosamente gira su se stessa, in % del rotolamento reale.
  // 100 = come rotolerebbe davvero, 0 = ferma, oltre = effetto.
  velocitaRotazione: 100,
  deviazioneRimbalzo: 15,   // ± gradi di casualita' a ogni rimbalzo
  curvaturaVolo: 25,        // gradi al secondo, massima piega durante il volo
  angoloMinimoMuro: 20,     // gradi minimi rispetto al muro, per non strisciare

  // ---------- Sonno (fase 6) ----------
  sonnoAttivo: true,
  secondiPrimaDelSonno: 10,   // bersaglio fermo per questo tempo = si dorme
  mostraZ: true,

  // I cani non crollano tutti insieme: si addormentano uno alla volta, a
  // questo ritmo. Con 20 cani e 0,3 s l'ultimo crolla dopo circa 6 secondi.
  intervalloAddormentamento: 0.3,
  intervalloRisveglio: 0.06,  // il risveglio e' molto piu' rapido

  // Ordine: 0 = rigorosamente per distanza dal bersaglio (si addormentano
  // prima i lontani, si svegliano prima i vicini), 100 = puro caso.
  casualitaOrdineSonno: 45,

  abbassamentoSonno: 30,      // gradi di muso all'ingiu' da addormentato
  inclinazioneSonno: 14,      // ± gradi di piega laterale, fissa per cane

  // ---------- Coreografie ----------
  // Movimenti che i cani fanno da soli, senza guardare niente. Si SOMMANO
  // allo sguardo invece di sostituirlo, cosi' un cane puo' dondolare mentre
  // segue la pallina. Vedi coreografia.js.
  coreografia: 'nessuna',

  // true = la testa fa il giro intero e continua a girare sempre nello
  // stesso verso; false = dondola avanti e indietro attorno al riposo.
  giroCompleto: true,

  velocitaCoreografia: 0.3,   // giri al secondo
  intensitaCoreografia: 22,   // gradi di ampiezza, solo quando dondola
  sfasamentoCoreografia: 22,  // % di ritardo fra un cane e il successivo

  // Quanto contano mouse e pallina mentre balla: a 0 i cani ignorano il
  // bersaglio e fanno solo la coreografia, a 100 fanno le due cose insieme.
  pesoSguardo: 100,

  // ---------- Registrazione video ----------
  // Solo il rettangolo, cosi' il video esce gia' in formato verticale
  // 9:19,5 senza i margini vuoti attorno.
  registraSoloArea: true,
  qualitaVideo: 12,   // megabit al secondo

  // Quanti pixel veri disegnare per ogni pixel dello schermo DURANTE la
  // registrazione. Piu' alto = video piu' definito, ma anche piu' lavoro
  // per la scheda video: se gli fps calano, si vede nel filmato.
  risoluzioneVideo: 3,

  // ---------- Aspetto ----------
  coloreSfondo: '#4e5b73',
  mostraBordoArea: true, // disegna il rettangolo che delimita l'area
  mostraContatore: true, // contatore fps in sovrimpressione sulla scena

  // ---------- Luci ----------
  // La luce d'ambiente generata via codice (ambiente.js) fa il grosso del
  // lavoro: da' volume alle superfici. Le luci dirette restano poche e
  // gentili, perche' la texture dello scan contiene gia' la sua
  // illuminazione e sommarne troppa sbianca il pelo.
  usaAmbiente: true,
  coloreCielo: '#eaf0f8',
  coloreTerra: '#55503f',
  intensitaFari: 95,           // % di forza dei pannelli luminosi
  intensitaAmbienteMappa: 1.35, // quanto conta l'ambiente nell'illuminazione

  // Curva di esposizione: comprime le alte luci invece di tagliarle, cosi'
  // il bianco del pelo conserva il disegno anche dove prende piu' luce.
  esposizione: 0.5,

  intensitaAmbiente: 0.2,
  intensitaDirezionale: 0.85,
};

/**
 * Costanti che non si toccano dal pannello.
 */

// Proporzione dell'area: 9:19,5 come uno smartphone.
export const PROPORZIONE_AREA = 9 / 19.5;

// Altezza dell'area in unita' di mondo. E' un valore di riferimento
// arbitrario: la camera si adatta per farlo entrare nella finestra.
export const AREA_ALTEZZA = 10;
export const AREA_LARGHEZZA = AREA_ALTEZZA * PROPORZIONE_AREA;

// L'area occupa circa il 90% della finestra, lasciando un margine attorno.
export const RIEMPIMENTO_FINESTRA = 0.9;

// Modelli inclusi nel progetto, nell'ordine in cui compaiono nel pannello.
// Le chiavi sono le etichette mostrate, i valori i nomi dei file.
export const MODELLI_INCLUSI = {
  'Cane - leggero (80k)': 'cane_web.glb',
  'Cane - alta qualita (130k)': 'cane_hq.glb',
  'Cane - completo (220k)': 'cane_full.glb',
  'Segnaposto': 'segnaposto',
};

// Cartella dei modelli dentro public/.
//
// Il percorso NON puo' essere scritto fisso come '/modelli/': in locale
// funzionerebbe, ma una volta pubblicato il sito non sta alla radice del
// dominio bensi' in una sottocartella, e i modelli verrebbero cercati nel
// posto sbagliato. BASE_URL vale '/' durante lo sviluppo e la sottocartella
// giusta una volta costruito il sito.
export const CARTELLA_MODELLI = import.meta.env.BASE_URL + 'modelli/';

// Quanti secondi di passato conservare nello storico del bersaglio.
// Deve bastare per il ritardo massimo, con abbondanza.
export const DURATA_STORICO = 2;

// Quanto e' morbido il cambio di ritardo (1/secondo). Il ritardo dipende
// dalla distanza dal bersaglio, che con un movimento brusco del mouse cambia
// di colpo: senza questo filtro il cane salterebbe di scatto a guardare un
// punto diverso dello storico invece di scivolarci dentro.
export const VELOCITA_FILTRO_RITARDO = 6;

// Limiti degli slider della griglia.
export const MIN_CELLE = 1;
export const MAX_CELLE = 12;
