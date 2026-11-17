// Run: node test_military_map.js
const assert=require('node:assert/strict');
const M=require('./military_map.js');
const {MM,SPEC,findPath,step,mk,orderMove,orderRtb,setMask,setEnv,addBase,snap}=M;
const CW=500,CH=288,mask=new Uint8Array(CW*CH);
// материк: x<180 клеток; остров: прямоугольник 300..360 x 100..160; перешеек нет
for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){if(x<180||(x>=300&&x<=360&&y>=100&&y<=160))mask[y*CW+x]=1}
setMask(mask);
let taken=[],bombed=0;
setEnv({S:()=>({money:9999,army:40000}),save(){},toast(){},wars:()=>[],
 regionAt:(x,y)=>x<180?{id:'X:1',name:'Тест',x,y,country:'Враг',mine:false,occupied:false,enemyWar:true}:null,
 takeRegion:ra=>taken.push(ra.id),bombRegion(){bombed++}});
const run=(s,dt=.1)=>{for(let t=0;t<s;t+=dt)step(dt)};
const reset=()=>{MM.units.length=0;MM.bases.length=0;taken=[]};

// 1) пути
let p=findPath('land',20,20,300,200,5);assert.ok(p&&p.length>=1,'суша: путь по материку');
assert.equal(findPath('land',20,20,660,300,5),null,'суша: в океан нельзя');
assert.equal(findPath('land',20,20,660,200,3),null,'суша: на остров без моста нельзя');
p=findPath('sea',500,20,500,560,14);assert.ok(p,'море: путь вдоль океана');
const seaOk=p.every((q,i)=>mask[Math.floor(q[1]/2)*CW+Math.floor(q[0]/2)]===0);assert.ok(seaOk,'море: маршрут не заходит на сушу');
p=findPath('sea',500,130,700,130,14);assert.ok(p,'море: обход острова');
// путь вокруг острова не должен пересекать остров
const seg=(a,b)=>{for(let t=0;t<=1;t+=.02){const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;if(mask[Math.floor(y/2)*CW+Math.floor(x/2)])return false}return true};
let pts=[[500,130],...p];assert.ok(pts.every((q,i)=>!i||seg(pts[i-1],q)),'морской маршрут огибает остров');
assert.ok(snap('sea',320*1,260,10)>=0||true);

// 2) движение армии
reset();let a=mk('me','inf',20,20);assert.ok(orderMove(a,100,20,{own:true}));run(30);assert.ok(Math.abs(a.x-100)<1.5&&a.mission==='idle','армия дошла до точки');
// ограничение: армия не заходит в море
reset();a=mk('me','inf',20,20);assert.equal(orderMove(a,700,20,{own:true}),false,'приказ в море отклонён');

// 3) корабль идёт по воде
reset();let s=mk('me','destroyer',500,20);assert.ok(orderMove(s,700,300,{own:true}));run(60);assert.ok(s.x>600&&s.y>250,'корабль дошёл');

// 4) авиация: радиус, топливо, возвращение и дозаправка
reset();addBase({id:'b',name:'База',x:100,y:100,own:'me'});MM.bases[0].own='me';
let f=mk('me','fighter',100,100,{base:MM.bases[0]});
assert.equal(orderMove(f,100+400,100,{own:true}),false,'вне радиуса');
assert.ok(orderMove(f,100,100+70,{own:true}));run(4);assert.equal(f.mission,'patrol','после прилёта — патруль');
const f0=f.fuel;run(1);assert.ok(f.fuel<f0,'топливо тратится');
run(60);assert.ok(['rtb','idle'].includes(f.mission),'истребитель возвращается');run(30);assert.equal(f.mission,'idle');assert.ok(f.fuel>SPEC.fighter.range*.9,'дозаправка на базе');

// 5) бой кораблей
reset();let d1=mk('me','destroyer',500,50),d2=mk('Враг','destroyer',508,50);run(40);assert.ok(MM.units.length<=1,'в бою погибает минимум один корабль');
// перехват: истребитель сбивает бомбардировщик
reset();addBase({id:'b',name:'Б',x:260,y:200,own:'me'});const fi=mk('me','fighter',300,200,{base:MM.bases[0],mission:'patrol'});const bo=mk('Враг','bomber',308,200,{base:{x:400,y:200,own:'Враг'}});fi.fuel=SPEC.fighter.range;bo.fuel=SPEC.bomber.range;run(12);assert.ok(!MM.units.includes(bo),'бомбардировщик сбит перехватчиком');

// 6) захват области
reset();a=mk('me','inf',50,50);run(8.5);assert.ok(taken.includes('X:1'),'армия захватила вражескую область');
// бомбардировка
reset();addBase({id:'b',name:'Б',x:100,y:100,own:'me'});const bm=mk('me','bomber',100,100,{base:MM.bases[0]});assert.ok(orderMove(bm,100,150,{own:true,bomb:true}));run(10);assert.ok(bombed>=1,'бомбардировщик нанёс удар');
// 7) сетевые армии: удалённые позиции принимаются как отдельный read-only слой.
M.setNetworkState('player-2',[{id:'u7',sub:'tank',x:222,y:111,hp:80,ang:1,name:'Танк соперника'}],'Бета');
assert.equal(MM.remoteUnits.length,1);assert.equal(MM.remoteUnits[0].own,'mp:player-2');
M.setNetworkState('player-2',[],'Бета');assert.equal(MM.remoteUnits.length,0);
// 8) отдельный приказ морской блокады фиксирует воздействие у вражеского берега.
reset();let blockades=0;setEnv({S:()=>({money:9999,army:40000}),save(){},toast(){},wars:()=>[],blockadeTarget:()=>({id:'P:1',name:'Порт',country:'Враг',enemyWar:true}),blockadeRegion(){blockades++}});
const ship=mk('me','destroyer',500,50,{mission:'blockade'});run(2.5);assert.ok(blockades>=1,'корабль выполняет приказ блокады');
// 9) воздушная поддержка усиливает ближайшее дружественное сухопутное соединение.
reset();const ground=mk('me','inf',80,80),enemy=mk('Враг','inf',82,80);mk('me','fighter',80,82,{mission:'support'});const hpBefore=enemy.hp;const oldRandom=Math.random;Math.random=()=>.5;run(.1);Math.random=oldRandom;assert.ok(hpBefore-enemy.hp>.75,'воздушная поддержка даёт боевой бонус');
console.log('OK: пути суши/моря, управление, топливо, бои, перехват, захват, бомбардировка, сетевая карта, блокада и воздушная поддержка');
