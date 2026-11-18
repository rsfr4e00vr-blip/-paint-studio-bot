// Run: node test_multi_claim.js
const assert=require('node:assert/strict');
global.window=global;
global.WORLD={map:{}};
global.WORLD_DATA={countries:[]};
global.WORLD_SEEDS={Бета:[{n:'Северная область'},{n:'Южная область'},{n:'Западная область'}]};
require('./nn_core.js');require('./grand_diplomacy.js');
const GD=GrandDiplomacy,CU=ClaimUtil;
const S={year:1,month:0,grandDiplomacy:{claims:{},borderCases:{}}},c={name:'Бета',value:0};
// несколько областей + подпровинция (название вида «Область · провинция 2»)
let r=GD.preparePlayerCase(S,c,'territorial','Северная область · провинция 2|Южная область');
assert.ok(r.ok,JSON.stringify(r));
assert.deepEqual(S.grandDiplomacy.claims['Бета'].regions,['Северная область','Южная область']);
// вся страна
r=GD.preparePlayerCase(S,c,'territorial','*');assert.ok(r.ok);
assert.equal(S.grandDiplomacy.claims['Бета'].region,'*');
assert.equal(CU.claimLabel('*'),'вся страна');
// чужая область отклоняется, пустое тоже
assert.ok(!GD.preparePlayerCase(S,c,'territorial','Южная область|Атлантида').ok);
assert.ok(!GD.preparePlayerCase(S,c,'territorial','').ok);
assert.ok(CU.claimHas('Северная область|Южная область','Южная область · провинция 3'));
assert.ok(CU.claimHas('*','любая'));
assert.equal(CU.claimLabel('А|Б|В|Г|Д'),'А, Б и ещё 3');
console.log('OK: многообластные претензии (несколько областей, вся страна, подпровинции)');
