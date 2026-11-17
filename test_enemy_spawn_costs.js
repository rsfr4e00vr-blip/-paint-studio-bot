const core=require('./military_map.js');const {MM,setMask,setEnv,aiThink}=core;
setMask(new Uint8Array(500*288).fill(1).map((v,i)=>((i%500)<250?1:0)));
const nat={name:'Враг',power:80,treasury:5000,manpower:30,industry:1,rs:{st:{steel:60,fuel:60,energy:60,food:60}}};
let msgs=[];
setEnv({S:()=>({money:0}),save(){},toast(){},wars:()=>[{n:'Враг',enPow0:80}],enemyNation:()=>nat,enemySpawn:()=>({x:100,y:100}),say(){}});
MM.units.push({id:'m1',own:'me',sub:'inf',x:150,y:150,hp:100,path:[],mission:'idle'});
let spawned=0;
for(let i=0;i<40;i++){MM.spawnT={};const b=MM.units.length;aiThink();spawned+=MM.units.length-b;}
const t0=nat.treasury,s0=nat.rs.st.steel;
console.log('spawned',spawned,'treasury',nat.treasury,'steel',nat.rs.st.steel.toFixed(1));
if(!(nat.treasury<5000))throw 'no money spent';
// broke enemy: no more spawns
nat.treasury=0;MM.units=MM.units.filter(u=>u.own==='me');const b=MM.units.length;
for(let i=0;i<10;i++){MM.spawnT={};aiThink()}
if(MM.units.length!==b)throw 'spawned without money';
nat.treasury=5000;nat.rs.st.steel=0;
for(let i=0;i<10;i++){MM.spawnT={};aiThink()}
if(MM.units.length!==b)throw 'spawned without steel';
console.log('OK: враг платит казной/сталью и не появляется без них');
