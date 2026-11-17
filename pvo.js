/* ЕДИНЫЙ БАЛАНС + ПВО. Все числа, которые определяют баланс ПВО, подавления ПВО и ударов по экономике, лежат здесь (window.BAL).
   Одна формула перехвата для игрока, врага и стран-ботов. У КАЖДОЙ страны есть минимальное ПВО (baseline):
   его можно выбить ударами «подавление ПВО» (до нуля), потом оно медленно восстанавливается или докупается нейросетью. */
(function(){'use strict';
const C=(v,a,b)=>Math.max(a,Math.min(b,v));
const rn=(a,b)=>a+Math.random()*(b-a);
const BAL={
 pvo:{max:14,cap:.75,k:.12,                 // шанс перехвата = cap·(1−e^(−k·сила)); сила 4 → 29%, 8 → 47%, 14 → 62%
  baseMin:1,basePerPower:1/40,baseMax:4.5,   // минимум ПВО у любой страны: 1 + мощь/40 (не больше 4.5)
  adapt:.2,decay:.1,                         // враг учится от наших воздушных ударов (+adapt·f), лишнее ПВО медленно стареет (−decay/мес)
  regen:.35,regenPoor:.12,rebuildDelay:2,    // восстановление в месяц (при пустой казне медленнее); после полного уничтожения 2 мес. пауза
  down:.5,                                   // ниже этого значения ПВО считается уничтоженным
  buyCost:30,buyMarkup:1.6,buyUnit:.5,buyMonth:2},  // докупка ПВО нейросетью: цена за единицу, наценка рынка, +сила за единицу, максимум покупок в месяц
 sead:{base:.55,hit:.85,self:.6,             // базовый урон подавления, шанс найти радары, насколько ПВО защищает само себя
  eff:{drone:1.2,rocket:1,cruise:1.3,bomber:1.2,bomb:.8,heli:1,mlrs:.8,howitzer:.5,cannon:.4,tank:.3}},
 me:{aabat:1.5,patrol:.07,supMax:10,supDecay:.15,supFlat:.3,destroy:.12,rebuild:1.5, batteryDamage:1.65},  // ПВО игрока: позиция = 1.5 комплекса; подавление спадает, комплекс может быть уничтожен
 eco:{cap:.035,repeat:12,rewardMul:.6,rewardCap:.6,                  // потолок потерь ВВП от ударов за месяц, затухание повторных ударов в область, награда нейросети за урон экономике
  K:{mil:.0004,infra:.0013,civ:.0003,pvo:.0002}}
};
const mIdx=S=>((S&&S.year)||0)*12+((S&&S.month)||0);
const p=s=>BAL.pvo.cap*(1-Math.exp(-BAL.pvo.k*Math.max(0,s||0)));
const base=c=>C(BAL.pvo.baseMin+(+c.power||20)*BAL.pvo.basePerPower,BAL.pvo.baseMin,BAL.pvo.baseMax);
function ensure(c){const b=base(c);c.aaBase=b;if(c.aa==null||!isFinite(c.aa))c.aa=b;return c.aa}
/* --- страны (враг и боты): подавление ПВО --- */
function sead(c,w,f,o){
 ensure(c);const B=BAL.sead,before=c.aa;
 if(before<BAL.pvo.down)return{before,after:before,dmg:0,missed:false,destroyed:true,already:true};
 const eff=B.eff[w]||.5;
 if(Math.random()>B.hit)return{before,after:before,dmg:0,missed:true,destroyed:false};
 let d=B.base*f*eff*rn(.75,1.25)*(1-B.self*Math.min(.6,p(before)));   // сильное ПВО частично прикрывает само себя
 c.aa=Math.max(0,before-d);c.aaHit=(c.aaHit||0)+1;
 const dead=c.aa<BAL.pvo.down;if(dead){c.aa=0;c.aaDown=BAL.pvo.rebuildDelay;c.aaLost=(c.aaLost||0)+1}
 return{before,after:c.aa,dmg:before-c.aa,missed:false,destroyed:dead};
}
/* раз в месяц: адаптация, восстановление до минимума, старение лишнего */
function monthly(c,rich){
 ensure(c);const B=BAL.pvo;
 if(c.aaDown>0){c.aaDown--;return}
 if(c.aa<c.aaBase)c.aa=Math.min(c.aaBase,c.aa+(rich===false?B.regenPoor:B.regen));
 else if(c.aa>c.aaBase+1)c.aa=Math.max(c.aaBase,c.aa-B.decay);
 c.aa=C(c.aa,0,B.max);
}
/* докупка ПВО (нейросеть решает, когда): возвращает потраченные деньги */
function buy(c,funds,capLeft,embargo){
 ensure(c);const B=BAL.pvo;let spent=0,n=0;
 while(n<B.buyMonth&&c.aa<B.max-B.buyUnit){
  const make=capLeft>0&&funds-spent>=B.buyCost,buyIt=!embargo&&funds-spent>=B.buyCost*B.buyMarkup;
  if(!make&&!buyIt)break;
  if(make){spent+=B.buyCost;capLeft--;c.aaMade=(c.aaMade||0)+1}else{spent+=B.buyCost*B.buyMarkup;c.aaBought=(c.aaBought||0)+1}
  c.aa=Math.min(B.max,c.aa+B.buyUnit);if(c.aaDown>0)c.aaDown=0;n++;
 }
 return{spent,n,capLeft};
}
/* --- ПВО игрока: комплексы S.aa + позиции aabat, минус подавление S.aaSup --- */
const myRaw=(S,bat,patrol)=>(S.aa||0)+bat*BAL.me.aabat+(patrol||0)*BAL.me.patrol;
const myStrength=(S,bat,patrol)=>Math.max(0,myRaw(S,bat,patrol)-(S.aaSup||0));
function seadMe(S,w,f,bat,patrol){
 const B=BAL.sead,M=BAL.me,before=myStrength(S,bat,patrol);
 if(before<=.05&&(S.aa||0)<=0&&((S.bld||{}).aabat||0)<=0)return{before,after:0,dmg:0,missed:false,destroyed:true,lostComplex:false,lostBattery:false,batteriesLeft:0};
 if(Math.random()>B.hit)return{before,after:before,dmg:0,missed:true,destroyed:false,lostComplex:false};
 const d=B.base*f*(B.eff[w]||.5)*rn(.75,1.25)*(1-B.self*Math.min(.6,p(before)));
 S.aaSup=Math.min(M.supMax,(S.aaSup||0)+d);
 let lost=false,lostBattery=false;
 // Удары по ПВО повреждают не только запас комплексов, но и построенные позиции.
 // Накопленный урон постепенно уничтожает все позиции ПВО; ИИ и игрок используют одну формулу.
 S.aaDamage=(S.aaDamage||0)+d;
 if((S.aa||0)>0&&Math.random()<Math.min(.95,M.destroy*f*(B.eff[w]||.5))){S.aa--;lost=true}
 const bld=S.bld||(S.bld={});
 while((bld.aabat||0)>0&&S.aaDamage>=M.batteryDamage){S.aaDamage-=M.batteryDamage;bld.aabat--;lostBattery=true;S.aaBatteryLost=(S.aaBatteryLost||0)+1}
 const after=myStrength(S,Math.max(0,bld.aabat||0),patrol);
 const destroyed=after<BAL.pvo.down&&(S.aa||0)<=0&&(bld.aabat||0)<=0;
 return{before,after,dmg:before-after,missed:false,destroyed,lostComplex:lost,lostBattery,batteriesLeft:bld.aabat||0};
}
function myMonthly(S){if(S.aaSup>0)S.aaSup=Math.max(0,S.aaSup*(1-BAL.me.supDecay)-BAL.me.supFlat);if(S.aaSup<.05)S.aaSup=0;S.aaDamage=Math.max(0,(S.aaDamage||0)-.08)}
/* --- экономика: единый расчёт потери ВВП от одного удара врага --- */
function ecoLoss(w,t,f,rf,regHitPct,S){
 const E=BAL.eco,m=mIdx(S);
 if(w._ecoM!==m){w._ecoM=m;w._ecoSum=0}
 const room=Math.max(0,1-w._ecoSum/E.cap);                         // уже набранный за месяц урон гасит следующие удары
 let loss=Math.min(.03,(E.K[t]||.002)*f*rf)/(1+(regHitPct||0)/E.repeat)*room;
 w._ecoSum+=loss;return loss;
}
/* --- графика: кольцевой датчик ПВО (SVG), панель и вспышка --- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function stateOf(cur,bs){return cur<BAL.pvo.down?['dead','уничтожено']:cur<bs-.15?['sup','подавлено']:cur>bs+1?['up','усилено']:['ok','в строю']}
function gauge(title,cur,bs,mx,icon){
 const st=stateOf(cur,bs),v=C(cur/mx,0,1)*100,b=C(bs/mx,0,1)*100,pc=Math.round(p(cur)*100);
 return `<div class="pvog ${st[0]}"><svg viewBox="0 0 80 80" width="84" height="84"><circle class="tr" cx="40" cy="40" r="32" pathLength="100"/><circle class="bs" cx="40" cy="40" r="32" pathLength="100" stroke-dasharray="${b.toFixed(1)} 100" transform="rotate(-90 40 40)"/><circle class="vl" cx="40" cy="40" r="32" pathLength="100" stroke-dasharray="${v.toFixed(1)} 100" transform="rotate(-90 40 40)"/><text x="40" y="38" class="n">${cur.toFixed(1)}</text><text x="40" y="52" class="u">${icon}</text></svg><b>${esc(title)}</b><small>${st[1]} · перехват ${pc}%</small><small>минимум ${bs.toFixed(1)}</small></div>`;
}
function panelHTML(S,H){
 const bat=H.bat,patrol=(H.patrolOf&&H.patrolOf())||0,me=myStrength(S,bat,patrol),meBase=Math.max(1,myRaw(S,bat,patrol));
 const g=[gauge('Наше ПВО',me,meBase,BAL.pvo.max,'🛡')];
 (S.wars||[]).forEach(w=>{const c=H.rel(w.n);if(!c)return;ensure(c);g.push(gauge(w.n,c.aa,c.aaBase,BAL.pvo.max,'📡'))});
 let nn='';
 if(window.AIARS){const b=AIARS.brain(S),T=AIARS.TARGETS,rows=T.map(t=>{let n=0,r=0;AIARS.WK.forEach(k=>{const s=b.stat[k+'>'+t];if(s){n+=s.n;r+=s.r}});return{t,n,avg:n?r/n:0}}),tot=rows.reduce((a,x)=>a+x.n,0);
  if(tot>0){nn=`<div class="pvonn"><b>🧠 Чему научился ИИ врага (${tot} ударов)</b>${rows.map(x=>{const sh=Math.round(100*x.n/tot),col=x.avg>=.3?'#58c27d':x.avg>=0?'#e0b341':'#d9534f';return `<div class="pvorow"><span>${AIARS.TN[x.t]}</span><i><u style="width:${sh}%;background:${col}"></u></i><em>${sh}% · ${x.avg>=0?'+':''}${x.avg.toFixed(2)}</em></div>`}).join('')}<small class="muted">Полоса — доля ударов, цвет — средняя польза (зелёный — нейросеть считает такие удары выгодными). Урон нашей экономике входит в награду.</small></div>`}}
 let buys='';(S.wars||[]).forEach(w=>{const c=H.rel(w.n);if(c&&((c.aaBought||0)+(c.aaMade||0))>0)buys+=`<small class="muted">📡 ${esc(w.n)}: ПВО докуплено ${c.aaBought||0}, выпущено ${c.aaMade||0}${c.aaLost?`, уничтожено ${c.aaLost} раз`:''}</small>`});
 return `<section class="panel pvopanel"><h3>📡 Противовоздушная оборона</h3><div class="pvogs">${g.join('')}</div>${buys}${nn}<small class="muted">Кольцо — текущая сила ПВО, засечка — минимум страны. Бейте «📡 ПВО врага», чтобы уничтожать комплексы и построенные позиции; ИИ может полностью уничтожить ваше ПВО тем же способом. Подавленное ПВО восстанавливается, уничтоженное — медленно (или докупается).</small></section>`;
}
function fx(kind,text){
 try{const d=document.createElement('div');d.className='pvofx '+kind;d.innerHTML=`<div class="rad"><i></i></div><div class="cap">${esc(text||'')}</div>`;document.body.appendChild(d);setTimeout(()=>d.remove(),1900)}catch(e){}
}
window.BAL=BAL;
window.PVO={BAL,p,base,ensure,sead,seadMe,monthly,myMonthly,myStrength,myRaw,buy,ecoLoss,panelHTML,gauge,fx,mIdx};
})();
