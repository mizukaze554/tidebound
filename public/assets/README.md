# Optional TIDEBOUND assets

The game runs safely without these files by using geometric characters and synthesized sound fallbacks.

## Models

Place rigged GLB files in `public/assets/models/`:

- `wayfarer-male.glb`
- `wayfarer-female.glb`
- `crimson-echo.glb`

Animation clip names should include recognizable words such as `Idle`, `Walk`, `Run`, `Jump`, `Attack`, `Block`, `Dodge`, `Hit`, and `Defeat`. Clips may be embedded in each GLB.

TIDEBOUND v1.3 also recognizes `Sprint` and `Landing`/`Land`. Gameplay capsules remain independent of model geometry, so visual scale or skeleton differences do not alter combat reach. Each GLB should contain animations compatible with its own skeleton; animation clips are not transferred between incompatible rigs.

## Audio

Place audio files in `public/assets/audio/`:

- `menu-music.mp3`
- `combat-music.mp3`
- `exploration-music.mp3`
- `victory-music.mp3`
- `defeat-music.mp3`
- `draw-music.mp3`
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

Missing files are optional: music remains silent and sound effects use Web Audio synthesis.
