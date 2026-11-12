# TIDEBOUND

TIDEBOUND is a playable third-person 3D combat prototype built with Three.js, Anime.js, vanilla JavaScript, and Vite. Every character, weapon, arena prop, and combat effect is generated from primitive geometry at runtime.

## v1.3 — The Living Duel

- Draws have their own result flow and optional music track.
- The three-hit combo, new `X` heavy attack, perfect guards, dodge invulnerability, hit-stop, elemental bursts, and difficulty-aware AI improve duel pacing.
- Skill Creator 2.0 adds projectile count, spread, knockback, casting time, strict JSON import, and safe JSON export while migrating v1.2 techniques automatically.
- Optional GLB/glTF characters map idle, walk, run, sprint, jump, landing, three attacks, block, dodge, hit, and defeat clips while retaining geometric fallbacks.
- The PWA build precaches hashed production JavaScript/CSS, supports offline single-player play, detects updates, and never clears localStorage techniques.
- Exact 192×192 and 512×512 maskable icons, install prompts, iOS guidance, safe-area-aware landscape controls, and conservative mobile graphics improve installation and mobile play.
- Low, Medium, and High presets now scale terrain, shadows, weather, and combat particles. The optional performance display reports FPS, draw calls, triangles, and active effects.
- The duel sanctuary adds instanced curved-surface rocks and flowers without substantially increasing draw calls.

## Seamless generated planet

The combat world is a spherical, boundary-free planet with a declared surface area of **9.6 million km²**, approximately the area of China. Rendering uses a compact scale for browser-safe floating-point physics while `kmPerUnit` preserves the authored geographic scale.

- Terrain is split into deterministic latitude/longitude chunks around the player.
- A stable coordinate hash controls height, biome, vegetation, crystals, and rare ruins.
- Chunks outside the active radius are removed and their GPU resources disposed.
- Revisiting coordinates regenerates the same terrain and landmarks.
- Longitude wraps continuously and terrain noise is periodic at the world seam.
- Radial gravity, movement, camera orientation, combat steering, and effects follow the curved surface.
- Clear, rain, fog, storm, and snow conditions rotate automatically every 40 seconds.

The low-detail planetary sphere remains visible below the streamed high-detail terrain, so the world is always a globe even when distant chunks are unloaded.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Click the world once to capture the mouse. Create a production build with `npm run build`.

## Deploy to Netlify

The repository includes `netlify.toml`; Netlify automatically uses the correct build command, Node version, SPA fallback, caching, and `dist` publish directory.

When importing the GitHub repository in Netlify, use:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22`

Build locally before deploying:

```bash
npm ci
npm run build
```

Run the production build plus focused collision, persistence, import-schema, AI, audio, match-result, and PWA tests:

```bash
npm test
```

Optional deployment with the Netlify CLI:

```bash
npx netlify-cli login
npx netlify-cli init
npx netlify-cli deploy --prod --dir=dist
```

## Controls

| Input | Action |
| --- | --- |
| W/A/S/D | Camera-relative movement |
| Shift | Sprint |
| Space | Jump |
| Left mouse | Three-hit combo |
| X | Heavy attack |
| Right mouse | Block |
| Q | Dodge with invulnerability frames |
| E / R / F | Equipped custom skills |
| Tab | Toggle target lock |
| Esc | Pause |

## Skill construction rules

Skills are stored in `localStorage`, so saved techniques and equipped slots survive refreshes and PWA updates. Power, range, speed, duration, projectile count, spread, knockback, and casting time participate in shared balance formulas. Imports accept declarative JSON only, are limited to 32 KB and 24 techniques, receive fresh IDs, and never execute code.

Supported combinations:

| Shape | Effects | Runtime behavior |
| --- | --- | --- |
| Projectile | Damage, Push, Pull | A physical projectile travels until it hits once or reaches its configured range. |
| Area | Damage, Push, Pull, Heal | An expanding ring affects an opponent once. Heal restores the caster immediately while showing the area pulse. |
| Beam | Damage, Push, Pull | An instant finite line/capsule test applies one hit. |
| Self | Shield, Heal, Push | Shield grants temporary absorb health; Heal restores the caster; Push becomes a forward elemental dash. |

Other combinations are rejected in the editor with a specific explanation. Elemental identity modifies behavior slightly: Fire damage is stronger, Wind projectiles are faster, Earth shields are tougher, and Water emphasizes control visually.

## Architecture

- `src/core` — game loop, input, and third-person camera
- `src/world` — procedural arena and lighting
- `src/entities` — character rigs, animation, and AI state machine
- `src/combat` — melee hit tests and data-driven skill runtime
- `src/effects` — pooled-lifetime procedural feedback and Web Audio cues
- `src/ui` — menus, HUD, results, and skill editor
- `src/data` — browser persistence and starter skills

Future server-authoritative boundaries are documented in [MULTIPLAYER.md](./MULTIPLAYER.md).

## PWA updates

Deploying v1.3 installs a new `tidebound-v1.3.0` application cache. Existing v1.2 caches are removed only after the new worker activates. When an update finishes downloading, use the in-game **UPDATE** notification; the page reloads after activation. Saved skills and audio/settings preferences remain in localStorage and require no migration step.

The main loop clamps frame delta to 50 ms, gameplay uses delta-time movement, temporary Three.js resources are disposed on expiry, particles/effects are capped by short lifetimes, and gameplay pauses when the window loses focus.

## License

Released under the [MIT License](./LICENSE). Copyright © 2026 mizukaze554.

Third-party and owner-supplied media are governed separately; see [ASSETS.md](./ASSETS.md).
