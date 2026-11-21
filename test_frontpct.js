const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const s=fs.readFileSync('./game.js','utf8');

// 1) формула в изоляции
const m=s.match(/function frontPctCalc\(enemy, mine, occ, takenMap, isEnemyHeld\)\{[\s\S]*?\n\}/);
if(!m)throw new Error('frontPctCalc not found in game.js');
const ctx={};vm.createContext(ctx);vm.runInContext(m[0],ctx);
const calc=ctx.frontPctCalc;
const E=[{id:1},{id:2},{id:3},{id:4}];
const free=[{name:'a'},{name:'b'}];
const lost=[{name:'a',enemyOccupied:true},{name:'b',enemyOccupied:true}];
const any=()=>true;

assert.equal(calc(E,free,[],{},any),50,'нет захватов -> 50');
assert.equal(calc(E,free,[],{1:1,2:1,3:1,4:1},any),100,'все области врага взяты -> 100');
assert.equal(calc(E,lost,[],{},any),0,'все мои области заняты -> 0');
assert.equal(calc(E,free,[],{1:1,2:1},any),75,'половина врага -> 75');
assert.equal(calc(E,free,['1','2'],{},any),75,'w.occ тоже считается (режим без карты)');
assert.equal(calc(E,free,[1,2],{2:1,3:1},any),87.5,'occ и taken объединяются без дублей');
assert.equal(calc(E,lost,[],{},()=>false),50,'область занята другим врагом -> не считается');
assert.equal(calc(E,lost,[],{1:1,2:1,3:1,4:1},any),50,'всё взято и всё потеряно -> 50');
assert.equal(calc([],free,[],{},any),null,'нет геоданных врага -> null (обёртка вернёт w.p)');
assert.equal(calc(E,free,[],{},null),50,'isEnemyHeld не функция -> безопасно');

// 2) показ идёт через frontPct, а не через w.p
assert.ok((s.match(/frontPct\(w\)/g)||[]).length>=5,'frontPct(w) в 5 местах показа');
assert.doesNotMatch(s,/Поддержка фронта: \$\{Math\.round\(w\.p\|\|0\)\}/,'чип войны через frontPct');
assert.doesNotMatch(s,/' · фронт '\+Math\.round\(w\.p\)\+'%'/,'кнопка мира через frontPct');
assert.doesNotMatch(s,/`\$\{w\.n\}: \$\{Math\.round\(w\.p\)\}%`/,'список войн через frontPct');
assert.doesNotMatch(s,/фронт \+\$\{fb\.toFixed/,'planInfo: подпись «натиск», не «фронт»');

// 3) давление w.p не тронуто
assert.match(s,/w\.p=Math\.min\(100,\(Number\(w\.p\)\|\|50\)\+3\);w\.frontLine=ra\.name/,'takeRegion держит +3 давления');
console.log('OK: frontPct formula verified; display sites use frontPct(w); pressure w.p unchanged');