/* Novaria Grand Diplomacy — shared, reason-based diplomatic rules for AI and single-player UI.
   The multiplayer server mirrors the same cause IDs and thresholds in nations_server.py. */
(function(root){'use strict';
 const C=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
 const CAUSES={
  territorial:{label:'Территориальные претензии',icon:'🗺',weight:1.0},
  border:{label:'Пограничный конфликт',icon:'🚧',weight:1.15},
  ideology:{label:'Религиозный / идеологический конфликт',icon:'⚖️',weight:.75},
  economic:{label:'Экономический конфликт',icon:'📉',weight:.85}
 };
 const ORIENTATIONS=['прагматизм','либеральный курс','государственный курс','национальный курс','традиционализм','религиозный курс'];
 const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
 function orientation(n){if(n&&n.ideology)return n.ideology;const k=hash(n&&(n.iso||n.name)||'')%ORIENTATIONS.length;return ORIENTATIONS[k]}
 function ensureWorld(W){
  W.diplomacy=W.diplomacy||{version:1,crises:[],history:[],lastIncident:0};
  const D=W.diplomacy;D.version=1;D.crises=Array.isArray(D.crises)?D.crises:[];D.history=Array.isArray(D.history)?D.history:[];
  (W.nations||[]).forEach(n=>{n.ideology=orientation(n);n.claims=n.claims||{};n.borderCases=n.borderCases||{};n.economicGrievances=n.economicGrievances||{};n.ideologyDisputes=n.ideologyDisputes||{};n.dipCooldown=Math.max(0,+n.dipCooldown||0)});
  return D;
 }
 function pairKey(a,b){return [a.name,b.name].sort().join('::')}
 function active(x,month){return !!x&&(+x.expires||0)>month}
 function distanceKm(a,b){
  const wa=root.WORLD&&root.WORLD.map||{};
  if(!root.__GD_COORDS){const idx={};((root.WORLD_DATA&&root.WORLD_DATA.countries)||[]).forEach(c=>{if(c.lat!=null&&c.lon!=null){idx[c.ru]=[+c.lat,+c.lon];idx[c.i]=[+c.lat,+c.lon];idx[c.a]=[+c.lat,+c.lon]}});root.__GD_COORDS=idx}
  const la=wa[a.name]||{},lb=wa[b.name]||{};
  const A=la.lat!=null?[+la.lat,+la.lon]:(root.__GD_COORDS[a.name]||root.__GD_COORDS[a.iso]||null),B=lb.lat!=null?[+lb.lat,+lb.lon]:(root.__GD_COORDS[b.name]||root.__GD_COORDS[b.iso]||null);
  if(!A||!B||!Number.isFinite(A[0])||!Number.isFinite(B[0]))return Infinity;
  const rad=x=>x*Math.PI/180,dl=rad(B[0]-A[0]),dn=rad(B[1]-A[1]);
  const h=Math.sin(dl/2)**2+Math.cos(rad(A[0]))*Math.cos(rad(B[0]))*Math.sin(dn/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
 }
 function causes(att,def,month){
  const out=[];
  if(active(att.claims&&att.claims[def.name],month))out.push({id:'territorial',severity:C(att.claims[def.name].severity||65,35,100),detail:att.claims[def.name].detail||'Официальная территориальная претензия'});
  if(active(att.borderCases&&att.borderCases[def.name],month))out.push({id:'border',severity:C(att.borderCases[def.name].severity||60,35,100),detail:att.borderCases[def.name].detail||'Зарегистрированный пограничный инцидент'});
  const ideol=att.ideology&&def.ideology&&att.ideology!==def.ideology;
  if(ideol&&active(att.ideologyDisputes&&att.ideologyDisputes[def.name],month))out.push({id:'ideology',severity:C(att.ideologyDisputes[def.name].severity||48,25,90),detail:`Противостояние: ${att.ideology} — ${def.ideology}`});
  if(active(att.economicGrievances&&att.economicGrievances[def.name],month))out.push({id:'economic',severity:C(att.economicGrievances[def.name].severity||55,25,95),detail:att.economicGrievances[def.name].detail||'Экономическое давление и торговый спор'});
  return out.sort((a,b)=>b.severity-a.severity);
 }
 function ensureCrisis(D,a,b,cause,month){
  let cr=D.crises.find(x=>x.key===pairKey(a,b)&&x.cause===cause.id&&x.expires>month);
  if(!cr){cr={id:`${month}:${hash(pairKey(a,b)+cause.id)}`,key:pairKey(a,b),a:a.name,b:b.name,cause:cause.id,detail:cause.detail,severity:cause.severity,created:month,age:0,stage:0,expires:month+24,loggedStage:-1};D.crises.push(cr)}
  cr.severity=Math.max(cr.severity,cause.severity);return cr;
 }
 function relation(a,b){return C((a.rivals&&a.rivals[b.name])?-(a.rivals[b.name]):(+a.relations||0),-100,100)}
 function monthly(W,A,month,ev){
  const D=ensureWorld(W);D.crises=D.crises.filter(x=>x.expires>month);
  // Durable disputes arise from actual policy differences, trade disruption or recorded claims.
  for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++){
   const a=A[i],b=A[j];if(a.annexed||b.annexed||a.war||b.war)continue;
   const ab=relation(a,b),ba=relation(b,a),dist=distanceKm(a,b);
   if(a.ideology!==b.ideology&&Math.min(ab,ba)<-8&&hash(pairKey(a,b)+'ideology')%1000<6){
    a.ideologyDisputes[b.name]=a.ideologyDisputes[b.name]||{severity:48,expires:month+18,detail:`Политическое противостояние: ${a.ideology} и ${b.ideology}`};
    b.ideologyDisputes[a.name]=b.ideologyDisputes[a.name]||{severity:48,expires:month+18,detail:`Политическое противостояние: ${b.ideology} и ${a.ideology}`};
   }
   const trading=(a.tradePartners||[]).includes(b.name)||(b.tradePartners||[]).includes(a.name);
   const sanctions=(a.sanctions||{})[b.name]>(month)||(b.sanctions||{})[a.name]>(month);
   if(sanctions||(trading&&Math.min(ab,ba)<-8&&hash(pairKey(a,b)+'economy')%100<8&&((a.imports||0)>(a.exports||0)*1.2||(b.imports||0)>(b.exports||0)*1.2))){
    a.economicGrievances[b.name]=a.economicGrievances[b.name]||{severity:sanctions?68:52,expires:month+18,detail:sanctions?'Санкции и ограничения торговли':'Спор за рынки и торговые потоки'};
    b.economicGrievances[a.name]=b.economicGrievances[a.name]||{severity:sanctions?68:52,expires:month+18,detail:sanctions?'Санкции и ограничения торговли':'Спор за рынки и торговые потоки'};
   }
   // A border incident is possible only between geographically close, already tense states.
   if(dist<850&&Math.min(ab,ba)<5&&hash(pairKey(a,b)+'border')%100<35&&month%2===0&&Math.random()<.0025){
    const sev=C(55+Math.abs(Math.min(ab,ba))*.28+Math.random()*12,55,88);
    a.borderCases[b.name]={severity:sev,expires:month+18,detail:'Вооружённый инцидент в приграничной зоне'};
    b.borderCases[a.name]={severity:sev,expires:month+18,detail:'Вооружённый инцидент в приграничной зоне'};
    if(ev)ev(W,`🚧 Пограничный инцидент между ${a.name} и ${b.name}. Стороны требуют расследования.`);
   }
   causes(a,b,month).forEach(c=>ensureCrisis(D,a,b,c,month));
   causes(b,a,month).forEach(c=>ensureCrisis(D,b,a,c,month));
  }
  D.crises.forEach(cr=>{
   cr.age=Math.max(0,month-cr.created);const stage=cr.age>=4?3:cr.age>=2?2:cr.age>=1?1:0;
   if(stage>cr.stage){cr.stage=stage;if(ev){const txt=stage===1?'дипломатический протест':stage===2?'выдвижение требований и ультиматум':'кризис достиг предвоенной стадии';ev(W,`🌐 ${cr.a} — ${cr.b}: ${txt} (${CAUSES[cr.cause]?.label||cr.cause}).`)}}
  });
  if(D.crises.length>180)D.crises=D.crises.slice(-180);
  return D;
 }
 function score(att,def,cause,ctx){
  ctx=ctx||{};const ratio=(+att.power||1)/Math.max(1,+def.power||1),allyA=+ctx.allyA||0,allyD=+ctx.allyD||0;
  const readiness=C((+att.treasury||0)/Math.max(1,+att.gdp||1)*4,0,1),stability=C((+att.stability||50)/100,0,1),debt=C((+att.debt||0)/Math.max(1,+att.gdp||1),0,2),exhaust=C((+att.exhaustion||0)/100,0,1);
  const strategic=C(Math.log(Math.max(0.2,ratio))/2,-1,1),force=C(((+att.power||1)+allyA)/Math.max(1,(+def.power||1)+allyD),0,2);
  const rel=C(-(+att.relations||0)/100,0,1),severity=C((cause.severity||0)/100,0,1);
  return C(36+severity*24+strategic*15+force*12+readiness*10+stability*8+rel*5-debt*18-exhaust*16-(def.deterUntil&&def.deterUntil>(ctx.month||0)?12:0),0,100);
 }
 function neuralAction(W,n,target,cause,ctx){
  ctx=ctx||{};
  if(ctx.nnEnabled===false)return (ctx.stage>=3&&(cause.severity||0)>=55?'war':ctx.stage>=2?'ultimatum':ctx.stage>=1?'protest':'negotiate');
  const B=W.brain||(W.brain={});const net=root.NN&&root.NN.get?root.NN.get(B,'dipNN',10,14,5,[.15,.05,-.05,-.1,-.55]):null;
  const rel=C(+n.relations||0,-100,100),ratio=(+n.power||1)/Math.max(1,+target.power||1),severity=(cause.severity||0)/100;
  const x=[rel/100,severity,C(ratio/2,0,1),C((+n.stability||50)/100,0,1),C((+n.treasury||0)/Math.max(1,+n.gdp||1)*4,0,1),C((+n.debt||0)/Math.max(1,+n.gdp||1),0,1),C((+n.exhaustion||0)/100,0,1),C((ctx.stage||0)/3,0,1),C((ctx.allyA||0)/Math.max(1,(+n.power||1)),0,1),C((ctx.allyD||0)/Math.max(1,(+target.power||1)),0,1)];
  if(!net)return (ctx.stage>=3&&severity>.55?'war':ctx.stage>=2?'ultimatum':ctx.stage>=1?'protest':'negotiate');
  net.b2[4]=C(-.55+severity*.85+(ctx.stage||0)*.12+((ctx.warScore||50)-60)/100,-.8,.65);
  const q=root.NN.predict(net,x),ok=i=>i===0||i===1||i===2&&ctx.stage>=1||i===3&&ctx.stage>=2||i===4&&(ctx.stage>=3||severity>=.85);
  const k=root.NN.choose(q,ok,C(.08+(ctx.stage>=3?.06:0),.03,.16));
  const names=['negotiate','protest','ultimatum','prepare','war'];
  if(n.dipLast&&n.dipLast.x){const reward=C(((+n.stability||50)-n.dipLast.stability)/18+((+n.gdp||1)-n.dipLast.gdp)/Math.max(1,n.dipLast.gdp)*5,-1.5,1.5);root.NN.train(net,n.dipLast.x,n.dipLast.k,reward+.82*Math.max(...q),.012)}
  n.dipLast={x,k,stability:+n.stability||50,gdp:+n.gdp||1};return names[k]||'negotiate';
 }
 function playerCauses(S,c){
  const G=S.grandDiplomacy||{},out=[];const month=(S.year||0)*12+(S.month||0);
  if(G.claims&&active(G.claims[c.name],month))out.push('territorial');
  if(G.borderCases&&active(G.borderCases[c.name],month))out.push('border');
  const myIdeology=S.ideology||'прагматизм',other=c.ideology||orientation(c);
  if(myIdeology!==other&&(+c.value||0)<=-15)out.push('ideology');
  if(S.sanc&&S.sanc[c.name]&&S.sanc[c.name].left>0)out.push('economic');
  return out;
 }
 function preparePlayerCase(S,c,cause){
  const month=(S.year||0)*12+(S.month||0),G=S.grandDiplomacy||(S.grandDiplomacy={version:1,claims:{},borderCases:{}});G.claims=G.claims||{};G.borderCases=G.borderCases||{};
  if(!CAUSES[cause])return{ok:false,error:'Неизвестное основание.'};
  if(cause==='territorial')G.claims[c.name]={severity:65,expires:month+36,created:month,detail:'Официальная территориальная претензия'};
  else if(cause==='border'){
   if((+c.value||0)>15)return{ok:false,error:'Пограничный кризис возможен только при напряжённых отношениях.'};
   G.borderCases[c.name]={severity:(+c.value||0)<=-60?88:68,expires:month+24,created:month,detail:'Официально зарегистрированный пограничный инцидент'};
  }else if(cause==='ideology'){
   const mine=S.ideology||'прагматизм',theirs=c.ideology||orientation(c);
   if(mine===theirs||(+c.value||0)>-15)return{ok:false,error:'Нет серьёзного идеологического противостояния.'};
   G.ideologyDisputes=G.ideologyDisputes||{};G.ideologyDisputes[c.name]={severity:52,expires:month+24,created:month,detail:`Противостояние: ${mine} — ${theirs}`};
  }else if(cause==='economic'){
   if(!(S.sanc&&S.sanc[c.name]&&S.sanc[c.name].left>0))return{ok:false,error:'Нужны действующие санкции этой страны против вас.'};
   G.economicGrievances=G.economicGrievances||{};G.economicGrievances[c.name]={severity:(S.sanc[c.name].left||0)>=6?86:72,expires:month+24,created:month,detail:'Санкции и экономическое давление'};
  }
  return{ok:true};
 }

 function aiPlayerDecision(S,c,n,me){
  if(!n||!S)return{canWar:false};const month=(S.year||0)*12+(S.month||0),W=S.aiWorld||{},D=ensureWorld(W);
  n.claims=n.claims||{};n.borderCases=n.borderCases||{};n.economicGrievances=n.economicGrievances||{};n.ideologyDisputes=n.ideologyDisputes||{};
  const player={name:S.name||S.me||'Игрок',power:me,gdp:+S.gdp||1,stability:+S.stability||50,treasury:+S.money||0,debt:+S.debt||0,relations:+c.value||0,ideology:S.ideology||'прагматизм'};
  n.rivals=n.rivals||{};n.rivals[player.name]=Math.max(0,-(+c.value||0));
  // A border incident is only possible for nearby states already in a serious dispute.
  if(!active(n.borderCases[player.name],month)&&typeof S._gdNearPlayer==='boolean'&&S._gdNearPlayer&&(+c.value||0)<-28&&month%2===0&&Math.random()<.012){
   n.borderCases[player.name]={severity:78,expires:month+18,detail:'Вооружённый инцидент в приграничной зоне'};
   if(S.feed)S.feed.unshift({t:`🚧 Пограничный инцидент между ${n.name} и ${player.name}: стороны обмениваются обвинениями.`,m:'🚧',d:'Мировая хроника'});
  }
  if(n.ideology!==player.ideology&&(+c.value||0)<-35)n.ideologyDisputes[player.name]=n.ideologyDisputes[player.name]||{severity:52,expires:month+24,detail:`Идеологическое противостояние: ${n.ideology} — ${player.ideology}`};
  if((c.embargo||0)>month||(S.sanc&&S.sanc[c.name]&&S.sanc[c.name].left>0))n.economicGrievances[player.name]=n.economicGrievances[player.name]||{severity:72,expires:month+24,detail:'Экономические ограничения и санкции'};
  const list=causes(n,player,month);if(!list.length)return{canWar:false};
  let cr=n.playerCrisis;
  const cause=list[0];
  if(!cr||cr.cause!==cause.id||cr.expires<=month)cr=n.playerCrisis={cause:cause.id,detail:cause.detail,severity:cause.severity,created:month,age:0,stage:0,expires:month+24};
  if(cr.lastMonth!==month){cr.age++;cr.lastMonth=month;cr.stage=cr.age>=4?3:cr.age>=2?2:cr.age>=1?1:0}
  const score0=score(n,player,cause,{month,allyA:(n.allies||[]).length*me*.08,allyD:(S.allies||[]).length*me*.12});
  const action=neuralAction(W,n,player,cause,{stage:cr.stage,warScore:score0,nnEnabled:!(S.aiCfg&&S.aiCfg.nn==='off'),allyA:(n.allies||[]).length*me*.08,allyD:(S.allies||[]).length*me*.12});
  return{canWar:action==='war'&&score0>=64&&(cr.stage>=3||cause.severity>=85),action,cause,score:score0,stage:cr.stage};
 }

 root.GrandDiplomacy={CAUSES,orientation,ensureWorld,causes,monthly,score,neuralAction,playerCauses,preparePlayerCase,aiPlayerDecision};
})(typeof window!=='undefined'?window:globalThis);
