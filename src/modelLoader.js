/**
 * Caricamento dei modelli 3D.
 *
 * Due strade:
 *  - caricaDaUrl()   per i modelli gia' inclusi in public/modelli/
 *  - caricaDaFile()  per i file trascinati o scelti dall'utente
 *
 * Formati: .glb / .gltf (il principale), .fbx, .obj (+ .mtl + immagini).
 *
 * Il punto delicato e' il formato .obj: il file .obj rimanda al .mtl per
 * nome, e il .mtl rimanda alle immagini per nome. Quei nomi sono percorsi
 * relativi che nel browser non esistono, perche' i file trascinati vivono
 * solo in memoria. Per questo usiamo un LoadingManager con un "traduttore"
 * di indirizzi: ogni volta che un caricatore chiede un file, lo cerchiamo
 * per nome fra quelli trascinati e gli diamo un indirizzo temporaneo.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export const ESTENSIONI_MODELLO = ['glb', 'gltf', 'fbx', 'obj'];

/** Carica un modello da un indirizzo (i file gia' presenti nel progetto). */
export function caricaDaUrl(url) {
  const estensione = estensioneDi(url);

  if (estensione === 'glb' || estensione === 'gltf') {
    return new Promise((risolvi, rifiuta) => {
      new GLTFLoader().load(
        url,
        (gltf) => risolvi({
          oggetto: gltf.scene,
          nome: nomeBase(url),
          formato: estensione.toUpperCase(),
        }),
        undefined,
        rifiuta
      );
    });
  }

  return Promise.reject(
    new Error(`Formato non previsto per i modelli inclusi: .${estensione}`)
  );
}

/**
 * Carica un modello da un elenco di file (trascinati o scelti dal pulsante).
 * Possono esserci piu' file insieme: il .obj con il suo .mtl e le immagini.
 */
export async function caricaDaFile(elencoFile) {
  const file = Array.from(elencoFile);
  if (file.length === 0) throw new Error('Nessun file ricevuto.');

  // Indice per nome, usato dal traduttore di indirizzi.
  const perNome = new Map();
  for (const f of file) perNome.set(nomeBase(f.name).toLowerCase(), f);

  const principale = trovaFilePrincipale(file);
  if (!principale) {
    throw new Error(
      `Nessun modello riconosciuto. Formati accettati: ${ESTENSIONI_MODELLO
        .map((e) => '.' + e)
        .join(', ')}`
    );
  }

  const estensione = estensioneDi(principale.name);
  const indirizziTemporanei = [];
  const gestore = creaGestore(perNome, indirizziTemporanei);

  // Quando tutto (modello e texture) e' stato caricato, gli indirizzi
  // temporanei non servono piu' e vanno liberati per non sprecare memoria.
  gestore.onLoad = () => {
    for (const indirizzo of indirizziTemporanei) URL.revokeObjectURL(indirizzo);
    indirizziTemporanei.length = 0;
  };

  const indirizzoPrincipale = registraIndirizzo(principale, indirizziTemporanei);

  let oggetto;
  if (estensione === 'glb' || estensione === 'gltf') {
    const gltf = await promessa((ok, ko) =>
      new GLTFLoader(gestore).load(indirizzoPrincipale, ok, undefined, ko)
    );
    oggetto = gltf.scene;
  } else if (estensione === 'fbx') {
    oggetto = await promessa((ok, ko) =>
      new FBXLoader(gestore).load(indirizzoPrincipale, ok, undefined, ko)
    );
  } else {
    oggetto = await caricaObj(file, indirizzoPrincipale, gestore, indirizziTemporanei);
  }

  return {
    oggetto,
    nome: principale.name,
    formato: estensione.toUpperCase(),
  };
}

/**
 * Carica un .obj, usando il .mtl se e' stato trascinato insieme.
 * Senza .mtl il modello arriva con un materiale grigio di ripiego.
 */
async function caricaObj(file, indirizzoObj, gestore, indirizziTemporanei) {
  const fileMtl = file.find((f) => estensioneDi(f.name) === 'mtl');

  const caricatoreObj = new OBJLoader(gestore);

  if (fileMtl) {
    const indirizzoMtl = registraIndirizzo(fileMtl, indirizziTemporanei);
    const materiali = await promessa((ok, ko) =>
      new MTLLoader(gestore).load(indirizzoMtl, ok, undefined, ko)
    );
    materiali.preload();
    caricatoreObj.setMaterials(materiali);
  }

  return promessa((ok, ko) => caricatoreObj.load(indirizzoObj, ok, undefined, ko));
}

/**
 * LoadingManager che traduce i percorsi relativi richiesti dai caricatori
 * negli indirizzi temporanei dei file che abbiamo in memoria.
 */
function creaGestore(perNome, indirizziTemporanei) {
  const gestore = new THREE.LoadingManager();

  gestore.setURLModifier((indirizzo) => {
    // Gli indirizzi che abbiamo creato noi vanno lasciati com'e'.
    if (indirizzo.startsWith('blob:') || indirizzo.startsWith('data:')) {
      return indirizzo;
    }

    // Cerchiamo il file per solo nome, ignorando cartelle e parametri:
    // il .mtl potrebbe chiedere "..\textures\pelo.jpg".
    const cercato = nomeBase(indirizzo).toLowerCase();
    const file = perNome.get(cercato);
    if (!file) return indirizzo;

    return registraIndirizzo(file, indirizziTemporanei);
  });

  return gestore;
}

/** Crea un indirizzo temporaneo per un file e lo segna per la pulizia. */
function registraIndirizzo(file, indirizziTemporanei) {
  const indirizzo = URL.createObjectURL(file);
  indirizziTemporanei.push(indirizzo);
  return indirizzo;
}

/**
 * Sceglie il file da caricare quando ne arrivano diversi insieme.
 * L'ordine di ESTENSIONI_MODELLO fa da priorita': se ci fossero
 * sia un .glb sia un .obj, vince il .glb.
 */
function trovaFilePrincipale(file) {
  for (const estensione of ESTENSIONI_MODELLO) {
    const trovato = file.find((f) => estensioneDi(f.name) === estensione);
    if (trovato) return trovato;
  }
  return null;
}

/** Ultimo pezzo di un percorso, senza parametri di query. */
function nomeBase(percorso) {
  return percorso.split(/[?#]/)[0].split(/[\/]/).pop();
}

function estensioneDi(percorso) {
  return nomeBase(percorso).split('.').pop().toLowerCase();
}

/** Trasforma le funzioni con callback dei caricatori in promesse. */
function promessa(esegui) {
  return new Promise((ok, ko) => esegui(ok, ko));
}

/* ------------------------------------------------------------------ */
/*  Interazione: trascinamento sull'area e pulsante "Carica modello"   */
/* ------------------------------------------------------------------ */

/**
 * Attiva il trascinamento dei file sull'elemento indicato.
 * Mostra un riquadro di conferma mentre si trascina sopra.
 */
export function collegaTrascinamento(elemento, alRilascio) {
  const zona = document.createElement('div');
  zona.id = 'zona-rilascio';
  zona.textContent = 'Rilascia qui il modello';
  elemento.appendChild(zona);

  // Il contatore serve perche' entrando sopra un elemento figlio il browser
  // manda un dragleave dal genitore: senza contarli il riquadro sfarfalla.
  let profondita = 0;

  const mostra = (visibile) => zona.classList.toggle('attiva', visibile);

  elemento.addEventListener('dragenter', (e) => {
    e.preventDefault();
    profondita++;
    mostra(true);
  });

  elemento.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  elemento.addEventListener('dragleave', (e) => {
    e.preventDefault();
    profondita = Math.max(0, profondita - 1);
    if (profondita === 0) mostra(false);
  });

  elemento.addEventListener('drop', (e) => {
    e.preventDefault();
    profondita = 0;
    mostra(false);
    if (e.dataTransfer?.files?.length) alRilascio(e.dataTransfer.files);
  });
}

/**
 * Apre la finestra di scelta file del sistema.
 * L'input resta staccato dalla pagina: serve solo ad aprire la finestra.
 */
export function apriSelettoreFile(alSelezione) {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true; // per .obj + .mtl + immagini insieme
  input.accept = ESTENSIONI_MODELLO.map((e) => '.' + e).join(',') + ',.mtl,image/*';
  input.addEventListener('change', () => {
    if (input.files?.length) alSelezione(input.files);
  });
  input.click();
}
