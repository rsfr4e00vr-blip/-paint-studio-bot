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
 frigate:{kind:'sea',name:'Фрегат',icon:'🚢',spd:5.6,rg:13,px:30,cost:{money:1200}},
 carrier:{kind:'sea',name:'Авианосец',icon:'🛳️',spd:4.4,rg:9,px:38,cost:{money:5200}},
 submarine:{kind:'sea',name:'Подводная лодка',icon:'🌊',spd:4.8,rg:12,px:30,cost:{money:2300}},
fort:{kind:'land',name:'Укрепрайон',icon:'🛡',spd:0,rg:17,px:26,static:true},
 aabat:{kind:'land',name:'Батарея ПВО',icon:'🛡️',spd:1.5,rg:24,px:24,static:true,cost:{money:500}},
 fighter:{kind:'air',name:'Истребители',icon:'✈️',spd:24,rg:16,px:28,range:170,cost:{money:950}},
 bomber:{kind:'air',name:'Бомбардировщики',icon:'🛩️',spd:17,rg:7,px:32,range:230,cost:{money:1450}}
};
/* цена части для ИИ-страны: казна (m), сталь/топливо/энергия (s,f,e — запасы 0–100), личный состав (man) */
const ECOST={
 inf:{m:100,s:2,f:1,e:1,man:.8}, tank:{m:300,s:5,f:4,e:3,man:.5},
 destroyer:{m:950,s:9,f:6,e:4}, submarine:{m:1150,s:10,f:6,e:5},
 fighter:{m:475,s:5,f:5,e:4}, bomber:{m:725,s:7,f:6,e:5},
 fort:{m:150,s:4,f:0,e:1}, aabat:{m:220,s:5,f:0,e:3}
};
/* оплата ИИ-страной: возвращает причину отказа или '' если оплачено */
function ePay(nat,sub){
 if(!nat)return '';const c=ECOST[sub];if(!c)return '';const rs=nat.rs&&nat.rs.st;let why='';
 if((Number(nat.treasury)||0)<c.m)why='казна пуста';
 else if(rs&&(rs.steel<c.s||rs.fuel<c.f||rs.energy<c.e))why=rs.steel<c.s?'нет стали':rs.fuel<c.f?'нет топлива':'нет энергии';
 else if(c.man&&(Number(nat.manpower)||0)<c.man+1)why='нет людей';
 if(why)return why;
 nat.treasury-=c.m;if(rs){rs.steel-=c.s;rs.fuel-=c.f;rs.energy-=c.e}if(c.man)nat.manpower-=c.man;return ''}
/* урон в секунду: DM[кто][по кому] */
const DM={
 inf:{land:5,sea:0,air:.6}, tank:{land:8,sea:0,air:0},
 destroyer:{land:4,sea:7,air:3}, frigate:{land:3,sea:5,air:2.5}, carrier:{land:0,sea:3,air:1},
 submarine:{land:0,sea:10,air:0},
 fighter:{land:2,sea:2,air:9}, bomber:{land:10,sea:9,air:1},
 fort:{land:6.5,sea:5.5,air:1.2}, aabat:{land:0,sea:0,air:11}
};
const NAMES={inf:'пехотная армия',tank:'танковая армия',destroyer:'эскадра эсминцев',frigate:'отряд фрегатов',carrier:'авианосная группа',submarine:'подводная лодка',fort:'укрепрайон',aabat:'батарея ПВО',fighter:'истребительная эскадрилья',bomber:'бомбардировочная группа'};
const MM={units:[],remoteUnits:[],seq:1,sel:null,mode:'move',speed:1,fx:[],log:[],bases:[],dirty:false,svg:null,ready:false,open:false,t:0,aiT:0};
let mask=null;                       /* 1 — суша */
let env=null;                        /* связь с игрой */
const rnd=(a,b)=>a+Math.random()*(b-a);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- карта проходимости ---------- */
function setMask(m){mask=m;SEA=null}
/* Морская связность. На грубой карте проливы (Датские, Босфор, Ла-Манш и т.п.) часто закрыты сушей, и порт оказывается
   в «кармане» воды, откуда не выплыть. Здесь вода делится на связные области; малые озёра становятся сушей,
   а карманы и внутренние моря прорываются каналом до другой воды, если суши между ними мало (как реальные проливы и каналы). */
let SEA=null;
function fixSea(m){
 const N=CW*CH,lab=new Int32Array(N),sizes=[],MINK=40,REACH=16;
 const label=()=>{lab.fill(-1);sizes.length=0;const st=[];let c=0;
  for(let i=0;i<N;i++){if(m[i]!==0||lab[i]>=0)continue;let n=0;st.length=0;st.push(i);lab[i]=c;
   while(st.length){const a=st.pop();n++;const ax=a%CW,ay=(a/CW)|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=ax+dx,ny=ay+dy;if(nx<0||ny<0||nx>=CW||ny>=CH)continue;const b=ny*CW+nx;if(m[b]===0&&lab[b]<0){lab[b]=c;st.push(b)}}}
   sizes.push(n);c++}
  return c};
 const bigMain=()=>{let b=0;sizes.forEach((s,i)=>{if(s>sizes[b])b=i});return b};
 for(let pass=0;pass<60;pass++){
  if(label()<2)break;
  const main=bigMain(),order=[];sizes.forEach((s,i)=>{if(i!==main&&s>=MINK)order.push(i)});
  order.sort((a,b)=>sizes[a]-sizes[b]);
  let carved=false;
  for(const c of order){
   const par=new Int32Array(N).fill(-2),dep=new Uint8Array(N);let q=[];
   for(let i=0;i<N;i++)if(lab[i]===c){par[i]=-1;q.push(i)}
   let hit=-1;
   for(let d=0;d<REACH&&hit<0&&q.length;d++){const nq=[];
    for(const a of q){const ax=a%CW,ay=(a/CW)|0;
     for(let dy=-1;dy<=1&&hit<0;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=ax+dx,ny=ay+dy;if(nx<0||ny<0||nx>=CW||ny>=CH)continue;const b=ny*CW+nx;if(par[b]!==-2)continue;
      if(m[b]===0){if(lab[b]!==c&&sizes[lab[b]]>=MINK){par[b]=a;hit=b;break}continue}
      par[b]=a;nq.push(b)}
     if(hit>=0)break}
    q=nq}
   if(hit>=0){let cur=par[hit];
    while(cur>=0&&par[cur]!==-1){const cx=cur%CW,cy=(cur/CW)|0;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy;if(nx>=0&&ny>=0&&nx<CW&&ny<CH)m[ny*CW+nx]=0}
     cur=par[cur]}
    carved=true;break}}
  if(!carved)break}
 label();const main=bigMain();
 for(let i=0;i<N;i++)if(m[i]===0&&sizes[lab[i]]<MINK)m[i]=1;      /* мелкие озёра — не препятствие, просто суша */
 label();SEA={lab,main:bigMain(),sizes:sizes.slice()};
 return m}
function buildMask(){
 if(mask)return mask;
 const cv=document.createElement('canvas');cv.width=CW;cv.height=CH;
 const x=cv.getContext('2d',{willReadFrequently:true});x.scale(CW/GW,CH/GH);x.fillStyle='#000';
 Object.values(env.GEO.c).forEach(C=>{if(!C||!C.d)return;try{x.fill(new Path2D(C.d),'evenodd')}catch(e){}});
 const d=x.getImageData(0,0,CW,CH).data,m=new Uint8Array(CW*CH);
 for(let i=0;i<m.length;i++)m[i]=d[i*4+3]>110?1:0;
 try{fixSea(m)}catch(e){console.warn('MM fixSea',e)}
 mask=m;return m}
const cellOf=(x,y)=>{const cx=clampN(Math.floor(x/CELL),0,CW-1),cy=clampN(Math.floor(y/CELL),0,CH-1);return cy*CW+cx};
const okCell=(kind,i)=>kind==='air'?true:kind==='land'?mask[i]===1:mask[i]===0;
const cellPt=i=>[(i%CW)*CELL+CELL/2,Math.floor(i/CW)*CELL+CELL/2];
function snap(kind,x,y,maxR,main){
 if(main&&kind==='sea'&&SEA){const r=snapMain(x,y,maxR);if(r>=0)return r}
 const c0=cellOf(x,y);if(okCell(kind,c0))return c0;
 const cx=c0%CW,cy=Math.floor(c0/CW);
 for(let r=1;r<=maxR;r++){let best=-1,bd=1e9;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=CW||ny>=CH)continue;const i=ny*CW+nx;if(okCell(kind,i)){const d=dx*dx+dy*dy;if(d<bd){bd=d;best=i}}}
  if(best>=0)return best}
 return -1}
function snapMain(x,y,maxR){
 const c0=cellOf(x,y),cx=c0%CW,cy=Math.floor(c0/CW),ok=i=>mask[i]===0&&SEA.lab[i]===SEA.main;
 if(ok(c0))return c0;
 for(let r=1;r<=maxR;r++){let best=-1,bd=1e9;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=CW||ny>=CH)continue;const i=ny*CW+nx;if(ok(i)){const d=dx*dx+dy*dy;if(d<bd){bd=d;best=i}}}
  if(best>=0)return best}
 return -1}
function los(kind,a,b){const n=Math.ceil(dist(a,b)/(CELL*.6));for(let k=1;k<n;k++){const t=k/n;if(!okCell(kind,cellOf(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)))return false}return true}

/* ---------- поиск пути A* по сетке ---------- */
function findPath(kind,ax,ay,bx,by,maxSnap){
 if(kind==='air')return[[bx,by]];
 buildMask();
 const s=snap(kind,ax,ay,kind==='sea'?12:6),g=snap(kind,bx,by,maxSnap||16);
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
  if(k==='land'){if(u.fight>MM.t)u.fight=-99;if(!u.path.length&&MM.t-(u.fight||-99)>2)u.idleT=(u.idleT||0)+dt;else u.idleT=0;u.dug=u.idleT>6}
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
 /* визуальные следы: инверсия самолётов, кильватер кораблей, пыль армий, дым повреждённых, стройка укреплений */
 const V=MM.vis,onScr=(x,y)=>!V||(x>V.x-40&&x<V.x+V.w+40&&y>V.y-40&&y<V.y+V.h+40);
 MM.units.forEach(u=>{const S=SPEC[u.sub];if(!onScr(u.x,u.y))return;
  if(u.build){u.hp=Math.min(100,u.hp+3.2*dt);u.bT=(u.bT||0)-dt;if(u.bT<=0&&MM.fx.length<170){u.bT=.35;MM.fx.push({kind:'dust',x:u.x+rnd(-4,4),y:u.y+rnd(-2,3),s:1,t0:MM.t,life:.9})}if(u.hp>=100){u.build=0;addFx(u.x,u.y,'ping',1)}}
  if(S.static&&!u.build&&MM.t-(u.hurt||-99)>6)u.hp=Math.min(100,u.hp+1.1*dt);
  if(u.path.length&&MM.fx.length<160){u.trT=(u.trT||0)-dt;
   if(u.trT<=0){u.trT=S.kind==='air'?.16:S.kind==='sea'?.28:.4;
    const bx=u.x-Math.cos(u.ang)*5,by=u.y-Math.sin(u.ang)*5;
    MM.fx.push({kind:S.kind==='air'?'trail':S.kind==='sea'?'wake':'dust',x:bx,y:by,s:u.sub==='carrier'?1.4:1,t0:MM.t,life:S.kind==='air'?1.3:S.kind==='sea'?1.9:.9})}}
  if(u.hp<45&&u.hp>0&&MM.fx.length<165){u.smT=(u.smT||0)-dt;if(u.smT<=0){u.smT=.55;MM.fx.push({kind:'smoke',x:u.x+rnd(-1,1),y:u.y,s:.55,t0:MM.t,life:1.7});if(u.hp<22)MM.fx.push({kind:'fire',x:u.x+rnd(-2,2),y:u.y+rnd(-1,1),s:1,t0:MM.t,life:.5})}}
 });
 combat(dt);
 capture(dt);
 MM.units=MM.units.filter(u=>{if(u.hp>0)return true;
  const mine=u.own===ME;
  if(u.dead==='fuel')say((mine?'💀 Потеряно: ':'Противник потерял: ')+NAMES[u.sub]+' (без топлива)',mine);
  else say((mine?'💥 Уничтожено: ':'✅ Уничтожено у противника: ')+NAMES[u.sub],mine);
  {const kd=kindOf(u);MM.fx.push({kind:'ghost',sub:u.sub,own:u.own,x:u.x,y:u.y,ang:u.ang||0,dk:kd==='sea'?'sink':kd==='air'?'crash':'wreck',t0:MM.t,life:kd==='sea'?3.4:kd==='air'?1.7:2.2});
   addFx(u.x,u.y,'boom',kd==='air'?.8:1.5);if(kd!=='air')addFx(u.x,u.y,'smoke',1.6)}
  if(MM.sel===u.id)MM.sel=null;if(mine)env&&env.lostUnit&&env.lostUnit(u);return false});
 const addF=[];
 MM.fx=MM.fx.filter(f=>{if(MM.t-f.t0<f.life)return true;
  if(f.kind==='ghost'&&f.dk==='crash'){const a=1,ex=f.x+Math.cos(f.ang)*14,ey=f.y+Math.sin(f.ang)*14+6;addF.push({x:ex,y:ey,kind:'boom',s:1.5,t0:MM.t,life:FXLIFE.boom});addF.push({x:ex,y:ey,kind:'smoke',s:1.6,t0:MM.t,life:FXLIFE.smoke})}
  if(f.kind==='shot'){if(f.tk==='sea')addF.push({x:f.tx,y:f.ty,kind:'splash',s:1,t0:MM.t,life:.9});else if(f.tk==='land'&&f.after==='boom')addF.push({x:f.tx,y:f.ty,kind:'dust',s:1.7,t0:MM.t,life:1.1});addF.push({x:f.tx,y:f.ty,kind:f.after,s:f.as,t0:MM.t,life:FXLIFE[f.after]||.35});if(f.after==='boom'&&f.as>=.5)addF.push({x:f.tx,y:f.ty,kind:'smoke',s:1,t0:MM.t,life:FXLIFE.smoke})}
  return false});
 addF.forEach(f=>{if(MM.fx.length<150)MM.fx.push(f)});
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
const FXLIFE={boom:1.1,smoke:2.2,flash:.14};
function addFx(x,y,kind,s){if(MM.fx.length>140)MM.fx.splice(0,MM.fx.length-120);MM.fx.push({x,y,kind,s:s||1,t0:MM.t,life:FXLIFE[kind]||.35})}
/* выстрелы: для каждого рода войск свой снаряд (трассеры, снаряд, дуга, торпеда, бомба) */
const SHOT={inf:{cd:.32,life:.26,after:'hit',as:1},tank:{cd:1.1,life:.45,after:'boom',as:.5},destroyer:{cd:.9,life:.7,after:'boom',as:.55},fort:{cd:1.2,life:.6,after:'boom',as:.6},aabat:{cd:.4,life:.42,after:'hit',as:.9},frigate:{cd:.8,life:.65,after:'boom',as:.5},carrier:{cd:1.6,life:.6,after:'hit',as:1},submarine:{cd:3.4,life:1.5,after:'boom',as:.8},fighter:{cd:.5,life:.34,after:'hit',as:1},bomber:{cd:1.3,life:.8,after:'boom',as:.7}};
function shoot(a,t){const c=SHOT[a.sub];if(!c||MM.fx.length>110)return;
 if(MM.t-(a.shotT||-9)<c.cd)return;a.shotT=MM.t+rnd(0,.12);
 MM.fx.push({kind:'shot',tk:SPEC[t.sub].kind,sub:a.sub,mine:a.own===ME,x:a.x,y:a.y,tx:t.x+rnd(-1.2,1.2),ty:t.y+rnd(-1.2,1.2),t0:MM.t,life:c.life,after:c.after,as:c.as,seed:Math.random()});
 if(a.sub!=='submarine'&&a.sub!=='bomber')MM.fx.push({kind:'flash',x:a.x,y:a.y,t0:MM.t,life:.14,s:1});
 /* промахи: снаряды кораблей падают в воду рядом с целью */
 if(SPEC[t.sub].kind==='sea'&&(a.sub==='destroyer'||a.sub==='frigate'||a.sub==='carrier'||a.sub==='bomber')&&Math.random()<.45&&MM.fx.length<150)MM.fx.push({kind:'splash',x:t.x+rnd(-7,7),y:t.y+rnd(-7,7),s:.8,t0:MM.t+c.life*.8,life:.9})}
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
   if(best.sub==='fort')dmg*=.55;if(best.sub==='aabat')dmg*=.7;
   if(a.own===ME&&kindOf(a)==='land'&&MM.units.some(q=>q.own===ME&&SPEC[q.sub].kind==='air'&&q.mission==='support'&&dist([q.x,q.y],[a.x,a.y])<14))dmg*=1.18;
   if(SPEC[best.sub].kind==='land'){if(best.dug)dmg*=.85;if(best.fort)dmg*=.88}
   best.hp-=dmg;a.fight=MM.t;best.hurt=MM.t;shoot(a,best);
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
   /* Враг может отбить не только исходно нашу область, но и область, временно занятую нами в этой войне. */
   if(!(ra.mine||ra.occupied)||contested)return;
   if(u.capId!==ra.id){u.capId=ra.id;u.cap=0}
   u.cap+=dd;
   if(u.cap>=14){u.cap=0;u.capId=null;if(env.enemyRaid)env.enemyRaid(ra);MM.bases=MM.bases.filter(b=>b.id!==ra.id);addFx(u.x,u.y,'flag',1);say('⚠️ Противник отбил область: '+ra.name,true)}}
 })}
function addBase(ra){if(MM.bases.some(b=>b.id===ra.id))return;const w=snap('sea',ra.x,ra.y,120,true),p=w>=0?cellPt(w):[ra.x,ra.y];MM.bases.push({id:ra.id,name:ra.name,x:ra.x,y:ra.y,px:p[0],py:p[1],own:ME})}

/* ---------- ИИ противника ---------- */
function aiThink(){
 if(!env||!env.wars)return;
 const wars=env.wars();
 const alive=new Set(wars.map(w=>w.n));
 MM.units=MM.units.filter(u=>u.own===ME||alive.has(u.own));
 MM.bases=MM.bases.filter(b=>!b.own||b.own===ME||alive.has(b.own));
 wars.forEach(w=>{
  const mine=MM.units.filter(u=>u.own===w.n),nat=env.enemyNation&&env.enemyNation(w.n),pw=Math.max(20,Number(nat&&nat.power!=null?nat.power:w.enPow0)||50);
  const cap={land:2+Math.floor(pw/28),sea:1+(pw>55?1:0),air:2+(pw>60?1:0)};
  const cnt=k=>mine.filter(u=>kindOf(u)===k&&!SPEC[u.sub].static).length;
  MM.spawnT=MM.spawnT||{};MM.spawnT[w.n]=(MM.spawnT[w.n]||0)-1.5;
  if(MM.spawnT[w.n]<=0){
   const sp=env.enemySpawn&&env.enemySpawn(w.n);
   if(sp){
    const eb=addEnemyBase(w.n,sp);
    const defi={land:(cap.land-cnt('land'))/cap.land,sea:(cap.sea-cnt('sea'))/cap.sea,air:(cap.air-cnt('air'))/cap.air};
    /* перебираем роды войск по нехватке; если для одного нет места (нет выхода к морю), берём следующий */
    let pick='',sub=null,nm='',spot=null;
    const cands=Object.keys(defi).filter(k=>defi[k]>0).sort((x,y)=>defi[y]-defi[x]||(x==='sea'?-1:1));
    for(const k of cands){
     if(k==='land'){const q=snap('land',sp.x+rnd(-6,6),sp.y+rnd(-6,6),8);if(q>=0)spot=cellPt(q)}
     else if(k==='sea'){const q=snap('sea',sp.x,sp.y,45);if(q>=0)spot=cellPt(q)}
     else spot=[sp.x,sp.y];
     if(spot){pick=k;break}}
    if(pick==='land'){sub=Math.random()<.6?'inf':'tank';nm='Армия противника'}
    else if(pick==='sea'){sub=Math.random()<.4?'submarine':'destroyer';nm='Флот противника'}
    else if(pick==='air'){sub=cnt('air')%2?'bomber':'fighter';nm='Авиация противника'}
    /* расходы: враг платит казной, сталью, топливом, энергией и людьми, как игрок */
    let why='',paid=true;
    if(sub&&nat){why=ePay(nat,sub);if(why)paid=false}
    if(sub&&!paid){MM.shortLog=MM.shortLog||{};if(MM.t-(MM.shortLog[w.n]||-999)>90){MM.shortLog[w.n]=MM.t;say('📉 '+w.n+' не может пополнить '+(pick==='sea'?'флот':pick==='air'?'авиацию':'армию')+': '+why)}}
    else if(sub){
     if(pick==='air')mk(w.n,sub,spot[0],spot[1],{name:nm,base:eb})
     else mk(w.n,sub,spot[0],spot[1],{name:nm,base:null})}
    /* промышленность определяет темп: слабая индустрия — медленнее */
    const ind=nat&&Number(nat.industry)>0?Math.max(.4,Math.min(3,Number(nat.industry))):1;
    MM.spawnT[w.n]=(paid?22:30)/ind}
  }
 });
 const mine=MM.units.filter(u=>u.own===ME);
 wars.forEach(w=>{try{commander(w,mine)}catch(err){console.warn('MM commander',err)}});
}

/* ---------- ИИ-командир: оборона, концентрация сил, засады, отступление и самообучение тактики ---------- */
function addEnemyBase(n,sp){
 const bs=MM.bases.filter(b=>b.own===n);
 let near=null,nd=1e9;bs.forEach(b=>{const d=dist([b.x,b.y],[sp.x,sp.y]);if(d<nd){nd=d;near=b}});
 if(near&&nd<14)return near;
 if(bs.length>=4)return near;
 const w=snap('sea',sp.x,sp.y,60,true),q=w>=0?cellPt(w):[sp.x,sp.y];
 const b={id:'eb:'+n+':'+bs.length,name:'Оборона: '+n,x:sp.x,y:sp.y,px:q[0],py:q[1],own:n};MM.bases.push(b);return b}
const TACT=['defend','attack','raid','turtle'];
const VAL={inf:1,tank:1.6,destroyer:1.8,frigate:1.3,carrier:3,submarine:1.9,fighter:1.5,bomber:1.7,fort:1.3,aabat:.8};
const pwr=u=>(VAL[u.sub]||1)*Math.max(0,u.hp)/100;
const sumP=a=>a.reduce((s,u)=>s+pwr(u),0);
function tBrain(){const st=env.S();if(!st.mmBrain||typeof st.mmBrain!=='object')st.mmBrain={q:{},n:{},steps:0};return st.mmBrain}
function tPrior(c,a){const P=c.split('|'),r=P[0],th=P[1],air=P[2];let v={defend:.4,attack:.35,raid:.3,turtle:.2}[a];
 if(th==='near'){if(a==='defend')v+=.3;if(a==='attack')v-=.15}
 if(r==='strong'){if(a==='attack')v+=.3;if(a==='turtle')v-=.15}
 if(r==='weak'){if(a==='turtle')v+=.25;if(a==='defend')v+=.1;if(a==='attack')v-=.2}
 if(air==='airDown'&&a==='raid')v+=.2;
 return v}
function tPick(c){if(Math.random()<.12)return TACT[Math.floor(Math.random()*TACT.length)];
 const b=tBrain();let best='defend',bv=-9;
 TACT.forEach(a=>{const k=c+'|'+a,n=b.n[k]||0,pr=tPrior(c,a),q=b.q[k]==null?pr:(b.q[k]*n+pr*2)/(n+2);if(q>bv){bv=q;best=a}});
 return best}
function tLearn(c,a,rew){const b=tBrain(),k=c+'|'+a;b.n[k]=(b.n[k]||0)+1;const q=b.q[k]==null?tPrior(c,a):b.q[k];b.q[k]=q+.25*(rew-q);b.steps++;MM.dirty=true}
MM.war=MM.war||{};
function go(u,x,y){
 if(u.aiTgt&&u.path.length&&dist(u.aiTgt,[x,y])<12)return;
 u.aiTgt=[x,y];u.aiT=MM.t;orderMove(u,x,y)}
function commander(w,mine){
 const my=MM.units.filter(u=>u.own===w.n);if(!my.length)return;
 const bases=MM.bases.filter(b=>b.own===w.n);
 const home=bases[0]||{x:my[0].x,y:my[0].y,px:my[0].x,py:my[0].y};
 const st=MM.war[w.n]=MM.war[w.n]||{tact:'defend',t:-99,c:'',hp:null};
 if(st.t>MM.t)st.t=-99;
 const inTerr=p=>{const ra=env.regionAt&&env.regionAt(p.x,p.y);return !!ra&&ra.country===w.n};
 my.forEach(u=>{u.fort=kindOf(u)==='land'&&inTerr(u)});
 const mL=mine.filter(m=>kindOf(m)==='land'),mS=mine.filter(m=>kindOf(m)==='sea'),mA=mine.filter(m=>kindOf(m)==='air');
 const invaders=mL.filter(inTerr).concat(mS.filter(m=>bases.some(b=>dist([m.x,m.y],[b.px,b.py])<40)));
 const near=invaders.length>0||mine.some(m=>kindOf(m)!=='air'&&dist([m.x,m.y],[home.x,home.y])<55);
 const ePow=sumP(my),mPow=sumP(mine)+.1,myFi=mA.filter(m=>m.sub==='fighter').length,eFi=my.filter(u=>u.sub==='fighter').length;
 const ctx=(ePow/mPow>1.4?'strong':ePow/mPow<.7?'weak':'even')+'|'+(near?'near':'far')+'|'+(myFi>eFi?'airDown':'airUp');
 /* раз в 12 с: оценка прошлой тактики по результату боёв и выбор новой */
 if(MM.t-st.t>12){
  const eHP=my.reduce((a,u)=>a+u.hp,0),mHP=mine.reduce((a,u)=>a+u.hp,0);
  if(st.hp){const dE=st.hp[0]-eHP,dM=st.hp[1]-mHP;tLearn(st.c,st.tact,clampN(.5+.5*(dM-dE)/(100*Math.max(2,my.length)),0,1))}
  st.c=ctx;st.tact=tPick(ctx);st.hp=[eHP,mHP];st.t=MM.t}
 const nearest=(u,arr)=>{let b=null;arr.forEach(m=>{const d=dist([u.x,u.y],[m.x,m.y]);if(!b||d<b.d)b={m,d}});return b};
 /* отступление раненых на базу (лечатся у базы) */
 my.forEach(u=>{if(SPEC[u.sub].static)return;if(u.hp<30)u.heal=true;else if(u.hp>=75)u.heal=false;
  if(!u.heal)return;const k=kindOf(u);
  if(k==='air'){if(u.mission!=='rtb')orderRtb(u);return}
  const b=nearestBase(u);if(b&&(u.hp<=30||MM.t-(u.fight||-99)>1))go(u,k==='sea'?b.px:b.x,k==='sea'?b.py:b.y)});
 /* --- строительство обороны: укрепрайоны на угрожаемых направлениях и ПВО у баз (за счёт казны и ресурсов страны) --- */
 const nat=env.enemyNation&&env.enemyNation(w.n),pw0=Math.max(20,Number(nat&&nat.power!=null?nat.power:w.enPow0)||50);
 const forts=my.filter(u=>u.sub==='fort'),aas=my.filter(u=>u.sub==='aabat'),anchors=bases.length?bases:[home];
 if(MM.t-(st.bT||-99)>26){
  st.bT=MM.t;
  const thr=mine.filter(m=>kindOf(m)!=='air'&&(inTerr(m)||anchors.some(b=>dist([m.x,m.y],[b.x,b.y])<135))).sort((p,q)=>dist([p.x,p.y],[home.x,home.y])-dist([q.x,q.y],[home.x,home.y]));
  let want=null,at=null;
  if(mA.length&&aas.length<Math.min(3,1+Math.floor(pw0/60))){
   const bb=anchors.find(b=>!aas.some(a=>dist([a.x,a.y],[b.x,b.y])<32));
   if(bb){want='aabat';at=[bb.x+rnd(-5,5),bb.y+rnd(-5,5)]}}
  if(!want&&forts.length<Math.min(6,2+Math.floor(pw0/45))&&(thr.length||forts.length<1)){
   if(thr.length){const t0=thr[0],an=anchors.slice().sort((p,q)=>dist([p.x,p.y],[t0.x,t0.y])-dist([q.x,q.y],[t0.x,t0.y]))[0];
    const dx=t0.x-an.x,dy=t0.y-an.y,d=Math.hypot(dx,dy)||1,off=Math.min(38,d*.72);at=[an.x+dx/d*off,an.y+dy/d*off]}
   else at=[home.x+rnd(-8,8),home.y+rnd(-8,8)];
   if(!forts.some(f=>dist([f.x,f.y],at)<20))want='fort'}
  if(want&&at){const q=snap('land',at[0],at[1],8);
   if(q>=0){const pt=cellPt(q),why=ePay(nat,want);
    if(!why){mk(w.n,want,pt[0],pt[1],{name:want==='fort'?'Укрепрайон':'Батарея ПВО',build:1,hp:30});addFx(pt[0],pt[1],'ping',1);
     say('🏗 '+w.n+' возводит '+(want==='fort'?'укрепрайон':'батарею ПВО')+(want==='aabat'?' против вашей авиации':thr.length?' на угрожаемом направлении':' у столицы'))}
    else{MM.shortLog=MM.shortLog||{};if(MM.t-(MM.shortLog['d'+w.n]||-999)>120){MM.shortLog['d'+w.n]=MM.t;say('📉 '+w.n+' не может достроить оборону: '+why)}}}}}
 /* --- суша: оборона территории, сбор в кулак, наступление, окапывание --- */
 const L=my.filter(u=>kindOf(u)==='land'&&!u.heal&&!SPEC[u.sub].static);
 if(L.length){
  const c=[L.reduce((a,u)=>a+u.x,0)/L.length,L.reduce((a,u)=>a+u.y,0)/L.length];
  const defending=invaders.some(i=>kindOf(i)==='land');
  let tgt=null;
  if(defending)tgt=invaders.filter(i=>kindOf(i)==='land').sort((p,q)=>dist([p.x,p.y],[home.x,home.y])-dist([q.x,q.y],[home.x,home.y]))[0];
  else if(invaders.some(i=>kindOf(i)==='land')){tgt=invaders.filter(i=>kindOf(i)==='land').sort((p,q)=>dist([p.x,p.y],[home.x,home.y])-dist([q.x,q.y],[home.x,home.y]))[0]}
  else if(st.tact==='attack'){tgt=nearest({x:c[0],y:c[1]},mL);tgt=tgt?tgt.m:null;
   if(!tgt){const mb=MM.bases.filter(b=>b.own===ME).sort((p,q)=>dist(c,[p.x,p.y])-dist(c,[q.x,q.y]))[0];if(mb)tgt={x:mb.x,y:mb.y}}}
  const order=L.slice().sort((p,q)=>tgt?dist([p.x,p.y],[tgt.x,tgt.y])-dist([q.x,q.y],[tgt.x,tgt.y]):0);
  const send=defending?Math.max(2,Math.ceil(order.length*.75)):(order.length>=3?Math.ceil(order.length*.75):order.length);   /* при наступлении четверть армии остаётся в резерве */
  /* глубокая оборона: если вторжение сильнее — отходим под защиту укрепрайона и бьём оттуда */
  let fallback=null;
  if(defending&&tgt){const loc=sumP(mine.filter(m=>dist([m.x,m.y],[tgt.x,tgt.y])<40)),ours=sumP(L.filter(q=>dist([q.x,q.y],[tgt.x,tgt.y])<70)),
    fo=forts.filter(f=>f.hp>35).sort((p,q)=>dist([p.x,p.y],[tgt.x,tgt.y])-dist([q.x,q.y],[tgt.x,tgt.y]))[0],ral=fo||home;
   if(loc>ours*1.35&&dist([tgt.x,tgt.y],[ral.x,ral.y])>(fo?SPEC.fort.rg-3:18)){fallback=ral;
    if(MM.t-(st.fbT||-99)>45){st.fbT=MM.t;say('🛡 '+w.n+' отводит армию к '+(fo?'укрепрайону':'базе')+' и ждёт вторжение под огнём')}}}
  order.forEach((u,i)=>{
   if(MM.t-(u.fight||-99)<1.5&&!(fallback&&u.hp<45))return;                       /* в бою — стоим и бьём */
   if(fallback){go(u,fallback.x+rnd(-5,5),fallback.y+rnd(-5,5));return}
   if(tgt&&i<send){
    const dT=dist([u.x,u.y],[tgt.x,tgt.y]);
    if(!defending){
     const loc=sumP(mine.filter(m=>dist([m.x,m.y],[tgt.x,tgt.y])<30)),ours=sumP(L.filter(q=>dist([q.x,q.y],[tgt.x,tgt.y])<60));
     if(loc>ours*2.2&&dT<55)return;                         /* не лезем на превосходящие силы — окапываемся */
     if(L.length>1&&dT>40&&dist([u.x,u.y],c)>40){go(u,c[0],c[1]);return}   /* сначала собираем армию */
    }
    go(u,tgt.x,tgt.y);return}
   const b=nearestBase(u);if(!tgt&&b&&dist([u.x,u.y],[b.x,b.y])>90)go(u,b.x+rnd(-6,6),b.y+rnd(-6,6))   /* иначе держим позицию и окапываемся */
  })}
 /* --- флот: оборона побережья, засады подлодок, не лезет на превосходящих --- */
 const SEA=my.filter(u=>kindOf(u)==='sea'&&!u.heal);
 SEA.forEach(u=>{
  if(MM.t-(u.fight||-99)<1.2)return;
  const b=nearestBase(u),pp=b?[b.px,b.py]:[home.px,home.py],tg=nearest(u,mS);
  if(u.sub==='submarine'){if(tg&&tg.d<45&&st.tact!=='turtle')go(u,tg.m.x,tg.m.y);return}
  if(st.tact==='turtle'){if(dist([u.x,u.y],pp)>25)go(u,pp[0],pp[1]);return}
  const threat=tg&&bases.some(q=>dist([tg.m.x,tg.m.y],[q.px,q.py])<75);
  if(tg&&(threat||(st.tact==='attack'&&tg.d<120)||(st.tact==='raid'&&tg.d<150))){
   const lp=sumP(mS.filter(m=>dist([m.x,m.y],[tg.m.x,tg.m.y])<35)),mp=sumP(SEA.filter(s=>dist([s.x,s.y],[tg.m.x,tg.m.y])<60));
   if(threat||mp*2.2>=lp)go(u,tg.m.x,tg.m.y);else if(dist([u.x,u.y],pp)>25)go(u,pp[0],pp[1]);
   return}
  if(dist([u.x,u.y],pp)>30)go(u,pp[0]+rnd(-10,10),pp[1]+rnd(-6,6))   /* патруль у порта */
 });
 /* --- авиация: перехват, прикрытие, бомбёжка уязвимых целей без прикрытия истребителей --- */
 my.filter(u=>kindOf(u)==='air'&&!u.heal).forEach(u=>{
  const b=u.base||nearestBase(u);if(!b||u.mission==='rtb')return;
  if(!(u.mission==='idle'||(u.mission==='patrol'&&!u.path.length)))return;
  const S=SPEC[u.sub],R=S.range*.42;if(u.fuel<S.range*.7)return;
  if(u.sub==='fighter'){
   const ta=mA.filter(m=>dist([b.x,b.y],[m.x,m.y])<R).sort((p,q)=>dist([b.x,b.y],[p.x,p.y])-dist([b.x,b.y],[q.x,q.y]))[0];
   if(ta&&(myFi<=eFi*2.5||near)){u.path=[[ta.x,ta.y]];u.mission='move';return}              /* перехват */
   if((st.tact==='attack'||st.tact==='raid')&&L.length){const cx=L.reduce((a,q)=>a+q.x,0)/L.length,cy=L.reduce((a,q)=>a+q.y,0)/L.length;
    if(dist([b.x,b.y],[cx,cy])<R&&MM.t-(u.aiT||-99)>10){u.aiT=MM.t;u.path=[[cx,cy]];u.mission='move'}}   /* прикрытие армии */
   return}
  if(st.tact==='turtle'||MM.t-(u.aiT||-99)<8)return;
  const cand=mine.filter(m=>kindOf(m)!=='air'&&dist([b.x,b.y],[m.x,m.y])<R).map(m=>{
   const danger=mA.filter(f=>f.sub==='fighter'&&dist([f.x,f.y],[m.x,m.y])<45).length,inside=inTerr(m)?2:0;
   return{m,score:(VAL[m.sub]||1)+inside-danger*1.5}}).sort((p,q)=>q.score-p.score)[0];
  if(!cand||cand.score<.6)return;
  if(st.tact==='defend'&&!inTerr(cand.m))return;
  u.aiT=MM.t;u.path=[[cand.m.x,cand.m.y]];u.mission='bomb';u.tgt=[cand.m.x,cand.m.y]
 });
}

/* ---------- старт и состав игрока ---------- */
function seedPlayer(){
 const home=MM.bases[0];if(!home)return;
 const pl=(sub,i,name)=>{const kind=SPEC[sub].kind;let x=home.x,y=home.y;
  if(kind==='sea'){x=home.px;y=home.py;const q=snap('sea',x+i*4,y+i*3,120,true);if(q<0)return null;const c=cellPt(q);x=c[0];y=c[1]}
  else if(kind==='land'){const q=snap('land',x+rnd(-9,9),y+rnd(-9,9),8);if(q>=0){const c=cellPt(q);x=c[0];y=c[1]}}
  else{x=home.x+i*2.2;y=home.y+(i%2?1.6:-1.6)}
  return mk(ME,sub,x,y,{name,base:kind==='air'?home:null})};
 pl('inf',0,'1-я армия');pl('inf',1,'2-я армия');pl('tank',2,'1-я танковая армия');
 pl('destroyer',0,'Эсминец Флота');pl('frigate',1,'Фрегат Флота');
 pl('fighter',0,'Истребители 1');pl('fighter',1,'Истребители 2');pl('bomber',2,'Бомбардировщики 1')}
function ensureFleet(){
 const st=env.S();if(!st.milmap)st.milmap={};
 if(st.milmap.fleetGiven)return;
 if(MM.units.some(u=>u.own===ME&&SPEC[u.sub].kind==='sea'))return;
 const home=MM.bases[0];if(!home)return;
 const fleet=[['destroyer','Эсминец Флота',0],['frigate','Фрегат Флота',1]].map(([sub,name,i])=>{const q=snap('sea',home.px+i*4,home.py+i*3,120,true);if(q<0)return null;const c=cellPt(q);return mk(ME,sub,c[0],c[1],{name})}).filter(Boolean);
 if(!fleet.length)return;st.milmap.fleetGiven=true;
 MM.dirty=true;say('⚓ Выдан стартовый флот: эсминец и фрегат',true)}
function deploy(sub){
 const S=SPEC[sub],c=S.cost;if(!c||!env)return;const st=env.S();
 if(c.money&&st.money<c.money)return say('Не хватает денег: нужно '+c.money,true);
 if(c.army&&st.army-c.army<5000)return say('Не хватает личного состава',true);
 const home=MM.bases[0];if(!home)return;
 const kind=S.kind,n=MM.units.filter(u=>u.own===ME&&u.sub===sub).length+1;
 let x=home.x,y=home.y;
 if(kind==='sea'){const q=snap('sea',home.px,home.py,120,true);if(q<0)return say('⚓ Нет доступной морской клетки для размещения флота',true);const c0=cellPt(q);x=c0[0];y=c0[1]}
 else if(kind==='land'){const q=snap('land',x+rnd(-4,4),y+rnd(-4,4),6);if(q<0)return say('Нет доступной суши для размещения',true);const p=cellPt(q);x=p[0];y=p[1]}
 if(c.money)st.money-=c.money;if(c.army)st.army-=c.army;
 const u=mk(ME,sub,x,y,{name:S.name+' '+n,base:kind==='air'?home:null});
 MM.sel=u.id;MM.dirty=true;env.save();say('➕ Сформировано: '+u.name,true)}
function deployProduced(uid){
 const st=env.S(),pu=(st.militaryUnits||[]).find(x=>x.id===uid);if(!pu||pu.onMap)return;
 const sub=SPEC[pu.type]?pu.type:null;if(!sub)return;
 const home=MM.bases[0];if(!home)return;const S=SPEC[sub],kind=S.kind;
 let x=home.x,y=home.y;if(kind==='sea'){const q=snap('sea',home.px,home.py,120,true);if(q<0)return say('⚓ Нет доступной морской клетки для размещения флота',true);const c0=cellPt(q);x=c0[0];y=c0[1]}
 const u=mk(ME,sub,x,y,{name:pu.name,base:kind==='air'?home:null,pid:uid});pu.onMap=u.id;MM.sel=u.id;MM.dirty=true;env.save();say('🚀 На карте: '+pu.name,true)}

/* ---------- тап по карте ---------- */
function toMap(e){const svg=MM.svg;if(!svg||!svg.getScreenCTM)return null;const m=svg.getScreenCTM();if(!m)return null;const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(m.inverse());return{x:q.x,y:q.y}}
function unitsPerPx(){const svg=MM.svg,r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;return vb&&r.width?vb.width/r.width:1}
function hit(p,own){const up=unitsPerPx();let best=null,bd=1e9;
 MM.units.forEach(u=>{if((own===ME)!==(u.own===ME)||u.hid)return;const d=dist([p.x,p.y],[u.x,u.y]),r=(SPEC[u.sub].px*.62)*(MM.zf||1)*up*1.25;if(d<r&&d<bd){bd=d;best=u}});return best}
function handleTap(e){
 if(!MM.ready||!MM.svg)return false;
 const p=toMap(e);if(!p)return false;
 if(MM.mode==='placeAA'){const q=snap('land',p.x,p.y,8);if(q<0){say('🛡️ ПВО можно размещать только на суше',true);return true}const st=env.S();if((st.money||0)<500){say('Не хватает 500 млн для батареи ПВО',true);return true}const c=cellPt(q);st.money-=500;const aa=mk(ME,'aabat',c[0],c[1],{name:'Батарея ПВО'});MM.sel=aa.id;MM.mode='move';MM.dirty=true;env.save();say('🛡️ Батарея ПВО размещена. Выберите её и задайте новую позицию при необходимости.',true);paintHud(true);return true}
 const own=hit(p,ME);
 if(own){const grp=(MM.clusters&&MM.clusters[own.id])||[own];
  if(grp.length>1){const mine=grp.filter(x=>x.own===ME),i=mine.findIndex(x=>x.id===MM.sel),nx=mine[(i+1)%mine.length];MM.sel=nx.id;say('Группа: '+grp.length+' частей рядом — выбрано: '+nx.name+'. Приблизьте карту или нажмите ещё раз для следующей.');MM.mode='move';MM.dirty=true;paintHud(true);return true}
  MM.sel=MM.sel===own.id?null:own.id;MM.mode='move';MM.dirty=true;paintHud(true);return true}
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
  case'fort':return `<rect x="-11" y="-8" width="22" height="16" rx="3" fill="${c}" ${st}/><path d="M-7 4a7 7 0 0 1 14 0z" fill="#fff"/><rect x="3" y="-3.2" width="11" height="2.6" rx="1" fill="#fff"/><path d="M-9 -5.5h18" stroke="#fff" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/>`;
  case'aabat':return `<circle r="10" fill="${c}" ${st}/><path d="M-4 4L-8 -8M0 4L0 -10M4 4L8 -8" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle r="2.4" cy="4" fill="#fff"/>`;
  case'destroyer':case'frigate':return `<path d="M-12 -3.2L6 -3.2L12.5 0L6 3.2L-12 3.2Z" fill="${c}" ${st}/><rect x="-3" y="-1.8" width="5" height="3.6" rx=".8" fill="#fff"/><circle cx="-8" cy="0" r="1.9" fill="#fff"/><circle cx="6" cy="0" r="1.6" fill="#fff"/><path d="M-12 0h-5" stroke="#fff" stroke-width="1" opacity=".5"/>`;
  case'carrier':return `<path d="M-13 -5L9 -5L13 -2.4V2.4L9 5L-13 5Z" fill="${c}" ${st}/><path d="M-11 0h20" stroke="#fff" stroke-width="1" stroke-dasharray="3 2.4"/><rect x="1" y="-5.4" width="5" height="3.2" fill="#fff"/><path d="M-9 -2.6l3 2.6-3 2.6" fill="none" stroke="#fff" stroke-width=".9"/>`;
  case'submarine':return `<ellipse cx="0" cy="0" rx="12" ry="3.1" fill="${c}" ${st}/><rect x="-2" y="-4.6" width="5" height="3.6" rx="1" fill="#fff"/><path d="M-12 0l-3 -2.4v4.8z" fill="${c}" ${st}/>`;
  case'fighter':return `<path d="${sym([[11,0],[3,-2],[-1,-10],[-4,-10],[-3.5,-2],[-8,-1.6],[-10.5,-5],[-12.5,-5],[-11.5,0]])}" fill="${c}" ${st}/><ellipse cx="2" cy="0" rx="3.6" ry="1.5" fill="#fff"/>`;
  case'bomber':return `<path d="${sym([[12,0],[5,-1.8],[3.6,-12.5],[0,-12.5],[-1,-2],[-8,-1.8],[-10,-6],[-12.5,-6],[-12.5,0]])}" fill="${c}" ${st}/><circle cx="2" cy="-6.5" r="1.5" fill="#fff"/><circle cx="2" cy="6.5" r="1.5" fill="#fff"/><ellipse cx="5.5" cy="0" rx="4" ry="1.5" fill="#fff"/>`;
 }return''}
const NS='http://www.w3.org/2000/svg';
let L={g:null,paths:null,els:{},fx:null,rng:null,bases:null,pvo:null,pvosig:''};
function ensureLayer(svg){
 if(L.g&&L.g.isConnected&&L.g.parentNode===svg){if(svg.lastChild!==L.g&&MM.t-(L.last||0)>2){L.last=MM.t;svg.appendChild(L.g)}return}
 const g=document.createElementNS(NS,'g');g.id='milmap';g.setAttribute('pointer-events','none');
 g.innerHTML='<g id="mm-pvo"></g><g id="mm-bases"></g><g id="mm-range"></g><g id="mm-paths"></g><g id="mm-units"></g><g id="mm-fx"></g>';
 svg.appendChild(g);L={g,units:g.querySelector('#mm-units'),paths:g.querySelector('#mm-paths'),fx:g.querySelector('#mm-fx'),rng:g.querySelector('#mm-range'),bases:g.querySelector('#mm-bases'),pvo:g.querySelector('#mm-pvo'),pvosig:'',els:{}}}
function shotSvg(f,a,z){
 const lp=p=>[f.x+(f.tx-f.x)*p,f.y+(f.ty-f.y)*p],dx=f.tx-f.x,dy=f.ty-f.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,n2=v=>v.toFixed(2);
 const col=f.mine?'#ffe27a':'#ff9a8a',ln=(p0,p1,w,c,o,extra)=>{const A=lp(p0),B=lp(p1);return `<line x1="${n2(A[0])}" y1="${n2(A[1])}" x2="${n2(B[0])}" y2="${n2(B[1])}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}" vector-effect="non-scaling-stroke" ${extra||''}/>`};
 const dot=(P,r,c)=>`<circle cx="${n2(P[0])}" cy="${n2(P[1])}" r="${n2(r)}" fill="${c}"/>`;
 switch(f.sub){
  case'inf':case'fighter':case'aabat':{let o='';const k=f.sub==='inf'?2:f.sub==='aabat'?4:3;
   for(let i=0;i<k;i++){const off=(i-(k-1)/2)*z*1.5,p1=clampN(a+i*.09,0,1),p0=clampN(p1-.32,0,1);const A=lp(p0),B=lp(p1);
    o+=`<line x1="${n2(A[0]+nx*off)}" y1="${n2(A[1]+ny*off)}" x2="${n2(B[0]+nx*off)}" y2="${n2(B[1]+ny*off)}" stroke="${col}" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`}
   return o}
  case'tank':{const H=lp(a);return ln(clampN(a-.3,0,1),a,1.8,'#ffd9a0',.8)+dot(H,z*1.8,'#fff3b0')}
  case'destroyer':case'frigate':case'carrier':case'fort':{
   const pt=p=>{const h=Math.sin(Math.PI*p)*len*.12,q=lp(p);return[q[0]+nx*h,q[1]+ny*h]};
   const P=[a-.18,a-.12,a-.06,a].map(p=>pt(clampN(p,0,1)));
   return `<polyline points="${P.map(q=>n2(q[0])+','+n2(q[1])).join(' ')}" fill="none" stroke="#ffd27a" stroke-width="1.6" stroke-dasharray="2 2" opacity=".85" vector-effect="non-scaling-stroke"/>`+dot(P[3],z*2,'#fff3b0')}
  case'submarine':return ln(0,a,1.6,'#cfe8ff',.65,'stroke-dasharray="2 2"')+dot(lp(a),z*1.8,'#9fd0ff');
  case'bomber':{const T=[f.tx,f.ty],r=z*(7*(1-a)+1.6);return `<circle cx="${n2(T[0])}" cy="${n2(T[1])}" r="${n2(r*1.6)}" fill="none" stroke="#fff" stroke-width="1" opacity="${n2(.5*a)}" vector-effect="non-scaling-stroke"/>`+dot(T,r,'#1c1f26')}
 }return''}
function paint(){
 const svg=MM.svg;if(!svg||!svg.isConnected)return;ensureLayer(svg);
 const r=svg.getBoundingClientRect();if(!r.width)return;const vb=svg.viewBox.baseVal,up=vb.width/r.width,zoom=Math.max(1,GW/vb.width),zoomAlpha=clampN((zoom-1.04)/.58,0,1);MM.vis={x:vb.x,y:vb.y,w:vb.width,h:vb.height};
 /* Статические маркеры ПВО стран мира: один–три на страну, не участвуют в физике подразделений. */
 const pvos=MM.pvoMarkers||[];const pSig=pvos.length+'|'+(MM.pvoSig||'')+'|'+up.toFixed(2);if(L.pvosig!==pSig){L.pvosig=pSig;const k=up*9/10;L.pvo.innerHTML=pvos.map(p=>`<g transform="translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${k.toFixed(4)})" opacity="${(.92*zoomAlpha).toFixed(2)}" pointer-events="none"><path d="M0 -8L7 -5V1Q6 6 0 9Q-6 6-7 1V-5Z" fill="#172d3d" stroke="#b8e1ff" stroke-width="1.4"/><path d="M-3 0H3M0 -3V3" stroke="#b8e1ff" stroke-width="1.5"/><title>ПВО: ${String(p.name||'').replace(/[&<>"]/g,'')}</title></g>`).join('')}
 /* базы */
 const sig=MM.bases.map(b=>b.id).join(',')+'|'+up.toFixed(3)+'|'+zoomAlpha.toFixed(2);
 if(L.bsig!==sig){L.bsig=sig;const k=up*13/10;L.bases.innerHTML=MM.bases.map(b=>{const c=(b.own&&b.own!==ME)?'#ff8a8a':'#f5d889';return `<g transform="translate(${b.x} ${b.y}) scale(${k})" opacity="${zoomAlpha.toFixed(2)}"><path d="M0 -9L8 6H-8Z" fill="#12233a" stroke="${c}" stroke-width="1.4"/><path d="M0 -3v6M-3 1h6" stroke="${c}" stroke-width="1.2"/></g>`}).join('')}
 /* юниты */
 const seen={};
 /* масштаб значков зависит от зума: на общем виде мелкие, при приближении крупнее */
 const zf=clampN(.30+.22*Math.log2(zoom),.30,1.0);MM.zf=zf;
 /* группировка: части, слипающиеся на экране, сворачиваются в один значок со счётчиком */
 const all=MM.units.concat(MM.remoteUnits||[]),lead={},cl={};
 const thr=26*zf;
 const order=all.slice().sort((a,b)=>(b.id===MM.sel)-(a.id===MM.sel)||(a.own===ME?0:1)-(b.own===ME?0:1));
 const leaders=[];
 order.forEach(u=>{const ux=u.x/up,uy=u.y/up;let g=null;
  for(const l of leaders){if((l.own===ME)===(u.own===ME)&&Math.hypot(l.x/up-ux,l.y/up-uy)<thr){g=l;break}}
  if(g){lead[u.id]=g.id;cl[g.id].push(u)}else{leaders.push(u);lead[u.id]=u.id;cl[u.id]=[u]}});
 MM.clusters=cl;MM.leadOf=lead;
 all.forEach(u=>{seen[u.id]=1;const S=SPEC[u.sub];let e=L.els[u.id];
  if(!e){const g=document.createElementNS(NS,'g');g.innerHTML=`<circle class="mm-ring" r="0" fill="none" stroke="#ffd76a" stroke-width="2"/><g class="mm-spr">${sprite(u.sub,u.own)}</g><g class="mm-bar"><rect x="-11" y="0" width="22" height="3.2" rx="1.2" fill="#000a"/><rect class="mm-hp" x="-11" y="0" width="22" height="3.2" rx="1.2" fill="#4ad66d"/></g><circle class="mm-cap" r="0" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="0 100"/><g class="mm-cnt" display="none"><circle cx="11" cy="-10" r="6.5" fill="#f5d889" stroke="#12233a" stroke-width="1"/><text class="mm-cn" x="11" y="-7" text-anchor="middle" font-size="9" font-weight="700" fill="#12233a"></text></g>`;L.units.appendChild(g);e=L.els[u.id]={g,spr:g.querySelector('.mm-spr'),hp:g.querySelector('.mm-hp'),bar:g.querySelector('.mm-bar'),ring:g.querySelector('.mm-ring'),cap:g.querySelector('.mm-cap'),cnt:g.querySelector('.mm-cnt'),cn:g.querySelector('.mm-cn')}}
  const isLead=lead[u.id]===u.id,grp=cl[lead[u.id]]||[u];
  const showAtZoom=zoomAlpha>.035||MM.sel===u.id;
  e.g.setAttribute('display',isLead&&showAtZoom?'':'none');u.hid=!(isLead&&showAtZoom);
  if(isLead&&grp.length>1){e.cnt.setAttribute('display','');e.cn.textContent=grp.length}else e.cnt.setAttribute('display','none');
  if(!isLead)return;
  const k=up*S.px/24*zf;
  const fighting=MM.t-(u.fight||-99)<.25&&S.kind!=='air',airFight=S.kind==='air'&&MM.t-(u.fight||-99)<.6,jx=fighting?Math.sin(MM.t*55+u.x)*.55*up:airFight?Math.sin(MM.t*9+u.y)*1.1*up:0,jy=fighting?Math.cos(MM.t*47+u.y)*.55*up:airFight?Math.cos(MM.t*8+u.x)*1.1*up:0;
  e.g.setAttribute('transform',`translate(${(u.x+jx).toFixed(2)} ${(u.y+jy).toFixed(2)}) scale(${k.toFixed(4)})`);
  e.spr.setAttribute('opacity',MM.t-(u.hurt||-99)<.12?'.5':'1');
  const kind=S.kind;
  if(kind==='land'){e.spr.setAttribute('transform','')}
  else{const deg=u.ang*180/Math.PI;e.spr.setAttribute('transform',`rotate(${deg.toFixed(1)})`+(airFight?` scale(1 ${Math.cos(MM.t*12+u.x).toFixed(2)})`:''))}
  e.bar.setAttribute('transform',`translate(0 ${kind==='land'?12:kind==='sea'?9:10})`);
  e.hp.setAttribute('width',(22*clampN(u.hp,0,100)/100).toFixed(1));e.hp.setAttribute('fill',u.hp>60?'#4ad66d':u.hp>30?'#f0c040':'#e0443e');
  const sel=MM.sel===u.id;e.ring.setAttribute('r',sel?(S.px*.62*zf).toFixed(1):'0');
  if(u.cap>0&&u.capId){e.cap.setAttribute('r','17');e.cap.setAttribute('stroke-dasharray',(Math.min(1,u.cap/7)*106.8).toFixed(1)+' 200')}else e.cap.setAttribute('r','0')});
 Object.keys(L.els).forEach(id=>{if(!seen[id]){L.els[id].g.remove();delete L.els[id]}});
 /* маршрут и радиус выбранного */
 const u=byId(MM.sel);let pd='',rg='';
 if(u&&u.own===ME){
  if(u.path.length)pd=`<path d="M${u.x} ${u.y}${u.path.map(p=>'L'+p[0]+' '+p[1]).join('')}" fill="none" stroke="#ffd76a" stroke-width="1.6" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" opacity=".9"/><circle cx="${u.path[u.path.length-1][0]}" cy="${u.path[u.path.length-1][1]}" r="${(up*5).toFixed(2)}" fill="#ffd76a" opacity=".85"/>`;
  if(kindOf(u)==='air'){const b=u.base||nearestBase(u);if(b)rg=`<circle cx="${b.x}" cy="${b.y}" r="${SPEC[u.sub].range/2}" fill="#ffd76a10" stroke="#ffd76a" stroke-width="1" stroke-dasharray="2 4" vector-effect="non-scaling-stroke"/>`}}
 L.paths.innerHTML=pd;L.rng.innerHTML=rg;
 /* эффекты */
 const z=up*zf,m30=30*up,inV=(x,y)=>x>vb.x-m30&&x<vb.x+vb.width+m30&&y>vb.y-m30&&y<vb.y+vb.height+m30;
 L.fx.innerHTML=MM.fx.map(f=>{const a=(MM.t-f.t0)/f.life;
  if(f.kind==='shot'){if(!inV(f.x,f.y)&&!inV(f.tx,f.ty))return'';return shotSvg(f,clampN(a,0,1),z)}
  if(a<0)return'';
  if(!inV(f.x,f.y))return'';
  if(f.kind==='trail')return `<circle cx="${f.x.toFixed(2)}" cy="${f.y.toFixed(2)}" r="${(z*(1.1+a*2.4)).toFixed(2)}" fill="#fff" opacity="${(.5*(1-a)).toFixed(2)}"/>`;
  if(f.kind==='wake'){const rr=z*(1.6+a*4.2)*f.s;return `<circle cx="${f.x.toFixed(2)}" cy="${f.y.toFixed(2)}" r="${rr.toFixed(2)}" fill="none" stroke="#dff1ff" stroke-width="1.3" opacity="${(.55*(1-a)).toFixed(2)}" vector-effect="non-scaling-stroke"/><circle cx="${f.x.toFixed(2)}" cy="${f.y.toFixed(2)}" r="${(z*1.3*f.s).toFixed(2)}" fill="#e8f6ff" opacity="${(.35*(1-a)).toFixed(2)}"/>`}
  if(f.kind==='dust')return `<circle cx="${f.x.toFixed(2)}" cy="${(f.y-a*z*3).toFixed(2)}" r="${(z*(1.4+a*3.6)*f.s).toFixed(2)}" fill="#b89d72" opacity="${(.42*(1-a)).toFixed(2)}"/>`;
  if(f.kind==='splash'){let o=`<circle cx="${f.x.toFixed(2)}" cy="${f.y.toFixed(2)}" r="${(z*(2+a*9)*f.s).toFixed(2)}" fill="none" stroke="#e9f7ff" stroke-width="1.6" opacity="${(.9*(1-a)).toFixed(2)}" vector-effect="non-scaling-stroke"/>`;
   for(let i=0;i<5;i++){const an=i*1.26+1,h=Math.sin(Math.PI*Math.min(1,a*1.3)),rr=z*(2+a*7)*f.s;o+=`<circle cx="${(f.x+Math.cos(an)*rr*.7).toFixed(2)}" cy="${(f.y+Math.sin(an)*rr*.7-h*z*6*f.s).toFixed(2)}" r="${(z*.9).toFixed(2)}" fill="#fff" opacity="${(1-a).toFixed(2)}"/>`}
   return o}
  if(f.kind==='fire'){const fl=.7+.3*Math.sin(MM.t*30+f.x);return `<circle cx="${f.x.toFixed(2)}" cy="${(f.y-a*z*4).toFixed(2)}" r="${(z*(2.2-a)*fl).toFixed(2)}" fill="#ff7a1a" opacity="${(.85*(1-a)).toFixed(2)}"/><circle cx="${f.x.toFixed(2)}" cy="${(f.y-a*z*4).toFixed(2)}" r="${(z*1.1*fl).toFixed(2)}" fill="#ffe27a" opacity="${(1-a).toFixed(2)}"/>`}
  if(f.kind==='ghost'){const S=SPEC[f.sub],k=up*S.px/24*zf,sp=sprite(f.sub,f.own),X=f.x,Y=f.y;
   if(f.dk==='sink'){const deg=f.ang*180/Math.PI+a*32,op=Math.max(0,1-a*a),sc=k*(1-.3*a);
    return `<circle cx="${X}" cy="${Y}" r="${(z*(5+a*12)).toFixed(2)}" fill="#071018" opacity="${(.5*Math.min(1,a*3)*(1-a*.4)).toFixed(2)}"/><g transform="translate(${X.toFixed(2)} ${Y.toFixed(2)}) scale(${sc.toFixed(4)})"><g transform="rotate(${deg.toFixed(1)})" opacity="${op.toFixed(2)}">${sp}</g></g>`+(a<.55?`<circle cx="${(X+Math.sin(MM.t*20)*z).toFixed(2)}" cy="${(Y-a*z*6).toFixed(2)}" r="${(z*2.4*(1-a)).toFixed(2)}" fill="#ff8a1f" opacity=".8"/>`:'')+`<circle cx="${(X+z*3).toFixed(2)}" cy="${(Y-z*4*a).toFixed(2)}" r="${(z*1.2).toFixed(2)}" fill="#fff" opacity="${(.5*(1-a)).toFixed(2)}"/>`}
   if(f.dk==='crash'){const px=X+Math.cos(f.ang)*a*14,py=Y+Math.sin(f.ang)*a*14+a*a*6,deg=f.ang*180/Math.PI+a*640,sc=k*(1-.55*a);let tr='';
    for(let i=1;i<=5;i++){const b=Math.max(0,a-i*.06);tr+=`<circle cx="${(X+Math.cos(f.ang)*b*14).toFixed(2)}" cy="${(Y+Math.sin(f.ang)*b*14+b*b*6).toFixed(2)}" r="${(z*(1.6+i*.5)).toFixed(2)}" fill="${i<3?'#ff9a2e':'#2b2f36'}" opacity="${(.7-i*.1).toFixed(2)}"/>`}
    return tr+`<g transform="translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${sc.toFixed(4)})"><g transform="rotate(${deg.toFixed(1)})">${sp}</g></g>`}
   return `<g transform="translate(${X.toFixed(2)} ${Y.toFixed(2)}) scale(${k.toFixed(4)})" opacity="${(.55*(1-a)).toFixed(2)}" style="filter:grayscale(1) brightness(.6)">${sp}</g><circle cx="${X.toFixed(2)}" cy="${(Y-a*z*5).toFixed(2)}" r="${(z*(2+a*3)).toFixed(2)}" fill="#2b2f36" opacity="${(.5*(1-a)).toFixed(2)}"/>`}
  if(f.kind==='flash')return `<circle cx="${f.x}" cy="${f.y}" r="${(z*(2.5+a*4)).toFixed(2)}" fill="#fff3b0" opacity="${(1-a).toFixed(2)}"/>`;
  if(f.kind==='smoke'){const cy=f.y-a*z*11*f.s,r=z*(3+a*8)*f.s;return `<circle cx="${f.x}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="#2b2f36" opacity="${(.5*(1-a)).toFixed(2)}"/><circle cx="${(f.x+z*2).toFixed(2)}" cy="${(cy-z*3).toFixed(2)}" r="${(r*.7).toFixed(2)}" fill="#454b55" opacity="${(.4*(1-a)).toFixed(2)}"/>`}
  const s=up*((f.kind==='boom'||f.kind==='hit')?zf:1)*(f.kind==='boom'?18:f.kind==='hit'?8:f.kind==='ping'?16:14)*f.s;
  if(f.kind==='boom')return `<circle cx="${f.x}" cy="${f.y}" r="${(s*(.6+a*1.8)).toFixed(2)}" fill="none" stroke="#fff" stroke-width="1.4" opacity="${(.6*(1-a)).toFixed(2)}" vector-effect="non-scaling-stroke"/><circle cx="${f.x}" cy="${f.y}" r="${(s*(.3+a)).toFixed(2)}" fill="#ff9d2e" opacity="${(.85*(1-a)).toFixed(2)}"/><circle cx="${f.x}" cy="${f.y}" r="${(s*(.15+a*.5)).toFixed(2)}" fill="#fff3b0" opacity="${(1-a).toFixed(2)}"/>`;
  if(f.kind==='ping')return `<circle cx="${f.x}" cy="${f.y}" r="${(s*(.2+a)).toFixed(2)}" fill="none" stroke="#ffd76a" stroke-width="1.6" opacity="${(1-a).toFixed(2)}" vector-effect="non-scaling-stroke"/>`;
  if(f.kind==='flag')return `<circle cx="${f.x}" cy="${f.y}" r="${(s*(.3+a)).toFixed(2)}" fill="none" stroke="#fff" stroke-width="2" opacity="${(1-a).toFixed(2)}" vector-effect="non-scaling-stroke"/>`;
  return `<circle cx="${f.x}" cy="${f.y}" r="${(s*(.3+a*.6)).toFixed(2)}" fill="#ffe27a" opacity="${(.9*(1-a)).toFixed(2)}"/>`}).join('');
 /* солдаты в бою и окопы: перебежки вокруг армии, траншея у окопавшихся */
 let extra='';
 MM.units.forEach(u=>{const S=SPEC[u.sub];if(S.kind!=='land'||u.hid||!inV(u.x,u.y))return;
  const R=z*(S.px/24)*12;
  if(u.dug&&!S.static)extra+=`<ellipse cx="${u.x.toFixed(2)}" cy="${(u.y+R*.55).toFixed(2)}" rx="${(R*1.1).toFixed(2)}" ry="${(R*.38).toFixed(2)}" fill="none" stroke="#7a6038" stroke-width="2" stroke-dasharray="4 2" opacity=".85" vector-effect="non-scaling-stroke"/>`;
  if(!S.static&&MM.t-(u.fight||-99)<.45){const col=u.own===ME?'#cfe2ff':'#ffd0d0';
   for(let i=0;i<5;i++){const an=i*1.2566+MM.t*2.4,rr=R*(1.15+.25*Math.sin(MM.t*9+i*2));extra+=`<circle cx="${(u.x+Math.cos(an)*rr).toFixed(2)}" cy="${(u.y+Math.sin(an)*rr*.7).toFixed(2)}" r="${(z*1.15).toFixed(2)}" fill="${col}" stroke="#101820" stroke-width=".8" vector-effect="non-scaling-stroke"/>`}}
  if(u.build)extra+=`<circle cx="${u.x.toFixed(2)}" cy="${u.y.toFixed(2)}" r="${(R*1.15).toFixed(2)}" fill="none" stroke="#ffd76a" stroke-width="1.6" stroke-dasharray="3 3" opacity="${(.5+.4*Math.sin(MM.t*6)).toFixed(2)}" vector-effect="non-scaling-stroke"/>`});
 L.fx.innerHTML+=extra;
}

/* ---------- панель управления ---------- */
function hud(){
 const box=env&&env.WMAP&&env.WMAP.box;if(!box)return null;
 let f=box.querySelector('.mm-fab');
 if(!f){f=document.createElement('button');f.className='mm-fab';f.textContent='🪖 Войска';f.setAttribute('onclick','H.mmToggle()');
  ['pointerdown','pointerup','click','touchstart'].forEach(t=>f.addEventListener(t,ev=>ev.stopPropagation()));box.appendChild(f)}
 let af=box.querySelector('.mm-ars-fab');
 if(!af){af=document.createElement('button');af.className='mm-fab mm-ars-fab';af.textContent='💣 Арсенал';af.setAttribute('onclick','H.mmArsenal()');
  ['pointerdown','pointerup','click','touchstart'].forEach(t=>af.addEventListener(t,ev=>ev.stopPropagation()));box.appendChild(af)}
 let p=document.getElementById('mm-panel');
 if(!p){p=document.createElement('div');p.id='mm-panel';p.className='mm-panel';p.hidden=true;
  ['pointerdown','pointerup','click','touchstart','wheel'].forEach(t=>p.addEventListener(t,ev=>ev.stopPropagation()));document.body.appendChild(p)}
 let tc=box.querySelector('.mm-time-controls');
 if(!tc){tc=document.createElement('div');tc.className='mm-time-controls';tc.innerHTML='<button type="button" data-mm-time="pause" aria-label="Пауза">Ⅱ</button><button type="button" data-mm-time="play" aria-label="Старт">▶</button><span class="mm-clock"></span>';tc.addEventListener('pointerdown',ev=>ev.stopPropagation());tc.addEventListener('click',ev=>{ev.stopPropagation();const a=ev.target.closest('[data-mm-time]');if(!a)return;const fn=a.dataset.mmTime==='pause'?'pause':'play';if(env&&typeof env[fn]==='function')env[fn]();MM.speed=a.dataset.mmTime==='pause'?0:1;MM.dirty=true;paintHud(true)});box.appendChild(tc)}
 return{p,fab:f}}
const bar=(v,m,c)=>`<span class="mm-b"><i style="width:${clampN(v/m*100,0,100)}%;background:${c}"></i></span>`;
const MISS={idle:'на месте',move:'в движении',patrol:'патрулирует',bomb:'идёт на цель',rtb:'возвращается'};
const MM_MON=['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
function paintClock(){try{const st=env&&env.S&&env.S();if(!st)return;document.querySelectorAll('.mm-clock').forEach(el=>{const mi=(+st.month||0)%12,tot=((+st.year||1)-1)*12+(+st.month||0);el.textContent=`${st.year||1} г · ${MM_MON[mi]} · ${tot} мес`})}catch(e){}}
setInterval(paintClock,700);
function paintHud(force){paintClock();
 const h=hud();if(!h)return;const p=h.p,fab=h.fab;
 const mine=MM.units.filter(u=>u.own===ME),foes=MM.units.filter(u=>u.own!==ME).length+(MM.remoteUnits||[]).length;
 const u=byId(MM.sel);
 const sig=[MM.open,MM.sel,MM.mode,MM.speed,mine.map(x=>x.id+Math.round(x.hp/5)+x.mission+(x.fuel?Math.round(x.fuel/8):0)).join(),foes,MM.log.join('|'),MM.depOpen?Math.floor(env.S().money/50):env.S().money].join('~');
 if(!force&&sig===MM.hsig)return;MM.hsig=sig;
 fab.textContent='🪖 Войска · '+mine.length+(foes?' · враг '+foes:'');
 p.hidden=!MM.open;if(!MM.open)return;
 const chips=mine.map(x=>`<button class="mm-chip${x.id===MM.sel?' on':''}" onclick="H.mmSel('${x.id}')">${SPEC[x.sub].icon}<small>${Math.round(x.hp)}%</small></button>`).join('');
 let card=MM.mode==='placeAA'?'<p class="mm-hint">🛡️ Режим размещения ПВО: нажмите на любую сушу, чтобы установить батарею за 500 млн.</p>':'<p class="mm-hint">Нажмите на свою часть на карте (или значок ниже), затем нажмите точку на карте — отряд пойдёт туда сам.</p>';
 if(u&&u.own===ME){const S=SPEC[u.sub],air=S.kind==='air';
  card=`<div class="mm-card"><b>${S.icon} ${u.name}</b><small>${MISS[u.mission]||''} · ${S.kind==='land'?'суша':S.kind==='sea'?'море':'воздух'}</small>
  <div>Состояние ${bar(u.hp,100,'#4ad66d')}</div>${air?`<div>Топливо ${bar(u.fuel,S.range,'#5aa9ff')} <small>радиус ${Math.round(S.range/2)}</small></div>`:''}
  <div class="mm-row"><button onclick="H.mmStop()">⛔ Стоп</button><button onclick="H.mmRtb()">🏠 На базу</button>${u.sub==='bomber'?`<button class="${MM.mode==='bomb'?'on':''}" onclick="H.mmMode('bomb')">💣 Бомбить</button>`:''}${S.kind==='sea'?`<button class="${MM.mode==='blockade'?'on':''}" onclick="H.mmMode('blockade')">⚓ Блокада</button>`:''}${S.kind==='air'?`<button class="${MM.mode==='support'?'on':''}" onclick="H.mmMode('support')">🤝 Поддержка</button>`:''}<button onclick="H.mmSel(null)">✕</button></div></div>`}
 const dep=['inf','tank','aabat','destroyer','frigate','carrier','submarine','fighter','bomber'].map(k=>`<button onclick="H.mmDeploy('${k}')" ${SPEC[k].cost?'':'hidden'}>${SPEC[k].icon} ${SPEC[k].name}<small>${SPEC[k].cost.money} 💰${SPEC[k].cost.army?' · '+SPEC[k].cost.army+' чел.':''}</small></button>`).join('');
 const st=env.S(),prod=(st.militaryUnits||[]).filter(x=>!x.onMap&&SPEC[x.type]).map(x=>`<button onclick="H.mmDeployProd('${x.id}')">${x.icon} ${x.name} → на карту</button>`).join('');
 const sc0=p.scrollTop;p.innerHTML=`<div class="mm-top"><span>Скорость</span>${[0,1,2,4].map(s=>`<button class="${MM.speed===s?'on':''}" onclick="H.mmSpeed(${s})">${s?s+'×':'⏸'}</button>`).join('')}<button onclick="H.mmToggle()">✕</button></div>
 <div class="mm-chips">${chips||'<small>Нет частей</small>'}</div>${card}
 <details id="mm-dep"${MM.depOpen?' open':''} ontoggle="MilMap.depToggle(this.open)"><summary>➕ Сформировать часть</summary><div class="mm-dep">${dep}${prod?'<hr>'+prod:''}</div></details>
 <div class="mm-log">${MM.log.map(x=>'<div>'+x+'</div>').join('')}</div>`;p.scrollTop=sc0}

/* ---------- сохранение ---------- */
function snapshot(){return{v:1,fleetGiven:true,seq:MM.seq,speed:MM.speed,bases:MM.bases,units:MM.units.map(u=>({...u,base:u.base?(u.base.id?u.base.id:{...u.base}):null}))}}
function restore(o){
 MM.seq=o.seq||1;MM.speed=o.speed==null?1:o.speed;MM.bases=o.bases||[];
 MM.units=(o.units||[]).filter(u=>SPEC[u.sub]).map(u=>{let b=null;if(SPEC[u.sub].kind==='air'){b=typeof u.base==='string'?(MM.bases.find(x=>x.id===u.base)||MM.bases[0]||null):(u.base&&typeof u.base==='object'?u.base:(MM.bases[0]||null))}return{...u,base:b,path:u.path||[]}})}
function persist(){if(!env||!MM.dirty)return;MM.dirty=false;try{const st=env.S();st.milmap=snapshot();env.save()}catch(e){}}

/* ---------- запуск ---------- */
let raf=0,last=0,lastPaint=0,acc=0,saveT=0;
function frame(ts){
 raf=requestAnimationFrame(frame);
 const dt=Math.min(.12,(ts-last)/1000||0);last=ts;if(document.hidden||!MM.ready)return;
 const sd=dt*MM.speed;
 if(sd>0){step(sd);acc+=sd;if(acc>=1.5){acc=0;try{aiThink()}catch(e){console.warn('MM ai',e)}}}
 // На мобильных устройствах не перерисовываем тяжёлый SVG чаще 30 раз/с.
 // Шаг симуляции и таймер сохранения продолжают работать с исходной частотой.
 const isMobile=(root.navigator&&/Android|iPhone|iPad|Mobile/i.test(root.navigator.userAgent||''));const frameMs=isMobile?42:33;if(ts-lastPaint>=frameMs){lastPaint=ts;paint();paintHud(false)}
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
  MM.bases=[];if(home){const w=snap('sea',home.x,home.y,260,true),p=w>=0?cellPt(w):[home.x,home.y];MM.bases.push({id:'home',name:home.name,x:home.x,y:home.y,px:p[0],py:p[1],own:ME})}
  try{MM.pvoMarkers=env.countryPvoMarkers?env.countryPvoMarkers():[];MM.pvoSig=MM.pvoMarkers.map(x=>x.name).join('|')}catch(e){MM.pvoMarkers=[];MM.pvoSig=''}
  if(st.milmap&&st.milmap.units&&st.milmap.units.length)restore(st.milmap);
  else{seedPlayer();MM.dirty=true}
  MM.units=MM.units.filter(u=>{if(SPEC[u.sub].kind!=='sea'||okCell('sea',cellOf(u.x,u.y)))return true;const q=snap('sea',u.x,u.y,80,true);if(q<0)return false;const c=cellPt(q);u.x=c[0];u.y=c[1];u.path=[];return true});   /* корабль, оказавшийся на суше, возвращается в воду */
  try{ensureFleet()}catch(e){console.warn('MM fleet',e)}
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
 deploy(sub){if(sub==='aabat'){MM.mode='placeAA';say('🛡️ Выберите точку на суше для размещения батареи ПВО · 500 млн',true);paintHud(true);return}deploy(sub)},deployProd:deployProduced
};
const core={MM,SPEC,DM,paint,fixSea,setMask,findPath,step,mk,orderMove,orderStop,orderRtb,aiThink,setEnv:e=>{env=e},cellOf,snap,addBase,nearestBase,capture,setNetworkState(player,units,country){if(!player)return;const owner='mp:'+String(player);const keep=(MM.remoteUnits||[]).filter(u=>u.own!==owner);(Array.isArray(units)?units:[]).forEach((u,i)=>{if(!SPEC[u.sub]||!Number.isFinite(+u.x)||!Number.isFinite(+u.y))return;keep.push({id:owner+':'+String(u.id||i),own:owner,sub:u.sub,x:clampN(+u.x,0,GW),y:clampN(+u.y,0,GH),ang:Number(u.ang)||0,hp:clampN(Number(u.hp)||0,0,100),path:[],mission:String(u.mission||'idle'),fuel:Number(u.fuel)||0,name:String(u.name||country||'Игрок').slice(0,32),remote:true})});MM.remoteUnits=keep;}};
if(typeof module!=='undefined'&&module.exports){module.exports=core}
if(typeof window!=='undefined'&&root===window){
 window.MilMap={depToggle(o){MM.depOpen=!!o},handleTap,attach,core,setNetworkState:core.setNetworkState};
 const H=window.H=window.H||{};
 H.mmToggle=API.toggle;H.mmSel=API.sel;H.mmStop=API.stop;H.mmRtb=API.rtb;H.mmMode=API.mode;H.mmSpeed=API.speed;H.mmDeploy=API.deploy;H.mmDeployProd=API.deployProd;
 H.mmOpen=()=>{
  /* переходим на вкладку «Карта», ждём пока карта построится, разворачиваем её на весь экран и открываем панель войск */
  const btn=document.querySelector('#tabs [data-tab="map"]');
  if(btn)btn.click();else if(window.goTab)window.goTab('map');
  let tries=0;
  const tm=setInterval(()=>{
    tries++;
    const G=window.NG&&NG.__mm,slot=document.getElementById('wm-slot');
    const ok=!!(G&&G.WMAP&&G.WMAP.node&&G.WMAP.box&&G.GEO&&G.GEO.st==='ready'&&slot&&slot.contains(G.WMAP.box));
    if(ok||tries>50){
      clearInterval(tm);
      try{if(ok&&!G.WMAP.full&&H.wz)H.wz('full')}catch(e){}
      try{attach()}catch(e){}
      MM.open=true;paintHud(true);
      try{window.scrollTo(0,0)}catch(e){}
    }
  },150);
};
 setInterval(()=>{try{attach()}catch(e){console.warn('MilMap',e)}},600);
}
})(typeof window!=='undefined'?window:globalThis);
