// Run: node test_ai_army_first.js
// Проверяет: ИИ воюет армией (арсенал вторичен), под угрозой закупает сухопутные части,
// а при нехватке казны берёт долг на оборону, но не выше военного потолка 150% ВВП.
const assert = require('node:assert/strict');
global.window = global;
global.addEventListener = () => {};
global.WORLD = { list: [], map: {} };
const core = require('./military_map.js');
const { MM, setMask, setEnv, aiThink, ePay, ECOST, buyOrder, landInfChance } = core;
assert.equal(buyOrder({ land: .5, sea: .5, air: .5, support: 0 }, false)[0], 'land');
assert.equal(buyOrder({ land: .2, sea: .6, air: .1, support: 0 }, false)[0], 'sea');
assert.equal(buyOrder({ land: .2, sea: .6, air: .5, support: .3 }, true)[0], 'land');
assert.ok(!buyOrder({ land: 0, sea: .4, air: 0, support: 0 }, true).includes('land'));
assert.ok(landInfChance(false, false) < landInfChance(true, false));
assert.ok(landInfChance(true, false) < landInfChance(false, true));
let events = [];
setEnv({ S: () => ({ money: 0 }), save() {}, toast() {}, wars: () => [], aiEvent: s => events.push(s), say() {} });
const make = (p = {}) => ({ name: 'Страна', war: true, gdp: 1000, power: 40, power0: 100, treasury: 0, debt: 0, fx: 100, manpower: 100, rs: { st: { steel: 100, fuel: 100, energy: 100 } }, ...p });
let n = make();
assert.equal(ePay(n, 'inf', { defend: true }), '');
assert.equal(n.debt, ECOST.inf.m);
assert.ok(events.length === 1 && events[0].startsWith('🆘'));
events = []; n = make();
assert.equal(ePay(n, 'inf'), '');
assert.ok(events[0].startsWith('💳'));
n = make({ debt: 1450 });
assert.equal(ePay(n, 'tank', { defend: true }), 'казна пуста, кредитный лимит исчерпан');
assert.equal(n.debt, 1450);
setMask(new Uint8Array(500 * 288).fill(1).map((v, i) => ((i % 500) < 250 ? 1 : 0)));
const nat = { name: 'Враг', power: 80, treasury: 1e6, manpower: 1e4, industry: 1, rs: { st: { steel: 1e6, fuel: 1e6, energy: 1e6, food: 100 } } };
const testGeo = { W: 1000, H: 575, c: { 'Враг': { name: 'Враг', regs: [{ cx: 100, cy: 100, s: 10 }, { cx: 130, cy: 110, s: 8 }] } } };
setEnv({ S: () => ({ money: 0 }), save() {}, toast() {}, wars: () => [{ n: 'Враг', enPow0: 80 }], enemyNation: () => nat, enemySpawn: () => ({ x: 100, y: 100 }), GEO: testGeo,
  regionAt: (x, y) => ({ country: (x < 250 || x > 380) ? 'Враг' : 'Игрок' }),
  say() {}, aiEvent() {} });
const safeSpot = core.countryLandSpot('Враг', { x: 400, y: 100 }, 24);
assert.ok(safeSpot && safeSpot[0] < 250, 'enemy reinforcements must deploy inside the enemy country, not on the player side');
MM.units.push({ id: 'm1', own: 'me', sub: 'inf', x: 400, y: 150, hp: 100, path: [], mission: 'idle' });
const before = MM.units.length;
for (let i = 0; i < 60; i++) { MM.spawnT = {}; aiThink(); }
const spawned = MM.units.slice(before).filter(u => u.own === 'Враг');
const land = spawned.filter(u => u.sub === 'inf' || u.sub === 'tank').length;
const air = spawned.filter(u => u.sub === 'fighter' || u.sub === 'bomber').length;
assert.ok(land >= 6 && land > air, `армия должна преобладать: land=${land}, air=${air}`);

// В равном бою огонь распределяется между доступными целями, а не стирает
// одну ближайшую 2D-модель всем строем за один короткий залп.
MM.units.length = 0;
for (let i = 0; i < 3; i++) {
  MM.units.push({ id: 'p' + i, own: 'me', sub: 'inf', x: 100 + i, y: 100, hp: 100, path: [], mission: 'idle' });
  MM.units.push({ id: 'e' + i, own: 'Враг', sub: 'inf', x: 101 + i, y: 100, hp: 100, path: [], mission: 'idle' });
}
core.combat(1);
const enemyHp = MM.units.filter(u => u.own === 'Враг').map(u => u.hp);
const playerHp = MM.units.filter(u => u.own === 'me').map(u => u.hp);
assert.equal(enemyHp.length, 3);
assert.equal(playerHp.length, 3);
assert.ok(enemyHp.every(hp => hp < 100), 'enemy fire should be distributed across all three player units');
assert.ok(playerHp.every(hp => hp < 100), 'player fire should be distributed across all three enemy units');
assert.ok(enemyHp.every(hp => hp > 0) && playerHp.every(hp => hp > 0), 'equal forces must not vanish in one combat second');
require('./ai_nations.js');
const D = NationsAI.armyDoctrine;
const nat0 = (p = {}) => ({ name: 'А', war: 1, power: 100, power0: 100, ...p });
const war = (score = 0) => ({ id: 1, a: 'А', b: 'Б', score });
const by = (fp = 100) => ({ 'Б': { name: 'Б', power: fp } });
const z = D(nat0({ war: 0 }), war(), by());
assert.equal(z.army + z.mobilize + z.arsenal + z.borrow, 0);
assert.equal(z.survival, false);
const even = D(nat0(), war(0), by(100));
assert.ok(even.army > 0 && even.arsenal > 0);
assert.equal(even.survival, false);
const strong = D(nat0({ power: 150 }), war(50), by(50));
assert.equal(strong.arsenal, 0);
assert.equal(strong.survival, false);
const weak = D(nat0({ power: 45 }), war(-30), by(100));
assert.ok(weak.army > even.army && weak.arsenal > even.arsenal && weak.mobilize > even.mobilize);
const dying = D(nat0({ power: 20 }), war(-60), by(100));
assert.equal(dying.survival, true);
assert.ok(dying.borrow >= .3);
const asB = D({ name: 'Б', war: 1, power: 100, power0: 100 }, war(60), { 'А': { name: 'А', power: 100 } });
assert.equal(asB.survival, true);
['./nn_core.js', './ai_resources.js', './ai_arsenal.js'].forEach(f => require(f));
const K = AIARS.armyFundK;
assert.equal(K({ power: 100, power0: 100 }, true), 1);
assert.equal(K({ power: 30, power0: 100 }, false), 1);
assert.equal(K({ power: 30 }, true), 1);
assert.ok(K({ power: 60, power0: 100 }, true) < 1);
assert.ok(K({ power: 30, power0: 100 }, true) < K({ power: 60, power0: 100 }, true));
assert.ok(Math.abs(K({ power: 5, power0: 100 }, true) - .52) < 1e-9);
assert.equal(K({ power: 150, power0: 100 }, true), 1);
['./grand_diplomacy.js', './population_ai.js'].forEach(f => require(f));
let seed = 99; Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
WORLD.list = Array.from({ length: 195 }, (_, i) => ({ name: `Страна ${i + 1}`, pop: 5 + i, power: 20 + i % 80, inc: 2, iso: `X${i}` }));
const st = { name: 'Новария', gr: { workers: 50, biz: 50, pens: 50, stud: 50, mil: 50, farm: 50 }, approval: 60, stability: 60, inflation: 5, employment: 94, food: 70, tax: 20, gdp: 1000, money: 1000, pop: 8e6, army: 40000, morale: 60, legitimacy: 60, month: 0,
  regions: [{ name: 'А', pop: 4e6, unrest: 10, loyalty: 60, wealth: 50 }, { name: 'Б', pop: 4e6, unrest: 20, loyalty: 50, wealth: 40 }] };
NationsAI.init(st);
const WW = st.aiWorld, live = WW.nations.filter(x => !x.annexed);
WW.wars.length = 0; live.forEach(x => { x.war = 0; });
const [X, Y] = [live[10], live[11]];
WW.wars.push({ id: 9001, a: X.name, b: Y.name, started: 0, months: 5, score: 0, front: 50, lossA: 0, lossB: 0, goal: 'territory', joinedA: [], joinedB: [] });
X.war = 9001; Y.war = 9001;
Object.assign(X, { treasury: X.gdp * .15, exhaustion: 5, morale: 90, power0: 200, power: 45, noCredit: 0, debt: 0 });
Object.assign(Y, { power: 100, power0: 100 });
for (let i = 0; i < 3; i++) NationsAI.tick(st);
assert.ok(X.debt > 0);
assert.ok(X.debt <= X.gdp * 1.5);
assert.ok(X.power > 45);
assert.ok(WW.events.some(e => e.includes('🆘') && e.includes(X.name)));
console.log('OK: армия важнее арсенала; под угрозой закупается сухопутная армия; экстренный кредит на оборону в пределах 150% ВВП');
process.exit(0);
