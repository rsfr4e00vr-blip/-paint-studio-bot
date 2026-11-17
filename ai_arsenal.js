/* Тактический ИИ арсенала (v4: арсенал НЕ выдаётся на старте — страны вырабатывают и покупают оружие за деньги; настройки партии S.aiCfg; v3: настоящая нейросеть + опыт-реплей + принудительное опробование всего оружия).
   Страны-ИИ покупают оружие, выбирают цель (военные / инфраструктура / гражданские) и учатся:
   это контекстный бандит с Q-таблицей. Он пробует действия, получает награду за реальный результат
   удара (сдвиг фронта, потери врага, перехват ПВО, дипломатический штраф) и со временем всё чаще
   выбирает то, что действительно работает против игрока и против других стран.
   Состояние обучения лежит в сохранении игры (S.aiBrain), поэтому ИИ помнит опыт между сессиями. */
(function(){'use strict';
const WEAPONS={cannon:{f:1,air:false},drone:{f:1,air:true},tank:{f:1.5,air:false},rocket:{f:2.5,air:true},bomb:{f:5,air:true},
  howitzer:{f:1.3,air:false},heli:{f:1.4,air:true},mlrs:{f:2,air:false},cruise:{f:3,air:true},bomber:{f:4,air:true}};
const TARGETS=['mil','infra','civ','pvo'];
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
  if(t==='pvo'){   // подавление ПВО: имеет смысл, когда у цели есть что подавлять, и лучше всего воздушным оружием
    let v=.22;if(P.indexOf('aaH')>=0)v+=.3;else if(P.indexOf('aa')>=0)v+=.15;else v-=.1;
    const e=(window.BAL&&BAL.sead.eff[w])||.5;v+=(e-.8)*.25;if(!WEAPONS[w].air)v-=.1;return v}
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
   доля видов оружия на складе, накопленный ущерб цели, длительность войны, усталость и доступность сырья.
   Выход (30): Q-оценка каждой пары «оружие × тип цели». Учится после каждого удара по реальному результату. */
const NIN=11,NH=20,NOUT=WK.length*TARGETS.length,NEUTRAL='even|noaa|firm|p';
const aidx=(w,t)=>WK.indexOf(w)*TARGETS.length+TARGETS.indexOf(t);
function feats(o,c){
  let have=0;WK.forEach(k=>{if(c.ars&&(c.ars[k]||0)>=1)have++});
  const rs=window.AIRES?AIRES.init(c):null,raw=rs?Math.min(rs.st.steel,rs.st.fuel,rs.st.energy)/100:1;
  return [C((o.front-50)/50,-1,1),C((o.defAA||0)/14,0,1),C((o.defStab==null?60:o.defStab)/100,0,1),o.vs==='p'?1:0,o.aggr==null?.5:o.aggr,
    C((+c.power||20)/150,0,1),have/WK.length,C(o.dmg||0,0,1),C((o.months||0)/24,0,1),C((c.exhaustion||0)/100,0,1),C(raw,0,1)].map(v=>+v.toFixed(3));
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
const FACTORIES={
 drone:{name:'завод дронов',cost:520,months:8,period:1,out:5,steel:1,fuel:1,energy:2,upkeep:2,weapon:'drone'},
 rocket:{name:'ракетный завод',cost:780,months:11,period:3,out:1,steel:2,fuel:2,energy:3,upkeep:3,weapon:'rocket'},
 mlrs:{name:'завод РСЗО',cost:900,months:12,period:5,out:1,steel:3,fuel:3,energy:4,upkeep:4,weapon:'mlrs'},
 howitzer:{name:'артиллерийский завод',cost:680,months:10,period:4,out:1,steel:2,fuel:2,energy:3,upkeep:3,weapon:'howitzer'},
 tank:{name:'танковый завод',cost:1100,months:14,period:5,out:1,steel:4,fuel:4,energy:5,upkeep:5,weapon:'tank'},
 cruise:{name:'завод крылатых ракет',cost:1050,months:14,period:6,out:1,steel:4,fuel:4,energy:5,upkeep:5,weapon:'cruise'},
 bomber:{name:'авиационный завод',cost:1300,months:16,period:8,out:1,steel:5,fuel:5,energy:7,upkeep:7,weapon:'bomber'}
};
const FACTORY_TARGET={drone:24,rocket:5,mlrs:4,howitzer:5,tank:3,cruise:3,bomber:2};
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
function aaBrain(S){const b=brain(S);return b.aaBuy||(b.aaBuy={n:0,r:0,pn:0})}
/* обучение докупке ПВО: reward>0, если ПВО сбило удар; <0, если ПВО выбили или оно пропустило удар */
function learnAA(S,reward){const a=aaBrain(S);a.n++;a.r+=C(reward,-1,1);if(a.n>400){a.n*=.5;a.r*=.5}}
function factoryRegion(c){
 const rows=window.WORLD&&WORLD.REGS&&WORLD.REGS[c.name];
 if(Array.isArray(rows)&&rows.length){const r=rows[Math.floor(Math.random()*rows.length)];return typeof r==='string'?r:(r.n||r.name||c.name)}
 return c.name||'Столица';
}
function manageFactories(S,c,atWar){
 c.milFactories=Array.isArray(c.milFactories)?c.milFactories:[];c.factoryBuilds=Array.isArray(c.factoryBuilds)?c.factoryBuilds:[];
 const total=c.milFactories.length+c.factoryBuilds.length,max=Math.max(1,Math.min(7,Math.floor((c.power||10)/28)+1));
 if(total>=max||Math.random()>(atWar?.72:.48))return;
 const cash=Number(c.treasury)||0;if(cash<500)return;
 const rs=window.AIRES?AIRES.init(c):null;
 const buildCosts=F=>({steel:Math.max(3,Math.ceil(F.steel*2)),fuel:Math.max(1,Math.ceil(F.fuel*1.5)),energy:Math.max(2,Math.ceil(F.energy*1.5))});
 const b=brain(S),opts=Object.keys(FACTORIES).map(k=>{const F=FACTORIES[k],stock=Number(c.ars&&c.ars[k])||0,def=(FACTORY_TARGET[k]-stock)/Math.max(1,FACTORY_TARGET[k]),cost=buildCosts(F),affordable=!rs||(rs.st.steel>=cost.steel&&rs.st.fuel>=cost.fuel&&rs.st.energy>=cost.energy);let learned=0,n=0;TARGETS.forEach(t=>{const q=b.stat[k+'>'+t];if(q){learned+=q.r;n+=q.n}});const qLearn=n?learned/n:0;const warBias=atWar&&['drone','mlrs','rocket','howitzer'].includes(k)?.18:0;const resourceFit=rs?Math.min(rs.st.steel/Math.max(1,cost.steel),rs.st.fuel/Math.max(1,cost.fuel),rs.st.energy/Math.max(1,cost.energy)):1;return{k,cost,affordable,score:def+qLearn*.12+warBias-F.cost/9000+Math.min(1,resourceFit)*.08-(affordable?0:10)}}).sort((a,b)=>b.score-a.score);
 const chosen=opts.find(x=>x.affordable),F=chosen&&FACTORIES[chosen.k];if(!F||chosen.score<.12||cash<F.cost*1.05)return;
 c.treasury-=F.cost;if(rs){AIRES.use(c,'steel',chosen.cost.steel);AIRES.use(c,'fuel',chosen.cost.fuel);AIRES.use(c,'energy',chosen.cost.energy)}c.factoryBuilds.push({type:chosen.k,region:factoryRegion(c),left:F.months,total:F.months});
 if(S&&S.aiWorld&&Math.random()<.012)S.aiWorld.events.unshift(`🏭 ${c.name} инвестирует в ${F.name}; строительство займёт ${F.months} месяцев`);
}
function factoryTick(S,c,atWar){
 c.milFactories=Array.isArray(c.milFactories)?c.milFactories:[];c.factoryBuilds=Array.isArray(c.factoryBuilds)?c.factoryBuilds:[];
 c.factoryBuilds=c.factoryBuilds.filter(x=>{x.left=Math.max(0,(x.left||1)-1);if(x.left>0)return true;const F=FACTORIES[x.type];if(!F)return false;c.milFactories.push({type:x.type,region:x.region,hp:100,progress:0});return false});
 c.milFactories.forEach(f=>{const F=FACTORIES[f.type];if(!F||f.hp<=0)return;f.progress=Math.max(0,Number(f.progress)||0);const rs=window.AIRES?AIRES.init(c):null;const enough=!rs||(rs.st.steel>=F.steel&&rs.st.fuel>=F.fuel&&rs.st.energy>=F.energy);if((c.treasury||0)<F.upkeep||!enough){f.stalled=true;f.stallReason=!enough?'не хватает стали, топлива или энергии':'не хватает денег';return}f.stalled=false;f.stallReason='';f.progress++;if(f.progress>=F.period){f.progress=0;c.treasury=Math.max(0,c.treasury-F.upkeep);if(rs){AIRES.use(c,'steel',F.steel);AIRES.use(c,'fuel',F.fuel);AIRES.use(c,'energy',F.energy)}c.ars[F.weapon]=Math.min(70,(c.ars[F.weapon]||0)+F.out)}});
 manageFactories(S,c,atWar);
}
function damageFactory(S,c,region,power){if(!c)return null;c.milFactories=Array.isArray(c.milFactories)?c.milFactories:[];const a=c.milFactories.filter(f=>f.hp>0&&(!region||f.region===region));if(!a.length)return null;const f=a[Math.floor(Math.random()*a.length)],F=FACTORIES[f.type];f.hp=Math.max(0,(f.hp||100)-Math.round(24+Math.max(.3,power||1)*18));if(f.hp<=0){c.milFactories=c.milFactories.filter(x=>x!==f);return{destroyed:true,name:F?F.name:'военный завод',region:f.region}}return{destroyed:false,name:F?F.name:'военный завод',region:f.region,hp:f.hp}}
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
  if(window.AIRES)funds*=Math.max(.3,1-.25*AIRES.shortage(c));
  if(window.InterDep&&c.idp)funds*=Math.max(.35,InterDep.effects(c).fx);   // банки и финансы легли — на оружие денег меньше     // страна в нехватке сырья тратит деньги на еду и топливо, а не на оружие
  if(atWar&&!c.arsWar){   // начало войны: мобилизация оборонки и срочные закупки
    c.arsWar=true;
    if(hasTre){const x=Math.max(0,Math.min(p*2.5,c.treasury*.12));c.treasury-=x;funds+=x}else funds+=p*2.5;
  }
  if(!atWar)c.arsWar=false;
  const embargo=c.embargo&&c.embargo>mi;
  const rf=window.AIRES?Math.min(AIRES.factor(c,'steel'),AIRES.factor(c,'fuel')+.25):1;   // нет стали/топлива — заводы встают, остаётся покупать готовое
  const idm=window.InterDep?InterDep.armsMult(c):1;    // цепочка: оборонка живёт на заводах, стали, энергии, топливе и транспорте
  let capLeft=Math.max((rf*idm)<.5?0:1,Math.round(p/22*ind*(atWar?2:1)*(embargo?.7:1)*rf*idm));   // сколько единиц заводы выпускают за месяц
  /* ПВО: нейросеть решает докупать ли её. Вес растёт, если ПВО выбивали, и если докупка раньше окупалась (перехваты) */
  if(window.PVO&&funds>=PVO.BAL.pvo.buyCost){
    PVO.ensure(c);const ab=aaBrain(S),ln=ab.n?ab.r/ab.n:0,want=C(.22+(c.aaLost?.2:0)+(c.aa<c.aaBase?.25:0)+(atWar?.12:0)+ln*.3,.05,.9);
    if(Math.random()<want){const r=PVO.buy(c,funds,capLeft,embargo);if(r.spent>0){funds-=r.spent;capLeft=r.capLeft;ab.pn=(ab.pn||0)+r.n}}
  }
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
  factoryTick(S,c,atWar);
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
      if(t==='pvo'&&!(o.defAA>=.5))return;      // подавлять нечего
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
const WN={cannon:'пушка',drone:'дрон',tank:'танк',rocket:'ракета',bomb:'бомба',howitzer:'гаубица',heli:'вертолёт',mlrs:'РСЗО',cruise:'крылатая ракета',bomber:'бомбардировщик'},TN={mil:'военные цели',infra:'инфраструктура',civ:'гражданские',pvo:'ПВО'};
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

/* ---------- ВЫБОР ОТРАСЛИ ДЛЯ УДАРА ПО ЭКОНОМИКЕ (нейросеть №2) ----------
   Когда тактик выбрал «инфраструктуру», вторая маленькая сеть решает, КАКУЮ отрасль бить: энергосеть, НПЗ, порты, заводы...
   Вход: состояние отраслей цели (8), агрессивность, война. Выход: Q-оценка каждой отрасли. Награда — реальное падение работоспособности
   экономики цели, поэтому ИИ сам открывает, что удар по энергосети рушит цепочку поставок сильнее всего. */
function secFeats(def,o){const ID=window.InterDep,e=ID.solve(ID.of(def));return ID.KEYS.map(k=>+(e[k]/100).toFixed(3)).concat([o&&o.aggr!=null?o.aggr:.5,o&&o.war?1:0])}
function pickSector(S,c,def,o){
  const ID=window.InterDep;if(!ID||!def)return null;
  const b=brain(S),TK=ID.TKEYS,x=secFeats(def,o),sc=ID.bestTarget(def);
  b.secN=b.secN||{};b.secSteps=b.secSteps||0;
  const nt=(window.NN&&!NN.off)?NN.get(b,'nn2',x.length,12,TK.length,TK.map(()=>0)):null,out=nt?NN.predict(nt,x):null;
  const eps=Math.max(.05,.25*Math.exp(-b.secSteps/300)),lg=Math.log(b.secSteps+3);let best=-1,bv=-1e9;
  if(Math.random()<eps)best=Math.floor(Math.random()*TK.length);
  else TK.forEach((t,i)=>{const v=(out?out[i]:0)+sc[t]*.12+.2*Math.sqrt(lg/((b.secN[t]||0)+1))*Math.max(.2,1-b.secSteps/1500);if(v>bv){bv=v;best=i}});
  return{t:TK[best],x,idx:best};
}
function learnSector(S,act,reward){
  const b=brain(S);b.secN=b.secN||{};b.secN[act.t]=(b.secN[act.t]||0)+1;b.secSteps=(b.secSteps||0)+1;
  const nt=(window.NN&&!NN.off&&b.nn2)?b.nn2:null;
  if(nt&&act.x&&nt.nin===act.x.length)NN.train(nt,act.x,act.idx,C(reward,-1,1.5),.05);
}
window.AIARS={WK,learnAA,pickSector,learnSector,WEAPONS,TARGETS,brain,ctx,feats,pick,plan,learn,stock,have,summary,produce,WN,TN,COST,AGGR,NNM,ARSM,cfg,aggrMult,applyCfg,FACTORIES,manageFactories,factoryTick,damageFactory,arsTotal:c=>WK.reduce((a,k)=>a+Math.floor((c.ars&&c.ars[k])||0),0)};
})();
