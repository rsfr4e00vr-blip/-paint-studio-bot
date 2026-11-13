/* Тактический ИИ арсенала.
   Страны-ИИ покупают оружие, выбирают цель (военные / инфраструктура / гражданские) и учатся:
   это контекстный бандит с Q-таблицей. Он пробует действия, получает награду за реальный результат
   удара (сдвиг фронта, потери врага, перехват ПВО, дипломатический штраф) и со временем всё чаще
   выбирает то, что действительно работает против игрока и против других стран.
   Состояние обучения лежит в сохранении игры (S.aiBrain), поэтому ИИ помнит опыт между сессиями. */
(function(){'use strict';
const WEAPONS={cannon:{f:1,air:false},drone:{f:1,air:true},tank:{f:1.5,air:false},rocket:{f:2.5,air:true},bomb:{f:5,air:true}};
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
  const def=o.defAA>=4?'aa':'noaa';
  const weak=o.defStab<42?'weak':'firm';
  return adv+'|'+def+'|'+weak+'|'+(o.vs||'p');
}
// Стартовые знания (чтобы ИИ был разумным с первого дня): по военным бить выгодно, по гражданским — рискованно
function prior(w,t,c){
  let v=t==='mil'?.55:t==='infra'?.5:.18;
  if(c.indexOf('weak')>=0&&t==='civ')v+=.2;
  if(c.indexOf('aa')>=0&&WEAPONS[w].air)v-=.25;
  if(c.indexOf('lose')>=0&&t==='mil')v+=.1;
  if(c.indexOf('win')>=0&&t==='infra')v+=.12;
  if(w==='bomb')v+=.1;
  return v;
}
const key=(c,w,t)=>c+'|'+w+'|'+t;
function qv(b,c,w,t){const k=key(c,w,t);return b.q[k]==null?prior(w,t,c):b.q[k]}

function eps(b){return Math.max(.06,.32*Math.exp(-b.steps/500))}

// Запас оружия страны (растёт от её военной мощи)
function stock(c){
  const p=Math.max(5,+c.power||20);
  if(!c.ars){c.ars={cannon:p*.2,drone:p*.14,tank:p*.07,rocket:p*.05,bomb:p>=70?1:0}}
  const r={cannon:.05,drone:.04,tank:.02,rocket:.015,bomb:p>=70?.004:0};
  WK.forEach(k=>{c.ars[k]=Math.min(40,(c.ars[k]||0)+p*r[k])});
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
const WN={cannon:'пушка',drone:'дрон',tank:'танк',rocket:'ракета',bomb:'бомба'},TN={mil:'военные цели',infra:'инфраструктура',civ:'гражданские'};
function summary(S){
  const b=brain(S),rows=Object.keys(b.stat).map(k=>{const s=b.stat[k],p=k.split('>');return{w:p[0],t:p[1],n:s.n,avg:s.r/s.n}}).filter(x=>x.n>=2).sort((x,y)=>y.avg-x.avg);
  return{steps:b.steps,eps:eps(b),skill:b.steps?Math.round(100*b.wins/b.steps):0,best:rows.slice(0,3).map(x=>`${WN[x.w]} → ${TN[x.t]} (${x.avg.toFixed(2)})`),worst:rows.slice(-1).map(x=>`${WN[x.w]} → ${TN[x.t]}`)};
}
window.AIARS={WEAPONS,TARGETS,brain,ctx,pick,learn,stock,have,summary,WN,TN};
})();
