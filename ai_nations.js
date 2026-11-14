/* Advanced single-player grand strategy AI: economy, alliances, fronts, logistics and exports. */
(function(){'use strict';
const C=(v,a,b)=>Math.max(a,Math.min(b,v)),R=(a,b)=>a+Math.random()*(b-a),P=a=>a[Math.floor(Math.random()*a.length)];
function init(S){
 if(!window.WORLD||!Array.isArray(WORLD.list))return;
 const player=S.me||S.name||'Новария';
 if(!S.aiWorld||!Array.isArray(S.aiWorld.nations)){
  S.aiWorld={version:3,month:0,nations:WORLD.list.filter(c=>c.name!==player).slice(0,194).map(c=>({name:c.name,iso:c.iso||'',pop:Math.max(.02,+c.pop||1),gdp:Math.max(1,(+c.pop||1)*(+c.inc||1)*100),power:Math.max(5,+c.power||15),stability:R(48,78),treasury:R(500,2400),growth:R(.002,.009),relations:R(-18,35),allies:[],war:null,owner:null,annexed:false,trait:c.trait||'',manpower:Math.max(5,(+c.pop||1)*.035),morale:R(65,90),exhaustion:0,industry:R(.7,1.3),infrastructure:R(.7,1.3),research:R(.5,1.2),exports:0,imports:0,cooldown:0,tradePartners:[]})),events:[],alliances:[],wars:[],owners:{},player};
 }
 const W=S.aiWorld;W.version=3;W.player=player;W.events||=[];W.wars||=[];W.alliances||=[];W.owners||={};
 W.brain||={nn:null,steps:0,stat:{},mem:[],avg:0};
 W.nations.forEach(n=>{n.aa??=Math.round(n.power/25);n.dmg??=0;n.manpower??=n.pop*.035;n.morale??=75;n.exhaustion??=0;n.industry??=1;n.infrastructure??=1;n.research??=1;n.exports??=0;n.imports??=0;n.cooldown??=0;n.tradePartners||=[];n.allies||=[];n.rivals||={};n.intrigue??=0;n.intent??='Развитие экономики';n.warPlan??=0;n.human=n.name===player});
}
let curS=null;
/* Удар страны att по стране def: оружие и цель выбирает общий обучаемый тактик (AIARS). */
function strike(W,w,att,def,isA){
 if(!window.AIARS||!curS)return;
 AIARS.stock(att,true);
 const n=Math.max(1,Math.min(4,1+Math.floor(att.power/55)+(att.intrigue>40?1:0)));
 for(let i=0;i<n;i++)strike1(W,w,att,def,isA);
}
function strike1(W,w,att,def,isA){
 if(!window.AIARS||!curS)return;
 const WP=AIARS.WEAPONS;
 if(def.aa==null)def.aa=Math.round(def.power/25);
 const front=isA?w.front:100-w.front;
 const act=AIARS.pick(curS,att,{vs:'n',front,defAA:def.aa,defStab:def.stability,aggr:C(.45+att.intrigue/200,.2,.9),dmg:C((def.dmg||0)/20,0,1),months:w.months,allowBomb:att.power>=70&&front>70&&def.power<att.power*.6,allowCiv:true});
 if(!act)return;att.ars[act.w]-=1;
 const f=WP[act.w].f,air=WP[act.w].air,sg=isA?1:-1;
 if(air)def.aa=Math.min(14,def.aa+.4*f);                      // противник учится и наращивает ПВО
 if(air&&Math.random()<Math.min(.7,def.aa*.06)){AIARS.learn(curS,act,-.2*f);return}
 let shift=0,r=0;
 if(act.t==='mil'){shift=2.5*f*.5;def.power=Math.max(1,def.power-.25*f);def.manpower=Math.max(0,def.manpower-.02*f);r=shift/3+.2*f}
 else if(act.t==='infra'){shift=1.5*f*.5;def.infrastructure=C(def.infrastructure-.04*f,.4,3);def.industry=C(def.industry-.03*f,.4,3);def.treasury=Math.max(0,def.treasury*(1-.004*f));r=shift/3+.15*f}
 else{shift=.5*f*.5;def.pop=Math.max(.01,def.pop*(1-.0008*f*(def.shelter||1)));def.stability=C(def.stability-.5*f,5,96);def.morale=C(def.morale-.5*f,15,100);att.relations-=.8*f;r=shift/3+.12*f+(def.stability<42?.15*f:0)-.5}
 def.dmg=C((def.dmg||0)+(act.t==='infra'?.5:act.t==='mil'?.3:.2)*f,0,20);
 w.score=C(w.score+sg*shift,-100,100);w.front=C(50+w.score/2,0,100);
 AIARS.learn(curS,act,r-.12*f);
 if(Math.random()<.12)ev(W,`${act.t==='civ'?'🏘':act.t==='infra'?'🏗':'🎯'} ${att.name}: ${AIARS.WN[act.w]} по цели «${AIARS.TN[act.t]}» (${def.name})`);
}
function ev(W,s){W.events.unshift(s);W.events.length=Math.min(W.events.length,80)}
function economy(n){
 const growth=C(n.growth+(n.stability-55)*.000025+n.research*.00008+n.tradePartners.length*.00015-R(.001,.0018),-.018,.024);
 n.gdp=Math.max(1,n.gdp*(1+growth));n.pop=Math.max(.01,n.pop*(1+C(.00015+(n.stability-55)*.000006-R(0,.00025),-.001,.0008)));
 const income=n.gdp*(.0015+n.industry*.00012),upkeep=n.power*.035+n.gdp*.00045+n.manpower*.018;
 n.treasury=C(n.treasury+income-upkeep,0,n.gdp*.2);
 if(!window.NN&&n.treasury>n.gdp*.025){
  if(n.war&&n.power<150&&Math.random()<.48){let spend=Math.min(n.treasury*.035,n.gdp*.0018);n.treasury-=spend;n.power=C(n.power+spend*.16,2,150)}
  else if(Math.random()<.22){let s=Math.min(n.treasury*.025,n.gdp*.0012);n.treasury-=s;n.industry=C(n.industry+s/Math.max(100,n.gdp)*.45,.5,3);n.growth=C(n.growth+.000025,.001,.014)}
  else if(Math.random()<.18){let s=Math.min(n.treasury*.02,n.gdp*.001);n.treasury-=s;n.infrastructure=C(n.infrastructure+s/Math.max(100,n.gdp)*.5,.5,3)}
  else if(Math.random()<.12){let s=Math.min(n.treasury*.015,n.gdp*.0008);n.treasury-=s;n.research=C(n.research+s/Math.max(100,n.gdp)*.5,.4,3)}
 }
 if(n.treasury>n.gdp*.008&&n.power<Math.min(150,25+n.gdp*.012)){let recruits=Math.min(n.manpower*.025,Math.max(.05,n.pop*.00012));n.power=C(n.power+recruits*(.35+n.industry*.12),2,150);n.manpower=Math.max(0,n.manpower-recruits*.12)}
 n.manpower=C(n.manpower+n.pop*.00008,0,n.pop*.08);n.morale=C(n.morale+(n.treasury>n.gdp*.015?.35:-.45)-n.exhaustion*.008,15,100);
 n.stability=C(n.stability+R(-.7,.55)+(n.treasury>n.gdp*.025?.2:0)-n.exhaustion*.012,10,96);
 n.exports=n.gdp*(.0004+n.industry*.00015)+n.tradePartners.length*2;n.imports=n.gdp*(.00025+(n.power>60?.0002:0));
}
function diplomacy(W,A){
 for(const a of A){a.cooldown=Math.max(0,a.cooldown-1);a.allies=a.allies.filter(x=>A.some(n=>n.name===x));
  const danger=A.filter(b=>b!==a&&!b.annexed).sort((x,y)=>(y.power/Math.max(1,a.power))-(x.power/Math.max(1,a.power)))[0];
  if(danger&&danger.power>a.power*1.35){a.intent='Укрепление обороны';a.warPlan=0;if(Math.random()<.035){a.power=C(a.power+Math.max(.5,a.power*.012),2,150);a.treasury=Math.max(0,a.treasury-a.gdp*.0008);ev(W,`🛡 ${a.name} усиливает оборону из-за угрозы со стороны ${danger.name}`)}}
  else if(a.stability<32){a.intent='Внутренняя стабилизация';a.growth=Math.max(.001,a.growth*.85)}
  else if(a.treasury>a.gdp*.03){a.intent='Экономическое развитие';}
  if(Math.random()<.006){const rivals=A.filter(b=>b!==a&&!a.allies.includes(b.name)&&!b.war);if(rivals.length){const b=P(rivals);b.rivals||={};b.rivals[a.name]=(b.rivals[a.name]||0)+R(4,12);a.intrigue=C(a.intrigue+1,0,100);ev(W,`🕵️ ${a.name} ведёт тайные переговоры и интриги против ${b.name}`)}}
  if(Math.random()<.008){let opts=A.filter(b=>b!==a&&!b.war&&!a.war&&!a.allies.includes(b.name)&&Math.abs(a.power-b.power)<55);if(opts.length){let b=P(opts);a.allies.push(b.name);b.allies.push(a.name);W.alliances.push({a:a.name,b:b.name,formed:W.month});ev(W,`🤝 ${a.name} и ${b.name} заключили оборонительный союз`)}}
  if(Math.random()<.012){let opts=A.filter(b=>b!==a&&!b.war&&!a.war&&!a.tradePartners.includes(b.name)&&b.tradePartners.length<8);if(opts.length){let b=P(opts);a.tradePartners.push(b.name);b.tradePartners.push(a.name);ev(W,`🚢 ${a.name} и ${b.name} открыли торговый коридор`)}}
 }
}
function declare(W,A){
 for(const a of A){if(a.war||a.cooldown||Math.random()>.0045)continue;
  let targets=A.filter(b=>b!==a&&!b.war&&!b.allies.includes(a.name)&&!a.allies.includes(b.name)&&!b.cooldown&&!W.wars.some(w=>(w.a===a.name&&w.b===b.name)||(w.a===b.name&&w.b===a.name)));
  targets.sort((x,y)=>(a.power/Math.max(1,x.power))*(1+Math.max(0,-x.relations)/180)+x.gdp/Math.max(1,a.gdp)*.12-((a.power/Math.max(1,y.power))*(1+Math.max(0,-y.relations)/180)+y.gdp/Math.max(1,a.gdp)*.12));
  if(!targets.length)continue;let b=targets[targets.length-1],ally=a.allies.reduce((s,x)=>s+(A.find(n=>n.name===x)?.power||0)*.28,0),def=b.allies.reduce((s,x)=>s+(A.find(n=>n.name===x)?.power||0)*.32,0);
  if(a.treasury<a.gdp*.012||a.power+ally<b.power*.88+def*.65)continue;
  let id=`${W.month}:${a.name}:${b.name}`;a.war=b.war=id;W.wars.push({id,a:a.name,b:b.name,started:W.month,months:0,score:0,front:50,lossA:0,lossB:0,goal:b.gdp>a.gdp?'cripple':'territory',joinedA:[],joinedB:[]});
  ev(W,`⚔️ ${a.name} начала войну против ${b.name}. Военная цель: ${b.gdp>a.gdp?'сломить экономику':'захватить территории'}`);
 }
}
function fight(W,w,a,b,A){
 w.months++;for(const [side,allyNames] of [['A',a.allies],['B',b.allies]])if(w.months>=2){let joined=w['joined'+side];for(const name of allyNames){let x=A.find(n=>n.name===name);if(x&&!x.war&&!joined.includes(name)&&Math.random()<(side==='A'?.22:.3)){joined.push(name);x.war=w.id;ev(W,`🛡 ${name} вступила в войну на стороне ${side==='A'?a.name:b.name}`)}}}
 const aid=w.joinedA.reduce((s,x)=>s+(A.find(n=>n.name===x)?.power||0)*.3,0),bid=w.joinedB.reduce((s,x)=>s+(A.find(n=>n.name===x)?.power||0)*.35,0);
 const sa=C(100-a.exhaustion*.55-(a.treasury<a.gdp*.004?25:0)+a.infrastructure*4+a.industry*3+(a.manpower< a.pop*.008?-18:0),12,115),sb=C(100-b.exhaustion*.55-(b.treasury<b.gdp*.004?25:0)+b.infrastructure*4+b.industry*3+(b.manpower< b.pop*.008?-18:0),12,115);
 const atk=a.power*(.65+a.morale/180)*sa/100+aid,def=b.power*(.72+b.morale/170)*sb/100+bid+R(0,b.infrastructure*3);
 let delta=C((atk-def)/Math.max(30,atk+def)*24+R(-2.5,2.5),-9,9);w.score=C(w.score+delta,-100,100);w.front=C(50+w.score/2,0,100);
 strike(W,w,a,b,true);strike(W,w,b,a,false);
 let la=Math.max(.05,def/Math.max(1,atk)*.32)*R(.7,1.3),lb=Math.max(.05,atk/Math.max(1,def)*.32)*R(.7,1.3);a.power=Math.max(1,a.power-la);b.power=Math.max(1,b.power-lb);w.lossA+=la;w.lossB+=lb;
 a.treasury=Math.max(0,a.treasury-a.gdp*.0028-la*.3);b.treasury=Math.max(0,b.treasury-b.gdp*.0022-lb*.3);a.exhaustion=C(a.exhaustion+1.15,0,100);b.exhaustion=C(b.exhaustion+.95,0,100);
 w.supplyA=sa;w.supplyB=sb;w.encirclementA=w.encirclementA||0;w.encirclementB=w.encirclementB||0;if(w.front>72&&sa>60&&Math.random()<.16)w.encirclementB=C(w.encirclementB+1,0,5);else if(w.front<55)w.encirclementB=Math.max(0,w.encirclementB-1);if(w.front<28&&sb>60&&Math.random()<.16)w.encirclementA=C(w.encirclementA+1,0,5);else if(w.front>45)w.encirclementA=Math.max(0,w.encirclementA-1);if(w.encirclementA>=4)w.score=C(w.score-9,-100,100);if(w.encirclementB>=4)w.score=C(w.score+9,-100,100);if(w.months%4===0)ev(W,`🪖 Фронт ${a.name}—${b.name}: контроль ${Math.round(w.front)}%, снабжение ${Math.round(sa)}/${Math.round(sb)}%, окружение ${w.encirclementA}/${w.encirclementB}`);
}
function peace(W,w,a,b,A){
 let win=w.score>=0?a:b,lose=win===a?b:a,margin=Math.abs(w.score),share=C(.06+margin/500+R(0,.04),.05,.28);
 if(margin>18){let g=lose.gdp*share;win.gdp+=g*.72;lose.gdp-=g;win.treasury+=Math.min(lose.treasury*.18,win.gdp*.025);lose.treasury*=.82;lose.pop*=1-share*.12;lose.stability=C(lose.stability-8-margin*.08,5,95);lose.relations-=12;win.relations+=5;
  if(margin>65&&win.power>lose.power*1.45&&Math.random()<.28){lose.annexed=true;lose.owner=win.name;W.owners[lose.name]=win.name;win.pop+=lose.pop;win.gdp+=lose.gdp;ev(W,`🏴 ${win.name} полностью аннексировала ${lose.name}`)}
  else{W.owners[lose.name+':occupied']=win.name;ev(W,`🗺 ${win.name} навязала ${lose.name} территориальные уступки`)}
 }else ev(W,`🕊 ${a.name} и ${b.name} подписали мир без решающей победы`);
 [a,b,...w.joinedA.map(x=>A.find(n=>n.name===x)),...w.joinedB.map(x=>A.find(n=>n.name===x))].filter(Boolean).forEach(n=>{n.war=null;n.cooldown=10;n.exhaustion=C(n.exhaustion-18,0,100);n.morale=C(n.morale+(n===win?8:-8),15,100)});
 ev(W,`📜 Мирный договор: ${win.name} получила преимущество, ${lose.name} принимает условия капитуляции/уступок. Потери армий: ${Math.round(w.lossA)} / ${Math.round(w.lossB)}`);
}

/* ================= СТРАТЕГИЧЕСКИЙ МОЗГ СТРАНЫ (нейросеть) =================
   Каждый месяц каждая страна смотрит на своё состояние и выбирает ОДНО из 12 действий: развитие экономики, промышленность,
   инфраструктура, наука, армия, ПВО, производство оружия, стабилизация, союз, торговля, мобилизация, мир.
   Сеть общая для всех стран (у каждой своё состояние на входе) и учится по настоящему результату: рост «оценки состояния»
   страны (ВВП, стабильность, мощь, казна, потери войны). Так страны со временем сами находят, что работает. */
const ACTS=['economy','industry','infra','research','army','aa','arsenal','stabilize','ally','trade','mobilize','peace'];
const ACT_RU={economy:'бизнес-климат',industry:'промышленность',infra:'инфраструктура',research:'наука',army:'армия',aa:'ПВО',arsenal:'оружие',stabilize:'стабилизация',ally:'союзы',trade:'торговля',mobilize:'мобилизация',peace:'мир'};
const SIN=13,SNH=22,SOUT=ACTS.length,SPRIOR=[.3,.25,.2,.2,.15,.1,.1,.1,.1,.2,0,0];
const med=a=>{const v=a.map(n=>n.gdp).sort((x,y)=>x-y);return v[v.length>>1]||1};
function value(n){return Math.log(Math.max(1,n.gdp))*4+n.stability/25+n.power/50+C(n.treasury/Math.max(1,n.gdp),0,.3)*10+Math.log(Math.max(.01,n.pop))*.5-n.exhaustion/40-(n.dmg||0)/8}
function sfeat(W,n,A,m){
 const danger=A.reduce((b,x)=>x!==n&&!x.annexed&&x.power>b?x.power:b,0);
 return [C(Math.log(Math.max(1,n.gdp)/m)/3,-1,1),C(n.treasury/Math.max(1,n.gdp)*30,0,1),n.stability/100,C(n.power/150,0,1),n.war?1:0,C(danger/Math.max(5,n.power)/3,0,1),n.exhaustion/100,
  C((n.aa||0)/14,0,1),C(n.manpower/Math.max(.01,n.pop*.08),0,1),C(n.allies.length/4,0,1),n.morale/100,C((n.dmg||0)/20,0,1),1].map(v=>+v.toFixed(3));
}
function epsS(b){return Math.max(.05,.3*Math.exp(-b.steps/30000))}
function think(W,n,A,m){
 if(!window.NN||!W.brain)return;
 const B=W.brain,net=NN.get(B,'nn',SIN,SNH,SOUT,SPRIOR),x=sfeat(W,n,A,m),v=value(n);
 /* 1) учимся на итоге прошлого решения: r = рост оценки состояния; цель = r + γ·max Q(новое состояние) */
 if(n.last&&n.last.x){const q2=NN.predict(net,x),r=C((v-n.last.v)*4,-2,2),t=r+.9*Math.max(...q2);
  NN.train(net,n.last.x,n.last.k,t,.03);NN.remember(B.mem,{x:n.last.x,k:n.last.k,t:+t.toFixed(3)},120);NN.replay(net,B.mem,2,.015);
  const st=B.stat[ACTS[n.last.k]]||(B.stat[ACTS[n.last.k]]={n:0,r:0});st.n++;st.r+=r;B.avg=B.avg*.998+r*.002;B.steps++}
 /* 2) допустимые действия и бюджет */
 const s=Math.min(n.treasury*.025,n.gdp*.0012),rich=s>=.5,peaceW=n.war?W.wars.find(w=>w.id===n.war):null;
 const ok=i=>{const a=ACTS[i];
  if(a==='mobilize'||a==='peace')return !!peaceW&&(a==='mobilize'?n.manpower>.05:peaceW.months>=2&&!peaceW.peaceReq);
  if(a==='ally')return !n.war&&n.allies.length<4;
  if(a==='trade')return !n.war&&n.tradePartners.length<8;
  return rich};
 const q=NN.predict(net,x),k=NN.choose(q,ok,epsS(B));
 n.last=k<0?null:{x,k,v};if(k<0)return;
 const a=ACTS[k];n.intent=({economy:'Экономическое развитие',industry:'Наращивает промышленность',infra:'Строит инфраструктуру',research:'Вкладывается в науку',army:'Усиливает армию',aa:'Строит ПВО',arsenal:'Производит оружие',stabilize:'Внутренняя стабилизация',ally:'Ищет союзников',trade:'Расширяет торговлю',mobilize:'Мобилизация',peace:'Добивается мира'})[a];
 const g=Math.max(100,n.gdp);
 switch(a){
  case'economy':n.treasury-=s*.6;n.growth=C(n.growth+.00006,.001,.014);n.stability=C(n.stability+.15,10,96);break;
  case'industry':n.treasury-=s;n.industry=C(n.industry+s/g*.45,.5,3);n.growth=C(n.growth+.000025,.001,.014);break;
  case'infra':n.treasury-=s;n.infrastructure=C(n.infrastructure+s/g*.5,.5,3);break;
  case'research':n.treasury-=s;n.research=C(n.research+s/g*.5,.4,3);break;
  case'army':n.treasury-=s;n.power=C(n.power+s*.16,2,150);break;
  case'aa':n.treasury-=s;n.aa=Math.min(14,(n.aa||0)+.35);break;
  case'arsenal':n.treasury-=s;if(window.AIARS&&curS)AIARS.produce(curS,n,C(s/(g*.0006),.5,4));else n.power=C(n.power+s*.08,2,150);break;
  case'stabilize':n.treasury-=s;n.stability=C(n.stability+1.2,10,96);n.exhaustion=C(n.exhaustion-1,0,100);break;
  case'ally':{const o=A.filter(b=>b!==n&&!b.war&&!n.allies.includes(b.name)&&b.allies.length<4&&Math.abs(n.power-b.power)<55);
   if(o.length&&Math.random()<.35){const b=P(o);n.allies.push(b.name);b.allies.push(n.name);W.alliances.push({a:n.name,b:b.name,formed:W.month});ev(W,`🤝 ${n.name} и ${b.name} заключили союз (решение ИИ-стратега)`)}break}
  case'trade':{const o=A.filter(b=>b!==n&&!b.war&&!n.tradePartners.includes(b.name)&&b.tradePartners.length<8);
   if(o.length&&Math.random()<.5){const b=P(o);n.tradePartners.push(b.name);b.tradePartners.push(n.name);ev(W,`🚢 ${n.name} и ${b.name} договорились о торговле`)}break}
  case'mobilize':{const r=Math.min(n.manpower*.05,2);n.power=C(n.power+r,2,150);n.manpower=Math.max(0,n.manpower-r*.5);n.morale=C(n.morale-1.5,15,100);n.exhaustion=C(n.exhaustion+1,0,100);break}
  case'peace':if(peaceW)peaceW.peaceReq=true;break;
 }
}
function brainStats(W){
 const B=W.brain;if(!B)return null;
 const rows=Object.keys(B.stat).map(k=>({k,n:B.stat[k].n,avg:B.stat[k].r/Math.max(1,B.stat[k].n)})).filter(x=>x.n>=20);
 const tot=rows.reduce((a,x)=>a+x.n,0)||1;
 return{steps:B.steps,eps:epsS(B),avg:B.avg,rows:rows.sort((a,b)=>b.n-a.n),tot,coverage:Math.round(100*rows.length/ACTS.length)};
}
function tick(S){
 curS=S;init(S);let W=S.aiWorld;if(!W)return;W.month++;let A=W.nations.filter(n=>!n.annexed&&!n.human);A.forEach(economy);if(window.PopAI)A.forEach(n=>{try{PopAI.tickNation(S,n)}catch(e){}});{const m=med(A);A.forEach(n=>think(W,n,A,m))}diplomacy(W,A);declare(W,A);
 W.wars=W.wars.filter(w=>{let a=W.nations.find(n=>n.name===w.a),b=W.nations.find(n=>n.name===w.b);if(!a||!b||a.annexed||b.annexed){if(a)a.war=null;if(b)b.war=null;return false}
 fight(W,w,a,b,A);if(!(w.peaceReq&&w.months>=3)&&(w.months<4||(w.months<8&&Math.abs(w.score)<18)||(w.months<18&&Math.abs(w.score)<32&&a.treasury>a.gdp*.002&&b.treasury>b.gdp*.002)&&w.encirclementA<4&&w.encirclementB<4))return true;
 peace(W,w,a,b,A);return false});
 if(W.month%12===0)ev(W,'📊 Годовой обзор: экономики, промышленность, резервы и торговля продолжают развиваться.');
 W.events.length=Math.min(W.events.length,80);
}
function exportData(format){
 let W=window.__activeGameState?.aiWorld;if(!W)return alert('Откройте вкладку дипломатии перед экспортом.');
 let data,name,type;if(format==='csv'){let cols=['name','iso','pop','gdp','power','stability','treasury','manpower','morale','exhaustion','industry','infrastructure','research','exports','imports','owner','annexed'];data=[cols.join(';'),...W.nations.map(n=>cols.map(k=>String(n[k]??'').replace(/;/g,',')).join(';'))].join('\n');name='world-nations.csv';type='text/csv;charset=utf-8'}else{data=JSON.stringify(W,null,2);name='world-ai-export.json';type='application/json'}
 let blob=new Blob(['\ufeff',data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function brainPanel(W){
 const b=brainStats(W);if(!b||!b.steps)return `<div class="mini"><b>🧠 Нейросеть стран</b><small class="muted">Страны только начинают копить опыт.</small></div>`;
 const top=b.rows.slice(0,5).map(x=>`${ACT_RU[x.k]} ${Math.round(100*x.n/b.tot)}% (${x.avg>=0?'+':''}${x.avg.toFixed(2)})`).join(' · ');
 return `<div class="mini" style="margin-bottom:8px"><b>🧠 Нейросеть стран учится</b><small class="muted">Принято решений: <b>${b.steps.toLocaleString('ru-RU')}</b> · исследует новое: ${Math.round(b.eps*100)}% · освоено действий: ${b.coverage}% из ${ACTS.length}<br>Чаще всего выбирают (в скобках — средняя польза): ${top||'копят опыт'}</small></div>`;
}
function panel(S){
 init(S);let W=S.aiWorld;window.__activeGameState=S;let top=[...W.nations].filter(n=>!n.annexed).sort((a,b)=>b.gdp-a.gdp).slice(0,8);
 let wars=W.wars.map(w=>`<div class="mini"><b>⚔️ ${w.a} — ${w.b}</b><br>Контроль фронта: ${Math.round(w.front)}% · месяц войны: ${w.months}<br>Снабжение: ${Math.round(w.supplyA||0)}% / ${Math.round(w.supplyB||0)}% · окружение: ${w.encirclementA||0} / ${w.encirclementB||0}<br>Потери: ${Math.round(w.lossA)} / ${Math.round(w.lossB)}</div>`).join('');
 return `<section class="panel wide"><h2>🌐 Умный мировой ИИ</h2><p class="muted">Государств ИИ: ${W.nations.filter(n=>!n.human).length} · независимых: ${W.nations.filter(n=>!n.annexed).length} · союзов: ${W.alliances.length} · войн: ${W.wars.length} · месяц: ${W.month}</p><div class="row"><button onclick="NationsAI.export('json')">⬇ Экспорт мира JSON</button><button onclick="NationsAI.export('csv')">⬇ Экспорт стран CSV</button></div>${brainPanel(W)}<h3>🏭 Сильнейшие экономики и армии</h3><div class="cards">${top.map(n=>`<div class="mini"><b>${n.name}</b><br><small class="muted">Стратегия: ${n.intent||'развитие экономики'}</small><br>ВВП: ${Math.round(n.gdp).toLocaleString('ru-RU')} · армия: ${Math.round(n.power)}<br>Казна: ${Math.round(n.treasury)} · резервы: ${Math.round(n.manpower)}<br>Мораль: ${Math.round(n.morale)}% · промышленность: ${n.industry.toFixed(1)}</div>`).join('')}</div><h3>⚔️ Военные кампании</h3><div class="cards">${wars||'<p class="muted">Активных войн нет.</p>'}</div><h3>📰 Мировые события</h3><div class="feed">${W.events.slice(0,14).map(e=>`<div>${e}</div>`).join('')||'<span class="muted">Мирная обстановка.</span>'}</div></section>`;
}
window.NationsAI={init,tick,panel,export:exportData,brainStats,ACTS};
})();