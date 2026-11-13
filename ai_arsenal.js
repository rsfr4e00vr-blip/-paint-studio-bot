/* Тактический ИИ арсенала.
   Страны-ИИ покупают оружие, выбирают цель (военные / инфраструктура / гражданские) и учатся:
   это контекстный бандит с Q-таблицей. Он пробует действия, получает награду за реальный результат
   удара (сдвиг фронта, потери врага, перехват ПВО, дипломатический штраф) и со временем всё чаще
   выбирает то, что действительно работает против игрока и против других стран.
   Состояние обучения лежит в сохранении игры (S.aiBrain), поэтому ИИ помнит опыт между сессиями. */
(function(){'use strict';
const WEAPONS={cannon:{f:1,air:false},drone:{f:1,air:true},tank:{f:1.5,air:false},rocket:{f:2.5,air:true},bomb:{f:5,air:true},
  howitzer:{f:1.3,air:false},heli:{f:1.4,air:true},mlrs:{f:2,air:false},cruise:{f:3,air:true},bomber:{f:4,air:true}};
const TARGETS=['mil','infra','civ'];
const WK=Object.keys(WEAPONS);
const C=(v,a,b)=>Math.max(a,Math.min(b,v));
const R=(a,b)=>a+Math.random()*(b-a);

function brain(S){
  if(!S.aiBrain||!S.aiBrain.q)S.aiBrain={q:{},n:{},steps:0,wins:0,last:[],stat:{}};
  return S.aiBrain;
}
// Контекст: как идёт фронт для атакующего, сильна ли ПВО/оборона цели, шатко ли у цели внутри страны
function ctx(o){
  const adv=o.front>=58?'win':o.front<=42?'lose':'even';
  const def=o.defAA>=8?'aaH':o.defAA>=4?'aa':'noaa';
  const weak=o.defStab<42?'weak':'firm';
  return adv+'|'+def+'|'+weak+'|'+(o.vs||'p');
}
// Стартовые знания (чтобы ИИ был разумным с первого дня): по военным бить выгодно, по гражданским — рискованно
function prior(w,t,c){
  const P=String(c).split('|');
  let v=t==='mil'?.55:t==='infra'?.5:.18;
  if(P.indexOf('weak')>=0&&t==='civ')v+=.2;
  if(P.indexOf('aa')>=0&&WEAPONS[w].air)v-=.2;
  if(P.indexOf('aaH')>=0&&WEAPONS[w].air)v-=.35;
  if((P.indexOf('aa')>=0||P.indexOf('aaH')>=0)&&!WEAPONS[w].air)v+=.12;   // против сильной ПВО лучше наземное
  if(P.indexOf('noaa')>=0&&WEAPONS[w].air)v+=.1;
  if(P.indexOf('lose')>=0&&t==='mil')v+=.1;
  if(P.indexOf('win')>=0&&t==='infra')v+=.12;
  if(w==='bomb'||w==='bomber')v+=.08;
  if(w==='cruise'&&t==='infra')v+=.1;
  if(w==='mlrs'&&t==='mil')v+=.1;
  return v;
}
const key=(c,w,t)=>c+'|'+w+'|'+t;
function qv(b,c,w,t){const k=key(c,w,t);return b.q[k]==null?prior(w,t,c):b.q[k]}

function eps(b){return Math.max(.06,.32*Math.exp(-b.steps/500))}

// Запас оружия страны (растёт от её военной мощи; на войне оборонка работает вдвое быстрее)
const RATE={cannon:.05,drone:.05,tank:.02,rocket:.015,bomb:.004,howitzer:.025,heli:.012,mlrs:.012,cruise:.01,bomber:.006};
const NEED={bomb:70,heli:35,mlrs:45,cruise:60,bomber:80,howitzer:25};
function stock(c,atWar){
  const p=Math.max(5,+c.power||20);
  if(!c.ars)c.ars={};
  const init={cannon:p*.2,drone:p*.14,tank:p*.07,rocket:p*.05,bomb:p>=70?1:0,howitzer:p>=25?p*.05:0,heli:p>=35?p*.03:0,mlrs:p>=45?p*.03:0,cruise:p>=60?p*.02:0,bomber:p>=80?1:0};
  WK.forEach(k=>{if(c.ars[k]==null)c.ars[k]=init[k]});
  const boost=atWar?2:1,cap=atWar?70:40;
  WK.forEach(k=>{if(p>=(NEED[k]||0))c.ars[k]=Math.min(cap,(c.ars[k]||0)+p*RATE[k]*boost)});
  return c.ars;
}
function have(c,w){return (c.ars&&c.ars[w]||0)>=1}

/* Выбор удара. o: {front,defAA,defStab,aggr,allowBomb,allowCiv}. Возвращает {w,t,key,ctx} или null */
function pick(S,c,o){
  const b=brain(S),cx=ctx(o),opts=[];
  WK.forEach(w=>{
    if(!have(c,w))return;
    if(w==='bomb'&&!o.allowBomb)return;
    TARGETS.forEach(t=>{
      if(t==='civ'&&!o.allowCiv)return;
      opts.push({w,t,q:qv(b,cx,w,t)+(o.aggr-.5)*(t==='civ'?.3:0)-(WEAPONS[w].f-1)*.02});
    });
  });
  if(!opts.length)return null;
  let a;
  if(Math.random()<eps(b))a=opts[Math.floor(Math.random()*opts.length)];
  else{opts.sort((x,y)=>y.q-x.q);a=opts[0]}
  return{w:a.w,t:a.t,ctx:cx,key:key(cx,a.w,a.t)};
}
function learn(S,act,reward){
  const b=brain(S),k=act.key,n=(b.n[k]||0)+1;b.n[k]=n;
  const old=b.q[k]==null?prior(act.w,act.t,act.ctx):b.q[k];
  b.q[k]=old+Math.max(.05,1/(n+2))*(reward-old);   // скорость обучения падает с опытом
  b.steps++;if(reward>.35)b.wins++;
  const ak=act.w+'>'+act.t;const s=b.stat[ak]||(b.stat[ak]={n:0,r:0});s.n++;s.r+=reward;
}
const WN={cannon:'пушка',drone:'дрон',tank:'танк',rocket:'ракета',bomb:'бомба',howitzer:'гаубица',heli:'вертолёт',mlrs:'РСЗО',cruise:'крылатая ракета',bomber:'бомбардировщик'},TN={mil:'военные цели',infra:'инфраструктура',civ:'гражданские'};
function summary(S){
  const b=brain(S),rows=Object.keys(b.stat).map(k=>{const s=b.stat[k],p=k.split('>');return{w:p[0],t:p[1],n:s.n,avg:s.r/s.n}}).filter(x=>x.n>=2).sort((x,y)=>y.avg-x.avg);
  return{steps:b.steps,eps:eps(b),skill:b.steps?Math.round(100*b.wins/b.steps):0,best:rows.slice(0,3).map(x=>`${WN[x.w]} → ${TN[x.t]} (${x.avg.toFixed(2)})`),worst:rows.slice(-1).map(x=>`${WN[x.w]} → ${TN[x.t]}`)};
}
/* Залп: сколько ударов ИИ наносит за ход и в каком порядке.
   Если у цели сильная ПВО — сначала дроны-приманки (decoy), чтобы выжечь перехватчики, затем дорогие ракеты. */
function salvoSize(c,o){
  const p=Math.max(5,+c.power||20);
  const base=1+p/45+(o.aggr-.5)*3+(o.front<45?1:0)+(o.war?.5:0);
  let have=0;WK.forEach(k=>{have+=Math.floor((c.ars&&c.ars[k])||0)});
  return Math.max(1,Math.min(7,Math.round(base),have));
}
function plan(S,c,o){
  const n=salvoSize(c,o),acts=[];
  for(let i=0;i<n;i++){
    const a=pick(S,c,o);if(!a)break;
    c.ars[a.w]-=1;a.decoy=false;acts.push(a);
  }
  if(o.defAA>=4){   // дешёвое и воздушное — вперёд
    acts.sort((x,y)=>(WEAPONS[y.w].air-WEAPONS[x.w].air)||(WEAPONS[x.w].f-WEAPONS[y.w].f));
    acts.forEach((a,i)=>{if(WEAPONS[a.w].air&&WEAPONS[a.w].f<=1.4&&i<Math.ceil(acts.length/2))a.decoy=true});
  }
  return acts;
}
window.AIARS={WEAPONS,TARGETS,brain,ctx,pick,plan,learn,stock,have,summary,WN,TN};
})();
