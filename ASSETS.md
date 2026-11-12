# TIDEBOUND asset manifest

TIDEBOUND bundles original generated music loops and procedural character fallbacks. No third-party character models or sound-effect packs are included.

The World Discovery Kit contributes JSON specifications and a basic Three.js geometry factory. These are placeholder procedural shapes, not 1,000 finished GLB models, textures, or licensed third-party art.

## Bundled artwork

- `artwork/tidebound-icon-source.png` — high-resolution source emblem derived from title artwork supplied by the project owner. It sits outside `public/` so it is not copied into production builds.
- `public/assets/tidebound-icon-192.png` — browser and compact PWA icon.
- `public/assets/tidebound-icon-512.png` — install and maskable PWA icon.

The project owner is responsible for confirming the right to publish and redistribute supplied artwork. Media files are not automatically covered by the repository's MIT software license.

## Optional model files

Place compatible files under `public/assets/models/`:

- `wayfarer-male.glb`
- `wayfarer-female.glb`
- `crimson-echo.glb`

GLB and glTF loading is implemented with `GLTFLoader`. Embedded clips are mapped by recognizable animation-name fragments. Missing or incompatible files safely retain the procedural characters.

## Optional audio files

Six original music loops are bundled in `public/assets/audio/`. Their generator is `tools/generate_music.py`. Missing sound effects use small synthesized fallbacks. See `public/assets/README.md` for optional sound-effect filenames.

## Licensing

Assets from Quaternius, OpenGameArt, Kenney, or any other provider must be downloaded separately and reviewed under the license shown on the exact asset page. Preserve required author credits and license notices. Do not assume that the repository's MIT license applies to imported art, models, animations, or audio.
