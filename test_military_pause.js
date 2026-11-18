// Run: node test_military_pause.js
const assert=require('node:assert/strict');
const M=require('./military_map.js');
assert.equal(M.canAdvance({isRunning:()=>false}),false,'пауза должна блокировать симуляцию');
assert.equal(M.canAdvance({isRunning:()=>true}),true,'при запущенной игре симуляция разрешена');
assert.equal(M.canAdvance({}),true,'совместимость старых тестовых окружений');
console.log('OK: военная симуляция получает состояние паузы главной игры');
// Физические батареи ПВО при уничтожении должны попадать в обработчик потерь,
// включая батареи ИИ-противника, чтобы состав и защита страны обновлялись.
let lost=[];
M.setMask(new Uint8Array(500*288).fill(1));
M.setEnv({S:()=>({money:1000,army:10000}),save(){},toast(){},wars:()=>[],lostUnit:u=>lost.push({own:u.own,sub:u.sub})});
M.MM.units.length=0;M.MM.fx.length=0;
const own=M.mk('me','aabat',20,20);const enemy=M.mk('Testland','aabat',30,20);
own.hp=-1;enemy.hp=-1;M.step(.01);
assert.equal(lost.length,2,'обработчик получает потери батарей обеих сторон');
assert.ok(lost.every(x=>x.sub==='aabat'));
console.log('OK: уничтоженные батареи ПВО удаляются из физического состава обеих стран');
