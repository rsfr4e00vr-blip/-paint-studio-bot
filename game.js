(()=>{'use strict';
const $=s=>document.querySelector(s), clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v)), fmt=n=>Math.round(n).toLocaleString('ru-RU'), months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const initial=()=>({name:'Украина',currencyName:'гривна',currencyCode:'UAH',fxUsd:1/47,fxBaseUsd:1/47,fxReserves:8000,keyRate:7,nominalWageIndex:100,priceIndex:100,importsUsd:0,exportsUsd:0,fxHistory:[],fxLastChange:0,fxLastGdp:200000,month:0,year:1,money:12000,debt:0,pop:37000000,gdp:200000,inflation:5,employment:94,stability:68,approval:61,legitimacy:70,food:78,fuel:65,steel:55,equipment:48,ammo:62,energy:72,tech:32,army:42000,navy:8,air:45,training:58,morale:65,threat:20,war:false,gov:'Парламентская республика',leader:'Александр Ветров',party:'Центристский союз',playerParty:'Центристский союз',campaignOver:false,difficulty:'normal',history:[],tax:15.5,taxPolicy:{income:18,vat:20,corporate:18,excise:8,property:1,customs:5,payroll:5},taxApplied:15.5,deficitMonths:0,tradeDeficitMonths:0,health:12,education:12,defense:15,society:{pensions:50,benefits:50,housing:50,transport:50,culture:50,environment:50,safety:50,sports:50,family:50,employment:50,digital:50,regions:50},industry:50,election:24,coupRisk:12,grace:12,crisis:0,cd:{},regions:[{name:'Центральный макрорегион',pop:7000000,wealth:82,loyalty:76,unrest:10,industry:70,infra:88,resource:'Услуги'},{name:'Северный макрорегион',pop:6500000,wealth:55,loyalty:64,unrest:18,industry:48,infra:55,resource:'Лес'},{name:'Восточный макрорегион',pop:8500000,wealth:48,loyalty:57,unrest:24,industry:75,infra:49,resource:'Сталь'},{name:'Южный макрорегион',pop:7500000,wealth:51,loyalty:60,unrest:20,industry:42,infra:53,resource:'Зерно'},{name:'Западный макрорегион',pop:7500000,wealth:62,loyalty:68,unrest:14,industry:58,infra:67,resource:'Энергия'}],parties:[{name:'Центристский союз',support:34,seats:38,ideology:'Центр'},{name:'Народная партия',support:25,seats:27,ideology:'Консерватизм'},{name:'Партия реформ',support:21,seats:22,ideology:'Либерализм'},{name:'Социальный альянс',support:20,seats:13,ideology:'Социал-демократия'}],relations:[{name:'Аркания',value:15,power:65},{name:'Белория',value:48,power:42},{name:'Тарвия',value:-20,power:80}],log:['Правительство сформировано. Начинается управление государством.'],documents:[],events:[],laws:[],event:null});
let S;try{S={...initial(),...JSON.parse(localStorage.getItem('novariaSave')||'{}')}}catch{S=initial()}if(!Array.isArray(S.regions)||!Array.isArray(S.parties)||!Array.isArray(S.relations))S=initial();
S.name='Украина';S.currencyName='гривна';S.currencyCode='UAH';
// Миграция старого стартового сохранения v7 с ошибочным курсом 1:1.
if(S.year===1&&S.month===0&&S.fxUsd===1&&S.fxBaseUsd===1&&(!Array.isArray(S.fxHistory)||S.fxHistory.length<=1)){
 S.fxUsd=1/47;S.fxBaseUsd=1/47;S.fxLastChange=0;
 S.fxHistory=[{year:S.year,month:S.month,rate:S.fxUsd}];
}
S.taxPolicy={income:18,vat:20,corporate:18,excise:8,property:1,customs:5,payroll:5,...(S.taxPolicy||{})};
S.deficitMonths=Number(S.deficitMonths)||0;S.tradeDeficitMonths=Number(S.tradeDeficitMonths)||0;
if(!S.playerParty)S.playerParty=S.party||'Центристский союз';
const macroRename={'Центральный регион':'Центральный макрорегион','Северный регион':'Северный макрорегион','Восточный регион':'Восточный макрорегион','Южный регион':'Южный макрорегион','Западный регион':'Западный макрорегион'};S.regions.forEach(r=>{if(macroRename[r.name])r.name=macroRename[r.name]});if(!S.difficulty)S.difficulty='normal';if(typeof S.campaignOver!=='boolean')S.campaignOver=false;if(!Array.isArray(S.history))S.history=[];if(!Array.isArray(S.log))S.log=[];if(!Array.isArray(S.documents))S.documents=[];if(!Array.isArray(S.laws))S.laws=[];if(!S.event||!Array.isArray(S.event.choices))S.event=null;if(S.history.length===0){let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap())}
let tab='overview',timer=null,running=false,selectedDifficulty=S.difficulty;
const NAV_GROUPS={
 country:{label:'Государство',items:[['overview','Обзор'],['regions','Регионы'],['people','Население'],['events','События']]},
 economy:{label:'Экономика',items:[['economy','Экономика'],['resources','Ресурсы'],['market','Рынок'],['finance','Финансы'],['currency','Валюта'],['charts','Графики']]},
 government:{label:'Правительство',items:[['society','Общество'],['politics','Политика'],['power','Власть'],['deputies','Депутаты'],['documents','Документы']]},
 world:{label:'Мир',items:[['world','Страны'],['diplomacy','Дипломатия']]},
 defense:{label:'Оборона',items:[['military','Армия'],['arms','Арсенал']]},
 system:{label:'Система',items:[['comeback','Возврат'],['settings','Настройки']]}
};
let navGroup='country';
function groupForTab(t){return Object.keys(NAV_GROUPS).find(k=>NAV_GROUPS[k].items.some(x=>x[0]===t))||'country'}
function updateNavigation(){
 navGroup=groupForTab(tab);
 document.querySelectorAll('#tabs [data-group]').forEach(b=>b.classList.toggle('active',b.dataset.group===navGroup));
 const sub=document.getElementById('subtabs');if(!sub)return;
 sub.innerHTML=NAV_GROUPS[navGroup].items.map(([key,label])=>`<button data-tab="${key}" class="${key===tab?'active':''}">${label}</button>`).join('');
}
const DIFFICULTIES={story:{label:'Сюжетная',income:1.3,expenses:.85,playerDrift:1.25,rivalPressure:.72,unrest:.7,approval:1.25,coup:.65},easy:{label:'Лёгкая',income:1.15,expenses:.93,playerDrift:1.1,rivalPressure:.88,unrest:.85,approval:1.1,coup:.85},normal:{label:'Нормальная',income:1,expenses:1,playerDrift:1,rivalPressure:1,unrest:1,approval:1,coup:1},hard:{label:'Сложная',income:.95,expenses:1.06,playerDrift:.9,rivalPressure:1.18,unrest:1.2,approval:.85,coup:1.2},expert:{label:'Эксперт',income:.86,expenses:1.14,playerDrift:.78,rivalPressure:1.42,unrest:1.45,approval:.72,coup:1.5}};
function difficulty(){return DIFFICULTIES[S.difficulty]||DIFFICULTIES.normal}
window.setDifficulty=v=>{selectedDifficulty=DIFFICULTIES[v]?v:'normal';toast('Для применения сложности начни новую кампанию')};
function save(){try{localStorage.setItem('novariaSave',JSON.stringify(S))}catch(e){toast('Не удалось сохранить: память устройства заполнена')}}
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
const UKRAINE_OUTLINE="M 374.9,69.3 L 415.0,68.4 L 423.2,57.3 L 433.1,59.7 L 466.8,55.0 L 487.5,82.7 L 479.4,92.6 L 482.1,107.8 L 508.0,110.1 L 519.6,131.4 L 518.9,141.0 L 560.2,158.2 L 585.1,150.4 L 605.2,173.3 L 624.2,172.8 L 672.1,188.7 L 672.5,203.1 L 659.3,228.7 L 666.5,255.7 L 661.3,272.0 L 629.9,275.6 L 613.1,289.2 L 612.1,310.9 L 586.2,314.9 L 564.5,330.7 L 534.1,333.3 L 506.1,351.5 L 508.0,381.9 L 523.9,393.7 L 557.1,390.8 L 550.7,408.2 L 515.1,416.7 L 471.0,445.0 L 452.9,435.1 L 460.1,412.1 L 424.6,397.8 L 430.3,388.4 L 461.4,372.1 L 452.0,360.9 L 401.5,348.6 L 399.2,330.3 L 369.1,336.3 L 357.1,363.3 L 331.9,399.4 L 317.1,391.0 L 301.9,398.9 L 287.4,389.9 L 295.6,384.6 L 310.1,352.2 L 307.8,343.4 L 314.6,339.5 L 317.8,346.3 L 337.0,347.7 L 345.6,344.1 L 339.5,339.2 L 341.8,331.9 L 330.5,319.4 L 325.8,299.0 L 313.9,291.0 L 316.3,274.4 L 301.6,261.3 L 288.2,259.4 L 264.3,244.2 L 242.6,249.0 L 234.9,256.2 L 221.2,256.2 L 213.0,267.7 L 189.0,272.4 L 177.9,279.9 L 162.8,267.9 L 121.9,262.3 L 107.8,272.8 L 105.6,259.7 L 87.5,246.4 L 93.9,226.7 L 102.9,213.9 L 110.0,216.8 L 101.6,194.8 L 131.1,154.1 L 147.2,148.4 L 150.7,134.7 L 134.4,92.0 L 149.9,90.1 L 167.7,76.8 L 192.9,75.8 L 225.7,79.6 L 262.0,91.3 L 287.6,92.3 L 299.9,99.4 L 312.0,90.9 L 320.6,102.3 L 349.9,99.9 L 362.8,104.7 L 364.9,80.1 L 374.9,69.3 Z";
const UKRAINE_ADMIN_UNITS=["Автономная Республика Крым", "Винницкая область", "Волынская область", "Днепропетровская область", "Донецкая область", "Житомирская область", "Закарпатская область", "Запорожская область", "Ивано-Франковская область", "Киевская область", "Кировоградская область", "Луганская область", "Львовская область", "Николаевская область", "Одесская область", "Полтавская область", "Ровненская область", "Сумская область", "Тернопольская область", "Харьковская область", "Херсонская область", "Хмельницкая область", "Черкасская область", "Черновицкая область", "Черниговская область", "Киев", "Севастополь"];
function mapHtml(){
 const avg=S.regions.reduce((n,r)=>n+(Number(r.loyalty)||50),0)/Math.max(1,S.regions.length);
 const fill=loyColor(avg);
 const cities=[["ЛЬВОВ", 150.8, 176.9], ["КИЕВ", 361.8, 147.2], ["ОДЕССА", 368.3, 341.3], ["ДНЕПР", 508.8, 244.3], ["ХАРЬКОВ", 547.3, 169.5], ["СИМФЕРОПОЛЬ", 478.3, 416.1]];
 const marks=cities.map(([n,x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="#e8d29a" stroke="#111819" stroke-width="2"><title>${n}</title></circle><text x="${x+7}" y="${y-7}" class="mapcity">${n}</text>`).join('');
 const units=UKRAINE_ADMIN_UNITS.map(n=>`<span class="oblast-chip">${n}</span>`).join('');
 return `<svg class="hoimap ukraine-map" viewBox="0 0 760 500" role="img" aria-label="Реальный географический контур Украины, включая Крым"><defs><pattern id="ukrgrid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#fff" stroke-opacity=".045"/></pattern><linearGradient id="ukrfill" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="#33483c"/></linearGradient></defs><rect width="760" height="500" fill="url(#ukrgrid)"/><path d="${UKRAINE_OUTLINE}" fill="url(#ukrfill)" stroke="#d0b77f" stroke-width="4" stroke-linejoin="round"/><path d="${UKRAINE_OUTLINE}" fill="none" stroke="#f0dfb8" stroke-opacity=".18" stroke-width="1.2"/>${marks}<text x="380" y="465" text-anchor="middle" class="map-caption">УКРАИНА · КРЫМ В СОСТАВЕ ТЕРРИТОРИИ</text></svg><div class="maplegend"><span><i style="background:${fill}"></i>Средняя региональная лояльность: ${Math.round(avg)}%</span><span class="muted">Географический контур упрощён для интерфейса; административные границы не имитируются.</span></div><div class="oblast-list"><b>Административные единицы · 27</b><div class="oblast-grid">${units}</div></div>`;
}
function warnBanner(){if(S.out)return'';if(S.grace>0)return `<section class="panel wide okbanner">🛡 Защитный срок: отставка не грозит ещё ${S.grace} мес.</section>`;if(S.crisis>0)return `<section class="panel wide warnbanner">⚠ Угроза отставки: ${S.crisisWhy||''}. Критическое состояние уже ${S.crisis} мес. подряд. Нужно срочно исправить ситуацию.</section>`;return''}
function bar(label,val){return `<div class="meter"><b>${label}: ${fmt(val)}%</b><div class="bar"><i style="width:${clamp(val)}%;background:${val<30?"linear-gradient(90deg,#c23b4b,#ff7b86)":val<55?"linear-gradient(90deg,#c9902f,#f5c76a)":"linear-gradient(90deg,#2aa56d,#7ee6ae)"}"></i></div></div>`}
function stats(){let a=[[IC.money,'Казна',fmt(S.money)+' млн $'],[IC.gdp,'ВВП',fmt(S.gdp/1000)+' млрд $'],[IC.pop,'Население',fmt(S.pop)],[IC.stab,'Стабильность',Math.round(S.stability)+'%'],[IC.appr,'Одобрение',Math.round(S.approval)+'%'],[IC.army,'Армия',fmt(S.army)]];$('#stats').innerHTML=a.map(x=>`<div class="stat">${x[0]}<div><small>${x[1]}</small><b>${x[2]}</b></div></div>`).join('');$('#clock').textContent=`${S.year} год · ${months[S.month]}`;$('#runstate').textContent=running?'Идёт время':'Пауза';$('#play').classList.toggle('active',running)}
function card(title,body){return `<section class="panel"><h2>${title}</h2>${body}</section>`}
function render(auto){stats();if(auto&&(down||(document.activeElement&&document.activeElement.type==='range')))return;let c='';
if(tab==='overview')c=`<div class="grid">${warnBanner()}<section class="panel wide"><h2>Территория Украины</h2>${mapHtml()}</section>${card('Государство',`<div class="cards"><div class="mini"><b>${S.name}</b>Форма правления: ${S.gov}<br>Лидер: ${S.leader}<br>Партия: ${S.party}<br>Сложность: <b>${difficulty().label}</b></div><div class="mini"><b>Состояние страны</b>${bar('Стабильность',S.stability)}${bar('Одобрение',S.approval)}${bar('Легитимность',S.legitimacy)}</div></div>`)}${card('Национальные ресурсы',`<div class="cards">${[['Продовольствие',S.food],['Топливо',S.fuel],['Сталь',S.steel],['Вооружение',S.equipment],['Боеприпасы',S.ammo],['Энергия',S.energy],['Технологии',S.tech]].map(x=>`<div class="mini"><b>${x[0]}</b>${x[1]} / 100<div class="bar"><i style="width:${clamp(x[1])}%"></i></div></div>`).join('')}</div>`)}${card('Последние события',`<div class="log">${S.log.slice(0,9).map(x=>`<div>${x}</div>`).join('')}</div>`)}${card('Быстрые действия',`<div class="actions"><button onclick="act('roads')">Построить дороги (500 млн)</button><button onclick="act('aid')">Помощь населению (300 млн)</button><button onclick="act('reform')">Государственная реформа (700 млн)</button></div>`)}</div>`;
if(tab==='society')c=renderSociety();
if(tab==='economy')c=`<div class="grid">${card('Экономика Украины',`<div class="cards"><div class="mini">Доходы в месяц <b>${fmt(income())} млн $</b></div><div class="mini">Расходы в месяц <b>${fmt(expenses())} млн $</b></div><div class="mini">Государственный долг <b>${fmt(S.debt)} млн $</b></div><div class="mini">Инфляция <b>${S.inflation.toFixed(1)}%</b></div><div class="mini">Эффективная налоговая нагрузка <b>${taxYieldRate().toFixed(1)}%</b></div><div class="mini">Месяцев бюджетного дефицита подряд <b>${S.deficitMonths||0}</b></div></div>${bar('Занятость',S.employment)}<div class="actions"><button onclick="act('industry')">Развивать промышленность · 800 млн</button><button onclick="act('trade')">Торговое соглашение · 200 млн</button><button onclick="act('debt')">Погасить 1000 млн долга</button></div>`)}${card('Налоговая политика · настрой отдельно каждый налог',`<p class="muted">Налоги влияют на доходы бюджета, цены, занятость, инвестиции и доверие бизнеса. Слишком низкие налоги при высоких расходах наращивают долг; чрезмерные ставки выдавливают бизнес в тень и тормозят рост.</p><div class="tax-grid">${taxControl('income','Налог на доходы граждан',0,40)}${taxControl('vat','НДС',0,35)}${taxControl('corporate','Налог на прибыль компаний',0,40)}${taxControl('excise','Акцизы',0,30)}${taxControl('property','Налог на имущество',0,5,.1)}${taxControl('customs','Таможенные пошлины',0,25)}${taxControl('payroll','Социальные взносы с зарплат',0,25)}</div><div class="mini tax-preview"><b>Прогноз налоговой нагрузки</b><span id="taxPreview">${taxYieldRate(taxDraft).toFixed(1)}% эффективной ставки</span><small class="muted">Доходы пересчитываются после применения бюджета.</small></div><hr><div class="row"><label>Здравоохранение <b id="healthv">${S.health}%</b></label><input type="range" min="0" max="35" value="${S.health}" oninput="setv('health',this.value,'healthv','%')"></div><div class="row"><label>Образование <b id="educationv">${S.education}%</b></label><input type="range" min="0" max="35" value="${S.education}" oninput="setv('education',this.value,'educationv','%')"></div><div class="row"><label>Оборона <b id="defensev">${S.defense}%</b></label><input type="range" min="0" max="45" value="${S.defense}" oninput="setv('defense',this.value,'defensev','%')"></div><button class="primary" onclick="saveBudget()">Применить налоговый и расходный бюджет</button>`)}</div>`;
if(tab==='military')c=`<div class="grid">${card('Вооружённые силы',`<div class="cards">${[['Сухопутные войска',fmt(S.army)+' чел.'],['Флот',S.navy+' кораблей'],['Авиация',S.air+' эскадрилий'],['Подготовка',S.training+'%'],['Боевой дух',S.morale+'%'],['Военная угроза',S.threat+'%']].map(x=>`<div class="mini">${x[0]}<b>${x[1]}</b></div>`).join('')}</div>${bar('Боевой дух',S.morale)}<div class="actions"><button onclick="act('recruit')">Набрать 5 000 солдат · 400 млн</button><button onclick="act('train')">Военные учения · 250 млн</button><button onclick="act('equipment')">Закупить вооружение · 500 млн</button><button onclick="act('mobilize')">Мобилизация</button><button class="danger" onclick="act('demobilize')">Сократить армию</button></div><p>Состояние: <b>${S.war?'ВОЙНА':'Мирное время'}</b></p><button class="${S.war?'good':'danger'}" onclick="act('war')">${S.war?'Заключить перемирие':'Объявить чрезвычайное военное положение'}</button>`)}${card('Военные запасы',`<div class="cards">${[['Топливо',S.fuel],['Сталь',S.steel],['Вооружение',S.equipment],['Боеприпасы',S.ammo]].map(x=>`<div class="mini">${x[0]} <b>${x[1]}/100</b></div>`).join('')}</div>`)}</div>`;
if(tab==='politics')c=`<div class="grid">${card('Твоя партия',`<div class="mini party-card"><b>🎖 ${S.playerParty}</b>Ты играешь за эту партию. Если она проиграет выборы и потеряет власть — кампания будет проиграна.</div><p>Правящая партия: <b>${S.party}</b></p><p>Глава правительства: <b>${S.leader}</b></p><p>До выборов: <b>${S.election} мес.</b></p><div class="actions"><button class="good" onclick="campaignAction('rally')">Провести митинг · 250 млн</button><button onclick="campaignAction('program')">Опубликовать программу · 400 млн</button><button onclick="act('speech')">Обращение к нации</button><button onclick="act('law')">Принять социальный закон</button><button class="primary" onclick="act('election')">Провести досрочные выборы</button><button onclick="act('security')">Усилить охрану правительства</button></div>${bar('Одобрение правительства',S.approval)}${bar('Риск переворота',S.coupRisk)}${S.grace>0?`<p class="muted">🛡 Защитный срок: ещё ${S.grace} мес. — отставка не грозит</p>`:S.crisis>0?`<p class="muted">⚠️ Угроза отставки (${S.crisisWhy||''}): ${S.crisis} мес. подряд. После 4-го месяца власть могут сменить</p>`:''}</div>`)}${card('Политические партии и парламент',`<div class="cards">${S.parties.slice().sort((a,b)=>b.support-a.support).map(p=>`<div class="mini ${p.name===S.playerParty?'party-card':''}"><b>${p.name} ${p.name===S.playerParty?'★ ТВОЯ ПАРТИЯ':''}</b>${p.ideology}<br>Поддержка: <b>${Math.round(p.support)}%</b> · Мест: ${p.seats}<div class="bar"><i style="width:${clamp(p.support)}%"></i></div></div>`).join('')}</div><p class="action-note">Рейтинг партий меняется каждый месяц в зависимости от экономики, стабильности и решений правительства.</p>`)}</div>`;
if(tab==='charts')c=`<div class="grid">${card('Экономика: рост и падение',`<div class="chart-wrap"><canvas id="chartEconomy"></canvas></div><p class="action-note">ВВП, казна и государственный долг. История последних 60 месяцев.</p>`)}${card('Политика и общество',`<div class="chart-wrap"><canvas id="chartPolitics"></canvas></div><p class="action-note">Поддержка твоей партии, одобрение правительства и стабильность.</p>`)}${card('Население и ресурсы',`<div class="chart-wrap"><canvas id="chartPopulation"></canvas></div><p class="action-note">Население, продовольствие и топливо.</p>`)}</div>`;
if(tab==='regions')c=`<div class="cards">${S.regions.map((r,i)=>`<div class="mini"><b>${r.name}</b>Население: ${fmt(r.pop)}<br>Благосостояние: ${r.wealth}%<br>Лояльность: ${r.loyalty}%<br>Недовольство: ${r.unrest}%<br>Промышленность: ${r.industry}%<br>Инфраструктура: ${r.infra}%<br>Ресурс: ${r.resource}<div class="actions"><button onclick="regionAct(${i},'invest')">Инвестиции · 250 млн</button><button onclick="regionAct(${i},'aid')">Помощь · 100 млн</button><button onclick="regionAct(${i},'police')">Порядок</button></div></div>`).join('')}</div>`;
if(tab==='diplomacy')c=`<div class="cards">${S.relations.map((r,i)=>`<div class="mini"><b>${r.name}</b>Отношения: ${r.value}<div class="bar"><i style="width:${clamp((r.value+100)/2)}%"></i></div>Военная мощь: ${r.power}<div class="actions"><button onclick="diplomacy(${i},'talk')">Переговоры · 100 млн</button><button onclick="diplomacy(${i},'trade')">Торговля · 250 млн</button><button onclick="diplomacy(${i},'sanction')">Санкции</button><button onclick="diplomacy(${i},'pact')">Пакт о ненападении · 350</button><button onclick="diplomacy(${i},'alliance')">Военный союз · 600</button><button onclick="diplomacy(${i},'claim')">Претензия · 180</button>${S.war?`<button class="primary" onclick="diplomacy(${i},'peace')">Предложить мир</button>`:`<button class="danger" onclick="diplomacy(${i},'war')">Объявить войну</button>`}</div></div>`).join('')}</div>`;
if(tab==='documents')c=`<div class="grid">${card('Государственные документы',`<div class="row"><input id="docname" placeholder="Название документа"><select id="doctype"><option>Указ</option><option>Закон</option><option>Бюджет</option><option>Военный приказ</option><option>Дипломатическая нота</option></select></div><textarea id="doctext" rows="5" style="width:100%" placeholder="Текст документа..."></textarea><button class="primary" onclick="createDoc()">Подписать и сохранить</button>`)}${card('Архив документов',S.documents.length?S.documents.map((d,i)=>`<div class="choice"><b>${d.type}: ${d.name}</b><small class="muted"> · ${d.date}</small><p>${d.text}</p><button onclick="deleteDoc(${i})">Удалить</button></div>`).join(''):'Пока документов нет.')}</div>`;
if(tab==='events')c=`<div class="grid">${card('События государства',S.event?`<p class="muted">${S.event.cat||'Государственное событие'} · ${S.event.region||'Вся страна'}</p><h3>${S.event.title}</h3><p>${S.event.text}</p><div class="actions">${(S.event.choices||[]).map((o,i)=>`<button class="${i===0?'primary':''}" onclick="resolveEvent(${i})">${o.label}</button>`).join('')}</div>`:'<p>Сейчас нет неразрешённых событий. События появляются по мере развития страны.</p>')}${card('Хроника',`<div class="log">${S.log.map(x=>`<div>${x}</div>`).join('')}</div>`)}</div>`;
if(tab==='settings')c=`<div class="grid">${card('Сложность кампании',`<p>Выбери, насколько трудно удерживать власть и развивать государство. Сложность применяется только к <b>новой кампании</b>, текущую игру она не меняет.</p><div class="row"><label for="difficultySelect">Уровень сложности</label><select id="difficultySelect" onchange="setDifficulty(this.value)"><option value="story" ${selectedDifficulty==='story'?'selected':''}>История — очень легко</option><option value="easy" ${selectedDifficulty==='easy'?'selected':''}>Лёгкая</option><option value="normal" ${selectedDifficulty==='normal'?'selected':''}>Нормальная</option><option value="hard" ${selectedDifficulty==='hard'?'selected':''}>Сложная</option><option value="expert" ${selectedDifficulty==='expert'?'selected':''}>Эксперт</option></select></div><div class="mini"><b>Текущая сложность: ${difficulty().label}</b><br>Доходы ×${difficulty().income.toFixed(2)} · расходы ×${difficulty().expenses.toFixed(2)}<br>Давление оппозиции ×${difficulty().rivalPressure.toFixed(2)}<br>Риск беспорядков ×${difficulty().unrest.toFixed(2)}</div><button class="primary" onclick="resetGame()">Начать новую кампанию на выбранной сложности</button>`)}${card('Сохранение',`<p>Прогресс автоматически сохраняется на этом устройстве.</p><button class="good" onclick="save();toast('Игра сохранена')">Сохранить сейчас</button> <button onclick="exportSave()">Экспортировать сохранение</button><div class="row"><input type="file" id="importfile" accept=".json"><button onclick="importSave()">Загрузить файл</button></div>`)}${card('Параметры страны',`<div class="row"><label>Название</label><input id="countryname" value="${S.name}"><button onclick="S.name=$('#countryname').value;save();render()">Изменить</button></div>`)}</div>`;
{let t=addonTab();if(t)c=t;else if(S.out)c=outBanner()+c}if(tab==='overview')c+=card('👥 Что говорят люди',feedHtml());$('#content').innerHTML=c;updateNavigation();drawCharts();if(S.campaignOver)showGameOver()}
function runElection(){
 if(S.campaignOver)return;
 if(!S.out){let m0=S.parties.find(p=>p.name===S.playerParty);if(m0)m0.support=clamp(m0.support+(S.approval-50)*.12,2,75)}
 let total=S.parties.reduce((a,p)=>a+Math.max(1,p.support),0);
 S.parties.forEach(p=>p.support=Math.round(p.support/total*1000)/10);
 let seats=120,used=0;S.parties.forEach((p,i)=>{p.seats=i===S.parties.length-1?seats-used:Math.floor(p.support/100*seats);used+=p.seats});
 let winner=S.parties.slice().sort((a,b)=>b.support-a.support)[0];
 S.election=36;S.party=winner.name;
 if(winner.name===S.playerParty){S.out=null;S.approval=clamp(S.approval+5);S.legitimacy=clamp(S.legitimacy+7);S.leader='Александр Ветров';log(`Выборы выиграны! Партия «${winner.name}» сохраняет власть (${winner.support}% голосов).`);toast('ПОБЕДА! Твоя партия сохранила власть.');}
 else{
   S.out=null;S.party=winner.name;S.leader='Коалиционное правительство';S.coalitionCrisis={months:0,cause:'Поражение на выборах'};
   S.approval=clamp(S.approval-4);S.legitimacy=clamp(S.legitimacy-2);S.grace=6;S.election=24;
   log(`Партия проиграла выборы, но сохранила представительство и вступила в переговоры о коалиции с «${winner.name}». Кампания продолжается.`);
   toast('Выборы проиграны, но кампания продолжается: попробуй создать коалицию.');
 }
 save();render();
}
function showGameOver(){if(document.getElementById('gameover'))return;let w=S.parties.slice().sort((a,b)=>b.support-a.support)[0];let d=document.createElement('div');d.id='gameover';d.className='gameover';d.innerHTML=`<div class="gameover-box"><h2>ПОРАЖЕНИЕ</h2><p>Твоя партия <b>${S.playerParty}</b> проиграла выборы и потеряла власть.</p><p>Победитель: <b>${S.party}</b><br>Теперь правительство сформирует другая партия.</p><button class="primary" onclick="resetGame()">Начать новую кампанию</button></div>`;document.body.appendChild(d)}
const TAX_WEIGHTS={income:.26,vat:.30,corporate:.20,excise:.08,property:.06,customs:.05,payroll:.05};
function taxYieldRate(policy=S.taxPolicy){return Object.keys(TAX_WEIGHTS).reduce((sum,k)=>sum+(Number(policy?.[k])||0)*TAX_WEIGHTS[k],0)}
let taxDraft={...S.taxPolicy};
window.setTax=function(k,v){if(!(k in TAX_WEIGHTS))return;taxDraft[k]=Number(v);const out=document.getElementById('taxPreview');if(out)out.textContent=taxYieldRate(taxDraft).toFixed(1)+'% эффективной ставки';const n=document.getElementById('tax-'+k+'-value');if(n)n.textContent=Number(v).toFixed(k==='property'?1:0)+'%'};
const SOCIETY_POLICIES=[
 ['pensions','Пенсии и поддержка пожилых','Пенсионные выплаты, уровень жизни пожилых и нагрузка на бюджет.'],
 ['benefits','Социальная помощь','Поддержка малообеспеченных семей; снижает бедность, но требует расходов.'],
 ['housing','Жилищная политика','Доступность жилья, строительство и миграционная привлекательность.'],
 ['transport','Общественный транспорт','Мобильность работников, доступность рабочих мест и производительность.'],
 ['culture','Культура и наследие','Культурные учреждения, общественная сплочённость и привлекательность регионов.'],
 ['environment','Экология и чистая вода','Здоровье населения, качество среды и долгосрочные издержки загрязнения.'],
 ['safety','Гражданская безопасность','Полиция, спасательные службы и доверие к общественному порядку.'],
 ['sports','Массовый спорт','Профилактика заболеваний, здоровье и качество жизни.'],
 ['family','Поддержка семей и детей','Детские сады, пособия и условия для рождения и воспитания детей.'],
 ['employment','Политика занятости','Переобучение, службы занятости и возвращение людей на рынок труда.'],
 ['digital','Цифровые госуслуги','Доступность услуг, снижение бюрократии и рост производительности.'],
 ['regions','Развитие регионов','Выравнивание инфраструктуры, региональные рабочие места и лояльность.']
];
if(!S.society||typeof S.society!=='object')S.society={};
for(const [k] of SOCIETY_POLICIES)S.society[k]=clamp(Number(S.society[k]??50),0,100);
let societyDraft={...S.society};
window.setSociety=(k,v)=>{if(!(k in societyDraft))return;societyDraft[k]=Number(v);const n=document.getElementById('soc-'+k+'-v');if(n)n.textContent=String(Math.round(Number(v)))+' / 100';const c=document.getElementById('societyCost');if(c)c.textContent=fmt(societyMonthlyCost(societyDraft))+' млн $ в месяц';};
function societyMonthlyCost(policy=S.society){return SOCIETY_POLICIES.reduce((sum,[k])=>sum+Math.round(S.gdp*.000018*(Number(policy[k]??50)/50)),0)}
function renderSociety(){const sliders=SOCIETY_POLICIES.map(([k,label,desc])=>`<div class="tax-control"><label>${label} <b id="soc-${k}-v">${Math.round(societyDraft[k]??50)} / 100</b></label><input type="range" min="0" max="100" step="1" value="${societyDraft[k]??50}" oninput="setSociety('${k}',this.value)"><small class="muted">${desc}</small></div>`).join('');return `<div class="grid">${card('Социальная политика Украины',`<p class="muted">Управляй не только медициной и школами. Каждый показатель меняет расходы бюджета и конкретные показатели страны. 50 — нейтральный уровень; слишком высокие расходы без доходов увеличивают дефицит и долг.</p><div class="cards"><div class="mini">Общественное одобрение <b>${Math.round(S.approval)}%</b></div><div class="mini">Стабильность <b>${Math.round(S.stability)}%</b></div><div class="mini">Занятость <b>${Math.round(S.employment)}%</b></div><div class="mini">Технологии <b>${Math.round(S.tech)} / 100</b></div><div class="mini">Средняя лояльность регионов <b>${Math.round(S.regions.reduce((a,r)=>a+r.loyalty,0)/Math.max(1,S.regions.length))}%</b></div><div class="mini">Новые социальные расходы <b id="societyCost">${fmt(societyMonthlyCost())} млн $ в месяц</b></div></div><div class="tax-grid">${sliders}</div><button class="primary" onclick="saveSociety()">Утвердить социальную политику</button>`)}${card('Что меняет социальная политика',`<ul><li>Пенсии и пособия влияют на бедность, одобрение и стабильность.</li><li>Жильё и семейная поддержка влияют на привлекательность страны и динамику населения.</li><li>Транспорт и занятость влияют на рабочие места и ВВП.</li><li>Культура, спорт и экология влияют на здоровье и качество жизни.</li><li>Безопасность влияет на беспорядки и стабильность.</li><li>Цифровизация повышает технологии и эффективность экономики.</li><li>Развитие регионов влияет на инфраструктуру и лояльность областей.</li></ul><p class="muted">Результаты накапливаются постепенно каждый игровой месяц. Снижение финансирования тоже имеет последствия.</p>`)}</div>`}
window.saveSociety=()=>{S.society={...societyDraft};log('Правительство утвердило новую программу социальной политики.');save();render();toast('Социальная политика утверждена')};
function taxControl(k,label,min,max,step=1){const v=Number(taxDraft[k]??S.taxPolicy[k]??0);return `<div class="tax-control"><label>${label} <b id="tax-${k}-value">${v.toFixed(step<1?1:0)}%</b></label><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" oninput="setTax('${k}',this.value)"></div>`}
S.tax=taxYieldRate();if(!Number.isFinite(S.taxApplied))S.taxApplied=S.tax;
function income(){let rate=taxYieldRate();return Math.max(0,Math.round(S.gdp*rate/100/12*1.02*difficulty().income))}function expenses(){let upkeep=S.war?1.22:1;return Math.round((1+Math.min(1.2,(S.year-1)*.012))*(240+S.gdp*.0045+S.pop/100000*S.health*.03+S.pop/100000*S.education*.026+S.defense*24+S.army/1000*1.8+societyMonthlyCost())*difficulty().expenses*upkeep)}
window.setv=(k,v,id,s)=>{$('#'+id).textContent=v+s;S[k]=+v};
window.campaignAction=(a)=>{if(S.campaignOver)return;let p=S.parties.find(x=>x.name===S.playerParty);if(!p)return;if(cdLeft(a)>0)return toast(cdMsg(a));let cost=a==='rally'?250:400;if(S.money<cost){toast('В казне недостаточно средств');return}S.money-=cost;cdSet(a,CDM[a]);p.support=clamp(p.support+(a==='rally'?3.5:5)*difficulty().playerDrift);S.approval=clamp(S.approval+(a==='rally'?1:2)*difficulty().approval);log(a==='rally'?'Партия провела предвыборный митинг.':'Партия опубликовала новую программу.');save();render();toast('Популярность твоей партии выросла')};
window.saveBudget=()=>{const before=Number(S.taxApplied)||taxYieldRate();S.taxPolicy={...taxDraft};S.tax=taxYieldRate();S.taxApplied=S.tax;if(S.tax-before>3){S.approval=clamp(S.approval-1.2);S.trust=clamp((S.trust||55)-1)}else if(before-S.tax>3){S.approval=clamp(S.approval+1);if(S.deficitMonths>1)S.trust=clamp((S.trust||55)-1)}log(`Утверждён бюджет Украины. Эффективная налоговая ставка: ${S.tax.toFixed(1)}%.`);save();render();toast('Налоговая политика применена')};
window.act=(a)=>{if(blocked())return;if(S.campaignOver){toast('Кампания завершена. Начни новую игру.');return}if(cdLeft(a)>0)return toast(cdMsg(a));let cost=0,msg='';switch(a){
case'roads':cost=500;S.regions.forEach(r=>r.infra=clamp(r.infra+5));S.gdp+=150;msg='Начато строительство дорог.';break;
case'aid':cost=300;S.approval=clamp(S.approval+5);S.stability=clamp(S.stability+3);msg='Населению выделена помощь.';break;
case'reform':cost=700;S.tech=clamp(S.tech+5);S.employment=clamp(S.employment+2);S.approval=clamp(S.approval-1);msg='Проведена государственная реформа.';break;
case'industry':cost=800;S.gdp+=700;S.employment=clamp(S.employment+3);S.steel=clamp(S.steel+5);msg='Промышленность получила инвестиции.';break;
case'trade':cost=200;S.money+=260;S.gdp+=120;msg='Подписано торговое соглашение.';break;
case'debt':if(S.debt<=0){toast('Государственного долга нет');return}S.money-=Math.min(1000,S.money);S.debt=Math.max(0,S.debt-1000);msg='Часть долга погашена.';break;
case'recruit':cost=400;S.army+=5000;S.morale=clamp(S.morale-2);msg='Набрано 5 000 военнослужащих.';break;
case'train':cost=250;S.training=clamp(S.training+8);S.morale=clamp(S.morale+3);msg='Проведены военные учения.';break;
case'equipment':cost=500;S.equipment=clamp(S.equipment+15);S.ammo=clamp(S.ammo+8);msg='Закуплено вооружение.';break;
case'mobilize':S.army+=15000;S.stability=clamp(S.stability-4);S.money-=250;msg='Объявлена мобилизация.';break;
case'demobilize':S.army=Math.max(10000,S.army-10000);S.stability=clamp(S.stability+2);msg='Часть войск демобилизована.';break;
case'war':S.war=!S.war;S.threat=clamp(S.threat+(S.war?20:-15));msg=S.war?'Введено военное положение.':'Военное положение отменено.';break;
case'speech':S.approval=clamp(S.approval+3);S.legitimacy=clamp(S.legitimacy+2);msg='Глава государства выступил с обращением.';break;
case'law':S.approval=clamp(S.approval+2);S.stability=clamp(S.stability+1);S.laws.push('Социальный закон');msg='Принят социальный закон.';break;
case'election':runElection();return;
case'security':cost=350;S.coupRisk=clamp(S.coupRisk-12);msg='Безопасность государственных учреждений усилена.';break;
}if(S.money<cost){toast('Недостаточно средств!');return}S.money-=cost;if(CDM[a])cdSet(a,CDM[a]);log(msg);save();render();toast(msg)};
window.regionAct=(i,a)=>{if(blocked())return;let r=S.regions[i],cost=a==='invest'?250:a==='aid'?100:0;if(S.money<cost){toast('Недостаточно средств');return}S.money-=cost;if(a==='invest'){r.wealth=clamp(r.wealth+7);r.infra=clamp(r.infra+5);r.industry=clamp(r.industry+4)}if(a==='aid'){r.loyalty=clamp(r.loyalty+8);r.unrest=clamp(r.unrest-7)}if(a==='police'){r.unrest=clamp(r.unrest-10);S.stability=clamp(S.stability+1)}log(`Приняты меры в регионе ${r.name}.`);save();render()};
window.diplomacy=(i,a)=>{if(blocked())return;let r=S.relations[i];if(!r)return;let cost={talk:100,trade:250,pact:350,alliance:600,claim:180}[a]||0;if(S.money<cost)return toast('Недостаточно средств');if(a==='war'&&(r.value>-20||S.war))return toast('Для объявления войны нужны напряжённые отношения и мирное время');if(a==='peace'&&!S.war)return toast('Сейчас страна не находится в войне');if(a==='alliance'&&r.value<35)return toast('Для союза нужны отношения не ниже +35');S.money-=cost;if(a==='talk')r.value=clamp(r.value+8,-100,100);if(a==='trade'){r.value=clamp(r.value+12,-100,100);S.money+=150;S.gdp+=40}if(a==='sanction')r.value=clamp(r.value-15,-100,100);if(a==='pact'){r.value=clamp(r.value+8,-100,100);r.pact=12;log(`Пакт о ненападении с ${r.name} действует 12 месяцев`)}if(a==='alliance'){r.value=clamp(r.value+10,-100,100);r.ally=true;log(`${r.name} заключила с нами военный союз`)}if(a==='claim'){r.claim=12;r.value=clamp(r.value-8,-100,100);S.threat=clamp(S.threat+2);log(`Выдвинута территориальная претензия к ${r.name}`)}if(a==='war'){S.war=true;S.enemy=r.name;S.warMonths=0;S.warExhaustion=0;r.value=clamp(r.value-25,-100,100);S.threat=clamp(S.threat+12);log(`⚔️ Объявлена война государству ${r.name}`);say(`Началась война с ${r.name}`,'⚔️')}if(a==='peace'){S.war=false;S.warExhaustion=Math.max(0,(S.warExhaustion||0)-20);r.value=clamp(r.value-8,-100,100);S.morale=clamp(S.morale+3);log(`Заключён мир с ${S.enemy||r.name}`);S.enemy=null}log(`Дипломатические отношения: ${r.name}.`);save();render()};
window.createDoc=()=>{let n=$('#docname').value.trim(),t=$('#doctext').value.trim();if(!n||!t){toast('Заполните название и текст');return}S.documents.unshift({name:n,type:$('#doctype').value,text:t,date:`${months[S.month]} ${S.year}, год`});log(`Подписан документ: ${n}.`);save();render()};
window.deleteDoc=i=>{S.documents.splice(i,1);save();render()};
/* ===== ДИНАМИЧЕСКИЕ СОБЫТИЯ: 100+ вариантов и цепочки ===== */
const EVENT_POOL=[];
function addEvent(id,cat,title,text,a,ae,b,be,chain){EVENT_POOL.push({id,cat,title,text,choices:[{label:a,effects:ae},{label:b,effects:be}],chain:chain||null})}
const E=addEvent;
// Effects are compact, serializable and deliberately bounded by applyEventEffects.
E('boom','Экономика','Неожиданный экспортный бум','Соседи резко увеличили закупки наших товаров.','Расширить производство',[['money',-450],['gdp',260],['employment',1.2],['trust',2]],'Ввести экспортный сбор',[['money',380],['inflation',1],['relations',-2]]);
E('bank','Экономика','Кредитный кризис','Банки ужесточили выдачу кредитов предприятиям.','Гарантировать вклады',[['money',-650],['trust',5],['stability',1]],'Не вмешиваться',[['gdp',-220],['employment',-1.4],['trust',-4]]);
E('harvest','Экономика','Рекордный урожай','Фермеры собрали больше зерна, чем ожидалось.','Закупить излишки',[['money',-300],['food',12],['approval',2]],'Продать всё за рубеж',[['money',520],['food',-7],['relations',1]]);
E('shortage','Экономика','Дефицит комплектующих','Заводы останавливаются из-за нехватки деталей.','Субсидировать импорт',[['money',-500],['equipment',7],['employment',1]],'Перейти на местные детали',[['gdp',-180],['industry',2],['tech',1]]);
E('strike','Общество','Забастовка транспортников','Перевозчики требуют повышения зарплат.','Начать переговоры',[['money',-350],['approval',3],['stability',2]],'Жёстко подавить',[['stability',-3],['legitimacy',-5],['unrest',5]]);
E('pension','Общество','Пенсионный спор','Профсоюзы требуют индексации пенсий.','Частичная индексация',[['money',-420],['approval',3],['inflation',.4]],'Отложить реформу',[['approval',-3],['unrest',3]]);
E('school','Общество','Переполненные школы','В быстрорастущих районах не хватает мест.','Построить школы',[['money',-600],['tech',1.5],['approval',2]],'Ввести вторую смену',[['money',-100],['approval',-1],['stability',-1]]);
E('health','Общество','Сезонная эпидемия','Больницы просят срочную помощь.','Закупить лекарства',[['money',-500],['approval',2],['pop',-0.02]],'Ограничить мероприятия',[['gdp',-130],['health',1],['stability',1]]);
E('scandal','Политика','Коррупционная утечка','Журналисты опубликовали документы о сомнительных тендерах.','Независимое расследование',[['money',-250],['legitimacy',5],['trust',2]],'Защитить чиновников',[['legitimacy',-7],['approval',-4],['coupRisk',2]]);
E('coalition','Политика','Кризис коалиции','Партнёры по парламенту требуют пересмотра программы.','Пойти на компромисс',[['money',-200],['legitimacy',2],['stability',3],['party',-1]],'Распустить коалицию',[['stability',-4],['legitimacy',-3],['party',2]]);
E('debate','Политика','Громкие парламентские дебаты','Оппозиция требует публичного ответа на критику.','Открытые слушания',[['legitimacy',3],['approval',1]],'Закрыть заседание',[['stability',1],['legitimacy',-4]]);
E('election','Политика','Предвыборная гонка началась раньше срока','Партии активизировали кампании в регионах.','Провести встречи',[['money',-220],['party',2],['approval',1]],'Сосредоточиться на бюджете',[['money',180],['party',-1]]);
E('border','Дипломатия','Пограничный инцидент','Патрули соседней страны пересекли спорный участок границы.','Создать совместную комиссию',[['relations',5],['stability',1],['money',-120]],'Усилить гарнизон',[['army',1],['relations',-6],['threat',3]]);
E('embargo','Дипломатия','Торговые ограничения','Один из партнёров ввёл ограничения на наши товары.','Искать новые рынки',[['money',-300],['gdp',120],['trust',2]],'Ответные пошлины',[['money',180],['inflation',1.2],['relations',-7]]);
E('summit','Дипломатия','Региональный саммит','Соседи предлагают переговоры о безопасности.','Подписать декларацию',[['relations',6],['threat',-2],['legitimacy',1]],'Отказаться',[['relations',-3],['threat',2]]);
E('refugees','Дипломатия','Поток беженцев','На границе собрались семьи из соседнего конфликта.','Организовать приём',[['money',-420],['approval',2],['employment',-.5],['legitimacy',2]],'Закрыть переходы',[['stability',-1],['relations',-4],['legitimacy',-2]]);
E('exercise','Армия','Военные учения у границы','Сосед проводит масштабные манёвры.','Ответные учения',[['money',-350],['training',3],['threat',2],['relations',-3]],'Наблюдать дипломатически',[['relations',2],['threat',-1]]);
E('veterans','Армия','Требования ветеранов','Ветераны требуют медицинской и социальной поддержки.','Фонд помощи',[['money',-300],['morale',4],['approval',2]],'Отложить выплаты',[['morale',-5],['approval',-2]]);
E('arms','Армия','Новый оборонный контракт','Поставщик предлагает современную технику со скидкой.','Закупить ограниченную партию',[['money',-550],['equipment',8],['relations',1]],'Отказаться',[['money',40],['threat',1]]);
E('storm','Катастрофа','Разрушительный шторм','Шторм повредил дороги и электросети нескольких областей.','Экстренное восстановление',[['money',-700],['energy',3],['approval',2],['infra',2]],'Экономить бюджет',[['gdp',-260],['approval',-3],['unrest',2]]);
E('drought','Катастрофа','Засуха на юге','Урожайность падает, фермеры просят компенсации.','Компенсировать потери',[['money',-450],['food',4],['approval',2]],'Импортировать зерно',[['money',-250],['food',8],['trust',-1]]);
E('fire','Катастрофа','Крупный промышленный пожар','На заводе произошла авария, производство временно остановлено.','Восстановить завод',[['money',-520],['industry',2],['employment',.5]],'Передать объект инвесторам',[['money',150],['industry',-2],['legitimacy',-1]]);
E('quake','Катастрофа','Землетрясение','Несколько населённых пунктов нуждаются в срочной помощи.','Мобилизовать спасателей',[['money',-650],['stability',2],['approval',3]],'Просить международную помощь',[['money',-120],['relations',4],['legitimacy',1]]);
E('discovery','Наука','Прорыв в материаловедении','Университет разработал более эффективный сплав.','Внедрить на заводах',[['money',-480],['tech',4],['industry',2]],'Продать лицензию',[['money',350],['tech',1],['relations',1]]);
E('startup','Наука','Технологический стартап','Команда инженеров просит государственный грант.','Выдать грант',[['money',-300],['tech',2],['employment',.5]],'Оставить рынку',[['trust',1],['tech',.2]]);
E('power','Энергетика','Авария на электростанции','Часть энергосистемы работает с перебоями.','Срочный ремонт',[['money',-500],['energy',8],['gdp',80]],'Ввести веерные отключения',[['energy',-5],['gdp',-220],['approval',-2]]);
E('gas','Энергетика','Скачок цен на топливо','Мировые цены на энергоносители резко выросли.','Субсидировать тарифы',[['money',-450],['approval',2],['debt',180]],'Переложить расходы в тарифы',[['money',220],['inflation',2],['approval',-3]]);
E('culture','Культура','Национальный фестиваль','Регионы предлагают провести большой культурный форум.','Поддержать фестиваль',[['money',-180],['approval',2],['stability',1]],'Отдать инициативу частникам',[['money',60],['approval',.5]]);
E('sports','Культура','Победа сборной','Национальная команда выиграла важный турнир.','Наградить спортсменов',[['money',-120],['approval',3],['morale',1]],'Ограничиться поздравлением',[['approval',1]]);
E('crime','Безопасность','Серия громких преступлений','Жители требуют усилить безопасность на улицах.','Улучшить работу полиции',[['money',-300],['stability',3],['legitimacy',1]],'Расширить полномочия силовиков',[['stability',2],['legitimacy',-3],['coupRisk',1]]);
E('cyber','Безопасность','Кибератака на госуслуги','Сервисы недоступны, данные части ведомств повреждены.','Восстановить инфраструктуру',[['money',-380],['tech',1],['trust',2]],'Скрыть масштаб ущерба',[['trust',-5],['legitimacy',-2]]);
E('protest','Общество','Региональный митинг','Жители требуют ремонта дорог и прозрачного бюджета.','Направить делегацию',[['money',-160],['unrest',-3],['loyalty',2]],'Игнорировать требования',[['unrest',4],['loyalty',-3],['stability',-2]]);
E('migration','Общество','Отток молодых специалистов','Выпускники уезжают искать работу за рубежом.','Программа первого рабочего места',[['money',-350],['employment',1.5],['tech',1]],'Снизить налоги бизнесу',[['money',-180],['trust',2],['approval',1]]);
E('housing','Общество','Жилищный кризис','Стоимость аренды быстро растёт в крупных городах.','Строить доступное жильё',[['money',-550],['approval',3],['gdp',100]],'Адресные пособия',[['money',-260],['approval',2],['inflation',.5]]);
E('trade','Экономика','Новый торговый коридор','Соседние страны предлагают совместную логистику.','Инвестировать в инфраструктуру',[['money',-500],['gdp',250],['relations',4]],'Взимать транзитные сборы',[['money',280],['relations',-2]]);
E('tax','Экономика','Бизнес просит налоговую предсказуемость','Предприниматели предлагают заключить налоговый пакт.','Заморозить правила на год',[['trust',4],['gdp',120],['money',-100]],'Повысить сборы сейчас',[['money',300],['employment',-1],['trust',-3]]);
E('debt','Экономика','Кредиторы предлагают реструктуризацию','Можно снизить выплаты, но придётся принять бюджетные условия.','Согласиться',[['debt',-650],['trust',3],['health',-1]],'Отказаться',[['trust',-4],['inflation',1]]);
E('media','Политика','Независимое расследование','Редакция раскрыла конфликт интересов в министерстве.','Опубликовать аудит',[['legitimacy',4],['trust',2],['approval',1]],'Ограничить доступ к документам',[['legitimacy',-5],['trust',-2]]);
E('minister','Политика','Министр подал в отставку','Ведомство оказалось в центре затяжного конфликта.','Назначить технократа',[['money',-100],['trust',2],['stability',2]],'Оставить министра',[['stability',-2],['approval',-2]]);
E('lobby','Политика','Лоббисты требуют льгот','Крупные компании обещают инвестиции в обмен на послабления.','Потребовать гарантии рабочих мест',[['gdp',180],['employment',1],['trust',1]],'Выдать льготы без условий',[['money',-250],['gdp',100],['legitimacy',-3]]);
E('alliance','Дипломатия','Предложение о пакте взаимопомощи','Дружественная страна предлагает оборонное соглашение.','Подписать пакт',[['relations',8],['threat',-3],['money',-120]],'Сохранить нейтралитет',[['relations',-2],['threat',1]]);
E('spycase','Дипломатия','Шпионский скандал','Задержан подозреваемый в промышленном шпионаже.','Обменять задержанного',[['relations',3],['trust',1]],'Выслать дипломатов',[['relations',-8],['threat',2]]);
E('mobilize','Армия','Военные требуют резервистов','Штаб считает, что подготовка армии недостаточна.','Частичная подготовка резерва',[['money',-250],['training',3],['stability',-1]],'Не менять численность армии',[['morale',-2],['threat',1]]);
E('desertion','Армия','Проблемы с дисциплиной','В нескольких частях участились самовольные отлучки.','Улучшить снабжение',[['money',-280],['morale',4],['ammo',2]],'Ужесточить наказания',[['morale',-3],['stability',1],['legitimacy',-1]]);
E('peace','Война','Посредник предлагает перемирие','Нейтральная страна готова организовать переговоры.','Согласиться на переговоры',[['threat',-8],['morale',2],['relations',4]],'Продолжить наступление',[['threat',3],['ammo',-4],['morale',-2]]);
E('blockade','Война','Морская блокада','Противник пытается перекрыть важные торговые пути.','Искать обходные маршруты',[['money',-300],['fuel',-2],['threat',-2]],'Пробивать блокаду',[['ammo',-5],['threat',4],['relations',-3]]);
E('occupation','Война','Спор об управлении занятым районом','Военные предлагают временную администрацию.','Гражданская администрация',[['money',-220],['legitimacy',3],['unrest',-2]],'Военное управление',[['stability',2],['legitimacy',-4],['unrest',3]]);
E('inflation','Экономика','Инфляционные ожидания растут','Поставщики заранее повышают цены из-за опасений кризиса.','Сократить дефицит бюджета',[['money',-180],['inflation',-1.5],['approval',-1]],'Поддержать спрос',[['gdp',100],['inflation',1.5],['debt',220]]);
E('industry','Экономика','Старый завод просит модернизацию','Предприятие обеспечивает регион рабочими местами, но устарело.','Модернизировать',[['money',-420],['industry',3],['tech',1]],'Закрыть нерентабельный цех',[['money',100],['employment',-1.5],['trust',1]]);
E('water','Катастрофа','Загрязнение водохранилища','Экологи обнаружили опасные вещества в источнике воды.','Очистить водоём',[['money',-380],['health',1],['approval',2]],'Временно ограничить доступ',[['money',-100],['approval',-2],['stability',-1]]);
E('harbor','Экономика','Забастовка в порту','Экспортные грузы задерживаются на несколько недель.','Компромисс с профсоюзом',[['money',-180],['gdp',120],['stability',1]],'Привлечь временных работников',[['gdp',-100],['unrest',2],['legitimacy',-1]]);
E('research','Наука','Международный научный консорциум','Университеты предлагают совместную исследовательскую программу.','Вступить',[['money',-240],['tech',2.5],['relations',3]],'Развивать собственный проект',[['money',-100],['tech',1],['trust',1]]);
E('currency','Экономика','Спекулятивное давление на валюту','Рынок тестирует способность центробанка удерживать курс.','Продать резервы',[['money',-400],['trust',4],['inflation',-.7]],'Повысить ставку',[['gdp',-120],['inflation',-1],['employment',-.5]]);
E('fxflight','Валюта','Отток иностранных инвестиций','Крупные инвесторы выводят капитал из страны. На валютном рынке растёт спрос на доллары, а гривна испытывает давление.','Повысить ставку и удержать инвесторов',[['keyRate',1.5],['trust',3],['gdp',-140],['money',-180]],'Не ограничивать рынок',[['trust',-7],['inflation',1.2],['debt',180]]);
E('fxenergy','Валюта','Импортный энергетический шок','Мировые цены на нефть и газ резко выросли. Импорт дорожает, предприятия предупреждают о повышении цен.','Временно субсидировать энергетику',[['money',-520],['debt',220],['approval',2],['trust',1]],'Переложить рост затрат в цены',[['inflation',2.1],['approval',-4],['trust',-2]]);
E('fxreserves','Валюта','Сокращение валютных резервов','Центральный банк предупреждает: резервов становится меньше, а возможности поддерживать курс ограничены.','Сократить интервенции',[['trust',-1],['inflation',.5],['reserves',120]],'Потратить резервы на стабилизацию',[['reserves',-650],['trust',3],['money',-250]]);
E('fxexport','Валюта','Падение экспортной выручки','Внешний спрос на ключевые товары ослаб. В страну поступает меньше иностранной валюты, импортёры уже ощущают нехватку ликвидности.','Поддержать экспортёров',[['money',-350],['gdp',110],['trust',2],['employment',.5]],'Сократить импорт административно',[['gdp',-170],['inflation',.8],['trust',-3]]);
E('fxconfidence','Валюта','Кризис доверия к национальной валюте','После серии противоречивых заявлений домохозяйства и компании переводят часть сбережений в иностранную валюту.','Опубликовать прозрачный план центробанка',[['trust',5],['money',-180],['inflation',-.5]],'Ввести жёсткие ограничения',[['trust',-8],['relations',-3],['stability',-2]]);
E('budgetspiral','Экономика','Бюджетная спираль дефицита','Несколько месяцев подряд расходы превышают доходы. Кредиторы требуют план сокращения дефицита, а инвесторы сомневаются в устойчивости долга.','Сократить часть расходов и защитить адресную помощь',[['debt',-180],['gdp',-90],['approval',-2],['trust',3]],'Закрыть дыру новыми займами',[['debt',650],['inflation',.8],['trust',-5],['fx',-3]]);
E('taxoverload','Экономика','Налоговая перегрузка бизнеса','Высокие налоги на труд, прибыль и потребление сокращают инвестиции. Малые компании откладывают расширение, часть оборота уходит в тень.','Снизить НДС и взносы, расширив налоговую базу',[['taxVat',-2],['taxPayroll',-2],['gdp',100],['employment',1],['trust',3]],'Сохранить ставки и усилить сборы',[['money',280],['employment',-2],['trust',-5],['inflation',.5]]);
E('taxcutgap','Экономика','Необеспеченное снижение налогов','Налоги снизили, но расходы и госпрограммы не пересмотрели. Бюджетная дыра растёт быстрее ожидаемого.','Вернуть часть ставок и пересмотреть расходы',[['taxIncome',2],['taxCorporate',1],['debt',-120],['trust',2]],'Продолжить занимать',[['debt',700],['trust',-5],['fx',-4],['inflation',.7]]);
E('cheapcredit','Валюта','Слишком дешёвые деньги','Ключевая ставка долго остаётся низкой при высокой инфляции. Спрос на импорт растёт, а доверие к гривне снижается.','Постепенно поднять ставку',[['keyRate',2],['inflation',-1],['trust',3],['gdp',-80]],'Сохранить дешёвые кредиты',[['inflation',2],['trust',-5],['fx',-6],['debt',180]]);
E('tightcredit','Экономика','Кредитное удушение предприятий','Слишком высокая ключевая ставка делает кредиты недоступными. Компании замораживают инвестиции и сокращают найм.','Снизить ставку на несколько пунктов',[['keyRate',-2],['gdp',160],['employment',1],['inflation',.5]],'Держать ставку высокой',[['gdp',-240],['employment',-2],['approval',-2]]);
E('reservepanic','Валюта','Резервы на исходе','Центробанк слишком долго тратил валютные резервы на поддержку курса. Рынок проверяет, хватит ли средств для критического импорта.','Прекратить широкие интервенции и сохранить резервы',[['trust',-1],['inflation',.6],['reserves',100]],'Продолжить защищать курс любой ценой',[['reserves',-900],['trust',-4],['fx',-7],['debt',250]]);
E('importdependence','Валюта','Импортная зависимость стала уязвимостью','Страна слишком сильно зависит от импортных энергоносителей и комплектующих. Удорожание внешних поставок давит на гривну и цены.','Диверсифицировать поставки и поддержать местных производителей',[['money',-420],['gdp',90],['trust',2],['inflation',-.3]],'Сохранить прежнюю модель закупок',[['inflation',1.5],['trust',-3],['fx',-4],['employment',-1]]);
E('debtgrade','Экономика','Понижение кредитного рейтинга','Из-за роста долга и непредсказуемой бюджетной политики внешние кредиторы повышают стоимость займов.','Согласовать прозрачный план долга',[['debt',-180],['trust',4],['approval',-1]],'Игнорировать предупреждение',[['debt',350],['trust',-6],['fx',-5],['inflation',.8]]);
E('resourcegap','Экономика','Остановка производства из-за дефицита сырья','Запасы важного сырья упали ниже безопасного уровня. Несколько отраслей сокращают выпуск, экспортная выручка падает.','Закупить критический минимум и запустить замещение',[['money',-350],['gdp',80],['employment',.5],['trust',1]],'Ждать восстановления рынка',[['gdp',-260],['employment',-1.5],['inflation',1],['fx',-3]]);

E('regional','Регионы','Губернатор просит больше полномочий','Регион готов взять на себя часть расходов и ответственности.','Заключить соглашение',[['loyalty',3],['stability',1],['money',-100]],'Сохранить централизацию',[['stability',1],['loyalty',-3]]);
E('corruption','Регионы','Подозрение в хищении регионального бюджета','Аудит выявил странные контракты в одной области.','Провести проверку',[['money',-120],['legitimacy',3],['loyalty',1]],'Не вмешиваться',[['legitimacy',-3],['unrest',2]]);
E('tourism','Экономика','Туристический сезон обещает рекорд','Отели и перевозчики ожидают большой поток гостей.','Продвинуть страну',[['money',-160],['gdp',170],['employment',.8]],'Повысить сборы с туристов',[['money',180],['approval',-1]]);
E('foodprice','Общество','Цены на продукты выросли','Потребители жалуются на подорожание базовой корзины.','Адресная помощь бедным',[['money',-250],['approval',2],['food',1]],'Ввести контроль цен',[['inflation',-.5],['food',-2],['trust',-1]]);
E('construction','Экономика','Частный консорциум строит скоростную дорогу','Проект ускорит перевозки, но требует государственных гарантий.','Дать гарантии',[['money',-300],['gdp',220],['infra',2]],'Отказаться от гарантий',[['trust',1],['gdp',-50]]);
E('reform','Политика','Окно для административной реформы','Общество готово поддержать упрощение бюрократии.','Провести реформу',[['money',-350],['trust',3],['gdp',140],['legitimacy',2]],'Сохранить систему',[['stability',1],['trust',-1]]);
E('bordertrade','Дипломатия','Пограничные рынки закрываются','Местные предприниматели требуют открыть переходы.','Открыть торговые пункты',[['relations',3],['gdp',100],['unrest',-1]],'Усилить досмотр',[['relations',-2],['money',80],['inflation',.3]]);
E('fuelcrisis','Энергетика','Перебои с поставками топлива','Поставщик временно сократил экспорт.','Использовать резервы',[['fuel',7],['money',-250]],'Сократить потребление',[['fuel',3],['gdp',-100],['approval',-1]]);
E('innovation','Наука','Университеты просят автономию','Исследователи считают, что бюрократия тормозит инновации.','Дать автономию',[['tech',2],['trust',2],['legitimacy',1]],'Сохранить контроль',[['stability',1],['tech',-1]]);
E('volunteers','Общество','Волонтёры организовали помощь регионам','Гражданские инициативы просят транспорт и материалы.','Поддержать инициативу',[['money',-100],['loyalty',2],['approval',2]],'Не вмешиваться',[['approval',-1]]);
E('diplomat','Дипломатия','Новый посол предлагает перезагрузку отношений','Есть шанс снизить напряжённость после серии споров.','Назначить спецпредставителя',[['money',-90],['relations',5]],'Потребовать уступок',[['relations',-3],['legitimacy',1]]);
E('fuelstrike','Энергетика','Забастовка шахтёров и энергетиков','Работники требуют безопасных условий труда.','Провести аудит безопасности',[['money',-220],['energy',2],['stability',2]],'Продолжить работу без изменений',[['energy',-3],['unrest',3]]);
E('warindustry','Война','Оборонные заводы перегружены','Армия требует больше боеприпасов, гражданские заказы задерживаются.','Перевести смены на военные заказы',[['ammo',6],['equipment',2],['gdp',-100]],'Сохранить гражданское производство',[['gdp',100],['ammo',-3]]);
E('reconstruction','Война','План восстановления после боёв','Освобождённые районы нуждаются в ремонте и разминировании.','Запустить восстановление',[['money',-450],['loyalty',3],['unrest',-3],['infra',3]],'Оставить до лучших времён',[['unrest',3],['loyalty',-2]]);
// More variety through context-specific variants: the base scenarios remain balanced, variants alter scale.
const EVENT_FLAVOURS=['в столичном округе','в северных районах','на востоке страны','в южных провинциях','в западных городах','среди малого бизнеса','в парламенте','на внешних рынках'];
EVENT_POOL.slice().forEach((ev,i)=>{let f=EVENT_FLAVOURS[i%EVENT_FLAVOURS.length];EVENT_POOL.push({...ev,id:ev.id+'_v',title:ev.title+' '+f,text:ev.text+' Ситуация развивается по местному сценарию.'});if(i<24)EVENT_POOL.push({...ev,id:ev.id+'_alt',title:ev.title+' (новый поворот)',text:ev.text+' В этот раз последствия затронут сразу несколько сфер.'})});
function eventChance(){if((S.eventCooldown||0)>0)return 0;return 1}
function contextualCrisisEvent(){const seen=S.eventSeen||[];const candidates=[];const add=(id,when,weight)=>{const e=EVENT_POOL.find(x=>x.id===id);if(e&&when&&!seen.includes(id))candidates.push({e,weight})};
 add('budgetspiral',(S.deficitMonths||0)>=3,5);
 add('taxoverload',taxYieldRate()>22.5||S.taxPolicy.vat>27||S.taxPolicy.corporate>30,4);
 add('taxcutgap',taxYieldRate()<9.5&&(S.deficitMonths||0)>=2,4);
 add('cheapcredit',S.keyRate<3.5&&S.inflation>10,5);
 add('tightcredit',S.keyRate>18&&S.employment<88,4);
 add('reservepanic',S.fxReserves<1100,5);
 add('importdependence',(S.tradeDeficitMonths||0)>=3,4);
 add('debtgrade',S.debt>Math.max(100,S.gdp)*.7&&(S.trust||55)<48,4);
 const shortage=COMMODITIES?.some(x=>(S.commodities?.[x[1]]||0)<(S.resourceConsumption?.[x[1]]||0)*1.25);
 add('resourcegap',!!shortage,3);
 if(!candidates.length)return null;const total=candidates.reduce((a,x)=>a+x.weight,0);let r=Math.random()*total;for(const x of candidates){r-=x.weight;if(r<=0)return x.e}return candidates[0].e;
}
function makeEvent(){let seen=S.eventSeen||[],pool=EVENT_POOL.filter(e=>!seen.includes(e.id));if(!pool.length)pool=EVENT_POOL;let e=contextualCrisisEvent();if(!e){const fxPool=pool.filter(x=>x.cat==='Валюта');const fxStress=Math.abs(S.fxLastChange||0)>1.2||S.inflation>12||S.fxReserves<1800||S.trust<38;if(fxStress&&fxPool.length&&Math.random()<.62)pool=fxPool;e=pick(pool)}let region=pick(S.regions||[]);let rel=pick(S.relations||[]);S.eventCooldown=4+Math.floor(Math.random()*5);return {...e,id:e.id,title:e.title,text:e.text+(region?` Затронут макрорегион: ${region.name}.`:''),region:region?region.name:null,relation:rel?rel.name:null}}
function applyEventEffects(list){for(const [k,v] of list){let n=Number(v)||0;switch(k){case'money':S.money=Math.max(0,S.money+n);break;case'debt':S.debt=Math.max(0,S.debt+n);break;case'reserves':S.fxReserves=Math.max(0,(S.fxReserves||0)+n);break;case'fx':S.fxUsd=clamp((S.fxUsd||1)*(1+n/100),FX_MIN,FX_MAX);S.fxLastChange=(S.fxLastChange||0)+n;break;case'taxIncome':case'taxVat':case'taxCorporate':case'taxExcise':case'taxProperty':case'taxCustoms':case'taxPayroll':{const tk={taxIncome:'income',taxVat:'vat',taxCorporate:'corporate',taxExcise:'excise',taxProperty:'property',taxCustoms:'customs',taxPayroll:'payroll'}[k];S.taxPolicy[tk]=clamp((S.taxPolicy[tk]||0)+n,0,tk==='property'?5:40);S.tax=taxYieldRate();break}case'keyRate':S.keyRate=clamp((S.keyRate||7)+n,0,30);break;case'gdp':S.gdp=Math.max(100,S.gdp+n);break;case'pop':S.pop=Math.max(100000,Math.round(S.pop*(1+n/100)));break;case'relations':if(S.event?.relation){let r=S.relations.find(x=>x.name===S.event.relation);if(r)r.value=clamp(r.value+n,-100,100)}else S.relations.forEach(r=>r.value=clamp(r.value+n*.35,-100,100));break;case'party':{let p=S.parties.find(x=>x.name===S.playerParty);if(p)p.support=clamp(p.support+n,2,75);break}case'unrest':S.regions.forEach(r=>r.unrest=clamp(r.unrest+n,0,100));break;case'loyalty':{let r=S.regions.find(x=>x.name===S.event?.region)||S.regions[0];if(r)r.loyalty=clamp(r.loyalty+n);break}case'infra':S.regions.forEach(r=>r.infra=clamp(r.infra+n));break;case'industry':S.industry=clamp((S.industry||50)+n);break;case'health':S.health=clamp(S.health+n,0,30);break;case'training':S.training=clamp(S.training+n);break;case'morale':S.morale=clamp(S.morale+n);break;case'ammo':case'equipment':case'food':case'fuel':case'energy':case'tech':case'employment':case'inflation':case'stability':case'approval':case'legitimacy':case'trust':case'coupRisk':case'threat':case'army':S[k]=clamp((S[k]||0)+n,k==='inflation'?0:0,k==='army'?300000:100);break;default:break}}}
function monthTick(){if(S.campaignOver)return;S.month++;if(S.month>=12){S.month=0;S.year++}let inc=income(),exp=expenses();S.deficitMonths=inc<exp?(S.deficitMonths||0)+1:Math.max(0,(S.deficitMonths||0)-1);S.money+=inc-exp;if(S.money<0){S.debt+=Math.abs(S.money);S.money=0;S.stability=clamp(S.stability-1);S.inflation=clamp(S.inflation+.6,0,100)}else{S.debt=Math.max(0,S.debt-20);S.stability=clamp(S.stability+(S.money>4000?.12:(S.money>1000?0:-.15))+(66-S.stability)*.012)}S.gdp=Math.max(100,S.gdp*(1+clamp((S.tech/30000)+(S.employment-90)/18000-(Math.max(0,S.inflation-8)/9000)-(S.debt>S.gdp*.55?.0015:0),-.012,.008))); S.pop=Math.max(100000,Math.round(S.pop*(1+clamp((S.food-45)/1800000,-.001,.0012))));S.inflation=clamp(S.inflation+(S.money<1000?.3:-.15),0,100);S.food=clamp(S.food+(Math.random()*4-2)+(S.food<55?.5:0)-(S.war?2:0));S.fuel=clamp(S.fuel+(Math.random()*3-1.5)+(S.fuel<45?.4:0)-(S.war?3:0));S.energy=clamp(S.energy+(Math.random()*2-1));S.approval=clamp(S.approval+((S.money>3000?.1:-.2)+(S.inflation<10?.05:-.12))*difficulty().approval+(58-S.approval)*.02);S.legitimacy=clamp(S.legitimacy+(S.approval>50?.06:-.1)+(68-S.legitimacy)*.01);S.coupRisk=clamp(S.coupRisk+((S.stability<35?1.2:-.15)+(S.approval<25?.6:0))*difficulty().coup);S.regions.forEach(r=>{r.unrest=clamp(r.unrest+((S.stability<40?1:-.3)+(Math.random()-.5))*difficulty().unrest);r.loyalty=clamp(r.loyalty+(S.approval>50?.2:-.2));});if(S.war){S.warMonths=(S.warMonths||0)+1;S.warExhaustion=clamp((S.warExhaustion||0)+.8+(S.food<35?1:0)+(S.money<500?1:0));S.ammo=clamp(S.ammo-1.35);S.equipment=clamp(S.equipment-.45);S.morale=clamp(S.morale-.25);S.threat=clamp(S.threat+.55);if(S.warExhaustion>65){S.approval=clamp(S.approval-.7);S.stability=clamp(S.stability-.35)}}else{S.warMonths=0;S.warExhaustion=Math.max(0,(S.warExhaustion||0)-2)}let my=S.parties.find(p=>p.name===S.playerParty);S.parties.forEach(p=>{let drift=(S.approval-50)*0.018+(S.stability-50)*0.008+(Math.random()-.5)*1.2;if(p.name===S.playerParty)p.support=clamp(p.support+drift*difficulty().playerDrift,2,75);else p.support=clamp(p.support-drift/(Math.max(1,S.parties.length-1))*difficulty().rivalPressure+(Math.random()-.5)*.7*difficulty().rivalPressure,2,75)});if(S.election>0)S.election--;if(S.election===0){runElection();if(S.campaignOver)return}if(!S.event&&Math.random()<eventChance())S.event=makeEvent();if(S.coupRisk>85&&Math.random()<.08){S.stability=clamp(S.stability-15);S.coupRisk=25;log('Попытка переворота сорвана, правительство ослаблено!')}addonTick();log(`Завершён месяц. Бюджет: ${fmt(inc)} млн доходов, ${fmt(exp)} млн расходов.`);let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap());if(S.history.length>500)S.history=S.history.filter((_,i)=>i%2==0||i==S.history.length-1);save();render(true)}
window.resolveEvent=choice=>{if(!S.event)return;let ev=S.event,opt=ev.choices&&ev.choices[choice];if(!opt)return;applyEventEffects(opt.effects||[]);Object.assign(taxDraft,S.taxPolicy);log(`Событие «${ev.title}»: ${opt.label}.`);say(`${ev.title}: ${opt.label}`,'📰');S.eventSeen=S.eventSeen||[];S.eventSeen.unshift(ev.id);S.eventSeen=S.eventSeen.slice(0,14);if(ev.chain&&Math.random()<.45){let follow=EVENT_POOL.find(x=>x.id===ev.chain);if(follow)S.event={...follow,title:follow.title+' — последствия',text:'Последствия предыдущего решения стали заметны. Выберите дальнейший курс.'}}else S.event=null;clampFix();save();render()};
window.exportSave=()=>{let blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='novaria-save.json';a.click();URL.revokeObjectURL(a.href)};
window.importSave=()=>{let f=$('#importfile').files[0];if(!f){toast('Выберите файл');return}let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.regions||!x.parties)throw 0;S={...initial(),...x};S.name='Украина';S.currencyName='гривна';S.currencyCode='UAH';S.taxPolicy={...initial().taxPolicy,...(x.taxPolicy||{})};S.tax=taxYieldRate();taxDraft={...S.taxPolicy};societyDraft={...(S.society||{})};save();render();toast('Сохранение загружено: Украина') }catch{toast('Неверный файл сохранения')}};r.readAsText(f)};
window.resetGame=()=>{ask('Начать новую кампанию? Текущий прогресс будет удалён.',()=>{stop();S=initial();taxDraft={...S.taxPolicy};societyDraft={...S.society};ensure();initializeResourceEconomy();applyResourceBalance();S.difficulty=selectedDifficulty||'normal';if(S.difficulty==='story'){S.money=26000;S.approval=72;S.stability=78;S.parties[0].support=42;S.parties[1].support=22;S.parties[2].support=19;S.parties[3].support=17}else if(S.difficulty==='easy'){S.money=22000;S.approval=67;S.stability=73;S.parties[0].support=38;S.parties[1].support=23;S.parties[2].support=20;S.parties[3].support=19}else if(S.difficulty==='hard'){S.money=14500;S.approval=54;S.stability=59;S.parties[0].support=30;S.parties[1].support=28;S.parties[2].support=22;S.parties[3].support=20}else if(S.difficulty==='expert'){S.money=10500;S.approval=47;S.stability=50;S.parties[0].support=29;S.parties[1].support=27;S.parties[2].support=24;S.parties[3].support=20}S.history=[];let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap());save();document.getElementById('gameover')?.remove();tab='overview';render();window.scrollTo(0,0);toast('Новая кампания: '+difficulty().label)})};
function play(){if(S.event){pause();showDecisionModal();toast('Сначала примите решение по событию');return}if(running||S.campaignOver){if(S.campaignOver)toast('Кампания завершена — начни новую игру');return}running=true;timer=setInterval(monthTick,+$('#speed').value);stats()}
function pause(){running=false;clearInterval(timer);timer=null;stats()}
function stop(){pause();$('#speed').value='1800';toast('Время остановлено, скорость сброшена до 1×')}
$('#play').onclick=play;$('#pause').onclick=pause;$('#stop').onclick=stop;$('#step').onclick=()=>{pause();monthTick()};$('#speed').onchange=()=>{if(running){pause();play()}};
$('#tabs').onclick=e=>{let b=e.target.closest('[data-group]');if(b){navGroup=b.dataset.group;tab=NAV_GROUPS[navGroup].items[0][0];render()}};
$('#subtabs').onclick=e=>{let b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render()}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
/* ===== ДОПОЛНЕНИЯ v2 ===== */
let down=false;document.addEventListener('pointerdown',()=>down=true,true);['pointerup','pointercancel'].forEach(e=>document.addEventListener(e,()=>setTimeout(()=>down=false,80),true));
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
function snap(){let mp=S.parties.find(p=>p.name===S.playerParty);return{year:S.year,month:S.month,gdp:S.gdp,money:S.money,debt:S.debt,approval:S.approval,stability:S.stability,partySupport:mp?mp.support:0,pop:S.pop,food:S.food,fuel:S.fuel,inflation:S.inflation,army:S.army,threat:S.threat,employment:S.employment,trust:S.trust}}
// AI-поведение привязано только к реальным государствам из списка ниже.
const C0=[['США',15,88,.25,'Крупная торговая держава'],['Канада',48,70,.18,'Дружелюбный сосед'],['Мексика',5,56,.25,'Региональный партнёр'],['Бразилия',10,64,.22,'Крупная экономика'],['Великобритания',12,75,.30,'Международный партнёр'],['Германия',20,83,.18,'Промышленная держава'],['Франция',8,78,.25,'Европейский партнёр']];

const CDM={speech:3,law:6,aid:2,trade:4,security:3,rally:2,program:4,reform:4,industry:3,roads:2};
const cdLeft=k=>((S.cd||{})[k])||0;
const cdSet=(k,n)=>{S.cd=S.cd||{};S.cd[k]=n};
const cdTick=()=>{if(!S.cd)return;for(let k in S.cd)if(S.cd[k]>0)S.cd[k]--};
const cdMsg=k=>`Подождите ещё ${cdLeft(k)} мес.`;
const DN=['Иван Корнев','Мария Лозинская','Павел Рудь','Олег Баранов','Елена Ветрова','Артём Щукин','Нина Орлова','Глеб Сомов'];
function ensure(){if(!S.deps)S.deps=DN.map((n,i)=>({n,p:S.parties[i%S.parties.length].name,l:Math.round(rnd(45,80))}));if(!S.feed)S.feed=[];if(S.fund==null)S.fund=0;if(S.trust==null)S.trust=70;
C0.forEach(c=>{let r=S.relations.find(x=>x.name===c[0]);if(!r)S.relations.push(r={name:c[0],value:c[1],power:c[2]});if(r.aggr==null){r.aggr=c[3];r.trait=c[4];r.intent='Наблюдает и ждёт'}});['cannon','bomb','petard'].forEach(k=>{if(S[k]==null)S[k]=0})}
function say(t,m){ensure();S.feed.unshift({t,m:m||'🙂',d:`${months[S.month]} ${S.year}`});S.feed=S.feed.slice(0,40)}
const blocked=()=>{if(S.campaignOver){toast('Кампания завершена. Начни новую игру.');return true}if(S.out){toast('Вы в оппозиции — вернуться к власти можно во вкладке «Возврат»');return true}return false};
const myPower=()=>S.army/1000+S.air*1.5+S.navy*2+(S.bomb||0)*15+(S.cannon||0)*.5;
function aiTick(){let me=myPower();S.relations.forEach(c=>{if(c.pact>0)c.pact--;if(c.claim>0)c.claim--;c.power=Math.max(10,Math.round(c.power+rnd(-.35,.55)));c.value=clamp(c.value+(c.value>0?.1:-.1)*c.aggr,-100,100);
if(c.value>40){c.intent='Хочет дружить и торговать';if(Math.random()<.08){S.money+=150;log(`${c.name} закупил ваши товары: +150 млн`)}}
else if(me>c.power*1.5&&c.value<30){c.intent='Боится вашей силы и держит дистанцию';c.value=clamp(c.value-.4,-100,100)}
else if(c.power>me*1.2&&c.aggr>.5&&c.value<-10&&!(c.pact>0)&&!c.ally){c.intent='Считает себя сильнее — давит на вас';S.threat=clamp(S.threat+1.5);if(!S.war&&c.value<-45&&Math.random()<.04*c.aggr){S.war=true;log(`⚔️ ${c.name} объявил вам войну!`);say(`${c.name} напал на нас!`,'😱');pause()}}
else c.intent='Наблюдает и ждёт';
if(S.war&&c.value>50&&Math.random()<.1){S.money+=300;log(`${c.name} помогает союзнику деньгами: +300 млн`)}
if(!S.war&&c.value<-60&&Math.random()<.05){S.gdp*=.995;log(`${c.name} ввёл против вас торговые санкции`)}})}
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
[()=>S.employment<62||S.threat>96,['Массовая безработица и крах заводов','Атомная паника: люди требуют смены власти','Международный ультиматум о смене власти','Угроза вторжения вынудила уйти','Державы признали правительство в изгнании']]];
const OUSTWHY=['низкое одобрение','хаос и беспорядки','угроза переворота','огромный долг','потеря легитимности','поражение в войне','гиперинфляция','голод','депутаты против вас','крах финансов','безработица или угроза вторжения'];
const RET=['Массовые митинги','Народный референдум','Коалиция с другими партиями','Всеобщая забастовка','Компромат на правительство','Досрочные выборы','Популярный новый лидер','Переговоры с депутатами','Международная поддержка','Агитация в СМИ','Сбор подписей','Обращение к армии','Судебный иск','Союз с профсоюзами','Благотворительные акции','Тайные переговоры','Реформа партии','Уличный фестиваль','Антикоррупционное расследование','Поддержка регионов','Голосование в парламенте','Обещание налоговых льгот','Союз с общинами','Голоса диаспоры','Партийный съезд'];
function ouster(c){if(S.out||S.campaignOver)return;S.crisis=0;let w=S.parties.filter(p=>p.name!==S.playerParty).sort((a,b)=>b.support-a.support)[0];S.out={cause:c,months:0};S.fund=800;S.party=w.name;S.leader='Новое правительство';log(`🚨 Вы потеряли власть: ${c}`);say('Власть сменилась!','😮');pause();toast('Вы потеряли власть! Откройте «Возврат»');tab='comeback';setTimeout(render,120)}
window.ret=i=>{if(!S.out)return;let cost=100+(i%6)*80,my=S.parties.find(p=>p.name===S.playerParty),ch=(8+(i*7)%22)/100+(my?my.support:0)/300;if(S.fund<cost)return toast('В партийной кассе не хватает денег');S.fund-=cost;if(Math.random()<ch){S.out=null;S.grace=12;S.crisis=0;S.party=S.playerParty;S.leader='Александр Ветров';S.approval=55;S.stability=50;S.legitimacy=50;S.coupRisk=20;S.election=36;S.deps.forEach(d=>d.l=55);log(`✅ Вы вернулись к власти: ${RET[i]}!`);say('Старый лидер вернулся!','🎉');toast('ВЫ ВЕРНУЛИСЬ К ВЛАСТИ!');tab='overview'}else{if(my)my.support=clamp(my.support-1);log(`Попытка не удалась: ${RET[i]}`);toast('Не вышло. Попробуйте другой путь')}save();render()};
window.buy=k=>{if(blocked())return;let c={cannon:300,bomb:900,petard:20}[k];if(S.money<c)return toast('Недостаточно средств');S.money-=c;S[k]++;log(`Закуплено: ${{cannon:'пушка',bomb:'бомба',petard:'петарда'}[k]}`);if(k=='bomb')S.relations.forEach(r=>r.value=clamp(r.value-3,-100,100));save();render()};
window.fire=k=>{if(blocked())return;if(!(S[k]>0))return toast('Сначала купите');S[k]--;let R=v=>S.relations.forEach(r=>r.value=clamp(r.value+v,-100,100));
if(k=='cannon'){if(S.war){S.threat=clamp(S.threat-6);S.morale=clamp(S.morale+2);log('Пушки накрыли позиции врага');say('Наша артиллерия работает!','💪')}else{R(-4);S.approval=clamp(S.approval-1);log('Холостой залп из пушки — соседи нервничают');say('Зачем стрелять из пушек в мирное время?','😟')}}
if(k=='bomb'){if(S.war){S.threat=clamp(S.threat-18);S.approval=clamp(S.approval-3);R(-10);log('💣 Применена бомба! Мир осуждает');say('Это ужас… нас осудит весь мир','😱')}else{R(-25);S.stability=clamp(S.stability-8);S.approval=clamp(S.approval-12);S.coupRisk=clamp(S.coupRisk+10);log('💣 Бомба в мирное время! Скандал!');say('Вы сошли с ума?! Бомба в мирное время!','🤬')}}
if(k=='petard'){S.approval=clamp(S.approval+1);if(Math.random()<.12){S.stability=clamp(S.stability-2);log('Петарда подожгла ларёк на параде');say('Горит ларёк! Ха-ха… и ужас','😂')}else{log('Петарды на празднике подняли настроение');say('Классный салют на параде!','😂')}}
save();render()};
window.dep=(i,a)=>{if(blocked())return;let d=S.deps[i];if(a=='bribe'){if(S.money<200)return toast('Недостаточно средств');S.money-=200;d.l=clamp(d.l+15);S.legitimacy=clamp(S.legitimacy-1);log(`Депутат ${d.n} получил «поддержку» 200 млн`)}if(a=='meet'){d.l=clamp(d.l+5);log(`Встреча с депутатом ${d.n}`)}if(a=='expel'){d.l=0;S.legitimacy=clamp(S.legitimacy-2);S.deps[i]=Object.assign(d,{n:pick(DN)+' мл.',l:50});log(`Депутат ${d.n} заменён`);say('Депутата выгнали — скандал!','🤨')}save();render()};
function addonTick(){ensure();cdTick();aiTick();people();if(!S.out){econTick();polTick()}S.deps.forEach(d=>{d.l=clamp(d.l+(S.approval-50)*.03+(55-d.l)*.03+rnd(-1.5,1.5));if(d.l<20&&Math.random()<.1)log(`Депутат ${d.n} интригует против правительства`)});
if(S.out){S.out.months++;let my=S.parties.find(p=>p.name===S.playerParty);S.fund+=Math.round((my?my.support:0)*2);if(S.out.months>=72){S.campaignOver=true;log('Вы не вернулись к власти за 6 лет.')}return}
if(S.grace>0)S.grace--;
let hit=OUST.findIndex(o=>o[0]());
if(hit<0){S.crisis=Math.max(0,(S.crisis||0)-1)}
else{S.crisis=(S.crisis||0)+1;S.crisisWhy=OUSTWHY[hit];
if(S.crisis===1&&S.grace<=0){log(`⚠️ Власти грозит отставка: ${OUSTWHY[hit]}. Есть несколько месяцев, чтобы исправить`);say('Власть шатается, народ ждёт перемен','😟');toast('⚠️ Угроза отставки: '+OUSTWHY[hit])}
if(S.crisis>=4&&S.grace<=0&&Math.random()<.18*difficulty().coup){S.crisis=0;ouster(pick(OUST[hit][1]))}}}
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
function addonTab(){ensure();let b=outBanner();
if(tab=='charts')return b+chartsHtml();if(tab=='finance')return b+finTab0()+card('🏭 Экономические программы',xcards(ECO2,'e'));if(tab=='power')return b+card('🗳 Власть и политика',`<p class="muted">Режим: <b>${S.gov}</b> · легитимность ${Math.round(S.legitimacy)}% · риск переворота ${Math.round(S.coupRisk)}%</p>`+xcards(POL,'p'));
if(tab=='people')return b+`<div class="grid">${card('👥 Что говорят люди',feedHtml())}${card('Настроение страны',bar('Одобрение',S.approval)+bar('Стабильность',S.stability)+`<p class="muted">Недовольство регионов: ${S.regions.map(r=>`${r.name} ${Math.round(r.unrest)}%`).join(' · ')}</p>`)}</div>`;
if(tab=='deputies')return b+card('🏛 Депутаты парламента',`<p class="muted">Средняя лояльность: <b>${Math.round(depLoyal())}%</b>. Если она упадёт ниже 20% — возможен вотум недоверия.</p><div class="cards">${S.deps.map((d,i)=>`<div class="mini"><b>${d.n}</b>${d.p}${bar('Лояльность',d.l)}<div class="actions"><button onclick="dep(${i},'meet')">Встреча</button><button onclick="dep(${i},'bribe')">Подкуп · 200</button><button class="danger" onclick="dep(${i},'expel')">Заменить</button></div></div>`).join('')}</div>`);
if(tab=='arms')return b+card('💣 Арсенал',`<div class="cards">${[['cannon','Пушка','300 млн'],['bomb','Бомба','900 млн'],['petard','Петарда','20 млн']].map(a=>`<div class="mini"><b>${a[1]}: ${S[a[0]]} шт.</b><div class="actions"><button onclick="buy('${a[0]}')">Купить · ${a[2]}</button><button class="danger" onclick="fire('${a[0]}')">Применить</button></div></div>`).join('')}</div><p class="muted">Пушка и бомба помогают на войне, но в мирное время — скандал. Бомба пугает всех соседей. Петарда — для парада 🎆</p>`);
if(tab=='comeback')return S.out?b+card('🔙 Путь к возвращению (25 способов)',`<div class="cards">${RET.map((n,i)=>{let my=S.parties.find(p=>p.name===S.playerParty);return`<div class="mini"><b>${n}</b>Цена ${100+(i%6)*80} млн · шанс ~${Math.round(((8+(i*7)%22)/100+(my?my.support:0)/300)*100)}%<div class="actions"><button class="primary" onclick="ret(${i})">Попробовать</button></div></div>`}).join('')}</div>`):card('Возврат','Вы у власти. Эта вкладка нужна, только если вас сместят.');
if(tab=='diplomacy')return b+`<div class="cards">${S.relations.map((r,i)=>`<div class="mini"><b>${r.name}</b><span class="muted">${r.trait||''}</span><br>${mood(r.value)} (${Math.round(r.value)})<div class="bar"><i style="width:${clamp((r.value+100)/2)}%"></i></div>Мощь: ${r.power}<br><small class="muted">🧠 ${r.intent||''}</small><div class="actions"><button onclick="diplomacy(${i},'talk')">Переговоры · 100</button><button onclick="diplomacy(${i},'trade')">Торговля · 250</button><button onclick="diplomacy(${i},'sanction')">Санкции</button><button onclick="diplomacy(${i},'pact')">Пакт о ненападении · 350</button><button onclick="diplomacy(${i},'alliance')">Военный союз · 600</button><button onclick="diplomacy(${i},'claim')">Претензия · 180</button>${S.war?`<button class="primary" onclick="diplomacy(${i},'peace')">Предложить мир</button>`:`<button class="danger" onclick="diplomacy(${i},'war')">Объявить войну</button>`}</div></div>`).join('')}</div>`;
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
function applySocietyEffects(){const q=S.society||{},v=k=>Number(q[k]??50),d=k=>(v(k)-50)/50;
 // Small monthly effects compound over time; policy is powerful but not an instant win button.
 S.approval=clamp(S.approval+d('pensions')*.10+d('benefits')*.14+d('housing')*.035+d('culture')*.045+d('safety')*.04+d('sports')*.035+d('family')*.045);
 S.stability=clamp(S.stability+d('benefits')*.07+d('safety')*.11+d('culture')*.04+d('regions')*.05);
 S.employment=clamp(S.employment+d('transport')*.045+d('employment')*.10+d('digital')*.035+d('housing')*.025,40,100);
 S.tech=clamp(S.tech+d('digital')*.12+d('employment')*.035+d('culture')*.02);
 S.inflation=clamp(S.inflation-d('transport')*.012-d('digital')*.012+d('housing')*.008,0,100);
 S.pop=Math.max(100000,Math.round(S.pop*(1+(d('family')*.000035)+(d('housing')*.00002))));
 if(v('environment')<35){S.health=clamp(S.health-.012);S.approval=clamp(S.approval-.025)}else if(v('environment')>70){S.health=clamp(S.health+.018)}
 if(v('sports')>65)S.health=clamp(S.health+.018);if(v('sports')<25)S.health=clamp(S.health-.015);
 S.regions.forEach(r=>{r.loyalty=clamp(r.loyalty+d('regions')*.10+d('housing')*.025);r.infra=clamp(r.infra+d('transport')*.045+d('regions')*.035);r.unrest=clamp(r.unrest-d('safety')*.08-d('benefits')*.035)});
 S.gdp=Math.max(100,S.gdp*(1+d('transport')*.00010+d('employment')*.00012+d('digital')*.00015+d('environment')*.00004));
}
function econTick(){applySocietyEffects();let t=S.trust,pr=S.printed=(S.printed||0)*.93;
const taxLoad=taxYieldRate();if(taxLoad>21){const over=taxLoad-21;S.gdp*=1-over*.00022;S.employment=clamp(S.employment-over*.012,60,100);S.approval=clamp(S.approval-over*.018);t-=over*.035}else if(taxLoad<9&&(S.deficitMonths||0)>1){t-=.35;S.trust=clamp((S.trust||55)-.25)}
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

/* ===== ГЛОБАЛЬНАЯ ЭКОНОМИКА: реальные страны, доллар, сырьё и рынок ===== */
const WORLD_COUNTRIES=[
 ['США','USD',1,88],['Канада','CAD',0.73,70],['Мексика','MXN',0.058,56],['Бразилия','BRL',0.18,64],
 ['Великобритания','GBP',1.27,75],['Германия','EUR',1.08,83],['Франция','EUR',1.08,78],['Италия','EUR',1.08,72],
 ['Польша','PLN',0.25,60],['Швейцария','CHF',1.13,77],['Норвегия','NOK',0.094,73],
 ['Швеция','SEK',0.096,69],['Турция','TRY',0.029,59],['Китай','CNY',0.14,92],['Япония','JPY',0.0067,82],
 ['Южная Корея','KRW',0.00072,76],['Индия','INR',0.012,67],['Австралия','AUD',0.65,71],['Саудовская Аравия','SAR',0.267,74],
 ['ОАЭ','AED',0.272,70],['ЮАР','ZAR',0.055,53],['Египет','EGP',0.020,47],['Индонезия','IDR',0.000064,62],
 ['Аргентина','ARS',0.0009,45],['Чили','CLP',0.00105,58],['Нидерланды','EUR',1.08,80],['Испания','EUR',1.08,71]
];
// Курсы — игровые ориентиры для симуляции, а не котировки реального валютного рынка.
const COMMODITIES=[
 ['Зерно','food',210,'т'],['Рыба','fish',145,'т'],['Мясо','meat',420,'т'],['Молоко','dairy',95,'т'],
 ['Древесина','wood',185,'м³'],['Уголь','coal',115,'т'],['Нефть','oil',78,'барр.'],['Природный газ','gas',42,'тыс. м³'],
 ['Уран','uranium',92000,'кг'],['Железная руда','iron',112,'т'],['Сталь','steel',680,'т'],['Медь','copper',9100,'т'],
 ['Алюминий','aluminum',2450,'т'],['Литий','lithium',14500,'т'],['Редкоземельные металлы','rare',52000,'т'],
 ['Удобрения','fertilizer',390,'т'],['Лекарства','medicine',18000,'партия'],['Электроника','electronics',12500,'партия'],
 ['Автомобили','cars',28000,'шт.'],['Оборудование','machinery',22000,'партия'],['Текстиль','textile',3200,'партия'],
 ['Вода','water',8,'тыс. м³'],['Электроэнергия','power',92,'МВт·ч']
];
const BASE_STOCK={food:720,fish:160,meat:130,dairy:190,wood:260,coal:310,oil:480,gas:380,uranium:18,iron:400,steel:210,copper:95,aluminum:140,lithium:22,rare:12,fertilizer:160,medicine:45,electronics:32,cars:28,machinery:35,textile:120,water:900,power:600};
if(!S.worldCountries)S.worldCountries=WORLD_COUNTRIES.map((c,i)=>({name:c[0],currency:c[1],usd:c[2],power:c[3],relation:Math.round((Math.random()*50)-20),trade:0}));
else S.worldCountries=WORLD_COUNTRIES.map((base,i)=>{const old=S.worldCountries.find(x=>x.name===base[0])||S.worldCountries[i]||{};return {name:base[0],currency:base[1],usd:base[2],power:base[3],relation:Number.isFinite(old.relation)?old.relation:Math.round(Math.random()*40-10),trade:old.trade||0,agreement:old.agreement||0,stocks:old.stocks,production:old.production,consumption:old.consumption,deposits:old.deposits}});
if(!S.commodities)S.commodities=Object.fromEntries(COMMODITIES.map(c=>[c[1],BASE_STOCK[c[1]]||100]));
if(!S.marketPrices)S.marketPrices=Object.fromEntries(COMMODITIES.map(c=>[c[1],c[2]]));
if(!S.marketHistory)S.marketHistory=[];
if(!S.marketTurn)S.marketTurn=0;
if(!S.fish)S.fish=160;if(!S.meat)S.meat=130;if(!S.dairy)S.dairy=190;
if(!S.wood)S.wood=260;if(!S.coal)S.coal=310;if(!S.oil)S.oil=480;if(!S.gas)S.gas=380;
if(!S.iron)S.iron=400;if(!S.copper)S.copper=95;if(!S.aluminum)S.aluminum=140;if(!S.lithium)S.lithium=22;
if(!S.rare)S.rare=12;if(!S.fertilizer)S.fertilizer=160;if(!S.medicine)S.medicine=45;if(!S.electronics)S.electronics=32;
if(!S.cars)S.cars=28;if(!S.machinery)S.machinery=35;if(!S.textile)S.textile=120;if(!S.water)S.water=900;if(!S.power)S.power=600;
// Обновляем старые вымышленные дипломатические названия реальными странами, сохраняя значения отношений.

/* ===== СБАЛАНСИРОВАННАЯ РЕСУРСНАЯ ЭКОНОМИКА v3 =====
   Запасы конечны: страны добывают, потребляют и экспортируют ресурсы.
   Все количества указаны в единицах товара из таблицы COMMODITIES за месяц. */
const RESOURCE_KEYS=COMMODITIES.map(x=>x[1]);
const EXTRACTIVE_KEYS=['coal','oil','gas','uranium','iron','copper','aluminum','lithium','rare'];
const PROD_BASE={food:30,fish:6,meat:5,dairy:6,wood:5,coal:5,oil:7,gas:4,uranium:.012,iron:6,steel:4,copper:.8,aluminum:.7,lithium:.025,rare:.008,fertilizer:2,medicine:.35,electronics:.15,cars:.1,machinery:.2,textile:.9,water:28,power:70};
const CONS_BASE={food:24,fish:5,meat:4,dairy:5,wood:4,coal:4,oil:9,gas:6,uranium:.018,iron:4,steel:4,copper:1.2,aluminum:1.4,lithium:.045,rare:.012,fertilizer:2,medicine:.5,electronics:.25,cars:.15,machinery:.3,textile:1.2,water:25,power:55};
const COUNTRY_BONUS={
 'США':['food','oil','gas','cars','electronics','power','machinery'], 'Канада':['wood','uranium','oil','gas','iron','power'],
 'Мексика':['oil','food','textile','cars'], 'Бразилия':['food','meat','wood','iron','water'], 'Великобритания':['gas','medicine','machinery'],
 'Германия':['steel','cars','machinery','medicine','electronics'], 'Франция':['food','power','medicine','cars'], 'Италия':['food','cars','textile','machinery'],
 'Польша':['coal','food','steel','copper'], 'Украина':['food','iron','steel','power','fertilizer'], 'Швейцария':['medicine','machinery','electronics'],
 'Норвегия':['oil','gas','fish','power'], 'Швеция':['wood','iron','steel','copper'], 'Турция':['textile','food','steel'],
 'Китай':['electronics','steel','rare','textile','cars','machinery'], 'Япония':['cars','electronics','machinery','steel'],
 'Южная Корея':['electronics','cars','steel','machinery'], 'Индия':['food','textile','medicine','steel'], 'Австралия':['iron','coal','uranium','lithium'],
 'Саудовская Аравия':['oil','gas'], 'ОАЭ':['oil','gas','aluminum'], 'ЮАР':['coal','rare','iron','platinum'],
 'Египет':['food','gas','textile'], 'Индонезия':['coal','oil','fish','wood'], 'Аргентина':['food','meat'],
 'Чили':['copper','lithium'], 'Нидерланды':['dairy','power','machinery','electronics'], 'Испания':['food','fish','textile','cars']
};
const RESOURCE_RESERVE={food:180,fish:35,meat:30,dairy:35,wood:45,coal:55,oil:75,gas:65,uranium:3,iron:65,steel:40,copper:18,aluminum:22,lithium:4,rare:2,fertilizer:25,medicine:8,electronics:6,cars:5,machinery:7,textile:20,water:150,power:100};
function resourceFmt(n){return Number(n||0).toLocaleString('ru-RU',{maximumFractionDigits:3})}
function stable01(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967295}
function countryResourceProfile(country){
 const bonus=COUNTRY_BONUS[country.name]||[];const scale=.55+(country.power||55)/100*.9;
 const stocks={},production={},consumption={},deposits={};
 COMMODITIES.forEach(x=>{const k=x[1],r=stable01(country.name+':'+k),special=bonus.includes(k)?1.9:1;
  stocks[k]=Math.max(0,Math.round((BASE_STOCK[k]||50)*scale*(.65+r*.85)*(bonus.includes(k)?1.25:1)));
  production[k]=+(((PROD_BASE[k]||1)*(.35+(country.power||55)/100*.75)*(.65+r*.8)*special).toFixed(3));
  consumption[k]=+(((CONS_BASE[k]||1)*(.55+(country.power||55)/100*.65)*(.75+(1-r)*.5)).toFixed(3));
  if(EXTRACTIVE_KEYS.includes(k))deposits[k]=Math.round(production[k]*(240+r*720));
 });return {stocks,production,consumption,deposits};
}
function initializeResourceEconomy(){
 if(!S.commodities)S.commodities=Object.fromEntries(COMMODITIES.map(c=>[c[1],BASE_STOCK[c[1]]||100]));
 if(!S.marketPrices)S.marketPrices=Object.fromEntries(COMMODITIES.map(c=>[c[1],c[2]]));
 if(!S.marketHistory)S.marketHistory=[];if(!S.marketTurn)S.marketTurn=0;
 if(!S.worldCountries)S.worldCountries=WORLD_COUNTRIES.map(c=>({name:c[0],currency:c[1],usd:c[2],power:c[3],relation:0,trade:0}));
 if(!S.resourceProduction)S.resourceProduction=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,+(PROD_BASE[k]*(.82+stable01('Ukraine:'+k)*.36)).toFixed(3)]));
 if(!S.resourceConsumption)S.resourceConsumption={...CONS_BASE};
 if(!S.resourceDeposits)S.resourceDeposits=Object.fromEntries(EXTRACTIVE_KEYS.map(k=>[k,Math.round((S.resourceProduction[k]||0)*(300+stable01('Ukraine-deposit:'+k)*600))]));
 if(!S.resourceShortages)S.resourceShortages={};
 if(!S.worldMarketPool)S.worldMarketPool=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,0]));
 S.worldCountries.forEach(c=>{if(!c.stocks||!c.production||!c.consumption){const profile=countryResourceProfile(c);c.stocks=c.stocks||profile.stocks;c.production=c.production||profile.production;c.consumption=c.consumption||profile.consumption;c.deposits=c.deposits||profile.deposits;}});
 S.worldCountries.forEach(c=>{if(!c.deposits){c.deposits=countryResourceProfile(c).deposits;}});
}
initializeResourceEconomy();
function applyResourceBalance(){
 if((S.resourceBalanceVersion||0)>=3)return;
 // Старые кампании переводятся на более реалистичные стартовые склады без обнуления прогресса.
 for(const k of RESOURCE_KEYS){
  const target=Math.max(1,Math.round((BASE_STOCK[k]||50)*.52));
  const current=Number(S.commodities[k]);
  S.commodities[k]=Math.min(Number.isFinite(current)?current:target,target);
  if(EXTRACTIVE_KEYS.includes(k))S.resourceDeposits[k]=Math.min(Number(S.resourceDeposits[k])||0,Math.max(1,Math.round((S.resourceProduction[k]||PROD_BASE[k])*360)));
 }
 S.worldCountries.forEach(c=>{for(const k of RESOURCE_KEYS){const cap=Math.max(1,Math.round((BASE_STOCK[k]||50)*1.35));c.stocks[k]=Math.min(Number(c.stocks[k])||0,cap);if(EXTRACTIVE_KEYS.includes(k))c.deposits[k]=Math.min(Number(c.deposits[k])||0,Math.max(1,Math.round((c.production[k]||PROD_BASE[k])*420)));}});
 S.resourceBalanceVersion=3;
 const oldNames={'Столица':'Центральный макрорегион','Северный край':'Северный макрорегион','Восточная область':'Восточный макрорегион','Южная провинция':'Южный макрорегион','Западный округ':'Западный макрорегион'};
 S.regions.forEach(r=>{if(oldNames[r.name])r.name=oldNames[r.name]});
 save();
}
applyResourceBalance();
function marketPoolCap(key){const worldNeed=S.worldCountries.reduce((sum,c)=>sum+(c.consumption?.[key]||0),0);return Math.max((BASE_STOCK[key]||50)*4,worldNeed*3)}
function addMarketSurplus(key,amount){if(amount<=0)return;const current=S.worldMarketPool[key]||0,cap=marketPoolCap(key);S.worldMarketPool[key]=Math.min(cap,current+amount)}
function worldExportable(key){return (S.worldMarketPool[key]||0)+S.worldCountries.reduce((sum,c)=>sum+Math.max(0,(c.stocks?.[key]||0)-Math.max(RESOURCE_RESERVE[key]||0,(c.consumption?.[key]||0)*3)),0)}
function takeWorldSupply(key,qty){let left=qty,pool=Math.min(left,S.worldMarketPool[key]||0);S.worldMarketPool[key]=(S.worldMarketPool[key]||0)-pool;left-=pool;
 const sellers=S.worldCountries.slice().sort((a,b)=>((b.stocks?.[key]||0)-(b.consumption?.[key]||0)*3)-((a.stocks?.[key]||0)-(a.consumption?.[key]||0)*3));
 for(const c of sellers){if(left<=.000001)break;let reserve=Math.max(RESOURCE_RESERVE[key]||0,(c.consumption?.[key]||0)*3),available=Math.max(0,(c.stocks?.[key]||0)-reserve),take=Math.min(left,available);c.stocks[key]-=take;left-=take;}
 return left<=.000001;
}
function resourceMonthTick(){
 let shortages=0,shortCost=0;
 for(const k of RESOURCE_KEYS){const before=S.commodities[k]||0;let prod=S.resourceProduction[k]||0;if(EXTRACTIVE_KEYS.includes(k)){let reserve=S.resourceDeposits[k]||0;prod=Math.min(prod,reserve);S.resourceDeposits[k]=Math.max(0,reserve-prod)}const need=(S.resourceConsumption[k]||0)*(S.war&&['food','oil','power','steel'].includes(k)?1.18:1);const available=before+prod,used=Math.min(available,need),deficit=Math.max(0,need-available);let nextStock=Math.max(0,available-used);const playerCap=Math.max((BASE_STOCK[k]||50)*2.5,need*12);if(nextStock>playerCap){addMarketSurplus(k,nextStock-playerCap);nextStock=playerCap}S.commodities[k]=nextStock;
  // При избытке после внутреннего потребления запасы постепенно пополняются; при дефиците возникает нехватка.
  if(deficit>0){S.resourceShortages[k]=(S.resourceShortages[k]||0)+1;shortages++;shortCost+=deficit/Math.max(1,need)}else S.resourceShortages[k]=Math.max(0,(S.resourceShortages[k]||0)-.5);
 }
 // У стран мира своя добыча, собственное потребление и конечные склады.
 S.worldCountries.forEach(c=>{for(const k of RESOURCE_KEYS){let stock=c.stocks[k]||0,prod=c.production[k]||0,need=c.consumption[k]||0;if(EXTRACTIVE_KEYS.includes(k)){let reserve=c.deposits?.[k]||0;prod=Math.min(prod,reserve);c.deposits[k]=Math.max(0,reserve-prod)}let nextStock=Math.max(0,stock+prod-need),warehouseCap=Math.max((BASE_STOCK[k]||50)*2.5,need*12);if(nextStock>warehouseCap){addMarketSurplus(k,nextStock-warehouseCap);nextStock=warehouseCap}c.stocks[k]=nextStock;}});
 if(shortages){
  const severe=k=>RESOURCE_KEYS.includes(k)&&(S.commodities[k]||0)<(S.resourceConsumption[k]||0)*.75;
  const energyDeficit=['oil','gas','coal','power'].filter(severe).length,industryDeficit=['iron','steel','copper','aluminum','electronics','machinery'].filter(severe).length,foodDeficit=['food','fish','meat','dairy','water'].filter(severe).length;
  S.gdp=Math.max(100,S.gdp*(1-Math.min(.012,.0012*shortages+.0015*energyDeficit+.001*industryDeficit)));
  S.employment=clamp(S.employment-.10*shortages-.18*industryDeficit,0,100);
  S.stability=clamp(S.stability-.14*shortages-.22*foodDeficit);
  S.approval=clamp(S.approval-.10*shortages-.28*foodDeficit);
  S.inflation=clamp(S.inflation+.07*shortages+.16*energyDeficit+.12*foodDeficit,0,100);
  if(S.month%3===0)log(`Ресурсный дефицит: нехватка ${shortages} категорий. Энергетика: ${energyDeficit}, промышленность: ${industryDeficit}, продовольствие: ${foodDeficit}.`);
 }
 // Мировой спрос и ограниченное предложение влияют на цену.
 COMMODITIES.forEach(x=>{const k=x[1],supply=worldExportable(k),p=S.marketPrices[k]||x[2],pressure=supply<20?.018:supply<100?.009:supply>1500?-.012:supply>600?-.005:0;S.marketPrices[k]=Math.max(x[2]*.3,Math.min(x[2]*4,p*(1+pressure+(Math.random()-.5)*.018)));});
}

const oldRelations=S.relations||[];
S.relations=WORLD_COUNTRIES.slice(0,18).map((c,i)=>({
 name:c[0],value:oldRelations[i]?.value??Math.round((Math.random()*40)-10),
 power:c[3],currency:c[1],usd:c[2],pacts:oldRelations[i]?.pacts||[]
}));
function usd(n){return '$'+fmt(n)}
function marketValue(key){return S.marketPrices[key]||100}
function commodityLabel(key){let x=COMMODITIES.find(c=>c[1]===key);return x?x[0]:key}
function marketTrade(key,mode){
 if(blocked())return;
 const item=COMMODITIES.find(c=>c[1]===key);if(!item)return;
 const qty=Number($('#qty-'+key)?.value||10);if(!Number.isFinite(qty)||qty<=0||qty>100000)return toast('Укажите корректное количество');
 const price=marketValue(key),total=price*qty/1000000; // стоимость в миллионах долларов
 if(mode==='buy'){
   if(S.money<total)return toast('Недостаточно средств в казне');
   S.money-=total;S.commodities[key]=(S.commodities[key]||0)+qty;
 }else{
   if((S.commodities[key]||0)<qty)return toast('На складе недостаточно товара');
   S.commodities[key]-=qty;S.money+=total*.94;
 }
 S.trust=clamp((S.trust||55)+(mode==='buy'?0.12:-0.08));S.marketTurn++;
 log(`${mode==='buy'?'Закупка':'Продажа'}: ${commodityLabel(key)} — ${fmt(qty)} ед., ${usd(total*1000000)}.`);
 save();render();toast(mode==='buy'?'Товар закуплен':'Товар продан');
}
window.marketTrade=marketTrade;
window.worldAction=(i,action)=>{
 if(blocked())return;let c=S.worldCountries[i];if(!c)return;
 const costs={talk:80,trade:220,aid:450,agreement:600};
 let cost=costs[action]||0;if(S.money<cost)return toast('Недостаточно средств');
 S.money-=cost;
 if(action==='talk'){c.relation=clamp(c.relation+7,-100,100);let r=S.relations[i];if(r)r.value=clamp(r.value+7,-100,100)}
 if(action==='trade'){c.relation=clamp(c.relation+4,-100,100);c.trade=(c.trade||0)+1;S.gdp+=90;S.money+=120}
 if(action==='aid'){c.relation=clamp(c.relation+12,-100,100);S.legitimacy=clamp(S.legitimacy+1)}
 if(action==='agreement'){c.relation=clamp(c.relation+8,-100,100);c.agreement=12}
 log(`${action==='talk'?'Проведены переговоры':action==='trade'?'Расширена торговля':action==='aid'?'Оказана гуманитарная помощь':'Подписано экономическое соглашение'} с государством ${c.name}.`);
 save();render();toast('Дипломатическое действие выполнено');
};
const baseRender=render;
render=function(auto){
 if(tab==='resources'){
  let cards=COMMODITIES.map(x=>{let stock=S.commodities[x[1]]||0;return `<div class="mini"><b>${x[0]}</b><div>Запас: <strong>${fmt(stock)} ${x[3]}</strong></div><div class="muted">Цена: ${usd(marketValue(x[1]))} за ${x[3]}</div><div class="bar"><i style="width:${clamp(stock/10)}%"></i></div></div>`}).join('');
  $('#content').innerHTML=`<div class="grid">${card('Национальные запасы сырья и товаров',`<p class="muted">Складские остатки влияют на торговлю, промышленность и устойчивость экономики. Цены указаны в долларах США за единицу товара.</p><div class="cards">${cards}</div>`)}</div>`;
  stats();updateNavigation();return;
 }
 if(tab==='market'){
  let rows=COMMODITIES.map(x=>`<tr><td><b>${x[0]}</b><br><small class="muted">${x[3]}</small></td><td>${usd(marketValue(x[1]))}</td><td>${fmt(S.commodities[x[1]]||0)}</td><td><input id="qty-${x[1]}" type="number" min="1" max="100000" value="10" style="width:85px"></td><td><button class="good" onclick="marketTrade('${x[1]}','buy')">Купить</button> <button onclick="marketTrade('${x[1]}','sell')">Продать</button></td></tr>`).join('');
  $('#content').innerHTML=`<div class="grid">${card('Мировой товарный рынок',`<p>Все расчёты ведутся в <b>долларах США (USD)</b>. Покупка увеличивает запасы, продажа приносит 94% ориентировочной стоимости с учётом торговой комиссии. Казна: <b>${usd(S.money*1000000)}</b>.</p><div style="overflow:auto"><table><thead><tr><th>Товар</th><th>Цена USD</th><th>На складе</th><th>Количество</th><th>Операция</th></tr></thead><tbody>${rows}</tbody></table></div>`)}</div>`;
  stats();updateNavigation();return;
 }
 if(tab==='world'){
  let rows=S.worldCountries.map((c,i)=>{let top=Object.entries(c.production||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${commodityLabel(k)} +${resourceFmt(v)}/мес.`).join(', ');let detail=COMMODITIES.map(x=>`<div>${x[0]}: запас ${resourceFmt(c.stocks?.[x[1]]||0)} · производство +${resourceFmt(c.production?.[x[1]]||0)}/мес. · потребление −${resourceFmt(c.consumption?.[x[1]]||0)}/мес.${EXTRACTIVE_KEYS.includes(x[1])?' · месторождения '+resourceFmt(c.deposits?.[x[1]]||0):''}</div>`).join('');return `<tr><td><b>${c.name}</b><br><small class="muted">${c.power>=80?'Крупная экономика':c.power>=65?'Развитая экономика':'Региональный партнёр'} · Производит: ${top}</small><details><summary>Все ресурсы и запасы</summary><div class="muted">${detail}</div></details></td><td>${c.currency}</td><td>${usd(c.usd)} за 1 ед.</td><td>${Math.round(c.relation)} / 100</td><td><button onclick="worldAction(${i},'talk')">Переговоры</button> <button onclick="worldAction(${i},'trade')">Торговля</button><button onclick="worldAction(${i},'aid')">Помощь</button><button onclick="worldAction(${i},'agreement')">Соглашение</button></td></tr>`}).join('');
  $('#content').innerHTML=`<div class="grid">${card('Международная система',`<p>В игре представлены реальные государства. Все бюджеты, цены, торговые сделки и национальная казна считаются в долларах США. Курсы валют ниже — игровые справочные коэффициенты к USD, не биржевые котировки реального времени.</p><div style="overflow:auto"><table><thead><tr><th>Государство</th><th>Валюта</th><th>Курс к USD</th><th>Отношения</th><th>Действия</th></tr></thead><tbody>${rows}</tbody></table></div>`)}</div>`;
  stats();updateNavigation();return;
 }
 baseRender(auto);
};
const baseMonthTick=monthTick;
monthTick=function(){
 if(S.event){pause();showDecisionModal();return}
 baseMonthTick();
 if(S.event){pause();showDecisionModal()}
};
function showDecisionModal(){
 if(!S.event||document.getElementById('decisionModal'))return;
 pause();let ev=S.event,d=document.createElement('div');d.id='decisionModal';d.className='gameover';d.style.zIndex='80';
 d.innerHTML=`<div class="gameover-box" style="max-height:90vh;overflow:auto"><div class="pill">⏸ ИГРА ПРИОСТАНОВЛЕНА · ${ev.cat||'Событие'}</div><h2>${ev.title}</h2><p>${ev.text}</p><p>Решение повлияет на бюджет, общество, рынки или международные отношения. Выберите вариант:</p><div class="actions">${(ev.choices||[]).map((o,i)=>`<button class="${i===0?'primary':'good'}" style="display:block;width:100%;margin:8px 0;white-space:normal" onclick="resolveEvent(${i})">${o.label}</button>`).join('')}</div><p class="muted">После выбора решение применится, а игра автоматически продолжится.</p></div>`;
 document.body.appendChild(d);
}
const baseResolveEvent=window.resolveEvent;
window.resolveEvent=function(choice){if(!S.event)return;const previous=S.event;baseResolveEvent(choice);document.getElementById('decisionModal')?.remove();if(S.event){pause();showDecisionModal();return}S.eventCooldown=3+Math.floor(Math.random()*4);if(!S.campaignOver&&!S.out){play();toast('Решение принято. Время продолжает идти.')}else pause();};
const baseOuster=ouster;
ouster=function(cause){
 // Вместо мгновенного конца — парламентский кризис и шанс сформировать коалицию.
 if(S.out||S.campaignOver)return;
 S.crisis=0;S.grace=6;S.approval=clamp(S.approval-5);S.legitimacy=clamp(S.legitimacy-4);
 S.stability=clamp(S.stability-3);S.out=null;S.party=S.playerParty;
 S.coalitionCrisis={months:0,cause};S.election=Math.max(S.election,6);
 log(`⚠ Парламентский кризис: ${cause}. Правительство получило шесть месяцев на переговоры о коалиции.`);
 say('Правительство под угрозой, но шанс договориться ещё есть','⚠️');
 pause();toast('Кризис правительства: откройте вкладку «Политика»');tab='politics';save();render();
};
const baseAddonTick=addonTick;
addonTick=function(){
 baseAddonTick();
 // Между обычными событиями проходит примерно 4–8 игровых месяцев.
 if(!S.event&&S.eventCooldown>0)S.eventCooldown--;
 // Умеренная динамика цен: спрос, сезонность и мировые потрясения.
 S.marketTurn=(S.marketTurn||0)+1;
 COMMODITIES.forEach(x=>{
  let k=x[1],p=S.marketPrices[k]||x[2],stock=S.commodities[k]||0;
  let drift=(Math.random()-.5)*.045+(stock<30?.018:stock>500?-.012:0);
  S.marketPrices[k]=Math.max(x[2]*.35,Math.min(x[2]*3,p*(1+drift)));
 });
 if(S.coalitionCrisis){
  S.coalitionCrisis.months++;
  if(S.coalitionCrisis.months>=6){
   S.coalitionCrisis=null;S.grace=8;S.approval=clamp(S.approval+3);S.legitimacy=clamp(S.legitimacy+2);
   log('Коалиционное соглашение заключено. Правительство сохранило полномочия.');
  }
 }
};
const originalMonthTickForDecision=monthTick;
if(!Number.isFinite(S.eventCooldown))S.eventCooldown=3;
window.addEventListener('load',()=>{if(S.event){pause();showDecisionModal()}});


// Торговля теперь ограничена реальными экспортными остатками других стран.
marketTrade=function(key,mode){
 if(blocked())return;const item=COMMODITIES.find(c=>c[1]===key);if(!item)return;
 const qty=Number($('#qty-'+key)?.value||10);if(!Number.isFinite(qty)||qty<=0||qty>100000)return toast('Укажите корректное количество');
 const price=marketValue(key),total=price*qty/1000000;
 if(mode==='buy'){
  if(S.money<total)return toast('Недостаточно средств в казне');
  if(worldExportable(key)+1e-8<qty)return toast(`На мировом рынке недостаточно ${item[0]}. Доступно: ${fmt(worldExportable(key))} ${item[3]}`);
  takeWorldSupply(key,qty);S.money-=total;S.commodities[key]=(S.commodities[key]||0)+qty;
 }else{
  if((S.commodities[key]||0)<qty)return toast('На складе недостаточно товара');
  S.commodities[key]-=qty;S.worldMarketPool[key]=(S.worldMarketPool[key]||0)+qty;S.money+=total*.94;
 }
 S.trust=clamp((S.trust||55)+(mode==='buy'?.12:-.08));S.marketTurn++;
 log(`${mode==='buy'?'Импорт':'Экспорт'}: ${commodityLabel(key)} — ${fmt(qty)} ед., ${usd(total*1000000)}.`);
 save();render();toast(mode==='buy'?'Товар закуплен из конечных запасов мирового рынка':'Товар продан на мировой рынок');
};window.marketTrade=marketTrade;
window.investResource=function(key){if(blocked())return;if(!RESOURCE_KEYS.includes(key))return;const cost=250;if(S.money<cost)return toast('Недостаточно средств: нужно 250 млн');S.money-=cost;S.resourceProduction[key]=+((S.resourceProduction[key]||0)*1.15+.01).toFixed(3);S.industry=clamp((S.industry||50)+.3);S.gdp+=12;log(`Инвестиции в отрасль «${commodityLabel(key)}»: месячная производительность увеличена на 15%.`);save();render();toast('Производство модернизировано; проверьте баланс запасов и месторождений')};
const economyAddonTick=addonTick;
addonTick=function(){economyAddonTick();resourceMonthTick()};
// Показываем не только остатки, но и ежемесячный баланс производства и потребления.
const economyRender=render;
render=function(auto){
 if(tab==='resources'){
  let cards=COMMODITIES.map(x=>{let k=x[1],stock=S.commodities[k]||0,prod=S.resourceProduction[k]||0,need=S.resourceConsumption[k]||0,net=prod-need,ratio=need>0?stock/need:99;return `<div class="mini"><b>${x[0]}</b><div>Запас: <strong>${fmt(stock)} ${x[3]}</strong></div><div class="muted">Добыча/выпуск: +${resourceFmt(prod)} в месяц</div><div class="muted">Потребление: −${resourceFmt(need)} в месяц</div>${EXTRACTIVE_KEYS.includes(k)?`<div class="muted">Подземные запасы: ${resourceFmt(S.resourceDeposits[k]||0)} ${x[3]}</div>`:''}<div class="muted">Баланс: <b style="color:${net>=0?'#55c58a':'#ef9a58'}">${net>=0?'+':''}${resourceFmt(net)} / мес.</b></div><div class="muted">Хватит примерно на: ${ratio>=99?'долго':fmt(ratio)+' мес.'}</div><div class="bar"><i style="width:${clamp(stock/Math.max(1,(BASE_STOCK[k]||100)*3)*100)}%"></i></div><button onclick="investResource('${k}')">Развить производство · 250 млн</button></div>`}).join('');
  const deficits=COMMODITIES.filter(x=>(S.commodities[x[1]]||0)<(S.resourceConsumption[x[1]]||0)*2).map(x=>x[0]);
  $('#content').innerHTML=`<div class="grid">${card('Национальные запасы и производство',`<p class="muted">Каждый месяц страна добывает и производит ресурсы, а население и предприятия их потребляют. Запасы конечны. Если потребление выше производства, склад постепенно опустеет; дефицит ухудшает экономику и общественную стабильность.</p><div class="mini"><b>Текущий баланс</b><br>Ресурсов с запасом менее чем на два месяца: <b>${deficits.length}</b>${deficits.length?'<br><span style="color:#e6a15b">Внимание: '+deficits.join(', ')+'</span>':'<br><span style="color:#55c58a">Критического дефицита нет</span>'}</div><div class="cards">${cards}</div>`)}</div>`;
  stats();updateNavigation();return;
 }
 if(tab==='market'){
  let rows=COMMODITIES.map(x=>{let available=worldExportable(x[1]);return `<tr><td><b>${x[0]}</b><br><small class="muted">${x[3]}</small></td><td>${usd(marketValue(x[1]))}</td><td>${fmt(S.commodities[x[1]]||0)}</td><td>${fmt(available)}</td><td><input id="qty-${x[1]}" type="number" min="1" max="100000" value="10" style="width:85px"></td><td><button class="good" onclick="marketTrade('${x[1]}','buy')">Купить</button> <button onclick="marketTrade('${x[1]}','sell')">Продать</button></td></tr>`}).join('');
  $('#content').innerHTML=`<div class="grid">${card('Мировой товарный рынок',`<p>Все расчёты ведутся в <b>долларах США (USD)</b>. Мировое предложение ограничено экспортными остатками 28 государств и товарами, которые выставили на продажу другие участники. Нельзя купить больше, чем реально доступно. Продажа приносит 94% ориентировочной стоимости. Казна: <b>${usd(S.money*1000000)}</b>.</p><div style="overflow:auto"><table><thead><tr><th>Товар</th><th>Цена USD</th><th>На складе</th><th>Доступно в мире</th><th>Количество</th><th>Операция</th></tr></thead><tbody>${rows}</tbody></table></div>`)}</div>`;
  stats();updateNavigation();return;
 }
 economyRender(auto);
};


/* ===== ПЛАВАЮЩАЯ НАЦИОНАЛЬНАЯ ВАЛЮТА NOVARIA =====
   Внутренний бюджетный ledger остаётся в USD для совместимости со старыми сохранениями.
   Курс, цены импорта, покупательная способность и валютная политика — динамические.
*/
const FX_MIN=0.000001, FX_MAX=1000000;
if(!Number.isFinite(S.fxUsd)||S.fxUsd<=0)S.fxUsd=1/47; // USD за 1 гривну; 1 USD = 47 UAH
if(!Number.isFinite(S.fxReserves))S.fxReserves=8000; // млн USD
if(!Number.isFinite(S.keyRate))S.keyRate=7;
if(!Number.isFinite(S.nominalWageIndex))S.nominalWageIndex=100;
if(!Number.isFinite(S.priceIndex))S.priceIndex=100;
if(!Number.isFinite(S.importsUsd))S.importsUsd=0;
if(!Number.isFinite(S.exportsUsd))S.exportsUsd=0;
if(!Array.isArray(S.fxHistory))S.fxHistory=[];
S.currencyName=S.currencyName||'гривна';
S.currencyCode=S.currencyCode||'UAH';
S.fxBaseUsd=Number.isFinite(S.fxBaseUsd)&&S.fxBaseUsd>0?S.fxBaseUsd:1/47;
S.fxLastChange=Number(S.fxLastChange)||0;
S.fxHistory.push(...(S.fxHistory.length?[]:[{year:S.year,month:S.month,rate:S.fxUsd}]));
S.fxHistory=S.fxHistory.slice(-500);
function fxFmt(n){
 n=Number(n);if(!Number.isFinite(n))return '—';
 if(n>=1000000||n<0.000001)return n.toExponential(3).replace('.',',');
 if(n>=100)return n.toLocaleString('ru-RU',{maximumFractionDigits:2});
 if(n>=1)return n.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:4});
 return n.toLocaleString('ru-RU',{minimumFractionDigits:6,maximumFractionDigits:9});
}
function localMoneyFromUsd(usdMillions){return Number(usdMillions||0)*1000000/S.fxUsd;}
function fxImportFactor(){return clamp(Math.pow(1/Math.max(FX_MIN,S.fxUsd),.12),.5,3.5);}
function fxExportFactor(){return clamp(Math.pow(1/Math.max(FX_MIN,S.fxUsd),.035),.78,1.45);}
function fxRealWage(){return 100*(S.nominalWageIndex/Math.max(1,S.priceIndex));}
function fxMonthUpdate(){
 const oldRate=S.fxUsd,oldGdp=Number(S.fxLastGdp)||S.gdp;
 const trust=Number.isFinite(S.trust)?S.trust:55;
 const deficit=(expenses()-income())/Math.max(100,income()+expenses());
 const tradeGap=(S.importsUsd-S.exportsUsd)/Math.max(100,income()+expenses());
 if(S.importsUsd>Math.max(1,S.exportsUsd)*1.25)S.tradeDeficitMonths=(S.tradeDeficitMonths||0)+1;else S.tradeDeficitMonths=Math.max(0,(S.tradeDeficitMonths||0)-1);
 const deficitStreakPressure=Math.min(.0035,(S.deficitMonths||0)*.00022);
 const importDependencePressure=Math.min(.002,(S.tradeDeficitMonths||0)*.00012);
 const taxPressure=Math.max(0,taxYieldRate()-21)*.000035;
 const debtRatio=S.debt/Math.max(100,S.gdp);
 const inflationPressure=(S.inflation-5)*.00045;
 const trustPressure=(55-trust)*.00005;
 const debtPressure=Math.max(0,debtRatio-.35)*.003;
 const fiscalPressure=clamp(deficit,-1,1)*.0015;
 const tradePressure=clamp(tradeGap,-2,2)*.00055;
 const stabilityPressure=(55-S.stability)*.000025;
 const ratePressure=(S.keyRate-7)*-.00025;
 const reserveSupport=-Math.min(.00025,Math.max(0,S.fxReserves)/32000000);
 const random=(Math.random()-.5)*.0016;
 let depreciation=clamp(inflationPressure+trustPressure+debtPressure+fiscalPressure+tradePressure+stabilityPressure+ratePressure+reserveSupport+deficitStreakPressure+importDependencePressure+taxPressure+random,-.025,.04);
 // Положительное значение означает ослабление гривны.
 S.fxUsd=clamp(oldRate*(1-depreciation),FX_MIN,FX_MAX);
 S.fxLastChange=oldRate>0?(S.fxUsd/oldRate-1)*100:0;
 // Денежная политика влияет и на инфляцию, и на выпуск: дорогой кредит охлаждает спрос.
 S.inflation=clamp(S.inflation+Math.max(0,S.fxLastChange)*.06-Math.max(0,-S.fxLastChange)*.025+(7-S.keyRate)*.04,0,100);
 S.gdp=Math.max(100,S.gdp*(1-Math.max(0,S.keyRate-7)*.0007+Math.max(0,7-S.keyRate)*.0005));
 // Импорт дорожает в национальной валюте напрямую через курс; внутренние цены реагируют постепенно.
 const targetCpi=clamp(100*Math.pow(S.fxBaseUsd/S.fxUsd,.28),30,5000);
 const convergence=Math.log(Math.max(1,targetCpi)/Math.max(1,S.priceIndex))*.14;
 const monthlyInflation=clamp(S.inflation/1200,-.02,.08);
 S.priceIndex=clamp(S.priceIndex*Math.exp(convergence+monthlyInflation),20,10000);
 // Зарплаты индексируются медленнее цен: при девальвации покупательная способность может падать.
 const productivity=(S.gdp-oldGdp)/Math.max(100,S.gdp);
 const wageGrowth=clamp(S.inflation/1200*.55+productivity*.18,-.005,.018);
 S.nominalWageIndex=clamp(S.nominalWageIndex*(1+wageGrowth),10,100000);
 S.fxLastGdp=S.gdp;
 S.fxHistory.push({year:S.year,month:S.month,rate:S.fxUsd});
 if(S.fxHistory.length>500)S.fxHistory.splice(0,S.fxHistory.length-500);
 if(Math.abs(S.fxLastChange)>=1.5){
  const direction=S.fxLastChange<0?'укрепился':'ослаб';
  log(`Валютный рынок: гривна ${direction} на ${Math.abs(S.fxLastChange).toFixed(2)}% за месяц. Курс: 1 ${S.currencyCode} = ${fxFmt(S.fxUsd)} USD.`);
 }
 S.importsUsd=0;S.exportsUsd=0;
}
window.setKeyRate=function(v){S.keyRate=clamp(Number(v)||0,0,30);const n=document.getElementById('keyRateValue');if(n)n.textContent=S.keyRate.toFixed(1)+'%';save()};
window.supportCurrency=function(){
 if(blocked())return;
 const cost=500;
 if(S.fxReserves<cost)return toast('Недостаточно валютных резервов центрального банка');
 S.fxReserves-=cost;
 S.fxUsd=clamp(S.fxUsd*1.04,FX_MIN,FX_MAX);
 S.trust=clamp((S.trust||55)+1.5);S.inflation=clamp(S.inflation-.25,0,100);
 S.fxLastChange=4;
 S.fxHistory.push({year:S.year,month:S.month,rate:S.fxUsd});S.fxHistory=S.fxHistory.slice(-500);
 log('Центральный банк провёл валютную интервенцию: потрачено 500 млн USD резервов, гривна укрепилась примерно на 4%.');
 save();render();toast('Интервенция проведена: курс поддержан, резервы уменьшились');
};
const fxPreviousMonthTick=monthTick;
monthTick=function(){
 const y=S.year,m=S.month;
 fxPreviousMonthTick();
 if(S.year!==y||S.month!==m){
  fxMonthUpdate();
  const last=S.history[S.history.length-1];if(last){last.fxUsd=S.fxUsd;last.realWage=fxRealWage();last.priceIndex=S.priceIndex;}
  save();render(true);
 }
};
const fxPreviousMarketTrade=marketTrade;
marketTrade=function(key,mode){
 if(blocked())return;
 const qty=Number($('#qty-'+key)?.value||10),base=marketValue(key);
 if(!Number.isFinite(qty)||qty<=0||qty>100000)return toast('Укажите количество от 1 до 100 000');
 if(mode==='buy'){
  const total=base*fxImportFactor()*qty/1000000;
  if(S.money<total)return toast(`С учётом курса нужно ${usd(total*1000000)}. В казне недостаточно средств.`);
  if(worldExportable(key)+1e-8<qty)return toast(`На мировом рынке недостаточно ${commodityLabel(key)}. Доступно: ${fmt(worldExportable(key))}`);
  takeWorldSupply(key,qty);S.money-=total;S.commodities[key]=(S.commodities[key]||0)+qty;S.importsUsd+=total;
  S.trust=clamp((S.trust||55)-Math.max(0,fxImportFactor()-1)*.025);
  log(`Импорт ${commodityLabel(key)}: ${fmt(qty)} ед. Цена с валютной надбавкой ${usd(total*1000000)} (примерно ${fxFmt(base*fxImportFactor()/S.fxUsd)} ${S.currencyCode} за единицу).`);
 }else{
  if((S.commodities[key]||0)<qty)return toast('На складе недостаточно товара');
  const revenue=base*fxExportFactor()*qty/1000000*.94;
  S.commodities[key]-=qty;S.worldMarketPool[key]=(S.worldMarketPool[key]||0)+qty;S.money+=revenue;S.exportsUsd+=revenue;
  log(`Экспорт ${commodityLabel(key)}: ${fmt(qty)} ед., выручка ${usd(revenue*1000000)} с учётом валютной конкурентоспособности.`);
 }
 S.marketTurn=(S.marketTurn||0)+1;save();render();toast(mode==='buy'?'Импорт оплачен с учётом валютного курса':'Экспорт продан с учётом конкурентоспособности валюты');
};
window.marketTrade=marketTrade;
const fxBaseStats=stats;
stats=function(){
 fxBaseStats();
 const cash=document.querySelector('#stats .stat b');
 const label=document.querySelector('#stats .stat small');
 if(cash)cash.textContent=`${fmt(S.money)} млн USD · ${fxFmt(S.money/Math.max(FX_MIN,S.fxUsd))} млн ${S.currencyCode}`;
 if(label)label.textContent='Казна (USD / UAH)';
};
function fxChartSvg(){
 const data=S.fxHistory.slice(-60);if(data.length<2)return '<p class="muted">График появится после нескольких игровых месяцев.</p>';
 const logs=data.map(x=>Math.log10(Math.max(FX_MIN,Math.min(FX_MAX,x.rate))));
 let lo=Math.min(...logs),hi=Math.max(...logs);if(hi-lo<.05){lo-=.05;hi+=.05;}
 const pts=logs.map((v,i)=>`${30+i*740/(logs.length-1)},${225-(v-lo)/(hi-lo)*195}`).join(' ');
 const labels=[fxFmt(Math.pow(10,hi)),fxFmt(Math.pow(10,(hi+lo)/2)),fxFmt(Math.pow(10,lo))];
 return `<svg viewBox="0 0 800 260" role="img" aria-label="История курса гривны к доллару США" style="width:100%;height:auto;background:#101a20;border-radius:10px"><g stroke="#ffffff" stroke-opacity=".12"><path d="M30 30H770M30 127H770M30 225H770"/></g><polyline points="${pts}" fill="none" stroke="#62c99a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g fill="#b9c8d0" font-size="12"><text x="32" y="20">${labels[0]} USD</text><text x="32" y="117">${labels[1]} USD</text><text x="32" y="215">${labels[2]} USD</text><text x="30" y="248">${months[data[0].month]} ${data[0].year}</text><text x="770" y="248" text-anchor="end">${months[data[data.length-1].month]} ${data[data.length-1].year}</text></g></svg>`;
}
const fxPreviousRender=render;
render=function(auto){
 if(tab==='currency'){
  if(!Number.isFinite(S.fxUsd)||S.fxUsd<=0)S.fxUsd=1;if(!Array.isArray(S.fxHistory))S.fxHistory=[];if(!S.fxHistory.length)S.fxHistory.push({year:S.year,month:S.month,rate:S.fxUsd});
  const usdPerUnit=S.fxUsd,unitsPerUsd=1/Math.max(FX_MIN,usdPerUnit);
  const wage=2500*S.nominalWageIndex/100,basket=1000*S.priceIndex/100,real=fxRealWage();
  const change=S.fxLastChange||0,changeColor=change>0?'#ef9a58':'#55c58a';
  const importFactor=fxImportFactor(),exportFactor=fxExportFactor();
  const body=`<p class="muted">Национальная валюта плавающая. Начальный игровой курс новой кампании: 1 USD = 47 ${S.currencyCode}. Положительная динамика означает укрепление гривны, отрицательная — ослабление. Казна и бухгалтерские расчёты сохранены в USD, а торговля, импортные цены и покупательная способность учитывают курс.</p>
  <div class="cards"><div class="mini"><small>Стоимость 1 ${S.currencyCode}</small><b style="font-size:1.5rem">${fxFmt(usdPerUnit)} USD</b><span class="muted">1 USD = ${fxFmt(unitsPerUsd)} ${S.currencyCode}</span></div><div class="mini"><small>Изменение за месяц</small><b style="color:${changeColor}">${change>0?'+':''}${change.toFixed(3)}%</b><span class="muted">${change<0?'Валюта укрепилась':change>0?'Валюта ослабла':'Курс почти не изменился'}</span></div><div class="mini"><small>Резервы центробанка</small><b>${fmt(S.fxReserves)} млн USD</b><span class="muted">Средства для валютных интервенций</span></div><div class="mini"><small>Ключевая ставка</small><b>${S.keyRate.toFixed(1)}%</b><span class="muted">Влияет на инфляцию, спрос и курс</span></div></div>
  ${card('История национальной валюты',fxChartSvg()+`<p class="muted">График показывает USD за 1 ${S.currencyCode}; вертикальная шкала логарифмическая, поэтому видны и очень слабые, и очень сильные валюты. История хранит до 500 игровых месяцев.</p>`)}
  ${card('Центральный банк',`<div class="mini"><b>Ключевая процентная ставка: <span id="keyRateValue">${S.keyRate.toFixed(1)}%</span></b><input type="range" min="0" max="30" step="0.5" value="${S.keyRate}" oninput="setKeyRate(this.value)" style="width:100%"><div class="muted">Высокая ставка обычно поддерживает курс и сдерживает инфляцию, но тормозит инвестиции и экономический рост. Низкая ставка стимулирует спрос, но может ослаблять валюту.</div></div><div class="actions"><button class="primary" onclick="supportCurrency()">Поддержать гривну · 500 млн USD резервов</button></div><p class="muted">Интервенция укрепляет курс примерно на 4%, но расходует валютные резервы. Частые интервенции истощают резервы.</p>`)}
  ${card('Цены и население',`<div class="cards"><div class="mini"><small>Средняя зарплата</small><b>${fxFmt(wage)} ${S.currencyCode}/мес.</b></div><div class="mini"><small>Потребительская корзина</small><b>${fxFmt(basket)} ${S.currencyCode}</b></div><div class="mini"><small>Индекс реальной зарплаты</small><b style="color:${real>=100?'#55c58a':'#ef9a58'}">${real.toFixed(1)}</b><span class="muted">Стартовое значение = 100</span></div><div class="mini"><small>Индекс цен</small><b>${S.priceIndex.toFixed(1)}</b><span class="muted">Инфляция + перенос курса в цены</span></div></div><p>При ослаблении валюты импортные товары дорожают в гривнах. Цены внутри страны постепенно подтягиваются вслед за импортом. Зарплаты растут медленнее, поэтому покупательная способность может снижаться. При укреплении валюты импорт дешевеет, а реальная зарплата со временем может вырасти.</p>`)}
  ${card('Как курс влияет на торговлю',`<div class="cards"><div class="mini"><b>Импортная надбавка</b>${importFactor.toFixed(2)}×<span class="muted">Слабая валюта делает закупки за рубежом дороже в USD-эквиваленте</span></div><div class="mini"><b>Конкурентоспособность экспорта</b>${exportFactor.toFixed(2)}×<span class="muted">Ослабление валюты помогает экспортёрам конкурировать, укрепление — снижает это преимущество</span></div></div><p class="muted">Курс пересчитывается каждый игровой месяц с учётом инфляции, доверия рынков, долга, бюджетного и торгового баланса, стабильности, ключевой ставки и резервов. Допустимый диапазон: 0,000001–1 000 000 USD за 1 ${S.currencyCode}.</p>`)}
  <div class="mini"><b>Быстрый ориентир</b><br>Сейчас за 1 доллар можно получить ${fxFmt(unitsPerUsd)} ${S.currencyCode}. За 100 USD — ${fxFmt(unitsPerUsd*100)} ${S.currencyCode}. За 1 000 ${S.currencyCode} — ${fxFmt(1000*usdPerUnit)} USD.</div>`;
  $('#content').innerHTML=`<div class="grid">${body}</div>`;stats();updateNavigation();return;
 }
 if(tab==='market'){
  let rows=COMMODITIES.map(x=>{let k=x[1],available=worldExportable(k),base=marketValue(k),effective=base*fxImportFactor();return `<tr><td><b>${x[0]}</b><br><small class="muted">${x[3]}</small></td><td>${usd(effective)}</td><td>${fxFmt(effective/S.fxUsd)} ${S.currencyCode}</td><td>${fmt(S.commodities[k]||0)}</td><td>${fmt(available)}</td><td><input id="qty-${k}" type="number" min="1" max="100000" value="10" style="width:85px"></td><td><button class="good" onclick="marketTrade('${k}','buy')">Купить</button> <button onclick="marketTrade('${k}','sell')">Продать</button></td></tr>`}).join('');
  $('#content').innerHTML=`<div class="grid">${card('Мировой товарный рынок',`<p>Базовая стоимость товаров формируется на мировом рынке в USD. Для закупок применяется валютная надбавка: <b>${fxImportFactor().toFixed(2)}×</b>. Цена в национальной валюте показывает, сколько гривен требуется за единицу товара. Слабый курс делает импорт дороже, сильный — дешевле. Казна: <b>${usd(S.money*1000000)}</b> · ${fxFmt(localMoneyFromUsd(S.money))} ${S.currencyCode}.</p><div style="overflow:auto"><table><thead><tr><th>Товар</th><th>Цена импорта USD</th><th>Цена в ${S.currencyCode}</th><th>На складе</th><th>Доступно в мире</th><th>Количество</th><th>Операция</th></tr></thead><tbody>${rows}</tbody></table></div>`)}</div>`;
  stats();updateNavigation();return;
 }
 fxPreviousRender(auto);
};

ensure();render();})();
