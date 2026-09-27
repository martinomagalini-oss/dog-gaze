# Cani che guardano la pallina — Brief di progetto (Beta)

## Obiettivo
Una web app semplice, solo per computer, che gira nel browser in locale (nessun backend).
Carico un modello 3D della testa del mio cane (già con texture), scelgo una griglia (es. 4 × 7)
dentro un rettangolo con le proporzioni di uno smartphone, e in ogni cella compare una copia della testa.
Tutte le teste girano lo sguardo verso il cursore del mouse oppure verso una pallina da tennis
che si muove da sola e rimbalza sui bordi. Le teste reagiscono con un leggero ritardo in base alla
distanza dal bersaglio, creando un effetto "onda" naturale.

## Stack
- Vite + JavaScript (vanilla, niente framework UI)
- Three.js (GLTFLoader, OBJLoader + MTLLoader, FBXLoader)
- lil-gui per il pannello di controllo
- Avvio: `npm install` e `npm run dev`

## Struttura file suggerita
```
index.html
src/
  main.js          // bootstrap, loop di animazione
  scene.js         // renderer, camera, luci, area rettangolare
  grid.js          // creazione/aggiornamento griglia di teste
  modelLoader.js   // drag & drop, caricamento, normalizzazione, calibrazione
  lookAt.js        // calcolo rotazioni, limiti, smoothing, ritardo a onda
  ball.js          // pallina: movimento, rimbalzi, texture, rotazione
  targetHistory.js // storico posizioni del bersaglio (per l'effetto onda)
  ui.js            // pannello lil-gui
```

## Regole di lavoro per Claude Code
- Sviluppa **una fase alla volta**, nell'ordine indicato.
- Alla fine di ogni fase fermati, verifica i criteri di completamento e riassumi cosa è stato fatto.
- Codice semplice e commentato in italiano: il progetto crescerà in futuro.
- Tutti i parametri numerici (velocità, limiti, ritardi) in un unico oggetto `config` modificabile dal pannello.

---

## Fase 0 — Setup
- Progetto Vite con Three.js e lil-gui.
- Pagina con sfondo neutro, pannello a destra, area di scena al centro.

**Fatto quando:** `npm run dev` apre una pagina funzionante senza errori in console.

## Fase 1 — Area e griglia (con segnaposto)
- Rettangolo verticale proporzione **9:19,5**, alto circa il 90% della finestra, centrato. Si adatta al ridimensionamento.
- Camera ortografica (le teste devono avere tutte la stessa dimensione e allineamento, senza distorsione prospettica).
- Pannello: **Righe** e **Colonne** (1–12, default 7 righe × 4 colonne), **Dimensione testa** (% della cella).
- Finché non viene caricato un modello, ogni cella mostra un **segnaposto** (sfera con un "naso" che indica il davanti), così lo sviluppo procede anche senza file.
- Luci: una luce ambiente + una direzionale morbida.

**Fatto quando:** cambiando righe/colonne la griglia si ricostruisce subito, centrata e con spaziature uniformi.

## Fase 2 — Caricamento del modello
- Drag & drop sull'area + pulsante "Carica modello".
- Formati: **.glb / .gltf** (principale), **.fbx**, **.obj** (con .mtl e immagini texture trascinate insieme).
- Mostrare nel pannello il nome e il formato del file caricato.
- Normalizzazione automatica: centrare il modello sul suo bounding box e scalarlo per stare nella cella.
- **Calibrazione orientamento**: il modello del mio cane è già dritto (muso verso lo schermo), quindi di default
  nessuna correzione. Tenere solo come sicurezza, in una sezione chiusa del pannello: pulsanti "Ruota 90°"
  su X, Y, Z. La correzione si applica a tutte le copie.
- Struttura per ogni testa: `gruppoCella` (posizione) → `gruppoSguardo` (rotazione dello sguardo) → `gruppoCalibrazione` (correzione orientamento) → mesh.
- Per le copie usare `clone()` condividendo geometrie e materiali (28 teste devono restare fluide a 60 fps).

**Fatto quando:** carico il file del cane, lo vedo in tutte le celle con le texture corrette, e con la calibrazione riesco a farlo guardare dritto verso lo schermo.

## Fase 3 — Sguardo verso il cursore
- La posizione del mouse sull'area viene convertita in un punto 3D posto **davanti** al piano delle teste (distanza configurabile), così le teste guardano "fuori dallo schermo" verso il cursore.
- Per ogni testa calcolare yaw e pitch verso il bersaglio.
- **Limiti** configurabili: yaw ±60°, pitch ±40° (nessuna testa si gira all'indietro).
- **Smoothing**: rotazione interpolata (slerp dei quaternioni o interpolazione di yaw/pitch) con fattore indipendente dal frame rate: `1 - exp(-velocità * dt)`.
- Quando il mouse esce dall'area, le teste tornano lentamente a guardare dritto.

**Fatto quando:** muovendo il mouse tutte le teste lo seguono in modo fluido e credibile, senza scatti né rotazioni innaturali.

## Fase 4 — Effetto onda (ritardo in base alla vicinanza)
- Registrare le posizioni del bersaglio in uno **storico circolare** con timestamp (circa 2 secondi).
- Ogni testa guarda la posizione che il bersaglio aveva `ritardo` secondi fa, dove
  `ritardo = distanza(testa, bersaglio) × intensitàOnda` (con un massimo configurabile, es. 0,4 s).
  Interpolare tra i due campioni più vicini nello storico.
- Le teste vicine al bersaglio reagiscono per prime, quelle lontane un attimo dopo: l'effetto si propaga come un'onda.
- Aggiungere una piccola variazione casuale fissa per testa (±10% su velocità di reazione) per non sembrare robotici.
- Slider nel pannello: **Intensità onda** (0 = tutte insieme).

**Fatto quando:** con un movimento rapido del mouse si vede chiaramente l'onda che parte dalle teste più vicine.

## Fase 5 — Pallina da tennis
- Selettore nel pannello: **Modalità: Mouse / Pallina**.
- Pallina 3D con texture generata via codice (canvas: giallo-verde con la cucitura bianca curva), nessun file esterno necessario.
- Si muove sullo stesso piano del bersaglio, a **velocità costante** (configurabile), rimbalza sui bordi del rettangolo.
- Movimento "casuale ma sensato":
  - a ogni rimbalzo, riflessione + piccola deviazione casuale (±15°);
  - durante il volo, lieve curvatura della traiettoria con rumore morbido (niente scatti);
  - evitare traiettorie quasi parallele ai bordi (angolo minimo ~20° rispetto al muro), così non "striscia" lungo un lato.
- La pallina ruota su se stessa coerentemente con la direzione di movimento.
- Le teste guardano la pallina con lo stesso sistema delle fasi 3 e 4.
- Pulsante **Pausa/Riprendi**.

**Fatto quando:** la pallina gira per l'area in modo naturale per minuti senza bloccarsi, e i cani la seguono con l'effetto onda.

## Fase 6 — Modalità sonno
- Se il bersaglio non si muove per un tempo configurabile (default 10 s) i cani si addormentano.
  In modalità Pallina vale solo quando la pallina è in pausa.
- Addormentarsi: uno alla volta, in ordine casuale e con un intervallo di circa 0,3 s tra un cane e l'altro,
  la testa si abbassa lentamente (pitch circa -30°) con una leggera inclinazione laterale casuale.
- Durante il sonno: lieve movimento su e giù di respiro, con tempi leggermente diversi per ogni cane.
- Sopra ogni cane addormentato salgono delle piccole "Z" (sprite di testo generati via codice) che svaniscono.
- Risveglio: appena il mouse si muove (o la pallina riparte), i cani si svegliano con l'effetto onda,
  partendo dai più vicini al bersaglio, con un piccolo sussulto prima di tornare a guardare.
- Nessuna animazione della bocca o di altre parti: si muove solo la testa intera.
- Pannello: interruttore **Sonno attivo** e slider **Secondi prima del sonno**.

**Fatto quando:** lasciando fermo il mouse i cani si addormentano uno per uno, e muovendolo si risvegliano a onda.

## Fase 7 — Rifinitura beta
- Controllo prestazioni: 60 fps con griglia 12 × 12.
- Luci e ombre morbide per valorizzare la texture del cane.
- Sfondo configurabile (colore).
- Nessun errore in console; README breve con istruzioni d'uso.

---

## Coreografie — FATTE (26-27 settembre 2026)

Realizzate sei coreografie standard, selezionabili dal pannello: asse Y,
asse X, asse Z, mista sui tre assi, serpente e libera. Si sommano allo
sguardo invece di sostituirlo, come previsto nella nota qui sotto.
Restano da fare la selezione manuale dei cani e la versione a tempo di musica.

## Coreografie (idee raccolte, appunti originali)

Famiglia di funzioni a se' stante: far muovere le teste **senza bersaglio**,
come un'animazione decorativa. Da affrontare dopo la fase 7.

1. **Selezione manuale** — un selettore per scegliere quali teste devono
   ruotare in continuazione e quali restare ferme.
2. **Schemi automatici** — la griglia si anima da sola con motivi geometrici:
   a scacchiera, per righe, per colonne, in diagonale; alcune teste ruotano
   sull'asse Y, altre sullo Z, altre su entrambi.
3. **Miscele** — tutte sull'asse Y ma con un leggero dondolio sullo Z, e tutte
   le sfumature intermedie fra i vari schemi.
4. **A tempo di musica** — le teste reagiscono all'audio: i bassi muovono un
   gruppo, gli alti un altro. Servirebbe l'analisi in frequenza del suono
   (Web Audio API) e una mappatura fra bande di frequenza e gruppi di teste.

Nota tecnica: la struttura attuale e' gia' pronta per questo. Ogni testa ha il
suo `gruppoSguardo` indipendente, quindi basta una sorgente di rotazione
diversa dal bersaglio. Le coreografie e lo sguardo dovranno pero' potersi
mescolare (per esempio: seguono il mouse ma dondolano anche), quindi conviene
tenerle come contributi che si sommano, non come modalita' che si escludono.

## Idee future (NON implementare ora)
- Testa inclinata "curiosa" quando la pallina rallenta o si ferma.
- Respiro/dondolio leggero quando non c'è niente da guardare.
- Lanciare la pallina con il mouse (trascina e rilascia).
- Versione mobile: tocco e giroscopio.
- Registrazione GIF (il video MP4 e' stato fatto il 27 settembre 2026).
- Salvataggio delle impostazioni.
- Più cani diversi nella stessa griglia.
