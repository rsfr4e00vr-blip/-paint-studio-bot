// Run: node test_military_industry_game.js — одиночная игра: строительство и выпуск вооружения.
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const store={},mkEl=()=>new Proxy(function(){},{get(t,k){if(k===Symbol.toPrimitive)return()=>'';if(k==='value')return t._v??'1800';if(k==='children'||k==='childNodes')return[];if(k==='then')return undefined;if(k in t)return t[k];return(t[k]=mkEl())},set(t,k,v){t[k]=v;return true},apply(){return mkEl()}});
const handlers={},document=new Proxy({},{get(_,k){if(k==='querySelector'||k==='getElementById')return s=>(handlers[s]||=mkEl());if(k==='querySelectorAll')return()=>[];if(k==='addEventListener')return()=>{};if(k==='createElement')return()=>mkEl();return mkEl()}});
const win={document,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},navigator:{clipboard:{}},location:{href:'',search:'',hash:'',protocol:'http:',host:'x',origin:'http://x'},addEventListener(){},removeEventListener(){},requestAnimationFrame:()=>0,scrollTo(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},fetch:()=>Promise.reject(new Error('no net')),Math,JSON,Date,console,getComputedStyle:()=>({}),matchMedia:()=>({matches:false,addEventListener(){}}),Blob:function(){},URL:{createObjectURL(){return''}},FileReader:function(){},WebSocket:function(){return mkEl()},EventSource:function(){return mkEl()},innerWidth:1000,innerHeight:800,devicePixelRatio:1};
win.window=win;win.self=win;win.globalThis=win;vm.createContext(win);
const scripts=['world.js','regions.js','world_data.js','fx.js','resources.js','nn_core.js','pvo.js','grand_diplomacy.js','ai_resources.js','interdep.js','ai_arsenal.js','systemic_sim.js','economy_core.js','ai_nations.js','population_ai.js','economy_diplomacy.js','game.js'];
for(const file of scripts){let src=fs.readFileSync(path.join(__dirname,file),'utf8');if(file==='game.js')src=src.replace('window.H=window.H||{};','window.H=window.H||{};window.__dbg={get S(){return S},factoryPanel,warCard,factoryTick};');vm.runInContext(src,win,{filename:file})}
const S=win.__dbg.S,step=handlers['#step'];assert.ok(step&&step.onclick);
S.money=8000;S.steel=55;S.fuel=65;S.energy=72;
win.H.buildFactory('mlrs','Столица');
assert.equal(S.factoryBuilds.length,1);assert.equal(S.factoryBuilds[0].type,'mlrs');
assert.equal(S.steel,49,'строительство списывает сталь');assert.equal(S.fuel,60,'строительство списывает топливо');assert.equal(S.energy,66,'строительство списывает энергию');
for(let i=0;i<21;i++)step.onclick();
assert.equal(S.factoryBuilds.length,0,'стройка должна завершиться');
assert.equal(S.milFactories.length,1,'завод должен появиться в регионе');
assert.ok(S.mlrs>=1,'через 5 месяцев завод должен произвести установку РСЗО');
S.milFactories=[{id:'cost-check',type:'mlrs',region:'Столица',hp:100,progress:3}];S.factoryBuilds=[];S.money=100;S.steel=0;S.fuel=30;S.energy=30;const stalledBefore=S.mlrs;win.__dbg.factoryTick();assert.equal(S.milFactories[0].stalled,true,'без стали завод должен остановиться');assert.equal(S.milFactories[0].progress,3,'прогресс сохраняется при нехватке сырья');assert.equal(S.mlrs,stalledBefore);S.steel=30;S.milFactories[0].progress=4;const old={mlrs:S.mlrs,steel:S.steel,fuel:S.fuel,energy:S.energy,money:S.money};win.__dbg.factoryTick();assert.equal(S.mlrs,old.mlrs+1,'завод должен выпустить РСЗО');assert.equal(S.steel,old.steel-3);assert.equal(S.fuel,old.fuel-3);assert.equal(S.energy,old.energy-4);assert.equal(S.money,old.money-6);
const panel=win.__dbg.factoryPanel();assert.ok(panel.includes('Завод РСЗО')&&panel.includes('Столица'));
const war={n:'Тестовая страна',p:50,m:1,attacks:[{side:'ours',k:'mlrs',regId:'X:0',region:'Область Х',down:false}]};
const warHtml=win.__dbg.warCard(war);assert.ok(warHtml.includes('Карта наших ударов')&&warHtml.includes('Карта ударов врага'));
console.log('OK: single-player factory construction costs money/steel/fuel/energy, cycle consumes resources, regional placement, MLRS output and war-map controls');
