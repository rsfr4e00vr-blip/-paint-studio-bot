// Run: node test_ai_nations.js
const assert=require('node:assert/strict');
global.window=global;
global.WORLD={list:Array.from({length:195},(_,i)=>({name:`Страна ${i+1}`,pop:5+i,power:20+i%80,inc:2,iso:`X${i}`}))};

/* 1) без нейросети (запасной режим) — как раньше */
{
  const saved={};['NN','AIARS','PopAI'].forEach(k=>{saved[k]=global[k];delete global[k]});
  delete require.cache[require.resolve('./ai_nations.js')];require('./ai_nations.js');
  const st={name:'Новария'};NationsAI.init(st);assert.equal(st.aiWorld.nations.length,194);
  for(let i=0;i<120;i++)NationsAI.tick(st);
  assert.ok(st.aiWorld.nations.every(n=>Number.isFinite(n.gdp)&&n.gdp>0));
  console.log('OK: запасной режим без нейросети');
}

/* 2) полный режим: нейросети стран, тактик оружия, население */
['./nn_core.js','./ai_resources.js','./ai_arsenal.js','./population_ai.js'].forEach(f=>{delete require.cache[require.resolve(f)];require(f)});
delete require.cache[require.resolve('./ai_nations.js')];require('./ai_nations.js');
const state={name:'Новария',gr:{workers:50,biz:50,pens:50,stud:50,mil:50,farm:50},approval:60,stability:60,inflation:5,employment:94,food:70,tax:20,gdp:1000,money:1000,pop:8e6,army:40000,morale:60,legitimacy:60,month:0,
  regions:[{name:'А',pop:4e6,unrest:10,loyalty:60,wealth:50},{name:'Б',pop:4e6,unrest:20,loyalty:50,wealth:40}]};
NationsAI.init(state);
assert.equal(state.aiWorld.nations.length,194);
for(let i=0;i<240;i++){
  NationsAI.tick(state);
  // налёты на область Б с 60-го месяца: население должно научиться прятаться
  if(i>=60){PopAI.hit(state,'Б','mil',2);PopAI.hit(state,'Б','civ',1)}
  state.month=i%12;
  PopAI.tick(state,{atWar:i>=60,aa:3,bunkers:4});
}
assert.equal(state.aiWorld.month,240);
assert.ok(state.aiWorld.nations.every(n=>Number.isFinite(n.gdp)&&n.gdp>0&&Number.isFinite(n.power)&&Number.isFinite(n.stability)));
assert.ok(state.aiWorld.events.length<=80);
const b=NationsAI.brainStats(state.aiWorld);
assert.ok(b.steps>10000,'страны должны накопить опыт');
assert.ok(b.coverage>=80,'страны должны освоить почти все 12 действий');
/* таблица экономик: у каждой страны есть стартовый ВВП и процент изменения */
state.history=[{gdp:900}];const er=NationsAI.econRows(state);
assert.equal(er.length,195,'194 страны ИИ + игрок');
assert.ok(er.every(r=>Number.isFinite(r.pct)),'процент изменения ВВП считается для всех стран');
assert.ok(er.some(r=>r.pct>0)&&er.some(r=>r.pct!==0));
const html=NationsAI.econPanel(state);assert.ok(html.includes('Экономика всех стран')&&html.includes('<tbody'));
console.log(`  ВВП с начала игры: растут ${er.filter(r=>r.pct>0).length}, падают ${er.filter(r=>r.pct<0).length}, среднее ${(er.reduce((s,r)=>s+r.pct,0)/er.length).toFixed(1)}%`);
const pm=PopAI.summary(state);
assert.ok(pm.steps>1000,'население должно учиться');
assert.ok(Number.isFinite(state.gdp)&&state.pop>0&&state.stability>=0&&state.stability<=100);
const shB=PopAI.shelter(state,'Б'),shA=PopAI.shelter(state,'А');
assert.ok(shB<1,'в области под налётами население научилось укрываться');
const ab=AIARS.summary(state.aiWorld.nations.length?state:state);
console.log('OK: 194 страны, 240 месяцев');
console.log(`  стратег: ${b.steps} решений, освоено действий ${b.coverage}%, средняя польза ${b.avg.toFixed(3)}`);
console.log(`  население: ${pm.steps} решений, множитель потерь мирных в области под ударами: ${shB.toFixed(2)} (без налётов: ${shA.toFixed(2)})`);
console.log(`  тактик оружия: ${ab.steps} ударов в войнах стран, освоено оружия ${ab.weaponsUsed}/${ab.weaponsTotal}`);
const kb=Math.round(JSON.stringify(state).length/1024);
console.log(`  размер сохранения после 20 лет: ${kb} КБ`);
assert.ok(kb<3500,'сохранение должно влезать в localStorage');

/* 3) арсенал не выдаётся на старте: страны вырабатывают и покупают сами; настройки партии */
{
  const A=window.AIARS;
  const S2={year:1,month:0,aiCfg:{aggr:'high',nn:'fast',ars:'none'}};
  const c={name:'Т',power:60,aggr:.5};
  A.stock(c,false,S2);
  const tot0=A.arsTotal(c);assert.equal(tot0,0,'в начале партии у страны не должно быть оружия');
  for(let m=1;m<=12;m++){S2.month=m%12;if(m===12)S2.year++;A.stock(c,false,S2)}
  const peace=A.arsTotal(c);assert.ok(peace>0,'в мирное время страна копит оружие');
  const w={name:'В',power:60,aggr:.6};
  A.stock(w,true,S2);
  assert.ok(A.arsTotal(w)>0&&A.arsTotal(w)<=12,'при начале войны — срочная выработка/закупка, но не весь арсенал сразу');
  assert.ok((w.arsMade||0)+(w.arsBought||0)>0);
  const e={name:'Э',power:60,aggr:.6,embargo:1e9};
  for(let m=0;m<6;m++){S2.month=(S2.month+1)%12;A.stock(e,true,S2)}
  assert.equal(e.arsBought||0,0,'при эмбарго закупки закрыты');
  const small={name:'М',power:60};A.stock(small,false,{year:1,month:0,aiCfg:{ars:'small'}});assert.ok(A.arsTotal(small)>0);
  A.applyCfg({aiCfg:{nn:'off'}});assert.equal(NN.off,true);A.applyCfg({aiCfg:{nn:'fast'}});assert.equal(NN.off,false);assert.equal(NN.lrMul,2.2);
  A.applyCfg({aiCfg:{nn:'std'}});
  assert.ok(A.aggrMult({aiCfg:{aggr:'extreme'}})>A.aggrMult({aiCfg:{aggr:'calm'}}));
  console.log('OK: арсенал с нуля, выработка/закупка, эмбарго, настройки партии');
}

/* 4) ресурсы ИИ-стран: добыча, истощение, нехватка, закупка нейросетью, связь с оружием */
{
  global.WORLD.map={};WORLD.list.forEach(c=>{WORLD.map[c.name]={res:c.name.endsWith('3')?'':'fus'}});   // у «Страна 3…» своих недр нет
  const S3={year:1,month:0,aiCfg:{nn:'std'},relations:[]};
  const poor={name:'Страна 3',power:60,aggr:.5},rich={name:'Страна 1',power:60,aggr:.5};
  S3.relations.push(poor,rich);
  let boughtPoor=0;
  for(let m=0;m<120;m++){S3.month=m%12;S3.year=1+Math.floor(m/12);AIARS.stock(poor,false,S3);AIARS.stock(rich,false,S3)}
  const st=poor.rs.st;
  assert.ok(Object.values(st).every(v=>Number.isFinite(v)&&v>=0&&v<=100),'запасы в пределах 0..100');
  assert.ok(Object.values(poor.rs.buy).reduce((a,b)=>a+b,0)>0,'страна без недр покупает ресурсы');
  assert.ok(Object.values(poor.rs.buy).reduce((a,b)=>a+b,0)>Object.values(rich.rs.buy).reduce((a,b)=>a+b,0),'бедная недрами покупает больше богатой');
  assert.ok(S3.resBrain&&S3.resBrain.steps>0,'нейросеть закупок учится');
  // истощение: недра нефти/руды конечны
  const left0=Object.values(rich.rs.max).reduce((a,b)=>a+b,0),left1=Object.values(rich.rs.left).reduce((a,b)=>a+b,0);
  assert.ok(left1<left0,'недра истощаются');
  // оружие тратит сталь
  const w={name:'Страна 5',power:80,aggr:.7};const S4={year:1,month:0,aiCfg:{}};
  AIARS.stock(w,true,S4);AIARS.stock(w,true,Object.assign(S4,{month:1}));
  assert.ok(w.rs.st.steel<75,'война и производство оружия тратят сталь');
  // выключенная нейросеть: простое правило тоже покупает
  AIARS.applyCfg({aiCfg:{nn:'off'}});
  const q={name:'Страна 3',power:60};const S5={year:1,month:0,aiCfg:{nn:'off'}};
  for(let m=0;m<100;m++){S5.month=m%12;S5.year=1+Math.floor(m/12);AIARS.stock(q,false,S5)}
  assert.ok(Object.values(q.rs.buy).reduce((a,b)=>a+b,0)>0,'без нейросети страна покупает по правилу');
  AIARS.applyCfg({aiCfg:{nn:'std'}});
  const sm=AIRES.summary(S3);assert.ok(sm.total===2&&sm.steps>0);
  console.log('OK: ресурсы ИИ-стран — добыча, истощение, закупка нейросетью, расход стали на оружие');
}
