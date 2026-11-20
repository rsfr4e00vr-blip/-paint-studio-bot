const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('./game.js','utf8');
assert.match(s,/w\.p=Math\.min\(100,\(Number\(w\.p\)\|\|50\)\+3\);w\.frontLine=ra\.name/,'successful region capture updates front location');
assert.doesNotMatch(s,/bombRegion\(ra\)\{[^}]*w\.p=/,'bombing alone does not move ground front');
assert.doesNotMatch(s,/blockadeLast=ra\.name;w\.p=/,'blockade alone does not move ground front');
assert.match(s,/w\.frontLine=ra\.name/,'recapture updates front location');
console.log('OK: map capture and recapture update front location; air strikes/blockade do not fake ground movement');
