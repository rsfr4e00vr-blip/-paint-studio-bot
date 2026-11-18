const assert=require('node:assert/strict');
const M=require('./military_map.js');
const {MM,mk,setMask,setEnv,step}=M;
const mask=new Uint8Array(500*288);for(let y=0;y<288;y++)for(let x=0;x<180;x++)mask[y*500+x]=1;setMask(mask);
let recaptured=0;
setEnv({S:()=>({money:9999,army:40000}),save(){},toast(){},wars:()=>[],
 regionAt:(x,y)=>({id:'X:1',name:'Тест',x,y,country:'Враг',mine:false,occupied:true,enemyWar:true}),
 enemyRaid(){recaptured++}});
MM.units.length=0;mk('Враг','inf',50,50);
for(let i=0;i<160;i++)step(.1);
assert.ok(recaptured>=1,'вражеская армия отбивает временно занятую область');
console.log('OK: враг возвращает занятую игроком область');
