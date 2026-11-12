# TIDEBOUND

TIDEBOUND is an offline, single-player Three.js world. Choose an appearance, explore a spherical planet, discover skills and items, gather materials, build structures, and fight packs of wildlings that notice you nearby. There is no timed duel on the title screen.

## Play

1. Select **Enter World**, then choose an appearance. The first character receives one or two random starter skills and exactly one basic weapon. These rewards are stored once and never rerolled on refresh.
2. Open the **Discovery Journal** to see only skills, items, and blueprints you have earned. Equip discovered skills to E, R, or F. Equip a weapon or armor from Inventory. Use **Change Appearance** on the title or pause screen to switch between the two characters without rerolling rewards. **New Game · Erase Save** clears this site's local storage and returns to character selection.
3. Explore the Azure Valley meadow, forest, ruins, river, bridge, and distant waterfall. Gather grass, trees, and stones for fiber, wood, and stone. The first gathers reveal foundation, wall, and hut blueprints. Coastal sand and mountain iron unlock road and watchtower blueprints. Open Blueprints, preview a structure, rotate it, and place it on clear, sufficiently flat ground when you have its materials.
4. Wildlings roam in groups. They attack if they see you within range or you approach closely. Normal attacks, blocks, dodges, and catalog skills work in these encounters. Defeat and exploration can reveal more discoveries.

## Controls

| Input | Action |
| --- | --- |
| WASD / left touch stick | Move |
| Mouse / right touch area | Look |
| Shift | Sprint |
| Space / jump button | Jump |
| G / Gather button | Gather a nearby resource |
| J / Journal button | Open the Discovery Journal |
| B | Open discovered blueprints |
| Left click or C / attack button | Attack while moving or sprinting |
| X | Heavy attack |
| Right click or hold V / block button | Block |
| Q / dodge button | Dodge |
| E, R, F / skill buttons | Use equipped skills |
| Esc / pause button | Pause |

The supplied action track plays during exploration after a tap or key press. Music stops on the title screen, pause screen, and results screen. Volume and AI difficulty are available in Settings. Mobile play uses landscape orientation.

## Catalogs and saves

- `src/data/catalog/skills.json`: exactly 1,000 fixed skills across 20 elemental domains. Every catalog effect type has a combat handler: damage, status, shield, buff, or terrain-clamped dash.
- `src/data/catalog/items.json`: exactly 100 fixed items. Weapons affect attack and reach; armor affects defense. Utility items are visible when found but their noncombat actions are not implemented yet.
- `src/data/world-kit/world_assets.json`: exactly 1,000 procedural asset specifications. `world_recipes.json` defines 350 structures. The kit contains placeholder geometry rules, not finished textured 3D models. Current natural spawning uses seeded biome selection and a capped number of nearby assets; the grassland guarantees gatherable grass, trees, and stones.
- Discovery, materials, harvested nodes, equipped slots, and structures use versioned localStorage records. Harvested nodes regrow after five minutes. Older custom skills remain under their existing storage keys and are never silently erased; the journal shows a migration notice when they exist. The unrestricted Skill Creator is no longer in the main game flow.
- Catalog names and descriptions are only shown after discovery. The browser still downloads the complete catalogs in its JavaScript bundle for offline play. This is **UI concealment, not security**. Online multiplayer would require a trusted server to hold the catalog, perform reward rolls, log ownership and discovery transactions, and validate combat and building.

See [CATALOG_SCHEMA.md](./CATALOG_SCHEMA.md) for fields, validation, persistence, and the current world-slice limits.

## Run and test

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the Vite URL shown in the terminal. To verify and build:

```bash
npm test
npm run build
npm run preview
```

`npm test` builds the production app and runs the Node test suite. Vite precaches the application bundle and music in the PWA service worker. A new version installs a new cache; existing saves remain in localStorage. Netlify uses `netlify.toml` and publishes `dist`.

## Current limits

The Azure Valley is a composed first region on the existing spherical terrain. It includes layered hills, biome colors, clustered instanced grass and trees, ruins, a river, bridge, waterfall, and resource nodes. The three starter structures are implemented and tested. Coast and mountain resource nodes additionally unlock a dirt road and watchtower. The remaining world specifications and recipes are validated, but many resource types, utility-item actions, automated settlements, enterable caves, and finished environment models are not yet implemented. The water and trees are stylized procedural geometry. The supplied male and female GLBs are used in game after mesh and texture optimization; they contain no skeleton or animation clips, so walking and combat currently use whole-body motion. Wildling sight uses range and facing rather than terrain occlusion. Offline localStorage saves can be modified by the player and are not suitable for competitive multiplayer. See [ASSETS.md](./ASSETS.md) for optional environment artwork and visual limitations.

## License

Released under [MIT](./LICENSE). Most bundled music is generated from [tools/generate_music.py](./tools/generate_music.py); the exploration track and character portraits were supplied by the project owner. See [ASSETS.md](./ASSETS.md) for media details.
