/* Новария — войска на глобальной карте: армии, флот, авиация (2D-модели), движение в реальном времени,
   управление касанием, бои, захват областей. Работает поверх SVG-карты из game.js (через NG.__mm). */
(function(root){
'use strict';
const GW=1000,GH=575,CELL=2,CW=500,CH=288;
const ME='me';
const SPEC={
 inf:{kind:'land',name:'Пехотная армия',icon:'🪖',spd:3.4,rg:4.5,px:28,cost:{money:200,army:3000}},
 tank:{kind:'land',name:'Танковая армия',icon:'🛡️',spd:4.8,rg:6,px:28,cost:{money:600,army:2000}},
 destroyer:{kind:'sea',name:'Эсминец',icon:'⚓',spd:6.2,rg:15,px:32,cost:{money:1900}},
 frigate:{kind:'sea',name:'Фрегат',icon:'🚢',spd:5.6,rg:13,px:30},
 carrier:{kind:'sea',name:'Авианосец',icon:'🛳️',spd:4.4,rg:9,px:38,cost:{money:5200}},
 submarine:{kind:'sea',name:'Подводная лодка',icon:'🌊',spd:4.8,rg:12,px:30,cost:{money:2300}},
 fighter:{kind:'air',name:'Истребители',icon:'✈️',spd:24,rg:16,px:28,range:170,cost:{money:950}},
 bomber:{kind:'air',name:'Бомбардировщики',icon:'🛩️',spd:17,rg:7,px:32,range:230,cost:{money:1450}}
};
/* урон в секунду: DM[кто][по кому] */
const DM={
 inf:{land:5,sea:0,air:.6}, tank:{land:8,sea:0,air:0},
 destroyer:{land:4,sea:7,air:3}, frigate:{land:3,sea:5,air:2.5}, carrier:{land:0,sea:3,air:1},
 submarine:{land:0,sea:10,air:0},
 fighter:{land:2,sea:2,air:9}, bomber:{land:10,sea:9,air:1}
};
const NAMES={inf:'пехотная армия',tank:'танковая армия',destroyer:'эскадра эсминцев',frigate:'отряд фрегатов',carrier:'авианосная группа',submarine:'подводная лодка',fighter:'истребительная эскадрилья',bomber:'бомбардировочная группа'};
const MM={units:[],remoteUnits:[],seq:1,sel:null,mode:'move',speed:1,fx:[],log:[],bases:[],dirty:false,svg:null,ready:false,open:false,t:0,aiT:0};
let mask=null;                       /* 1 — суша */
let env=null;                        /* связь с игрой */
const rnd=(a,b)=>a+Math.random()*(b-a);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- карта проходимости ---------- */
function setMask(m){mask=m}
function buildMask(){
 if(mask)return mask;
 const cv=document.createElement('canvas');cv.width=CW;cv.height=CH;
 const x=cv.getContext('2d',{willReadFrequently:true});x.scale(CW/GW,CH/GH);x.fillStyle='#000';
 Object.values(env.GEO.c).forEach(C=>{if(!C||!C.d)return;try{x.fill(new Path2D(C.d),'evenodd')}catch(e){}});
 const d=x.getImageData(0,0,CW,CH).data,m=new Uint8Array(CW*CH);
 for(let i=0;i<m.length;i++)m[i]=d[i*4+3]>110?1:0;
 mask=m;return m}
const cellOf=(x,y)=>{const cx=clampN(Math.floor(x/CELL),0,CW-1),cy=clampN(Math.floor(y/CELL),0,CH-1);return cy*CW+cx};
const okCell=(kind,i)=>kind==='air'?true:kind==='land'?mask[i]===1:mask[i]===0;
const cellPt=i=>[(i%CW)*CELL+CELL/2,Math.floor(i/CW)*CELL+CELL/2];
function snap(kind,x,y,maxR){
 const c0=cellOf(x,y);if(okCell(kind,c0))return c0;
 const cx=c0%CW,cy=Math.floor(c0/CW);
 for(let r=1;r<=maxR;r++){let best=-1,bd=1e9;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=CW||ny>=CH)continue;const i=ny*CW+nx;if(okCell(kind,i)){const d=dx*dx+dy*dy;if(d<bd){bd=d;best=i}}}
  if(best>=0)return best}
 return -1}
function los(kind,a,b){const n=Math.ceil(dist(a,b)/(CELL*.6));for(let k=1;k<n;k++){const t=k/n;if(!okCell(kind,cellOf(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)))return false}return true}

/* ---------- поиск пути A* по сетке ---------- */
function findPath(kind,ax,ay,bx,by,maxSnap){
 if(kind==='air')return[[bx,by]];
 buildMask();
 const s=snap(kind,ax,ay,6),g=snap(kind,bx,by,maxSnap||16);
 if(s<0||g<0)return null;
 const N=CW*CH,G=new Float32Array(N).fill(1e9),from=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
 const hx=[],hi=[];                              /* бинарная куча: ключ f и индекс */
 const push=(f,i)=>{let k=hx.length;hx.push(f);hi.push(i);while(k>0){const p=(k-1)>>1;if(hx[p]<=hx[k])break;[hx[p],hx[k]]=[hx[k],hx[p]];[hi[p],hi[k]]=[hi[k],hi[p]];k=p}};
 const pop=()=>{const r=hi[0],lf=hx.pop(),li=hi.pop();if(hx.length){hx[0]=lf;hi[0]=li;let k=0;for(;;){let l=2*k+1,rr=l+1,m=k;if(l<hx.length&&hx[l]<hx[m])m=l;if(rr<hx.length&&hx[rr]<hx[m])m=rr;if(m===k)break;[hx[m],hx[k]]=[hx[k],hx[m]];[hi[m],hi[k]]=[hi[k],hi[m]];k=m}}return r};
 const gx=g%CW,gy=Math.floor(g/CW);
 const h=i=>{const dx=Math.abs((i%CW)-gx),dy=Math.abs(Math.floor(i/CW)-gy);return Math.max(dx,dy)+.414*Math.min(dx,dy)};
 G[s]=0;push(h(s),s);let steps=0,found=false;
 while(hx.length&&steps++<160000){const i=pop();if(closed[i])continue;closed[i]=1;if(i===g){found=true;break}
  const cx=i%CW,cy=Math.floor(i/CW);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=CW||ny>=CH)continue;const j=ny*CW+nx;if(closed[j]||!okCell(kind,j))continue;
   if(dx&&dy&&(!okCell(kind,cy*CW+nx)||!okCell(kind,ny*CW+cx)))continue;
   const ng=G[i]+(dx&&dy?1.414:1);if(ng<G[j]){G[j]=ng;from[j]=i;push(ng+h(j),j)}}}
 if(!found)return null;
 const cells=[];for(let i=g;i>=0;i=from[i]){cells.push(cellPt(i));if(i===s)break}
 cells.reverse();
 const pts=[[ax,ay],...cells];
 /* спрямление по линии видимости */
 const out=[];let i=0;
 while(i<pts.length-1){let j=pts.length-1;while(j>i+1&&!los(kind,pts[i],pts[j]))j--;out.push(pts[j]);i=j}
 const last=out[out.length-1];
 if(last&&okCell(kind,cellOf(bx,by))&&dist(last,[bx,by])<CELL*3)out[out.length-1]=[bx,by];
 return out}

/* ---------- создание и состав ---------- */
function mk(own,sub,x,y,extra){
 const S=SPEC[sub],u={id:'mu'+(MM.seq++),own,sub,x,y,ang:0,hp:100,path:[],mission:'idle',base:null,fuel:S.range||0,cd:0,cap:0,name:''};
 if(extra)Object.assign(u,extra);MM.units.push(u);return u}
const kindOf=u=>SPEC[u.sub].kind;
const isEnemy=(a,b)=>a.own!==b.own&&(a.own===ME||b.own===ME);
function nearestBase(u){let best=null,bd=1e9;MM.bases.forEach(b=>{if(b.own&&b.own!==u.own)return;const d=dist([u.x,u.y],[b.x,b.y]);if(d<bd){bd=d;best=b}});return best}

/* ---------- приказы ---------- */
function say(t,own){MM.log.unshift(t);MM.log=MM.log.slice(0,6);if(own&&env&&env.toast)env.toast(t);MM.dirty=true}
function orderMove(u,x,y,opt){
 const k=kindOf(u);opt=opt||{};
 if(k==='air'){
  const base=u.base||nearestBase(u);if(!base)return false;
  const need=dist([u.x,u.y],[x,y])+dist([x,y],[base.x,base.y])+6;
  if(need>u.fuel&&opt.own){say('✈️ Вне радиуса: дальность — '+Math.round(SPEC[u.sub].range/2)+' ед. от базы',true);return false}
  u.path=[[x,y]];u.mission=opt.bomb?'bomb':'move';u.tgt=[x,y];return true}
 const p=findPath(k,u.x,u.y,x,y,k==='sea'?14:5);
 if(!p||!p.length){if(opt.own)say(k==='sea'?'⚓ Корабли не могут туда плыть: нет морского пути':'🪖 Армия не может туда пройти: нет сухопутного пути',true);return false}
 u.path=p;u.mission='move';u.tgt=p[p.length-1];return true}
function orderStop(u){u.path=[];u.tgt=null;if(u.mission!=='rtb'||kindOf(u)!=='air')u.mission=kindOf(u)==='air'?'patrol':'idle'}
function orderRtb(u){const b=nearestBase(u);if(!b)return;const k=kindOf(u);
 if(k==='air'){u.path=[[b.x,b.y]];u.mission='rtb';u.tgt=[b.x,b.y];return}
 if(k==='sea'){orderMove(u,b.px,b.py,{own:u.own===ME});u.mission='rtb';return}
 orderMove(u,b.x,b.y,{own:u.own===ME})}

/* ---------- обновление ---------- */
function step(dt){
 MM.t+=dt;
 MM.units.forEach(u=>{
  const S=SPEC[u.sub],k=S.kind;
  /* топливо и возвращение */
  if(k==='air'){
   const b=u.base||nearestBase(u),onBase=b&&dist([u.x,u.y],[b.x,b.y])<5&&(u.mission==='idle'||u.mission==='rtb');
   if(onBase){u.fuel=Math.min(S.range,u.fuel+S.range*.35*dt);u.hp=Math.min(100,u.hp+6*dt);u.mission='idle';u.path=[]}
   else{
    if(b&&u.mission!=='rtb'&&u.fuel<dist([u.x,u.y],[b.x,b.y])*1.12+7){u.path=[[b.x,b.y]];u.mission='rtb';if(u.own===ME)say('✈️ '+u.name+': мало топлива, возвращаемся на базу')}
    if(u.mission==='patrol'||u.mission==='support'||u.mission==='bomb'&&!u.path.length)u.fuel-=S.spd*.28*dt;
    if(u.fuel<=0){u.hp=0;u.dead='fuel'}}}
  else if(k==='sea'){const b=nearestBase(u);if(b&&dist([u.x,u.y],[b.px,b.py])<8)u.hp=Math.min(100,u.hp+3*dt);if(u.mission==='blockade'&&!u.path.length){u.blockadeT=(u.blockadeT||0)+dt;if(u.blockadeT>=2){u.blockadeT=0;const ra=env&&env.blockadeTarget&&env.blockadeTarget(u.x,u.y);if(ra&&ra.enemyWar&&env.blockadeRegion)env.blockadeRegion(ra,u)}}}
  else{const b=nearestBase(u);if(b&&dist([u.x,u.y],[b.x,b.y])<6)u.hp=Math.min(100,u.hp+2.5*dt)}
  /* движение по маршруту */
  if(u.path.length){
   let mv=S.spd*dt*(u.hp<35?.7:1);
   while(mv>0&&u.path.length){
    const p=u.path[0],d=dist([u.x,u.y],p);
    const a=Math.atan2(p[1]-u.y,p[0]-u.x);
    if(d>.01)u.ang+=((((a-u.ang)+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*(k==='air'?7:k==='sea'?3:6));
    if(d<=mv){u.x=p[0];u.y=p[1];mv-=d;if(k==='air')u.fuel-=d;u.path.shift()}
    else{u.x+=Math.cos(a)*mv;u.y+=Math.sin(a)*mv;if(k==='air')u.fuel-=mv;mv=0}}
   if(!u.path.length)arrive(u)}
 });
 combat(dt);
 capture(dt);
 MM.units=MM.units.filter(u=>{if(u.hp>0)return true;
  const mine=u.own===ME;
  if(u.dead==='fuel')say((mine?'💀 Потеряно: ':'Противник потерял: ')+NAMES[u.sub]+' (без топлива)',mine);
  else say((mine?'💥 Уничтожено: ':'✅ Уничтожено у противника: ')+NAMES[u.sub],mine);
  addFx(u.x,u.y,'boom',1.4);if(MM.sel===u.id)MM.sel=null;if(mine)env&&env.lostUnit&&env.lostUnit(u);return false});
 MM.fx=MM.fx.filter(f=>MM.t-f.t0<f.life);
}
function arrive(u){
 const k=kindOf(u);
 if(k==='air'){
  if(u.mission==='bomb'){bombRun(u)}
  else if(u.mission==='move')u.mission='patrol'}
 else if(u.mission==='move')u.mission='idle';
}
function bombRun(u){
 let hit=0;MM.units.forEach(t=>{if(!isEnemy(u,t)||kindOf(t)==='air')return;if(dist([u.x,u.y],[t.x,t.y])<10){t.hp-=38;hit++;addFx(t.x,t.y,'boom',1)}});
 addFx(u.x,u.y,'boom',1.6);
 const ra=env&&env.regionAt&&env.regionAt(u.x,u.y);
 if(u.own===ME&&ra&&env.bombRegion)env.bombRegion(ra);
 if(u.own===ME)say('💣 Бомбардировка: '+(ra?ra.name:'цель')+(hit?` · поражено целей: ${hit}`:''),true);
 u.mission='rtb';const b=nearestBase(u);if(b)u.path=[[b.x,b.y]]}
function addFx(x,y,kind,s){if(MM.fx.length>40)MM.fx.shift();MM.fx.push({x,y,kind,s:s||1,t0:MM.t,life:kind==='boom'?1.1:.35})}
function combat(dt){
 const U=MM.units;
 for(let i=0;i<U.length;i++){const a=U[i];if(a.hp<=0)continue;const S=SPEC[a.sub];
  if(a.mission==='rtb'&&S.kind==='air'&&a.sub==='bomber')continue;
  let best=null,bd=1e9;
  for(let j=0;j<U.length;j++){const t=U[j];if(t.hp<=0||!isEnemy(a,t))continue;
   const dm=DM[a.sub][SPEC[t.sub].kind];if(!dm)continue;
   let d=dist([a.x,a.y],[t.x,t.y]);
   if(t.sub==='submarine'&&a.sub!=='submarine'&&d>7)continue;  /* лодку видно только вблизи */
   if(d<=S.rg&&d<bd){bd=d;best=t}}
  if(best){
   let dmg=DM[a.sub][SPEC[best.sub].kind]*(.5+.5*a.hp/100)*dt*rnd(.7,1.3);
   if(a.sub==='fighter'&&best.sub==='bomber')dmg*=1.5;
   if(best.sub==='tank')dmg*=.85;
   if(a.own===ME&&kindOf(a)==='land'&&MM.units.some(q=>q.own===ME&&SPEC[q.sub].kind==='air'&&q.mission==='support'&&dist([q.x,q.y],[a.x,a.y])<14))dmg*=1.18;
   best.hp-=dmg;a.fight=MM.t;
   if(Math.random()<dt*3)addFx(best.x+rnd(-2,2),best.y+rnd(-2,2),'hit',1);
   /* истребители преследуют цель в воздухе */
   if(a.sub==='fighter'&&SPEC[best.sub].kind==='air'&&a.mission!=='rtb'&&a.fuel>dist([a.x,a.y],[best.x,best.y])+60)a.path=[[best.x,best.y]]}
 }
}
function capture(dt){
 if(!env||!env.regionAt)return;
 MM.units.forEach(u=>{
  if(kindOf(u)!=='land')return;
  u.capT=(u.capT||0)+dt;if(u.capT<.5){return}const dd=u.capT;u.capT=0;
  const ra=env.regionAt(u.x,u.y);if(!ra){u.cap=0;u.capId=null;return}
  const contested=MM.units.some(t=>t.hp>0&&isEnemy(u,t)&&kindOf(t)==='land'&&dist([u.x,u.y],[t.x,t.y])<10);
  if(u.own===ME){
   if(!ra.enemyWar||ra.mine||ra.occupied||contested||u.hp<20){if(!contested){u.cap=0;u.capId=null}return}
   if(u.capId!==ra.id){u.capId=ra.id;u.cap=0}
   u.cap+=dd;
   if(u.cap>=7){u.cap=0;u.capId=null;env.takeRegion(ra);addBase(ra);say('🚩 Захвачена область: '+ra.name,true);addFx(u.x,u.y,'flag',1)}
  }else{
   if(!ra.mine||contested)return;
   if(u.capId!==ra.id){u.capId=ra.id;u.cap=0}
   u.cap+=dd;
   if(u.cap>=14){u.cap=0;u.capId=null;if(env.enemyRaid)env.enemyRaid(ra);say('⚠️ Противник занял область: '+ra.name,true)}}
 })}
function addBase(ra){if(MM.bases.some(b=>b.id===ra.id))return;const w=snap('sea',ra.x,ra.y,120),p=w>=0?cellPt(w):[ra.x,ra.y];MM.bases.push({id:ra.id,name:ra.name,x:ra.x,y:ra.y,px:p[0],py:p[1],own:ME})}

/* ---------- ИИ противника ---------- */
function aiThink(){
 if(!env||!env.wars)return;
 const wars=env.wars();
 const alive=new Set(wars.map(w=>w.n));
 MM.units=MM.units.filter(u=>u.own===ME||alive.has(u.own));
 wars.forEach(w=>{
  const mine=MM.units.filter(u=>u.own===w.n),pw=Math.max(20,Number(w.enPow0)||50);
  const cap={land:2+Math.floor(pw/28),sea:1+(pw>55?1:0),air:2+(pw>60?1:0)};
  const cnt=k=>mine.filter(u=>kindOf(u)===k).length;
  MM.spawnT=MM.spawnT||{};MM.spawnT[w.n]=(MM.spawnT[w.n]||0)-1.5;
  if(MM.spawnT[w.n]<=0){
   const sp=env.enemySpawn&&env.enemySpawn(w.n);
   if(sp){
    if(cnt('land')<cap.land){const su=Math.random()<.6?'inf':'tank';const q=snap('land',sp.x+rnd(-6,6),sp.y+rnd(-6,6),8);if(q>=0){const c=cellPt(q);mk(w.n,su,c[0],c[1],{name:'Армия противника',base:null})}}
    else if(cnt('sea')<cap.sea){const q=snap('sea',sp.x,sp.y,45);if(q>=0){const c=cellPt(q);mk(w.n,Math.random()<.4?'submarine':'destroyer',c[0],c[1],{name:'Флот противника'})}}
    else if(cnt('air')<cap.air){const su=cnt('air')%2?'bomber':'fighter';const b={x:sp.x,y:sp.y,own:w.n,px:sp.x,py:sp.y};mk(w.n,su,sp.x,sp.y,{name:'Авиация противника',base:b})}
    MM.spawnT[w.n]=22}
  }
 });
 /* поведение */
 const mine=MM.units.filter(u=>u.own===ME);if(!mine.length)return;
 let calls=0;
 MM.units.filter(u=>u.own!==ME).forEach(u=>{
  const k=kindOf(u);
  const near=mine.filter(m=>k==='air'?true:kindOf(m)===k||(k==='land'&&kindOf(m)==='land')).sort((p,q)=>dist([u.x,u.y],[p.x,p.y])-dist([u.x,u.y],[q.x,q.y]))[0];
  if(k==='air'){
   const b=u.base;if(!b)return;
   if(u.mission==='idle'||u.mission==='patrol'&&!u.path.length){
    const tg=mine.filter(m=>u.sub==='fighter'?kindOf(m)==='air':kindOf(m)!=='air').filter(m=>dist([b.x,b.y],[m.x,m.y])<SPEC[u.sub].range*.42).sort((p,q)=>dist([b.x,b.y],[p.x,p.y])-dist([b.x,b.y],[q.x,q.y]))[0];
    if(tg&&u.fuel>SPEC[u.sub].range*.8&&Math.random()<.35){u.path=[[tg.x,tg.y]];u.mission=u.sub==='bomber'?'bomb':'move'}}
  }else if(!u.path.length&&near&&calls<2&&Math.random()<.5){
   const d=dist([u.x,u.y],[near.x,near.y]),lim=k==='sea'?70:55;
   if(d<lim||(k==='land'&&Math.random()<.12)){calls++;orderMove(u,near.x,near.y)}}
 });
}

/* ---------- старт и состав игрока ---------- */
function seedPlayer(){
 const home=MM.bases[0];if(!home)return;
 const pl=(sub,i,name)=>{const kind=SPEC[sub].kind;let x=home.x,y=home.y;
  if(kind==='sea'){x=home.px;y=home.py;const q=snap('sea',x+i*4,y+i*3,120);if(q>=0){const c=cellPt(q);x=c[0];y=c[1]}}
  else if(kind==='land'){const q=snap('land',x+rnd(-9,9),y+rnd(-9,9),8);if(q>=0){const c=cellPt(q);x=c[0];y=c[1]}}
  else{x=home.x+i*2.2;y=home.y+(i%2?1.6:-1.6)}
  return mk(ME,sub,x,y,{name,base:kind==='air'?home:null})};
 pl('inf',0,'1-я армия');pl('inf',1,'2-я армия');pl('tank',2,'1-я танковая армия');
 pl('destroyer',0,'Эсминцы Флота');pl('carrier',1,'Авианосная группа');
 pl('fighter',0,'Истребители 1');pl('fighter',1,'Истребители 2');pl('bomber',2,'Бомбардировщики 1')}
function deploy(sub){
 const S=SPEC[sub],c=S.cost;if(!c||!env)return;const st=env.S();
 if(c.money&&st.money<c.money)return say('Не хватает денег: нужно '+c.money,true);
 if(c.army&&st.army-c.army<5000)return say('Не хватает личного состава',true);
 if(c.money)st.money-=c.money;if(c.army)st.army-=c.army;
 const home=MM.bases[0];if(!home)return;
 const kind=S.kind,n=MM.units.filter(u=>u.own===ME&&u.sub===sub).length+1;
 let x=home.x,y=home.y;
 if(kind==='sea'){x=home.px;y=home.py}
 else if(kind==='land'){const q=snap('land',x+rnd(-4,4),y+rnd(-4,4),6);if(q>=0){const p=cellPt(q);x=p[0];y=p[1]}}
 const u=mk(ME,sub,x,y,{name:S.name+' '+n,base:kind==='air'?home:null});
 MM.sel=u.id;MM.dirty=true;env.save();say('➕ Сформировано: '+u.name,true)}
function deployProduced(uid){
 const st=env.S(),pu=(st.militaryUnits||[]).find(x=>x.id===uid);if(!pu||pu.onMap)return;
 const sub=SPEC[pu.type]?pu.type:null;if(!sub)return;
 const home=MM.bases[0];if(!home)return;const S=SPEC[sub],kind=S.kind;
 let x=home.x,y=home.y;if(kind==='sea'){x=home.px;y=home.py}
 const u=mk(ME,sub,x,y,{name:pu.name,base:kind==='air'?home:null,pid:uid});pu.onMap=u.id;MM.sel=u.id;MM.dirty=true;env.save();say('🚀 На карте: '+pu.name,true)}

/* ---------- тап по карте ---------- */
function toMap(e){const svg=MM.svg;if(!svg||!svg.getScreenCTM)return null;const m=svg.getScreenCTM();if(!m)return null;const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(m.inverse());return{x:q.x,y:q.y}}
function unitsPerPx(){const svg=MM.svg,r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;return vb&&r.width?vb.width/r.width:1}
function hit(p,own){const up=unitsPerPx();let best=null,bd=1e9;
 MM.units.forEach(u=>{if((own===ME)!==(u.own===ME))return;const d=dist([p.x,p.y],[u.x,u.y]),r=(SPEC[u.sub].px*.62)*up;if(d<r&&d<bd){bd=d;best=u}});return best}
function handleTap(e){
 if(!MM.ready||!MM.svg)return false;
 const p=toMap(e);if(!p)return false;
 const own=hit(p,ME);
 if(own){MM.sel=MM.sel===own.id?null:own.id;MM.mode='move';MM.dirty=true;paintHud(true);return true}
 const u=byId(MM.sel);
 if(!u){MM.sel=null;return false}
 const en=hit(p,'enemy'),tx=en?en.x:p.x,ty=en?en.y:p.y;
 let ok=false;
 if(MM.mode==='blockade'&&SPEC[u.sub].kind==='sea'){ok=orderMove(u,tx,ty,{own:true});if(ok)u.mission='blockade'}
 else if(MM.mode==='support'&&SPEC[u.sub].kind==='air'){ok=orderMove(u,tx,ty,{own:true});if(ok)u.mission='support'}
 else ok=orderMove(u,tx,ty,{own:true,bomb:MM.mode==='bomb'&&u.sub==='bomber'});
 if(ok){addFx(tx,ty,'ping',1);if(['bomb','support','blockade'].includes(MM.mode))MM.mode='move'}
 MM.dirty=true;paintHud(true);return true}
const byId=id=>MM.units.find(u=>u.id===id);

/* ---------- 2D-модели ---------- */
const COL={me:'#2f6fd0',en:'#d33a45'};
const sym=pts=>pts.concat(pts.slice(0,-1).reverse().map(p=>[p[0],-p[1]])).map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join('')+'Z';
function sprite(sub,own){
 const c=own===ME?COL.me:COL.en,st='stroke="#fff" stroke-width="1.1" stroke-linejoin="round"';
 switch(sub){
  case'inf':return `<rect x="-12" y="-8.5" width="24" height="17" rx="2.5" fill="${c}" ${st}/><circle cx="-1" cy="-3.6" r="2" fill="#fff"/><path d="M-3.6 -1.4h5.2l1 6.4h-2.1l-.7-3.4-.7 3.4h-2.1z" fill="#fff"/><path d="M2 -1l6-4.6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M-9 6.2h4M5 6.2h4" stroke="#fff" stroke-width="1" opacity=".6"/>`;
  case'tank':return `<rect x="-12" y="-8.5" width="24" height="17" rx="2.5" fill="${c}" ${st}/><rect x="-8" y="0" width="16" height="5" rx="2.5" fill="#fff"/><circle cx="-5" cy="2.5" r="1.1" fill="${c}"/><circle cx="0" cy="2.5" r="1.1" fill="${c}"/><circle cx="5" cy="2.5" r="1.1" fill="${c}"/><rect x="-4" y="-3.6" width="8.5" height="4.2" rx="1.6" fill="#fff"/><rect x="4" y="-2.6" width="8" height="1.5" fill="#fff"/>`;
  case'destroyer':case'frigate':return `<path d="M-12 -3.2L6 -3.2L12.5 0L6 3.2L-12 3.2Z" fill="${c}" ${st}/><rect x="-3" y="-1.8" width="5" height="3.6" rx=".8" fill="#fff"/><circle cx="-8" cy="0" r="1.9" fill="#fff"/><circle cx="6" cy="0" r="1.6" fill="#fff"/><path d="M-12 0h-5" stroke="#fff" stroke-width="1" opacity=".5"/>`;
  case'carrier':return `<path d="M-13 -5L9 -5L13 -2.4V2.4L9 5L-13 5Z" fill="${c}" ${st}/><path d="M-11 0h20" stroke="#fff" stroke-width="1" stroke-dasharray="3 2.4"/><rect x="1" y="-5.4" width="5" height="3.2" fill="#fff"/><path d="M-9 -2.6l3 2.6-3 2.6" fill="none" stroke="#fff" stroke-width=".9"/>`;
  case'submarine':return `<ellipse cx="0" cy="0" rx="12" ry="3.1" fill="${c}" ${st}/><rect x="-2" y="-4.6" width="5" height="3.6" rx="1" fill="#fff"/><path d="M-12 0l-3 -2.4v4.8z" fill="${c}" ${st}/>`;
  case'fighter':return `<path d="${sym([[11,0],[3,-2],[-1,-10],[-4,-10],[-3.5,-2],[-8,-1.6],[-10.5,-5],[-12.5,-5],[-11.5,0]])}" fill="${c}" ${st}/><ellipse cx="2" cy="0" rx="3.6" ry="1.5" fill="#fff"/>`;
  case'bomber':return `<path d="${sym([[12,0],[5,-1.8],[3.6,-12.5],[0,-12.5],[-1,-2],[-8,-1.8],[-10,-6],[-12.5,-6],[-12.5,0]])}" fill="${c}" ${st}/><circle cx="2" cy="-6.5" r="1.5" fill="#fff"/><circle cx="2" cy="6.5" r="1.5" fill="#fff"/><ellipse cx="5.5" cy="0" rx="4" ry="1.5" fill="#fff"/>`;
 }return''}
const NS='http://www.w3.org/2000/svg';
let L={g:null,paths:null,els:{},fx:null,rng:null,bases:null};
function ensureLayer(svg){
 if(L.g&&L.g.isConnected&&L.g.parentNode===svg){if(svg.lastChild!==L.g&&MM.t-(L.last||0)>2){L.last=MM.t;svg.appendChild(L.g)}return}
 const g=document.createElementNS(NS,'g');g.id='milmap';g.setAttribute('pointer-events','none');
 g.innerHTML='<g id="mm-bases"></g><g id="mm-range"></g><g id="mm-paths"></g><g id="mm-units"></g><g id="mm-fx"></g>';
 svg.appendChild(g);L={g,units:g.querySelector('#mm-units'),paths:g.querySelector('#mm-paths'),fx:g.querySelector('#mm-fx'),rng:g.querySelector('#mm-range'),bases:g.querySelector('#mm-bases'),els:{}}}
function paint(){
 const svg=MM.svg;if(!svg||!svg.isConnected)return;ensureLayer(svg);
 const r=svg.getBoundingClientRect();if(!r.width)return;const vb=svg.viewBox.baseVal,up=vb.width/r.width;
 /* базы */
 const sig=MM.bases.map(b=>b.id).join(',')+'|'+up.toFixed(3);
 if(L.bsig!==sig){L.bsig=sig;const k=up*13/10;L.bases.innerHTML=MM.bases.map(b=>`<g transform="translate(${b.x} ${b.y}) scale(${k})"><path d="M0 -9L8 6H-8Z" fill="#12233a" stroke="#f5d889" stroke-width="1.4"/><path d="M0 -3v6M-3 1h6" stroke="#f5d889" stroke-width="1.2"/></g>`).join('')}
 /* юниты */
 const seen={};
 MM.units.concat(MM.remoteUnits||[]).forEach(u=>{seen[u.id]=1;const S=SPEC[u.sub];let e=L.els[u.id];
  if(!e){const g=document.createElementNS(NS,'g');g.innerHTML=`<circle class="mm-ring" r="0" fill="none" stroke="#ffd76a" stroke-width="2"/><g class="mm-spr">${sprite(u.sub,u.own)}</g><g class="mm-bar"><rect x="-11" y="0" width="22" height="3.2" rx="1.2" fill="#000a"/><rect class="mm-hp" x="-11" y="0" width="22" height="3.2" rx="1.2" fill="#4ad66d"/></g><circle class="mm-cap" r="0" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="0 100"/>`;L.units.appendChild(g);e=L.els[u.id]={g,spr:g.querySelector('.mm-spr'),hp:g.querySelector('.mm-hp'),bar:g.querySelector('.mm-bar'),ring:g.querySelector('.mm-ring'),cap:g.querySelector('.mm-cap')}}
  const k=up*S.px/24;
  e.g.setAttribute('transform',`translate(${u.x.toFixed(2)} ${u.y.toFixed(2)}) scale(${k.toFixed(4)})`);
  const kind=S.kind;
  if(kind==='land'){e.spr.setAttribute('transform','')}
  else{const deg=u.ang*180/Math.PI;e.spr.setAttribute('transform',`rotate(${deg.toFixed(1)})`)}
  e.bar.setAttribute('transform',`translate(0 ${kind==='land'?12:kind==='sea'?9:10})`);
  e.hp.setAttribute('width',(22*clampN(u.hp,0,100)/100).toFixed(1));e.hp.setAttribute('fill',u.hp>60?'#4ad66d':u.hp>30?'#f0c040':'#e0443e');
  const sel=MM.sel===u.id;e.ring.setAttribute('r',sel?(S.px*.62).toFixed(1):'0');
  if(u.cap>0&&u.capId){e.cap.setAttribute('r','17');e.cap.setAttribute('stroke-dasharray',(Math.min(1,u.cap/7)*106.8).toFixed(1)+' 200')}else e.cap.setAttribute('r','0')});
 Object.keys(L.els).forEach(id=>{if(!seen[id]){L.els[id].g.remove();delete L.els[id]}});
 /* маршрут и радиус выбранного */
 const u=byId(MM.sel);let pd='',rg='';
 if(u&&u.own===ME){
  if(u.path.length)pd=`<path d="M${u.x} ${u.y}${u.path.map(p=>'L'+p[0]+' '+p[1]).join('')}" fill="none" stroke="#ffd76a" stroke-width="1.6" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" opacity=".9"/><circle cx="${u.path[u.path.length-1][0]}" cy="${u.path[u.path.length-1][1]}" r="${(up*5).toFixed(2)}" fill="#ffd76a" opacity=".85"/>`;
  if(kindOf(u)==='air'){const b=u.base||nearestBase(u);if(b)rg=`<circle cx="${b.x}" cy="${b.y}" r="${SPEC[u.sub].range/2}" fill="#ffd76a10" stroke="#ffd76a" stroke-width="1" stroke-dasharray="2 4" vector-effect="non-scaling-stroke"/>`}}
 L.paths.innerHTML=pd;L.rng.innerHTML=rg;
 /* эффекты */
 L.fx.innerHTML=MM.fx.map(f=>{const a=(MM.t-f.t0)/f.life,s=up*(f.kind==='boom'?18:f.kind==='hit'?8:f.kind==='ping'?16:14)*f.s;
  if(f.kind==='boom')return `<circle cx="${f.x}" cy="${f.y}" r="${(s*(.3+a)).toFixed(2)}" fill="#ff9d2e" opacity="${(.85*(1-a)).toFixed(2)}"/><circle cx="${f.x}" cy="${f.y}" r="${(s*(.15+a*.5)).toFixed(2)}" fill="#fff3b0" opacity="${(1-a).toFixed(2)}"/>`;
  if(f.kind==='ping')return `<circle cx="${f.x}" cy="${f.y}" r="${(s*(.2+a)).toFixed(2)}" fill="none" stroke="#ffd76a" stroke-width="1.6" opacity="${(1-a).toFixed(2)}" vector-effect="non-scaling-stroke"/>`;
  if(f.kind==='flag')return `<circle cx="${f.x}" cy="${f.y}" r="${(s*(.3+a)).toFixed(2)}" fill="none" stroke="#fff" stroke-width="2" opacity="${(1-a).toFixed(2)}" vector-effect="non-scaling-stroke"/>`;
  return `<circle cx="${f.x}" cy="${f.y}" r="${(s*(.3+a*.6)).toFixed(2)}" fill="#ffe27a" opacity="${(.9*(1-a)).toFixed(2)}"/>`}).join('');
}

/* ---------- панель управления ---------- */
function hud(){
 const box=env&&env.WMAP&&env.WMAP.box;if(!box)return null;
 let f=box.querySelector('.mm-fab');
 if(!f){f=document.createElement('button');f.className='mm-fab';f.textContent='🪖 Войска';f.setAttribute('onclick','H.mmToggle()');
  ['pointerdown','pointerup','click','touchstart'].forEach(t=>f.addEventListener(t,ev=>ev.stopPropagation()));box.appendChild(f)}
 let p=document.getElementById('mm-panel');
 if(!p){p=document.createElement('div');p.id='mm-panel';p.className='mm-panel';p.hidden=true;
  ['pointerdown','pointerup','click','touchstart','wheel'].forEach(t=>p.addEventListener(t,ev=>ev.stopPropagation()));document.body.appendChild(p)}
 return{p,fab:f}}
const bar=(v,m,c)=>`<span class="mm-b"><i style="width:${clampN(v/m*100,0,100)}%;background:${c}"></i></span>`;
const MISS={idle:'на месте',move:'в движении',patrol:'патрулирует',bomb:'идёт на цель',rtb:'возвращается'};
function paintHud(force){
 const h=hud();if(!h)return;const p=h.p,fab=h.fab;
 const mine=MM.units.filter(u=>u.own===ME),foes=MM.units.filter(u=>u.own!==ME).length+(MM.remoteUnits||[]).length;
 const u=byId(MM.sel);
 const sig=[MM.open,MM.sel,MM.mode,MM.speed,mine.map(x=>x.id+Math.round(x.hp/5)+x.mission+(x.fuel?Math.round(x.fuel/8):0)).join(),foes,MM.log.join('|'),env.S().money].join('~');
 if(!force&&sig===MM.hsig)return;MM.hsig=sig;
 fab.textContent='🪖 Войска · '+mine.length+(foes?' · враг '+foes:'');
 p.hidden=!MM.open;if(!MM.open)return;
 const chips=mine.map(x=>`<button class="mm-chip${x.id===MM.sel?' on':''}" onclick="H.mmSel('${x.id}')">${SPEC[x.sub].icon}<small>${Math.round(x.hp)}%</small></button>`).join('');
 let card='<p class="mm-hint">Нажмите на свою часть на карте (или значок ниже), затем нажмите точку на карте — отряд пойдёт туда сам.</p>';
 if(u&&u.own===ME){const S=SPEC[u.sub],air=S.kind==='air';
  card=`<div class="mm-card"><b>${S.icon} ${u.name}</b><small>${MISS[u.mission]||''} · ${S.kind==='land'?'суша':S.kind==='sea'?'море':'воздух'}</small>
  <div>Состояние ${bar(u.hp,100,'#4ad66d')}</div>${air?`<div>Топливо ${bar(u.fuel,S.range,'#5aa9ff')} <small>радиус ${Math.round(S.range/2)}</small></div>`:''}
  <div class="mm-row"><button onclick="H.mmStop()">⛔ Стоп</button><button onclick="H.mmRtb()">🏠 На базу</button>${u.sub==='bomber'?`<button class="${MM.mode==='bomb'?'on':''}" onclick="H.mmMode('bomb')">💣 Бомбить</button>`:''}${S.kind==='sea'?`<button class="${MM.mode==='blockade'?'on':''}" onclick="H.mmMode('blockade')">⚓ Блокада</button>`:''}${S.kind==='air'?`<button class="${MM.mode==='support'?'on':''}" onclick="H.mmMode('support')">🤝 Поддержка</button>`:''}<button onclick="H.mmSel(null)">✕</button></div></div>`}
 const dep=['inf','tank','destroyer','carrier','submarine','fighter','bomber'].map(k=>`<button onclick="H.mmDeploy('${k}')" ${SPEC[k].cost?'':'hidden'}>${SPEC[k].icon} ${SPEC[k].name}<small>${SPEC[k].cost.money} 💰${SPEC[k].cost.army?' · '+SPEC[k].cost.army+' чел.':''}</small></button>`).join('');
 const st=env.S(),prod=(st.militaryUnits||[]).filter(x=>!x.onMap&&SPEC[x.type]).map(x=>`<button onclick="H.mmDeployProd('${x.id}')">${x.icon} ${x.name} → на карту</button>`).join('');
 p.innerHTML=`<div class="mm-top"><span>Скорость</span>${[0,1,2,4].map(s=>`<button class="${MM.speed===s?'on':''}" onclick="H.mmSpeed(${s})">${s?s+'×':'⏸'}</button>`).join('')}<button onclick="H.mmToggle()">✕</button></div>
 <div class="mm-chips">${chips||'<small>Нет частей</small>'}</div>${card}
 <details><summary>➕ Сформировать часть</summary><div class="mm-dep">${dep}${prod?'<hr>'+prod:''}</div></details>
 <div class="mm-log">${MM.log.map(x=>'<div>'+x+'</div>').join('')}</div>`}

/* ---------- сохранение ---------- */
function snapshot(){return{v:1,seq:MM.seq,speed:MM.speed,bases:MM.bases,units:MM.units.map(u=>({...u,base:u.base?(u.base.id?u.base.id:{...u.base}):null}))}}
function restore(o){
 MM.seq=o.seq||1;MM.speed=o.speed==null?1:o.speed;MM.bases=o.bases||[];
 MM.units=(o.units||[]).filter(u=>SPEC[u.sub]).map(u=>{let b=null;if(SPEC[u.sub].kind==='air'){b=typeof u.base==='string'?(MM.bases.find(x=>x.id===u.base)||MM.bases[0]||null):(u.base&&typeof u.base==='object'?u.base:(MM.bases[0]||null))}return{...u,base:b,path:u.path||[]}})}
function persist(){if(!env||!MM.dirty)return;MM.dirty=false;try{const st=env.S();st.milmap=snapshot();env.save()}catch(e){}}

/* ---------- запуск ---------- */
let raf=0,last=0,acc=0,saveT=0;
function frame(ts){
 raf=requestAnimationFrame(frame);
 const dt=Math.min(.12,(ts-last)/1000||0);last=ts;if(document.hidden||!MM.ready)return;
 const sd=dt*MM.speed;
 if(sd>0){step(sd);acc+=sd;if(acc>=1.5){acc=0;try{aiThink()}catch(e){console.warn('MM ai',e)}}}
 paint();paintHud(false);
 saveT+=dt;if(saveT>4){saveT=0;persist()}}
function attach(){
 const G=window.NG&&NG.__mm;if(!G)return;
 if(!G.WMAP.node||G.GEO.st!=='ready')return;
 if(MM.svg===G.WMAP.node&&MM.ready)return;
 env=G.env();MM.svg=G.WMAP.node;
 buildMask();
 const st=env.S();
 if(!MM.ready){
  const home=env.homeAnchor&&env.homeAnchor();
  MM.bases=[];if(home){const w=snap('sea',home.x,home.y,260),p=w>=0?cellPt(w):[home.x,home.y];MM.bases.push({id:'home',name:home.name,x:home.x,y:home.y,px:p[0],py:p[1],own:ME})}
  if(st.milmap&&st.milmap.units&&st.milmap.units.length)restore(st.milmap);
  else{seedPlayer();MM.dirty=true}
  MM.ready=true;
  if(!raf){last=performance.now();raf=requestAnimationFrame(frame)}}
 L={g:null,els:{}};hud();paintHud(true)}

const API={
 toggle(){MM.open=!MM.open;paintHud(true)},
 sel(id){MM.sel=id||null;MM.mode='move';paintHud(true)},
 stop(){const u=byId(MM.sel);if(u){orderStop(u);paintHud(true)}},
 rtb(){const u=byId(MM.sel);if(u){orderRtb(u);paintHud(true)}},
 mode(m){MM.mode=MM.mode===m?'move':m;if(MM.mode==='bomb')say('💣 Нажмите на карте цель бомбардировки',true);else if(MM.mode==='blockade')say('⚓ Выберите морскую точку у вражеского побережья',true);else if(MM.mode==='support')say('🤝 Выберите точку для воздушной поддержки',true);paintHud(true)},
 speed(s){MM.speed=s;MM.dirty=true;paintHud(true)},
 deploy,deployProd:deployProduced
};
const core={MM,SPEC,DM,setMask,findPath,step,mk,orderMove,orderStop,orderRtb,aiThink,setEnv:e=>{env=e},cellOf,snap,addBase,nearestBase,capture,setNetworkState(player,units,country){if(!player)return;const owner='mp:'+String(player);const keep=(MM.remoteUnits||[]).filter(u=>u.own!==owner);(Array.isArray(units)?units:[]).forEach((u,i)=>{if(!SPEC[u.sub]||!Number.isFinite(+u.x)||!Number.isFinite(+u.y))return;keep.push({id:owner+':'+String(u.id||i),own:owner,sub:u.sub,x:clampN(+u.x,0,GW),y:clampN(+u.y,0,GH),ang:Number(u.ang)||0,hp:clampN(Number(u.hp)||0,0,100),path:[],mission:String(u.mission||'idle'),fuel:Number(u.fuel)||0,name:String(u.name||country||'Игрок').slice(0,32),remote:true})});MM.remoteUnits=keep;}};
if(typeof module!=='undefined'&&module.exports){module.exports=core}
if(typeof window!=='undefined'&&root===window){
 window.MilMap={handleTap,attach,core,setNetworkState:core.setNetworkState};
 const H=window.H=window.H||{};
 H.mmToggle=API.toggle;H.mmSel=API.sel;H.mmStop=API.stop;H.mmRtb=API.rtb;H.mmMode=API.mode;H.mmSpeed=API.speed;H.mmDeploy=API.deploy;H.mmDeployProd=API.deployProd;
 H.mmOpen=()=>{if(window.goTab)window.goTab('map');setTimeout(()=>{MM.open=true;paintHud(true)},400)};
 setInterval(()=>{try{attach()}catch(e){console.warn('MilMap',e)}},600);
}
})(typeof window!=='undefined'?window:globalThis);
