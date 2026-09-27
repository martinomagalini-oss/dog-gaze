/**
 * Renderer, camera ortografica, luci e rettangolo dell'area.
 *
 * La camera e' ORTOGRAFICA di proposito: con una camera prospettica le teste
 * ai bordi della griglia risulterebbero piu' piccole e inclinate, mentre qui
 * devono apparire tutte identiche e allineate.
 */
import * as THREE from 'three';
import { Ambiente } from './ambiente.js';
import {
  config,
  AREA_ALTEZZA,
  AREA_LARGHEZZA,
  RIEMPIMENTO_FINESTRA,
} from './config.js';

export function creaScena(contenitore) {
  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ACES comprime dolcemente le alte luci invece di tagliarle di netto.
  // Senza, il pelo bianco del cane arriva a 1 e li' si appiattisce: tutti i
  // dettagli piu' chiari diventano la stessa identica macchia bianca.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = config.esposizione;
  contenitore.appendChild(renderer.domElement);

  // ---------- Scena ----------
  const scena = new THREE.Scene();
  scena.background = new THREE.Color(config.coloreSfondo);

  // ---------- Camera ortografica ----------
  // I valori del frustum vengono calcolati in adattaAllaFinestra().
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  // ---------- Ambiente luminoso ----------
  // Deve nascere dopo il renderer: gli serve per preparare la mappa.
  const ambiente = new Ambiente(renderer, scena);

  // ---------- Luci ----------
  const luceAmbiente = new THREE.AmbientLight(0xffffff, config.intensitaAmbiente);
  scena.add(luceAmbiente);

  // Direzionale morbida che arriva da davanti, in alto a sinistra:
  // stacca le teste dallo sfondo senza creare ombre dure.
  const luceDirezionale = new THREE.DirectionalLight(0xffffff, config.intensitaDirezionale);
  luceDirezionale.position.set(-4, 6, 10);
  scena.add(luceDirezionale);

  // Luce di rimbalzo debole dal basso, per non lasciare il mento nero.
  const luceRimbalzo = new THREE.DirectionalLight(0xffffff, 0.35);
  luceRimbalzo.position.set(3, -5, 6);
  scena.add(luceRimbalzo);

  // ---------- Rettangolo dell'area ----------
  // Serve come riferimento visivo: e' il bordo dentro cui sta la griglia
  // e dentro cui, dalla fase 5, rimbalzera' la pallina.
  const bordoArea = creaBordoArea();
  scena.add(bordoArea);

  // ---------- Adattamento alla finestra ----------
  function adattaAllaFinestra() {
    const larghezza = contenitore.clientWidth;
    const altezza = contenitore.clientHeight;
    if (larghezza === 0 || altezza === 0) return;

    // Senza il terzo parametro Three.js aggiorna anche la dimensione CSS del
    // canvas. Passando `false` il canvas resterebbe grande quanto la sua
    // risoluzione interna (larghezza x fattore di scala dello schermo) e su
    // un monitor ad alta densita uscirebbe dal contenitore.
    renderer.setSize(larghezza, altezza);

    const aspetto = larghezza / altezza;

    // Semialtezza del frustum necessaria perche' l'area occupi
    // RIEMPIMENTO_FINESTRA in altezza...
    const perAltezza = (AREA_ALTEZZA / 2) / RIEMPIMENTO_FINESTRA;
    // ...e quella necessaria perche' ci stia anche in larghezza.
    const perLarghezza = ((AREA_LARGHEZZA / 2) / RIEMPIMENTO_FINESTRA) / aspetto;
    // Prendiamo la piu' grande: cosi' l'area ci sta in entrambe le direzioni.
    const semiAltezza = Math.max(perAltezza, perLarghezza);

    camera.top = semiAltezza;
    camera.bottom = -semiAltezza;
    camera.left = -semiAltezza * aspetto;
    camera.right = semiAltezza * aspetto;
    camera.updateProjectionMatrix();
  }

  adattaAllaFinestra();
  window.addEventListener('resize', adattaAllaFinestra);

  // ---------- Applicazione dei valori del pannello ----------
  function aggiornaDaConfig() {
    scena.background.set(config.coloreSfondo);
    luceAmbiente.intensity = config.intensitaAmbiente;
    luceDirezionale.intensity = config.intensitaDirezionale;
    bordoArea.visible = config.mostraBordoArea;

    renderer.toneMappingExposure = config.esposizione;
    ambiente.applica();
  }

  /** Ridisegna la mappa d'ambiente: serve solo se cambiano i suoi colori. */
  function ridisegnaAmbiente() {
    ambiente.ricostruisci();
  }

  return {
    renderer,
    scena,
    camera,
    adattaAllaFinestra,
    aggiornaDaConfig,
    ridisegnaAmbiente,
  };
}

/**
 * Rettangolo di riferimento dell'area, disegnato come linea chiusa.
 */
function creaBordoArea() {
  const mezzaL = AREA_LARGHEZZA / 2;
  const mezzaA = AREA_ALTEZZA / 2;

  const punti = [
    new THREE.Vector3(-mezzaL, -mezzaA, 0),
    new THREE.Vector3(mezzaL, -mezzaA, 0),
    new THREE.Vector3(mezzaL, mezzaA, 0),
    new THREE.Vector3(-mezzaL, mezzaA, 0),
  ];

  const geometria = new THREE.BufferGeometry().setFromPoints(punti);
  const materiale = new THREE.LineBasicMaterial({
    color: 0x4a5160,
    transparent: true,
    opacity: 0.8,
  });

  const linea = new THREE.LineLoop(geometria, materiale);
  linea.name = 'bordoArea';
  return linea;
}
