const assert=require('node:assert/strict');
const fs=require('node:fs');
const game=fs.readFileSync('./game.js','utf8');
const map=fs.readFileSync('./military_map.js','utf8');
const city=fs.readFileSync('./city_sat.js','utf8');
assert.match(game,/autoPlanActive=\(S\.wars\|\|\[\]\)\.some\(w=>w\.auto&&!w\.won&&!w\.dead\);layer\.style\.display=autoPlanActive\?'none':''/);
assert.match(map,/u\.own===ME\?\(zoomAlpha>\.035\|\|MM\.sel===u\.id\):true/);
assert.match(game,/S\.taken\[ra\.id\]=1/);
assert.match(game,/warResultModal\('win',w,\{why:'полная оккупация всех регионов'\}\)/);
assert.match(game,/ev=>ev\.stopPropagation\(\).*document\.body\.appendChild\(box\)/);
assert.match(city,/MAXVIS=typeof window/);
console.log('OK: hide city clutter during auto-plan, enemy icons, capture ownership, victory modal, arsenal tap isolation, mobile city-marker cap');

assert.match(game,/S\.resumeAfterOuster=!!running/);
assert.match(game,/if\(resume\)play\(\)/);
assert.match(game,/\(!tk\[x\.id\]\|\|occ\.has\(x\.id\)\)/);
