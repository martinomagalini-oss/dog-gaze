/**
 * Segnaposto usato finche' non viene caricato un modello 3D (fase 2).
 *
 * E' una sfera con un "naso" che sporge in avanti e due orecchie:
 * il naso serve a capire dove guarda la testa (imbardata),
 * le orecchie servono a leggere anche l'inclinazione su e giu'.
 * Senza un riferimento in alto, su una sfera il beccheggio e' invisibile.
 *
 * Il segnaposto e' costruito per stare dentro un cubo 1 x 1 x 1 centrato
 * sull'origine, esattamente come il modello normalizzato della fase 2:
 * cosi' la griglia puo' trattarli allo stesso modo.
 */
import * as THREE from 'three';

export function creaSegnaposto() {
  const gruppo = new THREE.Group();
  gruppo.name = 'segnaposto';

  const materialeTesta = new THREE.MeshStandardMaterial({
    color: 0xb9a68d,
    roughness: 0.75,
    metalness: 0.0,
  });
  const materialeNaso = new THREE.MeshStandardMaterial({
    color: 0x2e2a28,
    roughness: 0.4,
    metalness: 0.0,
  });

  // Testa: sfera di raggio 0,35 (diametro 0,7).
  const testa = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 16),
    materialeTesta
  );
  gruppo.add(testa);

  // Muso: cono appiattito che punta verso +Z, cioe' verso lo schermo.
  const muso = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.28, 16),
    materialeTesta
  );
  muso.rotation.x = Math.PI / 2;   // il cono nasce lungo +Y, lo giriamo su +Z
  muso.position.set(0, -0.07, 0.36);
  gruppo.add(muso);

  // Punta del naso: pallina scura in fondo al muso.
  const naso = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 8),
    materialeNaso
  );
  naso.position.set(0, -0.07, 0.5);
  gruppo.add(naso);

  // Orecchie: due coni ai lati, leggermente inclinati verso l'esterno.
  for (const lato of [-1, 1]) {
    const orecchio = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.26, 12),
      materialeTesta
    );
    orecchio.position.set(lato * 0.24, 0.32, -0.02);
    orecchio.rotation.z = lato * -0.45;
    gruppo.add(orecchio);
  }

  return gruppo;
}
