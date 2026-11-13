// Run: node test_ai_nations.js
const assert=require('node:assert/strict');
global.window=global;
global.WORLD={list:Array.from({length:195},(_,i)=>({name:`Страна ${i+1}`,pop:5+i,power:20+i%80,inc:2,iso:`X${i}`}))};
require('./ai_nations.js');
const state={name:'Новария'};
NationsAI.init(state);
assert.equal(state.aiWorld.nations.length,194);
for(let i=0;i<240;i++)NationsAI.tick(state);
assert.equal(state.aiWorld.month,240);
assert.ok(state.aiWorld.nations.every(n=>Number.isFinite(n.gdp)&&n.gdp>0));
assert.ok(state.aiWorld.events.length<=80);
console.log('OK: 194 AI states, 240 monthly turns, economy/diplomacy/war simulation.');
