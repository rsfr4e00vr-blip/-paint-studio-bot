const assert=require('node:assert/strict');
const {ePay,ECOST}=require('./military_map.js');
const make=(patch={})=>({name:'Testland',war:true,gdp:1000,power:80,power0:100,morale:70,exhaustion:10,treasury:0,debt:0,fx:100,manpower:100,rs:{st:{steel:100,fuel:100,energy:100}},...patch});
// Own treasury is spent before borrowing.
let n=make({treasury:500});assert.equal(ePay(n,'inf'),'');assert.equal(n.treasury,400);assert.equal(n.debt,0);
// Only the shortfall is borrowed; ordinary wartime cap is 150% GDP.
n=make({treasury:20,debt:1499});assert.equal(ePay(n,'inf'),'казна пуста, кредитный лимит исчерпан');assert.equal(n.debt,1499);
n=make({treasury:20,debt:1400});assert.equal(ePay(n,'inf'),'');assert.equal(n.debt,1480);assert.equal(n.treasury,0);
// Even under critical threat, wartime borrowing never exceeds 150% GDP.
n=make({treasury:0,debt:1490,power:8,power0:100});assert.equal(ePay(n,'tank'),'казна пуста, кредитный лимит исчерпан');assert.equal(n.debt,1490);assert.equal(n.treasury,0);
// Failed resource check must not create debt.
n=make({treasury:0,rs:{st:{steel:0,fuel:100,energy:100}}});assert.equal(ePay(n,'carrier'),'нет стали');assert.equal(n.debt,0);
for(const k of ['inf','tank','destroyer','frigate','carrier','submarine','fighter','bomber','aabat','fort'])assert.ok(ECOST[k],`missing AI procurement cost for ${k}`);
console.log('OK: treasury-first spending, strict 150% wartime ceiling, no debt on failed procurement, all unit classes priced');
