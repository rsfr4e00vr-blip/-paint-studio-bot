# Novaria map optimization update (2026-11-19)

Changes in this update:
- Region terrain texture overlays are hidden on the far zoom class; they are displayed again when zoomed in. This avoids rendering textured terrain over every region on the overview map.
- Military-map animation loop now stops scheduling animation frames while the document is hidden and resumes on `visibilitychange`, instead of running a hidden-page RAF loop.
- Existing military sprites, auto-plan, enemy AI commander, terrain movement modifiers, region capture/damage state, and AI debt logic are retained.


Validation performed:
- `node --check game.js` passed.
- `node --check military_map.js` passed.
- Existing `test_auto_army.js` and `test_ai_commander.js` printed their OK assertions; test processes did not exit within timeout (they retain animation/timer loops).
- Full browser/Telegram/Android device testing is not available in this environment. This patch must not be described as fully verified on-device.
