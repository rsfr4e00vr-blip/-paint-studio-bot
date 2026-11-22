const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('./game.js','utf8');
assert.match(s,/const ARSENAL_RANGE_KM=\{cannon:45,howitzer:80,tank:55,mlrs:240,drone:500,rocket:750,bomb:260,heli:220,cruise:2500,bomber:3500\}/);
assert.match(s,/function geoKm\(a,b\)/);
assert.match(s,/rangeKm=ARSENAL_RANGE_KM\[act\.w\]\|\|300,distances=regs\.map\(r=>\(\{r,d:arsenalDistanceKm\(w,r\)\}\)\)\.filter\(x=>x\.d<=rangeKm\)/);
assert.match(s,/не достаёт до доступных целей/);
assert.match(s,/c\.ars\[act\.w\]=\(Number\(c\.ars\[act\.w\]\)\|\|0\)\+1/,'out-of-range weapon is refunded');
console.log('OK: arsenal strike targets are filtered by per-weapon range');
