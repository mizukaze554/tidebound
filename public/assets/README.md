# TIDEBOUND assets

The game uses portrait-inspired geometric 3D characters and synthesized sound effects when optional files are absent. Five generated music loops and one owner-supplied exploration track are bundled.

## Models

Place rigged GLB files in `public/assets/models/`:

- `wayfarer-male.glb`
- `wayfarer-female.glb`
- `crimson-echo.glb`

Animation clip names should include recognizable words such as `Idle`, `Walk`, `Run`, `Jump`, `Attack`, `Block`, `Dodge`, `Hit`, and `Defeat`. Clips may be embedded in each GLB.

TIDEBOUND v1.3 also recognizes `Sprint` and `Landing`/`Land`. Gameplay capsules remain independent of model geometry, so visual scale or skeleton differences do not alter combat reach. Each GLB should contain animations compatible with its own skeleton; animation clips are not transferred between incompatible rigs.

## Audio

Bundled music in `public/assets/audio/`. The exploration track is the user supplied `kulakovka-action-game-620581.mp3` and plays only while exploring:

- `menu-music.mp3`
- `combat-music.mp3`
- `exploration-music.mp3`
- `victory-music.mp3`
- `defeat-music.mp3`
- `draw-music.mp3`

Optional sound effects in the same directory:

- `sword-hit.mp3`
- `sword-swing.mp3`
- `block.mp3`
- `perfect-block.mp3`
- `skill.mp3`
- `ui-click.mp3`
- `dodge.mp3`
- `footstep.mp3`
- `jump.mp3`
- `landing.mp3`
- `fire-skill.mp3`
- `water-skill.mp3`
- `wind-skill.mp3`
- `earth-skill.mp3`

Missing optional sound effects use Web Audio synthesis. The bundled music can be regenerated with `python3 tools/generate_music.py` when ffmpeg is installed.
