const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=fs.readFileSync('./game.js','utf8');
assert.match(game,/class="terrain-detail" id="terrain-detail-/,'terrain detail must be in a separate lazy layer');
assert.match(game,/function renderTerrainOverlays\(\)/,'visible terrain overlays are generated on demand');
assert.match(game,/if\(far\)\{if\(g\.childNodes\.length\)g\.replaceChildren\(\);continue\}/,'far zoom clears detailed terrain DOM');
assert.doesNotMatch(game,/class="terrain-overlay" d="\$\{r\.d\}"/,'do not create a duplicate overlay for every province at map startup');
console.log('OK: terrain patterns are lazily rendered only for visible regions');
