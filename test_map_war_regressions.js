'use strict';
const fs=require('fs');
const game=fs.readFileSync('game.js','utf8');
const map=fs.readFileSync('military_map.js','utf8');
function check(ok,msg){if(!ok)throw new Error(msg);console.log('OK',msg)}
check(game.includes('const compact=JSON.parse(JSON.stringify(S))'),'save quota fallback builds a compact state');
check(game.includes('trim(compact.history,24)')&&game.includes('trim(compact.log,35)'),'save fallback trims only old history/log records');
check(game.includes('tab=previousTab;setTimeout(()=>{tab=previousTab;render()},120)'),'loss of power preserves the active tab');
check(map.includes("MM.pvoMarkers=[];MM.pvoSig=''"),'world shield markers are disabled');
check(!map.includes('const pvos=MM.pvoMarkers||[];const pSig=pvos.length'), ''); // renderer still supports future explicitly-created markers
check(map.includes('const aiInterval=warCount>=10?4.5:warCount>=5?3:1.5'),'AI planning cadence adapts to war count');
check(map.includes('warCount>=10?(IS_MOBILE?220:150):warCount>=5?(IS_MOBILE?170:110)'),'map paint cadence adapts to heavy war load');
