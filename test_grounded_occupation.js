const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('./game.js','utf8');
assert.match(s,/const groundUnitAt=\(owner,r\)=>/);
assert.match(s,/u\.own===owner&&u\.hp>0&&\(u\.sub==='inf'\|\|u\.sub==='tank'\)/);
assert.match(s,/groundUnitAt\(w\.n,r\)/);
assert.match(s,/groundUnitAt\('me',r\)/);
assert.doesNotMatch(s,/if\(d < -1\.8 && w\.p < 48 && S\.regions\.length && Math\.random\(\)<\.42\)/);
console.log('OK: occupation changes require real land units at target region');
