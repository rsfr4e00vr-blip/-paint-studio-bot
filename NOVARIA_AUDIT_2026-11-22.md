# Novaria repository audit — 2026-11-22

## Scope
Reviewed the uploaded project archive and the current GitHub main branch. This is a static and automated-test audit; a live browser/Telegram session and Render deployment were not available.

## Confirmed findings and fixes in this audit branch
- Updated the Telegram shell regression test to require cache-busting parameters without hard-coding obsolete script version numbers.
- Updated the mobile map performance regression to check the current adaptive simulation and paint cadence based on active unit load.
- Updated the map/war regression to validate the current enemy-garrison activation and mobile load-aware AI scheduling behavior.
- Added these three regressions to the GitHub Actions workflow so future changes are checked on pushes and pull requests.

## Validation performed against the supplied archive
- JavaScript syntax: all application JavaScript files passed; one malformed test file in the ZIP was identified and locally corrected for validation. The GitHub main branch already contains the corrected arsenal-range test.
- Python: all Python files compiled successfully.
- Python regression scripts: all 9 scripts completed successfully.
- Targeted JavaScript regressions: army-first AI, credit procurement, army visibility, arsenal ranges, enemy spawning, capture/recapture, city visibility/decluttering, defense animation, military map, and industry AI passed.
- Three additional stale tests were corrected locally and passed: Telegram shell, mobile map performance, and map/war regression.
- Long-running economy tests emit intermediate success output but exceed the execution window in this environment; their completion is not claimed.

## Risks still requiring runtime validation
- Real Telegram Android WebView performance under very large active-unit counts.
- Two-device multiplayer synchronization and reconnection on a persistent Render disk.
- Full browser interaction testing for map gestures, saving/loading, and live war deployment.
- The large economy stress tests need a CI runner with a longer timeout and should be split into bounded jobs.

## Important
This audit does not claim that every feature is complete or that the application has passed end-to-end testing. The three regressions above are added to CI to prevent the previously observed stale expectations from silently failing future checks.
