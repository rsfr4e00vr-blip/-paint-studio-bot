// Run: node test_interdep.js — сеть взаимозависимостей: цепочка, удары по отраслям, ИИ, восстановление
const assert=require('node:assert/strict');
global.window=global;
let seed=777;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
global.WORLD={list:Array.from({length:195},(_,i)=>({name:`Страна ${i+1}`,pop:5+i,power:20+i%80,inc:2,iso:`X${i}`})),map:{}};
require('./grand_diplomacy.js');
['./nn_core.js','./interdep.js','./ai_resources.js','./ai_arsenal.js','./population_ai.js','./ai_nations.js'].forEach(f=>require(f));
const ID=window.InterDep;

/* 1) цепочка: один удар по энергосети задевает всё, что от неё зависит */
{const o={gdp:1000};const e0=ID.solve(ID.of(o));ID.KEYS.forEach(k=>assert.equal(e0[k],100));
 ID.strike(o,'energy',3,1,0);const e=ID.solve(o.idp);
 ['fuel','steel','industry','defense','transport'].forEach(k=>assert.ok(e[k]<100,k+' должен просесть вслед за энергосетью'));
 assert.ok(e.energy<e.fuel&&e.fuel<100);console.log('OK: каскад по цепочке, энергия',Math.round(e.energy),'заводы',Math.round(e.industry),'оборонка',Math.round(e.defense))}

/* 2) арсенал реально сильно выбивает экономику: 6 крылатых ракет по энергосети */
{const o={gdp:1000};for(let i=0;i<6;i++)ID.strike(o,'energy',3,1,0);const g=ID.gdpFactor(o.idp);
 assert.ok(g<.65,'шесть крылаток по энергосети должны отнять 35%+ работоспособности, а не '+Math.round(100-g*100)+'%');
 const ar=ID.effects(o).arms;assert.ok(ar<.6,'оборонка должна упасть вместе с энергосетью');console.log('OK: 6 ударов → экономика на',Math.round(g*100)+'%, оборонка на',Math.round(ar*100)+'%')}

/* 3) ПВО/защита уменьшает ущерб, повторные удары по мёртвой отрасли слабеют */
{const a={},b={};ID.strike(a,'ind',3,1,0);ID.strike(b,'ind',3,1,.5);assert.ok(100-b.idp.h.industry<100-a.idp.h.industry);
 const c={};const p=[];for(let i=0;i<5;i++)p.push(ID.strike(c,'energy',3,1,0).pts);assert.ok(p[4]<p[0]);console.log('OK: защита режет урон, насыщение работает')}

/* 4) восстановление медленное; на войне ещё медленнее; эффекты текут в страну */
{const o={gdp:1000,food:60,fuel:60,energy:60,steel:60,stability:60,power:50};for(let i=0;i<4;i++)ID.strike(o,'energy',3,1,0);
 const h0=ID.gdpFactor(o.idp);const w={...o,idp:JSON.parse(JSON.stringify(o.idp))};
 for(let m=0;m<6;m++){ID.tickNation(o,false);ID.tickNation(w,true)}
 assert.ok(ID.gdpFactor(o.idp)>ID.gdpFactor(w.idp),'мир чинит быстрее войны');assert.ok(ID.gdpFactor(o.idp)<.98,'за полгода не восстановится полностью');
 assert.ok(o.gdp<1000&&o.energy<60,'ВВП и ресурсы страны просели из-за цепочки');console.log('OK: восстановление и обратная связь в ресурсы/ВВП')}

/* 5) игрок: ежемесячный пересчёт связывает оружие, инфляцию, стабильность */
{const S={gdp:1000,food:60,fuel:60,energy:60,steel:60,equipment:60,ammo:60,inflation:5,employment:90,stability:60,approval:60,pop:8e6};
 for(let i=0;i<3;i++)ID.strike(S,'ind',4,1,0);ID.strike(S,'bank',4,1,0);
 for(let m=0;m<3;m++)ID.tickPlayer(S,true);
 assert.ok(S.gdp<1000&&S.equipment<60&&S.inflation>5&&S.stability<60,'игрок: ВВП/оружие/инфляция/стабильность реагируют');
 S._idRepairLeft=3;const g1=ID.gdpFactor(S.idp);ID.tickPlayer(S,true);assert.ok(ID.gdpFactor(S.idp)>=g1-.02);console.log('OK: игрок')}

/* 6) ИИ-страны в войнах сами бьют по отраслям; вторая нейросеть обучается */
{const st={name:'Новария',gr:{workers:50,biz:50,pens:50,stud:50,mil:50,farm:50},approval:60,stability:60,inflation:5,employment:94,food:70,tax:20,gdp:1000,money:1000,pop:8e6,army:40000,morale:60,legitimacy:60};
 NationsAI.init(st);for(let i=0;i<240;i++)NationsAI.tick(st);
 const ns=st.aiWorld.nations;assert.ok(ns.every(n=>Number.isFinite(n.gdp)&&n.gdp>0&&n.idp&&ID.KEYS.every(k=>Number.isFinite(n.idp.h[k]))));
 const hit=ns.filter(n=>n.idp.hits>0).length;const b=st.aiBrain||{};
 console.log('  стран, получивших удары по отраслям:',hit,'· шагов обучения сети №2:',b.secSteps||0,'· выбор отраслей:',JSON.stringify(b.secN||{}));
 assert.ok(hit>0,'ИИ должен бить по отраслям');assert.ok((b.secSteps||0)>0,'сеть выбора отрасли должна учиться');
 assert.ok(JSON.stringify(st).length<4e6,'сохранение не раздулось');console.log('OK: ИИ использует удары по отраслям')}
console.log('ALL OK');
