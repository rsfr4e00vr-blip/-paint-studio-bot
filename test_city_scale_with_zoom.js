const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('./city_sat.js','utf8');
assert.match(s,/s=Math\.max\(\.38,Math\.min\(2\.2,\(o\.r\/9\)\*Math\.pow\(1\/Math\.max\(\.08,ppu\),\.35\)\)\)/,'city sprites scale with map zoom within safe bounds');
assert.match(s,/const MAXVIS=/,'mobile city rendering cap remains');
assert.match(s,/function declutter\(/,'city collision filtering remains');
assert.match(s,/if\(key===LASTKEY\)return/,'cached city layer remains');
console.log('OK: city model scale responds to zoom; visibility cap, decluttering and render cache retained');
