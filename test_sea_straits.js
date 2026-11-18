// Корабль в «кармане» воды, отрезанном узким перешейком от океана, должен выплыть; материк при этом не прорывается
const assert=require('node:assert/strict');
const M=require('./military_map.js');const {fixSea,setMask,findPath}=M;
const CW=500,CH=288,m=new Uint8Array(CW*CH).fill(0);
for(let y=0;y<CH;y++)for(let x=100;x<300;x++)m[y*CW+x]=1;           // материк: океан слева (x<100) и справа (x>=300)
for(let y=100;y<160;y++)for(let x=104;x<250;x++)m[y*CW+x]=0;       // внутреннее море, от левого океана — стена 4 клетки
for(let y=200;y<205;y++)for(let x=200;x<205;x++)m[y*CW+x]=0;       // озеро 5x5
setMask(m);fixSea(m);
assert.equal(m[202*CW+202],1,'малое озеро стало сушей');
const out=findPath('sea',2*180,2*130,2*50,2*130,14);
assert.ok(out&&out.length,'из кармана можно выплыть в океан через прорытый пролив');
assert.equal(findPath('sea',2*180,2*130,2*400,2*130,14),null,'материк в 50 клеток шириной не прорывается');
assert.ok(findPath('sea',2*400,2*130,2*480,2*130,14),'обычный океан работает');
console.log('OK: узкие проливы прорываются, озёра не мешают, материк цел');
