(()=>{'use strict';
const $=s=>document.querySelector(s), clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v)), fmt=n=>Math.round(n).toLocaleString('ru-RU'), months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const initial=()=>({name:'Республика Новария',month:0,year:1,money:18000,debt:0,pop:8200000,gdp:42000,inflation:5,employment:94,stability:68,approval:61,legitimacy:70,food:78,fuel:65,steel:55,equipment:48,ammo:62,energy:72,tech:32,army:42000,navy:8,air:45,training:58,morale:65,threat:20,war:false,gov:'Парламентская республика',leader:'Александр Ветров',party:'Центристский союз',playerParty:'Центристский союз',campaignOver:false,difficulty:'normal',history:[],tax:20,health:12,education:12,defense:15,industry:50,election:24,coupRisk:12,grace:12,crisis:0,cd:{},regions:[{name:'Столица',pop:1200000,wealth:82,loyalty:76,unrest:10,industry:70,infra:88,resource:'Услуги'},{name:'Северный край',pop:1600000,wealth:55,loyalty:64,unrest:18,industry:48,infra:55,resource:'Лес'},{name:'Восточная область',pop:2100000,wealth:48,loyalty:57,unrest:24,industry:75,infra:49,resource:'Сталь'},{name:'Южная провинция',pop:1900000,wealth:51,loyalty:60,unrest:20,industry:42,infra:53,resource:'Зерно'},{name:'Западный округ',pop:1400000,wealth:62,loyalty:68,unrest:14,industry:58,infra:67,resource:'Энергия'}],parties:[{name:'Центристский союз',support:34,seats:38,ideology:'Центр'},{name:'Народная партия',support:25,seats:27,ideology:'Консерватизм'},{name:'Партия реформ',support:21,seats:22,ideology:'Либерализм'},{name:'Социальный альянс',support:20,seats:13,ideology:'Социал-демократия'}],relations:[{name:'Аркания',value:15,power:65},{name:'Белория',value:48,power:42},{name:'Тарвия',value:-20,power:80}],conquered:[],botWars:[],log:['Правительство сформировано. Начинается управление государством.'],documents:[],events:[],laws:[],event:null});
let S;try{S={...initial(),...JSON.parse(localStorage.getItem('novariaSave')||'{}')}}catch{S=initial()}if(!Array.isArray(S.regions)||!Array.isArray(S.parties)||!Array.isArray(S.relations))S=initial();
if(!S.playerParty)S.playerParty=S.party||'Центристский союз';if(!S.difficulty)S.difficulty='normal';if(typeof S.campaignOver!=='boolean')S.campaignOver=false;if(!Array.isArray(S.history))S.history=[];if(!Array.isArray(S.log))S.log=[];if(!Array.isArray(S.documents))S.documents=[];if(!Array.isArray(S.laws))S.laws=[];if(!S.event)S.event=null;if(S.history.length===0){let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap())}
let tab='overview',timer=null,running=false,selectedDifficulty=S.difficulty;
const DIFFICULTIES={story:{label:'Сюжетная',income:1.3,expenses:.85,playerDrift:1.25,rivalPressure:.72,unrest:.7,approval:1.25,coup:.65},easy:{label:'Лёгкая',income:1.15,expenses:.93,playerDrift:1.1,rivalPressure:.88,unrest:.85,approval:1.1,coup:.85},normal:{label:'Нормальная',income:1,expenses:1,playerDrift:1,rivalPressure:1,unrest:1,approval:1,coup:1},hard:{label:'Сложная',income:.95,expenses:1.06,playerDrift:.9,rivalPressure:1.18,unrest:1.2,approval:.85,coup:1.2},expert:{label:'Эксперт',income:.86,expenses:1.14,playerDrift:.78,rivalPressure:1.42,unrest:1.45,approval:.72,coup:1.5}};
function difficulty(){return DIFFICULTIES[S.difficulty]||DIFFICULTIES.normal}
window.setDifficulty=v=>{selectedDifficulty=DIFFICULTIES[v]?v:'normal';toast('Для применения сложности начни новую кампанию')};
function save(){if(window.__NG_MP)return;try{localStorage.setItem('novariaSave',JSON.stringify(S))}catch(e){toast('Не удалось сохранить: память устройства заполнена')}}
function toast(t){let n=$('#notice');n.textContent=t;n.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>n.style.display='none',2400)}
function log(t){S.log.unshift(`Год ${S.year}, ${months[S.month]}: ${t}`);S.log=S.log.slice(0,100)}
const IC={
money:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d6b25e" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4"/></svg>',
gdp:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b89a8" stroke-width="2" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
pop:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a9b8c4" stroke-width="2" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6M16 5a3.5 3.5 0 010 6.5M18.5 14.5c2 .8 3 2.7 3 5.5"/></svg>',
stab:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f9a5a" stroke-width="2" aria-hidden="true"><path d="M12 3l8 4v5c0 4.5-3.4 7.7-8 9-4.6-1.3-8-4.5-8-9V7z"/></svg>',
appr:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f9a5a" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14c1 2 7 2 8 0M9 9.5h.01M15 9.5h.01"/></svg>',
army:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b5504a" stroke-width="2" aria-hidden="true"><path d="M5 21V4M5 5h13l-3 4 3 4H5"/></svg>'};
const flagSvg='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d6b25e" stroke-width="1.8" aria-hidden="true"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M12 8v8M8 12h8"/></svg>';
function loyColor(v){return v>=70?'#6f8a55':v>=62?'#8b9a57':v>=55?'#a0a257':v>=48?'#a58a4a':'#9a5a45'}
const MAPR=[
['Северный край','92,97 88,78 186,78 224,88 263,92 341,102 400,59 477,57 512,88 536,74 547,139 497,153 458,144 400,139 341,144 244,149 186,144 108,139',236,111],
['Западный округ','92,97 108,139 186,144 244,149 256,214 267,252 209,247 186,252 143,276 65,266 34,243 53,210 88,149',162,196],
['Центральный округ','244,149 341,144 400,139 458,144 497,153 505,196 516,252 536,280 458,290 380,285 322,280 267,252 256,214',365,219],
['Восточная область','547,139 575,149 652,158 734,186 719,262 652,304 594,313 555,299 536,280 516,252 505,196 497,153',621,214],
['Южная провинция','267,252 322,280 380,285 458,290 536,280 555,299 594,313 536,337 528,356 575,374 598,393 536,421 477,431 438,384 481,351 419,337 380,327 368,337 341,365 326,388 275,332',419,313],
['Столица','345,135 376,135 380,158 349,163',419,116]];
function mapHtml(){let P='',T='';MAPR.forEach(m=>{let r=S.regions.find(x=>x.name===m[0])||{loyalty:50,unrest:0};P+=`<polygon points="${m[1]}" fill="${loyColor(r.loyalty)}" stroke="#0d1519" stroke-width="3" stroke-linejoin="round"><title>${m[0]}: лояльность ${Math.round(r.loyalty)}%, недовольство ${Math.round(r.unrest)}%</title></polygon>`;T+=`<text x="${m[2]}" y="${m[3]}" text-anchor="middle" class="maptxt">${m[0].toUpperCase()}</text><text x="${m[2]}" y="${m[3]+17}" text-anchor="middle" class="maptxt2">лояльность ${Math.round(r.loyalty)}%</text>`});const W=S.relations.map((c,i)=>{const x=770+(i%2)*108,y=92+Math.floor(i/2)*88,fill=c.owner==='player'?'#3d9b70':c.owner==='puppet'?'#b68a45':c.owner==='partial'?'#7b9b70':'#586477',label=c.name.length>13?c.name.slice(0,12)+'…':c.name;return `<rect x="${x}" y="${y}" width="98" height="66" rx="7" fill="${fill}" stroke="#111820" stroke-width="2"><title>${c.name} · ${c.owner==='player'?'ваша территория':c.owner==='puppet'?'вассал':c.owner==='partial'?'частичный контроль':'независимое государство'}</title></rect><text x="${x+49}" y="${y+28}" text-anchor="middle" class="maptxt">${label}</text><text x="${x+49}" y="${y+45}" text-anchor="middle" class="maptxt2">${c.owner==='player'?'ВАША':c.owner==='puppet'?'ВАССАЛ':c.owner==='partial'?'ЧАСТЬ':'НЕЗАВИС.'}</text>`}).join('');return `<svg class="hoimap" viewBox="0 0 1000 560" role="img" aria-label="Карта страны и мировые территории"><defs><pattern id="mg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity=".05"/></pattern></defs><rect width="1000" height="560" fill="url(#mg)"/>${P}${T}<text x="868" y="58" text-anchor="middle" class="maptxt">МИРОВЫЕ СТРАНЫ</text>${W}${SEA}</svg><div class="maplegend"><span><i style="background:#6f8a55"></i>высокая лояльность</span><span><i style="background:#a0a257"></i>средняя</span><span><i style="background:#9a5a45"></i>низкая</span></div>`}
function warnBanner(){if(S.out)return'';if(S.grace>0)return `<section class="panel wide okbanner">🛡 Защитный срок: отставка не грозит ещё ${S.grace} мес.</section>`;if(S.crisis>0)return `<section class="panel wide warnbanner">⚠ Угроза отставки: ${S.crisisWhy||''}. Критическое состояние уже ${S.crisis} мес. подряд. ${ADVICE[S.crisisIdx]||'Нужно срочно исправить ситуацию.'} ${isPopular()?'(Тебя любят — отставка наступит позже.)':''}</section>`;return''}
function bar(label,val){return `<div class="meter"><b>${label}: ${fmt(val)}%</b><div class="bar"><i style="width:${clamp(val)}%;background:${val<30?"linear-gradient(90deg,#c23b4b,#ff7b86)":val<55?"linear-gradient(90deg,#c9902f,#f5c76a)":"linear-gradient(90deg,#2aa56d,#7ee6ae)"}"></i></div></div>`}
function stats(){let a=[[IC.money,'Казна',fmt(S.money)+' млн'],[IC.gdp,'ВВП',fmt(S.gdp)+' млрд'],[IC.pop,'Население',fmt(S.pop)],[IC.stab,'Стабильность',Math.round(S.stability)+'%'],[IC.appr,'Одобрение',Math.round(S.approval)+'%'],[IC.army,'Армия',fmt(S.army)],['⭐','Пол. власть',Math.floor(S.pp)]];$('#stats').innerHTML=a.map(x=>`<div class="stat">${x[0]}<div><small>${x[1]}</small><b>${x[2]}</b></div></div>`).join('');$('#clock').textContent=`${S.year} год · ${months[S.month]}`;$('#runstate').textContent=running?'Идёт время':'Пауза';$('#play').classList.toggle('active',running)}
function card(title,body){return `<section class="panel"><h2>${title}</h2>${body}</section>`}
function render(auto){stats();if(auto&&tab==='mp'&&window.NGMP)return;if(auto&&(down||(document.activeElement&&document.activeElement.type==='range')))return;let c='';
if(tab==='overview')c=`<div class="grid">${warnBanner()}<section class="panel wide"><h2>Карта страны</h2>${mapHtml()}${S.conquered&&S.conquered.length?`<p class="muted">Захваченные территории: ${S.conquered.map(t=>t.name).join(' · ')}</p>`:''}</section>${card('Государство',`<div class="cards"><div class="mini"><b>${S.name}</b>Форма правления: ${S.gov}<br>Лидер: ${S.leader}<br>Партия: ${S.party}<br>Сложность: <b>${difficulty().label}</b></div><div class="mini"><b>Состояние страны</b>${bar('Стабильность',S.stability)}${bar('Одобрение',S.approval)}${bar('Легитимность',S.legitimacy)}</div></div>`)}${card('Национальные ресурсы',`<div class="cards">${[['Продовольствие',S.food],['Топливо',S.fuel],['Сталь',S.steel],['Вооружение',S.equipment],['Боеприпасы',S.ammo],['Энергия',S.energy],['Технологии',S.tech]].map(x=>`<div class="mini"><b>${x[0]}</b>${x[1]} / 100<div class="bar"><i style="width:${clamp(x[1])}%"></i></div></div>`).join('')}</div>`)}${card('Последние события',`<div class="log">${S.log.slice(0,9).map(x=>`<div>${x}</div>`).join('')}</div>`)}${card('Быстрые действия',`<div class="actions"><button onclick="act('roads')">Построить дороги (500 млн)</button><button onclick="act('aid')">Помощь населению (300 млн)</button><button onclick="act('reform')">Государственная реформа (700 млн)</button></div>`)}</div>`;
if(tab==='economy')c=`<div class="grid">${card('Экономика',`<div class="cards"><div class="mini">Доходы в месяц <b>${fmt(income())} млн</b></div><div class="mini">Расходы в месяц <b>${fmt(expenses())} млн</b></div><div class="mini">Государственный долг <b>${fmt(S.debt)} млн</b></div><div class="mini">Инфляция <b>${S.inflation}%</b></div></div>${bar('Занятость',S.employment)}<div class="row"><button onclick="act('industry')">Развивать промышленность · 800 млн</button><button onclick="act('trade')">Торговое соглашение · 200 млн</button><button onclick="act('debt')">Погасить 1000 млн долга</button></div>`)}${card('Бюджетные настройки',`<div class="row"><label>Налоговая ставка <b id="taxv">${S.tax}%</b></label><input type="range" min="5" max="50" value="${S.tax}" oninput="setv('tax',this.value,'taxv','%')"></div><div class="row"><label>Здравоохранение <b id="healthv">${S.health}%</b></label><input type="range" min="0" max="35" value="${S.health}" oninput="setv('health',this.value,'healthv','%')"></div><div class="row"><label>Образование <b id="educationv">${S.education}%</b></label><input type="range" min="0" max="35" value="${S.education}" oninput="setv('education',this.value,'educationv','%')"></div><div class="row"><label>Оборона <b id="defensev">${S.defense}%</b></label><input type="range" min="0" max="45" value="${S.defense}" oninput="setv('defense',this.value,'defensev','%')"></div><button class="primary" onclick="saveBudget()">Применить бюджет</button>`)}${taxCard()}${budCard()}</div>`;
if(tab==='military')c=`<div class="grid">${card('Вооружённые силы',`<div class="cards">${[['Сухопутные войска',fmt(S.army)+' чел.'],['Флот',S.navy+' кораблей'],['Авиация',S.air+' эскадрилий'],['Подготовка',S.training+'%'],['Боевой дух',S.morale+'%'],['Военная угроза',S.threat+'%']].map(x=>`<div class="mini">${x[0]}<b>${x[1]}</b></div>`).join('')}</div>${bar('Боевой дух',S.morale)}<div class="actions"><button onclick="act('recruit')">Набрать 5 000 солдат · 400 млн</button><button onclick="act('train')">Военные учения · 250 млн</button><button onclick="act('equipment')">Закупить вооружение · 500 млн</button><button onclick="act('mobilize')">Мобилизация</button><button class="danger" onclick="act('demobilize')">Сократить армию</button></div><p>Состояние: <b>${S.war?'ВОЙНА':'Мирное время'}</b></p><button class="${S.war?'good':'danger'}" onclick="act('war')">${S.wars&&S.wars.length?'Заключить мир со всеми':S.martial?'Отменить военное положение':'Ввести военное положение'}</button>`)}${card('Военные запасы',`<div class="cards">${[['Топливо',S.fuel],['Сталь',S.steel],['Вооружение',S.equipment],['Боеприпасы',S.ammo]].map(x=>`<div class="mini">${x[0]} <b>${x[1]}/100</b></div>`).join('')}</div>`)}</div>`;
if(tab==='politics')c=`<div class="grid">${card('Твоя партия',`<div class="mini party-card"><b>🎖 ${S.playerParty}</b>Ты играешь за эту партию. Если она проиграет выборы и потеряет власть — кампания будет проиграна.</div><p>Правящая партия: <b>${S.party}</b></p><p>Глава правительства: <b>${S.leader}</b></p><p>До выборов: <b>${S.election} мес.</b></p><div class="actions"><button class="good" onclick="campaignAction('rally')">Провести митинг · 250 млн</button><button onclick="campaignAction('program')">Опубликовать программу · 400 млн</button><button onclick="act('speech')">Обращение к нации</button><button onclick="act('law')">Принять социальный закон</button><button class="primary" onclick="act('election')">Провести досрочные выборы</button><button onclick="act('security')">Усилить охрану правительства</button></div>${bar('Одобрение правительства',S.approval)}${bar('Риск переворота',S.coupRisk)}${S.grace>0?`<p class="muted">🛡 Защитный срок: ещё ${S.grace} мес. — отставка не грозит</p>`:S.crisis>0?`<p class="muted">⚠️ Угроза отставки (${S.crisisWhy||''}): ${S.crisis} мес. подряд. Власть могут сменить после ${crisisNeed()}-го месяца</p>`:''}</div>`)}${card('Политические партии и парламент',`<div class="cards">${S.parties.slice().sort((a,b)=>b.support-a.support).map(p=>`<div class="mini ${p.name===S.playerParty?'party-card':''}"><b>${p.name} ${p.name===S.playerParty?'★ ТВОЯ ПАРТИЯ':''}</b>${p.ideology}<br>Поддержка: <b>${Math.round(p.support)}%</b> · Мест: ${p.seats}<div class="bar"><i style="width:${clamp(p.support)}%"></i></div></div>`).join('')}</div><p class="action-note">Рейтинг партий меняется каждый месяц в зависимости от экономики, стабильности и решений правительства.</p>`)}</div>`;
if(tab==='charts')c=`<div class="grid">${card('Экономика: рост и падение',`<div class="chart-wrap"><canvas id="chartEconomy"></canvas></div><p class="action-note">ВВП, казна и государственный долг. История последних 60 месяцев.</p>`)}${card('Политика и общество',`<div class="chart-wrap"><canvas id="chartPolitics"></canvas></div><p class="action-note">Поддержка твоей партии, одобрение правительства и стабильность.</p>`)}${card('Население и ресурсы',`<div class="chart-wrap"><canvas id="chartPopulation"></canvas></div><p class="action-note">Население, продовольствие и топливо.</p>`)}</div>`;
if(tab==='regions')c=`<div class="cards">${S.regions.map((r,i)=>`<div class="mini"><b>${r.name}</b>Население: ${fmt(r.pop)}<br>Благосостояние: ${r.wealth}%<br>Лояльность: ${r.loyalty}%<br>Недовольство: ${r.unrest}%<br>Промышленность: ${r.industry}%<br>Инфраструктура: ${r.infra}%<br>Ресурс: ${r.resource}<div class="actions"><button onclick="regionAct(${i},'invest')">Инвестиции · 250 млн</button><button onclick="regionAct(${i},'aid')">Помощь · 100 млн</button><button onclick="regionAct(${i},'police')">Порядок</button></div></div>`).join('')}</div>`;
if(tab==='diplomacy')c=`<div class="cards">${S.relations.map((r,i)=>`<div class="mini"><b>${r.name}</b>Отношения: ${r.value}<div class="bar"><i style="width:${clamp((r.value+100)/2)}%"></i></div>Военная мощь: ${r.power}<div class="actions"><button onclick="diplomacy(${i},'talk')">Переговоры · 100 млн</button><button onclick="diplomacy(${i},'trade')">Торговля · 250 млн</button><button onclick="diplomacy(${i},'sanction')">Санкции</button></div></div>`).join('')}</div>`;
if(tab==='documents')c=`<div class="grid">${card('Государственные документы',`<div class="row"><input id="docname" placeholder="Название документа"><select id="doctype"><option>Указ</option><option>Закон</option><option>Бюджет</option><option>Военный приказ</option><option>Дипломатическая нота</option></select></div><textarea id="doctext" rows="5" style="width:100%" placeholder="Текст документа..."></textarea><button class="primary" onclick="createDoc()">Подписать и сохранить</button>`)}${card('Архив документов',S.documents.length?S.documents.map((d,i)=>`<div class="choice"><b>${d.type}: ${d.name}</b><small class="muted"> · ${d.date}</small><p>${d.text}</p><button onclick="deleteDoc(${i})">Удалить</button></div>`).join(''):'Пока документов нет.')}</div>`;
if(tab==='events')c=`<div class="grid">${card('События государства',S.event?`<h3>${S.event.title}</h3><p>${S.event.text}</p><div class="actions"><button class="primary" onclick="resolveEvent(0)">${S.event.a}</button><button onclick="resolveEvent(1)">${S.event.b}</button></div>`:'<p>Сейчас нет неразрешённых событий.</p>')}${card('Хроника',`<div class="log">${S.log.map(x=>`<div>${x}</div>`).join('')}</div>`)}</div>`;
if(tab==='settings')c=`<div class="grid">${card('Сложность кампании',`<p>Выбери, насколько трудно удерживать власть и развивать государство. Сложность применяется только к <b>новой кампании</b>, текущую игру она не меняет.</p><div class="row"><label for="difficultySelect">Уровень сложности</label><select id="difficultySelect" onchange="setDifficulty(this.value)"><option value="story" ${selectedDifficulty==='story'?'selected':''}>История — очень легко</option><option value="easy" ${selectedDifficulty==='easy'?'selected':''}>Лёгкая</option><option value="normal" ${selectedDifficulty==='normal'?'selected':''}>Нормальная</option><option value="hard" ${selectedDifficulty==='hard'?'selected':''}>Сложная</option><option value="expert" ${selectedDifficulty==='expert'?'selected':''}>Эксперт</option></select></div><div class="mini"><b>Текущая сложность: ${difficulty().label}</b><br>Доходы ×${difficulty().income.toFixed(2)} · расходы ×${difficulty().expenses.toFixed(2)}<br>Давление оппозиции ×${difficulty().rivalPressure.toFixed(2)}<br>Риск беспорядков ×${difficulty().unrest.toFixed(2)}</div><button class="primary" onclick="resetGame()">Начать новую кампанию на выбранной сложности</button>`)}${card('Сохранение',`<p>Прогресс автоматически сохраняется на этом устройстве.</p><button class="good" onclick="save();toast('Игра сохранена')">Сохранить сейчас</button> <button onclick="exportSave()">Экспортировать сохранение</button><div class="row"><input type="file" id="importfile" accept=".json"><button onclick="importSave()">Загрузить файл</button></div>`)}${card('Параметры страны',`<div class="row"><label>Название</label><input id="countryname" value="${S.name}"><button onclick="S.name=$('#countryname').value;save();render()">Изменить</button></div>`)}</div>`;
{let t=addonTab();if(t)c=t;else if(S.out)c=outBanner()+c}if(tab==='overview')c+=ovExtra()+card('👥 Что говорят люди',feedHtml());$('#content').innerHTML=(tab==='mp'&&window.NGMP?window.NGMP.tab():(tab==='events'?'':evBanner())+c);if(tab==='mp'&&window.NGMP&&window.NGMP.after)window.NGMP.after();document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));drawCharts();if(S.campaignOver)showGameOver()}
function runElection(){
 if(S.campaignOver)return;
 if(!S.out){let m0=S.parties.find(p=>p.name===S.playerParty);if(m0)m0.support=clamp(m0.support+(S.approval-50)*.12,2,75)}
 let total=S.parties.reduce((a,p)=>a+Math.max(1,p.support),0);
 S.parties.forEach(p=>p.support=Math.round(p.support/total*1000)/10);
 let seats=120,used=0;S.parties.forEach((p,i)=>{p.seats=i===S.parties.length-1?seats-used:Math.floor(p.support/100*seats);used+=p.seats});
 let winner=S.parties.slice().sort((a,b)=>b.support-a.support)[0];
 S.election=36;S.party=winner.name;
 if(winner.name===S.playerParty){S.out=null;S.approval=clamp(S.approval+5);S.legitimacy=clamp(S.legitimacy+7);S.leader='Александр Ветров';log(`Выборы выиграны! Партия «${winner.name}» сохраняет власть (${winner.support}% голосов).`);toast('ПОБЕДА! Твоя партия сохранила власть.');}
 else{ouster(`Поражение на выборах: победила партия «${winner.name}» (${winner.support}%)`)}
 save();render();
}
function showGameOver(){if(document.getElementById('gameover'))return;let w=S.parties.slice().sort((a,b)=>b.support-a.support)[0];let d=document.createElement('div');d.id='gameover';d.className='gameover';d.innerHTML=`<div class="gameover-box"><h2>ПОРАЖЕНИЕ</h2><p>Твоя партия <b>${S.playerParty}</b> проиграла выборы и потеряла власть.</p><p>Победитель: <b>${S.party}</b><br>Теперь правительство сформирует другая партия.</p><button class="primary" onclick="resetGame()">Начать новую кампанию</button></div>`;document.body.appendChild(d)}
function income(){return Math.max(100,Math.round(S.gdp*S.tax/100/12*1.12*difficulty().income*incMult()+incFlat()))}function expenses(){return Math.round((1+(S.year-1)*.025)*(300+S.pop/100000*S.health*.025+S.pop/100000*S.education*.02+S.defense*25+S.army/1000*1.5)*difficulty().expenses)+expFlat()}
window.setv=(k,v,id,s)=>{v=Math.round(+v);$('#'+id).textContent=v+s;S[k]=v};
window.campaignAction=(a)=>{if(S.campaignOver)return;let p=S.parties.find(x=>x.name===S.playerParty);if(!p)return;if(cdLeft(a)>0)return toast(cdMsg(a));let cost=a==='rally'?250:400;if(S.money<cost){toast('В казне недостаточно средств');return}S.money-=cost;cdSet(a,CDM[a]);p.support=clamp(p.support+(a==='rally'?3.5:5)*difficulty().playerDrift);S.approval=clamp(S.approval+(a==='rally'?1:2)*difficulty().approval);log(a==='rally'?'Партия провела предвыборный митинг.':'Партия опубликовала новую программу.');save();render();toast('Популярность твоей партии выросла')};
window.saveBudget=()=>{log('Утверждён новый государственный бюджет.');save();toast('Бюджет применён')};
window.act=(a)=>{if(blocked())return;if(S.campaignOver){toast('Кампания завершена. Начни новую игру.');return}if(cdLeft(a)>0)return toast(cdMsg(a));let cost=0,msg='';switch(a){
case'roads':cost=500;S.regions.forEach(r=>r.infra=clamp(r.infra+5));S.gdp+=150;msg='Начато строительство дорог.';break;
case'aid':cost=400;S.approval=clamp(S.approval+4);S.stability=clamp(S.stability+2);msg='Населению выделена помощь.';break;
case'reform':cost=700;S.tech=clamp(S.tech+5);S.employment=clamp(S.employment+2);S.approval=clamp(S.approval-1);msg='Проведена государственная реформа.';break;
case'industry':cost=800;S.gdp+=700;S.employment=clamp(S.employment+3);S.steel=clamp(S.steel+5);msg='Промышленность получила инвестиции.';break;
case'trade':cost=250;S.money+=190;S.gdp+=150;msg='Подписано торговое соглашение.';break;
case'debt':if(S.debt<=0){toast('Государственного долга нет');return}S.money-=Math.min(1000,S.money);S.debt=Math.max(0,S.debt-1000);msg='Часть долга погашена.';break;
case'recruit':cost=400;S.army+=5000;S.morale=clamp(S.morale-2);msg='Набрано 5 000 военнослужащих.';break;
case'train':cost=250;S.training=clamp(S.training+8);S.morale=clamp(S.morale+3);msg='Проведены военные учения.';break;
case'equipment':cost=500;S.equipment=clamp(S.equipment+15);S.ammo=clamp(S.ammo+8);msg='Закуплено вооружение.';break;
case'mobilize':cost=500;S.army+=15000;S.stability=clamp(S.stability-4);msg='Объявлена мобилизация.';break;
case'demobilize':S.army=Math.max(10000,S.army-10000);S.stability=clamp(S.stability+2);msg='Часть войск демобилизована.';break;
case'war':if(S.wars.length){peaceAll(false);msg='Заключён мир.';break}S.martial=!S.martial;S.war=S.martial;S.threat=clamp(S.threat+(S.martial?20:-15));msg=S.martial?'Введено военное положение.':'Военное положение отменено.';break;
case'speech':S.approval=clamp(S.approval+2);S.legitimacy=clamp(S.legitimacy+1);msg='Глава государства выступил с обращением.';break;
case'law':cost=150;S.approval=clamp(S.approval+2);S.stability=clamp(S.stability+1);S.laws.push('Социальный закон');msg='Принят социальный закон.';break;
case'election':runElection();return;
case'security':cost=350;S.coupRisk=clamp(S.coupRisk-12);msg='Безопасность государственных учреждений усилена.';break;
}if(S.money<cost){toast('Недостаточно средств!');return}S.money-=cost;if(CDM[a])cdSet(a,CDM[a]);log(msg);save();render();toast(msg)};
window.regionAct=(i,a)=>{if(blocked())return;let r=S.regions[i],cost=a==='invest'?250:a==='aid'?150:80;if(cdLeft('r'+i+a)>0)return toast(cdMsg('r'+i+a));if(S.money<cost){toast('Недостаточно средств');return}cdSet('r'+i+a,a==='invest'?3:2);S.money-=cost;if(a==='invest'){r.wealth=clamp(r.wealth+7);r.infra=clamp(r.infra+5);r.industry=clamp(r.industry+4)}if(a==='aid'){r.loyalty=clamp(r.loyalty+8);r.unrest=clamp(r.unrest-7)}if(a==='police'){r.unrest=clamp(r.unrest-10);S.stability=clamp(S.stability+1)}log(`Приняты меры в регионе ${r.name}.`);save();render()};
window.diplomacy=(i,a)=>{if(blocked())return;let r=S.relations[i],cost=a==='talk'?100:a==='trade'?250:0;if(S.money<cost){toast('Недостаточно средств');return}S.money-=cost;r.value=clamp(r.value+(a==='talk'?8:a==='trade'?12:-15),-100,100);if(a==='trade')S.money+=150;log(`Изменены дипломатические отношения с государством ${r.name}.`);save();render()};
window.createDoc=()=>{let n=$('#docname').value.trim(),t=$('#doctext').value.trim();if(!n||!t){toast('Заполните название и текст');return}S.documents.unshift({name:n,type:$('#doctype').value,text:t,date:`${months[S.month]} ${S.year}, год`});log(`Подписан документ: ${n}.`);save();render()};
window.deleteDoc=i=>{S.documents.splice(i,1);save();render()};
function monthTick(){if(S.campaignOver)return;S.month++;if(S.month>=12){S.month=0;S.year++}let inc=income(),exp=expenses();S.money+=inc-exp;if(S.money<0){S.debt+=Math.abs(S.money);S.money=0;S.stability=clamp(S.stability-1);S.inflation=clamp(S.inflation+.6,0,100)}else{S.debt=Math.max(0,S.debt-20);S.stability=clamp(S.stability+(S.money>4000?.12:(S.money>1000?0:-.15))+(66-S.stability)*.012)}S.gdp=Math.max(100,S.gdp*(1+(S.tech/22000)*1.525/(1+S.gdp/80000)+(S.employment-90)/10000-(S.inflation/20000)));S.pop=Math.max(100000,Math.round(S.pop*(1+(S.food-50)/1000000)));S.inflation=clamp(S.inflation+(S.money<1000?.3:-.15),0,100);S.food=clamp(S.food+(Math.random()*4-2)+(S.food<55?.5:0)-(S.war?2:0));S.fuel=clamp(S.fuel+(Math.random()*3-1.5)+(S.fuel<45?.4:0)-(S.war?3:0));S.energy=clamp(S.energy+(Math.random()*2-1));S.approval=clamp(S.approval+((S.money>3000?.1:-.2)+(S.inflation<10?.05:-.12))*difficulty().approval+(58-S.approval)*.02);S.legitimacy=clamp(S.legitimacy+(S.approval>50?.06:-.1)+(68-S.legitimacy)*.01);S.coupRisk=clamp(S.coupRisk+((S.stability<35?1.2:-.15)+(S.approval<25?.6:0))*difficulty().coup);S.regions.forEach(r=>{r.unrest=clamp(r.unrest+((S.stability<40?1:-.3)+(Math.random()-.5))*difficulty().unrest);r.loyalty=clamp(r.loyalty+(S.approval>50?.2:-.2));});if(S.war){S.ammo=clamp(S.ammo-2);S.equipment=clamp(S.equipment-.7);S.morale=clamp(S.morale-.4);S.threat=clamp(S.threat+1)}let my=S.parties.find(p=>p.name===S.playerParty);S.parties.forEach(p=>{let drift=(S.approval-50)*0.018+(S.stability-50)*0.008+(Math.random()-.5)*1.2;if(p.name===S.playerParty)p.support=clamp(p.support+drift*difficulty().playerDrift,2,75);else p.support=clamp(p.support-drift/(Math.max(1,S.parties.length-1))*difficulty().rivalPressure+(Math.random()-.5)*.7*difficulty().rivalPressure,2,75)});if(S.election>0)S.election--;if(S.election===0){runElection();if(S.campaignOver)return}if(S.coupRisk>85&&Math.random()<.08){S.stability=clamp(S.stability-15);S.coupRisk=25;log('Попытка переворота сорвана, правительство ослаблено!')}addonTick();log(`Завершён месяц. Бюджет: ${fmt(inc)} млн доходов, ${fmt(exp)} млн расходов.`);let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap());if(S.history.length>500)S.history=S.history.filter((_,i)=>i%2==0||i==S.history.length-1);save();render(true)}
window.exportSave=()=>{let blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='novaria-save.json';a.click();URL.revokeObjectURL(a.href)};
window.importSave=()=>{let f=$('#importfile').files[0];if(!f){toast('Выберите файл');return}let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.regions||!x.parties)throw 0;S={...initial(),...x};save();render();toast('Сохранение загружено')}catch{toast('Неверный файл сохранения')}};r.readAsText(f)};
window.resetGame=()=>{ask('Начать новую кампанию? Текущий прогресс будет удалён.',()=>{stop();S=initial();ensure();S.difficulty=selectedDifficulty||'normal';if(S.difficulty==='story'){S.money=26000;S.approval=72;S.stability=78;S.parties[0].support=42;S.parties[1].support=22;S.parties[2].support=19;S.parties[3].support=17}else if(S.difficulty==='easy'){S.money=22000;S.approval=67;S.stability=73;S.parties[0].support=38;S.parties[1].support=23;S.parties[2].support=20;S.parties[3].support=19}else if(S.difficulty==='hard'){S.money=14500;S.approval=54;S.stability=59;S.parties[0].support=30;S.parties[1].support=28;S.parties[2].support=22;S.parties[3].support=20}else if(S.difficulty==='expert'){S.money=10500;S.approval=47;S.stability=50;S.parties[0].support=29;S.parties[1].support=27;S.parties[2].support=24;S.parties[3].support=20}S.history=[];let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap());save();document.getElementById('gameover')?.remove();tab='overview';render();window.scrollTo(0,0);toast('Новая кампания: '+difficulty().label)})};
function play(){if(running||S.campaignOver){if(S.campaignOver)toast('Кампания завершена — начни новую игру');return}running=true;timer=setInterval(monthTick,+$('#speed').value);stats()}
function pause(){running=false;clearInterval(timer);timer=null;stats()}
function stop(){pause();$('#speed').value='1800';toast('Время остановлено, скорость сброшена до 1×')}
$('#play').onclick=play;$('#pause').onclick=pause;$('#stop').onclick=stop;$('#step').onclick=()=>{pause();monthTick()};$('#speed').onchange=()=>{if(running){pause();play()}};
$('#tabs').onclick=e=>{let b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render()}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
/* ===== ДОПОЛНЕНИЯ v2 ===== */
let down=false;document.addEventListener('pointerdown',()=>down=true,true);['pointerup','pointercancel'].forEach(e=>document.addEventListener(e,()=>setTimeout(()=>down=false,80),true));
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
function snap(){let mp=S.parties.find(p=>p.name===S.playerParty);return{year:S.year,month:S.month,gdp:S.gdp,money:S.money,debt:S.debt,approval:S.approval,stability:S.stability,partySupport:mp?mp.support:0,pop:S.pop,food:S.food,fuel:S.fuel,inflation:S.inflation,army:S.army,threat:S.threat,employment:S.employment,trust:S.trust}}
const C0=[['Аркания',15,65,.4,'Торговая держава'],['Белория',48,42,.2,'Дружелюбный сосед'],['Тарвия',-20,80,.8,'Милитаристы'],['Дорвин',5,55,.5,'Союз торговцев'],['Силезия',-5,38,.3,'Горная республика'],['Мерейя',25,48,.2,'Морская федерация'],['Остмарк',-35,70,.7,'Имперские амбиции']];

const CDM={speech:4,law:6,aid:3,trade:4,security:3,rally:2,program:4,reform:4,industry:3,roads:2,recruit:2,train:3,equipment:2,mobilize:6};
const cdLeft=k=>((S.cd||{})[k])||0;
const cdSet=(k,n)=>{S.cd=S.cd||{};S.cd[k]=n};
const cdTick=()=>{if(!S.cd)return;for(let k in S.cd)if(S.cd[k]>0)S.cd[k]--};
const cdMsg=k=>`Подождите ещё ${cdLeft(k)} мес.`;
const DN=['Иван Корнев','Мария Лозинская','Павел Рудь','Олег Баранов','Елена Ветрова','Артём Щукин','Нина Орлова','Глеб Сомов'];
function ensure(){ensureHoi();if(!Array.isArray(S.conquered))S.conquered=[];if(!Array.isArray(S.botWars))S.botWars=[];if(!S.deps)S.deps=DN.map((n,i)=>({n,p:S.parties[i%S.parties.length].name,l:Math.round(rnd(45,80))}));if(!S.feed)S.feed=[];if(S.fund==null)S.fund=0;if(S.trust==null)S.trust=70;
C0.forEach(c=>{let r=S.relations.find(x=>x.name===c[0]);if(!r)S.relations.push(r={name:c[0],value:c[1],power:c[2]});if(r.aggr==null){r.aggr=c[3];r.trait=c[4];r.intent='Наблюдает и ждёт'}if(r.gdp==null)r.gdp=Math.round(18000+c[2]*260);if(r.money==null)r.money=Math.round(5000+c[2]*90);if(r.pop==null)r.pop=Math.round(900000+c[2]*18000);if(r.stability==null)r.stability=55+Math.round(c[1]/10);if(r.army==null)r.army=Math.round(c[2]*620);if(r.owner==null)r.owner=r.name});['cannon','bomb','petard'].forEach(k=>{if(S[k]==null)S[k]=0})}
function say(t,m){ensure();S.feed.unshift({t,m:m||'🙂',d:`${months[S.month]} ${S.year}`});S.feed=S.feed.slice(0,40)}
const blocked=()=>{if(S.campaignOver){toast('Кампания завершена. Начни новую игру.');return true}if(S.out){toast('Вы в оппозиции — вернуться к власти можно во вкладке «Возврат»');return true}return false};
const myPower=()=>S.army/1000+S.air*1.5+S.navy*2+(S.bomb||0)*15+(S.cannon||0)*.5;
function aiTick(){
 const me=myPower();
 // Каждое государство самостоятельно развивает экономику, армию и население.
 S.relations.forEach(c=>{
  const investment=Math.random();
  const aiGrowth=c.gdp<S.gdp?.006:.0025;c.gdp=Math.max(5000,Math.round(c.gdp*(1+(investment<.28?aiGrowth:investment<.65?aiGrowth*.55:-.0003))));
  c.money=Math.max(0,Math.round(c.money+(c.gdp*.0008)-(c.army*.025)));
  c.pop=Math.round(c.pop*(1+(c.stability>45?.0007:.0001)));
  c.stability=clamp(c.stability+(c.money>10000?.15:-.25),10,95);
  // ИИ вкладывает ресурсы в армию, технологии и промышленность.
  if(c.money>3500&&Math.random()<.48){c.money-=Math.round(250+investment*350);c.power=Math.max(10,Math.round(c.power+(c.aggr>.55?1.7:.9)));c.army=Math.round(c.army*1.012)}
  else c.power=Math.max(10,Math.round(c.power+rnd(-.3,.9)));
  c.value=clamp(c.value+(c.value>0?.1:-.1)*c.aggr,-100,100);
  if(c.value>40){c.intent='Развивает торговлю и экономику';if(Math.random()<.08){S.money+=150;log(`${c.name} закупил ваши товары: +150 млн`)}}
  else if(me>c.power*1.5&&c.value<30){c.intent='Опасается вашей военной мощи';c.value=clamp(c.value-.4,-100,100)}
  else if(c.power>me*1.2&&c.aggr>.5&&c.value<-10){c.intent='Усиливает армию и рассматривает нападение';S.threat=clamp(S.threat+1.5);if(!S.war&&c.value<-45&&Math.random()<.04*c.aggr){startWar(c.name,true);log(`⚔️ ${c.name} объявил вам войну!`);say(`${c.name} напал на нас!`,'😱');pause()}}
  else c.intent='Наблюдает и развивает государство';
  if(S.war&&c.value>50&&Math.random()<.1){S.money+=300;log(`${c.name} помогает союзнику деньгами: +300 млн`)}
  if(!S.war&&c.value<-60&&Math.random()<.05){S.gdp*=.995;log(`${c.name} ввёл против вас торговые санкции`)}
 });
 // Автономные конфликты между ботами: фронт может закончиться сменой владельца территории.
 if(S.botWars.length<2&&Math.random()<.045){
  const candidates=S.relations.filter(c=>c.owner===c.name&&!S.botWars.some(w=>w.a===c.name||w.b===c.name));
  if(candidates.length>1){const a=candidates.filter(c=>c.aggr>.45&&c.value<0).sort((x,y)=>y.aggr-x.aggr)[0];const b=a&&candidates.filter(c=>c!==a).sort((x,y)=>x.power-y.power)[0];if(a&&b){S.botWars.push({a:a.name,b:b.name,progress:0,months:0});log(`🌍 ${a.name} и ${b.name} начали войну между собой.`)}}
 }
 S.botWars=S.botWars.filter(w=>{const a=rel(w.a),b=rel(w.b);if(!a||!b)return false;w.months++;w.progress+=Math.max(1,(a.power-b.power)/(a.power+b.power)*9+rnd(-2,3));if(w.progress>=100){b.owner=a.name;a.power=Math.round(a.power*1.04);log(`🏴 ${a.name} победила в войне с ${b.name} и установила контроль над её территорией.`);return false}if(w.progress<=-45||w.months>=24){log(`🕊 Война ${a.name} и ${b.name} завершилась без захвата территории.`);return false}return true});
}
function people(){let L=[],h=S.history,p=h[h.length-2];if(S.approval<35)L.push(['Правительству пора уходить!','😡']);if(S.inflation>12)L.push(['Цены растут каждый месяц','😟']);if(S.employment<85)L.push(['Работы нет, заводы закрываются','😞']);if(S.war)L.push(['Сыновья на фронте, когда это кончится?','😢']);if(S.approval>65)L.push(['Жить стало лучше, спасибо!','😊']);if(S.tax>35)L.push(['Налоги душат малый бизнес','😠']);if(S.food<35)L.push(['Полки пусты, не хватает еды','😰']);if(S.stability<40)L.push(['На улицах неспокойно — выходим на протест','✊']);if(p&&S.gdp>p.gdp*1.003)L.push(['Экономика растёт, ура!','😃']);if(S.out)L.push(['Новая власть — посмотрим, что она сделает','🤔']);if(!L.length)L.push(['Всё спокойно, живём','🙂']);let a=pick(L);say(a[0],a[1]);if(a[1]=='✊'||a[1]=='😡')S.regions.forEach(r=>r.unrest=clamp(r.unrest+1))}
const depLoyal=()=>S.deps.reduce((a,d)=>a+d.l,0)/S.deps.length;
const OUST=[
[()=>S.approval<15,['Массовые протесты вынудили правительство уйти','Толпа заняла здание парламента','Всеобщая забастовка парализовала страну','Референдум об отзыве власти','Союзники отвернулись из-за ненависти народа']],
[()=>S.stability<15,['Хаос на улицах: контроль потерян','Беспорядки охватили все регионы','Регионы объявили независимость','Полиция отказалась подчиняться','Страна распалась на враждующие зоны']],
[()=>S.coupRisk>90,['Генералы устроили военный переворот','Гвардия арестовала лидера ночью','Заговор в штабе армии','Офицеры захватили телецентр','Охрана дворца перешла к заговорщикам']],
[()=>S.debt>S.gdp*.6,['Дефолт: кредиторы потребовали отставки','Банкротство государства','Кредиторы поставили условием смену власти','Валюта рухнула, банки закрылись','Долговой кризис разрушил коалицию']],
[()=>S.legitimacy<15,['Суд признал власть нелегитимной','Коррупционный скандал сверг правительство','Утечка документов уничтожила репутацию','Выборы признаны сфальсифицированными','Парламент объявил вотум недоверия']],
[()=>S.war&&S.morale<12,['Армия разбита, правительство капитулировало','Поражение в войне и крах режима','Солдаты бросили фронт и пошли на столицу','Враг потребовал смены власти','Мирный договор требует отставки лидера']],
[()=>S.inflation>45,['Гиперинфляция смела правительство','Деньги обесценились — народ вышел на улицы','Хлебные бунты свергли власть','Штурм резиденции из-за нищеты','Накопления сгорели, люди требуют отставки']],
[()=>S.food<8,['Голод вызвал восстание','Голодные бунты в столице','Блокада и голод заставили уйти','Фермеры перекрыли дороги','Волна голода обрушила правительство']],
[()=>depLoyal()<20,['Депутаты проголосовали за вотум недоверия','Партия исключила лидера','Депутаты заблокировали бюджет','Коалиция распалась из-за интриг','Спикер объявил лидера отстранённым']],
[()=>S.trust<8,['Крах финансовой системы смёл правительство','Рынки закрылись — власть рухнула','Банки лопнули, люди штурмуют парламент','Валютный кризис: правительство бежало','Инвесторы ушли — страна обанкротилась']],
[()=>S.employment<62||(S.threat>96&&threatLethal()),['Массовая безработица и крах заводов','Атомная паника: люди требуют смены власти','Международный ультиматум о смене власти','Угроза вторжения вынудила уйти','Державы признали правительство в изгнании']]];
const OUSTWHY=['низкое одобрение','хаос и беспорядки','угроза переворота','огромный долг','потеря легитимности','поражение в войне','гиперинфляция','голод','депутаты против вас','крах финансов','безработица или угроза вторжения'];
const RET=['Массовые митинги','Народный референдум','Коалиция с другими партиями','Всеобщая забастовка','Компромат на правительство','Досрочные выборы','Популярный новый лидер','Переговоры с депутатами','Международная поддержка','Агитация в СМИ','Сбор подписей','Обращение к армии','Судебный иск','Союз с профсоюзами','Благотворительные акции','Тайные переговоры','Реформа партии','Уличный фестиваль','Антикоррупционное расследование','Поддержка регионов','Голосование в парламенте','Обещание налоговых льгот','Союз с общинами','Голоса диаспоры','Партийный съезд'];
function ouster(c){if(S.out||S.campaignOver)return;S.crisis=0;let w=S.parties.filter(p=>p.name!==S.playerParty).sort((a,b)=>b.support-a.support)[0];S.out={cause:c,months:0};S.fund=800;S.party=w.name;S.leader='Новое правительство';log(`🚨 Вы потеряли власть: ${c}`);say('Власть сменилась!','😮');pause();toast('Вы потеряли власть! Откройте «Возврат»');tab='comeback';setTimeout(render,120)}
window.ret=i=>{if(!S.out)return;let cost=100+(i%6)*80,my=S.parties.find(p=>p.name===S.playerParty),ch=(8+(i*7)%22)/100+(my?my.support:0)/300;if(S.fund<cost)return toast('В партийной кассе не хватает денег');S.fund-=cost;if(Math.random()<ch){S.out=null;S.grace=12;S.crisis=0;S.party=S.playerParty;S.leader='Александр Ветров';S.approval=55;S.stability=50;S.legitimacy=50;S.coupRisk=20;S.election=36;S.deps.forEach(d=>d.l=55);log(`✅ Вы вернулись к власти: ${RET[i]}!`);say('Старый лидер вернулся!','🎉');toast('ВЫ ВЕРНУЛИСЬ К ВЛАСТИ!');tab='overview'}else{if(my)my.support=clamp(my.support-1);log(`Попытка не удалась: ${RET[i]}`);toast('Не вышло. Попробуйте другой путь')}save();render()};
window.buy=k=>{if(blocked())return;let c={cannon:300,bomb:900,petard:20}[k];if(S.money<c)return toast('Недостаточно средств');S.money-=c;S[k]++;log(`Закуплено: ${{cannon:'пушка',bomb:'бомба',petard:'петарда'}[k]}`);if(k=='bomb')S.relations.forEach(r=>r.value=clamp(r.value-3,-100,100));save();render()};
window.fire=k=>{if(blocked())return;if(!(S[k]>0))return toast('Сначала купите');S[k]--;let R=v=>S.relations.forEach(r=>r.value=clamp(r.value+v,-100,100));
if(k=='cannon'){if(S.war){S.threat=clamp(S.threat-6);S.morale=clamp(S.morale+2);log('Пушки накрыли позиции врага');say('Наша артиллерия работает!','💪')}else{R(-4);S.approval=clamp(S.approval-1);log('Холостой залп из пушки — соседи нервничают');say('Зачем стрелять из пушек в мирное время?','😟')}}
if(k=='bomb'){if(S.war){S.threat=clamp(S.threat-18);S.approval=clamp(S.approval-3);R(-10);log('💣 Применена бомба! Мир осуждает');say('Это ужас… нас осудит весь мир','😱')}else{R(-25);S.stability=clamp(S.stability-8);S.approval=clamp(S.approval-12);S.coupRisk=clamp(S.coupRisk+10);log('💣 Бомба в мирное время! Скандал!');say('Вы сошли с ума?! Бомба в мирное время!','🤬')}}
if(k=='petard'){S.approval=clamp(S.approval+.5);if(Math.random()<.12){S.stability=clamp(S.stability-2);log('Петарда подожгла ларёк на параде');say('Горит ларёк! Ха-ха… и ужас','😂')}else{log('Петарды на празднике подняли настроение');say('Классный салют на параде!','😂')}}
save();render()};
window.dep=(i,a)=>{if(blocked())return;let d=S.deps[i];if(a=='bribe'){if(S.money<200)return toast('Недостаточно средств');S.money-=200;d.l=clamp(d.l+15);S.legitimacy=clamp(S.legitimacy-1);log(`Депутат ${d.n} получил «поддержку» 200 млн`)}if(a=='meet'){d.l=clamp(d.l+5);log(`Встреча с депутатом ${d.n}`)}if(a=='expel'){d.l=0;S.legitimacy=clamp(S.legitimacy-2);S.deps[i]=Object.assign(d,{n:pick(DN)+' мл.',l:50});log(`Депутат ${d.n} заменён`);say('Депутата выгнали — скандал!','🤨')}save();render()};
function addonTick(){ensure();cdTick();aiTick();people();if(!S.out){econTick();polTick();hoiTick()}S.deps.forEach(d=>{d.l=clamp(d.l+(S.approval-50)*.03+(55-d.l)*.03+rnd(-1.5,1.5));if(d.l<20&&Math.random()<.1)log(`Депутат ${d.n} интригует против правительства`)});
if(S.out){S.out.months++;let my=S.parties.find(p=>p.name===S.playerParty);S.fund+=Math.round((my?my.support:0)*2);if(S.out.months>=72){S.campaignOver=true;log('Вы не вернулись к власти за 6 лет.')}return}
if(S.grace>0)S.grace--;
let hit=OUST.findIndex(o=>o[0]());
if(hit<0){S.crisis=Math.max(0,(S.crisis||0)-1)}
else{S.crisis=(S.crisis||0)+1;S.crisisWhy=OUSTWHY[hit];S.crisisIdx=hit;
if(S.crisis===1&&S.grace<=0){log(`⚠️ Власти грозит отставка: ${OUSTWHY[hit]}. Есть несколько месяцев, чтобы исправить`);say('Власть шатается, народ ждёт перемен','😟');toast('⚠️ Угроза отставки: '+OUSTWHY[hit])}
if(S.crisis>=crisisNeed()&&S.grace<=0&&Math.random()<ousterChance()){S.crisis=0;ouster(pick(OUST[hit][1]))}}}
const CH=[['chartEconomy','Экономика: ВВП, казна, долг',[{key:'gdp',name:'ВВП',color:'#69aef2'},{key:'money',name:'Казна',color:'#55c58a'},{key:'debt',name:'Долг',color:'#ef6d72'}]],['chartPolitics','Политика: партия, одобрение, стабильность',[{key:'partySupport',name:'Партия',color:'#f0bd58'},{key:'approval',name:'Одобрение',color:'#69aef2'},{key:'stability',name:'Стабильность',color:'#55c58a'}]],['chartPopulation','Население и ресурсы',[{key:'pop',name:'Население',color:'#69aef2'},{key:'food',name:'Еда',color:'#55c58a'},{key:'fuel',name:'Топливо',color:'#f0bd58'}]],['chartInfl','Цены и работа',[{key:'inflation',name:'Инфляция',color:'#ef6d72'},{key:'employment',name:'Занятость',color:'#55c58a'},{key:'trust',name:'Доверие рынков',color:'#f0bd58'}]],['chartArmy','Армия и угроза',[{key:'army',name:'Армия',color:'#f0bd58'},{key:'threat',name:'Угроза',color:'#ef6d72'}]]];
function trend(s){let h=S.history;if(h.length<2)return'<p class="muted">Нужно хотя бы 2 месяца игры</p>';return'<div style="overflow:auto"><table><tr><th>Показатель</th><th>Старт</th><th>Сейчас</th><th>Динамика</th><th>Мин / Макс</th></tr>'+s.map(z=>{let v=h.map(q=>+q[z.key]||0),a=v[0],b=v[v.length-1],d=a?(b-a)/Math.abs(a)*100:0;return`<tr><td style="color:${z.color}">● ${z.name}</td><td>${fmt(a)}</td><td>${fmt(b)}</td><td style="color:var(${d>=0?'--green':'--red'})">${d>=0?'▲ рост':'▼ упадок'} ${Math.abs(d).toFixed(1)}%</td><td>${fmt(Math.min(...v))} / ${fmt(Math.max(...v))}</td></tr>`}).join('')+'</table></div>'}
const chartsHtml=()=>`<p class="muted" style="margin:0 0 8px">С начала партии: ${S.history.length} мес. Каждая линия нарисована в своём масштабе — так видны рост и падение.</p><div class="grid">`+CH.map(c=>card(c[1],`<div class="chart-wrap"><canvas id="${c[0]}"></canvas></div>${trend(c[2])}`)).join('')+'</div>';
function drawOne(id,series){let cv=document.getElementById(id);if(!cv)return;let r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;cv.width=Math.max(300,r.width*d);cv.height=Math.max(160,r.height*d);let x=cv.getContext('2d'),w=cv.width,h=cv.height,L=8*d,T=20*d,B=22*d,hs=S.history,n=hs.length;x.clearRect(0,0,w,h);x.font=`${11*d}px system-ui`;x.strokeStyle='#344b63';x.lineWidth=d;for(let i=0;i<=4;i++){let y=T+(h-T-B)*i/4;x.beginPath();x.moveTo(L,y);x.lineTo(w-L,y);x.stroke()}
if(n<2){x.fillStyle='#a9bacb';x.fillText('График появится после нескольких месяцев игры',L,h/2);return}
series.forEach((z,j)=>{let v=hs.map(q=>+q[z.key]||0),mn=Math.min(...v),mx=Math.max(...v);if(mx===mn)mx=mn+1;let Y=a=>T+(1-(a-mn)/(mx-mn))*(h-T-B);x.strokeStyle=z.color;x.lineWidth=2.5*d;x.beginPath();v.forEach((a,i)=>{let px=L+i/(n-1)*(w-2*L);i?x.lineTo(px,Y(a)):x.moveTo(px,Y(a))});x.stroke();x.fillStyle=z.color;x.beginPath();x.arc(w-L,Y(v[n-1]),3.5*d,0,7);x.fill();x.fillText(`${z.name}: ${fmt(v[n-1])}`,L+j*(w/series.length),13*d)});
x.fillStyle='#a9bacb';x.fillText(`Год ${hs[0].year}`,L,h-6*d);let t=`Год ${hs[n-1].year}`;x.fillText(t,w-L-x.measureText(t).width,h-6*d)}
function drawCharts(){CH.forEach(c=>drawOne(c[0],c[2]))}
const mood=v=>v>40?'🤝 Друг':v>10?'🙂 Дружелюбен':v>-20?'😐 Нейтрален':v>-50?'🧊 Холоден':'😠 Враждебен';
const feedHtml=()=>S.feed.length?S.feed.slice(0,14).map(f=>`<div class="choice"><span style="font-size:20px">${f.m}</span> ${f.t} <small class="muted">· ${f.d}</small></div>`).join(''):'<p class="muted">Пока тихо. Пустите время — люди начнут говорить.</p>';
function outBanner(){return S.out?`<section class="panel" style="border-color:#c3943e;margin-bottom:10px"><h2>🚨 Вы в оппозиции</h2><p>${S.out.cause}.<br>Правит: <b>${S.party}</b>. Месяцев в оппозиции: ${S.out.months} / 72. Партийная касса: <b>${fmt(S.fund)} млн</b>.</p></section>`:''}
function addonTab(){ensure();let b=outBanner();let hx=hoiTab();if(hx!=null)return b+hx;
if(tab=='charts')return b+chartsHtml();if(tab=='finance')return b+finTab0()+card('🏭 Экономические программы',xcards(ECO2,'e'));if(tab=='power')return b+card('🗳 Власть и политика',`<p class="muted">Режим: <b>${S.gov}</b> · легитимность ${Math.round(S.legitimacy)}% · риск переворота ${Math.round(S.coupRisk)}%</p>`+xcards(POL,'p'));
if(tab=='people')return b+`<div class="grid">${card('👥 Что говорят люди',feedHtml())}${card('Настроение страны',bar('Одобрение',S.approval)+bar('Стабильность',S.stability)+`<p class="muted">Недовольство регионов: ${S.regions.map(r=>`${r.name} ${Math.round(r.unrest)}%`).join(' · ')}</p>`)}</div>`;
if(tab=='deputies')return b+card('🏛 Депутаты парламента',`<p class="muted">Средняя лояльность: <b>${Math.round(depLoyal())}%</b>. Если она упадёт ниже 20% — возможен вотум недоверия.</p><div class="cards">${S.deps.map((d,i)=>`<div class="mini"><b>${d.n}</b>${d.p}${bar('Лояльность',d.l)}<div class="actions"><button onclick="dep(${i},'meet')">Встреча</button><button onclick="dep(${i},'bribe')">Подкуп · 200</button><button class="danger" onclick="dep(${i},'expel')">Заменить</button></div></div>`).join('')}</div>`);
if(tab=='arms')return b+card('💣 Арсенал',`<div class="cards">${[['cannon','Пушка','300 млн'],['bomb','Бомба','900 млн'],['petard','Петарда','20 млн']].map(a=>`<div class="mini"><b>${a[1]}: ${S[a[0]]} шт.</b><div class="actions"><button onclick="buy('${a[0]}')">Купить · ${a[2]}</button><button class="danger" onclick="fire('${a[0]}')">Применить</button></div></div>`).join('')}</div><p class="muted">Пушка и бомба помогают на войне, но в мирное время — скандал. Бомба пугает всех соседей. Петарда — для парада 🎆</p>`);
if(tab=='comeback')return S.out?b+card('🔙 Путь к возвращению (25 способов)',`<div class="cards">${RET.map((n,i)=>{let my=S.parties.find(p=>p.name===S.playerParty);return`<div class="mini"><b>${n}</b>Цена ${100+(i%6)*80} млн · шанс ~${Math.round(((8+(i*7)%22)/100+(my?my.support:0)/300)*100)}%<div class="actions"><button class="primary" onclick="ret(${i})">Попробовать</button></div></div>`}).join('')}</div>`):card('Возврат','Вы у власти. Эта вкладка нужна, только если вас сместят.');
if(tab=='diplomacy')return b+`<div class="cards">${S.relations.map((r,i)=>`<div class="mini"><b>${r.name}</b><span class="muted">${r.trait||''}</span><br>${mood(r.value)} (${Math.round(r.value)})<div class="bar"><i style="width:${clamp((r.value+100)/2)}%"></i></div>Мощь: ${r.power}<br><small class="muted">🧠 ${r.intent||''}</small><div class="actions"><button onclick="diplomacy(${i},'talk')">Переговоры · 100</button><button onclick="diplomacy(${i},'trade')">Торговля · 250</button><button onclick="diplomacy(${i},'sanction')">Санкции</button></div></div>`).join('')}</div>`;
return null}

/* ===== ФИНАНСЫ: рискованная экономика ===== */
const ECO={
print:[0,()=>{S.money+=5000;S.printed=(S.printed||0)+12;S.inflation=clamp(S.inflation+3,0,100);S.trust=clamp(S.trust-4)},'Напечатано 5000 млн','Деньги из воздуха: +5000, но инфляция и недоверие'],
loan:[0,()=>{S.money+=8000;S.debt+=8000;S.trust=clamp(S.trust-(S.debt>S.gdp*.3?6:2))},'Взят внешний заём 8000','+8000 сейчас, потом проценты каждый месяц'],
sell:[0,()=>{S.money+=3000;S.steel=clamp(S.steel-15);S.fuel=clamp(S.fuel-15);S.food=clamp(S.food-10)},'Проданы стратегические резервы','+3000, но пустеют склады'],
priv:[0,()=>{S.money+=4000;S.priv=(S.priv||0)+1;S.employment=clamp(S.employment-2,60,100);S.approval=clamp(S.approval-3);S.trust=clamp(S.trust+3)},'Приватизация госкомпаний','+4000 сразу, но меньше доходов и работы'],
nat:[3000,()=>{S.nat=(S.nat||0)+1;S.approval=clamp(S.approval+2);S.trust=clamp(S.trust-6);S.gdp*=.99},'Национализация заводов','Доход +60/мес, но рынки бегут · 3000'],
cut:[0,()=>{S.money+=1500;S.approval=clamp(S.approval-8);S.stability=clamp(S.stability-4)},'Урезаны зарплаты бюджетникам','+1500, но люди в ярости'],
freeze:[600,()=>{S.inflation=clamp(S.inflation-3,0,100);S.fuel=clamp(S.fuel-5);S.food=clamp(S.food-4)},'Заморожены цены','Инфляция −3, но дефицит · 600'],
gamble:[3000,()=>{if(Math.random()<.45){S.money+=6000;say('Государство выиграло на бирже!','🤑');log('Биржа принесла прибыль +6000')}else{S.approval=clamp(S.approval-3);S.legitimacy=clamp(S.legitimacy-3);say('Правительство проиграло наши налоги на бирже!','🤬');log('Биржевая авантюра провалилась')}},'Игра на бирже','45% удвоить деньги, 55% потерять всё · 3000'],
steal:[0,()=>{S.money=Math.max(0,S.money-2000);S.stolen=(S.stolen||0)+2000;if(Math.random()<.25){S.legitimacy=clamp(S.legitimacy-15);S.approval=clamp(S.approval-10);S.coupRisk=clamp(S.coupRisk+8);say('Журналисты нашли дворцы у министров!','🤬');log('Скандал: хищение из казны вскрыто')}},'Присвоено из казны 2000','Вы богатеете, но 25% шанс скандала'],
mega:[6000,()=>{S.mega=(S.mega||0)+1;S.approval=clamp(S.approval+6);S.gdp+=300;S.legitimacy=clamp(S.legitimacy-3)},'Начат мегапроект (дворец/олимпиада)','Одобрение +6, но −80/мес · 6000'],
devalue:[0,()=>{S.inflation=clamp(S.inflation+6,0,100);S.trust=clamp(S.trust-5);S.gdp*=1.01},'Девальвация валюты','Экспорт растёт, но цены и недоверие'],
default:[0,()=>{S.debt=0;S.trust=5;S.gdp*=.95;S.stability=clamp(S.stability-10);S.approval=clamp(S.approval-5)},'ОБЪЯВЛЕН ДЕФОЛТ','Долг = 0, но рынки закрыты и хаос']};
window.fin=k=>{if(blocked())return;let e=ECO[k];if(S.money<e[0])return toast('Недостаточно средств');S.money-=e[0];e[1]();clampFix();log(e[2]);doc0(e[2]);save();render();toast(e[2])};
const doc0=t=>{S.documents.unshift({name:t,type:'Бюджет',text:'Решение правительства.',date:`${months[S.month]} ${S.year}, год`});S.documents=S.documents.slice(0,60)};
const clampFix=()=>{['stability','approval','legitimacy','food','fuel','steel','coupRisk'].forEach(k=>S[k]=clamp(S[k]))};
function econTick(){let t=S.trust,pr=S.printed=(S.printed||0)*.93;
if(S.tax>35){S.gdp*=1-(S.tax-35)*.0006;S.employment=clamp(S.employment-(S.tax-35)*.03,60,100);S.approval=clamp(S.approval-(S.tax-35)*.04);t-=.3}
if(S.health<5){S.approval=clamp(S.approval-.4);if(Math.random()<.05){S.pop=Math.round(S.pop*.995);log('Вспышка болезни: нет денег на медицину');say('В больницах нет лекарств','😢')}}
if(S.education<5)S.tech=clamp(S.tech-.3);if(S.defense<5)S.coupRisk=clamp(S.coupRisk+.8);
if(S.debt>0)S.money-=Math.round(S.debt*(.002+Math.max(0,60-t)*.0002));
S.inflation=clamp(S.inflation+pr*.01,0,100);if(pr>15)t-=1;
if(S.debt>S.gdp*.35)t-=.7;if(S.inflation>20)t-=.5;if(S.stability<30)t-=.3;if(S.inflation<8&&S.debt<S.gdp*.2)t+=.4;
S.money+=(S.nat||0)*60-(S.priv||0)*30-(S.mega||0)*80;S.gdp*=1-(S.nat||0)*.0005;
S.trust=clamp(t);
if(S.trust<25){S.gdp*=.99;S.money-=200;if(Math.random()<.15){S.money*=.7;S.approval=clamp(S.approval-8);log('🏦 Банковская паника: вкладчики забирают деньги');say('Деньги из банков не выдают!','😱')}}
if(S.money<0&&S.debt>S.gdp*.5)S.trust=clamp(S.trust-2)}
const finTab0=()=>{let pr=Math.round(S.printed||0),it=Math.round(S.debt*(.003+Math.max(0,60-S.trust)*.0002));return card('🏦 Финансы и риски',`<div class="cards"><div class="mini">${bar('Доверие рынков',S.trust)}</div><div class="mini">Долг: <b>${fmt(S.debt)}</b><br>Проценты: <b>${fmt(it)} млн/мес</b></div><div class="mini">Напечатанные деньги: <b>${pr}</b><br>Инфляция: <b>${Math.round(S.inflation)}%</b></div><div class="mini">Нац.: ${S.nat||0} · Прив.: ${S.priv||0} · Мегапроекты: ${S.mega||0}<br>Присвоено: ${fmt(S.stolen||0)}</div></div><p class="muted">Глупые решения могут обрушить страну: гиперинфляция, дефолт, банковская паника, голод — и вас сместят.</p><div class="cards">${Object.keys(ECO).map(k=>`<div class="mini"><b>${ECO[k][2]}</b><span class="muted">${ECO[k][3]}</span><div class="actions"><button class="${['print','steal','gamble','default','sell'].includes(k)?'danger':'primary'}" onclick="fin('${k}')">Сделать</button></div></div>`).join('')}</div>`)};

/* ===== БОЛЬШЕ ЭКОНОМИКИ И ПОЛИТИКИ ===== */
const rv=v=>S.relations.forEach(r=>r.value=clamp(r.value+v,-100,100)),rp=(v,all)=>S.parties.forEach(p=>{if(p.name!==S.playerParty)p.support=clamp(p.support+v,2,75)}),dl=v=>S.deps.forEach(d=>d.l=clamp(d.l+v));
const ECO2={
farm:[800,()=>{S.food=clamp(S.food+10);S.approval=clamp(S.approval+1)},'Субсидии фермерам','Еда +10 · 800'],
zone:[1500,()=>{S.gdp+=400;S.trust=clamp(S.trust+4);S.regions[1].wealth=clamp(S.regions[1].wealth+4)},'Свободная экономическая зона','ВВП +400, доверие + · 1500'],
amnesty:[0,()=>{S.money+=1500;S.trust=clamp(S.trust-2);S.legitimacy=clamp(S.legitimacy-3)},'Налоговая амнистия бизнесу','+1500, но честные обижены',1],
pens:[0,()=>{S.money+=2000;S.approval=clamp(S.approval-10);S.stability=clamp(S.stability-3)},'Пенсионная реформа','+2000, но пенсионеры в ярости',1],
tariff:[0,()=>{S.gdp*=1.01;rv(-3);S.inflation=clamp(S.inflation+1,0,100)},'Пошлины на импорт','ВВП +1%, отношения −3, цены +'],
grain:[700,()=>S.food=clamp(S.food+12),'Государственные запасы зерна','Еда +12 · 700'],
jobs:[600,()=>{S.employment=clamp(S.employment+3,60,100);S.approval=clamp(S.approval+2)},'Программа занятости','Занятость +3 · 600'],
vc:[1200,()=>{if(Math.random()<.75)S.tech=clamp(S.tech+6);else{log('Венчурный фонд прогорел');say('Фонд растратил деньги','🤨')}},'Венчурный фонд технологий','Технологии +6, 25% провал · 1200'],
rich:[0,()=>{S.money+=1800;S.trust=clamp(S.trust-3);S.approval=clamp(S.approval+3)},'Налог на богатых','+1800, бизнес недоволен'],
sme:[500,()=>{S.gdp+=200;S.employment=clamp(S.employment+1,60,100)},'Кредиты малому бизнесу','ВВП +200 · 500'],
grid:[1000,()=>S.energy=clamp(S.energy+10),'Энергосети','Энергия +10 · 1000']};
const POL={
prop:[500,()=>{S.approval=clamp(S.approval+6);S.legitimacy=clamp(S.legitimacy-3);S.prop=(S.prop||0)+2},'Государственная пропаганда','Одобрение +6; частое — скандал · 500'],
censor:[300,()=>{S.stability=clamp(S.stability+3);S.legitimacy=clamp(S.legitimacy-4);say('Нам закрыли рот…','🤐')},'Цензура СМИ','Стабильность +3, легитимность −4 · 300',1],
coal:[600,()=>{let p=S.parties.find(x=>x.name!==S.playerParty);if(p){S.parties.find(x=>x.name===S.playerParty).support+=4;p.support+=2}dl(8)},'Коалиция с другой партией','Партия +4, депутаты +8 · 600'],
bribeop:[500,()=>{rp(-3);S.legitimacy=clamp(S.legitimacy-2)},'Подкуп оппозиции','Соперники −3% · 500',1],
arrest:[200,()=>{rp(-5);S.stability=clamp(S.stability+2);S.legitimacy=clamp(S.legitimacy-8);say('Оппозиционеров арестовывают!','😨')},'Арест оппозиционеров','Соперники −5%, легитимность −8 · 200',1],
delay:[0,()=>{S.election+=12;S.legitimacy=clamp(S.legitimacy-12);S.approval=clamp(S.approval-6);S.crisis=(S.crisis||0)+0;say('Выборы отложили! Это диктатура?','😠')},'Отложить выборы на год','Но легитимность −12',1],
refer:[400,()=>{if(Math.random()<.55){S.legitimacy=clamp(S.legitimacy+10);say('Референдум поддержал власть','🙂')}else{S.legitimacy=clamp(S.legitimacy-10);say('Референдум провален!','😡')}},'Референдум','55% успех: ±10 легитимности · 400'],
free:[0,()=>{S.legitimacy=clamp(S.legitimacy+3);S.approval=clamp(S.approval+2);S.stability=clamp(S.stability-1)},'Амнистия политзаключённых','Легитимность +3'],
purge:[300,()=>{S.coupRisk=clamp(S.coupRisk-15);S.morale=clamp(S.morale-6)},'Чистка в армии','Переворот −15, дух −6 · 300',1],
pay:[700,()=>{S.coupRisk=clamp(S.coupRisk-8);S.morale=clamp(S.morale+5)},'Повысить жалованье армии','Переворот −8, дух +5 · 700'],
anti:[500,()=>{S.legitimacy=clamp(S.legitimacy+6);dl(-6);S.money+=500},'Антикоррупционная кампания','Легитимность +6, депутаты злы · 500'],
pm:[300,()=>{S.approval=clamp(S.approval+4);dl(-3);S.leader=pick(['Виктор Громов','Ирина Седова','Максим Ларин','Анна Красова'])},'Сменить премьера','Одобрение +4 · 300'],
spy:[800,()=>{S.coupRisk=clamp(S.coupRisk-15);S.stability=clamp(S.stability+4);S.legitimacy=clamp(S.legitimacy-6);S.approval=clamp(S.approval-2)},'Тайная полиция','Переворот −15, легитимность −6 · 800',1],
obs:[0,()=>{S.legitimacy=clamp(S.legitimacy+4);rv(3)},'Международные наблюдатели','Легитимность +4, отношения +3'],
gift:[400,()=>S.approval=clamp(S.approval+3),'Праздник и подарки народу','Одобрение +3 · 400'],
church:[200,()=>{S.legitimacy=clamp(S.legitimacy+4);S.approval=clamp(S.approval+1)},'Союз с церковью','Легитимность +4 · 200'],
dict:[0,()=>{if(S.gov==='Диктатура'){S.gov='Парламентская республика';S.legitimacy=clamp(S.legitimacy+10);S.stability=clamp(S.stability-8)}else{S.gov='Диктатура';S.stability=clamp(S.stability+15);S.coupRisk=clamp(S.coupRisk-20);S.approval=clamp(S.approval-15);S.legitimacy=clamp(S.legitimacy-15)}},'Диктатура ⇄ демократия','Переключить режим правления',1]};
window.xa=(t,k)=>{if(blocked())return;let e=(t=='e'?ECO2:POL)[k];if(cdLeft(t+k)>0)return toast(cdMsg(t+k));if(S.money<e[0])return toast('Недостаточно средств');S.money-=e[0];cdSet(t+k,k==='dict'||k==='delay'?12:(t=='e'?2:3));e[1]();clampFix();log(e[2]);doc0(e[2]);save();render();toast(e[2])};
const xcards=(tb,t)=>`<div class="cards">${Object.keys(tb).map(k=>`<div class="mini"><b>${tb[k][2]}</b><span class="muted">${tb[k][3]}</span><div class="actions"><button class="${tb[k][4]?'danger':'primary'}" onclick="xa('${t}','${k}')">${cdLeft(t+k)>0?'⏳ '+cdLeft(t+k)+' мес.':'Сделать'}</button></div></div>`).join('')}</div>`;
function polTick(){S.prop=(S.prop||0)*.9;if(S.prop>6&&Math.random()<.15){S.legitimacy=clamp(S.legitimacy-8);S.approval=clamp(S.approval-4);log('Скандал: пропаганда разоблачена');say('Нам врали по телевизору!','🤬')}if(S.gov==='Диктатура'){S.coupRisk=clamp(S.coupRisk+.3);S.approval=clamp(S.approval-.1)}}

function ask(t,cb){let d=document.createElement('div');d.className='gameover';d.style.zIndex=60;d.innerHTML=`<div class="gameover-box"><p>${t}</p><div class="row" style="justify-content:center"><button class="danger" id="askY">Да, начать</button><button id="askN">Отмена</button></div></div>`;document.body.appendChild(d);d.querySelector('#askY').onclick=()=>{d.remove();cb()};d.querySelector('#askN').onclick=()=>d.remove()}

/* ===================================================================
   v3: РАНДОМНЫЕ СОБЫТИЯ + МЕХАНИКИ ИЗ HEARTS OF IRON IV
   =================================================================== */
const mt=()=>(S.year-1)*12+S.month;
const H=window.H={};
const FXN={'gdp%':'ВВП %',approval:'Одобрение',stability:'Стабильность',legitimacy:'Легитимность',money:'Казна',gdp:'ВВП',food:'Еда',fuel:'Топливо',steel:'Сталь',equipment:'Вооружение',ammo:'Боеприпасы',energy:'Энергия',tech:'Технологии',army:'Армия',morale:'Боевой дух',training:'Подготовка',threat:'Угроза',coupRisk:'Риск переворота',inflation:'Инфляция',employment:'Занятость',trust:'Доверие рынков',pop:'Население',debt:'Долг',pp:'Пол. власть',party:'Рейтинг партии',rivals:'Соперники',rel:'Отношения',relr:'Отношения с одной страной',reg:'Недовольство регионов',loy:'Лояльность регионов',dep:'Депутаты',navy:'Флот',air:'Авиация',infra:'Инфраструктура',civ:'Гражд. заводы',mil:'Воен. заводы',dock:'Верфи',rslots:'Слоты науки',bslots:'Слоты стройки',peace:'Мир'};
const BADUP=new Set(['threat','coupRisk','inflation','debt','reg']);
const SCALED=new Set(['approval','stability','legitimacy','food','fuel','steel','energy','trust','coupRisk','inflation','threat','morale','reg','loy','dep']);
const myP=()=>S.parties.find(p=>p.name===S.playerParty);
const fv=v=>{v=Math.abs(v);return v>=100?fmt(v):(v<1?Math.round(v*100)/100:Math.round(v*10)/10).toString().replace('.',',')};
const sgn=v=>v>0?'+':'−';

/* Применить пакет изменений. Возвращает текстовую сводку. sc=false — без поправки на сложность */
function ch(o,sc){
 const D=difficulty(),out=[];
 for(const k in o){
  let v=o[k];
  if(k==='sp'){addSp(v[0],v[1],v[2]);out.push('дух «'+v[0]+'»');continue}
  if(k==='ev'){S.evq.push({id:v[0],t:mt()+v[1]});continue}
  if(sc!==false){
   if(SCALED.has(k)){const bad=BADUP.has(k),good=bad?v<0:v>0;v*=good?D.approval:D.unrest}
   else if(k==='money')v*=v>0?D.income:D.expenses;
  }
  switch(k){
   case'party':{const p=myP();if(p)p.support=clamp(p.support+v,2,75);break}
   case'rivals':rp(v);break;
   case'rel':rv(v);break;
   case'relr':{const r=pick(S.relations);if(r)r.value=clamp(r.value+v,-100,100);break}
   case'reg':S.regions.forEach(r=>r.unrest=clamp(r.unrest+v));break;
   case'loy':S.regions.forEach(r=>r.loyalty=clamp(r.loyalty+v));break;
   case'infra':S.regions.forEach(r=>r.infra=clamp(r.infra+v));break;
   case'dep':dl(v);break;
   case'peace':if(v)peaceAll(true);break;
   case'gdp':S.gdp=Math.max(100,S.gdp+v);break;
   case'gdp%':S.gdp=Math.max(100,S.gdp*(1+v/100));break;
   case'money':S.money+=v;if(S.money<0){S.debt+=-S.money;S.money=0}break;
   case'debt':S.debt=Math.max(0,S.debt+v);break;
   case'pop':S.pop=Math.max(100000,Math.round(S.pop+v));break;
   case'army':S.army=Math.max(5000,Math.round(S.army+v));break;
   case'navy':case'air':case'civ':case'mil':case'dock':case'rslots':case'bslots':S[k]=Math.max(0,Math.round(S[k]+v));break;
   case'pp':S.pp=Math.max(0,Math.min(400,S.pp+v));break;
   default:S[k]=clamp(S[k]+v);
  }
  if(k!=='peace')out.push(`${FXN[k]||k} ${sgn(v)}${fv(v)}`);
 }
 return out.join(' · ');
}
function hintFx(fx){
 if(!fx)return'';const a=[];
 for(const k in fx){
  if(k==='sp'){a.push('дух «'+fx[k][0]+'»');continue}
  if(k==='ev')continue;
  if(k==='peace'){a.push('<span class="fxg">прекращение войн</span>');continue}
  const v=fx[k],g=BADUP.has(k)?v<0:v>0;
  a.push(`<span class="${g?'fxg':'fxb'}">${FXN[k]||k} ${sgn(v)}${fv(v)}</span>`);
 }
 return a.join(' · ');
}
function addSp(n,left,fx){
 const e=S.spirits.find(s=>s.n===n);
 if(e){e.left=Math.max(e.left,left);return}
 S.spirits.push({n,left,fx});S.spirits=S.spirits.slice(-14);
}

/* ------------------------ ДАННЫЕ СОБЫТИЙ ------------------------ */
const {EVD,MIN}=(()=>{

const E=(id,t,x,o,m)=>Object.assign({id,t,x,o},m||{});
const O=(t,fx,r,c,m)=>Object.assign({t,fx,r,c:c||0},m||{});
const M=(x,fx,e,when,w)=>({x,fx,e,when,w});
const EVD=[
/* ---------- ЭКОНОМИКА ---------- */
E('boom','Экономический подъём','Экспорт растёт, деловая активность повышается.',[
 O('Поддержать бизнес',{gdp:400,employment:2,trust:2},'Бизнес получил льготные кредиты.',350),
 O('Сохранить доходы',{money:450},'Казна пополнена.')],{d:1}),
E('fuelprice','Скачок цен на топливо','Мировые цены на топливо резко выросли.',[
 O('Продать часть запасов',{money:700,fuel:-8},'Запасы проданы по высокой цене.'),
 O('Закупить впрок',{fuel:10,trust:1},'Склады наполнены.',300)],{w:()=>S.fuel<70?2:1}),
E('strike','Забастовка шахтёров','Профсоюз требует повышения зарплат и грозит остановить добычу.',[
 O('Уступить требованиям',{approval:3,stability:2,employment:1},'Договорились о повышении зарплат.',600),
 O('Жёсткий ответ',{stability:3,money:300},'Забастовку удалось сломить.',0,{p:.6,bf:{stability:-5,gdp:-250,approval:-2,ev:['strike2',2]},br:'Забастовка разрослась и парализовала добычу.'})]),
E('strike2','Забастовка перекинулась на заводы','Бастуют уже несколько отраслей одновременно.',[
 O('Сесть за стол переговоров',{stability:3,approval:1,gdp:-100},'Профсоюзы вернулись к работе.',300),
 O('Ввести особый режим на заводах',{stability:2,approval:-3,legitimacy:-2,gdp:100,money:200},'Работа восстановлена силой.')],{chain:1}),
E('investor','Иностранный инвестор','Зарубежная корпорация хочет купить контрольный пакет в крупном заводе.',[
 O('Принять предложение',{gdp:600,trust:3,approval:-2,legitimacy:-1},'Сделка подписана.'),
 O('Отказать',{legitimacy:3,approval:1,trust:-1},'Государство сохранило контроль.')]),
E('bankcrisis','Проблемы крупного банка','Один из крупнейших банков страны на грани краха.',[
 O('Спасти банк',{trust:6,stability:2,gdp:100},'Банк спасён за счёт казны.',900),
 O('Позволить обанкротиться',{trust:-4,approval:-1,legitimacy:2,money:300},'Банк закрыт, вкладчики в ярости.')]),
E('drought','Засуха','Лето выдалось сухим, урожай под угрозой.',[
 O('Закупить зерно за границей',{food:9},'Зерно закуплено.',500),
 O('Ввести нормирование',{food:3,approval:-2},'Нормирование спасло запасы, но люди недовольны.')],{w:()=>S.food<85?2:.3,when:()=>S.food<92}),
E('harvest','Рекордный урожай','Погода благоприятствовала — урожай небывалый.',[
 O('Экспортировать излишки',{money:450,food:1},'Излишки проданы за рубеж.'),
 O('Пополнить государственные запасы',{food:8},'Склады полны.')],{when:()=>S.food<97}),
E('oligarch','Налоги олигархов','Крупный бизнес годами уходит от налогов.',[
 O('Начать проверки',{money:900,trust:-3,stability:-1},'Бюджет получил доплаты.'),
 O('Договориться полюбовно',{money:300,trust:2,legitimacy:-2},'Бизнес «добровольно» пожертвовал часть денег.')]),
E('technopark','Технопарк','Группа учёных просит землю и деньги под технопарк.',[
 O('Построить технопарк',{tech:5,gdp:250,approval:1},'Технопарк открыт.',700),
 O('Продать землю застройщикам',{money:350},'Земля продана.')]),
E('fair','Торговая ярмарка','Соседи приглашают страну на крупную торговую ярмарку.',[
 O('Устроить национальный павильон',{money:550,rel:3},'Контракты подписаны.',350),
 O('Отправить небольшую делегацию',{money:150,approval:1},'Скромное участие.')]),
E('deposit','Найдено месторождение','Геологи открыли крупное месторождение.',[
 O('Развить добычу самим',{gdp:1100,steel:6,reg:2},'Начата добыча.',700),
 O('Продать лицензию',{money:450,trust:1},'Лицензия продана инвестору.')]),
E('hack','Хакерская атака','Неизвестные взламывают банковские системы.',[
 O('Нанять специалистов',{trust:3,tech:1},'Системы защищены.',500),
 O('Ничего не делать',{trust:-3,approval:-1,money:200},'Атака прошла почти безнаказанно.')]),
E('pension','Дефицит пенсионного фонда','В пенсионном фонде не хватает денег.',[
 O('Покрыть дефицит из бюджета',{approval:3,stability:2,trust:1},'Пенсии выплачены вовремя.',600),
 O('Урезать выплаты',{money:900,approval:-6,stability:-1},'Выплаты урезаны.')]),
E('crypto','Криптобум','Граждане массово скупают цифровые монеты.',[
 O('Обложить налогом',{money:600,trust:-2},'Налог пополнил казну.'),
 O('Запретить',{legitimacy:1,trust:2,tech:-1,approval:-1},'Рынок ушёл в тень.')]),
E('automation','Автоматизация заводов','Инженеры предлагают роботизировать производство.',[
 O('Внедрить',{gdp:800,employment:-1,tech:3},'Заводы стали эффективнее.',800),
 O('Защитить рабочие места',{employment:1,approval:1,tech:-1},'Профсоюзы довольны.')]),
E('powerplant','Новая электростанция','Предлагают построить крупную электростанцию.',[
 O('Построить',{energy:12,gdp:200},'Станция запущена.',900),
 O('Купить энергию за рубежом',{energy:3,money:-100},'Временное решение.')],{w:()=>S.energy<75?2:1}),
E('smugglers','Контрабанда на границе','Таможенники ловят всё больше контрабанды.',[
 O('Усилить таможню',{money:300,stability:1,legitimacy:1},'Таможня заработала лучше.',250),
 O('Закрыть глаза за долю',{money:500,legitimacy:-3,coupRisk:1},'Чиновники получили свою долю.')]),
E('port','Продажа порта','Иностранная компания предлагает купить в аренду крупный порт.',[
 O('Сдать порт в аренду',{money:800,trust:2,legitimacy:-3,approval:-1},'Порт передан в аренду на 30 лет.'),
 O('Оставить государственным',{gdp:100,approval:1,legitimacy:1},'Порт остался нашим.')]),
E('currency','Скачок курса валюты','Курс национальной валюты резко колеблется.',[
 O('Вмешаться в рынок',{trust:4,inflation:-.5},'Центробанк потратил резервы.',500),
 O('Не вмешиваться',{trust:-3,money:250,inflation:1},'Курс упал, рынок «сам разберётся».')]),
E('tourism','Туристический бум','Страной заинтересовались путешественники.',[
 O('Инвестировать в инфраструктуру',{gdp:350,approval:1,infra:2},'Отели и дороги улучшены.',400),
 O('Просто собрать налоги',{money:400},'Туристы заплатили в казну.')]),
E('mine','Авария на шахте','На шахте погибли рабочие.',[
 O('Выплатить компенсации и проверить все шахты',{approval:2,legitimacy:2,stability:1},'Безопасность усилена.',700),
 O('Замять инцидент',{approval:-2,legitimacy:-2,money:400},'Скандал не утих.')]),
E('prices','Рост цен на хлеб','Булочные поднимают цены, люди возмущены.',[
 O('Субсидии хлебопекам',{inflation:-1,approval:2},'Цены снижены.',500),
 O('Не вмешиваться',{approval:-2,inflation:1,money:300},'Рынок сам решит.')],{w:()=>S.inflation>8?3:.5,when:()=>S.inflation>5}),
E('debtoffer','Кредиторы предлагают реструктуризацию','Банки готовы пересмотреть условия по долгам.',[
 O('Согласиться',{debt:-350,trust:2,approval:-1},'Долг частично списан.'),
 O('Отказаться',{legitimacy:1,trust:-1,money:200},'Страна сохранила гордость.')],{w:()=>S.debt>500?2:0,when:()=>S.debt>500}),
/* ---------- ОБЩЕСТВО ---------- */
E('regprot','Региональные протесты','В одном из регионов растёт недовольство.',[
 O('Выделить помощь',{stability:4,reg:-3},'Регион получил деньги.',400),
 O('Усилить контроль',{stability:3,reg:-3,legitimacy:-3,coupRisk:3},'Порядок восстановлен силой.')]),
E('students','Студенческие протесты','Студенты требуют реформы образования.',[
 O('Начать диалог',{approval:2,stability:1,tech:1},'Власти прислушались к студентам.',250),
 O('Разогнать демонстрацию',{stability:3,approval:-2,legitimacy:-2,coupRisk:-1},'Площадь очищена.')]),
E('flu','Эпидемия гриппа','Больницы переполнены больными.',[
 O('Массовая вакцинация',{approval:3,stability:1},'Эпидемия остановлена.',600),
 O('Ввести карантин',{employment:-2,gdp:-200,stability:1},'Карантин сдержал болезнь.')],{w:()=>S.health<12?3:1}),
E('match','Футбольный чемпионат','Сборная вышла в финал мирового турнира.',[
 O('Устроить национальный праздник',{approval:4,stability:1},'Вся страна гуляет.',300),
 O('Не вмешиваться',{approval:1,money:100},'Люди сами отметили победу.')]),
E('baby','Демографический бум','Растёт число новорождённых.',[
 O('Выплаты молодым семьям',{pop:80000,approval:2,employment:-1},'Население растёт.',500),
 O('Сэкономить бюджет',{money:300},'Бюджет в порядке.')]),
E('migrants','Волна мигрантов','Тысячи людей просят убежища.',[
 O('Принять',{pop:60000,gdp:300,approval:-2,stability:-1,ev:['integr',4]},'Беженцам выделены лагеря.'),
 O('Закрыть границу',{approval:1,rel:-3,stability:1,threat:2},'Граница закрыта.')]),
E('integr','Интеграция мигрантов','Приезжие нуждаются в жилье и работе.',[
 O('Программа интеграции',{gdp:200,approval:1,stability:2},'Приезжие находят работу.',300),
 O('Оставить всё как есть',{stability:-1,approval:-1,money:300},'В лагерях растёт напряжение.')],{chain:1}),
E('teachers','Забастовка учителей','Учителя требуют повышения зарплат.',[
 O('Повысить зарплаты',{approval:2,tech:2},'Учителя вернулись в школы.',400),
 O('Отказать',{approval:-2,tech:-1,money:250},'Школы закрыты на неделю.')]),
E('gangs','Преступные группировки','Банды контролируют целые кварталы.',[
 O('Провести операцию',{stability:4,reg:-3,legitimacy:-1},'Банды разгромлены.',300),
 O('Договориться с главарями',{money:400,stability:-1,legitimacy:-2,coupRisk:1},'Установлено хрупкое «перемирие».')]),
E('hungerriot','Голодные бунты','Из-за нехватки еды люди вышли на улицы.',[
 O('Раздать запасы',{food:-8,stability:3,approval:2},'Склады открыты для народа.'),
 O('Подавить бунты',{stability:3,approval:-2,legitimacy:-2,coupRisk:2,money:150},'Бунты подавлены, но злоба растёт.')],{w:()=>S.food<50?4:0,when:()=>S.food<55}),
E('sports','Олимпийский чемпион','Земляк выиграл олимпийское золото.',[
 O('Устроить парад',{approval:3,legitimacy:1},'Улицы заполнены людьми.',250),
 O('Скромная награда',{approval:1},'Чемпион получил орден.')]),
E('religion','Религиозный конфликт','Две общины не поделили святыню.',[
 O('Посредничество власти',{stability:2,legitimacy:1},'Конфликт улажен.',200),
 O('Запретить митинги',{stability:2,legitimacy:-2,approval:-1},'Митинги запрещены.')]),
E('housing','Жилищный кризис','Цены на жильё взлетели.',[
 O('Субсидии на жильё',{approval:3,employment:1,gdp:100},'Строится доступное жильё.',500),
 O('Рынок сам решит',{approval:-2,trust:1,money:150},'Государство не вмешивается.')]),
E('prison','Бунт в тюрьме','Заключённые захватили заложников.',[
 O('Штурм',{stability:3,approval:-1,legitimacy:-1},'Бунт подавлен.'),
 O('Переговоры',{stability:1,approval:1,money:-150,legitimacy:1},'Заложники освобождены.')]),
E('railstrike','Забастовка железнодорожников','Поезда стоят, товары не доходят.',[
 O('Повысить зарплаты',{gdp:100,stability:2,approval:1},'Поезда пошли.',450),
 O('Ввести военных',{stability:-1,gdp:-50,coupRisk:1,morale:-1,money:200},'Поезда ходят под охраной.')]),
E('brain','Утечка мозгов','Талантливые учёные уезжают за границу.',[
 O('Создать гранты для учёных',{tech:3,approval:1},'Часть учёных осталась.',450),
 O('Ничего не делать',{tech:-3,money:200},'Лучшие уехали.')]),
E('bridge','Рухнул мост','Старый мост обрушился.',[
 O('Построить новый',{approval:2,gdp:100,infra:3},'Новый мост открыт.',600),
 O('Организовать паромную переправу',{approval:-1,gdp:-50,money:-100},'Временное решение.')]),
E('blackmkt','Чёрный рынок','Теневой рынок процветает.',[
 O('Легализовать и обложить налогом',{money:400,trust:1,legitimacy:-1},'Рынок вышел из тени.'),
 O('Ужесточить борьбу',{stability:1,approval:-1,legitimacy:1,money:-150},'Облавы продолжаются.')]),
/* ---------- ПОЛИТИКА ---------- */
E('corr','Коррупционный скандал','Журналисты обнародовали данные о взятках.',[
 O('Наказать виновных',{legitimacy:4,approval:-1,dep:-5},'Чиновники отправлены под суд.'),
 O('Замять',{dep:3,legitimacy:1},'Удалось замять.',0,{p:.7,bf:{legitimacy:-8,approval:-4,ev:['corr2',3]},br:'Правда всплыла — скандал разгорелся.'})]),
E('corr2','Новые разоблачения','Журналисты нашли ещё документы.',[
 O('Отправить министров в отставку',{legitimacy:2,dep:-4,party:-1},'Часть министров ушла.'),
 O('Отрицать всё',{legitimacy:-3,approval:-1,dep:2},'Народ не верит оправданиям.')],{chain:1}),
E('opprot','Митинг оппозиции','Оппозиция собирает массовый митинг.',[
 O('Разрешить',{legitimacy:2,rivals:2},'Митинг прошёл мирно.'),
 O('Запретить',{stability:2,legitimacy:-3,rivals:-1},'Митинг запрещён.')]),
E('coalition','Предложение коалиции','Другая партия готова к союзу.',[
 O('Согласиться',{party:3,dep:6,approval:-1},'Образована коалиция.',400),
 O('Отказаться',{legitimacy:1,approval:1},'Партия идёт своим путём.')]),
E('constit','Конституционная реформа','Парламент обсуждает изменение конституции.',[
 O('Поддержать',{legitimacy:5,approval:-2,dep:-4},'Реформа принята.'),
 O('Отклонить',{dep:3,legitimacy:-1},'Реформа заморожена.')]),
E('leak','Утечка документов','Секретные документы попали в прессу.',[
 O('Признать ошибки',{legitimacy:-2,approval:1,trust:1},'Власти признали ошибки.'),
 O('Объявить подделкой',{legitimacy:2,approval:2},'Версия властей принята.',0,{p:.6,bf:{legitimacy:-6,approval:-3},br:'Эксперты доказали подлинность.'})]),
E('partysplit','Раскол в партии','Внутри правящей партии возникло крыло мятежников.',[
 O('Уладить конфликт',{party:2,dep:4},'Конфликт улажен.',300),
 O('Исключить мятежников',{party:-2,dep:-5,stability:1,coupRisk:-2},'Мятежники исключены.')]),
E('minister','Вотум недоверия министру','Депутаты требуют отставки министра.',[
 O('Уволить',{approval:1,legitimacy:1,dep:-3},'Министр ушёл.'),
 O('Защитить',{dep:4,approval:-1,legitimacy:-1},'Министр остался.')]),
E('autonomy','Требование автономии','Один из регионов требует автономии.',[
 O('Дать автономию',{reg:-5,loy:6,stability:-2,legitimacy:-1},'Регион получил самоуправление.'),
 O('Отказать',{stability:2,loy:-4,reg:3,coupRisk:2},'Требования отклонены.')]),
E('oppdialog','Оппозиция предлагает диалог','Лидер оппозиции готов к встрече.',[
 O('Принять предложение',{legitimacy:3,rivals:1,stability:2},'Диалог начался.'),
 O('Игнорировать',{approval:1,rivals:-1},'Власть не отвечает.')]),
E('pardon','Просьба о помиловании','Известного заключённого просят помиловать.',[
 O('Помиловать',{approval:2,legitimacy:2,stability:-1},'Помилование подписано.'),
 O('Отказать',{stability:1,legitimacy:-1},'Закон есть закон.')]),
E('press','Свобода прессы','Журналисты требуют снять ограничения.',[
 O('Поддержать',{legitimacy:4,approval:-1,stability:-1},'Пресса получила свободу.'),
 O('Ужесточить',{legitimacy:-4,stability:2,coupRisk:-2},'Пресса под контролем.')]),
E('election','Предвыборная кампания','Партии готовятся к выборам.',[
 O('Увеличить финансирование партии',{party:3,approval:1,legitimacy:-1},'Агитация усилена.',500),
 O('Сохранить нейтралитет',{legitimacy:2,party:-1},'Власть не вмешивается.')],{when:()=>S.election>0&&S.election<=8,w:3}),
E('digest','Новый премьер-министр предлагает реформы','Новый премьер-министр предлагает сильные меры.',[
 O('Поддержать',{approval:2,stability:-1,tech:1,dep:-2},'Реформы запущены.',300),
 O('Остаться при своём',{dep:2},'Курс не меняется.')]),
E('refer','Народная инициатива','Граждане собрали подписи за референдум.',[
 O('Провести референдум',{legitimacy:4,approval:1,stability:-1},'Референдум прошёл мирно.',300),
 O('Отклонить',{legitimacy:-2,stability:1,money:100},'Инициатива отклонена.')]),
/* ---------- АРМИЯ ---------- */
E('depot','Взрыв на складе боеприпасов','На военном складе произошёл взрыв.',[
 O('Провести расследование',{ammo:-4,morale:1,legitimacy:1},'Виновные найдены.',200),
 O('Скрыть',{ammo:-6,legitimacy:-2,money:200},'Дело закрыто.')]),
E('deserters','Массовое дезертирство','Солдаты бегут из частей.',[
 O('Объявить амнистию',{morale:2,army:-1200,stability:1},'Многие вернулись.'),
 O('Суровые наказания',{morale:-2,stability:1,coupRisk:2},'Наказания ужесточены.')]),
E('tanks','Лицензия на танки','Иностранная фирма продаёт лицензию на современные танки.',[
 O('Купить',{equipment:10,tech:2},'Лицензия куплена.',900),
 O('Отказаться',{money:200,ammo:2},'Деньги сэкономлены.')]),
E('drills','Учения соседа на границе','Соседняя армия проводит масштабные манёвры.',[
 O('Усилить границу',{threat:-5,morale:1},'Граница укреплена.',400),
 O('Игнорировать',{threat:5,money:200},'Деньги сэкономлены.')]),
E('generals','Спор генералов','Два генерала не поделили командование.',[
 O('Одарить обоих',{coupRisk:-4,morale:1},'Генералы довольны.',300),
 O('Не вмешиваться',{coupRisk:3,morale:-1,money:200},'Конфликт тлеет.')]),
E('border','Пограничный инцидент','Пограничники обстреляли друг друга.',[
 O('Принести извинения',{relr:6,approval:-3,threat:-2},'Конфликт погашен.'),
 O('Ответить жёстко',{relr:-8,threat:5,morale:3,approval:2,ev:['border2',3]},'Мы показали силу.')],{when:()=>!S.war&&S.relations.some(r=>r.value<10)}),
E('border2','Эскалация на границе','Соседи стягивают войска.',[
 O('Начать переговоры',{threat:-4,relr:5},'Напряжение снижено.',200),
 O('Продемонстрировать силу',{morale:2,threat:3,training:2},'Армия приведена в боеготовность.')],{chain:1}),
E('veterans','Ветераны требуют льгот','Ветераны выходят на улицы.',[
 O('Выплатить льготы',{approval:2,morale:2},'Ветераны довольны.',500),
 O('Отказать',{morale:-3,approval:-1,money:150},'Ветераны недовольны.')]),
E('spyring','Раскрыта шпионская сеть','Контрразведка поймала иностранных шпионов.',[
 O('Выслать дипломатов',{relr:-6,legitimacy:2,approval:1,threat:-1},'Дипломаты высланы.'),
 O('Сыграть в двойную игру',{tech:3,coupRisk:-2},'Дезинформация передана противнику.',0,{p:.55,bf:{relr:-10,legitimacy:-2},br:'Двойная игра раскрыта.'})]),
E('advisors','Иностранные военные советники','Союзники предлагают прислать советников.',[
 O('Принять',{training:6,rel:1},'Офицеры прошли обучение.',400),
 O('Отказаться',{legitimacy:1,morale:1},'Страна опирается на свои силы.')]),
E('inventor','Изобретатель-самоучка','Инженер-самоучка предлагает проект оружия.',[
 O('Профинансировать',{equipment:5,tech:1,ammo:2},'Прототип показал хорошие результаты.',350),
 O('Отказать',{money:150},'Проект отклонён.')]),
E('blueprint','Шпион предлагает чертежи','Агент продаёт секретные чертежи.',[
 O('Купить',{tech:3,equipment:5},'Чертежи подлинные.',600,{p:.7,bf:{relr:-6,legitimacy:-2},br:'Это была ловушка.'}),
 O('Отказаться',{legitimacy:1},'Страна не связывается с шпионами.')]),
E('sabot','Диверсия на оружейном заводе','Неизвестные устроили взрыв на заводе.',[
 O('Усилить охрану',{coupRisk:-2,equipment:-2,stability:1},'Охрана усилена.',400),
 O('Просто восстановить',{equipment:-4,ammo:-3,stability:-1,money:200},'Завод восстановлен.')]),
E('surplus','Устаревшее вооружение','Склады забиты старым оружием.',[
 O('Продать союзникам',{money:700,equipment:-6,relr:3},'Старьё продано.'),
 O('Оставить как резерв',{morale:1,approval:1},'Резерв сохранён.')],{when:()=>!S.war}),
E('parade','Предложение военного парада','Генералы предлагают устроить парад.',[
 O('Провести',{morale:4,approval:2,threat:2},'Парад прошёл с размахом.',350),
 O('Отказаться',{money:150},'Деньги сэкономлены.')],{when:()=>!S.war}),
/* ---------- ДИПЛОМАТИЯ ---------- */
E('summit','Международный саммит','Лидеры соседних стран собираются на саммит.',[
 O('Участвовать',{rel:5,legitimacy:2,approval:1},'Лидер выступил на саммите.',300),
 O('Остаться дома',{approval:1,money:100},'Лидер остался дома.')]),
E('helpask','Соседу нужна помощь','Соседняя страна просит о помощи.',[
 O('Помочь',{relr:12,legitimacy:1},'Помощь отправлена.',500),
 O('Отказать',{relr:-4,approval:1},'Мы заняты своими делами.')]),
E('embargo','Торговое эмбарго','Великие державы просят присоединиться к эмбарго.',[
 O('Присоединиться',{rel:-3,money:300,trust:1},'Эмбарго поддержано.'),
 O('Остаться нейтральным',{rel:2,money:-100},'Нейтралитет сохранён.')]),
E('tradedispute','Торговый спор','Соседи ввели пошлины на наши товары.',[
 O('Уступить',{gdp:-100,relr:6,trust:1},'Спор улажен.'),
 O('Ввести ответные пошлины',{gdp:100,relr:-8,inflation:1},'Мы ответили тем же.')]),
E('mediation','Предложение посредничества','Нейтральная страна предлагает посредничество в споре.',[
 O('Принять',{legitimacy:3,rel:2},'Посредничество принято.'),
 O('Отклонить',{approval:1,legitimacy:-1,money:150},'Решаем сами.')]),
E('pact','Пакт о ненападении','Сосед предлагает подписать пакт о ненападении.',[
 O('Подписать',{threat:-5,relr:6,legitimacy:1,approval:-2},'Пакт подписан.'),
 O('Отказаться',{approval:1,morale:1},'Страна свободна в действиях.')],{when:()=>!S.war}),
E('refugees','Беженцы из соседней страны','Соседняя страна в хаосе, люди бегут к границе.',[
 O('Принять гуманитарную миссию',{relr:6,legitimacy:2,approval:-1,pop:20000},'Миссия принята.',300),
 O('Усилить границу',{relr:-3,stability:1,threat:1},'Граница закрыта.')]),
E('ambassador','Скандал с послом','Наш посол высказался слишком резко.',[
 O('Отозвать посла',{relr:4,approval:-1,legitimacy:-1},'Посол отозван.'),
 O('Поддержать посла',{relr:-6,approval:2},'Мы не отступаем.')]),
/* ---------- СТИХИЯ ---------- */
E('flood','Наводнение','Реки вышли из берегов.',[
 O('Восстановить пострадавшие районы',{approval:2,stability:1,reg:-2},'Район восстановлен.',600),
 O('Минимальная помощь',{gdp:-200,approval:-2,reg:2,money:300},'Помощи мало, люди в отчаянии.')]),
E('quake','Землетрясение','Подземные толчки разрушили несколько городов.',[
 O('Большая спасательная операция',{approval:3,stability:1,legitimacy:2},'Операция спасла тысячи людей.',800),
 O('Ограничиться минимумом',{approval:-3,stability:-1,money:400},'Помощь запоздала.')]),
E('wildfire','Лесные пожары','Пожары охватили северный край.',[
 O('Бросить силы на тушение',{gdp:50,approval:2,stability:1},'Пожары потушены.',400),
 O('Дать огню выгореть',{gdp:-150,approval:-1,money:200},'Выгорели огромные площади.')]),
E('winter','Суровая зима','Морозы сковали страну.',[
 O('Закупить топливо',{fuel:9,approval:1},'Топлива хватило.',500),
 O('Ограничить потребление',{fuel:3,approval:-2,employment:-1,money:200},'Люди мёрзнут.')],{w:()=>S.fuel<75?2:.6}),
E('heat','Аномальная жара','Энергосистема не справляется.',[
 O('Аварийные меры',{energy:6},'Энергосистема удержалась.',300),
 O('Не вмешиваться',{energy:-6,approval:-1,money:100},'Отключения по всей стране.')]),
E('storm','Шторм в портах','Шторм повредил порты.',[
 O('Срочный ремонт',{gdp:100,trust:1},'Порты быстро заработали.',350),
 O('Отложить ремонт',{gdp:-200,money:100},'Порты простаивают.')]),
E('meteor','Метеорит над регионом','В небе взорвался крупный метеорит.',[
 O('Организовать «туризм за осколками»',{gdp:150,approval:2},'Туристы потекли толпами.',200),
 O('Продать осколки коллекционерам',{money:350,tech:1},'Осколки проданы.')]),
/* ---------- НАУКА И КУЛЬТУРА ---------- */
E('nobel','Нобелевская премия','Наш учёный получил премию.',[
 O('Устроить праздник',{approval:2,tech:1,legitimacy:1},'Гордость за страну.',200),
 O('Грант учёным',{tech:5,gdp:100},'Лаборатории получили деньги.',600)]),
E('space','Космическая программа','Конструкторы предлагают запустить спутник.',[
 O('Запустить спутник',{tech:6,approval:3,legitimacy:2,gdp:200},'Спутник на орбите.',1500),
 O('Отложить',{money:300},'Деньги сэкономлены.')]),
E('discovery','Научное открытие','Учёные предлагают внедрить новую технологию.',[
 O('Финансировать',{tech:6},'Исследования идут полным ходом.',500),
 O('Отложить',{money:200,gdp:50},'Открытие подождёт.')]),
E('film','Национальный фильм','Режиссёры просят денег на историческую эпопею.',[
 O('Профинансировать',{approval:3,legitimacy:2},'Фильм собрал аншлаги.',400),
 O('Отказать',{money:150},'Деньги ушли на другое.')]),
E('festival','Театральный фестиваль','Артисты со всей страны приехали в столицу.',[
 O('Помочь деньгами',{approval:2,stability:1,legitimacy:1},'Фестиваль прошёл красиво.',250),
 O('Остаться в стороне',{approval:1},'Фестиваль прошёл сам по себе.')]),
E('radio','Новая радиосеть','Инженеры предлагают построить национальную радиосеть.',[
 O('Построить',{tech:2,approval:1,legitimacy:2,gdp:100},'Страна слышит новости.',400),
 O('Отказаться',{money:150},'Деньги сэкономлены.')]),
/* ---------- ВОЙНА ---------- */
E('ceasefire','Предложение перемирия','Враг предлагает прекратить огонь.',[
 O('Принять перемирие',{peace:1,approval:1,legitimacy:-1,morale:-1},'Огонь прекращён.'),
 O('Продолжить войну',{morale:2,threat:2,approval:-1},'Мы идём до конца.')],{w:()=>S.war?2:0,when:()=>S.wars&&S.wars.length>0}),
E('hero','Герой войны','Солдат совершил подвиг.',[
 O('Наградить публично',{morale:3,approval:1},'Народ воодушевлён.',100),
 O('Скромно отметить',{morale:1}  ,'Награда вручена тихо.')],{when:()=>S.war}),
E('hospital','Переполненные госпитали','Раненых некуда класть.',[
 O('Развернуть полевые госпитали',{morale:3,approval:1},'Госпитали развёрнуты.',400),
 O('Потерпеть',{morale:-2,approval:-2,money:100},'Раненые страдают.')],{when:()=>S.war}),
E('allies','Помощь союзников','Дружественная страна предлагает оружие.',[
 O('Принять',{equipment:4,ammo:4,relr:2},'Оружие прибыло.'),
 O('Отказать',{legitimacy:1,morale:1},'Страна воюет своими силами.')],{when:()=>S.war&&S.relations.some(r=>r.value>30)}),
E('rear','Диверсанты в тылу','Враг устроил диверсии в тылу.',[
 O('Усилить контрразведку',{stability:2,coupRisk:-1},'Диверсанты пойманы.',300),
 O('Не обращать внимания',{stability:-2,equipment:-2,money:200},'Диверсанты наносят удары.')],{when:()=>S.war}),
E('warbonds','Военные облигации','Финансисты предлагают выпустить военные облигации.',[
 O('Выпустить',{money:800,trust:-3,approval:-2},'Облигации разошлись.'),
 O('Отказаться',{trust:1,approval:1},'Страна обходится своими средствами.')],{when:()=>S.war}),
E('warprop','Военная пропаганда','Журналисты предлагают развернуть кампанию.',[
 O('Поддержать',{morale:4,approval:1,legitimacy:-2},'Кампания идёт.',300),
 O('Не вмешиваться',{legitimacy:1},'Правда без прикрас.')],{when:()=>S.war})
];
const MIN=[
/* положительные */
M('Рекордный урожай пшеницы',{food:5,approval:1},'🌾'),
M('Туристический сезон побил рекорд',{money:300,approval:1},'🏖'),
M('Наши учёные получили международную награду',{tech:2,approval:1},'🏆'),
M('Новый завод открылся без задержек',{gdp:200,employment:.5},'🏭'),
M('Сборная выиграла турнир',{approval:3},'⚽'),
M('Геологи обнаружили месторождение',{gdp:200,steel:3},'⛏'),
M('Иностранная делегация подписала контракты',{money:400,rel:1},'🤝'),
M('Фермеры собрали второй урожай',{food:4,money:100},'🚜'),
M('Тёплая зима сократила расходы на отопление',{fuel:3,money:150},'☀'),
M('Курс валюты стабилизировался',{trust:3,inflation:-.5},'💹'),
M('Открылся новый университет',{tech:1.5,approval:1},'🎓'),
M('Волонтёры починили дороги в регионе',{approval:1.5,stability:1},'🛠'),
M('Налоговики нашли недоимки',{money:350,trust:-.5},'🧾'),
M('Военные раскрыли склад контрабанды',{money:250,coupRisk:-1,morale:1},'🔍'),
M('Кинофестиваль прославил страну',{approval:2,legitimacy:1},'🎬'),
M('Запущена ветроэлектростанция',{energy:3},'💨'),
M('Рабочие перевыполнили план',{gdp:150,steel:2},'💪'),
M('Аграрная ярмарка прошла успешно',{money:200,food:2},'🥕'),
M('Курсанты отлично показали себя на смотре',{training:2,morale:1},'🎖',()=>!S.war),
M('Депутаты единогласно приняли важный закон',{dep:3,legitimacy:1},'🏛'),
M('Опрос: граждане довольны медициной',{approval:1.5},'🏥'),
M('Международный фонд списал часть долга',{debt:-300,trust:1},'💸',()=>S.debt>300),
M('Петарда попала в ёлку на площади — все в восторге',{approval:1},'🎆'),
M('Низкая инфляция радует граждан',{approval:1.5},'😌',()=>S.inflation<6),
M('Народные гуляния в столице',{stability:1,approval:1},'🎉',()=>S.approval>65),
M('Инженеры улучшили технологию добычи стали',{steel:3},'⚙'),
M('Солдаты написали письма домой — настроение поднялось',{morale:2,approval:1},'✉',()=>S.war),
M('Фронтовая газета подняла боевой дух',{morale:2},'📰',()=>S.war),
M('Страна приняла иностранных студентов',{tech:1,rel:.5},'📚'),
/* отрицательные */
M('Ливни повредили урожай',{food:-4,approval:-1},'🌧'),
M('Крупная авария на заводе',{gdp:-150,approval:-1,stability:-.5},'⚠'),
M('Скандал вокруг чиновника',{legitimacy:-2,approval:-1},'🗞'),
M('Хакеры взломали сайт министерства',{trust:-2,legitimacy:-.5},'💻'),
M('Пробки парализовали столицу',{approval:-1.5},'🚗'),
M('Блэкаут в нескольких городах',{energy:-4,approval:-1},'🔌'),
M('Цены на овощи выросли',{inflation:.5,approval:-1},'🥔'),
M('Забастовка таксистов',{gdp:-80,stability:-.5},'🚕'),
M('Чиновник сбежал с деньгами',{money:-300,legitimacy:-1},'🏃'),
M('Утечка нефтепровода',{fuel:-4,reg:1},'🛢'),
M('Кража на военном складе',{ammo:-3,morale:-1},'🔫'),
M('Эпидемия гриппа в школах',{approval:-1,gdp:-60},'🤧'),
M('Пожар в торговом центре',{approval:-1,stability:-1},'🔥'),
M('Крупный банк сообщил о нехватке наличных',{trust:-3},'🏦'),
M('Беспорядки на футбольном матче',{stability:-1.5,reg:1},'🏟'),
M('Лесной пожар в северном крае',{gdp:-100,approval:-.5},'🌲'),
M('Рабочие требуют повышения зарплат',{employment:-.5,approval:-1},'📣'),
M('Старый мост закрыли на ремонт',{money:-200,approval:-.5},'🌉'),
M('Забастовка таксистов и курьеров',{gdp:-60,approval:-.5},'📦'),
M('Забастовки из-за инфляции',{stability:-1,approval:-1},'💢',()=>S.inflation>10),
M('Кредиторы напомнили о долге',{trust:-2},'📞',()=>S.debt>S.gdp*.2),
M('Листовки против власти на стенах',{approval:-1,coupRisk:1},'📄',()=>S.stability<45),
M('Госпитали переполнены ранеными',{morale:-2,approval:-1},'🏥',()=>S.war),
M('Сбой в военной связи',{morale:-1,ammo:-1},'📡',()=>S.war),
M('Опоздание поставок топлива на склады',{fuel:-3,approval:-.5},'⛽'),
M('Недоверие к банкам растёт',{trust:-1.5,money:-100},'💳',()=>S.trust<60)
];


return {EVD,MIN};
})();
const EVM={};EVD.forEach(e=>EVM[e.id]=e);

/* ------------------------ ДВИЖОК СОБЫТИЙ ------------------------ */
function openEvent(id){
 const e=EVM[id];if(!e)return;
 S.event={id,age:0};S.evcd[id]=mt()+(e.cd||30);S.evlast=mt();
 log(`📰 Событие: ${e.t}`);toast('📰 Событие: '+e.t);pause();
}
function rollEvent(){
 const t=mt(),L=EVD.filter(e=>!e.chain&&(S.evcd[e.id]||-1)<=t&&(!e.when||e.when()));
 const wt=e=>typeof e.w==='function'?e.w():(e.w==null?1:e.w);
 const tot=L.reduce((a,e)=>a+wt(e),0);if(tot<=0)return null;
 let r=Math.random()*tot;for(const e of L){r-=wt(e);if(r<=0)return e.id}
 return L.length?L[L.length-1].id:null;
}
function fireMinor(){
 const L=MIN.map((m,i)=>[m,i]).filter(([m,i])=>!(S.mlast||[]).includes(i)&&(!m.when||m.when()));
 if(!L.length)return;
 const [m,i]=pick(L);S.mlast=((S.mlast||[]).concat(i)).slice(-14);
 const sm=ch(m.fx);log(`${m.e||'•'} ${m.x}. (${sm})`);say(m.x,m.e||'🙂');
}
function evTick(){
 if(S.event){
  S.event.age++;
  if(S.event.age>=3){
   const e=EVM[S.event.id];
   if(!e){S.event=null;return}
   let i=e.d!=null?e.d:e.o.length-1;
   if(e.o[i].c&&S.money<e.o[i].c)i=e.o.findIndex(o=>!o.c||S.money>=o.c);
   log('⏳ Вы не успели принять решение — всё пошло своим чередом.');
   if(i>=0)resolveEvent(i,true);else S.event=null;
  }
  return;
 }
 const due=S.evq.findIndex(q=>q.t<=mt());
 if(due>=0){const q=S.evq.splice(due,1)[0];openEvent(q.id);return}
 if(Math.random()<.34)fireMinor();
 if(mt()-S.evlast>=2&&Math.random()<.2*Math.sqrt(difficulty().unrest)){const id=rollEvent();if(id)openEvent(id)}
}
window.resolveEvent=(i,auto)=>{
 if(!S.event)return;
 const e=EVM[S.event.id];if(!e){S.event=null;render();return}
 const o=e.o[i];if(!o)return;
 if(o.c&&S.money<o.c){if(!auto)toast('Недостаточно средств');return}
 if(o.c)S.money-=o.c;
 let ok=true,fx=o.fx,txt=o.r;
 if(o.p!=null){ok=Math.random()<o.p;if(!ok){fx=o.bf||{};txt=o.br||'Не вышло.'}}
 S.event=null;
 const sm=ch(fx);
 log(`📰 ${e.t}: ${txt} (${sm||'без последствий'})`);say(txt,ok?'🙂':'😬');
 clampFix();save();render();toast(txt+(sm?' · '+sm:''));
};
window.goTab=t=>{tab=t;render();window.scrollTo(0,0)};
function evBanner(){
 if(!S.event||!EVM[S.event.id])return'';
 return `<section class="panel evbanner">📰 <b>${EVM[S.event.id].t}</b> — нужно решение (осталось ${3-S.event.age} мес.) <button class="primary" onclick="goTab('events')">Открыть</button></section>`;
}
function evTab(){
 let h='';const sp=S.spirits.length?S.spirits.map(s=>`<div class="mini"><b>${s.n}</b><span class="muted">ещё ${s.left} мес.</span><br><small>${hintFx(s.fx).replace(/(\d+(?:,\d+)?)/g,'$1')} / мес</small></div>`).join(''):'<p class="muted">Пока нет.</p>';
 if(S.event&&EVM[S.event.id]){
  const e=EVM[S.event.id];
  h+=card('📰 '+e.t,`<p>${e.x}</p><p class="muted">Если не решить за ${3-S.event.age} мес., события пойдут своим чередом.</p>`+e.o.map((o,i)=>`<div class="choice"><button class="primary" onclick="resolveEvent(${i})">${o.t}${o.c?' · '+o.c+' млн':''}</button><div class="hint">${o.p!=null?`<b>${Math.round(o.p*100)}%:</b> ${hintFx(o.fx)} <br><b>иначе:</b> ${hintFx(o.bf)}`:hintFx(o.fx)}</div></div>`).join(''));
 }else h+=card('📰 События государства','<p>Сейчас нет неразрешённых событий. Они случаются случайно — иногда по несколько в год. В мире 100 событий с выбором и 55 мелких происшествий, часть зависит от твоего состояния.</p>');
 h+=card('🌟 Национальные духи',sp+'<p class="muted">Временные эффекты от решений и событий.</p>');
 h+=card('Хроника',`<div class="log">${S.log.map(x=>`<div>${x}</div>`).join('')}</div>`);
 return `<div class="grid">${h}</div>`;
}

/* ------------------------ ИНИЦИАЛИЗАЦИЯ ------------------------ */
function ensureHoi(){
 const d={pp:60,civ:18,mil:6,dock:2,evq:[],evcd:{},evlast:-9,mlast:[],spirits:[],wars:[],just:{},puppets:[],flags:{},techs:{},research:[],rslots:2,build:[],bslots:2,adv:{pol:null,mil:null,eco:null},law:{eco:'civ',con:'vol'},doc:null,focus:{done:{},cur:null,p:0},martial:false,bud:{},tx:{},bills:{},gr:{workers:55,biz:55,pens:55,stud:55,mil:55,farm:55},mk:{m:{food:1,fuel:1,steel:1,energy:1,equipment:1,ammo:1},prev:{},q:{food:30,fuel:30,steel:30,energy:30,equipment:30,ammo:30},imp:0,exp:0}};
 for(const k in d)if(S[k]==null)S[k]=d[k];
 if(S.event&&!S.event.id)S.event=null;
 if(!S.regions.find(r=>r.name==='Центральный округ'))S.regions.push({name:'Центральный округ',pop:1100000,wealth:58,loyalty:66,unrest:15,industry:52,infra:62,resource:'Агро'});
 if(S.war&&!S.wars.length&&!S.martial&&!S._wfix){S.martial=true;S._wfix=1}
}

/* ------------------------ ЗАКОНЫ ------------------------ */
const ECOL={civ:{n:'Гражданская экономика',inc:1,out:.6,app:0,stab:0,t:'Обычная жизнь. Мало военной продукции.',pp:0,need:()=>true},
 early:{n:'Раннее перевооружение',inc:.98,out:.85,app:0,stab:0,t:'Доход −2%, выпуск оружия ×0.85.',pp:40,need:()=>true},
 part:{n:'Частичная мобилизация',inc:.94,out:1.1,app:-.08,stab:0,t:'Доход −6%, выпуск ×1.1, одобрение −0.08/мес.',pp:80,need:()=>S.threat>=25||S.war,why:'Нужна угроза 25+ или война'},
 tot:{n:'Полная мобилизация',inc:.86,out:1.35,app:-.2,stab:-.1,t:'Доход −14%, выпуск ×1.35, одобрение −0.2/мес.',pp:120,need:()=>S.war,why:'Нужна война'}};
const ECOO=['civ','early','part','tot'];
const CONS={vol:{n:'Добровольная армия',cap:.005,app:0,t:'Предел армии 0,5% населения.',pp:0},
 lim:{n:'Ограниченный призыв',cap:.008,app:-.03,t:'Предел 0,8%, одобрение −0.03/мес.',pp:30},
 ext:{n:'Расширенный призыв',cap:.012,app:-.08,t:'Предел 1,2%, одобрение −0.08/мес.',pp:60},
 serv:{n:'Служба по призыву',cap:.018,app:-.12,t:'Предел 1,8%, одобрение −0.12/мес.',pp:90},
 all:{n:'Всеобщий призыв',cap:.026,app:-.2,t:'Предел 2,6%, одобрение −0.2/мес.',pp:120,need:()=>!!S.flags.allcons,why:'Нужна цель «Всеобщий призыв»'}};
const CONO=['vol','lim','ext','serv','all'];
H.law=(kind,key)=>{
 if(blocked())return;
 const T=kind==='eco'?ECOL:CONS,O=kind==='eco'?ECOO:CONO,cur=S.law[kind],a=O.indexOf(cur),b=O.indexOf(key);
 if(a===b)return;
 if(Math.abs(a-b)!==1)return toast('Законы меняются по одной ступени');
 if(cdLeft('law'+kind)>0)return toast(cdMsg('law'+kind));
 const L=T[key];if(L.need&&!L.need())return toast(L.why||'Недоступно');
 const pp=b>a?L.pp:20;if(S.pp<pp)return toast('Не хватает политической власти');
 S.pp-=pp;S.law[kind]=key;cdSet('law'+kind,4);log(`Закон: «${L.n}».`);save();render();toast('Принят закон: '+L.n);
};


/* ------------------------ РАСШИРЕННЫЙ БЮДЖЕТ (12 новых статей) ------------------------ */
const BUD=[
 {k:'police',n:'Полиция и порядок',base:5,max:25,fx:{stability:.04,reg:-.15,coupRisk:-.04}},
 {k:'infra',n:'Инфраструктура',base:5,max:25,fx:{infra:.15,'gdp%':.01}},
 {k:'science',n:'Наука и университеты',base:3,max:25,fx:{tech:.05}},
 {k:'culture',n:'Культура и СМИ',base:2,max:20,fx:{approval:.08,legitimacy:.03}},
 {k:'welfare',n:'Соцзащита и пенсии',base:8,max:30,fx:{approval:.08,stability:.03}},
 {k:'agri',n:'Сельское хозяйство',base:4,max:25,fx:{food:.15}},
 {k:'energy',n:'Энергетика',base:4,max:25,fx:{energy:.15}},
 {k:'industry',n:'Промышленные субсидии',base:5,max:25,fx:{'gdp%':.012,employment:.04}},
 {k:'intel',n:'Спецслужбы',base:3,max:20,fx:{coupRisk:-.12,legitimacy:-.02}},
 {k:'foreign',n:'Внешняя политика и помощь',base:2,max:20,fx:{rel:.1}},
 {k:'rnd',n:'Военные разработки',base:2,max:20,fx:{equipment:.1,tech:.02}},
 {k:'housing',n:'Жильё и ЖКХ',base:3,max:20,fx:{approval:.05,employment:.03}},
 {k:'trade',n:'Торговля и таможня',base:2,max:15,fx:{trust:.06,inflation:-.02}}];
const BUDC=25;
const bv=B=>{const v=S.bud[B.k];return v==null?B.base:v};
const budCost=()=>BUD.reduce((a,B)=>a+(bv(B)-B.base)*BUDC,0);
function budTick(){
 BUD.forEach(B=>{const d=bv(B)-B.base;if(!d)return;const m=d<0?1.3:1,o={};for(const k in B.fx)o[k]=B.fx[k]*d*m;ch(o,false)});
 ['tax','health','education','defense'].forEach(k=>S[k]=Math.round(S[k]));
}
H.bud=(k,v,id)=>{const B=BUD.find(x=>x.k===k);S.bud[k]=Math.round(+v);const d=S.bud[k]-B.base;const e=document.getElementById(id);if(e)e.textContent=S.bud[k]+'% ('+(d>=0?'+':'−')+Math.abs(d*BUDC)+' млн/мес)'};
H.budSave=()=>{save();render();toast('Бюджет сохранён')};
H.budReset=()=>{S.bud={};save();render();toast('Статьи сброшены к норме')};
function budCard(){
 const c=budCost();
 return card('📊 Расширенный бюджет',`<p class="muted">Норма — значение, при котором ничего не меняется. Выше нормы — деньги уходят, но растут показатели; ниже — экономия, но показатели падают (сильнее). Сейчас: <b>${c>=0?'+':'−'}${fmt(Math.abs(c))} млн/мес</b> к расходам.</p>`+BUD.map(B=>{const v=bv(B),d=v-B.base;return `<div class="row"><label>${B.n} <b id="bud_${B.k}">${v}% (${d>=0?'+':'−'}${Math.abs(d*BUDC)} млн/мес)</b></label><input type="range" min="0" max="${B.max}" step="1" value="${v}" oninput="H.bud('${B.k}',this.value,'bud_${B.k}')" onchange="save()"><small class="muted">норма ${B.base}% · ${hintFx(Object.fromEntries(Object.entries(B.fx).map(([k,x])=>[k,x*100/100])))} за пункт в месяц</small></div>`}).join('')+`<div class="actions"><button class="primary" onclick="H.budSave()">Применить</button><button onclick="H.budReset()">Сбросить к норме</button></div>`);
}


/* ------------------------ НАЛОГИ (13 видов) ------------------------ */
const TAX=[
 {k:'vat',n:'НДС',base:10,max:30,rev:18,fx:{inflation:.04,approval:-.03},g:{workers:-.8,pens:-.8}},
 {k:'corp',n:'Налог на прибыль бизнеса',base:15,max:40,rev:18,fx:{trust:-.05,'gdp%':-.008},g:{biz:-1.5}},
 {k:'income',n:'Подоходный налог',base:12,max:35,rev:20,fx:{approval:-.04,employment:-.02},g:{workers:-1.2,pens:-.3}},
 {k:'excise',n:'Акцизы (алкоголь, табак, топливо)',base:8,max:30,rev:10,fx:{approval:-.015,stability:-.01},g:{workers:-.4}},
 {k:'prop',n:'Налог на недвижимость',base:5,max:25,rev:10,fx:{approval:-.02},g:{pens:-.8,biz:-.4}},
 {k:'lux',n:'Налог на роскошь',base:3,max:30,rev:6,fx:{trust:-.03},g:{biz:-.8}},
 {k:'cust',n:'Таможенные пошлины',base:5,max:30,rev:8,fx:{inflation:.02,rel:-.04},g:{biz:-.5,farm:-.3}},
 {k:'land',n:'Земельный налог',base:4,max:25,rev:7,fx:{food:-.04},g:{farm:-1.2}},
 {k:'res',n:'Рента на ресурсы',base:5,max:40,rev:12,fx:{'gdp%':-.006,steel:-.03},g:{biz:-.6}},
 {k:'soc',n:'Страховые взносы',base:10,max:35,rev:16,fx:{employment:-.03},g:{biz:-.5,workers:-.4}},
 {k:'eco',n:'Экологический сбор',base:2,max:25,rev:5,fx:{'gdp%':-.004,energy:-.02},g:{biz:-.5,stud:.3}},
 {k:'trans',n:'Транзитные сборы',base:3,max:20,rev:6,fx:{rel:-.03},g:{}},
 {k:'fin',n:'Налог на финансовые операции',base:1,max:15,rev:5,fx:{trust:-.06},g:{biz:-.7}}];
const txv=T=>{const v=S.tx[T.k];return v==null?T.base:v};
const taxRev=()=>Math.round(TAX.reduce((a,T)=>a+(txv(T)-T.base)*T.rev,0)*S.gdp/42000);
function taxTick(){
 TAX.forEach(T=>{const d=txv(T)-T.base;if(!d)return;const m=d<0?.7:1,o={};for(const k in T.fx)o[k]=T.fx[k]*d*m;ch(o,false)});
}
H.tax=(k,v,id)=>{const T=TAX.find(x=>x.k===k);S.tx[k]=Math.round(+v);const d=S.tx[k]-T.base,e=document.getElementById(id);if(e)e.textContent=S.tx[k]+'% ('+(d>=0?'+':'−')+Math.abs(Math.round(d*T.rev*S.gdp/42000))+' млн/мес)'};
H.taxSave=()=>{save();render();toast('Налоги применены')};
H.taxReset=()=>{S.tx={};save();render();toast('Налоги сброшены к норме')};
function taxCard(){
 const r=taxRev();
 return card('💰 Налоги',`<p class="muted">Кроме общей ставки можно настроить 13 отдельных налогов. На норме ничего не меняется. Повышение даёт деньги, но бьёт по одобрению, инфляции, бизнесу или группам населения; снижение теряет доход, но улучшает показатели (слабее). Сейчас: <b>${r>=0?'+':'−'}${fmt(Math.abs(r))} млн/мес</b> к доходу.</p>`+TAX.map(T=>{const v=txv(T),d=v-T.base;return `<div class="row"><label>${T.n} <b id="tx_${T.k}">${v}% (${d>=0?'+':'−'}${Math.abs(Math.round(d*T.rev*S.gdp/42000))} млн/мес)</b></label><input type="range" min="0" max="${T.max}" step="1" value="${v}" oninput="H.tax('${T.k}',this.value,'tx_${T.k}')" onchange="save()"><small class="muted">норма ${T.base}% · за пункт в месяц: ${hintFx(T.fx)}${Object.keys(T.g).length?' · '+Object.keys(T.g).map(k=>GR[k][1]+' '+(T.g[k]<0?'недовольны':'довольны')).join(', '):''}</small></div>`}).join('')+`<div class="actions"><button class="primary" onclick="H.taxSave()">Применить</button><button onclick="H.taxReset()">Сбросить к норме</button></div>`);
}

/* ------------------------ ЗАВОДЫ И СТРОЙКА ------------------------ */
const BUILD={civ:{n:'Гражданский завод',c:500,m:4,t:'+10 млн/мес к доходу',ic:'🏭'},mil:{n:'Военный завод',c:450,m:4,t:'Выпуск вооружения и боеприпасов · −6 млн/мес, тратит сталь',ic:'⚙️'},dock:{n:'Верфь',c:600,m:5,t:'Нужна для кораблей (до 6 кораблей на верфь)',ic:'⚓'},ship:{n:'Боевой корабль',c:700,m:5,t:'Флот +1',ic:'🚢'},sq:{n:'Авиаэскадрилья',c:550,m:4,t:'Авиация +2 (нужно 4+ воен. завода)',ic:'✈️'},fort:{n:'Укрепрайон',c:350,m:3,t:'Угроза −5, боевой дух +1',ic:'🧱'}};
const bslotsN=()=>S.bslots+(S.flags.bs?1:0)+advSum('bs');
H.build=k=>{
 if(blocked())return;const B=BUILD[k];
 if(S.build.length>=bslotsN())return toast('Нет свободных слотов стройки');
 if(k==='ship'&&S.navy>=S.dock*6)return toast('Нужно больше верфей');
 if(k==='sq'&&S.mil<4)return toast('Нужно 4+ военных завода');
 if(S.money<B.c)return toast('Недостаточно средств');
 S.money-=B.c;S.build.push({t:k,left:B.m});log(`Начато строительство: ${B.n}.`);save();render();
};
function buildTick(){
 S.build=S.build.filter(b=>{
  b.left--;if(b.left>0)return true;
  const k=b.t;
  if(k==='civ')S.civ++;else if(k==='mil')S.mil++;else if(k==='dock')S.dock++;else if(k==='ship')S.navy++;else if(k==='sq')S.air+=2;else if(k==='fort'){S.threat=clamp(S.threat-5);S.morale=clamp(S.morale+1)}
  log(`${BUILD[k].ic} Построено: ${BUILD[k].n}.`);toast('Построено: '+BUILD[k].n);return false;
 });
}
function prodTick(){
 const L=ECOL[S.law.eco]||ECOL.civ;
 let f=S.mil*L.out*(1+techSum('mo')+advSum('mo'));
 const reg=S.regions.reduce((a,r)=>a+r.industry,0)/S.regions.length;
 S.steel=clamp(S.steel+reg/100*.9-S.mil*.075);
 if(S.steel<5)f*=.4;
 S.equipment=clamp(S.equipment+f*.18*(1-S.equipment/110)-.25);
 S.ammo=clamp(S.ammo+f*.12*(1-S.ammo/110)-.12);
}
const incMult=()=>(ECOL[S.law.eco]||ECOL.civ).inc*(1+techSum('ic')+advSum('ic'));
const incFlat=()=>(S.civ-18)*10+S.puppets.length*70+taxRev()+(S.mpFlat||0);
const expFlat=()=>(S.mil-6)*6+(S.dock-2)*4+budCost();

/* ------------------------ НАЦИОНАЛЬНЫЕ ЦЕЛИ ------------------------ */
const FB={ind:'🏭 Промышленность',mil:'🎖 Армия',pol:'🏛 Политика'};
const FOC={
 ind1:{b:'ind',n:'Промышленная программа',m:3,req:[],x:[],t:'+2 гражданских завода, ВВП +300',fx:{civ:2,gdp:300}},
 ind2:{b:'ind',n:'Расширение производства',m:4,req:['ind1'],x:[],t:'+2 военных завода, +1 слот стройки',fx:{mil:2},fl:'bs'},
 ind3:{b:'ind',n:'Железные дороги',m:3,req:['ind1'],x:[],t:'Инфраструктура +6, ВВП +200, топливо +3',fx:{infra:6,gdp:200,fuel:3}},
 ind4:{b:'ind',n:'Энергетическая революция',m:4,req:['ind3'],x:[],t:'Энергия +14, ВВП +400',fx:{energy:14,gdp:400}},
 ind5:{b:'ind',n:'Научный центр',m:4,req:['ind2'],x:[],t:'+1 слот исследований, технологии +3',fx:{rslots:1,tech:3}},
 ind6:{b:'ind',n:'Автаркия',m:4,req:['ind4'],x:['ind7'],t:'Еда +8, сталь +8, топливо +6; отношения −4, доверие −3',fx:{food:8,steel:8,fuel:6,rel:-4,trust:-3}},
 ind7:{b:'ind',n:'Открытая торговля',m:4,req:['ind4'],x:['ind6'],t:'Доверие +8, отношения +4, казна +900, инфляция −1',fx:{trust:8,rel:4,money:900,inflation:-1}},
 mil1:{b:'mil',n:'Реформа армии',m:3,req:[],x:[],t:'Подготовка +8, дух +4, риск переворота −3',fx:{training:8,morale:4,coupRisk:-3}},
 mil2:{b:'mil',n:'Военная доктрина',m:4,req:['mil1'],x:[],t:'Выбор доктрины бесплатно (вкладка «Наука»)',fx:{training:3},fl:'docfree'},
 mil3:{b:'mil',n:'Военная промышленность',m:3,req:['mil1'],x:[],t:'+2 военных завода, вооружение +5',fx:{mil:2,equipment:5}},
 mil4:{b:'mil',n:'Воздушный флот',m:4,req:['mil3'],x:[],t:'Авиация +8',fx:{air:8}},
 mil5:{b:'mil',n:'Морская программа',m:4,req:['mil3'],x:[],t:'Флот +3, +1 верфь',fx:{navy:3,dock:1}},
 mil6:{b:'mil',n:'Всеобщий призыв',m:3,req:['mil2'],x:[],t:'Открывает закон «Всеобщий призыв», армия +8 000, стабильность −2',fx:{army:8000,stability:-2},fl:'allcons'},
 mil7:{b:'mil',n:'Военная разведка',m:3,req:['mil2'],x:[],t:'Шанс разведопераций +15%, угроза −3, переворот −3',fx:{threat:-3,coupRisk:-3},fl:'intel'},
 mil8:{b:'mil',n:'Оборонительный пояс',m:4,req:['mil6'],x:['mil9'],t:'+8% в обороне, угроза −8, дух +3',fx:{threat:-8,morale:3},fl:'def'},
 mil9:{b:'mil',n:'Доктрина блицкрига',m:4,req:['mil6'],x:['mil8'],t:'+8% в наступлении, вооружение +4, дух +4',fx:{equipment:4,morale:4},fl:'blitz'},
 pol1:{b:'pol',n:'Национальное единство',m:3,req:[],x:[],t:'Одобрение +5, легитимность +4, стабильность +2',fx:{approval:5,legitimacy:4,stability:2}},
 pol2:{b:'pol',n:'Реформа администрации',m:3,req:['pol1'],x:[],t:'+0,5 пол. власти в месяц, легитимность +2',fx:{legitimacy:2},fl:'pp2'},
 pol3:{b:'pol',n:'Антикоррупционный курс',m:3,req:['pol2'],x:[],t:'Легитимность +6, доверие +5, депутаты −4',fx:{legitimacy:6,trust:5,dep:-4}},
 pol4:{b:'pol',n:'Укрепление власти',m:4,req:['pol2'],x:['pol5'],t:'Переворот −14, стабильность +6, легитимность −6, +0,4 пол. власти/мес',fx:{coupRisk:-14,stability:6,legitimacy:-6},fl:'pp4'},
 pol5:{b:'pol',n:'Либеральные реформы',m:4,req:['pol2'],x:['pol4'],t:'Одобрение +8, легитимность +8, стабильность −3, доверие +4',fx:{approval:8,legitimacy:8,stability:-3,trust:4}},
 pol6:{b:'pol',n:'Международный союз',m:4,req:['pol1'],x:[],t:'Отношения +8, угроза −6, казна +600',fx:{rel:8,threat:-6,money:600}},
 pol7:{b:'pol',n:'Социальная программа',m:3,req:['pol1'],x:[],t:'Одобрение +4, население +60 000, занятость +1',fx:{approval:4,pop:60000,employment:1}},
 pol8:{b:'pol',n:'Культурный подъём',m:3,req:['pol7'],x:[],t:'Одобрение +3, технологии +3, легитимность +2',fx:{approval:3,tech:3,legitimacy:2}}};
const fDone=id=>!!S.focus.done[id];
const fState=id=>{
 const f=FOC[id];if(fDone(id))return'done';if(S.focus.cur===id)return'active';
 if(f.x.some(fDone))return'blocked';if(!f.req.every(fDone))return'locked';return'ready';
};
H.focusStart=id=>{
 if(blocked())return;if(S.focus.cur)return toast('Сначала заверши текущую цель');
 if(fState(id)!=='ready')return;S.focus.cur=id;S.focus.p=0;log(`🎯 Начата национальная цель: ${FOC[id].n}.`);save();render();
};
H.focusCancel=()=>{if(!S.focus.cur)return;log('Национальная цель отменена.');S.focus.cur=null;S.focus.p=0;save();render()};
function focusTick(){
 const id=S.focus.cur;if(!id)return;const f=FOC[id];
 S.focus.p+=1+(S.flags.pp2?.0:0);
 if(S.focus.p>=f.m){
  S.focus.done[id]=1;S.focus.cur=null;S.focus.p=0;
  const sm=ch(f.fx);if(f.fl)S.flags[f.fl]=1;
  log(`✅ Национальная цель выполнена: ${f.n}. ${sm}`);say('Государство завершило важную национальную цель','🎯');toast('✅ Цель выполнена: '+f.n);
 }
}
function focusTab(){
 const cur=S.focus.cur,f=cur&&FOC[cur];
 let h=card('⭐ Национальные цели',`<div class="cards"><div class="mini"><b>Политическая власть: ${Math.floor(S.pp)} / 400</b>+${ppGain().toFixed(1)} в месяц<div class="bar"><i style="width:${S.pp/4}%"></i></div></div></div><p class="muted">Одновременно выполняется одна цель. Награда — после завершения. Взаимоисключающие цели закрывают друг друга навсегда.</p>`+(f?`<div class="mini party-card"><b>🎯 Идёт: ${f.n}</b>${S.focus.p} / ${f.m} мес.<div class="bar"><i style="width:${S.focus.p/f.m*100}%"></i></div><small class="muted">${f.t}</small><div class="actions"><button class="danger" onclick="H.focusCancel()">Отменить</button></div></div>`:'<p><b>Сейчас ничего не выполняется</b> — выбери цель ниже.</p>'));
 for(const b in FB){
  h+=card(FB[b],`<div class="cards">${Object.keys(FOC).filter(i=>FOC[i].b===b).map(i=>{
   const q=FOC[i],st=fState(i);
   let btn=st==='ready'?`<button class="primary" onclick="H.focusStart('${i}')">Начать</button>`:st==='done'?'<span class="muted">✅ Выполнено</span>':st==='active'?'<span class="muted">🎯 Идёт</span>':st==='blocked'?`<span class="muted">🚫 Закрыто: ${q.x.map(x=>FOC[x].n).join(', ')}</span>`:`<span class="muted">🔒 Нужно: ${q.req.filter(r=>!fDone(r)).map(r=>FOC[r].n).join(', ')}</span>`;
   return `<div class="mini ${st==='done'?'party-card':''}" ${st==='blocked'?'style="opacity:.5"':''}><b>${q.n}</b><span class="muted">${q.m} мес.${q.x.length?' · исключает: '+q.x.map(x=>FOC[x].n).join(', '):''}</span><br><small>${q.t}</small><div class="actions">${btn}</div></div>`}).join('')}</div>`);
 }
 return `<div class="grid">${h}</div>`;
}
const ppGain=()=>Math.max(.3,1.4+(S.flags.pp2?.5:0)+(S.flags.pp4?.4:0)+(S.gov==='Диктатура'?.3:0)+(S.legitimacy-50)*.01);

/* ------------------------ НАУКА И ДОКТРИНЫ ------------------------ */
const TECH={
 inf1:{c:'Пехота',n:'Винтовки образца II',m:4,k:300,req:[],fx:{equipment:5},bt:.03,t:'Бой +3%, вооружение +5'},
 inf2:{c:'Пехота',n:'Автоматическое оружие',m:5,k:450,req:['inf1'],fx:{equipment:5},bt:.04,t:'Бой +4%, вооружение +5'},
 inf3:{c:'Пехота',n:'Моторизованная пехота',m:6,k:700,req:['inf2','ind1'],fx:{morale:2},bt:.05,t:'Бой +5%, дух +2'},
 art1:{c:'Артиллерия',n:'Полевая артиллерия',m:4,k:350,req:[],fx:{ammo:5},bt:.03,t:'Бой +3%, боеприпасы +5'},
 art2:{c:'Артиллерия',n:'Тяжёлая артиллерия',m:5,k:550,req:['art1'],fx:{},bt:.04,t:'Бой +4%'},
 art3:{c:'Артиллерия',n:'Реактивные системы',m:6,k:800,req:['art2','ind2'],fx:{},bt:.05,t:'Бой +5%'},
 arm1:{c:'Бронетехника',n:'Лёгкие танки',m:5,k:500,req:['inf1'],fx:{equipment:3},bt:.04,t:'Бой +4%'},
 arm2:{c:'Бронетехника',n:'Средние танки',m:6,k:750,req:['arm1','ind1'],fx:{},bt:.05,t:'Бой +5%'},
 arm3:{c:'Бронетехника',n:'Тяжёлые танки',m:7,k:1000,req:['arm2'],fx:{},bt:.06,t:'Бой +6%'},
 air1:{c:'Авиация',n:'Истребители',m:5,k:500,req:[],fx:{air:4},t:'Авиация +4'},
 air2:{c:'Авиация',n:'Бомбардировщики',m:6,k:700,req:['air1'],fx:{air:3},bt:.03,t:'Авиация +3, бой +3%'},
 air3:{c:'Авиация',n:'Реактивная авиация',m:8,k:1100,req:['air2','ele2'],fx:{air:6},bt:.04,t:'Авиация +6, бой +4%'},
 ind1:{c:'Промышленность',n:'Конвейерное производство',m:4,k:400,req:[],fx:{gdp:200},mo:.15,t:'Выпуск воен. заводов +15%, ВВП +200'},
 ind2:{c:'Промышленность',n:'Электрификация',m:5,k:600,req:['ind1'],fx:{energy:6},ic:.02,t:'Доход +2%, энергия +6'},
 ind3:{c:'Промышленность',n:'Автоматизация',m:7,k:900,req:['ind2'],fx:{},ic:.03,mo:.15,t:'Доход +3%, выпуск +15%'},
 ele1:{c:'Электроника',n:'Радиосвязь',m:4,k:350,req:[],fx:{training:3,morale:2},rs:.1,t:'Скорость науки +10%, подготовка +3, дух +2'},
 ele2:{c:'Электроника',n:'Радары',m:6,k:600,req:['ele1'],fx:{threat:-4},rs:.1,t:'Скорость науки +10%, угроза −4'},
 ele3:{c:'Электроника',n:'Криптография',m:6,k:700,req:['ele1'],fx:{},rs:.1,intel:.2,t:'Наука +10%, шанс разведопераций +20%'},
 nuc1:{c:'Атом',n:'Ядерная физика',m:10,k:1500,req:['ele2'],fx:{tech:8},t:'Технологии +8'},
 nuc2:{c:'Атом',n:'Атомная энергетика',m:12,k:2000,req:['nuc1','ind2'],fx:{energy:15,gdp:600},t:'Энергия +15, ВВП +600'}};
const techSum=f=>Object.keys(S.techs).reduce((a,id)=>a+((TECH[id]&&TECH[id][f])||0),0);
H.resStart=id=>{
 if(blocked())return;const T=TECH[id];
 if(S.techs[id]||S.research.some(r=>r.id===id))return;
 if(!T.req.every(r=>S.techs[r]))return toast('Нужно сначала изучить предыдущие технологии');
 if(S.research.length>=S.rslots)return toast('Нет свободных слотов исследований');
 if(S.money<T.k)return toast('Недостаточно средств');
 S.money-=T.k;S.research.push({id,p:0});log(`🔬 Начато исследование: ${T.n}.`);save();render();
};
function researchTick(){
 const sp=1+techSum('rs')+advSum('rs');
 S.research=S.research.filter(r=>{
  const T=TECH[r.id];r.p+=sp;if(r.p<T.m)return true;
  S.techs[r.id]=1;const sm=ch(T.fx||{},false);log(`🔬 Исследование завершено: ${T.n}. ${sm}`);say('Наши учёные завершили исследование','🔬');toast('🔬 '+T.n);return false;
 });
}
const DOCS={mass:{n:'Массированный штурм',t:'Предел призыва +10%, бой +4%, потери ×1,15',cap:.1,bt:.04,loss:1.15},
 fire:{n:'Огневое превосходство',t:'Бой +5%, потери ×0,9, боеприпасы +0,6/мес в войне',bt:.05,loss:.9,ammoS:.6},
 gbp:{n:'Великий план битвы',t:'Бой +2% и +0,1% за пункт подготовки, потери ×0,85',bt:.02,trn:.001,loss:.85},
 mob:{n:'Мобильная война',t:'Бой +4%, при вооружении 60+ ещё +6%; топливо −1/мес в войне',bt:.04,eq:.06,fuelC:1,loss:1}};
H.docPick=k=>{
 if(blocked())return;if(S.doc===k)return;
 const free=!!S.flags.docfree&&!S.doc,cost=free?0:100;
 if(S.pp<cost)return toast('Не хватает политической власти (нужно 100)');
 S.pp-=cost;S.doc=k;log(`Принята доктрина: ${DOCS[k].n}.`);save();render();toast('Доктрина: '+DOCS[k].n);
};
function researchTab(){
 let h=card('🔬 Исследования',`<p class="muted">Слотов: ${S.research.length} / ${S.rslots}. Скорость науки ×${(1+techSum('rs')+advSum('rs')).toFixed(2)}. Исследование стоит денег сразу и занимает несколько месяцев.</p>`+(S.research.length?`<div class="cards">${S.research.map(r=>{const T=TECH[r.id];return `<div class="mini party-card"><b>🔬 ${T.n}</b>${Math.floor(r.p*10)/10} / ${T.m} мес.<div class="bar"><i style="width:${Math.min(100,r.p/T.m*100)}%"></i></div></div>`}).join('')}</div>`:'<p>Слоты свободны.</p>'));
 h+=card('🎖 Сухопутная доктрина',`<p class="muted">${S.doc?'Выбрана: <b>'+DOCS[S.doc].n+'</b>. Смена стоит 100 пол. власти.':(S.flags.docfree?'Первый выбор бесплатный (цель «Военная доктрина»).':'Выбор стоит 100 пол. власти.')}</p><div class="cards">${Object.keys(DOCS).map(k=>`<div class="mini ${S.doc===k?'party-card':''}"><b>${DOCS[k].n}</b><small>${DOCS[k].t}</small><div class="actions">${S.doc===k?'<span class="muted">✅ Выбрана</span>':`<button class="primary" onclick="H.docPick('${k}')">Выбрать</button>`}</div></div>`).join('')}</div>`);
 const cats=[...new Set(Object.values(TECH).map(t=>t.c))];
 cats.forEach(c=>{
  h+=card('🧪 '+c,`<div class="cards">${Object.keys(TECH).filter(i=>TECH[i].c===c).map(i=>{
   const T=TECH[i],done=S.techs[i],going=S.research.some(r=>r.id===i),ok=T.req.every(r=>S.techs[r]);
   const btn=done?'<span class="muted">✅ Изучено</span>':going?'<span class="muted">🔬 Идёт</span>':ok?`<button class="primary" onclick="H.resStart('${i}')">Изучить · ${T.k} млн</button>`:`<span class="muted">🔒 Нужно: ${T.req.filter(r=>!S.techs[r]).map(r=>TECH[r].n).join(', ')}</span>`;
   return `<div class="mini ${done?'party-card':''}"><b>${T.n}</b><span class="muted">${T.m} мес.</span><br><small>${T.t}</small><div class="actions">${btn}</div></div>`}).join('')}</div>`);
 });
 return `<div class="grid">${h}</div>`;
}

/* ------------------------ СОВЕТНИКИ И РЕШЕНИЯ ------------------------ */
const ADV={
 prop:{s:'pol',n:'Мастер пропаганды',t:'Одобрение +0,2/мес, легитимность −0,05/мес',fx:{approval:.2,legitimacy:-.05},pp:50},
 diplo:{s:'pol',n:'Дипломат-стратег',t:'Отношения со всеми +0,15/мес',fx:{rel:.15},pp:50},
 spym:{s:'pol',n:'Начальник тайной службы',t:'Переворот −0,25/мес, шанс разведопераций +10%',fx:{coupRisk:-.25},intel:.1,pp:50},
 reform:{s:'mil',n:'Реформатор армии',t:'Подготовка +0,15/мес, бой +3%',fx:{training:.15},bt:.03,pp:60},
 smith:{s:'mil',n:'Оружейный магнат',t:'Выпуск оружия +20%',mo:.2,pp:60},
 marshal:{s:'mil',n:'Фельдмаршал',t:'Бой +6%, потери −10%',bt:.06,loss:.1,pp:70},
 fin:{s:'eco',n:'Финансист',t:'Доход +3%',ic:.03,pp:50},
 indus:{s:'eco',n:'Индустриалист',t:'+1 слот стройки, выпуск заводов +10%',bs:1,mo:.1,pp:60},
 agrar:{s:'eco',n:'Аграрный министр',t:'Еда +0,3/мес',fx:{food:.3},pp:40}};
const ADVS={pol:'🏛 Политический советник',mil:'🎖 Военный советник',eco:'💰 Экономический советник'};
const advSum=f=>Object.values(S.adv).reduce((a,id)=>a+((id&&ADV[id]&&ADV[id][f])||0),0);
H.hire=id=>{
 if(blocked())return;const A=ADV[id];if(S.adv[A.s]===id)return;
 if(S.pp<A.pp)return toast('Не хватает политической власти');
 S.pp-=A.pp;S.adv[A.s]=id;log(`Назначен советник: ${A.n}.`);save();render();
};
H.dismiss=s=>{if(blocked())return;S.adv[s]=null;save();render()};
const DEC=[
 {n:'Военный парад',c:150,pp:20,cd:6,fx:{morale:5,approval:2,threat:2}},
 {n:'Укрепить границы',c:450,pp:30,cd:8,fx:{threat:-8,morale:1}},
 {n:'Закупить лицензии на вооружение',c:700,pp:25,cd:8,fx:{equipment:10,tech:1}},
 {n:'Мобилизация ресурсов',c:0,pp:30,cd:8,fx:{steel:10,fuel:8,approval:-3}},
 {n:'Экономические консультации',c:300,pp:25,cd:8,fx:{trust:6,inflation:-1}},
 {n:'Национальный фестиваль',c:250,pp:15,cd:6,fx:{approval:4,stability:1}},
 {n:'Реформа налоговой службы',c:400,pp:35,cd:10,fx:{money:1100,approval:-1}},
 {n:'Набор добровольцев',c:300,pp:20,cd:6,fx:{army:3000,morale:1}},
 {n:'Нормирование продуктов',c:0,pp:30,cd:10,fx:{food:8,fuel:6,approval:-3,inflation:-1}},
 {n:'Программа переподготовки кадров',c:350,pp:25,cd:8,fx:{employment:2,tech:2}}];
H.dec=i=>{
 if(blocked())return;const d=DEC[i];
 if(cdLeft('dec'+i)>0)return toast(cdMsg('dec'+i));
 if(S.pp<d.pp)return toast('Не хватает политической власти');
 if(S.money<d.c)return toast('Недостаточно средств');
 S.pp-=d.pp;S.money-=d.c;cdSet('dec'+i,d.cd);const sm=ch(d.fx);log(`Решение: ${d.n}. (${sm})`);save();render();toast(d.n+' · '+sm);
};
function advTab(){
 let h=card('⭐ Политическая власть',`<div class="mini"><b>${Math.floor(S.pp)} / 400</b>+${ppGain().toFixed(1)} в месяц. Тратится на советников, законы, доктрины и решения.<div class="bar"><i style="width:${S.pp/4}%"></i></div></div>`);
 for(const s in ADVS){
  const cur=S.adv[s];
  h+=card(ADVS[s],`<p class="muted">Назначен: <b>${cur?ADV[cur].n:'никого'}</b>${cur?` <button onclick="H.dismiss('${s}')">Уволить</button>`:''}</p><div class="cards">${Object.keys(ADV).filter(i=>ADV[i].s===s).map(i=>`<div class="mini ${cur===i?'party-card':''}"><b>${ADV[i].n}</b><small>${ADV[i].t}</small><div class="actions">${cur===i?'<span class="muted">✅ На посту</span>':`<button class="primary" onclick="H.hire('${i}')">Нанять · ${ADV[i].pp} ⭐</button>`}</div></div>`).join('')}</div>`);
 }
 h+=card('📜 Решения',`<div class="cards">${DEC.map((d,i)=>`<div class="mini"><b>${d.n}</b><small>${hintFx(d.fx)}</small><div class="actions"><button class="primary" onclick="H.dec(${i})">${cdLeft('dec'+i)>0?'⏳ '+cdLeft('dec'+i)+' мес.':`${d.pp} ⭐${d.c?' + '+d.c+' млн':''}`}</button></div></div>`).join('')}</div>`);
 return `<div class="grid">${h}</div>`;
}

/* ------------------------ ВОЙНЫ ------------------------ */
const rel=n=>S.relations.find(r=>r.name===n);
function startWar(name,def){
 if(S.wars.some(w=>w.n===name))return;
 S.wars.push({n:name,p:def?40:50,m:0,won:false,def:!!def});S.war=true;
 S.threat=clamp(S.threat+5);log(`⚔️ Начата война: ${name}${def?' (нападение на нас)':''}.`);
}
function warPower(w){
 const q=(.55+S.equipment/100*.6)*(.7+S.training/100*.5)*(.7+S.morale/100*.4);
 const sup=(S.ammo<15||S.fuel<15)?.75:1;
 let m=1+techSum('bt')+advSum('bt');const d=DOCS[S.doc];
 if(d){m+=(d.bt||0)+(d.trn||0)*S.training;if(d.eq&&S.equipment>=60)m+=d.eq}
 if(S.flags.def&&w&&w.def)m+=.08;if(S.flags.blitz&&w&&!w.def)m+=.08;
 return Math.max(1,myPower()*q*m*sup);
}
function warTick(){
 S.wars.forEach(w=>{
  const c=rel(w.n);if(!c){w.dead=1;return}
  w.m++;
  if(w.won){w.wm=(w.wm||0)+1;if(w.wm>=3)spoils(w.n,'tribute');return}
  const my=warPower(w),en=c.power*1.45*(1+(c.aggr-.4)*.15);
  const d=clamp((my-en)/(my+en)*18+rnd(-3.5,3.5),-10,10);
  w.p=clamp(w.p+d,0,100);
  const dc=DOCS[S.doc],lossK=(1+Math.max(0,-d)/10)*(dc?dc.loss:1)*(1-advSum('loss'));
  S.army=Math.max(5000,S.army-Math.round(rnd(250,800)*lossK*(en/(my+en))*2));
  ch({money:-120},false);S.approval=clamp(S.approval-.12);
  if(dc&&dc.ammoS)S.ammo=clamp(S.ammo+dc.ammoS);if(dc&&dc.fuelC)S.fuel=clamp(S.fuel-dc.fuelC);
  c.power=Math.max(10,Math.round(c.power-Math.max(0,d)*.35+Math.max(0,-d)*.1));c.value=clamp(c.value-.8,-100,100);
  if(w.p>=100){w.won=true;w.wm=0;log(`🏆 Победа над государством ${w.n}! Выбери плоды победы во вкладке «Штаб».`);say('Мы победили в войне!','🎉');toast('🏆 Победа над '+w.n+'!');pause()}
  else if(w.p<=0){
   const loss=Math.min(S.money,1200);S.money-=loss;
   ch({approval:-10,stability:-6,legitimacy:-8,threat:-10},false);c.value=clamp(c.value-10,-100,100);c.power=Math.round(c.power*1.1);w.dead=1;
   log(`🏳 Поражение в войне с ${w.n}: вынужденный мир, контрибуция ${fmt(loss)} млн.`);say('Мы проиграли войну…','😢');toast('🏳 Поражение в войне');pause();
  }
 });
 S.wars=S.wars.filter(w=>!w.dead);
}
function peaceAll(free){
 if(!S.wars.length)return;
 if(!free){
  const losing=S.wars.some(w=>!w.won&&w.p<30);
  if(losing){const pay=Math.min(S.money,800);S.money-=pay;ch({approval:-4},false)}else ch({approval:-1},false);
 }
 log('🕊 Заключён мир.');S.wars=[];S.war=!!S.martial;
}
function spoils(name,mode){
 const w=S.wars.find(x=>x.n===name),c=rel(name);if(!w||!c)return;
 if(mode==='tribute'){const m=800+Math.round(c.power*25);ch({money:m,approval:2},false);c.value=clamp(c.value-30,-100,100);c.power=Math.round(c.power*.8);log(`💰 ${name} выплатил контрибуцию: +${fmt(m)} млн.`)}
 if(mode==='annex'){const p=Math.round(c.pop||c.power*3500),g=Math.round((c.gdp||c.power*25)*.72);S.pop+=p;S.gdp+=g;S.conquered=S.conquered||[];S.conquered.push({name,owner:'player',pop:p,gdp:g,stability:42});c.owner='player';c.value=clamp(-60,-100,100);c.power=Math.max(10,Math.round(c.power*.5));ch({stability:-5,legitimacy:-2,threat:8,rel:-6,reg:4},false);log(`🏴 ${name} полностью присоединена: население +${fmt(p)}, ВВП +${fmt(g)}. Территория отмечена на мировой карте.`)}
 if(mode==='partial'){const p=Math.round((c.pop||c.power*3500)*.35),g=Math.round((c.gdp||c.power*25)*.25);c.owner='partial';S.pop+=p;S.gdp+=g;S.conquered=S.conquered||[];S.conquered.push({name:name+' — присоединённая область',owner:'player',pop:p,gdp:g,stability:48});c.power=Math.max(10,Math.round(c.power*.8));c.value=clamp(c.value-18,-100,100);ch({stability:-2,threat:4,rel:-3},false);log(`🗺️ Часть территории ${name} присоединена: население +${fmt(p)}, ВВП +${fmt(g)}.`)}
 if(mode==='puppet'){c.value=60;c.power=Math.max(10,Math.round(c.power*.7));c.owner='puppet';S.conquered=S.conquered||[];S.conquered.push({name,owner:'puppet',pop:c.pop||0,gdp:c.gdp||0,stability:55});if(!S.puppets.includes(name))S.puppets.push(name);ch({approval:3},false);log(`🎭 ${name} стал вашим вассалом. Он сохранит собственную экономику, но будет отмечен на карте как зависимое государство.`)}
 S.wars=S.wars.filter(x=>x.n!==name);S.war=S.wars.length>0||!!S.martial;
}
function puppetTick(){
 S.puppets=S.puppets.filter(n=>{if(Math.random()<.01){const c=rel(n);if(c)c.value=clamp(c.value-30,-100,100);log(`${n} вышел из-под контроля.`);return false}return true});
}
function justTick(){for(const k in S.just)if(S.just[k]>0)S.just[k]--}
H.justify=i=>{
 if(blocked())return;const c=S.relations[i];if(S.just[c.name]!=null)return;
 if(S.pp<30)return toast('Не хватает политической власти');
 S.pp-=30;S.just[c.name]=3;log(`Начато обоснование войны против ${c.name}.`);save();render();
};
H.declare=i=>{
 if(blocked())return;const c=S.relations[i];
 if(S.wars.some(w=>w.n===c.name))return;
 if(S.wars.length>=2)return toast('Нельзя вести больше двух войн');
 if(S.pp<20)return toast('Нужно 20 политической власти');
 S.pp-=20;
 if(S.just[c.name]===0)delete S.just[c.name];
 else{ch({approval:-8,legitimacy:-6,rel:-8},false);log('Война без обоснования вызвала возмущение.')}
 startWar(c.name,false);save();render();
};
H.peace=()=>{if(blocked())return;peaceAll(false);save();render()};
H.spoils=(n,m)=>{spoils(n,m);save();render()};
H.intel=(i,k)=>{
 if(blocked())return;const c=S.relations[i],key='in'+k+i;
 if(cdLeft(key)>0)return toast(cdMsg(key));
 const cost={prop:150,sab:350,steal:500}[k];if(S.money<cost)return toast('Недостаточно средств');
 S.money-=cost;cdSet(key,4);
 const p=.55+techSum('intel')+advSum('intel')+(S.flags.intel?.15:0),ok=Math.random()<p;
 if(k==='prop'){if(ok){c.value=clamp(c.value+12,-100,100);log(`📡 Пропаганда в ${c.name}: отношения улучшились.`)}else log(`📡 Операция в ${c.name} провалилась.`)}
 if(k==='sab'){if(ok){c.power=Math.max(10,c.power-7);c.aggr=Math.max(.1,c.aggr-.05);log(`💥 Диверсия в ${c.name}: их мощь упала.`)}else{c.value=clamp(c.value-15,-100,100);ch({legitimacy:-1},false);log(`💥 Диверсанты в ${c.name} пойманы — скандал.`)}}
 if(k==='steal'){if(ok){if(S.research.length)S.research[0].p+=1.5;else S.tech=clamp(S.tech+2);log(`🕵 Из ${c.name} украдены чертежи.`)}else{c.value=clamp(c.value-10,-100,100);log(`🕵 Шпионы в ${c.name} раскрыты.`)}}
 toast(ok?'Операция удалась':'Операция провалилась');save();render();
};
const moodT=v=>v>40?'🤝 Друг':v>10?'🙂 Дружелюбен':v>-20?'😐 Нейтрален':v>-50?'🧊 Холоден':'😠 Враждебен';
function worldTab(){
 const countries=S.relations.slice().sort((a,b)=>(b.gdp||0)-(a.gdp||0));
 const rows=[{name:S.name,owner:'Вы',gdp:S.gdp,pop:S.pop,power:myPower(),money:S.money,stability:S.stability,player:true},...countries.map(c=>({name:c.name,owner:c.owner==='player'?'Вы':c.owner==='puppet'?'Ваш вассал':c.owner||c.name,gdp:c.gdp||0,pop:c.pop||0,power:c.power,money:c.money||0,stability:c.stability||0}))].sort((a,b)=>b.gdp-a.gdp);
 const rank=(label,key)=>{const a=rows.slice().sort((x,y)=>y[key]-x[key]);return `<div class="mini"><b>${label}</b>${a.slice(0,5).map((c,i)=>`<div class="choice">${i+1}. ${c.name} — <b>${fmt(c[key])}</b></div>`).join('')}</div>`};
 const tiles=countries.map(c=>{const owner=c.owner==='player'?'#4d9b72':c.owner==='puppet'?'#b68a45':c.owner==='partial'?'#7b9b70':'#596477';return `<div class="mini" style="border-left:5px solid ${owner}"><b>${c.name}</b><small>Контроль: ${c.owner==='player'?'Ваша страна':c.owner==='puppet'?'Ваше вассальное государство':c.owner==='partial'?'Частично под вашим контролем':c.owner||c.name}</small><br>ВВП: ${fmt(c.gdp||0)} млрд · Армия: ${fmt(c.army||c.power*620)} чел.<br>Казна: ${fmt(c.money||0)} млн · Население: ${fmt(c.pop||0)}</div>`}).join('');
 return `<div class="grid">${card('🏆 Мировой рейтинг',`<div class="cards">${rank('💰 Топ экономик','gdp')}${rank('⚔️ Военная мощь','power')}${rank('👥 Население','pop')}${rank('🏦 Государственная казна','money')}</div>`)}${card('🗺️ Мировая карта и контроль территорий',`<p class="muted">Зелёный — территория вашей страны; золотой — вассалы; серый — независимые государства. После аннексии или создания вассала статус меняется здесь и сохраняется в кампании.</p><div class="cards">${tiles}</div>${S.conquered.length?`<h3>Территории, полученные в войнах</h3>${S.conquered.map(t=>`<div class="choice"><b>${t.name}</b> · ${t.owner==='player'?'Аннексирована':'Вассальное государство'} · население ${fmt(t.pop)} · ВВП ${fmt(t.gdp)}</div>`).join('')}`:'<p class="muted">Пока вы не захватили территории. Побеждайте в войнах, чтобы расширить государство.</p>'}`)}${card('🤖 Активность ИИ',`<p>Каждый месяц государства самостоятельно инвестируют в экономику, увеличивают армию, меняют стабильность и могут начинать войны друг с другом.</p>${S.botWars.length?S.botWars.map(w=>`<div class="choice">⚔️ ${w.a} против ${w.b} · ход войны ${Math.round(w.progress)}% · ${w.months} мес.</div>`).join(''):'<p class="muted">Сейчас между ботами нет активных войн.</p>'}`)}</div>`;
}
function staffTab(){
 let h='';
 h+=card('⚔️ Фронты',S.wars.length?`<div class="cards">${S.wars.map(w=>{
  const c=rel(w.n)||{power:0};
  return `<div class="mini ${w.won?'party-card':''}"><b>${w.n}${w.def?' (напали на нас)':''}</b>Месяцев войны: ${w.m} · их мощь: ${c.power}<br>Продвижение фронта: <b>${Math.round(w.p)}%</b> (победа при 100%)<div class="bar"><i style="width:${w.p}%;background:${w.p<35?'#c23b4b':w.p<60?'#c9902f':'#2aa56d'}"></i></div>${w.won?`<p><b>🏆 Победа!</b> Выбери плоды победы (иначе через ${3-(w.wm||0)} мес. — контрибуция):</p><div class="actions"><button class="good" onclick="H.spoils('${w.n}','tribute')">Контрибуция</button><button class="danger" onclick="H.spoils('${w.n}','annex')">Аннексия</button><button class="primary" onclick="H.spoils('${w.n}','puppet')">Вассал</button><button onclick="H.spoils('${w.n}','partial')">Забрать 35% территории</button></div>`:''}</div>`}).join('')}</div><div class="actions"><button class="danger" onclick="H.peace()">Заключить мир со всеми</button></div><p class="muted">Сила армии: <b>${fmt(warPower())}</b>. Исход зависит от численности, вооружения, подготовки, духа, технологий, доктрины и снабжения.</p>`:'<p>Сейчас мы не воюем. '+(S.martial?'Введено военное положение.':'')+'</p>');
 h+=card('🌍 Страны: война и разведка',`<div class="cards">${S.relations.map((r,i)=>{
  const atWar=S.wars.some(w=>w.n===r.name),j=S.just[r.name];
  let wb=atWar?'<span class="muted">⚔️ Идёт война</span>':j==null?`<button onclick="H.justify(${i})">Обосновать войну · 30 ⭐</button>`:j>0?`<span class="muted">⏳ Обоснование: ${j} мес.</span>`:`<button class="danger" onclick="H.declare(${i})">Объявить войну · 20 ⭐</button>`;
  if(!atWar&&j==null)wb+=` <button class="danger" onclick="H.declare(${i})">Без обоснования (штрафы)</button>`;
  const ib=['prop','sab','steal'].map(k=>{const nm={prop:'Пропаганда · 150',sab:'Диверсия · 350',steal:'Кража чертежей · 500'}[k],cd=cdLeft('in'+k+i);return `<button onclick="H.intel(${i},'${k}')">${cd>0?'⏳ '+cd+' мес.':nm}</button>`}).join('');
  return `<div class="mini"><b>${r.name}</b><span class="muted">${r.trait||''}</span><br>${moodT(r.value)} · мощь ${r.power}<br><small class="muted">🧠 ${r.intent||''}</small>${S.puppets.includes(r.name)?'<br><small>🎭 Марионетка</small>':''}<div class="actions">${wb}</div><div class="actions">${ib}</div></div>`}).join('')}</div><p class="muted">Шанс разведопераций: ${Math.round((.55+techSum('intel')+advSum('intel')+(S.flags.intel?.15:0))*100)}%. Объявление войны без обоснования: одобрение −8, легитимность −6, отношения −8.</p>`);
 h+=card('📜 Законы',`<p class="muted">Меняются по одной ступени, раз в 4 месяца. Снижение стоит 20 ⭐.</p><h3>Экономика</h3><div class="cards">${ECOO.map(k=>{const L=ECOL[k],cur=S.law.eco===k,ok=!L.need||L.need();return `<div class="mini ${cur?'party-card':''}"><b>${L.n}</b><small>${L.t}</small><div class="actions">${cur?'<span class="muted">✅ Действует</span>':`<button class="${ok?'primary':''}" onclick="H.law('eco','${k}')">${ok?`${L.pp} ⭐`:'🔒 '+L.why}</button>`}</div></div>`}).join('')}</div><h3>Призыв</h3><div class="cards">${CONO.map(k=>{const L=CONS[k],cur=S.law.con===k,ok=!L.need||L.need();return `<div class="mini ${cur?'party-card':''}"><b>${L.n}</b><small>${L.t}</small><div class="actions">${cur?'<span class="muted">✅ Действует</span>':`<button class="${ok?'primary':''}" onclick="H.law('con','${k}')">${ok?`${L.pp} ⭐`:'🔒 '+L.why}</button>`}</div></div>`}).join('')}</div>`);
 return `<div class="grid">${h}</div>`;
}
function indTab(){
 const L=ECOL[S.law.eco]||ECOL.civ;
 let h=card('🏭 Промышленность',`<div class="cards"><div class="mini">Гражданские заводы<b>${S.civ}</b>доход ${incFlat()>=0?'+':''}${incFlat()} млн/мес относительно базы</div><div class="mini">Военные заводы<b>${S.mil}</b>выпуск ×${(L.out*(1+techSum('mo')+advSum('mo'))).toFixed(2)}</div><div class="mini">Верфи<b>${S.dock}</b>флот: ${S.navy}</div><div class="mini">Слоты стройки<b>${S.build.length} / ${bslotsN()}</b></div></div><p class="muted">Военные заводы расходуют сталь и дают вооружение и боеприпасы. Закон экономики влияет на выпуск и доход. Стройка стоит денег сразу.</p>`);
 h+=card('🏗 Очередь строительства',S.build.length?`<div class="cards">${S.build.map(b=>`<div class="mini party-card"><b>${BUILD[b.t].ic} ${BUILD[b.t].n}</b>осталось ${b.left} мес.<div class="bar"><i style="width:${(1-b.left/BUILD[b.t].m)*100}%"></i></div></div>`).join('')}</div>`:'<p>Очередь пуста.</p>');
 h+=card('➕ Построить',`<div class="cards">${Object.keys(BUILD).map(k=>`<div class="mini"><b>${BUILD[k].ic} ${BUILD[k].n}</b><small>${BUILD[k].t}</small><br><span class="muted">${BUILD[k].m} мес.</span><div class="actions"><button class="primary" onclick="H.build('${k}')">${BUILD[k].c} млн</button></div></div>`).join('')}</div>`);
 return `<div class="grid">${h}</div>`;
}


/* ------------------------ ОТСТАВКА: честный баланс ------------------------ */
const ADVICE=['Раздай помощь населению, выступи с обращением, снизь налоги.','Усиль порядок в регионах и охрану, подними стабильность.','Повысь жалованье армии, сделай чистку или усили тайную полицию.','Погаси долг, подними налоги, сократи расходы.','Антикоррупционная кампания, референдум, союз с церковью.','Заключи мир, закупи вооружение, проведи учения.','Заморозь цены, не печатай деньги, подними налоги.','Закупи еду на рынке, дай субсидии фермерам.','Встречи с депутатами, коалиция, при крайней нужде — подкуп.','Подними доверие рынков: меньше долга и ровный бюджет.','Программа занятости, укрепи армию и границы.'];
const isPopular=()=>S.approval>=60&&S.legitimacy>=45;
const crisisNeed=()=>isPopular()?8:S.approval>=50?6:4;
const ousterChance=()=>.18*difficulty().coup*(isPopular()?.35:S.approval>=50?.6:1);
function threatLethal(){
 if(S.war)return true;
 const top=Math.max(...S.relations.map(r=>r.power))*1.45;
 return warPower(null)<top*.9;
}

/* ------------------------ ГРУППЫ НАСЕЛЕНИЯ ------------------------ */
const GR={workers:['Рабочие','👷',.3],biz:['Бизнес','💼',.1],pens:['Пенсионеры','👵',.2],stud:['Студенты','🎓',.15],mil:['Военные','🎖',.1],farm:['Фермеры','🌾',.15]};
const POSV=['одобряют','рады','благодарят власть за','поддерживают'],NEGV=['возмущены','требуют отмены','недовольны','выходят на митинги против'];
function grTick(){
 const g=S.gr,t={
  workers:50+(S.employment-90)*2.5-(S.inflation-5)*1.2+(S.approval-55)*.3,
  biz:50+(S.trust-60)*.5-(S.tax-20)*1.5,
  pens:50-(S.inflation-5)*1.5+(S.health-10)*1+(S.approval-55)*.2,
  stud:50+(S.education-10)*1.5+(S.tech-40)*.2,
  mil:50+(S.morale-60)*.5+(S.defense-15)*1.2+(S.equipment-50)*.15,
  farm:50+(S.food-70)*.4-(S.tax-20)*.5};
 for(const id in S.bills){const b=S.bills[id];if(b.st!=='adopted')continue;const B=BILLS.find(x=>x.id===id);if(!B)continue;for(const k in B.st)t[k]+=B.st[k]*8}
 TAX.forEach(T=>{const d=txv(T)-T.base;for(const k in T.g)t[k]+=d*T.g[k]*(d<0?.7:1)});
 let sum=0;
 for(const k in GR){
  const old=g[k];g[k]=clamp(g[k]+(clamp(t[k])-g[k])*.12);sum+=g[k];
  if(g[k]<25&&old>=25){log(`${GR[k][1]} ${GR[k][0]} в ярости: уровень жизни упал.`);say(`${GR[k][0]} выходят на улицы`,'😡')}
  if(g[k]<25)S.stability=clamp(S.stability-.25);
  if(g[k]>75)S.legitimacy=clamp(S.legitimacy+.03);
 }
 S.approval=clamp(S.approval+(sum/6-55)*.005);
}
function grReact(label,sg,w){
 const ks=Object.keys(GR).filter(k=>sg[k]&&Math.abs(sg[k])>=.4).sort((a,b)=>Math.abs(sg[b])-Math.abs(sg[a])).slice(0,3);
 ks.forEach(k=>{const s=sg[k]*(w||1);S.gr[k]=clamp(S.gr[k]+s*10);say(`${GR[k][0]} ${pick(s>0?POSV:NEGV)} ${label}`,s>0?'🙂':'😠')});
}
/* реакции людей на любые действия */
['act','xa','fin','regionAct','diplomacy','campaignAction'].forEach(n=>{
 const f=window[n];if(!f)return;
 window[n]=function(...a){
  const A=S.approval,St=S.stability,sn=S.log[0];
  const r=f.apply(this,a);
  const dA=S.approval-A,dS=S.stability-St;
  if(S.log[0]!==sn&&(Math.abs(dA)>=1.5||Math.abs(dS)>=3)){
   const k=pick(Object.keys(GR)),pos=dA+dS/2>0;
   say(`${GR[k][0]} ${pick(pos?['довольны решением власти','хвалят правительство','говорят: наконец-то!']:['возмущены решением власти','требуют отмены','обещают выйти на улицы'])}`,pos?'🙂':'😠');render();
  }
  return r;
 };
});

/* ------------------------ ЗАКОНОПРОЕКТЫ ------------------------ */
const BILLS=[
 {id:'minwage',n:'Минимальная зарплата',pp:40,fx:{approval:2,employment:-1},mo:{approval:.04,'gdp%':-.01},st:{workers:1,biz:-1}},
 {id:'pensions',n:'Повышение пенсий',pp:40,fx:{approval:3},mo:{money:-50,approval:.03},st:{pens:1,biz:-.3}},
 {id:'taxcut',n:'Налоговые льготы бизнесу',pp:40,fx:{trust:4},mo:{'gdp%':.02,money:-40},st:{biz:1,workers:-.4}},
 {id:'edufree',n:'Бесплатное высшее образование',pp:50,fx:{approval:2},mo:{tech:.05,money:-60},st:{stud:1,biz:.3}},
 {id:'health',n:'Всеобщая медицина',pp:50,fx:{approval:3,stability:1},mo:{approval:.03,money:-70},st:{workers:.6,pens:1}},
 {id:'agri',n:'Защита фермеров',pp:35,fx:{food:3},mo:{food:.12,money:-40},st:{farm:1,biz:-.3}},
 {id:'antitrust',n:'Антимонопольный закон',pp:40,fx:{approval:2,trust:-2},mo:{approval:.02,'gdp%':-.005},st:{workers:.6,biz:-1}},
 {id:'freepress',n:'Свобода СМИ',pp:40,fx:{legitimacy:4,stability:-1},mo:{legitimacy:.03,coupRisk:.04},st:{stud:.8,mil:-.4}},
 {id:'censor',n:'Цензура',pp:30,fx:{stability:2,legitimacy:-3},mo:{stability:.03,legitimacy:-.05},st:{stud:-1,mil:.4}},
 {id:'veterans',n:'Льготы ветеранам',pp:35,fx:{morale:3},mo:{morale:.06,money:-40},st:{mil:1,pens:.3}},
 {id:'police',n:'Расширение полномочий полиции',pp:40,fx:{stability:3,legitimacy:-2},mo:{stability:.04,reg:-.1,legitimacy:-.03},st:{mil:.4,stud:-.7,workers:-.2}},
 {id:'foreigninv',n:'Иностранные инвестиции',pp:40,fx:{trust:3,gdp:300},mo:{'gdp%':.015,legitimacy:-.02},st:{biz:1,farm:-.3,workers:-.3}},
 {id:'land',n:'Земельная реформа',pp:45,fx:{reg:2,gdp:150},mo:{food:.1,'gdp%':.01},st:{farm:.6,workers:-.2}},
 {id:'eco',n:'Экологический закон',pp:35,fx:{approval:2},mo:{'gdp%':-.01,approval:.03},st:{stud:.8,biz:-.6,workers:-.2}},
 {id:'housing',n:'Закон о доступном жилье',pp:40,fx:{approval:2},mo:{approval:.04,money:-50},st:{workers:.8,stud:.5,biz:-.2}},
 {id:'digital',n:'Цифровизация государства',pp:40,fx:{tech:2},mo:{tech:.05,money:-35,legitimacy:.02},st:{stud:.7,biz:.5,pens:-.3}},
 {id:'anticorr',n:'Закон о борьбе с коррупцией',pp:45,fx:{legitimacy:4,dep:-3},mo:{legitimacy:.06,dep:-.1},st:{workers:.5,stud:.6,biz:-.4}},
 {id:'emergency',n:'Закон о чрезвычайном положении',pp:50,fx:{coupRisk:-6,legitimacy:-3},mo:{coupRisk:-.1,legitimacy:-.05,approval:-.04},st:{mil:.8,stud:-.8,workers:-.5}},
 {id:'fiscal',n:'Закон о фискальной дисциплине',pp:40,fx:{trust:5},mo:{trust:.06,approval:-.03},st:{biz:.6,pens:-.5,workers:-.3}},
 {id:'youth',n:'Молодёжная программа',pp:30,fx:{approval:1},mo:{tech:.03,approval:.03,money:-35},st:{stud:1}},
 {id:'freetrade',n:'Свободная торговля',pp:40,fx:{trust:2},mo:{money:50,trust:.03,food:-.06},st:{biz:.9,farm:-.7}}];
const pubSup=B=>Math.round(clamp(50+Object.keys(B.st).reduce((a,k)=>a+B.st[k]*GR[k][2]*(S.gr[k]>50?1:1.2)*55,0)));
const billChance=B=>clamp(.3+depLoyal()/100*.45+(myP()?myP().support:0)/250+(pubSup(B)-50)/400,.1,.92);
H.bill=id=>{
 if(blocked())return;const B=BILLS.find(x=>x.id===id),cur=S.bills[id];
 if(cur&&cur.st==='adopted')return;
 if(cdLeft('bill'+id)>0)return toast(cdMsg('bill'+id));
 if(S.pp<B.pp)return toast('Не хватает политической власти');
 S.pp-=B.pp;
 if(Math.random()<billChance(B)){
  S.bills[id]={st:'adopted',t:mt()};const sm=ch(B.fx);
  log(`📜 Принят закон «${B.n}». (${sm})`);say(`Парламент принял закон «${B.n}»`,'📜');grReact(`закон «${B.n}»`,B.st);toast('Закон принят: '+B.n);
 }else{
  S.bills[id]={st:'rejected',t:mt()};cdSet('bill'+id,6);ch({legitimacy:-1,dep:-2},false);
  log(`❌ Парламент отклонил закон «${B.n}».`);say(`Депутаты провалили закон «${B.n}»`,'🤨');
  grReact(`— закон «${B.n}» отклонён`,B.st,-.5);toast('Парламент отклонил закон');
 }
 save();render();
};
H.repeal=id=>{
 if(blocked())return;const B=BILLS.find(x=>x.id===id);
 if(S.pp<20)return toast('Нужно 20 политической власти');
 S.pp-=20;S.bills[id]={st:'repealed',t:mt()};cdSet('bill'+id,6);
 log(`🗑 Отменён закон «${B.n}».`);say(`Закон «${B.n}» отменили`,'🗑');grReact(`— закон «${B.n}» отменён`,B.st,-1);save();render();
};
function billsTick(){
 for(const id in S.bills){const b=S.bills[id];if(b.st!=='adopted')continue;const B=BILLS.find(x=>x.id===id);if(B)ch(B.mo,false)}
}
function billsTab(){
 const ad=BILLS.filter(B=>(S.bills[B.id]||{}).st==='adopted'),rj=BILLS.filter(B=>['rejected','repealed'].includes((S.bills[B.id]||{}).st)),av=BILLS.filter(B=>!S.bills[B.id]);
 const chips=B=>Object.keys(B.st).map(k=>`<span class="${B.st[k]>0?'fxg':'fxb'}">${GR[k][1]} ${GR[k][0]} ${B.st[k]>0?'за':'против'}</span>`).join(' · ');
 const cardB=(B,mode)=>{const b=S.bills[B.id]||{};
  return `<div class="mini ${mode==='ad'?'party-card':''}"><b>${B.n}</b><small>Сразу: ${hintFx(B.fx)||'—'}<br>Каждый месяц: ${hintFx(B.mo)}</small><small>${chips(B)}</small><small>Поддержка в народе: <b>${pubSup(B)}%</b> · шанс в парламенте: <b>${Math.round(billChance(B)*100)}%</b></small><div class="actions">${mode==='ad'?`<span class="muted">✅ Принят ${months[(b.t||0)%12]}, год ${Math.floor((b.t||0)/12)+1}</span><button class="danger" onclick="H.repeal('${B.id}')">Отменить · 20 ⭐</button>`:`<button class="primary" onclick="H.bill('${B.id}')">${cdLeft('bill'+B.id)>0?'⏳ '+cdLeft('bill'+B.id)+' мес.':(mode==='rj'?'Предложить снова · ':'Внести в парламент · ')+B.pp+' ⭐'}</button>${mode==='rj'?`<span class="muted">${b.st==='repealed'?'отменён':'отклонён'}</span>`:''}`}</div></div>`};
 return `<div class="grid">${card('✅ Принятые законы ('+ad.length+')',ad.length?`<div class="cards">${ad.map(B=>cardB(B,'ad')).join('')}</div>`:'<p class="muted">Пока ни одного.</p>')}${card('❌ Отклонённые и отменённые ('+rj.length+')',rj.length?`<div class="cards">${rj.map(B=>cardB(B,'rj')).join('')}</div>`:'<p class="muted">Нет.</p>')}${card('📜 Не вносились ('+av.length+')',`<div class="cards">${av.map(B=>cardB(B,'av')).join('')}</div>`)}</div>`;
}
function peopleTab(){
 return `<div class="grid">${card('👥 Настроение групп',`<div class="cards">${Object.keys(GR).map(k=>`<div class="mini"><b>${GR[k][1]} ${GR[k][0]}</b>${bar('Довольны',S.gr[k])}</div>`).join('')}</div><p class="muted">Группы реагируют на экономику, законы, бюджет и решения. Ниже 25% — протесты, выше 75% — легитимность растёт.</p>`)}${card('💬 Что говорят люди',feedHtml())}${card('Настроение страны',bar('Одобрение',S.approval)+bar('Стабильность',S.stability)+`<p class="muted">Недовольство регионов: ${S.regions.map(r=>`${r.name} ${Math.round(r.unrest)}%`).join(' · ')}</p>`)}</div>`;
}

/* ------------------------ РЫНОК ------------------------ */
const MK={food:['Еда','🌾',45],fuel:['Топливо','⛽',40],steel:['Сталь','🔩',40],energy:['Энергия','⚡',50],equipment:['Вооружение','🔫',35],ammo:['Боеприпасы','💥',30]};
const mkMod=g=>{let m=S.mk.m[g];if(S.war&&['fuel','ammo','equipment'].includes(g))m*=1.25;m*=1+clamp((50-S.trust)*.003,-.1,.15);const ar=S.relations.reduce((a,r)=>a+r.value,0)/S.relations.length;return m*(1-clamp(ar,-40,40)*.0008)};
const mkBuy=g=>Math.max(1,Math.round(MK[g][2]*mkMod(g)*1.15*10)/10);
const mkSell=g=>Math.max(1,Math.round(MK[g][2]*mkMod(g)*.65*(S.trust<30?.85:1)*10)/10);
H.mkBuy=(g,n)=>{
 if(blocked())return;n=Math.min(n,100-Math.floor(S[g]),S.mk.q[g]);
 if(n<=0)return toast(S.mk.q[g]<=0?'Лимит торговли на этот месяц исчерпан':'Склад полон');
 const c=Math.ceil(mkBuy(g)*n);if(S.money<c)return toast('Недостаточно средств');
 S.money-=c;S[g]=clamp(S[g]+n);S.mk.q[g]-=n;S.mk.imp+=c;save();render();toast(`Импорт: ${MK[g][0]} +${n} за ${fmt(c)} млн`);
};
H.mkSell=(g,n)=>{
 if(blocked())return;n=Math.min(n,Math.floor(S[g])-8,S.mk.q[g]);
 if(n<=0)return toast(S.mk.q[g]<=0?'Лимит торговли на этот месяц исчерпан':'Нельзя продавать последние резервы');
 const c=Math.floor(mkSell(g)*n);S.money+=c;S[g]=clamp(S[g]-n);S.mk.q[g]-=n;S.mk.exp+=c;
 if(g==='food'&&S.food<45){S.approval=clamp(S.approval-.5);say('Продаём еду за границу, пока у нас пустые полки!','😠')}
 save();render();toast(`Экспорт: ${MK[g][0]} −${n}, выручка ${fmt(c)} млн`);
};
function mkTick(){
 const M=S.mk;
 for(const g in MK){
  M.prev[g]=M.m[g];
  M.m[g]=Math.max(.55,Math.min(1.9,M.m[g]+(1-M.m[g])*.08+rnd(-.06,.06)));
  M.q[g]=30;
 }
 if(Math.random()<.09){
  const g=pick(Object.keys(MK)),up=Math.random()<.5,f=up?1.25:.78;
  M.m[g]=Math.max(.55,Math.min(1.9,M.m[g]*f));
  const t=up?`Цены на ${MK[g][0].toLowerCase()} на мировом рынке резко выросли`:`Цены на ${MK[g][0].toLowerCase()} на мировом рынке упали`;
  log(`📈 ${t}.`);say(t,up?'📈':'📉');
 }
}
function marketTab(){
 const cost=g=>mkBuy(g),tr=g=>{const d=S.mk.m[g]-(S.mk.prev[g]||S.mk.m[g]);return Math.abs(d)<.005?'▬':d>0?'<span class="fxb">▲</span>':'<span class="fxg">▼</span>'};
 return `<div class="grid">${card('🛒 Мировой рынок',`<p class="muted">Покупай нехватающие ресурсы (импорт) и продавай излишки (экспорт). Цены колеблются, растут в войну и при низком доверии рынков, дешевеют при хороших отношениях. Лимит — 30 единиц на товар в месяц. Баланс торговли: экспорт <b>${fmt(S.mk.exp)}</b> · импорт <b>${fmt(S.mk.imp)}</b> млн.</p><div class="cards">${Object.keys(MK).map(g=>`<div class="mini"><b>${MK[g][1]} ${MK[g][0]} ${tr(g)}</b>${bar('Запас',S[g])}<small>Купить: <b>${mkBuy(g)}</b> млн/ед. · Продать: <b>${mkSell(g)}</b> млн/ед.<br>Осталось лимита: ${S.mk.q[g]}</small><div class="actions"><button class="primary" onclick="H.mkBuy('${g}',5)">Купить 5</button><button class="primary" onclick="H.mkBuy('${g}',15)">Купить 15</button><button onclick="H.mkSell('${g}',5)">Продать 5</button><button onclick="H.mkSell('${g}',15)">Продать 15</button></div></div>`).join('')}</div>`)}</div>`;
}
const SEA=`<text x="330" y="500" text-anchor="middle" class="maptxt2" style="opacity:.55">ЧЁРНОЕ МОРЕ</text><text x="640" y="430" text-anchor="middle" class="maptxt2" style="opacity:.55">Азовское</text>`;

function hoiTab(){
 if(tab==='events')return evTab();if(tab==='market')return marketTab();if(tab==='bills')return billsTab();if(tab==='people')return peopleTab();if(tab==='focus')return focusTab();if(tab==='research')return researchTab();
 if(tab==='industry')return indTab();if(tab==='world')return worldTab();if(tab==='staff')return staffTab();if(tab==='advisors')return advTab();
 return null;
}
function ovExtra(){
 const f=S.focus.cur&&FOC[S.focus.cur];
 let b=`<div class="cards"><div class="mini"><b>🎯 Цель</b>${f?`${f.n} (${S.focus.p}/${f.m})`:'<span class="muted">не выбрана</span>'}</div><div class="mini"><b>🔬 Наука</b>${S.research.length?S.research.map(r=>TECH[r.id].n).join(', '):'<span class="muted">слоты свободны</span>'}</div><div class="mini"><b>⚔️ Войны</b>${S.wars.length?S.wars.map(w=>`${w.n}: ${Math.round(w.p)}%`).join('<br>'):'<span class="muted">мир</span>'}</div><div class="mini"><b>🏭 Заводы</b>гражд. ${S.civ} · воен. ${S.mil}<br>стройка ${S.build.length}/${bslotsN()}</div></div>`;
 if(S.spirits.length)b+=`<p class="muted">🌟 Национальные духи: ${S.spirits.map(s=>s.n+' ('+s.left+')').join(', ')}</p>`;
 return card('🧭 Государственный штаб',b);
}
function hoiTick(){
 S.pp=Math.min(400,S.pp+ppGain());
 S.spirits=S.spirits.filter(s=>{ch(s.fx,false);s.left--;return s.left>0});
 Object.values(S.adv).forEach(id=>{if(id&&ADV[id]&&ADV[id].fx)ch(ADV[id].fx,false)});
 const C=CONS[S.law.con]||CONS.vol,L=ECOL[S.law.eco]||ECOL.civ;
 S.approval=clamp(S.approval+(C.app||0)+(L.app||0));S.stability=clamp(S.stability+(L.stab||0));
 const cap=C.cap*(1+(DOCS[S.doc]?DOCS[S.doc].cap||0:0))*S.pop;
 if(S.army<cap)S.army+=Math.round(Math.min(cap-S.army,S.pop*.0005));
 budTick();taxTick();billsTick();grTick();mkTick();prodTick();buildTick();focusTick();researchTick();justTick();warTick();puppetTick();
 S.war=S.wars.length>0||!!S.martial;
 if(!S.war)S.threat=clamp(S.threat+(20-S.threat)*.03);
 clampFix();
 evTick();
}

/* ===== МУЛЬТИПЛЕЕР: точка входа для nations.js ===== */
const MPSTART={story:{money:26000,approval:72,stability:78,sup:[42,22,19,17]},easy:{money:22000,approval:67,stability:73,sup:[38,23,20,19]},hard:{money:14500,approval:54,stability:59,sup:[30,28,22,20]},expert:{money:10500,approval:47,stability:50,sup:[29,27,24,20]}};
function mpFresh(diff,name){S=initial();ensure();S.difficulty=DIFFICULTIES[diff]?diff:'normal';const m=MPSTART[S.difficulty];if(m){S.money=m.money;S.approval=m.approval;S.stability=m.stability;m.sup.forEach((v,i)=>S.parties[i].support=v)}if(name)S.name=String(name).slice(0,28);S.history=[];S.history.push(snap())}
window.NG={
 get S(){return S},
 begin(diff,name){NG._bak=NG._bak||S;window.__NG_MP=1;pause();mpFresh(diff,name);tab='overview';render()},
 end(){window.__NG_MP=0;pause();if(NG._bak){S=NG._bak;NG._bak=null}tab='overview';render()},
 load(o){NG._bak=NG._bak||S;window.__NG_MP=1;pause();S={...initial(),...o};ensure();tab='overview';render()},
 tick(){monthTick()},
 render,stats,toast,log,say,clamp,fmt,ch,snap,pause,
 income,expenses,myPower,warPower,months,
 setTab(t){tab=t;render()},
 getTab:()=>tab,
 sumHtml:{bar}
};

ensure();render();})();
