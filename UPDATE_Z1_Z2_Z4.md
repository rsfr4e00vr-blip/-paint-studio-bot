# Novaria update Z1 + Z2 + Z4

- Z1: preserve the military map when using the arsenal, including fullscreen mode.
- Z2: keep result and confirmation dialogs above the fullscreen map; pause after victory and correct defeat messaging.
- Z4: calculate the displayed front percentage from occupied/lost regions through `frontPct(w)` while preserving `w.p` as the pressure value used by existing war, economy, and AI logic.
- Keep the existing `takeRegion` (+3 pressure), `enemyRaid` (-1.2 pressure), and multiplayer `S.mpWars` behavior unchanged.
- Add `test_frontpct.js` for the pure calculation and UI wiring checks.

Validation performed before upload: `node --check game.js` and `node test_frontpct.js` both pass. Live gameplay behavior still requires manual verification.