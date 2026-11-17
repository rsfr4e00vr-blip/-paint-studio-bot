/* Мультиплеер «Симулятор государства» — клиент.
   Игра считается в браузере (game.js), сервер задаёт общие часы, очки и дипломатию. */
(()=>{
'use strict';
const NG=window.NG;if(!NG)return;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GOAL_LABEL={tribute:'💰 Цель: давление и контрибуция',territory:'🗺 Цель: захват территории',regime:'🏛 Цель: смена власти'};
const defGoal=c=>c==='territorial'||c==='border'?'territory':c==='ideology'?'regime':'tribute';
const goalSelectHtml=(pid,def)=>`<select data-goal="${pid}">${Object.keys(GOAL_LABEL).map(k=>`<option value="${k}" ${k===def?'selected':''}>${GOAL_LABEL[k]}</option>`).join('')}</select>`;
document.addEventListener('change',ev=>{const t=ev.target;if(t&&t.matches&&t.matches('select[data-cause]')){const g=document.querySelector(`select[data-goal="${t.dataset.cause}"]`);if(g)g.value=defGoal(t.value)}});
const fmt=n=>Math.round(n).toLocaleString('ru-RU');
const SPEEDS={slow:['Медленно · 10 с/мес',10],normal:['Обычно · 6 с/мес',6],fast:['Быстро · 3,5 с/мес',3.5]};
const LENGTHS={short:'Короткая · 10 лет',normal:'Обычная · 15 лет',long:'Долгая · 20 лет'};
const DIFFS={story:'История',easy:'Лёгкая',normal:'Нормальная',hard:'Сложная',expert:'Эксперт'};
const IDEOLOGIES={'прагматизм':'Прагматизм','либеральный курс':'Либеральный курс','государственный курс':'Государственный курс','национальный курс':'Национальный курс','традиционализм':'Традиционализм','религиозный курс':'Религиозный курс'};
const SKEY='novariaMPSession';
/* Профиль/сессия: sessionStorage принадлежит вкладке, localStorage — запасной вариант.
   Раньше две вкладки одного браузера делили одну сессию и получали одну и ту же страну. */
const sget=k=>{try{const v=sessionStorage.getItem(k);if(v!=null)return v}catch(e){}return localStorage.getItem(k)};
const sset=(k,v)=>{try{sessionStorage.setItem(k,v)}catch(e){}try{localStorage.setItem(k,v)}catch(e){}};
const sdel=k=>{try{sessionStorage.removeItem(k)}catch(e){}try{localStorage.removeItem(k)}catch(e){}};
const LKEY=(c)=>'novariaMP:'+c+':'+(typeof me!=='undefined'&&me&&me.id?me.id:'');

const AIO={aggr:{calm:'спокойный',normal:'обычный',high:'агрессивный',extreme:'беспощадный'},nn:{off:'выключена',std:'обычная',fast:'быстро учится'},ars:{none:'нет (страны вырабатывают и покупают сами)',small:'небольшой запас'}};
const aiv=()=>Object.assign({aggr:'normal',nn:'std',ars:'none'},room.ai||{});
let lastReportSentAt=0,lastProvinceReportSig="";
let ws=null,me={id:null,host:false},room={code:'',state:'idle',players:[],month:0,length:180,speed:'normal',diff:'normal',host:null};
let standings=[],mods={},wars=[],relations={},relationPrograms={},embassies={},claims={},borderCases={},ideologyCases={},securityCases={},warGrounds={},feed=[],chat=[],active=false,sentElim=false,lastTick=0,view='setup',finalData=null,pending=null,warArm=null,peaceOffer=null,retry=0,leaving=false;
const orig={};
let tg=window.Telegram&&Telegram.WebApp;if(tg){try{tg.ready();tg.expand()}catch(e){}}

/* ---------- каркас интерфейса ---------- */
const bar=document.createElement('div');bar.id='mpbar';
const hdr=document.querySelector('header');(hdr?hdr.parentNode:document.body).insertBefore(bar,hdr?hdr.nextSibling:document.body.firstChild);
bar.style.cssText='margin:10px auto 0;max-width:1226px;width:calc(100% - 24px)';
const modal=document.createElement('div');modal.id='mpModal';document.body.appendChild(modal);
const prop=document.createElement('div');prop.id='mpProp';document.body.appendChild(prop);
const tabs=$('#tabs');if(tabs){const b=document.createElement('button');b.dataset.tab='mp';b.textContent='🌍 Мультиплеер';b.className='nav-main';const np=tabs.querySelector('.sub[data-cat="main"]');if(np)np.insertBefore(b,np.firstChild);else tabs.insertBefore(b,tabs.firstChild)}
['play','pause','stop','step','speed'].forEach(id=>{const e=$('#'+id);if(e)orig[id]=e.onclick||e.onchange});

/* ---------- сеть ---------- */
function send(o){if(ws&&ws.readyState===1){ws.send(JSON.stringify(o));return true}return false}
function connect(code,opts){
  opts=opts||{};code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
  if(code.length<3){note('Введите код комнаты','warn');return}
  closeWs();leaving=false;
  const proto=location.protocol==='https:'?'wss':'ws';
  ws=new WebSocket(`${proto}://${location.host}/ws/nations/${encodeURIComponent(code)}`);
  const sess=opts.rejoin?JSON.parse(sget(SKEY)||'null'):null;
  ws.onopen=()=>{retry=0;send({type:'join',name:val('#mpName')||(sess&&sess.name)||'Игрок',country:val('#mpCountry')||(sess&&sess.country)||'Новария',ideology:val('#mpIdeology')||(sess&&sess.ideology)||'прагматизм',token:sess?sess.token:'',rejoin:!!opts.rejoin})};
  ws.onmessage=e=>{try{on(JSON.parse(e.data))}catch(err){console.error(err)}};
  ws.onclose=()=>{if(leaving||!room.code)return;if(active||room.state==='lobby'){setBar();if(retry<6){retry++;setTimeout(()=>{if(!leaving)connect(room.code,{rejoin:true})},1500*retry)}else note('Соединение потеряно. Обновите страницу.','warn')}};
  ws.onerror=()=>{};
}
function closeWs(){if(ws){const w=ws;ws=null;try{w.onclose=null;w.close()}catch(e){}}}
function val(s){const e=$(s);return e?e.value.trim():''}
setInterval(()=>send({type:'ping',t:Date.now()}),25000);

function on(m){
  switch(m.type){
  case'joined':
    me.id=m.id;me.host=!!m.host;Object.assign(room,pick(m));wars=m.wars||[];relations=m.relations||{};relationPrograms=m.relation_programs||{};embassies=m.embassies||{};claims=m.claims||{};borderCases=m.border_cases||{};ideologyCases=m.ideology_cases||{};securityCases=m.security_cases||{};warGrounds=m.war_grounds||{};if(NG.syncMPTerritories)NG.syncMPTerritories(m.territories||{});
    sset(SKEY,JSON.stringify({code:room.code,token:m.id,name:val('#mpName')||(JSON.parse(sget(SKEY)||'{}').name)||'Игрок',country:val('#mpCountry')||(JSON.parse(sget(SKEY)||'{}').country)||'Новария',ideology:val('#mpIdeology')||(JSON.parse(sget(SKEY)||'{}').ideology)||'прагматизм'}));
    if(room.state==='lobby'){view='lobby';active=false;paintModal();openModal()}
    else{resume()}
    setBar();break;
  case'lobby':Object.assign(room,pick(m));me.host=room.host===me.id;
    if(room.state==='lobby'&&modal.classList.contains('open'))paintModal();setBar();paintAll();break;
  case'state':if(m.ars)arsStock=m.ars;if(m.factories||m.factory_builds)NG.applyFactoryState({factories:m.factories||[],builds:m.factory_builds||[],ars:m.ars||{},money:m.money,steel:m.steel,fuel:m.fuel,energy:m.energy});if(m.sect)syncIdp({h:m.sect});Object.assign(room,pick(m));mods=m.mods||mods;wars=m.wars||wars;relations=m.relations||relations;relationPrograms=m.relation_programs||relationPrograms;embassies=m.embassies||embassies;claims=m.claims||claims;borderCases=m.border_cases||borderCases;ideologyCases=m.ideology_cases||ideologyCases;securityCases=m.security_cases||securityCases;warGrounds=m.war_grounds||warGrounds;if(NG.syncMPTerritories)NG.syncMPTerritories(m.territories||{});if(NG.S)NG.S.globalCrisis=m.global_crisis?{...m.global_crisis,response:m.crisis_response?1:null}:null;if(m.global_next!=null)NG.S.globalNext=m.global_next;catchUp();setBar();paintAll();break;
  case'start':startGame(m);break;
  case'standings':standings=Array.isArray(m.standings)?m.standings:standings;paintAll();setBar();break;
  case'war_orders':wars=Array.isArray(m.wars)?m.wars:wars;syncMpWars();NG.render(true);paintAll();break;
  case'war_state':wars=Array.isArray(m.wars)?m.wars:[];syncMpWars();NG.render(true);paintAll();break;
  case'territory_change':if(NG.syncMPTerritories)NG.syncMPTerritories(m.territories||{});if(m.region&&m.region!=='*')NG.log(`🗺 Граница изменилась: ${m.from} → ${m.to}, область «${m.region}».`);paintAll();break;
  case'ars_paid':addMoney(-m.amount);if(m.ars){arsStock=m.ars;Object.keys(m.ars).forEach(k=>{if(NG.S&&k in NG.S)NG.S[k]=m.ars[k]})}NG.log(m.text||'Арсенал');note('💸 '+(m.text||'Арсенал'),'war');afterEffect();break;
  case'ars_result':if(m.ars){arsStock=m.ars;Object.keys(m.ars).forEach(k=>{if(NG.S&&k in NG.S)NG.S[k]=m.ars[k]})}NG.log(m.text);NG.say(`Залп: попало ${m.landed}, сбито ПВО ${m.stopped}`,'💥');NG.toast(`💥 Попало ${m.landed}/${m.landed+m.stopped} · экономика врага на ${m.gdp_factor}%`);note(m.text,'war');afterEffect();break;
  case'factory_state':arsStock=m.ars||arsStock;NG.applyFactoryState(m);paintAll();break;
  case'war_attack':{const incoming=m.to_id===me.id,enemy=incoming?m.from_country:m.to_country;NG.log(`${incoming?'⚠️ По нам ударили':'🎯 Наш удар'}: ${m.weapon} → ${m.region_name}${m.down?' · сбито ПВО':''}${m.factory_damage?(m.factory_damage.destroyed?' · завод уничтожен':' · завод повреждён'):''}`);NG.showWarAttack({enemy,rev:incoming,k:m.weapon,regId:m.region_id,down:!!m.down,title:incoming?`⚠️ ${m.from_country} атакует ${m.region_name}`:`🎯 Наш удар по ${m.to_country}`,sub:`${m.weapon} · попаданий ${m.landed}, сбито ${m.stopped}${m.factory_damage?` · ${m.factory_damage.name} ${m.factory_damage.destroyed?'уничтожен':'повреждён'}`:''}`});paintAll();break;}
  case'eco_strike':applyEcoStrike(m);break;
  case'idp_sync':syncIdp(m);break;
  case'mp_adjust':if(NG.S){NG.S.money=Math.max(0,NG.S.money+(Number(m.money)||0));NG.S.approval=NG.clamp(NG.S.approval+(Number(m.approval)||0));NG.S.tech=NG.clamp((NG.S.tech||0)+(Number(m.tech)||0));['fuel','inflation','trust','stability','food','health','steel','gdp'].forEach(k=>{if(Number.isFinite(Number(m[k]))&&m[k]!==undefined)NG.S[k]=k==='gdp'?Math.max(100,NG.S[k]+Number(m[k])):k==='health'?Math.min(35,Math.max(0,(Number(NG.S[k])||0)+Number(m[k]))):NG.clamp((Number(NG.S[k])||0)+Number(m[k]))});if(m.crisis_response&&NG.S.globalCrisis)NG.S.globalCrisis.response=1;saveLocal();NG.render(true);paintAll()}break;
  case'tick':onTick(m);relations=m.relations&&m.relations[me.id]||relations;relationPrograms=m.relation_programs&&m.relation_programs[me.id]||relationPrograms;embassies=m.embassies&&m.embassies[me.id]||embassies;claims=m.claims&&m.claims[me.id]||claims;borderCases=m.border_cases&&m.border_cases[me.id]||borderCases;ideologyCases=m.ideology_cases&&m.ideology_cases[me.id]||ideologyCases;securityCases=m.security_cases&&m.security_cases[me.id]||securityCases;warGrounds=m.war_grounds&&m.war_grounds[me.id]||warGrounds;paintAll();break;
  case'diplomacy_state':claims=m.claims||claims;borderCases=m.border_cases||borderCases;ideologyCases=m.ideology_cases||ideologyCases;securityCases=m.security_cases||securityCases;warGrounds=m.war_grounds||warGrounds;paintDip();break;
  case'relations':relations=m.relations&&m.relations[me.id]||relations;paintDip();break;
  case'embassies':embassies=m.embassies&&m.embassies[me.id]||embassies;paintDip();break;
  case'relation_programs':relationPrograms=m.relation_programs&&m.relation_programs[me.id]||relationPrograms;paintDip();break;
  case'pp_update':if(NG.S){NG.S.pp=Number(m.pp)||0;saveLocal();afterEffect()}break;
  case'paused':room.state=m.value?'paused':'running';note(m.value?'⏸ Хозяин комнаты поставил игру на паузу':'▶ Игра продолжается','info');setBar();break;
  case'notice':note(m.text,m.kind,true);break;
  case'chat':chat.push(m);chat=chat.slice(-60);paintChat();break;
  case'proposal':showProposal(m);break;
  case'aid_out':addMoney(-m.amount);NG.log(`Помощь стране ${m.to}: −${fmt(m.amount)} млн`);note(`💸 Отправлено ${fmt(m.amount)} млн → ${m.to}`,'dip');afterEffect();break;
  case'aid_in':addMoney(m.amount);NG.log(`Помощь от ${m.from}: +${fmt(m.amount)} млн`);NG.say(`${m.from} прислал нам помощь!`,'🤝');note(`💰 Получено ${fmt(m.amount)} млн от ${m.from}`,'dip');afterEffect();break;
  case'war_start':{
    if(Array.isArray(m.wars))wars=m.wars;
    if(m.relations)relations=m.relations;if(m.claims)claims=m.claims;if(m.war_grounds)warGrounds=m.war_grounds;
    syncMpWars();
    NG.log(`⚔️ Война с ${m.enemy}${m.aggressor?'':' (на нас напали)'}${m.cause_label?` · основание: ${m.cause_label}`:''}${m.reason?` · ${m.reason}`:''}`);
    NG.say(m.aggressor?`Мы объявили войну: ${m.enemy}`:`${m.enemy} напал на нас!`,m.aggressor?'⚔️':'😱');
    if(!m.aggressor){const S=NG.S;S.approval=NG.clamp(S.approval+2)}afterEffect();break;
  }
  case'war_cost':{const S=NG.S;S.army=Math.max(5000,S.army-m.army_loss);addMoney(-m.money);S.approval=NG.clamp(S.approval-m.approval);S.morale=NG.clamp(S.morale-.4);S.threat=NG.clamp(S.threat+1);break}
  case'war_end':if(NG.S)NG.S.mpWars=[];endWar(m);break;
  case'war_won':wrModal(m.winner?`🏆 Победа над ${m.enemy}!`:`🏳 Поражение от ${m.enemy}`,m.winner?'Враг разгромлен. Выберите, что сделать со страной (контрибуция, вассал, область, смена власти, захват), во вкладке «Мультиплеер». Времени на выбор сколько угодно — контрибуция сама не начислится.':'Вас разгромили. Победитель сам решает, как закончить войну; бои прекращены.');break;
  case'dictate_open':NG.toast(`💪 Перевес на фронте против ${m.enemy}! Выберите условия во вкладке «Мультиплеер»`);note(`💪 Можно диктовать условия: ${m.enemy}`,'war');paintAll();break;
  case'cede_request':cedeRegion(m);break;
  case'region_gain':gainLand(m);break;
  case'vassal_tax_set':note(`💰 ${m.side==='lord'?'Вы установили':'Сюзерен установил'} дань ${m.rate}% для ${m.country}`,'dip');paintAll();break;
  case'vassal_revolt':note(`⚠️ ${m.country} вышел из вассалитета!`,'warn');paintAll();break;
  case'regime_change':regimeChange(m);break;
  case'annexed':{const S=NG.S;S.campaignOver=true;NG.log(`🏴 Наша страна полностью захвачена: ${m.by}`);NG.say('Страна захвачена…','😢');note(`🏴 ${m.by} захватил вашу страну. Вы наблюдаете за игрой.`,'warn');afterEffect();break}
  case'peace_offer':peaceOffer=m;showProposal({id:'peace',what:'peace',text:`${m.from} предлагает мир.`,ttl:30});break;
  case'final':finalData=m;view='final';active=false;paintModal();openModal();setBar();break;
  case'error':note(m.text,'warn');if(m.fatal){sdel(SKEY);room={code:'',state:'idle',players:[],month:0,length:180,speed:'normal',diff:'normal',host:null};active=false;view='setup';setBar();paintModal()}break;
  }
}
function pick(m){const o={};['code','state','host','month','length','speed','diff','ai','players'].forEach(k=>{if(m[k]!==undefined)o[k]=m[k]});return o}

/* ---------- игровой процесс ---------- */
function startGame(m){
  const sess=JSON.parse(sget(SKEY)||'{}');
  Object.assign(room,{state:'running',diff:m.diff,length:m.length,speed:m.speed,month:0,players:m.players});
  NG.begin(m.diff,sess.country||'Новария',m.ai);NG.S.mpMonth=0;NG.S.mpFlat=0;
  enterMP();sentElim=false;standings=m.players;mods={};wars=[];feed=[];lastTick=Date.now();
  closeModal();NG.setTab('mp');report(true);saveLocal();setBar();
  note('🌍 Игра началась! У каждой страны — свой ВВП, валюта и курс.','info');
}
function resume(){
  const raw=localStorage.getItem(LKEY(room.code));
  if(!raw){note('Локальное сохранение этой игры не найдено','warn');sdel(SKEY);closeWs();return}
  try{NG.load(JSON.parse(raw))}catch(e){note('Не удалось восстановить игру','warn');return}
  enterMP();sentElim=!!NG.S.campaignOver;lastTick=Date.now();closeModal();NG.setTab('mp');
  send({type:'sync'});
}
function enterMP(){
  lastProvinceReportSig="";active=true;document.body.classList.add('mp');
  ['play','pause','stop','step'].forEach(id=>{const e=$('#'+id);if(e)e.onclick=()=>NG.toast('В мультиплеере время идёт одновременно у всех')});
  if(typeof window.resetGame==='function'){orig.reset=orig.reset||window.resetGame;window.resetGame=()=>NG.toast('В мультиплеере нельзя начать заново')}
  if(typeof window.importSave==='function'){orig.imp=orig.imp||window.importSave;window.importSave=()=>NG.toast('В мультиплеере загрузка сохранений отключена')}
}
function leaveMP(){
  lastProvinceReportSig="";leaving=true;active=false;document.body.classList.remove('mp');
  ['play','pause','stop','step'].forEach(id=>{const e=$('#'+id);if(e)e.onclick=orig[id]});
  const sp=$('#speed');if(sp)sp.onchange=orig.speed;
  if(orig.reset)window.resetGame=orig.reset;if(orig.imp)window.importSave=orig.imp;
  if(room.code)localStorage.removeItem(LKEY(room.code));
  sdel(SKEY);closeWs();
  room={code:'',state:'idle',players:[],month:0,length:180,speed:'normal',diff:'normal',host:null};
  standings=[];mods={};wars=[];relations={};relationPrograms={};embassies={};claims={};borderCases={};ideologyCases={};securityCases={};warGrounds={};feed=[];chat=[];peaceOffer=null;finalData=null;view='setup';
  NG.end();setBar();closeModal();prop.classList.remove('open');
}
/* Мои войны из данных сервера → экономика клиента: ВВП падает, курс валюты слабеет (логика в game.js: S.mpWars) */
function syncMpWars(){
  const S=NG.S;if(!S)return;
  S.mpWars=(wars||[]).filter(w=>w&&(w.a===me.id||w.d===me.id)).map(w=>({mp:true,id:w.id,p:w.a===me.id?+w.p||0:100-(+w.p||0),months:w.m||0,encirclement:0}));
  S.war=!!((S.wars&&S.wars.length)||(S.mpWars&&S.mpWars.length)||S.martial);
}
function applyMods(){
  const md=mods[me.id];const S=NG.S;if(!md){S.mpFlat=S.mpFlat||0;return}
  const base=NG.income()-(S.mpFlat||0);S.mpFlat=Math.round(base*md.total);
}
function onTick(m){
  if(!active)return;
  const S=NG.S;const serverMonth=Number(m.month)||0;room.month=Math.max(Number(room.month)||0,serverMonth);room.length=m.length;standings=m.standings;mods=m.mods||mods;wars=m.wars||[];relations=m.relations&&m.relations[me.id]||relations;if(m.mp_diplomacy&&m.mp_diplomacy[me.id])S.mpDiplomacy=m.mp_diplomacy[me.id];lastTick=Date.now();
  // Серверный месяц — единственный источник времени. Повторный пакет tick
  // не должен заставлять один клиент прожить лишний месяц.
  const miss=Math.max(0,Math.min(240,serverMonth-(Number(S.mpMonth)||0)));S.globalCrisis=m.global_crisis?{...m.global_crisis,response:m.crisis_responses&&m.crisis_responses[me.id]?1:null}:null;if(m.global_next!=null)S.globalNext=m.global_next;syncMpWars();
  for(let i=0;i<miss;i++){applyMods();NG.tick();S.mpMonth=(S.mpMonth||0)+1;if(S.campaignOver)break}
  S.mpMonth=Math.max(Number(S.mpMonth)||0,serverMonth);
  if(S.campaignOver&&!sentElim){sentElim=true;send({type:'eliminated'});note('💀 Ваша кампания окончена. Вы наблюдаете за игрой.','warn')}
  report(true);saveLocal();setBar();paintAll();
}
function catchUp(){
  if(!active)return;const S=NG.S;const miss=Math.max(0,Math.min(240,room.month-(S.mpMonth||0)));syncMpWars();
  for(let i=0;i<miss;i++){applyMods();NG.tick();S.mpMonth=(S.mpMonth||0)+1;if(S.campaignOver)break}
  S.mpMonth=Math.max(S.mpMonth||0,room.month);
  if(miss>0)NG.toast(`Пока вас не было, прошло ${miss} мес.`);
  if(S.campaignOver&&!sentElim){sentElim=true;send({type:'eliminated'})}
  report(true);saveLocal();
}
function report(force=false){
  const S=NG.S;if(!S||!active)return;
  const nowAt=Date.now();if(!force&&nowAt-lastReportSentAt<500)return;lastReportSentAt=nowAt;
  let power=1;try{power=NG.warPower(null)}catch(e){}
  const mapRows=window.NOVARIA_MAP_REGIONS&&window.NOVARIA_MAP_REGIONS(S.me||S.name),provinceRows=(mapRows&&mapRows.length?mapRows:(S.regions||[]).map((r,i)=>({id:r.geo||r.id||'',name:r.name||('Область '+(i+1))}))).filter(r=>r.id&&r.name).slice(0,3000),provinceSig=provinceRows.map(r=>r.id+':'+r.name).join('|');
  const packet={type:'report',out:!!S.out,rep:{gdp:S.gdp,money:S.money,debt:S.debt,infl:S.inflation,rate:S.cbRate??5,stab:S.stability,appr:S.approval,legit:S.legitimacy,trust:S.trust==null?70:S.trust,power,pop:S.pop,income:NG.income(),res:NG.resIndex?NG.resIndex():70,pvo:S.aa||0,pp:S.pp||0,infra:window.NovaSystems?NovaSystems.totals(S).health:100,infra_critical:window.NovaSystems?NovaSystems.totals(S).critical:100,infra_count:window.NovaSystems?NovaSystems.totals(S).count:0,cities:(S.regions||[]).filter(r=>r.city).length,steel:S.steel||0,fuel:S.fuel||0,energy:S.energy||0,ars:Object.fromEntries(Object.keys(ARSW).map(k=>[k,Math.max(0,Math.min(30,Math.floor(S[k]||0)))]))},factories:S.milFactories||[],factory_builds:S.factoryBuilds||[]};
  if(force||provinceSig!==lastProvinceReportSig){packet.regions=provinceRows;lastProvinceReportSig=provinceSig}send(packet);
}
function saveLocal(){try{localStorage.setItem(LKEY(room.code),JSON.stringify(NG.S))}catch(e){}}
function addMoney(d){const S=NG.S;if(d>=0)S.money+=d;else{const n=-d;if(S.money>=n)S.money-=n;else{S.debt+=n-S.money;S.money=0}}}
/* ---- Сеть взаимозависимостей и стратегический арсенал (сервер считает урон по отраслям) ---- */
let arsStock={drone:0,rocket:0,cruise:0,bomber:0};
const ARSW={cannon:['💥','Пушка',300],drone:['🛩','Ударный дрон',250],tank:['🛡','Танк',450],howitzer:['🔫','Гаубица',380],rocket:['🚀','Ракета',600],mlrs:['🎇','РСЗО',650],cruise:['🛰','Крылатая ракета',800],bomber:['🛫','Бомбардировщик',1100]};
function syncIdp(m){const S=NG.S;if(!S||!window.InterDep)return;const I=InterDep.of(S);if(m.h)Object.keys(m.h).forEach(k=>{if(InterDep.KEYS.indexOf(k)>=0)I.h[k]=+m.h[k]});if(m.ars)arsStock=m.ars;S._idpSync=S.year*12+S.month}
function applyEcoStrike(m){const S=NG.S;if(!S||!window.InterDep)return;syncIdp({h:m.h});const I=InterDep.of(S);I.hits=(I.hits||0)+1;
  const cut=S.gdp*(m.gdp_drop||0)*.5;S.gdp=Math.max(100,S.gdp-cut);S.inflation=NG.clamp(S.inflation+(m.gdp_drop||0)*8,0,100);S.stability=NG.clamp(S.stability-(m.gdp_drop||0)*6,0,100);
  const nm=InterDep.NAMES[m.main]||m.main;NG.log(`💥 ${m.from} ударил по отрасли «${nm}»: попало ${m.landed}, −${Math.round(m.pts)} п. Цепочка поставок просела, ВВП −${(cut/Math.max(1,S.gdp+cut)*100).toFixed(1)}%.`);
  NG.say(`${m.from}: удар по отрасли «${nm}»`,'💥');NG.toast(`💥 ${m.from} бьёт по отрасли «${nm}»`);note(`💥 ${m.from} ударил по вашей отрасли «${nm}»`,'war');afterEffect()}
function arsPanel(w,enemyId){
  if(!window.InterDep)return '';
  const T=InterDep.TARGETS,sect=(w.sect&&w.sect[enemyId])||null,aw=window.__mpArsW||'cruise',an=window.__mpArsN||3,regions=(w.regions&&w.regions[enemyId])||[],selectedRegion=window.__mpArsRegion||((regions[0]&&regions[0].id)||'');
  const stock=Object.keys(ARSW).map(k=>`<span class="chip">${ARSW[k][0]} ${ARSW[k][1]}: <b>${arsStock[k]||0}</b></span>`).join('');
  const buy=Object.keys(ARSW).map(k=>`<button data-arsbuy="${k}">${ARSW[k][0]} +1 <small>${ARSW[k][2]} млн</small></button><button data-arsbuy="${k}" data-n="5">×5</button>`).join('');
  const tg=InterDep.TKEYS.map(t=>`<button class="danger" data-arstarget="${t}">${T[t].n}</button>`).join('');
  const chain=sect?InterDep.panel({idp:{h:sect}},'🕸 Экономика врага: куда бить арсеналом'):'';
  return `<div class="mini"><b>💥 Стратегический арсенал — выбить экономику врага</b><small class="muted2">Всё в экономике связано: удар по энергосети гасит топливо, транспорт, сталь, заводы и оборонку, а следом падают ВВП и курс. ПВО врага сбивает часть ударов и режет ущерб. Один залп в месяц. Запас хранится на сервере.</small><div class="chips">${stock}</div><div class="actions">${buy}</div><div class="row"><select id="mpArsW">${Object.keys(ARSW).map(k=>`<option value="${k}" ${k===aw?'selected':''}>${ARSW[k][0]} ${ARSW[k][1]}</option>`).join('')}</select><select id="mpArsN">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${n===an?'selected':''}>Залп ×${n}</option>`).join('')}</select></div><div class="row"><label>Область для удара</label><select id="mpArsRegion">${regions.map(r=>`<option value="${esc(r.id)}" ${r.id===selectedRegion?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div><small class="muted2">Куда бить по экономике:</small><div class="actions">${tg}</div>${chain}</div>`;
}
function myChainPanel(){const S=NG.S;if(!S||!window.InterDep)return '';return `<div class="mini">${InterDep.panel(S,'🕸 Моя экономика: цепочка отраслей',{repair:true})}</div>`}
const _rsGame=window.repairSector;window.repairSector=function(){if(active&&room.state==='running'){send({type:'ars_repair'});return}return _rsGame&&_rsGame()};
function wrModal(t,p){const o=document.getElementById('mpwrm');if(o)o.remove();const d=document.createElement('div');d.id='mpwrm';d.className='ccm';d.style.zIndex=60;d.innerHTML=`<div class="ccbox"><h3>${t}</h3><p>${p}</p><div class="actions"><button class="primary" onclick="this.closest('.ccm').remove()">Понятно</button></div></div>`;document.body.appendChild(d)}
function endWar(m){
  const S=NG.S;addMoney(m.money);S.approval=NG.clamp(S.approval+m.approval);S.stability=NG.clamp(S.stability+m.stability);
  const t={win:`🏆 Победа над ${m.enemy}`,lose:`🏳 Поражение от ${m.enemy}`,draw:`🕊 Ничья с ${m.enemy}`,peace:`🕊 Мир с ${m.enemy}`}[m.result]||'Война окончена';
  NG.log(`${t}${m.money?` (${m.money>0?'+':''}${fmt(m.money)} млн)`:''}`);NG.say(t,m.result==='win'?'🎉':m.result==='lose'?'😢':'🕊');NG.toast(t);wrModal(t,`${m.result==='win'?'Условия мира выбраны.':m.result==='lose'?'Мир заключён на условиях противника.':'Война окончена.'}${m.money?` Деньги: ${m.money>0?'+':''}${fmt(m.money)} млн.`:''} Одобрение ${m.approval>=0?'+':''}${m.approval}, стабильность ${m.stability>=0?'+':''}${m.stability}.`);afterEffect();
}
function regimeChange(m){
  const S=NG.S;if(!S)return;
  if(m.side==='loser'){S.ideology=m.ideology;S.stability=NG.clamp(S.stability-4);NG.log(`🏛 В нашей стране сменилась власть: ${m.by} поставила правительство (${m.prev} → ${m.ideology}).`);NG.say('Власть в стране сменилась…','🏛');note(`🏛 Власть в нашей стране сменена: курс «${m.ideology}». Опека ${m.by} действует до месяца ${m.until}.`,'war')}
  else if(m.side==='winner'){NG.log(`🏛 В ${m.country} к власти пришло дружественное правительство (${m.ideology}). Остерегайтесь контрпереворота.`);NG.say('Мы сменили власть в '+m.country,'🏛');note(`🏛 В ${m.country} сменилась власть: теперь там дружественное правительство.`,'war')}
  else if(m.side==='coup'){S.ideology=m.ideology;NG.log(`🔥 В нашей стране свергли правительство, поставленное страной ${m.by}. Прежний курс восстановлен.`);NG.say('Контрпереворот: власть вернулась','🔥');note('🔥 Контрпереворот: прежний политический курс восстановлен.','war')}
  else if(m.side==='coup_lord'){NG.log(`🔥 В ${m.country} свергли поставленное вами правительство.`);note(`🔥 В ${m.country} произошёл контрпереворот против поставленного вами правительства.`,'war')}
  afterEffect();
}
function cedeRegion(m){
  const S=NG.S,cands=S.regions.filter(r=>!r.captured&&r.name!=='Столица');
  if(S.regions.length<=3||!cands.length){send({type:'cede',none:true});NG.log('Нечего отдавать — вместо области выплачена контрибуция');return}
  cands.sort((a,b)=>(b.unrest-b.loyalty*.3)-(a.unrest-a.loyalty*.3));const r=cands[0],share=Math.min(.3,r.pop/S.pop*.8);
  send({type:'cede',region:{name:r.name,pop:r.pop,wealth:r.wealth,industry:r.industry,infra:r.infra,resource:r.resource}});
  NG.loseRegion(r.name,share);NG.log(`🗺 Область «${r.name}» передана государству ${m.country}`);NG.say(`Мы потеряли область ${r.name}`,'😢');note(`🗺 Потеряна область «${r.name}» (отдана ${m.country})`,'war');afterEffect();
}
function gainLand(m){
  const r=m.region;NG.gainRegion(r);
  const t=m.kind==='annex'?`🏴 Страна ${m.from} полностью захвачена: население +${fmt(r.pop)}, ВВП +${fmt(r.gdp)}`:`🗺 Получена область «${r.name}»: население +${fmt(r.pop)}, ВВП +${fmt(r.gdp)}`;
  NG.log(t+'. Она показана на карте.');NG.say(m.kind==='annex'?'Мы захватили целую страну!':'Мы отняли область у врага!','🎉');note(t,'war');
  afterEffect();NG.toast(t+' — смотрите карту на вкладке «Обзор»');
}
function afterEffect(){report(true);saveLocal();NG.render(true);paintAll()}

/* ---------- уведомления ---------- */
function note(t,kind,fromServer){
  feed.unshift({t,kind:kind||'info',m:room.month});feed=feed.slice(0,40);
  if(!fromServer||kind==='war'||kind==='warn')NG.toast(t);
  paintFeed();
}
function showProposal(m){
  prop.innerHTML=`<div>${esc(m.text)}</div><div class="mprow"><button class="good" id="mpAcc">Принять</button><button id="mpDec">Отклонить</button></div>`;
  prop.classList.add('open');clearTimeout(showProposal.t);showProposal.t=setTimeout(()=>prop.classList.remove('open'),(m.ttl||30)*1000);
  $('#mpAcc').onclick=()=>{prop.classList.remove('open');if(m.what==='peace')send({type:'peace',accept:true});else send({type:'answer',id:m.id,accept:true})};
  $('#mpDec').onclick=()=>{prop.classList.remove('open');if(m.what!=='peace')send({type:'answer',id:m.id,accept:false})};
}

/* ---------- панель сверху ---------- */
function myRank(){const i=standings.findIndex(p=>p.id===me.id);return i<0?null:i+1}
function setBar(){
  if(!room.code){bar.className='';bar.innerHTML=`<span class="grow">🌍 Играйте с друзьями: у каждого своя страна, общее время и таблица очков</span><button class="primary" id="mpOpen">Мультиплеер</button>`;$('#mpOpen').onclick=()=>{view='setup';paintModal();openModal()};return}
  if(room.state==='lobby'){bar.className='';bar.innerHTML=`<span class="grow">🌍 Комната <b>${esc(room.code)}</b> · ожидание игроков (${room.players.length})</span><button id="mpOpen">Открыть</button>`;$('#mpOpen').onclick=()=>{view='lobby';paintModal();openModal()};return}
  const r=myRank(),mine=standings.find(p=>p.id===me.id),left=Math.max(0,Math.ceil((SPEEDS[room.speed]||[0,6])[1]-(Date.now()-lastTick)/1000));
  bar.className='live';
  bar.innerHTML=`<span class="grow">🌍 <b>${esc(room.code)}</b> · мес. <b>${room.month}/${room.length}</b>${r?` · место <b>${r}/${standings.length}</b>`:''}${mine?` · очки <b>${mine.score}</b>`:''}${room.state==='paused'?' · ⏸ пауза':room.state==='running'?` · ⏱ ${left}с`:''}</span><button id="mpOpen">Игроки</button>`;
  $('#mpOpen').onclick=()=>NG.setTab('mp');
}
setInterval(()=>{if(active&&room.state==='running')setBar()},1000);

/* ---------- окно лобби ---------- */
function openModal(){modal.classList.add('open')}
function closeModal(){modal.classList.remove('open')}
function paintModal(){
  if(view==='setup'){
    const sess=JSON.parse(sget('nmpProfile')||'{}'),sp=new URLSearchParams(location.search),pre=(sp.get('room')||'').toUpperCase();
    modal.innerHTML=`<div class="mpbox"><h2>🌍 Мультиплеер</h2><p class="muted2">2–6 игроков. У каждого своя страна: свой ВВП, своя валюта и курс. Время идёт одновременно, побеждает тот, у кого больше очков в конце.</p>
<label>Ваше имя</label><input id="mpName" maxlength="24" value="${esc(sess.name||tgName()||'')}" placeholder="Имя игрока">
<label>Ваша страна</label><input id="mpCountry" list="mpCountries" maxlength="28" autocomplete="off" value="${esc(sess.country||'')}" placeholder="Выберите из списка: Россия, Китай, Бразилия…"><datalist id="mpCountries">${countryOptions()}</datalist><div id="mpCountryHint" class="mp-hint"></div>
<label>Идеология государства</label><select id="mpIdeology">${Object.entries(IDEOLOGIES).map(([k,v])=>`<option value="${k}" ${(sess.ideology||'прагматизм')===k?'selected':''}>${v}</option>`).join('')}</select>
<div class="mprow"><button class="primary" id="mpCreate">Создать комнату</button></div>
<label>Или войти по коду</label><div class="mprow"><input id="mpCode" maxlength="8" value="${esc(pre)}" placeholder="КОД"><button id="mpJoin">Войти</button></div>
<div class="mprow"><button id="mpClose">Закрыть</button></div></div>`;
    $('#mpCreate').onclick=()=>go(randCode());$('#mpJoin').onclick=()=>go(val('#mpCode'));$('#mpClose').onclick=closeModal;
    $('#mpCode').oninput=e=>e.target.value=e.target.value.toUpperCase();
    const mc=$('#mpCountry');if(mc){mc.oninput=paintCountryHint;mc.onchange=paintCountryHint;paintCountryHint()}
  }else if(view==='lobby'){
    const host=me.host,link=`${location.origin}/game?room=${room.code}`;
    modal.innerHTML=`<div class="mpbox"><h2>Комната</h2><div class="mpcode" id="mpCodeBig">${esc(room.code)}</div>
<div class="mprow"><button id="mpCopy">📋 Скопировать ссылку</button>${navigator.share?'<button id="mpShare">Поделиться</button>':''}</div>
<h3>Игроки (${room.players.length}/6)</h3>${room.players.map(p=>`<div class="mpplayer"><span>${p.id===room.host?'👑':'👤'}</span><span class="nm"><b>${esc(p.country)}</b><br><small>${esc(p.name)}${p.id===me.id?' · это вы':''} · ${IDEOLOGIES[p.ideology]||'Прагматизм'}</small></span><span>${p.ready?'✅':'⏳'}</span></div>`).join('')}
${host?`<label>Скорость времени</label><select id="mpSpeed">${Object.keys(SPEEDS).map(k=>`<option value="${k}" ${room.speed===k?'selected':''}>${SPEEDS[k][0]}</option>`).join('')}</select>
<label>Длительность</label><select id="mpLen">${Object.keys(LENGTHS).map(k=>`<option value="${k}" ${room.length===({short:120,normal:180,long:240})[k]?'selected':''}>${LENGTHS[k]}</option>`).join('')}</select>
<label>Сложность (одинакова для всех)</label><select id="mpDiff">${Object.keys(DIFFS).map(k=>`<option value="${k}" ${room.diff===k?'selected':''}>${DIFFS[k]}</option>`).join('')}</select><label>Агрессия ИИ-стран (одинакова для всех)</label><select id="mpAiA">${Object.keys(AIO.aggr).map(k=>`<option value="${k}" ${aiv().aggr===k?'selected':''}>${AIO.aggr[k]}</option>`).join('')}</select><label>Нейросеть ИИ</label><select id="mpAiN">${Object.keys(AIO.nn).map(k=>`<option value="${k}" ${aiv().nn===k?'selected':''}>${AIO.nn[k]}</option>`).join('')}</select><label>Стартовый арсенал ИИ</label><select id="mpAiR">${Object.keys(AIO.ars).map(k=>`<option value="${k}" ${aiv().ars===k?'selected':''}>${AIO.ars[k]}</option>`).join('')}</select>`
:`<p class="muted2">Скорость: ${SPEEDS[room.speed][0]} · ${room.length/12} лет · сложность: ${DIFFS[room.diff]}<br>ИИ-страны: агрессия — ${AIO.aggr[aiv().aggr]}, нейросеть — ${AIO.nn[aiv().nn]}, арсенал — ${AIO.ars[aiv().ars]}</p>`}
<div class="mprow">${host?`<button class="primary" id="mpStart" ${room.players.length<2?'disabled':''}>▶ Начать игру</button>`:`<button class="good" id="mpReady">Я готов</button>`}<button class="danger" id="mpLeave">Выйти</button></div>
${host&&room.players.length<2?'<p class="muted2">Нужно минимум 2 игрока.</p>':''}</div>`;
    $('#mpCopy').onclick=()=>{copy(link);NG.toast('Ссылка скопирована')};
    const sh=$('#mpShare');if(sh)sh.onclick=()=>navigator.share({title:'Симулятор государства',text:`Играем вместе! Код комнаты: ${room.code}`,url:link}).catch(()=>{});
    if(host){const up=()=>send({type:'settings',speed:val('#mpSpeed'),length:val('#mpLen'),diff:val('#mpDiff'),ai:{aggr:val('#mpAiA'),nn:val('#mpAiN'),ars:val('#mpAiR')}});['#mpSpeed','#mpLen','#mpDiff','#mpAiA','#mpAiN','#mpAiR'].forEach(s=>$(s).onchange=up);$('#mpStart').onclick=()=>send({type:'start'})}
    else $('#mpReady').onclick=()=>send({type:'ready',value:true});
    $('#mpLeave').onclick=leaveMP;
  }else if(view==='final'&&finalData){
    const f=finalData.standings,w=f[0];
    modal.innerHTML=`<div class="mpbox"><h2>🏁 Игра окончена</h2><p>Победитель: <b>${esc(w.country)}</b> (${esc(w.name)}) — ${w.score} очк.</p>${table(f)}<div class="mprow"><button class="primary" id="mpFin">Выйти в одиночную игру</button><button id="mpStay">Остаться и посмотреть</button></div></div>`;
    $('#mpFin').onclick=leaveMP;$('#mpStay').onclick=()=>{closeModal();NG.setTab('mp')};
  }
}

/* ---------- страна игрока: реальная страна = своя валюта, курс, ВВП ---------- */
function countryOptions(){try{const l=(window.WORLD&&WORLD.list)||[];return l.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'ru')).map(c=>`<option value="${esc(c.name)}">`).join('')}catch(e){return''}}
function curRate(i){const r=Number(i.rate)||0;return r>=1000?fmt(r):r>=100?r.toFixed(1):r>=10?r.toFixed(2):r.toFixed(4)}
function paintCountryHint(){const e=$('#mpCountryHint'),v=val('#mpCountry');if(!e)return;
  const i=NG.countryInfo&&v?NG.countryInfo(v):null;
  if(!v){e.className='mp-hint';e.innerHTML='Страна определяет ВВП, население, валюту и её курс. У каждого игрока — свои.';return}
  if(!i){e.className='mp-hint warn';e.innerHTML='🧪 Такой страны нет в списке — будет вымышленная «'+esc(v)+'» с валютой «новарийский талер».';return}
  e.className='mp-hint ok';e.innerHTML=`<b>${esc(i.key)}</b> · 💱 ${esc(i.curName)} (<b>${esc(i.cur)}</b>) · 1 ${esc(i.ref)} = <b>${curRate(i)}</b> ${esc(i.cur)} · 📈 стартовый ВВП ≈ <b>${fmt(i.gdp)}</b> млн · 👥 ${i.pop>=1?i.pop.toFixed(i.pop>=10?0:1)+' млн':Math.round(i.pop*1000)+' тыс.'}`}
/* моя экономика прямо в «Быстром доступе»: ВВП и курс именно моей страны */
function myEcoChips(){const S=NG.S;if(!S)return'';let fx='';try{const F=S.fx;if(F&&F.cur)fx=`<span class="chip">💱 1 ${esc(F.ref)} = <b>${curRate({rate:F.rate})}</b> ${esc(F.cur)}</span>`}catch(e){}
  return `<span class="chip">🏳 <b>${esc(S.name||'')}</b></span>${fx}<span class="chip">📈 ВВП <b>${fmt(S.gdp)}</b> млн</span><span class="chip">👥 ${((S.pop||0)/1e6).toFixed(1)} млн</span><span class="chip">🏗 Инфраструктура <b>${Math.round(window.NovaSystems?NovaSystems.totals(S).health:100)}%</b></span>`}
function tgName(){const u=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;return u&&u.first_name||''}
function randCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<5;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function go(code){
  const n=val('#mpName'),c=val('#mpCountry');
  if(!n){note('Введите имя','warn');return}
  if(!c){note('Введите название страны','warn');return}
  const ideology=val('#mpIdeology')||'прагматизм';sset('nmpProfile',JSON.stringify({name:n,country:c,ideology}));connect(code);
}
function copy(t){try{navigator.clipboard.writeText(t)}catch(e){const i=document.createElement('input');i.value=t;document.body.appendChild(i);i.select();document.execCommand('copy');i.remove()}}

/* ---------- вкладка «Мультиплеер» ---------- */
function table(list){
  return `<div style="overflow:auto"><table><tr><th>#</th><th>Страна</th><th>Очки</th><th>ВВП</th><th>Мощь</th><th>Стаб.</th><th>Инфра.</th><th>Инфляция</th><th>Ставка ЦБ</th></tr>${list.map((p,i)=>`<tr class="${p.id===me.id?'me':''}"><td>${i+1}</td><td><b>${esc(p.country)}</b>${p.eliminated?' 💀':p.out?' 🪧':''}${p.connected===false?' 📴':''}${curTag(p.country)}<br><span class="muted2">${esc(p.name)}</span><br>${chips(p.comp)}</td><td><b>${p.score}</b></td><td>${fmt(p.gdp)}</td><td>${p.power}</td><td>${p.stab}%</td><td>${Number(p.infra??100).toFixed(0)}%</td><td>${Number(p.infl??0).toFixed(1)}%</td><td>${Number(p.rate??5).toFixed(1)}%</td></tr>`).join('')}</table></div>`;
}
function curTag(c){try{const i=NG.countryInfo&&NG.countryInfo(c);return i?` <span class="chip" title="${esc(i.curName)}">💱 ${esc(i.cur)}</span>`:''}catch(e){return''}}
function chips(c){if(!c)return'';const n={eco:'Эко',welfare:'Нар.',gov:'Упр.',fin:'Фин.',mil:'Арм.'};return Object.keys(n).map(k=>`<span class="chip">${n[k]} ${c[k]}</span>`).join('')}
window.NGMP={
  buildFactory(type,regionName){const S=NG.S;if(!S)return;const r=(S.regions||[]).find(x=>x.name===regionName);if(!r||!(r.geo||r.id))return NG.toast('Не удалось определить область на карте');report(true);send({type:'factory_build',factory:type,region:r.geo||r.id})},
  setWarCommand(region,troops,air,navy){send({type:'war_command',region:String(region||'').slice(0,60),troops:Number(troops)||0,air,navy})},
  setWarPreset(preset){const S=NG.S;if(!S)return;const P={assault:[.70,'support','escort','recon','convoys'],balanced:[.40,'support','escort','recon','repair'],defense:[.50,'patrol','escort','recon','repair'],economy:[.20,'reserve','reserve','reserve','repair'],pressure:[.25,'strategic','blockade','recon','convoys']}[preset];if(!P)return;send({type:'war_command',preset,troops:Math.floor(Math.max(0,S.army||0)*P[0]),air:P[1],navy:P[2],spec:P[3],logi:P[4],alloc:preset==='defense'?'spread':'focus'})},
  setVassalTax(id,rate){send({type:'vassal_tax',vassal:id,rate:Number(rate)})},
  saveLocal(){saveLocal()},
  reportState(){report(false)},
  respondGlobalCrisis(){send({type:'global_response'})},
  tab(){
    if(!room.code)return `<section class="panel"><h2>🌍 Мультиплеер</h2><p>Вы не в комнате.</p><button class="primary" onclick="NGMP.open()">Создать или войти</button></section>`;
    if(room.state==='lobby')return `<section class="panel"><h2>🌍 Комната ${esc(room.code)}</h2><p>Игра ещё не началась.</p><button class="primary" onclick="NGMP.open()">Открыть лобби</button></section>`;
    return `<div class="mpwrap">${NG.missionsHtml?NG.missionsHtml():''}<section class="panel"><h2>🧭 Быстрый доступ к функциям государства</h2><p class="muted2">Эти системы работают и в сетевой партии: закупки, экономика, армия, ПВО, карта и дипломатия.</p><div class="mprow mpquick"><button onclick="NG.setTab('autobuy')">🤖 Автозакупки</button><button onclick="NG.setTab('economy')">💰 Экономика</button><button onclick="NG.setTab('industry')">🏭 Военные заводы</button><button onclick="NG.setTab('military')">🛡 Армия и ПВО</button><button onclick="NG.setTab('diplomacy')">🌐 Дипломатия мира</button><button onclick="NG.setTab('politics')">🏛 Политика</button><button onclick="NG.setTab('intelligence')">🕵 Разведка</button><button onclick="NG.setTab('worldtension')">🌍 Мировые события</button><button onclick="NG.setTab('map')">🗺 Карта и регионы</button><button onclick="NG.setTab('market')">🛒 Рынок</button></div><div id="mpMyEco" class="qa-chips"></div><div id="mpAutoSummary" class="muted2"></div></section><section class="panel" id="mpStand"></section><section class="panel" id="mpWars"></section><section class="panel" id="mpMods"></section><section class="panel"><h2>Дипломатия игроков</h2><p class="muted2">По умолчанию все игроки нейтральны. Чужая война не втягивает остальные страны автоматически.</p><div class="mpdip" id="mpDip"></div></section><section class="panel"><h2>Чат</h2><div class="mpchat" id="mpChatLog"></div><div class="row"><input id="mpChatIn" maxlength="200" placeholder="Сообщение игрокам"><button id="mpChatSend">➤</button></div></section><section class="panel"><h2>События мира</h2><div class="mpfeed" id="mpFeed"></div></section>${me.host?`<section class="panel"><button id="mpPause">${room.state==='paused'?'▶ Продолжить':'⏸ Пауза'}</button> <button class="danger" id="mpLeave2">Покинуть игру</button></section>`:`<section class="panel"><button class="danger" id="mpLeave2">Покинуть игру</button></section>`}</div>`;
  },
  after(){
    if(!room.code||room.state==='lobby')return;
    const c=$('#mpChatIn');if(c){const s=()=>{const t=c.value.trim();if(t){send({type:'chat',text:t});c.value=''}};$('#mpChatSend').onclick=s;c.onkeydown=e=>{if(e.key==='Enter')s()}}
    const p=$('#mpPause');if(p)p.onclick=()=>send({type:'pause'});
    const l=$('#mpLeave2');if(l)l.onclick=()=>{if(l.dataset.arm){leaveMP()}else{l.dataset.arm=1;l.textContent='Точно выйти? Нажмите ещё раз';setTimeout(()=>{if(l){delete l.dataset.arm;l.textContent='Покинуть игру'}},3000)}};
    const d=$('#mpDip');if(d)d.onclick=dipClick;
    const mm=$('#mpMods');if(mm)mm.onclick=ev=>{const ab=ev.target.closest('button[data-arsbuy]');if(ab){send({type:'ars_buy',weapon:ab.dataset.arsbuy,n:+(ab.dataset.n||1)});return}
    const at=ev.target.closest('button[data-arstarget]');if(at){const sw=$('#mpArsW'),sn=$('#mpArsN'),sr=$('#mpArsRegion');window.__mpArsW=sw?sw.value:'cruise';window.__mpArsN=sn?+sn.value:3;window.__mpArsRegion=sr?sr.value:'';report(true);send({type:'ars_strike',weapon:window.__mpArsW,target:at.dataset.arstarget,count:window.__mpArsN,region:window.__mpArsRegion});return}const wm=ev.target.closest('button[data-warmap]');if(wm){const ww=wars.find(x=>x.a===me.id||x.d===me.id);if(ww&&NG.showWarAttackHistory)NG.showWarAttackHistory(ww,wm.dataset.warmap,me.id);return}
    const preset=ev.target.closest('button[data-preset]');if(preset){let v=preset.dataset.preset;if(v==='auto'){const S=NG.S,ww=wars.find(x=>x.a===me.id||x.d===me.id),front=ww?(ww.a===me.id?ww.p:100-ww.p):50;v=S.money<500||S.fuel<25||S.ammo<25||S.food<25||S.morale<35?'defense':front<35?'balanced':'assault'}window.NGMP.setWarPreset(v);return}const b=ev.target.closest('button[data-term]');if(!b||b.disabled)return;const t=b.dataset.term;if(t==='annex'||t==='region'||t==='regime'){if(b.dataset.arm){send({type:'dictate',mode:t})}else{b.dataset.arm=1;const o=b.textContent;b.textContent='Точно? Нажмите ещё раз';setTimeout(()=>{b.dataset.arm='';b.textContent=o},3000)}}else send({type:'dictate',mode:t})};
    paintAll();
  },
  open(){view=room.state==='lobby'?'lobby':'setup';paintModal();openModal()}
};
function paintWars(){
  const e=$('#mpWars');if(!e)return;
  if(!wars.length){e.innerHTML='<h2>⚔️ Войны комнаты</h2><p class="muted2">Активных войн между игроками пока нет. Боты не могут объявлять локальные войны в сетевой партии.</p>';return}
  const name=id=>(standings.find(p=>p.id===id)||room.players.find(p=>p.id===id)||{}).country||'Неизвестная страна';
  e.innerHTML='<h2>⚔️ Войны комнаты · общий статус для всех игроков</h2>'+wars.map(w=>{
    const a=name(w.a),d=name(w.d),p=Math.max(0,Math.min(100,Number(w.p)||0));
    return `<div class="mini"><b>${esc(a)} ⚔️ ${esc(d)}</b><div class="warbar"><i style="width:${p}%"></i></div><div class="muted2">Перевес агрессора: <b>${Math.round(p)}%</b> · ${esc(w.goal_label||'Цель не указана')} · месяц войны ${Number(w.m)||0}</div>${w.reason?`<small class="muted2">Основание: ${esc(w.reason)}</small>`:''}</div>`
  }).join('');
}
function paintAll(){if(NG.getTab()!=='mp'||!active&&room.state==='lobby')return;paintStand();paintWars();paintMods();paintDip();paintChat();paintFeed();paintAutoSummary() }
function paintAutoSummary(){const me2=$('#mpMyEco');if(me2&&NG.S)me2.innerHTML=myEcoChips();const e=$('#mpAutoSummary');if(!e||!NG.S)return;const a=NG.S.autoPurchase||{},items=a.items||{},on=Object.keys(items).filter(k=>items[k]&&items[k].on);e.innerHTML=`<b>Автозакупки:</b> ${a.enabled?'включены':'выключены'} · ${on.length?`товары: ${on.map(esc).join(', ')}`:'товары не выбраны'} <button onclick="NG.setTab('autobuy')">Настроить</button>`}
function paintStand(){const e=$('#mpStand');if(!e)return;const list=standings.length?standings:room.players;e.innerHTML=`<h2>🏆 Таблица очков · месяц ${room.month}/${room.length}</h2>${table(list)}<p class="muted2">Очки: экономика 36%, народ 20%, управление 14%, финансы 14%, армия 16%. Состояние инфраструктуры учитывается в благосостоянии; её разрушение снижает доход и очки. Рост ВВП в зачёте ограничен сервером.</p>`}
function pct(v){return(v>0?'+':v<0?'−':'')+Math.abs(Math.round(v*1000)/10)+'%'}
function relationTier(v){return v>=80?'🌟 стратегический партнёр':v>=60?'🤝 близкий партнёр':v>=35?'🙂 дружелюбные отношения':v>=10?'🕊 партнёрский диалог':v>-10?'😐 нейтралитет':v>-35?'🧊 напряжённые отношения':v>-60?'⚠️ недружественные отношения':'😠 враждебные отношения'}
function paintMods(){
  const e=$('#mpMods');if(!e)return;const md=mods[me.id]||{pact:0,sanction:0,rubber:0,total:0},S=NG.S;
  const w=wars.find(x=>x.a===me.id||x.d===me.id);let wh='';
  if(w){const enemyId=(w.a===me.id?w.d:w.a),enemy=(standings.find(p=>p.id===enemyId)||{}).country||'противник',mine=w.a===me.id?w.p:100-w.p;const iWon=w.won===me.id,theyWon=w.won&&w.won!==me.id,can=mine>=60||iWon,aggr=w.a===me.id,regFront=(w.goal==='territory'&&aggr)?60:70,reg=mine>=regFront||iWon,regimeOk=w.goal==='regime'&&aggr&&(mine>=60||iWon);
    wh=`<h3>⚔️ Война с ${esc(enemy)}</h3><div class="warbar"><i style="width:${mine}%"></i></div><div class="muted2">Ваш перевес на фронте: <b>${mine}%</b> · месяц войны ${w.m}/24 · каждый месяц: −казна, −армия, −одобрение</div>`+
    `<div class="chips"><span class="chip">🎯 Цель войны: ${esc(w.goal_label||'—')}${w.claim_region?` («${esc(w.claim_region)}»)`:''}</span><span class="chip">📉 Индекс ВВП врага: ${w.econ&&w.econ[enemyId]?Math.round(w.econ[enemyId].gdp):100}% от довоенного</span><span class="chip">💱 Индекс курса врага: ${w.econ&&w.econ[enemyId]?Math.round(w.econ[enemyId].fx):100}% от довоенного</span></div>`+
    arsPanel(w,enemyId)+`<div class="mini"><b>🗺 Карта боевых ударов</b><small class="muted2">На карте можно посмотреть последние удары по областям с обеих сторон.</small><div class="actions"><button data-warmap="out">🎯 Наши удары</button><button data-warmap="in">🛡 Удары по нам</button></div>${(w.attacks||[]).slice(0,6).map(x=>`<small class="muted2">${x.from_id===me.id?'🎯 Наш удар':'⚠️ Удар врага'}: ${esc(x.weapon)} → ${esc(x.region_name)}${x.down?' · сбито ПВО':''}</small>`).join('')||'<small class="muted2">Боевых ударов пока не было.</small>'}</div>`+`<div class="mini"><b>📋 Военный штаб — быстрые планы</b><small class="muted2">Активный план: ${(w.orders&&w.orders[me.id]&&w.orders[me.id].preset)||'не выбран'}</small><div class="actions"><button class="danger" data-preset="assault">⚔ Наступление</button><button data-preset="balanced">⚖ Баланс</button><button data-preset="defense">🛡 Оборона</button><button data-preset="economy">💰 Экономия</button><button data-preset="pressure">📉 Давление на экономику</button><button class="primary" data-preset="auto">✨ Автоподбор</button></div><div class="row"><input id="mpWarRegion" maxlength="60" placeholder="Область назначения" value="${esc((w.orders&&w.orders[me.id]&&w.orders[me.id].region)||'')}" /><input id="mpWarTroops" type="number" min="0" max="1000000" step="1000" placeholder="Солдаты" value="${(w.orders&&w.orders[me.id]&&w.orders[me.id].troops)||0}" /></div><div class="row"><select id="mpWarAir"><option value="support">Авиация: поддержка</option><option value="patrol">Авиация: патруль</option><option value="defense">🛡 ПВО: оборона</option><option value="reserve">Авиация: резерв</option></select><select id="mpWarNavy"><option value="escort">Флот: снабжение</option><option value="blockade">Флот: блокада</option><option value="reserve">Флот: резерв</option></select><button class="primary" id="mpWarPlan">📌 Передать ручной приказ</button></div><small class="muted2">Приказы проверяются сервером и сразу видны обеим сторонам. Наступление сильнее, но дороже; экономия слабее, зато дешевле.</small></div>`+
    (theyWon?`<p><b>🏳 Вы разгромлены.</b> Противник выбирает условия (время не ограничено).</p>`:
    `<p class="muted2">${iWon?`🏆 Полная победа! Вы решаете, чем закончить войну (время не ограничено):`:can?'💪 Перевес! Вы решаете, чем закончить войну:':`Условия можно диктовать при перевесе от 60%, область — от ${regFront}%, захват страны — при полной победе.${w.goal==='regime'&&aggr?' Цель войны — смена власти: доступна от 60%.':''}`}</p>
    <div class="row"><button class="good" data-term="tribute" ${can?'':'disabled'}>💰 Контрибуция</button><button class="primary" data-term="vassal" ${can?'':'disabled'}>👑 Вассал (24 мес.)</button><button class="danger" data-term="region" ${reg?'':'disabled'}>${w.goal==='territory'&&aggr?'🗺 Захватить территорию':'🗺 Отнять область'}</button>${w.goal==='regime'&&aggr?`<button class="danger" data-term="regime" ${regimeOk?'':'disabled'}>🏛 Сменить власть</button>`:''}<button class="danger" data-term="annex" ${iWon?'':'disabled'}>🏴 Захватить страну</button></div>`)}
  const myVassals=standings.filter(q=>q.vassal_of===me.id);
  const vassalUI=myVassals.length?`<h3>👑 Управление вассалами</h3>${myVassals.map(q=>`<div class="mini"><b>${esc(q.country)}</b><p class="muted2">Текущая дань: ${q.vassal_tax??10}% · высокая дань повышает риск восстания</p><label>Доля дохода: <b id="vt-${q.id}">${q.vassal_tax??10}%</b></label><input type="range" min="0" max="40" step="1" value="${q.vassal_tax??10}" oninput="document.getElementById('vt-${q.id}').textContent=this.value+'%'" onchange="window.NGMP.setVassalTax('${q.id}',this.value)"><small class="muted2">0% — вассал почти не платит; 40% — больше доход, но риск отделения значительно выше.</small></div>`).join('')}`:'';
  e.innerHTML=`<h2>📊 Моя экономика в мультиплеере</h2><div>${[['📜 Торговые пакты',md.pact],['⛔ Санкции',md.sanction],['👑 Вассалитет',md.vassal||0],['⚖️ Баланс (догоняющий бонус / бремя лидера)',md.rubber]].map(x=>`<span class="chip ${x[1]>0?'good':x[1]<0?'bad':''}">${x[0]} ${pct(x[1])}</span>`).join('')}</div><p class="muted2">Итоговая поправка к доходу: <b>${pct(md.total)}</b> (${S.mpFlat>0?'+':''}${fmt(S.mpFlat||0)} млн/мес). Последний в таблице получает до +5%, лидер платит до −3%.</p>${vassalUI}${myChainPanel()}${wh}${S.campaignOver?'<p><b>💀 Ваша кампания окончена — вы наблюдатель.</b></p>':S.out?'<p><b>🪧 Вы в оппозиции: очки ×0,6, пока не вернётесь к власти.</b></p>':''}`;
  const plan=$('#mpWarPlan');if(plan)plan.onclick=()=>window.NGMP.setWarCommand(val('#mpWarRegion'),val('#mpWarTroops'),val('#mpWarAir'),val('#mpWarNavy'));
}
function paintDip(){
  const e=$('#mpDip');if(!e)return;const S=NG.S,list=(standings.length?standings:room.players).filter(p=>p.id!==me.id);
  const myWar=wars.find(x=>x.a===me.id||x.d===me.id);
  const cap=Math.floor(S.money*.25/100)*100,amts=[300,500,1000,2000].filter(a=>a<=cap);
  e.innerHTML=list.map(p=>{
    const atWar=myWar&&(myWar.a===p.id||myWar.d===p.id),targetWar=wars.find(w=>w.a===p.id||w.d===p.id),dead=p.eliminated,rel=Number(relations[p.id]||0),program=relationPrograms[p.id],grounds=(warGrounds[me.id]||warGrounds)[p.id]||{},entries=Object.entries(grounds),causeName=k=>({territorial:'🗺 Территориальные претензии',border:'🚧 Пограничный конфликт',ideology:'⚖️ Идеологический конфликт',economic:'📉 Экономический конфликт',security:'🛂 Кризис защиты граждан и дипломатической миссии'})[k]||k,ready=entries.filter(([k,v])=>Number(v.severity||0)>=85||(v.ultimatum&&v.ultimatum.cause===k&&Number(v.ultimatum.deadline)<=room.month)),toUlt=entries.filter(([k,v])=>Number(v.severity||0)<85&&(!v.ultimatum||v.ultimatum.cause!==k)),waiting=entries.filter(([k,v])=>Number(v.severity||0)<85&&v.ultimatum&&v.ultimatum.cause===k&&Number(v.ultimatum.deadline)>room.month),activeEntries=ready.length?ready:toUlt,causeOptions=activeEntries.map(([k])=>`<option value="${k}">${causeName(k)}</option>`).join(''),causeUI=ready.length?`<select data-cause="${p.id}">${causeOptions}</select>${goalSelectHtml(p.id,defGoal(ready[0][0]))}<button class="danger" data-act="war" data-to="${p.id}">⚔️ Объявить войну по основанию</button>`:toUlt.length?`<select data-cause="${p.id}">${causeOptions}</select><button data-act="ultimatum" data-to="${p.id}">⚠️ Выдвинуть ультиматум · 2 мес.</button>`:waiting.length?`<span class="muted2">⚠️ Ультиматум: ${causeName(waiting[0][0])} · осталось ${Math.max(0,Number(waiting[0][1].ultimatum.deadline)-room.month)} мес.</span>`:'<span class="muted2">Нет готового дипломатического основания.</span>',directWarUI=(myWar&&!atWar)?'<span class="muted2">Сначала завершите текущую войну.</span>':(targetWar&&!atWar)?'<span class="muted2">Этот игрок уже воюет с другой страной.</span>':p.connected===false?'<span class="muted2">Игрок не в сети — объявление войны недоступно.</span>':`<select data-direct-goal="${p.id}">${Object.keys(GOAL_LABEL).map(k=>`<option value="${k}" ${k==='tribute'?'selected':''}>${GOAL_LABEL[k]}</option>`).join('')}</select><button class="danger" data-act="direct_war" data-to="${p.id}" ${Number(S.pp||0)<30?'disabled':''}>⚔️ Прямо объявить войну · 30 ⭐</button>${Number(S.pp||0)<30?'<small class="muted2">Нужно 30 политической власти.</small>':''}`;
    return `<div class="mini"><b>${esc(p.country)}</b> ${dead?'💀':atWar?'⚔️':rel<=-60?'🟠':rel>=40?'🤝':'⚖️'}<br><span class="muted2">${esc(p.name)} · ${IDEOLOGIES[p.ideology]||'Прагматизм'} · очки ${p.score} · ВВП ${fmt(p.gdp)} · мощь ${p.power}</span><br><b>Отношения: ${rel>0?'+':''}${rel}/100</b> · ${relationTier(rel)}${claims[p.id]?.region?`<br><small class="muted2">🗺 Претензия ${esc(me.country)}: область «${esc(claims[p.id].region)}»</small>`:''}
${dead||S.campaignOver?'':`<div class="actions">
${amts.length?`<select data-amt="${p.id}">${amts.map(a=>`<option>${a}</option>`).join('')}</select><button data-act="aid" data-to="${p.id}">💸 Помощь</button>`:'<span class="muted2">Для помощи нужна казна от 1 200 млн</span>'}
${program?`<span class="muted2">🤝 Программа активна: ещё ${program.months_left} мес. · улучшение через ${program.next_in} мес.</span>`:`<button data-act="program" data-to="${p.id}">🤝 Улучшать отношения 4 года · 40 ⭐</button>`}${embassies[p.id]?`<span class="muted2">🏛 Посольство: ${embassies[p.id].paused?'пауза':'работает'} · ${embassies[p.id].months_left} мес. осталось</span>`:''}<button data-act="meeting" data-to="${p.id}">Разовая встреча (+12)</button><button data-act="neutral" data-to="${p.id}">⚖️ Нейтралитет</button><button data-act="pact" data-to="${p.id}">📜 Торг. пакт</button>
<button data-act="sanction" data-to="${p.id}">⛔ Санкции</button>${claims[p.id]?'':`${((window.WORLD_SEEDS&&WORLD_SEEDS[p.country])||[]).length?`<select data-region="${p.id}"><option value="">Область для претензии</option>${WORLD_SEEDS[p.country].map(x=>`<option value="${String(x.n).replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}">${esc(x.n)}</option>`).join('')}</select>`:`<input data-region="${p.id}" maxlength="80" placeholder="Название области для претензии">`}<button data-act="claim" data-to="${p.id}">🗺 Претензия на область · 15 ⭐</button>`}${borderCases[p.id]?'':`<button data-act="border_case" data-to="${p.id}">🚧 Зарегистрировать пограничный инцидент · 8 ⭐</button>`}${securityCases[p.id]?'':`<button data-act="security_case" data-to="${p.id}">🛂 Консульский кризис · 10 ⭐</button>`}<button data-act="gift" data-to="${p.id}">🎁 Подарок · 450</button><button data-act="visit" data-to="${p.id}">🎭 Культурный обмен · 180</button><button data-act="summit" data-to="${p.id}">🏛 Саммит · 260</button><button data-act="humanitarian" data-to="${p.id}">🧰 Гуманитарная помощь · 500</button><button data-act="education" data-to="${p.id}">🎓 Образовательный обмен · 320</button>${embassies[p.id]?'':`<button data-act="embassy" data-to="${p.id}">🏛 Посольство · 500</button>`}
${atWar?`<button class="good" data-act="peace" data-to="${p.id}">🕊 Мир</button>`:`${causeUI}<div class="actions">${directWarUI}</div>`}</div>`}</div>`}).join('')||'<p class="muted2">Других игроков нет.</p>';
}
function dipClick(ev){
  const b=ev.target.closest('button[data-act]');if(!b)return;const to=b.dataset.to,a=b.dataset.act;
  if(a==='aid'){const sel=document.querySelector(`select[data-amt="${to}"]`);send({type:'aid',to,amount:+(sel&&sel.value)||300})}
  else if(a==='pact')send({type:'propose',what:'pact',to});
  else if(a==='meeting')send({type:'diplomacy',action:'meeting',to});
  else if(['gift','visit','summit','humanitarian','education','embassy'].includes(a))send({type:'diplomacy',action:a,to});
  else if(a==='program'){if(NG.S.pp<40)return NG.toast('Нужно 40 ⭐ политической власти');report(true);send({type:'diplomacy',action:'program',to})}
  else if(a==='neutral')send({type:'diplomacy',action:'neutral',to});
  else if(a==='sanction')send({type:'sanction',to});
  else if(a==='claim'){const sel=document.querySelector(`select[data-region="${to}"]`),region=sel&&sel.value;if(!region)return NG.toast('Выберите конкретную область для претензии');send({type:'claim',to,region});}
  else if(a==='border_case')send({type:'border_case',to});
  else if(a==='security_case')send({type:'security_case',to});
  else if(a==='ultimatum'){const sel=document.querySelector(`select[data-cause="${to}"]`);const cause=sel&&sel.value||'';if(!cause)return NG.toast('Выберите основание ультиматума');send({type:'ultimatum',to,cause})}
  else if(a==='peace')send({type:'peace'});
  else if(a==='war'){const sel=document.querySelector(`select[data-cause="${to}"]`);const cause=sel&&sel.value||'';if(!cause)return NG.toast('Сначала выберите основание войны');const gs=document.querySelector(`select[data-goal="${to}"]`),goal=gs&&gs.value||defGoal(cause);if(window.confirm('Объявить войну по основанию «'+cause+'» с целью: '+(GOAL_LABEL[goal]||goal).replace('Цель: ','')+'?')){report(true);if(!send({type:'war',to,cause,goal}))NG.toast('Нет соединения с сервером комнаты. Переподключитесь и повторите.')}}
  else if(a==='direct_war'){const gs=document.querySelector(`select[data-direct-goal="${to}"]`),goal=gs&&gs.value||'tribute';if(Number(NG.S.pp||0)<30)return NG.toast('Нужно 30 политической власти');if(window.confirm('Объявить прямую войну без ожидания дипломатического кризиса? Стоимость: 30 политической власти. Цель: '+(GOAL_LABEL[goal]||goal).replace('Цель: ','')+'.')){report(true);if(!send({type:'war',to,cause:'aggression',goal}))NG.toast('Нет соединения с сервером комнаты. Переподключитесь и повторите.')}}
}
function paintChat(){const e=$('#mpChatLog');if(!e)return;e.innerHTML=chat.map(c=>`<div><b>${esc(c.name)}</b> <span class="muted2">(${esc(c.country)})</span>: ${esc(c.text)}</div>`).join('')||'<div class="muted2">Пока тихо</div>';e.scrollTop=e.scrollHeight}
function paintFeed(){const e=$('#mpFeed');if(!e)return;e.innerHTML=feed.map(f=>`<div><span class="muted2">мес. ${f.m}</span> ${esc(f.t)}</div>`).join('')||'<div class="muted2">Пока ничего</div>'}

/* ---------- автозапуск ---------- */
setBar();
(function boot(){
  const sp=new URLSearchParams(location.search);
  let start=(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.start_param)||sp.get('startapp')||'';
  const sess=JSON.parse(sget(SKEY)||'null');
  if(sess&&sess.code&&localStorage.getItem(LKEY(sess.code))||sess&&sess.code){connect(sess.code,{rejoin:true});return}
  if(start.startsWith('nat_')){const code=start.slice(4);const pr=JSON.parse(sget('nmpProfile')||'null');view='setup';paintModal();openModal();$('#mpCode').value=code.toUpperCase();if(pr&&pr.name&&pr.country){/* профиль уже есть — входим сразу */connect(code)}return}
  if(sp.get('room')){view='setup';paintModal();openModal()}
})();
})();
