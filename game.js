(()=>{'use strict';
window.H=window.H||{};
const $=s=>document.querySelector(s), clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v)), fmt=n=>Math.round(n).toLocaleString('ru-RU'), months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const initial=()=>({name:'Республика Новария',month:0,year:1,money:18000,debt:0,pop:8200000,gdp:42000,inflation:5,employment:94,stability:68,approval:61,legitimacy:70,food:78,fuel:65,steel:55,equipment:48,ammo:62,energy:72,tech:32,army:42000,navy:8,air:45,training:58,morale:65,threat:20,war:false,gov:'Парламентская республика',leader:'Александр Ветров',party:'Центристский союз',playerParty:'Центристский союз',campaignOver:false,difficulty:'normal',history:[],tax:20,health:12,education:12,defense:15,industry:50,cbRate:5,cbReserve:8,priceControls:0,antiInflationFund:0,aiEconomicGovernor:false,election:24,coupRisk:12,grace:12,crisis:0,cd:{},regions:[{name:'Столица',pop:1200000,wealth:82,loyalty:76,unrest:10,industry:70,infra:88,resource:'Услуги'},{name:'Северный край',pop:1600000,wealth:55,loyalty:64,unrest:18,industry:48,infra:55,resource:'Лес'},{name:'Восточная область',pop:2100000,wealth:48,loyalty:57,unrest:24,industry:75,infra:49,resource:'Сталь'},{name:'Южная провинция',pop:1900000,wealth:51,loyalty:60,unrest:20,industry:42,infra:53,resource:'Зерно'},{name:'Западный округ',pop:1400000,wealth:62,loyalty:68,unrest:14,industry:58,infra:67,resource:'Энергия'}],parties:[{name:'Центристский союз',support:34,seats:38,ideology:'Центр'},{name:'Народная партия',support:25,seats:27,ideology:'Консерватизм'},{name:'Партия реформ',support:21,seats:22,ideology:'Либерализм'},{name:'Социальный альянс',support:20,seats:13,ideology:'Социал-демократия'}],relations:(window.WORLD?WORLD.list.map(c=>({name:c.name,value:c.value,power:c.power})):[{name:'Аркания',value:15,power:65},{name:'Белория',value:48,power:42},{name:'Тарвия',value:-20,power:80}]),log:['Правительство сформировано. Начинается управление государством.'],documents:[],events:[],laws:[],event:null});
let S;try{S={...initial(),...JSON.parse(localStorage.getItem('novariaSave')||'{}')}}catch{S=initial()}if(!Array.isArray(S.regions)||!Array.isArray(S.parties)||!Array.isArray(S.relations))S=initial();
if(window.NovaSystems)NovaSystems.ensure(S);
if(!S.playerParty)S.playerParty=S.party||'Центристский союз';if(!S.difficulty)S.difficulty='normal';if(typeof S.campaignOver!=='boolean')S.campaignOver=false;if(!Array.isArray(S.history))S.history=[];if(!Array.isArray(S.log))S.log=[];if(!Array.isArray(S.documents))S.documents=[];if(!Array.isArray(S.laws))S.laws=[];if(!S.event)S.event=null;if(S.history.length===0){let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap())}
let tab='overview',timer=null,running=false,selectedDifficulty=S.difficulty,selectedAi=Object.assign({aggr:'normal',nn:'std',ars:'none'},S.aiCfg||{});
const DIFFICULTIES={story:{label:'Сюжетная',income:1.3,expenses:.85,playerDrift:1.25,rivalPressure:.72,unrest:.7,approval:1.25,coup:.65},easy:{label:'Лёгкая',income:1.15,expenses:.93,playerDrift:1.1,rivalPressure:.88,unrest:.85,approval:1.1,coup:.85},normal:{label:'Нормальная',income:1,expenses:1,playerDrift:1,rivalPressure:1,unrest:1,approval:1,coup:1},hard:{label:'Сложная',income:.95,expenses:1.06,playerDrift:.9,rivalPressure:1.18,unrest:1.2,approval:.85,coup:1.2},expert:{label:'Эксперт',income:.86,expenses:1.14,playerDrift:.78,rivalPressure:1.42,unrest:1.45,approval:.72,coup:1.5}};
function difficulty(){return DIFFICULTIES[S.difficulty]||DIFFICULTIES.normal}
function setupAi(cfg){const d={aggr:'normal',nn:'std',ars:'none'},c=Object.assign({},d,cfg||{});if(window.AIARS){if(!AIARS.AGGR[c.aggr])c.aggr=d.aggr;if(!AIARS.NNM[c.nn])c.nn=d.nn;if(!AIARS.ARSM[c.ars])c.ars=d.ars}S.aiCfg=c;S.pacts={};if(window.AIARS){AIARS.applyCfg(S);const am=AIARS.aggrMult(S);S.relations.forEach(r=>{if(r.aggr!=null)r.aggr=clamp(r.aggr*am+(am-1)*.1,.05,.98)})}}
window.setAiCfg=(k,v)=>{selectedAi[k]=v;toast('Настройка ИИ применится к новой кампании')};

function aiCfgSelects(){const A=window.AIARS;if(!A)return '';const sel=selectedAi,o=(obj,val)=>Object.keys(obj).map(k=>`<option value="${k}" ${val===k?'selected':''}>${typeof obj[k]==='string'?obj[k]:obj[k].n}</option>`).join('');
 return `<div class="row"><label>Агрессия ИИ стран</label><select onchange="setAiCfg('aggr',this.value)">${o(A.AGGR,sel.aggr)}</select></div><div class="row"><label>Нейросеть ИИ</label><select onchange="setAiCfg('nn',this.value)">${o(A.NNM,sel.nn)}</select></div><div class="row"><label>Стартовый арсенал ИИ</label><select onchange="setAiCfg('ars',this.value)">${o(A.ARSM,sel.ars)}</select></div>`}
function aiCfgCard(){const A=window.AIARS;if(!A)return '';const c=A.cfg(S);
 return card('🤖 ИИ-противники',`<p>Выберите перед стартом: насколько агрессивны страны, учится ли их нейросеть и есть ли у них оружие в начале. По умолчанию арсенала нет — страны сами <b>вырабатывают</b> оружие на заводах и <b>покупают</b> его за деньги (дороже, но быстрее). Работает для <b>новой кампании</b>.</p>${aiCfgSelects()}<div class="mini"><b>Сейчас в игре:</b> агрессия — ${A.AGGR[c.aggr].n}; нейросеть — ${A.NNM[c.nn]}; стартовый арсенал — ${A.ARSM[c.ars]}.</div><button class="primary" onclick="resetGame()">Начать новую кампанию с этими настройками</button>`)}
window.setDifficulty=v=>{selectedDifficulty=DIFFICULTIES[v]?v:'normal';toast('Для применения сложности начни новую кампанию')};
function save(){if(window.__NG_MP){if(window.NGMP&&window.NGMP.saveLocal)window.NGMP.saveLocal();if(window.NGMP&&window.NGMP.reportState)window.NGMP.reportState();return}if(window.__salv)return;try{localStorage.setItem('novariaSave',JSON.stringify(S))}catch(e){toast('Не удалось сохранить: память устройства заполнена')}}
function toast(t){if(window.__salv)return;let n=$('#notice');n.textContent=t;n.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>n.style.display='none',2400)}
function log(t){if(window.__salv&&window.__salv.mute)return;S.log.unshift(`Год ${S.year}, ${months[S.month]}: ${t}`);S.log=S.log.slice(0,100)}
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
function capHtml(){const c=S.captured||[];if(!c.length)return'';const many=c.length>12,W=many?58:72,H=many?40:54,cols=many?8:3,max=many?32:12;let o=`<text x="14" y="290" class="maptxt2" style="opacity:.85">ЗАХВАЧЕННЫЕ ЗЕМЛИ · ${c.length}</text>`;c.slice(0,max).forEach((z,i)=>{const x=14+(i%cols)*(W+4),y=298+Math.floor(i/cols)*(H+4),nm=String(z.name).replace(/^Земли /,'');o+=`<polygon points="${x},${y+6} ${x+W-8},${y} ${x+W},${y+H-8} ${x+8},${y+H}" fill="${z.full?'#8a4f2a':'#a07a2c'}" stroke="#f0bd58" stroke-width="2" stroke-dasharray="5 3" stroke-linejoin="round"><title>${z.name} (${z.full?'аннексия':'область'}, отобрано у: ${z.from}), население ${fmt(z.pop||0)}</title></polygon><text x="${x+W/2}" y="${y+H/2}" text-anchor="middle" style="font-size:${many?7:9}px;fill:#fff;font-weight:700">${nm.replace(/^[^:]*: /,'').slice(0,many?9:12)}</text><text x="${x+W/2}" y="${y+H/2+(many?9:11)}" text-anchor="middle" style="font-size:${many?6:8}px;fill:#ffe9b0">${String(z.from).slice(0,many?10:12)}</text>`});if(c.length>max)o+=`<text x="14" y="${298+Math.ceil(max/cols)*(H+4)+12}" class="maptxt2" style="opacity:.85">…и ещё ${c.length-max} (список ниже)</text>`;return o}

/* ------------------------ КАРТА МИРА: настоящие границы стран, регионы внутри них, свой выбор региона ------------------------ */
const WMAP={st:'idle'},GEO={st:'idle',c:{},W:1000,H:575};
const COORDS=`Россия=Москва и область:37.6:55.8;Санкт-Петербург и область:30.3:59.9;Тюменская область (ХМАО, ЯНАО):70:62;Краснодарский край:39:45;Татарстан:50.5:55.5;Свердловская область:60.6:57;Кемеровская область:86:55;Ростовская область:40:47.5;Башкортостан:56:54;Якутия:130:64;Красноярский край:93:64;Калининградская область:21:54.7
США=Калифорния:-119.5:37;Техас:-99:31.5;Флорида:-82:28;Нью-Йорк:-75.5:43;Пенсильвания:-77.8:41;Иллинойс:-89:40;Огайо:-82.7:40.3;Аляска:-150:64;Северная Дакота:-100.5:47.5;Западная Вирджиния:-80.6:38.6
Китай=Гуандун:113.5:23.3;Шаньдун:118:36;Цзянсу:119.5:33;Шаньси:112.3:37.5;Внутренняя Монголия:112:43;Синьцзян:85:41;Сычуань:103:30.5;Хэбэй:115.5:38.5;Хэнань:113.5:34;Тибет:88:31.5
Индия=Махараштра:75.7:19.5;Уттар-Прадеш:80.9:27;Гуджарат:71.5:22.5;Пенджаб:75.4:31;Джаркханд:85.3:23.6;Одиша:84.5:20.5;Тамилнад:78.5:11;Карнатака:76:14.5;Ассам:92.9:26.2
Германия=Бавария:11.5:48.9;Северный Рейн-Вестфалия:7.5:51.5;Баден-Вюртемберг:9:48.6;Саксония:13.2:51;Бранденбург:13.2:52.4;Гамбург:10:53.6
Франция=Иль-де-Франс:2.5:48.7;Овернь-Рона-Альпы:4.8:45.4;Окситания:2:43.7;Бретань:-3:48;Гранд-Эст:6:48.7;Прованс:6:43.7;Нормандия:0:49.1
Великобритания=Англия:-1.5:52.5;Шотландия:-4.2:56.8;Уэльс:-3.7:52.3;Северная Ирландия:-6.8:54.6
Италия=Ломбардия:9.8:45.6;Венето:11.8:45.5;Эмилия-Романья:11:44.5;Лацио:12.7:41.9;Сицилия:14:37.6;Пьемонт:7.8:45;Кампания:14.8:40.9
Испания=Каталония:1.5:41.8;Андалусия:-4.7:37.4;Мадрид:-3.7:40.4;Страна Басков:-2.6:43;Галисия:-7.9:42.7;Арагон:-0.7:41.6
Польша=Силезия:18.9:50.4;Мазовия:21:52.3;Малопольша:20.2:49.9;Великопольша:17.2:52.3;Поморье:18:54.2;Нижняя Силезия:16.5:51.1
Турция=Стамбул:29:41.1;Анкара:32.8:39.9;Измир:27.1:38.4;Зонгулдак:31.8:41.4;Конья:32.5:37.9;Юго-Восток (Диярбакыр):40:37.9
Бразилия=Сан-Паулу:-48.5:-22.2;Рио-де-Жанейро:-42.9:-22.3;Минас-Жерайс:-44.5:-18.5;Мату-Гросу:-55.5:-13;Пара:-52.5:-4;Баия:-41.7:-12.5
Канада=Альберта:-114.5:54;Онтарио:-85:50;Квебек:-72:52;Британская Колумбия:-125:54;Саскачеван:-106:54;Ньюфаундленд:-57:53
Австралия=Западная Австралия:122:-26;Квинсленд:144:-22;Новый Южный Уэльс:147:-32.5;Виктория:144.5:-37;Южная Австралия:135:-30
Япония=Токио:139.7:35.8;Осака:135.5:34.7;Хоккайдо:142.8:43.4;Аити (Нагоя):137:35;Фукуока:130.6:33.4
Иран=Хузестан:49:31.5;Тегеран:51.4:35.7;Исфахан:52:33;Хорасан:59.5:36;Фарс:53:29.5
Мексика=Мехико:-99.1:19.4;Нуэво-Леон:-99.9:25.6;Табаско:-92.6:17.9;Халиско:-103.7:20.6;Сонора:-110.5:29.5;Веракрус:-96.7:19.2`;
const CRD={};COORDS.split('\n').forEach(l=>{const [c,r]=l.split('=');CRD[c]=r.split(';').map(x=>{const p=x.split(':');return {n:p[0],lon:+p[1],lat:+p[2]}})});
const OBL=[['Волынь','Волынская',25.3,51.2,'Западный округ','fe'],['Ровно','Ровенская',26.3,50.9,'Западный округ','fe'],['Львов','Львовская',24.0,49.8,'Западный округ','ue'],['Закарпатье','Закарпатская',23.0,48.4,'Западный округ','e'],['Ив.-Франк.','Ивано-Франковская',24.7,48.9,'Западный округ','ue'],['Тернополь','Тернопольская',25.6,49.5,'Западный округ','f'],['Черновцы','Черновицкая',25.9,48.3,'Западный округ','f'],['Хмельницкий','Хмельницкая',27.0,49.4,'Западный округ','fe'],
['Житомир','Житомирская',28.5,50.7,'Северный край','sf'],['Чернигов','Черниговская',31.9,51.4,'Северный край','uf'],['Сумы','Сумская',34.3,51.0,'Северный край','uf'],['Киевская','Киевская',30.2,50.1,'Столица','qf'],
['Винница','Винницкая',28.5,49.2,'Центральный округ','f'],['Черкассы','Черкасская',31.7,49.2,'Центральный округ','f'],['Полтава','Полтавская',33.7,49.6,'Центральный округ','uf'],['Кировоград','Кировоградская',32.3,48.6,'Центральный округ','sf'],['Днепр','Днепропетровская',35.0,48.6,'Центральный округ','sf'],
['Харьков','Харьковская',36.5,49.6,'Восточная область','qf'],['Луганск','Луганская',39.0,48.9,'Восточная область','s'],['Донецк','Донецкая',37.8,48.1,'Восточная область','su'],['Запорожье','Запорожская',35.5,47.4,'Восточная область','es'],
['Одесса','Одесская',30.3,46.6,'Южная провинция','f'],['Николаев','Николаевская',31.9,47.2,'Южная провинция','f'],['Херсон','Херсонская',33.4,46.6,'Южная провинция','f'],['Крым','Крымская',34.3,45.2,'Южная провинция','f']];


/* ------------------------ ВЫБОР ГОСУДАРСТВА ------------------------ */
let NEWC=null;const CHS={q:'',c:'all',n:30};
/* Масштаб экономики страны относительно Новарии (ВВП 42 000 млн, 8,2 млн жителей).
   Раньше все крупные страны упирались в потолок 2,5 и получали один и тот же ВВП, а малые — в пол 0,5.
   Теперь потолок «мягкий»: ниже 2,0 значения прежние, выше — плавное сжатие, поэтому Китай, США, Россия и Индия различаются. */
function countryScale(w){const inc=[0,.35,.6,1,1.5,2.4][w.inc]||1,raw=Math.pow(Math.max(.05,w.pop*1e6/8.2e6*inc),.4);
 return raw>=2?2+1.5*(1-Math.exp(-(raw-2)/2.5)):raw>=.5?raw:.3+.4*raw}
function applyCountry(){const n=NEWC;NEWC=null;if(!n||n==='Новария')return;const w=WM[n];if(!w)return;
 const p=Math.max(.1,Math.min(1.15,w.power/100)),inc=[0,.35,.6,1,1.5,2.4][w.inc]||1,e=countryScale(w);
 S.name=n;S.me=n;S.deposits=null;S.pop=Math.round(w.pop*1e6);
 S.gdp=Math.round(42000*e);S.money=Math.round(S.money*e);S.army=Math.max(500,Math.round(42000*p));S.air=Math.max(2,Math.round(45*p));S.navy=Math.max(1,Math.round(8*p));
 const rl=S.relations.find(r=>r.name===n);if(rl)rl.self=true;
 // Полная административная сетка страны становится игровой моделью регионов, а не только пятью условными зонами.
 const C=GEO.c[w.iso];
 if(C&&Array.isArray(C.regs)&&C.regs.length>1){
  const grouped=new Map();C.regs.filter(r=>r.n).forEach(r=>{const key=r.parentName||r.baseName||r.n;let g=grouped.get(key);if(!g){g={...r,n:key,s:0,geo:r.id};grouped.set(key,g)}g.s+=Math.max(0,+r.s||0)});
  const seeds=[...grouped.values()];const total=seeds.reduce((a,r)=>a+Math.max(0,+r.s||0),0)||seeds.length;
  S.regions=seeds.map((r,i)=>{
   const meta=(window.WORLD_REGION_META&&WORLD_REGION_META[n]&&WORLD_REGION_META[n][r.n.replace(/ \(.*\)/,'')])||r.meta||{};
   const share=Math.max(0,+r.s||0)/(total||1),urban=Number.isFinite(meta.urban_dev)?meta.urban_dev:.42;
   const res=String(r.res||'f'),resource=RLAB[res[0]]||'Смешанная экономика';
   const pop=Math.round(S.pop*share),ind=Number.isFinite(meta.industry_index)?meta.industry_index:clamp(.35+urban*.25,.2,.9),agr=Number.isFinite(meta.agriculture_index)?meta.agriculture_index:clamp(.62-urban*.25,.15,.95),srv=Number.isFinite(meta.services_index)?meta.services_index:clamp(.3+urban*.45,.2,.98),infra=Number.isFinite(meta.infrastructure_index)?meta.infrastructure_index:clamp(.3+urban*.48,.2,.96),prod=Number.isFinite(meta.productivity_index)?meta.productivity_index:.75;
   return {name:r.n.replace(/ \(.*\)/,''),pop,wealth:clamp(38+inc*7+urban*12,20,92),loyalty:clamp(59+(i%5-2)*1.5,35,85),unrest:clamp(17+(i%4)*2,5,55),industry:clamp(ind*100,15,95),agriculture:clamp(agr*100,10,98),services:clamp(srv*100,15,98),infra:clamp(infra*100,12,96),resource,geo:r.id,regionType:meta.type||'administrative',urbanDev:urban,specialResources:Array.isArray(meta.resources)?meta.resources:[],productivity:prod,regionalGDP:Math.round(S.gdp*share*prod),employment:clamp(82+prod*9-((meta.urban_dev||urban)<.3?3:0),65,97)};
  });
  // Убираем погрешность округления, сохраняя точную численность населения страны.
  if(S.regions.length)S.regions[S.regions.length-1].pop+=S.pop-S.regions.reduce((a,r)=>a+r.pop,0);
 }
}
function chList(){const q=CHS.q.trim().toLowerCase();let a=WORLD.list.slice();if(q)a=a.filter(c=>c.name.toLowerCase().includes(q));if(CHS.c!=='all')a=a.filter(c=>c.cont===CHS.c);return a.sort((x,y)=>y.power-x.power||y.pop-x.pop)}
function chRows(){const l=chList(),sh=l.slice(0,CHS.n);return (sh.map(c=>{const lv=c.power>=60?'🟢 сильная армия':c.power>=30?'🟡 средняя':'🔴 слабая армия';return `<div class="mini"><b>${c.name}</b> <span class="muted">${CONTN[c.cont]||''}</span><br>Население: ${c.pop>=1?c.pop.toFixed(c.pop>=10?0:1)+' млн':Math.round(c.pop*1000)+' тыс.'} · ${lv}<br>${resIcons(c.res)} <small class="muted">${c.trait}</small><div class="actions"><button class="primary" onclick="H.startAs('${c.name.replace(/'/g,"\\'")}')">Играть за ${c.name}</button></div></div>`}).join('')||'<p class="muted">Никого не найдено</p>')+(l.length>sh.length?`<div class="mini" style="display:flex;align-items:center;justify-content:center"><button onclick="H.chf('n',${CHS.n+30})">Показать ещё (${l.length-sh.length})</button></div>`:'')}
function hchooser(){let m=document.getElementById('chm');if(!m){m=document.createElement('div');m.id='chm';m.className='ccm';document.body.appendChild(m)}
 m.innerHTML=`<div class="ccbox"><button class="ccx" onclick="document.getElementById('chm').remove()">✕</button><h3>🌍 Выбор государства</h3><p class="muted">Выберите страну, за которую будете играть. Новая игра начнётся с нуля (текущий прогресс удалится). Чем слабее страна, тем сложнее.</p><div class="mini" style="margin-bottom:8px"><b>🤖 ИИ-противники</b>${aiCfgSelects()}</div><div class="wlbar"><input type="search" placeholder="🔍 Поиск страны…" value="${CHS.q.replace(/"/g,'&quot;')}" oninput="H.chf('q',this.value)"><select onchange="H.chf('c',this.value)"><option value="all">Все части света</option>${Object.keys(CONTN).map(k=>`<option value="${k}" ${CHS.c===k?'selected':''}>${CONTN[k]}</option>`).join('')}</select></div><div class="mini" style="margin-bottom:8px"><b>Новария</b> <span class="muted">вымышленная</span><br>Стартовая страна игры.<div class="actions"><button onclick="H.startAs('Новария')">Играть за Новарию</button></div></div><div class="cards" id="chrows">${chRows()}</div></div>`}
const hchf=(k,v)=>{CHS[k]=v;if(k!=='n')CHS.n=30;const e=document.getElementById('chrows');if(e)e.innerHTML=chRows()};
const hstartAs=n=>{const m=document.getElementById('chm');if(m)m.remove();NEWC=n==='Новария'?null:n;doReset();if(NEWC===null&&n!=='Новария')return};
function wmLoad(cb){if(WMAP.st==='ready')return cb(true);if(WMAP.st==='fail')return cb(false);if(WMAP.st==='loading'){WMAP.q.push(cb);return}
 WMAP.st='loading';WMAP.q=[cb];const urls=['https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.3/d3.min.js','https://cdnjs.cloudflare.com/ajax/libs/topojson/1.6.9/topojson.min.js','https://cdn.jsdelivr.net/npm/datamaps@0.5.9/dist/datamaps.world.min.js'];
 const done=ok=>{if(ok){try{geoBuild()}catch(e){ok=false}}WMAP.st=ok?'ready':'fail';WMAP.q.forEach(f=>f(ok))},next=i=>{if(i>=urls.length)return done(!!(window.Datamap&&Datamap.prototype.worldTopo));const s=document.createElement('script');s.src=urls[i];s.onload=()=>next(i+1);s.onerror=()=>done(false);document.head.appendChild(s)};
 if(window.Datamap)done(true);else next(0)}
/* --- геометрия --- */
const mer=l=>Math.log(Math.tan(Math.PI/4+Math.max(-58,Math.min(80,l))*Math.PI/360));
const PRJ=(lo,la)=>[(lo+180)/360*GEO.W,(mer(80)-mer(la))/(2*Math.PI)*GEO.W];
const f1=p=>p[0].toFixed(1)+' '+p[1].toFixed(1);
const ringD=r=>'M'+r.map(f1).join('L')+'Z';
function topoRings(T,geom){const tf=T.transform,sc=tf?tf.scale:[1,1],tr=tf?tf.translate:[0,0];
 if(!T._a)T._a=T.arcs.map(a=>{let x=0,y=0;return a.map(p=>{if(tf){x+=p[0];y+=p[1];return [x*sc[0]+tr[0],y*sc[1]+tr[1]]}return [p[0],p[1]]})});
 const ring=ix=>ix.reduce((o,i)=>{const a=i<0?T._a[~i].slice().reverse():T._a[i];return o.concat(o.length?a.slice(1):a)},[]);
 const polys=geom.type==='Polygon'?[geom.arcs]:geom.type==='MultiPolygon'?geom.arcs:[];return polys.map(p=>p.map(ring))}
function inside(x,y,rings){let c=false;for(const r of rings)for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function vcells(cs,bb){return cs.map((p,i)=>{let poly=[[bb[0],bb[1]],[bb[2],bb[1]],[bb[2],bb[3]],[bb[0],bb[3]]];
 for(let j=0;j<cs.length&&poly.length;j++){if(j===i)continue;const q=cs[j],mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2,nx=q[0]-p[0],ny=q[1]-p[1],out=[];
  for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],da=(a[0]-mx)*nx+(a[1]-my)*ny,db=(b[0]-mx)*nx+(b[1]-my)*ny;if(da<=0)out.push(a);if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}
  poly=out}return poly})}
function kmeans(pts,K){let mx=0,my=0;pts.forEach(p=>{mx+=p[0];my+=p[1]});mx/=pts.length;my/=pts.length;
 let cs=[pts.reduce((b,p)=>((p[0]-mx)**2+(p[1]-my)**2<(b[0]-mx)**2+(b[1]-my)**2?p:b),pts[0])];
 while(cs.length<K){let best=pts[0],bd=-1;pts.forEach(p=>{let d=1e18;cs.forEach(c=>{d=Math.min(d,(p[0]-c[0])**2+(p[1]-c[1])**2)});if(d>bd){bd=d;best=p}});cs.push(best)}
 let groups;for(let it=0;it<7;it++){groups=cs.map(()=>[]);pts.forEach(p=>{let bi=0,bd=1e18;cs.forEach((c,i)=>{const d=(p[0]-c[0])**2+(p[1]-c[1])**2;if(d<bd){bd=d;bi=i}});groups[bi].push(p)});
  cs=cs.map((c,i)=>{const g=groups[i];return g.length?[g.reduce((a,p)=>a+p[0],0)/g.length,g.reduce((a,p)=>a+p[1],0)/g.length]:c})}
 return {cs,groups}}
function geoBuild(){const T=Datamap.prototype.worldTopo,geoms=T.objects.world.geometries;GEO.H=Math.round((mer(80)-mer(-58))/(2*Math.PI)*GEO.W);
 geoms.forEach(gm=>{const iso=gm.id;if(iso==='ATA')return;const unw=r=>{let pv=r[0][0];const L=r.map(q=>{let lo=q[0];while(lo-pv>180)lo-=360;while(pv-lo>180)lo+=360;pv=lo;return lo});let best=0,bn=-1;[-360,0,360].forEach(sh=>{const n=L.filter(l=>l+sh>=-180&&l+sh<=180).length;if(n>bn){bn=n;best=sh}});return r.map((q,i)=>PRJ(L[i]+best,q[1]))},polys=topoRings(T,gm).map(p=>p.map(unw));if(!polys.length)return;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,area=0;polys.forEach(p=>{p[0].forEach(q=>{x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])});let s=0;const r=p[0];for(let i=0,j=r.length-1;i<r.length;j=i++)s+=(r[j][0]+r[i][0])*(r[j][1]-r[i][1]);area+=Math.abs(s/2)});
  const pinfo=polys.map(p=>{let a=0,u0=1e9,v0=1e9,u1=-1e9,v1=-1e9;p[0].forEach(q=>{u0=Math.min(u0,q[0]);u1=Math.max(u1,q[0]);v0=Math.min(v0,q[1]);v1=Math.max(v1,q[1])});const r=p[0];for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(r[j][0]+r[i][0])*(r[j][1]-r[i][1]);return {a:Math.abs(a/2),b:[u0,v0,u1,v1]}}),amax=Math.max(...pinfo.map(q=>q.a)),vb=pinfo.filter(q=>q.a>=amax*.02).reduce((m,q)=>[Math.min(m[0],q.b[0]),Math.min(m[1],q.b[1]),Math.max(m[2],q.b[2]),Math.max(m[3],q.b[3])],[1e9,1e9,-1e9,-1e9]);
  const rings=[].concat(...polys),C={iso,polys,rings,bb:[x0,y0,x1,y1],vb,area,d:polys.map(p=>p.map(ringD).join('')).join(''),regs:[]};GEO.c[iso]=C;
  const nm=(WORLD.BYISO||{})[iso];if(!nm){C.regs=[{id:iso+':0',n:'',s:100,res:'f',d:'',cx:0,cy:0,free:true}];return}
  C.name=nm;const W=wi(nm);let seeds=null;
  if(iso==='UKR')seeds=OBL.map(o=>({n:o[1]==='Крымская'?'Крым':o[1]+' область',lon:o[2],lat:o[3],s:100/OBL.length,res:o[5]}));
  else if(window.WORLD_SEEDS&&WORLD_SEEDS[nm]){const R=(WORLD.REGS[nm]||[]);seeds=WORLD_SEEDS[nm].map(c=>{const r=R.find(x=>x.n===c.n);return {n:c.n,lon:c.lon,lat:c.lat,s:c.p,res:r?r.res:null,meta:c.meta||null}})}
  else if(CRD[nm]){const R=(WORLD.REGS[nm]||[]);seeds=CRD[nm].map(c=>{const r=R.find(x=>x.n===c.n)||{s:10,res:W.res};return {n:c.n,lon:c.lon,lat:c.lat,s:r.s,res:r.res}})}
  /* сетка точек внутри страны: нужна для долей площади и для авто-деления */
  const gridPts=()=>{const st=Math.max(1.2,Math.sqrt(area/900),Math.sqrt((x1-x0)*(y1-y0)/7000)),pts=[];for(let x=x0;x<=x1;x+=st)for(let y=y0;y<=y1;y+=st)if(inside(x,y,rings))pts.push([x,y]);return pts};
  const resAt=i=>{const r=W.res||'';return r?r[i%r.length]:'f'};
  let cs,sh=[],names=[],ress=[];
  if(seeds){cs=seeds.map(s=>PRJ(s.lon,s.lat));names=seeds.map(s=>s.n);ress=seeds.map((s,i)=>s.res||resAt(i));
   const known=seeds.filter(s=>s.s>0).map(s=>s.s).sort((p,q)=>p-q);let wts;
   if(known.length){const med=known[known.length>>1];wts=seeds.map(s=>s.s>0?s.s:med)}
   else{const pts=gridPts(),ga=cs.map(()=>0);pts.forEach(p=>{let bi=0,bd=1e18;cs.forEach((c,i)=>{const d=(p[0]-c[0])**2+(p[1]-c[1])**2;if(d<bd){bd=d;bi=i}});ga[bi]++});const tg=Math.max(1,ga.reduce((p,q)=>p+q,0));wts=ga.map(g=>.5/cs.length+.5*g/tg)}
   const tot=wts.reduce((p,q)=>p+q,0)||1;sh=wts.map(w=>w/tot*100)}
  else{
   /* авто-деление: чем крупнее страна, тем больше регионов (микрогосударства — 1–4) */
   const K=area<150?Math.max(1,Math.min(4,Math.round(Math.sqrt(area/25)))):Math.max(3,Math.min(45,Math.round(2.2+.9*Math.sqrt(area/40))));
   const pts=K>1?gridPts():[];
   if(K===1||pts.length<K){cs=[[(x0+x1)/2,(y0+y1)/2]];sh=[100];names=[nm];ress=[W.res&&W.res[0]||'f']}
   else{const km=kmeans(pts,K);cs=km.cs;const tg=pts.length;const raw=km.groups.map(g=>.5/K+.5*g.length/tg),rt=raw.reduce((p,q)=>p+q,0);sh=raw.map(v=>v/rt*100);
    const bx=(x0+x1)/2,by=(y0+y1)/2,sx=(x1-x0)||1,sy=(y1-y0)||1,seen={},kind=({eu:'область',oc:'область'})[W.cont]||'провинция',
     ord=cs.map((c,i)=>i).sort((p,q)=>cs[p][0]-cs[q][0]||cs[p][1]-cs[q][1]);names=new Array(K);
    ord.forEach(i=>{const c=cs[i],dx=(c[0]-bx)/sx,dy=(c[1]-by)/sy,ns=dy<-.17?'Север':dy>.17?'Юг':'',ew=dx<-.17?'Запад':dx>.17?'Восток':'',
     cp=ns&&ew?(ns==='Север'?'Северо-':'Юго-')+(ew==='Запад'?'западная':'восточная'):ns?(ns==='Север'?'Северная':'Южная'):ew?(ew==='Запад'?'Западная':'Восточная'):'Центральная';
     const key=cp+' '+kind;seen[key]=(seen[key]||0)+1;names[i]=key+(seen[key]>1?' №'+seen[key]:'')+' ('+nm+')'});
    ress=cs.map((c,i)=>resAt(i))}}
  const bb=[x0-60,y0-60,x1+60,y1+60],cells=vcells(cs,bb);
  C.regs=cs.map((c,i)=>({id:iso+':'+i,n:names[i],s:sh[i],res:ress[i],meta:seeds&&seeds[i]?seeds[i].meta:null,d:cells[i].length>2?'M'+cells[i].map(f1).join('L')+'Z':'',cell:cells[i],cx:c[0],cy:c[1],parentId:iso+':'+i,parentName:names[i],baseName:names[i]}))});
 let provinceReport=null;try{provinceReport=window.NovariaProvinceGrid&&NovariaProvinceGrid.expand(GEO.c,3000)}catch(e){console.warn('province grid',e)}
 GEO.provinceReport=provinceReport;window.NOVARIA_PROVINCE_COUNT=Object.values(GEO.c).reduce((a,C)=>a+(C.regs||[]).length,0);
 GEO.st='ready';window.NOVARIA_MAP_REGIONS=country=>{const w=wi(country||S.me||S.name),C=w&&w.iso&&GEO.c[w.iso];return C?(C.regs||[]).filter(r=>r.n).map(r=>({id:r.id,name:r.n})):[]};try{geoMigrate()}catch(e){}}
/* v3: карта детализирована до игровых провинций; старые владения переносятся на дочерние провинции. */
const GEOV=3;
function geoMigrate(){if(S.geoV===GEOV)return;const oldTaken=S.taken||{},oldCaptured=S.captured||[];S.geoV=GEOV;S.taken={};Object.values(GEO.c).forEach(C=>C.regs.forEach(r=>{const parent=r.parentId||r.id,base=r.parentName||r.baseName||r.n;if(oldTaken[parent]||oldCaptured.some(x=>x&&x.from===C.name&&String(x.name||'').replace(/ \(.*\)$/,'')===String(base||'').replace(/ \(.*\)$/,'')))S.taken[r.id]=1}));const w=S.me&&wi(S.me),C=w&&w.iso&&GEO.c[w.iso];S.regions.forEach(r=>{delete r.geo;if(C){const m=C.regs.find(x=>x.n===r.name||x.parentName===r.name||x.baseName===r.name);if(m)r.geo=m.id}});try{save()}catch(e){}}

/* --- Реальная форма области = ячейка Вороного ∩ контур страны ---
   Ячейка Вороного выходит за границу страны (в море и к соседям). На экране это прячет clip-path,
   но для расчётов (старт дронов, точка падения, штриховка оккупации) нужна именно обрезанная форма.
   Иначе дроны «вылетали» из Турции, взрывались в чужих странах, а штриховка вылезала за область. */
const rbox=ring=>{if(ring._b)return ring._b;let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const q of ring){if(q[0]<a)a=q[0];if(q[0]>c)c=q[0];if(q[1]<b)b=q[1];if(q[1]>d)d=q[1]}return ring._b=[a,b,c,d]};
function clipRing(sub,cell){
 let ar=0;for(let i=0,j=cell.length-1;i<cell.length;j=i++)ar+=cell[j][0]*cell[i][1]-cell[i][0]*cell[j][1];
 const sg=ar>=0?1:-1;let out=sub;
 for(let i=0;i<cell.length&&out.length;i++){
  const a=cell[i],b=cell[(i+1)%cell.length],inp=out,side=q=>sg*((b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]));out=[];
  for(let j=0;j<inp.length;j++){const P=inp[j],Q=inp[(j+1)%inp.length],sp=side(P),sq=side(Q);
   if(sp>=0)out.push(P);
   if((sp>=0)!==(sq>=0)){const t=sp/(sp-sq);out.push([P[0]+(Q[0]-P[0])*t,P[1]+(Q[1]-P[1])*t])}}}
 return out}
function regClip(C,r){
 if(r._k)return r._k;
 let polys=[];
 if(r.cell&&r.cell.length>2){const cb=rbox(r.cell);
  C.polys.forEach(p=>p.forEach(ring=>{const b=rbox(ring);if(b[2]<cb[0]||b[0]>cb[2]||b[3]<cb[1]||b[1]>cb[3])return;const o=clipRing(ring,r.cell);if(o.length>2)polys.push(o)}))}
 let fb=false;if(!polys.length){polys=[].concat(...C.polys);fb=!!(r.cell&&r.cell.length>2)}
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;polys.forEach(rg=>{const b=rbox(rg);x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3])});
 const w=x1-x0,h=y1-y0,N=14,pts=[];let sx=0,sy=0;
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=x0+(i+.5)*w/N,y=y0+(j+.5)*h/N;if(inside(x,y,polys)){pts.push([x,y]);sx+=x;sy+=y}}
 let cx=(x0+x1)/2,cy=(y0+y1)/2;
 if(pts.length){cx=sx/pts.length;cy=sy/pts.length;if(!inside(cx,cy,polys)){let bd=1e18;pts.forEach(q=>{const d=(q[0]-cx)**2+(q[1]-cy)**2;if(d<bd){bd=d;sx=q[0];sy=q[1]}});cx=sx;cy=sy}}
 return r._k={polys,d:polys.map(ringD).join(''),x0,y0,x1,y1,w,h,cx,cy,fb}}
function geoOf(el){const id=el&&el.getAttribute&&el.getAttribute('data-r');if(!id)return null;const i=id.lastIndexOf(':'),C=GEO.c[id.slice(0,i)];if(!C)return null;const r=C.regs[+id.slice(i+1)];return r&&r.id===id?regClip(C,r):null}
function regsOf(name){const W=wi(name);const C=GEO.c[W.iso];return C&&C.regs.length&&GEO.st==='ready'?C.regs:null}
/* --- раскраска --- */
const taken=()=>(S.taken=S.taken||{});
const MYC='#2f6fd0',VAS='#7fb0ee',isVas=n=>(S.puppets||[]).includes(n);
function regCount(n){const r=regsOf(n);return r?r.length:(WORLD.REGS[n]||WORLD.GEN).length}
/* сколько областей можно забрать: доля областей страны растёт вместе с перевесом на фронте (60%→0, 100%→60% областей) */
function quota(n,w){const tot=regCount(n),c=rel(n)||{},rg=regsOf(n),free=rg?rg.filter(x=>!taken()[x.id]).length:Math.max(0,tot-(c.regTaken||[]).length),p=w.won?100:w.p,share=Math.max(0,(p-60)/40);return{tot,free,p,q:Math.min(free,Math.max(1,Math.round(tot*share*.6),(w.occ||[]).length)+(w.goal==='territory'&&!w.def?1:0))}}
function baseCol(iso,i){let h=0;for(const ch of iso)h=(h*31+ch.charCodeAt(0))%360;return `hsl(${h},38%,${33+(i%4)*3}%)`}
function mpRegionOwner(C,r){const shared=S.mpTerritories||{},key=C.name+'|'+r.n;if(shared[key])return shared[key];const cap=(S.captured||[]).find(x=>x&&x.from===C.name&&(x.name===r.n||x.name===r.n+' ('+C.name+')'));if(cap)return S.me||S.name||'Игрок';return null}
function myName(){return S.me||S.name||'Игрок'}
const isMe=o=>!!o&&o===myName();
/* Единый источник правды: кто сейчас владеет областью. Им пользуются карта мира, «Моя держава» и окно страны.
   Порядок: общий список мультиплеера → моя страна → области, которые я захватил → ИИ-владелец → аннексия → вассал → исходная страна. */
function regionOwner(C,r){const mp=mpRegionOwner(C,r);if(mp)return mp;const nm=C.name,me=myName(),rc=nm&&S.relations.find(x=>x.name===nm),aiOwner=S.aiWorld&&S.aiWorld.owners&&S.aiWorld.owners[nm];
 if(nm&&(nm===me||(rc&&rc.self))){const lt=S.lostTo&&(S.lostTo[String(r.n||'').replace(/ \(.*\)/,'')]||S.lostTo[String(r.parentName||r.baseName||'').replace(/ \(.*\)/,'')]);return lt||me}
 if(taken()[r.id])return me;
 const ro=S.aiWorld&&S.aiWorld.regionOwners&&S.aiWorld.regionOwners[nm+'|'+String(r.n||'').replace(/ \(.*\)/,'')];if(ro)return ro;
 if(aiOwner)return aiOwner;
 const oc=S.aiWorld&&S.aiWorld.owners&&S.aiWorld.owners[nm+':occupied'];
 if(oc&&!(window.WORLD_SEEDS&&WORLD_SEEDS[nm])&&C.regs.length>1){let h=0;for(const ch of nm)h=(h*31+ch.charCodeAt(0))>>>0;if(h%C.regs.length===(+String(r.id).split(':')[1]||0))return oc}
 if(rc&&rc.annexed)return me;
 if(rc&&isVas(nm))return 'Вассал: '+nm;
 return nm}
function ownerColor(owner,C,i){if(owner==='Вассал: '+C.name)return VAS;if(isMe(owner))return MYC;const w=WORLD.map[owner];return baseCol(w?(w.iso||w.name):owner,i)}
function regFill(C,r,i){const owner=regionOwner(C,r);if(isMe(owner))return MYC;return owner===C.name?baseCol(C.iso,i):ownerColor(owner,C,i)}
const ownSig=()=>JSON.stringify(S.captured||[])+'|'+Object.keys(taken()).join(',')+'|'+S.relations.filter(r=>r.annexed).map(r=>r.name).join(',')+'|'+myName()+'|'+(S.puppets||[]).join(',')+'|'+JSON.stringify(S.aiWorld&&S.aiWorld.owners||{})+'|'+JSON.stringify(S.aiWorld&&S.aiWorld.regionOwners||{})+'|'+JSON.stringify(S.lostTo||{})+'|'+JSON.stringify(S.mpTerritories||{});
function cityDamageSignature(){return (S.regions||[]).map(r=>(r.name||'')+':'+(r.assets||[]).map(a=>Math.round(Number(a.condition)||0)).join(',')+JSON.stringify(Object.fromEntries(Object.entries(r.townHit||{}).map(([k,v])=>[k,Math.round(v)])))).join('|')+'|'+(S.wars||[]).map(w=>Math.round(Object.values(w.regEco||{}).reduce((a,b)=>a+b,0))+':'+Math.round(Object.values(w.dmg||{}).reduce((a,d)=>a+d.infra+d.civ+d.mil,0))).join(',')}
/* ---------- города в областях: у каждой области несколько городов (число зависит от населения) ---------- */
const TWC={},TWPOS={},TWRAD={};
const hstr=s=>{let h=0;s=String(s);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h};
function townSpots(rings,cx,cy,rad,n,key){
 const out=[[cx,cy]],h=hstr(key)%7;
 for(let i=1;i<n;i++){let ok=null;for(let a=0;a<6&&!ok;a++){const ang=i*2.39996+h+a*.9,rr=rad*Math.sqrt(i/n)*(1-a*.12),x=cx+Math.cos(ang)*rr,y=cy+Math.sin(ang)*rr*.85;if(inside(x,y,rings))ok=[x,y]}
  out.push(ok||[cx+Math.cos(i*2.4)*rad*.12,cy+Math.sin(i*2.4)*rad*.12])}
 return out}
function ownTownsOf(ri){
 const r=(S.regions||[])[ri];if(!r)return[];
 const pop=Math.max(1000,Number(r.pop)||1e6),country=String(r.from||S.me||S.name||''),key=(r.geo||r.name)+'#'+ri+'#'+Math.round(Math.log10(pop)*4);
 if(!TWC[key]){const w=wi(country);TWC[key]=CitySat.towns(r.geo||r.name,r.name,pop,country,w.cont,r.city&&r.city.name)}
 return TWC[key]}
/* удар врага по области: страдает конкретный город + объекты инфраструктуры (их потом можно чинить) */
function townStrike(reg,t,f){
 const ri=S.regions.indexOf(reg);if(ri<0||!window.CitySat)return;
 const tw=ownTownsOf(ri);if(!tw.length)return;
 let tot=0;const wts=tw.map(x=>{const v=(t==='mil'||t==='infra')?1+x.fate*2:Math.max(1,x.pop);tot+=v;return v});
 let q=Math.random()*tot,ix=0;for(;ix<wts.length-1&&q>wts[ix];ix++)q-=wts[ix];
 reg.townHit=reg.townHit||{};reg.townHit[tw[ix].name]=Math.min(95,(reg.townHit[tw[ix].name]||0)+14+12*(f||1));
 if(window.NovaSystems&&NovaSystems.damageAsset&&Array.isArray(reg.assets)){
  const pool=(t==='mil'?['industry','warehouse','airport']:t==='infra'?['power','water','transport','bridge','communications']:['housing','hospital','education']).sort(()=>Math.random()-.5).slice(0,2);
  pool.forEach(ty=>{const ai=reg.assets.findIndex(a=>a.type===ty);if(ai>=0)NovaSystems.damageAsset(S,ri,ai,4+9*(f||1),'Удар врага')})}
}
function townDecay(){(S.regions||[]).forEach(r=>{const h=r.townHit;if(!h)return;Object.keys(h).forEach(k=>{h[k]*=.9;if(h[k]<1)delete h[k]});if(!Object.keys(h).length)delete r.townHit})}
function drawCityMarkers(svg){
 if(!window.CitySat)return;
 const NS='http://www.w3.org/2000/svg';let layer=svg.querySelector('#city-markers');if(!layer){layer=document.createElementNS(NS,'g');layer.id='city-markers';layer.setAttribute('pointer-events','none');svg.appendChild(layer)}
 const items=[],mine={};
 /* 1) наши области: все города области, состояние — из объектов инфраструктуры + прямые попадания */
 (S.regions||[]).forEach((r,ri)=>{
  let C=null,gr=null;
  if(r.geo){const k=String(r.geo).lastIndexOf(':');C=GEO.c[String(r.geo).slice(0,k)];gr=C&&C.regs.find(x=>x.id===r.geo)}
  if(!gr){const country=String(r.from||S.me||S.name||'');const w=wi(country);C=w&&GEO.c[w.iso];if(C)gr=C.regs.find(x=>String(x.n||'').replace(/ \(.*\)$/,'')===String(r.name||'').replace(/ \(.*\)$/,''))}
  if(!C||!gr)return;const q=regClip(C,gr);if(!q||!Number.isFinite(q.cx)||!Number.isFinite(q.cy))return;
  const assets=Array.isArray(r.assets)?r.assets:[],avg=assets.length?assets.reduce((v,a)=>v+(Number(a.condition)||0),0)/assets.length:100,bad=assets.filter(a=>(Number(a.condition)||0)<70).length;
  const tw=ownTownsOf(ri),pk='o'+gr.id+'#'+tw.length;
  if(!TWPOS[pk]){TWRAD[pk]=Math.min(q.w,q.h)*.34;TWPOS[pk]=townSpots(q.polys,q.cx,q.cy,TWRAD[pk],tw.length,gr.id)}
  mine[gr.id]=1;const names=tw.map(x=>x.name);
  tw.forEach((t,i)=>{const p=TWPOS[pk][i]||[q.cx,q.cy];
   items.push({id:gr.id+':'+i,x:p[0],y:p[1],cond:CitySat.townCond(avg,t.fate,(r.townHit||{})[t.name]),name:t.name,sub:r.name,pop:t.pop,cty:C.name,own:ri,main:i===0,bad,others:names.filter(x=>x!==t.name).join(', '),rw:CitySat.radius(t.pop,TWRAD[pk])})});
 });
 /* 2) все остальные страны: у каждой области свои города, состояние зависит от ударов по области в войне */
 Object.values(GEO.c).forEach(C=>{
  if(!C||!C.regs||!C.name)return;
  const war=(S.wars||[]).find(x=>x.n===C.name),W0=wi(C.name),cpop=(Number(W0.pop)||5)*1e6;
  C.regs.forEach(r=>{
   if(mine[r.id]||!Number.isFinite(r.cx)||!Number.isFinite(r.cy))return;
   const rb=r.cell&&r.cell.length>2?rbox(r.cell):[r.cx-1,r.cy-1,r.cx+1,r.cy+1],pad=Math.max(2,WZ.w*.035),zoomScale=GEO.W/Math.max(1,WZ.w);
   if(rb[2]<WZ.x-pad||rb[0]>WZ.x+WZ.w+pad||rb[3]<WZ.y-pad||rb[1]>WZ.y+WZ.h+pad||Math.max(rb[2]-rb[0],rb[3]-rb[1])*zoomScale<2.4)return;
   let cond=100;
   if(war){const n=String(r.n||''),n0=n.replace(/ \(.*\)/,''),d=(war.dmg||{})[n]||(war.dmg||{})[n0],e=(war.regEco||{})[n]||(war.regEco||{})[n0]||0;cond=100-Math.min(98,e*1.1+(d?d.infra*4+d.civ*6+d.mil*2:0))}
   const rp=Math.max(2e4,cpop*(r.s||100/Math.max(1,C.regs.length))/100),key='f'+r.id+'#'+Math.round(Math.log10(rp)*4);
   if(!TWC[key]){TWC[key]=CitySat.towns(r.id,r.n,rp,C.name,W0.cont,null);
    let rad=Math.min(r.cell&&r.cell.length>2?Math.min(rbox(r.cell)[2]-rbox(r.cell)[0],rbox(r.cell)[3]-rbox(r.cell)[1]):12,(C.bb[2]-C.bb[0]),(C.bb[3]-C.bb[1]))*.28;
    TWRAD[key]=rad;TWPOS[key]=townSpots(C.rings,r.cx,r.cy,rad,TWC[key].length,r.id)}
   const tw=TWC[key];
   tw.forEach((t,i)=>{const p=TWPOS[key][i];items.push({id:r.id+':'+i,x:p[0],y:p[1],cond:CitySat.townCond(cond,t.fate,0),name:t.name,sub:String(r.n||'').replace(/ \(.*\)/,'')||C.name,pop:t.pop,cty:C.name,rw:CitySat.radius(t.pop,TWRAD[key])})});
  });
 });
 /* ранг в стране по числу жителей: чем дальше камера, тем меньше городов показываем */
 const by={};items.forEach(c=>(by[c.cty]=by[c.cty]||[]).push(c));
 Object.values(by).forEach(a=>{a.sort((p,q)=>(q.pop||0)-(p.pop||0));a.forEach((c,i)=>c.rk=i)});
 CitySat.setItems(items);CitySat.refresh(svg,WZ,GEO.W);
}
function updateWorld(){const svg=WMAP.node;if(!svg)return;const sig=ownSig()+'|'+S.wars.map(w=>w.n+':'+(w.occ||[]).join('+')).join(',')+'|'+cityDamageSignature();if(WMAP.usig===sig)return;WMAP.usig=sig;
 if(!WMAP.el){WMAP.el={r:{},o:{}};svg.querySelectorAll('[data-r]').forEach(e=>WMAP.el.r[e.getAttribute('data-r')]=e);svg.querySelectorAll('[data-o]').forEach(e=>WMAP.el.o[e.getAttribute('data-o')]=e)}
 Object.values(GEO.c).forEach(C=>{C.regs.forEach((r,i)=>{const e=WMAP.el.r[r.id];if(e){e.setAttribute('fill',regFill(C,r,i));const ow=regionOwner(C,r),changed=ow!==C.name&&!isMe(ow);e.setAttribute('stroke',changed?'#f5d889':'rgba(0,0,0,.38)');e.setAttribute('stroke-width',changed?'1.15':'.35')}});const o=WMAP.el.o[C.iso];if(o){const w=C.name&&S.wars.some(x=>x.n===C.name);o.setAttribute('stroke',w?'#ff5c66':'#0b1218');o.setAttribute('stroke-width',w?'1.6':'.7');o.setAttribute('class',w?'warpulse':'')}});
 drawOcc(svg);drawTerritoryLabels(svg);drawCityMarkers(svg)}
/* Подписи территорий: у каждого владельца отдельная подпись на каждом связном куске земли.
   Подпись стоит внутри самих областей (а не в центре страны) и пересчитывается при каждой смене границ. */
function ownerClusters(items,eps){const n=items.length,p=items.map((_,i)=>i),f=i=>{while(p[i]!==i){p[i]=p[p[i]];i=p[i]}return i},order=items.map((_,i)=>i).sort((a,b)=>items[a].q.x0-items[b].q.x0);
 for(let oi=0;oi<n;oi++){const i=order[oi],a=items[i].q;for(let oj=oi+1;oj<n;oj++){const j=order[oj],b=items[j].q;if(b.x0>a.x1+eps)break;if(a.y0<=b.y1+eps&&b.y0<=a.y1+eps){const x=f(i),y=f(j);if(x!==y)p[x]=y}}}
 const m={};items.forEach((it,i)=>{const k=f(i);(m[k]||(m[k]=[])).push(it)});return Object.values(m)}
function clusterSpot(g){let wt=0,x=0,y=0,bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
 g.forEach(v=>{const q=v.q,a=Math.max(.5,q.w*q.h);wt+=a;x+=q.cx*a;y+=q.cy*a;bx0=Math.min(bx0,q.x0);by0=Math.min(by0,q.y0);bx1=Math.max(bx1,q.x1);by1=Math.max(by1,q.y1)});
 x/=wt;y/=wt;
 if(!g.some(v=>inside(x,y,v.q.polys))){let bd=1e18,nx=x,ny=y;g.forEach(v=>{const d=(v.q.cx-x)**2+(v.q.cy-y)**2;if(d<bd){bd=d;nx=v.q.cx;ny=v.q.cy}});x=nx;y=ny}
 return{x,y,w:bx1-bx0,h:by1-by0}}
const ownerLabel=o=>isMe(o)?myName():String(o).startsWith('Вассал: ')?String(o).slice(8):String(o);
function drawTerritoryLabels(svg){
 // Названия стран скрыты на карте мира: подписи перекрывали провинции на мобильных экранах.
 // Владельца территории игрок по-прежнему видит в карточке после нажатия на провинцию.
 const old=svg.querySelector('#territory-labels');if(old)old.remove();
 return;
 const NS='http://www.w3.org/2000/svg';let g=svg.querySelector('#territory-labels');if(!g){g=document.createElementNS(NS,'g');g.id='territory-labels';g.setAttribute('pointer-events','none');svg.appendChild(g)}g.replaceChildren();
 const groups={};
 Object.values(GEO.c).forEach(C=>{(C.regs||[]).forEach(r=>{if(!r.d||!Number.isFinite(r.cx)||!Number.isFinite(r.cy))return;const b=r.cell&&r.cell.length>2?rbox(r.cell):[r.cx-1,r.cy-1,r.cx+1,r.cy+1],q={cx:r.cx,cy:r.cy,x0:b[0],y0:b[1],x1:b[2],y1:b[3],w:b[2]-b[0],h:b[3]-b[1],polys:[r.cell||[]]};const o=regionOwner(C,r);(groups[o]||(groups[o]=[])).push({C,r,q})})});
 Object.entries(groups).forEach(([owner,items])=>{const label=ownerLabel(owner);if(!label)return;
  ownerClusters(items,1.2).forEach(cl=>{const sp=clusterSpot(cl),txt=label.length>18?label.slice(0,17)+'…':label,fs=Math.max(2.4,Math.min(9,sp.w/(txt.length*.62)));
   const t=document.createElementNS(NS,'text');t.setAttribute('x',sp.x);t.setAttribute('y',sp.y);t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','central');t.setAttribute('class','territory-country-label');t.setAttribute('style','font-size:'+fs.toFixed(2)+'px');t.textContent=txt;g.appendChild(t)})})
}
function drawOcc(svg){
 const NS='http://www.w3.org/2000/svg',ids=[].concat(...S.wars.map(w=>w.occ||[]));
 let g=svg.querySelector('#occl');
 if(!g){const d=document.createElementNS(NS,'defs');d.innerHTML=`<pattern id="occhatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="${MYC}" opacity=".22"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="${MYC}" stroke-width="1"/></pattern>`;svg.appendChild(d);g=document.createElementNS(NS,'g');g.id='occl';g.setAttribute('pointer-events','none');svg.appendChild(g)}
 g.replaceChildren();
 ids.forEach(id=>{const e=WMAP.el&&WMAP.el.r[id];if(!e)return;const p=document.createElementNS(NS,'path');const gg=geoOf(e);p.setAttribute('d',gg?gg.d:(e.getAttribute('d')||''));p.setAttribute('fill-rule','evenodd');p.setAttribute('fill','url(#occhatch)');p.setAttribute('stroke',MYC);p.setAttribute('stroke-width','.5');g.appendChild(p)})}
function buildWorldNode(){const cl=[],body=[];Object.values(GEO.c).forEach(C=>{cl.push(`<clipPath id="c-${C.iso}"><path d="${C.d}"/></clipPath>`);
 const inner=C.regs.some(r=>r.d)?C.regs.map((r,i)=>r.d?`<path data-r="${r.id}" data-c="${C.iso}" d="${r.d}" fill="${regFill(C,r,i)}" stroke="rgba(0,0,0,.38)" stroke-width=".35"/>`:'').join(''):`<path data-r="${C.iso}:0" data-c="${C.iso}" d="${C.d}" fill="#26323f"/>`;
 body.push(`<g ${C.regs.some(r=>r.d)?`clip-path="url(#c-${C.iso})"`:''}>${inner}</g><path class="terrain-grain" d="${C.d}" fill="url(#terrainTexture)" opacity=".24" pointer-events="none"/><path data-o="${C.iso}" d="${C.d}" fill="none" stroke="#0b1218" stroke-width=".7" stroke-linejoin="round" style="pointer-events:none"/>`)});
 if(!WMAP.rs){WMAP.rs=1;window.addEventListener('resize',()=>{if(WMAP.node)wzApply()})}const n=document.createElement('div');n.className='wmnode';n.innerHTML=`<svg viewBox="0 0 ${GEO.W} ${GEO.H}" preserveAspectRatio="none" shape-rendering="auto" style="touch-action:pan-y;will-change:transform"><defs>
 <linearGradient id="oceanGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071521"/><stop offset=".48" stop-color="#102b3b"/><stop offset="1" stop-color="#07131f"/></linearGradient>
 <radialGradient id="oceanGlow"><stop offset="0" stop-color="#2c7180" stop-opacity=".22"/><stop offset="1" stop-color="#0a1c2a" stop-opacity="0"/></radialGradient>
 <pattern id="oceanTexture" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M0 12 Q10 7 21 12 T42 12 M-8 31 Q2 26 13 31 T34 31" fill="none" stroke="#6fc3d1" stroke-opacity=".09" stroke-width=".7"/></pattern>
 <pattern id="terrainTexture" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M-3 15 Q4 7 10 12 T22 5 M2 20 L8 14" fill="none" stroke="#f5e7c5" stroke-opacity=".42" stroke-width=".65"/><circle cx="4" cy="4" r=".8" fill="#fff" fill-opacity=".28"/></pattern>
 <style>.far [data-r]{stroke:none}</style>${cl.join('')}</defs>
 <rect class="ocean-base" width="${GEO.W}" height="${GEO.H}" fill="url(#oceanGradient)"/>
 <rect class="ocean-lines" width="${GEO.W}" height="${GEO.H}" fill="url(#oceanTexture)"/>
 <ellipse cx="${GEO.W*.51}" cy="${GEO.H*.48}" rx="${GEO.W*.44}" ry="${GEO.H*.52}" fill="url(#oceanGlow)"/>
 ${body.join('')}</svg><div class="wzoom"><button onclick="H.wz('in')">＋</button><button onclick="H.wz('out')">−</button><button onclick="H.wz('reset')">⟲</button><button onclick="H.wz('full')" id="wfull">⛶</button></div>`;
 const svg=n.querySelector('svg');svg.classList.add('far');WMAP.node=svg;WMAP.box=n;WZ={x:0,y:0,w:GEO.W,h:GEO.H};
 const ptr=new Map();let gs=null;const rc=()=>svg.getBoundingClientRect();
 const startG=()=>({V0:{...WZ},pts:[...ptr.values()].map(p=>({...p})),moved:0,V1:null,multi:ptr.size>1});
 const c2=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)||1});
 const showT=(V0,V1,r)=>{const u0=r.width/V0.w,k=V0.w/V1.w;svg.style.transformOrigin='0 0';svg.style.transform=`translate(${(V0.x-V1.x)*u0*k}px,${(V0.y-V1.y)*u0*k}px) scale(${k})`};
 const commit=()=>{if(gs&&gs.V1){WZ=gs.V1;svg.style.transform='';wzApply()}};
 svg.addEventListener('pointerdown',e=>{WMAP.busy=Date.now()+1500;ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});try{svg.setPointerCapture(e.pointerId)}catch(_){}gs=startG()});
 svg.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId)||!gs)return;ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});const r=rc(),V0=gs.V0,u0=r.width/V0.w,cur=[...ptr.values()];let V1;
  if(cur.length>=2&&gs.pts.length>=2){gs.multi=true;gs.moved=999;const a0=c2(gs.pts[0],gs.pts[1]),a1=c2(cur[0],cur[1]),s=a1.d/a0.d,w1=V0.w/s,u1=r.width/w1,wx=V0.x+(a0.x-r.left)/u0,wy=V0.y+(a0.y-r.top)/u0;V1={w:w1,h:w1*asp(),x:wx-(a1.x-r.left)/u1,y:wy-(a1.y-r.top)/u1}}
  else{const dx=cur[0].x-gs.pts[0].x,dy=cur[0].y-gs.pts[0].y;gs.moved=Math.max(gs.moved,Math.abs(dx)+Math.abs(dy));if(gs.moved<=6)return;V1={w:V0.w,h:V0.h,x:V0.x-dx/u0,y:V0.y-dy/u0}}
  gs.V1=wzFit(V1);showT(V0,gs.V1,r);WMAP.busy=Date.now()+1500});
 const up=e=>{if(!ptr.has(e.pointerId))return;const tap=gs&&!gs.multi&&gs.moved<=6&&e.type==='pointerup';ptr.delete(e.pointerId);if(tap){const t=document.elementFromPoint(e.clientX,e.clientY),city=t&&t.closest&&t.closest('[data-city]'),r=t&&t.closest&&t.closest('[data-r]');gs=null;if(city&&window.NovaSystems&&NovaSystems.openCity){NovaSystems.openCity(Number(city.getAttribute('data-city')));if(window.CitySat)CitySat.decorate(city.getAttribute('data-town'));return}const fcity=t&&t.closest&&t.closest('[data-fc]');if(fcity&&window.CitySat){gs=null;CitySat.tapForeign(fcity);return}if(r)H.cc(r.getAttribute('data-c'));return}
  commit();gs=ptr.size?startG():null};
 svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
 svg.addEventListener('wheel',e=>{e.preventDefault();H.wz(e.deltaY<0?'in':'out')},{passive:false});return n}
let WZ={x:0,y:0,w:1000,h:575};
const asp=()=>{const r=WMAP.node&&WMAP.node.getBoundingClientRect();return r&&r.width>0?r.height/r.width:GEO.H/GEO.W};
function wzFit(v){v.w=Math.max(12,Math.min(GEO.W,v.w));v.h=v.w*asp();v.x=v.w>=GEO.W?(GEO.W-v.w)/2:Math.max(0,Math.min(GEO.W-v.w,v.x));v.y=v.h>=GEO.H?(GEO.H-v.h)/2:Math.max(0,Math.min(GEO.H-v.h,v.y));return v}
function wzApply(){WZ=wzFit(WZ);WMAP.node.classList.toggle('far',WZ.w>GEO.W*.4);WMAP.node.setAttribute('viewBox',`${WZ.x} ${WZ.y} ${WZ.w} ${WZ.h}`);try{if(window.CitySat)CitySat.refresh(WMAP.node,WZ,GEO.W)}catch(e){}WMAP.node.style.touchAction=(WMAP.full||WZ.w<GEO.W-1)?'none':'pan-y'}
const hwz=m=>{if(!WMAP.node)return;if(m==='full'){WMAP.full=!WMAP.full;const sl=document.getElementById('wm-slot');if(sl)sl.classList.toggle('full',!!WMAP.full);document.body.style.overflow=WMAP.full?'hidden':'';const b=document.getElementById('wfull');if(b)b.textContent=WMAP.full?'✕':'⛶';return wzApply()}if(m==='reset'){WZ={x:0,y:0,w:GEO.W,h:GEO.H}}else{const f=m==='in'?.6:1/.6,cx=WZ.x+WZ.w/2,cy=WZ.y+WZ.h/2;WZ.w*=f;WZ.h*=f;WZ.x=cx-WZ.w/2;WZ.y=cy-WZ.h/2}wzApply()};
function worldMapCard(){return card('🌍 Карта мира',`<div id="wm-slot" class="wmslot"><p class="muted" style="padding:12px">Строится карта мира…</p></div><p class="muted"><b id="province-total">Провинции: подсчёт…</b><br>Нажмите на страну, чтобы открыть её провинции. Внутри страны можно выбирать провинции на карте или через поиск. Перетаскивайте карту и приближайте кнопками ＋ −. Красный контур — страна, с которой вы воюете.</p>`)}
function mountWorldMap(){if(!document.getElementById('wm-slot'))return;wmLoad(ok=>{const sl=document.getElementById('wm-slot');if(!sl)return;if(!ok){sl.innerHTML='<p class="muted" style="padding:12px">Не удалось загрузить карту мира (нет интернета или библиотека заблокирована).</p>';return}
 if(!WMAP.box)buildWorldNode();if(sl.firstChild!==WMAP.box)sl.replaceChildren(WMAP.box);sl.classList.toggle('full',!!WMAP.full);const fb=document.getElementById('wfull');if(fb)fb.textContent=WMAP.full?'✕':'⛶';const pc=document.getElementById('province-total');if(pc)pc.textContent=`Провинций на карте: ${Number(window.NOVARIA_PROVINCE_COUNT||0).toLocaleString('ru-RU')}`;updateWorld()})}
/* --- окно страны: регионы, выбор региона для захвата --- */
const CC={iso:null,pick:false,war:null,query:''};
const hcc=iso=>{CC.iso=iso;CC.pick=false;CC.war=null;CC.sel={};CC.query='';ccDraw()};
const hpick=n=>{CC.iso=wi(n).iso;CC.pick=true;CC.war=n;CC.sel={};CC.query='';ccDraw()};
const hccClose=()=>{const m=document.getElementById('ccm');if(m)m.remove()};
const warCauseOptions=r=>{
 const out=[['territorial','🗺 Территориальные претензии']];
 if(nearTo(r.name)&&(+r.value||0)<=15)out.push(['border','🚧 Пограничный конфликт']);
 const mine=S.ideology||'прагматизм',theirs=r.ideology||(window.GrandDiplomacy?GrandDiplomacy.orientation(r):'прагматизм');
 if(mine!==theirs&&(+r.value||0)<=-15)out.push(['ideology','⚖️ Идеологический конфликт']);
 if(S.sanc&&S.sanc[r.name]&&S.sanc[r.name].left>0)out.push(['economic','📉 Экономический конфликт']);
 if((+r.value||0)<=-10)out.push(['security','🛂 Кризис защиты граждан и дипломатической миссии']);
 return out;
};
const goalHint=g=>({tribute:'Победа даёт контрибуцию или вассала. Дешевле всего по политической власти.',territory:'Победа позволяет забрать область (при перевесе от 60%, +1 область к квоте). Можно указать нужную область.',regime:'Победа позволяет сменить власть: в стране придёт дружественное правительство. Режим нужно поддерживать. Нужен другой политический курс или отношения ≤ −30.'})[g]||'';
H.goalUi=(i,fromCause)=>{const c=document.getElementById('warcause-'+i),g=document.getElementById('wargoal-'+i),r=document.getElementById('warregion-'+i),h=document.getElementById('warhint-'+i);if(!c||!g)return;if(fromCause&&window.GrandDiplomacy)g.value=GrandDiplomacy.defaultGoal(c.value);if(r)r.style.display=(c.value==='territorial'||g.value==='territory')?'':'none';if(h)h.textContent=goalHint(g.value)};
function warCauseControl(i,r,atWar,j){
 if(atWar)return '<span class="muted">⚔️ Идёт война</span>';
 const cause=S.justCause&&S.justCause[r.name],label=window.GrandDiplomacy&&GrandDiplomacy.CAUSES[cause]?GrandDiplomacy.CAUSES[cause].label:'';
 if(j!=null&&cause){return j>0?`<span class="muted">🌐 ${label}: ${(['','протест','требования','ультиматум'])[S.justStage&&S.justStage[r.name]||0]||'кризис'} · ещё ${j} мес.</span>`:`<button class="danger" onclick="H.declare(${i})">⚔️ Объявить войну · ${label}</button>`}
 const opts=warCauseOptions(r);
 const regions=(window.WORLD_SEEDS&&WORLD_SEEDS[r.name]||[]);const regionUI=regions.length?`<select id="warregion-${i}"><option value="">Выберите область для претензии</option>${regions.map(x=>`<option value="${String(x.n).replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}">${x.n}</option>`).join('')}</select>`:`<input id="warregion-${i}" maxlength="80" placeholder="Введите название области для претензии">`;const GD0=window.GrandDiplomacy,firstCause=opts[0]&&opts[0][0],g0=GD0?GD0.defaultGoal(firstCause):'tribute',goalOpts=GD0?GD0.GOAL_IDS.map(k=>`<option value="${k}" ${k===g0?'selected':''}>${GD0.GOALS[k].icon} Цель: ${GD0.GOALS[k].label}</option>`).join(''):'';
 return `<div class="wg-box"><select id="warcause-${i}" onchange="H.goalUi(${i},1)">${opts.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select><select id="wargoal-${i}" onchange="H.goalUi(${i})">${goalOpts}</select>${regionUI.replace('<select ','<select style="'+((firstCause==='territorial'||g0==='territory')?'':'display:none')+'" ').replace('<input ','<input style="'+((firstCause==='territorial'||g0==='territory')?'':'display:none')+'" ')}<small class="muted wg-hint" id="warhint-${i}">${GD0?goalHint(g0):''}</small><button class="primary" onclick="H.justify(${i},document.getElementById('warcause-${i}').value,document.getElementById('warregion-${i}').value,document.getElementById('wargoal-${i}').value)">🌐 Начать дипломатический кризис</button></div>`;
}

const htake=rid=>{const w=S.wars.find(x=>x.n===CC.war);if(!w)return;CC.sel=CC.sel||{};const Q=quota(CC.war,w);if(CC.sel[rid])delete CC.sel[rid];else{if(Object.keys(CC.sel).length>=Q.q)return toast(`При фронте ${Math.round(Q.p)}% можно взять не больше ${Q.q} обл.`);CC.sel[rid]=1}ccDraw()};
const hauto=()=>{const w=S.wars.find(x=>x.n===CC.war);if(!w)return;const Q=quota(CC.war,w);CC.sel={};[...(regsOf(CC.war)||[])].filter(x=>!taken()[x.id]).sort((a,b)=>((b.n===w.claimRegion?1:0)-(a.n===w.claimRegion?1:0))||(((w.occ||[]).includes(b.id)?1:0)-((w.occ||[]).includes(a.id)?1:0))||b.s-a.s).slice(0,Q.q).forEach(x=>CC.sel[x.id]=1);ccDraw()};
const hconfirm=()=>{const n=CC.war,ids=Object.keys(CC.sel||{});if(!ids.length)return toast('Выберите хотя бы одну область');H.ccClose();H.dictate(n,'region',ids)};
function pickHead(){const w=S.wars.find(x=>x.n===CC.war);if(!w)return '';const Q=quota(CC.war,w),n=Object.keys(CC.sel||{}).length;return `<p><b>Фронт ${Math.round(Q.p)}% → можно взять до ${Q.q} из ${Q.free} свободных областей.</b> Нажимайте области на карте. Выбрано: ${n}/${Q.q}</p><div class="actions"><button class="good" onclick="H.confirm()">🗺 Забрать выбранные (${n})</button><button onclick="H.auto()">⚡ Выбрать крупнейшие</button></div>`}
function ccDraw(){const C=GEO.c[CC.iso];if(!C||!C.name){return}const nm=C.name,i=S.relations.findIndex(r=>r.name===nm),r=S.relations[i]||{},W=wi(nm),atWar=S.wars.some(w=>w.n===nm),j=S.just[nm],tk=taken();
 const BB=C.vb||C.bb,pad=14,bw=BB[2]-BB[0],bh=BB[3]-BB[1],vb=`${BB[0]-pad} ${BB[1]-pad} ${bw+2*pad} ${bh+2*pad}`,fs=Math.max(bw,bh*1.5)/(C.regs.length>24?58:C.regs.length>14?44:30),bigR=labelSet(C.regs,fs);
 const reg=C.regs.some(x=>x.d)?C.regs:[{id:C.iso+':0',n:nm,s:100,res:W.res,d:C.d,cx:(C.bb[0]+C.bb[2])/2,cy:(C.bb[1]+C.bb[3])/2}];
 const svg=`<svg viewBox="${vb}" style="width:100%;max-height:56vh;min-height:220px;background:#0c1a26;border-radius:12px;touch-action:manipulation"><defs><clipPath id="ccc"><path d="${C.d}"/></clipPath></defs><g clip-path="url(#ccc)">${reg.map((x,k)=>{const mine=tk[x.id]||r.annexed||isMe(regionOwner(C,x)),free=CC.pick&&!mine,sel=CC.sel&&CC.sel[x.id],fill=sel?'#ffd34d':mine?MYC:isVas(nm)?VAS:baseCol(C.iso,k),act=free?`style="cursor:pointer" onclick="H.take('${x.id}')"`:'';return `<path d="${x.d}" fill="${fill}" stroke="#0b1218" stroke-width="${Math.max(.7,fs/12)}" ${act}><title>${x.n}</title></path>${free?`<path d="${x.d}" fill="none" stroke="transparent" stroke-width="8" vector-effect="non-scaling-stroke" pointer-events="stroke" onclick="H.take('${x.id}')"/>`:''}`}).join('')}</g><path d="${C.d}" fill="none" stroke="#e8d8a0" stroke-width="${Math.max(1,fs/9)}" stroke-linejoin="round" style="pointer-events:none"/>${reg.length>1?reg.filter(x=>bigR.has(x.id)).map(x=>`<text x="${x.cx}" y="${x.cy}" text-anchor="middle" style="font-size:${fs}px;font-weight:700;fill:#fff;paint-order:stroke;stroke:#0b1218;stroke-width:${fs/5}px;pointer-events:none">${x.n.replace(/ \(.*\)/,'').slice(0,22)}</text>`).join(''):''}</svg>`;
 const rows=reg.map(x=>{const mine=tk[x.id]||r.annexed||isMe(regionOwner(C,x)),pop=(W.pop||0)*x.s/100,ps=pop>=1?pop.toFixed(1):(pop*1000).toFixed(0)+' тыс.';return `<div class="mini province-row" data-prov-row data-prov-name="${escA(x.n.toLowerCase())}"><b>${mine?'🏴':'🗺'} ${x.n}</b><br>${x.s.toFixed(2)}% страны · ${pop>=1?ps+' млн':ps} · ${resIcons(x.res)}<br>${mine?'<small class="muted">Под вашим контролем</small>':CC.pick?`<button class="${CC.sel&&CC.sel[x.id]?'good':'danger'} province-pick" onclick="H.take('${x.id}')">${CC.sel&&CC.sel[x.id]?'✔ Выбрана (снять)':'Выбрать провинцию'}</button>`:'<small class="muted">Свободна</small>'}</div>`}).join('');
 let acts='';if(r.self)acts='<span class="muted">🏠 Это ваше государство</span>';else if(!CC.pick){const prog=(S.relPrograms||{})[nm];acts=(prog?`<span class="muted">🤝 Программа активна: ещё ${prog.monthsLeft} мес.</span>`:`<button class="primary" onclick="H.relProgram(${i});ccDraw()">🤝 Улучшать отношения 4 года · 40 ⭐</button> `)+warCauseControl(i,r,atWar,j);}
 const html=`<div class="ccbox"><button class="ccx" onclick="H.ccClose()">✕</button><h3>${nm}</h3><p class="muted">${CONTN[W.cont]||''} · ${r.trait||''} · ${reg.length.toLocaleString('ru-RU')} провинций${r.annexed?' · <b>аннексирована</b>':''}</p>${CC.pick?pickHead():`<p>${mood(r.value||0)} · мощь ${r.power||'—'} · население ${W.pop>=1?W.pop.toFixed(W.pop>=10?0:1)+' млн':Math.round((W.pop||0)*1000)+' тыс.'}</p>`}${svg}<div class="actions" style="margin:8px 0">${acts}</div><h4>Провинции</h4><input id="province-search" class="province-search" type="search" value="${escA(CC.query||'')}" placeholder="🔎 Найти провинцию по названию…" oninput="H.ccSearch(this.value)"><div class="province-count" id="province-count">Показано ${reg.length.toLocaleString('ru-RU')} из ${reg.length.toLocaleString('ru-RU')}</div><div class="cards cc-province-list">${rows}</div></div>`;
 let m=document.getElementById('ccm');if(!m){m=document.createElement('div');m.id='ccm';m.className='ccm';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)H.ccClose()})}m.innerHTML=html;hccSearch(CC.query||'')}
/* --- карта страны игрока (настоящий контур Украины, области от центров) --- */
function cmBuild(){if(WMAP.cm!==undefined)return WMAP.cm;WMAP.cm=null;const C=GEO.c.UKR;if(!C)return null;
 const W=760,H=500,bw=C.bb[2]-C.bb[0],bh=C.bb[3]-C.bb[1],s=Math.min(W*.94/bw,H*.94/bh),ox=(W-bw*s)/2-C.bb[0]*s,oy=(H-bh*s)/2-C.bb[1]*s,tp=p=>[p[0]*s+ox,p[1]*s+oy];
 const pts=OBL.map(o=>tp(PRJ(o[2],o[3]))),cl=vcells(pts,[-60,-60,W+60,H+60]);
 WMAP.cm={d:C.polys.map(p=>p.map(r=>ringD(r.map(tp))).join('')).join(''),cells:cl.map(c=>c.length>2?'M'+c.map(f1).join('L')+'Z':''),pts,W,H,cap:tp(PRJ(30.52,50.45))};return WMAP.cm}
/* подписи на карте: у крупных регионов, без наложения друг на друга */
function labelSet(regs,fs){if(regs.length<=14)return new Set(regs.map(r=>r.id));const out=new Set(),pl=[];[...regs].sort((a,b)=>b.s-a.s).forEach(r=>{if(out.size<30&&pl.every(p=>Math.hypot(p.cx-r.cx,p.cy-r.cy)>fs*4.5)){out.add(r.id);pl.push(r)}});return out}
/* к какой из моделируемых областей игрока относится регион карты: своя, а иначе ближайшая */
function modelFor(C,r,i,n){const k=S.regions.findIndex(x=>x.geo===r.id);if(k>=0)return S.regions[k];let best=null,bd=1e18;S.regions.forEach(m=>{if(!m.geo)return;const q=C.regs.find(z=>z.id===m.geo);if(!q)return;const d=(q.cx-r.cx)**2+(q.cy-r.cy)**2;if(d<bd){bd=d;best=m}});return best||S.regions[i%n]}
function cmGeneric(){const w=wi(S.me),C=w.iso&&GEO.c[w.iso];if(!C||!C.regs.some(r=>r.d))return null;const pad=10,bw=(C.vb||C.bb)[2]-(C.vb||C.bb)[0],bh=(C.vb||C.bb)[3]-(C.vb||C.bb)[1],fs=Math.max(bw,bh*1.5)/(C.regs.length>24?48:30),n=S.regions.length,big=labelSet(C.regs,fs);let P='',T='';
 C.regs.forEach((r,i)=>{if(!r.d)return;const m=modelFor(C,r,i,n),lost=(S.lost||[]).includes(m.name);
  P+=`<path d="${r.d}" fill="${lost?'#3a3d44':loyColor(m.loyalty)}" stroke="#0d1519" stroke-width="${fs/12}" stroke-linejoin="round"><title>${r.n.replace(/ \(.*\)/,'')}: лояльность ${Math.round(m.loyalty)}%. Ресурсы: ${[...new Set(String(r.res||'').split(''))].map(k=>RIC[k]+' '+RLAB[k]).join(', ')}</title></path>`;
  if(C.regs.length>1&&big.has(r.id))T+=`<text x="${r.cx}" y="${r.cy}" text-anchor="middle" style="font-size:${fs}px;font-weight:700;fill:#101418;pointer-events:none">${r.n.replace(/ \(.*\)/,'').slice(0,18)}</text><text x="${r.cx}" y="${r.cy+fs*1.05}" text-anchor="middle" style="font-size:${fs*.9}px;pointer-events:none">${resIcons(r.res)}</text>`});
 return `<svg class="hoimap" viewBox="${(C.vb||C.bb)[0]-pad} ${(C.vb||C.bb)[1]-pad} ${bw+2*pad} ${bh+2*pad}"><defs><clipPath id="ukc"><path d="${C.d}"/></clipPath></defs><g clip-path="url(#ukc)">${P}</g><path d="${C.d}" fill="none" stroke="#e8d8a0" stroke-width="${fs/8}" stroke-linejoin="round"/>${T}</svg>`}
function cmSvg(){if(S.me&&S.me!=='Новария')return cmGeneric();const c=cmBuild();if(!c)return null;let P='',T='';
 OBL.forEach((o,i)=>{if(!c.cells[i])return;const r=S.regions.find(x=>x.name===o[4]),lost=(S.lost||[]).includes(o[4]);
  P+=`<path d="${c.cells[i]}" fill="${lost?'#3a3d44':loyColor(r?r.loyalty:50)}" stroke="#0d1519" stroke-width="1.6" stroke-linejoin="round"><title>${o[1]} область (${o[4]}): лояльность ${r?Math.round(r.loyalty):'—'}%. Ресурсы: ${[...new Set(o[5].split(''))].map(k=>RIC[k]+' '+RLAB[k]).join(', ')}</title></path>`;
  T+=`<text x="${c.pts[i][0]}" y="${c.pts[i][1]}" text-anchor="middle" style="font-size:13px;font-weight:700;fill:#101418;pointer-events:none">${o[0]}</text><text x="${c.pts[i][0]}" y="${c.pts[i][1]+14}" text-anchor="middle" style="font-size:12px;pointer-events:none">${resIcons(o[5])}</text>`});
 const nc=(S.captured||[]).length;
 return `<svg class="hoimap" viewBox="0 0 ${c.W} ${c.H}"><defs><clipPath id="ukc"><path d="${c.d}"/></clipPath></defs><g clip-path="url(#ukc)">${P}</g><path d="${c.d}" fill="none" stroke="#e8d8a0" stroke-width="2.2" stroke-linejoin="round"/>${T}<circle cx="${c.cap[0]}" cy="${c.cap[1]}" r="6" fill="#d9a62e" stroke="#101418" stroke-width="2"><title>Столица</title></circle><text x="14" y="${c.H-14}" class="maptxt2" style="fill:#e8d8a0;font-size:14px">${nc?`Захвачено: ${nc} (см. карту мира и список ниже)`:'Цвет области — лояльность'}</text></svg>`}
setTimeout(()=>wmLoad(()=>{}),300);setTimeout(()=>{try{if(!localStorage.getItem('novariaSave')&&!window.__NG_MP)H.chooser()}catch(e){}},700);
function mountCountryMap(){wmLoad(ok=>{if(!ok)return;const old=document.querySelector('svg.hoimap');if(!old)return;let s=null;try{s=cmSvg()}catch(e){}if(!s)return;const t=document.createElement('div');t.innerHTML=s;old.replaceWith(t.firstChild)})}
function empireSvg(){
 const me=myName(),own=[],rowIso={};
 Object.values(GEO.c).forEach(C=>{if(!C.name)return;C.regs.forEach((r,i)=>{const o=regionOwner(C,r),vas=String(o).startsWith('Вассал: ');if(isMe(o)||vas){own.push({C,r,i,o,vas,q:regClip(C,r)});rowIso[C.iso]=1}})});
 const shown=own.filter(v=>!v.q.fb);
 if(!own.length)return '<p class="muted">Своя вымышленная страна не лежит на карте мира. Когда захватите области или сделаете страну вассалом, они появятся здесь.</p>';
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;(shown.length?shown:own).forEach(v=>{const q=v.q;x0=Math.min(x0,q.x0);y0=Math.min(y0,q.y0);x1=Math.max(x1,q.x1);y1=Math.max(y1,q.y1)});
 const pw=Math.max(30,(x1-x0)*.1),ph=Math.max(18,(y1-y0)*.1);x0-=pw;x1+=pw;y0-=ph;y1+=ph;
 const sw=(x1-x0)/900,fs0=(x1-x0)/38,esc2=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 let P='',T='',nA=0,nV=0;const rest={};
 Object.values(GEO.c).forEach(C=>{const b=C.bb;if(!b||b[2]<x0||b[0]>x1||b[3]<y0||b[1]>y1)return;
  if(!rowIso[C.iso]){P+=`<path d="${C.d}" fill="#1b2733" stroke="#0b1218" stroke-width="${sw}"/>`;return}
  C.regs.forEach((r,i)=>{const o=regionOwner(C,r),q=regClip(C,r),vas=String(o).startsWith('Вассал: '),mine=isMe(o);if(mine&&C.name!==me)nA++;if(vas)nV++;if(!q||!q.d||q.fb)return;
   P+=`<path d="${q.d}" fill-rule="evenodd" fill="${mine?MYC:vas?VAS:'#26323f'}" stroke="rgba(0,0,0,.35)" stroke-width="${sw*.5}"><title>${esc2((r.n||C.name).replace(/ \(.*\)/,''))}${mine?' — '+esc2(me):vas?' — вассал':' — '+esc2(ownerLabel(o))}</title></path>`;
   if(!mine&&!vas&&q.cx>x0&&q.cx<x1&&q.cy>y0&&q.cy<y1)(rest[o]||(rest[o]=[])).push({C,r,q})});
  P+=`<path d="${C.d}" fill="none" stroke="#e8d8a0" stroke-width="${sw*1.3}" stroke-linejoin="round" pointer-events="none"/>`});
 const lab=(txt,sp)=>{const t=txt.length>18?txt.slice(0,17)+'…':txt,f=Math.max(fs0*.45,Math.min(fs0,sp.w/(t.length*.62)));return `<text x="${sp.x}" y="${sp.y}" text-anchor="middle" dominant-baseline="central" style="font-size:${f}px;font-weight:700;fill:#fff;paint-order:stroke;stroke:#0b1218;stroke-width:${f/5}px;pointer-events:none">${esc2(t)}</text>`};
 const mineItems=shown.filter(v=>!v.vas),vasByC={};shown.filter(v=>v.vas).forEach(v=>(vasByC[v.C.iso]||(vasByC[v.C.iso]=[])).push(v));
 ownerClusters(mineItems,1.2).forEach(cl=>{T+=lab(me,clusterSpot(cl))});
 Object.values(vasByC).forEach(a=>ownerClusters(a,1.2).forEach(cl=>{T+=lab(a[0].C.name+' 👑',clusterSpot(cl))}));
 Object.entries(rest).forEach(([o,items])=>ownerClusters(items,1.2).forEach(cl=>{T+=lab(ownerLabel(o),clusterSpot(cl))}));
 return `<svg viewBox="${x0} ${y0} ${x1-x0} ${y1-y0}" style="width:100%;max-height:50vh;background:#0c1a26;border-radius:12px">${P}${T}</svg><div class="maplegend"><span><i style="background:${MYC}"></i>моя страна и захваченные области (захвачено: ${nA})</span><span><i style="background:${VAS}"></i>вассалы (${nV} обл.)</span><span><i style="background:#26323f"></i>не захвачено</span></div>`}
function empireCard(){return card('🧭 Моя держава','<div class="emp-slot"><p class="muted">Строится карта…</p></div><p class="muted">Захваченные и аннексированные области закрашиваются вашим цветом. Вассалы — светлым оттенком, и у них закрашены все области страны.</p>')}
function mountEmpire(){const sl=document.querySelector('.emp-slot');if(!sl)return;wmLoad(ok=>{const e=document.querySelector('.emp-slot');if(!e)return;const sig=ownSig();if(e.dataset.sig===sig&&e.firstChild&&e.querySelector('svg'))return;e.dataset.sig=sig;e.innerHTML=ok?empireSvg():'<p class="muted">Не удалось загрузить карту мира (нужен интернет).</p>'})}
function capList(){const c=S.captured||[];if(!c.length)return card('🗺 Захваченные территории','<p class="muted">Пока ничего не захвачено. Победите в войне — и отнятые области или аннексированные страны появятся здесь и на карте.</p>');
 const reg=c.filter(z=>!z.full),ann=c.filter(z=>z.full),tp=c.reduce((a,z)=>a+(z.pop||0),0);
 const row=z=>`<div class="mini ${z.full?'':''}"><b>${z.full?'🏴':'🗺'} ${String(z.name).replace(/^Земли /,'')}</b>${z.full?'Аннексия страны':'Отторгнутая область'} · у: ${z.from}<br>${(z.regs&&z.regs.length)?'Области: '+z.regs.join(', ')+'<br>':''}Население: ${fmt(z.pop||0)}<br>Ресурсы: ${resIcons(z.res)||'—'} ${[...new Set(String(z.res||'').split(''))].map(k=>RLAB[k]).filter(Boolean).join(', ')}</div>`;
 return card(`🗺 Захваченные территории: ${reg.length} обл. · ${ann.length} стран · +${fmt(tp)} чел.`,`<div class="cards">${c.map(row).join('')}</div>`)}
function mapHtml(){let P='',T='';MAPR.forEach(m=>{let r=S.regions.find(x=>x.name===m[0])||((S.lost||[]).includes(m[0])?{loyalty:0,unrest:0,lost:1}:{loyalty:50,unrest:0});P+=`<polygon points="${m[1]}" fill="${r.lost?'#3a3d44':loyColor(r.loyalty)}" stroke="#0d1519" stroke-width="3" stroke-linejoin="round"><title>${m[0]}: лояльность ${Math.round(r.loyalty)}%, недовольство ${Math.round(r.unrest)}%</title></polygon>`;T+=`<text x="${m[2]}" y="${m[3]}" text-anchor="middle" class="maptxt">${m[0].toUpperCase()}</text><text x="${m[2]}" y="${m[3]+17}" text-anchor="middle" class="maptxt2">${r.lost?'потеряно':'лояльность '+Math.round(r.loyalty)+'%'}</text>`});return `<svg class="hoimap" viewBox="0 0 760 560" role="img" aria-label="Карта страны: цвет региона показывает лояльность"><defs><pattern id="mg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity=".05"/></pattern></defs><rect width="760" height="560" fill="url(#mg)"/>${P}${T}${capHtml()}${SEA}</svg><div class="maplegend"><span><i style="background:#6f8a55"></i>высокая лояльность</span><span><i style="background:#a0a257"></i>средняя</span><span><i style="background:#9a5a45"></i>низкая</span></div>`}
function warnBanner(){if(S.out)return'';if(S.grace>0)return `<section class="panel wide okbanner">🛡 Защитный срок: отставка не грозит ещё ${S.grace} мес.</section>`;if(S.crisis>0)return `<section class="panel wide warnbanner">⚠ Угроза отставки: ${S.crisisWhy||''}. Критическое состояние уже ${S.crisis} мес. подряд. ${ADVICE[S.crisisIdx]||'Нужно срочно исправить ситуацию.'} ${isPopular()?'(Тебя любят — отставка наступит позже.)':''}</section>`;return''}
function bar(label,val){return `<div class="meter"><b>${label}: ${fmt(val)}%</b><div class="bar"><i style="width:${clamp(val)}%;background:${val<30?"linear-gradient(90deg,#c23b4b,#ff7b86)":val<55?"linear-gradient(90deg,#c9902f,#f5c76a)":"linear-gradient(90deg,#2aa56d,#7ee6ae)"}"></i></div></div>`}
function stats(){let a=[[IC.money,'Казна',fmt(S.money)+' млн'],[IC.gdp,'ВВП',fmt(S.gdp)+' млрд'],[IC.pop,'Население',fmt(S.pop)],[IC.stab,'Стабильность',Math.round(S.stability)+'%'],[IC.appr,'Одобрение',Math.round(S.approval)+'%'],[IC.army,'Армия',fmt(S.army)],['⭐','Пол. власть',Math.floor(S.pp)]].concat(S.warCiv>0?[['🏘','Жертвы мирных',fmt(S.warCiv)]]:[]).concat(fxStat());$('#stats').innerHTML=a.map(x=>`<div class="stat">${x[0]}<div><small>${x[1]}</small><b>${x[2]}</b></div></div>`).join('');$('#clock').textContent=`${S.year} год · ${months[S.month]}`;$('#runstate').textContent=running?'Идёт время':'Пауза';$('#play').classList.toggle('active',running)}
function card(title,body){return `<section class="panel"><h2>${title}</h2>${body}</section>`}
function systemicEconomyCard(){return systemicEconomyCard0()+(window.EconCore&&EconCore.panelHtml?EconCore.panelHtml(S):'')}function systemicEconomyCard0(){const x=S._systemic&&S._systemic.last;if(!x)return card('Единая модель экономики','<p class="muted">Расчёты начнутся после следующего игрового месяца.</p>');return card('Единая модель экономики',`<div class="cards"><div class="mini">Выпуск экономики<b>${fmt(x.output)} млн</b></div><div class="mini">Налоговые поступления<b>${fmt(x.taxRevenue)} млн</b></div><div class="mini">Потребление населения<b>${fmt(x.consumption)} млн</b></div><div class="mini">Военные затраты<b>${fmt(x.militaryCost)} млн</b></div><div class="mini">Рост ВВП за месяц<b>${x.growth}%</b></div><div class="mini">Обеспеченность ресурсами<b>${Math.round(x.resourceFactor*100)}%</b></div></div><p class="muted">Выпуск зависит от промышленности, занятости, сырья и инфраструктуры регионов. Дефицит ресурсов снижает производство; мобилизация сокращает рабочую силу; война повышает расходы и ухудшает политические показатели.</p>${econLedgerHtml()}`)}
function econLedgerHtml(){const L=S._econ&&S._econ.last;if(!L)return'';const nm={diplomacy:'Дипломатия и торговля',addons:'Политика, проекты, разведка',currency:'Валюта',systemic:'Системная модель',interdep:'Отрасли и склады',warEcon:'Военная экономика'};const rows=Object.keys(L.stages).map(k=>{const r=L.stages[k];return`<tr><td>${nm[k]||k}</td><td>${r.gdp>0?'+':''}${r.gdp}%</td><td>${r.money>0?'+':''}${fmt(r.money)}</td><td>${r.infl>0?'+':''}${r.infl}</td></tr>`}).join('');let __ex='';try{__ex=EconCore.explain(S)}catch(e){}return`${__ex}<h3 style="margin:10px 0 4px">Журнал месяца</h3><table class="tbl"><tr><th>Подсистема</th><th>ВВП</th><th>Казна</th><th>Инфл.</th></tr>${rows}</table><p class="muted">Итог роста ВВП: <b>${L.final}%</b> (расчёт ${L.raw}%, ${L.note}). Ставка по долгу: ${L.debtRate}% годовых. Проценты выплачены: ${fmt(L.interest)} млн.</p>`}
function renderCore(auto){if(window.__salv)return;if(tab==='events')tab='overview';stats();if(auto&&tab==='map'&&WMAP.node&&document.getElementById('wm-slot')){updateWorld();mountEmpire();return}if(auto&&tab==='mp'&&window.NGMP)return;if(auto&&(down||(document.activeElement&&document.activeElement.type==='range')))return;let c='';if(tab==='map')c=empireCard()+worldMapCard()+capList()+(window.NovaSystems?NovaSystems.mapSummary(S):''); if(tab==='recovery')c=window.NovaSystems?NovaSystems.panel(S):card('Восстановление','Модуль не загружен');
if(tab==='overview')c=`<div class="grid">${warnBanner()}${warPanel()}${quickAccessCard()}${card('🗺 Карта державы','<div class="emp-slot"><p class="muted">Строится единая карта…</p></div><p class="muted">Ваши земли и все аннексированные территории показаны одним цветом; вассалы — отдельным оттенком.</p>')}${capList()}${card('Государство',`<div class="cards"><div class="mini"><b>${S.name}</b>Форма правления: ${S.gov}<br>Лидер: ${S.leader}<br>Партия: ${S.party}<br>Сложность: <b>${difficulty().label}</b><div class=\"actions\"><button onclick=\"H.chooser()\">🌍 Выбрать другое государство</button></div></div><div class="mini"><b>Состояние страны</b>${bar('Стабильность',S.stability)}${bar('Одобрение',S.approval)}${bar('Легитимность',S.legitimacy)}</div></div>`)}${card('Национальные ресурсы',`<div class="cards">${[['Продовольствие',S.food],['Топливо',S.fuel],['Сталь',S.steel],['Вооружение',S.equipment],['Боеприпасы',S.ammo],['Энергия',S.energy],['Технологии',S.tech]].map(x=>`<div class="mini"><b>${x[0]}</b>${x[1]} / 100<div class="bar"><i style="width:${clamp(x[1])}%"></i></div></div>`).join('')}</div>`)}${card('Последние события',`<div class="log">${S.log.slice(0,9).map(x=>`<div>${x}</div>`).join('')}</div>`)}${card('Быстрые действия',`<div class="actions"><button onclick="act('roads')">Построить дороги (500 млн)</button><button onclick="act('aid')">Помощь населению (300 млн)</button><button onclick="act('reform')">Государственная реформа (700 млн)</button></div>`)}</div>`;
if(tab==='economy')c=`<div class="grid">${card('Экономика',`<div class="cards"><div class="mini">Доходы в месяц <b>${fmt(income())} млн</b></div><div class="mini">Расходы в месяц <b>${fmt(expenses())} млн</b></div><div class="mini">Государственный долг <b>${fmt(S.debt)} млн</b></div><div class="mini">Инфляция <b>${(+S.inflation).toFixed(1)}%</b></div></div>${bar('Занятость',S.employment)}<div class="row"><button onclick="act('industry')">Развивать промышленность · 800 млн</button><button onclick="act('trade')">Торговое соглашение · 200 млн</button><button onclick="act('debt')">Погасить 1000 млн долга</button></div>`)}${card('Бюджетные настройки',`<div class="row"><label>Налоговая ставка <b id="taxv">${S.tax}%</b></label><input type="range" min="5" max="50" value="${S.tax}" oninput="setv('tax',this.value,'taxv','%')"></div><div class="row"><label>Здравоохранение <b id="healthv">${S.health}%</b></label><input type="range" min="0" max="35" value="${S.health}" oninput="setv('health',this.value,'healthv','%')"></div><div class="row"><label>Образование <b id="educationv">${S.education}%</b></label><input type="range" min="0" max="35" value="${S.education}" oninput="setv('education',this.value,'educationv','%')"></div><div class="row"><label>Оборона <b id="defensev">${S.defense}%</b></label><input type="range" min="0" max="45" value="${S.defense}" oninput="setv('defense',this.value,'defensev','%')"></div><button class="primary" onclick="saveBudget()">Применить бюджет</button>`)}${taxCard()}${budCard()}${systemicEconomyCard()}${window.InterDep?card('🕸 Сеть взаимозависимостей',InterDep.panel(S,'Ваша экономика: всё зависит от всего',{repair:true})):''}</div>`;
if(tab==='military')c=`<div class="grid">${warPanel()}${window.PVO?PVO.panelHTML(S,{bat:bcount('aabat'),rel,patrolOf:()=>((S.wars||[])[0]||{}).airDefense||0}):''}${card('Вооружённые силы',`<div class="cards">${[['Сухопутные войска',fmt(S.army)+' чел.'],['Флот',S.navy+' кораблей'],['Авиация',S.air+' эскадрилий'],['Подготовка',S.training+'%'],['Боевой дух',S.morale+'%'],['Комплексы ПВО',`${S.aa||0} комплексов · ${bcount('aabat')} позиций`],['Военная угроза',S.threat+'%']].map(x=>`<div class="mini">${x[0]}<b>${x[1]}</b></div>`).join('')}</div>${bar('Боевой дух',S.morale)}<div class="actions"><button onclick="act('recruit')">Набрать 5 000 солдат · 400 млн</button><button onclick="act('train')">Военные учения · 250 млн</button><button onclick="act('equipment')">Закупить вооружение · 500 млн</button><button class="primary" onclick="buildAA(1)">📡 Купить 1 комплекс ПВО · 500 млн</button><button onclick="buildAA(5)">Купить до 5 комплексов ПВО</button><button onclick="buildAA(10)">Купить до 10 комплексов ПВО</button><button onclick="act('mobilize')">Мобилизация</button><button class="danger" onclick="act('demobilize')">Сократить армию</button></div><p>Состояние: <b>${S.war?'ВОЙНА':'Мирное время'}</b></p><button class="${S.war?'good':'danger'}" onclick="act('war')">${S.wars&&S.wars.length?'Заключить мир со всеми':S.martial?'Отменить военное положение':'Ввести военное положение'}</button>`)}${card('Военные запасы',`<div class="cards">${[['Топливо',S.fuel],['Сталь',S.steel],['Вооружение',S.equipment],['Боеприпасы',S.ammo]].map(x=>`<div class="mini">${x[0]} <b>${x[1]}/100</b></div>`).join('')}</div>`)}${armsCard()}${tacticsCard()}</div>`;
if(tab==='economy')c=mergeEco(c)+warEconCard()+antiInflationCard()+(window.ECODIP?ECODIP.panel(S):'');if(tab==='military')c=mergeMil(c)+warEconCard();
if(tab==='politics')c=`<div class="grid">${card('Твоя партия',`<div class="mini party-card"><b>🎖 ${S.playerParty}</b>Ты играешь за эту партию. Если она проиграет выборы и потеряет власть — кампания будет проиграна.</div><p>Правящая партия: <b>${S.party}</b></p><p>Глава правительства: <b>${S.leader}</b></p><p>До выборов: <b>${S.election} мес.</b></p><div class="actions"><button class="good" onclick="campaignAction('rally')">Провести митинг · 250 млн</button><button onclick="campaignAction('program')">Опубликовать программу · 400 млн</button><button onclick="act('speech')">Обращение к нации</button><button onclick="act('law')">Принять социальный закон</button><button class="primary" onclick="act('election')">Провести досрочные выборы</button><button onclick="act('security')">Усилить охрану правительства</button></div>${bar('Одобрение правительства',S.approval)}${bar('Риск переворота',S.coupRisk)}${S.grace>0?`<p class="muted">🛡 Защитный срок: ещё ${S.grace} мес. — отставка не грозит</p>`:S.crisis>0?`<p class="muted">⚠️ Угроза отставки (${S.crisisWhy||''}): ${S.crisis} мес. подряд. Власть могут сменить после ${crisisNeed()}-го месяца</p>`:''}</div>`)}${card('Политические партии и парламент',`<div class="cards">${S.parties.slice().sort((a,b)=>b.support-a.support).map(p=>`<div class="mini ${p.name===S.playerParty?'party-card':''}"><b>${p.name} ${p.name===S.playerParty?'★ ТВОЯ ПАРТИЯ':''}</b>${p.ideology}<br>Поддержка: <b>${Math.round(p.support)}%</b> · Мест: ${p.seats}<div class="bar"><i style="width:${clamp(p.support)}%"></i></div></div>`).join('')}</div><p class="action-note">Рейтинг партий меняется каждый месяц в зависимости от экономики, стабильности и решений правительства.</p>`)}</div>`;
if(tab==='politics')c=mergePol(c);
if(tab==='charts')c=`<div class="grid">${card('Экономика: рост и падение',`<div class="chart-wrap"><canvas id="chartEconomy"></canvas></div><p class="action-note">ВВП, казна и государственный долг. История последних 60 месяцев.</p>`)}${card('Политика и общество',`<div class="chart-wrap"><canvas id="chartPolitics"></canvas></div><p class="action-note">Поддержка твоей партии, одобрение правительства и стабильность.</p>`)}${card('Население и ресурсы',`<div class="chart-wrap"><canvas id="chartPopulation"></canvas></div><p class="action-note">Население, продовольствие и топливо.</p>`)}</div>`;
if(tab==='regions')c=`<div class="cards">${S.regions.map((r,i)=>`<div class="mini"><b>${r.name}</b>Население: ${fmt(r.pop)}<br>Благосостояние: ${r.wealth}%<br>Лояльность: ${r.loyalty}%<br>Недовольство: ${r.unrest}%<br>Промышленность: ${r.industry}% · сельское хозяйство: ${Math.round(r.agriculture||0)}%<br>Услуги: ${Math.round(r.services||0)}% · инфраструктура: ${r.infra}%<br>Региональный выпуск: ${fmt(r.regionalGDP||0)} млн · занятость: ${Math.round(r.employment||0)}%<br>Ресурс: ${r.resource}${r.regionType?`<br>Тип региона: ${r.regionType}`:''}${Number.isFinite(r.urbanDev)?`<br>Уровень урбанизации: ${Math.round(r.urbanDev*100)}%`:''}${r.specialResources&&r.specialResources.length?`<br>Специализация: ${r.specialResources.join(', ')}`:''}${r.enemyOccupied?`<br><b class="dn">⚑ Оккупирована войсками ${r.enemyOccupiedBy||'противника'}</b>`:''}<div class="actions"><button onclick="regionAct(${i},'invest')">Инвестиции · 250 млн</button><button onclick="regionAct(${i},'aid')">Помощь · 100 млн</button><button onclick="regionAct(${i},'police')">Порядок</button></div></div>`).join('')}</div>`;
if(tab==='diplomacy')c=`<div class="grid">${vassalPanel()}${regimePanel()}${aiPanel()}${aiResPanel()}${card('🌐 Дипломатия и отношения',wlPanel('dip'))}</div>`;
if(tab==='documents')c=`<div class="grid">${card('Государственные документы',`<div class="row"><input id="docname" placeholder="Название документа"><select id="doctype"><option>Указ</option><option>Закон</option><option>Бюджет</option><option>Военный приказ</option><option>Дипломатическая нота</option></select></div><textarea id="doctext" rows="5" style="width:100%" placeholder="Текст документа..."></textarea><button class="primary" onclick="createDoc()">Подписать и сохранить</button>`)}${card('Архив документов',S.documents.length?S.documents.map((d,i)=>`<div class="choice"><b>${d.type}: ${d.name}</b><small class="muted"> · ${d.date}</small><p>${d.text}</p><button onclick="deleteDoc(${i})">Удалить</button></div>`).join(''):'Пока документов нет.')}</div>`;
if(tab==='events')c=`<div class="grid">${card('События государства',S.event?`<h3>${S.event.title}</h3><p>${S.event.text}</p><div class="actions"><button class="primary" onclick="resolveEvent(0)">${S.event.a}</button><button onclick="resolveEvent(1)">${S.event.b}</button></div>`:'<p>Сейчас нет неразрешённых событий.</p>')}${card('Хроника',`<div class="log">${S.log.map(x=>`<div>${x}</div>`).join('')}</div>`)}</div>`;
if(tab==='settings')c=`<div class="grid">${card('Сложность кампании',`<p>Выбери, насколько трудно удерживать власть и развивать государство. Сложность применяется только к <b>новой кампании</b>, текущую игру она не меняет.</p><div class="row"><label for="difficultySelect">Уровень сложности</label><select id="difficultySelect" onchange="setDifficulty(this.value)"><option value="story" ${selectedDifficulty==='story'?'selected':''}>История — очень легко</option><option value="easy" ${selectedDifficulty==='easy'?'selected':''}>Лёгкая</option><option value="normal" ${selectedDifficulty==='normal'?'selected':''}>Нормальная</option><option value="hard" ${selectedDifficulty==='hard'?'selected':''}>Сложная</option><option value="expert" ${selectedDifficulty==='expert'?'selected':''}>Эксперт</option></select></div><div class="mini"><b>Текущая сложность: ${difficulty().label}</b><br>Доходы ×${difficulty().income.toFixed(2)} · расходы ×${difficulty().expenses.toFixed(2)}<br>Давление оппозиции ×${difficulty().rivalPressure.toFixed(2)}<br>Риск беспорядков ×${difficulty().unrest.toFixed(2)}</div><button class="primary" onclick="resetGame()">Начать новую кампанию на выбранной сложности</button>`)}${aiCfgCard()}${card('Сохранение',`<p>Прогресс автоматически сохраняется на этом устройстве.</p><button class="good" onclick="save();toast('Игра сохранена')">Сохранить сейчас</button> <button onclick="exportSave()">Экспортировать сохранение</button><div class="row"><input type="file" id="importfile" accept=".json"><button onclick="importSave()">Загрузить файл</button></div><p class="hint">Если файл не скачивается или не выбирается (бывает в Telegram) — используйте текст:</p><div class="actions"><button onclick="copySave()">Скопировать сохранение</button></div><textarea id="importtext" rows="3" placeholder="Вставьте сюда текст сохранения" style="width:100%;margin-top:8px"></textarea><div class="actions" style="margin-top:8px"><button onclick="importSave(true)">Загрузить из текста</button></div>`)}${card('Параметры страны',`<div class="row"><label>Название</label><input id="countryname" value="${S.name}"><button onclick="S.name=$('#countryname').value;save();render()">Изменить</button></div>`)}</div>`;
{let t=addonTab();if(t)c=t;else if(S.out)c=outBanner()+c}if(tab==='overview')c+=missionCard()+spiritsCard()+ovExtra()+card('👥 Что говорят люди',feedHtml());$('#content').innerHTML=(tab==='mp'&&window.NGMP?window.NGMP.tab():evBanner()+c);if(tab==='mp'&&window.NGMP&&window.NGMP.after)window.NGMP.after();document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));drawCharts();if(tab==='map')mountWorldMap();if(tab==='overview'||tab==='map')mountEmpire();if(S.campaignOver)showGameOver()}

function render(auto){
 try{return renderCore(auto)}
 catch(err){
  console.error('[Novaria UI] Ошибка отрисовки:',err);
  const host=document.getElementById('content');
  if(host){
   const msg=String(err&&err.message||err||'Неизвестная ошибка').slice(0,500);
   const stack=String(err&&err.stack||'').slice(0,1400);
   const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
   host.innerHTML='<section class="panel" style="border-color:#d6a34e"><h2>Не удалось отобразить игровой экран</h2><p>Игровое ядро загрузилось, но один из компонентов интерфейса вызвал ошибку. Перезагрузка страницы может помочь; сохранение игры не удаляется.</p><p><b>Ошибка:</b> '+esc(msg)+'</p><details><summary>Технические сведения</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px">'+esc(stack)+'</pre></details><button class="primary" onclick="location.reload()">Перезагрузить игру</button></section>';
  }
  return false;
 }
}
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
function income(){const occupied=Object.values(S.wars||[]).reduce((a,w)=>a+(w.occ||[]).length,0);return Math.max(100,Math.round(S.gdp*S.tax/100/12*1.12*difficulty().income*incMult()+incFlat()+occupied*22))}/* Расходы масштабируются размером экономики (ВВП), как и доходы — иначе у реальных стран
   (340 млн человек, миллионная армия) траты были в 7 раз больше налогов. Для стартовой Новарии формула та же, что и раньше. */
function econScale(){return Math.max(.1,(S.gdp||42000)/42000)}
function expenses(){
 const g=econScale();if(!S.pop0)S.pop0=S.pop;
 const pr=S.pop/Math.max(1,S.pop0)*82;
 const an=S.army/(42000*g),af=an<=1.5?an:1.5+Math.log(an/1.5)*.6;
 return Math.round((1+(S.year-1)*.025)*g*(300+pr*S.health*.025+pr*S.education*.02+S.defense*25+af*42*1.5)*difficulty().expenses)+expFlat();
}
window.setv=(k,v,id,s)=>{v=Math.round(+v);$('#'+id).textContent=v+s;S[k]=v};
window.campaignAction=(a)=>{if(S.campaignOver)return;let p=S.parties.find(x=>x.name===S.playerParty);if(!p)return;if(cdLeft(a)>0)return toast(cdMsg(a));let cost=a==='rally'?250:400;if(S.money<cost){toast('В казне недостаточно средств');return}S.money-=cost;cdSet(a,CDM[a]);p.support=clamp(p.support+(a==='rally'?3.5:5)*difficulty().playerDrift);S.approval=clamp(S.approval+(a==='rally'?1:2)*difficulty().approval);log(a==='rally'?'Партия провела предвыборный митинг.':'Партия опубликовала новую программу.');save();render();toast('Популярность твоей партии выросла')};
window.saveBudget=()=>{log('Утверждён новый государственный бюджет.');save();toast('Бюджет применён')};
window.act=(a)=>{if(blocked())return;if(S.campaignOver){toast('Кампания завершена. Начни новую игру.');return}if(cdLeft(a)>0)return toast(cdMsg(a));let cost=0,msg='';switch(a){
case'roads':cost=500;S.regions.forEach(r=>r.infra=clamp(r.infra+5));S.gdp+=150*EconCore.scale(S);msg='Начато строительство дорог.';break;
case'aid':cost=400;S.approval=clamp(S.approval+4);S.stability=clamp(S.stability+2);msg='Населению выделена помощь.';break;
case'reform':cost=700;S.tech=clamp(S.tech+5);S.employment=clamp(S.employment+2);S.approval=clamp(S.approval-1);msg='Проведена государственная реформа.';break;
case'industry':cost=800;S.gdp+=700*EconCore.scale(S);S.employment=clamp(S.employment+3);S.steel=clamp(S.steel+5);msg='Промышленность получила инвестиции.';break;
case'trade':cost=250;S.money+=190*EconCore.scale(S);S.gdp+=150*EconCore.scale(S);msg='Подписано торговое соглашение.';break;
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
}cost*=EconCore.scale(S);if(S.money<cost){toast('Недостаточно средств!');return}S.money-=cost;if(CDM[a])cdSet(a,CDM[a]);log(msg);save();render();toast(msg)};
window.regionAct=(i,a)=>{if(blocked())return;let r=S.regions[i],cost=a==='invest'?250:a==='aid'?150:80;if(cdLeft('r'+i+a)>0)return toast(cdMsg('r'+i+a));if(S.money<cost){toast('Недостаточно средств');return}cdSet('r'+i+a,a==='invest'?3:2);S.money-=cost;if(a==='invest'){r.wealth=clamp(r.wealth+7);r.infra=clamp(r.infra+5);r.industry=clamp(r.industry+4);r.productivity=clamp((r.productivity||.75)+.035,.35,1.35);r.employment=clamp((r.employment||85)+1,0,100)}if(a==='aid'){r.loyalty=clamp(r.loyalty+8);r.unrest=clamp(r.unrest-7)}if(a==='police'){r.unrest=clamp(r.unrest-10);S.stability=clamp(S.stability+1)}log(`Приняты меры в регионе ${r.name}.`);save();render()};
function relationGain(c,raw){const v=c.value||0,m=v>=80?.25:v>=60?.5:v>=30?.75:1,delta=Math.max(1,Math.round(raw*m));c.value=clamp(v+delta,-100,100);return Math.round(c.value-v)}
window.diplomacy=(i,a)=>{if(blocked())return;let r=S.relations[i];if(!r||r.self||r.annexed)return;const key='diplomacy-'+a+'-'+i;if(cdLeft(key)>0)return toast(cdMsg(key));if(S.wars.some(w=>w.n===r.name))return toast('Во время войны дипломатические действия приостановлены');const cost=a==='talk'?150:a==='trade'?350:0;if(!cost)return toast('Выберите дипломатическое действие');if(S.money<cost){toast('Недостаточно средств');return}S.money-=cost;const raw=a==='talk'?5:7,delta=relationGain(r,raw);if(a==='trade'){S.money+=150;S.gdp=Math.max(100,S.gdp+35)}cdSet(key,a==='talk'?3:5);log(`${a==='talk'?'🤝 Переговоры':'📦 Торговое соглашение'} с ${r.name}: отношения ${delta>=0?'+':''}${delta} (теперь ${Math.round(r.value)}).`);save();render()};
window.createDoc=()=>{let n=$('#docname').value.trim(),t=$('#doctext').value.trim();if(!n||!t){toast('Заполните название и текст');return}S.documents.unshift({name:n,type:$('#doctype').value,text:t,date:`${months[S.month]} ${S.year}, год`});log(`Подписан документ: ${n}.`);save();render()};
window.deleteDoc=i=>{S.documents.splice(i,1);save();render()};
/* ===== МОНЕТАРНАЯ ПОЛИТИКА И АНТИИНФЛЯЦИОННЫЙ ШТАБ ===== */
function antiInflationCard(){
 const rate=Number(S.cbRate??5),reserve=Number(S.cbReserve??8),fund=Number(S.antiInflationFund||0);
 const pressure=Math.max(0,(S.inflation||0)-5),war=atWar()?1:0;
 return card('🏦 Центральный банк и борьба с инфляцией',`<p class="muted">Инструменты действуют каждый игровой месяц. Жёсткая политика замедляет рост цен, но может тормозить кредитование и ВВП. Во время войны эффект слабее.</p><div class="cards"><div class="mini"><b>Инфляция</b><strong>${(+S.inflation).toFixed(1)}%</strong><small>${S.inflation>15?'Высокое давление на цены':S.inflation>8?'Цены растут быстрее нормы':'Цены относительно стабильны'}</small></div><div class="mini"><b>Ключевая ставка</b><strong>${rate.toFixed(1)}%</strong><small>${rate>=10?'Жёсткая денежная политика':rate<=3?'Дешёвые кредиты':'Умеренная политика'}</small></div><div class="mini"><b>Резервный фонд</b><strong>${fmt(fund)} млн</strong><small>Для закупки еды, топлива и валютных интервенций</small></div></div>
 <div class="row"><label>Ключевая ставка ЦБ <b id="cbRateVal">${rate.toFixed(1)}%</b><input type="range" min="0" max="18" step="0.5" value="${rate}" oninput="H.cbSet('cbRate',this.value,'cbRateVal','%')"></label></div>
 <div class="row"><label>Норма банковских резервов <b id="cbReserveVal">${reserve}%</b><input type="range" min="2" max="25" step="1" value="${reserve}" oninput="H.cbSet('cbReserve',this.value,'cbReserveVal','%')"></label></div>
 <div class="actions"><button class="primary" onclick="H.cbAction('intervene')">💱 Валютная интервенция · 900 млн</button><button onclick="H.cbAction('food')">🌾 Стабфонд продовольствия · 650 млн</button><button onclick="H.cbAction('competition')">🏭 Антимонопольная проверка · 400 млн</button><button onclick="H.cbAction('bond')">📉 Выпустить облигации ЦБ · стерилизация</button></div>
 <div class="mini"><b>🤖 Экономический советник нейросети</b><p class="muted">ИИ анализирует инфляцию, долг, казну, доверие рынков и войну. Он может самостоятельно менять ставку, пополнять резервы и выбирать меры стабилизации. Работает в одиночной и сетевой партии.</p><label><input type="checkbox" ${S.aiEconomicGovernor?'checked':''} onchange="H.cbAI(this.checked)"> Передать экономическую политику нейросети</label><small class="muted">${S.aiEconomicGovernor?'Советник управляет денежной политикой каждый месяц.':'Решения принимаете вы.'}</small></div>`);
}
window.H=window.H||{};
H.cbSet=(k,v,id,suffix)=>{S[k]=Number(v);const e=document.getElementById(id);if(e)e.textContent=Number(v).toFixed(k==='cbRate'?1:0)+suffix;save()};
H.cbAI=v=>{S.aiEconomicGovernor=!!v;log(v?'🧠 Экономическая политика передана нейросети.':'Экономическая политика снова под контролем правительства.');save();render()};
H.fxPolicy=v=>{if(blocked()||!['free','managed','peg'].includes(v))return;fxEnsure();fxPolicyEnsure();S.fx.policy=v;log('Центральный банк изменил валютный режим: '+({free:'свободное плавание',managed:'управляемое плавание',peg:'валютный коридор'})[v]+'.');save();render()};
H.fxReserve=()=>{if(blocked())return;if((S.money||0)<500)return toast('Нужно 500 млн в казне');fxEnsure();fxPolicyEnsure();S.money-=500;S.fx.fxReserves+=500;log('🏦 ЦБ пополнил золотовалютные резервы на 500 млн.');save();render()};
H.fxTarget=()=>{if(blocked())return;fxEnsure();fxPolicyEnsure();S.fx.fxTarget=S.fx.rate;log('🎯 ЦБ установил текущий рыночный курс как целевой.');save();render()};
H.cbAction=(a)=>{if(blocked())return;const acts={intervene:[900,()=>{S.antiInflationFund=Math.max(0,(S.antiInflationFund||0)-900);S.inflation=Math.max(0,S.inflation-1.1);S.trust=clamp(S.trust+3);if(S.fx)S.fx.rate*=.985},'ЦБ провёл валютную интервенцию'],food:[650,()=>{S.antiInflationFund=(S.antiInflationFund||0)+650;S.food=clamp(S.food+8);S.inflation=Math.max(0,S.inflation-.5)},'Создан продовольственный стабфонд'],competition:[400,()=>{S.inflation=Math.max(0,S.inflation-.35);S.trust=clamp(S.trust+2);S.gdp+=60},'Начата антимонопольная проверка'],bond:[0,()=>{const amount=Math.min(1800,Math.max(0,S.money-500));if(amount<100)return toast('В казне нет свободных средств');S.money-=amount;S.debt+=amount;S.printed=Math.max(0,(S.printed||0)-4);S.inflation=Math.max(0,S.inflation-.65);S.trust=clamp(S.trust+1.5)},'ЦБ стерилизовал часть денежной массы']};const q=acts[a];if(!q)return;if(S.money<q[0])return toast('Недостаточно средств');S.money-=q[0];q[1]();log(q[2]);save();render();toast(q[2])};

/* ================= ВОЕННЫЕ РЕЛЬСЫ: экономика на военном положении =================
   Пока включён режим и идёт война, ВВП не падает ниже уровня начала месяца (+0.2% роста от военных заказов).
   Платит за это не ВВП, а казна, цены и население: удары по экономике оплачиваются из казны, растёт инфляция,
   нормируются еда и топливо, падает одобрение. Зато растёт выпуск боеприпасов и техники. После войны режим выключается. */
const WE_COST=()=>Math.round(1200*econScale());
const WE_GROWTH=.002;
function weWar(){return atWar()||(S.mpWars||[]).length>0}   // и одиночные, и сетевые войны
function weState(){return S.we=S.we||{on:false,m:0,shield:0,hits:0,last:0,since:-99,total:0}}
function weOn(){return !!(S.we&&S.we.on&&weWar())}
function warEconAbsorbCut(cut){
 const W=weState();
 if(weOn()){W.shield+=cut;W.hits++;W.last=cut;S.money-=Math.round(cut*.30);if(S.money<0){S.debt+=-S.money;S.money=0}return S.gdp}
 return Math.max(100,S.gdp-cut);
}
function weNow(){return (S.year||1)*12+(S.month||0)}
H.warEconOn=(skipAsk)=>{
 if(blocked())return;const W=weState();
 if(W.on)return;
 if(!weWar())return toast('Военные рельсы доступны только во время войны');
 const cost=WE_COST();
 const go=()=>{if(S.money<cost)return toast('Недостаточно средств: нужно '+fmt(cost)+' млн');
  S.money-=cost;W.on=true;W.m=0;W.tail=null;W.since=weNow();S.approval=clamp(S.approval-3);S.inflation=clamp(S.inflation+.8,0,100);
  log('🏭 Страна переведена на военные рельсы: заводы работают на фронт, ВВП защищён от военных потерь.');
  try{say('Заводы перешли на военные заказы','🏭')}catch(e){}
  save();render()};
 if(skipAsk===true)return go();
 ask(`Перевести страну на военные рельсы? Стоимость: ${fmt(cost)} млн. ВВП не будет падать во время войны, но вырастут цены, нормируются еда и топливо, упадёт одобрение, а потери оплачивает казна.`,go);
};
H.warEconOff=()=>{
 const W=weState();if(!W.on)return;
 const cost=Math.round(500*econScale());S.money=Math.max(0,S.money-cost);
 W.on=false;W.since=weNow();S.inflation=clamp(S.inflation+.5,0,100);S.approval=clamp(S.approval+2);
 log(`🕊 Конверсия: заводы возвращаются к гражданской продукции (−${fmt(cost)} млн).`);
 save();render()};
function warEconTick(g0){
 const W=weState();if(!W.on)return;
 const war=weWar();
 if(!war){
  // война закончилась: ещё 3 месяца защита остаётся (плавная конверсия), чтобы не было обвала ВВП в день мира
  if(W.tail==null){W.tail=3;log('🕊 Война окончена — 3 месяца плавной конверсии, ВВП под защитой.')}
  W.tail--;
  if(S.gdp<g0){const gap=g0-S.gdp;W.shield+=gap;W.total=Math.round(W.shield);S.gdp=g0}
  if(W.tail<=0){W.on=false;W.tail=null;W.since=weNow();log('🕊 Конверсия завершена: экономика на мирных рельсах.')}
  return;
 }
 W.tail=null;W.m++;const k=econScale();
 S.ammo=clamp(S.ammo+2.2);S.equipment=clamp(S.equipment+.9);S.steel=clamp(S.steel-.3);
 S.fuel=clamp(S.fuel-.25);S.food=clamp(S.food-.2);
 S.employment=clamp(S.employment+.25,0,100);
 S.inflation=clamp(S.inflation+(S.priceControls?.12:.22),0,100);
 S.approval=clamp(S.approval-.18);
 S.money-=Math.round(140*k);
 const target=g0*(1+WE_GROWTH);
 if(S.gdp<target){const gap=target-S.gdp;W.shield+=gap;W.last=gap;S.money-=Math.round(gap*.25);S.gdp=target}
 W.total=Math.round(W.shield);
 if(S.money<0){S.debt+=-S.money;S.money=0;S.stability=clamp(S.stability-.4)}
}
/* Нейросеть-советник: учится онлайн, когда включать/выключать военные рельсы (работает, если передать политику нейросети) */
function nnWarRails(){
 if(!window.NN)return;
 const W=weState(),war=weWar(),g=Math.max(1,S.gdp);
 const wr=(S.wars||[])[0]||(S.mpWars||[])[0],prog=wr?(+wr.p||50)/100:.5;
 const x=[C01((S.inflation||0)/25),C01((S.money||0)/(g*.25)),C01((S.approval||0)/100),C01((S.stability||0)/100),C01((W.shield||0)/(g*.4)),prog,C01((S.debt||0)/(g*1.5)),W.on?1:0];
 const net=NN.get(S,'nnWarRails',8,10,2,[0,.1]);
 // обучение на результате прошлого решения
 const L=S._nnWarLast;
 if(L){const dg=(S.gdp-L.gdp)/Math.max(1,L.gdp)*100,r=NN.C(dg*.6+(S.approval-L.approval)*.04-((S.inflation||0)>15?.5:0)-(S.money<0?.5:0)-((S.stability||0)<35?.4:0),-1.5,1.5);
  NN.remember(S._nnWarBuf=S._nnWarBuf||[],{x:L.x,k:L.k,t:r},120);NN.train(net,L.x,L.k,r,.04);NN.replay(net,S._nnWarBuf,3,.02)}
 if(!war){S._nnWarLast=null;return}
 if(weNow()-(W.since||-99)<6){S._nnWarLast={x,k:W.on?1:0,gdp:S.gdp,approval:S.approval};return}
 const q=NN.predict(net,x),k=NN.choose(q,i=>i===0||(i===1&&(W.on||S.money>=WE_COST()*1.5)),.05);
 if(k===1&&!W.on){H.warEconOn(true);log('🧠 Нейросеть-советник перевела экономику на военные рельсы.')}
 else if(k===0&&W.on){H.warEconOff();log('🧠 Нейросеть-советник вернула экономику к мирному режиму.')}
 S._nnWarLast={x,k:W.on?1:0,gdp:S.gdp,approval:S.approval};
}
function C01(v){return Math.max(0,Math.min(1,Number.isFinite(+v)?+v:0))}
function warEconCard(){
 const W=weState(),war=weWar(),on=weOn(),cost=WE_COST();
 const st=on?'<b style="color:#4ade80">ВКЛЮЧЕНЫ</b>':war?'выключены':'мирное время';
 const btn=on?`<button onclick="H.warEconOff()">🕊 Вернуться к мирной экономике</button>`:`<button class="primary" ${war?'':'disabled'} onclick="H.warEconOn()">🏭 Перевести страну на военные рельсы · ${fmt(cost)} млн</button>`;
 return card('🏭 Военные рельсы',`<p class="muted">Экономика на военном положении: пока идёт война и режим включён, ВВП не падает ниже уровня начала месяца и растёт на 0.2% в месяц от военных заказов. Цена: инфляция, нормирование еды и топлива, падение одобрения, расходы казны. Удары врага по экономике оплачиваются из казны, а не из ВВП.</p>
 <div class="cards"><div class="mini"><b>Статус</b><strong>${st}</strong><small>${war?'Идёт война':'Режим доступен только во время войны'}</small></div>
 <div class="mini"><b>Защищено ВВП</b><strong>${fmt(W.shield||0)} млн</strong><small>${W.hits?`ударов поглощено: ${W.hits}`:'за всё время режима'}</small></div>
 <div class="mini"><b>Месяцев на рельсах</b><strong>${W.m||0}</strong><small>выпуск: боеприпасы +2.2, техника +0.9 в мес.</small></div></div>
 <div class="actions">${btn}</div>
 <small class="muted">🧠 Если передать экономику нейросети (карточка Центробанка), она сама выбирает, когда включать и выключать режим, и учится на результатах.</small>`);
}
function aiMonetaryGovernor(){
 if(!S.aiEconomicGovernor)return;
 try{nnWarRails()}catch(e){console.warn('nnWarRails',e)}
 const inf=Number(S.inflation)||0,trust=Number(S.trust??70),debtRatio=(S.debt||0)/Math.max(1,S.gdp),war=atWar(),cash=S.money||0;
 // Нейросетевой советник использует те же инструменты, но не душит экономику при слабом росте.
 if(inf>14&&S.cbRate<12)S.cbRate=Math.min(12,S.cbRate+1);
 else if(inf<5&&S.cbRate>3&&!war)S.cbRate=Math.max(3,S.cbRate-.5);
 if(inf>18&&trust<42&&S.cbReserve<16)S.cbReserve=Math.min(16,S.cbReserve+1);
 if(inf>12&&cash>2600&&!war&&Math.random()<.45){const spend=Math.min(350,cash-1000);S.money-=spend;S.antiInflationFund=(S.antiInflationFund||0)+spend;log('🧠 ИИ пополнил резервный фонд для сдерживания цен.');}
 if(inf>20&&S.food<45&&cash>1200){S.money-=Math.min(500,cash-500);S.food=clamp(S.food+5);S.inflation=Math.max(0,inf-.25);log('🧠 ИИ закупил продовольствие, чтобы сбить дефицит и цены.');}
 if(debtRatio>.45&&S.cbRate>6)S.cbRate=Math.max(5,S.cbRate-1); // не провоцировать долговой кризис
 try{fxEnsure();fxPolicyEnsure();const F=S.fx,dev=F.rate/F.fxTarget-1;
  if(Math.abs(dev)>.18&&F.fxReserves>900&&F.policy==='free')F.policy='managed';
  if(Math.abs(dev)<.06&&inf<9&&trust>58&&F.fxReserves>2200&&F.policy==='managed')F.policy='peg';
  if(F.policy==='peg'&&(F.fxReserves<520||war&&F.fxReserves<1100))F.policy='managed';
  if(F.policy==='free'&&Math.abs(dev)<.08&&F.fxReserves>3000&&trust>65)F.policy='managed';
 }catch(e){}
}
function monetaryTick(){
 const rate=Number(S.cbRate??5),reserve=Number(S.cbReserve??8),inf=Number(S.inflation)||0;
 // Ставка воздействует с лагом; резервы банков сдерживают кредитную экспансию.
 const rateEffect=(rate-5)*.018,reserveEffect=(reserve-8)*.012;
 S.inflation=clamp(inf-rateEffect-reserveEffect+(S.printed||0)*.0015+(S.food<25?.22:0)+(S.fuel<25?.18:0)+(atWar()?.16:0),0,100);
 if(rate>8){S.gdp=Math.max(100,S.gdp*(1-(rate-8)*.00035));S.employment=clamp(S.employment-(rate-8)*.012,50,100)}
 if(rate<3&&inf>8){S.inflation=clamp(S.inflation+.12,0,100);S.trust=clamp(S.trust-.15)}
 if(reserve>15)S.gdp=Math.max(100,S.gdp*(1-(reserve-15)*.00012));
 if(S.antiInflationFund>0&&inf>9&&!atWar()){const use=Math.min(90,S.antiInflationFund);S.antiInflationFund-=use;S.inflation=Math.max(0,S.inflation-use*.0018)}
}

function monthTick(){if(S.campaignOver)return;const __g0=S.gdp;try{EconCore.begin(S)}catch(e){}darkTick();try{townDecay()}catch(e){}S.month++;if(S.month>=12){S.month=0;S.year++}let inc=income(),exp=expenses();S.lastInc=inc;S.lastExp=exp;S.money+=inc-exp;if(S.money<0){S.debt+=Math.abs(S.money);S.money=0;S.stability=clamp(S.stability-1);S.inflation=clamp(S.inflation+.6,0,100)}else{try{EconCore.debtService(S)}catch(e){S.debt=Math.max(0,S.debt-20)}S.stability=clamp(S.stability+(S.money>4000?.12:(S.money>1000?0:-.15))+(66-S.stability)*.012)}const regionalProductivity=S.regions.length?S.regions.reduce((a,r)=>a+(Number(r.productivity)||.75)*Math.max(1,r.pop||1),0)/S.regions.reduce((a,r)=>a+Math.max(1,r.pop||1),0):.75;S.regions.forEach(r=>{r.regionalGDP=Math.max(0,Math.round(S.gdp*(r.pop/Math.max(1,S.pop))*(Number(r.productivity)||.75)));r.productivity=clamp((Number(r.productivity)||.75)+(r.infra-50)/10000+(r.industry-50)/16000-(r.unrest/10000),.35,1.35)});S.gdp=Math.max(100,S.gdp*(1+(S.tech/22000)*1.525/(1+S.gdp/80000)+(S.employment-90)/10000-(S.inflation/20000)+(regionalProductivity-.75)*.0008));S.pop=Math.max(100000,Math.round(S.pop*(1+(S.food-50)/1000000)));S.inflation=clamp(S.inflation+(S.money<1000?.3:-.15),0,100);S.food=clamp(S.food+(Math.random()*4-2)+(S.food<55?.5:0)-(S.war?2:0));S.fuel=clamp(S.fuel+(Math.random()*3-1.5)+(S.fuel<45?.4:0)-(S.war?3:0));S.energy=clamp(S.energy+(Math.random()*2-1));S.approval=clamp(S.approval+((S.money>3000?.1:-.2)+(S.inflation<10?.05:-.12))*difficulty().approval+(58-S.approval)*.02);S.legitimacy=clamp(S.legitimacy+(S.approval>50?.06:-.1)+(68-S.legitimacy)*.01);S.coupRisk=clamp(S.coupRisk+((S.stability<35?1.2:-.15)+(S.approval<25?.6:0))*difficulty().coup);S.regions.forEach(r=>{r.unrest=clamp(r.unrest+((S.stability<40?1:-.3)+(Math.random()-.5))*difficulty().unrest);r.loyalty=clamp(r.loyalty+(S.approval>50?.2:-.2));});if(S.war){S.ammo=clamp(S.ammo-2);S.equipment=clamp(S.equipment-.7);S.morale=clamp(S.morale-.4);S.threat=clamp(S.threat+1)}let my=S.parties.find(p=>p.name===S.playerParty);S.parties.forEach(p=>{let drift=(S.approval-50)*0.018+(S.stability-50)*0.008+(Math.random()-.5)*1.2;if(p.name===S.playerParty)p.support=clamp(p.support+drift*difficulty().playerDrift,2,75);else p.support=clamp(p.support-drift/(Math.max(1,S.parties.length-1))*difficulty().rivalPressure+(Math.random()-.5)*.7*difficulty().rivalPressure,2,75)});if(S.election>0)S.election--;if(S.election===0){runElection();if(S.campaignOver)return}if(S.coupRisk>85&&Math.random()<.08){S.stability=clamp(S.stability-15);S.coupRisk=25;log('Попытка переворота сорвана, правительство ослаблено!')}EconCore.stage(S,'diplomacy',()=>{if(window.ECODIP)ECODIP.tick(S)});EconCore.stage(S,'addons',()=>addonTick());EconCore.stage(S,'currency',()=>fxTick());EconCore.stage(S,'systemic',()=>{if(window.SystemicSim)SystemicSim.tick(S)});EconCore.stage(S,'novariaWorld',()=>{if(window.NovaSystems){NovaSystems.tick(S);if(S.aiEconomicGovernor)NovaSystems.aiPlan(S)}});EconCore.stage(S,'interdep',()=>{if(window.InterDep)InterDep.tickPlayer(S,atWar())});EconCore.stage(S,'warEcon',()=>warEconTick(__g0));try{const __pw=S.econ&&S.econ.war0;if(!atWar()&&__pw&&__pw.over&&!__pw.done){const __floor=__g0*1.003;if(S.gdp<__floor){S.gdp=__floor;__pw.supported=(__pw.supported||0)+1}}}catch(e){}try{EconCore.settle(S,__g0,atWar())}catch(e){console.error('EconCore.settle',e)}try{const __w=EconCore.explain(S,true);if(__w)log(__w)}catch(e){}log(`Завершён месяц. Бюджет: ${fmt(inc)} млн доходов, ${fmt(exp)} млн расходов.`);let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap());if(S.history.length>500)S.history=S.history.filter((_,i)=>i%2==0||i==S.history.length-1);save();render(true)}
window.exportSave=()=>{
 try{
  const payload={...S,exportVersion:1,exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`paint-studio-save-${S.year||1}-${String((S.month||0)+1).padStart(2,'0')}.json`;
  a.style.display='none';document.body.appendChild(a);a.click();a.remove();
  // Delay revocation: revoking immediately can cancel downloads on mobile browsers.
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('Файл сохранения подготовлен');
 }catch(err){console.error('Export save failed',err);toast('Не удалось экспортировать сохранение')}
};
window.copySave=async()=>{
 const text=JSON.stringify({...S,exportVersion:1,exportedAt:new Date().toISOString()});
 try{await navigator.clipboard.writeText(text);toast('Сохранение скопировано. Вставьте его в заметки или сообщение себе');return}catch(e){}
 const ta=$('#importtext');if(ta){ta.value=text;ta.focus();ta.select();try{document.execCommand('copy');toast('Сохранение скопировано')}catch(e){toast('Текст сохранения в поле ниже — скопируйте его вручную')}}
};
window.importSave=(fromText)=>{
 const input=$('#importfile'),ta=$('#importtext'),f=input?.files?.[0];
 const run=txt=>{
  try{
   const x=JSON.parse(String(txt||'').trim());
   if(!x||typeof x!=='object'||!Array.isArray(x.regions)||!Array.isArray(x.parties))throw new Error('Invalid save structure');
   if(x.regions.length===0||x.parties.length===0)throw new Error('Empty save');
   pause();
   S={...initial(),...x};
   delete S.exportVersion;delete S.exportedAt;
   ensure();
   selectedDifficulty=DIFFICULTIES[S.difficulty]?S.difficulty:'normal';
   if(window.NationsAI)NationsAI.init(S);
   save();render();
   toast('Сохранение успешно импортировано');
  }catch(err){console.error('Import save failed',err);toast('Файл повреждён или это не сохранение Paint Studio')}
  finally{if(input)input.value=''}
 };
 if(fromText===true||(!f&&ta&&ta.value.trim())){if(!ta||!ta.value.trim()){toast('Вставьте текст сохранения');return}run(ta.value);return}
 if(!f){toast('Сначала выберите JSON-файл или вставьте текст');return}
 const reader=new FileReader();
 reader.onerror=()=>toast('Не удалось прочитать файл');
 reader.onload=()=>run(reader.result);
 reader.readAsText(f);
};
function doReset(){stop();S=initial();S.geoV=GEOV;ensure();if(window.NationsAI)NationsAI.init(S);S.difficulty=selectedDifficulty||'normal';if(S.difficulty==='story'){S.money=26000;S.approval=72;S.stability=78;S.parties[0].support=42;S.parties[1].support=22;S.parties[2].support=19;S.parties[3].support=17}else if(S.difficulty==='easy'){S.money=22000;S.approval=67;S.stability=73;S.parties[0].support=38;S.parties[1].support=23;S.parties[2].support=20;S.parties[3].support=19}else if(S.difficulty==='hard'){S.money=14500;S.approval=54;S.stability=59;S.parties[0].support=30;S.parties[1].support=28;S.parties[2].support=22;S.parties[3].support=20}else if(S.difficulty==='expert'){S.money=10500;S.approval=47;S.stability=50;S.parties[0].support=29;S.parties[1].support=27;S.parties[2].support=24;S.parties[3].support=20}applyCountry();setupAi(selectedAi);if(window.NationsAI)NationsAI.init(S);S.history=[];let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap());save();document.getElementById('gameover')?.remove();tab='overview';render();window.scrollTo(0,0);toast('Новая кампания: '+(S.me?S.name+' · ':'')+difficulty().label)}
window.resetGame=()=>{ask('Начать новую кампанию? Текущий прогресс будет удалён.',()=>{NEWC=null;doReset()})};
function play(){if(running||S.campaignOver){if(S.campaignOver)toast('Кампания завершена — начни новую игру');return}running=true;timer=setInterval(monthTick,+$('#speed').value);stats()}
function pause(){running=false;clearInterval(timer);timer=null;stats()}
function stop(){pause();$('#speed').value='1800';toast('Время остановлено, скорость сброшена до 1×')}
$('#play').onclick=play;$('#pause').onclick=pause;$('#stop').onclick=stop;$('#step').onclick=()=>{pause();monthTick()};$('#speed').onchange=()=>{if(running){pause();play()}};
$('#tabs').onclick=e=>{let b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render()}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
/* ===== ДОПОЛНЕНИЯ v2 ===== */
let down=false;document.addEventListener('pointerdown',()=>down=true,true);['pointerup','pointercancel'].forEach(e=>document.addEventListener(e,()=>setTimeout(()=>down=false,80),true));
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
function snap(){let mp=S.parties.find(p=>p.name===S.playerParty);return{year:S.year,month:S.month,gdp:S.gdp,money:S.money,debt:S.debt,approval:S.approval,stability:S.stability,partySupport:mp?mp.support:0,pop:S.pop,food:S.food,fuel:S.fuel,inflation:S.inflation,army:S.army,threat:S.threat,employment:S.employment,trust:S.trust,t:S.year*12+S.month,war:warsAll().length?1:0,fxA:S.fx?S.fx.rate:null,fxB:S.fx?S.fx.rate*fxReal(S.fx.ref)/fxReal(S.fx.refB):null,fxMom:S.fx?S.fx.mom:null,pg:S.econ?S.econ.pg:null,lossPct:S.econ?S.econ.lossPct:0,lossCum:S.econ?S.econ.loss-(S.econ.loss0||0):0,income:S.lastInc==null?null:S.lastInc,expense:S.lastExp==null?null:S.lastExp,civDead:S.warCiv||0,soldDead:S.warSold||0,legit:S.legitimacy,coup:S.coupRisk,eGdp:(S.wars&&S.wars.length&&S.econ&&S.econ.eLast)?S.econ.eLast.g/S.econ.eLast.g0*100:null,eFx:(S.wars&&S.wars.length&&S.econ&&S.econ.eLast)?S.econ.eLast.r:null,energy:S.energy,morale:S.morale,ammo:S.ammo,equip:S.equipment}}
const C0_OLD=[['Аркания',15,65,.4,'Торговая держава'],['Белория',48,42,.2,'Дружелюбный сосед'],['Тарвия',-20,80,.8,'Милитаристы'],['Дорвин',5,55,.5,'Союз торговцев'],['Силезия',-5,38,.3,'Горная республика'],['Мерейя',25,48,.2,'Морская федерация'],['Остмарк',-35,70,.7,'Имперские амбиции']];
const C0=window.WORLD?WORLD.list.map(c=>[c.name,c.value,c.power,c.aggr,c.trait]):C0_OLD;
const WM=(window.WORLD&&WORLD.map)||{},RLAB=(window.WORLD&&WORLD.RL)||{},CONTN=(window.WORLD&&WORLD.CONT)||{};
const wi=n=>WM[n]||{cont:'xx',pop:6,inc:2,res:'f',power:40,h3:.1};
const nearTo=n=>{const w=WM[n];return !w||w.h3<.22||w.power>=60};
const RIC={f:'🌾',u:'🛢',s:'⛏',e:'⚡',q:'🏭'};
const resIcons=res=>[...new Set(String(res||'').split(''))].map(k=>RIC[k]||'').join('');
const alive=()=>S.relations.filter(r=>!r.annexed&&!r.self);

const CDM={speech:4,law:6,aid:3,trade:4,security:3,rally:2,program:4,reform:4,industry:3,roads:2,recruit:2,train:3,equipment:2,mobilize:6};
const cdLeft=k=>((S.cd||{})[k])||0;
const cdSet=(k,n)=>{S.cd=S.cd||{};S.cd[k]=n};
const cdTick=()=>{if(!S.cd)return;for(let k in S.cd)if(S.cd[k]>0)S.cd[k]--};
const cdMsg=k=>`Подождите ещё ${cdLeft(k)} мес.`;
const DN=['Иван Корнев','Мария Лозинская','Павел Рудь','Олег Баранов','Елена Ветрова','Артём Щукин','Нина Орлова','Глеб Сомов'];
window.buildAA=(qty=1)=>{if(blocked())return;qty=Math.max(1,Math.min(10,Math.floor(+qty||1)));const can=Math.min(qty,Math.floor((S.money||0)/500),Math.floor((S.equipment||0)/2));if(can<1)return toast('На каждый комплекс нужно 500 млн и 2 единицы вооружения');S.money-=500*can;S.equipment=clamp(S.equipment-2*can);S.aa=(S.aa||0)+can;S.aaSup=Math.max(0,(S.aaSup||0)-(window.BAL?BAL.me.rebuild:1.5)*can);S.threat=clamp(S.threat-can);log(`📡 Закуплено и развёрнуто комплексов ПВО: ${can}. Всего комплексов: ${S.aa}.`);save();render();toast(`Развёрнуто комплексов ПВО: ${can}`)};
/* ------------------------ АРСЕНАЛ (вкладка «Армия») ------------------------ */
const ARMS={
 cannon:{n:'Пушка',ic:'💥',c:300,pw:.5,t:'Артиллерия: на войне давит врага'},
 drone:{n:'Ударный дрон',ic:'🛩',c:250,pw:.4,t:'Дешёвый удар по врагу'},
 tank:{n:'Танк',ic:'🛡',c:450,pw:1,mil:7,eq:3,t:'Бронетехника · нужно 7+ воен. заводов'},
 aa:{n:'Комплекс ПВО',ic:'📡',c:700,pw:1.5,mil:7,eq:3,t:'Защита неба · нужно 7+ воен. заводов'},
 rocket:{n:'Ракета',ic:'🚀',c:600,pw:3,mil:8,eq:4,t:'Дальний удар · нужно 8+ воен. заводов'},
 bomb:{n:'Бомба',ic:'💣',c:900,pw:15,t:'Оружие устрашения'},
  howitzer:{n:'Гаубица',ic:'🔫',c:380,pw:.8,mil:3,eq:1,t:'Тяжёлая артиллерия · нужно 3+ воен. завода'},
  heli:{n:'Ударный вертолёт',ic:'🚁',c:520,pw:1.2,mil:5,eq:2,t:'Манёвренный удар с воздуха · нужно 5+ воен. заводов'},
  mlrs:{n:'РСЗО «Залп»',ic:'🎇',c:650,pw:2,mil:7,eq:3,t:'Залповый огонь по площадям · нужно 7+ воен. заводов'},
  cruise:{n:'Крылатая ракета',ic:'🛰',c:800,pw:4,mil:9,eq:5,t:'Точный дальний удар · нужно 9+ воен. заводов'},
  bomber:{n:'Бомбардировщик',ic:'🛫',c:1100,pw:6,mil:10,eq:6,t:'Тяжёлая авиация · нужно 10+ воен. заводов'},
  petard:{n:'Петарда',ic:'🎆',c:20,pw:0,t:'Для парада'}
};
const MT={cannon:1,drone:1,howitzer:2,tank:3,heli:3,aa:3,mlrs:4,rocket:4,cruise:5,bomber:7,bomb:9};
Object.keys(MT).forEach(k=>ARMS[k].mt=MT[k]);
const ARMK=Object.keys(ARMS);
/* Военно-промышленные предприятия: каждый завод закреплён за конкретной областью,
   имеет прочность и производит оружие в склад страны даже в мирное время. */
const MIL_FACTORY_TYPES={
 drone:{n:'Завод ударных дронов',ic:'🛩',cost:850,months:10,weapon:'drone',period:1,output:5,steel:1,fuel:1,energy:2,upkeep:3,desc:'5 дронов каждый месяц'},
 rocket:{n:'Ракетный завод',ic:'🚀',cost:1250,months:14,weapon:'rocket',period:3,output:1,steel:2,fuel:2,energy:3,upkeep:5,desc:'1 ракета каждые 3 месяца'},
 mlrs:{n:'Завод РСЗО',ic:'🎇',cost:1450,months:15,weapon:'mlrs',period:5,output:1,steel:3,fuel:3,energy:4,upkeep:6,desc:'1 установка РСЗО каждые 5 месяцев'},
 howitzer:{n:'Артиллерийский завод',ic:'🔫',cost:1100,months:12,weapon:'howitzer',period:4,output:1,steel:2,fuel:2,energy:3,upkeep:4,desc:'1 гаубица каждые 4 месяца'},
 tank:{n:'Танковый завод',ic:'🛡',cost:1800,months:18,weapon:'tank',period:5,output:1,steel:4,fuel:4,energy:5,upkeep:8,desc:'1 танк каждые 5 месяцев'},
 cruise:{n:'Завод крылатых ракет',ic:'🛰',cost:1750,months:18,weapon:'cruise',period:6,output:1,steel:4,fuel:4,energy:5,upkeep:8,desc:'1 крылатая ракета каждые 6 месяцев'},
 bomber:{n:'Авиационный завод',ic:'🛫',cost:2200,months:20,weapon:'bomber',period:8,output:1,steel:5,fuel:5,energy:7,upkeep:10,desc:'1 бомбардировщик каждые 8 месяцев'}
};
const factoryId=()=>`mf_${Math.random().toString(36).slice(2,9)}`;
H.factoryRegion=v=>{S.factoryRegion=String(v||'');save()};
H.buildFactory=(type,region)=>{
 if(blocked())return;const T=MIL_FACTORY_TYPES[type];if(!T)return;
 region=String(region||S.factoryRegion||(S.regions[0]&&S.regions[0].name)||'');
 if(window.__NG_MP&&window.NGMP&&window.NGMP.buildFactory){window.NGMP.buildFactory(type,region);return}
 if(!S.regions.some(r=>r.name===region))return toast('Выберите существующую область');
 if(S.factoryBuilds.length>=3)return toast('Одновременно можно строить не более 3 военных заводов');
 if(S.money<T.cost)return toast(`Для строительства нужно ${T.cost} млн`);
 const steelCost=Math.max(3,Math.ceil(T.steel*2)),fuelCost=Math.max(1,Math.ceil(T.fuel*1.5)),energyCost=Math.max(2,Math.ceil(T.energy*1.5));
 if(S.steel<steelCost)return toast(`Для строительства нужно ${steelCost} стали`);
 if(S.fuel<fuelCost)return toast(`Для строительства нужно ${fuelCost} топлива`);
 if(S.energy<energyCost)return toast(`Для строительства нужно ${energyCost} энергии`);
 S.money-=T.cost;S.steel=clamp(S.steel-steelCost);S.fuel=clamp(S.fuel-fuelCost);S.energy=clamp(S.energy-energyCost);
 const regionObj=S.regions.find(r=>r.name===region);S.factoryBuilds.push({id:factoryId(),type,region,region_id:regionObj&&(regionObj.geo||regionObj.id)||'',left:T.months,total:T.months});
 log(`🏗 Начато строительство: ${T.n} в области «${region}» · срок ${T.months} мес.`);save();render();toast(`Строительство начато: ${T.n}`)
};
function factoryTick(){
 S.milFactories=S.milFactories||[];S.factoryBuilds=S.factoryBuilds||[];
 S.factoryBuilds=S.factoryBuilds.filter(b=>{b.left=Math.max(0,(b.left||1)-1);if(b.left>0)return true;const T=MIL_FACTORY_TYPES[b.type];if(!T)return false;S.milFactories.push({id:b.id||factoryId(),type:b.type,region:b.region,region_id:b.region_id||'',hp:100,progress:0});log(`🏭 ${T.n} введён в строй в области «${b.region}».`);say(`${T.n} введён в строй`,'🏭');return false});
 S.milFactories.forEach(f=>{const T=MIL_FACTORY_TYPES[f.type];if(!T||f.hp<=0)return;f.progress=Math.max(0,Number(f.progress)||0);
  const missing=[];if((S.steel||0)<T.steel)missing.push('стали');if((S.fuel||0)<T.fuel)missing.push('топлива');if((S.energy||0)<T.energy)missing.push('энергии');if((S.money||0)<T.upkeep)missing.push('денег');
  if(missing.length){f.stalled=true;f.stallReason='Не хватает '+missing.join(', ');return}
  f.stalled=false;f.stallReason='';f.progress++;
  if(f.progress>=T.period){f.progress=0;S.steel=clamp(S.steel-T.steel);S.fuel=clamp(S.fuel-T.fuel);S.energy=clamp(S.energy-T.energy);S.money=Math.max(0,S.money-T.upkeep);S[T.weapon]=(Number(S[T.weapon])||0)+T.output;log(`🏭 ${T.ic} ${T.n}: −${T.steel} стали, −${T.fuel} топлива, −${T.energy} энергии, −${T.upkeep} млн; произведено ${T.output} ед. — ${ARMS[T.weapon]?.n||T.weapon}. Склад: ${Math.floor(S[T.weapon])}.`)}
 });
}
function damagePlayerFactory(regionName,power,w,side){
 const fs=(S.milFactories||[]).filter(f=>f.region===regionName&&f.hp>0);if(!fs.length)return null;
 const f=fs[Math.floor(Math.random()*fs.length)],T=MIL_FACTORY_TYPES[f.type];f.hp=Math.max(0,(f.hp||100)-Math.round(22+Math.max(.3,power||1)*16));
 const msg=f.hp<=0?`💥 Уничтожен ${T.n} в области «${regionName}»! Производство остановлено.`:`⚠️ ${T.n} в области «${regionName}» повреждён: прочность ${f.hp}%.`;
 log(msg);if(w)warNews(w,f.hp<=0?'🏭':'⚠️',msg);if(f.hp<=0){S.milFactories=S.milFactories.filter(x=>x.id!==f.id);return{destroyed:true,type:f.type,region:regionName}}
 return{destroyed:false,type:f.type,region:regionName,hp:f.hp}
}
function recordWarAttack(w,side,k,reg,down){if(!w||!reg)return;w.attacks=w.attacks||[];w.attacks.unshift({side,k,regId:reg.geo||reg.id||'',region:reg.name||reg.n||'область',down:!!down,month:S.year*12+S.month});w.attacks=w.attacks.slice(0,16)}
function enemyRegs(n){const c=(rel(n)||{}),tk=c.regTaken||[];const rg=regsOf(n);
 if(rg)return rg.filter(x=>!taken()[x.id]).map(x=>({id:x.id,n:x.n,s:x.s||10,res:String(x.res||'')}));
 const R=WORLD.REGS[n];const L=R?R.map(x=>({n:x.n,s:x.s||10,res:String(x.res||'')})):WORLD.GEN.map(x=>({n:x[0]+' · '+n,s:x[1],res:String(x[2]||'')}));
 return L.filter(x=>!tk.includes(x.n));}
const tgtWar=()=>{const i=(S.tgt&&S.tgt.wi)||0;return S.wars[i]||S.wars[0]};
window.tgtSet=(i,r)=>{S.tgt={wi:+i||0,r:r||''};save();render()};
const dmgOf=(w,rn)=>((w.dmg=w.dmg||{})[rn]=w.dmg[rn]||{mil:0,infra:0,civ:0});
/* ---------- потери населения и удары вражеского ИИ ---------- */
const popLoss=n=>{n=Math.round(n);if(!(n>0))return 0;n=Math.min(n,Math.max(0,S.pop-50000));if(n<=0)return 0;S.pop-=n;const tot=S.regions.reduce((a,r)=>a+r.pop,0)||1;S.regions.forEach(r=>{r.pop=Math.max(1000,Math.round(r.pop-n*r.pop/tot))});return n};
function warCasualties(w,a0){
 const sold=Math.max(0,a0-S.army),civ=Math.round(sold*(.25+(w.p<45?.25:0)+(w.encirclement||0)*.05)*rnd(.7,1.3));
 const ds=popLoss(sold),dc=popLoss(civ);
 w.soldDead=(w.soldDead||0)+ds;w.civDead=(w.civDead||0)+dc;S.warSold=(S.warSold||0)+ds;S.warCiv=(S.warCiv||0)+dc;
 if(w.m>12||w.p<40)S.approval=clamp(S.approval-Math.min(1.2,(ds+dc)/30000));
 if(w.m%3===0)log(`☠ Война с ${w.n}: за всё время погибло ${fmt(w.soldDead)} солдат и ${fmt(w.civDead)} мирных жителей. Население: ${fmt(S.pop)}.`);
}
/* ---------- новости войны (во вкладке войны, это НЕ события-попапы) ---------- */
const CITY={'Харьковская область':'Харьков','Киевская область':'Киев','Одесская область':'Одесса','Днепропетровская область':'Днепр','Донецкая область':'Донецк','Запорожская область':'Запорожье','Львовская область':'Львов','Николаевская область':'Николаев','Херсонская область':'Херсон','Черниговская область':'Чернигов','Сумская область':'Сумы','Полтавская область':'Полтава','Винницкая область':'Винница','Житомирская область':'Житомир','Черкасская область':'Черкассы','Кировоградская область':'Кропивницкий','Ровенская область':'Ровно','Волынская область':'Луцк','Тернопольская область':'Тернополь','Ивано-Франковская область':'Ивано-Франковск','Закарпатская область':'Ужгород','Черновицкая область':'Черновцы','Хмельницкая область':'Хмельницкий','Луганская область':'Луганск','Белгородская область':'Белгород','Курская область':'Курск','Брянская область':'Брянск','Воронежская область':'Воронеж','Ростовская область':'Ростов-на-Дону','Краснодарский край':'Краснодар','Московская область':'Подмосковье','Смоленская область':'Смоленск','Саратовская область':'Саратов','Волгоградская область':'Волгоград','Самарская область':'Самара','Свердловская область':'Екатеринбург','Новосибирская область':'Новосибирск'};
const cityOf=n=>{n=String(n||'');return CITY[n]||n.replace(/ \(.*\)/,'')};
const OUTAGE=[['⚡','нет света — подстанции разрушены'],['⚡','массовое отключение электричества'],['💧','нет воды — повреждён водопровод'],['🌉','разрушен мост, движение остановлено'],['🛢','горят нефтебазы и склады топлива'],['🚆','остановлены железные дороги'],['📡','пропала связь и интернет']];
const LS=pm=>Math.max(1,Math.min(40,Math.pow(Math.max(.5,pm)/8.2,.75))*1.6);   // множитель потерь от населения (млн)
const myLS=()=>LS(S.pop/1e6),enLS=n=>LS((wi(n).pop)||8);
/* ---------- оккупация во время войны: область занята (заштрихована нашим цветом), но станет нашей только при мире ---------- */
/* ---------- план армии и родов войск: несколько областей-целей, 4 рода войск + тыл ---------- */
const RMAX=40;
function normCmd(w){
 const cm=w.command||(w.command={});
 if(!Array.isArray(cm.regions))cm.regions=cm.region?[cm.region]:[];
 let free=null;try{free=(enemyRegs(w.n)||[]).map(x=>x.n)}catch(e){}
 if(free&&free.length)cm.regions=cm.regions.filter((n,i,a)=>free.includes(n)&&a.indexOf(n)===i);
 cm.regions=cm.regions.slice(0,RMAX);cm.region=cm.regions[0]||'';
 cm.troops=Math.max(0,Math.min(Math.floor(+cm.troops||0),Math.floor(S.army*.7)));
 if(!['focus','spread'].includes(cm.alloc))cm.alloc='focus';
 if(!['support','patrol','strategic','reserve'].includes(cm.air))cm.air='reserve';
 if(!['escort','blockade','raid','reserve'].includes(cm.navy))cm.navy='reserve';
 if(!['sabotage','recon','reserve'].includes(cm.spec))cm.spec='reserve';
 if(!['convoys','repair','reserve'].includes(cm.logi))cm.logi='reserve';
 return cm;
}
/* ежемесячные эффекты родов войск: стратегическая авиация, морские рейды, спецназ, тыл */
function branchTick(w,c){
 const cmd=normCmd(w),air=Math.max(0,+S.air||0),navy=Math.max(0,+S.navy||0),aa=c.aa!=null?c.aa:c.power/25;
 const er=(enemyRegs(w.n)||[]).slice().sort((a,b)=>b.s-a.s),tg=cmd.regions.length?cmd.regions:er.slice(0,3).map(x=>x.n),rn=tg.length?pick(tg):'';
 const pay=x=>{if(S.money>=x){S.money-=x;return true}return false};
 if(cmd.air==='strategic'&&air>0){
  if(pay(45+air*4)){
   S.fuel=clamp(S.fuel-1.5);S.ammo=clamp(S.ammo-.8);
   const k=Math.min(1.8,.5+air*.06),R=enemyEcoStrike(w,'air',k,1,rn);
   if(rn){const D=dmgOf(w,rn);D.infra=Math.min(100,D.infra+6*k)}
   const cd=Math.round(rnd(300,1100)*k*enLS(w.n));w.eCiv=(w.eCiv||0)+cd;S.warECiv=(S.warECiv||0)+cd;worldReact(w.n,'infra',k*.5);
   let lost='';if(S.air>1&&Math.random()<clamp(aa*.028-(w.recon||0)*.004,.02,.4)){S.air--;lost=' Потеряна эскадрилья.'}
   warNews(w,'🛫',`${cityOf(rn)}: стратегическая бомбардировка — ВВП врага −${R.pct.toFixed(1)}%.${lost}`);
   log(`🛫 Стратегическая авиация (${w.n}, ${rn||'тыл'}): ВВП врага −${R.pct.toFixed(1)}%, погибло ${fmt(cd)} мирных врага.${lost}`);
  }else warNews(w,'💸','Не хватает денег на вылеты стратегической авиации');
 }
 if(cmd.navy==='raid'&&navy>0){
  if(pay(30+navy*3)){
   S.fuel=clamp(S.fuel-1.2);const k=Math.min(1.4,.4+navy*.05),R=enemyEcoStrike(w,'raid',k,1,null);
   let lost='';if(S.navy>1&&c.power>45&&Math.random()<clamp(c.power*.0012,.02,.12)){S.navy--;lost=' Потерян корабль.'}
   warNews(w,'⚓',`Рейды на морских путях: ВВП врага −${R.pct.toFixed(1)}%, валюта слабеет.${lost}`);
   log(`⚓ Флот топит торговые суда ${w.n}: ВВП врага −${R.pct.toFixed(1)}%.${lost}`);
  }
 }
 if(cmd.spec==='sabotage'&&pay(60)){
  const ok=Math.random()<clamp(.42+S.training/330-(c.power>60?.08:0),.2,.8);
  if(ok){const R=enemyEcoStrike(w,'sab',1,1,rn);c.power=Math.max(10,c.power-.6);warNews(w,'🕵',`${cityOf(rn)}: диверсия на заводах и ЛЭП — ВВП врага −${R.pct.toFixed(1)}%`);log(`🕵 Диверсия в ${w.n}: ВВП врага −${R.pct.toFixed(1)}%.`)}
  else{S.legitimacy=clamp(S.legitimacy-.3);warNews(w,'🕵','Диверсионная группа раскрыта, операция сорвана')}
 }
 if(cmd.spec==='recon'){if(pay(25))w.recon=clamp((w.recon||0)+4,0,30)}else w.recon=Math.max(0,(w.recon||0)-2);
 if(cmd.logi==='convoys')pay(50),S.fuel=clamp(S.fuel-.5);
 if(cmd.logi==='repair'&&pay(60)){
  const D=S.dark||{},k0=Object.keys(D)[0];if(k0)D[k0]=Math.max(0,D[k0]-1);
  const rr=S.regions.slice().sort((a,b)=>a.infra-b.infra)[0];if(rr){rr.infra=clamp(rr.infra+1.4);rr.industry=clamp(rr.industry+.5)}
 }
}
function occupyTick(w){
 const rg=regsOf(w.n);if(!rg||!rg.length)return;
 const free=rg.filter(x=>!taken()[x.id]);
 w.occ=(w.occ||[]).filter(id=>free.some(x=>x.id===id));
 const order=w.order||'balanced',sup=w.supply==null?75:w.supply;
 const cm0=normCmd(w),shr=cm0.troops/Math.max(1,S.army),
   extra=(w.p>52&&cm0.troops>0)?(cm0.alloc==='spread'?Math.min(Math.max(0,cm0.regions.length-1),Math.floor(shr*3)):(shr>=.3?1:0)):0;   // широкий фронт берёт несколько областей сразу
  const want=Math.min(free.length,Math.floor(rg.length*Math.max(0,w.p-50)/50*(order==='attack'?.85:order==='defend'?.35:.6))+extra);
 const nm=id=>{const x=rg.find(z=>z.id===id);return x?String(x.n).replace(/ \(.*\)/,''):id};
 while(w.occ.length>want){const id=w.occ.pop();warNews(w,'🏳',`${cityOf(nm(id))}: наши войска отошли, область снова у врага`);log(`🏳 Отход из области «${nm(id)}» (${w.n}).`)}
 if(w.occ.length<want&&sup>=35){
  let pick0=null;const pref=((S.tgt&&S.wars[S.tgt.wi||0]===w&&S.tgt.r)||''),prefs=(cm0.regions&&cm0.regions.length)?cm0.regions:(pref?[pref]:[]);
  for(const pn of prefs){pick0=free.find(x=>x.n===pn&&!w.occ.includes(x.id));if(pick0)break}
  if(!pick0){   // ближайшая к нашей земле или уже занятой — как продвижение фронта
   const mine=[].concat(regsOf(S.me)||[],rg.filter(x=>w.occ.includes(x.id)));
   let best=1e18;free.forEach(x=>{if(w.occ.includes(x.id))return;const d=mine.length?Math.min(...mine.map(m=>(m.cx-x.cx)**2+(m.cy-x.cy)**2)):Math.random();if(d<best){best=d;pick0=x}})}
  if(pick0){w.occ.push(pick0.id);const n0=String(pick0.n).replace(/ \(.*\)/,'');warNews(w,'🚩',`${cityOf(n0)}: наши войска вошли в область — она заштрихована на карте`);log(`🚩 Занята область «${n0}» (${w.n}). Окончательно перейдёт к нам при мире (диктат «Области»).`)}
 }
 if(w.occ.length){ch({money:-25*w.occ.length},false);const c=rel(w.n);if(c)c.power=Math.max(10,Math.round(c.power-.15*w.occ.length))}
}
/* очередь анимаций: каждый удар врага показывается по очереди (не больше 4 за месяц) */
const FXQ=[];let fxBusy=false;
function fxPush(o){FXQ.push(o);while(FXQ.length>4)FXQ.shift();fxNext()}
function fxNext(){
 if(fxBusy||!FXQ.length)return;
 if(document.getElementById('strikeov')){setTimeout(fxNext,600);return}
 fxBusy=true;try{strikeScene(FXQ.shift())}catch(e){}
 setTimeout(function chk(){if(document.getElementById('strikeov'))setTimeout(chk,400);else{fxBusy=false;fxNext()}},1500);
}
function warNews(w,ico,t){if(window.__salv||!w)return;w.news=w.news||[];w.news.unshift({m:ico,t,d:`${months[S.month].slice(0,3)}, год ${S.year}`});w.news.length=Math.min(w.news.length,12)}
/* Удар по инфраструктуре: новость в карточке войны + отключение области на 2–4 месяца */
function infraNews(w,name,enemySide,wpn){
 const o=OUTAGE[Math.floor(Math.random()*OUTAGE.length)];
 warNews(w,o[0],`${cityOf(name)}: ${wpn?wpn+' врага — ':''}${o[1]}${enemySide?' (после нашего удара)':''}`);
 if(o[0]==='⚡'||Math.random()<.5){const D=enemySide?(w.dark=w.dark||{}):(S.dark=S.dark||{});D[name]=Math.round(rnd(2,4))}
}
/* Отключения у нас: каждый месяц давят на промышленность, энергию и настроение области; потом свет возвращают */
function darkTick(){
 const D=S.dark;if(!D)return;let n=0;
 Object.keys(D).forEach(k=>{D[k]--;const r=S.regions.find(x=>x.name===k);
  if(D[k]<=0){delete D[k];const w=(S.wars||[])[0];if(w)warNews(w,'🔧',`${cityOf(k)}: энергетики восстановили подачу света`)}
  else{n++;if(r){r.industry=clamp(r.industry-.4);r.unrest=clamp(r.unrest+.5)}}});
 if(n)S.energy=clamp(S.energy-Math.min(2,n*.25));
}
function darkTickEnemy(w){const D=w.dark;if(!D)return;Object.keys(D).forEach(k=>{D[k]--;if(D[k]<=0){delete D[k];warNews(w,'🔧',`${cityOf(k)}: у врага восстановили подачу света`)}})}
/* Гражданские потери врага от наземной войны */
function warEnemyCiv(w,d){
 const k=(Math.max(0,d)*rnd(260,640)+rnd(80,260))*enLS(w.n),c=Math.round(k*(.1+(w.encirclement||0)*.03)*(w.order==='attack'?1.35:1)*rnd(.7,1.3));
 w.eCiv=(w.eCiv||0)+c;S.warECiv=(S.warECiv||0)+c;
}

/* ---------- экономика врага: реалистичные проценты и синхронизация с aiWorld ---------- */
function aiNationOf(name){
 return (S.aiWorld&&Array.isArray(S.aiWorld.nations))?S.aiWorld.nations.find(x=>x.name===name):null;
}
function enemyEco(w){
 const n=aiNationOf(w.n);
 if(w.eco){
  if(n&&n.gdp>0){
   w.eco.g=n.gdp;
   w.eco.loss=(1-w.eco.g/w.eco.g0)*100;
  }
  return w.eco;
 }
 const W=(window.WORLD&&WORLD.map&&WORLD.map[w.n])||{},D=((window.WORLD_DATA&&WORLD_DATA.countries)||[]).find(x=>x.ru===w.n||(W.iso&&x.a===W.iso));
 const cur=window.FXD&&W.iso?FXD.cur(W.iso):'USD',ref=cur==='USD'?'EUR':'USD';
 const g0=(n&&n.gdp>0)?n.gdp:(D&&D.g?D.g:Math.max(4,Math.round(((wi(w.n).pop)||8)*4)));
 const r0=fxReal(cur)/fxReal(ref);
 return w.eco={g0,g:g0,cum:0,pend:0,loss:0,drag:0,cur,ref,r0,r:r0,step:0};
}
function enemyEcoHit(w,t,f){const E=enemyEco(w);E.pend+=({mil:.00025,infra:.0014,civ:.00045}[t]||0)*(f||1)}
/* синхронизация «индексов» экономики врага и aiWorld.nations */
function syncEnemyEcon(w){
 const E=w.eco;if(!E)return;
 const n=aiNationOf(w.n);
 if(n&&E.g>0)n.gdp=Math.max(1,E.g);
 const q=w.enemyEcon||(w.enemyEcon={gdp:100,fx:100,damage:0,months:0,hitGdp:0,hitFx:0,hitMoney:0,hits:0});
 q.gdp=Math.max(20,Math.min(100,E.g/E.g0*100));q.damage=100-q.gdp;q.fx=Math.min(500,100*E.r/E.r0);
}
/* Реалистичный урон экономике врага от ударов: учитывается насыщение целей и адаптация экономики */
function enemyEcoStrike(w,t,f,wt,rn){
 const E=enemyEco(w),c=rel(w.n)||null,n=aiNationOf(w.n);
 const K={mil:.00035,infra:.0012,civ:.00025,air:.0009,raid:.0006,sab:.0010};
 const sat=Math.max(.25,1-Math.max(0,E.loss)/45);
 const loss=Math.min(.012,(K[t]||.0005)*(f||1)*(wt==null?1:wt)*sat),cut=E.g*loss;
 E.g=Math.max(E.g0*.35,E.g-cut);E.str=(E.str||0)+cut;E.hits=(E.hits||0)+1;
 if(n)n.gdp=Math.max(1,E.g);
 E.loss=(1-E.g/E.g0)*100;E.cum+=cut/12;
 E.r*=1+Math.min(.015,loss*.75);
 if(c)c.power=Math.max(10,c.power-Math.min(1.2,loss*40));
 const q=w.enemyEcon||(w.enemyEcon={gdp:100,fx:100,damage:0,months:0,hitGdp:0,hitFx:0,hitMoney:0,hits:0});
 q.hitGdp=(q.hitGdp||0)+loss*100;q.hitFx=(q.hitFx||0)+loss*75;q.hitMoney=(q.hitMoney||0)+cut*1000;q.hits=(q.hits||0)+1;
 syncEnemyEcon(w);
 if(S.econ)S.econ.eLast={n:w.n,g0:E.g0,g:E.g,loss:E.loss,cum:E.cum,cur:E.cur,ref:E.ref,r0:E.r0,r:E.r};
 const R={pct:loss*100,cut,total:E.loss,t,rn:rn||''};w.lastEco=R;
 if(rn){const RE=(w.regEco=w.regEco||{});RE[rn]=Math.min(100,(RE[rn]||0)+loss*300)}
 return R;
}
function enemyEcoTick(w,c,d){
 const E=enemyEco(w),n=aiNationOf(w.n),occ=(w.occ||[]).length/Math.max(1,regCount(w.n)||1);
 if(E.str>1e-9){const rec=E.str*.07;E.g=Math.min(E.g0,E.g+rec);E.str-=rec}
 const allyHelp=n?Math.min(.004,(n.allies||[]).length*.0012):0;
 let dr=.0015+.0025*(w.p/100)+.0008*(w.encirclement||0)+.008*occ+E.pend-allyHelp;E.pend=0;
 dr=clamp(dr,-.003,.014);E.g*=1-dr;E.drag=dr;
 if(n)n.gdp=Math.max(1,E.g);
 E.loss=(1-E.g/E.g0)*100;E.cum+=Math.max(0,(E.g0-E.g)/12);
 c.power=Math.max(10,c.power-Math.min(.4,Math.max(0,dr)*18));
 const tgt=E.r0*Math.exp(.06+.008*Math.max(0,E.loss)+.05*(w.p/100)-allyHelp*15);
 E.r+=(tgt-E.r)*.10;E.r*=Math.exp(rnd(-.004,.004));
 const st=Math.floor(E.loss/10);
 if(st>E.step){E.step=st;const m=`Экономика ${w.n}: ВВП упал на ${Math.round(E.loss)}% от довоенного, 1 ${E.ref} = ${nf(E.r,E.r<10?2:E.r<100?1:0)} ${E.cur}`;log('📉 '+m);warNews(w,'📉',m)}
 if(S.econ)S.econ.eLast={n:w.n,g0:E.g0,g:E.g,loss:E.loss,cum:E.cum,cur:E.cur,ref:E.ref,r0:E.r0,r:E.r};
 syncEnemyEcon(w);enemyIdpTick(w,c);
}
function ecoChainText(ho){if(!window.InterDep)return '';const e=InterDep.solve(InterDep.of(ho)),low=InterDep.KEYS.map(k=>[k,e[k]]).sort((a,b)=>a[1]-b[1]).slice(0,3).filter(x=>x[1]<85);return low.length?'Просели: '+low.map(x=>`${InterDep.ICON[x[0]]} ${InterDep.NAMES[x[0]].toLowerCase()} ${Math.round(x[1])}%`).join(', ')+`. Экономика работает на ${Math.round(InterDep.gdpFactor(InterDep.of(ho))*100)}%.`:''}
function enemyIdpTick(w,c){if(!window.InterDep||aiNationOf(w.n))return;InterDep.of(w);InterDep.recover(w,{war:true});const f=InterDep.effects(w),E=enemyEco(w);if(f.stress>.02){E.g=Math.max(E.g0*.2,E.g*(1-f.stress*.028));E.loss=(1-E.g/E.g0)*100;E.r*=1+(1-f.fx)*.01;c.power=Math.max(10,c.power-(1-f.arms)*.3);syncEnemyEcon(w)}}
window.repairSector=()=>{if(blocked())return;if(!window.InterDep)return;if(!pay(300))return;S._idRepairLeft=3;log('🛠 Срочный восстановительный ремонт: 3 месяца отрасли чинятся вдвое быстрее.');toast('Ремонт запущен');save();render()};
/* ---------- мягкие меры мира против обоснованной войны (вместо санкций) ---------- */
const RTYPE={
 demarche:{n:'дипломатический протест и призыв остановить войну',tick:()=>{S.legitimacy=clamp(S.legitimacy-.04)}},
 embargo:{n:'эмбарго на поставки оружия',tick:()=>{S.equipment=clamp(S.equipment-.12);S.ammo=clamp(S.ammo-.08)}},
 tech:{n:'запрет на экспорт технологий',tick:()=>{S.tech=clamp(S.tech-.04);S.gdp*=1-.0002}},
 travel:{n:'визовые и авиаограничения',tick:()=>{S.gdp*=1-.0003}},
 assets:{n:'заморозка части резервов',once:r=>{r.frozen=Math.round(S.money*.02);S.money-=r.frozen},end:r=>{S.money+=r.frozen||0}}
};
function restrictBy(n,v){
 const c=rel(n);if(!c||(S.restr&&S.restr[n])||(S.sanc&&S.sanc[n]))return null;
 const k=pick(Object.keys(RTYPE)),r={why:v,k,left:6};(S.restr=S.restr||{})[n]=r;
 if(RTYPE[k].once)RTYPE[k].once(r);return k;
}
/* Удар врага по НАШЕЙ экономике: ВВП, курс, запасы в хранилищах. Итоги копятся в w.myHit и S.econ.hit* */
function myEcoStrike(w,t,f,reg){
 fxEnsure();
 const ind=avgReg('industry')||1;
 const rf=reg&&okn(reg.industry)?Math.min(1.6,Math.max(.6,.7+reg.industry/ind*.3)):1;
 const rhp=(reg&&reg.name&&w.myRegHit)?(w.myRegHit[reg.name]||0):0,loss=window.PVO?PVO.ecoLoss(w,t,f,rf,rhp,S):Math.min(.03,(({mil:.0004,infra:.0013,civ:.0003})[t]||.002)*f*rf),cut=S.gdp*loss,money=t==='infra'?Math.round(30*f):0;
 S.gdp=warEconAbsorbCut(cut);
 fxShock(Math.min(.03,loss*.9));
 const H0=w.myHit=w.myHit||{n:0,pct:0,cut:0,money:0,last:0};
 H0.n++;H0.pct+=loss*100;H0.cut+=cut;H0.money+=money;H0.last=loss*100;
 const E=S.econ;if(E){E.hitN=(E.hitN||0)+1;E.hitPct=(E.hitPct||0)+loss*100;E.hitCut=(E.hitCut||0)+cut;E.hitMoney=(E.hitMoney||0)+money}
 if(reg&&reg.name){const RH=(w.myRegHit=w.myRegHit||{});RH[reg.name]=(RH[reg.name]||0)+loss*100}
 if(t==='infra')storageHit(f);
 return{pct:loss*100,cut,money};
}
function enemyStrikes(w,c){
 if(!window.AIARS)return;
 AIARS.stock(c,true,S);if(c.aa==null)c.aa=window.PVO?PVO.ensure(c):Math.round(c.power/25);
 const WP=AIARS.WEAPONS,aggr=c.aggr||.5,myAA=window.PVO?PVO.myStrength(S,bcount('aabat'),w.airDefense||0):(S.aa||0)+bcount('aabat')*1.5;
 /* ИИ планирует залп: несколько единиц оружия за ход, приманки против ПВО, затем ракеты */
 const acts=AIARS.plan(S,c,{vs:'p',front:100-w.p,defAA:myAA,defStab:S.stability,aggr,war:true,months:w.m||0,allowBomb:c.power>=60&&w.p>72&&aggr>.6,allowCiv:aggr>.5||w.p>65});
 let pool=2+(S.aa||0)*2+bcount('aabat')*3,shows=[],hits=0,stopped=0;   // pool — сколько перехватов ПВО успевает сделать за месяц
 acts.forEach(act=>{
  const f=WP[act.w].f,air=WP[act.w].air,t=act.t;
  const regs=S.regions.slice().sort((a,b)=>{const sc=r=>(t==='mil'?r.industry:t==='infra'?r.infra*r.industry/60*((S.dark&&S.dark[r.name])?.55:1):r.pop/20000)*rnd(.8,1.2);return sc(b)-sc(a)});
  const planned=(w.enemyPlan&&w.enemyPlan.region)||'';
  const reg=regs.find(x=>x.name===planned)||regs[0]||{name:'страна',pop:0,industry:0,infra:0,unrest:0};
  const shf=window.PopAI?PopAI.shelter(S,reg.name):1;   // доля мирных, которые успели укрыться
  const pI=air?(window.PVO?PVO.p(myAA):Math.min(.92,(S.aa||0)*.09+bcount('aabat')*.12+(w.airDefense||0)*.006)):Math.min(.6,bcount('bunker')*.06+bcount('base')*.04);
  let caught=false;
  if(air){if(pool>0){pool-=act.decoy?1.2:1;caught=Math.random()<pI}}else caught=Math.random()<pI;
  if(caught){stopped++;if(window.PopAI)PopAI.hit(S,reg.name,t,.3*f);log(`🛡 ${air?'ПВО':'Оборона'} отразила удар врага (${AIARS.WN[act.w]} → ${AIARS.TN[t]}).`);AIARS.learn(S,act,act.decoy?.05:-.2*f);shows.push({w:act.w,reg,down:true,f});warNews(w,'🛡',`${cityOf(reg.name)}: ${AIARS.WN[act.w]} врага (цель — ${AIARS.TN[t]}) сбит${air?'а ПВО':'а обороной'}, попаданий нет`);return}
  hits++;try{townStrike(reg,t,f)}catch(e){}shows.push({w:act.w,reg,down:false,f});if(window.PopAI)PopAI.hit(S,reg.name,t,f);
  let shift=0,r=0;const ES=myEcoStrike(w,t,f,reg);shows[shows.length-1].eco=ES.pct;
  if(t==='mil'){
   shift=2.5*f*.5;const kills=Math.round(rnd(300,900)*f*myLS());S.army=Math.max(5000,S.army-kills);const d=popLoss(kills);S.warSold=(S.warSold||0)+d;w.soldDead=(w.soldDead||0)+d;
   const cd=popLoss(rnd(30,160)*f*myLS()*shf);S.warCiv=(S.warCiv||0)+cd;w.civDead=(w.civDead||0)+cd;
   S.morale=clamp(S.morale-.8*f);S.equipment=clamp(S.equipment-.8*f);S.ammo=clamp(S.ammo-.5*f);S.approval=clamp(S.approval+.4*f*Math.max(.15,(100-S.approval)/50));
   reg.industry=clamp(reg.industry-.4*f);let extra='';const mf=damagePlayerFactory(reg.name,f,w,'enemy');if(mf&&mf.destroyed)extra+=' Уничтожен специализированный военный завод!';if(Math.random()<.05*f&&S.mil>1){S.mil--;extra+=' Уничтожен базовый военный завод!'}
   r=shift/3+kills/2500;log(`💥 ${w.n}: ${AIARS.WN[act.w]} по военным целям (${reg.name}). Погибло ${fmt(kills)} солдат, ${fmt(cd)} мирных. ВВП −${ES.pct.toFixed(2)}%.${extra}`);
   warNews(w,'🎯',`${cityOf(reg.name)}: ${AIARS.WN[act.w]} врага попала по военным объектам — погибло ${fmt(kills)} солдат${extra?', '+extra.trim().toLowerCase().replace('!',''):''}`)}
  else if(t==='infra'){
   shift=1.5*f*.5;const di=Math.min(reg.infra,2.2*f),dn=Math.min(reg.industry,1.5*f);reg.infra=clamp(reg.infra-di);reg.industry=clamp(reg.industry-dn);
   S.energy=clamp(S.energy-1.2*f);S.fuel=clamp(S.fuel-.8*f);S.money=Math.max(0,S.money-Math.round(30*f));S.inflation=clamp(S.inflation+.12*f,0,100);
   const cd=popLoss(rnd(120,520)*f*myLS()*shf);S.warCiv=(S.warCiv||0)+cd;w.civDead=(w.civDead||0)+cd;
   let extra='';if(Math.random()<.04*f&&S.civ>2){S.civ--;extra=' Разрушен гражданский завод!'}
   if(window.InterDep&&AIARS.pickSector){const sa=AIARS.pickSector(S,c,S,{aggr,war:true});if(sa){const R2=InterDep.strike(S,sa.t,f,1,Math.min(.4,(S.aa||0)*.02+bcount('aabat')*.04));if(R2){act.sec=sa;act.secDrop=R2.gdpDrop;extra+=` Враг бьёт по отрасли «${InterDep.NAMES[R2.main]}» (−${Math.round(R2.pts)} п.), цепочка поставок просела.`}}}
   r=shift/3+(di+dn)*.05;log(`💥 ${w.n}: ${AIARS.WN[act.w]} по инфраструктуре (${reg.name}): дороги, энергосеть, склады. ВВП −${ES.pct.toFixed(2)}%, ремонт −${Math.round(30*f)} млн. Погибло ${fmt(cd)} мирных.${extra}`);
   infraNews(w,reg.name,false,AIARS.WN[act.w])}
  else if(t==='pvo'&&window.PVO){
   const R3=PVO.seadMe(S,act.w,f,bcount('aabat'),w.airDefense||0);if(R3.lostBattery)log(`📡 Вражеский удар уничтожил позицию ПВО. Осталось позиций: ${bcount('aabat')}.`);if(R3.destroyed)log('🚨 Наше ПВО полностью уничтожено — воздушное пространство открыто для ударов.');shift=.6*f*.5;
   if(R3.missed){r=-.1;log(`📡 ${w.n}: ${AIARS.WN[act.w]} искала наше ПВО (${reg.name}), но не нашла цели.`)}
   else{r=shift/3+R3.dmg*.35+(R3.destroyed?.35:0);const m=`${w.n}: ${AIARS.WN[act.w]} по нашему ПВО (${reg.name}) — сила ПВО ${R3.before.toFixed(1)} → ${R3.after.toFixed(1)}${R3.lostComplex?', уничтожен комплекс':''}${R3.destroyed?'. Небо открыто!':''}`;log('📡 '+m);warNews(w,'📡',m);shows[shows.length-1].pvo=R3;if(R3.destroyed)PVO.fx('dead','Наше ПВО подавлено!')}
   S.stability=clamp(S.stability-.2*f)}
  else{
   shift=.5*f*.5;const dead=Math.round(rnd(3000,9000)*f*myLS()*shf),d=popLoss(dead);S.warCiv=(S.warCiv||0)+d;w.civDead=(w.civDead||0)+d;
   reg.unrest=clamp(reg.unrest+2*f);S.approval=clamp(S.approval+.6*f*Math.max(.15,(100-S.approval)/50));S.stability=clamp(S.stability-.8*f);
   r=shift/3+(d/9000)*.25+(S.stability<42?.6:.2)*f*.5-.5;log(`💥 ${w.n}: ${AIARS.WN[act.w]} по гражданским (${reg.name}). Погибло ${fmt(d)} мирных жителей. ВВП −${ES.pct.toFixed(2)}%. Мир осуждает противника.`);
   warNews(w,'🏘',`${cityOf(reg.name)}: ${AIARS.WN[act.w]} врага ударила по жилым кварталам — погибло ${fmt(d)} мирных жителей`)}
  const ecoR=window.PVO?Math.min(BAL.eco.rewardCap,Math.max(0,ES.pct)*BAL.eco.rewardMul):0;w.p=clamp(w.p-shift,0,100);AIARS.learn(S,act,r+ecoR-.12*f);if(act.sec&&AIARS.learnSector)AIARS.learnSector(S,act.sec,(act.secDrop||0)*14-.05);
 });
 if(acts.length>1)log(`📡 ${w.n}: массированный удар — ${acts.length} ед. оружия, перехвачено ${stopped}, прошло ${hits}.`);
 /* анимация: каждый удар врага летит с ЕГО территории в ту область, куда попал (или где был сбит) */
 shows.forEach(x=>{recordWarAttack(w,'enemy',x.w,x.reg,x.down);fxPush({kind:'strike',rev:1,down:x.down,k:x.w,enemy:w.n,regId:x.reg&&x.reg.geo,title:`⚠️ ${w.n}: ${AIARS.WN[x.w]} → ${S.name}`,sub:x.down?`Сбито нашей ПВО · ${x.reg.name}`:`Попадание: область «${x.reg.name}»${x.eco!=null?` · ВВП −${x.eco.toFixed(2)}%`:''}`})});
}
const WP0={cannon:{air:false},drone:{air:true},tank:{air:false},rocket:{air:true},bomb:{air:true},howitzer:{air:false},heli:{air:true},mlrs:{air:false},cruise:{air:true},bomber:{air:true}};
const TG0={cannon:1,drone:1,tank:1,rocket:1,bomb:1,howitzer:1,heli:1,mlrs:1,cruise:1,bomber:1};
function ensure(){ensureHoi();S.milFactories=Array.isArray(S.milFactories)?S.milFactories:[];S.factoryBuilds=Array.isArray(S.factoryBuilds)?S.factoryBuilds:[];S.factoryRegion=S.factoryRegion||((S.regions&&S.regions[0]&&S.regions[0].name)||'');S.just=S.just||{};S.justCause=S.justCause||{};S.justStage=S.justStage||{};S.justGoal=S.justGoal||{};S.justRegion=S.justRegion||{};S.regimes=S.regimes||{};if(window.GrandDiplomacy){S.ideology=S.ideology||'прагматизм';(S.relations||[]).forEach(r=>{if(!r.self&&!r.ideology)r.ideology=GrandDiplomacy.orientation(r)})}if(!S.aiCfg)S.aiCfg={aggr:'normal',nn:'std',ars:'none'};if(!S.pacts)S.pacts={};if(window.AIARS)AIARS.applyCfg(S);if(!S.deps)S.deps=DN.map((n,i)=>({n,p:S.parties[i%S.parties.length].name,l:Math.round(rnd(45,80))}));if(!S.feed)S.feed=[];if(S.fund==null)S.fund=0;if(S.trust==null)S.trust=70;
C0.forEach(c=>{let r=S.relations.find(x=>x.name===c[0]);if(!r)S.relations.push(r={name:c[0],value:c[1],power:c[2]});if(r.aggr==null){r.aggr=c[3];r.trait=c[4];r.intent='Наблюдает и ждёт'}});ARMK.forEach(k=>{if(S[k]==null)S[k]=0})}
function say(t,m){if(window.__salv)return;ensure();S.feed.unshift({t,m:m||'🙂',d:`${months[S.month]} ${S.year}`});S.feed=S.feed.slice(0,40)}
const blocked=()=>{if(S.campaignOver){toast('Кампания завершена. Начни новую игру.');return true}if(S.out){toast('Вы в оппозиции — вернуться к власти можно во вкладке «Возврат»');return true}return false};
const myPower=()=>S.army/1000+S.air*1.5+S.navy*2+ARMK.reduce((a,k)=>a+(S[k]||0)*ARMS[k].pw,0);
/* ИИ не нападает на игрока без повода, из страха и из состояния кризиса (долги, слабая валюта, истощение) */
function aiMayAttackPlayer(c,me){
 const now=S.year*12+S.month,n=aiNationOf(c.name);
 if(!window.GrandDiplomacy||!n)return false;
 if(n.war||(n.exhaustion||0)>30||(n.debt||0)>n.gdp*.4||(n.fx||100)>160||(n.cooldown||0)>0)return false;
 /* У ИИ нет права начинать войну только из-за плохих отношений: нужна конкретная причина,
    предвоенная стадия кризиса и достаточная военная/экономическая готовность. */
 if((S.deterUntil||0)>now&&c.power<me*1.8)return false;
 S._gdNearPlayer=!!nearTo(c.name);
 const d=GrandDiplomacy.aiPlayerDecision(S,c,n,me);c._gdDecision=d;
 return !!d.canWar;
}
/* Последствия потери земель для побеждённой ИИ-страны: ВВП, промышленность, стабильность, курс, перемирие */
function aiLossShock(name,share,w){
 const n=aiNationOf(name);if(!n||!(share>0))return;
 share=clamp(share,.03,.9);
 const now=S.year*12+S.month;
 n.gpeak=Math.max(n.gpeak||0,n.gdp);
 n.gdp=Math.max(1,n.gdp*(1-share*.75));
 n.pop=Math.max(.01,n.pop*(1-share*.8));
 n.industry=clamp((n.industry||1)*(1-share*.5),.3,3);
 n.infrastructure=clamp((n.infrastructure||1)*(1-share*.4),.3,3);
 n.stability=clamp((n.stability||50)-8-share*30,5,96);
 n.exhaustion=clamp((n.exhaustion||0)+share*40,0,100);
 n.dmg=(n.dmg||0)+share*25;
 n.fx=clamp((n.fx||100)*(1.35+Math.min(1,share/.3)*.55),45,950);
 n.treasury=(n.treasury||0)*(1-share*.5);
 n.war=null;n.cooldown=24;n.claims=n.claims||{};n.claims[S.name||S.me||'Игрок']={severity:78,expires:(S.year||0)*12+(S.month||0)+48,detail:'Требование пересмотра территориальных потерь'};
 if(w&&w.eco)w.eco.g=n.gdp;
 /* игрок: послевоенное восстановление и эффект устрашения */
 S.deterUntil=now+12+Math.round(share*10);
 S.money+=Math.round(share*600);
 S.inflation=Math.max(0,(S.inflation||0)-share*2);
 S.approval=clamp((S.approval||50)+Math.round(share*6));
 log(`📉 Потеря земель ударила по ${name}: ВВП −${Math.round(share*75)}%, валюта обесценилась, страна не сможет воевать ~2 года. Соседи опасаются вас.`);
}
function aiTick(){let me=myPower(),trade=0,help=0,sanc=0,thr=0,cand=[];
 S.relations.forEach(c=>{if(c.annexed||c.self)return;c.power=Math.max(10,Math.round(c.power+rnd(-1,1.3)));if(window.AIARS){try{AIARS.stock(c,S.wars.some(w=>w.n===c.name),S)}catch(e){}}c.value=clamp(c.value+(c.value>0?.1:-.1)*c.aggr,-100,100);
  if(c.value>40){c.intent='Хочет дружить и торговать';if(Math.random()<.08)trade++}
  else if(me>c.power*1.5&&c.value<30){c.intent='Боится вашей силы и держит дистанцию';c.value=clamp(c.value-.4,-100,100)}
  else if(c.power>me*1.2&&c.aggr>.5&&c.value<-10){c.intent='Считает себя сильнее — давит на вас';thr++;if(!S.war&&c.value<-45&&Math.random()<.04*c.aggr&&nearTo(c.name)&&!pactOn(c.name))cand.push(c)}
  else c.intent='Наблюдает и ждёт';
  if(S.war&&c.value>50&&Math.random()<.1)help++;
  if(!S.war&&c.value<-60&&Math.random()<.05)sanc++});
 /* В мире 195 стран, поэтому события считаются с потолком: баланс не зависит от числа ботов */
 if(trade){const n=Math.min(trade,3);S.money+=150*n;log(n>1?`${n} страны закупили ваши товары: +${150*n} млн`:`Страна закупила ваши товары: +150 млн`)}
 if(thr)S.threat=clamp(S.threat+Math.min(thr,2)*1.5);
 if(help){const n=Math.min(help,2);S.money+=300*n;log(`Союзники помогают деньгами: +${300*n} млн`)}
 if(sanc){S.gdp*=Math.pow(.995,Math.min(sanc,2));log('Против вас введены торговые санкции')}
 aiBrain(cand,me);
 cand=cand.filter(c=>aiMayAttackPlayer(c,me));
 /* Отношения даже −100 не запускают войну автоматически. ИИ может напасть только отдельным решением по своим военным условиям ниже. */
 const now=S.year*12+S.month;
 /* В мультиплеере ИИ продолжает вести экономику и дипломатию, но не может
    создавать локальные войны против игрока: сетевые войны принадлежат Room на сервере. */
 if(!window.__NG_MP&&cand.length&&(!S.war||(S.wars.length===1&&weakness()>=45))&&now-(S.aiWarLast==null?-99:S.aiWarLast)>=18){cand.sort((a,b)=>(b._gdDecision?.score||0)-(a._gdDecision?.score||0));const c=cand[0],d=c._gdDecision;if(d&&d.cause){S.aiWarLast=now;c.value=Math.max(-30,c.value-30);startWar(c.name,true,d.cause.id);log(`⚔️ ${c.name} объявил вам войну. Основание: ${GrandDiplomacy.CAUSES[d.cause.id].label}. Причина: ${d.cause.detail}.`);say(`${c.name} напал на нас!`,'😱');pause()}}}
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
window.buy=(k,n)=>{if(blocked())return;const A=ARMS[k];if(!A)return;n=Math.max(1,(n|0)||1);if(A.mil&&S.mil<A.mil)return toast(`Нужно ${A.mil}+ военных заводов`);
 let can=Math.min(n,Math.floor(S.money/A.c));if(A.eq)can=Math.min(can,Math.floor(S.equipment/A.eq));
 if(can<1)return toast(S.money<A.c?'Недостаточно средств':'Не хватает вооружения на складе');
 S.money-=A.c*can;if(A.eq)S.equipment=clamp(S.equipment-A.eq*can);S[k]=(S[k]||0)+can;armFx(k,'buy');log(`Закуплено: ${A.n.toLowerCase()}${can>1?' ×'+can:''}`);
 if(k=='bomb')S.relations.forEach(r=>r.value=clamp(r.value-3*can,-100,100));
 if(can<n)toast(`Куплено ${can} из ${n}: не хватило ${S.money<A.c?'денег':'вооружения'}`);
 save();render()};
window.fire=(k,t)=>{if(blocked())return;if(!(S[k]>0))return toast('Сначала купите');if(!(t&&atWar()&&SCN[k]))armFx(k,'fire');
const TG={cannon:1,drone:1,tank:1.5,rocket:2.5,bomb:5,howitzer:1.3,heli:1.4,mlrs:2,cruise:3,bomber:4};
if(t&&TG[k]&&atWar()){
 const tEco=(window.InterDep&&InterDep.isEco(t))?t:null;if(tEco)t='infra';
 S[k]--;const f=TG[k],w=tgtWar(),A=ARMS[k],en=S.relations.find(r=>r.name===w.n),R2=v=>S.relations.forEach(r=>r.value=clamp(r.value+v,-100,100));
 const aaE=en?(window.PVO?PVO.ensure(en):(en.aa!=null?en.aa:Math.round((en.power||40)/25))):2,air=WP0[k].air;
 if(air&&en){en.aa=Math.min(14,aaE+(window.PVO?PVO.BAL.pvo.adapt:.5)*f);const nnA=aiNationOf(w.n);if(nnA)nnA.aa=en.aa}
 if(air&&Math.random()<(window.PVO?PVO.p(aaE):Math.min(.55,aaE*.045))*(1-Math.min(.5,(w.recon||0)/60))){if(window.AIARS&&AIARS.learnAA)AIARS.learnAA(S,.25);log(`🛡 ${A.n} сбит ПВО врага (${w.n}). Враг усиливает ПВО.`);toast(`${A.n} сбит ПВО врага`);{const r0=enemyRegs(w.n),w0=(S.tgt&&S.tgt.r)||'',g0=r0.find(x=>x.n===w0)||r0[Math.floor(Math.random()*r0.length)];armsFxMap(k,w.n,g0,g0?g0.n:w.n,true)}save();render();return}
 if(air&&window.AIARS&&AIARS.learnAA)AIARS.learnAA(S,-.05);
 const regs=enemyRegs(w.n),want=(S.tgt&&S.tgt.r)||'';let reg=regs.find(x=>x.n===want);const rnd0=!reg;if(!reg&&regs.length)reg=regs[Math.floor(Math.random()*regs.length)];
 const avg=regs.length?regs.reduce((a,x)=>a+x.s,0)/regs.length:10,rn=reg?reg.n:w.n;
 let wt=reg?Math.max(.6,Math.min(1.6,reg.s/avg)):1;
 if(reg){const rs=reg.res;if(t==='mil'&&/q/.test(rs))wt*=1.25;if(t==='infra'&&/[qeus]/.test(rs))wt*=1.25}
 const D0=dmgOf(w,rn);if(D0[t]==null)D0[t]=0;const worn=1-Math.min(.6,D0[t]/150);wt*=worn;D0[t]=Math.min(100,D0[t]+10*f);if(t==='mil'&&window.AIARS){const aiTarget=aiNationOf(w.n)||en;const mf=AIARS.damageFactory(S,aiTarget,rn,f);if(mf&&mf.destroyed){log(`🏭 Наш удар уничтожил ${mf.name||'военный завод'} в области «${rn}» врага.`);warNews(w,'🏭',`Наш удар уничтожил военный завод в области «${rn}»`)}}
 // Накопительный ущерб экономике противника от успешных ударов.
 // Это условная игровая модель, а не реальные денежные оценки.
 const econ=w.enemyEcon||(w.enemyEcon={gdp:100,fx:100,damage:0,months:0,hitGdp:0,hitFx:0,hitMoney:0,hits:0});
 const hit=(p,pw)=>{
  w.p=Math.max(0,Math.min(100,w.p+p*wt));
  if(en){en.power=Math.max(1,en.power-pw*wt);en.value=clamp(en.value-(t==='civ'?10:5),-100,100)}
 };
 let ER=null,PV=null;const where=` · область «${rn}»${rnd0?' (случайная)':''}`;armsFxMap(k,w.n,reg,rn);
 const rally=({mil:5,infra:4,civ:2,pvo:1.5}[t])*Math.max(.7,Math.min(1.4,f/1.5+.35))*Math.max(.15,Math.min(1,(100-S.approval)/50));
 S.approval=clamp(S.approval+rally);
 const eC=Math.round(({mil:rnd(30,250),infra:rnd(150,700),civ:rnd(3000,9000),pvo:rnd(5,40)}[t])*f*wt*enLS(w.n));w.eCiv=(w.eCiv||0)+eC;S.warECiv=(S.warECiv||0)+eC;if(eC>400)S.legitimacy=clamp(S.legitimacy-eC/60000);
 if(t==='mil'){hit(2.5*f,.3*f);S.threat=clamp(S.threat-2*f);S.morale=clamp(S.morale+1);worldReact(w.n,'mil',f);ER=enemyEcoStrike(w,'mil',f,wt,rn);log(`${A.ic} ${A.n}: удар по военным объектам врага (${w.n})${where}. Побочно погибло ${fmt(eC)} мирных жителей врага.`);say(`Разбиты военные объекты врага: ${rn}`,'🎯')}
 else if(t==='infra'){hit(1.5*f,1*f);S.threat=clamp(S.threat-.5*f);worldReact(w.n,'infra',f);ER=enemyEcoStrike(w,'infra',f,wt,rn);log(`${A.ic} ${A.n}: разрушена инфраструктура врага (${w.n})${where} — мосты, склады, энергосеть. Погибло ${fmt(eC)} мирных жителей врага.`);say(`Инфраструктура области ${rn} разрушена — экономика врага трещит`,'🏗');infraNews(w,rn,true)}
 else if(t==='pvo'){
  const R3=(en&&window.PVO)?PVO.sead(en,k,f):null;hit(.6*f,.2*f);S.threat=clamp(S.threat-.5*f);
  if(!R3)PV='Нет данных о ПВО врага';
  else if(R3.already)PV=`ПВО ${w.n} уже уничтожено — удар впустую`;
  else if(R3.missed)PV=`${A.n} не нашла радары в области «${rn}»`;
  else{PV=`ПВО врага: ${R3.before.toFixed(1)} → ${R3.after.toFixed(1)}${R3.destroyed?' — УНИЧТОЖЕНО, небо открыто':''}`;const nnP=aiNationOf(w.n);if(nnP)nnP.aa=en.aa;PVO.fx(R3.destroyed?'dead':'hit',R3.destroyed?'ПВО врага уничтожено':'ПВО врага подавлено');if(R3.destroyed){warNews(w,'📡',`${cityOf(rn)}: наш удар уничтожил ПВО врага — воздушные удары теперь проходят`);if(window.AIARS&&AIARS.learnAA)AIARS.learnAA(S,-.4)}}
  log(`${A.ic} ${A.n}: ${PV}${where}.`);say(PV,'📡')}
 else{hit(.5*f,.5*f);worldReact(w.n,'civ',f);ER=enemyEcoStrike(w,'civ',f,wt,rn);S.legitimacy=clamp(S.legitimacy-1.5*f);S.stability=clamp(S.stability-.5*f);log(`${A.ic} ${A.n}: удар по гражданским целям (${w.n})${where}. Погибло ${fmt(eC)} мирных жителей врага. Мир осуждает.`);say(`Удар по гражданским в области ${rn}: мир возмущён`,'😡');warNews(w,'🏘',`${cityOf(rn)}: наш удар по гражданским целям — погибло ${fmt(eC)} мирных жителей`)}
 
 let IDR=null;
 if(window.InterDep){const ho=aiNationOf(w.n)||w,defE=Math.min(.45,(aaE||0)*.02);
  IDR=tEco?InterDep.strike(ho,tEco,f,wt,defE):(t==='infra'?InterDep.strike(ho,'energy',f*.22,wt,defE):null);
  if(IDR){const E=enemyEco(w),nn=aiNationOf(w.n);
   if(IDR.gdpDrop>0){const cut=E.g*IDR.gdpDrop*.5;E.g=Math.max(E.g0*.2,E.g-cut);E.str=(E.str||0)+cut*.5;if(nn)nn.gdp=E.g;E.loss=(1-E.g/E.g0)*100;E.r*=1+Math.min(.05,IDR.gdpDrop*.7);syncEnemyEcon(w);if(ER){ER.pct+=IDR.gdpDrop*50;ER.total=E.loss}}
   if(tEco){const T=InterDep.TARGETS[tEco];log(`${T.n}${where}: ${InterDep.NAMES[T.main].toLowerCase()} врага повреждена на ${Math.round(100-ho.idp.h[T.main])}%. ${ecoChainText(ho)}`);say(`${T.n} врага поражена — цепочка поставок рушится`,'💥');warNews(w,'💥',`${cityOf(rn)}: удар по отрасли «${InterDep.NAMES[T.main]}» — ${ecoChainText(ho)}`)}}}
 if(ER){const ecoTxt=`ВВП врага −${ER.pct.toFixed(1)}% (−${nf(ER.cut,ER.cut<10?2:1)} млрд $), всего −${ER.total.toFixed(1)}%`;
  if(window.__salv)window.__salv.eco=(window.__salv.eco||0)+ER.pct;else{log('📉 '+ecoTxt+'.');if(ER.pct>=1.2)warNews(w,'📉',`${cityOf(rn)}: ${ecoTxt}`)}}
  if(k==='bomb'){S.threat=clamp(S.threat-10);worldReact(w.n,'bomb',f)}
 toast(PV?`${A.n} → ${rn} · ${PV}`:`${A.n} → ${rn} · ВВП врага −${ER?ER.pct.toFixed(1):'0'}% · рейтинг +${rally.toFixed(1)}%${wt<.9?' (область уже разрушена, эффект слабее)':''}`);
 save();render();return}
S[k]--;let R=v=>S.relations.forEach(r=>r.value=clamp(r.value+v,-100,100));
const FX={
 howitzer:{w:{thr:-5,mor:1,m:'🔫 Гаубицы обрушились на позиции врага',s:['Тяжёлая артиллерия работает','🔫']},p:{rel:-3,app:-1,m:'🔫 Стрельба гаубиц у границы — соседи нервничают',s:['Гаубицы у границы? Зачем?','😟']}},
 heli:{w:{thr:-5,mor:2,m:'🚁 Ударные вертолёты прошлись по колоннам врага',s:['Вертолёты работают по колоннам','🚁']},p:{rel:-2,app:1,m:'🚁 Показательные полёты вертолётов',s:['Красивое шоу вертолётов','🚁']}},
 mlrs:{w:{thr:-9,mor:1,rel:-2,m:'🎇 «Залп» накрыл скопления войск врага',s:['РСЗО дали залп — земля горит','🎇']},p:{rel:-6,app:-2,stab:-1,m:'🎇 Залп РСЗО в мирное время — соседи в тревоге',s:['РСЗО без войны? Это слишком','😨']}},
 cruise:{w:{thr:-10,rel:-3,m:'🛰 Крылатые ракеты поразили цели в глубине обороны врага',s:['Крылатые ракеты нашли цель','🛰']},p:{rel:-10,app:-4,stab:-3,coup:3,m:'🛰 Пуск крылатой ракеты в мирное время! Провокация',s:['Крылатые ракеты в мирное время?!','😨']}},
 bomber:{w:{thr:-11,rel:-4,app:-1,m:'🛫 Бомбардировщики отбомбились по тылам врага',s:['Бомбардировщики отработали по тылам','🛫']},p:{rel:-8,app:-3,stab:-2,coup:2,m:'🛫 Вылет бомбардировщиков у чужих границ — скандал',s:['Бомбардировщики у границ — это угроза','😨']}},
 cannon:{w:{thr:-6,mor:2,m:'Пушки накрыли позиции врага',s:['Наша артиллерия работает!','💪']},p:{rel:-4,app:-1,m:'Холостой залп из пушки — соседи нервничают',s:['Зачем стрелять из пушек в мирное время?','😟']}},
 drone:{w:{thr:-4,mor:1,m:'🛩 Ударные дроны поразили цели врага',s:['Дроны работают по тылам врага','🛩']},p:{rel:-3,app:-1,m:'Дрон над границей — соседи протестуют',s:['Дроны над границей? Соседи в ярости','😬']}},
 tank:{w:{thr:-8,mor:1,m:'🛡 Танковый удар прорвал оборону',s:['Танки пошли вперёд!','🛡']},p:{rel:-1,app:1,m:'Танковый парад поднял гордость за армию',s:['Парад бронетехники впечатляет','🛡']}},
 aa:{w:{thr:-5,mor:1,stab:1,m:'📡 ПВО прикрыло города от налётов',s:['Небо над городами защищено','📡']},p:{tr:1,mor:1,m:'📡 Учения ПВО повысили боеготовность',s:['Учения ПВО прошли успешно','📡']}},
 rocket:{w:{thr:-12,app:-1,rel:-5,m:'🚀 Ракетный удар по тылам врага',s:['Ракеты нанесли удар. Мир наблюдает','🚀']},p:{rel:-12,app:-5,stab:-4,coup:4,m:'🚀 Ракетный пуск в мирное время! Соседи в панике',s:['Ракетный пуск без войны?! Это провокация','😨']}}
};
if(FX[k]){const e=S.war?FX[k].w:FX[k].p;if(e.thr)S.threat=clamp(S.threat+e.thr);if(e.mor)S.morale=clamp(S.morale+e.mor);if(e.app)S.approval=clamp(S.approval+e.app);if(e.stab)S.stability=clamp(S.stability+e.stab);if(e.coup)S.coupRisk=clamp(S.coupRisk+e.coup);if(e.tr)S.training=clamp(S.training+e.tr);if(e.rel)R(e.rel);log(e.m);say(e.s[0],e.s[1])}
if(k=='bomb'){if(S.war){S.threat=clamp(S.threat-18);S.approval=clamp(S.approval-3);R(-10);log('💣 Применена бомба! Мир осуждает');say('Это ужас… нас осудит весь мир','😱')}else{R(-25);S.stability=clamp(S.stability-8);S.approval=clamp(S.approval-12);S.coupRisk=clamp(S.coupRisk+10);log('💣 Бомба в мирное время! Скандал!');say('Вы сошли с ума?! Бомба в мирное время!','🤬')}}
if(k=='petard'){S.approval=clamp(S.approval+.5);if(Math.random()<.12){S.stability=clamp(S.stability-2);log('Петарда подожгла ларёк на параде');say('Горит ларёк! Ха-ха… и ужас','😂')}else{log('Петарды на празднике подняли настроение');say('Классный салют на параде!','😂')}}
save();render()};
window.dep=(i,a)=>{if(blocked())return;let d=S.deps[i];if(a=='bribe'){if(S.money<200)return toast('Недостаточно средств');S.money-=200;d.l=clamp(d.l+15);S.legitimacy=clamp(S.legitimacy-1);log(`Депутат ${d.n} получил «поддержку» 200 млн`)}if(a=='meet'){d.l=clamp(d.l+5);log(`Встреча с депутатом ${d.n}`)}if(a=='expel'){d.l=0;S.legitimacy=clamp(S.legitimacy-2);S.deps[i]=Object.assign(d,{n:pick(DN)+' мл.',l:50});log(`Депутат ${d.n} заменён`);say('Депутата выгнали — скандал!','🤨')}save();render()};
window.parlOrder=k=>{
 if(blocked())return;
 if(cdLeft('parl_'+k)>0)return toast(cdMsg('parl_'+k));
 const l=depLoyal();
 if(k==='laws'){
  if(l<60)return toast('Нужна средняя лояльность депутатов от 60%');
  S.pp=clamp((S.pp||0)+15,0,400);S.inflation=clamp(S.inflation-1,0,100);S.gdp*=1.004;
  cdSet('parl_laws',3);log('Парламент принял пакет антикризисных реформ');toast('Реформы приняты: +15 пол. власти, −1% инфляции, рост ВВП');
 }else if(k==='audit'){
  S.money+=600;dl(-5);
  cdSet('parl_audit',4);log('Депутаты провели аудит госзакупок: +600 млн');toast('+600 млн в казну (депутаты недовольны проверкой)');
 }else if(k==='regions'){
  if(S.money<300)return toast('Недостаточно средств (нужно 300 млн)');
  S.money-=300;S.stability=clamp(S.stability+3);S.approval=clamp(S.approval+2);dl(3);
  cdSet('parl_regions',3);log('Депутаты провели приём граждан в регионах');toast('Стабильность +3, одобрение +2, лояльность +3');
 }
 clampFix();save();render();
};
function parlTick(){
 if(!S.deps||!S.deps.length)return;
 const l=depLoyal();
 if(l>=65){
  const bonus=(l-60)/40;
  S.pp=clamp((S.pp||0)+Math.round(2+bonus*4),0,400);
  S.gdp*=1+0.0008*bonus;
  S.legitimacy=clamp(S.legitimacy+0.25*bonus);
  S.inflation=clamp(S.inflation-0.15*bonus,0,100);
 }else if(l>=45){
  S.pp=clamp((S.pp||0)+1,0,400);
 }
 S.deps.forEach((d,i)=>{
  if(d.l>60){
   const role=i%4;
   if(role===0)S.money+=25;
   else if(role===1)S.tech=clamp(S.tech+0.08);
   else if(role===2)S.stability=clamp(S.stability+0.08);
   else S.trust=clamp(S.trust+0.08);
  }
 });
}
/* Национальные задания: работают одинаково в одиночной и сетевой кампании.
   Состояние задания хранится в сохранении конкретного игрока. */
const NATIONAL_MISSIONS={
 eco:{title:'Экономический рывок',icon:'📈',desc:'Увеличить ВВП на 4% за 12 месяцев.',metric:'gdp',reward:'650 млн и +1,5 технологии',cash:650,apply(){S.tech=clamp(S.tech+1.5)}},
 stability:{title:'Общественное доверие',icon:'🤝',desc:'Повысить стабильность на 5 пунктов.',metric:'stability',reward:'450 млн, +3 одобрения и +1 легитимности',cash:450,apply(){S.approval=clamp(S.approval+3);S.legitimacy=clamp(S.legitimacy+1)}},
 defense:{title:'Военная готовность',icon:'🛡️',desc:'Увеличить военную мощь на 6%.',metric:'defense',reward:'550 млн, +5 вооружения и боеприпасов',cash:550,apply(){S.equipment=clamp(S.equipment+5);S.ammo=clamp(S.ammo+5);S.morale=clamp(S.morale+2)}},
 reserves:{title:'Стратегические резервы',icon:'📦',desc:'Поднять средний запас ресурсов на 6 пунктов.',metric:'reserves',reward:'500 млн и +3 к запасам',cash:500,apply(){['food','fuel','steel','ammo','energy'].forEach(k=>S[k]=clamp(S[k]+3))}}
};
function missionMetric(id){
 if(id==='gdp')return Math.max(1,+S.gdp||1);
 if(id==='stability')return +S.stability||0;
 if(id==='defense')return Math.max(1,warPower());
 if(id==='reserves')return ['food','fuel','steel','ammo','energy'].reduce((a,k)=>a+(+S[k]||0),0)/5;
 return 0;
}
function missionStart(id){
 if(blocked())return;
 const D=NATIONAL_MISSIONS[id];if(!D)return;
 if(S.nationalMission&&S.nationalMission.id)return toast('Сначала завершите текущее задание');
 if((S.missionNext||0)>mt())return toast(`Новое задание будет доступно через ${S.missionNext-mt()} мес.`);
 const base=missionMetric(D.metric),gain={gdp:.04,stability:5,defense:.06,reserves:6}[id];
 const target=id==='gdp'?base*(1+gain):id==='defense'?base*(1+gain):Math.min(95,base+gain);
 S.nationalMission={id,base,target,start:mt(),deadline:mt()+12};
 log(`📋 Принято национальное задание: ${D.title}. Срок — 12 месяцев.`);save();render(true);toast('Национальное задание принято');
}
function missionTick(){
 const M=S.nationalMission;if(!M||!M.id)return;
 const D=NATIONAL_MISSIONS[M.id];if(!D){S.nationalMission=null;return;}
 const value=missionMetric(D.metric);
 if(value>=M.target){S.money+=D.cash;D.apply();S.missionCompleted=(S.missionCompleted||0)+1;S.missionNext=mt()+6;S.nationalMission=null;
  log(`🏆 Национальное задание «${D.title}» выполнено! Награда: ${D.reward}.`);say(`Задание выполнено: ${D.title}`,'🏆');toast(`🏆 Задание выполнено: ${D.title}`);return;}
 if(mt()>=M.deadline){S.missionFailed=(S.missionFailed||0)+1;S.missionNext=mt()+6;S.nationalMission=null;log(`⌛ Национальное задание «${D.title}» провалено: срок 12 месяцев истёк.`);say(`Срок задания «${D.title}» истёк`,'⌛');}
}
function missionCard(){
 const M=S.nationalMission;
 if(M&&M.id){const D=NATIONAL_MISSIONS[M.id],v=missionMetric(D.metric),span=Math.max(.001,M.target-M.base),progress=clamp((v-M.base)/span*100),left=Math.max(0,M.deadline-mt());
  const nowText=M.id==='gdp'?fmt(S.gdp)+' млн ВВП':M.id==='defense'?fmt(v)+' ед. мощи':M.id==='stability'?Math.round(v)+'% стабильности':Math.round(v)+'% средний запас';
  const goalText=M.id==='gdp'?fmt(M.target)+' млн ВВП':M.id==='defense'?fmt(M.target)+' ед. мощи':Math.round(M.target)+'%';
  return card('📋 Национальное задание: '+D.title,`<p>${D.desc}</p><div class="cards"><div class="mini"><b>Прогресс</b>${Math.round(progress)}%<div class="bar"><i style="width:${progress}%"></i></div></div><div class="mini"><b>Сейчас / цель</b>${nowText}<br>Цель: ${goalText}</div><div class="mini"><b>Срок</b>${left} мес.</div><div class="mini"><b>Награда</b>${D.reward}</div></div><p class="muted">Выполните условие до истечения срока. После успеха новое задание будет доступно через 6 месяцев.</p>`);
 }
 const wait=Math.max(0,(S.missionNext||0)-mt());
 const options=Object.entries(NATIONAL_MISSIONS).map(([id,D])=>`<div class="mini"><b>${D.icon} ${D.title}</b><small>${D.desc}</small><small class="muted">Награда: ${D.reward}</small><div class="actions"><button class="primary" ${wait?'disabled':''} onclick="H.missionStart('${id}')">${wait?'⏳ Через '+wait+' мес.':'Принять задание'}</button></div></div>`).join('');
 return card('📋 Национальные задания',`<p>Выберите одну государственную цель. На выполнение даётся 12 игровых месяцев. Задания и награды работают в одиночной игре и в мультиплеере отдельно для каждой страны.</p><div class="cards">${options}</div><p class="muted">Выполнено: ${S.missionCompleted||0} · Провалено: ${S.missionFailed||0} · После каждого задания действует пауза 6 месяцев.</p>`);
}
function addonTick(){const T=(l,f)=>{try{return EconCore.track(S,l,f)}catch(e){return f()}};ensure();cdTick();T('Протесты в стране',()=>politicalSystemTick());spySystemTick();T('Мировой кризис',()=>globalCrisisTick());T('Национальные проекты',()=>nationalProjectTick());relationProgramTick();embassyTick();missionTick();aiTick();if(window.NationsAI)NationsAI.tick(S);people();if(window.PopAI)try{T('Население',()=>PopAI.tick(S,{atWar:atWar(),aa:(S.aa||0)+bcount('aabat')*1.5,bunkers:bcount('bunker')}))}catch(e){console.warn('PopAI',e)}if(!S.out){econTick();T('Решения и законы',()=>polTick());parlTick();hoiTick();mfgTick()}S.deps.forEach(d=>{d.l=clamp(d.l+(S.approval-50)*.03+(55-d.l)*.03+rnd(-1.5,1.5));if(d.l<20&&Math.random()<.1)log(`Депутат ${d.n} интригует против правительства`)});
if(S.out){S.out.months++;let my=S.parties.find(p=>p.name===S.playerParty);S.fund+=Math.round((my?my.support:0)*2);if(S.out.months>=72){S.campaignOver=true;log('Вы не вернулись к власти за 6 лет.')}return}
if(S.grace>0)S.grace--;
let hit=OUST.findIndex(o=>o[0]());
if(hit<0){S.crisis=Math.max(0,(S.crisis||0)-1)}
else{S.crisis=(S.crisis||0)+1;S.crisisWhy=OUSTWHY[hit];S.crisisIdx=hit;
if(S.crisis===1&&S.grace<=0){log(`⚠️ Власти грозит отставка: ${OUSTWHY[hit]}. Есть несколько месяцев, чтобы исправить`);say('Власть шатается, народ ждёт перемен','😟');toast('⚠️ Угроза отставки: '+OUSTWHY[hit])}
if(S.crisis>=crisisNeed()&&S.grace<=0&&Math.random()<ousterChance()){S.crisis=0;ouster(pick(OUST[hit][1]))}}}
const CH=[['chartEconomy','Экономика: ВВП, казна, долг',[{key:'gdp',name:'ВВП',color:'#69aef2'},{key:'money',name:'Казна',color:'#55c58a'},{key:'debt',name:'Долг',color:'#ef6d72'}]],['chartPolitics','Политика: партия, одобрение, стабильность',[{key:'partySupport',name:'Партия',color:'#f0bd58'},{key:'approval',name:'Одобрение',color:'#69aef2'},{key:'stability',name:'Стабильность',color:'#55c58a'}]],['chartPopulation','Население и ресурсы',[{key:'pop',name:'Население',color:'#69aef2'},{key:'food',name:'Еда',color:'#55c58a'},{key:'fuel',name:'Топливо',color:'#f0bd58'}]],['chartInfl','Цены и работа',[{key:'inflation',name:'Инфляция',color:'#ef6d72'},{key:'employment',name:'Занятость',color:'#55c58a'},{key:'trust',name:'Доверие рынков',color:'#f0bd58'}]],['chartArmy','Армия и угроза',[{key:'army',name:'Армия',color:'#f0bd58'},{key:'threat',name:'Угроза',color:'#ef6d72'}]]];
function trend(s){let h=S.history;if(h.length<2)return'<p class="muted">Нужно хотя бы 2 месяца игры</p>';return'<div style="overflow:auto"><table><tr><th>Показатель</th><th>Старт</th><th>Сейчас</th><th>Динамика</th><th>Мин / Макс</th></tr>'+s.map(z=>{let v=h.map(q=>+q[z.key]||0),a=v[0],b=v[v.length-1],d=a?(b-a)/Math.abs(a)*100:0;return`<tr><td style="color:${z.color}">● ${z.name}</td><td>${fmt(a)}</td><td>${fmt(b)}</td><td style="color:var(${d>=0?'--green':'--red'})">${d>=0?'▲ рост':'▼ упадок'} ${Math.abs(d).toFixed(1)}%</td><td>${fmt(Math.min(...v))} / ${fmt(Math.max(...v))}</td></tr>`}).join('')+'</table></div>'}
const chartsHtmlOld=()=>`<p class="muted" style="margin:0 0 8px">С начала партии: ${S.history.length} мес. Каждая линия нарисована в своём масштабе — так видны рост и падение.</p><div class="grid">`+CH.map(c=>card(c[1],`<div class="chart-wrap"><canvas id="${c[0]}"></canvas></div>${trend(c[2])}`)).join('')+'</div>';
function drawOne(id,series){let cv=document.getElementById(id);if(!cv)return;let r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;cv.width=Math.max(300,r.width*d);cv.height=Math.max(160,r.height*d);let x=cv.getContext('2d'),w=cv.width,h=cv.height,L=8*d,T=20*d,B=22*d,hs=S.history,n=hs.length;x.clearRect(0,0,w,h);x.font=`${11*d}px system-ui`;x.strokeStyle='#344b63';x.lineWidth=d;for(let i=0;i<=4;i++){let y=T+(h-T-B)*i/4;x.beginPath();x.moveTo(L,y);x.lineTo(w-L,y);x.stroke()}
if(n<2){x.fillStyle='#a9bacb';x.fillText('График появится после нескольких месяцев игры',L,h/2);return}
series.forEach((z,j)=>{let v=hs.map(q=>+q[z.key]||0),mn=Math.min(...v),mx=Math.max(...v);if(mx===mn)mx=mn+1;let Y=a=>T+(1-(a-mn)/(mx-mn))*(h-T-B);x.strokeStyle=z.color;x.lineWidth=2.5*d;x.beginPath();v.forEach((a,i)=>{let px=L+i/(n-1)*(w-2*L);i?x.lineTo(px,Y(a)):x.moveTo(px,Y(a))});x.stroke();x.fillStyle=z.color;x.beginPath();x.arc(w-L,Y(v[n-1]),3.5*d,0,7);x.fill();x.fillText(`${z.name}: ${fmt(v[n-1])}`,L+j*(w/series.length),13*d)});
x.fillStyle='#a9bacb';x.fillText(`Год ${hs[0].year}`,L,h-6*d);let t=`Год ${hs[n-1].year}`;x.fillText(t,w-L-x.measureText(t).width,h-6*d)}
function drawChartsOld(){CH.forEach(c=>drawOne(c[0],c[2]))}
const mood=v=>v>40?'🤝 Друг':v>10?'🙂 Дружелюбен':v>-20?'😐 Нейтрален':v>-50?'🧊 Холоден':'😠 Враждебен';
const feedHtml=()=>S.feed.length?S.feed.slice(0,14).map(f=>`<div class="choice"><span style="font-size:20px">${f.m}</span> ${f.t} <small class="muted">· ${f.d}</small></div>`).join(''):'<p class="muted">Пока тихо. Пустите время — люди начнут говорить.</p>';
function outBanner(){return S.out?`<section class="panel" style="border-color:#c3943e;margin-bottom:10px"><h2>🚨 Вы в оппозиции</h2><p>${S.out.cause}.<br>Правит: <b>${S.party}</b>. Месяцев в оппозиции: ${S.out.months} / 72. Партийная касса: <b>${fmt(S.fund)} млн</b>.</p></section>`:''}
function tgtPanel(){if(!atWar())return'';const wi0=Math.min((S.tgt&&S.tgt.wi)||0,S.wars.length-1),w=S.wars[wi0],regs=enemyRegs(w.n),cur=(S.tgt&&S.tgt.r)||'';
 const ws=S.wars.length>1?`<label>Война: <select onchange="tgtSet(this.value,'')">${S.wars.map((x,i)=>`<option value="${i}" ${i===wi0?'selected':''}>${x.n}</option>`).join('')}</select></label> `:`<b>Война: ${w.n}</b> `;
 const opts=`<option value="">🎲 Случайная область</option>`+regs.map(x=>{const d=(w.dmg||{})[x.n];return`<option value="${String(x.n).replace(/"/g,'&quot;')}" ${x.n===cur?'selected':''}>${x.n}${d?` · 🎯${d.mil} 🏗${d.infra} 🏘${d.civ}`:''}${(w.regEco&&w.regEco[x.n])?` · 💸${Math.round(w.regEco[x.n])}%`:''}</option>`}).join('');
 const E=w.eco,L=w.lastEco,eco=`<div class="ecostrip">📉 ВВП врага <b>−${E?E.loss.toFixed(1):'0.0'}%</b> · курс <b>${E?pct((E.r/E.r0-1)*100,0):'—'}</b> · ударов по экономике <b>${(E&&E.hits)||0}</b>${L?` · последний <b>−${L.pct.toFixed(1)}%</b>${L.rn?' ('+String(L.rn).replace(/ \(.*\)/,'')+')':''}`:''}</div>`;
  return`<div class="mini" style="margin-bottom:8px"><b>🎯 Куда бить</b>${eco}${ws}<br><label>Область врага: <select onchange="tgtSet(${wi0},this.value)">${opts}</select></label><small class="muted">Крупные и промышленные области дают больший эффект. Повторные удары по одной и той же цели слабеют (цифры в списке — накопленный урон по военным, инфраструктуре и гражданским).</small></div>`}
function tacticsCard(){
 const sm=window.AIARS?AIARS.summary(S):null;
 let h=`<div class="cards"><div class="mini">Погибло солдат за все войны<b>${fmt(S.warSold||0)}</b></div><div class="mini">Погибло мирных жителей<b>${fmt(S.warCiv||0)}</b></div><div class="mini">Мирные жители врага<b>${fmt(S.warECiv||0)}</b></div><div class="mini">Население сейчас<b>${fmt(S.pop)}</b></div></div>`;
 if(atWar()&&window.InterDep)h+=S.wars.map(w=>InterDep.panel(aiNationOf(w.n)||w,'🕸 Экономика врага: '+w.n+' (куда бить арсеналом)')).join('');
 if(atWar())h+=S.wars.map(w=>{const c=rel(w.n)||{},ars=c.ars||{};return`<div class="mini"><b>⚔️ ${w.n}</b><small>ПВО врага: ${(c.aa==null?(c.power||0)/25:c.aa).toFixed(1)}${c.aa!=null&&c.aa<.5?' (уничтожено)':''} · арсенал врага (разведка): пушки ${Math.floor(ars.cannon||0)}, дроны ${Math.floor(ars.drone||0)}, танки ${Math.floor(ars.tank||0)}, ракеты ${Math.floor(ars.rocket||0)}${ars.bomb>=1?', бомба есть':''}</small><small>Склад врага всего: <b>${AIARS.arsTotal(c)}</b> ед. · выработано ${Math.round(c.arsMade||0)} · куплено ${c.arsBought||0}${(c.embargo||0)>nowM()?' · 🚫 эмбарго на оружие':''}</small><small>Потери войны: ${fmt(w.soldDead||0)} солдат, ${fmt(w.civDead||0)} мирных (наших) · у врага мирных: ${fmt(w.eCiv||0)}</small></div>`}).join('');
 if(sm)h+=`<p class="muted">🧠 <b>ИИ-тактик врага учится.</b> Изучено ударов: <b>${sm.steps}</b> · нейросеть: ${sm.nnSteps} шагов обучения · освоено оружия: ${sm.weaponsUsed}/${sm.weaponsTotal} · опробовано сочетаний оружие×цель: ${sm.coverage}% · результативных: ${sm.skill}% · любопытство ${Math.round(sm.eps*100)}%. Агрессия ИИ: ${AIARS.AGGR[AIARS.cfg(S).aggr].n}.${sm.best.length?`<br>Лучшее по опыту: ${sm.best.join('; ')}.`:' Пока копит опыт.'}<br>Он учитывает ваши ПВО и укрепления, бьёт туда, где больнее, и меняет тактику, если вы её закрываете. Свою ПВО и бункеры стройте заранее.</p>`;
 return card('🧠 Потери и тактика врага',h)}
/* ------------------------ АНИМАЦИЯ БОЁВ НА КАРТЕ ------------------------ */
const SVGNS='http://www.w3.org/2000/svg';
const SCN={drone:{n:3,dur:2.5,R:16},heli:{n:2,dur:2.8,R:18},bomber:{n:3,dur:3.1,R:24},cruise:{n:1,dur:3.2,R:22,rk:1},rocket:{n:1,dur:2.8,R:28,rk:1},bomb:{n:1,dur:3.3,R:62,rk:1},cannon:{n:4,dur:1.8,R:12,ar:1},howitzer:{n:3,dur:1.9,R:15,ar:1},mlrs:{n:9,dur:1.8,R:11,ar:1,gap:.16},tank:{n:5,dur:3.1,R:16,tk:1}};
function strikeScene(o){
 wmLoad(ok=>{if(!ok)return;try{if(!WMAP.box)buildWorldNode();try{updateWorld()}catch(e){}runScene(o)}catch(e){console.warn('scene',e)}});
}
/* Точки пуска СТРОГО на территории стороны-атакующего: берём реальную границу ближайших к цели областей
   и сдвигаем точку внутрь (isPointInFill проверяет, что она действительно внутри страны). */
function launchSites(els,T,bb){
 const out={pts:[],wide:[],el:null,g:null};
 const cand=els.map(e=>{const g=geoOf(e);return {e,g,c:g?{x:g.cx,y:g.cy,w:g.w,h:g.h}:bb(e)}}).filter(x=>x.c&&x.c.w*x.c.h>0).sort((a,b)=>Math.hypot(a.c.x-T.x,a.c.y-T.y)-Math.hypot(b.c.x-T.x,b.c.y-T.y)).slice(0,5);
 const all=[];
 cand.forEach(({e,g,c})=>{
  const inset=Math.max(.5,Math.min(3,Math.min(c.w,c.h)*.12));
  const isIn=(x,y)=>{if(g)return inside(x,y,g.polys);try{return typeof e.isPointInFill!=='function'||e.isPointInFill(new DOMPoint(x,y))}catch(_){return true}};
  const push=p=>{const dx=c.x-p[0],dy=c.y-p[1],dl=Math.hypot(dx,dy)||1;
   for(const m of [1,1.8,3]){const x=p[0]+dx/dl*inset*m,y=p[1]+dy/dl*inset*m;if(isIn(x,y)){all.push({x,y,d:Math.hypot(x-T.x,y-T.y),e,g});break}}};
  if(g){g.polys.forEach(ring=>{const n=ring.length,st=Math.max(1,Math.floor(n/110));for(let i=0;i<n;i+=st)push(ring[i])})}
  else{let len=0;try{len=e.getTotalLength()}catch(_){}if(!len)return;for(let i=0;i<110;i++){const q=e.getPointAtLength(len*i/110);push([q.x,q.y])}}
 });
 if(!all.length)return out;
 all.sort((a,b)=>a.d-b.d);
 const d0=all[0].d;
 out.pts=all.filter(p=>p.d<=d0+Math.max(8,d0*.12)).slice(0,40);
 out.wide=all.filter(p=>p.d<=d0+Math.max(20,d0*.3)).slice(0,120);
 out.el=all[0].e;out.g=all[0].g;
 return out;
}
function runScene(o){

 const old=document.getElementById('strikeov');if(old){if(old._stop)old._stop();old.remove()}
 const ov=document.createElement('div');ov.id='strikeov';
 ov.innerHTML='<div class="strikebox"><div class="striketitle"></div><div class="strikesub"></div><div class="strikemap"></div></div>';
 ov.querySelector('.striketitle').textContent=o.title||'';ov.querySelector('.strikesub').textContent=o.sub||'';
 const host=ov.querySelector('.strikemap'),svg=WMAP.node.cloneNode(true);
 svg.removeAttribute('style');svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 const old2=svg.querySelector('#fxl');if(old2)old2.remove();
 host.appendChild(svg);document.body.appendChild(ov);
 const hostW=host.getBoundingClientRect().width||340;
 const meIso=wi(S.me||'').iso,enIso=wi(o.enemy).iso;
 const bb=el=>{const g=geoOf(el);if(g)return{x:g.cx,y:g.cy,w:g.w,h:g.h};try{const b=el.getBBox();return{x:b.x+b.width/2,y:b.y+b.height/2,w:b.width,h:b.height}}catch(e){return null}};
 const dOf=el=>{const g=geoOf(el);return g?g.d:(el.getAttribute('d')||'')};
 const all=[...svg.querySelectorAll('[data-r]')];
 const shotsIn=(o.shots&&o.shots.length)?o.shots:[{regId:o.regId,down:o.down}];const shots=[];shotsIn.forEach(s=>{let el=s.regId?all.find(e=>e.getAttribute('data-r')===s.regId):null;if(!el)el=svg.querySelector('[data-o="'+enIso+'"]');const c=el&&bb(el);if(c)shots.push({el,c,down:!!s.down})});let tEl=shots.length?shots[0].el:null;
 if(!tEl)tEl=svg.querySelector('[data-o="'+enIso+'"]');
 if(!shots.length){ov.remove();return}const T={x:shots.reduce((a,s)=>a+s.c.x,0)/shots.length,y:shots.reduce((a,s)=>a+s.c.y,0)/shots.length,w:shots[0].c.w,h:shots[0].c.h};
 const fromIso=o.rev?enIso:meIso;   // откуда летит: при нашем ударе — наша страна, при ударе врага — его
 const srcEls=all.filter(e=>e.getAttribute('data-c')===fromIso);
 const outl=svg.querySelector('[data-o="'+fromIso+'"]');
 const LP=launchSites(srcEls.length?srcEls:(outl?[outl]:[]),T,bb);
 let O=LP.pts[0]||null;
 if(!O){let best=1e9;srcEls.forEach(e=>{const c=bb(e);if(!c||!(c.w*c.h))return;const d=Math.hypot(c.x-T.x,c.y-T.y);if(d<best){best=d;O=c}});if(!O&&outl)O=bb(outl)}
 if(!O||Math.hypot(O.x-T.x,O.y-T.y)<4)O={x:T.x-80,y:T.y+45};
 const cfg=SCN[o.k]||{n:3,dur:1.6,R:16};
 const St={x:O.x,y:O.y};
 const LPt=i=>LP.pts.length?LP.pts[(i*5+Math.floor(Math.random()*4))%LP.pts.length]:O;
 const LPw=()=>LP.wide.length?LP.wide[Math.floor(Math.random()*LP.wide.length)]:O;

 const xs=[St.x,...shots.map(s=>s.c.x)],ys=[St.y,...shots.map(s=>s.c.y)];const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
 let w=Math.max(150,(maxx-minx)*1.5+70),h=Math.max(93,(maxy-miny)*1.5+45);
 if(h/w>.62)w=h/.62;else h=w*.62;
 const cx=(minx+maxx)/2,cy=(miny+maxy)/2;
 svg.setAttribute('viewBox',`${cx-w/2} ${cy-h/2} ${w} ${h}`);
 const px=n=>n*w/hostW;
 const L=document.createElementNS(SVGNS,'g');L.id='fxl';svg.appendChild(L);
 if(LP.el&&(()=>{const b=bb(LP.el);return !b||b.w*b.h<w*h*.3})()){const hl=document.createElementNS(SVGNS,'path');hl.setAttribute('d',LP.g?LP.g.d:(LP.el.getAttribute('d')||''));hl.setAttribute('fill-rule','evenodd');hl.setAttribute('fill',o.rev?'#ff5c66':'#d6b25e');hl.setAttribute('opacity','.32');hl.setAttribute('pointer-events','none');L.appendChild(hl)}
 const mk=(tag,at,par)=>{const e=document.createElementNS(SVGNS,tag);for(const k in at)e.setAttribute(k,at[k]);(par||L).appendChild(e);return e};
 const bez=(a,c,b,t)=>({x:(1-t)*(1-t)*a.x+2*(1-t)*t*c.x+t*t*b.x,y:(1-t)*(1-t)*a.y+2*(1-t)*t*c.y+t*t*b.y});
 const acts=[];const add=(t0,dur,init,upd,end)=>acts.push({t0,dur,init,upd,end,st:null,fin:false});
 /* маркеры: откуда и куда */
 add(0,6,()=>({a:mk('circle',{cx:St.x,cy:St.y,r:px(4),fill:'#d6b25e',stroke:'#0b1218','stroke-width':px(.8)}),b:shots.filter((s,i)=>shots.findIndex(z=>z.el===s.el)===i).map(s=>mk('circle',{cx:s.c.x,cy:s.c.y,r:px(4),fill:'none',stroke:'#ff5c66','stroke-width':px(1.2)}))}),
  (st,p)=>{const k=(p*acts[0].dur)%1;st.b.forEach(e=>{e.setAttribute('r',px(4+9*k));e.setAttribute('opacity',1-k)})},st=>{st.a.remove();st.b.forEach(e=>e.remove())});
 const hit=(t0,pow,el0)=>add(t0,.9,()=>({e:mk('path',{d:dOf(el0||tEl),'fill-rule':'evenodd',fill:'#ff2d2d',stroke:'#ffd7a0','stroke-width':px(.8),opacity:0})}),
  (st,p)=>st.e.setAttribute('opacity',(p<.2?p/.2:1-(p-.2)/.8)*(.55*(pow||1))),st=>st.e.remove());
 const boom=(x,y,R,t0,nh,el0)=>{add(t0,.8,()=>({a:mk('circle',{cx:x,cy:y,r:0,fill:'#ffb347',opacity:.9}),b:mk('circle',{cx:x,cy:y,r:0,fill:'none',stroke:'#ff5c3a','stroke-width':px(1.6)}),c:mk('circle',{cx:x,cy:y,r:0,fill:'#fff6d0'})}),
  (st,p)=>{const r=px(R)*Math.sqrt(p);st.a.setAttribute('r',r);st.a.setAttribute('opacity',(1-p)*.9);st.b.setAttribute('r',px(R*1.7)*p);st.b.setAttribute('opacity',1-p);st.c.setAttribute('r',r*.45*(1-p));},st=>{st.a.remove();st.b.remove();st.c.remove()});
  for(let i=0;i<7;i++){const a=Math.random()*6.28,d=px(R*(.8+Math.random()*.9));add(t0,.7,()=>({e:mk('circle',{cx:x,cy:y,r:px(1.2),fill:'#ffd37a'})}),(st,p)=>{st.e.setAttribute('cx',x+Math.cos(a)*d*p);st.e.setAttribute('cy',y+Math.sin(a)*d*p-px(6)*Math.sin(p*3.14));st.e.setAttribute('opacity',1-p)},st=>st.e.remove())}
  if(!nh)hit(t0,R>40?1.4:1,el0)};
 const muzzle=(P,t0)=>add(t0,.25,()=>({e:mk('circle',{cx:P.x,cy:P.y,r:0,fill:'#fff2b0'})}),(st,p)=>{st.e.setAttribute('r',px(7)*Math.sin(p*3.14));},st=>st.e.remove());
 const aimIn=sh=>{const c=sh.c,g=geoOf(sh.el);for(let n=0;n<60;n++){const x=c.x+(Math.random()-.5)*c.w*.9,y=c.y+(Math.random()-.5)*c.h*.9;let ok=true;if(g)ok=inside(x,y,g.polys);else try{if(typeof sh.el.isPointInFill==='function')ok=sh.el.isPointInFill(new DOMPoint(x,y))}catch(_){}if(ok)return{x,y}}return{x:c.x,y:c.y}};
  const defRings=(GEO.c[o.rev?meIso:enIso]||{}).rings;
  /* сбитый снаряд обрывается над территорией того, кто его сбил (над страной-обороняющейся), а не над чужой землёй */
  const downAt=(P0,Cc,Aim)=>{const ok=[];if(defRings)for(let u=.45;u<=.95;u+=.05){const q=bez(P0,Cc,Aim,u);if(inside(q.x,q.y,defRings))ok.push(u)}return ok.length?ok[Math.floor(Math.random()*ok.length)]:.4+Math.random()*.3};
  const flak=(x,y,t0)=>{add(t0,.55,()=>({a:mk('circle',{cx:x,cy:y,r:0,fill:'#cfe9ff',opacity:.9}),b:mk('circle',{cx:x,cy:y,r:0,fill:'none',stroke:'#7fc4ff','stroke-width':px(1.2)})}),(st,p)=>{st.a.setAttribute('r',px(6)*Math.sqrt(p));st.a.setAttribute('opacity',(1-p)*.9);st.b.setAttribute('r',px(12)*p);st.b.setAttribute('opacity',1-p)},st=>{st.a.remove();st.b.remove()});
   for(let i=0;i<6;i++){const a=Math.random()*6.28,d=px(7+Math.random()*6);add(t0,.6,()=>({e:mk('circle',{cx:x,cy:y,r:px(.9),fill:'#9fd4ff'})}),(st,p)=>{st.e.setAttribute('cx',x+Math.cos(a)*d*p);st.e.setAttribute('cy',y+Math.sin(a)*d*p+px(5)*p*p);st.e.setAttribute('opacity',1-p)},st=>st.e.remove())}};
  /* Один и тот же изгиб кривой от старта до точки падения. Сбитая ракета/дрон летит по ТОЙ ЖЕ кривой и просто обрывается раньше.
     Курс считается по производной кривой, поэтому нос всегда смотрит вперёд, а не назад. Точка падения — внутри контура области. */
  const flyer=(P0,i,t0,dur,arc,rk,big,sh)=>{
   sh=sh||shots[0];const Aim=aimIn(sh),sc=shots.length>6?.75:1;
   const dx=Aim.x-P0.x,dy=Aim.y-P0.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d,side=(i%2?1:-1)*arc*d*(.55+Math.random()*.45);
   const C={x:(P0.x+Aim.x)/2+nx*side,y:(P0.y+Aim.y)/2+ny*side};
   const pe=sh.down?downAt(P0,C,Aim):1,dd=dur*pe,E=bez(P0,C,Aim,pe);
   muzzle(P0,t0);
   add(t0,dd,()=>{
     const tr=mk('polyline',{fill:'none',stroke:rk?'#ff9b62':'#fff0bd','stroke-width':px((rk?2.1:1.5)*sc),opacity:.9,'stroke-linecap':'round','stroke-linejoin':'round'});
     const g=mk('g',{});const col=rk?'#ff754b':'#e7edf3',edge='#18212b';
     const path=(d,fill=col,sw=.55)=>mk('path',{d,fill,stroke:edge,'stroke-width':sw*sc,'stroke-linejoin':'round'},g);
     const line=(x1,y1,x2,y2,stroke='#253342',sw=.8)=>mk('line',{x1:x1*sc,y1:y1*sc,x2:x2*sc,y2:y2*sc,stroke,'stroke-width':sw*sc,'stroke-linecap':'round'},g);
     const kind=o.k;
     if(kind==='drone'){
       path('M 10 0 L 2 -2.2 L -3 -1.4 L -8 -4 L -6 0 L -8 4 L -3 1.4 L 2 2.2 Z','#d5dfd0');
       line(-2,-1,-5,-5,'#9fb18c',.8);line(-2,1,-5,5,'#9fb18c',.8);line(4,-1,7,-4,'#9fb18c',.7);line(4,1,7,4,'#9fb18c',.7);
       mk('circle',{cx:-6*sc,cy:0,r:1.4*sc,fill:'#d6b25e'},g);
     }else if(kind==='rocket'||kind==='cruise'){
       path(kind==='cruise'?'M 11 0 L 4 -1.5 L 0 -1.4 L -5 -4 L -4 -1 L -9 -1.5 L -9 1.5 L -4 1 L -5 4 L 0 1.4 L 4 1.5 Z':'M 12 0 L 3 -2.4 L -5 -2.4 L -8 -4 L -7 0 L -8 4 L -5 2.4 L 3 2.4 Z',rk?'#ff784c':'#d7e0e9');
       line(-7,-1, -11,-2,'#ffb06a',1);line(-7,1,-11,2,'#ffb06a',1);
     }else if(kind==='bomber'){
       path('M 12 0 L 3 -1.5 L 0 -9 L -2 -9 L -1 -1.5 L -8 -4 L -10 -3 L -4 0 L -10 3 L -8 4 L -1 1.5 L -2 9 L 0 9 L 3 1.5 Z','#c5d0dc');
     }else if(kind==='heli'){
       path('M 7 0 Q 4 -3 -1 -2 L -5 -1 L -6 1 L -1 2 Q 4 3 7 0 Z','#8eaa75');line(-2,-4,3,-4,'#d5dce5',1);line(.5,-4,.5,-1,'#d5dce5',.7);line(6,0,10,-2,'#8eaa75',1.1);
     }else if(kind==='bomb'){
       path('M 6 0 Q 4 -4 0 -4 Q -6 -4 -7 0 Q -6 4 0 4 Q 4 4 6 0 Z','#46566a');line(5,0,9,-2,'#ff9a54',1.3);
     }else{
       path('M 9 0 L 1 -2 L -6 -2 L -8 -3 L -7 0 L -8 3 L -6 2 L 1 2 Z',col);
     }
     return{tr,g,pts:[]};
    },
    (st,p)=>{const u=p*pe,q=bez(P0,C,Aim,u),vx=2*(1-u)*(C.x-P0.x)+2*u*(Aim.x-C.x),vy=2*(1-u)*(C.y-P0.y)+2*u*(Aim.y-C.y),a=Math.atan2(vy,vx);
     st.pts.push(q.x.toFixed(1)+','+q.y.toFixed(1));if(st.pts.length>22)st.pts.shift();st.tr.setAttribute('points',st.pts.join(' '));
     st.g.setAttribute('transform',`translate(${q.x} ${q.y}) rotate(${a*57.2958}) scale(${px(1)})`);
    },st=>{st.tr.remove();st.g.remove()});
   if(sh.down)flak(E.x,E.y,t0+dd);else boom(Aim.x,Aim.y,cfg.R,t0+dd,false,sh.el);
  };
 /* ---- сценарии ---- */
 if(o.kind==='inf'){
  /* пехота: стрела наступления + волны солдат */
  add(0,3.4,()=>({ln:mk('line',{x1:St.x,y1:St.y,x2:T.x,y2:T.y,stroke:'#d6b25e','stroke-width':px(2),'stroke-dasharray':px(6)+' '+px(5),opacity:.9,'stroke-linecap':'round'})}),
   (st,p)=>{st.ln.setAttribute('stroke-dashoffset',-p*px(70));st.ln.setAttribute('opacity',p>.82?(1-p)/.18:.9)},st=>st.ln.remove());
  const ang=Math.atan2(T.y-St.y,T.x-St.x),nx=-Math.sin(ang),ny=Math.cos(ang),front=px(64);
  for(let r=0;r<4;r++)for(let c=0;c<11;c++){
   const off=(c/10-.5)*front+(Math.random()-.5)*px(4),t0=.15+r*.55+Math.random()*.25,dur=2.3+Math.random()*.4,wob=Math.random()*6;
   const sp=LPw(),sx=sp.x,sy=sp.y,ex=T.x+nx*off*.45+(Math.random()-.5)*px(8),ey=T.y+ny*off*.45+(Math.random()-.5)*px(8);
   add(t0,dur,()=>({e:mk('circle',{cx:sx,cy:sy,r:px(2.1),fill:'#f0bd58',stroke:'#0b1218','stroke-width':px(.5)})}),
    (st,p)=>{const k=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;st.e.setAttribute('cx',sx+(ex-sx)*k+Math.sin(p*20+wob)*px(.9));st.e.setAttribute('cy',sy+(ey-sy)*k+Math.cos(p*17+wob)*px(.9));st.e.setAttribute('opacity',p>.9?(1-p)/.1:1)},st=>st.e.remove());
  }
  for(let i=0;i<16;i++){const t0=1.8+Math.random()*1.7,x=T.x+(Math.random()-.5)*px(46),y=T.y+(Math.random()-.5)*px(30);
   add(t0,.35,()=>({e:mk('circle',{cx:x,cy:y,r:0,fill:Math.random()<.5?'#fff2b0':'#ff8a5c'})}),(st,p)=>st.e.setAttribute('r',px(4)*Math.sin(p*3.14)),st=>st.e.remove());
   if(i%4===0)boom(x,y,8,t0)}
  hit(2.1,.9);hit(3,.9);
 }else if(cfg.tk){
  const ang=Math.atan2(T.y-St.y,T.x-St.x),nx=-Math.sin(ang),ny=Math.cos(ang);
  const nTk=shots.length>1?Math.min(shots.length,10):cfg.n;for(let i=0;i<nTk;i++){const shT=shots[i%shots.length];
   const off=(i-(nTk-1)/2)*px(9),t0=i*.28,sp=LPw(),sx=sp.x,sy=sp.y,ex=shT.c.x+nx*off*.5,ey=shT.c.y+ny*off*.5;
   add(t0,cfg.dur,()=>({d:mk('rect',{x:-px(5),y:-px(3),width:px(10),height:px(6),rx:px(1),fill:'#8aa05a',stroke:'#0b1218','stroke-width':px(.6)}),g:mk('line',{x1:0,y1:0,x2:px(7),y2:0,stroke:'#2d3a1e','stroke-width':px(1.6)})}),
    (st,p)=>{const x=sx+(ex-sx)*p,y=sy+(ey-sy)*p,tr=`translate(${x} ${y}) rotate(${ang*57.3})`;st.d.setAttribute('transform',tr);st.g.setAttribute('transform',tr);
     if(Math.random()<.25)mk('circle',{cx:x-Math.cos(ang)*px(7),cy:y-Math.sin(ang)*px(7),r:px(1.8),fill:'#9b8a6a',opacity:.5},L)},
    st=>{st.d.remove();st.g.remove()});
   muzzle({x:ex,y:ey},t0+cfg.dur-.2);boom(shT.c.x+(Math.random()-.5)*px(24),shT.c.y+(Math.random()-.5)*px(16),cfg.R,t0+cfg.dur,false,shT.el);
  }
 }else if(cfg.ar){
  {const N=shots.length>1?shots.length:cfg.n,gp=Math.min(cfg.gap||.35,2.4/N);for(let i=0;i<N;i++)flyer(LPt(i),i,.1+i*gp,cfg.dur,.32,0,false,shots[i%shots.length])}
 }else{
  {const N=shots.length>1?shots.length:cfg.n,gp=Math.min(.24,2.4/N);for(let i=0;i<N;i++)flyer(LPt(i),i,.1+i*gp,cfg.dur,.14,!!cfg.rk,o.k==='bomb'||o.k==='bomber',shots[i%shots.length])}
 }
 /* ---- цикл ---- */
 const t00=performance.now();let raf=0,stopped=false;
 const total=Math.max(...acts.slice(1).map(a=>a.t0+a.dur))+.5;acts[0].dur=total;
 const frame=()=>{if(stopped)return;const now=(performance.now()-t00)/1000;
  acts.forEach(a=>{if(a.fin)return;const p=(now-a.t0)/a.dur;if(p<0)return;if(!a.st)a.st=a.init();if(p>=1){a.upd(a.st,1);a.end(a.st);a.fin=true}else a.upd(a.st,p)});
  if(now<total)raf=requestAnimationFrame(frame);else{ov.classList.add('out');setTimeout(()=>ov.remove(),400)}};
 ov._stop=()=>{stopped=true;cancelAnimationFrame(raf)};
 raf=requestAnimationFrame(frame);
 ov.onclick=()=>{ov._stop();ov.classList.add('out');setTimeout(()=>ov.remove(),300)};
}
window.armyAttack=n=>{
 const w=S.wars.find(x=>x.n===n)||tgtWar();if(!w)return;
 const regs=enemyRegs(w.n),want=(S.tgt&&S.tgt.r)||'';let reg=regs.find(x=>x.n===want);if(!reg&&regs.length)reg=regs[Math.floor(Math.random()*regs.length)];
 strikeScene({kind:'inf',k:'inf',enemy:w.n,regId:reg&&reg.id,title:`🪖 Наступление на ${w.n}`,sub:reg?`Область «${reg.n}»`:'Вся страна'});
};
function armsFxMap(k,wname,reg,rn,down){
 const A=ARMS[k];if(!SCN[k])return;
 if(window.__salv){window.__salv.outs.push({reg,down:!!down});return}
 const __war=(S.wars||[]).find(x=>x.n===wname);recordWarAttack(__war,'ours',k,reg,down);
 strikeScene({kind:'strike',k,enemy:wname,shots:[{regId:reg&&reg.id,down:!!down}],title:`${A.ic} ${A.n} → ${wname}`,sub:down?`Сбит ПВО · область «${rn}»`:`Область «${rn}»`});
}
/* ------------------------ АНИМАЦИЯ И ПРОИЗВОДСТВО АРСЕНАЛА ------------------------ */
function armFx(k,mode){
 try{
  const A=ARMS[k]||{ic:'💥'};
  const l=document.createElement('div');l.className='armfx '+mode;
  l.innerHTML=mode==='fire'?`<div class="flash"></div><div class="proj">${A.ic}</div><div class="boom">💥</div>`:`<div class="proj">${mode==='make'?'🏭':A.ic}</div><div class="sparks">✨</div>`;
  document.body.appendChild(l);setTimeout(()=>l.remove(),1500);
 }catch(e){}
}
const mq=()=>S.mfg||(S.mfg=[]);
const mSlots=()=>Math.max(1,Math.floor((S.mil||0)/3));
const mCost=k=>{const A=ARMS[k];return{m:Math.round(A.c*.6),st:Math.max(1,Math.round(A.c/200)),eq:Math.ceil((A.eq||0)/2),need:A.mil?Math.max(1,A.mil-2):1}};
window.make=k=>{
 if(blocked())return;const A=ARMS[k];if(!A||k==='petard')return;
 const c=mCost(k),q=mq();
 if(S.mil<c.need)return toast(`Для производства нужно ${c.need}+ воен. заводов`);
 if(q.length>=mSlots())return toast(`Все производственные линии заняты (${mSlots()})`);
 if(S.money<c.m)return toast('Недостаточно средств');
 if(S.steel<c.st)return toast(`Не хватает стали (нужно ${c.st})`);
 if(c.eq&&S.equipment<c.eq)return toast('Не хватает вооружения на складе');
 S.money-=c.m;S.steel=clamp(S.steel-c.st);if(c.eq)S.equipment=clamp(S.equipment-c.eq);
 q.push({k,left:A.mt||2,total:A.mt||2});
 log(`🏭 Начато производство: ${A.n.toLowerCase()} (${A.mt||2} мес.)`);armFx(k,'make');toast(`🏭 В производстве: ${A.n}`);save();render();
};
window.makeCancel=i=>{const q=mq(),it=q[i];if(!it)return;const A=ARMS[it.k];S.money+=Math.round(mCost(it.k).m*.5);q.splice(i,1);log(`🏭 Производство отменено: ${A.n.toLowerCase()} (возвращено 50% денег)`);save();render()};
function mfgTick(){
 const q=mq();if(!q.length)return;
 const step=(S.mil||0)>=12?2:1;
 for(let i=q.length-1;i>=0;i--){
  const it=q[i];it.left-=step;
  if(it.left<=0){const A=ARMS[it.k];S[it.k]=(S[it.k]||0)+1;q.splice(i,1);log(`🏭 Готово: ${A.n.toLowerCase()} сошла с конвейера`);say(`${A.n} — новая единица на вооружении`,A.ic);toast(`${A.ic} Произведено: ${A.n}`);armFx(it.k,'buy')}
 }
}
function mfgPanel(){
 const q=mq(),sl=mSlots();
 const rows=q.length?q.map((it,i)=>{const A=ARMS[it.k],pr=Math.round((1-it.left/it.total)*100);return`<div class="mini mfgrow"><b>${A.ic} ${A.n}</b><small class="muted">Осталось ${Math.max(0,it.left)} мес.</small><div class="bar"><i style="width:${pr}%"></i></div><div class="actions"><button class="danger" onclick="makeCancel(${i})">Отменить</button></div></div>`}).join(''):'<p class="muted">Конвейер пуст. Нажмите «🏭 Произвести» у нужного оружия.</p>';
 return`<div class="mini mfgbox" style="margin-bottom:8px"><b>🏭 Производство · линий занято ${q.length} / ${sl}</b><small class="muted">Линий = воен. заводы ÷ 3. Производство стоит 60% цены, плюс сталь и часть вооружения, зато дешевле покупки. При 12+ заводах работает вдвое быстрее.</small>${rows}</div>`;
}
window.setQty=n=>{S.qty=n;save();render()};
window.setTT=t=>{S.tt=t;save();render()};
window.salvo=(k,n,t)=>{
 if(blocked())return;const A=ARMS[k];if(!A)return;
 t=t||S.tt||'mil';n=n||S.qty||1;
 if(!(S[k]>0))return toast('Сначала купите');
 if(!atWar()||!TG0[k]||n<2||k==='bomb'){if(k==='bomb'&&n>1)toast('Бомбу применяют по одной');return fire(k,TG0[k]&&atWar()?t:undefined)}
 const sv={outs:[],mute:true},st0=S[k];n=Math.min(n,st0);
 window.__salv=sv;try{for(let i=0;i<n&&S[k]>0;i++)fire(k,t)}finally{window.__salv=null}
 const used=st0-S[k];if(used<1){render();return}
 const dn=sv.outs.filter(x=>x.down).length,hit=used-dn,w=tgtWar(),TN={mil:'военные цели',infra:'инфраструктуру',civ:'гражданские цели'}[t]||'цели';
 log(`${A.ic} Залп ×${used}: ${A.n.toLowerCase()} по ${w.n} (${TN}). Попало ${hit}, сбито ПВО врага ${dn}. 📉 ВВП врага −${(sv.eco||0).toFixed(1)}%.`);
 say(`Залп ×${used}: ${hit} попаданий, ${dn} сбито ПВО`,A.ic);
 warNews(w,A.ic,`Наш залп ×${used}: ${hit} попаданий, ${dn} сбито ПВО · ВВП врага −${(sv.eco||0).toFixed(1)}%`);sv.outs.forEach(x=>recordWarAttack(w,'ours',k,x.reg,x.down));
 strikeScene({kind:'strike',k,enemy:w.n,shots:sv.outs.map(x=>({regId:x.reg&&x.reg.id,down:x.down})),title:`${A.ic} Залп ×${used} → ${w.n}`,sub:`Попало ${hit} · сбито ПВО ${dn} · ВВП врага −${(sv.eco||0).toFixed(1)}%`});
 toast(`${A.ic} Залп ×${used}: попало ${hit}, сбито ПВО ${dn} · ВВП врага −${(sv.eco||0).toFixed(1)}%`);
 save();render();
};
function armsCard(){
 if(window.__NG_MP)return ''; // в сетевой игре склад и залпы управляются сервером во вкладке «Мультиплеер»
 const q=S.qty||1,tt=S.tt||'mil',war=atWar();
 const seg=(arr,cur,fn)=>`<div class="seg">${arr.map(([v,l])=>`<button class="${v===cur?'on':''}" onclick="${fn}(${typeof v==='number'?v:"'"+v+"'"})">${l}</button>`).join('')}</div>`;
 const ctl=`<div class="mini armctl"><small class="muted">Сколько покупать и стрелять за один тык</small>${seg([[1,'×1'],[10,'×10'],[20,'×20']],q,'setQty')}${war?`<small class="muted">Куда бить</small>${seg([['mil','🎯 Военные'],['infra','🏗 Инфра'],['civ','🏘 Граждане'],['pvo','📡 ПВО врага']],tt,'setTT')}<small class="muted">💥 Бить по экономике врага: отрасли связаны цепочкой — удар по энергосети гасит топливо, заводы и оборонку</small>${seg(window.InterDep?InterDep.TKEYS.map(x=>[x,InterDep.TARGETS[x].n]):[],tt,'setTT')}`:''}</div>`;
 const rows=ARMK.map(k=>{const A=ARMS[k],have=S[k]||0,lock=A.mil&&S.mil<A.mil,sh=Math.max(1,Math.min(q,have)),fireOk=war&&TG0[k];
  return`<div class="mini arm"><div class="armhead"><b>${A.ic} ${A.n}</b><span class="armcnt">${fmt(have)}</span></div><small class="muted">${A.t}${A.eq?` · −${A.eq} воор.`:''}</small>
  <div class="armbtns"><button onclick="buy('${k}',${q})">${lock?'🔒 ':''}Купить${q>1?' ×'+q:''}<br><small>${fmt(A.c*q)} млн</small></button>${war?`<button class="danger${have?'':' dim'}" onclick="salvo('${k}')">🔥 Огонь${sh>1?' ×'+sh:''}<br><small>${({mil:'военные',infra:'инфраструктура',civ:'гражданские'}[tt]||'цели')}</small></button>`:''}</div></div>`}).join('');
 return card('💣 Арсенал',tgtPanel()+ctl+`<p class="muted">Производство размещается и управляется во вкладке «Военные заводы» → «Военно-промышленный комплекс». Здесь можно покупать готовое вооружение и применять его во время войны.</p><div class="cards armlist">${rows}</div><details class="fold hint" data-fold="armhint"><summary>ℹ Подсказки</summary><p class="muted">Во время войны выберите тип цели и количество залпа, затем нажмите «Огонь». Производство оружия ведётся специализированными предприятиями в промышленности. В мирное время кнопки стрельбы не показываются; военные учения доступны отдельно во вкладке армии.</p></details>`)}
/* ---- объединённые вкладки: всё по теме на одной странице, секции сворачиваются ---- */
const FOLD=window.__fold=window.__fold||{};
function fold(id,title,html,def){const o=(id in FOLD)?FOLD[id]:!!def;return`<details class="fold" data-fold="${id}" ${o?'open':''}><summary>${title}</summary><div class="foldbody">${html}</div></details>`}
const tryH=f=>{try{return f()}catch(e){console.warn('fold',e);return'<p class="muted">Раздел временно недоступен</p>'}};
const _ct=$('#content');if(_ct)_ct.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.fold)FOLD[d.dataset.fold]=d.open},true);
function mergeEco(c){return autoPurchaseCard()+fold('e0','▤ Сводка',c,1)+fold('e1','💰 Финансы и налоги',tryH(()=>finTab0()+fxCard()+card('🏭 Экономические программы',xcards(ECO2,'e'))))+fold('e2','🚢 Торговля и импорт',tryH(marketTab))+fold('e3','🏭 Заводы и стройки',tryH(indTab))+(window.NGRES?fold('e4','⛏ Недра и ресурсы',tryH(()=>NGRES.panel())):'')}
function mergeMil(c){return c+fold('m2','🎖 Военный штаб',tryH(staffTab))}
function mergePol(c){return fold('p0','🏛 Партии и выборы',c,1)+fold('p1','🗳 Власть и управление',tryH(()=>card('🗳 Власть и политика',`<p class="muted">Режим: <b>${S.gov}</b> · легитимность ${Math.round(S.legitimacy)}% · риск переворота ${Math.round(S.coupRisk)}%</p>`+xcards(POL,'p'))))+fold('p2','📜 Законы и реформы',tryH(billsTab))+fold('p3','🧑‍💼 Советники',tryH(advTab))+fold('p4','👥 Население',tryH(peopleTab))+fold('p5','📣 Общественная политика',tryH(politicalSystemCard))+fold('p6','🏗 Национальные проекты',tryH(nationalProjectsCard))}
function addonTab(){ensure();let b=outBanner();if(tab==='resources'&&window.NGRES)return b+NGRES.panel();let hx=hoiTab();if(hx!=null)return b+hx;
if(tab=='charts')return b+chartsHtml();if(tab=='finance')return b+finTab0()+fxCard()+card('🏭 Экономические программы',xcards(ECO2,'e'));if(tab=='power')return b+card('🗳 Власть и политика',`<p class="muted">Режим: <b>${S.gov}</b> · легитимность ${Math.round(S.legitimacy)}% · риск переворота ${Math.round(S.coupRisk)}%</p>`+xcards(POL,'p'));
if(tab=='people')return b+`<div class="grid">${card('👥 Что говорят люди',feedHtml())}${card('Настроение страны',bar('Одобрение',S.approval)+bar('Стабильность',S.stability)+`<p class="muted">Недовольство регионов: ${S.regions.map(r=>`${r.name} ${Math.round(r.unrest)}%`).join(' · ')}</p>`)}</div>`;
if(tab=='deputies'){
 const l=Math.round(depLoyal());
 const roles=['Бюджетный комитет (+25 млн/мес)','Комитет науки (+наука/мес)','Региональный комитет (+стаб./мес)','Комитет экономики (+доверие/мес)'];
 const bonusTxt=l>=65?`Парламент активно работает: <b>+${Math.round(2+(l-60)/10)} пол. власти/мес</b>, рост ВВП и сдерживание инфляции.`:'Повысьте среднюю лояльность выше <b>65%</b>, чтобы парламент давал бонусы к полит. власти, ВВП и бюджету.';
 return b+card('🏛 Депутаты парламента',`<p class="muted">Средняя лояльность: <b>${l}%</b> (ниже 20% — вотум недоверия). ${bonusTxt}</p><div class="actions" style="margin-bottom:10px"><button class="primary" onclick="parlOrder('laws')">📜 Пакет реформ (лояльность ≥60%: +15 пол. власти, −1% инфл.)</button><button onclick="parlOrder('audit')">🔍 Аудит казны (+600 млн, лояльность −5%)</button><button onclick="parlOrder('regions')">🤝 Выезд в регионы (стаб. +3, одобр. +2 · 300 млн)</button></div><div class="cards">${S.deps.map((d,i)=>`<div class="mini"><b>${d.n}</b><small class="muted">${d.p} · ${d.l>60?roles[i%4]:'Нужна лояльность >60% для работы комитета'}</small>${bar('Лояльность',d.l)}<div class="actions"><button onclick="dep(${i},'meet')">Встреча</button><button onclick="dep(${i},'bribe')">Подкуп · 200</button><button class="danger" onclick="dep(${i},'expel')">Заменить</button></div></div>`).join('')}</div>`);
}
if(tab=='arms')return b+armsCard();
if(tab=='comeback')return S.out?b+card('🔙 Путь к возвращению (25 способов)',`<div class="cards">${RET.map((n,i)=>{let my=S.parties.find(p=>p.name===S.playerParty);return`<div class="mini"><b>${n}</b>Цена ${100+(i%6)*80} млн · шанс ~${Math.round(((8+(i*7)%22)/100+(my?my.support:0)/300)*100)}%<div class="actions"><button class="primary" onclick="ret(${i})">Попробовать</button></div></div>`}).join('')}</div>`):card('Возврат','Вы у власти. Эта вкладка нужна, только если вас сместят.');
if(tab=='diplomacy')return b+`<div class="grid">${worldCard()}${vassalPanel()}${regimePanel()}${aiPanel()}${window.NationsAI?NationsAI.econPanel(S)+NationsAI.panel(S):''}${card('🌐 Дипломатия и отношения',wlPanel('dip'))}</div>`;
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
rateup:[0,()=>{S.inflation=clamp(S.inflation-4.5,0,100);S.trust=clamp(S.trust+4);S.gdp*=.994;S.approval=clamp(S.approval-2)},'Повысить ключевую ставку ЦБ','Инфляция −4.5%, доверие +4, но ВВП −0.6%'],
sterilize:[2500,()=>{S.inflation=clamp(S.inflation-5,0,100);S.printed=Math.max(0,(S.printed||0)-8);S.trust=clamp(S.trust+3)},'Стерилизация денежной массы','Сжечь лишнюю эмиссию: инфляция −5% · 2500'],
gamble:[3000,()=>{if(Math.random()<.45){S.money+=6000;say('Государство выиграло на бирже!','🤑');log('Биржа принесла прибыль +6000')}else{S.approval=clamp(S.approval-3);S.legitimacy=clamp(S.legitimacy-3);say('Правительство проиграло наши налоги на бирже!','🤬');log('Биржевая авантюра провалилась')}},'Игра на бирже','45% удвоить деньги, 55% потерять всё · 3000'],
steal:[0,()=>{S.money=Math.max(0,S.money-2000);S.stolen=(S.stolen||0)+2000;if(Math.random()<.25){S.legitimacy=clamp(S.legitimacy-15);S.approval=clamp(S.approval-10);S.coupRisk=clamp(S.coupRisk+8);say('Журналисты нашли дворцы у министров!','🤬');log('Скандал: хищение из казны вскрыто')}},'Присвоено из казны 2000','Вы богатеете, но 25% шанс скандала'],
mega:[6000,()=>{S.mega=(S.mega||0)+1;S.approval=clamp(S.approval+6);S.gdp+=300;S.legitimacy=clamp(S.legitimacy-3)},'Начат мегапроект (дворец/олимпиада)','Одобрение +6, но −80/мес · 6000'],
devalue:[0,()=>{S.inflation=clamp(S.inflation+6,0,100);S.trust=clamp(S.trust-5);S.gdp*=1.01;fxShock(.12)},'Девальвация валюты','Экспорт растёт, но цены и недоверие'],
default:[0,()=>{S.debt=0;S.trust=5;S.gdp*=.95;S.stability=clamp(S.stability-10);S.approval=clamp(S.approval-5);fxShock(.5)},'ОБЪЯВЛЕН ДЕФОЛТ','Долг = 0, но рынки закрыты и хаос']};
window.fin=k=>{if(blocked())return;let e=ECO[k];if(S.money<e[0])return toast('Недостаточно средств');S.money-=e[0];e[1]();clampFix();log(e[2]);doc0(e[2]);save();render();toast(e[2])};
const doc0=t=>{S.documents.unshift({name:t,type:'Бюджет',text:'Решение правительства.',date:`${months[S.month]} ${S.year}, год`});S.documents=S.documents.slice(0,60)};
const clampFix=()=>{['stability','approval','legitimacy','food','fuel','steel','coupRisk'].forEach(k=>S[k]=clamp(S[k]))};
/* Давление политики на ВВП как УРОВЕНЬ, а не ежемесячный вычет: меняется только разница с прошлым месяцем
   (раньше высокие налоги, национализация и низкое доверие срезали ВВП каждый месяц без конца). */
function gdpLevel(key,p){const L=S._lvl=S._lvl||{},prev=L[key]||0;p=Math.max(0,Math.min(.4,p));if(Math.abs(p-prev)<1e-9)return;S.gdp=Math.max(100,S.gdp*(1-p)/(1-prev));L[key]=p}
function econTick(){aiMonetaryGovernor();let t=S.trust,pr=S.printed=(S.printed||0)*.93;monetaryTick();
if(S.tax>35){EconCore.track(S,'Высокий налог',()=>{S.gdp*=1-(S.tax-35)*.0006});S.employment=clamp(S.employment-(S.tax-35)*.03,60,100);S.approval=clamp(S.approval-(S.tax-35)*.04);t-=.3}
if(S.health<5){S.approval=clamp(S.approval-.4);if(Math.random()<.05){S.pop=Math.round(S.pop*.995);log('Вспышка болезни: нет денег на медицину');say('В больницах нет лекарств','😢')}}
if(S.education<5)S.tech=clamp(S.tech-.3);if(S.defense<5)S.coupRisk=clamp(S.coupRisk+.8);
if(S.debt>0)S.money-=Math.round(S.debt*(.002+Math.max(0,60-t)*.0002));
S.inflation=clamp(S.inflation+pr*.01,0,100);if(pr>15)t-=1;
if(S.debt>S.gdp*.35)t-=.7;if(S.inflation>20)t-=.5;if(S.stability<30)t-=.3;if(S.inflation<8&&S.debt<S.gdp*.2)t+=.4;
S.money+=(S.nat||0)*60-(S.priv||0)*30-(S.mega||0)*80;EconCore.track(S,'Национализация',()=>{S.gdp*=1-(S.nat||0)*.0005});
S.trust=clamp(t);
if(S.trust<25){EconCore.track(S,'Низкое доверие рынков',()=>{S.gdp*=1-(25-S.trust)*.0007});S.money-=200;if(Math.random()<.15){S.money*=.7;S.approval=clamp(S.approval-8);log('🏦 Банковская паника: вкладчики забирают деньги');say('Деньги из банков не выдают!','😱')}}
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

function ask(t,cb,yes,no,onNo){let d=document.createElement('div');d.className='gameover';d.style.zIndex=60;d.innerHTML=`<div class="gameover-box"><p>${t}</p><div class="row" style="justify-content:center"><button class="danger" id="askY">${yes||'Да, начать'}</button><button id="askN">${no||'Отмена'}</button></div></div>`;document.body.appendChild(d);d.querySelector('#askY').onclick=()=>{d.remove();cb()};d.querySelector('#askN').onclick=()=>{d.remove();if(onNo)onNo()}}

/* ===================================================================
   v3: РАНДОМНЫЕ СОБЫТИЯ + МЕХАНИКИ ИЗ HEARTS OF IRON IV
   =================================================================== */
const mt=()=>(S.year-1)*12+S.month;
window.H=window.H||{};
H.missionStart=missionStart;
const FXN={'gdp%':'ВВП %',fxs:'Курс валюты %',approval:'Одобрение',stability:'Стабильность',legitimacy:'Легитимность',money:'Казна',gdp:'ВВП',food:'Еда',fuel:'Топливо',steel:'Сталь',equipment:'Вооружение',ammo:'Боеприпасы',energy:'Энергия',tech:'Технологии',army:'Армия',morale:'Боевой дух',training:'Подготовка',threat:'Угроза',coupRisk:'Риск переворота',inflation:'Инфляция',employment:'Занятость',trust:'Доверие рынков',pop:'Население',debt:'Долг',pp:'Пол. власть',party:'Рейтинг партии',rivals:'Соперники',rel:'Отношения',relr:'Отношения с одной страной',reg:'Недовольство регионов',loy:'Лояльность регионов',dep:'Депутаты',navy:'Флот',air:'Авиация',infra:'Инфраструктура',civ:'Гражд. заводы',mil:'Воен. заводы',dock:'Верфи',rslots:'Слоты науки',bslots:'Слоты стройки',peace:'Мир'};
const BADUP=new Set(['threat','coupRisk','inflation','debt','reg','fxs']);
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
   case'gdp%':S.gdp=Math.max(100,S.gdp*(1+v/100));break;case'fxs':fxShock(v/100);break;
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
 O('Вмешаться в рынок',{trust:4,inflation:-.5,fxs:-8},'Центробанк потратил резервы.',500),
 O('Не вмешиваться',{trust:-3,money:250,inflation:1,fxs:10},'Курс упал, рынок «сам разберётся».')]),
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
/* ---------- НОВЫЕ СОБЫТИЯ: ЭКОНОМИКА, ТЕХНОЛОГИИ И ОБЩЕСТВО ---------- */
E('cybergrid','Кибератака на энергосеть','Скоординированная атака вывела из строя часть цифровых систем энергоснабжения.',[
 O('Оплатить экстренную защиту',{money:-650,energy:3,trust:2},'Энергосеть восстановлена, специалисты закрыли уязвимости.'),
 O('Отключить уязвимые узлы',{energy:-3,gdp:-180,stability:1},'Ущерб ограничен, но производство временно замедлилось.')]),
E('oilshock','Мировой нефтяной шок','Крупные экспортёры сократили поставки топлива, цены на энергию резко выросли.',[
 O('Создать стратегический резерв',{money:-550,fuel:8,inflation:1},'Резерв создан, но бюджет понёс дополнительные расходы.'),
 O('Перейти на экономию',{fuel:2,gdp:-220,approval:-1},'Потребление снижено ценой замедления экономики.')]),
E('supplychain','Разрыв цепочек поставок','Ключевой зарубежный поставщик остановил отгрузки промышленного оборудования.',[
 O('Найти новых партнёров',{money:-400,rel:3,equipment:3},'Новые контракты частично закрыли дефицит.'),
 O('Запустить местное производство',{money:-700,tech:2,gdp:100},'Импортозамещение началось, но потребует времени.')]),
E('bankpanic','Паника на финансовом рынке','Крупный банк столкнулся с массовым снятием вкладов. Риск заражения растёт.',[
 O('Предоставить ликвидность',{money:-800,trust:4,inflation:1},'Отток вкладов остановлен.'),
 O('Не вмешиваться',{trust:-6,gdp:-250,stability:-2},'Кризис доверия ударил по кредитованию.')]),
E('techbreak','Технологический прорыв','Исследовательская группа представила перспективную технологию для промышленности.',[
 O('Масштабировать разработку',{money:-500,tech:5,gdp:180},'Разработка переходит к промышленному внедрению.'),
 O('Продать лицензию',{money:650,rel:2,tech:1},'Лицензия принесла доход, часть технологий ушла за рубеж.')]),
E('leakcabinet','Утечка из кабинета министров','В прессу попали документы о разногласиях внутри правительства.',[
 O('Опубликовать полный отчёт',{legitimacy:3,approval:1,stability:-1},'Открытость снизила подозрения, но обнажила конфликт.'),
 O('Начать расследование',{money:-250,legitimacy:-1,coupRisk:-2},'Утечка локализована, расследование продолжается.')]),
E('harvestcrisis','Неурожай в нескольких регионах','Засуха и вредители сократили прогнозируемый сбор зерна.',[
 O('Закупить продовольствие',{money:-450,food:8,inflation:.5},'Импорт смягчил дефицит.'),
 O('Ограничить экспорт',{food:4,relr:-3,approval:-1},'Внутренний рынок защищён, партнёры недовольны.')]),
E('railstrike','Железнодорожный кризис','Износ инфраструктуры и спор о зарплатах вызвали перебои грузовых перевозок.',[
 O('Срочно отремонтировать пути',{money:-600,gdp:120,approval:1},'Главные маршруты восстановлены.'),
 O('Ввести временное расписание',{fuel:-2,gdp:-200,stability:-1},'Перевозки продолжаются с задержками.')]),
E('borderrefugees','Крупный поток беженцев','Обострение в соседнем регионе вызвало прибытие большого числа людей к границе.',[
 O('Развернуть гуманитарные пункты',{money:-350,legitimacy:2,approval:1,relr:3},'Люди получили помощь, нагрузка на бюджет выросла.'),
 O('Усилить пограничный контроль',{money:-150,stability:1,relr:-4},'Поток ограничен, отношения с соседями ухудшились.')]),
E('officerreform','Реформа военного командования','Военные предлагают обновить систему подготовки и снабжения армии.',[
 O('Провести реформу',{money:-500,training:5,morale:2,equipment:-1},'Командование обновлено, армия получила новый стандарт подготовки.'),
 O('Отложить реформу',{money:100,morale:-1,approval:-1},'Расходы отложены, недовольство офицеров осталось.')],{when:()=>!S.war||S.wars.length>0}),
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
 S.mevlast=mt();const sm=ch(m.fx);log(`${m.e||'•'} ${m.x}. (${sm})`);say(m.x,m.e||'🙂');
}
function evTick(){
 if(S.event){
  S.event.age++;evModal();
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
 // События не должны сыпаться одно за другим: мелкие происшествия отделены паузой,
 // крупные решения — минимум четырьмя игровыми месяцами.
 if(!Number.isFinite(S.mevlast))S.mevlast=-9;
 if(mt()-S.mevlast>=2&&Math.random()<.12)fireMinor();
 if(mt()-S.evlast>=4&&mt()-S.mevlast>=2&&Math.random()<.12*Math.sqrt(difficulty().unrest)){const id=rollEvent();if(id)openEvent(id)}
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
window.goTab=t=>{tab=(t==='events'?'overview':t);render();window.scrollTo(0,0)};
/* Событие всплывает окном прямо поверх текущей вкладки: никуда не переходим, сразу выбор */
function evModal(show){
 let m=document.getElementById('evmodal');
 const e=(S&&S.event&&EVM[S.event.id]&&!S.out&&!S.campaignOver)?EVM[S.event.id]:null;
 if(!e){if(m){m.classList.add('out');setTimeout(()=>{if(m.classList.contains('out'))m.remove()},230)}return}
 if(!m&&!show)return;
 const left=3-S.event.age;
 if(!m||m.classList.contains('out')||m.dataset.id!==S.event.id){
  if(m)m.remove();
  m=document.createElement('div');m.id='evmodal';m.dataset.id=S.event.id;
  m.onclick=ev=>{if(ev.target===m)evClose()};
  m.innerHTML=`<div class="evbox"><button class="evclose" onclick="evClose()" aria-label="Закрыть">✕</button><div class="evtag"></div><h3>${e.t}</h3><p>${e.x}</p>`+e.o.map((o,i)=>`<div class="choice"><button class="primary" data-i="${i}" onclick="resolveEvent(${i})">${o.t}${o.c?' · '+o.c+' млн':''}</button><div class="hint">${o.p!=null?`<b>${Math.round(o.p*100)}%:</b> ${hintFx(o.fx)} <br><b>иначе:</b> ${hintFx(o.bf)}`:hintFx(o.fx)}</div></div>`).join('')+`</div>`;
  document.body.appendChild(m);
 }
 m.querySelector('.evtag').textContent='📰 Событие · на решение: '+left+' мес.';
 e.o.forEach((o,i)=>{const b=m.querySelector('button[data-i="'+i+'"]');if(b)b.classList.toggle('poor',!!(o.c&&S.money<o.c))});
}
window.evOpen=()=>evModal(true);
window.evClose=()=>{const m=document.getElementById('evmodal');if(!m)return;m.classList.add('out');setTimeout(()=>{if(m.classList.contains('out'))m.remove()},230)};
function evBanner(){
 if(!S.event||!EVM[S.event.id]){evModal();return''}
 evModal();
 return `<section class="panel evbanner">📰 <b>${EVM[S.event.id].t}</b> — нужно решение (осталось ${3-S.event.age} мес.) <button class="primary" onclick="evOpen()">Открыть</button></section>`;
}
function spiritsCard(){return S.spirits&&S.spirits.length?card('🌟 Национальные духи',S.spirits.map(s=>`<div class="mini"><b>${s.n}</b><span class="muted">ещё ${s.left} мес.</span><br><small>${hintFx(s.fx)} / мес</small></div>`).join('')):''}
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
 const d={captured:[],lost:[],pp:60,civ:18,mil:6,dock:2,evq:[],evcd:{},evlast:-9,mevlast:-9,mlast:[],spirits:[],wars:[],just:{},relPrograms:{},puppets:[],flags:{},techs:{},research:[],rslots:2,build:[],bld:{},sanc:{},supp:{},bslots:2,adv:{pol:null,mil:null,eco:null},law:{eco:'civ',con:'vol'},doc:null,focus:{done:{},cur:null,p:0},martial:false,bud:{},tx:{},bills:{},gr:{workers:55,biz:55,pens:55,stud:55,mil:55,farm:55},polSys:{protest:12,lastUnrest:-99,lastCampaign:-99,lastCabinet:-99},spyNetworks:{},spyReports:{},spyCooldowns:{},counterIntel:0,embassies:{},nationalProject:null,globalCrisis:null,globalHistory:[],globalNext:24,mk:{m:{food:1,fuel:1,steel:1,energy:1,equipment:1,ammo:1},prev:{},q:{food:30,fuel:30,steel:30,energy:30,equipment:30,ammo:30},imp:0,exp:0},autoPurchase:{enabled:false,items:{food:{on:false,target:55,amount:10},fuel:{on:false,target:45,amount:10},steel:{on:false,target:45,amount:10},energy:{on:false,target:45,amount:10},equipment:{on:false,target:40,amount:5},ammo:{on:false,target:40,amount:5}}}};
 for(const k in d)if(S[k]==null)S[k]=d[k];
 S.polSys=Object.assign({protest:12,lastUnrest:-99,lastCampaign:-99,lastCabinet:-99},S.polSys||{});S.spyNetworks=S.spyNetworks||{};S.spyReports=S.spyReports||{};S.spyCooldowns=S.spyCooldowns||{};S.counterIntel=clamp(+S.counterIntel||0,0,5);S.nationalProject=S.nationalProject&&typeof S.nationalProject==='object'?S.nationalProject:null;S.globalHistory=Array.isArray(S.globalHistory)?S.globalHistory:[];if(!Number.isFinite(S.globalNext))S.globalNext=mt()+18;if(!Number.isFinite(S.mevlast))S.mevlast=-9;
 if(!S.relPrograms)S.relPrograms={};
 if(!S.embassies)S.embassies={};
 if(!S._relAttackCapV1){const affected=new Set((S.wars||[]).map(w=>w.n));Object.keys(S.sanc||{}).forEach(n=>affected.add(n));affected.forEach(n=>{const c=(S.relations||[]).find(x=>x.name===n);if(c&&c.value<-30)c.value=-30});S._relAttackCapV1=1;}
 if(!S.autoPurchase)S.autoPurchase=d.autoPurchase;else{S.autoPurchase.items=S.autoPurchase.items||{};for(const k in d.autoPurchase.items)if(!S.autoPurchase.items[k])S.autoPurchase.items[k]=d.autoPurchase.items[k];}
 if(!S.mk)S.mk=d.mk;else{S.mk.m=S.mk.m||d.mk.m;S.mk.prev=S.mk.prev||{};S.mk.q=S.mk.q||d.mk.q;for(const k in d.mk.q)if(S.mk.q[k]==null)S.mk.q[k]=d.mk.q[k];if(S.mk.imp==null)S.mk.imp=0;if(S.mk.exp==null)S.mk.exp=0;}
 if(S.event&&!S.event.id)S.event=null;
 if(!S.regions.find(r=>r.name==='Центральный округ')&&!(S.lost||[]).includes('Центральный округ'))S.regions.push({name:'Центральный округ',pop:1100000,wealth:58,loyalty:66,unrest:15,industry:52,infra:62,resource:'Агро'});
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
const BUILD={
 // k: гражданские объекты
 civ:{g:'civ',n:'Гражданский завод',c:500,m:12,t:'+10 млн/мес к доходу · стройка ~год',ic:'🏭'},
 power:{g:'civ',n:'Электростанция',c:650,m:10,t:'Энергия +0.15/мес',ic:'⚡'},
 refinery:{g:'civ',n:'Нефтеперерабатывающий завод',c:600,m:9,t:'Топливо +0.12/мес',ic:'⛽'},
 steelw:{g:'civ',n:'Металлургический комбинат',c:550,m:9,t:'Сталь +0.12/мес',ic:'🔩'},
 agro:{g:'civ',n:'Агрокомплекс',c:400,m:6,t:'Продовольствие +0.12/мес',ic:'🌾'},
 oildepot:{g:'civ',n:'Нефтехранилище',c:450,m:6,t:'Резерв топлива +30 сверх 100% · пополняется излишками и выдаётся при нехватке',ic:'🛢'},
 granary:{g:'civ',n:'Элеватор (зернохранилище)',c:380,m:5,t:'Резерв продовольствия +30 сверх 100% · пополняется излишками и выдаётся при нехватке',ic:'🌾'},
 steeldepot:{g:'civ',n:'Склад металла',c:400,m:5,t:'Резерв стали +30 сверх 100% · пополняется излишками и выдаётся при нехватке',ic:'🔩'},
 port:{g:'civ',n:'Торговый порт',c:700,m:10,t:'+6 млн/мес торговли',ic:'🚢'},
 rail:{g:'civ',n:'Железная дорога',c:800,m:12,t:'Инфраструктура регионов +2, стабильность +1',ic:'🚆'},
 hospital:{g:'civ',n:'Больница',c:350,m:6,t:'Одобрение +2, стабильность +1',ic:'🏥'},
 univ:{g:'civ',n:'Университет',c:500,m:10,t:'ВВП +0.4%, одобрение +1',ic:'🎓'},
 // военные объекты (доступны всегда)
 mil:{g:'mil',n:'Военный завод',c:450,m:12,t:'Выпуск вооружения и боеприпасов · −6 млн/мес, тратит сталь · стройка ~год',ic:'⚙️'},
 dock:{g:'mil',n:'Верфь',c:600,m:12,t:'Нужна для кораблей (до 6 кораблей на верфь) · стройка ~год',ic:'⚓'},
 ship:{g:'mil',n:'Боевой корабль',c:700,m:8,t:'Флот +1',ic:'🚢'},
 sq:{g:'mil',n:'Авиаэскадрилья',c:550,m:6,t:'Авиация +2 (нужно 4+ воен. завода)',ic:'✈️'},
 fort:{g:'mil',n:'Укрепрайон',c:350,m:4,t:'Угроза −5, боевой дух +1',ic:'🧱'},
 barracks:{g:'mil',n:'Казармы',c:400,m:6,t:'Армия +8 000 чел.',ic:'🏕'},
 depot:{g:'mil',n:'Военный склад',c:350,m:4,t:'Вооружение +12, боеприпасы +12',ic:'📦'},
 // военные объекты только во время войны
 bunker:{g:'war',n:'Бункерная линия',c:500,m:5,t:'Угроза −8, боевой дух +1',ic:'🛡'},
 aabat:{g:'war',n:'Позиции ПВО',c:450,m:4,t:'Перехватывает часть воздушных ударов; повышает шанс сбить дроны и ракеты',ic:'📡'},
 milhosp:{g:'war',n:'Военный госпиталь',c:400,m:4,t:'Боевой дух +3 и +0.2/мес на войне',ic:'🏥'},
 airfield:{g:'war',n:'Военный аэродром',c:800,m:6,t:'Авиация +3 (нужна 1 эскадрилья)',ic:'🛫'},
 base:{g:'war',n:'Военная база',c:900,m:8,t:'Армия +15 000 чел., подготовка +3',ic:'🏰'},
 silo:{g:'war',n:'Ракетная шахта',c:1200,m:10,t:'Ракеты в арсенале +2 (нужно 8+ воен. заводов)',ic:'🚀'}
};
const BGROUPS=[['civ','🏙 Гражданские объекты'],['mil','⚔️ Военные объекты'],['war','🔥 Только во время войны']];
const atWar=()=>!!((S.wars&&S.wars.length)||(S.mpWars&&S.mpWars.length));
const bcount=k=>(S.bld&&S.bld[k])||0;
const bslotsN=()=>Math.max(S.bslots,4)+(S.flags.bs?1:0)+advSum('bs');
H.build=k=>{
 if(blocked())return;const B=BUILD[k];
 if(S.build.length>=bslotsN())return toast('Нет свободных слотов стройки');
 if(k==='ship'&&S.navy>=S.dock*6)return toast('Нужно больше верфей');
 if(k==='sq'&&S.mil<4)return toast('Нужно 4+ военных завода');
 if(B.g==='war'&&!atWar())return toast('Этот объект можно строить только во время войны');
 if(k==='airfield'&&S.air<1)return toast('Нужна хотя бы одна авиаэскадрилья');
 if(k==='silo'&&S.mil<8)return toast('Нужно 8+ военных заводов');
 if(S.money<B.c)return toast('Недостаточно средств');
 S.money-=B.c;S.build.push({t:k,left:B.m,m:B.m});log(`Начато строительство: ${B.n}.`);save();render();
};
/* Отдача построек на ВВП: доля стоимости, которая возвращается приростом выпуска. Чем крупнее экономика, тем меньше отдача (убывающая доходность). */
const BGDP={civ:.9,port:.8,rail:.7,power:.6,refinery:.5,steelw:.5,agro:.4,hospital:.25,oildepot:.1,granary:.1,steeldepot:.1,mil:.2,dock:.15};
function bldGdpGain(k){const B=BUILD[k],r=BGDP[k];return B&&r?B.c*r/(1+Math.max(0,S.gdp)/150000):0}
function buildTick(){
 S.build=S.build.filter(b=>{
  /* стройка гражданских объектов сама даёт спрос: зарплаты, материалы, подрядчики */
  {const Bd=BUILD[b.t];if(Bd&&Bd.g==='civ'&&b.left>1)S.gdp+=Bd.c/Bd.m*.3/(1+Math.max(0,S.gdp)/150000)}
  b.left--;if(b.left>0)return true;
  const k=b.t;
  if(!BUILD[k])return false;
  {const g=bldGdpGain(k);if(g>0){S.gdp+=g;log(`📈 ${BUILD[k].n}: ВВП +${Math.round(g)}`)}}
  if(k==='civ')S.civ++;else if(k==='mil')S.mil++;else if(k==='dock')S.dock++;else if(k==='ship')S.navy++;else if(k==='sq')S.air+=2;else if(k==='fort'){S.threat=clamp(S.threat-5);S.morale=clamp(S.morale+1)}
  else{
   if(!S.bld)S.bld={};S.bld[k]=(S.bld[k]||0)+1;
   if(k==='rail'){S.stability=clamp(S.stability+1);S.regions.forEach(r=>r.infra=clamp(r.infra+2))}
   else if(k==='hospital'){S.approval=clamp(S.approval+2);S.stability=clamp(S.stability+1)}
   else if(k==='univ'){S.gdp*=1.004;S.approval=clamp(S.approval+1)}
   else if(k==='barracks')S.army+=8000;
   else if(k==='depot'){S.equipment=clamp(S.equipment+12);S.ammo=clamp(S.ammo+12)}
   else if(k==='bunker'){S.threat=clamp(S.threat-8);S.morale=clamp(S.morale+1)}
   else if(k==='aabat')S.threat=clamp(S.threat-4);
   else if(k==='milhosp')S.morale=clamp(S.morale+3);
   else if(k==='airfield')S.air+=3;
   else if(k==='base'){S.army+=15000;S.training=clamp(S.training+3)}
   else if(k==='silo')S.rocket=(S.rocket||0)+2;
  }
  log(`${BUILD[k].ic} Построено: ${BUILD[k].n}.`);toast('Построено: '+BUILD[k].n);return false;
 });
 // постоянные эффекты построенных объектов
 if(S.bld){
  const B=bcount;
  if(B('power'))S.energy=clamp(S.energy+.15*B('power'));
  if(B('refinery'))S.fuel=clamp(S.fuel+.12*B('refinery'));
  if(B('steelw'))S.steel=clamp(S.steel+.12*B('steelw'));
  if(B('agro'))S.food=clamp(S.food+.12*B('agro'));
  if(B('port'))S.money+=6*B('port');
  if(atWar()){S.threat=clamp(S.threat-.3*B('aabat'));S.morale=clamp(S.morale+.2*B('milhosp'))}
 }
 /* постоянный вклад мощностей в ежемесячный рост ВВП (гражданские заводы относительно базовых 18) и штрафы за нехватку ресурсов */
 {const B=bcount,cap=((+S.civ||0)-18)*.00003+B('port')*.00004+B('rail')*.00003+B('power')*.00002+B('refinery')*.00001+B('steelw')*.00001+B('agro')*.00001+B('univ')*.00002;
  let sh=0;if(!atWar()){if(S.energy<30)sh-=.001;if(S.fuel<25)sh-=.0008;if(S.food<25)sh-=.0008;if(S.steel<15)sh-=.0005}
  const d=Math.max(-.004,Math.min(.006,cap+sh));S.gdp=Math.max(100,S.gdp*(1+d))}
}
/* ---------- СТРАТЕГИЧЕСКИЕ ЗАПАСЫ: хранилища дают резерв сверх 100% ---------- */
const RSV={fuel:{b:'oildepot',n:'Топливо (нефть)',ic:'⛽'},food:{b:'granary',n:'Продовольствие (зерно)',ic:'🌾'},steel:{b:'steeldepot',n:'Сталь',ic:'🔩'}},RSVCAP=30;
function rsvEnsure(){if(!S.rsv)S.rsv={fuel:0,food:0,steel:0};return S.rsv}
const rsvCap=k=>RSV[k]?RSVCAP*bcount(RSV[k].b):0;
function rsvTick(){
 const R=rsvEnsure();
 Object.keys(RSV).forEach(k=>{
  const cap=rsvCap(k);if(!R[k])R[k]=0;if(R[k]>cap)R[k]=cap;
  if(!cap)return;
  if(S[k]>80&&R[k]<cap){const m=Math.min(S[k]-80,cap-R[k],5);S[k]-=m;R[k]+=m}
  else if(S[k]<35&&R[k]>0){const m=Math.min(35-S[k],R[k],8);S[k]+=m;R[k]-=m;if(m>=1)log(`📦 ${RSV[k].ic} Из хранилища выдано ${Math.round(m)}% ресурса «${RSV[k].n}» — запас страны был на исходе.`)}
 });
}
function storageHit(f){
 const R=rsvEnsure(),msg=[];
 [['fuel',4.5,'нефтебазы'],['food',2.5,'зернохранилища'],['steel',1.5,'склады металла']].forEach(([k,p,nm])=>{
  if(R[k]>0){const d=Math.min(R[k],p*f*(.7+Math.random()*.6));R[k]-=d;if(d>=.5)msg.push(`${nm} −${d.toFixed(1)}`)}
 });
 if(msg.length)log(`🔥 Удар по хранилищам: ${msg.join(', ')}.`);
}
function rsvLine(g){const c=rsvCap(g);return c?`<small>📦 Резерв в хранилищах: <b>${Math.round(rsvEnsure()[g])}/${c}</b></small>`:''}
H.rsvBuy=(k,n)=>{
 if(blocked()||!RSV[k])return;const R=rsvEnsure(),cap=rsvCap(k);
 if(!cap)return toast('Сначала постройте: '+BUILD[RSV[k].b].n);
 n=Math.min(n,Math.floor(cap-R[k]),S.mk.q[k]);
 if(n<=0)return toast(cap-R[k]<1?'Хранилище заполнено':'Лимит торговли на этот месяц исчерпан');
 const c=Math.ceil(mkBuy(k)*n);if(S.money<c)return toast('Недостаточно средств');
 S.money-=c;R[k]+=n;S.mk.q[k]-=n;S.mk.imp+=c;save();render();toast(`В хранилище закуплено: ${RSV[k].n} +${n} за ${fmt(c)} млн`);
};
H.rsvTake=(k,n)=>{
 if(blocked()||!RSV[k])return;const R=rsvEnsure();
 n=Math.min(n,Math.floor(R[k]),Math.floor(100-S[k]));
 if(n<=0)return toast(R[k]<1?'Хранилище пусто':'Основной запас уже полон');
 R[k]-=n;S[k]=clamp(S[k]+n);save();render();toast(`Из хранилища выдано: ${RSV[k].n} +${n}`);
};
function rsvCard(){
 const R=rsvEnsure();
 const rows=Object.keys(RSV).map(k=>{
  const d=RSV[k],b=BUILD[d.b],cap=rsvCap(k),n=bcount(d.b),q=(S.build||[]).filter(x=>x.t===d.b).length;
  return `<div class="mini"><b>${d.ic} ${d.n}</b>${bar('Основной запас',S[k])}${cap?`<div class="meter"><b>📦 В хранилище: ${Math.round(R[k])} / ${cap}</b><div class="bar"><i style="width:${Math.min(100,R[k]/cap*100)}%;background:linear-gradient(90deg,#3b6fc2,#7fb2ff)"></i></div></div>`:'<small class="muted">Хранилищ нет — резерва нет.</small>'}<small>${b.ic} ${b.n}: построено ${n}${q?`, строится ${q}`:''} · каждое даёт +${RSVCAP}</small><div class="actions"><button class="primary" onclick="H.build('${d.b}')">🏗 ${b.n} · ${b.c} млн</button>${cap?`<button onclick="H.rsvBuy('${k}',10)">Закупить 10 · ≈${Math.ceil(mkBuy(k)*10)} млн</button><button onclick="H.rsvTake('${k}',10)">Выдать 10 в запас страны</button>`:''}</div></div>`}).join('');
 return card('📦 Стратегические запасы: нефть, зерно, сталь',`<p class="muted">Обычный запас ограничен 100%. Хранилища дают дополнительный резерв сверх этого: излишки (выше 80%) уходят на склад сами, а когда запас страны падает ниже 35% — резерв выдаётся автоматически. Закупать в резерв можно по рыночной цене (лимит торговли общий с рынком). Импорт на рынке при полном складе тоже идёт в хранилища. Удары врага по инфраструктуре жгут часть резерва, так что строить хранилища лучше в запас и заранее.</p><div class="cards">${rows}</div>`);
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
const FB={ind:'🏭 Промышленность',agr:'🌾 Сельское хозяйство',fin:'💰 Финансы и налоги',trade:'🚢 Торговля и экспорт',infra:'🛣 Инфраструктура',energy:'⚡ Энергетика и инновации',mil:'🎖 Армия',pol:'🏛 Политика'};
const FOC={
 ind1:{b:'ind',n:'Промышленная программа',m:3,req:[],x:[],t:'+2 гражданских завода, ВВП +300',fx:{civ:2,gdp:300}},
 ind2:{b:'ind',n:'Расширение производства',m:4,req:['ind1'],x:[],t:'+2 военных завода, +1 слот стройки',fx:{mil:2},fl:'bs'},
 ind3:{b:'ind',n:'Железные дороги',m:3,req:['ind1'],x:[],t:'Инфраструктура +6, ВВП +200, топливо +3',fx:{infra:6,gdp:200,fuel:3}},
 ind4:{b:'ind',n:'Энергетическая революция',m:4,req:['ind3'],x:[],t:'Энергия +14, ВВП +400',fx:{energy:14,gdp:400}},
 ind5:{b:'ind',n:'Научный центр',m:4,req:['ind2'],x:[],t:'+1 слот исследований, технологии +3',fx:{rslots:1,tech:3}},
 ind6:{b:'ind',n:'Автаркия',m:4,req:['ind4'],x:['ind7'],t:'Еда +8, сталь +8, топливо +6; отношения −4, доверие −3',fx:{food:8,steel:8,fuel:6,rel:-4,trust:-3}},
 ind7:{b:'ind',n:'Открытая торговля',m:4,req:['ind4'],x:['ind6'],t:'Доверие +8, отношения +4, казна +900, инфляция −1',fx:{trust:8,rel:4,money:900,inflation:-1}},
 agr1:{b:'agr',n:'Аграрная модернизация',m:3,req:[],x:[],t:'Продовольствие +12, занятость +2, ВВП +1,5%',fx:{food:12,employment:2,'gdp%':1.5}},
 agr2:{b:'agr',n:'Поддержка фермеров',m:3,req:['agr1'],x:[],t:'Казна +500 млн, доверие +3, продовольствие +8',fx:{money:500,trust:3,food:8}},
 agr3:{b:'agr',n:'Агроэкспортный кластер',m:4,req:['agr2'],x:[],t:'ВВП +2%, казна +900 млн, отношения +4',fx:{'gdp%':2,money:900,rel:4}},
 fin1:{b:'fin',n:'Независимость центрального банка',m:4,req:[],x:[],t:'Инфляция −1,5 п.п., доверие +5',fx:{inflation:-1.5,trust:5}},
 fin2:{b:'fin',n:'Налоговая реформа',m:4,req:['fin1'],x:[],t:'ВВП +1,5%, занятость +1, казна +400 млн',fx:{'gdp%':1.5,employment:1,money:400}},
 fin3:{b:'fin',n:'Стабилизационный фонд',m:5,req:['fin2'],x:[],t:'Долг −1200 млн, инфляция −1 п.п., доверие +4',fx:{debt:-1200,inflation:-1,trust:4}},
 trade1:{b:'trade',n:'Снижение торговых барьеров',m:3,req:[],x:[],t:'Отношения +5, доверие +3, казна +300 млн',fx:{rel:5,trust:3,money:300}},
 trade2:{b:'trade',n:'Экспортная стратегия',m:4,req:['trade1'],x:[],t:'ВВП +2%, занятость +2, казна +700 млн',fx:{'gdp%':2,employment:2,money:700}},
 trade3:{b:'trade',n:'Свободная экономическая зона',m:5,req:['trade2'],x:[],t:'ВВП +2,5%, +1 гражданский завод, доверие +4',fx:{'gdp%':2.5,civ:1,trust:4}},
 infra1:{b:'infra',n:'Ремонт национальных дорог',m:3,req:[],x:[],t:'Инфраструктура +8, ВВП +1%',fx:{infra:8,'gdp%':1}},
 infra2:{b:'infra',n:'Модернизация железных дорог',m:4,req:['infra1'],x:[],t:'Инфраструктура +10, топливо +5, ВВП +1,5%',fx:{infra:10,fuel:5,'gdp%':1.5}},
 infra3:{b:'infra',n:'Цифровое государство',m:5,req:['infra2'],x:[],t:'Технологии +5, доверие +5, занятость +1',fx:{tech:5,trust:5,employment:1}},
 energy1:{b:'energy',n:'Модернизация электросетей',m:4,req:[],x:[],t:'Энергия +12, ВВП +1%',fx:{energy:12,'gdp%':1}},
 energy2:{b:'energy',n:'Возобновляемая энергетика',m:5,req:['energy1'],x:[],t:'Энергия +16, инфляция −0,5 п.п., доверие +3',fx:{energy:16,inflation:-.5,trust:3}},
 energy3:{b:'energy',n:'Высокотехнологичная промышленность',m:6,req:['energy2'],x:[],t:'Технологии +8, +1 гражданский завод, ВВП +2,5%',fx:{tech:8,civ:1,'gdp%':2.5}},
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
function aiGoalVsPlayer(name,cause){
 try{const W=S.aiWorld,n=W&&W.nations&&W.nations.find(x=>x.name===name),c=rel(name);
  if(!n||!window.GrandDiplomacy)return GrandDiplomacy.defaultGoal(cause);
  n.ideology=n.ideology||GrandDiplomacy.orientation(n);
  const me={name:S.name||S.me||'Игрок',ideology:S.ideology||'прагматизм',power:myPower(),stability:S.stability};
  return GrandDiplomacy.chooseGoal(W,n,me,{id:cause,severity:70},{relations:c?c.value:0,warScore:60});
 }catch(e){return 'tribute'}}
function aiGoalReward(name,r){try{const W=S.aiWorld,n=W&&W.nations&&W.nations.find(x=>x.name===name);if(n&&window.GrandDiplomacy)GrandDiplomacy.goalOutcome(W,n,r)}catch(e){}}
function startWar(name,def,cause,goal,region){
 /* В сетевой партии все войны между участниками создаёт только сервер комнаты.
    Локальная война с ботом здесь создаёт второй, расходящийся мир на каждом устройстве. */
 if(window.__NG_MP){log('⚠️ В сетевой партии войну нужно объявлять через «Мультиплеер → Дипломатия игроков».');return false}
 if(S.wars.some(w=>w.n===name))return;
 const GD=window.GrandDiplomacy,label=GD&&GD.CAUSES[cause||'']?GD.CAUSES[cause].label:(def?'Оборона от нападения':'Военная операция');
 if(!goal||!(GD&&GD.GOALS[goal]))goal=def?aiGoalVsPlayer(name,cause||'territorial'):(GD?GD.defaultGoal(cause):'tribute');
 if(def&&goal==='territory'&&!region){try{const n=S.aiWorld.nations.find(x=>x.name===name),cl=n&&n.claims&&n.claims[S.name||S.me||'Игрок'];region=cl&&cl.region||''}catch(e){region=''}}
 const gl=GD&&GD.GOALS[goal]?GD.GOALS[goal].label:'';
 S.wars.push({n:name,p:def?40:50,m:0,won:false,def:!!def,cause:cause||'territorial',causeLabel:label,goal,goalLabel:gl,claimRegion:region||''});S.war=true;
 S.threat=clamp(S.threat+5);log(`⚔️ Начата война: ${name}${def?' (нападение на нас)':''}. Основание: ${label}. ${def?'Цель противника':'Цель войны'}: ${gl}${region?` («${region}»)`:''}.`);
}
/* ------------------------ РЕАКЦИЯ МИРА НА АГРЕССИЮ ------------------------ */
// Друзья жертвы осуждают вас и вводят санкции, её враги — поддерживают вас.
const BLOC={
 w:['США','Великобритания','Франция','Германия','Италия','Канада','Испания','Нидерланды','Бельгия','Дания','Норвегия','Швеция','Финляндия','Польша','Литва','Латвия','Эстония','Чехия','Словакия','Румыния','Болгария','Греция','Португалия','Австрия','Ирландия','Венгрия','Хорватия','Словения','Люксембург','Исландия','Албания','Северная Македония','Черногория','Япония','Южная Корея','Австралия','Новая Зеландия','Украина','Молдова','Израиль','Кипр','Мальта'],
 e:['Россия','Китай','Иран','Северная Корея','Беларусь','Сирия','Венесуэла','Куба','Никарагуа','Мьянма','Эритрея','Мали','Буркина-Фасо','Нигер','ЦАР','Лаос']
};
const FOEP=[['Израиль',['Иран','Сирия','Ливан','Йемен','Палестина','Ирак']],['Индия',['Пакистан','Китай']],['Китай',['Япония','Вьетнам','Филиппины']],['Япония',['Северная Корея']],['Южная Корея',['Северная Корея']],['Армения',['Азербайджан','Турция']],['Греция',['Турция']],['Саудовская Аравия',['Иран','Йемен']],['Эфиопия',['Эритрея','Египет','Сомали']],['Марокко',['Алжир']],['Таиланд',['Камбоджа']],['Россия',['Украина','Грузия','Эстония','Латвия','Литва','Польша','Финляндия','Молдова']],['Сербия',['Хорватия','Албания']],['Венесуэла',['Гайана']],['Пакистан',['Афганистан']]];
const FOES={};FOEP.forEach(([a,l])=>l.forEach(b=>{(FOES[a]=FOES[a]||new Set()).add(b);(FOES[b]=FOES[b]||new Set()).add(a)}));
const blocOf=n=>BLOC.w.includes(n)?'w':BLOC.e.includes(n)?'e':null;
function ties(v){
 const f=new Set(),e=new Set(),b=blocOf(v);
 if(b){BLOC[b].forEach(x=>f.add(x));BLOC[b==='w'?'e':'w'].forEach(x=>e.add(x))}
 if(FOES[v])FOES[v].forEach(x=>{e.add(x);f.delete(x)});
 const W=S.aiWorld,nv=W&&W.nations&&W.nations.find(n=>n.name===v);
 if(nv){(nv.allies||[]).forEach(x=>{if(!e.has(x))f.add(x)});Object.keys(nv.rivals||{}).forEach(x=>{if(!f.has(x))e.add(x)});(W.wars||[]).forEach(w=>{if(w.a===v)e.add(w.b);if(w.b===v)e.add(w.a)})}
 f.delete(v);e.delete(v);const me=S.me||S.name;f.delete(me);e.delete(me);
 const ok=n=>{const c=rel(n);return c&&!c.annexed&&!c.self};
 return{f:[...f].filter(ok),e:[...e].filter(ok)};
}
const pw=n=>(rel(n)||{}).power||20;
function sanctionBy(n,v){const c=rel(n);if(!c||(S.sanc&&S.sanc[n]))return false;(S.sanc=S.sanc||{})[n]={why:v,left:12,k:clamp(c.power/100*.0012,.0003,.0014)};return true}
function supportBy(n,v){const c=rel(n);if(!c||(S.supp&&S.supp[n]))return false;(S.supp=S.supp||{})[n]={why:v,left:12,aid:Math.round(25+c.power*.5)};return true}
function worldReact(v,mode,f){
 f=f||1;const t=ties(v),all=alive().map(r=>r.name),neutral=all.filter(n=>n!==v&&!t.f.includes(n)&&!t.e.includes(n));
 const R=(n,d)=>{const c=rel(n);if(c){const attackMode=mode==='unj'||mode==='just';c.value=clamp(attackMode&&d<0?Math.max(-30,c.value+d):c.value+d,-100,100)}};
 if(mode==='unj'||mode==='just'){
  R(v,-30); // Отношения с атакованной страной из-за нападения: не ниже −30 только от этого события
  const unj=mode==='unj';
  t.f.forEach(n=>R(n,-(unj?rnd(15,30):rnd(3,6))));
  t.e.forEach(n=>R(n,unj?rnd(8,15):rnd(2,5)));
  /* Нейтральные государства не обязаны вмешиваться: только редкие символические заявления. */
  neutral.forEach(n=>{if(Math.random()<(unj?.035:.015))R(n,-rnd(1,2))});
  const sn=[],sp=[];
  if(unj){
   t.f.slice().sort((a,b)=>pw(b)-pw(a)).forEach(n=>{if(sn.length<8&&Math.random()<clamp(.35+pw(n)/200,.35,.85)&&sanctionBy(n,v))sn.push(n)});
   t.e.slice().sort((a,b)=>pw(b)-pw(a)).forEach(n=>{if(sp.length<4&&Math.random()<.6&&supportBy(n,v))sp.push(n)});
  }
  if(sn.length)log(`🌍 Санкции против вас ввели друзья ${v}: ${sn.join(', ')}.`);
  if(sp.length)log(`🤝 Вас поддержали враги ${v}: ${sp.join(', ')}.`);
  const rs=[];
  if(!unj){
   t.f.slice().sort((a,b)=>pw(b)-pw(a)).forEach(n=>{if(rs.length<4&&Math.random()<clamp(.3+pw(n)/220,.3,.7)){const k=restrictBy(n,v);if(k)rs.push(`${n}: ${RTYPE[k].n}`)}});
   if(rs.length){log(`🌍 Война обоснована, но мир её не одобряет: ${rs.join('; ')}.`);say(`Даже обоснованная война против ${v} не нравится миру: «так нельзя»`,'🗣');toast(`🌍 Меры против вас: ${rs.length}`)}
  }
  if(!sn.length&&!sp.length&&!rs.length)log(`🌍 Реакция мира на войну с ${v}: ${unj?'осуждение, санкций пока нет':'понимание'}.`);
  if(unj){say(sn.length?`Мир шокирован нападением на ${v}. ${sn.slice(0,3).join(', ')} вводят санкции`:`Нападение на ${v} осуждают`,'🌍')}
  if(unj)toast(`🌍 Санкции: ${sn.length} · поддержка: ${sp.length}`);
 }else{
  const k={mil:.4,infra:1.2,civ:3,bomb:6}[mode]*f/(mode==='bomb'?f:1);
  t.f.forEach(n=>R(n,-k));
  if(mode==='civ'||mode==='bomb')t.e.forEach(n=>R(n,-k*.2));
  /* Нейтралитет сохраняется, если у страны нет прямых интересов в конфликте. */
  if(mode==='bomb')neutral.forEach(n=>{if(Math.random()<.025)R(n,-Math.min(1,k*.15))});
  if(mode==='civ'||mode==='bomb'){const add=[];t.f.slice().sort((a,b)=>pw(b)-pw(a)).forEach(n=>{if(add.length<2&&Math.random()<(mode==='bomb'?.35:.12*f)&&sanctionBy(n,v))add.push(n)});if(add.length)log(`🌍 Новые санкции из-за ударов по гражданским/бомбы: ${add.join(', ')}.`)}
 }
}
function worldTick(){
 const sc=S.sanc||{};let k=0;
 Object.keys(sc).forEach(n=>{const s=sc[n],war=S.wars.some(w=>w.n===s.why);if(war)s.left=Math.max(s.left,12);else s.left--;if(s.left<=0){delete sc[n];log(`🌍 ${n} снимает санкции.`);return}k+=s.k});
 if(k>0){S.gdp*=1-Math.min(.006,k);S.inflation=clamp(S.inflation+Math.min(.15,k*60),0,100)}
 const rs=S.restr||{};
 Object.keys(rs).forEach(n=>{const r=rs[n],T=RTYPE[r.k],war=S.wars.some(w=>w.n===r.why);if(!T){delete rs[n];return}
  if(war)r.left=Math.max(r.left,6);else r.left--;
  if(r.left<=0){if(T.end)T.end(r);delete rs[n];log(`🌍 ${n} снимает ограничение: ${T.n}.`);return}
  if(T.tick)T.tick(r)});
 const sp=S.supp||{};
 Object.keys(sp).forEach(n=>{const s=sp[n],war=S.wars.some(w=>w.n===s.why);if(war)s.left=Math.max(s.left,12);else s.left--;if(s.left<=0){delete sp[n];log(`🤝 ${n} прекращает поддержку.`);return}S.money+=s.aid;if(war)S.equipment=clamp(S.equipment+.1)});
 // друзья жертвы вооружают её (не больше +30% к исходной мощи)
 S.wars.forEach(w=>{if(w.won)return;const c=rel(w.n);if(!c)return;if(!w.pw0)w.pw0=c.power;const n=ties(w.n).f.length;c.power=Math.min(Math.round(w.pw0*1.3),Math.round(c.power+Math.min(1.2,n*.08)))});
}
function worldCard(){
 const sc=S.sanc||{},sp=S.supp||{},sk=Object.keys(sc),pk=Object.keys(sp);
 const eff=sk.reduce((a,n)=>a+sc[n].k,0);
 const w0=S.wars[0],t=w0?ties(w0.n):null;
 let h=`<div class="cards"><div class="mini"><b>🚫 Санкции против вас: ${sk.length}</b><small>${sk.length?sk.map(n=>`${n} (${sc[n].left} мес.)`).join(', ')+` · ВВП −${(Math.min(.006,eff)*100).toFixed(2)}%/мес`:'Нет'}</small></div><div class="mini"><b>🤝 Вас поддерживают: ${pk.length}</b><small>${pk.length?pk.map(n=>`${n} (+${sp[n].aid} млн/мес)`).join(', '):'Нет'}</small></div></div>`;
 {const rk=Object.keys(S.restr||{});h+=`<div class="mini"><b>🟡 Протесты и ограничения: ${rk.length}</b><small>${rk.length?rk.map(n=>`${n}: ${RTYPE[S.restr[n].k].n} (${S.restr[n].left} мес.)`).join('; '):'Нет'}</small></div>`}
 if(t)h+=`<div class="mini"><b>⚔️ Расклад вокруг ${w0.n}</b><small>Друзья жертвы (осуждают вас, могут ввести санкции и вооружать её): ${t.f.slice(0,12).join(', ')||'—'}${t.f.length>12?'…':''}</small><small>Враги жертвы (могут вас поддержать): ${t.e.slice(0,12).join(', ')||'—'}${t.e.length>12?'…':''}</small></div>`;
 h+=`<p class="muted">Нападение без обоснования: друзья жертвы портят с вами отношения и вводят санкции, её враги — сближаются и помогают деньгами. Удары по гражданским и бомба вызывают новые санкции. С обоснованием санкций нет, но друзья жертвы всё равно выражают протест и вводят мягкие меры: эмбарго на оружие, запрет на технологии, визовые и авиаограничения, заморозку части резервов.</p>`;
 return card('🌍 Реакция мира',h)}
function warPower(w){
 const q=(.55+S.equipment/100*.6)*(.7+S.training/100*.5)*(.7+S.morale/100*.4);
 const sup=(S.ammo<15||S.fuel<15)?.75:1;
 let m=1+techSum('bt')+advSum('bt');const d=DOCS[S.doc];
 if(d){m+=(d.bt||0)+(d.trn||0)*S.training;if(d.eq&&S.equipment>=60)m+=d.eq}
 if(S.flags.def&&w&&w.def)m+=.08;if(S.flags.blitz&&w&&!w.def)m+=.08;
 return Math.max(1,myPower()*q*m*sup);
}
function enemyTakesRegion(w){
 const cand=(S.regions||[]).filter(r=>!r.captured&&r.name!=='Столица');
 if(S.regions.length<=1||!cand.length){log(`🗺 ${w.n} требовала территорию, но уступать нечего — вместо этого выплачена контрибуция.`);return}
 const pri=cand.find(x=>x.name===w.claimRegion)||cand.find(x=>x.enemyOccupiedBy===w.n)||cand.slice().sort((a,b)=>(b.unrest-b.loyalty*.3)-(a.unrest-a.loyalty*.3))[0];
 const share=Math.min(.3,pri.pop/Math.max(1,S.pop)*.8);if(S.enemyOccupied)delete S.enemyOccupied[pri.name];
 S.lostTo=S.lostTo||{};S.lostTo[String(pri.name).replace(/ \(.*\)/,'')]=w.n;NG.loseRegion(pri.name,share);log(`🗺 По итогам поражения ${w.n} отторгла область «${pri.name}». Население и ВВП сократились.`);say('Мы потеряли область: '+pri.name,'😢');
}
function regimeTick(){
 const R=S.regimes;if(!R)return;
 Object.keys(R).forEach(name=>{
  const c=rel(name),g=R[name];if(!c||c.annexed){delete R[name];return}
  const drift=(c.value>40?.35:c.value>10?.1:-.5)+(S.approval>55?.05:-.1)-(S.wars.some(x=>x.n===name)?1:0)+(g.supported>0?.3:0)+rnd(-.6,.5);
  g.supported=Math.max(0,(g.supported||0)-1);g.loyalty=clamp(g.loyalty+drift);
  ch({money:Math.round(6+c.power*.2)},false);
  if(g.loyalty<=8){
   c.ideology=g.prev;c.value=clamp(-35,-100,100);c.aggr=Math.max(c.aggr||.4,.5);
   const an=((S.aiWorld&&S.aiWorld.nations)||[]).find(x=>x.name===name);if(an){an.ideology=g.prev;delete an.regime;an.rivals=an.rivals||{};an.rivals[S.name||S.me||'Игрок']=55}
   delete R[name];ch({legitimacy:-2,threat:3},false);log(`🔥 В ${name} произошёл контрпереворот: дружественное правительство свергнуто, прежний курс восстановлен. Отношения резко ухудшились.`);toast('Контрпереворот в '+name);
  }else if(mt()-g.month>=60){delete R[name];log(`🏛 Правительство ${name} закрепилось и стало самостоятельным.`)}
 });
}
H.regime=(name,action)=>{
 const c=rel(name),g=(S.regimes||{})[name];if(!c||!g)return toast('Это правительство вам уже не подконтрольно');
 if(action==='support'){if(S.money<250)return toast('Нужно 250 млн на поддержку режима');S.money-=250;g.loyalty=clamp(g.loyalty+14);g.supported=3;c.value=clamp(c.value+3,-100,100);log(`🏛 Вы направили помощь правительству ${name}: лояльность режима выросла.`)}
 if(action==='release'){delete S.regimes[name];c.value=clamp(c.value+10,-100,100);ch({legitimacy:1},false);log(`🕊 Вы перестали опекать правительство ${name}; оно становится самостоятельным.`)}
 save();render();
};
function regimePanel(){
 const R=S.regimes||{},names=Object.keys(R);if(!names.length)return '';
 const q=n=>encodeURIComponent(n).replace(/'/g,'%27'),call=(n,a)=>`H.regime(decodeURIComponent('${q(n)}'),'${a}')`;
 return card('🏛 Дружественные правительства',`<p class="muted">После войны со сменой власти новое правительство дружит с вами, платит торговую выгоду и держится на лояльности. Низкая лояльность ведёт к контрперевороту.</p><div class="vgrid">${names.map(n=>{const c=rel(n)||{},g=R[n];return `<div class="vcard"><div class="vhead"><span class="vface">🏛</span><div><b>${n}</b><small>${c.ideology||''} · мощь ${c.power||0}</small></div></div>${bar('Лояльность режима',g.loyalty)}<div class="actions"><button class="primary" onclick="${call(n,'support')}">🤝 Поддержать · 250</button><button onclick="${call(n,'release')}">🕊 Отпустить</button></div></div>`}).join('')}</div>`);
}
function warTick(){
 S.wars.forEach(w=>{
  const c=rel(w.n);if(!c){w.dead=1;return}
  w.m++;
  normCmd(w);
  if(!w.aiPlanMonth||w.aiPlanMonth!==S.year*12+S.month){
   // ИИ подбирает роль авиации и флота по доступным ресурсам и положению войны.
   w.aiPlanMonth=S.year*12+S.month;
   const hostile=clamp((50-(w.p||50))/50,0,1);
   const focus=(S.regions||[]).slice().sort((a,b)=>(b.industry*.65+b.infra*.25+b.pop/1000000*.1)-(a.industry*.65+a.infra*.25+a.pop/1000000*.1))[0];
   w.enemyPlan={air:c.power>55?(hostile>.35?'support':'patrol'):'reserve',navy:c.power>65?(w.p>60?'blockade':'escort'):'reserve',region:focus?focus.name:''};
  }
  if(w.won){w.wm=(w.wm||0)+1;if(w.wm>=3)spoils(w.n,'tribute');return}
  const supply=clamp(Math.min(S.food,S.fuel,S.ammo,S.equipment)*1.35,12,100);w.supply=supply;
  const order=w.order||'balanced',aid=vassalAid();
  // Назначенные силы, авиация и флот работают как игровые модификаторы фронта/снабжения.
  w.command=w.command||{};
  const cmd=w.command,assigned=Math.min(Math.max(0,+cmd.troops||0),Math.floor(S.army*.7));
  const airReady=Math.max(0,+S.air||0),navyReady=Math.max(0,+S.navy||0);
  const airBonus=cmd.air==='support'?Math.min(.18,airReady*.012):cmd.air==='patrol'?Math.min(.10,airReady*.008):0;
  const navyBonus=cmd.navy==='escort'?Math.min(.12,navyReady*.01):cmd.navy==='blockade'?Math.min(.09,navyReady*.007):0;
  const nT=Math.min(8,Math.max(1,(cmd.regions||[]).length)),assignedBonus=assigned/Math.max(1,S.army)*.28*(cmd.alloc==='spread'?1/(1+.18*(nT-1)):1);
  const opSupply=clamp(supply+(cmd.navy==='escort'?navyReady*.12:0)+(cmd.logi==='convoys'&&S.money>=50?9:0),12,100);
  const my=(warPower(w)+aid+assigned*.0015)*(opSupply/100)*(order==='attack'?1.14:order==='defend'?.91:1)*(1+airBonus+navyBonus+assignedBonus),en=c.power*1.45*(1+(c.aggr-.4)*.15)*(order==='defend'?.88:1)*(1+(w.enemyPlan&&w.enemyPlan.air==='support'?.035:0)+(w.enemyPlan&&w.enemyPlan.navy==='escort'?.025:0));
  let d=clamp((my-en)/(my+en)*18+rnd(-3.5,3.5),-10,10);
  if(cmd.air==='support'&&airReady>0)d+=Math.min(1.8,airReady*.12);
  if(cmd.air==='patrol'&&airReady>0){w.airDefense=clamp((w.airDefense||0)+Math.min(3,airReady*.18),0,30)}
  if(cmd.navy==='blockade'&&navyReady>0){w.blockade=clamp((w.blockade||0)+Math.min(2.2,navyReady*.14),0,25);enemyEcoStrike(w,'raid',Math.min(.9,navyReady*.03),1,null)}
  if(cmd.navy==='escort'&&navyReady>0)w.supply=clamp(opSupply+Math.min(8,navyReady*.35),12,100);
  w.p=clamp(w.p+d,0,100);w.aid=aid;w.mine=Math.round(my);w.theirs=Math.round(en);const a0=S.army;w.frontLine=w.frontLine||'Центральный фронт';if(w.m%4===0)w.frontLine=pick(FRONTS);w.encirclement=w.encirclement||0;
  if(w.p>68&&supply>55&&Math.random()<.12){w.encirclement=clamp(w.encirclement+1,0,5);if(w.encirclement===1||w.encirclement===5)log(`⭕ Окружение войск ${w.n}: ${w.encirclement}/5.`)}else if(w.p<45)w.encirclement=Math.max(0,w.encirclement-1);
  const dc=DOCS[S.doc],lossK=(1+Math.max(0,-d)/10)*(dc?dc.loss:1)*(1-advSum('loss'));
  S.army=Math.max(5000,S.army-Math.round((rnd(250,800)*lossK*(en/(my+en))*2+(supply<35?260:0)+w.encirclement*90)*myLS()));
  w.lost=(w.lost||0)+Math.max(0,a0-S.army);w.kills=(w.kills||0)+Math.round((Math.max(0,d)*rnd(260,640)+rnd(80,260))*enLS(w.n));battleEvent(w,d,c);ch({money:-120-(100-supply)*2},false);S.approval=clamp(S.approval+(w.m<=12&&w.p>=40?.35:-.12));S.fuel=clamp(S.fuel-(supply<45?3:1));S.ammo=clamp(S.ammo-(supply<45?3:1));
  if(dc&&dc.ammoS)S.ammo=clamp(S.ammo+dc.ammoS);if(dc&&dc.fuelC)S.fuel=clamp(S.fuel-dc.fuelC);
  c.power=Math.max(10,Math.round(c.power-Math.max(0,d)*(.35+w.encirclement*.12)+Math.max(0,-d)*.1+(d>0?Math.max(1,c.power*.012):0)));
  warCasualties(w,a0);occupyTick(w);
  /* ИИ не только обороняется: при успехе он занимает наши области, а при переломе фронта мы их освобождаем. */
  S.enemyOccupied=S.enemyOccupied||{};
  const enemyHeld=Object.keys(S.enemyOccupied).filter(k=>S.enemyOccupied[k]===w.n);
  if(d < -1.8 && w.p < 48 && S.regions.length && Math.random()<.42){
   const target=(S.regions.filter(r=>!r.enemyOccupied).sort((a,b)=>(b.industry*.55+b.infra*.25+b.pop/1000000*.2)-(a.industry*.55+a.infra*.25+a.pop/1000000*.2))[0]);
   if(target){const share=clamp(target.pop/Math.max(1,S.pop),.015,.18),loss=Math.max(1,S.gdp*share*.22);target.enemyOccupied=true;target.enemyOccupiedBy=w.n;target.occGdpLoss=loss;S.enemyOccupied[target.name]=w.n;S.gdp=Math.max(100,S.gdp-loss);S.money=Math.max(0,S.money-30);S.stability=clamp(S.stability-1.2);warNews(w,'🏴',`${target.name}: противник занял область! Регион временно потерян, ВВП страны снизился.`);log(`🏴 ${w.n} захватила область «${target.name}». ВВП −${fmt(loss)} млрд; регион отмечен как оккупированный.`)}
  }else if(d > 1.8 && enemyHeld.length && Math.random()<.62){
   const name=enemyHeld[0],r=S.regions.find(x=>x.name===name);if(r){r.enemyOccupied=false;delete r.enemyOccupiedBy;S.gdp+=Math.max(0,r.occGdpLoss||0);delete r.occGdpLoss;delete S.enemyOccupied[name];S.stability=clamp(S.stability+.5);warNews(w,'🚩',`${name}: наши войска освободили область и восстановили её экономику.`);log(`🚩 Освобождена область «${name}» от войск ${w.n}; экономика региона восстановлена.`)}
  }
  warEnemyCiv(w,d);enemyEcoTick(w,c,d);darkTickEnemy(w);enemyStrikes(w,c);branchTick(w,c);if(w.dmg)Object.keys(w.dmg).forEach(k=>{const d=w.dmg[k];d.mil*=.96;d.infra*=.96;d.civ*=.96});if(window.PVO){PVO.monthly(c,true);PVO.myMonthly(S);const nn1=aiNationOf(w.n);if(nn1)nn1.aa=c.aa}else if(c.aa!=null)c.aa=Math.max(Math.round(c.power/25),c.aa-.04);
  if(w.m%3===0&&supply<30)log(`🚚 Критический кризис снабжения на фронте с ${w.n}: наступление замедлено.`);if(d>0&&w.m%6===0)log(`🪖 ${w.n} проводит мобилизацию, чтобы удержать фронт.`);c.value=clamp(c.value-.8,-100,100);
  if(w.p>=100){w.won=true;w.wm=0;log(`🏆 Победа над государством ${w.n}! Выбери плоды победы во вкладке «Штаб».`);say('Мы победили в войне!','🎉');toast('🏆 Победа над '+w.n+'!');pause()}
  else if(w.p>=90&&w.encirclement>=4){w.p=100;w.won=true;w.wm=0;log(`🏳️ ${w.n} запросила капитуляцию после окружения основных сил!`);toast('Противник капитулирует');pause()}
  else if(w.p<=0){
   const loss=Math.min(S.money,1200);S.money-=loss;
   ch({approval:-10,stability:-6,legitimacy:-8,threat:-10},false);c.value=clamp(c.value-10,-100,100);c.power=Math.round(c.power*1.1);w.dead=1;
   log(`🏳 Поражение в войне с ${w.n}: вынужденный мир, контрибуция ${fmt(loss)} млн.`);say('Мы проиграли войну…','😢');toast('🏳 Поражение в войне');pause();
   if(w.def){aiGoalReward(w.n,w.goal==='tribute'?.6:1.2);if(w.goal==='territory')enemyTakesRegion(w);else if(w.goal==='regime'){log(`🏛 ${w.n} добивается смены власти в нашей стране.`);setTimeout(()=>{if(!S.out&&!S.campaignOver)ouster('Враг потребовал смены власти после поражения в войне с '+w.n)},50)}}
  }
 });
 S.wars=S.wars.filter(w=>!w.dead);
}
H.warOrder=(name,order)=>{const w=S.wars.find(x=>x.n===name);if(!w)return;w.order=['attack','defend','balanced'].includes(order)?order:'balanced';if(w.order==='attack')armyAttack(name);log(`📯 Приказ фронту против ${name}: ${{attack:'наступать',defend:'держать оборону',balanced:'сбалансированные действия'}[w.order]}.`);save();render()};
/* Быстрые штабные шаблоны: один тап настраивает несколько родов войск без ручного выбора каждого пункта. */
H.warPreset=(name,preset)=>{const w=S.wars.find(x=>x.n===name);if(!w)return;const cm=normCmd(w),army=Math.max(1,S.army),safe=(v)=>Math.floor(army*v);
 const plans={
  assault:{label:'Молниеносное наступление',order:'attack',troops:.70,alloc:'focus',air:'support',navy:'escort',spec:'recon',logi:'convoys'},
  balanced:{label:'Сбалансированный план',order:'balanced',troops:.40,alloc:'focus',air:'support',navy:'escort',spec:'recon',logi:'repair'},
  defense:{label:'Крепкая оборона',order:'defend',troops:.50,alloc:'spread',air:'patrol',navy:'escort',spec:'recon',logi:'repair'},
  economy:{label:'Экономия ресурсов',order:'balanced',troops:.20,alloc:'focus',air:'reserve',navy:'reserve',spec:'reserve',logi:'repair'},
  pressure:{label:'Давление на экономику',order:'balanced',troops:.25,alloc:'focus',air:'strategic',navy:'blockade',spec:'recon',logi:'convoys'}
 };const x=plans[preset];if(!x)return;w.order=x.order;cm.troops=safe(x.troops);cm.alloc=x.alloc;cm.air=x.air;cm.navy=x.navy;cm.spec=x.spec;cm.logi=x.logi;normCmd(w);log(`📋 Штаб ${w.n}: применён план «${x.label}».`);save();render();toast('План армии обновлён')};
H.warAutoPlan=(name)=>{const w=S.wars.find(x=>x.n===name);if(!w)return;const low=S.money<500||S.fuel<25||S.ammo<25||S.morale<35||S.food<25;H.warPreset(name,low?'defense':(w.p<35?'balanced':'assault'))};
H.warAllOrder=(order)=>{if(!['attack','defend','balanced'].includes(order))return;S.wars.forEach(w=>{w.order=order;if(order==='attack'){const cm=normCmd(w);if(!cm.troops)cm.troops=Math.floor(S.army*.35)}});log(`🌐 Общий приказ всем фронтам: ${{attack:'наступать',defend:'держать оборону',balanced:'действовать сбалансированно'}[order]}.`);save();render();toast('Приказ передан всем фронтам')};
// Приказы войскам — абстрактная игровая система, без реальных координат и маршрутов.
H.warCommand=(name,region,troops,air,navy)=>{
 const w=S.wars.find(x=>x.n===name);if(!w)return;const cm=normCmd(w);
 if(region)cm.regions=Array.isArray(region)?region.slice():[region];
 if(troops!=null)cm.troops=+troops||0;if(air)cm.air=air;if(navy)cm.navy=navy;normCmd(w);
 log(`📋 План армии против ${name}: цели — ${cm.regions.join(', ')||'общий фронт'}, ${fmt(cm.troops)} солдат.`);save();render();
};
/* мгновенное изменение одного пункта плана (кнопки и списки в карточке войны) */
H.wcmd=(name,key,val)=>{
 const w=S.wars.find(x=>x.n===name);if(!w)return;const cm=normCmd(w);
 if(key==='addReg'){if(!val||cm.regions.includes(val))return;if(cm.regions.length>=RMAX)return toast('Не больше '+RMAX+' областей-целей сразу');cm.regions.push(val)}
 else if(key==='delRegIdx')cm.regions.splice(+val,1);
 else if(key==='upIdx'){const i=+val;if(i>0){const t=cm.regions[i-1];cm.regions[i-1]=cm.regions[i];cm.regions[i]=t}}
 else if(key==='troops')cm.troops=+val||0;
 else if(key==='troopsPct')cm.troops=Math.floor(S.army*(+val)/100);
 else if(['alloc','air','navy','spec','logi'].includes(key))cm[key]=val;
 normCmd(w);save();render();toast('📋 План обновлён');
};
const AIRL={support:'Поддержка наземных войск',patrol:'Патруль (усиливает ПВО)',strategic:'Стратегическая бомбардировка экономики',reserve:'Резерв'};
const NAVL={escort:'Конвои и сопровождение',blockade:'Морская блокада',raid:'Рейды на торговые пути',reserve:'Резерв'};
const SPECL={sabotage:'Диверсии на предприятиях',recon:'Разведка (ослабляет ПВО врага)',reserve:'Резерв'};
const LOGL={convoys:'Колонны снабжения',repair:'Ремонт тыла и энергосети',reserve:'Резерв'};
function planInfo(w){
 const cm=normCmd(w),air=Math.max(0,+S.air||0),navy=Math.max(0,+S.navy||0),nT=Math.min(8,Math.max(1,cm.regions.length));
 const dil=cm.alloc==='spread'?1/(1+.18*(nT-1)):1,fb=cm.troops/Math.max(1,S.army)*28*dil;
 let cost=0;const L=[];
 if(cm.troops>0)L.push(`🪖 фронт +${fb.toFixed(1)}%${cm.alloc==='spread'&&cm.regions.length>1?' (силы распределены)':''}`);
 if(cm.air==='support'&&air)L.push(`✈️ +${(Math.min(.18,air*.012)*100).toFixed(0)}% к фронту`);
 if(cm.air==='patrol'&&air)L.push('✈️ ПВО усилено');
 if(cm.air==='strategic'&&air){const c=45+air*4;cost+=c;L.push(`🛫 ВВП врага ≈ −${(.0035*Math.min(1.8,.5+air*.06)*100).toFixed(1)}%/мес`)}
 if(cm.navy==='escort'&&navy)L.push('⚓ снабжение +');
 if(cm.navy==='blockade'&&navy)L.push('⚓ блокада');
 if(cm.navy==='raid'&&navy){const c=30+navy*3;cost+=c;L.push(`⚓ ВВП врага ≈ −${(.0025*Math.min(1.4,.4+navy*.05)*100).toFixed(1)}%/мес`)}
 if(cm.spec==='sabotage'){cost+=60;L.push('🕵 диверсии (шанс успеха ~'+Math.round(clamp(.42+S.training/330,.2,.8)*100)+'%)')}
 if(cm.spec==='recon'){cost+=25;L.push(`🕵 разведка ${Math.round(w.recon||0)}% (меньше сбитых ракет)`)}
 if(cm.logi==='convoys'){cost+=50;L.push('🚚 снабжение +9')}
 if(cm.logi==='repair'){cost+=60;L.push('🔧 ремонт тыла')}
 return{L,cost};
}
/* ---------- удобный выбор областей-целей: поиск, фильтры, крупные строки, без перерисовки всей страницы ---------- */
const escA=t=>String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const RPK={q:'',f:'all',sort:'size'};
const RPF=[['all','Все'],['sel','✔ Выбранные'],['free','Свободные'],['u','🛢 Нефть и газ'],['f','🌾 Зерно'],['s','⛏ Металлы'],['e','⚡ Энергия'],['q','🏭 Заводы']];
const rpScore=r=>(r.includes('u')?3:0)+(r.includes('f')?3:0)+(r.includes('s')?2:0)+(r.includes('e')?1:0)+(r.includes('q')?1:0);
const rpShort=n=>String(n).replace(/ \(.*\)/,'');
function forecastHtml(w){const inf=planInfo(w);return `📊 <b>Прогноз в месяц:</b> ${inf.L.length?inf.L.join(' · '):'приказов нет'}${inf.cost?` · расход ≈ <b>${inf.cost} млн</b>`:''}`}
function rpAll(w){
 const cm=normCmd(w),rgo=regsOf(w.n)||[],occ=new Set((w.occ||[]).map(id=>{const x=rgo.find(z=>z.id===id);return x?x.n:id}));
 return(enemyRegs(w.n)||[]).map(x=>({n:x.n,s:+x.s||0,res:String(x.res||''),occ:occ.has(x.n),idx:cm.regions.indexOf(x.n)}));
}
function rpData(w){
 const q=RPK.q.trim().toLowerCase(),f=RPK.f;
 const L=rpAll(w).filter(x=>(!q||x.n.toLowerCase().includes(q))&&(f==='all'||(f==='sel'?x.idx>=0:f==='free'?(x.idx<0&&!x.occ):x.res.includes(f))));
 if(RPK.sort==='name')L.sort((a,b)=>a.n.localeCompare(b.n,'ru'));
 else if(RPK.sort==='res')L.sort((a,b)=>(rpScore(b.res)-rpScore(a.res))||(b.s-a.s));
 else L.sort((a,b)=>b.s-a.s);
 return L;
}
function rpRows(w){
 const L=rpData(w);if(!L.length)return '<p class="muted">Ничего не найдено — измените поиск или фильтр.</p>';
 return L.map(x=>`<div class="rp-row${x.idx>=0?' on':''}${x.occ?' occ':''}" data-r="${escA(x.n)}" onclick="H.rpt(this)"><span class="rp-ck">${x.idx>=0?'✔':''}</span><span class="rp-n">${escA(rpShort(x.n))}</span><span class="rp-m">${resIcons(x.res)} ${x.s.toFixed(0)}%</span><span class="rp-st">${x.occ?'🚩':x.idx>=0?'№'+(x.idx+1):''}</span></div>`).join('');
}
function rpChips(w){
 const nm=qn(w.n),tot=rpAll(w).length,shown=rpData(w).length;
 return RPF.map(([k,l])=>`<button class="${RPK.f===k?'on':''}" onclick="H.rp(${nm},'f','${k}')">${l}</button>`).join('')+`<small class="muted rp-cnt">Показано ${shown} из ${tot}</small>`;
}
function rpSelHtml(w){
 const cm=normCmd(w),nm=qn(w.n),occ=new Set(rpAll(w).filter(x=>x.occ).map(x=>x.n));
 const chips=cm.regions.length?cm.regions.map((n,i)=>`<span class="chip wtg">${i+1}. ${escA(rpShort(n))} ${occ.has(n)?'🚩':'⏳'}${i>0?` <b class="wx" onclick="H.rp(${nm},'up',${i})">⬆</b>`:''} <b class="wx" onclick="H.rp(${nm},'del',${i})">✕</b></span>`).join(''):'<small class="muted">Цели не выбраны — фронт сам выберет ближайшую область.</small>';
 return `<small class="muted">Выбрано: <b>${cm.regions.length}</b> из ${RMAX}</small><div class="wchips">${chips}</div>`;
}
function rpBox(w){
 const nm=qn(w.n);
 return `<div class="rpk" data-w="${escA(w.n)}"><div class="rp-bar"><input class="rp-q" type="search" placeholder="🔍 Поиск области…" value="${escA(RPK.q)}" oninput="H.rp(${nm},'q',this.value)"><select class="rp-s" onchange="H.rp(${nm},'sort',this.value)">${[['size','По размеру'],['res','По ресурсам'],['name','По алфавиту']].map(([k,l])=>`<option value="${k}" ${RPK.sort===k?'selected':''}>${l}</option>`).join('')}</select></div>
 <div class="rp-acts"><button onclick="H.rp(${nm},'topres')">🛢🌾 Нефть и зерно: топ‑5</button><button onclick="H.rp(${nm},'topsize')">📏 Самые большие: топ‑5</button><button onclick="H.rp(${nm},'allvis')">➕ Все показанные</button><button onclick="H.rp(${nm},'clear')">🧹 Сбросить</button></div>
 <div class="rp-chips" data-part="chips">${rpChips(w)}</div><div class="rp-list" data-part="list">${rpRows(w)}</div></div>`;
}
function rpRefresh(name,what){
 const w=S.wars.find(x=>x.n===name);if(!w)return;
 document.querySelectorAll('.rpk').forEach(b=>{if(b.dataset.w!==name)return;
  const l=b.querySelector('[data-part=list]'),sc=l?l.scrollTop:0;
  if(l){l.innerHTML=rpRows(w);l.scrollTop=sc}
  if(what!=='list'){const c=b.querySelector('[data-part=chips]');if(c)c.innerHTML=rpChips(w)}
  else{const cn=b.querySelector('.rp-cnt');if(cn)cn.textContent=`Показано ${rpData(w).length} из ${rpAll(w).length}`}
 });
 document.querySelectorAll('.rpsel').forEach(b=>{if(b.dataset.w===name)b.innerHTML=rpSelHtml(w)});
 document.querySelectorAll('.wp-forecast').forEach(b=>{if(b.dataset.w===name)b.innerHTML=forecastHtml(w)});
}
H.rp=(name,op,val)=>{
 const w=S.wars.find(x=>x.n===name);if(!w)return;const cm=normCmd(w);
 if(op==='q'){RPK.q=String(val||'');rpRefresh(name,'list');return}
 if(op==='f'||op==='sort'){RPK[op]=val;rpRefresh(name,'all');return}
 if(op==='tog'){const i=cm.regions.indexOf(val);if(i>=0)cm.regions.splice(i,1);else{if(cm.regions.length>=RMAX)return toast('Не больше '+RMAX+' областей-целей сразу');cm.regions.push(val)}}
 else if(op==='up'){const i=+val;if(i>0){const t=cm.regions[i-1];cm.regions[i-1]=cm.regions[i];cm.regions[i]=t}}
 else if(op==='del')cm.regions.splice(+val,1);
 else if(op==='clear')cm.regions=[];
 else if(op==='topsize'||op==='topres'){
  const L=rpAll(w).filter(x=>!x.occ);
  if(op==='topres')L.sort((a,b)=>(rpScore(b.res)-rpScore(a.res))||(b.s-a.s));else L.sort((a,b)=>b.s-a.s);
  cm.regions=L.slice(0,5).map(x=>x.n);
 }
 else if(op==='allvis'){rpData(w).forEach(x=>{if(cm.regions.length<RMAX&&!cm.regions.includes(x.n))cm.regions.push(x.n)})}
 normCmd(w);save();rpRefresh(name,'all');
};
H.rpt=el=>{const b=el.closest('.rpk');if(b)H.rp(b.dataset.w,'tog',el.dataset.r)};
function warPlanHtml(w){
 const cm=normCmd(w),nm=qn(w.n),rgo=regsOf(w.n)||[],occ=new Set((w.occ||[]).map(id=>{const x=rgo.find(z=>z.id===id);return x?x.n:id}));
 const esc=t=>String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 const free=(enemyRegs(w.n)||[]).slice().sort((a,b)=>b.s-a.s),opts=free.filter(x=>!cm.regions.includes(x.n));
 const sel=(key,list)=>`<select onchange="H.wcmd(${nm},'${key}',this.value)">${Object.keys(list).map(k=>`<option value="${k}" ${cm[key]===k?'selected':''}>${list[k]}</option>`).join('')}</select>`;
 const pr=p=>`<button class="${Math.abs(cm.troops-Math.floor(S.army*p/100))<2&&cm.troops>0?'on':''}" onclick="H.wcmd(${nm},'troopsPct',${p})">${p}%</button>`;
 return `<div class="mini war-command wplan"><b>📋 Штаб: план армии и родов войск</b><div class="wp-presets"><small class="muted">Быстрые планы — применяются одним нажатием:</small><div class="actions"><button class="danger" onclick="H.warPreset(${nm},'assault')">⚔ Наступление</button><button onclick="H.warPreset(${nm},'balanced')">⚖ Баланс</button><button onclick="H.warPreset(${nm},'defense')">🛡 Оборона</button><button onclick="H.warPreset(${nm},'economy')">💰 Экономия</button><button onclick="H.warPreset(${nm},'pressure')">📉 Давление на экономику</button><button class="primary" onclick="H.warAutoPlan(${nm})">✨ Подобрать автоматически</button></div></div>
 <div class="wp-sec"><small class="muted">🎯 Области-цели (очерёдность = приоритет; 🚩 занята, ⏳ в плане)</small><div class="rpsel" data-w="${escA(w.n)}">${rpSelHtml(w)}</div>${fold('rp_'+w.n,'🗺 Выбрать области для захвата',rpBox(w),true)}</div>
 <div class="wp-sec"><small class="muted">🪖 Сухопутные войска</small><div class="seg"><button class="${cm.troops===0?'on':''}" onclick="H.wcmd(${nm},'troopsPct',0)">0</button>${pr(25)}${pr(50)}${pr(70)}</div>
 <label>Выделить солдат: <input type="number" min="0" max="${Math.floor(S.army*.7)}" step="1000" value="${cm.troops}" onchange="H.wcmd(${nm},'troops',this.value)" style="width:110px"></label>
 <div class="seg"><button class="${cm.alloc==='focus'?'on':''}" onclick="H.wcmd(${nm},'alloc','focus')">🎯 Один удар</button><button class="${cm.alloc==='spread'?'on':''}" onclick="H.wcmd(${nm},'alloc','spread')">🧭 Широкий фронт</button></div>
 <small class="muted">«Один удар» — все силы на первую цель, сильнее бонус. «Широкий фронт» — берёт несколько областей сразу, но бонус слабее.</small></div>
 <div class="wp-grid"><label>✈️ Авиация ${sel('air',AIRL)}</label><label>⚓ Флот ${sel('navy',NAVL)}</label><label>🕵 Спецназ ${sel('spec',SPECL)}</label><label>🚚 Тыл ${sel('logi',LOGL)}</label></div>
 <small class="wp-forecast" data-w="${escA(w.n)}">${forecastHtml(w)}</small>
 <small class="muted">Стратегическая авиация и морские рейды бьют по ВВП и валюте врага, но стоят денег, топлива и дают шанс потерь. Разведка снижает шанс, что ПВО сбьёт ваши ракеты и дроны. Спецназ может сорвать операцию. Абстрактная игровая модель.</small></div>`;
}

function peaceAll(free){
 if(!S.wars.length)return;
 if(!free){
  const losing=S.wars.some(w=>!w.won&&w.p<30);
  if(losing){const pay=Math.min(S.money,800);S.money-=pay;ch({approval:-4},false)}else ch({approval:-1},false);
 }
 log('🕊 Заключён мир.');S.wars=[];S.war=!!S.martial;
}
function spoils(name,mode,rid,keep){
 const w=S.wars.find(x=>x.n===name),c=rel(name);if(!w||!c)return;if(w.def)aiGoalReward(name,-1);
 const k=w.won?1:.4+.6*w.p/100,W=wi(name);let shock=0;
 if(c.popLeft==null)c.popLeft=W.pop?W.pop*1e6:c.power*3500;
 const gpc=S.gdp/Math.max(1,S.pop)*([0,.25,.55,.9,1.4,2.2][W.inc||2]);
 const resName=RLAB[(W.res||'f')[0]]||'Захвачено';
 const grab=(label,pop,gdp,full,rs)=>{
  S.pop+=pop;S.gdp+=gdp;S.captured=S.captured||[];S.captured.push({name:label,from:name,pop,full:!!full,res:rs||W.res||'f',cont:W.cont});
  S.regions.push({name:label,pop,wealth:40,loyalty:35,unrest:38,industry:36,infra:34,resource:RLAB[(rs||W.res||'f')[0]]||resName,captured:true,from:name,res:rs||W.res||'f'});
 };
 if(mode==='tribute'){shock=.04;const m=Math.round((800+c.power*25)*k);ch({money:m,approval:2},false);c.value=clamp(c.value-30,-100,100);c.power=Math.round(c.power*.8);log(`💰 ${name} выплатил контрибуцию: +${fmt(m)} млн.`)}
 if(mode==='region'){const n=(c.regLost||0)+1,rg=regsOf(name);let R=rg&&rid?rg.find(x=>x.id===rid):null;
  if(R&&taken()[R.id])return;
  if(!R){const all=(WORLD.REGS[name]||WORLD.GEN.map(x=>({n:x[0]+' · '+name,s:x[1],res:x[2]}))),tk=c.regTaken=c.regTaken||[],left=all.filter(r=>!tk.includes(r.n));R=pick(left.length?left:all);tk.push(R.n)}
  else taken()[R.id]=1;
  const basePop=W.pop?W.pop*1e6:c.power*3500;let p=Math.round(Math.min(basePop*(R.s/100),c.popLeft,S.pop*.12));p=Math.max(p,Math.min(60000,c.popLeft));const g=Math.round(Math.min(p*gpc,S.gdp*.1));
  shock=Math.max(.04,Math.min(.35,R.s/100));c.popLeft=Math.max(0,c.popLeft-p);c.regLost=n;grab(R.n,p,g,false,R.res);ch({stability:-2,threat:3,legitimacy:-1},false);c.value=clamp(-45,-100,100);c.power=Math.max(10,Math.round(c.power*.8));
  log(`🗺 Вы захватили регион: ${R.n} (${name}). Население +${fmt(p)}, ВВП +${fmt(g)}.`);if(!keep)intlReact(name,'region');
  if(rg&&rg.every(x=>taken()[x.id])){c.annexed=true;S.puppets=S.puppets.filter(x=>x!==name);log(`🏴 Вы захватили все регионы — ${name} исчезла с карты мира.`)}}
 if(mode==='annex'){const p=Math.round(Math.min(c.popLeft,S.pop*.5)),g=Math.round(Math.min(p*gpc*1.1,S.gdp*.35));
  grab(`Земли ${name}`,p,g,true);{const rg=regsOf(name)||[];S.captured[S.captured.length-1].regs=rg.filter(x=>!taken()[x.id]).map(x=>x.n);rg.forEach(x=>taken()[x.id]=1)}shock=1;c.annexed=true;c.popLeft=0;S.puppets=S.puppets.filter(x=>x!==name);ch({stability:-5,legitimacy:-2,threat:8,rel:-6,reg:4},false);log(`🏴 Полностью захвачено государство ${name}: население +${fmt(p)}, ВВП +${fmt(g)}. Страна исчезла с карты мира, её земли показаны на вашей карте.`);intlReact(name,'annex')}
 if(mode==='regime'){shock=.1;const prev=c.ideology||GrandDiplomacy.orientation(c),me={name:S.name||S.me||'Игрок',ideology:S.ideology||'прагматизм'},an=((S.aiWorld&&S.aiWorld.nations)||[]).find(x=>x.name===name);
  S.regimes=S.regimes||{};S.regimes[name]={month:mt(),prev,loyalty:62,supported:0};
  c.ideology=me.ideology;c.value=clamp(Math.max(c.value,10)+45,-100,100);c.power=Math.max(10,Math.round(c.power*.85));c.aggr=Math.max(.05,(c.aggr||.4)*.4);
  if(an)GrandDiplomacy.applyRegimeChange(S.aiWorld,an,me,mt());
  const m=Math.round((300+c.power*10)*k);ch({money:m,approval:3,legitimacy:-1,threat:2},false);
  log(`🏛 В ${name} сменилась власть: к власти пришло дружественное правительство (${prev} → ${c.ideology}). Контрибуция +${fmt(m)} млн. Режим нужно поддерживать, иначе возможен контрпереворот.`);intlReact(name,'regime')}
 if(mode==='puppet'){shock=.2;c.value=60;c.power=Math.max(10,Math.round(c.power*.7));if(!S.puppets.includes(name))S.puppets.push(name);ch({approval:3},false);log(`🎭 ${name} стал вассалом (+70 млн/мес). Его ${regCount(name)} обл. показаны на вашей карте светло-синим.`)}
 aiLossShock(name,shock,w);
 if(!keep){S.wars=S.wars.filter(x=>x.n!==name);S.war=S.wars.length>0||!!S.martial}
}
/* Реакция мира на захват: страны одобряют или осуждают (стр. зависит от отношений с жертвой и силы агрессора) */
function intlReact(victim,kind){
 const al=alive().filter(r=>r.name!==victim),V=wi(victim);let cond=0,appr=0,names=[];
 al.forEach(r=>{const W=wi(r.name);const tied=(r.value>35||W.cont===V.cont)&&r.power>=20;
  const against=tied&&Math.random()<(kind==='annex'?.28:.14);
  const pro=r.value<-40&&Math.random()<.07;
  if(against){cond++;r.value=clamp(r.value-(kind==='annex'?7:4),-100,100);if(names.length<3&&r.power>=40)names.push(r.name)}
  else if(pro){appr++;r.value=clamp(r.value+3,-100,100)}});
 S.intl=S.intl||[];S.intl.unshift({t:`Год ${S.year}, ${months[S.month]}`,v:victim,kind,cond,appr,names});S.intl=S.intl.slice(0,12);
 const trade=Math.min(cond,40)/40;ch({legitimacy:-Math.round(trade*(kind==='annex'?6:3)),approval:-Math.round(trade*2)},false);
 log(`🌍 Реакция мира: осуждают ${cond} стран${names.length?' ('+names.join(', ')+'…)':''}, одобряют ${appr}.`)}
function puppetTick(){
 S.puppetData=S.puppetData||{};vassalEvents();
 S.puppets=S.puppets.filter(n=>{const c=rel(n);if(!c)return false;const d=S.puppetData[n]||(S.puppetData[n]={tax:10,autonomy:25,loyalty:65,unrest:15,troops:0});
  d.loyalty=clamp(d.loyalty+(d.autonomy>65?.45:-.12)-(d.tax>25?.5:d.tax>15?.18:0)-(d.unrest>55?.35:0));
  d.unrest=clamp(d.unrest+(d.tax>25?.7:d.tax>15?.25:-.12)+(d.autonomy<15?.25:0));
  const tribute=Math.max(0,Math.round((c.power*2.2+wi(n).pop*8)*(d.tax/100)));S.money+=tribute;
  if(d.unrest>85||d.loyalty<12){c.value=clamp(c.value-18,-100,100);S.puppets=S.puppets.filter(x=>x!==n);delete S.puppetData[n];log(`🔥 Восстание! ${n} разорвал вассальный договор и восстановил независимость.`);return false}
  if(d.unrest>60&&Math.random()<.12){d.loyalty=clamp(d.loyalty-5);log(`⚠️ В ${n} растёт сопротивление вассальной администрации.`)}return true;
 });
}
H.vassal=(name,action,value)=>{
 const c=rel(name);if(!c||!S.puppets.includes(name))return toast('Это государство не является вашим вассалом');
 S.puppetData=S.puppetData||{};const d=S.puppetData[name]||(S.puppetData[name]={tax:10,autonomy:25,loyalty:65,unrest:15,troops:0});
 if(action==='tax'){d.tax=clamp(+value,0,40);log(`👑 Для вассала ${name} установлена дань ${d.tax}%.`)}
 if(action==='autonomy'){d.autonomy=clamp(+value,0,100);d.unrest=clamp(d.unrest+(d.autonomy>60?-8:4));log(`📜 Автономия ${name}: ${d.autonomy}%.`)}
 if(action==='troops'){const n=Math.min(Math.max(1,Math.round(c.power*.12)),Math.max(0,Math.round(c.power*.35)));if(n<1)return toast('У вассала нет доступных войск');c.power=Math.max(5,c.power-n);S.army+=n*180;d.troops+=n;d.loyalty=clamp(d.loyalty-5);log(`🪖 ${name} передал вам ${n} военных подразделений.`)}
 if(action==='resources'){if(S.money<150)return toast('Нужны средства на логистику');S.money-=150;S.food=clamp(S.food+8);S.fuel=clamp(S.fuel+7);S.steel=clamp(S.steel+6);S.equipment=clamp(S.equipment+5);d.loyalty=clamp(d.loyalty-2);log(`📦 ${name} передал продовольствие, топливо, сталь и вооружение.`)}
 if(action==='gift'){if(S.money<300)return toast('Нужно 300 млн на дары');S.money-=300;d.loyalty=clamp(d.loyalty+10);d.unrest=clamp(d.unrest-10);log(`🎁 Вы отправили щедрые дары вассалу ${name}: лояльность выросла.`)}
 if(action==='release'){S.puppets=S.puppets.filter(x=>x!==name);delete S.puppetData[name];c.value=clamp(c.value+25,-100,100);ch({legitimacy:2,approval:1},false);log(`🕊 ${name} получил независимость. Мир оценил ваш жест, отношения заметно улучшились.`);toast(name+' теперь независим')}
 if(action==='suppress'){if(S.money<500)return toast('Нужно 500 млн на операцию');S.money-=500;d.unrest=clamp(d.unrest-28);d.loyalty=clamp(d.loyalty+8);log(`🛡 Мятеж в ${name} подавлен силами администрации.`)}
 if(action==='annex'){if(d.autonomy<70||d.loyalty<65)return toast('Для мирного присоединения нужна автономия 70% и лояльность 65%');const w=wi(name),pop=Math.round((w.pop||1)*500000),gdp=Math.round((c.power||10)*45);S.pop+=pop;S.gdp+=gdp;S.captured=S.captured||[];S.captured.push({name:`Земли ${name}`,from:name,pop,full:true});S.regions.push({name:`Земли ${name}`,pop,wealth:45,loyalty:55,unrest:25,industry:40,infra:38,resource:'Присоединено',captured:true,from:name});c.annexed=true;S.puppets=S.puppets.filter(x=>x!==name);delete S.puppetData[name];log(`🏴 ${name} мирно присоединён к державе. Население +${fmt(pop)}.`)}
 save();render();
};
function vassalPanel(){
 const names=S.puppets||[];if(!names.length)return card('👑 Вассалы','<p class="muted">Пока нет вассальных государств. Победите в войне и выберите «Вассал» в условиях мира.</p>');
 S.puppetData=S.puppetData||{};
 const q=n=>encodeURIComponent(n).replace(/'/g,'%27'),call=(n,a)=>`H.vassal(decodeURIComponent('${q(n)}'),'${a}')`;
 const mood=d=>d.unrest>75||d.loyalty<25?['🔥','На грани восстания','bad']:d.unrest>50||d.loyalty<45?['😠','Недоволен','warn']:d.loyalty>75?['😊','Верный союзник','ok']:['🙂','Спокоен','ok'];
 return card('👑 Управление вассалами',`<p class="muted">Вассалы платят дань, присылают помощь на фронт и просят вашей защиты. Высокая дань и низкая автономия повышают риск восстания. Помощь вассалов в войнах сейчас: <b>+${fmt(vassalAid())}</b> к силе армии.</p><div class="vgrid">${names.map(n=>{const c=rel(n)||{},d=S.puppetData[n]||(S.puppetData[n]={tax:10,autonomy:25,loyalty:65,unrest:15,troops:0}),m=mood(d),id=q(n);
 return `<div class="vcard v-${m[2]}"><div class="vhead"><span class="vface">${m[0]}</span><div><b>${n}</b><small>${m[1]} · мощь ${c.power||0}</small></div><span class="vaid" title="Помощь на фронте">+${fmt((c.power||0)*d.loyalty/100*.15)}</span></div>${bar('Лояльность',d.loyalty)}${bar('Недовольство',d.unrest)}<label>Дань: <b id="tax-${id}">${d.tax}%</b></label><input type="range" min="0" max="40" value="${d.tax}" oninput="document.getElementById('tax-${id}').textContent=this.value+'%'" onchange="H.vassal(decodeURIComponent('${id}'),'tax',this.value)"><label>Автономия: <b id="aut-${id}">${d.autonomy}%</b></label><input type="range" min="0" max="100" value="${d.autonomy}" oninput="document.getElementById('aut-${id}').textContent=this.value+'%'" onchange="H.vassal(decodeURIComponent('${id}'),'autonomy',this.value)"><div class="actions"><button onclick="${call(n,'gift')}">🎁 Дар · 300</button><button onclick="${call(n,'troops')}">🪖 Войска</button><button onclick="${call(n,'resources')}">📦 Ресурсы</button><button class="danger" onclick="${call(n,'suppress')}">🛡 Подавить мятеж</button><button class="primary" onclick="${call(n,'annex')}">🏴 Присоединить</button><button onclick="${call(n,'release')}">🕊 Освободить</button></div></div>`}).join('')}</div>`)
}
/* ------------------------ УМНЫЙ ИИ, СОЮЗЫ, ВАССАЛЫ, КРАСИВЫЕ ВОЙНЫ ------------------------ */
const FRONTS=['Северный фронт','Центральный фронт','Южный фронт','Западный фронт','Восточный фронт','Горный перевал','Приморский фронт'];
const nowM=()=>S.year*12+S.month;
const pactOn=n=>((S.pacts||{})[n]||0)>nowM();
const AIS=()=>S.ai||(S.ai={coal:[],coalUntil:0,offer:-99,ult:-99,vev:-99});
const qn=n=>`decodeURIComponent('${encodeURIComponent(n).replace(/'/g,'%27')}')`;
let dlgOpen=false;
function dialog(t,yes,no,onYes,onNo){
 if(window.__NG_MP||S.out||S.campaignOver||dlgOpen||document.querySelector('.gameover'))return false;
 dlgOpen=true;pause();
 ask(t,()=>{dlgOpen=false;onYes();save();render()},yes,no,()=>{dlgOpen=false;if(onNo)onNo();save();render()});return true}
function allies(){S.allies=(S.allies||[]).filter(n=>{const c=rel(n);return c&&!c.annexed&&c.value>=15});return S.allies}
function weakness(){let w=0;if(S.stability<45)w+=20;if(S.approval<40)w+=15;if(S.money<1500)w+=15;if(S.wars.length)w+=12*S.wars.length;if(S.army<20000)w+=10;if(S.food<30||S.ammo<25)w+=8;return clamp(w)}
function vassalAid(){return (S.puppets||[]).reduce((s,n)=>{const c=rel(n),d=(S.puppetData||{})[n];return s+(c&&d?c.power*d.loyalty/100*.15:0)},0)}
function ultRefuse(c){c.value=clamp(c.value-8,-100,100);
 const can=S.wars.length<2&&aiMayAttackPlayer(c,myPower()),d=c._gdDecision;
 if(can&&d){startWar(c.name,true,d.cause.id);log(`⚔️ ${c.name} начал войну после отказа от ультиматума. Основание: ${GrandDiplomacy.CAUSES[d.cause.id].label}.`);say(`${c.name} напал на нас!`,'😱')}
 else{log(`😤 ${c.name} получил отказ, но не нашёл достаточного основания или ресурсов для войны.`);ch({approval:2},false)}}
function aiBrain(cand,me){
 if(window.__NG_MP||S.out||S.campaignOver)return;
 const A=AIS(),now=nowM(),AL=allies(),weak=weakness(),pup=S.puppets||[],al=alive().filter(r=>!pup.includes(r.name));
 /* 1. Оппортунисты: сильные соседи нападают, когда вы слабы */
 al.forEach(c=>{if(AL.includes(c.name))return;
  if(c.power>me*.85&&weak>=35&&c.aggr>.35&&c.value<15&&nearTo(c.name)&&!pactOn(c.name)){c.intent='Видит вашу слабость и готовит удар';if(Math.random()<.05*c.aggr&&!cand.includes(c))cand.push(c)}
  else if(AL.length>=2&&c.power<me*.6&&c.value<20){c.intent='Не решается нападать: у вас сильные союзники'}});
 /* 2. Коалиция против сверхагрессора */
 if(A.coal.length&&(now>A.coalUntil||S.threat<30)){log('🕊 Коалиция против вас распалась.');A.coal=[]}
 if(!A.coal.length&&(S.threat>=55||(S.captured||[]).length>=3)&&Math.random()<.12){
  const pool=al.filter(c=>c.power>=30&&c.value<35&&!AL.includes(c.name)).sort((a,b)=>b.power-a.power).slice(0,12),mem=[];
  while(pool.length&&mem.length<Math.min(4,pool.length)){const x=pick(pool);if(!mem.includes(x.name))mem.push(x.name)}
  if(mem.length>=3){A.coal=mem;A.coalUntil=now+18;mem.forEach(n=>{const c=rel(n);c.value=clamp(c.value-12,-100,100);c.intent='Участвует в коалиции против вас'});S.threat=clamp(S.threat+4);
   log(`🛡 Против вас сформировалась коалиция: ${mem.join(', ')}.`);say('Мир объединяется против нас!','😰');toast('🛡 Против вас сформировалась коалиция')}}
 if(A.coal.length){const mem=A.coal.map(rel).filter(c=>c&&!c.annexed);mem.forEach(c=>{c.value=clamp(c.value-.6,-100,100);c.intent='Участвует в коалиции против вас'});
  if(!S.wars.length&&mem.length&&now-(S.aiWarLast==null?-99:S.aiWarLast)>=12){
   const eligible=mem.filter(c=>aiMayAttackPlayer(c,me)).sort((a,b)=>(b._gdDecision?.score||0)-(a._gdDecision?.score||0));
   if(eligible.length){const lead=eligible[0],d=lead._gdDecision;S.aiWarLast=now;startWar(lead.name,true,d.cause.id);log(`🛡 Коалиция поддержала ${lead.name}; основание войны: ${GrandDiplomacy.CAUSES[d.cause.id].label}.`);say(`${lead.name} начал войну по конкретному основанию!`,'⚔️');pause()}}}
 /* 3. Союзники и друзья присылают войска */
 S.wars.forEach(w=>{if(w.won)return;w.allies=w.allies||[];if(w.allies.length>=3)return;const en=rel(w.n);
  al.forEach(c=>{if(w.allies.length>=3||c.name===w.n||w.allies.includes(c.name))return;
   const isAl=AL.includes(c.name),pr=isAl?.22:(c.value>60&&c.power>=30?.04:0);
   if(pr&&Math.random()<pr){w.allies.push(c.name);if(en)en.power=Math.max(10,en.power-Math.round(c.power*.08));w.p=clamp(w.p+3);
    log(`🤝 ${isAl?'Союзник':'Друг'} ${c.name} вступил в войну на вашей стороне.`);say(`${c.name} пришёл нам на помощь!`,'🤝')}})});
 /* 4. Союзный доход */
 if(AL.length)S.money+=AL.length*50;
 /* 5. Предложение союза */
 if(now-A.offer>=10&&AL.length<4&&Math.random()<.1){
  const fr=al.filter(c=>c.value>=45&&c.power>=25&&!AL.includes(c.name)&&!S.wars.some(w=>w.n===c.name));
  if(fr.length){const c=pick(fr);
   if(dialog(`🤝 ${c.name} предлагает военный союз. Союзник приносит +50 млн в месяц и присылает войска в ваших войнах. Принять?`,'Принять союз','Отказаться',()=>{S.allies.push(c.name);c.value=clamp(c.value+10,-100,100);log(`🤝 Заключён союз с государством ${c.name}.`);toast('🤝 Союз с '+c.name)},()=>{c.value=clamp(c.value-4,-100,100)}))A.offer=now}}
 /* 6. Ультиматумы от сильных и агрессивных соседей */
 if(now-A.ult>=14&&!S.war&&Math.random()<.08){
  const bully=al.filter(c=>c.power>me*1.1&&c.value<5&&c.aggr>.45&&nearTo(c.name)&&!pactOn(c.name)&&!AL.includes(c.name)).sort((a,b)=>b.aggr-a.aggr)[0];
  if(bully){const sum=Math.round(Math.max(300,Math.min(S.money*.25,2500))/50)*50;
   if(dialog(`⚠️ ${bully.name} выдвигает ультиматум: заплатить ${fmt(sum)} млн «компенсации» или готовиться к войне. Заплатить?`,`Заплатить ${fmt(sum)} млн`,'Отказать',()=>{
     if(S.money<sum){toast('Не хватает денег — отказ воспринят как вызов');ultRefuse(bully)}
     else{S.money-=sum;bully.value=clamp(bully.value+12,-100,100);bully.aggr=Math.max(.1,bully.aggr-.04);ch({approval:-3},false);log(`💸 Вы выплатили ${bully.name} ${fmt(sum)} млн и избежали войны.`)}},()=>ultRefuse(bully)))A.ult=now}}
}
function vassalEvents(){
 if(window.__NG_MP||S.out||S.campaignOver||!(S.puppets||[]).length)return;
 const A=AIS();if(nowM()-A.vev<8)return;
 const n=pick(S.puppets),d=(S.puppetData||{})[n],c=rel(n);if(!d||!c)return;const r=Math.random();
 if(r<.07&&d.tax>5){
  if(dialog(`👑 Вассал ${n} просит снизить дань с ${d.tax}% до ${d.tax-5}%: казна пуста, народ бедствует. Согласиться?`,'Согласиться','Отказать',()=>{d.tax-=5;d.loyalty=clamp(d.loyalty+10);d.unrest=clamp(d.unrest-6);log(`👑 Дань для ${n} снижена до ${d.tax}%.`)},()=>{d.loyalty=clamp(d.loyalty-6);d.unrest=clamp(d.unrest+5);log(`😒 ${n} недоволен отказом снизить дань.`)}))A.vev=nowM()}
 else if(r<.11&&S.wars.length<2){
  const atk=pick(alive().filter(x=>x.name!==n&&!S.puppets.includes(x.name)&&x.aggr>.4&&x.value<10&&x.power<=myPower()*1.5&&!S.wars.some(w=>w.n===x.name)&&nearTo(x.name))||[]);
  if(atk&&dialog(`⚔️ Агрессия против вашего вассала ${n}: ${atk.name} начинает против него войну. Защитить вассала? Если бросить его на произвол, он потеряет доверие к вам.`,'Защитить','Бросить',()=>{startWar(atk.name,false,'territorial');d.loyalty=clamp(d.loyalty+12);log(`🛡 Вы вступились за вассала ${n} и вступили в войну с ${atk.name}.`)},()=>{d.loyalty=clamp(d.loyalty-15);d.unrest=clamp(d.unrest+8);log(`💔 Вы бросили вассала ${n} без защиты. Его лояльность упала.`)}))A.vev=nowM()}
}
const BEV=[
 [d=>d>2,w=>{w.p=clamp(w.p+3);return `🚀 Танковый прорыв на участке «${w.frontLine}»: линия фронта продвинулась`}],
 [d=>d>0,(w,c)=>{if(c)c.power=Math.max(10,c.power-2);return `🛩 Авиаудар по тылам противника: потери врага растут`}],
 [d=>d>1,w=>`🪖 Наши части взяли укреплённую высоту у «${w.frontLine}»`],
 [d=>d<-2,w=>{w.p=clamp(w.p-3);return `💥 Контрудар противника: мы отступили на участке «${w.frontLine}»`}],
 [d=>d<0,w=>`🌧 Распутица и перебои со снабжением замедлили операции у «${w.frontLine}»`],
 [()=>true,w=>`⚔️ Затяжные бои на участке «${w.frontLine}»`]];
function battleEvent(w,d,c){if(Math.random()>.4)return;const e=pick(BEV.filter(x=>x[0](d)).slice(0,3)),t=e[1](w,c);w.blog=w.blog||[];w.blog.unshift(`${months[S.month].slice(0,3)}, год ${S.year}: ${t}`);w.blog.length=Math.min(w.blog.length,5)}
H.warMap=(name,side)=>{const w=S.wars.find(x=>x.n===name);if(!w)return;const list=(w.attacks||[]).filter(a=>a.side===(side==='enemy'?'enemy':'ours')).slice(0,8);if(!list.length)return toast(side==='enemy'?'Враг ещё не наносил ударов по нашим областям':'Наших ударов по врагу пока нет');const enemy=side==='enemy'?w.n:w.n;strikeScene({kind:'strike',rev:side==='enemy',k:list[0].k||'rocket',enemy,shots:list.map(a=>({regId:a.regId,down:a.down})),title:side==='enemy'?`🛡 Карта ударов врага: ${w.n}`:`🎯 Карта наших ударов: ${w.n}`,sub:list.map(a=>`${ARMS[a.k]?.n||a.k} → ${a.region}${a.down?' · сбито':''}`).join(' · ')});};
function warNewsHtml(w){const a=Object.keys(S.dark||{}).length,b=Object.keys(w.dark||{}).length,n=w.news||[];
 const oc=(w.occ||[]),rgo=regsOf(w.n)||[];
 const hits=(w.attacks||[]).slice(0,6);return `<div class="wnews"><b>📰 Новости войны</b>${oc.length?`<small class="muted">🚩 Заняты (заштрихованы на карте): ${oc.map(id=>{const x=rgo.find(z=>z.id===id);return x?String(x.n).replace(/ \(.*\)/,''):id}).join(', ')}. Станут нашими при мире — диктат «Области».</small>`:''}${(a||b)?`<small class="muted">Без света/в разрухе сейчас: у нас ${a} обл., у врага ${b} обл.</small>`:''}${hits.length?hits.map(x=>`<div class="wn">${x.side==='enemy'?'⚠️ Враг':'🎯 Мы'}: ${ARMS[x.k]?.n||x.k} → ${x.region}${x.down?' · сбито ПВО':''}</div>`).join(''):''}${n.length?n.slice(0,6).map(x=>`<div class="wn"><span>${x.m}</span> ${x.t} <small class="muted">· ${x.d}</small></div>`).join(''):'<p class="muted wnolog">Пока тихо. Новости о разрушениях и жертвах появятся после ударов.</p>'}</div>`}
function myHitHtml(w){
 const h=w.myHit;if(!h||!h.n)return '';
 const R=w.myRegHit||{},k=Object.keys(R).filter(n=>R[n]>=.05).sort((a,b)=>R[b]-R[a]).slice(0,3);
 return `<small class="muted wtopeco">💔 Удары врага по нашей экономике: попаданий ${h.n}, ВВП −${h.pct.toFixed(2)}% (≈ ${fmt(h.cut)} млрд), ремонт ${fmt(h.money)} млн, курс слабеет${k.length?`. Сильнее всего пострадали: ${k.map(n=>`${cityOf(n)} −${R[n].toFixed(2)}%`).join(', ')}`:''}.</small>`;
}
function topEcoHtml(w){
 const R=w.regEco||{},k=Object.keys(R).filter(n=>R[n]>=1).sort((a,b)=>R[b]-R[a]).slice(0,3);
 return k.length?`<small class="muted wtopeco">💸 Самые разрушенные экономики областей врага: ${k.map(n=>`${cityOf(n)} −${Math.round(R[n])}%`).join(', ')}</small>`:'';
}
function warCard(w){
 const c=rel(w.n)||{power:0},p=Math.round(w.p),mine=Math.round(w.mine||warPower(w)),theirs=Math.round(w.theirs||c.power*1.45),sum=Math.max(1,mine+theirs),
  st=w.won?['🏆','Победа','ok']:p>=65?['💪','Мы побеждаем','ok']:p>=45?['⚖','Равные силы','mid']:p>=25?['⚠','Мы отступаем','warn']:['🔥','Критическое положение','bad'],
  nm=qn(w.n),sup=Math.round(w.supply??75),ord=w.order||'balanced',allyL=(w.allies||[]);
 const tile=(i,l,v)=>`<div class="wt"><span>${i}</span><small>${l}</small><b>${v}</b></div>`;
 return `<article class="wcard st-${st[2]}"><header class="whead"><div class="wsides"><span class="wside us">🛡 ${S.name}</span><span class="wvsx">⚔</span><span class="wside them">${w.n} 🏴</span></div><div class="wbadge">${st[0]} ${st[1]}</div></header>
 <div class="wmeta">${w.frontLine||'Центральный фронт'} · месяц войны: ${w.m}${w.def?' · на нас напали':''}${w.causeLabel?` · основание: ${w.causeLabel}`:''}${w.goalLabel?` · ${w.def?'цель врага':'цель'}: ${w.goalLabel}${w.claimRegion?' («'+w.claimRegion+'»)':''}`:''}</div>
 <div class="wforce"><div class="fs us"><small>Наша сила</small><b>${fmt(mine)}</b></div><div class="fbar"><i style="width:${Math.round(mine/sum*100)}%"></i></div><div class="fs them"><small>Сила врага</small><b>${fmt(theirs)}</b></div></div>
 <div class="wtrack"><div class="wfill" style="width:${p}%"></div><div class="wmark" style="left:${p}%"></div></div><div class="wscale"><span>Поражение</span><b>Фронт ${p}%</b><span>Победа</span></div>
 <div class="wtiles">${tile('🚚','Снабжение',sup+'%')}${tile('⭕','Окружение',(w.encirclement||0)+'/5')}${tile('👑','Вассалы','+'+fmt(w.aid||vassalAid()))}${tile('🤝','Союзники',allyL.length?allyL.length:'—')}${tile('🪦','Наши потери',fmt(w.lost||0))}${tile('☠','Потери врага',fmt(w.kills||0))}${tile('🚩','Занято областей',(w.occ||[]).length+'/'+regCount(w.n))}${tile('🏘','Мирные у нас',fmt(w.civDead||0))}${tile('🏚','Мирные у врага',fmt(w.eCiv||0))}${tile('📉','ВВП врага','−'+(w.eco?w.eco.loss:0).toFixed(1)+'%')}${tile('💱','Валюта врага',w.eco?pct((w.eco.r/w.eco.r0-1)*100,0):'—')}${tile('💥','Ударов по экономике',(w.eco&&w.eco.hits)||0)}${tile('💔','Ударов по нам',(w.myHit&&w.myHit.n)||0)}${tile('📉','ВВП от ударов врага','−'+((w.myHit&&w.myHit.pct)||0).toFixed(1)+'%')}${tile('📡','Разведка',Math.round(w.recon||0)+'%')}</div>${topEcoHtml(w)}${myHitHtml(w)}
 ${warNewsHtml(w)}
 ${allyL.length?`<div class="wallies">На нашей стороне: ${allyL.map(n=>`<span class="chip">${n}</span>`).join('')}</div>`:''}
 <div class="worders"><button class="${ord==='attack'?'on atk':''}" onclick="H.warOrder(${nm},'attack')">⚔ Наступать</button><button class="${ord==='balanced'?'on bal':''}" onclick="H.warOrder(${nm},'balanced')">⚖ Баланс</button><button class="${ord==='defend'?'on def':''}" onclick="H.warOrder(${nm},'defend')">🛡 Оборона</button></div><div class="actions"><button onclick="armyAttack(${nm})">🪖 Показать атаку пехоты на карте</button><button onclick="H.warMap(${nm},'ours')">🗺 Карта наших ударов</button><button onclick="H.warMap(${nm},'enemy')">🛡 Карта ударов врага</button></div>
  ${warPlanHtml(w)}
 ${(w.blog&&w.blog.length)?`<ul class="wlog">${w.blog.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="muted wnolog">Боевые донесения появятся в ходе войны.</p>'}
 ${(w.won||w.p>=60)?`<div class="wwin"><p><b>${w.won?'🏆 Полная победа!':'💪 Перевес на фронте'}</b> Решите, чем закончить войну${w.won?` (иначе через ${3-(w.wm||0)} мес. — контрибуция)`:''}:</p><div class="actions"><button class="good" onclick="H.dictate(${nm},'tribute')">💰 Контрибуция</button><button class="primary" onclick="H.dictate(${nm},'puppet')">👑 Вассал</button>${(w.won||w.p>=(w.goal==='territory'?60:70))?`<button class="danger" onclick="H.dictate(${nm},'region')">🗺 ${w.goal==='territory'?'Захватить территорию':'Области'} · до ${quota(w.n,w).q}</button>`:`<small class="muted">Области — от ${w.goal==='territory'?60:70}%</small>`}${w.goal==='regime'?`<button class="danger" onclick="H.dictate(${nm},'regime')">🏛 Сменить власть</button>`:''}${w.won?`<button class="danger" onclick="H.dictate(${nm},'annex')">🏴 Захватить всю страну</button>`:''}</div></div>`:''}</article>`}
function warBoard(){return S.wars.length?`<div class="wglobal"><b>🎖 Общее управление фронтами</b><small class="muted">Приказ меняет режим всех текущих войн сразу. Индивидуальные планы ниже останутся отдельными.</small><div class="actions"><button class="danger" onclick="H.warAllOrder('attack')">⚔ Наступать везде</button><button onclick="H.warAllOrder('balanced')">⚖ Сбалансировать</button><button onclick="H.warAllOrder('defend')">🛡 Оборона везде</button></div></div><div class="wboard">${S.wars.map(warCard).join('')}</div>`:''}
const warPanel=()=>S.wars.length?`<section class="panel wide"><h2>⚔️ Война</h2>${warBoard()}</section>`:'';
function aiResPanel(){const R=window.AIRES;if(!R)return '';const m=R.summary(S);if(!m.total)return '';
 return card('⛽ Ресурсы стран и закупки ИИ',`<p class="muted">У каждой страны свои недра: нефть, газ и руда истощаются. Когда запасы падают, ${m.nn?'<b>нейросеть</b> страны':'страна (по простому правилу)'} решает, что докупить на рынке; бедная недрами страна тратит деньги, а при нехватке теряет стабильность и мощь. Заводам нужны сталь и топливо — без них оружие приходится покупать.</p><div class="cards">${R.KEYS.map(k=>`<div class="mini"><b>${R.ICON[k]} ${R.NAME[k]}</b><small>в дефиците: ${m.short[k]} из ${m.total} стран · недра исчерпаны у ${m.empty[k]}</small><small>куплено нейросетью: ${m.buys[k]} · цена ×${m.price[k].toFixed(2)}</small></div>`).join('')}</div><p class="muted">Опыт закупок: ${m.steps} решений · любопытство ${Math.round(m.eps*100)}%.${m.rows.length?' Чаще всего полезно: '+m.rows.sort((a,b)=>b.avg-a.avg).slice(0,2).map(x=>({wait:'ждать',food:'еда',fuel:'топливо',energy:'энергия',steel:'сталь'}[x.k]||x.k)).join(', ')+'.':''}</p>`)}
function aiPanel(){
 const A=AIS(),AL=allies(),pup=S.puppets||[],ri=n=>S.relations.findIndex(r=>r.name===n);
 const coal=A.coal.length?`<div class="aibox bad"><b>🛡 Коалиция против вас</b><p>${A.coal.join(', ')}</p><small>Распадётся примерно через ${Math.max(0,A.coalUntil-nowM())} мес., если угроза снизится.</small></div>`:`<div class="aibox ok"><b>🕊 Коалиций против вас нет</b><small>Держите «военную угрозу» ниже 55% и не захватывайте много земель, чтобы мир не объединился против вас.</small></div>`;
 const al=AL.length?`<div class="cards">${AL.map(n=>{const c=rel(n);return `<div class="mini"><b>🤝 ${n}</b><small>Отношения ${Math.round(c.value)} · мощь ${c.power}</small><div class="actions"><button onclick="H.allyBreak(${ri(n)})">Расторгнуть союз</button></div></div>`}).join('')}</div>`:'<p class="muted">Союзников пока нет. Союзник даёт +50 млн в месяц и присылает войска на ваш фронт.</p>';
 const cand=alive().filter(c=>c.value>=30&&c.power>=20&&!AL.includes(c.name)&&!pup.includes(c.name)).sort((a,b)=>b.value-a.value).slice(0,4);
 const prop=AL.length<4&&cand.length?`<h3>Предложить союз</h3><div class="cards">${cand.map(c=>`<div class="mini"><b>${c.name}</b><small>Отношения ${Math.round(c.value)} · мощь ${c.power}</small><div class="actions"><button class="primary" onclick="H.allyAsk(${ri(c.name)})">Предложить · 25 ⭐</button></div></div>`).join('')}</div>`:'';
 const big=alive().sort((a,b)=>b.power-a.power).slice(0,6).map(c=>`<div class="mini"><b>${c.name}</b> <small>${moodT(c.value)} · мощь ${c.power}</small><small class="muted">🧠 ${c.intent||'Наблюдает'}</small></div>`).join('');
 return card('🧠 Мировая политика',`<p class="muted">ИИ держав оценивает вашу силу: слабость привлекает нападение, сильные союзы сдерживают, захваты объединяют мир против вас, а наглые соседи шлют ультиматумы.</p>${coal}<h3>Ваши союзники (${AL.length}/4)</h3>${al}${prop}<h3>Крупнейшие державы и их планы</h3><div class="cards">${big}</div>`)}
H.allyAsk=i=>{if(blocked())return;const c=S.relations[i];if(!c)return;if(allies().length>=4)return toast('Не больше 4 союзников');if(S.pp<25)return toast('Нужно 25 политической власти');S.pp-=25;
 if(Math.random()<clamp(c.value/100+.2,.2,.9)){S.allies.push(c.name);c.value=clamp(c.value+8,-100,100);log(`🤝 Заключён союз с государством ${c.name}.`);toast('🤝 Союз с '+c.name)}else{c.value=clamp(c.value-3,-100,100);log(`${c.name} отклонил предложение союза.`);toast('Предложение отклонено')}save();render()};

H.relProgram=i=>{
 if(blocked())return;const c=S.relations[i];if(!c||c.self||c.annexed)return;
 if(S.wars.some(w=>w.n===c.name))return toast('Нельзя начать программу во время войны');
 S.relPrograms=S.relPrograms||{};if(S.relPrograms[c.name])return toast('Программа с этой страной уже действует');
 const cost=40;if(S.pp<cost)return toast(`Нужно ${cost} ⭐ политической власти`);
 S.pp-=cost;S.relPrograms[c.name]={monthsLeft:48,nextIn:5,boosts:0};
 log(`🤝 Запущена дипломатическая программа с ${c.name} на 4 года: каждые 5 месяцев отношения улучшаются на 5. Потрачено ${cost} ⭐.`);save();render();toast(`Программа с ${c.name} запущена на 4 года`);
};

H.dip=(i,k)=>{
 if(blocked())return;const c=S.relations[i];if(!c)return;const key='dp'+k+i;
 if(cdLeft(key)>0)return toast(cdMsg(key));
 if(S.wars.some(w=>w.n===c.name)&&k!=='embargo')return toast('Со страной идёт война — это недоступно');
 const pay=n=>{if(S.money<n){toast('Недостаточно средств');return false}S.money-=n;return true},pw=n=>{if(S.pp<n){toast('Не хватает политической власти');return false}S.pp-=n;return true};
 if(k==='gift'){if(!pay(450))return;const d=relationGain(c,10);c.aggr=Math.max(.05,(c.aggr||.3)-.02);cdSet(key,6);log(`🎁 Государственный подарок для ${c.name}: отношения +${d}, агрессивность немного снизилась.`)}
 else if(k==='visit'){if(!pay(180))return;const d=relationGain(c,4);cdSet(key,5);log(`🎭 Культурный обмен с ${c.name}: отношения +${d}.`)}
 else if(k==='aid'){if(c.value<-25)return toast('Для помощи нужен хотя бы нейтральный диалог (отношения ≥ −25)');if(!pay(500))return;const d=relationGain(c,8);S.approval=clamp(S.approval+1);S.stability=clamp(S.stability+.5);cdSet(key,9);log(`🧰 Гуманитарная помощь ${c.name}: отношения +${d}, одобрение +1.`)}
 else if(k==='summit'){if(!pay(260))return;const d=relationGain(c,5);c.aggr=Math.max(.05,(c.aggr||.3)-.015);cdSet(key,7);log(`🏛 Саммит с ${c.name}: отношения +${d}, напряжённость немного снизилась.`)}
 else if(k==='culture'){if(!pay(320))return;const d=relationGain(c,4);S.tech=clamp(S.tech+.35);cdSet(key,8);log(`🎓 Образовательный обмен с ${c.name}: отношения +${d}, технологии +0,35.`)}
 else if(k==='embassy'){if((S.embassies||{})[c.name])return toast('Посольство уже открыто');if(c.value<0)return toast('Посольство можно открыть при отношениях от 0');if(Object.keys(S.embassies||{}).length>=3)return toast('Можно содержать не более 3 зарубежных посольств');if(!pay(500))return;S.embassies=S.embassies||{};S.embassies[c.name]={monthsLeft:24,nextIn:4,paused:false};const d=relationGain(c,2);cdSet(key,12);log(`🏛 Открыто посольство в ${c.name}: содержание 20 млн/мес., срок программы 24 активных месяца. Отношения +${d}.`)}
 else if(k==='arms'){if(c.value<-10)return toast('Страна не продаёт оружие недругам (нужны отношения ≥ −10)');if(c.power<25)return toast('У этой страны слабая оборонка — продавать нечего');if((c.embargo||0)>nowM())return toast('Страна под эмбарго');if(!pay(400))return;S.equipment=clamp(S.equipment+9);S.ammo=clamp(S.ammo+10);c.value=clamp(c.value+2,-100,100);cdSet(key,4);log(`🛒 Закуплено оружие и боеприпасы у ${c.name}: вооружение +9, боеприпасы +10.`)}
 else if(k==='sellres'){if(!c.rs||!window.AIRES)return toast('Нет данных о ресурсах страны');if(c.value<-30)return toast('Страна не торгует с врагами (нужны отношения ≥ −30)');const KS=AIRES.KEYS,low=KS.slice().sort((a,b)=>c.rs.st[a]-c.rs.st[b])[0];if(c.rs.st[low]>=60)return toast('У страны нет острой нужды в ресурсах');if(S[low]<45)return toast(`У нас мало запаса (${AIRES.NAME[low]} ${Math.round(S[low])}) — продавать нечего`);const gain=Math.round(650*AIRES.price[low]);S[low]=clamp(S[low]-10);c.rs.st[low]=clamp(c.rs.st[low]+10);S.money+=gain;c.value=clamp(c.value+4,-100,100);cdSet(key,3);log(`📦 Продано ${c.name}: ${AIRES.NAME[low]} −10 с нашего склада, выручка ${gain} млн.`)}
 else if(k==='pact'){if(pactOn(c.name))return toast('Пакт уже действует');if(c.value<-15)return toast('Страна не хочет пакта (нужны отношения ≥ −15)');if(!pw(20))return;if(Math.random()<clamp(c.value/100+.35,.2,.9)){S.pacts[c.name]=nowM()+24;c.value=clamp(c.value+5,-100,100);c.aggr=Math.max(.05,c.aggr-.05);log(`📜 Пакт о ненападении с ${c.name} на 2 года. Страна не нападёт, пока он действует.`)}else{c.value=clamp(c.value-2,-100,100);log(`${c.name} отклонил пакт о ненападении.`)}cdSet(key,3)}
 else if(k==='embargo'){if(!pw(15))return;c.embargo=nowM()+12;c.value=clamp(c.value-12,-100,100);cdSet(key,6);log(`🚫 Эмбарго на поставки оружия в ${c.name} на год: заводы работают медленнее, закупки за границей закрыты.`)}
 toast('Готово');save();render()};
H.allyBreak=i=>{const c=S.relations[i];if(!c)return;S.allies=allies().filter(n=>n!==c.name);c.value=clamp(c.value-10,-100,100);log(`💔 Союз с ${c.name} расторгнут.`);save();render()};
function justTick(){for(const k in S.just){const before=S.just[k];if(S.just[k]>0)S.just[k]--;const stage=S.just[k]===0?3:3-S.just[k];if(stage>(S.justStage[k]||0)){S.justStage[k]=stage;const text=stage===1?'дипломатический протест и запрос объяснений':stage===2?'официальные требования и предупреждение об ультиматуме':'срок ультиматума истёк — теперь возможно объявление войны';log(`🌐 Кризис с ${k}: ${text}.`)}if(S.just[k]===0&&S.justCause&&S.justCause[k]&&!((S.grandDiplomacy&&S.grandDiplomacy.claims&&S.grandDiplomacy.claims[k]&&S.grandDiplomacy.claims[k].expires>nowM())||(S.grandDiplomacy&&S.grandDiplomacy.borderCases&&S.grandDiplomacy.borderCases[k]&&S.grandDiplomacy.borderCases[k].expires>nowM())||(S.grandDiplomacy&&S.grandDiplomacy.ideologyDisputes&&S.grandDiplomacy.ideologyDisputes[k]&&S.grandDiplomacy.ideologyDisputes[k].expires>nowM())||(S.grandDiplomacy&&S.grandDiplomacy.economicGrievances&&S.grandDiplomacy.economicGrievances[k]&&S.grandDiplomacy.economicGrievances[k].expires>nowM())||(S.grandDiplomacy&&S.grandDiplomacy.securityCases&&S.grandDiplomacy.securityCases[k]&&S.grandDiplomacy.securityCases[k].expires>nowM()))){delete S.just[k];delete S.justCause[k];delete S.justStage[k]}}}
function relationProgramTick(){
 const programs=S.relPrograms||(S.relPrograms={});
 Object.keys(programs).forEach(name=>{const c=rel(name),p=programs[name];if(!c||c.annexed){delete programs[name];return}
  if(S.wars.some(w=>w.n===name))return; // дипломатическая программа ставится на паузу во время войны
  p.monthsLeft=Math.max(0,(p.monthsLeft||0)-1);p.nextIn=Math.max(0,(p.nextIn==null?5:p.nextIn)-1);
  if(p.nextIn===0){const gain=relationGain(c,5);p.boosts=(p.boosts||0)+1;p.nextIn=5;log(`🤝 Дипломатическая программа с ${name}: отношения +${gain} (осталось ${p.monthsLeft} мес.).`)}
  if(p.monthsLeft<=0){delete programs[name];log(`📅 Дипломатическая программа с ${name} завершена.`)}
 });
}
function embassyTick(){
 const E=S.embassies||(S.embassies={});
 Object.keys(E).forEach(name=>{const c=rel(name),e=E[name];if(!c||c.annexed){delete E[name];return}
  if(S.wars.some(w=>w.n===name)){e.paused=true;return}
  if(S.money<20){e.paused=true;return}
  S.money-=20;e.paused=false;e.monthsLeft=Math.max(0,(e.monthsLeft||0)-1);e.nextIn=Math.max(0,(e.nextIn==null?4:e.nextIn)-1);
  if(e.nextIn===0){const gain=relationGain(c,2);e.nextIn=4;if(gain)log(`🏛 Посольство в ${name}: отношения +${gain}.`)}
  if(e.monthsLeft<=0){delete E[name];log(`🏛 Дипломатическая миссия в ${name} завершила работу.`)}
 });
}
H.justify=(i,cause,region,goal)=>{
 if(blocked())return;const c=S.relations[i];if(!c||c.self||c.annexed)return;
 if(S.just[c.name]!=null&&S.justCause&&S.justCause[c.name])return toast('Кризис с этой страной уже развивается');if(S.just[c.name]!=null)delete S.just[c.name];
 if(!window.GrandDiplomacy||!GrandDiplomacy.CAUSES[cause])return toast('Выберите конкретное основание войны');
 goal=window.GrandDiplomacy&&GrandDiplomacy.GOALS[goal]?goal:GrandDiplomacy.defaultGoal(cause);
 if(!GrandDiplomacy.goalAllowed(goal,{ideology:S.ideology||'прагматизм'},c,cause,c.value))return toast('Сменить власть можно только в стране с другим политическим курсом или при отношениях −30 и ниже.');
 const cost=({territorial:20,border:15,ideology:10,economic:12,security:10}[cause]||15)+(goal==='regime'?10:goal==='territory'?5:0);
 if(S.pp<cost)return toast(`Нужно ${cost} политической власти`);
 if(cause==='border'&&!nearTo(c.name))return toast('Пограничный кризис возможен только с близкой страной');
 const prep=GrandDiplomacy.preparePlayerCase(S,c,cause,region);if(!prep.ok)return toast(prep.error);
 S.pp-=cost;const GDState=S.grandDiplomacy||{};const severe=(cause==='territorial'&&GDState.claims&&GDState.claims[c.name]?.severity>=85)||(cause==='border'&&GDState.borderCases&&GDState.borderCases[c.name]?.severity>=85)||(cause==='ideology'&&GDState.ideologyDisputes&&GDState.ideologyDisputes[c.name]?.severity>=85)||(cause==='economic'&&GDState.economicGrievances&&GDState.economicGrievances[c.name]?.severity>=85)||(cause==='security'&&GDState.securityCases&&GDState.securityCases[c.name]?.severity>=85);S.just[c.name]=severe?0:3;S.justCause=S.justCause||{};S.justCause[c.name]=cause;S.justGoal=S.justGoal||{};S.justGoal[c.name]=goal;S.justRegion=S.justRegion||{};S.justRegion[c.name]=goal==='territory'||cause==='territorial'?String(region||'').slice(0,80):'';S.justStage=S.justStage||{};S.justStage[c.name]=severe?3:0;
 c.ideology=c.ideology||GrandDiplomacy.orientation(c);
 c.value=clamp(c.value-(cause==='territorial'?5:cause==='border'?7:cause==='ideology'?4:cause==='security'?5:6),-100,100);
 log(severe?`🚨 Серьёзная провокация против ${c.name}: основание «${GrandDiplomacy.CAUSES[cause].label}» позволяет внезапную войну.`:`🌐 Начат международный кризис с ${c.name}. Основание: ${GrandDiplomacy.CAUSES[cause].label}${cause==='territorial'&&region?` на область «${region}»`:''}. Цель войны: ${GrandDiplomacy.GOALS[goal].label}. Протест, требования и ультиматум займут 3 месяца.`);save();render();
};
H.declare=i=>{
 if(blocked())return;const c=S.relations[i];if(!c)return;
 if(S.wars.some(w=>w.n===c.name))return;
 if(S.wars.length>=2)return toast('Нельзя вести больше двух войн');
 const cause=S.justCause&&S.justCause[c.name],valid=cause&&GrandDiplomacy.playerCauses(S,c).includes(cause);
 if(!valid)return toast('Нет действующего основания. Сначала создайте дипломатический кризис.');
 const crisisData=S.grandDiplomacy||{},severe=(cause==='border'&&crisisData.borderCases&&crisisData.borderCases[c.name]?.severity>=85)||(cause==='ideology'&&crisisData.ideologyDisputes&&crisisData.ideologyDisputes[c.name]?.severity>=85)||(cause==='economic'&&crisisData.economicGrievances&&crisisData.economicGrievances[c.name]?.severity>=85)||(cause==='security'&&crisisData.securityCases&&crisisData.securityCases[c.name]?.severity>=85);if(S.just[c.name]>0&&!severe)return toast(`Кризис ещё развивается: осталось ${S.just[c.name]} мес.`);
 if(pactOn(c.name)){delete S.pacts[c.name];ch({legitimacy:-8,approval:-4},false);c.value=clamp(c.value-25,-100,100);log(`📜 Вы нарушили пакт о ненападении с ${c.name}: легитимность −8, отношения −25.`)}
 if(S.pp<20)return toast('Нужно 20 политической власти');S.pp-=20;
 const goal=(S.justGoal&&S.justGoal[c.name])||GrandDiplomacy.defaultGoal(cause),claimReg=(cause==='territorial'&&crisisData.claims&&crisisData.claims[c.name]&&crisisData.claims[c.name].region)||(S.justRegion&&S.justRegion[c.name])||'';
 delete S.just[c.name];delete S.justCause[c.name];delete S.justStage[c.name];if(S.justGoal)delete S.justGoal[c.name];if(S.justRegion)delete S.justRegion[c.name];
 startWar(c.name,false,cause,goal,claimReg);worldReact(c.name,'just');save();render();
};
H.peace=()=>{if(blocked())return;peaceAll(false);save();render()};
H.spoils=(n,m)=>{spoils(n,m);save();render()};
const hccSearch=q=>{CC.query=String(q||'');const term=CC.query.trim().toLocaleLowerCase('ru'),rows=[...document.querySelectorAll('#ccm [data-prov-row]')];let shown=0;rows.forEach(e=>{const ok=!term||String(e.getAttribute('data-prov-name')||'').includes(term);e.hidden=!ok;if(ok)shown++});const c=document.getElementById('province-count');if(c)c.textContent=`Показано ${shown.toLocaleString('ru-RU')} из ${rows.length.toLocaleString('ru-RU')}`};
Object.assign(H,{chooser:hchooser,chf:hchf,startAs:hstartAs,wz:hwz,cc:hcc,pick:hpick,ccClose:hccClose,take:htake,auto:hauto,confirm:hconfirm,ccSearch:hccSearch});
H.dictate=(n,m,rid)=>{const w=S.wars.find(x=>x.n===n);if(!w)return;if(!w.won&&w.p<60)return toast('Диктовать условия можно при перевесе на фронте от 60%');if(m==='regime'&&w.goal!=='regime')return toast('Для смены власти нужно было выбрать цель войны «Смена власти» при начале кризиса');if(m==='region'&&!w.won&&w.p<(w.goal==='territory'?60:70))return toast('Отторгнуть область можно при перевесе от '+(w.goal==='territory'?60:70)+'%');if(m==='annex'&&!w.won)return toast('Полный захват — только при полной победе (100%)');if(m==='region'){const Q=quota(n,w);if(!Q.free)return toast('В этой стране не осталось свободных регионов');if(!rid&&regsOf(n))return H.pick(n);const ids=Array.isArray(rid)?rid.slice(0,Q.q):Array.from({length:Q.q},()=>null),pop0=S.pop;ids.forEach((id,k)=>spoils(n,'region',id,k<ids.length-1));S.wars=S.wars.filter(x=>x.n!==n);S.war=S.wars.length>0||!!S.martial;log(`🗺 Итог войны с ${n}: отнято областей — ${ids.length} (фронт ${Math.round(Q.p)}%), население +${fmt(S.pop-pop0)}.`);save();render();return}spoils(n,m,rid);save();render()};
/* ================= НОВЫЕ СИСТЕМЫ: ПОЛИТИКА, РАЗВЕДКА, МИРОВЫЕ КРИЗИСЫ ================= */
function politicalSystemTick(){
 const P=S.polSys||(S.polSys={protest:12,lastUnrest:-99,lastCampaign:-99,lastCabinet:-99});
 const unrest=(S.regions||[]).length?(S.regions.reduce((a,r)=>a+(+r.unrest||0),0)/S.regions.length):0;
 const drift=(50-(+S.approval||50))*.055+(+S.inflation-8)*.055+(42-(+S.stability||42))*.035+(unrest-25)*.025-0.75;
 P.protest=clamp((+P.protest||0)+drift,0,100);
 if(P.protest>=62&&mt()-P.lastUnrest>=4&&Math.random()<.22){P.lastUnrest=mt();S.approval=clamp(S.approval-1.2);S.stability=clamp(S.stability-.8);log('📣 В нескольких городах прошли протесты из-за недовольства политикой правительства.');}
 if(P.protest>=82&&Math.random()<.10){S.gdp=Math.max(100,S.gdp*.997);S.employment=clamp(S.employment-.25);S.approval=clamp(S.approval-.8);log('🪧 Общенациональная забастовка замедлила экономическую активность.');}
 if(P.protest<25&&S.approval>55)S.stability=clamp(S.stability+.08);
}
function politicalSystemCard(){
 const P=S.polSys||{protest:12};const rivals=(S.parties||[]).filter(p=>p.name!==S.playerParty).sort((a,b)=>b.support-a.support);const top=rivals[0];
 return card('📣 Общественная политика',`<p class="muted">Недовольство общества формируется из одобрения правительства, инфляции, стабильности и настроений регионов. Высокое недовольство может вызвать протесты и забастовки.</p>${bar('Уровень протестных настроений',P.protest)}<div class="cards"><div class="mini"><b>Оппозиция</b>${top?`${top.name} · ${Math.round(top.support)}% поддержки`:'Нет соперников'}</div><div class="mini"><b>Среднее недовольство регионов</b>${Math.round(S.regions.reduce((a,r)=>a+(+r.unrest||0),0)/Math.max(1,S.regions.length))}%</div><div class="mini"><b>Контрразведка</b>${S.counterIntel||0}/5 уровней</div></div><p><b>Политические решения</b></p><div class="actions"><button class="primary" onclick="H.polAction('dialogue')">🤝 Диалог с оппозицией · 10 ⭐</button><button onclick="H.polAction('social')">🏥 Социальный пакет · 650 млн</button><button onclick="H.polAction('anti')">🔎 Антикоррупционная кампания · 350 млн</button><button onclick="H.polAction('campaign')">🎤 Предвыборная кампания · 250 млн</button><button onclick="H.polAction('cabinet')">🏛 Переформировать кабинет · 20 ⭐</button></div><p class="muted">Решения имеют перезарядку. Они влияют на протесты, доверие, поддержку партии и устойчивость правительства.</p>`);
}
const NATIONAL_PROJECTS={
 infra:{name:'Национальная инфраструктура',desc:'Обновление дорог, мостов и коммунальных сетей.',upfront:350,monthly:65,months:12,effect:'Инфраструктура регионов +8, ВВП +250',apply:()=>{S.regions.forEach(r=>r.infra=clamp((+r.infra||0)+8));S.gdp+=250;S.employment=clamp(S.employment+.5)}},
 industry:{name:'Промышленная модернизация',desc:'Обновление оборудования и поддержка производственных цепочек.',upfront:450,monthly:75,months:12,effect:'Гражданские заводы +1, сталь +7, ВВП +350',apply:()=>{S.civ=Math.min(80,(+S.civ||0)+1);S.steel=clamp(S.steel+7);S.gdp+=350;S.employment=clamp(S.employment+1)}},
 health:{name:'Национальная программа здоровья',desc:'Модернизация больниц, профилактика и доступность медицины.',upfront:300,monthly:60,months:12,effect:'Здравоохранение +4, одобрение +2, стабильность +1',apply:()=>{S.health=Math.min(35,(+S.health||0)+4);S.approval=clamp(S.approval+2);S.stability=clamp(S.stability+1);S.pop=Math.round(S.pop*1.001)}},
 education:{name:'Образование и кадры',desc:'Подготовка специалистов и обновление школ и университетов.',upfront:350,monthly:60,months:12,effect:'Технологии +1.5, занятость +1, ВВП +200',apply:()=>{S.tech=clamp(S.tech+1.5);S.employment=clamp(S.employment+1);S.gdp+=200;S.parties.forEach(p=>{if(p.name===S.playerParty)p.support=clamp(p.support+.5,2,75)})}}
};
H.startNationalProject=(id)=>{
 if(blocked())return;
 const D=NATIONAL_PROJECTS[id];if(!D)return;if(S.nationalProject)return toast('Сначала завершите текущий национальный проект');
 if(S.money<D.upfront)return toast(`Для запуска нужно ${D.upfront} млн`);
 S.money-=D.upfront;S.nationalProject={id,left:D.months,done:0,spent:D.upfront,paused:false};
 log(`🏗 Запущен национальный проект: ${D.name}. Ежемесячное финансирование — ${D.monthly} млн.`);save();render();toast('Национальный проект запущен');
};
function nationalProjectTick(){
 const P=S.nationalProject;if(!P||S.out||S.campaignOver)return;const D=NATIONAL_PROJECTS[P.id];if(!D){S.nationalProject=null;return;}
 if(S.money<D.monthly){if(!P.paused){P.paused=true;log(`⏸ Проект «${D.name}» приостановлен: не хватает средств на очередной этап.`);}return;}
 S.money-=D.monthly;P.spent=(P.spent||0)+D.monthly;P.done=(P.done||0)+1;P.left=Math.max(0,D.months-P.done);P.paused=false;
 if(P.left<=0){D.apply();S.nationalProject=null;log(`🏆 Национальный проект «${D.name}» завершён. Результат: ${D.effect}.`);}
}
function nationalProjectsCard(){
 const P=S.nationalProject;
 const active=P&&NATIONAL_PROJECTS[P.id];
 const current=active?`<div class="mini"><b>🏗 ${active.name}</b><p>${active.desc}</p>${bar('Выполнение',P.done/active.months*100)}<small>Осталось ${P.left} мес. · ежемесячно ${active.monthly} млн · потрачено ${fmt(P.spent||0)} млн</small>${P.paused?'<p class="warn">⏸ Приостановлен: недостаточно денег для следующего этапа.</p>':''}</div>`:'<p class="muted">Сейчас национальные проекты не ведутся. Можно запустить только один проект одновременно.</p>';
 const options=Object.entries(NATIONAL_PROJECTS).map(([id,D])=>`<div class="mini"><b>${D.name}</b><p>${D.desc}</p><small>Старт ${D.upfront} млн · затем ${D.monthly} млн × ${D.months} мес. · общий бюджет ${D.upfront+D.monthly*D.months} млн</small><p class="muted">Результат: ${D.effect}</p><button class="primary" ${P?'disabled':''} onclick="H.startNationalProject('${id}')">Запустить проект</button></div>`).join('');
 return card('🏗 Национальные проекты',`${current}<div class="cards">${options}</div><p class="muted">Финансирование списывается постепенно. Если денег не хватает, проект ставится на паузу без штрафа и продолжится после восстановления бюджета.</p>`);
}
H.polAction=(kind)=>{
 if(blocked())return;const P=S.polSys||(S.polSys={protest:12,lastUnrest:-99,lastCampaign:-99,lastCabinet:-99});
 const cd='pol_'+kind;if(cdLeft(cd)>0)return toast(cdMsg(cd));
 let cost=0,pp=0,msg='';
 if(kind==='dialogue'){pp=10;if(S.pp<pp)return toast('Нужно 10 политической власти');S.pp-=pp;P.protest=clamp(P.protest-13);S.stability=clamp(S.stability+1.5);S.legitimacy=clamp(S.legitimacy+1);S.approval=clamp(S.approval+1.5);msg='Правительство провело переговоры с оппозицией.';}
 else if(kind==='social'){cost=650;if(S.money<cost)return toast('Недостаточно средств');S.money-=cost;P.protest=clamp(P.protest-16);S.approval=clamp(S.approval+3);S.regions.forEach(r=>{r.unrest=clamp(r.unrest-2);r.loyalty=clamp(r.loyalty+1)});msg='Принят социальный пакет: помощь регионам и поддержка семей.';}
 else if(kind==='anti'){cost=350;if(S.money<cost)return toast('Недостаточно средств');S.money-=cost;S.legitimacy=clamp(S.legitimacy+3);S.trust=clamp((S.trust||70)+3);P.protest=clamp(P.protest-5);S.coupRisk=clamp(S.coupRisk-2);msg='Запущена антикоррупционная кампания и проверка госзакупок.';}
 else if(kind==='campaign'){cost=250;if(S.money<cost)return toast('Недостаточно средств');if(mt()-P.lastCampaign<6)return toast('Предвыборная кампания доступна раз в 6 месяцев');S.money-=cost;P.lastCampaign=mt();const me=S.parties.find(p=>p.name===S.playerParty);if(me)me.support=clamp(me.support+2.5,2,75);rivalsTop(S.parties,S.playerParty).forEach(p=>p.support=clamp(p.support-.5,2,75));S.approval=clamp(S.approval+1);msg='Проведена общенациональная предвыборная кампания.';}
 else if(kind==='cabinet'){pp=20;if(S.pp<pp)return toast('Нужно 20 политической власти');if(mt()-P.lastCabinet<6)return toast('Кабинет можно переформировать раз в 6 месяцев');S.pp-=pp;P.lastCabinet=mt();S.coupRisk=clamp(S.coupRisk-8);S.legitimacy=clamp(S.legitimacy+2);S.stability=clamp(S.stability+1);msg='Правительство обновило кабинет министров и распределило ответственность.';}
 else return;
 cdSet(cd,kind==='dialogue'?3:kind==='campaign'||kind==='cabinet'?6:4);log(msg);save();render();toast(msg);
};
function rivalsTop(a,me){return (a||[]).filter(p=>p.name!==me).sort((x,y)=>y.support-x.support).slice(0,2)}
function spySystemTick(){
 Object.keys(S.spyReports||{}).forEach(n=>{if(S.spyReports[n].expires<=mt())delete S.spyReports[n]});
 Object.keys(S.spyNetworks||{}).forEach(n=>{const x=S.spyNetworks[n];if(!x||!rel(n)){delete S.spyNetworks[n];return}x.level=clamp(+x.level||1,1,5);x.ops=Math.max(0,+x.ops||0)});
}
H.spyBuild=(i)=>{
 if(blocked())return;const c=S.relations[i];if(!c||c.self||c.annexed)return;
 const N=S.spyNetworks[c.name],level=N?N.level:0;if(level>=5)return toast('Сеть достигла максимального уровня');
 const cost=level?450+level*250:500,pp=level?3:5;if(S.money<cost)return toast(`Нужно ${cost} млн`);if(S.pp<pp)return toast(`Нужно ${pp} полит. власти`);
 S.money-=cost;S.pp-=pp;S.spyNetworks[c.name]={level:level+1,ops:N?N.ops||0:0,built:mt()};log(`🕵 В ${c.name} создана/расширена разведывательная сеть. Уровень ${level+1}/5.`);save();render();toast(`Разведсеть в ${c.name}: уровень ${level+1}`);
};
H.spyRecon=(i)=>{
 if(blocked())return;const c=S.relations[i];if(!c||c.self||c.annexed)return;const N=(S.spyNetworks||{})[c.name];if(!N)return toast('Сначала создайте разведывательную сеть');if((S.spyCooldowns||{})[c.name]>mt())return toast(`Следующая разведка через ${S.spyCooldowns[c.name]-mt()} мес.`);
 const chance=clamp(.28+N.level*.105+techSum('intel')+advSum('intel'),.2,.82);const ok=Math.random()<chance;S.spyCooldowns[c.name]=mt()+6;N.ops=(N.ops||0)+1;
 if(ok){const noise=.88+Math.random()*.24;S.spyReports[c.name]={at:mt(),expires:mt()+6,strength:Math.round(c.power*noise),aggression:Math.round((c.aggr||.25)*100),intent:c.intent||'Нет данных',relation:Math.round(c.value)};log(`🕵 Разведка получила доклад о стране ${c.name}.`);toast(`Разведка успешна: доклад о ${c.name} готов`)}
 else{c.value=clamp(c.value-1.5,-100,100);S.legitimacy=clamp(S.legitimacy-.2);log(`🕵 Разведгруппа в ${c.name} раскрыта. Отношения ухудшились.`);toast('Разведка провалилась — сеть раскрыта');}
 save();render();
};
H.counterIntelUpgrade=()=>{if(blocked())return;if(S.counterIntel>=5)return toast('Контрразведка уже максимального уровня');const cost=450+S.counterIntel*300;if(S.money<cost)return toast(`Нужно ${cost} млн`);if(S.pp<5)return toast('Нужно 5 политической власти');S.money-=cost;S.pp-=5;S.counterIntel++;log(`🛡 Контрразведка усилена: уровень ${S.counterIntel}/5.`);save();render();toast('Контрразведка усилена');};
function intelligenceTab(){
 const list=(S.relations||[]).map((r,i)=>({r,i})).filter(x=>!x.r.self&&!x.r.annexed).sort((a,b)=>b.r.power-a.r.power).slice(0,36);
 const rows=list.map(({r,i})=>{const n=(S.spyNetworks||{})[r.name],rep=(S.spyReports||{})[r.name],cd=(S.spyCooldowns||{})[r.name]||0;return `<div class="mini"><b>${r.name}</b><small>Мощь страны: ${r.power} · отношения: ${Math.round(r.value)}</small><small>Разведсеть: <b>${n?`уровень ${n.level}/5 · операций ${n.ops||0}`:'не создана'}</b></small>${rep?`<div class="hint">📄 Доклад (${Math.max(0,rep.expires-mt())} мес.): сила ~${rep.strength} · агрессивность ${rep.aggression}% · намерение: ${rep.intent} · отношения ${rep.relation}</div>`:''}<div class="actions"><button class="primary" onclick="H.spyBuild(${i})">${n?'Улучшить сеть':'Создать сеть'} · ${n?450+n.level*250:500} млн</button><button onclick="H.spyRecon(${i})">🔎 Разведать${cd>mt()?` · ${cd-mt()} мес.`:''}</button><button onclick="H.intel(${i},'prop')">📡 Влияние · 220</button><button onclick="H.intel(${i},'sab')">⚙ Ослабить · 450</button><button onclick="H.intel(${i},'steal')">📚 Технологии · 550</button></div></div>`}).join('');
 return `<div class="grid">${card('🕵 Разведывательная служба',`<p class="muted">Создавайте сети в других странах, собирайте доклады и проводите абстрактные игровые операции. Уровень сети повышает шанс успеха. Доклады действуют 6 игровых месяцев.</p><div class="cards"><div class="mini"><b>Сетей</b>${Object.keys(S.spyNetworks||{}).length}</div><div class="mini"><b>Контрразведка</b>${S.counterIntel||0}/5</div><div class="mini"><b>Политическая власть</b>${Math.floor(S.pp)} ⭐</div></div><button class="primary" onclick="H.counterIntelUpgrade()">🛡 Усилить контрразведку · ${450+(S.counterIntel||0)*300} млн + 5 ⭐</button>`)}${card('🌐 Страны для разведки',`<div class="cards">${rows||'<p class="muted">Нет доступных стран.</p>'}</div>`)}</div>`;
}
const GLOBAL_CRISIS={energy:{title:'Мировой энергетический шок',text:'Сбой поставок и дефицит энергоносителей подняли издержки бизнеса по всему миру.',months:6,action:'energy',actionName:'Субсидировать энергетику · 650 млн'},bank:{title:'Международная банковская паника',text:'Инвесторы выводят капитал, рынки нервничают, а кредитование замедляется.',months:5,action:'bank',actionName:'Гарантировать вклады · 500 млн'},food:{title:'Мировой продовольственный кризис',text:'Неурожай в нескольких регионах мира вызвал рост цен на продовольствие.',months:7,action:'food',actionName:'Закупить зерно · 400 млн'},health:{title:'Глобальная чрезвычайная ситуация в здравоохранении',text:'Международная система здравоохранения перегружена, торговля и занятость замедляются.',months:6,action:'health',actionName:'Усилить систему здравоохранения · 600 млн'},shipping:{title:'Кризис международной логистики',text:'Перебои перевозок задерживают поставки сырья и товаров.',months:5,action:'shipping',actionName:'Поддержать логистику · 450 млн'}};
function globalCrisisTick(){
 let C=S.globalCrisis;
 if(!C){if(window.__NG_MP)return;if(mt()>=S.globalNext&&Math.random()<.08){const ids=Object.keys(GLOBAL_CRISIS),id=ids[Math.floor(Math.random()*ids.length)],D=GLOBAL_CRISIS[id];S.globalCrisis={id,left:D.months,age:0,response:null};S.globalHistory.unshift({t:mt(),title:D.title,result:'Начался мировой кризис'});S.globalHistory=S.globalHistory.slice(0,12);S.globalNext=mt()+24+Math.floor(Math.random()*19);log(`🌍 Мировое событие: ${D.title}.`);say(D.title,'🌍');}return;}
 const D=GLOBAL_CRISIS[C.id];if(!D){S.globalCrisis=null;return;}C.age++;
 const mult=C.response?0.5:1;
 if(C.id==='energy'){S.fuel=clamp(S.fuel-1.5*mult);S.inflation=clamp(S.inflation+.22*mult);S.gdp=Math.max(100,S.gdp*(1-.0015*mult));}
 if(C.id==='bank'){S.trust=clamp((S.trust||70)-1.8*mult);S.money=Math.max(0,S.money-80*mult);S.gdp=Math.max(100,S.gdp*(1-.001*mult));}
 if(C.id==='food'){S.food=clamp(S.food-1.7*mult);S.inflation=clamp(S.inflation+.16*mult);S.approval=clamp(S.approval-.2*mult);}
 if(C.id==='health'){S.employment=clamp(S.employment-.18*mult);S.gdp=Math.max(100,S.gdp*(1-.0018*mult));S.approval=clamp(S.approval-.25*mult);}
 if(C.id==='shipping'){S.fuel=clamp(S.fuel-.8*mult);S.steel=clamp(S.steel-.7*mult);S.gdp=Math.max(100,S.gdp*(1-.0014*mult));}
 if(window.__NG_MP)return;C.left--;if(C.left<=0){log(`🌍 Мировой кризис «${D.title}» завершился.`);S.globalHistory.unshift({t:mt(),title:D.title,result:C.response?'Последствия смягчены ответными мерами':'Кризис завершился'});S.globalHistory=S.globalHistory.slice(0,12);S.globalCrisis=null;}
}
H.globalResponse=()=>{
 if(blocked())return;if(window.__NG_MP&&window.NGMP){window.NGMP.respondGlobalCrisis();return;}const C=S.globalCrisis;if(!C)return toast('Сейчас нет активного мирового кризиса');if(C.response)return toast('Ответные меры уже приняты');const D=GLOBAL_CRISIS[C.id],cost={energy:650,bank:500,food:400,health:600,shipping:450}[C.id];if(S.money<cost)return toast(`Нужно ${cost} млн`);S.money-=cost;C.response=1;
 if(C.id==='energy'){S.fuel=clamp(S.fuel+9);S.inflation=clamp(S.inflation-.5);}
 if(C.id==='bank'){S.trust=clamp((S.trust||70)+9);S.stability=clamp(S.stability+2);}
 if(C.id==='food'){S.food=clamp(S.food+16);S.approval=clamp(S.approval+1);}
 if(C.id==='health'){S.approval=clamp(S.approval+2);S.health=Math.min(35,S.health+2);}
 if(C.id==='shipping'){S.fuel=clamp(S.fuel+5);S.steel=clamp(S.steel+4);S.gdp+=120;}
 log(`🌍 Приняты меры: ${D.actionName}. Последствия мирового кризиса будут слабее.`);save();render();toast('Ответные меры приняты');
};
function globalCrisisCard(){
 const C=S.globalCrisis;if(!C){const next=Math.max(0,(S.globalNext||mt()+12)-mt());return card('🌐 Мировые события',`<p>Сейчас активного глобального кризиса нет. Международные потрясения появляются случайно и могут затронуть экономику, торговлю, занятость и стабильность.</p><p class="muted">Следующее окно возможных событий: примерно через ${next} игровых месяцев. Это не гарантированная дата.</p>${(S.globalHistory||[]).length?`<h3>Недавняя хроника</h3><div class="log">${S.globalHistory.slice(0,6).map(x=>`<div>Год ${Math.floor(x.t/12)+1}: ${x.title} — ${x.result}</div>`).join('')}</div>`:''}`)}
 const D=GLOBAL_CRISIS[C.id];if(!D)return card('🌐 Мировые события','<p>Состояние кризиса не распознано. Оно будет очищено при следующем игровом месяце.</p>');return card('🚨 '+D.title,`<p>${D.text}</p><div class="cards"><div class="mini"><b>Осталось</b>${C.left} мес.</div><div class="mini"><b>Меры правительства</b>${C.response?'Приняты — ущерб снижен':'Не приняты'}</div></div>${C.response?'<p class="up">Ответные меры работают: ежемесячный ущерб уменьшен.</p>':`<button class="primary" onclick="H.globalResponse()">${D.actionName}</button>`}<p class="muted">Кризис влияет на ваши показатели каждый игровой месяц, пока не завершится.</p>`);
}
H.intel=(i,k)=>{
 if(blocked())return;const c=S.relations[i];if(!c||c.self||c.annexed)return;const key='in'+k+i;
 if(cdLeft(key)>0)return toast(cdMsg(key));
 const net=(S.spyNetworks||{})[c.name];if(!net)return toast('Сначала создайте разведывательную сеть в этой стране');
 const cost={prop:220,sab:450,steal:550}[k];if(S.money<cost)return toast('Недостаточно средств');
 S.money-=cost;cdSet(key,6);net.ops=(net.ops||0)+1;
 const p=clamp(.25+net.level*.105+techSum('intel')+advSum('intel')+(S.flags.intel?.10:0),.2,.82),ok=Math.random()<p;
 if(k==='prop'){if(ok){c.value=clamp(c.value+7,-100,100);log(`📡 Пропаганда в ${c.name}: отношения улучшились.`)}else log(`📡 Операция в ${c.name} провалилась.`)}
 if(k==='sab'){if(ok){c.power=Math.max(10,c.power-4);c.aggr=Math.max(.1,c.aggr-.025);log(`💥 Диверсия в ${c.name}: их мощь упала.`)}else{c.value=clamp(c.value-8,-100,100);ch({legitimacy:-1},false);log(`💥 Диверсанты в ${c.name} пойманы — скандал.`)}}
 if(k==='steal'){if(ok){if(S.research.length)S.research[0].p+=1;else S.tech=clamp(S.tech+1.2);log(`🕵 Из ${c.name} украдены чертежи.`)}else{c.value=clamp(c.value-6,-100,100);log(`🕵 Шпионы в ${c.name} раскрыты.`)}}
 toast(ok?'Операция удалась':'Операция провалилась');save();render();
};
const WF={q:'',c:'all',s:'power',n:30};
const SORTS={power:'по мощи',value:'по отношениям',pop:'по населению',name:'по алфавиту'};
function wlFilter(){let a=S.relations.map((r,i)=>[r,i]).filter(x=>!x[0].annexed&&!x[0].self);const q=WF.q.trim().toLowerCase();
 if(q)a=a.filter(x=>x[0].name.toLowerCase().includes(q));
 const c=WF.c;if(c==='war')a=a.filter(x=>S.wars.some(w=>w.n===x[0].name));else if(c==='friend')a=a.filter(x=>x[0].value>10);else if(c==='enemy')a=a.filter(x=>x[0].value<-20);else if(c==='vassal')a=a.filter(x=>S.puppets.includes(x[0].name));else if(c!=='all')a=a.filter(x=>wi(x[0].name).cont===c);
 const f={power:(x,y)=>y[0].power-x[0].power,value:(x,y)=>y[0].value-x[0].value,pop:(x,y)=>(wi(y[0].name).pop||0)-(wi(x[0].name).pop||0),name:(x,y)=>x[0].name.localeCompare(y[0].name,'ru')}[WF.s]||((x,y)=>0);
 return a.sort(f)}
function dipCard(r,i){const W=wi(r.name),n=r.name,ally=(S.allies||[]).includes(n),pact=pactOn(n),emb=(r.embargo||0)>nowM(),prog=(S.relPrograms||{})[n],b=(k,t)=>{const cd=cdLeft('dp'+k+i);return `<button onclick="H.dip(${i},'${k}')">${cd>0?'⏳ '+cd+' мес.':t}</button>`};
 return `<div class="mini"><b>${r.name}</b> <span class="muted">${CONTN[W.cont]||''}</span><br><span class="muted">${r.trait||''}</span><br>${mood(r.value)} (${Math.round(r.value)})<div class="bar"><i style="width:${clamp((r.value+100)/2)}%"></i></div>Мощь: ${r.power} · Нас.: ${W.pop>=1?W.pop.toFixed(W.pop>=10?0:1):W.pop} млн · ${resIcons(W.res)}<br>${S.grandDiplomacy&&S.grandDiplomacy.claims&&S.grandDiplomacy.claims[n]?`<br><small class="dn">🗺 Территориальная претензия: ${S.grandDiplomacy.claims[n].region||'неуказанный регион'}</small>`:''}<small class="muted">🧠 ${r.intent||''}</small>${r.rs&&window.AIRES?`<br><small class="muted">Запасы: ${AIRES.line(r)}${r.rs.shortM>2?' · ⚠️ нехватка':''}</small>`:''}${pact?'<br><small>📜 Пакт о ненападении до '+Math.ceil(((S.pacts||{})[n]-nowM())/12*10)/10+' лет</small>':''}${emb?'<br><small>🚫 Эмбарго на оружие</small>':''}${ally?'<br><small>🤝 Союзник</small>':''}${prog?`<br><small>🤝 Долгосрочная программа: ещё ${prog.monthsLeft} мес.</small>`:''}${(S.embassies||{})[n]?`<br><small>🏛 Посольство: ${(S.embassies||{})[n].paused?'на паузе':'работает'} · ещё ${(S.embassies||{})[n].monthsLeft} активных мес. · содержание 20 млн/мес.</small>`:''}<div class="actions"><button onclick="diplomacy(${i},'talk')">🤝 Переговоры · 150</button><button onclick="diplomacy(${i},'trade')">📦 Торговля · 350</button>${b('gift','🎁 Государственный подарок · 450')}${b('visit','🎭 Культурный обмен · 180')}</div><div class="actions">${b('summit','🏛 Саммит · 260')}${b('aid','🧰 Гуманитарная помощь · 500')}${b('culture','🎓 Образовательный обмен · 320')}${b('arms','🛒 Оружие · 400')}${r.rs?b('sellres','📦 Продать ресурсы'):''}</div><div class="actions">${pact?'':b('pact','📜 Пакт · 20 ⭐')}${emb?'':b('embargo','🚫 Эмбарго · 15 ⭐')}${(S.embassies||{})[n]?'':b('embassy','🏛 Посольство · 500')}${ally?'':`<button onclick="H.allyAsk(${i})">🤝 Союз · 25 ⭐</button>`}${prog?'':`<button class="primary" onclick="H.relProgram(${i})">🤝 Программа на 4 года · 40 ⭐</button>`}</div></div>`}
function staffCard(r,i){const W=wi(r.name),atWar=S.wars.some(w=>w.n===r.name),j=S.just[r.name],prog=(S.relPrograms||{})[r.name];
 let wb=warCauseControl(i,r,atWar,j);
 const ib=['prop','sab','steal'].map(k=>{const nm={prop:'Влияние · 220',sab:'Ослабить · 450',steal:'Технологии · 550'}[k],cd=cdLeft('in'+k+i);return `<button onclick="H.intel(${i},'${k}')">${cd>0?'⏳ '+cd+' мес.':nm}</button>`}).join('');
 return `<div class="mini"><b>${r.name}</b> <span class="muted">${CONTN[W.cont]||''}</span><br><span class="muted">${r.trait||''}</span><br>${moodT(r.value)} · мощь ${r.power} · ${resIcons(W.res)}<br><small class="muted">🧠 ${r.intent||''}</small>${S.puppets.includes(r.name)?'<br><small>👑 Вассал</small>':''}${prog?`<br><small>🤝 Дипломатическая программа: ещё ${prog.monthsLeft} мес. · следующее улучшение через ${prog.nextIn} мес.</small>`:''}${(r.regLost||0)?`<br><small>🗺 Отобрано областей: ${r.regLost}</small>`:''}<div class="actions">${wb}</div><div class="actions">${ib}</div><div class="actions">${prog?'':`<button class="primary" onclick="H.relProgram(${i})">🤝 Улучшать отношения 4 года · 40 ⭐</button>`}</div></div>`}
function wlCards(kind){const l=wlFilter(),sh=l.slice(0,WF.n);return (sh.length?sh.map(x=>kind==='dip'?dipCard(x[0],x[1]):staffCard(x[0],x[1])).join(''):'<p class="muted">Никого не найдено</p>')+(l.length>sh.length?`<div class="mini" style="display:flex;align-items:center;justify-content:center"><button onclick="H.wf('n',${WF.n+30},'${kind}')">Показать ещё (${l.length-sh.length})</button></div>`:'')}
function wlPanel(kind){const conts=Object.keys(CONTN).map(k=>`<option value="${k}" ${WF.c===k?'selected':''}>${CONTN[k]}</option>`).join(''),spec=[['all','Все страны'],['war','⚔️ В войне'],['friend','🤝 Друзья'],['enemy','😠 Враги'],['vassal','👑 Вассалы']].map(x=>`<option value="${x[0]}" ${WF.c===x[0]?'selected':''}>${x[1]}</option>`).join('');
 return `<div class="wlbar"><input type="search" placeholder="🔍 Поиск страны…" value="${WF.q.replace(/"/g,'&quot;')}" oninput="H.wf('q',this.value,'${kind}')"><select onchange="H.wf('c',this.value,'${kind}')">${spec}<optgroup label="Часть света">${conts}</optgroup></select><select onchange="H.wf('s',this.value,'${kind}')">${Object.keys(SORTS).map(k=>`<option value="${k}" ${WF.s===k?'selected':''}>Сортировка: ${SORTS[k]}</option>`).join('')}</select></div><p class="muted" id="wlcount-${kind}">В мире ${alive().length} государств · Отношения имеют 8 уровней. Повторные улучшения дают меньше очков при высоком доверии; действия имеют перезарядку. Посольства дают постепенный бонус, но требуют содержания. Даже при −100 война не начинается автоматически — её объявляют отдельно.</p><div class="cards" id="wl-${kind}">${wlCards(kind)}</div>`}
H.wf=(k,v,kind)=>{WF[k]=v;if(k!=='n')WF.n=30;const e=document.getElementById('wl-'+kind);if(e)e.innerHTML=wlCards(kind)};
const moodT=v=>v>=80?'🌟 Стратегический партнёр':v>=60?'🤝 Близкий партнёр':v>=35?'🙂 Дружелюбные отношения':v>=10?'🕊 Партнёрский диалог':v>-10?'😐 Нейтралитет':v>-35?'🧊 Напряжённые отношения':v>-60?'⚠️ Недружественные':'😠 Враждебные отношения';
function staffTab(){
 let h='';
 h+=card('⚔️ Фронты',S.wars.length?warBoard()+`<div class="actions"><button class="danger" onclick="H.peace()">Заключить мир со всеми</button></div><p class="muted">Сила армии: <b>${fmt(warPower())}</b>. Исход зависит от численности, вооружения, подготовки, духа, технологий, доктрины, снабжения и помощи вассалов.</p>`:'<p>Сейчас мы не воюем. '+(S.martial?'Введено военное положение.':'')+'</p>');
 h+=card('🌍 Страны: война и разведка',wlPanel('staff')+`<p class="muted">Разведоперации требуют сеть в выбранной стране; шанс зависит от её уровня, технологий и советников. Объявление войны без обоснования: одобрение −8, легитимность −6. Реакция на нападение не опускает отношения ниже −30 из-за самого нападения. Не больше двух войн одновременно.</p>`);
 h+=card('📜 Законы',`<p class="muted">Меняются по одной ступени, раз в 4 месяца. Снижение стоит 20 ⭐.</p><h3>Экономика</h3><div class="cards">${ECOO.map(k=>{const L=ECOL[k],cur=S.law.eco===k,ok=!L.need||L.need();return `<div class="mini ${cur?'party-card':''}"><b>${L.n}</b><small>${L.t}</small><div class="actions">${cur?'<span class="muted">✅ Действует</span>':`<button class="${ok?'primary':''}" onclick="H.law('eco','${k}')">${ok?`${L.pp} ⭐`:'🔒 '+L.why}</button>`}</div></div>`}).join('')}</div><h3>Призыв</h3><div class="cards">${CONO.map(k=>{const L=CONS[k],cur=S.law.con===k,ok=!L.need||L.need();return `<div class="mini ${cur?'party-card':''}"><b>${L.n}</b><small>${L.t}</small><div class="actions">${cur?'<span class="muted">✅ Действует</span>':`<button class="${ok?'primary':''}" onclick="H.law('con','${k}')">${ok?`${L.pp} ⭐`:'🔒 '+L.why}</button>`}</div></div>`}).join('')}</div>`);
 return `<div class="grid">${h}</div>`;
}
function factoryPanel(){
 const regions=S.regions||[],selected=regions.some(r=>r.name===S.factoryRegion)?S.factoryRegion:(regions[0]&&regions[0].name)||'';
 const builds=S.factoryBuilds||[],factories=S.milFactories||[];
 const opts=regions.map(r=>`<option value="${String(r.name).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" ${r.name===selected?'selected':''}>${r.name}</option>`).join('');
 const queue=builds.length?builds.map(b=>{const T=MIL_FACTORY_TYPES[b.type];return T?`<div class="mini"><b>${T.ic} ${T.n}</b><small>Область: ${b.region} · осталось ${b.left} мес.</small><div class="bar"><i style="width:${Math.max(0,Math.min(100,(1-b.left/T.months)*100))}%"></i></div></div>`:''}).join(''):'<small class="muted">Очередь строительства пуста.</small>';
 const list=factories.length?factories.map(f=>{const T=MIL_FACTORY_TYPES[f.type];return T?`<div class="mini"><b>${T.ic} ${T.n}</b><small>📍 ${f.region} · прочность ${Math.round(f.hp||100)}% · выпуск: ${T.desc}</small><small>${f.stalled?'⚠️ Приостановлено: '+(f.stallReason||'не хватает ресурсов'): `Производственный цикл: ${f.progress||0}/${T.period} мес.`}</small><small>За цикл: −${T.steel} стали · −${T.fuel} топлива · −${T.energy} энергии · −${T.upkeep} млн</small><div class="bar"><i style="width:${Math.max(0,Math.min(100,(f.progress||0)/T.period*100))}%"></i></div></div>`:''}).join(''):'<small class="muted">Пока нет специализированных заводов.</small>'; 
 const cards=Object.keys(MIL_FACTORY_TYPES).map(k=>{const T=MIL_FACTORY_TYPES[k];return `<div class="mini"><b>${T.ic} ${T.n}</b><small>${T.desc}</small><small>Строительство: ${T.months} мес. · ${T.cost} млн · ${Math.max(3,Math.ceil(T.steel*2))} стали · ${Math.max(1,Math.ceil(T.fuel*1.5))} топлива · ${Math.max(2,Math.ceil(T.energy*1.5))} энергии</small><small>За цикл: ${T.steel} стали · ${T.fuel} топлива · ${T.energy} энергии · ${T.upkeep} млн</small><button class="primary" onclick="H.buildFactory('${k}',document.getElementById('milFactoryRegion')?.value||'${String(selected).replace(/'/g,"\\'")}')">Построить</button></div>`}).join('');
 return `<p class="muted">Заводы можно строить и в мирное время. Строительство требует денег, стали, топлива и энергии. Каждый завод закреплён за областью. Каждый производственный цикл расходует сталь, топливо, энергию и деньги на содержание. При нехватке любого ресурса производство останавливается на текущем этапе и продолжится после пополнения запасов. В мультиплеере списание при строительстве подтверждает сервер комнаты, а ресурсы и выпуск синхронизируются отчётами страны.</p><div class="row"><label>Область строительства</label><select id="milFactoryRegion" onchange="H.factoryRegion(this.value)">${opts}</select></div><div class="cards">${cards}</div><h3>🚧 Строятся</h3><div class="cards">${queue}</div><h3>🏭 Действующие предприятия (${factories.length})</h3><div class="cards">${list}</div>`;
}
function indTab(){
 const L=ECOL[S.law.eco]||ECOL.civ;
 let h=card('🏭 Промышленность',`<div class="cards"><div class="mini">Гражданские заводы<b>${S.civ}</b>доход ${incFlat()>=0?'+':''}${incFlat()} млн/мес относительно базы</div><div class="mini">Военные заводы<b>${S.mil}</b>выпуск ×${(L.out*(1+techSum('mo')+advSum('mo'))).toFixed(2)}</div><div class="mini">Верфи<b>${S.dock}</b>флот: ${S.navy}</div><div class="mini">Слоты стройки<b>${S.build.length} / ${bslotsN()}</b></div></div><p class="muted">Военные заводы расходуют сталь и дают вооружение и боеприпасы. Закон экономики влияет на выпуск и доход. Стройка стоит денег сразу. Заводы строятся около года, остальные объекты — от 4 до 12 месяцев. Военные объекты (бункеры, ПВО, госпитали, аэродромы, базы, ракетные шахты) строятся только на войне.</p>`);
 h+=card('🏗 Очередь строительства',S.build.length?`<div class="cards">${S.build.filter(b=>BUILD[b.t]).map(b=>`<div class="mini party-card"><b>${BUILD[b.t].ic} ${BUILD[b.t].n}</b>осталось ${b.left} мес.<div class="bar"><i style="width:${Math.max(0,Math.min(100,(1-b.left/(b.m||BUILD[b.t].m))*100))}%"></i></div></div>`).join('')}</div>`:'<p>Очередь пуста.</p>');
 h+=card('🏭 Построенные объекты',`<div class="cards">${Object.keys(BUILD).filter(k=>bcount(k)>0).map(k=>`<div class="mini"><b>${BUILD[k].ic} ${BUILD[k].n}</b>${bcount(k)} шт.</div>`).join('')||'<p class="muted">Пока нет особых объектов — стройте электростанции, порты, больницы и военные базы.</p>'}</div>`);
 h+=card('🏭 Военно-промышленный комплекс',factoryPanel());
 h+=rsvCard();
 BGROUPS.forEach(([gk,title])=>{const ks=Object.keys(BUILD).filter(k=>BUILD[k].g===gk),lock=gk==='war'&&!atWar();
  h+=card('➕ '+title,(gk==='war'?`<p class="muted">${lock?'🔒 Сейчас вы не воюете со страной — эти объекты откроются с началом войны.':'⚔️ Идёт война — военные объекты доступны.'}</p>`:'')+`<div class="cards">${ks.map(k=>`<div class="mini"><b>${BUILD[k].ic} ${BUILD[k].n}</b><small>${BUILD[k].t}</small><br><span class="muted">${BUILD[k].m} мес.</span><div class="actions"><button class="primary" onclick="H.build('${k}')">${lock?'🔒 ':''}${BUILD[k].c} млн</button></div></div>`).join('')}</div>`)});
 return `<div class="grid">${h}</div>`;
}


/* ------------------------ ОТСТАВКА: честный баланс ------------------------ */
const ADVICE=['Раздай помощь населению, выступи с обращением, снизь налоги.','Усиль порядок в регионах и охрану, подними стабильность.','Повысь жалованье армии, сделай чистку или усили тайную полицию.','Погаси долг, подними налоги, сократи расходы.','Антикоррупционная кампания, референдум, союз с церковью.','Заключи мир, закупи вооружение, проведи учения.','Заморозь цены, не печатай деньги, подними налоги.','Закупи еду на рынке, дай субсидии фермерам.','Встречи с депутатами, коалиция, при крайней нужде — подкуп.','Подними доверие рынков: меньше долга и ровный бюджет.','Программа занятости, укрепи армию и границы.'];
const isPopular=()=>S.approval>=60&&S.legitimacy>=45;
const crisisNeed=()=>isPopular()?8:S.approval>=50?6:4;
const ousterChance=()=>.18*difficulty().coup*(isPopular()?.35:S.approval>=50?.6:1);
function threatLethal(){
 if(S.war)return true;
 const top=Math.max(20,...alive().filter(r=>r.value<30&&nearTo(r.name)).map(r=>r.power))*1.45;
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
 {id:'freetrade',n:'Свободная торговля',pp:40,fx:{trust:2},mo:{money:50,trust:.03,food:-.06},st:{biz:.9,farm:-.7}},
 {id:'cbindep',n:'Закон о независимости Центробанка',pp:45,fx:{trust:5,inflation:-3},mo:{inflation:-.45,trust:.08,'gdp%':-.004},st:{biz:.8,workers:-.3}},
 {id:'pricecap',n:'Антиинфляционный тарифный кодекс',pp:40,fx:{approval:2,inflation:-2},mo:{inflation:-.35,approval:.03,money:-30},st:{workers:.8,pens:.8,biz:-.7}},
 {id:'windfall',n:'Налог на сверхприбыль в антикризисный фонд',pp:45,fx:{money:1500,inflation:-2,trust:-3},mo:{inflation:-.30,money:250,trust:-.04},st:{workers:.7,pens:.6,biz:-1}}];
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
 return `<div class="grid">${card('👥 Настроение групп',`<div class="cards">${Object.keys(GR).map(k=>`<div class="mini"><b>${GR[k][1]} ${GR[k][0]}</b>${bar('Довольны',S.gr[k])}</div>`).join('')}</div><p class="muted">Группы реагируют на экономику, законы, бюджет и решения. Ниже 25% — протесты, выше 75% — легитимность растёт.</p>`)}${window.PopAI?card('🧠 Население учится',PopAI.panel(S)):''}${card('💬 Что говорят люди',feedHtml())}${card('Настроение страны',bar('Одобрение',S.approval)+bar('Стабильность',S.stability)+`<p class="muted">Недовольство регионов: ${S.regions.map(r=>`${r.name} ${Math.round(r.unrest)}%`).join(' · ')}</p>`)}</div>`;
}

/* ------------------------ РЫНОК ------------------------ */
const MK={food:['Еда','🌾',45],fuel:['Топливо','⛽',40],steel:['Сталь','🔩',40],energy:['Энергия','⚡',50],equipment:['Вооружение','🔫',35],ammo:['Боеприпасы','💥',30]};
const mkMod=g=>{let m=S.mk.m[g];if(S.war&&['fuel','ammo','equipment'].includes(g))m*=1.25;m*=1+clamp((50-S.trust)*.003,-.1,.15);const al=alive(),ar=al.length?al.reduce((a,r)=>a+r.value,0)/al.length:0;return m*(1-clamp(ar,-40,40)*.0008)};
const mkBuy=g=>Math.max(1,Math.round(MK[g][2]*mkMod(g)*1.15*10)/10);
const mkSell=g=>Math.max(1,Math.round(MK[g][2]*mkMod(g)*.65*(S.trust<30?.85:1)*10)/10);
H.mkBuy=(g,n)=>{
 if(blocked())return;const room=100-Math.floor(S[g]),roomR=RSV[g]?Math.max(0,Math.floor(rsvCap(g)-rsvEnsure()[g])):0;n=Math.min(n,room+roomR,S.mk.q[g]);
 if(n<=0)return toast(S.mk.q[g]<=0?'Лимит торговли на этот месяц исчерпан':'Склад полон');
 const c=Math.ceil(mkBuy(g)*n);if(S.money<c)return toast('Недостаточно средств');
 S.money-=c;const toM=Math.min(n,room);S[g]=clamp(S[g]+toM);if(n>toM)rsvEnsure()[g]+=n-toM;S.mk.q[g]-=n;S.mk.imp+=c;save();render();toast(`Импорт: ${MK[g][0]} +${n} за ${fmt(c)} млн${n>toM?' (часть — в хранилище)':''}`);
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
/* ---------------- АВТОЗАКУПКИ РЕСУРСОВ ---------------- */
function autoPurchaseEnsure(){
 const d={enabled:false,items:{food:{on:false,target:55,amount:10},fuel:{on:false,target:45,amount:10},steel:{on:false,target:45,amount:10},energy:{on:false,target:45,amount:10},equipment:{on:false,target:40,amount:5},ammo:{on:false,target:40,amount:5}}};
 if(!S.autoPurchase)S.autoPurchase=d;S.autoPurchase.items=S.autoPurchase.items||{};
 for(const k in d.items)if(!S.autoPurchase.items[k])S.autoPurchase.items[k]=d.items[k];
 return S.autoPurchase;
}
H.autoSet=(field,key,value)=>{
 const A=autoPurchaseEnsure();
 if(field==='enabled')A.enabled=!!value;
 else if(A.items[key]){if(field==='on'){A.items[key].on=!!value;if(value)A.enabled=true}else if(field==='target')A.items[key].target=clamp(+value,5,95);else if(field==='amount')A.items[key].amount=clamp(Math.round(+value),1,30)}
 save();render();
};
function autoPurchaseTick(){
 const A=autoPurchaseEnsure(),legacy=!!S.autoImp;   // legacy — старая кнопка «автозакупка дефицита» в панели ресурсов: теперь она работает через этот же механизм
 if(!A.enabled&&!legacy){A.last='Автозакупки выключены (включите общий переключатель).';return}
 if(!S.mk||!S.mk.q){A.last='Рынок пока недоступен.';return}
 const CORE=['food','fuel','energy','steel'],URGENT=30;   // ниже 30 включается штраф запущенной экономики (28) — покупаем срочно и сверх обычного лимита
 const exp=Math.max(0,Number(S.lastExp)||0),bought=[],skipped=[];
 const goods=Object.keys(MK).map(g=>{
  let cfg=A.enabled?A.items[g]:null;if(cfg&&!cfg.on)cfg=null;
  if(!cfg&&legacy&&CORE.includes(g))cfg={on:true,target:32,amount:30};
  return cfg?{g,cfg,have:Number(S[g])||0}:null;
 }).filter(Boolean).sort((x,y)=>x.have/Math.max(1,x.cfg.target)-y.have/Math.max(1,y.cfg.target));   // сначала самое дефицитное
 for(const {g,cfg,have} of goods){
  const urgent=CORE.includes(g)&&have<URGENT,deficit=Math.max(0,Math.ceil(cfg.target-have));
  if(deficit<1)continue;                                   // запас выше порога — покупать не нужно
  if(S.mk.q[g]<=0){skipped.push(`${MK[g][0]}: исчерпан месячный лимит рынка`);continue}
  const room=Math.max(0,100-Math.floor(have)),roomR=RSV[g]?Math.max(0,Math.floor(rsvCap(g)-rsvEnsure()[g])):0;
  let n=Math.min(deficit,urgent?deficit:Math.max(1,Math.round(cfg.amount)),30,S.mk.q[g],room+roomR);
  if(n<1){skipped.push(`${MK[g][0]}: нет места на складе`);continue}
  const price=mkBuy(g),avail=S.money-exp*(urgent?.15:.5);   // в казне остаётся резерв, чтобы закупка не толкала страну в дефицит и долг
  n=Math.min(n,Math.floor(avail/price));while(n>0&&Math.ceil(price*n)>avail)n--;
  if(n<1){skipped.push(`${MK[g][0]}: бережём резерв казны`);continue}
  const cost=Math.ceil(price*n);
  S.money-=cost;const main=Math.min(n,room);S[g]=clamp(S[g]+main);if(n>main)rsvEnsure()[g]+=n-main;
  S.mk.q[g]-=n;S.mk.imp+=cost;bought.push(`${MK[g][0]} +${n} (${fmt(cost)} млн)${urgent?' ⚠':''}`);
 }
 A.last=(bought.length?'Куплено: '+bought.join(', ')+'. ':'Покупок нет. ')+(skipped.length?'Пропущено: '+skipped.join('; ')+'.':'');
 if(bought.length)log(`🤖 Автозакупки выполнили импорт: ${bought.join(', ')}.`);
 if(skipped.length&&(S.month%3===0))log(`🤖 Автозакупки: ${skipped.join('; ')}.`);
}
function autoPurchaseCard(){
 const A=autoPurchaseEnsure();
 const rows=Object.keys(MK).map(g=>{const d=A.items[g];return `<div class="mini"><b>${MK[g][1]} ${MK[g][0]}</b><small>Текущий запас: <b>${Math.round(S[g])}%</b> · цена: ${mkBuy(g)} млн/ед.</small><label class="autoline"><input type="checkbox" ${d.on?'checked':''} onchange="H.autoSet('on','${g}',this.checked)"> Автоматически покупать</label><div class="autogrid"><label>Порог запаса, %<input type="number" min="5" max="95" value="${d.target}" onchange="H.autoSet('target','${g}',this.value)"></label><label>Покупать за месяц<input type="number" min="1" max="30" value="${d.amount}" onchange="H.autoSet('amount','${g}',this.value)"></label></div></div>`}).join('');
 return card('🤖 Автоматические закупки',(A.last?`<p><b>Последний месяц:</b> ${A.last}</p>`:'')+'<p class="muted">Включите нужные товары. Каждый игровой месяц система проверит запас и автоматически купит выбранное количество, если запас ниже заданного порога. Покупки используют общий месячный лимит рынка (до 30 ед. на товар), учитывают цену и доступные деньги. Сначала покупается самое дефицитное. Если запас основного ресурса упал ниже 30, закупка идёт срочно и сверх обычного количества (до лимита рынка). В казне всегда остаётся резерв, поэтому закупки не загоняют страну в долг. Если денег или места не хватает — закупка пропускается.</p>'+`<label class="autoline autoglobal"><input type="checkbox" ${A.enabled?'checked':''} onchange="H.autoSet('enabled','',this.checked)"> <b>Включить автоматические закупки</b></label><div class="cards">${rows}</div>`);
}

function worldTensionValue(){
 const rels=(S.relations||[]).filter(r=>!r.annexed&&!r.self);
 const hostile=rels.filter(r=>r.value<-35).length;
 const avgAggr=rels.length?rels.reduce((a,r)=>a+clamp((Number(r.aggr)||.25)*100,0,100),0)/rels.length:25;
 const wars=(S.wars||[]).length;
 const captured=(S.captured||[]).length;
 return clamp(Math.round((Number(S.threat)||0)*.32+wars*20+hostile*2.2+avgAggr*.14+(S.martial?7:0)+captured*.55),0,100);
}
function worldTensionTab(){
 const v=worldTensionValue();
 const stage=v<20?['Низкая','Мирная обстановка','#4ba77a']:v<40?['Повышенная','Дипломатические кризисы','#b2a34e']:v<60?['Высокая','Региональные конфликты','#d18a3b']:v<80?['Критическая','Мир на грани большой войны','#d35b45']:['Предвоенная','Глобальный конфликт практически неизбежен','#c83f4b'];
 const hostile=(S.relations||[]).filter(r=>!r.annexed&&!r.self&&r.value<-35).sort((a,b)=>a.value-b.value).slice(0,8);
 const wars=(S.wars||[]).map(w=>`<div class="mini"><b>⚔️ ${w.n}</b><small>Поддержка фронта: ${Math.round(w.p||0)}% · ${w.def?'оборона':'наступление'}</small></div>`).join('')||'<p class="muted">Активных войн сейчас нет.</p>';
 const enemies=hostile.map(r=>`<div class="mini"><b>${r.name}</b><small>Отношения: ${Math.round(r.value)} · агрессивность ИИ: ${Math.round((r.aggr||0)*100)}%</small></div>`).join('')||'<p class="muted">Нет государств с критически плохими отношениями.</p>';
 const factors=[['Военная угроза',Math.round(S.threat||0)+'%'],['Активные войны',(S.wars||[]).length],['Враждебные государства',hostile.length],['Средняя агрессивность ИИ',Math.round((S.relations||[]).filter(r=>!r.annexed&&!r.self).reduce((a,r)=>a+(r.aggr||.25),0)/Math.max(1,(S.relations||[]).filter(r=>!r.annexed&&!r.self).length)*100)+'%']];
 return `<div class="grid"><section class="panel wide"><h2>🌍 Мировая напряжённость</h2><p class="muted">Общий индикатор того, насколько международная обстановка близка к большой войне. Он рассчитывается по войнам, угрозам, агрессивности государств и дипломатическим отношениям.</p><div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin:16px 0"><div style="font:700 54px/1 'Oswald',sans-serif;color:${stage[2]}">${v}%</div><div style="flex:1;min-width:180px"><b style="font-size:20px;color:${stage[2]}">${stage[0]}</b><div class="muted">${stage[1]}</div></div></div><div style="height:18px;background:#1b2730;border:1px solid #53616a;border-radius:3px;overflow:hidden"><div style="height:100%;width:${v}%;background:linear-gradient(90deg,#4ba77a 0%,#b2a34e 40%,#d18a3b 65%,#c83f4b 100%);transition:width .3s"></div></div><div class="row" style="justify-content:space-between;font-size:12px;color:#9caab2"><span>Мир</span><span>Кризис</span><span>Глобальная война</span></div></section>${card('📊 Факторы напряжённости',`<div class="cards">${factors.map(x=>`<div class="mini"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div>`)}${card('⚔️ Активные конфликты',wars)}${card('🚨 Наиболее напряжённые отношения',enemies)}${globalCrisisCard()}${card('Как меняется показатель',`<p class="muted">Напряжённость растёт при начале войн, усилении военной угрозы и ухудшении отношений. Снижается постепенно, когда угрозы уходят и дипломатия стабилизируется. Это игровой индикатор, а не реальная статистика.</p><div class="mini"><b>Состояние вашей страны</b>${bar('Военная угроза',S.threat)}${bar('Стабильность',S.stability)}<small>Активные войны: ${(S.wars||[]).length} · Военное положение: ${S.martial?'введено':'не введено'}</small></div>`)}</div>`;
}
function marketTab(){
 const cost=g=>mkBuy(g),tr=g=>{const d=S.mk.m[g]-(S.mk.prev[g]||S.mk.m[g]);return Math.abs(d)<.005?'▬':d>0?'<span class="fxb">▲</span>':'<span class="fxg">▼</span>'};
 return `<div class="grid">${card('💱 Экспорт и импорт ресурсов',`<p class="muted">Покупай нехватающие ресурсы (импорт) и продавай излишки (экспорт). Цены колеблются, растут в войну и при низком доверии рынков, дешевеют при хороших отношениях. Лимит — 30 единиц каждого ресурса за месяц. Импорт — покупка ресурса, экспорт — продажа излишков. Баланс торговли: экспорт <b>${fmt(S.mk.exp)}</b> · импорт <b>${fmt(S.mk.imp)}</b> млн.</p><div class="cards">${Object.keys(MK).map(g=>`<div class="mini"><b>${MK[g][1]} ${MK[g][0]} ${tr(g)}</b>${bar('Запас',S[g])}${rsvLine(g)}<small>Импорт (купить): <b>${mkBuy(g)}</b> млн/ед.<br>Экспорт (продать): <b>${mkSell(g)}</b> млн/ед.<br>Лимит на месяц: ${S.mk.q[g]}</small><div class="actions mkact"><button class="primary" onclick="H.mkBuy('${g}',5)">Импорт 5</button><button class="primary" onclick="H.mkBuy('${g}',15)">Импорт 15</button><button onclick="H.mkSell('${g}',5)">Экспорт 5</button><button onclick="H.mkSell('${g}',15)">Экспорт 15</button></div></div>`).join('')}</div>`)}</div>`;
}
const SEA=`<text x="330" y="500" text-anchor="middle" class="maptxt2" style="opacity:.55">ЧЁРНОЕ МОРЕ</text><text x="640" y="430" text-anchor="middle" class="maptxt2" style="opacity:.55">Азовское</text>`;

function hoiTab(){
 if(tab==='autobuy')return `<div class="grid">${autoPurchaseCard()}${tryH(marketTab)}</div>`;
 if(tab==='intelligence')return intelligenceTab();
 if(tab==='events')return evTab();if(tab==='market')return marketTab();if(tab==='worldtension')return worldTensionTab();if(tab==='bills')return billsTab();if(tab==='people')return peopleTab();if(tab==='focus')return focusTab();if(tab==='research')return researchTab();
 if(tab==='industry')return indTab();if(tab==='staff')return staffTab();if(tab==='advisors')return advTab();
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
 budTick();taxTick();billsTick();grTick();mkTick();autoPurchaseTick();prodTick();buildTick();factoryTick();focusTick();researchTick();justTick();warTick();puppetTick();regimeTick();worldTick();if(window.NGRES)NGRES.tick();rsvTick();
 S.war=S.wars.length>0||!!S.martial;
 if(!S.war)S.threat=clamp(S.threat+(20-S.threat)*.03);
 clampFix();
 evTick();
}

/* ===== МУЛЬТИПЛЕЕР: точка входа для nations.js ===== */
const MPSTART={story:{money:26000,approval:72,stability:78,sup:[42,22,19,17]},easy:{money:22000,approval:67,stability:73,sup:[38,23,20,19]},hard:{money:14500,approval:54,stability:59,sup:[30,28,22,20]},expert:{money:10500,approval:47,stability:50,sup:[29,27,24,20]}};

/* ---------- Быстрый доступ к функциям государства (одиночная игра; в сетевой партии — своя копия в nations.js) ---------- */
const QA=[['autobuy','🤖','Автозакупки'],['economy','💰','Экономика'],['industry','🏭','Военные заводы'],['military','🛡','Армия и ПВО'],['diplomacy','🌐','Дипломатия мира'],['politics','🏛','Политика'],['intelligence','🕵','Разведка'],['worldtension','🌍','Мировые события'],['map','🗺','Карта и регионы'],['market','🛒','Рынок']];
function qaSummary(){const a=S.autoPurchase||{},items=a.items||{},on=Object.keys(items).filter(k=>items[k]&&items[k].on);return `<b>Автозакупки:</b> ${a.enabled?'включены':'выключены'} · ${on.length?'товары: '+on.join(', '):'товары не выбраны'} <button onclick="NG.setTab('autobuy')">Настроить</button>`}
function quickAccessCard(){
 try{let fxl='';try{fxEnsure();const F=S.fx;fxl=`<div class="qa-chips"><span class="chip">💱 1 ${F.ref} = <b>${fxRate(F.rate)} ${F.cur}</b></span><span class="chip">📈 ВВП <b>${fmt(S.gdp)}</b> млн</span></div>`}catch(e){}
  return card('🧭 Быстрый доступ к функциям государства',`<p class="muted2">Все системы страны в одном месте: закупки, экономика, армия, ПВО, карта и дипломатия.</p>${fxl}<div class="mprow mpquick qa-grid">${QA.map(x=>`<button onclick="NG.setTab('${x[0]}')"><span class="qa-ico">${x[1]}</span><span>${x[2]}</span></button>`).join('')}</div><div class="muted2 qa-auto">${qaSummary()}</div>`)}catch(e){return''}}
function mpFresh(diff,name,ai){S=initial();ensure();setupAi(ai);S.difficulty=DIFFICULTIES[diff]?diff:'normal';const m=MPSTART[S.difficulty];if(m){S.money=m.money;S.approval=m.approval;S.stability=m.stability;m.sup.forEach((v,i)=>S.parties[i].support=v)}if(name)S.name=String(name).slice(0,28);
 /* Страна игрока = реальная страна мира (если название совпало): свой ВВП, своя валюта и курс, население и регионы.
    Раньше у всех игроков оставалась «Новария» с одним ВВП и одним курсом. */
 try{const key=mpCountryKey(name);if(key){NEWC=key;applyCountry();S.mpReal=key;S.fx=null;S.econ=null;if(window.NationsAI)try{NationsAI.init(S)}catch(e){}}}catch(e){console.error('[Novaria] страна мультиплеера:',e);NEWC=null}
 S.history=[];S.history.push(snap())}
function mpCountryKey(name){const n=String(name||'').trim().replace(/\s+/g,' ');if(!n||n==='Новария')return null;if(WM[n])return n;const l=n.toLowerCase().replace(/ё/g,'е');
 const ks=Object.keys(WM);let k=ks.find(x=>x.toLowerCase().replace(/ё/g,'е')===l);if(k)return k;
 const t=l.replace(/^(республика|королевство|федерация|государство|соединенные штаты|соединённые штаты)\s+/,'');k=ks.find(x=>x.toLowerCase().replace(/ё/g,'е')===t);return k||null}
/* ================= ВАЛЮТА · ПОТЕРИ ВОЙНЫ · НОВЫЕ ГРАФИКИ (v2) ================= */
const okn=v=>typeof v==='number'&&isFinite(v);
function fxCode(){const w=S.me&&WM[S.me];return w&&w.iso&&window.FXD?FXD.cur(w.iso):'NVT'}
function fxReal(c){const g=window.FXD&&FXD.get(c);return g?g.v:1}
function fxEnsure(){
 const me=S.me||'',cur=fxCode();
 if(!S.fx||S.fx.me!==me||S.fx.cur!==cur){
  const ref=cur==='USD'?'EUR':'USD',refB=(cur==='EUR'||ref==='EUR')?'GBP':'EUR';
  const b=cur==='NVT'?36:fxReal(cur)/fxReal(ref);
  S.fx={me,cur,ref,refB,base:b,base0:b,rate:b,mom:0,shock:0,lastAlert:-99,policy:'managed',fxReserves:1800,fxTarget:b,fxInterventions:0};S.fx.start=fxSnapAll();S.econ=null;
 }
 if(!S.econ)S.econ={pg:S.gdp,last:S.gdp,tr:.002,loss:0,tax:0,gap:0,lossPct:0,peak:0,drag:0,wm:0,war0:null};
}
function fxSnapAll(){const o={};if(!window.FXD)return o;const cs=[...FXD.KEY];if(S.fx&&S.fx.cur&&!cs.includes(S.fx.cur))cs.push(S.fx.cur);cs.forEach(c=>{const g=FXD.get(c);if(g)o[c]=g.v});return o}
const fxB=()=>{const F=S.fx;return F.rate*fxReal(F.ref)/fxReal(F.refB)};
function fxMarket(){const F=S.fx;return F.cur==='NVT'?null:fxReal(F.cur)/fxReal(F.ref)}
function fxShock(p){fxEnsure();const F=S.fx;F.base*=1+p*.8;F.rate*=1+p}
function fxRebase(){
 try{
  if(!S.fx)return;const F=S.fx;
  if((S.history||[]).length<=3&&!(S.wars||[]).length&&!F.moved)F.start=fxSnapAll();
  if(F.cur==='NVT')return;
  if((S.history||[]).length>3||(S.wars||[]).length||F.moved)return;
  const nb=fxReal(F.cur)/fxReal(F.ref),k=nb/F.base;if(!isFinite(k)||Math.abs(k-1)<1e-6)return;
  F.base*=k;F.base0*=k;F.rate*=k;
  (S.history||[]).forEach(p=>{if(okn(p.fxA))p.fxA*=k;if(okn(p.fxB))p.fxB*=k});
 }catch(e){}
}
const avgReg=k=>(S.regions||[]).reduce((a,r)=>a+(+r[k]||0),0)/Math.max(1,(S.regions||[]).length);
/* --- потери экономики во время войны --- */
/* все войны, влияющие на экономику: одиночные (S.wars) и мультиплеерные (S.mpWars, их выставляет nations.js по данным сервера) */
function warsAll(){return [...(S.wars||[]),...(S.mpWars||[])]}
/* --- послевоенное восстановление и конверсия экономики ---
   1) Разрушенные дороги, энергосеть и заводы областей восстанавливаются медленно (около 0,4 пункта в месяц на область)
      и стоят денег; при пустой казне, низкой стабильности и доверии — ещё медленнее.
   2) ВВП не может вернуться к довоенной траектории быстрее, чем отстроена инфраструктура (потолок = 80–100% траектории).
   3) Конверсия: военная экономика перестраивается на гражданскую. Первую четверть срока заводы переходят с оружия
      на гражданскую продукцию (небольшой спад), затем идёт рост. Срок зависит от длительности войны (6–48 мес.).
   Восстановление длится, пока разрыв не закрыт (разрыв больше НЕ «забывается» через 36 мес.). */
function recoverTick(E,W0,t){
 const regs=S.regions||[],step=.4*(S.stability>55?1.2:S.stability<35?.4:1)*((S.trust==null||S.trust>40)?1:.6),afford=S.money>3000?1:S.money>800?.6:.25;
 let need=0,have=0,cost=0;
 regs.forEach(r=>{const o=W0.reg&&W0.reg[r.name],ti=o?o.i:W0.infra,tn=o?o.n:W0.ind;
  if(r.infra<ti){const d=Math.min(ti-r.infra,step*afford);r.infra=clamp(r.infra+d);cost+=d*7}
  if(r.industry<tn){const d=Math.min(tn-r.industry,step*.7*afford);r.industry=clamp(r.industry+d);cost+=d*9}
  need+=Math.max(ti,1)+Math.max(tn,1);have+=Math.min(r.infra,ti)+Math.min(r.industry,tn)});
 cost=Math.min(cost,S.money);S.money-=cost;
 const frac=need>0?clamp(have/need,0,1):1;W0.frac=frac;W0.spent=(W0.spent||0)+cost;
 const cap=E.pg*(.80+.20*frac);
 // В послевоенный период восстановительный спрос должен перекрывать остаточный стресс отраслей,
 // иначе системные штрафы каждый месяц съедают весь ремонт и ВВП продолжает падать.
 if(S.stability>30&&S.gdp<cap)S.gdp*=1+Math.min(.035,(cap/S.gdp-1)*.12);
 const cm=Math.max(6,Math.min(48,Math.round((E.wm||0)*.6))),m=t-W0.end;W0.convM=cm;
 if(m<cm){W0.conv=m<cm*.25?'перестройка':'рост гражданских отраслей';S.gdp*=m<cm*.25?.9985:1.0015}else W0.conv='завершена';
 if(E.pg-S.gdp<=E.pg*.005&&frac>=.98&&!W0.reached){W0.reached=true;W0.reachedT=t;log(`✅ ВВП и инфраструктура достигли довоенной траектории; восстановительный режим ещё сохраняется для закрепления роста (затраты ≈ ${fmt(W0.spent)} млн).`)}
}
function econWarTick(){
 const E=S.econ,t=S.year*12+S.month,ws=warsAll(),atWar=ws.length>0;
 const nat=E.last>0?S.gdp/E.last-1:0;   // собственный рост ВВП за этот месяц (до военных поправок)
 // Экономика противника: игровая оценка, привязанная к ходу войны.
 // Индексы начинаются со 100; это не реальные статистические данные стран.
 ws.forEach(w=>{
  if(w.mp)return;
  if(!w.enemyEcon) w.enemyEcon={gdp:100,fx:100,damage:0,months:0};
  const q=w.enemyEcon,progress=clamp((+w.p||0)/100,0,1);
  const enc=clamp(+w.encirclement||0,0,5);
  const gdpDrop=Math.min(.018,.0025+.006*progress+.001*enc);
  const fxRise=Math.min(.035,.003+.009*progress+.002*enc);
  q.gdp=Math.max(20,q.gdp*(1-gdpDrop));
  q.fx=Math.min(500,q.fx*(1+fxRise));
  q.damage=100-q.gdp;
  q.months=(q.months||0)+1;if(w.eco)syncEnemyEcon(w);
 });
 if(atWar&&(!E.war0||E.war0.over)){
  const prevReg=E.war0&&!E.war0.done?E.war0.reg:null,reg={};
  (S.regions||[]).forEach(r=>{const p=prevReg&&prevReg[r.name];reg[r.name]={i:Math.max(r.infra,p?p.i:0),n:Math.max(r.industry,p?p.n:0)}});
  E.war0={t,gdp:S.gdp,infra:avgReg('infra'),ind:avgReg('industry'),emp:S.employment,infl:S.inflation,rate:S.fx.rate,pop:S.pop,army:S.army,tax:S.tax,sold:S.warSold||0,civ:S.warCiv||0,reg};
  E.loss0=E.loss;E.tax0=E.tax;E.peak=0;
  log('📉 Начат учёт экономических потерь войны (вкладка «Графики» → «Война и экономика»).');
 }
 if(!atWar&&E.war0&&!E.war0.over){E.war0.over=true;E.war0.end=t;E.war0.endGdp=S.gdp;E.war0.endRate=S.fx.rate;
  S.fx.base*=1+Math.max(0,S.fx.rate/S.fx.base-1)*.5;
  log(`📊 Война окончена. ВВП ниже довоенной траектории на ${E.lossPct.toFixed(1)}%, накопленные потери выпуска ≈ ${fmt(E.loss-(E.loss0||0))} млрд.`)}
 const W0=E.war0;
 if(W0&&W0.over&&!W0.done&&t-W0.end>180){W0.done=true;W0.doneT=t}   // страховка: восстановление не длится дольше 15 лет
 const post=!!(W0&&W0.over&&!W0.done);
 if(!atWar&&!post&&E.last>0){const g=S.gdp/E.last-1;if(okn(g))E.tr=clamp(E.tr*.85+g*.15,-.004,.012)}
 let drag=0;
 if(atWar){
  ws.forEach(w=>{drag+=.003+.004*(1-clamp(w.p,0,100)/100)+.001*(w.encirclement||0)});
  drag+=.004*Math.max(0,S.army/Math.max(1,S.pop)*100-.8);
  if(S.energy<30)drag+=.001;if(S.fuel<25)drag+=.001;
  drag=Math.min(.022,drag);
  S.gdp=Math.max(100,S.gdp*(1-drag));E.wm=(E.wm||0)+1;
 }else if(post){
  // Восстановительный цикл постепенно возвращает тренд роста: военный шок не должен
  // навсегда переносить отрицательную динамику в мирный период.
  E.tr=clamp(E.tr*.70+Math.max(0,nat)*.30+.004,-.004,.012);
  recoverTick(E,W0,t)
 }
 E.drag=drag;
 if(atWar||post)E.pg=Math.max(S.gdp,E.pg*(1+(post&&!atWar?Math.min(E.tr,Math.max(0,nat)):E.tr)));else E.pg=S.gdp;   // разрыв с довоенной траекторией НЕ стирается сам
 const gap=Math.max(0,E.pg-S.gdp);
 E.gap=gap;E.lossPct=E.pg>0?gap/E.pg*100:0;E.peak=Math.max(E.peak||0,E.lossPct);
 E.loss+=gap/12;E.tax+=gap*S.tax/100/12*1.12;E.last=S.gdp;
}
/* --- курс национальной валюты --- */
function fxStress(){
 const g=Math.max(1,S.gdp),E=S.econ,ws=warsAll();let x=0;
 x+=.020*Math.max(0,S.inflation-6);
 x+=.008*Math.max(0,60-(S.trust==null?70:S.trust));
 x+=.5*Math.max(0,S.debt/g-.15);
 if(S.money<500)x+=.08;
 x+=.006*Math.max(0,50-S.stability);
 x+=.002*Math.max(0,S.threat-40);
 /* война: сразу сильный нажим на курс, даже когда мы побеждаем; чем дольше война и чем хуже на фронте — тем сильнее */
 ws.forEach(w=>{x+=.16+.16*(1-clamp(w.p,0,100)/100)+.025*(w.encirclement||0)});
 if(ws.length)x+=.003*Math.min(30,E.wm||0);
 x+=.030*Math.max(0,E.lossPct||0);   // потеря ВВП против довоенной траектории
 x+=3*Math.max(0,E.drag||0);          // ВВП падает прямо сейчас → валюта слабеет
 /* ВВП в любое время (в т.ч. в мирное): падение за месяц, провал против недавнего уровня, рост — укрепляет */
 const F=S.fx;
 if(F&&F.gdpPrev>0){
  const dg=g/F.gdpPrev-1,ref=F.gdpRef>0?F.gdpRef:g;
  x+=3*Math.max(0,-dg-(E.drag||0));                         // мирное падение ВВП за месяц
  if(!(E.lossPct>.01))x+=.8*Math.max(0,ref/g-1);            // ВВП ниже собственного недавнего уровня
  x-=1.5*Math.max(0,dg);                                    // рост ВВП поддерживает валюту
 }
 x+=Math.min(.05,Object.keys(S.restr||{}).length*.01);
 x-=.003*Math.max(0,S.stability-70)+.002*Math.max(0,(S.trust==null?70:S.trust)-75);
 return clamp(x,-.12,1.6,1.6);
}
function fxPolicyEnsure(){const F=S.fx;if(!F)return;if(!['free','managed','peg'].includes(F.policy))F.policy='managed';F.fxReserves=Math.max(0,Number(F.fxReserves)||0);F.fxTarget=Number(F.fxTarget)>0?F.fxTarget:F.base0;F.fxInterventions=Math.max(0,Number(F.fxInterventions)||0)}
function fxPolicyStep(raw){
 const F=S.fx;fxPolicyEnsure();let r=raw,dev=r/F.fxTarget-1;
 if(F.policy==='managed'){
  if(Math.abs(dev)>.12&&F.fxReserves>=120){r*=1-clamp(dev-Math.sign(dev)*.12,-.08,.08)*.22;F.fxReserves-=120;F.fxInterventions++}
  r=Math.max(F.rate*.965,Math.min(F.rate*1.035,r));
 }else if(F.policy==='peg'){
  if(Math.abs(dev)>.025&&F.fxReserves>=260){r=F.fxTarget*(1+Math.sign(dev)*.025*.65);F.fxReserves-=260;F.fxInterventions++}
  else if(Math.abs(dev)>.025){S.trust=clamp((S.trust??70)-.8);S.inflation=clamp((S.inflation||0)+.18,0,100);r=F.rate*(1+clamp(r/F.rate-1,-.06,.06)*.65)}
  r=Math.max(F.rate*.99,Math.min(F.rate*1.01,r));
 }
 return r;
}
function fxTick(){
 fxEnsure();econWarTick();const F=S.fx,prev=F.rate,t=S.year*12+S.month;fxPolicyEnsure();
 const nw=warsAll().length;if(F.nw==null)F.nw=nw;
 if(nw>F.nw){F.rate*=1.05;F.base*=1.03;log(`💱 Начало войны: рынки в панике, курс ${F.cur} резко ослаб.`)}
 F.nw=nw;let r=F.rate+(F.base*Math.exp(fxStress())-F.rate)*(nw?.30:.16);
 r*=Math.exp(rnd(-.006,.006)*(1+(nw?1.2:0)));r=Math.max(F.base0*.5,r);r=fxPolicyStep(r);
 F.rate=r;F.mom=(r/prev-1)*100;if(Math.abs(r/F.base0-1)>.02)F.moved=1;
 F.gdpRef=(F.gdpRef>0?F.gdpRef:S.gdp);F.gdpRef+=(S.gdp-F.gdpRef)*.08;F.gdpPrev=S.gdp;   /* память о ВВП для fxStress */
 if(F.mom>2)S.inflation=clamp(S.inflation+Math.min(.8,(F.mom-2)*.08),0,100);
 if(F.mom>8&&t-F.lastAlert>=3){F.lastAlert=t;log(`💱 Валютный кризис: 1 ${F.ref} подорожал на ${F.mom.toFixed(1)}% за месяц (теперь ${nf(r)} ${F.cur}).`);say('Курс валюты рушится — цены пересматривают каждый день','💸')}
}
window.fxShock=fxShock;
function fxStat(){try{fxEnsure();const F=S.fx;return[['💱',`1 ${F.ref}`,nf(F.rate,F.rate<10?2:F.rate<100?1:0)+' '+F.cur]]}catch(e){return[]}}
/* --- форматирование --- */
function nf(v,d,u){
 if(!okn(v))return '—';const a=Math.abs(v);
 if(d!=null)return v.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
 if(!u&&a>=1e9)return (v/1e9).toFixed(2)+' млрд';
 if(!u&&a>=1e6)return (v/1e6).toFixed(2)+' млн';
 if(a>=1000)return Math.round(v).toLocaleString('ru-RU');
 if(a>=100)return v.toFixed(1);if(a>=10)return v.toFixed(2);return v.toFixed(3).replace(/0$/,'');
}
const pct=(v,d=1)=>okn(v)?(v>=0?'+':'−')+Math.abs(v).toFixed(d)+'%':'—';
const mon=p=>`${months[p.month].slice(0,3)} ${p.year} г.`;
const TT=p=>p.t!=null?p.t:p.year*12+p.month;
/* --- состояние окна графиков --- */
const CHU={g:'why',p:'all',m:'auto',h:{},hov:{},reg:{}};
function chGroups(){
 const F=S.fx||{cur:'—',ref:'USD',refB:'EUR'},cur=F.cur,ref=F.ref,rb=F.refB;
 return[
 {id:'why',ic:'🔍',n:'Почему ВВП',charts:[],extra:'why'},
 {id:'econ',ic:'💹',n:'Экономика',charts:[
  {t:'ВВП, казна и долг',m:'idx',s:[{k:'gdp',n:'ВВП',c:'#69aef2',u:' млрд'},{k:'money',n:'Казна',c:'#55c58a',u:' млн'},{k:'debt',n:'Долг',c:'#ef6d72',u:' млн',bad:1}],note:'Режим «% от старта» показывает рост и падение всех линий в одном масштабе. Проведите пальцем по графику — появятся точные значения.'},
  {t:'Бюджет: доходы и расходы за месяц',m:'abs',s:[{k:'income',n:'Доходы',c:'#55c58a',u:' млн'},{k:'expense',n:'Расходы',c:'#ef6d72',u:' млн',bad:1}]}]},
 {id:'fx',ic:'💱',n:'Валюта',charts:[
  {t:`Курс: сколько ${cur} стоит 1 ${ref} и 1 ${rb}`,m:'abs',s:[{k:'fxA',n:`1 ${ref}`,c:'#f0bd58',u:' '+cur,d:2,bad:1},{k:'fxB',n:`1 ${rb}`,c:'#69aef2',u:' '+cur,d:2,bad:1}],note:'Выше линия — слабее национальная валюта. Красные зоны — время войны.'},
  {t:'Рост курса за месяц и инфляция',m:'abs',s:[{k:'fxMom',n:'Курс за месяц',c:'#f0bd58',u:'%',d:1,bad:1},{k:'inflation',n:'Инфляция',c:'#ef6d72',u:'%',d:1,bad:1}]}],extra:'fx'},
 {id:'war',ic:'⚔️',n:'Война и экономика',charts:[
  {t:'ВВП: факт и «если бы не было войны»',m:'abs',s:[{k:'pg',n:'Без войны',c:'#8aa0b6',u:' млрд',dash:1},{k:'gdp',n:'Факт',c:'#69aef2',u:' млрд'}],note:'Разрыв между линиями — потерянная экономика.'},
  {t:'Война: ВВП падает — курс растёт',m:'idx',win:'war',s:[{k:'gdp',n:'ВВП',c:'#69aef2'},{k:'fxA',n:`Курс ${ref}`,c:'#f0bd58',bad:1},{k:'income',n:'Доходы бюджета',c:'#55c58a'}],note:'Окно — с начала последней войны (за 3 месяца до неё).'},
  {t:'Потери экономики',m:'own',s:[{k:'lossPct',n:'Потеря ВВП, %',c:'#ef6d72',u:'%',d:1,bad:1},{k:'lossCum',n:'Накоплено потерь, млрд',c:'#f0bd58',u:' млрд',bad:1},{k:'civDead',n:'Мирные жертвы',c:'#a98be8',bad:1}]},
  {t:'Экономика врага: ВВП падает — валюта слабеет',m:'idx',win:'war',s:[{k:'eGdp',n:'ВВП врага',c:'#a98be8',u:'% от довоенного',d:1},{k:'eFx',n:'Курс валюты врага',c:'#f0bd58',d:2,bad:1}],note:'ВВП врага падает от удержания фронта, оккупации областей, окружения и наших ударов по инфраструктуре. Экономическое истощение ослабляет и его армию.'}],extra:'war'},
 {id:'pol',ic:'🏛',n:'Политика',charts:[
  {t:'Партия, одобрение, стабильность',m:'abs',s:[{k:'partySupport',n:'Партия',c:'#f0bd58',u:'%',d:1},{k:'approval',n:'Одобрение',c:'#69aef2',u:'%',d:1},{k:'stability',n:'Стабильность',c:'#55c58a',u:'%',d:1},{k:'legit',n:'Легитимность',c:'#a98be8',u:'%',d:1}]},
  {t:'Риск переворота',m:'abs',s:[{k:'coup',n:'Риск переворота',c:'#ef6d72',u:'%',d:1,bad:1}]}]},
 {id:'soc',ic:'👥',n:'Общество',charts:[
  {t:'Население и ресурсы',m:'idx',s:[{k:'pop',n:'Население',c:'#69aef2',u:''},{k:'food',n:'Еда',c:'#55c58a',u:'%',d:0},{k:'fuel',n:'Топливо',c:'#f0bd58',u:'%',d:0},{k:'energy',n:'Энергия',c:'#a98be8',u:'%',d:0}]},
  {t:'Цены и работа',m:'abs',s:[{k:'inflation',n:'Инфляция',c:'#ef6d72',u:'%',d:1,bad:1},{k:'employment',n:'Занятость',c:'#55c58a',u:'%',d:1},{k:'trust',n:'Доверие рынков',c:'#f0bd58',u:'%',d:0}]}]},
 {id:'mil',ic:'🎖',n:'Армия',charts:[
  {t:'Армия и угроза',m:'idx',s:[{k:'army',n:'Армия',c:'#f0bd58',u:''},{k:'threat',n:'Угроза',c:'#ef6d72',u:'%',d:0,bad:1},{k:'morale',n:'Боевой дух',c:'#55c58a',u:'%',d:0}]},
  {t:'Склады и потери',m:'own',s:[{k:'ammo',n:'Боеприпасы',c:'#f0bd58',u:'%',d:0},{k:'equip',n:'Вооружение',c:'#69aef2',u:'%',d:0},{k:'soldDead',n:'Погибло солдат',c:'#ef6d72',u:'',bad:1}]}]}
 ];
}
function chPts(ch){
 const h=S.history||[];if(!h.length)return[];
 const tn=TT(h[h.length-1]),P=CHU.p,E=S.econ;let from=-Infinity;
 if((ch.win==='war'||P==='war')&&E&&E.war0)from=E.war0.t-3;else if(P!=='all'&&P!=='war')from=tn-(+P);
 let a=h.filter(p=>TT(p)>=from);if(a.length<2)a=h.slice(-Math.max(2,Math.min(h.length,12)));return a;
}
function chLegend(id,ch,pts){
 return ch.s.map(z=>{
  const vs=pts.map(p=>okn(p[z.k])?+p[z.k]:null),a=vs.find(v=>v!=null),b=[...vs].reverse().find(v=>v!=null),off=CHU.h[id+':'+z.k];
  let dl='';if(okn(a)&&okn(b)&&a!==0){const d=(b/a-1)*100,good=z.bad?d<=0:d>=0;dl=`<small class="${Math.abs(d)<.05?'':good?'up':'dn'}">${d>=0?'▲':'▼'} ${Math.abs(d).toFixed(1)}%</small>`}
  return `<button class="chp${off?' off':''}" style="--c:${z.c}" onclick="chTog('${id}','${z.k}')"><i></i>${z.n}<b>${okn(b)?nf(b,z.d,z.u)+(z.u||''):'—'}</b>${dl}</button>`}).join('');
}
function chCard(ch,id){
 const pts=chPts(ch);CHU.reg[id]={ch:{...ch,id},pts};
 return `<section class="panel chcard"><h2>${ch.t}</h2><div class="chcv"><canvas id="cv_${id}"></canvas></div><div class="chleg">${chLegend(id,ch,pts)}</div>${ch.note?`<p class="chnote">${ch.note}</p>`:''}</section>`;
}
function kpi(l,v,sub,cls){return `<div class="kpi"><small>${l}</small><b class="${cls||''}">${v}</b><i class="${cls||''}">${sub||'&nbsp;'}</i></div>`}
function dlt(a,b,bad){if(!okn(a)||!okn(b)||!a)return['',''];const d=(b/a-1)*100;return[pct(d),(Math.abs(d)<.05?'':(bad?d<=0:d>=0)?'up':'dn')]}
function chKpis(gid){
 const h=S.history||[],L=h[h.length-1]||{},F0=h[0]||{},E=S.econ||{},F=S.fx||{};
 const y=h.length>12?h[h.length-13]:F0;let k=[];
 if(gid==='econ'||gid==='why'){
  let d=dlt(y.gdp,L.gdp);k=[kpi('ВВП',fmt(S.gdp)+' млрд','за год '+d[0],d[1]),kpi('Казна',fmt(S.money)+' млн'),kpi('Долг',fmt(S.debt)+' млн'),(()=>{const b=(S.lastInc||0)-(S.lastExp||0);return kpi('Баланс за месяц',(b>=0?'+':'−')+fmt(Math.abs(b))+' млн','',b>=0?'up':'dn')})()];
 }else if(gid==='fx'){
  const m=fxMarket(),d=dlt(F.base0,F.rate,1);
  k=[kpi(`1 ${F.ref}`,nf(F.rate,F.rate<10?2:F.rate<100?1:0)+' '+F.cur,'с начала '+d[0],d[1]),kpi('За месяц',pct(F.mom),'',F.mom>0?'dn':'up'),
     kpi('Рынок (реальный)',m?nf(m,m<10?2:m<100?1:0)+' '+F.cur:'вымышленная валюта',m?'на старте игры':''),kpi('Инфляция',S.inflation.toFixed(1)+'%')];
 }else if(gid==='war'){
  const w0=E.war0,dead=(S.warSold||0)+(S.warCiv||0);
  const r=w0?dlt(w0.rate,F.rate,1):['',''];
  k=[kpi('Потеря ВВП',(E.lossPct||0).toFixed(1)+'%','пик '+(E.peak||0).toFixed(1)+'%',(E.lossPct||0)>.5?'dn':''),kpi('Потери выпуска',fmt((E.loss||0)-(E.loss0||0))+' млрд','за войну'),
     kpi(`Курс ${F.ref}`,nf(F.rate,F.rate<10?2:F.rate<100?1:0),w0?'с войны '+r[0]:'',r[1]),kpi('Погибших',fmt(dead),'солдат и мирных')];
  if(E.eLast){const e=E.eLast;k.push(kpi('ВВП врага','−'+e.loss.toFixed(1)+'%',e.n,e.loss>.5?'up':''),kpi('Валюта врага',nf(e.r,e.r<10?2:e.r<100?1:0)+' '+e.cur,'1 '+e.ref+' · '+pct((e.r/e.r0-1)*100,0)))}
 }else{
  const g=chGroups().find(z=>z.id===gid),s=(g&&g.charts&&g.charts[0]&&g.charts[0].s||[]).slice(0,4);
  k=s.map(z=>{const a=okn(F0[z.k])?F0[z.k]:null,b=okn(L[z.k])?L[z.k]:null,d=dlt(a,b,z.bad);return kpi(z.n,okn(b)?nf(b,z.d,z.u)+(z.u||''):'—','с начала '+d[0],d[1])});
 }
 return `<div class="kpis">${k.join('')}</div>`;
}
function fxRate(v){return v>=1000?fmt(v):v>=100?v.toFixed(1):v>=10?v.toFixed(2):v.toFixed(4)}
function chFxExtra(){
 const F=S.fx,st=FXD.status(),codes=[...FXD.KEY];if(F.cur!=='NVT'&&!codes.includes(F.cur))codes.unshift(F.cur);
 if(!F.start)F.start=fxSnapAll();
 const rows=codes.map(c=>{const g=FXD.get(c);if(!g)return'';
  let v0=F.start[c],v1=g.v;
  if(c===F.cur&&F.ref==='USD'&&F.cur!=='NVT'&&okn(F.base0)&&F.base0>0){v0=F.base0;v1=F.rate} /* своя валюта — по игровому курсу */
  const ix=(window.NationsAI&&c!==F.cur&&c!=='USD'&&c!=='NVT')?NationsAI.fxIndex(S,c):null,ux=window.NationsAI?NationsAI.fxIndex(S,'USD'):null;
  if(ix){const k=ix/(ux||100);v0=g.v;v1=g.v*k} /* валюты других стран: игровой курс по их войнам и экономике */
  let ch=okn(v0)&&v0>0?(v1/v0-1)*100:null;if(ch!=null&&Math.abs(ch)<.005)ch=0;const cls=ch==null||Math.abs(ch)<.005?'':ch>0?'dn':'up';
  return `<tr class="${c===F.cur?'me':''}"><td><b>${c}</b> <span class="muted">${FXD.name(c)}</span></td><td class="r">${fxRate(v1)}${g.src==='approx'&&!ix?' ≈':''}</td><td class="r ${cls}">${ch==null?'—':pct(ch,2)}</td></tr>`}).join('');
 const m=fxMarket();
 return card('🌍 Реальные курсы валют мира',`<p class="chnote">${st.txt}</p>${m?`<p>Ваша валюта <b>${F.cur}</b>: рынок — 1 ${F.ref} = <b>${fxRate(m)}</b>, в игре сейчас — <b>${fxRate(F.rate)}</b> (${pct((F.rate/m-1)*100)}).</p>`:'<p class="muted">Новария — вымышленное государство, её валюта (талер) в реальном мире не торгуется; реальные курсы ниже даны для сравнения.</p>'}<div style="overflow:auto"><table class="fxt"><tr><th>Валюта</th><th style="text-align:right">за 1 USD</th><th style="text-align:right">с начала партии</th></tr>${rows}</table></div><p class="chnote">Рост числа = валюта подешевела к USD (красным), падение = подорожала (зелёным). Для вашей валюты изменение считается по игровому курсу. ≈ — приблизительное значение (нет в снимке рынка); при подключении к интернету курсы обновляются автоматически.</p><button onclick="fxRefresh()">🔄 Обновить курсы</button>`)+(window.NationsAI?NationsAI.econPanel(S):'');
}
function chRecCard(){
 const E=S.econ||{},w=E.war0;if(!w||!w.over)return'';
 const t=S.year*12+S.month,pgap=E.pg>0?Math.max(0,(E.pg-S.gdp)/E.pg*100):0;
 if(w.done)return card('🏗 Послевоенное восстановление',`<p>✅ Завершено за <b>${w.doneT-w.end}</b> мес. Затраты ≈ <b>${fmt(w.spent||0)} млн</b>.</p>`);
 const fr=Math.round((w.frac==null?0:w.frac)*100);
 return card('🏗 Послевоенное восстановление',`<div class="kpis"><div class="kpi"><small>Инфраструктура и заводы</small><b class="${fr<90?'dn':'up'}">${fr}%</b><i>от довоенного уровня</i></div><div class="kpi"><small>Разрыв ВВП</small><b class="${pgap>1?'dn':'up'}">−${pgap.toFixed(1)}%</b><i>до довоенной траектории</i></div><div class="kpi"><small>Конверсия</small><b>${w.conv||'—'}</b><i>${t-w.end} из ${w.convM||'?'} мес.</i></div><div class="kpi"><small>Потрачено на ремонт</small><b>${fmt(w.spent||0)}</b><i>млн</i></div></div><p class="chnote">Разрушенное не восстанавливается за пару лет: области отстраиваются постепенно (быстрее при стабильности, доверии и деньгах в казне), а ВВП не может обогнать инфраструктуру. Военная экономика постепенно переводится на гражданскую.</p>`);
}
function chWarExtra(){
 const E=S.econ||{},w=E.war0,F=S.fx;
 if(!w)return card('📊 Итоги экономики войны','<p class="muted">Войны ещё не было. Как только начнётся война, здесь появятся потери ВВП, курс валюты, разрушения и расходы.</p>');
 const now=S.year*12+S.month,dur=(w.over?w.end:now)-w.t;
 const row=(n,a,b,bad,f)=>{f=f||fmt;const d=a?(b/a-1)*100:0,good=bad?d<=0:d>=0;return `<tr><td>${n}</td><td class="r">${f(a)}</td><td class="r">${f(b)}</td><td class="r ${Math.abs(d)<.05?'':good?'up':'dn'}">${a?pct(d):''}</td></tr>`};
 const f1=v=>v.toFixed(1);
 return card('📊 Итоги экономики войны',`<p class="chnote">${w.over?'Война окончена':'⚔ Война идёт'} · длительность ${dur} мес.</p><div style="overflow:auto"><table class="fxt"><tr><th></th><th style="text-align:right">До войны</th><th style="text-align:right">Сейчас</th><th style="text-align:right">Δ</th></tr>
 ${row('ВВП, млрд',w.gdp,S.gdp)}${row(`Курс 1 ${F.ref}, ${F.cur}`,w.rate,F.rate,1,v=>nf(v,v<10?2:v<100?1:0))}${row('Инфляция, %',w.infl,S.inflation,1,f1)}${row('Занятость, %',w.emp,S.employment,0,f1)}
 ${row('Инфраструктура (ср.)',w.infra,avgReg('infra'),0,f1)}${row('Промышленность (ср.)',w.ind,avgReg('industry'),0,f1)}${row('Армия',w.army,S.army)}${row('Население',w.pop,S.pop)}</table></div>
 ${E.eLast?`<p>Враг (<b>${E.eLast.n}</b>): ВВП −<b>${E.eLast.loss.toFixed(1)}%</b> от довоенного, накопленные потери ≈ <b>${fmt(E.eLast.cum)} млрд $</b>, курс 1 ${E.eLast.ref} вырос с ${nf(E.eLast.r0,E.eLast.r0<10?2:E.eLast.r0<100?1:0)} до <b>${nf(E.eLast.r,E.eLast.r<10?2:E.eLast.r<100?1:0)}</b> ${E.eLast.cur}.</p>`:''}
 <p>Потеря выпуска за войну: <b>${fmt((E.loss||0)-(E.loss0||0))} млрд</b> · недополученные налоги: <b>${fmt((E.tax||0)-(E.tax0||0))} млн</b> · погибло: <b>${fmt((S.warSold||0)-(w.sold||0))}</b> солдат и <b>${fmt((S.warCiv||0)-(w.civ||0))}</b> мирных.</p>
 ${E.hitN?`<p>💔 Удары врага по нашей экономике: попаданий <b>${E.hitN}</b>, ВВП снижен на <b>${E.hitPct.toFixed(2)}%</b> (≈ <b>${fmt(E.hitCut)} млрд</b>), потрачено на ремонт <b>${fmt(E.hitMoney||0)} млн</b>. Каждое попадание также ослабляет нашу валюту.</p>`:''}
 <h3>🎯 Воздействие на экономику противника</h3>
 <p class="chnote">Модельная оценка симуляции: индекс до войны = 100. Это игровой расчёт, а не официальная статистика ВВП.</p>
 <div style="overflow:auto"><table class="fxt"><tr><th>Противник</th><th class="r">ВВП, индекс</th><th class="r">Потеря ВВП</th><th class="r">Рост курса</th></tr>
 ${(S.wars||[]).map(x=>{const q=x.enemyEcon||{gdp:100,fx:100,damage:0,hitGdp:0,hitFx:0,hitMoney:0,hits:0};return `<tr><td>${x.n}</td><td class="r">${q.gdp.toFixed(1)}</td><td class="r dn">−${q.damage.toFixed(1)}%</td><td class="r dn">+${(q.fx-100).toFixed(1)}%</td></tr>`}).join('')||'<tr><td colspan="4">Нет активных войн</td></tr>'}</table></div>
 <h3>📊 Накопленный эффект наших попаданий</h3>
 <div style="overflow:auto"><table class="fxt"><tr><th>Противник</th><th class="r">Успешных ударов</th><th class="r">Оценка ущерба ВВП</th><th class="r">Давление на валюту</th><th class="r">Ущерб, млрд усл. валюты</th></tr>
 ${(S.wars||[]).map(x=>{const q=x.enemyEcon||{};return `<tr><td>${x.n}</td><td class="r">${q.hits||0}</td><td class="r dn">−${(q.hitGdp||0).toFixed(2)} п.п.</td><td class="r dn">+${(q.hitFx||0).toFixed(2)} п.п.</td><td class="r">${(q.hitMoney||0).toFixed(1)}</td></tr>`}).join('')||'<tr><td colspan="5">Нет активных войн</td></tr>'}</table></div>
 <h3>🛡 Противовоздушная оборона</h3>
 <p>Построено позиций ПВО: <b>${bcount('aabat')}</b> · комплексов ПВО в арсенале: <b>${S.aa||0}</b> · укреплённость обороны: <b>${Math.min(88,Math.round((S.aa||0)*9+bcount('aabat')*12))}%</b> (модельная оценка перехвата воздушного удара).</p>
 <p class="chnote">Ущерб от попаданий — условные игровые индексы. Он не является реальной оценкой экономики страны.</p>`);
}
function chartsHtml(){
 fxEnsure();CHU.reg={};CHU.hov={};
 const gs=chGroups();if(!gs.some(g=>g.id===CHU.g))CHU.g='econ';
 const g=gs.find(z=>z.id===CHU.g),E=S.econ||{},hasWar=!!E.war0;
 if(CHU.p==='war'&&!hasWar)CHU.p='all';
 const per=[['12','12 мес.'],['36','3 года'],['60','5 лет'],['all','Всё']].concat(hasWar?[['war','⚔ С войны']]:[]);
 const mod=[['auto','Авто'],['idx','% от старта'],['own','Свой масштаб'],['abs','Значения']];
 const seg=(arr,k)=>`<div class="seg">${arr.map(a=>`<button class="${CHU[k]===a[0]?'on':''}" onclick="chSet('${k}','${a[0]}')">${a[1]}</button>`).join('')}</div>`;
 const n=(S.history||[]).length;
 return `<div id="chroot" class="chroot"><div class="chtabs">${gs.map(z=>`<button class="${z.id===CHU.g?'on':''}" onclick="chSet('g','${z.id}')">${z.ic} ${z.n}</button>`).join('')}</div>
 <div class="chbar">${seg(per,'p')}${seg(mod,'m')}</div><p class="chnote" style="margin:0 0 8px">С начала партии: ${n} мес.${n<2?' Графики появятся после нескольких месяцев игры.':''}</p>
 ${chKpis(g.id)}<div class="grid">${g.charts.map((c,i)=>chCard(c,g.id+i)).join('')}</div>${g.extra==='fx'?chFxExtra():''}${g.extra==='war'?chWarExtra()+chRecCard():''}${g.extra==='why'?chWhyExtra():''}</div>`;
}

/* ГРАФИК «ПОЧЕМУ ВВП»: красное — убирать и исправлять, зелёное — поднимать и держать */
function chWhyBars(items,max){
 return items.map(i=>{const w=Math.max(2,Math.round(Math.abs(i.v)/max*100)),neg=i.v<0,hint=neg?(EconCore.hintFor(i.label)||''):'';
  return`<div style="margin:9px 0"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span>${i.label}</span><b style="color:var(${neg?'--red':'--green'},${neg?'#ef6d72':'#55c58a'})">${i.v>0?'+':'−'}${Math.abs(i.v).toFixed(2)}%</b></div>
  <div style="height:9px;border-radius:6px;background:rgba(255,255,255,.07);margin-top:4px"><div style="width:${w}%;height:100%;border-radius:6px;background:${neg?'#ef6d72':'#55c58a'}"></div></div>${hint?`<div class="muted" style="font-size:12px;margin-top:3px">→ ${hint}</div>`:''}</div>`}).join('')
}
function chWhyExtra(){
 let D;try{D=EconCore.chartData(S,12)}catch(e){D=null}
 if(!D||!D.last)return`<section class="panel"><h3>🔍 Почему ВВП растёт или падает</h3><p class="muted">График появится после первого прошедшего месяца. Нажмите «+ 1 месяц» или «Играть».</p></section>`;
 const L=D.last,neg=L.items.filter(i=>i.v<0),pos=L.items.filter(i=>i.v>0),max=Math.max(.05,...L.items.map(i=>Math.abs(i.v)),...D.avg.map(i=>Math.abs(i.v)));
 const head=`<section class="panel"><h3>${L.g<0?'📉':'📈'} Итог последнего месяца: ${L.g>0?'+':'−'}${Math.abs(L.g).toFixed(2)}%</h3><p class="muted" style="margin:0">Красное тянет ВВП вниз — это надо убирать. Зелёное тянет вверх — это надо поднимать и держать. Длиннее полоска — сильнее влияние.</p></section>`;
 const bad=`<section class="panel"><h3 style="color:#ef6d72">🔴 Что тянет вниз (убирать / исправлять)</h3>${neg.length?chWhyBars(neg,max):'<p class="muted">Ничего заметного — отлично.</p>'}</section>`;
 const good=`<section class="panel"><h3 style="color:#55c58a">🟢 Что тянет вверх (поднимать / держать)</h3>${pos.length?chWhyBars(pos,max):'<p class="muted">Плюсов почти нет — вкладывайтесь в промышленность и инфраструктуру.</p>'}</section>`;
 const av=D.avg.filter(a=>Math.abs(a.v)>=.005),avBlock=D.n>=3?`<section class="panel"><h3>📊 Постоянные причины (в среднем за ${D.n} мес.)</h3><p class="muted" style="margin:0 0 4px">Случайные скачки здесь сглажены: видно, что давит всегда.</p>${chWhyBars(av.slice(0,8),max)}</section>`:'';
 const sMax=Math.max(.2,...D.series.map(v=>Math.abs(v))),cols=D.series.map(v=>`<div title="${v.toFixed(2)}%" style="flex:1;display:flex;flex-direction:column;justify-content:center;height:100%"><div style="height:${Math.max(2,Math.abs(v)/sMax*45)}px;background:${v<0?'#ef6d72':'#55c58a'};align-self:stretch;${v<0?'margin-top:50%':'margin-bottom:50%;margin-top:auto'};border-radius:2px"></div></div>`).join('');
 const hist=D.n>=2?`<section class="panel"><h3>📅 Рост ВВП по месяцам</h3><div style="display:flex;gap:3px;height:100px;align-items:stretch;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12)">${cols}</div><p class="muted" style="margin:6px 0 0;font-size:12px">Каждый столбик — месяц. Зелёный вверх — рост, красный вниз — падение.</p></section>`:'';
 return head+bad+good+avBlock+hist;
}
window.chSet=(k,v)=>{CHU[k]=v;render()};
window.chTog=(id,k)=>{const key=id+':'+k;CHU.h[key]=!CHU.h[key];render()};
window.chGo=g=>{CHU.g=g;tab='charts';render()};
window.fxRefresh=()=>{toast('Обновляю курсы валют…');FXD.fetchLive(ok=>{fxRebase();toast(ok?'Курсы валют обновлены':'Нет связи — показан последний снимок рынка');render()},true)};
function chRng(a){a=a.filter(okn);if(!a.length)return[0,1];let lo=Math.min(...a),hi=Math.max(...a);if(lo===hi){const p=Math.abs(lo)*.05||1;lo-=p;hi+=p}const p=(hi-lo)*.07;return[lo-p,hi+p]}
function chDraw(id){
 const R=CHU.reg[id],cv=document.getElementById('cv_'+id);if(!R||!cv)return;
 const ch=R.ch,pts=R.pts,d=window.devicePixelRatio||1,rc=cv.getBoundingClientRect();
 cv.width=Math.max(300,Math.round(rc.width*d));cv.height=Math.max(200,Math.round(rc.height*d));
 const x=cv.getContext('2d'),w=cv.width,h=cv.height,n=pts.length,txt='#a9bacb';
 x.clearRect(0,0,w,h);x.font=`${11*d}px system-ui,sans-serif`;
 if(n<2){x.fillStyle=txt;x.fillText('График появится после нескольких месяцев игры',14*d,h/2);return}
 const ser=ch.s.filter(z=>!CHU.h[id+':'+z.k]&&pts.some(p=>okn(p[z.k])));
 if(!ser.length){x.fillStyle=txt;x.fillText(ch.s.every(z=>CHU.h[id+':'+z.k])?'Все линии скрыты — включите их ниже':'Нет данных для этого графика пока что',14*d,h/2);return}
 let mode=CHU.m==='auto'?ch.m:CHU.m,fell=false;
 const V=ser.map(z=>pts.map(p=>okn(p[z.k])?+p[z.k]:null));
 if(mode==='abs'&&ser.length>1){const mx=V.map(a=>Math.max(...a.filter(okn).map(Math.abs))),hi=Math.max(...mx),lo=Math.min(...mx.filter(v=>v>0));if(lo>0&&hi/lo>12){mode='own';fell=true}}
 const L=(mode==='own'?12:58)*d,Rr=12*d,T=16*d,B=28*d,pw=w-L-Rr,ph=h-T-B;
 let P=V,base=[],mm=[],g=null;
 if(mode==='idx'){base=V.map(a=>a.find(v=>okn(v)&&v!==0));P=V.map((a,i)=>a.map(v=>okn(v)&&base[i]?(v/base[i]-1)*100:null));g=chRng([].concat(...P,[0]))}
 else if(mode==='own')mm=V.map(a=>chRng(a));
 else g=chRng([].concat(...V));
 const X=i=>L+i/(n-1)*pw,Yf=f=>T+ph*(1-f);
 const fr=(i,v)=>mode==='own'?(v-mm[i][0])/(mm[i][1]-mm[i][0]):(v-g[0])/(g[1]-g[0]);
 /* зоны войны */
 x.fillStyle='rgba(239,109,114,.13)';let st=-1;
 for(let i=0;i<=n;i++){const wv=i<n&&pts[i].war;if(wv&&st<0)st=i;if(!wv&&st>=0){x.fillRect(X(st)-(st?0:0),T,Math.max(2*d,X(i-1)-X(st)),ph);x.fillStyle='#ef6d72';x.fillText('война',X(st)+4*d,T+11*d);x.fillStyle='rgba(239,109,114,.13)';st=-1}}
 /* сетка и подписи оси Y */
 x.strokeStyle='#27415c';x.lineWidth=d;x.fillStyle=txt;x.textAlign='right';
 for(let i=0;i<=4;i++){const y=T+ph*i/4;x.beginPath();x.moveTo(L,y);x.lineTo(w-Rr,y);x.stroke();
  if(mode!=='own'){const v=g[1]-(g[1]-g[0])*i/4,sp=g[1]-g[0];
   x.fillText(mode==='idx'?(v>=0?'+':'−')+Math.abs(v).toFixed(Math.abs(v)>=100?0:1)+'%':nf(v,sp<10?2:sp<100?1:0,'x'),L-6*d,y+4*d)}}
 x.textAlign='left';
 if(mode==='idx'&&g[0]<0&&g[1]>0){const y0=Yf((0-g[0])/(g[1]-g[0]));x.strokeStyle='#6f8aa6';x.setLineDash([5*d,4*d]);x.beginPath();x.moveTo(L,y0);x.lineTo(w-Rr,y0);x.stroke();x.setLineDash([])}
 /* подписи оси X */
 const tk=Math.max(2,Math.min(5,Math.floor(w/(110*d))));x.fillStyle=txt;
 for(let j=0;j<tk;j++){const i=Math.round(j/(tk-1)*(n-1)),s=mon(pts[i]),tw=x.measureText(s).width;let px=X(i)-tw/2;px=Math.max(L-10*d,Math.min(w-Rr-tw,px));x.fillText(s,px,h-8*d)}
 /* линии */
 ser.forEach((z,si)=>{
  x.strokeStyle=z.c;x.lineWidth=2.4*d;x.lineJoin='round';x.setLineDash(z.dash?[7*d,5*d]:[]);x.beginPath();let pen=false;
  P[si].forEach((v,i)=>{if(!okn(v)){pen=false;return}const px=X(i),py=Yf(fr(si,v));pen?x.lineTo(px,py):x.moveTo(px,py);pen=true});x.stroke();x.setLineDash([]);
  let li=-1;for(let i=n-1;i>=0;i--)if(okn(P[si][i])){li=i;break}
  if(li>=0){x.fillStyle=z.c;x.beginPath();x.arc(X(li),Yf(fr(si,P[si][li])),3.6*d,0,7);x.fill()}
 });
 if(fell){x.fillStyle=txt;x.textAlign='right';x.fillText('значения сильно отличаются — свой масштаб',w-Rr,T+11*d);x.textAlign='left'}
 /* подсказка при касании */
 const hi=CHU.hov[id];
 if(hi!=null&&hi>=0&&hi<n){
  const px=X(hi);x.strokeStyle='#cfe0f2';x.lineWidth=d;x.beginPath();x.moveTo(px,T);x.lineTo(px,T+ph);x.stroke();
  const lines=[];
  ser.forEach((z,si)=>{const v=V[si][hi];if(!okn(v))return;const py=Yf(fr(si,P[si][hi]));x.fillStyle=z.c;x.beginPath();x.arc(px,py,4.4*d,0,7);x.fill();x.strokeStyle='#0b1522';x.lineWidth=1.5*d;x.stroke();
   let extra='';if(base[si])extra=' ('+pct((v/base[si]-1)*100)+')';lines.push([z.c,`${z.n}: ${nf(v,z.d,z.u)}${z.u||''}${extra}`])});
  const head=mon(pts[hi])+(pts[hi].war?' · война':'');x.font=`${12*d}px system-ui,sans-serif`;
  let bw=x.measureText(head).width;lines.forEach(l=>{bw=Math.max(bw,x.measureText(l[1]).width+16*d)});bw+=16*d;
  const lh=17*d,bh=(lines.length+1)*lh+12*d;let bx=px+12*d;if(bx+bw>w-4*d)bx=px-12*d-bw;bx=Math.max(4*d,bx);const by=T+4*d;
  x.fillStyle='rgba(8,16,28,.94)';x.strokeStyle='#4a6a8c';x.lineWidth=d;x.beginPath();x.rect(bx,by,bw,bh);x.fill();x.stroke();
  x.fillStyle='#fff';x.font=`bold ${12*d}px system-ui,sans-serif`;x.fillText(head,bx+8*d,by+lh);x.font=`${12*d}px system-ui,sans-serif`;
  lines.forEach((l,i)=>{x.fillStyle=l[0];x.fillRect(bx+8*d,by+lh*(i+1)+6*d,8*d,8*d);x.fillStyle='#eaf3ff';x.fillText(l[1],bx+22*d,by+lh*(i+2)+3*d)});
 }
 R.geo={L:L/d,R:Rr/d};
}
function drawCharts(){
 if(!document.getElementById('chroot'))return;
 Object.keys(CHU.reg).forEach(id=>{
  chDraw(id);const cv=document.getElementById('cv_'+id);if(!cv)return;
  const mv=e=>{const R=CHU.reg[id];if(!R||!R.geo)return;const rc=cv.getBoundingClientRect(),cx=(e.touches?e.touches[0].clientX:e.clientX)-rc.left,n=R.pts.length;
   const i=Math.max(0,Math.min(n-1,Math.round((cx-R.geo.L)/Math.max(1,rc.width-R.geo.L-R.geo.R)*(n-1))));if(CHU.hov[id]!==i){CHU.hov[id]=i;chDraw(id)}};
  const clr=()=>{if(CHU.hov[id]!=null){delete CHU.hov[id];chDraw(id)}};
  cv.addEventListener('pointermove',mv);cv.addEventListener('pointerdown',mv);cv.addEventListener('pointerleave',clr);cv.addEventListener('pointercancel',clr);
  cv.addEventListener('pointerup',e=>{if(e.pointerType==='touch')setTimeout(clr,2200)});
 });
}
if(!window.__chResize){window.__chResize=1;window.addEventListener('resize',()=>{try{if(tab==='charts')drawCharts()}catch(e){}})}
function fxCard(){
 try{fxEnsure();const F=S.fx,m=fxMarket(),d=(F.rate/F.base0-1)*100;
  fxPolicyEnsure();const modeName={free:'Свободное плавание',managed:'Управляемое плавание',peg:'Валютный коридор'}[F.policy],dev=(F.rate/F.fxTarget-1)*100;
  return card('💱 Валюта и защита курса',`<p>1 ${F.ref} = <b>${fxRate(F.rate)} ${F.cur}</b> <span class="${d>0?'dn':'up'}">${pct(d)} с начала игры</span>${(S.wars||[]).length?' · <span class="dn">война давит на курс</span>':''}</p>${m?`<p class="muted">Реальный рынок: 1 ${F.ref} = ${fxRate(m)} ${F.cur}</p>`:''}
  <div class="cards"><div class="mini"><b>Режим курса</b><strong>${modeName}</strong><small>Отклонение от цели: ${pct(dev,2)}</small></div><div class="mini"><b>Золотовалютные резервы</b><strong>${fmt(F.fxReserves)} млн</strong><small>Интервенции оплачиваются из резервов</small></div><div class="mini"><b>Целевой курс</b><strong>${fxRate(F.fxTarget)} ${F.cur}</strong><small>Меняется при ручной настройке</small></div></div>
  <div class="actions"><button onclick="H.fxPolicy('free')">🌊 Свободный курс</button><button onclick="H.fxPolicy('managed')">⚖️ Управляемый курс</button><button onclick="H.fxPolicy('peg')">📌 Коридор ±2,5%</button><button class="primary" onclick="H.fxReserve()">🏦 Купить резервы · 500 млн</button><button onclick="H.fxTarget()">🎯 Зафиксировать текущий курс как цель</button></div>
  <p class="muted">Свободный курс лучше переносит кризисы, но сильнее колеблется. Управляемый сглаживает скачки. Коридор почти фиксирует курс, но быстро расходует резервы и при их нехватке теряет доверие.</p>
  <button onclick="chGo('fx')">📈 Графики валюты</button> <button onclick="chGo('war')">⚔️ Потери войны</button>`)}catch(e){return''}
}
/* курсы: онлайн-обновление при запуске */
try{if(window.FXD)FXD.fetchLive(ok=>{if(ok){fxRebase();if(tab==='charts'||tab==='finance')render(true)}})}catch(e){}

window.NG={
 showWarAttack(o){try{strikeScene({kind:'strike',k:o.k||'rocket',enemy:o.enemy,rev:!!o.rev,shots:[{regId:o.regId,down:!!o.down}],title:o.title||'⚔️ Удар на карте',sub:o.sub||o.region||''})}catch(e){console.warn('MP attack map',e)}},
 showWarAttackHistory(w,side,meId){try{const a=(w&&w.attacks||[]).filter(x=>side==='out'?x.from_id===meId:x.to_id===meId).slice(0,8);if(!a.length)return toast(side==='out'?'Наших ударов пока нет':'Ударов по нам пока нет');const first=a[0],incoming=side!=='out';strikeScene({kind:'strike',k:first.weapon||'rocket',enemy:incoming?first.from_country:first.to_country,rev:incoming,shots:a.map(x=>({regId:x.region_id,down:!!x.down})),title:incoming?'🛡 Карта ударов по нам':'🎯 Карта наших ударов',sub:a.map(x=>`${x.weapon} → ${x.region_name}${x.down?' · сбито':''}`).join(' · ')})}catch(e){console.warn('MP attack history',e)}},
 applyFactoryState(m){if(!m)return;S.milFactories=Array.isArray(m.factories)?m.factories:[];S.factoryBuilds=Array.isArray(m.builds)?m.builds:[];if(Number.isFinite(+m.money))S.money=+m.money;if(Number.isFinite(+m.steel))S.steel=+m.steel;if(Number.isFinite(+m.fuel))S.fuel=+m.fuel;if(Number.isFinite(+m.energy))S.energy=+m.energy;const ars=m.ars||{};Object.keys(ars).forEach(k=>{if(ARMS[k])S[k]=Number(ars[k])||0});save();render(true)},
 get S(){return S},
 syncMPTerritory(data){if(!data||!data.from||!data.region||!data.to)return;S.mpTerritories=S.mpTerritories||{};S.mpTerritories[data.from+'|'+data.region]=data.to;save();if(WMAP.node){WMAP.usig='';updateWorld()}render(true)},
 syncMPTerritories(data){if(!data||typeof data!=='object')return;S.mpTerritories={...(S.mpTerritories||{}),...data};save();if(WMAP.node){WMAP.usig='';updateWorld()}render(true)},
 begin(diff,name,ai){NG._bak=NG._bak||S;window.__NG_MP=1;pause();mpFresh(diff,name,ai);tab='overview';render()},
 end(){window.__NG_MP=0;pause();if(NG._bak){S=NG._bak;NG._bak=null}tab='overview';render()},
 load(o){NG._bak=NG._bak||S;window.__NG_MP=1;pause();S={...initial(),...o};ensure();tab='overview';render()},
 tick(){monthTick()},
 gainRegion(r){S.captured=S.captured||[];S.captured.push({name:r.name,from:r.from,pop:r.pop,full:!!r.full});S.regions.push({name:r.name,pop:r.pop,wealth:r.wealth||40,loyalty:30,unrest:40,industry:r.industry||36,infra:r.infra||34,resource:r.resource||'Захвачено',captured:true,from:r.from});S.pop+=r.pop;S.gdp+=r.gdp||0;ch({stability:-3,threat:5},false)},
 loseRegion(name,share){if(S.regions.length<=1)return;const i=S.regions.findIndex(x=>x.name===name);if(i<0)return;const r=S.regions[i];S.regions.splice(i,1);S.pop=Math.max(100000,S.pop-r.pop);S.gdp=Math.max(100,S.gdp*(1-(share||0)));S.captured=(S.captured||[]).filter(z=>z.name!==name);if(!r.captured){S.lost=S.lost||[];S.lost.push(name)}ch({approval:-6,stability:-4,legitimacy:-3},false)},
 render,stats,toast,log,say,clamp,fmt,ch,snap,pause,
 income,expenses,myPower,warPower,months,
 resIndex(){return Math.round(clamp((S.food+S.fuel+S.energy+S.steel)/4))},
 setTab(t){tab=t;render()},
 missionsHtml(){return missionCard()},
 getTab:()=>tab,
 countryInfo(name){try{const k=mpCountryKey(name);if(!k)return null;const w=WM[k],e=countryScale(w);
  const cur=window.FXD&&w.iso?FXD.cur(w.iso):'NVT',ref=cur==='USD'?'EUR':'USD',rate=cur==='NVT'?36:fxReal(cur)/fxReal(ref);
  return{key:k,iso:w.iso,cur,curName:window.FXD?FXD.name(cur):cur,ref,rate,gdp:Math.round(42000*e),pop:w.pop,flag:w.flag||''}}catch(err){return null}},
 sumHtml:{bar}
};

try{ensure()}catch(e){console.error('[Novaria] Ошибка подготовки состояния:',e)}
try{if(window.NationsAI)NationsAI.init(S)}catch(e){console.error('[Novaria] Не удалось запустить ИИ стран:',e);window.__NOVARIA_AI_INIT_ERROR=String(e&&e.message||e)}
render();})();
