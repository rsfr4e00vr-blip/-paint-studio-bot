/* Сеть взаимозависимостей экономики (InterDep).
   Единые правила для игрока (одиночная и сетевая игра), стран-ИИ и врага в войне.
   У каждой страны 8 отраслей со здоровьем 0..100. Эффективность отрасли зависит от того, насколько
   живы её «поставщики» (энергия → топливо → транспорт → сталь → заводы → оборонка и т. д.).
   Удар арсенала по одной отрасли поэтому раскатывается по всей цепочке и бьёт по ВВП, валюте,
   еде, стабильности и выпуску оружия. Всё это условная игровая модель. */
(function(root){'use strict';
const C=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:0));
const N=(v,d)=>Number.isFinite(+v)?+v:(d||0);
const KEYS=['energy','fuel','transport','steel','industry','food','finance','defense'];
const NAMES={energy:'Энергосеть',fuel:'Топливо и НПЗ',transport:'Транспорт и порты',steel:'Сталь и металл',industry:'Заводы',food:'Агро и склады',finance:'Банки и финансы',defense:'Оборонка'};
const ICON={energy:'⚡',fuel:'🛢',transport:'🚢',steel:'⛓',industry:'🏭',food:'🌾',finance:'🏦',defense:'🛡'};
/* Кому что нужно: вес = какая доля эффективности отрасли теряется, если поставщик совсем лёг */
const DEPS={
 energy:{fuel:.12},
 fuel:{energy:.30,transport:.10},
 transport:{fuel:.35,energy:.10},
 steel:{energy:.35,fuel:.12,transport:.10},
 industry:{energy:.30,steel:.22,transport:.15,fuel:.10,finance:.08},
 food:{fuel:.20,energy:.12,transport:.18,industry:.10},
 finance:{industry:.10,energy:.05},
 defense:{industry:.30,steel:.30,energy:.15,fuel:.12,transport:.08}
};
/* Цели ударов: что игрок/ИИ выбирает в арсенале → какая отрасль страдает сильнее всего (+ побочные) */
const TARGETS={
 energy:{n:'⚡ Энергосеть',main:'energy',k:9,side:{}},
 fuel:{n:'🛢 НПЗ и топливо',main:'fuel',k:8.5,side:{transport:.15}},
 ind:{n:'🏭 Заводы',main:'industry',k:7,side:{defense:.5,steel:.35}},
 port:{n:'🚢 Порты и транспорт',main:'transport',k:8,side:{food:.2,finance:.1}},
 farm:{n:'🌾 Агро и склады',main:'food',k:8,side:{}},
 bank:{n:'🏦 Финансовый сектор',main:'finance',k:7.5,side:{}}
};
const TKEYS=Object.keys(TARGETS);
const isEco=t=>!!TARGETS[t];
const WEIGHT={energy:.16,fuel:.06,transport:.12,steel:.06,industry:.34,food:.12,finance:.14};   // вклад в ВВП (оборонка в ВВП не входит)

function make(){const h={};KEYS.forEach(k=>h[k]=100);return{h,e:Object.assign({},h),hits:0,dmgTotal:0,last:null,m:0,log:[]}}
function of(o){if(!o.idp||!o.idp.h)o.idp=make();const I=o.idp;KEYS.forEach(k=>{if(!Number.isFinite(I.h[k]))I.h[k]=100});if(!I.e)I.e=Object.assign({},I.h);return I}
/* Пересчёт эффективности по цепочке поставщиков (3 прохода: допускает мягкие циклы) */
function solve(I){
 const e=Object.assign({},I.h);
 for(let p=0;p<3;p++)KEYS.forEach(k=>{
  let lack=0;const d=DEPS[k];for(const s in d)lack+=d[s]*(1-e[s]/100);
  e[k]=C(I.h[k]*(1-C(lack,0,.9)),0,100);
 });
 I.e=e;return e;
}
function gdpFactor(I){const e=solve(I);let s=0,w=0;for(const k in WEIGHT){s+=e[k]*WEIGHT[k];w+=WEIGHT[k]}return C(s/w/100,.05,1)}
function effects(o){const I=of(o),e=solve(I),g=gdpFactor(I);
 return{gdp:g,arms:C(e.defense/100,.05,1),food:C(e.food/100,.05,1),fx:C(e.finance/100,.05,1),energy:C(e.energy/100,.05,1),fuel:C(e.fuel/100,.05,1),steel:C(e.steel/100,.05,1),transport:C(e.transport/100,.05,1),stress:1-g}}
/* УДАР: t — ключ из TARGETS, f — сила оружия (1..5), wt — весовой коэффициент области, def — защита 0..1 (ПВО и т. п.)
   Возвращает {main, dmg:{отрасль:очки}, gdpDrop (в долях)} и пишет в историю. */
function strike(o,t,f,wt,def){
 const T=TARGETS[t];if(!T)return null;const I=of(o);
 const before=gdpFactor(I);
 const sat=Math.max(.3,Math.sqrt(Math.max(.05,I.h[T.main]/100)));            // добить уже убитую отрасль труднее
 const dmg={};
 const main=C(T.k*N(f,1)*N(wt,1)*sat*(1-C(def,0,.6)),0,60);
 I.h[T.main]=C(I.h[T.main]-main,2,100);dmg[T.main]=main;
 for(const s in T.side){const d=main*T.side[s];I.h[s]=C(I.h[s]-d,2,100);dmg[s]=(dmg[s]||0)+d}
 I.hits++;I.dmgTotal+=main;
 const after=gdpFactor(I);
 I.last={t,main:T.main,pts:+main.toFixed(1),m:I.m};
 return{t,main:T.main,pts:main,dmg,gdpDrop:Math.max(0,before-after),h:I.h[T.main]};
}
/* Лёгкий побочный урон от обычного удара по инфраструктуре */
function infraSplash(o,f){return strike(o,'energy',N(f,1)*.22,1,0)&&strike(o,'port',N(f,1)*.16,1,0)}
/* Ремонт за месяц: медленный; на войне ещё медленнее; финансы и энергия ускоряют; платный ремонт (money) ускоряет сильнее */
function recover(o,opt){
 const I=of(o),e=solve(I),war=!!(opt&&opt.war),boost=N(opt&&opt.boost,0);
 const base=(.55+.45*e.finance/100+.25*e.energy/100)*(war?.55:1)+boost;
 KEYS.forEach(k=>{if(I.h[k]<100){const gap=100-I.h[k];I.h[k]=C(I.h[k]+Math.min(gap,base*(.5+gap/160)),0,100)}});
 return base;
}
/* Применение к игроку: связывает отрасли со старыми показателями (ресурсы, ВВП, инфляция, стабильность, оружие) */
function tickPlayer(S,war){
 const I=of(S);I.m=N(I.m)+1;
 const prev=effects(S);
 const synced=S._idpSync!=null&&(N(S.year)*12+N(S.month))-S._idpSync<=2;     // в сетевой игре отрасли и ремонт считает сервер
 const rb=N(S._idRepairLeft)>0?1.1:0;if(rb&&!synced)S._idRepairLeft--;
 if(!synced)recover(S,{war,boost:rb});
 const f=effects(S),stress=f.stress;
 if(stress>.02){
  S.gdp=Math.max(100,N(S.gdp,100)*(1-stress*.030));
  S.food=C(N(S.food,50)-stress*(1-f.food)*1.6-(1-f.transport)*.4,0,100);
  S.fuel=C(N(S.fuel,50)-(1-f.fuel)*1.2,0,100);
  S.energy=C(N(S.energy,50)-(1-f.energy)*1.4,0,100);
  S.steel=C(N(S.steel,50)-(1-f.steel)*.9,0,100);
  S.inflation=C(N(S.inflation,5)+(1-f.fx)*.35+(1-f.transport)*.12,0,100);
  S.employment=C(N(S.employment,90)-stress*.7,30,99);
  S.stability=C(N(S.stability,50)-stress*.5,0,100);
  S.approval=C(N(S.approval,50)-stress*.45,0,100);
  S.trust=C(N(S.trust==null?70:S.trust)-(1-f.fx)*.5,0,100);
 }
 /* Обратная связь: нехватка ресурсов бьёт по отраслям (всё зависит от всего) */
 const lowE=N(S.energy,50)<25,lowF=N(S.fuel,50)<25,lowS=N(S.steel,50)<25,lowFood=N(S.food,50)<25;
 if(lowE)I.h.energy=C(I.h.energy-.35,2,100);
 if(lowF)I.h.transport=C(I.h.transport-.3,2,100);
 if(lowS)I.h.defense=C(I.h.defense-.25,2,100);
 if(lowFood)I.h.industry=C(I.h.industry-.2,2,100);
 if(N(S.debt,0)>N(S.gdp,100)*2)I.h.finance=C(I.h.finance-.3,2,100);
 /* Оружие: оборонка живёт на сталь/заводы — меньше выпуск */
 if(f.arms<.9){S.equipment=C(N(S.equipment,50)-(1-f.arms)*.25,0,100);S.ammo=C(N(S.ammo,50)-(1-f.arms)*.22,0,100)}
 /* История для графика */
 I.log.push(+(f.gdp*100).toFixed(1));if(I.log.length>60)I.log.shift();
 return{prev,f};
}
/* Страны-ИИ и враг: те же правила, но в их полях (gdp, food/fuel/energy/steel, stability, power) */
function tickNation(n,war){
 const I=of(n);I.m=N(I.m)+1;
 recover(n,{war:!!war});
 const f=effects(n),stress=f.stress;
 if(stress>.02){
  n.gdp=Math.max(1,N(n.gdp,1)*(1-stress*.028));
  n.food=C(N(n.food,55)-stress*(1-f.food)*1.2,0,100);
  n.fuel=C(N(n.fuel,55)-(1-f.fuel)*1,0,100);
  n.energy=C(N(n.energy,55)-(1-f.energy)*1.2,0,100);
  n.steel=C(N(n.steel,55)-(1-f.steel)*.8,0,100);
  n.stability=C(N(n.stability,55)-stress*.45,0,100);
  if(n.power!=null)n.power=Math.max(5,N(n.power)-(1-f.arms)*.12);
 }
 if(N(n.energy,55)<20)I.h.energy=C(I.h.energy-.3,2,100);
 if(N(n.fuel,55)<20)I.h.transport=C(I.h.transport-.25,2,100);
 if(N(n.steel,55)<20)I.h.defense=C(I.h.defense-.2,2,100);
 if(N(n.food,55)<20)I.h.industry=C(I.h.industry-.15,2,100);
 return f;
}
/* Множитель выпуска оружия для страны (используется в ai_arsenal) */
function armsMult(o){return o&&o.idp?effects(o).arms:1}
/* Какая отрасль у цели самая слабая / самая «жирная» для удара — подсказка ИИ */
function bestTarget(o,aggr){
 const I=of(o);const e=solve(I);const sc={};
 TKEYS.forEach(t=>{const T=TARGETS[t];let v=(e[T.main]/100)*T.k;for(const s in T.side)v+=(e[s]/100)*T.k*T.side[s]*.5;
  // отрасль, от которой зависят многие другие, ценнее
  let dep=0;KEYS.forEach(k=>{if(DEPS[k][T.main])dep+=DEPS[k][T.main]});v*=1+dep*.8;sc[t]=v});
 return sc;
}
function panel(o,title,opt){
 const I=of(o),e=solve(I),g=gdpFactor(I);
 const row=k=>{const h=I.h[k],ef=e[k],col=ef>66?'#58c28a':ef>38?'#e0b24a':'#d9534f';
  const dep=Object.keys(DEPS[k]).map(s=>ICON[s]).join('');
  return`<div class="mini"><b>${ICON[k]} ${NAMES[k]}</b> <small class="muted">нужны: ${dep||'—'}</small><div class="bar"><i style="width:${Math.round(ef)}%;background:${col}"></i></div><small class="muted">повреждения ${Math.round(100-h)}% · работает на ${Math.round(ef)}%</small></div>`};
 return`<div class="mini"><b>${title||'🕸 Сеть взаимозависимостей'}</b><small class="muted">Всё связано: удар по энергосети гасит топливо, транспорт, сталь, заводы и оборонку, а следом падают ВВП, валюта, еда и стабильность. Общая работоспособность экономики: <b>${Math.round(g*100)}%</b>. Ударов по отраслям: ${I.hits}.</small>${KEYS.map(row).join('')}${opt&&opt.repair?`<div class="actions"><button onclick="repairSector()">🛠 Срочный ремонт (−300 млн, ×2 скорость на 3 мес.)</button></div>`:''}</div>`;
}
root.InterDep={KEYS,NAMES,ICON,DEPS,TARGETS,TKEYS,isEco,make,of,solve,gdpFactor,effects,strike,infraSplash,recover,tickPlayer,tickNation,armsMult,bestTarget,panel};
})(typeof window!=='undefined'?window:globalThis);
