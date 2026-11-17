// Run: node test_military_ops_ethnic.js
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const store={},mkEl=()=>new Proxy(function(){},{get(t,k){if(k===Symbol.toPrimitive)return()=>'';if(k==='value')return t._v??'1800';if(k==='children'||k==='childNodes')return[];if(k==='then')return undefined;if(k in t)return t[k];return(t[k]=mkEl())},set(t,k,v){t[k]=v;return true},apply(){return mkEl()}});
const handlers={},document=new Proxy({},{get(_,k){if(k==='querySelector'||k==='getElementById')return s=>(handlers[s]||=mkEl());if(k==='querySelectorAll')return()=>[];if(k==='addEventListener')return()=>{};if(k==='createElement')return()=>mkEl();return mkEl()}});
const win={document,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},navigator:{clipboard:{}},location:{href:'',search:'',hash:'',protocol:'http:',host:'x',origin:'http://x'},addEventListener(){},removeEventListener(){},requestAnimationFrame:()=>0,scrollTo(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},fetch:()=>Promise.reject(new Error('no net')),Math,JSON,Date,console,getComputedStyle:()=>({}),matchMedia:()=>({matches:false,addEventListener(){}}),Blob:function(){},URL:{createObjectURL(){return''}},FileReader:function(){},WebSocket:function(){return mkEl()},EventSource:function(){return mkEl()},innerWidth:1000,innerHeight:800,devicePixelRatio:1};
win.window=win;win.self=win;win.globalThis=win;vm.createContext(win);
const scripts=['world.js','regions.js','world_data.js','fx.js','resources.js','nn_core.js','pvo.js','grand_diplomacy.js','ai_resources.js','interdep.js','ai_arsenal.js','systemic_sim.js','novaria_worldsystems.js','economy_core.js','ai_nations.js','population_ai.js','economy_diplomacy.js','city_sat.js','music.js','province_grid.js','war_ai.js','game.js'];
for(const file of scripts){let src=fs.readFileSync(path.join(__dirname,file),'utf8');if(file==='game.js')src=src.replace('function armsCard(){','window.__dbg={get S(){return S},ethnicTick,militaryOpsTick,ethnicPanel,militaryOpsPanel};\nfunction armsCard(){');vm.runInContext(src,win,{filename:file})}
const S=win.__dbg.S;
win.__dbg.ethnicTick();assert.equal(S.ethnicGroups.length,S.regions.length,'ethnic profile for every region');
const e=S.ethnicGroups[0],region=S.regions.find(x=>x.name===e.region);e.loyalty=0;e.grievance=100;e.rights=0;region.loyalty=0;region.unrest=100;const oldRandom=win.Math.random;vm.runInContext('Math.random=()=>0',win);win.__dbg.ethnicTick();vm.runInContext('Math.random=()=>0.5',win);
assert.ok(S.ethnicRebellions.some(x=>x.region===e.region),'high grievance/low loyalty should trigger uprising');
const b=S.ethnicRebellions.find(x=>x.region===e.region);assert.equal(b.status,'war','uprising immediately enters armed conflict');assert.ok(b.stripes);
win.H.resolveEthnic(b.id,'recognize');assert.equal(b.status,'recognized','recognition resolves separatist crisis');
S.money=18000;S.steel=55;S.fuel=65;S.energy=72;
win.H.buildMilitaryPlant('aviation','Столица');assert.equal(S.militaryPlants.length,1);for(let i=0;i<10;i++)win.__dbg.militaryOpsTick();assert.equal(S.militaryPlants[0].left,0,'aviation plant completes');
win.H.orderMilitaryProduction('fighter');assert.equal(S.militaryProduction.length,1);for(let i=0;i<3;i++)win.__dbg.militaryOpsTick();assert.equal(S.militaryUnits.length,1,'fighter unit produced');
win.H.moveMilitaryUnit(S.militaryUnits[0].id,'Южная провинция');win.__dbg.militaryOpsTick();win.__dbg.militaryOpsTick();assert.equal(S.militaryUnits[0].region,'Южная провинция','unit reaches selected region');
assert.ok(win.__dbg.ethnicPanel().includes('Этнические провинции'));assert.ok(win.__dbg.militaryOpsPanel().includes('Авиационный завод'));
console.log('OK: ethnic profiles, separatist uprising, recognition, aviation plant, fighter production and unit movement');
