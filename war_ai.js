/* ГЕНШТАБ ИИ (war_ai.js) — адаптивный военный мозг противника.
   Раньше враг просто «имел силу» и проигрывал по формуле. Теперь у каждой войны есть командующий, который:
   • выбирает доктрину месяца (оборона / контрудар / блицкриг / изматывание) по ходу фронта и слабостям игрока;
   • окапывается, когда его давят, и копит «укрепления» (бонус к обороне растёт, пока игрок не сменит тактику);
   • делает прорывы из окружения и контрнаступления, когда у игрока кончаются снабжение, боеприпасы или мораль;
   • мобилизует резервы и пополняет армию, если страна не разгромлена экономически;
   • запоминает привычки игрока (авиация, приказы, массирование войск) и подстраивается: наращивает ПВО, засады, контрбатарейную работу;
   • устраивает залповые удары (сюрж) по логистике — топливо, боеприпасы, энергосеть;
   • ведёт тыловую диверсионную войну (изматывание) на затяжных войнах.
   Сила эффекта масштабируется сложностью кампании и настройкой S.aiCfg.general ('off' — отключить). Состояние хранится в w.ai (сохраняется). */
(function(){'use strict';
const C=(v,a,b)=>Math.max(a,Math.min(b,v));
const R=(a,b)=>a+Math.random()*(b-a);
const LEVEL={story:.55,easy:.8,normal:1,hard:1.25,expert:1.5};
const DOC={
  fortify:{label:'Глубокая оборона',icon:'🛡'},
  counter:{label:'Контрудар',icon:'⚡'},
  blitz:{label:'Блицкриг',icon:'🔥'},
  attrition:{label:'Война на истощение',icon:'⏳'},
  balanced:{label:'Манёвренные действия',icon:'⚖'}
};
function level(S){
  if(S.aiCfg&&S.aiCfg.general==='off')return 0;
  const base=LEVEL[S.difficulty]||1;
  const a=S.aiCfg&&S.aiCfg.aggr;const am=a==='high'||a==='max'?1.15:a==='low'?.85:1;
  return base*am;
}
function mem(w){
  if(!w.ai)w.ai={doc:'balanced',fort:0,surge:0,surgeCd:0,hist:[],airUse:0,atkUse:0,defUse:0,spread:0,mob:0,lastMsg:0,breakouts:0,adapt:{aa:0,ambush:0,cb:0}};
  return w.ai;
}
/* что игрок делает на этой войне — по его же приказам */
function readPlayer(S,w,m){
  const cm=w.command||{},army=Math.max(1,S.army||1);
  const air=cm.air==='support'||cm.air==='strategic'?1:0,atk=w.order==='attack'?1:0,def=w.order==='defend'?1:0,heavy=(+cm.troops||0)/army;
  m.airUse=m.airUse*.8+air*.2;m.atkUse=m.atkUse*.8+atk*.2;m.defUse=m.defUse*.8+def*.2;m.heavy=(m.heavy||0)*.8+heavy*.2;
  m.spread=(cm.regions||[]).length>3?1:0;
}
/* слабость игрока: чем выше, тем охотнее враг идёт в прорыв */
function weakness(S,w){
  const sup=C((100-Math.min(S.food,S.fuel,S.ammo,S.equipment))/100,0,1),mor=C((60-(S.morale||50))/60,0,1),stab=C((50-(S.stability||50))/50,0,1);
  const army=C(1-(S.army||0)/Math.max(1,(w.army0||S.army||1)),0,1);
  return C(sup*.4+mor*.25+stab*.15+army*.2,0,1);
}
function chooseDoctrine(S,w,c,m,lv){
  const p=+w.p||50,hist=m.hist,tr=hist.length?hist.reduce((a,b)=>a+b,0)/hist.length:0,weak=weakness(S,w),aggr=+c.aggr||.5,dur=w.m||0;
  if(p>=62||(p>=55&&tr>1.2))return 'fortify';                       // давят — окапываемся
  if(weak>.38&&p<=65&&m.surgeCd<=0)return 'counter';                // у игрока кончаются ресурсы — контрудар
  if(p<=42&&aggr>=.5&&c.power>=40)return 'blitz';                   // враг выигрывает — продавливает
  if(dur>=10&&Math.abs(p-50)<14)return 'attrition';                 // затяжка — изматывание тыла
  return 'balanced';
}
/* Главный вызов: возвращает множители силы на месяц. my/en — уже посчитанные силы сторон. */
function general(S,w,c,my,en){
  const lv=level(S);if(!lv)return {my:1,en:1,doc:'balanced',off:true};
  const m=mem(w);readPlayer(S,w,m);
  if(!w.army0)w.army0=S.army;
  // доктрина пересматривается раз в 2 месяца либо при кризисе
  if(!m.docLeft||m.docLeft<=0||Math.abs((+w.p||50)-(m.lastP||50))>8){m.doc=chooseDoctrine(S,w,c,m,lv);m.docLeft=2;m.lastP=+w.p||50;
    if((w.m||0)-m.lastMsg>=3&&typeof window.__warAiNote==='function'){m.lastMsg=w.m||0;window.__warAiNote(w,m.doc)}}
  m.docLeft--;
  let enM=1,myM=1;
  const lvScale=C(lv,.4,1.6);
  // укрепления: растут, пока мы наступаем, и сбрасываются, если игрок сменил тактику на оборону
  if(m.doc==='fortify'){m.fort=C(m.fort+.012*lvScale,0,.12*lvScale);enM*=1+.05*lvScale+m.fort;myM*=1-.025*lvScale*(.5+m.atkUse)}
  else m.fort=Math.max(0,m.fort-.01);
  if(m.doc==='counter'){m.surge=2;enM*=1+.14*lvScale}
  else if(m.doc==='blitz'){enM*=1+.09*lvScale}
  else if(m.doc==='attrition'){enM*=1+.03*lvScale;myM*=1-.015*lvScale}
  // адаптация к привычкам игрока
  if(m.airUse>.5){m.adapt.aa=C(m.adapt.aa+.04,0,1);enM*=1+m.adapt.aa*.035*lvScale}           // игрок давит с воздуха — враг прячет ПВО
  if(m.heavy>.5&&m.spread<1){m.adapt.ambush=C(m.adapt.ambush+.05,0,1);enM*=1+m.adapt.ambush*.04*lvScale}   // вся армия в один кулак — засады
  if(m.atkUse>.6){m.adapt.cb=C(m.adapt.cb+.04,0,1);myM*=1-m.adapt.cb*.025*lvScale}              // шаблонные атаки — контрбатарейная работа
  if(m.defUse>.6&&(+w.p||50)<55)enM*=1+.04*lvScale;                                             // игрок отсиживается — враг набирает инициативу
  // мобилизация: пока враг не разгромлен — пополняет армию
  const p0=Math.max(1,w.enPow0||c.power||50);
  if(c.power<p0*.9&&(w.m||0)%2===0&&(+c.power||0)>12){const add=Math.round(C(R(.6,2.2)*lvScale,0,3));c.power+=add;m.mob+=add}
  return {my:myM,en:enM,doc:m.doc,lv:lvScale};
}
/* после расчёта фронта: прорывы, контрнаступления, запись истории */
function after(S,w,c,d,log){
  const lv=level(S);if(!lv)return;const m=mem(w);
  m.hist.push(d);if(m.hist.length>4)m.hist.shift();
  if(m.surgeCd>0)m.surgeCd--;
  if(m.doc==='counter'&&m.surge===2){m.surgeCd=6}
  // прорыв из окружения
  if((w.encirclement||0)>=2&&Math.random()<C(.16*lv+(w.supply>50?.05:0),0,.5)){
    w.encirclement=Math.max(0,w.encirclement-1);m.breakouts++;
    if(log)log(`💥 ${w.n}: войска пробили кольцо окружения (${w.encirclement}/5). Командование врага перебросило резервы.`);
  }
  // контрнаступление, если игрок слаб: возвращаем часть фронта
  if(m.doc==='counter'&&weakness(S,w)>.3&&Math.random()<.4){w.p=C(w.p-R(.6,1.6)*C(lv,.4,1.6),0,100)}
  // изматывание тыла игрока: небольшой урон снабжению
  if(m.doc==='attrition'||m.doc==='counter'){
    const k=C(lv,.4,1.6);S.fuel=C(S.fuel-R(.2,.9)*k,0,100);S.ammo=C(S.ammo-R(.1,.7)*k,0,100);
  }
}
/* сколько дополнительных залпов планирует враг на этом ходу и куда бьёт */
function strikeBoost(S,w){
  const lv=level(S);if(!lv||!w.ai)return {extra:0,logistics:false,weakAA:false};
  const m=w.ai;let extra=0;
  if(m.doc==='counter'||m.doc==='blitz')extra=1;
  if(m.doc==='attrition')extra=Math.random()<.5?1:0;
  if(lv>=1.4&&(w.m||0)%4===0)extra++;
  return {extra,logistics:m.doc==='attrition'||m.doc==='counter',weakAA:true};
}
/* рекомендуемый регион для удара: самый уязвимый по ПВО и самый ценный */
function targetRegion(S,t,regions){
  const dark=S.dark||{};
  const score=r=>{
    const val=t==='infra'?(r.infra*r.industry/60):t==='mil'?(r.industry*1.1):((r.pop||0)/20000);
    const shield=(S.aaReg&&S.aaReg[r.name])||0;           // если ПВО по областям задано — бьём туда, где слабее
    return (val*(dark[r.name]?.55:1))/(1+shield*.25)*R(.85,1.15);
  };
  return regions.slice().sort((a,b)=>score(b)-score(a))[0]||null;
}
function summary(w){
  const m=w&&w.ai;if(!m)return '';
  const d=DOC[m.doc]||DOC.balanced;
  return `${d.icon} Доктрина врага: ${d.label}${m.fort>.02?` · укрепления +${Math.round(m.fort*100)}%`:''}${m.mob?` · мобилизовано ${m.mob} п.`:''}${m.breakouts?` · прорывов: ${m.breakouts}`:''}`;
}
window.WARAI={general,after,strikeBoost,targetRegion,summary,level,DOC,weakness};
})();
