/* Тактический ИИ арсенала (v4: арсенал НЕ выдаётся на старте — страны вырабатывают и покупают оружие за деньги; настройки партии S.aiCfg; v3: настоящая нейросеть + опыт-реплей + принудительное опробование всего оружия).
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
  if(!S.aiBrain||!S.aiBrain.q)S.aiBrain={q:{},n:{},steps:0,wins:0,last:[],stat:{},cnt:{},mem:[]};
  const b=S.aiBrain;if(!b.cnt)b.cnt={};if(!b.mem)b.mem=[];
  return b;
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


/* ---------- нейросеть тактика ----------
   Вход (11): перевес на фронте, ПВО цели, устойчивость цели, цель=игрок, агрессивность, мощь атакующего,
   доля видов оружия на складе, накопленный ущерб цели, длительность войны, усталость, смещение.
   Выход (30): Q-оценка каждой пары «оружие × тип цели». Учится после каждого удара по реальному результату. */
const NIN=11,NH=20,NOUT=WK.length*3,NEUTRAL='even|noaa|firm|p';
const aidx=(w,t)=>WK.indexOf(w)*3+TARGETS.indexOf(t);
function feats(o,c){
  let have=0;WK.forEach(k=>{if(c.ars&&(c.ars[k]||0)>=1)have++});
  return [C((o.front-50)/50,-1,1),C((o.defAA||0)/14,0,1),C((o.defStab==null?60:o.defStab)/100,0,1),o.vs==='p'?1:0,o.aggr==null?.5:o.aggr,
    C((+c.power||20)/150,0,1),have/WK.length,C(o.dmg||0,0,1),C((o.months||0)/24,0,1),C((c.exhaustion||0)/100,0,1),1].map(v=>+v.toFixed(3));
}
function net(S){
  if(!window.NN||window.NN.off)return null;
  const bias=[];WK.forEach(w=>TARGETS.forEach(t=>bias.push(prior(w,t,NEUTRAL))));
  return NN.get(brain(S),'nn',NIN,NH,NOUT,bias);
}

function eps(b){return Math.max(.06,.32*Math.exp(-b.steps/500))}

/* ---------- НАСТРОЙКИ ПАРТИИ (S.aiCfg) ---------- */
const AGGR={calm:{n:'Спокойный',m:.6},normal:{n:'Обычный',m:1},high:{n:'Агрессивный',m:1.35},extreme:{n:'Беспощадный',m:1.7}};
const NNM={off:'Выключена (простой тактик)',std:'Обычная',fast:'Быстро учится'};
const ARSM={none:'Нет — страны вырабатывают и покупают сами',small:'Небольшой запас'};
function cfg(S){const c=(S&&S.aiCfg)||{};return{aggr:AGGR[c.aggr]?c.aggr:'normal',nn:NNM[c.nn]?c.nn:'std',ars:ARSM[c.ars]?c.ars:'none'}}
const aggrMult=S=>AGGR[cfg(S).aggr].m;
function applyCfg(S){const c=cfg(S);if(window.NN){NN.off=c.nn==='off';NN.lrMul=c.nn==='fast'?2.2:1}return c}

/* ---------- ЭКОНОМИКА ОРУЖИЯ ----------
   Арсенал на старте пуст. Каждый месяц страна выделяет оборонный бюджет и тратит его двумя способами:
   1) вырабатывает на своих заводах (дешевле, но ограничено мощностью промышленности);
   2) покупает на мировом рынке (дороже в 1.6 раза, нет лимита мощности, но не при эмбарго).
   На войне бюджет в 3–4 раза больше + разовая мобилизация при начале войны. Старое оружие изнашивается. */
const COST={cannon:6,drone:4,tank:22,rocket:26,bomb:40,howitzer:14,heli:35,mlrs:24,cruise:48,bomber:80};
const BUY_MARKUP=1.6;
const RATE={cannon:.05,drone:.05,tank:.02,rocket:.015,bomb:.004,howitzer:.025,heli:.012,mlrs:.012,cruise:.01,bomber:.006};
const NEED={bomb:70,heli:35,mlrs:45,cruise:60,bomber:80,howitzer:25};
const mIdx=S=>(S&&S.year!=null)?(S.year*12+(S.month||0)):null;
function weights(S,c){
  const p=Math.max(5,+c.power||20),b=S?brain(S):null,ws=[];let tot=0;
  WK.forEach(k=>{if(p<(NEED[k]||0))return;let r=0,n=0;
    if(b)TARGETS.forEach(t=>{const s=b.stat[k+'>'+t];if(s){r+=s.r;n+=s.n}});
    const w=Math.max(.15,.6+(n?r/n:0))/Math.sqrt(COST[k]);       // что лучше работало — и что дешевле
    ws.push([k,w]);tot+=w});
  return{ws,tot};
}
function pickWeapon(S,c){const {ws,tot}=weights(S,c);if(!ws.length)return null;let r=Math.random()*tot;for(const [k,w] of ws){r-=w;if(r<=0)return k}return ws[0][0]}
/* Запас: создаёт пустой склад (или небольшой, если выбрано в настройках) и раз в месяц запускает выработку/закупку. */
function stock(c,atWar,S){
  if(!c.ars){
    c.ars={};const p=Math.max(5,+c.power||20),small=S&&cfg(S).ars==='small';
    WK.forEach(k=>{c.ars[k]=small&&p>=(NEED[k]||0)?Math.floor(p*(RATE[k]||.01)*6*10)/10:0});
    c.arsMade=0;c.arsBought=0;
    if(S&&!atWar)c.arsM=mIdx(S);      // в самый первый месяц склад остаётся пустым; на войне мобилизация срабатывает сразу
  }
  WK.forEach(k=>{if(c.ars[k]==null)c.ars[k]=0});
  if(S)monthly(S,c,!!atWar);
  return c.ars;
}
function monthly(S,c,atWar){
  const mi=mIdx(S);if(mi==null||c.arsM===mi)return;c.arsM=mi;
  if(window.AIRES){try{AIRES.tick(S,c,atWar)}catch(e){}}     // сначала ресурсы: добыча, нехватка, закупки сырья
  const p=Math.max(5,+c.power||20),ind=Math.max(.4,c.industry||1),cap=atWar?70:40;
  WK.forEach(k=>{c.ars[k]=Math.max(0,c.ars[k]*(atWar?.99:.985))});   // износ и устаревание
  const hasTre=typeof c.treasury==='number';let funds=0;
  if(hasTre){
    const want=p*(atWar?1.4:.2),take=Math.max(0,Math.min(want,c.treasury*.08));
    c.treasury-=take;funds=take;
  }else{c.arsFund=(c.arsFund||0)+p*(atWar?1.4:.25);funds=c.arsFund;c.arsFund=0}
  if(window.AIRES)funds*=Math.max(.3,1-.25*AIRES.shortage(c));     // страна в нехватке сырья тратит деньги на еду и топливо, а не на оружие
  if(atWar&&!c.arsWar){   // начало войны: мобилизация оборонки и срочные закупки
    c.arsWar=true;
    if(hasTre){const x=Math.max(0,Math.min(p*2.5,c.treasury*.12));c.treasury-=x;funds+=x}else funds+=p*2.5;
  }
  if(!atWar)c.arsWar=false;
  const embargo=c.embargo&&c.embargo>mi;
  const rf=window.AIRES?Math.min(AIRES.factor(c,'steel'),AIRES.factor(c,'fuel')+.25):1;   // нет стали/топлива — заводы встают, остаётся покупать готовое
  let capLeft=Math.max(rf<.5?0:1,Math.round(p/22*ind*(atWar?2:1)*(embargo?.7:1)*rf));   // сколько единиц заводы выпускают за месяц
  const canBuy=!embargo&&(atWar||(c.aggr||.4)>.55||funds>p*1.2);
  for(let i=0;i<10&&funds>=4;i++){
    const w=pickWeapon(S,c);if(!w)break;
    if((c.ars[w]||0)>=cap)continue;
    const base=COST[w];
    if(capLeft>0&&funds>=base){funds-=base;capLeft--;c.ars[w]+=1;c.arsMade=(c.arsMade||0)+1;if(window.AIRES){AIRES.use(c,'steel',base/25);AIRES.use(c,'fuel',base/70)}}
    else if(canBuy&&funds>=base*BUY_MARKUP){funds-=base*BUY_MARKUP;c.ars[w]+=1;c.arsBought=(c.arsBought||0)+1}
    else break;
  }
  if(funds>0){if(hasTre)c.treasury+=funds*.6;else c.arsFund=Math.min(funds,p*4)}    // неистраченное остаётся в бюджете
}
/* Производство по заказу стратегического ИИ страны (действие «арсенал»): деньги уже списаны с казны */
function produce(S,c,units){
  stock(c,!!c.war,S);const p=Math.max(5,+c.power||20),cap=c.war?70:40;
  for(let i=0;i<2;i++){const pick=pickWeapon(S,c);if(!pick)return;
    c.ars[pick]=Math.min(cap,(c.ars[pick]||0)+units/(WEAPONS[pick].f*1.2)/2);c.arsMade=(c.arsMade||0)+units/4}
}
function have(c,w){return (c.ars&&c.ars[w]||0)>=1}

/* Выбор удара. o: {front,defAA,defStab,aggr,allowBomb,allowCiv}. Возвращает {w,t,key,ctx} или null */
function pick(S,c,o){
  const b=brain(S),cx=ctx(o),opts=[],nt=net(S),x=feats(o,c),out=nt?NN.predict(nt,x):null;
  const cold=Math.max(0,1-b.steps/1200);                                    // стартовые знания постепенно уступают место опыту
  const ucb=.28*Math.max(.25,1-b.steps/4000),lg=Math.log(b.steps+3);
  WK.forEach(w=>{
    if(!have(c,w))return;
    if(w==='bomb'&&!o.allowBomb)return;
    TARGETS.forEach(t=>{
      if(t==='civ'&&!o.allowCiv)return;
      const k=key(cx,w,t),tab=b.q[k]==null?0:(b.q[k]-prior(w,t,cx))*.4;     // что таблица узнала сверх стартовых знаний
      let q;
      if(out)q=out[aidx(w,t)]+(prior(w,t,cx)-prior(w,t,NEUTRAL))*cold+tab;
      else q=qv(b,cx,w,t);
      q+=(o.aggr-.5)*(t==='civ'?.3:0)-(WEAPONS[w].f-1)*.02;
      q+=ucb*Math.sqrt(lg/((b.cnt[w+'>'+t]||0)+1));                         // бонус за малоопробованное: ИИ пробует ВСЁ оружие
      opts.push({w,t,q});
    });
  });
  if(!opts.length)return null;
  let a;
  if(Math.random()<eps(b))a=opts[Math.floor(Math.random()*opts.length)];
  else{opts.sort((p,q)=>q.q-p.q);a=opts[0]}
  return{w:a.w,t:a.t,ctx:cx,key:key(cx,a.w,a.t),x,idx:aidx(a.w,a.t)};
}
function learn(S,act,reward){
  const b=brain(S),k=act.key,n=(b.n[k]||0)+1;b.n[k]=n;
  const old=b.q[k]==null?prior(act.w,act.t,act.ctx):b.q[k];
  b.q[k]=old+Math.max(.05,1/(n+2))*(reward-old);   // скорость обучения падает с опытом
  b.steps++;if(reward>.35)b.wins++;
  const ak=act.w+'>'+act.t;const s=b.stat[ak]||(b.stat[ak]={n:0,r:0});s.n++;s.r+=reward;b.cnt[ak]=(b.cnt[ak]||0)+1;
  const nt=net(S);
  if(nt&&act.x){const r=C(reward,-1.5,1.5);NN.train(nt,act.x,act.idx,r,.04);NN.remember(b.mem,{x:act.x,k:act.idx,t:+r.toFixed(3)},96);NN.replay(nt,b.mem,3,.02)}
}
const WN={cannon:'пушка',drone:'дрон',tank:'танк',rocket:'ракета',bomb:'бомба',howitzer:'гаубица',heli:'вертолёт',mlrs:'РСЗО',cruise:'крылатая ракета',bomber:'бомбардировщик'},TN={mil:'военные цели',infra:'инфраструктура',civ:'гражданские'};
function summary(S){
  const b=brain(S),rows=Object.keys(b.stat).map(k=>{const s=b.stat[k],p=k.split('>');return{w:p[0],t:p[1],n:s.n,avg:s.r/s.n}}).filter(x=>x.n>=2).sort((x,y)=>y.avg-x.avg);
  const pairs=WK.length*TARGETS.length,tried=Object.keys(b.cnt||{}).filter(k=>b.cnt[k]>0).length,used=WK.filter(w=>TARGETS.some(t=>(b.cnt[w+'>'+t]||0)>0)).length;
  return{steps:b.steps,eps:eps(b),coverage:Math.round(100*tried/pairs),weaponsUsed:used,weaponsTotal:WK.length,nn:!!(b.nn&&b.nn.steps),nnSteps:(b.nn&&b.nn.steps)||0,skill:b.steps?Math.round(100*b.wins/b.steps):0,best:rows.slice(0,3).map(x=>`${WN[x.w]} → ${TN[x.t]} (${x.avg.toFixed(2)})`),worst:rows.slice(-1).map(x=>`${WN[x.w]} → ${TN[x.t]}`)};
}
/* Залп: сколько ударов ИИ наносит за ход и в каком порядке.
   Если у цели сильная ПВО — сначала дроны-приманки (decoy), чтобы выжечь перехватчики, затем дорогие ракеты. */
function salvoSize(c,o){
  const p=Math.max(5,+c.power||20);
  const ramp=o.months==null?1:Math.min(1,.45+o.months*.12);                       // в первые месяцы войны залпы слабее: оборонка только разгоняется
  const base=(1+p/45+(o.aggr-.5)*3+(o.front<45?1:0)+(o.war?.5:0))*ramp*(1-C((c.exhaustion||0)/250,0,.4));
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
window.AIARS={WEAPONS,TARGETS,brain,ctx,pick,plan,learn,stock,have,summary,produce,WN,TN,COST,AGGR,NNM,ARSM,cfg,aggrMult,applyCfg,arsTotal:c=>WK.reduce((a,k)=>a+Math.floor((c.ars&&c.ars[k])||0),0)};
})();
