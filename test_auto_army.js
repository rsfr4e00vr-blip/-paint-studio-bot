// Run: node test_auto_army.js — автоплан гонит реальные отряды к целям войны
const assert=require('node:assert/strict');
const M=require('./military_map.js');
const {MM,setMask,setEnv,mk,step,autoCommand}=M;
const CW=500,CH=288,mask=new Uint8Array(CW*CH);
for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){if(x<180||(x>=300&&x<=360&&y>=100&&y<=160))mask[y*CW+x]=1}
setMask(mask);
const war={n:'Враг',auto:true,occ:[]};
const T=[{id:'A',name:'A',x:300,y:100,occ:false,pri:0},{id:'B',name:'B',x:120,y:200,occ:false,pri:0},{id:'C',name:'C',x:650,y:300,occ:false,pri:0}];
const taken=[];
setEnv({S:()=>({money:9999,army:40000}),save(){},toast(){},wars:()=>[war],
 warTargets:w=>T.map(t=>({...t,occ:taken.includes(t.id)})),
 regionAt:(x,y)=>{if(x>=180)return null;const t=T.find(t=>Math.hypot(t.x-x,t.y-y)<14);return{id:t?t.id:'F',name:t?t.name:'F',x,y,country:'Враг',mine:false,occupied:taken.includes(t?t.id:'F'),enemyWar:true}},
 takeRegion:ra=>taken.push(ra.id),bombRegion(){}});
MM.units.length=0;MM.bases.length=0;
const a=mk('me','inf',20,20),b=mk('me','tank',22,24);
autoCommand();
assert.ok(a.path.length||b.path.length,'армия получила маршрут сама');
assert.ok(a.autoTgt&&b.autoTgt,'обе части получили цель');
assert.equal(a.autoTgt,'B','идут к ближайшей достижимой цели');
// идём и захватываем: за 2 минуты симуляции область B должна быть взята реальным отрядом
for(let t=0;t<120;t+=.1){step(.1);if(Math.round(t*10)%15===0)autoCommand()}
assert.ok(taken.includes('B'),'область B взята отрядом, дошедшим сам');
// после захвата отряды не стоят на месте, а выбирают следующую цель или остаются при отсутствии достижимых
autoCommand();
assert.ok(!MM.units.some(u=>u.autoTgt==='B'),'захваченная цель снята');
// выключенный автоплан не двигает армию
war.auto=false;MM.units.length=0;const c=mk('me','inf',20,20);autoCommand();assert.equal(c.path.length,0,'без автохода армия стоит');
console.log('OK test_auto_army');
