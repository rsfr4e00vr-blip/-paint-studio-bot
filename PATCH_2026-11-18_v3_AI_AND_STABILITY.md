# Novaria — patch v3 (18.11.2026)

## Changes in this patch

- AI resource purchasing now gives priority to resources with no remaining domestic deposits and avoids buying non-critical resources at high stock levels. Emergency thresholds remain higher during war.
- The military-map commander continues to process enemy formations even after the player's field army has been eliminated. Previously, an empty player army caused an early return and stopped the enemy commander logic.
- Critical wounded enemy units (30% HP or lower) are ordered back to their base immediately, including while the unit has a recent combat timestamp.

## Verification performed

- JavaScript syntax check: all 57 `.js` files passed `node --check`.
- Python compilation: all 14 `.py` files passed `py_compile`.
- Passed: `test_ai_nations.js`.
- Passed: `test_ai_commander.js` in five consecutive runs.
- Passed: military map, military operations/ethnic uprising, military industry AI and game integration tests.
- Passed: multiplayer troop updates, direct-war synchronization, province synchronization (3,000 provinces), room persistence, interdependent industry, grand diplomacy and war-goal server tests.

## Not certified as complete

- `test_economy_core.js` did not finish within the available test window. Its 6 × 10-year child simulations are computationally expensive; this is not counted as a pass.
- A full browser/device test with 2–6 simultaneously connected human clients has not been performed here.
- Network interruption/reconnection, mobile frame-rate profiling and full end-to-end gameplay still require runtime testing.

This patch is a verified code update, not a claim of 99% or 100% end-to-end readiness.
