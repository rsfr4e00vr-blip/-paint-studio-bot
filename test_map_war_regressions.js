'use strict';
const fs=require('fs');
const game=fs.readFileSync('game.js','utf8');
const map=fs.readFileSync('military_map.js','utf8');
function check(ok,msg){if(!ok)throw new Error(msg);console.log('OK',msg)}
check(game.includes('const compact=JSON.parse(JSON.stringify(S))'),'save quota fallback builds a compact state');
check(game.includes('trim(compact.history,6)')&&game.includes('trim(compact.log,12)'),'save fallback trims only old history/log records');
check(game.includes("toast('🚨 ВЫ ПОТЕРЯЛИ ВЛАСТЬ."), 'loss of power gives a visible notice without switching tabs');
check(!game.includes('tab=previousTab;setTimeout(()=>{tab=previousTab;render()},120)'), 'loss of power no longer schedules a tab redirect');
check(game.includes("if(S.out&&tab!=='comeback')t=null"), 'opposition panel does not override the current map tab');
check(map.includes("MM.pvoMarkers=[];MM.pvoSig=''"),'world shield markers are disabled');
check(map.includes('const aiInterval=warCount>=10?4.5:warCount>=5?3:1.5'),'AI planning cadence adapts to war count');
check(map.includes('warCount>=10?(IS_MOBILE?220:150):warCount>=5?(IS_MOBILE?170:110)'),'map paint cadence adapts to heavy war load');
check(map.includes('const forceLoad=MM.units.length+(MM.garrisons||[]).length+(MM.remoteUnits||[]).length'),'map renderer measures actual unit load, not only war count');
check(map.includes('forceLoad>=240?7:forceLoad>=150?5.5:forceLoad>=90?4:'),'AI planning interval grows with unit count to reduce mobile load');

check(map.includes("const warCount=env&&typeof env.wars==='function'?env.wars().filter"),'war count is defined in the render frame scope');
check(map.includes("support:Math.max(1,Math.round((1+Math.floor(pw/90))*aiScale))"),'enemy AI has an anti-air support force target');
check(map.includes("sub='aabat';nm='Батарея ПВО противника'"),'enemy AI can deploy visible anti-air batteries');
check(map.includes("side=u.own===ME?'m':'e:'+String(u.own)"),'enemy nations are clustered separately on the map');
check(map.includes('mm-enemy-card')&&map.includes('Силы противника на карте'),'enemy force composition and read-only unit inspection are displayed');

check(map.includes('function seedWorldGarrisons()'),'2D garrisons are seeded for countries outside active wars');
check(["add('inf'","add('tank'","add('destroyer'"].every(x=>map.includes(x)),'peacetime map uses compact land and coastal garrisons');
check(!map.slice(map.indexOf('function seedWorldGarrisons()'),map.indexOf('function ensureFleet()')).includes("add('aabat'"),'peace map no longer floods the world with shield-shaped anti-air icons');
check(map.includes("sub='aabat';nm='Батарея ПВО противника'"),'wartime AI can still field anti-air batteries');
check(map.includes("if(!MM.open){fab.textContent='🪖 Войска · '+mine.length;p.hidden=true;return}"),'closed military panel skips expensive enemy-force aggregation');
check(map.includes('stationed.forEach(g=>{if(!MM.units.some(u=>u.own===w.n&&u.sub===g.sub))mk('), 'peacetime garrisons become active AI units when war begins');
check(map.includes('function activateWarForces(name)'), 'enemy forces can be deployed immediately on war declaration');
check(map.includes('activateWar:activateWarForces'), 'game can call the immediate enemy deployment API');
check(game.includes('MilMap.core.activateWar(name)'), 'war declaration calls immediate 2D enemy deployment');
check(map.includes('const activeOwners=new Set((env.wars?env.wars():[])'), 'old saves discard stale foreign units but retain active war forces');
check(map.includes('function ownerColor(own)'),'each country receives a distinct 2D force colour');
check(game.includes('playerCountry:()=>myName()'),"map garrison layer can exclude the player's own country");

check(game.includes('compact.milmap.units=compact.milmap.units.map(u=>({id:u.id,own:u.own,sub:u.sub,x:u.x,y:u.y,ang:u.ang,hp:u.hp'), 'quota fallback compacts routes but preserves each army identity, type and position');
check(game.includes('Текущая партия остаётся открытой')&&game.includes('return saved;'),'failed local save reports the problem without resetting the live campaign');
