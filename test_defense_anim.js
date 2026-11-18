const assert=require('node:assert/strict');
const M=require('./military_map.js');
const {MM,SPEC,step,mk,setMask,setEnv,aiThink}=M;
const CW=500,CH=288,mask=new Uint8Array(CW*CH);
for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)if(x<250)mask[y*CW+x]=1;
setMask(mask);
const nat={name:'Враг',power:80,treasury:5000,manpower:30,industry:1,rs:{st:{steel:90,fuel:90,energy:90,food:60}}};
setEnv({S:()=>({money:9999,army:40000}),save(){},toast(){},wars:()=>[{n:'Враг',enPow0:80}],enemyNation:()=>nat,
 enemySpawn:()=>({x:200,y:200}),regionAt:(x,y)=>x<500?{id:'X',name:'Т',x,y,country:'Враг',mine:false,occupied:false,enemyWar:true}:null,takeRegion(){},bombRegion(){}});
// база врага и вторжение игрока
MM.bases.push({id:'eb1',name:'Б',x:200,y:200,px:520,py:200,own:'Враг'});
const inv=mk('me','tank',260,200);
const ret=()=>{MM.spawnT={};MM.units.forEach(u=>u.own==='me'||0)};
let t0=nat.treasury;
for(let i=0;i<60;i++){MM.war={};MM.units.forEach(u=>{});step(.5);aiThink();}
const forts=MM.units.filter(u=>u.sub==='fort'),aas=MM.units.filter(u=>u.sub==='aabat');
assert.ok(forts.length>=1,'враг построил укрепрайон');
assert.ok(nat.treasury<t0,'оборона оплачена казной');
// ПВО против авиации
mk('me','bomber',300,200,{base:{x:300,y:200}});
for(let i=0;i<80;i++){step(.5);aiThink()}
assert.ok(MM.units.some(u=>u.sub==='aabat'),'построена батарея ПВО при наличии авиации игрока');
// укрепрайон стреляет и имеет бонус
const f=MM.units.find(u=>u.sub==='fort');f.build=0;f.hp=100;
const tk=mk('me','tank',f.x+8,f.y);const hp0=tk.hp;
for(let i=0;i<20;i++)step(.1);
assert.ok(tk.hp<hp0||!MM.units.includes(tk),'укрепрайон обстреливает врага');
// смерть создаёт эффект-призрак
MM.units.push({id:'zz',own:'me',sub:'destroyer',x:600,y:100,ang:0,hp:.1,path:[],mission:'idle',cd:0,cap:0,name:''});
MM.units.push({id:'zy',own:'me',sub:'fighter',x:100,y:100,ang:0,hp:.1,path:[],mission:'idle',fuel:100,cd:0,cap:0,name:'',base:null});
MM.units.find(u=>u.id==='zz').hp=0;MM.units.find(u=>u.id==='zy').hp=0;
step(.1);
const gh=MM.fx.filter(x=>x.kind==='ghost').map(x=>x.dk);
assert.ok(gh.includes('sink')&&gh.includes('crash'),'корабль тонет, самолёт падает');
// следы при движении
const s2=mk('me','destroyer',600,100);s2.path=[[700,100]];step(.5);step(.5);
assert.ok(MM.fx.some(x=>x.kind==='wake'),'кильватер');
console.log('OK: оборона врага (укрепрайон, ПВО, оплата), стрельба фортов, гибель кораблей и самолётов, следы');
