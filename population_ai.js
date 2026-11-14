/* ИИ населения: люди учатся и пользуются ВСЕМ, что есть в игре.
   Население делится на когорты «группа × область» (рабочие, бизнес, пенсионеры, студенты, военные, фермеры).
   Каждый месяц каждая когорта нейросетью выбирает одно из 8 действий:
     работать · идти добровольцем · прятаться в укрытиях (бункеры, ПВО) · протестовать · поддержать власть ·
     уезжать из страны · вкладывать сбережения · тратить (спрос).
   Выбор зависит от настроения группы, войны, налётов на их область, цен, безработицы, налогов и готовности обороны.
   Награда — реальные последствия для самой когорты (выжила в налёте, довольна жизнью, не зря рисковала),
   поэтому через время люди сами учатся: прячутся, когда бьют по их области, идут в армию на войне, протестуют,
   когда им плохо, и вкладывают деньги, когда стабильно. Те же нейросети управляют населением стран-ботов. */
(function(){'use strict';
const C=(v,a,b)=>Math.max(a,Math.min(b,v));
const ACT=['work','enlist','shelter','protest','support','emigrate','invest','consume'];
const ACT_RU={work:'работают',enlist:'идут в армию',shelter:'прячутся в укрытиях',protest:'протестуют',support:'поддерживают власть',emigrate:'уезжают',invest:'вкладывают сбережения',consume:'тратят деньги'};
const ACT_IC={work:'🛠',enlist:'🎖',shelter:'🛡',protest:'✊',support:'🤝',emigrate:'🧳',invest:'💰',consume:'🛒'};
const G=['workers','biz','pens','stud','mil','farm'];
const GN={workers:'Рабочие',biz:'Бизнес',pens:'Пенсионеры',stud:'Студенты',mil:'Военные',farm:'Фермеры',nat:'Население'};
const GI={workers:'👷',biz:'💼',pens:'👵',stud:'🎓',mil:'🎖',farm:'🌾',nat:'👥'};
const GW={workers:.3,biz:.1,pens:.2,stud:.15,mil:.1,farm:.15};
const NIN=21,NH=18,NOUT=ACT.length,PRIOR=[.35,.05,.05,.02,.1,0,.08,.12];

function P(S){
  if(!S.popAI||typeof S.popAI!=='object')S.popAI={};const p=S.popAI;
  if(!p.coh)p.coh={};if(!p.mem)p.mem=[];if(!p.stat)p.stat={};if(!p.hitNow)p.hitNow={};if(!p.hs)p.hs={};if(!p.sh)p.sh={};if(!p.by)p.by={};
  if(p.steps==null)p.steps=0;if(p.avg==null)p.avg=0;
  return p;
}
const net=S=>NN.get(P(S),'net',NIN,NH,NOUT,PRIOR);
const eps=p=>Math.max(.05,.35*Math.exp(-p.steps/4000));
function feat(e,gi){
  const x=[e.sat,e.appr,e.stab,e.infl,e.unemp,e.food,e.war?1:0,e.hit,e.unrest,e.loy,e.wealth,e.tax,e.def,1];
  for(let i=0;i<7;i++)x.push(i===gi?1:0);
  return x.map(v=>+C(+v||0,0,1).toFixed(3));
}
/* Личная выгода от выбранного действия (в контексте состояния). Именно по ней сеть понимает, что и когда имеет смысл. */
function reward(a,e0,e1,gi){
  let r=(e1.sat-e0.sat)*3+.25*(1-e1.hitNow);const war=e0.war,h=e1.hitNow;
  if(a!=='shelter'&&a!=='emigrate')r-=.3*h;
  switch(a){
    case'work':r+=.1*(1-e1.unemp)-.12*h;break;
    case'enlist':r+=war?.15+(gi===4?.1:0):-.2;break;
    case'shelter':r+=h>0?.5:-.08;break;
    case'protest':r+=e0.sat<.35?.15+(e1.sat>e0.sat?.1:0):-.2;break;
    case'support':r+=e0.appr>.55?.1:-.05;break;
    case'emigrate':r+=((war&&h>0)||e0.sat<.25)?.2:-.25;break;
    case'invest':r+=(e0.stab>.5&&e0.infl<.5)?.12:-.1;break;
    case'consume':r+=e0.wealth>.4?.08:-.05;break;
  }
  return C(r,-1.5,1.5);
}
/* общий шаг когорты: учим по итогам прошлого решения, выбираем новое */
function step(S,p,key,e0,e1,gi){
  const nt=net(S),x=feat(e1,gi),c=p.coh[key];
  if(c&&c.x){
    const r=reward(ACT[c.k],c.e,e1,gi),t=r+.85*Math.max(...NN.predict(nt,x));
    NN.train(nt,c.x,c.k,t,.035);NN.remember(p.mem,{x:c.x,k:c.k,t:+t.toFixed(3)},120);NN.replay(nt,p.mem,2,.015);
    const g=GN[gi<6?G[gi]:'nat'],st=p.stat[g]||(p.stat[g]={});st[ACT[c.k]]=(st[ACT[c.k]]||0)+1;
    p.avg=p.avg*.998+r*.002;p.steps++;
  }
  const q=NN.predict(nt,x),k=NN.choose(q,null,eps(p));
  p.coh[key]={x,k,e:e1};
  return k;
}

/* ---------- население игрока ---------- */
function envOf(S,g,gi,r,env){
  const hp=p=>C(((p.hs[r.name]||0)*.6+(p.hitPrev&&p.hitPrev[r.name]||0))/3,0,1);
  const p=P(S);
  return{sat:S.gr&&S.gr[g]!=null?S.gr[g]/100:S.approval/100,appr:S.approval/100,stab:S.stability/100,infl:C((S.inflation||5)/30,0,1),
    unemp:C((100-(S.employment||94))/30,0,1),food:(S.food==null?70:S.food)/100,war:!!env.atWar,hit:hp(p),hitNow:C((p.hitPrev&&p.hitPrev[r.name]||0)/3,0,1),
    unrest:(r.unrest||0)/100,loy:(r.loyalty||50)/100,wealth:(r.wealth||50)/100,tax:C((S.tax||20)/50,0,1),def:C(((env.aa||0)+(env.bunkers||0))/12,0,1)};
}
function tick(S,env){
  if(!window.NN||!S.regions||!S.regions.length)return;
  env=env||{};const p=P(S);
  p.hitPrev=p.hitNow;p.hitNow={};                                // налёты, прошедшие за последний месяц
  const tot=S.regions.reduce((a,r)=>a+(r.pop||0),0)||1;
  const sh={},by={},rsh={},rtot={};ACT.forEach(a=>sh[a]=0);
  S.regions.forEach(r=>{rsh[r.name]=0;rtot[r.name]=0});
  const prot={};
  S.regions.forEach(r=>{
    const rw=(r.pop||0)/tot;
    G.forEach((g,gi)=>{
      const e=envOf(S,g,gi,r,env),w=rw*GW[g],k=step(S,p,g+'|'+r.name,null,e,gi),a=ACT[k];
      sh[a]+=w;(by[g]||(by[g]={}))[a]=(by[g][a]||0)+rw;rtot[r.name]+=GW[g];
      if(a==='shelter')rsh[r.name]+=GW[g];
      if(a==='protest')prot[r.name]=(prot[r.name]||0)+GW[g];
    });
  });
  p.sh=sh;p.by=by;p.bunk=env.bunkers||0;
  p.reg={};S.regions.forEach(r=>{p.reg[r.name]=rtot[r.name]?rsh[r.name]/rtot[r.name]:0});
  /* последствия коллективного выбора (небольшие поправки вокруг нейтрального положения) */
  S.gdp*=1+(sh.work-.5)*.0006+sh.consume*.0004-sh.shelter*.0004-sh.emigrate*.0004;
  if(env.atWar&&sh.enlist>0){const n=Math.min(1500,Math.round(S.pop*sh.enlist*.0015));S.army+=n;S.morale=C(S.morale+sh.enlist*.8,0,100);S.employment=C((S.employment||94)-sh.enlist*1.5,0,100);p.lastRecruits=n}
  else{p.lastRecruits=0;if(sh.enlist>0&&S.training!=null)S.training=C(S.training+sh.enlist*.2,0,100)}
  S.stability=C(S.stability-sh.protest*2.2+sh.support*.3,0,100);
  S.approval=C(S.approval-sh.protest*1+sh.support*1.2,0,100);
  S.legitimacy=C((S.legitimacy==null?50:S.legitimacy)+sh.support*.3,0,100);
  S.regions.forEach(r=>{if(prot[r.name]){r.unrest=C(r.unrest+prot[r.name]*3,0,100)}});
  if(sh.emigrate>0){S.pop=Math.max(1000,Math.round(S.pop*(1-sh.emigrate*.0012)));S.regions.forEach(r=>r.pop=Math.max(100,Math.round((r.pop||0)*(1-sh.emigrate*.0012))))}
  S.money+=sh.invest*60;
  S.inflation=C((S.inflation||5)+sh.consume*.05,0,60);
  if(sh.protest>.2&&(S.month%6===0)&&window.say)try{say('Люди массово выходят на протесты','✊')}catch(e){}
  Object.keys(p.hs).forEach(k=>{p.hs[k]*=.6});
  Object.keys(p.hitPrev).forEach(k=>{p.hs[k]=(p.hs[k]||0)+p.hitPrev[k]});
}
/* Налёт по области: вызывается из game.js */
function hit(S,reg,t,f){const p=P(S);p.hitNow[reg]=(p.hitNow[reg]||0)+(f||1)}
/* Множитель потерь мирных: чем больше людей области прячется (и чем больше бункеров), тем меньше жертв */
function shelter(S,reg){const p=P(S),fr=(p.reg&&p.reg[reg])||0;return C(1-fr*(.35+C((p.bunk||0)*.04,0,.3)),.35,1)}

/* ---------- население стран-ботов: одна «национальная» когорта на страну ---------- */
function tickNation(S,n){
  if(!window.NN||n.annexed)return;
  const p=P(S),stab=n.stability/100,gdpv=Math.log10(Math.max(10,n.gdp))/6,war=!!n.war;
  const e1={sat:stab,appr:stab,stab:stab,infl:.2,unemp:C(1-n.treasury/Math.max(1,n.gdp)*20,0,1),food:.7,war,hit:C((n.dmg||0)/20,0,1),hitNow:C((n.dmgNew||0)/3,0,1),
    unrest:1-stab,loy:n.morale/100,wealth:gdpv,tax:.4,def:C((n.aa||0)/14,0,1)};
  const k=step(S,p,'N:'+n.name,null,e1,6),a=ACT[k];n.dmgNew=0;n.pact=a;
  n.shelter=a==='shelter'?.65:1;
  switch(a){
    case'work':n.gdp*=1.0004;break;
    case'enlist':if(war){const r=Math.min(n.manpower*.01,.4);n.power=C(n.power+r,2,150);n.manpower=Math.max(0,n.manpower-r*.3)}break;
    case'shelter':n.gdp*=.9996;break;
    case'protest':n.stability=C(n.stability-1.5,10,96);break;
    case'support':n.stability=C(n.stability+1,10,96);break;
    case'emigrate':n.pop=Math.max(.01,n.pop*(1-.0008));n.gdp*=.9996;break;
    case'invest':n.treasury+=n.gdp*.0003;break;
    case'consume':n.gdp*=1.0004;break;
  }
}

function summary(S){
  const p=P(S),tot=Object.keys(p.sh||{}).reduce((a,k)=>a+p.sh[k],0)||1;
  return{steps:p.steps,eps:eps(p),avg:p.avg,sh:p.sh,by:p.by,tot,lastRecruits:p.lastRecruits||0,reg:p.reg||{},stat:p.stat};
}
function panel(S){
  if(!window.NN)return '';const m=summary(S);
  if(!m.steps)return `<div class="mini"><b>🧠 Население учится</b><small class="muted">Люди только начинают пробовать разные решения.</small></div>`;
  const rows=G.map(g=>{const d=m.by[g]||{};const best=Object.keys(d).sort((a,b)=>d[b]-d[a]).slice(0,2).map(a=>`${ACT_IC[a]} ${ACT_RU[a]}`).join(', ');
    return `<div class="mini"><b>${GI[g]} ${GN[g]}</b><small class="muted">Сейчас: ${best||'—'}</small></div>`}).join('');
  const bars=ACT.map(a=>{const v=Math.round(100*(m.sh[a]||0)/m.tot);return `<div class="meter"><b>${ACT_IC[a]} ${ACT_RU[a]}: ${v}%</b><div class="bar"><i style="width:${v}%"></i></div></div>`}).join('');
  const sheltering=Object.keys(m.reg).filter(k=>m.reg[k]>.3).slice(0,3).map(k=>`${k} ${Math.round(100*m.reg[k])}%`).join(', ');
  return `<div class="mini" style="margin-bottom:8px"><b>🧠 Население учится</b><small class="muted">Решений принято: <b>${m.steps.toLocaleString('ru-RU')}</b> · пробуют новое: ${Math.round(m.eps*100)}% · средняя польза решения: ${m.avg>=0?'+':''}${m.avg.toFixed(2)}${m.lastRecruits?` · добровольцев за месяц: ${m.lastRecruits.toLocaleString('ru-RU')}`:''}${sheltering?`<br>🛡 Прячутся от налётов: ${sheltering}. Бункеры и ПВО делают укрытия эффективнее.`:''}</small></div><div class="cards">${rows}</div><div style="margin-top:8px">${bars}</div>`;
}
window.PopAI={tick,tickNation,hit,shelter,summary,panel,ACT,ACT_RU};
})();
