// Run: node test_ai_commander.js
const assert=require('node:assert/strict');
const M=require('./military_map.js');
const {MM,SPEC,step,mk,setMask,setEnv,aiThink}=M;
const CW=500,CH=288,mask=new Uint8Array(CW*CH);
for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)if(x<250)mask[y*CW+x]=1;   // суша слева (x<500 ед.), море справа
setMask(mask);
const nat={name:'Враг',power:90,treasury:9000,manpower:60,industry:1.5,rs:{st:{steel:90,fuel:90,energy:90,food:90}}};
const S={money:0,army:40000};
setEnv({S:()=>S,save(){},toast(){},wars:()=>[{n:'Враг',enPow0:90}],enemyNation:()=>nat,enemySpawn:()=>({x:200,y:200}),
 regionAt:(x,y)=>x<500?{id:'X:1',name:'Тест',x,y,country:'Враг',mine:false,occupied:false,enemyWar:true}:null,takeRegion(){},bombRegion(){}});
MM.units.length=0;MM.bases.length=0;
MM.bases.push({id:'home',name:'Дом',x:700,y:300,px:760,py:300,own:'me'});
// мой отряд вторгается на территорию врага
const inv=mk('me','inf',300,200,{name:'Вторжение'});
let shots=0,maxFx=0,err=0;
const origWarn=console.warn;console.warn=(...a)=>{err++;origWarn(...a)};
for(let i=0;i<900;i++){step(.1);if(i%15===0)aiThink();shots+=MM.fx.filter(f=>f.kind==='shot').length;maxFx=Math.max(maxFx,MM.fx.length)}
console.warn=origWarn;
assert.equal(err,0,'командир без ошибок');
const en=MM.units.filter(u=>u.own==='Враг');
console.log('enemy units',en.length,'bases',MM.bases.filter(b=>b.own==='Враг').length,'shots seen',shots,'max fx',maxFx);
assert.ok(MM.bases.some(b=>b.own==='Враг'),'у врага появились базы обороны');
assert.ok(shots>0,'выстрелы анимируются');
assert.ok(maxFx<=200,'лимит эффектов');
assert.ok(S.mmBrain&&typeof S.mmBrain.steps==='number','нейросеть тактики сохранена в S.mmBrain');
console.log('brain',JSON.stringify(S.mmBrain).slice(0,200),'tact',MM.war['Враг'].tact);
// защита: вражеские армии идут на вторженца
const e2=MM.units.filter(u=>u.own==='Враг'&&SPEC[u.sub].kind==='land');
if(e2.length)assert.ok(e2.some(u=>u.fight>0||Math.hypot(u.x-inv.x,u.y-inv.y)<80),'защитники двинулись на вторженца или сражаются');
// отступление: раненый уходит на базу
const w=MM.units.find(u=>u.own==='Враг'&&SPEC[u.sub].kind==='land'&&!SPEC[u.sub].static);
if(w){w.hp=20;MM.units.filter(u=>u.own==='me').forEach(u=>u.hp=100);aiThink();assert.ok(w.heal,'раненый отступает');}
console.log('OK: бой, выстрелы, оборона, отступление, обучение тактики');
