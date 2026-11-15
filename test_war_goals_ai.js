// Run: node test_war_goals_ai.js — ИИ-страны выбирают цели войны и применяют итоги
const assert=require('node:assert/strict');
global.window=global;
let seed=222;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
global.WORLD={list:Array.from({length:195},(_,i)=>({name:`Страна ${i+1}`,pop:5+i,power:20+i%80,inc:2,iso:`X${i}`})),map:{}};
global.WORLD_SEEDS={};
['./nn_core.js','./grand_diplomacy.js','./ai_resources.js','./ai_arsenal.js','./population_ai.js','./ai_nations.js'].forEach(f=>require(f));
const st={name:'Новария',gr:{workers:50,biz:50,pens:50,stud:50,mil:50,farm:50},approval:60,stability:60,inflation:5,employment:94,food:70,tax:20,gdp:1000,money:1000,pop:8e6,army:40000,morale:60,legitimacy:60,month:0,regions:[{name:'А',pop:8e6,unrest:10,loyalty:60,wealth:50}]};
const cnt={goals:{},regime:0};const _cg=GrandDiplomacy.chooseGoal,_ar=GrandDiplomacy.applyRegimeChange;GrandDiplomacy.chooseGoal=function(...a){const g=_cg.apply(this,a);cnt.goals[g]=(cnt.goals[g]||0)+1;return g};GrandDiplomacy.applyRegimeChange=function(...a){cnt.regime++;return _ar.apply(this,a)};
NationsAI.init(st);
const W=st.aiWorld,N=W.nations;
// искусственно создаём напряжённость, чтобы войны возникали за разумное время
for(let i=0;i<N.length;i++){const a=N[i],b=N[(i+1)%N.length];a.rivals=a.rivals||{};a.rivals[b.name]=80;a.relations=-60;a.power=Math.max(a.power,60);}
const goals={};let regime=0,coups=0;
const T=+process.env.T||600;for(let i=0;i<T;i++){NationsAI.tick(st);if(i%24===0)for(const a of N){a.cooldown=0;a.exhaustion=Math.min(a.exhaustion,20)}}
W.wars.forEach(w=>goals[w.goal]=(goals[w.goal]||0)+1);
const ev=(W.events||[]).map(e=>e.t||e);
console.log('войн сейчас:',W.wars.length,'цели:',JSON.stringify(goals));
console.log('событий о цели войны:',ev.filter(t=>String(t).includes('Цель войны')).length,
 '| смена власти:',ev.filter(t=>String(t).includes('сменилась власть')).length,
 '| захват областей:',ev.filter(t=>String(t).includes('захватила область')).length,
 '| контрперевороты:',ev.filter(t=>String(t).includes('свергли')).length);
assert.ok(N.every(n=>Number.isFinite(n.gdp)&&n.gdp>0),'экономика не сломалась');
assert.ok(W.wars.every(w=>!w.goal||['tribute','territory','regime'].includes(w.goal)));
console.log('выбрано целей:',JSON.stringify(cnt.goals),'| смен власти:',cnt.regime);
assert.ok(Object.values(cnt.goals).reduce((a,b)=>a+b,0)>0,'ИИ должен выбирать цели войны');
console.log('OK: ИИ-войны с целями');
