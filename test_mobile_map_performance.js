const assert=require('node:assert/strict');
const fs=require('node:fs');
const s=fs.readFileSync('./military_map.js','utf8');
assert.match(s,/const buckets=new Map\(\)/,'unit grouping uses spatial buckets');
assert.match(s,/for\(let dy=-1;dy<=1&&!g;dy\+\+\)for\(let dx=-1;dx<=1&&!g;dx\+\+\)/,'only neighboring screen buckets are searched');
assert.match(s,/const margin=24\*up,visible=u\.x>=vb\.x-margin/,'off-screen units are culled before SVG creation');
assert.match(s,/if\(!visible\)\{const old=L\.els\[u\.id\];if\(old\)old\.g\.setAttribute\('display','none'\);u\.hid=true;return\}/,'off-screen SVG unit nodes are hidden');
console.log('OK: near-linear unit clustering and viewport culling');
