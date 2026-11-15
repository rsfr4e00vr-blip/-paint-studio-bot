// Run: node test_war_goals.js  — цели войны: захват территории и смена власти (игрок, ИИ, нейросеть)
const assert=require('node:assert/strict');
global.window=global;
global.WORLD={map:{}};
global.WORLD_DATA={countries:[]};
global.WORLD_SEEDS={Бета:[{n:'Северная область'},{n:'Южная область'}]};
require('./nn_core.js');require('./grand_diplomacy.js');
const GD=GrandDiplomacy;

// 1. Справочник целей и правила допустимости
assert.deepEqual(GD.GOAL_IDS,['tribute','territory','regime']);
assert.equal(GD.defaultGoal('territorial'),'territory');
assert.equal(GD.defaultGoal('ideology'),'regime');
assert.equal(GD.defaultGoal('economic'),'tribute');
const a={name:'Альфа',power:80,gdp:100,stability:70,relations:-40,ideology:'либеральный курс',allies:[],rivals:{},claims:{}};
const b={name:'Бета',power:40,gdp:70,stability:60,relations:-40,ideology:'традиционализм',allies:[],rivals:{}};
const same={...b,ideology:'либеральный курс'};
assert.equal(GD.goalAllowed('regime',a,b,'ideology',0),true,'разные курсы — смена власти допустима');
assert.equal(GD.goalAllowed('regime',a,same,'economic',0),false,'одинаковый курс и нормальные отношения — нельзя');
assert.equal(GD.goalAllowed('regime',a,same,'economic',-45),true,'при отношениях ≤ −30 можно');
assert.equal(GD.goalAllowed('nonsense',a,b,'ideology',0),false);

// 2. Нейросеть выбирает цель только из допустимых; запрещённую «смену власти» не выберет никогда
const W={brain:{},nations:[a,same]};
for(let i=0;i<400;i++){
  const g=GD.chooseGoal(W,{...a,relations:0},same,{id:'economic',severity:60},{relations:0,warScore:70});
  assert.notEqual(g,'regime','нейросеть не должна выбирать недопустимую цель');
}
const seen=new Set();
for(let i=0;i<600;i++){seen.add(GD.chooseGoal(W,a,b,{id:'ideology',severity:80},{relations:-40,warScore:70}))}
assert.ok(seen.size>=1&&[...seen].every(g=>GD.GOAL_IDS.includes(g)));
assert.ok(W.brain.goalNN,'сеть целей создана и хранится в сохранении');
// обучение не ломает сеть
const n1={...a};GD.chooseGoal(W,n1,b,{id:'territorial',severity:70},{relations:-40});assert.ok(n1.goalLast);
const steps0=W.brain.goalNN.steps;GD.goalOutcome(W,n1,1);assert.equal(n1.goalLast,null);assert.ok(W.brain.goalNN.steps>steps0);
// без нейросети — правила
NN.off=true;assert.equal(GD.chooseGoal(W,a,b,{id:'territorial'},{relations:-40}),'territory');NN.off=false;

// 3. Смена власти: курс, дружба с победителем, контрпереворот
const winner={name:'Альфа',ideology:'либеральный курс',allies:[],rivals:{Бета:50}};
const victim={name:'Бета',ideology:'традиционализм',stability:60,exhaustion:40,power:30,allies:[],rivals:{Альфа:60},claims:{Альфа:{severity:70}},cooldown:0};
const prev=GD.applyRegimeChange({},victim,winner,100);
assert.equal(prev,'традиционализм');assert.equal(victim.ideology,'либеральный курс');
assert.ok(victim.regime&&victim.regime.by==='Альфа');assert.equal(victim.rivals.Альфа,0);assert.ok(!victim.claims.Альфа);
assert.ok(victim.allies.includes('Альфа')&&winner.allies.includes('Бета'));assert.ok(victim.stability<60);
const events=[];
// режим со слабой лояльностью свергается
victim.regime.loyalty=5;GD.regimeTick({},[winner,victim],101,(W_,t)=>events.push(t));
assert.equal(victim.ideology,'традиционализм');assert.ok(!victim.regime);assert.ok(events.some(t=>t.includes('свергли')));
assert.ok(!victim.allies.includes('Альфа'));assert.ok(victim.rivals.Альфа>=55);
// режим с высокой лояльностью закрепляется через 5 лет
const v2={name:'Гамма',ideology:'x',stability:80,power:30,exhaustion:0,allies:[],rivals:{},regime:{by:'Альфа',month:0,prev:'y',loyalty:90,until:60}};
const ev2=[];GD.regimeTick({},[winner,v2],61,(W_,t)=>ev2.push(t));
assert.ok(!v2.regime);assert.ok(ev2.some(t=>t.includes('закрепилось')));assert.equal(v2.ideology,'x');

console.log('OK: цели войны — справочник, правила, нейросеть целей, смена власти, контрпереворот');
