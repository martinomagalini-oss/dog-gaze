# Note sugli asset 3D — Fase 0.5

Sorgente: `cane_v3_leggero.blend` (mesh `LOW`, 219.999 triangoli, 1 materiale,
1 texture `DOG_4K` 4096x4096 packed, nessun rig e nessuna animazione).

## File esportati

| File | Triangoli | Texture | Peso | Uso |
|---|---|---|---|---|
| `cane_web.glb` | 80.000 | 2048 JPEG q92 | 4,7 MB | **default della web app** |
| `cane_full.glb` | 219.999 | 4096 JPEG q92 | 11 MB | confronto / qualita' massima |

## Regola importante: MAI applicare shade_smooth dopo la decimazione

Il modello e' uno **scan fotogrammetrico senza normal map**: tutto il rilievo
(pelo, naso, orecchie) e' nella geometria, non in una texture.

Applicando `bpy.ops.object.shade_smooth()` dopo il Decimate si cancella
l'ombreggiatura originale e il risultato sembra "di plastica", anche a 130k
triangoli. Il Decimate da solo, senza toccare lo shading, conserva l'aspetto.

Scala di qualita' verificata con render di confronto:
- 130k  -> indistinguibile dall'originale
- 80k   -> ottimo, si perde solo un filo sul bordo delle orecchie  (scelto)
- 40k   -> accettabile, il pelo si appiattisce
- 40k + shade_smooth -> rovinato

## Orientamento

Nel .blend il muso punta verso **-Y** (la camera e' a y=-2,9 e guarda verso +Y).
Con l'export glTF (`export_yup=True`) diventa **+Z**, che in Three.js e'
"verso lo schermo". Quindi **nessuna calibrazione necessaria di default**:
i pulsanti "Ruota 90 gradi" del pannello restano solo come sicurezza.

## Ingombro

Bounding box: 1,288 (larghezza) x 1,711 (profondita') x 1,360 (altezza).
Non centrato sull'origine: il centro del bounding box e' circa
(-0,023 ; -0,145 ; 0). La web app normalizza comunque da sola
(centra sul bounding box e scala per entrare nella cella).

## Budget prestazioni

Con la griglia massima 8 x 5 = 40 teste:
- `cane_web.glb`  -> 3,2 milioni di triangoli per frame
- `cane_full.glb` -> 8,8 milioni di triangoli per frame

Le geometrie e i materiali sono condivisi tramite `clone()`, quindi la texture
viene caricata in memoria video una volta sola.
