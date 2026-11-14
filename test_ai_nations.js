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
['./nn_core.js','./ai_arsenal.js','./population_ai.js'].forEach(f=>{delete require.cache[require.resolve(f)];require(f)});
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
