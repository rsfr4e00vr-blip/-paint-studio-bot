/* Мультиплеер «Симулятор государства» — клиент.
   Игра считается в браузере (game.js), сервер задаёт общие часы, очки и дипломатию. */
(()=>{
'use strict';
const NG=window.NG;if(!NG)return;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('ru-RU');
const SPEEDS={slow:['Медленно · 10 с/мес',10],normal:['Обычно · 6 с/мес',6],fast:['Быстро · 3,5 с/мес',3.5]};
const LENGTHS={short:'Короткая · 10 лет',normal:'Обычная · 15 лет',long:'Долгая · 20 лет'};
const DIFFS={story:'История',easy:'Лёгкая',normal:'Нормальная',hard:'Сложная',expert:'Эксперт'};
const LKEY=(c)=>'novariaMP:'+c, SKEY='novariaMPSession';

let ws=null,me={id:null,host:false},room={code:'',state:'idle',players:[],month:0,length:180,speed:'normal',diff:'normal',host:null};
let standings=[],mods={},wars=[],feed=[],chat=[],active=false,sentElim=false,lastTick=0,view='setup',finalData=null,pending=null,warArm=null,peaceOffer=null,retry=0,leaving=false;
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
function send(o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))}
function connect(code,opts){
  opts=opts||{};code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
  if(code.length<3){note('Введите код комнаты','warn');return}
  closeWs();leaving=false;
  const proto=location.protocol==='https:'?'wss':'ws';
  ws=new WebSocket(`${proto}://${location.host}/ws/nations/${encodeURIComponent(code)}`);
  const sess=opts.rejoin?JSON.parse(localStorage.getItem(SKEY)||'null'):null;
  ws.onopen=()=>{retry=0;send({type:'join',name:val('#mpName')||(sess&&sess.name)||'Игрок',country:val('#mpCountry')||(sess&&sess.country)||'Новария',token:sess?sess.token:'',rejoin:!!opts.rejoin})};
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
    me.id=m.id;me.host=!!m.host;Object.assign(room,pick(m));wars=m.wars||[];
    localStorage.setItem(SKEY,JSON.stringify({code:room.code,token:m.id,name:val('#mpName')||(JSON.parse(localStorage.getItem(SKEY)||'{}').name)||'Игрок',country:val('#mpCountry')||(JSON.parse(localStorage.getItem(SKEY)||'{}').country)||'Новария'}));
    if(room.state==='lobby'){view='lobby';active=false;paintModal();openModal()}
    else{resume()}
    setBar();break;
  case'lobby':Object.assign(room,pick(m));me.host=room.host===me.id;
    if(room.state==='lobby'&&modal.classList.contains('open'))paintModal();setBar();paintAll();break;
  case'state':Object.assign(room,pick(m));mods=m.mods||mods;wars=m.wars||wars;catchUp();setBar();paintAll();break;
  case'start':startGame(m);break;
  case'tick':onTick(m);break;
  case'paused':room.state=m.value?'paused':'running';note(m.value?'⏸ Хозяин комнаты поставил игру на паузу':'▶ Игра продолжается','info');setBar();break;
  case'notice':note(m.text,m.kind,true);break;
  case'chat':chat.push(m);chat=chat.slice(-60);paintChat();break;
  case'proposal':showProposal(m);break;
  case'aid_out':addMoney(-m.amount);NG.log(`Помощь стране ${m.to}: −${fmt(m.amount)} млн`);note(`💸 Отправлено ${fmt(m.amount)} млн → ${m.to}`,'dip');afterEffect();break;
  case'aid_in':addMoney(m.amount);NG.log(`Помощь от ${m.from}: +${fmt(m.amount)} млн`);NG.say(`${m.from} прислал нам помощь!`,'🤝');note(`💰 Получено ${fmt(m.amount)} млн от ${m.from}`,'dip');afterEffect();break;
  case'war_start':NG.log(`⚔️ Война с ${m.enemy}${m.aggressor?'':' (на нас напали)'}`);NG.say(m.aggressor?`Мы объявили войну: ${m.enemy}`:`${m.enemy} напал на нас!`,m.aggressor?'⚔️':'😱');if(!m.aggressor){const S=NG.S;S.approval=NG.clamp(S.approval+2)}afterEffect();break;
  case'war_cost':{const S=NG.S;S.army=Math.max(5000,S.army-m.army_loss);addMoney(-m.money);S.approval=NG.clamp(S.approval-m.approval);S.morale=NG.clamp(S.morale-.4);S.threat=NG.clamp(S.threat+1);break}
  case'war_end':endWar(m);break;
  case'dictate_open':NG.toast(`💪 Перевес на фронте против ${m.enemy}! Выберите условия во вкладке «Мультиплеер»`);note(`💪 Можно диктовать условия: ${m.enemy}`,'war');paintAll();break;
  case'cede_request':cedeRegion(m);break;
  case'region_gain':gainLand(m);break;
  case'vassal_tax_set':note(`💰 ${m.side==='lord'?'Вы установили':'Сюзерен установил'} дань ${m.rate}% для ${m.country}`,'dip');paintAll();break;
  case'vassal_revolt':note(`⚠️ ${m.country} вышел из вассалитета!`,'warn');paintAll();break;
  case'annexed':{const S=NG.S;S.campaignOver=true;NG.log(`🏴 Наша страна полностью захвачена: ${m.by}`);NG.say('Страна захвачена…','😢');note(`🏴 ${m.by} захватил вашу страну. Вы наблюдаете за игрой.`,'warn');afterEffect();break}
  case'peace_offer':peaceOffer=m;showProposal({id:'peace',what:'peace',text:`${m.from} предлагает мир.`,ttl:30});break;
  case'final':finalData=m;view='final';active=false;paintModal();openModal();setBar();break;
  case'error':note(m.text,'warn');if(m.fatal){localStorage.removeItem(SKEY);room={code:'',state:'idle',players:[],month:0,length:180,speed:'normal',diff:'normal',host:null};active=false;view='setup';setBar();paintModal()}break;
  }
}
function pick(m){const o={};['code','state','host','month','length','speed','diff','players'].forEach(k=>{if(m[k]!==undefined)o[k]=m[k]});return o}

/* ---------- игровой процесс ---------- */
function startGame(m){
  const sess=JSON.parse(localStorage.getItem(SKEY)||'{}');
  Object.assign(room,{state:'running',diff:m.diff,length:m.length,speed:m.speed,month:0,players:m.players});
  NG.begin(m.diff,sess.country||'Новария');NG.S.mpMonth=0;NG.S.mpFlat=0;
  enterMP();sentElim=false;standings=m.players;mods={};wars=[];feed=[];lastTick=Date.now();
  closeModal();NG.setTab('mp');report();saveLocal();setBar();
  note('🌍 Игра началась! Все страны стартуют с одинаковыми условиями.','info');
}
function resume(){
  const raw=localStorage.getItem(LKEY(room.code));
  if(!raw){note('Локальное сохранение этой игры не найдено','warn');localStorage.removeItem(SKEY);closeWs();return}
  try{NG.load(JSON.parse(raw))}catch(e){note('Не удалось восстановить игру','warn');return}
  enterMP();sentElim=!!NG.S.campaignOver;lastTick=Date.now();closeModal();NG.setTab('mp');
  send({type:'sync'});
}
function enterMP(){
  active=true;document.body.classList.add('mp');
  ['play','pause','stop','step'].forEach(id=>{const e=$('#'+id);if(e)e.onclick=()=>NG.toast('В мультиплеере время идёт одновременно у всех')});
  if(typeof window.resetGame==='function'){orig.reset=orig.reset||window.resetGame;window.resetGame=()=>NG.toast('В мультиплеере нельзя начать заново')}
  if(typeof window.importSave==='function'){orig.imp=orig.imp||window.importSave;window.importSave=()=>NG.toast('В мультиплеере загрузка сохранений отключена')}
}
function leaveMP(){
  leaving=true;active=false;document.body.classList.remove('mp');
  ['play','pause','stop','step'].forEach(id=>{const e=$('#'+id);if(e)e.onclick=orig[id]});
  const sp=$('#speed');if(sp)sp.onchange=orig.speed;
  if(orig.reset)window.resetGame=orig.reset;if(orig.imp)window.importSave=orig.imp;
  if(room.code)localStorage.removeItem(LKEY(room.code));
  localStorage.removeItem(SKEY);closeWs();
  room={code:'',state:'idle',players:[],month:0,length:180,speed:'normal',diff:'normal',host:null};
  standings=[];mods={};wars=[];feed=[];chat=[];peaceOffer=null;finalData=null;view='setup';
  NG.end();setBar();closeModal();prop.classList.remove('open');
}
function applyMods(){
  const md=mods[me.id];const S=NG.S;if(!md){S.mpFlat=S.mpFlat||0;return}
  const base=NG.income()-(S.mpFlat||0);S.mpFlat=Math.round(base*md.total);
}
function onTick(m){
  if(!active)return;
  const S=NG.S;room.month=m.month;room.length=m.length;standings=m.standings;mods=m.mods||mods;wars=m.wars||[];lastTick=Date.now();
  const miss=Math.max(1,Math.min(24,m.month-(S.mpMonth||0)));
  for(let i=0;i<miss;i++){applyMods();NG.tick();S.mpMonth=(S.mpMonth||0)+1;if(S.campaignOver)break}
  S.mpMonth=m.month;
  if(S.campaignOver&&!sentElim){sentElim=true;send({type:'eliminated'});note('💀 Ваша кампания окончена. Вы наблюдаете за игрой.','warn')}
  report();saveLocal();setBar();paintAll();
}
function catchUp(){
  if(!active)return;const S=NG.S;const miss=Math.min(24,room.month-(S.mpMonth||0));
  for(let i=0;i<miss;i++){applyMods();NG.tick();S.mpMonth=(S.mpMonth||0)+1;if(S.campaignOver)break}
  S.mpMonth=Math.max(S.mpMonth||0,room.month);
  if(miss>0)NG.toast(`Пока вас не было, прошло ${miss} мес.`);
  if(S.campaignOver&&!sentElim){sentElim=true;send({type:'eliminated'})}
  report();saveLocal();
}
function report(){
  const S=NG.S;if(!S||!active)return;
  let power=1;try{power=NG.warPower(null)}catch(e){}
  send({type:'report',out:!!S.out,rep:{gdp:S.gdp,money:S.money,debt:S.debt,stab:S.stability,appr:S.approval,legit:S.legitimacy,trust:S.trust==null?70:S.trust,power,pop:S.pop,income:NG.income()}});
}
function saveLocal(){try{localStorage.setItem(LKEY(room.code),JSON.stringify(NG.S))}catch(e){}}
function addMoney(d){const S=NG.S;if(d>=0)S.money+=d;else{const n=-d;if(S.money>=n)S.money-=n;else{S.debt+=n-S.money;S.money=0}}}
function endWar(m){
  const S=NG.S;addMoney(m.money);S.approval=NG.clamp(S.approval+m.approval);S.stability=NG.clamp(S.stability+m.stability);
  const t={win:`🏆 Победа над ${m.enemy}`,lose:`🏳 Поражение от ${m.enemy}`,draw:`🕊 Ничья с ${m.enemy}`,peace:`🕊 Мир с ${m.enemy}`}[m.result]||'Война окончена';
  NG.log(`${t}${m.money?` (${m.money>0?'+':''}${fmt(m.money)} млн)`:''}`);NG.say(t,m.result==='win'?'🎉':m.result==='lose'?'😢':'🕊');NG.toast(t);afterEffect();
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
function afterEffect(){saveLocal();NG.render(true);paintAll()}

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
    const sess=JSON.parse(localStorage.getItem('nmpProfile')||'{}'),sp=new URLSearchParams(location.search),pre=(sp.get('room')||'').toUpperCase();
    modal.innerHTML=`<div class="mpbox"><h2>🌍 Мультиплеер</h2><p class="muted2">2–6 игроков. У каждого своя страна и одинаковые стартовые условия. Время идёт одновременно, побеждает тот, у кого больше очков в конце.</p>
<label>Ваше имя</label><input id="mpName" maxlength="24" value="${esc(sess.name||tgName()||'')}" placeholder="Имя игрока">
<label>Название вашей страны</label><input id="mpCountry" maxlength="28" value="${esc(sess.country||'')}" placeholder="Например, Республика Новария">
<div class="mprow"><button class="primary" id="mpCreate">Создать комнату</button></div>
<label>Или войти по коду</label><div class="mprow"><input id="mpCode" maxlength="8" value="${esc(pre)}" placeholder="КОД"><button id="mpJoin">Войти</button></div>
<div class="mprow"><button id="mpClose">Закрыть</button></div></div>`;
    $('#mpCreate').onclick=()=>go(randCode());$('#mpJoin').onclick=()=>go(val('#mpCode'));$('#mpClose').onclick=closeModal;
    $('#mpCode').oninput=e=>e.target.value=e.target.value.toUpperCase();
  }else if(view==='lobby'){
    const host=me.host,link=`${location.origin}/game?room=${room.code}`;
    modal.innerHTML=`<div class="mpbox"><h2>Комната</h2><div class="mpcode" id="mpCodeBig">${esc(room.code)}</div>
<div class="mprow"><button id="mpCopy">📋 Скопировать ссылку</button>${navigator.share?'<button id="mpShare">Поделиться</button>':''}</div>
<h3>Игроки (${room.players.length}/6)</h3>${room.players.map(p=>`<div class="mpplayer"><span>${p.id===room.host?'👑':'👤'}</span><span class="nm"><b>${esc(p.country)}</b><br><small>${esc(p.name)}${p.id===me.id?' · это вы':''}</small></span><span>${p.ready?'✅':'⏳'}</span></div>`).join('')}
${host?`<label>Скорость времени</label><select id="mpSpeed">${Object.keys(SPEEDS).map(k=>`<option value="${k}" ${room.speed===k?'selected':''}>${SPEEDS[k][0]}</option>`).join('')}</select>
<label>Длительность</label><select id="mpLen">${Object.keys(LENGTHS).map(k=>`<option value="${k}" ${room.length===({short:120,normal:180,long:240})[k]?'selected':''}>${LENGTHS[k]}</option>`).join('')}</select>
<label>Сложность (одинакова для всех)</label><select id="mpDiff">${Object.keys(DIFFS).map(k=>`<option value="${k}" ${room.diff===k?'selected':''}>${DIFFS[k]}</option>`).join('')}</select>`
:`<p class="muted2">Скорость: ${SPEEDS[room.speed][0]} · ${room.length/12} лет · сложность: ${DIFFS[room.diff]}</p>`}
<div class="mprow">${host?`<button class="primary" id="mpStart" ${room.players.length<2?'disabled':''}>▶ Начать игру</button>`:`<button class="good" id="mpReady">Я готов</button>`}<button class="danger" id="mpLeave">Выйти</button></div>
${host&&room.players.length<2?'<p class="muted2">Нужно минимум 2 игрока.</p>':''}</div>`;
    $('#mpCopy').onclick=()=>{copy(link);NG.toast('Ссылка скопирована')};
    const sh=$('#mpShare');if(sh)sh.onclick=()=>navigator.share({title:'Симулятор государства',text:`Играем вместе! Код комнаты: ${room.code}`,url:link}).catch(()=>{});
    if(host){const up=()=>send({type:'settings',speed:val('#mpSpeed'),length:val('#mpLen'),diff:val('#mpDiff')});['#mpSpeed','#mpLen','#mpDiff'].forEach(s=>$(s).onchange=up);$('#mpStart').onclick=()=>send({type:'start'})}
    else $('#mpReady').onclick=()=>send({type:'ready',value:true});
    $('#mpLeave').onclick=leaveMP;
  }else if(view==='final'&&finalData){
    const f=finalData.standings,w=f[0];
    modal.innerHTML=`<div class="mpbox"><h2>🏁 Игра окончена</h2><p>Победитель: <b>${esc(w.country)}</b> (${esc(w.name)}) — ${w.score} очк.</p>${table(f)}<div class="mprow"><button class="primary" id="mpFin">Выйти в одиночную игру</button><button id="mpStay">Остаться и посмотреть</button></div></div>`;
    $('#mpFin').onclick=leaveMP;$('#mpStay').onclick=()=>{closeModal();NG.setTab('mp')};
  }
}
function tgName(){const u=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;return u&&u.first_name||''}
function randCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<5;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function go(code){
  const n=val('#mpName'),c=val('#mpCountry');
  if(!n){note('Введите имя','warn');return}
  if(!c){note('Введите название страны','warn');return}
  localStorage.setItem('nmpProfile',JSON.stringify({name:n,country:c}));connect(code);
}
function copy(t){try{navigator.clipboard.writeText(t)}catch(e){const i=document.createElement('input');i.value=t;document.body.appendChild(i);i.select();document.execCommand('copy');i.remove()}}

/* ---------- вкладка «Мультиплеер» ---------- */
function table(list){
  return `<div style="overflow:auto"><table><tr><th>#</th><th>Страна</th><th>Очки</th><th>ВВП</th><th>Мощь</th><th>Стаб.</th></tr>${list.map((p,i)=>`<tr class="${p.id===me.id?'me':''}"><td>${i+1}</td><td><b>${esc(p.country)}</b>${p.eliminated?' 💀':p.out?' 🪧':''}${p.connected===false?' 📴':''}<br><span class="muted2">${esc(p.name)}</span><br>${chips(p.comp)}</td><td><b>${p.score}</b></td><td>${fmt(p.gdp)}</td><td>${p.power}</td><td>${p.stab}%</td></tr>`).join('')}</table></div>`;
}
function chips(c){if(!c)return'';const n={eco:'Эко',welfare:'Нар.',gov:'Упр.',fin:'Фин.',mil:'Арм.'};return Object.keys(n).map(k=>`<span class="chip">${n[k]} ${c[k]}</span>`).join('')}
window.NGMP={
  setVassalTax(id,rate){send({type:'vassal_tax',vassal:id,rate:Number(rate)})},
  tab(){
    if(!room.code)return `<section class="panel"><h2>🌍 Мультиплеер</h2><p>Вы не в комнате.</p><button class="primary" onclick="NGMP.open()">Создать или войти</button></section>`;
    if(room.state==='lobby')return `<section class="panel"><h2>🌍 Комната ${esc(room.code)}</h2><p>Игра ещё не началась.</p><button class="primary" onclick="NGMP.open()">Открыть лобби</button></section>`;
    return `<div class="mpwrap"><section class="panel" id="mpStand"></section><section class="panel" id="mpMods"></section><section class="panel"><h2>Дипломатия игроков</h2><div class="mpdip" id="mpDip"></div></section><section class="panel"><h2>Чат</h2><div class="mpchat" id="mpChatLog"></div><div class="row"><input id="mpChatIn" maxlength="200" placeholder="Сообщение игрокам"><button id="mpChatSend">➤</button></div></section><section class="panel"><h2>События мира</h2><div class="mpfeed" id="mpFeed"></div></section>${me.host?`<section class="panel"><button id="mpPause">${room.state==='paused'?'▶ Продолжить':'⏸ Пауза'}</button> <button class="danger" id="mpLeave2">Покинуть игру</button></section>`:`<section class="panel"><button class="danger" id="mpLeave2">Покинуть игру</button></section>`}</div>`;
  },
  after(){
    if(!room.code||room.state==='lobby')return;
    const c=$('#mpChatIn');if(c){const s=()=>{const t=c.value.trim();if(t){send({type:'chat',text:t});c.value=''}};$('#mpChatSend').onclick=s;c.onkeydown=e=>{if(e.key==='Enter')s()}}
    const p=$('#mpPause');if(p)p.onclick=()=>send({type:'pause'});
    const l=$('#mpLeave2');if(l)l.onclick=()=>{if(l.dataset.arm){leaveMP()}else{l.dataset.arm=1;l.textContent='Точно выйти? Нажмите ещё раз';setTimeout(()=>{if(l){delete l.dataset.arm;l.textContent='Покинуть игру'}},3000)}};
    const d=$('#mpDip');if(d)d.onclick=dipClick;
    const mm=$('#mpMods');if(mm)mm.onclick=ev=>{const b=ev.target.closest('button[data-term]');if(!b||b.disabled)return;const t=b.dataset.term;if(t==='annex'||t==='region'){if(b.dataset.arm){send({type:'dictate',mode:t})}else{b.dataset.arm=1;const o=b.textContent;b.textContent='Точно? Нажмите ещё раз';setTimeout(()=>{b.dataset.arm='';b.textContent=o},3000)}}else send({type:'dictate',mode:t})};
    paintAll();
  },
  open(){view=room.state==='lobby'?'lobby':'setup';paintModal();openModal()}
};
function paintAll(){if(NG.getTab()!=='mp'||!active&&room.state==='lobby')return;paintStand();paintMods();paintDip();paintChat();paintFeed()}
function paintStand(){const e=$('#mpStand');if(!e)return;const list=standings.length?standings:room.players;e.innerHTML=`<h2>🏆 Таблица очков · месяц ${room.month}/${room.length}</h2>${table(list)}<p class="muted2">Очки: экономика 36%, народ 20%, управление 14%, финансы 14%, армия 16%. Считаются на сервере; рост ВВП в зачёте ограничен 1,5% в месяц.</p>`}
function pct(v){return(v>0?'+':v<0?'−':'')+Math.abs(Math.round(v*1000)/10)+'%'}
function paintMods(){
  const e=$('#mpMods');if(!e)return;const md=mods[me.id]||{pact:0,sanction:0,rubber:0,total:0},S=NG.S;
  const w=wars.find(x=>x.a===me.id||x.d===me.id);let wh='';
  if(w){const enemy=(standings.find(p=>p.id===(w.a===me.id?w.d:w.a))||{}).country||'противник',mine=w.a===me.id?w.p:100-w.p;const iWon=w.won===me.id,theyWon=w.won&&w.won!==me.id,can=mine>=60||iWon,reg=mine>=70||iWon;
    wh=`<h3>⚔️ Война с ${esc(enemy)}</h3><div class="warbar"><i style="width:${mine}%"></i></div><div class="muted2">Ваш перевес на фронте: <b>${mine}%</b> · месяц войны ${w.m}/24 · каждый месяц: −казна, −армия, −одобрение</div>`+
    (theyWon?`<p><b>🏳 Вы разгромлены.</b> Противник выбирает условия (${3-(w.wm||0)} мес.), иначе — контрибуция.</p>`:
    `<p class="muted2">${iWon?`🏆 Полная победа! Вы решаете, чем закончить войну (${3-(w.wm||0)} мес., иначе контрибуция):`:can?'💪 Перевес! Вы решаете, чем закончить войну:':'Условия можно диктовать при перевесе от 60%, область — от 70%, захват страны — при полной победе.'}</p>
    <div class="row"><button class="good" data-term="tribute" ${can?'':'disabled'}>💰 Контрибуция</button><button class="primary" data-term="vassal" ${can?'':'disabled'}>👑 Вассал (24 мес.)</button><button class="danger" data-term="region" ${reg?'':'disabled'}>🗺 Отнять область</button><button class="danger" data-term="annex" ${iWon?'':'disabled'}>🏴 Захватить страну</button></div>`)}
  const myVassals=standings.filter(q=>q.vassal_of===me.id);
  const vassalUI=myVassals.length?`<h3>👑 Управление вассалами</h3>${myVassals.map(q=>`<div class="mini"><b>${esc(q.country)}</b><p class="muted2">Текущая дань: ${q.vassal_tax??10}% · высокая дань повышает риск восстания</p><label>Доля дохода: <b id="vt-${q.id}">${q.vassal_tax??10}%</b></label><input type="range" min="0" max="40" step="1" value="${q.vassal_tax??10}" oninput="document.getElementById('vt-${q.id}').textContent=this.value+'%'" onchange="window.NGMP.setVassalTax('${q.id}',this.value)"><small class="muted2">0% — вассал почти не платит; 40% — больше доход, но риск отделения значительно выше.</small></div>`).join('')}`:'';
  e.innerHTML=`<h2>📊 Моя экономика в мультиплеере</h2><div>${[['📜 Торговые пакты',md.pact],['⛔ Санкции',md.sanction],['👑 Вассалитет',md.vassal||0],['⚖️ Баланс (догоняющий бонус / бремя лидера)',md.rubber]].map(x=>`<span class="chip ${x[1]>0?'good':x[1]<0?'bad':''}">${x[0]} ${pct(x[1])}</span>`).join('')}</div><p class="muted2">Итоговая поправка к доходу: <b>${pct(md.total)}</b> (${S.mpFlat>0?'+':''}${fmt(S.mpFlat||0)} млн/мес). Последний в таблице получает до +5%, лидер платит до −3%.</p>${vassalUI}${wh}${S.campaignOver?'<p><b>💀 Ваша кампания окончена — вы наблюдатель.</b></p>':S.out?'<p><b>🪧 Вы в оппозиции: очки ×0,6, пока не вернётесь к власти.</b></p>':''}`;
}
function paintDip(){
  const e=$('#mpDip');if(!e)return;const S=NG.S,list=(standings.length?standings:room.players).filter(p=>p.id!==me.id);
  const myWar=wars.find(x=>x.a===me.id||x.d===me.id);
  const cap=Math.floor(S.money*.25/100)*100,amts=[300,500,1000,2000].filter(a=>a<=cap);
  e.innerHTML=list.map(p=>{
    const atWar=myWar&&(myWar.a===p.id||myWar.d===p.id),dead=p.eliminated;
    return `<div class="mini"><b>${esc(p.country)}</b> ${dead?'💀':atWar?'⚔️':''}<br><span class="muted2">${esc(p.name)} · очки ${p.score} · ВВП ${fmt(p.gdp)} · мощь ${p.power}</span>
${dead||S.campaignOver?'':`<div class="actions">
${amts.length?`<select data-amt="${p.id}">${amts.map(a=>`<option>${a}</option>`).join('')}</select><button data-act="aid" data-to="${p.id}">💸 Помощь</button>`:'<span class="muted2">Для помощи нужна казна от 1 200 млн</span>'}
<button data-act="pact" data-to="${p.id}">📜 Торг. пакт</button>
<button data-act="sanction" data-to="${p.id}">⛔ Санкции</button>
${atWar?`<button class="good" data-act="peace" data-to="${p.id}">🕊 Мир</button>`:`<button class="danger" data-act="war" data-to="${p.id}">${warArm===p.id?'Точно? ⚔️':'⚔️ Война'}</button>`}</div>`}</div>`}).join('')||'<p class="muted2">Других игроков нет.</p>';
}
function dipClick(ev){
  const b=ev.target.closest('button[data-act]');if(!b)return;const to=b.dataset.to,a=b.dataset.act;
  if(a==='aid'){const sel=document.querySelector(`select[data-amt="${to}"]`);send({type:'aid',to,amount:+(sel&&sel.value)||300})}
  else if(a==='pact')send({type:'propose',what:'pact',to});
  else if(a==='sanction')send({type:'sanction',to});
  else if(a==='peace')send({type:'peace'});
  else if(a==='war'){if(warArm===to){warArm=null;send({type:'war',to})}else{warArm=to;paintDip();clearTimeout(dipClick.t);dipClick.t=setTimeout(()=>{warArm=null;paintDip()},3000)}}
}
function paintChat(){const e=$('#mpChatLog');if(!e)return;e.innerHTML=chat.map(c=>`<div><b>${esc(c.name)}</b> <span class="muted2">(${esc(c.country)})</span>: ${esc(c.text)}</div>`).join('')||'<div class="muted2">Пока тихо</div>';e.scrollTop=e.scrollHeight}
function paintFeed(){const e=$('#mpFeed');if(!e)return;e.innerHTML=feed.map(f=>`<div><span class="muted2">мес. ${f.m}</span> ${esc(f.t)}</div>`).join('')||'<div class="muted2">Пока ничего</div>'}

/* ---------- автозапуск ---------- */
setBar();
(function boot(){
  const sp=new URLSearchParams(location.search);
  let start=(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.start_param)||sp.get('startapp')||'';
  const sess=JSON.parse(localStorage.getItem(SKEY)||'null');
  if(sess&&sess.code&&localStorage.getItem(LKEY(sess.code))||sess&&sess.code){connect(sess.code,{rejoin:true});return}
  if(start.startsWith('nat_')){const code=start.slice(4);const pr=JSON.parse(localStorage.getItem('nmpProfile')||'null');view='setup';paintModal();openModal();$('#mpCode').value=code.toUpperCase();if(pr&&pr.name&&pr.country){/* профиль уже есть — входим сразу */connect(code)}return}
  if(sp.get('room')){view='setup';paintModal();openModal()}
})();
})();
