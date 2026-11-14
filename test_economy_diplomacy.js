const assert=require('assert');
global.window=global;
require('./economy_diplomacy.js');
function base(){return {year:1,month:1,gdp:100000,employment:90,inflation:5,trust:70,stability:65,money:10000,relations:[],wars:[],mpWars:[]}}
const neutral=base();ECODIP.tick(neutral);
const friendly=base();friendly.relations=[{name:'A',value:85},{name:'B',value:70}];friendly.allies=['A'];ECODIP.tick(friendly);
const isolated=base();isolated.mpDiplomacy={tradePartners:0,allies:0,pacts:0,sanctions:2,wars:1,participants:3,relationAvg:-55};ECODIP.tick(isolated);
assert(friendly.gdp>neutral.gdp,'friendly diplomacy should support GDP');
assert(isolated.gdp<neutral.gdp,'sanctions and war should reduce GDP');
assert(isolated.inflation>neutral.inflation,'disrupted supply should raise inflation');
assert(isolated.trust<neutral.trust,'sanctions and war should lower trust');
const ai={tradePartners:['A','B'],allies:['A'],hostilePartners:0};
assert(ECODIP.ai(ai)>0,'AI trade and alliances should help growth');
console.log('economy_diplomacy: OK');
