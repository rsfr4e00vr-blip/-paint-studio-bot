/* Novaria Grand Diplomacy — shared, reason-based diplomatic rules for AI and single-player UI.
   The multiplayer server mirrors the same cause IDs and thresholds in nations_server.py. */
(function(root){'use strict';
 const C=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

 /* ---- многообластные претензии: строка "Область1|Область2" или "*" = вся страна ---- */
 const CLAIM_SEP='|',claimBase=n=>String(n||'').replace(/ · провинция \d+$/,'').trim();
 const claimToks=s=>{s=String(s||'').trim();if(!s)return[];if(s==='*')return['*'];return[...new Set(s.split(CLAIM_SEP).map(claimBase).filter(Boolean))]};
 const claimStr=a=>{a=[...new Set((a||[]).map(claimBase).filter(Boolean))];if(a.includes('*'))return'*';let s=a.join(CLAIM_SEP);if(s.length>900)s=s.slice(0,900).replace(/\|[^|]*$/,'');return s};
 const claimShort=x=>String(x).replace(/ \(.*\)/,'');
 const claimLabel=s=>{const t=claimToks(s);if(!t.length)return'';if(t[0]==='*')return'вся страна';return t.length<=3?t.map(claimShort).join(', '):t.slice(0,2).map(claimShort).join(', ')+' и ещё '+(t.length-2)};
 const claimHas=(s,n)=>{const t=claimToks(s);return t[0]==='*'||t.includes(claimBase(n))};
 root.ClaimUtil={claimBase,claimToks,claimStr,claimLabel,claimHas};
 const CAUSES={
  territorial:{label:'Территориальные претензии',icon:'🗺',weight:1.0},
  border:{label:'Пограничный конфликт',icon:'🚧',weight:1.15},
  ideology:{label:'Религиозный / идеологический конфликт',icon:'⚖️',weight:.75},
  economic:{label:'Экономический конфликт',icon:'📉',weight:.85},
  security:{label:'Кризис защиты граждан и дипломатической миссии',icon:'🛂',weight:1.0}
 };
 const ORIENTATIONS=['прагматизм','либеральный курс','государственный курс','национальный курс','традиционализм','религиозный курс'];
 const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
 function orientation(n){if(n&&n.ideology)return n.ideology;const k=hash(n&&(n.iso||n.name)||'')%ORIENTATIONS.length;return ORIENTATIONS[k]}
 function ensureWorld(W){
  W.diplomacy=W.diplomacy||{version:1,crises:[],history:[],lastIncident:0};
  const D=W.diplomacy;D.version=1;D.crises=Array.isArray(D.crises)?D.crises:[];D.history=Array.isArray(D.history)?D.history:[];
  (W.nations||[]).forEach(n=>{n.ideology=orientation(n);n.claims=n.claims||{};n.borderCases=n.borderCases||{};n.economicGrievances=n.economicGrievances||{};n.ideologyDisputes=n.ideologyDisputes||{};n.securityCases=n.securityCases||{};n.dipCooldown=Math.max(0,+n.dipCooldown||0)});
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
  if(active(att.claims&&att.claims[def.name],month)){const claim=att.claims[def.name];out.push({id:'territorial',severity:C(claim.severity||65,35,100),region:claim.region||null,detail:claim.detail||(claim.region?`Требование передачи региона «${claimLabel(claim.region)}»`:'Официальная территориальная претензия')});}
  if(active(att.borderCases&&att.borderCases[def.name],month))out.push({id:'border',severity:C(att.borderCases[def.name].severity||60,35,100),detail:att.borderCases[def.name].detail||'Зарегистрированный пограничный инцидент'});
  const ideol=att.ideology&&def.ideology&&att.ideology!==def.ideology;
  if(ideol&&active(att.ideologyDisputes&&att.ideologyDisputes[def.name],month))out.push({id:'ideology',severity:C(att.ideologyDisputes[def.name].severity||48,25,90),detail:`Противостояние: ${att.ideology} — ${def.ideology}`});
  if(active(att.economicGrievances&&att.economicGrievances[def.name],month))out.push({id:'economic',severity:C(att.economicGrievances[def.name].severity||55,25,95),detail:att.economicGrievances[def.name].detail||'Экономическое давление и торговый спор'});
  if(active(att.securityCases&&att.securityCases[def.name],month))out.push({id:'security',severity:C(att.securityCases[def.name].severity||68,40,100),detail:att.securityCases[def.name].detail||'Задержание граждан или нападение на дипломатическую миссию'});
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
  regimeTick(W,A,month,ev);
  // Durable disputes arise from actual policy differences, trade disruption or recorded claims.
  for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++){
   const a=A[i],b=A[j];if(a.annexed||b.annexed||a.war||b.war)continue;
   const ab=relation(a,b),ba=relation(b,a),dist=distanceKm(a,b);
   if(a.ideology!==b.ideology&&Math.min(ab,ba)<-8&&hash(pairKey(a,b)+'ideology')%1000<3){
    a.ideologyDisputes[b.name]=a.ideologyDisputes[b.name]||{severity:48,expires:month+18,detail:`Политическое противостояние: ${a.ideology} и ${b.ideology}`};
    b.ideologyDisputes[a.name]=b.ideologyDisputes[a.name]||{severity:48,expires:month+18,detail:`Политическое противостояние: ${b.ideology} и ${a.ideology}`};
   }
   // AI territorial claims are region-specific and arise only from sustained hostility between nearby states.
   if(dist<1800&&Math.min(ab,ba)<-28&&month%3===0&&hash(pairKey(a,b)+'region-claim')%100<5&&!active(a.claims&&a.claims[b.name],month)){
    const regions=(root.WORLD_SEEDS&&root.WORLD_SEEDS[b.name])||b.regions||[];
    if(regions.length){const idx=hash(pairKey(a,b)+':'+month)%regions.length,region=regions[idx].n||regions[idx].name;
     a.claims[b.name]={severity:68,expires:month+36,created:month,region,detail:`Территориальная претензия на область «${region}»`};
     if(ev)ev(W,`🗺 ${a.name} предъявила ${b.name} претензию на область «${region}».`);
    }
   }
   const trading=(a.tradePartners||[]).includes(b.name)||(b.tradePartners||[]).includes(a.name);
   const sanctions=(a.sanctions||{})[b.name]>(month)||(b.sanctions||{})[a.name]>(month);
   if(sanctions||(trading&&Math.min(ab,ba)<-8&&hash(pairKey(a,b)+'economy')%100<8&&((a.imports||0)>(a.exports||0)*1.2||(b.imports||0)>(b.exports||0)*1.2))){
    a.economicGrievances[b.name]=a.economicGrievances[b.name]||{severity:sanctions?68:52,expires:month+18,detail:sanctions?'Санкции и ограничения торговли':'Спор за рынки и торговые потоки'};
    b.economicGrievances[a.name]=b.economicGrievances[a.name]||{severity:sanctions?68:52,expires:month+18,detail:sanctions?'Санкции и ограничения торговли':'Спор за рынки и торговые потоки'};
   }
   // A border incident is possible only between geographically close, already tense states.
   if(dist<850&&Math.min(ab,ba)<5&&hash(pairKey(a,b)+'border')%100<35&&month%2===0&&Math.random()<.0012){
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
  if(ctx.nnEnabled===false)return (ctx.stage>=3&&(cause.severity||0)>=70?'war':ctx.stage>=2?'ultimatum':ctx.stage>=1?'protest':'negotiate');
  const B=W.brain||(W.brain={});const net=root.NN&&root.NN.get?root.NN.get(B,'dipNN',10,14,5,[.15,.05,-.05,-.1,-.55]):null;
  const rel=C(+n.relations||0,-100,100),ratio=(+n.power||1)/Math.max(1,+target.power||1),severity=(cause.severity||0)/100;
  const x=[rel/100,severity,C(ratio/2,0,1),C((+n.stability||50)/100,0,1),C((+n.treasury||0)/Math.max(1,+n.gdp||1)*4,0,1),C((+n.debt||0)/Math.max(1,+n.gdp||1),0,1),C((+n.exhaustion||0)/100,0,1),C((ctx.stage||0)/3,0,1),C((ctx.allyA||0)/Math.max(1,(+n.power||1)),0,1),C((ctx.allyD||0)/Math.max(1,(+target.power||1)),0,1)];
  if(!net)return (ctx.stage>=3&&severity>.7?'war':ctx.stage>=2?'ultimatum':ctx.stage>=1?'protest':'negotiate');
  net.b2[4]=C(-.9+severity*.85+(ctx.stage||0)*.1+((ctx.warScore||50)-70)/100,-1.1,.5);
  const q=root.NN.predict(net,x),ok=i=>i===0||i===1||i===2&&ctx.stage>=1||i===3&&ctx.stage>=2||i===4&&ctx.stage>=3;
  const k=root.NN.choose(q,ok,C(.08+(ctx.stage>=3?.06:0),.03,.16));
  const names=['negotiate','protest','ultimatum','prepare','war'];
  if(n.dipLast&&n.dipLast.x){const reward=C(((+n.stability||50)-n.dipLast.stability)/18+((+n.gdp||1)-n.dipLast.gdp)/Math.max(1,n.dipLast.gdp)*5,-1.5,1.5);root.NN.train(net,n.dipLast.x,n.dipLast.k,reward+.82*Math.max(...q),.012)}
  n.dipLast={x,k,stability:+n.stability||50,gdp:+n.gdp||1};return names[k]||'negotiate';
 }

 /* ================= ЦЕЛИ ВОЙНЫ: захват территории и смена власти ================= */
 const GOALS={
  tribute:{label:'Давление и контрибуция',icon:'💰',short:'контрибуция'},
  territory:{label:'Захват территории',icon:'🗺',short:'территория'},
  regime:{label:'Смена власти',icon:'🏛',short:'смена власти'}
 };
 const GOAL_IDS=['tribute','territory','regime'];
 function defaultGoal(cause){return cause==='territorial'||cause==='border'?'territory':cause==='ideology'?'regime':'tribute'}
 /* Сменить власть можно только в стране с другим курсом или при очень враждебных отношениях. */
 function goalAllowed(goal,att,def,cause,relations){
  if(!GOALS[goal])return false;
  if(goal!=='regime')return true;
  const a=(att&&att.ideology)||orientation(att||{}),d=(def&&def.ideology)||orientation(def||{});
  return a!==d||(+relations||0)<=-30;
 }
 /* Нейросеть целей: выбирает, чего именно добиваться войной. Правила (goalAllowed) ограничивают допустимое. */
 function chooseGoal(W,n,target,cause,ctx){
  ctx=ctx||{};cause=cause||{};const cid=cause.id||cause;
  const rel=+((ctx.relations!=null)?ctx.relations:(n.relations||0));
  const legal=[true,true,goalAllowed('regime',n,target,cid,rel)];
  const fallback=()=>{const g=defaultGoal(cid);return legal[GOAL_IDS.indexOf(g)]?g:'tribute'};
  if(ctx.nnEnabled===false||!root.NN||!root.NN.get||root.NN.off||!W)return fallback();
  const B=W.brain||(W.brain={}),net=root.NN.get(B,'goalNN',9,12,3,[.05,.12,-.05]);
  const ratio=(+n.power||1)/Math.max(1,+target.power||1),sev=C((cause.severity||60)/100,0,1);
  const diff=((n.ideology||orientation(n))!==(target.ideology||orientation(target)))?1:0;
  const x=[C(rel/100,-1,1),C(ratio/2,0,1.5),diff,sev,cid==='territorial'||cid==='border'?1:0,cid==='ideology'||cid==='security'?1:0,C((+n.stability||50)/100,0,1),C((+target.stability||50)/100,0,1),C((+ctx.warScore||60)/100,0,1)];
  net.b2[1]=C(.12+(cid==='territorial'?.25:0)+(cid==='border'?.12:0),-.3,.5);
  net.b2[2]=C(-.05+(cid==='ideology'?.3:0)+diff*.1+(cid==='security'?.1:0),-.4,.6);
  const q=root.NN.predict(net,x),k=root.NN.choose(q,i=>legal[i],.07);
  n.goalLast={x,k};
  return GOAL_IDS[k]||fallback();
 }
 /* Обучение: цель оценивается по итогу войны (победа с достигнутой целью — награда, поражение — штраф). */
 function goalOutcome(W,n,reward){
  try{
   if(!W||!n||!n.goalLast||!n.goalLast.x||!root.NN)return;
   const net=W.brain&&W.brain.goalNN;if(net)root.NN.train(net,n.goalLast.x,n.goalLast.k,C(reward,-1.5,1.5),.02);
  }catch(e){}
  if(n)n.goalLast=null;
 }
 /* Смена власти в стране-жертве: меняется курс, страна дружит с победителем, но режим держится на лояльности. */
 function applyRegimeChange(W,n,by,month){
  const prev=n.ideology||orientation(n);
  n.regime={by:by.name,month:month,prev:prev,loyalty:62,until:month+60};
  n.ideology=by.ideology||orientation(by);
  n.stability=C((+n.stability||50)-12,5,95);
  n.exhaustion=C((+n.exhaustion||0)-10,0,100);
  n.rivals=n.rivals||{};n.rivals[by.name]=0;
  if(by.rivals)by.rivals[n.name]=0;
  [n.claims,n.borderCases,n.economicGrievances,n.ideologyDisputes,n.securityCases].forEach(m=>{if(m)delete m[by.name]});
  n.cooldown=Math.max(+n.cooldown||0,18);
  if(by.allies&&n.allies&&!n.allies.includes(by.name)&&by.allies.length<5&&n.allies.length<5){n.allies.push(by.name);by.allies.push(n.name)}
  return prev;
 }
 /* Раз в месяц: новый режим может закрепиться или быть свергнут (контрпереворот). */
 function regimeTick(W,A,month,ev){
  (A||[]).forEach(n=>{
   const g=n.regime;if(!g)return;
   const by=A.find(x=>x.name===g.by);
   if(!by||by.annexed||n.annexed){delete n.regime;return}
   const drift=(n.stability>45?.28:-.5)+(by.power>=n.power?.1:-.1)-(n.exhaustion>40?.2:0)-(by.war?.2:0)+(Math.random()*1.1-.6);
   g.loyalty=C(g.loyalty+drift,0,100);
   if(g.loyalty<=8){
    n.ideology=g.prev;n.rivals=n.rivals||{};n.rivals[by.name]=Math.max(n.rivals[by.name]||0,55);if(by.rivals)by.rivals[n.name]=Math.max(by.rivals[n.name]||0,40);
    n.allies=(n.allies||[]).filter(x=>x!==by.name);by.allies=(by.allies||[]).filter(x=>x!==n.name);
    n.stability=C((+n.stability||50)-6,5,95);delete n.regime;
    if(ev)ev(W,`🔥 В ${n.name} свергли правительство, поставленное ${by.name}. Прежний курс восстановлен.`);
  }else if(month>=g.until){delete n.regime;if(ev)ev(W,`🏛 Правительство ${n.name} закрепилось и стало самостоятельным.`)}
  });
 }

 function playerCauses(S,c){
  const G=S.grandDiplomacy||{},out=[];const month=(S.year||0)*12+(S.month||0);
  if(G.claims&&active(G.claims[c.name],month))out.push('territorial');
  if(G.borderCases&&active(G.borderCases[c.name],month))out.push('border');
  const myIdeology=S.ideology||'прагматизм',other=c.ideology||orientation(c);
  if(myIdeology!==other&&(+c.value||0)<=-15)out.push('ideology');
  if(S.sanc&&S.sanc[c.name]&&S.sanc[c.name].left>0)out.push('economic');
  if(G.securityCases&&active(G.securityCases[c.name],month))out.push('security');
  return out;
 }
 function preparePlayerCase(S,c,cause,region){
  const month=(S.year||0)*12+(S.month||0),G=S.grandDiplomacy||(S.grandDiplomacy={version:1,claims:{},borderCases:{}});G.claims=G.claims||{};G.borderCases=G.borderCases||{};G.securityCases=G.securityCases||{};
  if(!CAUSES[cause])return{ok:false,error:'Неизвестное основание.'};
  if(cause==='territorial'){const toks=claimToks(region);if(!toks.length)return{ok:false,error:'Выберите хотя бы одну область, на которую предъявляется претензия.'};const seeds=root.WORLD_SEEDS&&root.WORLD_SEEDS[c.name];if(toks[0]!=='*'&&seeds&&seeds.length){const names=new Set(seeds.map(x=>claimBase(x.n)));if(toks.some(t=>!names.has(t)))return{ok:false,error:'Одна из выбранных областей не принадлежит этой стране.'}}const target=claimStr(toks);G.claims[c.name]={severity:68,expires:month+36,created:month,region:target,regions:toks[0]==='*'?[]:toks,detail:`Официальное требование передачи: ${toks[0]==='*'?'вся страна':claimLabel(target)}`};}
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
  }else if(cause==='security'){
   if((+c.value||0)>-10)return{ok:false,error:'Для консульского кризиса нужны напряжённые отношения (не выше −10).'};
   G.securityCases[c.name]={severity:(+c.value||0)<=-65?88:68,expires:month+24,created:month,detail:'Консульский кризис: задержание граждан, ограничение доступа консулов и угроза дипломатической миссии'};
  }
  return{ok:true};
 }

 function aiPlayerDecision(S,c,n,me){
  if(!n||!S)return{canWar:false};const month=(S.year||0)*12+(S.month||0),W=S.aiWorld||{},D=ensureWorld(W);
  n.claims=n.claims||{};n.borderCases=n.borderCases||{};n.economicGrievances=n.economicGrievances||{};n.ideologyDisputes=n.ideologyDisputes||{};n.securityCases=n.securityCases||{};
  const player={name:S.name||S.me||'Игрок',power:me,gdp:+S.gdp||1,stability:+S.stability||50,treasury:+S.money||0,debt:+S.debt||0,relations:+c.value||0,ideology:S.ideology||'прагматизм'};
  n.rivals=n.rivals||{};n.rivals[player.name]=Math.max(0,-(+c.value||0));
  // A border incident is only possible for nearby states already in a serious dispute.
  if(!active(n.borderCases[player.name],month)&&typeof S._gdNearPlayer==='boolean'&&S._gdNearPlayer&&(+c.value||0)<-28&&month%2===0&&Math.random()<.012){
   n.borderCases[player.name]={severity:78,expires:month+18,detail:'Вооружённый инцидент в приграничной зоне'};
   if(S.feed)S.feed.unshift({t:`🚧 Пограничный инцидент между ${n.name} и ${player.name}: стороны обмениваются обвинениями.`,m:'🚧',d:'Мировая хроника'});
  }
  if((+c.value||0)<-42&&!active(n.claims[player.name],month)&&month%4===0){
   const playerRegions=(S.regions||[]).filter(r=>!r.lost&&!r.enemyOccupied);
   if(playerRegions.length){const chosen=playerRegions[hash(n.name+player.name+month)%playerRegions.length];n.claims[player.name]={severity:68,expires:month+36,created:month,region:chosen.name,detail:`Территориальная претензия на область «${chosen.name}»`};if(S.feed)S.feed.unshift({t:`🗺 ${n.name} предъявила претензию на область «${chosen.name}» государства ${player.name}.`,m:'🗺',d:'Мировая хроника'});}
  }
  if(n.ideology!==player.ideology&&(+c.value||0)<-35)n.ideologyDisputes[player.name]=n.ideologyDisputes[player.name]||{severity:52,expires:month+24,detail:`Идеологическое противостояние: ${n.ideology} — ${player.ideology}`};
  if((c.embargo||0)>month||(S.sanc&&S.sanc[c.name]&&S.sanc[c.name].left>0))n.economicGrievances[player.name]=n.economicGrievances[player.name]||{severity:72,expires:month+24,detail:'Экономические ограничения и санкции'};
  if((+c.value||0)<=-50&&S.embassies&&S.embassies[c.name]&&S.embassies[c.name].monthsLeft>0)n.securityCases[player.name]=n.securityCases[player.name]||{severity:(+c.value||0)<=-70?88:70,expires:month+24,detail:'Консульский конфликт: власти ограничили работу иностранной миссии и доступ к задержанным гражданам'};
  if((+c.value||0)<=-55&&n.embassyExpelledFrom&&n.embassyExpelledFrom.includes(player.name))n.securityCases[player.name]=n.securityCases[player.name]||{severity:88,expires:month+24,detail:'Высылка дипломатического персонала и ограничение консульского доступа'};
  const list=causes(n,player,month);if(!list.length)return{canWar:false};
  let cr=n.playerCrisis;
  const cause=list[0];
  if(!cr||cr.cause!==cause.id||cr.expires<=month)cr=n.playerCrisis={cause:cause.id,detail:cause.detail,severity:cause.severity,created:month,age:0,stage:0,expires:month+24};
  if(cr.lastMonth!==month){cr.age++;cr.lastMonth=month;cr.stage=cr.age>=4?3:cr.age>=2?2:cr.age>=1?1:0}
  const score0=score(n,player,cause,{month,allyA:(n.allies||[]).length*me*.08,allyD:(S.allies||[]).length*me*.12});
  const action=neuralAction(W,n,player,cause,{stage:cr.stage,warScore:score0,nnEnabled:!(S.aiCfg&&S.aiCfg.nn==='off'),allyA:(n.allies||[]).length*me*.08,allyD:(S.allies||[]).length*me*.12});
  return{canWar:action==='war'&&score0>=64&&(cr.stage>=3||cause.severity>=85),action,cause,score:score0,stage:cr.stage};
 }

 root.GrandDiplomacy={CAUSES,GOALS,GOAL_IDS,orientation,ensureWorld,causes,monthly,score,neuralAction,playerCauses,preparePlayerCase,aiPlayerDecision,defaultGoal,goalAllowed,chooseGoal,goalOutcome,applyRegimeChange,regimeTick};
})(typeof window!=='undefined'?window:globalThis);
