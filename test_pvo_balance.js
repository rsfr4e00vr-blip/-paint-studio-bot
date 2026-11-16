// Run: node test_pvo_balance.js — проверка единого баланса ПВО: перехват, подавление, восстановление, докупка нейросетью, потолок потерь экономики.
const assert=require('node:assert/strict');
global.window=global;let seed=777;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
global.WORLD={list:Array.from({length:60},(_,i)=>({name:`Страна ${i+1}`,pop:5+i,power:15+i*2,inc:2,iso:`X${i}`})),map:{}};
['./nn_core.js','./pvo.js','./ai_resources.js','./ai_arsenal.js','./population_ai.js','./grand_diplomacy.js'].forEach(f=>require(f));
const {PVO,BAL}=global;
const avg=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);

/* 1) единая формула перехвата и минимум ПВО у каждой страны */
{ let prev=-1;for(let s=0;s<=14;s++){const v=PVO.p(s);assert.ok(v>=prev&&v<=BAL.pvo.cap+1e-9);prev=v}
  assert.equal(PVO.p(0),0);
  for(const pw of [1,5,20,60,150]){const b=PVO.base({power:pw});assert.ok(b>=1&&b<=BAL.pvo.baseMax,'минимум ПВО: '+pw)}
  console.log('Перехват по силе ПВО:',[1,2,4,6,8,10,14].map(s=>`${s}→${Math.round(PVO.p(s)*100)}%`).join(' · '));
  console.log('Минимум ПВО страны по мощи:',[5,20,60,100,150].map(p=>`${p}→${PVO.base({power:p}).toFixed(1)}`).join(' · '));
  console.log('OK: формула перехвата и минимум ПВО');
}
/* 2) подавление ПВО врага: сколько месяцев нужно, чтобы выбить, и как долго оно восстанавливается */
{ const res=[];
  for(const [w,per] of [['drone',3],['rocket',2],['cruise',2],['cannon',4]]){
    const months=[],rec=[];
    for(let t=0;t<400;t++){const c={power:60,aa:5};PVO.ensure(c);let m=0,hit=false;
      while(m<24&&!hit){m++;for(let i=0;i<per;i++){const r=PVO.sead(c,w,w==='cannon'?1:w==='drone'?1:w==='rocket'?2.5:3);if(r.destroyed)hit=true}if(!hit)PVO.monthly(c,true)}
      months.push(hit?m:24);let r=0;while(c.aa<c.aaBase-.01&&r<40){PVO.monthly(c,true);r++}rec.push(r)}
    res.push(`${w}×${per}/мес: выбито за ${avg(months).toFixed(1)} мес., восстановление ${avg(rec).toFixed(1)} мес.`)}
  console.log('Подавление ПВО (начальная сила 5):\n  '+res.join('\n  '));
  const c={power:60,aa:5};PVO.ensure(c);for(let i=0;i<30;i++)PVO.sead(c,'cruise',3);assert.equal(c.aa,0);assert.ok(c.aaDown>0);
  const r=PVO.sead(c,'cruise',3);assert.ok(r.already,'добивать уничтоженное ПВО бессмысленно');
  let m=0;while(c.aa<c.aaBase-.01&&m<60){PVO.monthly(c,true);m++}assert.ok(c.aa>=c.aaBase-.01&&m<=12,'ПВО должно восстановиться до минимума за ≤12 мес, было '+m);
  console.log('OK: подавление и восстановление ПВО врага (до минимума за',m,'мес.)');
}
/* 3) ПВО игрока: враг может подавить и уничтожить комплекс; подавление спадает само */
{ const S={aa:3,aaSup:0};let lost=0,dmg=0;const before=PVO.myStrength(S,2,0);
  for(let i=0;i<6;i++){const r=PVO.seadMe(S,'cruise',3,2,0);dmg+=r.dmg;if(r.lostComplex)lost++}
  const hurt=PVO.myStrength(S,2,0);assert.ok(hurt<before);assert.ok(S.aaSup<=BAL.me.supMax+1e-9);
  let m=0;while(S.aaSup>0&&m<40){PVO.myMonthly(S);m++}assert.equal(S.aaSup,0);
  console.log(`OK: ПВО игрока ${before.toFixed(1)} → ${hurt.toFixed(1)} после 6 ударов (комплексов потеряно ${lost}), подавление спало за ${m} мес.`);
}
/* 4) экономика: потолок потерь ВВП за месяц и затухание повторных ударов */
{ const w={},S={year:1,month:3};let sum=0;for(let i=0;i<12;i++)sum+=PVO.ecoLoss(w,'infra',5,1.6,0,S);
  assert.ok(sum<=BAL.eco.cap+1e-9,'потолок потерь за месяц');
  const w2={},one=PVO.ecoLoss(w2,'infra',2.5,1,0,S),w3={},rep=PVO.ecoLoss(w3,'infra',2.5,1,24,S);assert.ok(rep<one*.5);
  const w4={},first=PVO.ecoLoss(w4,'infra',5,1.6,0,{year:1,month:3});PVO.ecoLoss(w4,'infra',5,1.6,0,{year:1,month:3});const next=PVO.ecoLoss(w4,'infra',5,1.6,0,{year:1,month:4});assert.ok(Math.abs(next-first)<1e-9,'новый месяц — лимит сброшен');
  console.log(`OK: экономика — 12 тяжёлых ударов за месяц дают −${(sum*100).toFixed(2)}% ВВП (потолок ${BAL.eco.cap*100}%), повторный удар в ту же область слабее в ${(one/rep).toFixed(1)}×`);
}
/* 5) нейросеть докупает ПВО: сравнение «с докупкой» и «без» под ударами по ПВО */
{ const run=buy=>{BAL.pvo.buyMonth=buy?2:0;const out=[];
    for(let t=0;t<25;t++){const S={year:0,month:0};const c={power:70,industry:1,treasury:6000,aggr:.6,ars:null};PVO.ensure(c);
      for(let m=0;m<36;m++){S.month++;AIARS.stock(c,true,S);PVO.monthly(c,true);if(m%1===0){for(let i=0;i<2;i++)PVO.sead(c,'drone',1)}out.push(c.aa)}}
    BAL.pvo.buyMonth=2;return avg(out)};
  const without=run(false),withB=run(true);console.log(`Средняя сила ПВО под ударами: без докупки ${without.toFixed(2)}, с докупкой ${withB.toFixed(2)}`);
  assert.ok(withB>without+.2,'докупка должна заметно помогать');assert.ok(withB<=BAL.pvo.max);
  console.log('OK: нейросеть докупает ПВО и это окупается');
}
/* 6) тактик: цель «ПВО» выбирается только если есть что подавлять, и сеть учится её ценить */
{ const S={year:0,month:1};const c={power:90,ars:{},exhaustion:0};AIARS.WK.forEach(k=>c.ars[k]=500);
  let none=0,some=0;for(let i=0;i<150;i++){const a=AIARS.pick(S,c,{vs:'p',front:50,defAA:0,defStab:60,aggr:.5,allowBomb:true,allowCiv:true});if(a&&a.t==='pvo')none++}
  for(let i=0;i<150;i++){const a=AIARS.pick(S,c,{vs:'p',front:50,defAA:9,defStab:60,aggr:.5,allowBomb:true,allowCiv:true});if(a&&a.t==='pvo')some++}
  assert.equal(none,0);assert.ok(some>0,'при сильном ПВО цели нейросеть пробует подавление');
  console.log(`OK: цель ПВО — без ПВО у цели ${none}/150, при сильном ПВО ${some}/150`);
}
/* 7) полный мир: ИИ-страны воюют, бьют по ПВО друг друга, значения остаются в границах */
{ require('./ai_nations.js');const st={name:'Новария'};NationsAI.init(st);for(let i=0;i<180;i++)NationsAI.tick(st);
  const ns=st.aiWorld.nations;assert.ok(ns.every(n=>Number.isFinite(n.aa)&&n.aa>=0&&n.aa<=BAL.pvo.max&&Number.isFinite(n.gdp)&&n.gdp>0));
  const hit=ns.filter(n=>n.aaHit>0).length,dead=ns.reduce((a,n)=>a+(n.aaLost||0),0),bought=ns.reduce((a,n)=>a+(n.aaBought||0)+(n.aaMade||0),0);
  console.log(`OK: 180 мес. мира — стран с ударами по ПВО: ${hit}, ПВО уничтожено раз: ${dead}, ПВО докуплено/выпущено: ${bought}`);
}
console.log('ALL OK');
