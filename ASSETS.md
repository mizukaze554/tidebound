# TIDEBOUND asset manifest

TIDEBOUND bundles generated music loops, one owner-supplied exploration track, owner-supplied character portraits, and procedural 3D characters. No third-party character models or sound-effect packs are included.

The World Discovery Kit contributes JSON specifications and a basic Three.js geometry factory. These are placeholder procedural shapes, not 1,000 finished GLB models, textures, or licensed third-party art.

## Bundled artwork

- `artwork/tidebound-icon-source.png` — high-resolution source emblem derived from title artwork supplied by the project owner. It sits outside `public/` so it is not copied into production builds.
- `public/assets/tidebound-icon-192.png` — browser and compact PWA icon.
- `public/assets/tidebound-icon-512.png` — install and maskable PWA icon.
- `public/assets/characters/wayfarer-male.png` and `wayfarer-female.png` — portraits supplied by the project owner, shown on the appearance selection screen.
- `src/entities/ReferenceCharacterModel.js` — procedural 3D interpretations of those portraits, attached to the animated character rig. These are not exact sculpted recreations.

The project owner is responsible for confirming the right to publish and redistribute supplied artwork. Media files are not automatically covered by the repository's MIT software license.

## Optional model files

The player currently uses the built-in portrait-based 3D meshes. The optional GLB loader remains available for the legacy arena character at `public/assets/models/crimson-echo.glb`.

Compatible GLB files may be placed under `public/assets/models/` for future integration:

- `wayfarer-male.glb`
- `wayfarer-female.glb`
- `crimson-echo.glb`

GLB and glTF loading is implemented with `GLTFLoader`. Embedded clips are mapped by recognizable animation-name fragments. The player appearance paths currently use the built-in 3D meshes, while missing or incompatible arena files retain the procedural fallback.

## Optional audio files

Five generated music loops and the owner-supplied `kulakovka-action-game-620581.mp3` are bundled in `public/assets/audio/`. The supplied track is installed as `exploration-music.mp3` and only plays during active exploration. The generator for the other tracks is `tools/generate_music.py`. Missing sound effects use small synthesized fallbacks. See `public/assets/README.md` for optional sound-effect filenames.

## Licensing

Assets from Quaternius, OpenGameArt, Kenney, or any other provider must be downloaded separately and reviewed under the license shown on the exact asset page. Preserve required author credits and license notices. Do not assume that the repository's MIT license applies to imported art, models, animations, or audio.
