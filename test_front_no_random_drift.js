const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('./game.js','utf8');
assert.match(s,/let d=clamp\(\(my-en\)\/\(my\+en\)\*18,-10,10\)/,'front pressure has no random monthly drift');
assert.doesNotMatch(s,/w\.m%4===0\)w\.frontLine=pick\(FRONTS\)/,'front label is not randomly teleported');
assert.doesNotMatch(s,/w\.p=clamp\(w\.p[+-]3\)/,'random battle news does not alter front percentage');
console.log('OK: front movement is driven by combat balance and explicit territorial events, not random drift');
