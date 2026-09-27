# Cani che guardano la pallina

**Provalo online:** https://martinomagalini-oss.github.io/dog-gaze/

Trascina un tuo modello 3D (.glb) sopra l'area per vedere la tua griglia.

Web app locale: una griglia di teste del cane che seguono con lo sguardo
il cursore del mouse o una pallina da tennis che rimbalza.

## Pubblicazione

Il sito si aggiorna da solo: a ogni salvataggio caricato sul ramo principale,
GitHub ricostruisce l'app e la rimette online. Non serve fare niente a mano.

## Come avviare

Apri un terminale in questa cartella e lancia:

    npm install
    npm run dev

Poi apri il browser all'indirizzo che compare (di solito http://localhost:5173).

`npm install` serve solo la prima volta.

## Stato dello sviluppo

- [x] **Fase 0** — setup Vite + Three.js + lil-gui
- [x] **Fase 1** — area 9:19,5, camera ortografica, griglia con segnaposti
- [x] **Fase 2** — caricamento del modello del cane
- [x] **Fase 3** — sguardo verso il cursore
- [x] **Fase 4** — effetto onda
- [x] **Fase 5** — pallina da tennis
- [x] **Fase 6** — modalita' sonno
- [x] **Fase 7** — rifinitura

## Struttura

    index.html
    src/
      main.js        avvio e ciclo di animazione
      config.js      TUTTI i parametri numerici, in un posto solo
      scene.js       renderer, camera ortografica, luci, bordo dell'area
      grid.js        costruzione e aggiornamento della griglia di teste
      segnaposto.js  testa finta usata finche' non si carica il modello
      contatore.js   contatore fps in sovrimpressione sulla scena
      modelLoader.js caricamento modelli + trascinamento dei file
      lookAt.js      calcolo delle rotazioni dello sguardo
      targetHistory.js storico delle posizioni del bersaglio (per l'onda)
      ball.js        la pallina da tennis: moto, rimbalzi, texture
      sonno.js       addormentamento, respiro, risveglio, le "Z"
      ambiente.js    la luce d'ambiente generata via codice
      coreografia.js i movimenti che i cani fanno da soli
      posa.js        mette insieme sguardo + coreografia + sonno
      registrazione.js registrazione video dell'area
      ui.js          pannello di controllo
      stile.css      impaginazione della pagina
    public/
      modelli/       i file .glb del cane (vedi NOTE-ASSET.md)

## I modelli del cane

Nella cartella `public/modelli/` ci sono tre versioni dello stesso modello,
esportate dal file Blender originale:

| File | Triangoli | Texture | Peso | fps misurati a 8x5 |
|---|---|---|---|---|
| `cane_web.glb`  | 80.000  | 2K | 4,7 MB | **60** (default) |
| `cane_hq.glb`   | 130.000 | 2K | 6,7 MB | 54 |
| `cane_full.glb` | 220.000 | 4K | 11 MB  | 30 |

Gli fps sono stati misurati sul computer di sviluppo con la griglia piena
(8 x 5 = 40 teste). Il default e' la versione leggera, l'unica che tiene
i 60 fps pieni.

Si sceglie quale usare dal pannello, sezione **Modello**.
I dettagli delle scelte fatte sono in `public/modelli/NOTE-ASSET.md`.

## Caricare un modello tuo

Due modi:

- **Trascinalo** sopra l'area della scena;
- oppure premi **Carica modello...** nel pannello.

Formati accettati: **.glb** e **.gltf** (i migliori, texture incluse nel file),
**.fbx**, **.obj**. Per un .obj trascina insieme anche il **.mtl** e le
**immagini delle texture**, tutti nello stesso momento: i file vivono solo in
memoria e i nomi dei percorsi scritti dentro il .mtl vengono risolti per nome.

Il modello viene centrato e ridimensionato da solo per entrare nella cella.

### Se il modello arriva storto

Nel pannello c'e' la sezione **Calibrazione orientamento**, chiusa di default
perche' il modello del cane e' gia' dritto. Dentro ci sono i pulsanti
"Ruota 90 gradi" su X, Y e Z, gli stessi angoli regolabili a mano, e "Azzera".
La correzione vale per tutte le copie insieme.

## I comandi dello sguardo

Nel pannello, sezione **Sguardo**. Sono le manopole che decidono il carattere
dell'insieme: conviene provarle dal vivo muovendo il mouse.

- **Distanza bersaglio** — quanto e' lontano, davanti allo schermo, il punto
  guardato. E' il comando piu' importante. Valori bassi: le teste ai bordi si
  girano moltissimo, effetto marcato e un po' teatrale. Valori alti: guardano
  quasi tutte dritte e l'effetto quasi sparisce.
- **Perno verso la nuca** — dove sta il centro di rotazione. A 0 la testa gira
  su se stessa restando ferma nella cella; alzandolo il perno arretra verso il
  collo e la testa si sposta di lato mentre gira, come fa un collo vero.
- **Raggio attenzione** — entro questa distanza dal bersaglio il cane reagisce
  del tutto. Oltre, si spegne. Senza questo comando l'imbardata dipenderebbe
  solo dallo scostamento orizzontale e intere righe si girerebbero all'unisono,
  anche quelle lontanissime dal bersaglio.
- **Sfumatura attenzione** — larghezza della banda in cui l'attenzione si
  spegne. Se la metti a 0 si vede una linea netta fra i cani che reagiscono e
  quelli fermi, e muovendo il mouse le teste scattano entrando e uscendo.
- **Reazione dei lontani** — quanto rotazione conservano i cani fuori dal
  raggio. A 0 restano immobili, a 15 fanno un accenno.
- **Limite sinistra/destra** e **Limite su/giu** — di quanto puo' girarsi al
  massimo. Servono a impedire che una testa si volti all'indietro.
- **Prontezza** — quanto rapidamente insegue il bersaglio.
- **Ritorno a riposo** — quanto lentamente torna dritta quando il mouse esce
  dall'area. Volutamente piu' lenta della prontezza: l'attenzione si perde
  con piu' calma di quanto si conquisti.

## L'effetto onda

Nessun cane guarda dove sta il bersaglio adesso: guarda dov'era un attimo fa.
Piu' e' lontano, piu' va indietro nel tempo. Cosi' i vicini partono per primi
e il movimento attraversa la griglia come un'onda.

Le posizioni del bersaglio finiscono in uno storico di 2 secondi
(`targetHistory.js`) e ogni cane ci pesca dentro il punto che gli spetta,
interpolando fra i due campioni piu' vicini.

Comandi, sezione **Onda**:

- **Intensita onda** — a 0 tutti i cani reagiscono insieme, senza ritardi.
- **Ritardo max** — di quanto e' in ritardo il cane piu' lontano.
- **Variazione fra cani** — quanto differisce la prontezza da un cane
  all'altro. Serve a non farli sembrare copie dello stesso oggetto: ogni cane
  ha un numero casuale fisso che lo rende un filo piu' pronto o piu' pigro.

Nota importante: il ritardo si distribuisce sulla **zona di attenzione**, non
sull'intera area. Misurandolo sull'area intera, il cane col ritardo massimo si
troverebbe gia' fuori dalla zona viva e si muoverebbe del 5%: l'onda ci
sarebbe nei numeri ma non si vedrebbe. Se allarghi il raggio di attenzione
fino a coprire tutto, le due misure tornano a coincidere.

## La pallina da tennis

Nel pannello, sezione **Pallina**. Si sceglie con **I cani guardano** se il
bersaglio e' il mouse o la pallina. La texture e' disegnata via codice su un
canvas, quindi non serve nessun file di immagine.

- **Pausa / Riprendi** — ferma e fa ripartire la pallina.
- **Rilancia dal centro** — la rimette al centro con una direzione nuova.
- **Velocita** — la pallina viaggia a velocita' costante.
- **Dimensione** — raggio della pallina.
- **Velocita rotazione** — quanto vorticosamente gira su se stessa, in % del
  rotolamento reale. Al 100% gira esattamente come rotolerebbe davvero: sotto
  sembra che slitti, sopra che abbia effetto. E' una scelta estetica.
- **Casualita rimbalzo** — di quanto devia dalla riflessione perfetta a ogni
  rimbalzo. A 0 ripete all'infinito lo stesso zigzag e dopo mezzo minuto si
  riconosce lo schema.
- **Curvatura del volo** — quanto piega la traiettoria mentre vola. Cambia
  con dolcezza, non a scatti.
- **Angolo minimo dal muro** — impedisce le traiettorie quasi parallele ai
  bordi. Senza, dopo qualche rimbalzo la pallina finisce per strisciare lungo
  un lato, esce dalla zona dove stanno i cani e lo spettacolo si ferma.

Comportamento verificato su 5 minuti di moto simulato: nessuna uscita dai
bordi, nessuna traiettoria radente, tutte e 40 le zone dell'area attraversate,
mai piu' di mezzo secondo fermo nella stessa zona.

## La modalita' sonno

Se il bersaglio resta fermo per il tempo impostato (10 secondi), i cani si
addormentano **uno alla volta**. In modalita' pallina succede solo quando la
pallina e' in pausa: finche' vola, il bersaglio si muove a ogni fotogramma.

L'ordine non e' casuale: si addormentano prima i cani **piu' lontani** dal
bersaglio, quelli che si sono annoiati per primi, e il sonno cala verso il
centro. Al risveglio e' il contrario: partono i **piu' vicini**, come l'onda
dello sguardo, ciascuno con un piccolo sussulto prima di rimettersi a guardare.

Da addormentati il muso scende, la testa si piega di lato (l'unico rollio di
tutto il progetto: da sveglio un cane non inclina mai la testa) e respirano
con tempi leggermente diversi l'uno dall'altro. Sopra ciascuno salgono delle
"Z" che svaniscono, disegnate via codice come la texture della pallina.

Comandi, sezione **Sonno**:

- **Sonno attivo** — lo esclude del tutto.
- **Secondi prima del sonno** — quanto deve restare fermo il bersaglio.
- **Casualita ordine** — a 0 l'ordine e' rigorosamente per distanza e si
  legge troppo lo schema; a 100 e' pura lotteria e si perde il senso.
- **Ritmo addormentamento** — quanto tempo passa fra un cane e il successivo.
- **Muso in giu** e **Piega laterale** — la posa del cane addormentato.
- **Mostra le Z**.

Nota su come si incastra con lo sguardo: `sonno.js` gira DOPO `lookAt.js`.
Lo sguardo lascia i suoi angoli scritti sulla testa, e il sonno li mescola con
la posa del dormiente in proporzione a quanto profondamente dorme. Cosi' i due
sistemi non litigano per la stessa rotazione e il passaggio e' continuo.

## Le luci

Il modello del cane e' uno **scan fotogrammetrico**: la sua texture contiene
gia' la luce del momento in cui e' stato scansionato. E' il motivo per cui,
nelle prime versioni, aggiungere luci dirette forti lo sbiancava invece di
valorizzarlo: si sommava luce a luce gia' dipinta.

La soluzione e' poca luce diretta e molta **luce d'ambiente**. In
`ambiente.js` viene disegnato su un canvas una specie di studio fotografico
in miniatura (cielo chiaro sopra, terra scura sotto, due pannelli luminosi
davanti) e dato a Three.js come ambiente: cosi' ogni punto della superficie
riceve luce da tutte le direzioni, che e' quello che da' volume. Nessun file
esterno, come per la texture della pallina e per le "Z".

C'e' anche una **curva di esposizione** (ACES) che comprime le alte luci
invece di tagliarle: senza, il pelo bianco arriva al massimo e li' si
appiattisce, e tutti i dettagli piu' chiari diventano la stessa macchia.

Comandi, sezione **Luci**:

- **Esposizione** — quanto e' luminosa la scena nel complesso.
- **Luce d ambiente** — si puo' spegnere: e' il modo piu' rapido per vedere
  quanto contribuisce.
- **Forza ambiente** — quanto pesa nell'illuminazione.
- **Colore dall alto** e **Colore dal basso** — i due colori dello studio.
  Il secondo e' quello che illumina il mento e la gola.
- **Pannelli luminosi** — i due "softbox" in alto, uno principale a sinistra e
  uno di rinforzo a destra: e' lo schema classico da ritratto, e da' un
  rilievo asimmetrico molto piu' interessante di una luce frontale piatta.
- **Luce piatta** e **Luce diretta** — le vecchie luci diffusa e direzionale,
  ora tenute basse di proposito.

## Le coreografie

Movimenti che i cani fanno da soli, senza guardare niente. I tre assi,
detti in italiano:

- **Y** = si gira a destra e a sinistra (la giravolta)
- **X** = si ruota in avanti (la capriola)
- **Z** = si ruota di lato (la ruota)

Di norma la testa fa il **giro intero** e continua a girare sempre nello
stesso verso, senza tornare indietro. Con l'interruttore **Giro completo**
spento torna invece a dondolare attorno alla posizione di riposo.

| Coreografia | Cosa fa |
|---|---|
| Giravolta - asse Y | giro completo a destra e a sinistra: i vicini girano in versi opposti |
| Capriola in avanti - asse X | tutti in avanti insieme, la capriola vera e propria |
| Capriola alternata - asse X | come sopra, ma i vicini vanno in versi opposti |
| Ruota di lato - asse Z | giro sul fianco, vicini in versi opposti |
| Mista - tutti e tre | tre gruppi a scacchiera, uno per asse, sfasati fra loro |
| Serpente | il giro percorre la griglia a serpentina, e mentre passa fa descrivere a ogni testa un cerchio: e' quella torsione che fa capire che l'asse sta cambiando |
| Libera - ognuno per se | ogni cane ha verso, ritmo e punto di partenza suoi su tutti e tre gli assi. Le velocita' non sono multiple fra loro, quindi non torna mai uguale |

Comandi:

- **Giro completo** — giro intero oppure dondolio.
- **Giri al secondo** — la velocita' di rotazione.
- **Ampiezza dondolio** — quanto e' ampio il dondolio. Conta solo a "Giro
  completo" spento.
- **Sfasamento fra cani** — quanto ritardo c'e' fra un cane e il successivo.
  A 0 si muovono all'unisono e sembrano un meccanismo; alzandolo il
  movimento diventa una catena. Conta soprattutto per il Serpente.
- **Peso sguardo** — quanto contano mouse e pallina MENTRE girano. A 100 i
  cani fanno le due cose insieme, a 0 ignorano il bersaglio e girano e basta.

Mentre una coreografia e' in corso il **sonno resta sospeso**: i cani stanno
ballando, non annoiandosi, anche se il bersaglio e' fermo.

Nota tecnica: gli angoli si avvicinano sempre per la via piu' corta sul
cerchio. Senza questa accortezza, passando da +179 a -179 gradi (che sono
due gradi di distanza) la testa percorrerebbe 358 gradi nel verso sbagliato,
e a ogni giro si vedrebbe uno srotolamento all'indietro.

## Registrare un video

Il pulsante **Registra** sta in alto a destra, accanto al rettangolo. Si preme
una volta per partire e una volta per fermare; poi compare il pulsante per
scaricare il file.

Cosa finisce nel video:

- **solo il rettangolo 9:19,5**, non tutta la finestra. Il video esce gia' in
  formato verticale, pronto da pubblicare, senza i margini vuoti attorno;
- **non** il contatore degli fps, i messaggi e il pulsante stesso: quelli sono
  scritti nella pagina, non dentro la scena 3D, quindi non vengono ripresi;
- il bordo dell'area invece **si vede**, perche' e' disegnato nella scena. Per
  un video pulito conviene togliere la spunta a "Mostra bordo area".

Il formato e' **MP4** dove il browser sa produrlo (Chrome ed Edge), altrimenti
WebM. Il nome del file contiene data e ora, cosi' i video non si sovrascrivono.

Comandi, sezione **Aspetto**:

- **Registra solo il rettangolo** — togliendolo riprende tutta la finestra.
- **Definizione video** — quanti pixel veri disegnare per ogni pixel dello
  schermo, ma solo mentre registra. A "Come lo schermo" il video esce della
  misura che il rettangolo ha a video, che e' poca cosa per pubblicarlo;
  a "Tripla" la stessa scena viene disegnata tre volte piu' fitta e il video
  esce molto piu' definito. A video non cambia niente, diventa solo piu'
  nitido. Attenzione pero': disegnare piu' fitto costa lavoro alla scheda
  video, e se gli fps calano si vede nel filmato.
- **Qualita video** — quanti dati al secondo. Piu' alto, file piu' pesante e
  immagine piu' pulita nei movimenti rapidi.

Nota tecnica: il renderer e' creato con `preserveDrawingBuffer` attivo. Senza,
il browser puo' svuotare il buffer di disegno prima che il codice riesca a
copiarne il contenuto, e il video verrebbe fuori nero.

## Come si compone la posa finale

Tre moduli diversi vogliono muovere la stessa testa: lo sguardo, la
coreografia e il sonno. Se ognuno scrivesse per conto suo nella rotazione,
l'ultimo a parlare cancellerebbe il lavoro degli altri, e la coreografia
sparirebbe ogni volta che un cane si addormenta.

Per questo ogni modulo **calcola e basta**, lasciando il proprio contributo
scritto sulla testa, e un unico modulo (`posa.js`) li mette insieme:

    lookAt.js       -> dove guarda
    coreografia.js  -> come balla
    sonno.js        -> quanto dorme e in che posa
    posa.js         -> somma tutto e scrive la rotazione

Le regole: piu' un cane dorme, meno contano sguardo e coreografia; il
sussulto del risveglio si somma sempre; da sveglio il rollio arriva solo
dalla coreografia, perche' guardando qualcosa un cane non piega la testa.

## Impostazioni di partenza

I valori di default in `src/config.js` non sono scelte a caso: sono quelli
trovati provando dal vivo, regolando le manopole e guardando il risultato.

| Comando | Valore |
|---|---|
| Griglia | 4 colonne x 5 righe |
| Dimensione testa | 100% della cella |
| Distanza bersaglio | 5 |
| Perno verso la nuca | 10% |
| Raggio attenzione | 19% |
| Sfumatura attenzione | 18% |
| Reazione dei lontani | 5% |
| Limite sinistra/destra | 78 gradi |
| Limite su/giu | 68 gradi |
| Prontezza | 24,5 |
| Ritorno a riposo | 2,3 |
| Intensita onda | 28% |
| Ritardo max | 90 ms |
| Variazione fra cani | 9% |
| Velocita pallina | 4,5 |
| Dimensione pallina | 0,32 |
| Velocita rotazione pallina | 100% |
| Casualita rimbalzo | 15 gradi |
| Curvatura del volo | 25 gradi/s |
| Angolo minimo dal muro | 20 gradi |
| Secondi prima del sonno | 10 |
| Casualita ordine sonno | 45% |
| Ritmo addormentamento | 0,3 s |
| Muso in giu (sonno) | 30 gradi |
| Piega laterale (sonno) | 14 gradi |
| Esposizione | 0,5 |
| Forza ambiente | 1,35 |
| Colore dall'alto | `#eaf0f8` |
| Colore dal basso | `#55503f` |
| Pannelli luminosi | 95% |
| Luce piatta | 0,2 |
| Luce diretta | 0,85 |
| Coreografia | nessuna |
| Giro completo | si |
| Ampiezza dondolio | 22 gradi |
| Giri al secondo | 0,3 |
| Sfasamento fra cani | 22% |
| Peso sguardo | 100% |
| Registra solo il rettangolo | si |
| Definizione video | tripla |
| Qualita video | 12 Mbps |
| Sfondo | grigio-azzurro `#4e5b73` |

Il carattere che ne esce: area di attenzione stretta, reazione scattante,
rilassamento pacato, e i cani lontani praticamente immobili.

## Note

- Solo per computer: niente supporto per tocco o mobile.
- Nessun backend: gira tutto nel browser.
- I commenti nel codice sono in italiano.
