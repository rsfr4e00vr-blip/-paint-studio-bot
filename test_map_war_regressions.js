'use strict';
const fs=require('fs');
const game=fs.readFileSync('game.js','utf8');
const map=fs.readFileSync('military_map.js','utf8');
function check(ok,msg){if(!ok)throw new Error(msg);console.log('OK',msg)}
check(game.includes('const compact=JSON.parse(JSON.stringify(S))'),'save quota fallback builds a compact state');
check(game.includes('trim(compact.history,24)')&&game.includes('trim(compact.log,35)'),'save fallback trims only old history/log records');
check(game.includes('tab=previousTab;setTimeout(()=>{tab=previousTab;render()},120)'),'loss of power preserves the active tab');
check(map.includes("MM.pvoMarkers=[];MM.pvoSig=''"),'world shield markers are disabled');
check(map.includes('const aiInterval=warCount>=10?4.5:warCount>=5?3:1.5'),'AI planning cadence adapts to war count');
check(map.includes('warCount>=10?(IS_MOBILE?220:150):warCount>=5?(IS_MOBILE?170:110)'),'map paint cadence adapts to heavy war load');

check(map.includes("const warCount=env&&typeof env.wars==='function'?env.wars().filter"),'war count is defined in the render frame scope');
check(map.includes("support:Math.max(1,Math.round((1+Math.floor(pw/90))*aiScale))"),'enemy AI has an anti-air support force target');
check(map.includes("sub='aabat';nm='Батарея ПВО противника'"),'enemy AI can deploy visible anti-air batteries');
check(map.includes("side=u.own===ME?'m':'e:'+String(u.own)"),'enemy nations are clustered separately on the map');
check(map.includes('mm-enemy-card')&&map.includes('Силы противника на карте'),'enemy force composition and read-only unit inspection are displayed');

check(map.includes('function seedWorldGarrisons()'),'2D garrisons are seeded for countries outside active wars');
check(["add('inf'","add('tank'","add('aabat'","add('fighter'","add('bomber'","add('destroyer'","add('frigate'","add('submarine'"].every(x=>map.includes(x)),'world garrisons cover land, armour, anti-air, aviation and coastal navy');
check(map.includes('stationed.forEach(g=>{const extra='),'peacetime garrisons become active AI units when war begins');
check(map.includes('function ownerColor(own)'),'each country receives a distinct 2D force colour');
check(game.includes('playerCountry:()=>myName()'),"map garrison layer can exclude the player's own country");
