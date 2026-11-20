const assert=require('node:assert/strict');
const fs=require('node:fs');
const map=fs.readFileSync('./military_map.js','utf8');
assert.match(map,/for\(const l of leaders\)\{if\(l\.own===u\.own&&Math\.hypot\(l\.x\/up-ux,l\.y\/up-uy\)<thr\)\{g=l;break\}\}/);
assert.match(map,/const showAtZoom=u\.own===ME\?\(zoomAlpha>\.035\|\|MM\.sel===u\.id\):true/);
console.log('OK: enemy armies are visible and grouped by country');
