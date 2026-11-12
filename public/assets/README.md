# TIDEBOUND assets

The game uses optimized owner-supplied 3D characters and synthesized sound effects when optional files are absent. Five generated music loops and one owner-supplied exploration track are bundled.

## Models

Bundled GLB files in `public/assets/models/`:

- `wayfarer-male.glb`
- `wayfarer-female.glb`

An optional `crimson-echo.glb` can be added for the legacy arena character. The two bundled player models have no rig or animation clips, so they use whole-body movement; the built-in character mesh is the fallback.

Animation clip names should include recognizable words such as `Idle`, `Walk`, `Run`, `Jump`, `Attack`, `Block`, `Dodge`, `Hit`, and `Defeat`. Clips may be embedded in each GLB.

Gameplay capsules remain independent of model geometry, so visual scale does not alter combat reach. Rigged replacement GLBs may contain their own clips; clips are not transferred between incompatible rigs. See `ASSETS.md` at the repository root for optional environment models.

## Audio

Bundled music in `public/assets/audio/`. The exploration track is the user supplied `kulakovka-action-game-620581.mp3` and plays only while exploring:

- `menu-music.mp3`
- `combat-music.mp3`
- `kulakovka-action-game-620581.mp3` (exploration)
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
