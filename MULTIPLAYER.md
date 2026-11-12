# Future server-authoritative PvP

TIDEBOUND v1.3 remains a single-player browser prototype. Online networking is intentionally not implemented.

The next architecture step should move deterministic combat rules into a DOM-free simulation package. Clients would send timestamped input commands—not positions, damage, or skill results—to an authoritative match server. The server would validate equipped skill definitions against the same schema, advance fixed-rate simulation ticks, resolve hits, and publish state snapshots.

Recommended boundaries:

- **Input:** translate keyboard, mouse, touch, and gamepad input into serializable commands.
- **Simulation:** own movement, stamina, energy, cooldowns, casts, hitboxes, and match outcomes without Three.js objects.
- **Server:** authenticate players, validate skill loadouts, sequence commands, run matches, and persist results.
- **Prediction:** let the local client predict movement and cosmetic skill startup, then reconcile against authoritative snapshots.
- **Rendering:** interpolate snapshots into Three.js transforms and AnimationMixer states.
- **Effects/audio/UI:** consume confirmed simulation events so visual feedback never decides gameplay.
- **Content data:** version skill schemas and balance formulas so clients and servers agree on a ruleset.

Settlements, economies, inventories, and world history should live in separate persistent services. They should never trust client-submitted currency, ownership, crafting, or combat outcomes.
