# TIDEBOUND asset manifest

TIDEBOUND v1.2 does not bundle third-party character models, music, or sound-effect packs. The game remains functional with procedural character fallbacks and synthesized Web Audio effects.

## Bundled artwork

- `public/assets/tidebound-icon.png` — square app emblem derived from title artwork supplied by the project owner, used on the welcome screen, browser tab, and PWA manifest. The large source banner is intentionally not bundled to reduce the install size.

The project owner is responsible for confirming the right to publish and redistribute supplied artwork. Media files are not automatically covered by the repository's MIT software license.

## Optional model files

Place compatible files under `public/assets/models/`:

- `wayfarer-male.glb`
- `wayfarer-female.glb`
- `crimson-echo.glb`

GLB and glTF loading is implemented with `GLTFLoader`. Embedded clips are mapped by recognizable animation-name fragments. Missing or incompatible files safely retain the procedural characters.

## Optional audio files

See `public/assets/README.md` for the complete filename list. Missing music remains silent; missing sound effects use small synthesized fallbacks.

## Licensing

Assets from Quaternius, OpenGameArt, Kenney, or any other provider must be downloaded separately and reviewed under the license shown on the exact asset page. Preserve required author credits and license notices. Do not assume that the repository's MIT license applies to imported art, models, animations, or audio.
