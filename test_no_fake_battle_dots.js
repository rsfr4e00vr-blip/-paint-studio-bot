const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('./military_map.js','utf8');
assert.doesNotMatch(s,/for\(let i=0;i<5;i\+\+\).*fill=\"\$\{col\}\"/s,'no orbiting fake troop dots');
assert.doesNotMatch(s,/stroke=\"#ffd76a\" stroke-width=\"1\.6\" stroke-dasharray=\"3 3\"/,'no yellow construction rings');
assert.match(s,/Декоративные вращающиеся точки и жёлтые кольца убраны/);
console.log('OK: decorative combat dots and yellow construction rings removed');
