# Discovery and world catalogs

The JSON files in `src/data/catalog/` and `src/data/world-kit/` are the supplied Discovery Pack and World Discovery Kit. They are imported as data, never executed as code. `CatalogRules.js` and `WorldCatalogRules.js` reject incorrect counts, duplicate IDs, unsupported operations, invalid references, and out-of-range values before the game starts.

| Catalog | Count | Stable key | Main fields |
| --- | ---: | --- | --- |
| Skills | 1,000 | `id` | `domain`, `element`, `family`, `rarity`, `rank`, `combat`, `discovery`, `presentation` |
| Items | 100 | `id` | `type`, `subtype`, `stats`, `requirements`, `discovery` |
| World assets | 1,000 | `id` | `category`, `generationMode`, `geometryPreset`, `procedural`, `placement`, `harvestDrops`, `recipeId` |
| Recipes | 350 | `id` | `outputAssetId`, `materials`, `placementRules` |

`combat.effects` supports `damage`, `status`, `shield`, `buff`, and `dash`. Status and buff IDs are enumerated in `CatalogRules.js`. The runtime uses the existing capsule hit test for projectiles, the existing melee arc test for close attacks, and the character's energy and cooldown slots. Each effect has a gameplay handler; the VFX and sound use procedural fallbacks.

The `tidebound.discovery.v1` save stores the appearance, discovered skill and item IDs, equipped IDs, material quantities, learned recipe IDs, harvested node timestamps, built structure IDs and positions, and discovery counters. Natural objects regenerate deterministically from chunk coordinates. Harvested changes and player buildings persist separately. Old `tidebound.customSkills.v1/v2` keys remain untouched as a backup. A malformed discovery save is rejected rather than rerolled.

The first playable slice uses grass, trees, and rocks around the sanctuary, plus the foundation (`wr_15_001`), timber wall (`wr_15_006`), and hut (`wr_16_001`). Coast and mountain nodes supply sand and iron for the dirt trail (`wr_14_001`) and watchtower (`wr_17_006`). The world spawner selects additional natural asset variants by biome and seed with a per-chunk cap. Other recipes become learnable through repeated harvesting. Some require resources that are not yet harvestable, so they appear in the journal but cannot be built. The supplied mesh factory creates basic geometry only; it is not final 3D artwork.

For a real online game, move the full catalogs and random rolls to a trusted server. The server must validate ownership, energy, cooldowns, combat hits, gathering, resource balances, terrain, collisions, land permissions, and every construction transaction. An offline PWA cannot keep shipped JSON secret.
