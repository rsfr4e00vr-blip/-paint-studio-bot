(()=>{'use strict';
const $=s=>document.querySelector(s), clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v)), fmt=n=>Math.round(n).toLocaleString('ru-RU'), months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const initial=()=>({name:'Республика Новария',month:0,year:1,money:18000,debt:0,pop:8200000,gdp:42000,inflation:5,employment:94,stability:68,approval:61,legitimacy:70,food:78,fuel:65,steel:55,equipment:48,ammo:62,energy:72,tech:32,army:42000,navy:8,air:45,training:58,morale:65,threat:20,war:false,gov:'Парламентская республика',leader:'Александр Ветров',party:'Центристский союз',playerParty:'Центристский союз',campaignOver:false,difficulty:'normal',history:[],tax:20,health:12,education:12,defense:15,industry:50,election:24,coupRisk:12,grace:12,crisis:0,cd:{},regions:[{name:'Столица',pop:1200000,wealth:82,loyalty:76,unrest:10,industry:70,infra:88,resource:'Услуги'},{name:'Северный край',pop:1600000,wealth:55,loyalty:64,unrest:18,industry:48,infra:55,resource:'Лес'},{name:'Восточная область',pop:2100000,wealth:48,loyalty:57,unrest:24,industry:75,infra:49,resource:'Сталь'},{name:'Южная провинция',pop:1900000,wealth:51,loyalty:60,unrest:20,industry:42,infra:53,resource:'Зерно'},{name:'Западный округ',pop:1400000,wealth:62,loyalty:68,unrest:14,industry:58,infra:67,resource:'Энергия'}],parties:[{name:'Центристский союз',support:34,seats:38,ideology:'Центр'},{name:'Народная партия',support:25,seats:27,ideology:'Консерватизм'},{name:'Партия реформ',support:21,seats:22,ideology:'Либерализм'},{name:'Социальный альянс',support:20,seats:13,ideology:'Социал-демократия'}],relations:(window.WORLD?WORLD.list.map(c=>({name:c.name,value:c.value,power:c.power})):[{name:'Аркания',value:15,power:65},{name:'Белория',value:48,power:42},{name:'Тарвия',value:-20,power:80}]),log:['Правительство сформировано. Начинается управление государством.'],documents:[],events:[],laws:[],event:null});
let S;try{S={...initial(),...JSON.parse(localStorage.getItem('novariaSave')||'{}')}}catch{S=initial()}if(!Array.isArray(S.regions)||!Array.isArray(S.parties)||!Array.isArray(S.relations))S=initial();
if(!S.playerParty)S.playerParty=S.party||'Центристский союз';if(!S.difficulty)S.difficulty='normal';if(typeof S.campaignOver!=='boolean')S.campaignOver=false;if(!Array.isArray(S.history))S.history=[];if(!Array.isArray(S.log))S.log=[];if(!Array.isArray(S.documents))S.documents=[];if(!Array.isArray(S.laws))S.laws=[];if(!S.event)S.event=null;if(S.history.length===0){let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap())}
let tab='overview',timer=null,running=false,selectedDifficulty=S.difficulty;
const DIFFICULTIES={story:{label:'Сюжетная',income:1.3,expenses:.85,playerDrift:1.25,rivalPressure:.72,unrest:.7,approval:1.25,coup:.65},easy:{label:'Лёгкая',income:1.15,expenses:.93,playerDrift:1.1,rivalPressure:.88,unrest:.85,approval:1.1,coup:.85},normal:{label:'Нормальная',income:1,expenses:1,playerDrift:1,rivalPressure:1,unrest:1,approval:1,coup:1},hard:{label:'Сложная',income:.95,expenses:1.06,playerDrift:.9,rivalPressure:1.18,unrest:1.2,approval:.85,coup:1.2},expert:{label:'Эксперт',income:.86,expenses:1.14,playerDrift:.78,rivalPressure:1.42,unrest:1.45,approval:.72,coup:1.5}};
function difficulty(){return DIFFICULTIES[S.difficulty]||DIFFICULTIES.normal}
window.setDifficulty=v=>{selectedDifficulty=DIFFICULTIES[v]?v:'normal';toast('Для применения сложности начни новую кампанию')};
function save(){if(window.__NG_MP||window.__salv)return;try{localStorage.setItem('novariaSave',JSON.stringify(S))}catch(e){toast('Не удалось сохранить: память устройства заполнена')}}
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
function applyCountry(){const n=NEWC;NEWC=null;if(!n||n==='Новария')return;const w=WM[n];if(!w)return;
 const p=Math.max(.1,Math.min(1.15,w.power/100)),inc=[0,.35,.6,1,1.5,2.4][w.inc]||1,e=Math.max(.5,Math.min(2.5,Math.pow(Math.max(.05,w.pop*1e6/8.2e6*inc),.4)));
 S.name=n;S.me=n;S.deposits=null;S.pop=Math.round(w.pop*1e6);const k=S.pop/8.2e6;S.regions.forEach(r=>r.pop=Math.round(r.pop*k));
 S.gdp=Math.round(42000*e);S.money=Math.round(S.money*e);S.army=Math.max(500,Math.round(42000*p));S.air=Math.max(2,Math.round(45*p));S.navy=Math.max(1,Math.round(8*p));
 const rl=S.relations.find(r=>r.name===n);if(rl)rl.self=true;
 const C=GEO.c[w.iso];if(C&&C.regs.length>1){const top=[...C.regs].filter(r=>r.n).sort((a,b)=>b.s-a.s).slice(0,S.regions.length);top.forEach((r,i)=>{S.regions[i].name=r.n.replace(/ \(.*\)/,'');S.regions[i].geo=r.id;S.regions[i].resource=RLAB[(r.res||'f')[0]]||S.regions[i].resource})}}
function chList(){const q=CHS.q.trim().toLowerCase();let a=WORLD.list.slice();if(q)a=a.filter(c=>c.name.toLowerCase().includes(q));if(CHS.c!=='all')a=a.filter(c=>c.cont===CHS.c);return a.sort((x,y)=>y.power-x.power||y.pop-x.pop)}
function chRows(){const l=chList(),sh=l.slice(0,CHS.n);return (sh.map(c=>{const lv=c.power>=60?'🟢 сильная армия':c.power>=30?'🟡 средняя':'🔴 слабая армия';return `<div class="mini"><b>${c.name}</b> <span class="muted">${CONTN[c.cont]||''}</span><br>Население: ${c.pop>=1?c.pop.toFixed(c.pop>=10?0:1)+' млн':Math.round(c.pop*1000)+' тыс.'} · ${lv}<br>${resIcons(c.res)} <small class="muted">${c.trait}</small><div class="actions"><button class="primary" onclick="H.startAs('${c.name.replace(/'/g,"\\'")}')">Играть за ${c.name}</button></div></div>`}).join('')||'<p class="muted">Никого не найдено</p>')+(l.length>sh.length?`<div class="mini" style="display:flex;align-items:center;justify-content:center"><button onclick="H.chf('n',${CHS.n+30})">Показать ещё (${l.length-sh.length})</button></div>`:'')}
function hchooser(){let m=document.getElementById('chm');if(!m){m=document.createElement('div');m.id='chm';m.className='ccm';document.body.appendChild(m)}
 m.innerHTML=`<div class="ccbox"><button class="ccx" onclick="document.getElementById('chm').remove()">✕</button><h3>🌍 Выбор государства</h3><p class="muted">Выберите страну, за которую будете играть. Новая игра начнётся с нуля (текущий прогресс удалится). Чем слабее страна, тем сложнее.</p><div class="wlbar"><input type="search" placeholder="🔍 Поиск страны…" value="${CHS.q.replace(/"/g,'&quot;')}" oninput="H.chf('q',this.value)"><select onchange="H.chf('c',this.value)"><option value="all">Все части света</option>${Object.keys(CONTN).map(k=>`<option value="${k}" ${CHS.c===k?'selected':''}>${CONTN[k]}</option>`).join('')}</select></div><div class="mini" style="margin-bottom:8px"><b>Новария</b> <span class="muted">вымышленная</span><br>Стартовая страна игры.<div class="actions"><button onclick="H.startAs('Новария')">Играть за Новарию</button></div></div><div class="cards" id="chrows">${chRows()}</div></div>`}
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
  else if(window.WORLD_SEEDS&&WORLD_SEEDS[nm]){const R=(WORLD.REGS[nm]||[]);seeds=WORLD_SEEDS[nm].map(c=>{const r=R.find(x=>x.n===c.n);return {n:c.n,lon:c.lon,lat:c.lat,s:c.p,res:r?r.res:null}})}
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
  C.regs=cs.map((c,i)=>({id:iso+':'+i,n:names[i],s:sh[i],res:ress[i],d:cells[i].length>2?'M'+cells[i].map(f1).join('L')+'Z':'',cell:cells[i],cx:c[0],cy:c[1]}))});
 GEO.st='ready';try{geoMigrate()}catch(e){}}
/* v2: регионов стало больше и нумерация изменилась — старые отметки захвата и привязки сбрасываем, показ на карте перестраивается */
const GEOV=2;
function geoMigrate(){if(S.geoV===GEOV)return;S.geoV=GEOV;S.taken={};const w=S.me&&wi(S.me),C=w&&w.iso&&GEO.c[w.iso];S.regions.forEach(r=>{delete r.geo;if(C){const m=C.regs.find(x=>x.n&&x.n.replace(/ \(.*\)/,'')===r.name);if(m)r.geo=m.id}});try{save()}catch(e){}}

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
 if(!polys.length)polys=[].concat(...C.polys);
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;polys.forEach(rg=>{const b=rbox(rg);x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3])});
 const w=x1-x0,h=y1-y0,N=14,pts=[];let sx=0,sy=0;
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=x0+(i+.5)*w/N,y=y0+(j+.5)*h/N;if(inside(x,y,polys)){pts.push([x,y]);sx+=x;sy+=y}}
 let cx=(x0+x1)/2,cy=(y0+y1)/2;
 if(pts.length){cx=sx/pts.length;cy=sy/pts.length;if(!inside(cx,cy,polys)){let bd=1e18;pts.forEach(q=>{const d=(q[0]-cx)**2+(q[1]-cy)**2;if(d<bd){bd=d;sx=q[0];sy=q[1]}});cx=sx;cy=sy}}
 return r._k={polys,d:polys.map(ringD).join(''),x0,y0,x1,y1,w,h,cx,cy}}
function geoOf(el){const id=el&&el.getAttribute&&el.getAttribute('data-r');if(!id)return null;const i=id.lastIndexOf(':'),C=GEO.c[id.slice(0,i)];if(!C)return null;const r=C.regs[+id.slice(i+1)];return r&&r.id===id?regClip(C,r):null}
function regsOf(name){const W=wi(name);const C=GEO.c[W.iso];return C&&C.regs.length&&GEO.st==='ready'?C.regs:null}
/* --- раскраска --- */
const taken=()=>(S.taken=S.taken||{});
const MYC='#2f6fd0',VAS='#7fb0ee',isVas=n=>(S.puppets||[]).includes(n);
function regCount(n){const r=regsOf(n);return r?r.length:(WORLD.REGS[n]||WORLD.GEN).length}
/* сколько областей можно забрать: доля областей страны растёт вместе с перевесом на фронте (60%→0, 100%→60% областей) */
function quota(n,w){const tot=regCount(n),c=rel(n)||{},rg=regsOf(n),free=rg?rg.filter(x=>!taken()[x.id]).length:Math.max(0,tot-(c.regTaken||[]).length),p=w.won?100:w.p,share=Math.max(0,(p-60)/40);return{tot,free,p,q:Math.min(free,Math.max(1,Math.round(tot*share*.6),(w.occ||[]).length))}}
function baseCol(iso,i){let h=0;for(const ch of iso)h=(h*31+ch.charCodeAt(0))%360;return `hsl(${h},38%,${33+(i%4)*3}%)`}
function regFill(C,r,i){const nm=C.name,rc=nm&&S.relations.find(x=>x.name===nm);if(rc&&rc.self)return MYC;const aiOwner=S.aiWorld&&S.aiWorld.owners&&S.aiWorld.owners[nm];if(aiOwner&&WORLD.map[aiOwner])return baseCol(WORLD.map[aiOwner].iso||WORLD.map[aiOwner].name,1);if(taken()[r.id]||(rc&&rc.annexed))return MYC;if(rc&&isVas(nm))return VAS;return baseCol(C.iso,i)}
function updateWorld(){const svg=WMAP.node;if(!svg)return;const sig=JSON.stringify(S.captured||[])+'|'+Object.keys(taken()).length+'|'+S.relations.filter(r=>r.annexed).map(r=>r.name).join(',')+'|'+S.wars.map(w=>w.n+':'+(w.occ||[]).join('+')).join(',')+'|'+(S.me||'')+'|'+(S.puppets||[]).join(',')+'|'+JSON.stringify(S.aiWorld&&S.aiWorld.owners||{});if(WMAP.usig===sig)return;WMAP.usig=sig;
 if(!WMAP.el){WMAP.el={r:{},o:{}};svg.querySelectorAll('[data-r]').forEach(e=>WMAP.el.r[e.getAttribute('data-r')]=e);svg.querySelectorAll('[data-o]').forEach(e=>WMAP.el.o[e.getAttribute('data-o')]=e)}
 Object.values(GEO.c).forEach(C=>{C.regs.forEach((r,i)=>{const e=WMAP.el.r[r.id];if(e)e.setAttribute('fill',regFill(C,r,i))});const o=WMAP.el.o[C.iso];if(o){const w=C.name&&S.wars.some(x=>x.n===C.name);o.setAttribute('stroke',w?'#ff5c66':'#0b1218');o.setAttribute('stroke-width',w?'1.6':'.7');o.setAttribute('class',w?'warpulse':'')}});
 drawOcc(svg)}
function drawOcc(svg){
 const NS='http://www.w3.org/2000/svg',ids=[].concat(...S.wars.map(w=>w.occ||[]));
 let g=svg.querySelector('#occl');
 if(!g){const d=document.createElementNS(NS,'defs');d.innerHTML=`<pattern id="occhatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.4" height="2.4" fill="${MYC}" opacity=".22"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="${MYC}" stroke-width="1"/></pattern>`;svg.appendChild(d);g=document.createElementNS(NS,'g');g.id='occl';g.setAttribute('pointer-events','none');svg.appendChild(g)}
 g.replaceChildren();
 ids.forEach(id=>{const e=WMAP.el&&WMAP.el.r[id];if(!e)return;const p=document.createElementNS(NS,'path');const gg=geoOf(e);p.setAttribute('d',gg?gg.d:(e.getAttribute('d')||''));p.setAttribute('fill-rule','evenodd');p.setAttribute('fill','url(#occhatch)');p.setAttribute('stroke',MYC);p.setAttribute('stroke-width','.5');g.appendChild(p)})}
function buildWorldNode(){const cl=[],body=[];Object.values(GEO.c).forEach(C=>{cl.push(`<clipPath id="c-${C.iso}"><path d="${C.d}"/></clipPath>`);
 const inner=C.regs.some(r=>r.d)?C.regs.map((r,i)=>r.d?`<path data-r="${r.id}" data-c="${C.iso}" d="${r.d}" fill="${regFill(C,r,i)}" stroke="rgba(0,0,0,.38)" stroke-width=".35"/>`:'').join(''):`<path data-r="${C.iso}:0" data-c="${C.iso}" d="${C.d}" fill="#26323f"/>`;
 body.push(`<g ${C.regs.some(r=>r.d)?`clip-path="url(#c-${C.iso})"`:''}>${inner}</g><path data-o="${C.iso}" d="${C.d}" fill="none" stroke="#0b1218" stroke-width=".7" stroke-linejoin="round" style="pointer-events:none"/>`)});
 if(!WMAP.rs){WMAP.rs=1;window.addEventListener('resize',()=>{if(WMAP.node)wzApply()})}const n=document.createElement('div');n.className='wmnode';n.innerHTML=`<svg viewBox="0 0 ${GEO.W} ${GEO.H}" preserveAspectRatio="none" shape-rendering="optimizeSpeed" style="touch-action:pan-y;will-change:transform"><defs><style>.far [data-r]{stroke:none}</style>${cl.join('')}</defs><rect width="${GEO.W}" height="${GEO.H}" fill="#0c1a26"/>${body.join('')}</svg><div class="wzoom"><button onclick="H.wz('in')">＋</button><button onclick="H.wz('out')">−</button><button onclick="H.wz('reset')">⟲</button><button onclick="H.wz('full')" id="wfull">⛶</button></div>`;
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
 const up=e=>{if(!ptr.has(e.pointerId))return;const tap=gs&&!gs.multi&&gs.moved<=6&&e.type==='pointerup';ptr.delete(e.pointerId);if(tap){const t=document.elementFromPoint(e.clientX,e.clientY),r=t&&t.closest&&t.closest('[data-r]');gs=null;if(r)H.cc(r.getAttribute('data-c'));return}
  commit();gs=ptr.size?startG():null};
 svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
 svg.addEventListener('wheel',e=>{e.preventDefault();H.wz(e.deltaY<0?'in':'out')},{passive:false});return n}
let WZ={x:0,y:0,w:1000,h:575};
const asp=()=>{const r=WMAP.node&&WMAP.node.getBoundingClientRect();return r&&r.width>0?r.height/r.width:GEO.H/GEO.W};
function wzFit(v){v.w=Math.max(40,Math.min(GEO.W,v.w));v.h=v.w*asp();v.x=v.w>=GEO.W?(GEO.W-v.w)/2:Math.max(0,Math.min(GEO.W-v.w,v.x));v.y=v.h>=GEO.H?(GEO.H-v.h)/2:Math.max(0,Math.min(GEO.H-v.h,v.y));return v}
function wzApply(){WZ=wzFit(WZ);WMAP.node.classList.toggle('far',WZ.w>GEO.W*.4);WMAP.node.setAttribute('viewBox',`${WZ.x} ${WZ.y} ${WZ.w} ${WZ.h}`);WMAP.node.style.touchAction=(WMAP.full||WZ.w<GEO.W-1)?'none':'pan-y'}
const hwz=m=>{if(!WMAP.node)return;if(m==='full'){WMAP.full=!WMAP.full;const sl=document.getElementById('wm-slot');if(sl)sl.classList.toggle('full',!!WMAP.full);document.body.style.overflow=WMAP.full?'hidden':'';const b=document.getElementById('wfull');if(b)b.textContent=WMAP.full?'✕':'⛶';return wzApply()}if(m==='reset'){WZ={x:0,y:0,w:GEO.W,h:GEO.H}}else{const f=m==='in'?.6:1/.6,cx=WZ.x+WZ.w/2,cy=WZ.y+WZ.h/2;WZ.w*=f;WZ.h*=f;WZ.x=cx-WZ.w/2;WZ.y=cy-WZ.h/2}wzApply()};
function worldMapCard(){return card('🌍 Карта мира',`<div id="wm-slot" class="wmslot"><p class="muted" style="padding:12px">Строится карта мира…</p></div><p class="muted">Нажмите на любой регион: откроется страна с её областями. Золотые регионы — ваши. Перетаскивайте и приближайте кнопками ＋ −. Красный контур — страна, с которой вы воюете.</p>`)}
function mountWorldMap(){if(!document.getElementById('wm-slot'))return;wmLoad(ok=>{const sl=document.getElementById('wm-slot');if(!sl)return;if(!ok){sl.innerHTML='<p class="muted" style="padding:12px">Не удалось загрузить карту мира (нет интернета или библиотека заблокирована).</p>';return}
 if(!WMAP.box)buildWorldNode();if(sl.firstChild!==WMAP.box)sl.replaceChildren(WMAP.box);sl.classList.toggle('full',!!WMAP.full);const fb=document.getElementById('wfull');if(fb)fb.textContent=WMAP.full?'✕':'⛶';updateWorld()})}
/* --- окно страны: регионы, выбор региона для захвата --- */
const CC={iso:null,pick:false,war:null};
const hcc=iso=>{CC.iso=iso;CC.pick=false;CC.war=null;CC.sel={};ccDraw()};
const hpick=n=>{CC.iso=wi(n).iso;CC.pick=true;CC.war=n;CC.sel={};ccDraw()};
const hccClose=()=>{const m=document.getElementById('ccm');if(m)m.remove()};
const htake=rid=>{const w=S.wars.find(x=>x.n===CC.war);if(!w)return;CC.sel=CC.sel||{};const Q=quota(CC.war,w);if(CC.sel[rid])delete CC.sel[rid];else{if(Object.keys(CC.sel).length>=Q.q)return toast(`При фронте ${Math.round(Q.p)}% можно взять не больше ${Q.q} обл.`);CC.sel[rid]=1}ccDraw()};
const hauto=()=>{const w=S.wars.find(x=>x.n===CC.war);if(!w)return;const Q=quota(CC.war,w);CC.sel={};[...(regsOf(CC.war)||[])].filter(x=>!taken()[x.id]).sort((a,b)=>(((w.occ||[]).includes(b.id)?1:0)-((w.occ||[]).includes(a.id)?1:0))||b.s-a.s).slice(0,Q.q).forEach(x=>CC.sel[x.id]=1);ccDraw()};
const hconfirm=()=>{const n=CC.war,ids=Object.keys(CC.sel||{});if(!ids.length)return toast('Выберите хотя бы одну область');H.ccClose();H.dictate(n,'region',ids)};
function pickHead(){const w=S.wars.find(x=>x.n===CC.war);if(!w)return '';const Q=quota(CC.war,w),n=Object.keys(CC.sel||{}).length;return `<p><b>Фронт ${Math.round(Q.p)}% → можно взять до ${Q.q} из ${Q.free} свободных областей.</b> Нажимайте области на карте. Выбрано: ${n}/${Q.q}</p><div class="actions"><button class="good" onclick="H.confirm()">🗺 Забрать выбранные (${n})</button><button onclick="H.auto()">⚡ Выбрать крупнейшие</button></div>`}
function ccDraw(){const C=GEO.c[CC.iso];if(!C||!C.name){return}const nm=C.name,i=S.relations.findIndex(r=>r.name===nm),r=S.relations[i]||{},W=wi(nm),atWar=S.wars.some(w=>w.n===nm),j=S.just[nm],tk=taken();
 const BB=C.vb||C.bb,pad=14,bw=BB[2]-BB[0],bh=BB[3]-BB[1],vb=`${BB[0]-pad} ${BB[1]-pad} ${bw+2*pad} ${bh+2*pad}`,fs=Math.max(bw,bh*1.5)/(C.regs.length>24?58:C.regs.length>14?44:30),bigR=labelSet(C.regs,fs);
 const reg=C.regs.some(x=>x.d)?C.regs:[{id:C.iso+':0',n:nm,s:100,res:W.res,d:C.d,cx:(C.bb[0]+C.bb[2])/2,cy:(C.bb[1]+C.bb[3])/2}];
 const svg=`<svg viewBox="${vb}" style="width:100%;max-height:46vh;background:#0c1a26;border-radius:12px"><defs><clipPath id="ccc"><path d="${C.d}"/></clipPath></defs><g clip-path="url(#ccc)">${reg.map((x,k)=>{const mine=tk[x.id]||r.annexed,free=CC.pick&&!mine,sel=CC.sel&&CC.sel[x.id];return `<path d="${x.d}" fill="${sel?'#ffd34d':mine?MYC:isVas(nm)?VAS:baseCol(C.iso,k)}" stroke="#0b1218" stroke-width="${fs/14}" ${free?`style="cursor:pointer" onclick="H.take('${x.id}')"`:''}><title>${x.n}</title></path>`}).join('')}</g><path d="${C.d}" fill="none" stroke="#e8d8a0" stroke-width="${fs/9}" stroke-linejoin="round" style="pointer-events:none"/>${reg.length>1?reg.filter(x=>bigR.has(x.id)).map(x=>`<text x="${x.cx}" y="${x.cy}" text-anchor="middle" style="font-size:${fs}px;font-weight:700;fill:#fff;paint-order:stroke;stroke:#0b1218;stroke-width:${fs/5}px;pointer-events:none">${x.n.replace(/ \(.*\)/,'').slice(0,22)}</text>`).join(''):''}</svg>`;
 const rows=reg.map(x=>{const mine=tk[x.id]||r.annexed,pop=(W.pop||0)*x.s/100,ps=pop>=1?pop.toFixed(1):(pop*1000).toFixed(0)+' тыс.';return `<div class="mini"><b>${mine?'🏴':'🗺'} ${x.n}</b><br>${x.s.toFixed(0)}% страны · ${pop>=1?ps+' млн':ps} · ${resIcons(x.res)}<br>${mine?'<small class="muted">Под вашим контролем</small>':CC.pick?`<button class="${CC.sel&&CC.sel[x.id]?'good':'danger'}" onclick="H.take('${x.id}')">${CC.sel&&CC.sel[x.id]?'✔ Выбрана (снять)':'Выбрать область'}</button>`:'<small class="muted">Свободен</small>'}</div>`}).join('');
 let acts='';if(r.self)acts='<span class="muted">🏠 Это ваше государство</span>';else if(!CC.pick){acts=atWar?'<span class="muted">⚔️ Идёт война — условия мира выбираются во вкладке «Штаб»</span>':j==null?`<button onclick="H.justify(${i});ccDraw()">Обосновать войну · 30 ⭐</button>`:j>0?`<span class="muted">⏳ Обоснование: ${j} мес.</span>`:`<button class="danger" onclick="H.declare(${i});H.ccClose()">Объявить войну · 20 ⭐</button>`}
 const html=`<div class="ccbox"><button class="ccx" onclick="H.ccClose()">✕</button><h3>${nm}</h3><p class="muted">${CONTN[W.cont]||''} · ${r.trait||''}${r.annexed?' · <b>аннексирована</b>':''}</p>${CC.pick?pickHead():`<p>${mood(r.value||0)} · мощь ${r.power||'—'} · население ${W.pop>=1?W.pop.toFixed(W.pop>=10?0:1)+' млн':Math.round((W.pop||0)*1000)+' тыс.'}</p>`}${svg}<div class="actions" style="margin:8px 0">${acts}</div><div class="cards">${rows}</div></div>`;
 let m=document.getElementById('ccm');if(!m){m=document.createElement('div');m.id='ccm';m.className='ccm';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)H.ccClose()})}m.innerHTML=html}
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
function empireRows(){const o=[];Object.values(GEO.c).forEach(C=>{if(!C.name)return;const rc=S.relations.find(x=>x.name===C.name);let k=null;if(rc&&rc.self)k='me';else if((rc&&rc.annexed)||(S.captured||[]).some(z=>z.full&&z.from===C.name))k='ann';else if(C.regs.some(r=>taken()[r.id])||(S.captured||[]).some(z=>z.from===C.name))k='part';else if(isVas(C.name))k='vas';if(k)o.push([C,k])});return o}
function empireSvg(){const rows=empireRows();if(!rows.length)return '<p class="muted">Своя вымышленная страна не лежит на карте мира. Когда захватите области или сделаете страну вассалом, они появятся здесь.</p>';let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;rows.forEach(([C])=>{const b=C.vb||C.bb;x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3])});const pw=Math.max(40,(x1-x0)*.12),ph=Math.max(25,(y1-y0)*.12);x0-=pw;x1+=pw;y0-=ph;y1+=ph;const sw=(x1-x0)/900,fs=(x1-x0)/38;let P='',T='',nA=0,nV=0,nC=0;
 Object.values(GEO.c).forEach(C=>{const b=C.bb;if(!b||b[2]<x0||b[0]>x1||b[3]<y0||b[1]>y1)return;const hit=rows.find(r=>r[0]===C);if(!hit){P+=`<path d="${C.d}" fill="#1b2733" stroke="#0b1218" stroke-width="${sw}"/>`;return}const k=hit[1];
  const cols=C.regs.map((r,i)=>{const rn=r.n&&r.n.replace(/ \(.*\)/,'');const captured=(S.captured||[]).some(z=>z.from===C.name&&(z.full||String(z.name||'').replace(/^Земли /,'').replace(/ \(.*\)/,'')===rn));return k==='me'||k==='ann'?MYC:k==='vas'?VAS:(taken()[r.id]||captured)?MYC:'#26323f'});
  if(C.regs.some(r=>r.d))P+=`<g clip-path="url(#ec-${C.iso})"><defs><clipPath id="ec-${C.iso}"><path d="${C.d}"/></clipPath></defs>${C.regs.map((r,i)=>r.d?`<path d="${r.d}" fill="${cols[i]}" stroke="rgba(0,0,0,.35)" stroke-width="${sw*.5}"><title>${r.n.replace(/ \(.*\)/,'')}</title></path>`:'').join('')}</g>`;else P+=`<path d="${C.d}" fill="${cols[0]}"/>`;
  P+=`<path d="${C.d}" fill="none" stroke="#e8d8a0" stroke-width="${sw*1.3}" stroke-linejoin="round"/>`;
  const n=C.regs.filter(r=>k==='me'||k==='ann'||k==='vas'||taken()[r.id]).length;if(k==='ann')nC++;if(k==='vas'){nV+=C.regs.length}if(k==='part'||k==='ann')nA+=k==='ann'?C.regs.length:n;
  if(k!=='me'){const bb=C.vb||C.bb;T+=`<text x="${(bb[0]+bb[2])/2}" y="${(bb[1]+bb[3])/2}" text-anchor="middle" style="font-size:${fs}px;font-weight:700;fill:#fff;paint-order:stroke;stroke:#0b1218;stroke-width:${fs/5}px">${C.name.slice(0,16)}${k==='vas'?' 👑':''}</text>`}});
 return `<svg viewBox="${x0} ${y0} ${x1-x0} ${y1-y0}" style="width:100%;max-height:50vh;background:#0c1a26;border-radius:12px">${P}${T}</svg><div class="maplegend"><span><i style="background:${MYC}"></i>моя страна и захваченные области (${nA})</span><span><i style="background:${VAS}"></i>вассалы (${nV} обл.)</span></div>`}
function empireCard(){return card('🧭 Моя держава','<div class="emp-slot"><p class="muted">Строится карта…</p></div><p class="muted">Захваченные и аннексированные области закрашиваются вашим цветом. Вассалы — светлым оттенком, и у них закрашены все области страны.</p>')}
function mountEmpire(){const sl=document.querySelector('.emp-slot');if(!sl)return;wmLoad(ok=>{const e=document.querySelector('.emp-slot');if(!e)return;const sig=JSON.stringify(S.captured||[])+'|'+Object.keys(taken()).length+'|'+S.relations.filter(r=>r.annexed).map(r=>r.name).join(',')+'|'+(S.puppets||[]).join(',')+'|'+(S.me||'');if(e.dataset.sig===sig&&e.firstChild&&e.querySelector('svg'))return;e.dataset.sig=sig;e.innerHTML=ok?empireSvg():'<p class="muted">Не удалось загрузить карту мира (нужен интернет).</p>'})}
function capList(){const c=S.captured||[];if(!c.length)return card('🗺 Захваченные территории','<p class="muted">Пока ничего не захвачено. Победите в войне — и отнятые области или аннексированные страны появятся здесь и на карте.</p>');
 const reg=c.filter(z=>!z.full),ann=c.filter(z=>z.full),tp=c.reduce((a,z)=>a+(z.pop||0),0);
 const row=z=>`<div class="mini ${z.full?'':''}"><b>${z.full?'🏴':'🗺'} ${String(z.name).replace(/^Земли /,'')}</b>${z.full?'Аннексия страны':'Отторгнутая область'} · у: ${z.from}<br>${(z.regs&&z.regs.length)?'Области: '+z.regs.join(', ')+'<br>':''}Население: ${fmt(z.pop||0)}<br>Ресурсы: ${resIcons(z.res)||'—'} ${[...new Set(String(z.res||'').split(''))].map(k=>RLAB[k]).filter(Boolean).join(', ')}</div>`;
 return card(`🗺 Захваченные территории: ${reg.length} обл. · ${ann.length} стран · +${fmt(tp)} чел.`,`<div class="cards">${c.map(row).join('')}</div>`)}
function mapHtml(){let P='',T='';MAPR.forEach(m=>{let r=S.regions.find(x=>x.name===m[0])||((S.lost||[]).includes(m[0])?{loyalty:0,unrest:0,lost:1}:{loyalty:50,unrest:0});P+=`<polygon points="${m[1]}" fill="${r.lost?'#3a3d44':loyColor(r.loyalty)}" stroke="#0d1519" stroke-width="3" stroke-linejoin="round"><title>${m[0]}: лояльность ${Math.round(r.loyalty)}%, недовольство ${Math.round(r.unrest)}%</title></polygon>`;T+=`<text x="${m[2]}" y="${m[3]}" text-anchor="middle" class="maptxt">${m[0].toUpperCase()}</text><text x="${m[2]}" y="${m[3]+17}" text-anchor="middle" class="maptxt2">${r.lost?'потеряно':'лояльность '+Math.round(r.loyalty)+'%'}</text>`});return `<svg class="hoimap" viewBox="0 0 760 560" role="img" aria-label="Карта страны: цвет региона показывает лояльность"><defs><pattern id="mg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity=".05"/></pattern></defs><rect width="760" height="560" fill="url(#mg)"/>${P}${T}${capHtml()}${SEA}</svg><div class="maplegend"><span><i style="background:#6f8a55"></i>высокая лояльность</span><span><i style="background:#a0a257"></i>средняя</span><span><i style="background:#9a5a45"></i>низкая</span></div>`}
function warnBanner(){if(S.out)return'';if(S.grace>0)return `<section class="panel wide okbanner">🛡 Защитный срок: отставка не грозит ещё ${S.grace} мес.</section>`;if(S.crisis>0)return `<section class="panel wide warnbanner">⚠ Угроза отставки: ${S.crisisWhy||''}. Критическое состояние уже ${S.crisis} мес. подряд. ${ADVICE[S.crisisIdx]||'Нужно срочно исправить ситуацию.'} ${isPopular()?'(Тебя любят — отставка наступит позже.)':''}</section>`;return''}
function bar(label,val){return `<div class="meter"><b>${label}: ${fmt(val)}%</b><div class="bar"><i style="width:${clamp(val)}%;background:${val<30?"linear-gradient(90deg,#c23b4b,#ff7b86)":val<55?"linear-gradient(90deg,#c9902f,#f5c76a)":"linear-gradient(90deg,#2aa56d,#7ee6ae)"}"></i></div></div>`}
function stats(){let a=[[IC.money,'Казна',fmt(S.money)+' млн'],[IC.gdp,'ВВП',fmt(S.gdp)+' млрд'],[IC.pop,'Население',fmt(S.pop)],[IC.stab,'Стабильность',Math.round(S.stability)+'%'],[IC.appr,'Одобрение',Math.round(S.approval)+'%'],[IC.army,'Армия',fmt(S.army)],['⭐','Пол. власть',Math.floor(S.pp)]].concat(S.warCiv>0?[['🏘','Жертвы мирных',fmt(S.warCiv)]]:[]).concat(fxStat());$('#stats').innerHTML=a.map(x=>`<div class="stat">${x[0]}<div><small>${x[1]}</small><b>${x[2]}</b></div></div>`).join('');$('#clock').textContent=`${S.year} год · ${months[S.month]}`;$('#runstate').textContent=running?'Идёт время':'Пауза';$('#play').classList.toggle('active',running)}
function card(title,body){return `<section class="panel"><h2>${title}</h2>${body}</section>`}
function render(auto){if(window.__salv)return;if(tab==='events')tab='overview';stats();if(auto&&tab==='map'&&WMAP.node&&document.getElementById('wm-slot')){updateWorld();mountEmpire();return}if(auto&&tab==='mp'&&window.NGMP)return;if(auto&&(down||(document.activeElement&&document.activeElement.type==='range')))return;let c='';if(tab==='map')c=empireCard()+worldMapCard()+capList();
if(tab==='overview')c=`<div class="grid">${warnBanner()}${warPanel()}${card('🗺 Карта державы','<div class="emp-slot"><p class="muted">Строится единая карта…</p></div><p class="muted">Ваши земли и все аннексированные территории показаны одним цветом; вассалы — отдельным оттенком.</p>')}${capList()}${card('Государство',`<div class="cards"><div class="mini"><b>${S.name}</b>Форма правления: ${S.gov}<br>Лидер: ${S.leader}<br>Партия: ${S.party}<br>Сложность: <b>${difficulty().label}</b><div class=\"actions\"><button onclick=\"H.chooser()\">🌍 Выбрать другое государство</button></div></div><div class="mini"><b>Состояние страны</b>${bar('Стабильность',S.stability)}${bar('Одобрение',S.approval)}${bar('Легитимность',S.legitimacy)}</div></div>`)}${card('Национальные ресурсы',`<div class="cards">${[['Продовольствие',S.food],['Топливо',S.fuel],['Сталь',S.steel],['Вооружение',S.equipment],['Боеприпасы',S.ammo],['Энергия',S.energy],['Технологии',S.tech]].map(x=>`<div class="mini"><b>${x[0]}</b>${x[1]} / 100<div class="bar"><i style="width:${clamp(x[1])}%"></i></div></div>`).join('')}</div>`)}${card('Последние события',`<div class="log">${S.log.slice(0,9).map(x=>`<div>${x}</div>`).join('')}</div>`)}${card('Быстрые действия',`<div class="actions"><button onclick="act('roads')">Построить дороги (500 млн)</button><button onclick="act('aid')">Помощь населению (300 млн)</button><button onclick="act('reform')">Государственная реформа (700 млн)</button></div>`)}</div>`;
if(tab==='economy')c=`<div class="grid">${card('Экономика',`<div class="cards"><div class="mini">Доходы в месяц <b>${fmt(income())} млн</b></div><div class="mini">Расходы в месяц <b>${fmt(expenses())} млн</b></div><div class="mini">Государственный долг <b>${fmt(S.debt)} млн</b></div><div class="mini">Инфляция <b>${(+S.inflation).toFixed(1)}%</b></div></div>${bar('Занятость',S.employment)}<div class="row"><button onclick="act('industry')">Развивать промышленность · 800 млн</button><button onclick="act('trade')">Торговое соглашение · 200 млн</button><button onclick="act('debt')">Погасить 1000 млн долга</button></div>`)}${card('Бюджетные настройки',`<div class="row"><label>Налоговая ставка <b id="taxv">${S.tax}%</b></label><input type="range" min="5" max="50" value="${S.tax}" oninput="setv('tax',this.value,'taxv','%')"></div><div class="row"><label>Здравоохранение <b id="healthv">${S.health}%</b></label><input type="range" min="0" max="35" value="${S.health}" oninput="setv('health',this.value,'healthv','%')"></div><div class="row"><label>Образование <b id="educationv">${S.education}%</b></label><input type="range" min="0" max="35" value="${S.education}" oninput="setv('education',this.value,'educationv','%')"></div><div class="row"><label>Оборона <b id="defensev">${S.defense}%</b></label><input type="range" min="0" max="45" value="${S.defense}" oninput="setv('defense',this.value,'defensev','%')"></div><button class="primary" onclick="saveBudget()">Применить бюджет</button>`)}${taxCard()}${budCard()}</div>`;
if(tab==='military')c=`<div class="grid">${warPanel()}${card('Вооружённые силы',`<div class="cards">${[['Сухопутные войска',fmt(S.army)+' чел.'],['Флот',S.navy+' кораблей'],['Авиация',S.air+' эскадрилий'],['Подготовка',S.training+'%'],['Боевой дух',S.morale+'%'],['Военная угроза',S.threat+'%']].map(x=>`<div class="mini">${x[0]}<b>${x[1]}</b></div>`).join('')}</div>${bar('Боевой дух',S.morale)}<div class="actions"><button onclick="act('recruit')">Набрать 5 000 солдат · 400 млн</button><button onclick="act('train')">Военные учения · 250 млн</button><button onclick="act('equipment')">Закупить вооружение · 500 млн</button><button onclick="act('mobilize')">Мобилизация</button><button class="danger" onclick="act('demobilize')">Сократить армию</button></div><p>Состояние: <b>${S.war?'ВОЙНА':'Мирное время'}</b></p><button class="${S.war?'good':'danger'}" onclick="act('war')">${S.wars&&S.wars.length?'Заключить мир со всеми':S.martial?'Отменить военное положение':'Ввести военное положение'}</button>`)}${card('Военные запасы',`<div class="cards">${[['Топливо',S.fuel],['Сталь',S.steel],['Вооружение',S.equipment],['Боеприпасы',S.ammo]].map(x=>`<div class="mini">${x[0]} <b>${x[1]}/100</b></div>`).join('')}</div>`)}${armsCard()}${tacticsCard()}</div>`;
if(tab==='economy')c=mergeEco(c);if(tab==='military')c=mergeMil(c);
if(tab==='politics')c=`<div class="grid">${card('Твоя партия',`<div class="mini party-card"><b>🎖 ${S.playerParty}</b>Ты играешь за эту партию. Если она проиграет выборы и потеряет власть — кампания будет проиграна.</div><p>Правящая партия: <b>${S.party}</b></p><p>Глава правительства: <b>${S.leader}</b></p><p>До выборов: <b>${S.election} мес.</b></p><div class="actions"><button class="good" onclick="campaignAction('rally')">Провести митинг · 250 млн</button><button onclick="campaignAction('program')">Опубликовать программу · 400 млн</button><button onclick="act('speech')">Обращение к нации</button><button onclick="act('law')">Принять социальный закон</button><button class="primary" onclick="act('election')">Провести досрочные выборы</button><button onclick="act('security')">Усилить охрану правительства</button></div>${bar('Одобрение правительства',S.approval)}${bar('Риск переворота',S.coupRisk)}${S.grace>0?`<p class="muted">🛡 Защитный срок: ещё ${S.grace} мес. — отставка не грозит</p>`:S.crisis>0?`<p class="muted">⚠️ Угроза отставки (${S.crisisWhy||''}): ${S.crisis} мес. подряд. Власть могут сменить после ${crisisNeed()}-го месяца</p>`:''}</div>`)}${card('Политические партии и парламент',`<div class="cards">${S.parties.slice().sort((a,b)=>b.support-a.support).map(p=>`<div class="mini ${p.name===S.playerParty?'party-card':''}"><b>${p.name} ${p.name===S.playerParty?'★ ТВОЯ ПАРТИЯ':''}</b>${p.ideology}<br>Поддержка: <b>${Math.round(p.support)}%</b> · Мест: ${p.seats}<div class="bar"><i style="width:${clamp(p.support)}%"></i></div></div>`).join('')}</div><p class="action-note">Рейтинг партий меняется каждый месяц в зависимости от экономики, стабильности и решений правительства.</p>`)}</div>`;
if(tab==='politics')c=mergePol(c);
if(tab==='charts')c=`<div class="grid">${card('Экономика: рост и падение',`<div class="chart-wrap"><canvas id="chartEconomy"></canvas></div><p class="action-note">ВВП, казна и государственный долг. История последних 60 месяцев.</p>`)}${card('Политика и общество',`<div class="chart-wrap"><canvas id="chartPolitics"></canvas></div><p class="action-note">Поддержка твоей партии, одобрение правительства и стабильность.</p>`)}${card('Население и ресурсы',`<div class="chart-wrap"><canvas id="chartPopulation"></canvas></div><p class="action-note">Население, продовольствие и топливо.</p>`)}</div>`;
if(tab==='regions')c=`<div class="cards">${S.regions.map((r,i)=>`<div class="mini"><b>${r.name}</b>Население: ${fmt(r.pop)}<br>Благосостояние: ${r.wealth}%<br>Лояльность: ${r.loyalty}%<br>Недовольство: ${r.unrest}%<br>Промышленность: ${r.industry}%<br>Инфраструктура: ${r.infra}%<br>Ресурс: ${r.resource}<div class="actions"><button onclick="regionAct(${i},'invest')">Инвестиции · 250 млн</button><button onclick="regionAct(${i},'aid')">Помощь · 100 млн</button><button onclick="regionAct(${i},'police')">Порядок</button></div></div>`).join('')}</div>`;
if(tab==='diplomacy')c=`<div class="grid">${vassalPanel()}${aiPanel()}${card('🌐 Дипломатия и отношения',wlPanel('dip'))}</div>`;
if(tab==='documents')c=`<div class="grid">${card('Государственные документы',`<div class="row"><input id="docname" placeholder="Название документа"><select id="doctype"><option>Указ</option><option>Закон</option><option>Бюджет</option><option>Военный приказ</option><option>Дипломатическая нота</option></select></div><textarea id="doctext" rows="5" style="width:100%" placeholder="Текст документа..."></textarea><button class="primary" onclick="createDoc()">Подписать и сохранить</button>`)}${card('Архив документов',S.documents.length?S.documents.map((d,i)=>`<div class="choice"><b>${d.type}: ${d.name}</b><small class="muted"> · ${d.date}</small><p>${d.text}</p><button onclick="deleteDoc(${i})">Удалить</button></div>`).join(''):'Пока документов нет.')}</div>`;
if(tab==='events')c=`<div class="grid">${card('События государства',S.event?`<h3>${S.event.title}</h3><p>${S.event.text}</p><div class="actions"><button class="primary" onclick="resolveEvent(0)">${S.event.a}</button><button onclick="resolveEvent(1)">${S.event.b}</button></div>`:'<p>Сейчас нет неразрешённых событий.</p>')}${card('Хроника',`<div class="log">${S.log.map(x=>`<div>${x}</div>`).join('')}</div>`)}</div>`;
if(tab==='settings')c=`<div class="grid">${card('Сложность кампании',`<p>Выбери, насколько трудно удерживать власть и развивать государство. Сложность применяется только к <b>новой кампании</b>, текущую игру она не меняет.</p><div class="row"><label for="difficultySelect">Уровень сложности</label><select id="difficultySelect" onchange="setDifficulty(this.value)"><option value="story" ${selectedDifficulty==='story'?'selected':''}>История — очень легко</option><option value="easy" ${selectedDifficulty==='easy'?'selected':''}>Лёгкая</option><option value="normal" ${selectedDifficulty==='normal'?'selected':''}>Нормальная</option><option value="hard" ${selectedDifficulty==='hard'?'selected':''}>Сложная</option><option value="expert" ${selectedDifficulty==='expert'?'selected':''}>Эксперт</option></select></div><div class="mini"><b>Текущая сложность: ${difficulty().label}</b><br>Доходы ×${difficulty().income.toFixed(2)} · расходы ×${difficulty().expenses.toFixed(2)}<br>Давление оппозиции ×${difficulty().rivalPressure.toFixed(2)}<br>Риск беспорядков ×${difficulty().unrest.toFixed(2)}</div><button class="primary" onclick="resetGame()">Начать новую кампанию на выбранной сложности</button>`)}${card('Сохранение',`<p>Прогресс автоматически сохраняется на этом устройстве.</p><button class="good" onclick="save();toast('Игра сохранена')">Сохранить сейчас</button> <button onclick="exportSave()">Экспортировать сохранение</button><div class="row"><input type="file" id="importfile" accept=".json"><button onclick="importSave()">Загрузить файл</button></div><p class="hint">Если файл не скачивается или не выбирается (бывает в Telegram) — используйте текст:</p><div class="actions"><button onclick="copySave()">Скопировать сохранение</button></div><textarea id="importtext" rows="3" placeholder="Вставьте сюда текст сохранения" style="width:100%;margin-top:8px"></textarea><div class="actions" style="margin-top:8px"><button onclick="importSave(true)">Загрузить из текста</button></div>`)}${card('Параметры страны',`<div class="row"><label>Название</label><input id="countryname" value="${S.name}"><button onclick="S.name=$('#countryname').value;save();render()">Изменить</button></div>`)}</div>`;
{let t=addonTab();if(t)c=t;else if(S.out)c=outBanner()+c}if(tab==='overview')c+=spiritsCard()+ovExtra()+card('👥 Что говорят люди',feedHtml());$('#content').innerHTML=(tab==='mp'&&window.NGMP?window.NGMP.tab():evBanner()+c);if(tab==='mp'&&window.NGMP&&window.NGMP.after)window.NGMP.after();document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));drawCharts();if(tab==='map')mountWorldMap();if(tab==='overview'||tab==='map')mountEmpire();if(S.campaignOver)showGameOver()}
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
function income(){return Math.max(100,Math.round(S.gdp*S.tax/100/12*1.12*difficulty().income*incMult()+incFlat()))}/* Расходы масштабируются размером экономики (ВВП), как и доходы — иначе у реальных стран
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
function monthTick(){if(S.campaignOver)return;darkTick();S.month++;if(S.month>=12){S.month=0;S.year++}let inc=income(),exp=expenses();S.lastInc=inc;S.lastExp=exp;S.money+=inc-exp;if(S.money<0){S.debt+=Math.abs(S.money);S.money=0;S.stability=clamp(S.stability-1);S.inflation=clamp(S.inflation+.6,0,100)}else{S.debt=Math.max(0,S.debt-20);S.stability=clamp(S.stability+(S.money>4000?.12:(S.money>1000?0:-.15))+(66-S.stability)*.012)}S.gdp=Math.max(100,S.gdp*(1+(S.tech/22000)*1.525/(1+S.gdp/80000)+(S.employment-90)/10000-(S.inflation/20000)));S.pop=Math.max(100000,Math.round(S.pop*(1+(S.food-50)/1000000)));S.inflation=clamp(S.inflation+(S.money<1000?.3:-.15),0,100);S.food=clamp(S.food+(Math.random()*4-2)+(S.food<55?.5:0)-(S.war?2:0));S.fuel=clamp(S.fuel+(Math.random()*3-1.5)+(S.fuel<45?.4:0)-(S.war?3:0));S.energy=clamp(S.energy+(Math.random()*2-1));S.approval=clamp(S.approval+((S.money>3000?.1:-.2)+(S.inflation<10?.05:-.12))*difficulty().approval+(58-S.approval)*.02);S.legitimacy=clamp(S.legitimacy+(S.approval>50?.06:-.1)+(68-S.legitimacy)*.01);S.coupRisk=clamp(S.coupRisk+((S.stability<35?1.2:-.15)+(S.approval<25?.6:0))*difficulty().coup);S.regions.forEach(r=>{r.unrest=clamp(r.unrest+((S.stability<40?1:-.3)+(Math.random()-.5))*difficulty().unrest);r.loyalty=clamp(r.loyalty+(S.approval>50?.2:-.2));});if(S.war){S.ammo=clamp(S.ammo-2);S.equipment=clamp(S.equipment-.7);S.morale=clamp(S.morale-.4);S.threat=clamp(S.threat+1)}let my=S.parties.find(p=>p.name===S.playerParty);S.parties.forEach(p=>{let drift=(S.approval-50)*0.018+(S.stability-50)*0.008+(Math.random()-.5)*1.2;if(p.name===S.playerParty)p.support=clamp(p.support+drift*difficulty().playerDrift,2,75);else p.support=clamp(p.support-drift/(Math.max(1,S.parties.length-1))*difficulty().rivalPressure+(Math.random()-.5)*.7*difficulty().rivalPressure,2,75)});if(S.election>0)S.election--;if(S.election===0){runElection();if(S.campaignOver)return}if(S.coupRisk>85&&Math.random()<.08){S.stability=clamp(S.stability-15);S.coupRisk=25;log('Попытка переворота сорвана, правительство ослаблено!')}addonTick();try{fxTick()}catch(e){console.error('fxTick',e)}log(`Завершён месяц. Бюджет: ${fmt(inc)} млн доходов, ${fmt(exp)} млн расходов.`);let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap());if(S.history.length>500)S.history=S.history.filter((_,i)=>i%2==0||i==S.history.length-1);save();render(true)}
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
function doReset(){stop();S=initial();S.geoV=GEOV;ensure();if(window.NationsAI)NationsAI.init(S);S.difficulty=selectedDifficulty||'normal';if(S.difficulty==='story'){S.money=26000;S.approval=72;S.stability=78;S.parties[0].support=42;S.parties[1].support=22;S.parties[2].support=19;S.parties[3].support=17}else if(S.difficulty==='easy'){S.money=22000;S.approval=67;S.stability=73;S.parties[0].support=38;S.parties[1].support=23;S.parties[2].support=20;S.parties[3].support=19}else if(S.difficulty==='hard'){S.money=14500;S.approval=54;S.stability=59;S.parties[0].support=30;S.parties[1].support=28;S.parties[2].support=22;S.parties[3].support=20}else if(S.difficulty==='expert'){S.money=10500;S.approval=47;S.stability=50;S.parties[0].support=29;S.parties[1].support=27;S.parties[2].support=24;S.parties[3].support=20}applyCountry();if(window.NationsAI)NationsAI.init(S);S.history=[];let mp=S.parties.find(p=>p.name===S.playerParty);S.history.push(snap());save();document.getElementById('gameover')?.remove();tab='overview';render();window.scrollTo(0,0);toast('Новая кампания: '+(S.me?S.name+' · ':'')+difficulty().label)}
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
function snap(){let mp=S.parties.find(p=>p.name===S.playerParty);return{year:S.year,month:S.month,gdp:S.gdp,money:S.money,debt:S.debt,approval:S.approval,stability:S.stability,partySupport:mp?mp.support:0,pop:S.pop,food:S.food,fuel:S.fuel,inflation:S.inflation,army:S.army,threat:S.threat,employment:S.employment,trust:S.trust,t:S.year*12+S.month,war:(S.wars&&S.wars.length)?1:0,fxA:S.fx?S.fx.rate:null,fxB:S.fx?S.fx.rate*fxReal(S.fx.ref)/fxReal(S.fx.refB):null,fxMom:S.fx?S.fx.mom:null,pg:S.econ?S.econ.pg:null,lossPct:S.econ?S.econ.lossPct:0,lossCum:S.econ?S.econ.loss-(S.econ.loss0||0):0,income:S.lastInc==null?null:S.lastInc,expense:S.lastExp==null?null:S.lastExp,civDead:S.warCiv||0,soldDead:S.warSold||0,legit:S.legitimacy,coup:S.coupRisk,eGdp:(S.wars&&S.wars.length&&S.econ&&S.econ.eLast)?S.econ.eLast.g/S.econ.eLast.g0*100:null,eFx:(S.wars&&S.wars.length&&S.econ&&S.econ.eLast)?S.econ.eLast.r:null,energy:S.energy,morale:S.morale,ammo:S.ammo,equip:S.equipment}}
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
function occupyTick(w){
 const rg=regsOf(w.n);if(!rg||!rg.length)return;
 const free=rg.filter(x=>!taken()[x.id]);
 w.occ=(w.occ||[]).filter(id=>free.some(x=>x.id===id));
 const order=w.order||'balanced',sup=w.supply==null?75:w.supply;
 const want=Math.min(free.length,Math.floor(rg.length*Math.max(0,w.p-50)/50*(order==='attack'?.85:order==='defend'?.35:.6)));
 const nm=id=>{const x=rg.find(z=>z.id===id);return x?String(x.n).replace(/ \(.*\)/,''):id};
 while(w.occ.length>want){const id=w.occ.pop();warNews(w,'🏳',`${cityOf(nm(id))}: наши войска отошли, область снова у врага`);log(`🏳 Отход из области «${nm(id)}» (${w.n}).`)}
 if(w.occ.length<want&&sup>=35){
  let pick0=null;const pref=(w.command&&w.command.region)||((S.tgt&&S.wars[S.tgt.wi||0]===w&&S.tgt.r)||'');
  if(pref)pick0=free.find(x=>x.n===pref&&!w.occ.includes(x.id));
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

/* ---------- экономика врага: потери ВВП, курс валюты, истощение ---------- */
function enemyEco(w){
 if(w.eco)return w.eco;
 const W=(window.WORLD&&WORLD.map&&WORLD.map[w.n])||{},D=((window.WORLD_DATA&&WORLD_DATA.countries)||[]).find(x=>x.ru===w.n||(W.iso&&x.a===W.iso));
 const cur=window.FXD&&W.iso?FXD.cur(W.iso):'USD',ref=cur==='USD'?'EUR':'USD';
 const g0=D&&D.g?D.g:Math.max(4,Math.round(((wi(w.n).pop)||8)*4)),r0=fxReal(cur)/fxReal(ref);
 return w.eco={g0,g:g0,cum:0,pend:0,loss:0,drag:0,cur,ref,r0,r:r0,step:0};
}
function enemyEcoHit(w,t,f){const E=enemyEco(w);E.pend+=({mil:.0006,infra:.0035,civ:.0012}[t]||0)*(f||1)}
function enemyEcoTick(w,c,d){
 const E=enemyEco(w),occ=(w.occ||[]).length/Math.max(1,regCount(w.n)||1);
 let dr=.004+.006*(w.p/100)+.0015*(w.encirclement||0)+.015*occ+E.pend;E.pend=0;
 dr=Math.min(.03,dr);E.g*=1-dr;E.drag=dr;
 E.loss=(1-E.g/E.g0)*100;E.cum+=(E.g0-E.g)/12;
 c.power=Math.max(10,c.power-Math.min(.5,dr*22));
 const tgt=E.r0*Math.exp(.12+.014*E.loss+.10*(w.p/100));
 E.r+=(tgt-E.r)*.14;E.r*=Math.exp(rnd(-.006,.006));
 const st=Math.floor(E.loss/10);
 if(st>E.step){E.step=st;const m=`Экономика ${w.n}: ВВП упал на ${Math.round(E.loss)}% от довоенного, 1 ${E.ref} = ${nf(E.r,E.r<10?2:E.r<100?1:0)} ${E.cur}`;log('📉 '+m);warNews(w,'📉',m)}
 if(S.econ)S.econ.eLast={n:w.n,g0:E.g0,g:E.g,loss:E.loss,cum:E.cum,cur:E.cur,ref:E.ref,r0:E.r0,r:E.r};
}
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
function enemyStrikes(w,c){
 if(!window.AIARS)return;
 AIARS.stock(c,true);if(c.aa==null)c.aa=Math.round(c.power/25);
 const WP=AIARS.WEAPONS,aggr=c.aggr||.5,myAA=(S.aa||0)+bcount('aabat')*1.5;
 /* ИИ планирует залп: несколько единиц оружия за ход, приманки против ПВО, затем ракеты */
 const acts=AIARS.plan(S,c,{vs:'p',front:100-w.p,defAA:myAA,defStab:S.stability,aggr,war:true,allowBomb:c.power>=60&&w.p>72&&aggr>.6,allowCiv:aggr>.5||w.p>65});
 let pool=2+(S.aa||0)*2+bcount('aabat')*3,shows=[],hits=0,stopped=0;   // pool — сколько перехватов ПВО успевает сделать за месяц
 acts.forEach(act=>{
  const f=WP[act.w].f,air=WP[act.w].air,t=act.t;
  const regs=S.regions.slice().sort((a,b)=>{const sc=r=>(t==='mil'?r.industry:t==='infra'?r.infra*r.industry/60*((S.dark&&S.dark[r.name])?.55:1):r.pop/20000)*rnd(.8,1.2);return sc(b)-sc(a)});
  const planned=(w.enemyPlan&&w.enemyPlan.region)||'';
  const reg=regs.find(x=>x.name===planned)||regs[0]||{name:'страна',pop:0,industry:0,infra:0,unrest:0};
  const shf=window.PopAI?PopAI.shelter(S,reg.name):1;   // доля мирных, которые успели укрыться
  const pI=air?Math.min(.92,(S.aa||0)*.09+bcount('aabat')*.12+(w.airDefense||0)*.006):Math.min(.6,bcount('bunker')*.06+bcount('base')*.04);
  let caught=false;
  if(air){if(pool>0){pool-=act.decoy?1.2:1;caught=Math.random()<pI}}else caught=Math.random()<pI;
  if(caught){stopped++;if(window.PopAI)PopAI.hit(S,reg.name,t,.3*f);log(`🛡 ${air?'ПВО':'Оборона'} отразила удар врага (${AIARS.WN[act.w]} → ${AIARS.TN[t]}).`);AIARS.learn(S,act,act.decoy?.05:-.2*f);shows.push({w:act.w,reg,down:true,f});warNews(w,'🛡',`${cityOf(reg.name)}: ${AIARS.WN[act.w]} врага (цель — ${AIARS.TN[t]}) сбит${air?'а ПВО':'а обороной'}, попаданий нет`);return}
  hits++;shows.push({w:act.w,reg,down:false,f});if(window.PopAI)PopAI.hit(S,reg.name,t,f);
  let shift=0,r=0;
  if(t==='mil'){
   shift=2.5*f*.5;const kills=Math.round(rnd(300,900)*f*myLS());S.army=Math.max(5000,S.army-kills);const d=popLoss(kills);S.warSold=(S.warSold||0)+d;w.soldDead=(w.soldDead||0)+d;
   const cd=popLoss(rnd(30,160)*f*myLS()*shf);S.warCiv=(S.warCiv||0)+cd;w.civDead=(w.civDead||0)+cd;
   S.morale=clamp(S.morale-.8*f);S.equipment=clamp(S.equipment-.8*f);S.ammo=clamp(S.ammo-.5*f);S.approval=clamp(S.approval+.4*f*Math.max(.15,(100-S.approval)/50));
   let extra='';if(Math.random()<.05*f&&S.mil>1){S.mil--;extra=' Уничтожен военный завод!'}
   r=shift/3+kills/2500;log(`💥 ${w.n}: ${AIARS.WN[act.w]} по военным целям (${reg.name}). Погибло ${fmt(kills)} солдат, ${fmt(cd)} мирных.${extra}`);
   warNews(w,'🎯',`${cityOf(reg.name)}: ${AIARS.WN[act.w]} врага попала по военным объектам — погибло ${fmt(kills)} солдат${extra?', '+extra.trim().toLowerCase().replace('!',''):''}`)}
  else if(t==='infra'){
   shift=1.5*f*.5;const di=Math.min(reg.infra,2.2*f),dn=Math.min(reg.industry,1.5*f);reg.infra=clamp(reg.infra-di);reg.industry=clamp(reg.industry-dn);
   S.energy=clamp(S.energy-1.2*f);S.fuel=clamp(S.fuel-.8*f);S.gdp*=1-.0008*f;
   const cd=popLoss(rnd(120,520)*f*myLS()*shf);S.warCiv=(S.warCiv||0)+cd;w.civDead=(w.civDead||0)+cd;
   let extra='';if(Math.random()<.04*f&&S.civ>2){S.civ--;extra=' Разрушен гражданский завод!'}
   r=shift/3+(di+dn)*.05;log(`💥 ${w.n}: ${AIARS.WN[act.w]} по инфраструктуре (${reg.name}): дороги, энергосеть, склады. Погибло ${fmt(cd)} мирных.${extra}`);
   infraNews(w,reg.name,false,AIARS.WN[act.w])}
  else{
   shift=.5*f*.5;const dead=Math.round(rnd(3000,9000)*f*myLS()*shf),d=popLoss(dead);S.warCiv=(S.warCiv||0)+d;w.civDead=(w.civDead||0)+d;
   reg.unrest=clamp(reg.unrest+2*f);S.approval=clamp(S.approval+.6*f*Math.max(.15,(100-S.approval)/50));S.stability=clamp(S.stability-.8*f);
   r=shift/3+(d/9000)*.25+(S.stability<42?.6:.2)*f*.5-.5;log(`💥 ${w.n}: ${AIARS.WN[act.w]} по гражданским (${reg.name}). Погибло ${fmt(d)} мирных жителей. Мир осуждает противника.`);
   warNews(w,'🏘',`${cityOf(reg.name)}: ${AIARS.WN[act.w]} врага ударила по жилым кварталам — погибло ${fmt(d)} мирных жителей`)}
  w.p=clamp(w.p-shift,0,100);AIARS.learn(S,act,r-.12*f);
 });
 if(acts.length>1)log(`📡 ${w.n}: массированный удар — ${acts.length} ед. оружия, перехвачено ${stopped}, прошло ${hits}.`);
 /* анимация: каждый удар врага летит с ЕГО территории в ту область, куда попал (или где был сбит) */
 shows.forEach(x=>fxPush({kind:'strike',rev:1,down:x.down,k:x.w,enemy:w.n,regId:x.reg&&x.reg.geo,title:`⚠️ ${w.n}: ${AIARS.WN[x.w]} → ${S.name}`,sub:x.down?`Сбито нашей ПВО · ${x.reg.name}`:`Попадание: область «${x.reg.name}»`}));
}
const WP0={cannon:{air:false},drone:{air:true},tank:{air:false},rocket:{air:true},bomb:{air:true},howitzer:{air:false},heli:{air:true},mlrs:{air:false},cruise:{air:true},bomber:{air:true}};
const TG0={cannon:1,drone:1,tank:1,rocket:1,bomb:1,howitzer:1,heli:1,mlrs:1,cruise:1,bomber:1};
function ensure(){ensureHoi();if(!S.deps)S.deps=DN.map((n,i)=>({n,p:S.parties[i%S.parties.length].name,l:Math.round(rnd(45,80))}));if(!S.feed)S.feed=[];if(S.fund==null)S.fund=0;if(S.trust==null)S.trust=70;
C0.forEach(c=>{let r=S.relations.find(x=>x.name===c[0]);if(!r)S.relations.push(r={name:c[0],value:c[1],power:c[2]});if(r.aggr==null){r.aggr=c[3];r.trait=c[4];r.intent='Наблюдает и ждёт'}});ARMK.forEach(k=>{if(S[k]==null)S[k]=0})}
function say(t,m){if(window.__salv)return;ensure();S.feed.unshift({t,m:m||'🙂',d:`${months[S.month]} ${S.year}`});S.feed=S.feed.slice(0,40)}
const blocked=()=>{if(S.campaignOver){toast('Кампания завершена. Начни новую игру.');return true}if(S.out){toast('Вы в оппозиции — вернуться к власти можно во вкладке «Возврат»');return true}return false};
const myPower=()=>S.army/1000+S.air*1.5+S.navy*2+ARMK.reduce((a,k)=>a+(S[k]||0)*ARMS[k].pw,0);
function aiTick(){let me=myPower(),trade=0,help=0,sanc=0,thr=0,cand=[];
 S.relations.forEach(c=>{if(c.annexed||c.self)return;c.power=Math.max(10,Math.round(c.power+rnd(-1,1.3)));c.value=clamp(c.value+(c.value>0?.1:-.1)*c.aggr,-100,100);
  if(c.value>40){c.intent='Хочет дружить и торговать';if(Math.random()<.08)trade++}
  else if(me>c.power*1.5&&c.value<30){c.intent='Боится вашей силы и держит дистанцию';c.value=clamp(c.value-.4,-100,100)}
  else if(c.power>me*1.2&&c.aggr>.5&&c.value<-10){c.intent='Считает себя сильнее — давит на вас';thr++;if(!S.war&&c.value<-45&&Math.random()<.04*c.aggr&&nearTo(c.name))cand.push(c)}
  else c.intent='Наблюдает и ждёт';
  if(S.war&&c.value>50&&Math.random()<.1)help++;
  if(!S.war&&c.value<-60&&Math.random()<.05)sanc++});
 /* В мире 195 стран, поэтому события считаются с потолком: баланс не зависит от числа ботов */
 if(trade){const n=Math.min(trade,3);S.money+=150*n;log(n>1?`${n} страны закупили ваши товары: +${150*n} млн`:`Страна закупила ваши товары: +150 млн`)}
 if(thr)S.threat=clamp(S.threat+Math.min(thr,2)*1.5);
 if(help){const n=Math.min(help,2);S.money+=300*n;log(`Союзники помогают деньгами: +${300*n} млн`)}
 if(sanc){S.gdp*=Math.pow(.995,Math.min(sanc,2));log('Против вас введены торговые санкции')}
 aiBrain(cand,me);
 const now=S.year*12+S.month;
 if(cand.length&&(!S.war||(S.wars.length===1&&weakness()>=45))&&now-(S.aiWarLast==null?-99:S.aiWarLast)>=18){const c=pick(cand);S.aiWarLast=now;startWar(c.name,true);log(`⚔️ ${c.name} объявил вам войну!`);say(`${c.name} напал на нас!`,'😱');pause()}}
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
 S[k]--;const f=TG[k],w=tgtWar(),A=ARMS[k],en=S.relations.find(r=>r.name===w.n),R2=v=>S.relations.forEach(r=>r.value=clamp(r.value+v,-100,100));
 const aaE=(en&&en.aa!=null)?en.aa:Math.round(((en&&en.power)||40)/25),air=WP0[k].air;
 if(air&&en){en.aa=Math.min(14,aaE+.5*f)}
 if(air&&Math.random()<Math.min(.55,aaE*.045)){log(`🛡 ${A.n} сбит ПВО врага (${w.n}). Враг усиливает ПВО.`);toast(`${A.n} сбит ПВО врага`);{const r0=enemyRegs(w.n),w0=(S.tgt&&S.tgt.r)||'',g0=r0.find(x=>x.n===w0)||r0[Math.floor(Math.random()*r0.length)];armsFxMap(k,w.n,g0,g0?g0.n:w.n,true)}save();render();return}
 const regs=enemyRegs(w.n),want=(S.tgt&&S.tgt.r)||'';let reg=regs.find(x=>x.n===want);const rnd0=!reg;if(!reg&&regs.length)reg=regs[Math.floor(Math.random()*regs.length)];
 const avg=regs.length?regs.reduce((a,x)=>a+x.s,0)/regs.length:10,rn=reg?reg.n:w.n;
 let wt=reg?Math.max(.6,Math.min(1.6,reg.s/avg)):1;
 if(reg){const rs=reg.res;if(t==='mil'&&/q/.test(rs))wt*=1.25;if(t==='infra'&&/[qeus]/.test(rs))wt*=1.25}
 const D0=dmgOf(w,rn),worn=1-Math.min(.6,D0[t]/150);wt*=worn;D0[t]=Math.min(100,D0[t]+10*f);
 // Накопительный ущерб экономике противника от успешных ударов.
 // Это условная игровая модель, а не реальные денежные оценки.
 const econ=w.enemyEcon||(w.enemyEcon={gdp:100,fx:100,damage:0,months:0,hitGdp:0,hitFx:0,hitMoney:0,hits:0});
 const hit=(p,pw)=>{
  w.p=Math.max(0,Math.min(100,w.p+p*wt));
  if(en){en.power=Math.max(1,en.power-pw*wt);en.value=clamp(en.value-(t==='civ'?10:5),-100,100)}
  const impact={mil:.10,infra:.42,civ:.03}[t]||.05;
  const severity=Math.max(.15,Math.min(2,f*wt/2));
  econ.hitGdp=Math.min(80,(econ.hitGdp||0)+impact*severity);
  econ.hitFx=Math.min(150,(econ.hitFx||0)+impact*severity*.8);
  econ.hitMoney=(econ.hitMoney||0)+impact*severity*25;
  econ.hits=(econ.hits||0)+1;
  econ.gdp=Math.max(20,100-(econ.damage||0)-(econ.hitGdp||0));
  econ.damage=100-econ.gdp;
  econ.fx=Math.min(500,100+(econ.hitFx||0));
 };
 const where=` · область «${rn}»${rnd0?' (случайная)':''}`;armsFxMap(k,w.n,reg,rn);
 const rally=({mil:5,infra:4,civ:2}[t])*Math.max(.7,Math.min(1.4,f/1.5+.35))*Math.max(.15,Math.min(1,(100-S.approval)/50));
 S.approval=clamp(S.approval+rally);
 const eC=Math.round(({mil:rnd(30,250),infra:rnd(150,700),civ:rnd(3000,9000)}[t])*f*wt*enLS(w.n));w.eCiv=(w.eCiv||0)+eC;S.warECiv=(S.warECiv||0)+eC;if(eC>400)S.legitimacy=clamp(S.legitimacy-eC/60000);
 if(t==='mil'){hit(2.5*f,.3*f);S.threat=clamp(S.threat-2*f);S.morale=clamp(S.morale+1);worldReact(w.n,'mil',f);enemyEcoHit(w,'mil',f);log(`${A.ic} ${A.n}: удар по военным объектам врага (${w.n})${where}. Побочно погибло ${fmt(eC)} мирных жителей врага.`);say(`Разбиты военные объекты врага: ${rn}`,'🎯')}
 else if(t==='infra'){hit(1.5*f,1*f);S.threat=clamp(S.threat-.5*f);worldReact(w.n,'infra',f);enemyEcoHit(w,'infra',f);log(`${A.ic} ${A.n}: разрушена инфраструктура врага (${w.n})${where} — мосты, склады, энергосеть. Погибло ${fmt(eC)} мирных жителей врага.`);say(`Инфраструктура области ${rn} разрушена — экономика врага трещит`,'🏗');infraNews(w,rn,true)}
 else{hit(.5*f,.5*f);worldReact(w.n,'civ',f);enemyEcoHit(w,'civ',f);S.legitimacy=clamp(S.legitimacy-1.5*f);S.stability=clamp(S.stability-.5*f);log(`${A.ic} ${A.n}: удар по гражданским целям (${w.n})${where}. Погибло ${fmt(eC)} мирных жителей врага. Мир осуждает.`);say(`Удар по гражданским в области ${rn}: мир возмущён`,'😡');warNews(w,'🏘',`${cityOf(rn)}: наш удар по гражданским целям — погибло ${fmt(eC)} мирных жителей`)}
 if(k==='bomb'){S.threat=clamp(S.threat-10);worldReact(w.n,'bomb',f)}
 toast(`${A.n} → ${rn} · рейтинг +${rally.toFixed(1)}%${wt<.9?' (область уже разрушена, эффект слабее)':''}`);
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
function addonTick(){ensure();cdTick();aiTick();if(window.NationsAI)NationsAI.tick(S);people();if(window.PopAI)try{PopAI.tick(S,{atWar:atWar(),aa:(S.aa||0)+bcount('aabat')*1.5,bunkers:bcount('bunker')})}catch(e){console.warn('PopAI',e)}if(!S.out){econTick();polTick();hoiTick();mfgTick()}S.deps.forEach(d=>{d.l=clamp(d.l+(S.approval-50)*.03+(55-d.l)*.03+rnd(-1.5,1.5));if(d.l<20&&Math.random()<.1)log(`Депутат ${d.n} интригует против правительства`)});
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
 const opts=`<option value="">🎲 Случайная область</option>`+regs.map(x=>{const d=(w.dmg||{})[x.n];return`<option value="${String(x.n).replace(/"/g,'&quot;')}" ${x.n===cur?'selected':''}>${x.n}${d?` · 🎯${d.mil} 🏗${d.infra} 🏘${d.civ}`:''}</option>`}).join('');
 return`<div class="mini" style="margin-bottom:8px"><b>🎯 Куда бить</b>${ws}<br><label>Область врага: <select onchange="tgtSet(${wi0},this.value)">${opts}</select></label><small class="muted">Крупные и промышленные области дают больший эффект. Повторные удары по одной и той же цели слабеют (цифры в списке — накопленный урон по военным, инфраструктуре и гражданским).</small></div>`}
function tacticsCard(){
 const sm=window.AIARS?AIARS.summary(S):null;
 let h=`<div class="cards"><div class="mini">Погибло солдат за все войны<b>${fmt(S.warSold||0)}</b></div><div class="mini">Погибло мирных жителей<b>${fmt(S.warCiv||0)}</b></div><div class="mini">Мирные жители врага<b>${fmt(S.warECiv||0)}</b></div><div class="mini">Население сейчас<b>${fmt(S.pop)}</b></div></div>`;
 if(atWar())h+=S.wars.map(w=>{const c=rel(w.n)||{},ars=c.ars||{};return`<div class="mini"><b>⚔️ ${w.n}</b><small>ПВО врага: ${Math.round(c.aa==null?(c.power||0)/25:c.aa)} · арсенал врага (разведка): пушки ${Math.floor(ars.cannon||0)}, дроны ${Math.floor(ars.drone||0)}, танки ${Math.floor(ars.tank||0)}, ракеты ${Math.floor(ars.rocket||0)}${ars.bomb>=1?', бомба есть':''}</small><small>Потери войны: ${fmt(w.soldDead||0)} солдат, ${fmt(w.civDead||0)} мирных (наших) · у врага мирных: ${fmt(w.eCiv||0)}</small></div>`}).join('');
 if(sm)h+=`<p class="muted">🧠 <b>ИИ-тактик врага учится.</b> Изучено ударов: <b>${sm.steps}</b> · нейросеть: ${sm.nnSteps} шагов обучения · освоено оружия: ${sm.weaponsUsed}/${sm.weaponsTotal} · опробовано сочетаний оружие×цель: ${sm.coverage}% · результативных: ${sm.skill}% · любопытство ${Math.round(sm.eps*100)}%.${sm.best.length?`<br>Лучшее по опыту: ${sm.best.join('; ')}.`:' Пока копит опыт.'}<br>Он учитывает ваши ПВО и укрепления, бьёт туда, где больнее, и меняет тактику, если вы её закрываете. Свою ПВО и бункеры стройте заранее.</p>`;
 return card('🧠 Потери и тактика врага',h)}
/* ------------------------ АНИМАЦИЯ БОЁВ НА КАРТЕ ------------------------ */
const SVGNS='http://www.w3.org/2000/svg';
const SCN={drone:{n:3,dur:1.6,R:16},heli:{n:2,dur:1.8,R:18},bomber:{n:3,dur:2,R:24},cruise:{n:1,dur:1.7,R:22,rk:1},rocket:{n:1,dur:1.5,R:28,rk:1},bomb:{n:1,dur:2.2,R:62,rk:1},cannon:{n:4,dur:1.1,R:12,ar:1},howitzer:{n:3,dur:1.2,R:15,ar:1},mlrs:{n:9,dur:1.1,R:11,ar:1,gap:.11},tank:{n:5,dur:2.4,R:16,tk:1}};
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
   add(t0,dd,()=>({tr:mk('polyline',{fill:'none',stroke:rk?'#ffb06a':'#fff3c4','stroke-width':px((rk?2:1.3)*sc),opacity:.85,'stroke-linecap':'round','stroke-linejoin':'round'}),b:mk('path',{fill:rk?'#ff6a3d':'#e8eef5',stroke:'#0b1218','stroke-width':px(.5)}),pts:[]}),
    (st,p)=>{const u=p*pe,q=bez(P0,C,Aim,u),vx=2*(1-u)*(C.x-P0.x)+2*u*(Aim.x-C.x),vy=2*(1-u)*(C.y-P0.y)+2*u*(Aim.y-C.y),a=Math.atan2(vy,vx),c=Math.cos(a),s2=Math.sin(a),L1=px((big?10:7)*sc),W=px((big?5:3.6)*sc);
     st.pts.push(q.x.toFixed(1)+','+q.y.toFixed(1));if(st.pts.length>18)st.pts.shift();st.tr.setAttribute('points',st.pts.join(' '));
     st.b.setAttribute('d',`M${q.x+c*L1},${q.y+s2*L1}L${q.x-c*L1*.6-s2*W},${q.y-s2*L1*.6+c*W}L${q.x-c*L1*.6+s2*W},${q.y-s2*L1*.6-c*W}Z`)},
    st=>{st.tr.remove();st.b.remove()});
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
 log(`${A.ic} Залп ×${used}: ${A.n.toLowerCase()} по ${w.n} (${TN}). Попало ${hit}, сбито ПВО врага ${dn}.`);
 say(`Залп ×${used}: ${hit} попаданий, ${dn} сбито ПВО`,A.ic);
 warNews(w,A.ic,`Наш залп ×${used}: ${hit} попаданий, ${dn} сбито ПВО`);
 strikeScene({kind:'strike',k,enemy:w.n,shots:sv.outs.map(x=>({regId:x.reg&&x.reg.id,down:x.down})),title:`${A.ic} Залп ×${used} → ${w.n}`,sub:`Попало ${hit} · сбито ПВО ${dn}`});
 toast(`${A.ic} Залп ×${used}: попало ${hit}, сбито ПВО ${dn}`);
 save();render();
};
function armsCard(){
 const q=S.qty||1,tt=S.tt||'mil',war=atWar();
 const seg=(arr,cur,fn)=>`<div class="seg">${arr.map(([v,l])=>`<button class="${v===cur?'on':''}" onclick="${fn}(${typeof v==='number'?v:"'"+v+"'"})">${l}</button>`).join('')}</div>`;
 const ctl=`<div class="mini armctl"><small class="muted">Сколько покупать и стрелять за один тык</small>${seg([[1,'×1'],[10,'×10'],[20,'×20']],q,'setQty')}${war?`<small class="muted">Куда бить</small>${seg([['mil','🎯 Военные'],['infra','🏗 Инфра'],['civ','🏘 Граждане']],tt,'setTT')}`:''}</div>`;
 const rows=ARMK.map(k=>{const A=ARMS[k],have=S[k]||0,lock=A.mil&&S.mil<A.mil,sh=Math.max(1,Math.min(q,have)),fireOk=war&&TG0[k];
  return`<div class="mini arm"><div class="armhead"><b>${A.ic} ${A.n}</b><span class="armcnt">${fmt(have)}</span></div><small class="muted">${A.t}${A.eq?` · −${A.eq} воор.`:''}</small>
  <div class="armbtns"><button onclick="buy('${k}',${q})">${lock?'🔒 ':''}Купить${q>1?' ×'+q:''}<br><small>${fmt(A.c*q)} млн</small></button>${k==='petard'?'<span></span>':`<button class="good" onclick="make('${k}')">🏭 Произвести<br><small>${mCost(k).m} млн · ${A.mt||2} мес.</small></button>`}<button class="danger${have?'':' dim'}" onclick="salvo('${k}')">${fireOk?'🔥 Огонь'+(sh>1?' ×'+sh:''):'Применить'}<br><small>${fireOk?({mil:'военные',infra:'инфраструктура',civ:'гражданские'}[tt]):'учения'}</small></button></div></div>`}).join('');
 return card('💣 Арсенал',tgtPanel()+ctl+mfgPanel()+`<div class="cards armlist">${rows}</div><details class="fold hint" data-fold="armhint"><summary>ℹ Подсказки</summary><p class="muted">На войне выбираете тип цели один раз (военные / инфраструктура / граждане) и количество (×1, ×10, ×20) — дальше один тык «🔥 Огонь» делает залп сразу всем выбранным числом (сколько есть на складе). Военные цели — лучший эффект на фронте; инфраструктура бьёт по силе и экономике врага; удары по гражданским дают мировое осуждение и падение легитимности. Каждый снаряд ПВО врага может сбить отдельно. В мирное время стрельба — скандал (кроме парадов и учений). Бомба применяется по одной. Тяжёлое оружие требует военных заводов и вооружения со склада.</p></details>`)}
/* ---- объединённые вкладки: всё по теме на одной странице, секции сворачиваются ---- */
const FOLD=window.__fold=window.__fold||{};
function fold(id,title,html,def){const o=(id in FOLD)?FOLD[id]:!!def;return`<details class="fold" data-fold="${id}" ${o?'open':''}><summary>${title}</summary><div class="foldbody">${html}</div></details>`}
const tryH=f=>{try{return f()}catch(e){console.warn('fold',e);return'<p class="muted">Раздел временно недоступен</p>'}};
const _ct=$('#content');if(_ct)_ct.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.fold)FOLD[d.dataset.fold]=d.open},true);
function mergeEco(c){return fold('e0','▤ Сводка',c,1)+fold('e1','💰 Финансы и налоги',tryH(()=>finTab0()+fxCard()+card('🏭 Экономические программы',xcards(ECO2,'e'))))+fold('e2','🚢 Торговля и импорт',tryH(marketTab))+fold('e3','🏭 Заводы и стройки',tryH(indTab))+(window.NGRES?fold('e4','⛏ Недра и ресурсы',tryH(()=>NGRES.panel())):'')}
function mergeMil(c){return c+fold('m2','🎖 Военный штаб',tryH(staffTab))}
function mergePol(c){return fold('p0','🏛 Партии и выборы',c,1)+fold('p1','🗳 Власть и управление',tryH(()=>card('🗳 Власть и политика',`<p class="muted">Режим: <b>${S.gov}</b> · легитимность ${Math.round(S.legitimacy)}% · риск переворота ${Math.round(S.coupRisk)}%</p>`+xcards(POL,'p'))))+fold('p2','📜 Законы и реформы',tryH(billsTab))+fold('p3','🧑‍💼 Советники',tryH(advTab))+fold('p4','👥 Население',tryH(peopleTab))}
function addonTab(){ensure();let b=outBanner();if(tab==='resources'&&window.NGRES)return b+NGRES.panel();let hx=hoiTab();if(hx!=null)return b+hx;
if(tab=='charts')return b+chartsHtml();if(tab=='finance')return b+finTab0()+fxCard()+card('🏭 Экономические программы',xcards(ECO2,'e'));if(tab=='power')return b+card('🗳 Власть и политика',`<p class="muted">Режим: <b>${S.gov}</b> · легитимность ${Math.round(S.legitimacy)}% · риск переворота ${Math.round(S.coupRisk)}%</p>`+xcards(POL,'p'));
if(tab=='people')return b+`<div class="grid">${card('👥 Что говорят люди',feedHtml())}${card('Настроение страны',bar('Одобрение',S.approval)+bar('Стабильность',S.stability)+`<p class="muted">Недовольство регионов: ${S.regions.map(r=>`${r.name} ${Math.round(r.unrest)}%`).join(' · ')}</p>`)}</div>`;
if(tab=='deputies')return b+card('🏛 Депутаты парламента',`<p class="muted">Средняя лояльность: <b>${Math.round(depLoyal())}%</b>. Если она упадёт ниже 20% — возможен вотум недоверия.</p><div class="cards">${S.deps.map((d,i)=>`<div class="mini"><b>${d.n}</b>${d.p}${bar('Лояльность',d.l)}<div class="actions"><button onclick="dep(${i},'meet')">Встреча</button><button onclick="dep(${i},'bribe')">Подкуп · 200</button><button class="danger" onclick="dep(${i},'expel')">Заменить</button></div></div>`).join('')}</div>`);
if(tab=='arms')return b+armsCard();
if(tab=='comeback')return S.out?b+card('🔙 Путь к возвращению (25 способов)',`<div class="cards">${RET.map((n,i)=>{let my=S.parties.find(p=>p.name===S.playerParty);return`<div class="mini"><b>${n}</b>Цена ${100+(i%6)*80} млн · шанс ~${Math.round(((8+(i*7)%22)/100+(my?my.support:0)/300)*100)}%<div class="actions"><button class="primary" onclick="ret(${i})">Попробовать</button></div></div>`}).join('')}</div>`):card('Возврат','Вы у власти. Эта вкладка нужна, только если вас сместят.');
if(tab=='diplomacy')return b+`<div class="grid">${worldCard()}${vassalPanel()}${aiPanel()}${window.NationsAI?NationsAI.panel(S):''}${card('🌐 Дипломатия и отношения',wlPanel('dip'))}</div>`;
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
devalue:[0,()=>{S.inflation=clamp(S.inflation+6,0,100);S.trust=clamp(S.trust-5);S.gdp*=1.01;fxShock(.12)},'Девальвация валюты','Экспорт растёт, но цены и недоверие'],
default:[0,()=>{S.debt=0;S.trust=5;S.gdp*=.95;S.stability=clamp(S.stability-10);S.approval=clamp(S.approval-5);fxShock(.5)},'ОБЪЯВЛЕН ДЕФОЛТ','Долг = 0, но рынки закрыты и хаос']};
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

function ask(t,cb,yes,no,onNo){let d=document.createElement('div');d.className='gameover';d.style.zIndex=60;d.innerHTML=`<div class="gameover-box"><p>${t}</p><div class="row" style="justify-content:center"><button class="danger" id="askY">${yes||'Да, начать'}</button><button id="askN">${no||'Отмена'}</button></div></div>`;document.body.appendChild(d);d.querySelector('#askY').onclick=()=>{d.remove();cb()};d.querySelector('#askN').onclick=()=>{d.remove();if(onNo)onNo()}}

/* ===================================================================
   v3: РАНДОМНЫЕ СОБЫТИЯ + МЕХАНИКИ ИЗ HEARTS OF IRON IV
   =================================================================== */
const mt=()=>(S.year-1)*12+S.month;
const H=window.H={};
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
 const d={captured:[],lost:[],pp:60,civ:18,mil:6,dock:2,evq:[],evcd:{},evlast:-9,mlast:[],spirits:[],wars:[],just:{},puppets:[],flags:{},techs:{},research:[],rslots:2,build:[],bld:{},sanc:{},supp:{},bslots:2,adv:{pol:null,mil:null,eco:null},law:{eco:'civ',con:'vol'},doc:null,focus:{done:{},cur:null,p:0},martial:false,bud:{},tx:{},bills:{},gr:{workers:55,biz:55,pens:55,stud:55,mil:55,farm:55},mk:{m:{food:1,fuel:1,steel:1,energy:1,equipment:1,ammo:1},prev:{},q:{food:30,fuel:30,steel:30,energy:30,equipment:30,ammo:30},imp:0,exp:0}};
 for(const k in d)if(S[k]==null)S[k]=d[k];
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
const atWar=()=>!!(S.wars&&S.wars.length);
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
function buildTick(){
 S.build=S.build.filter(b=>{
  b.left--;if(b.left>0)return true;
  const k=b.t;
  if(!BUILD[k])return false;
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
function startWar(name,def){
 if(S.wars.some(w=>w.n===name))return;
 S.wars.push({n:name,p:def?40:50,m:0,won:false,def:!!def});S.war=true;
 S.threat=clamp(S.threat+5);log(`⚔️ Начата война: ${name}${def?' (нападение на нас)':''}.`);
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
 const R=(n,d)=>{const c=rel(n);if(c)c.value=clamp(c.value+d,-100,100)};
 if(mode==='unj'||mode==='just'){
  const unj=mode==='unj';
  t.f.forEach(n=>R(n,-(unj?rnd(15,30):rnd(3,6))));
  t.e.forEach(n=>R(n,unj?rnd(8,15):rnd(2,5)));
  neutral.forEach(n=>{if(Math.random()<(unj?.4:.1))R(n,-rnd(1,5))});
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
  neutral.forEach(n=>R(n,-k*(mode==='bomb'?.8:.25)));
  if(mode==='civ'||mode==='bomb'){const add=[];t.f.concat(mode==='bomb'?neutral:[]).sort((a,b)=>pw(b)-pw(a)).forEach(n=>{if(add.length<2&&Math.random()<(mode==='bomb'?.35:.12*f)&&sanctionBy(n,v))add.push(n)});if(add.length)log(`🌍 Новые санкции из-за ударов по гражданским/бомбы: ${add.join(', ')}.`)}
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
function warTick(){
 S.wars.forEach(w=>{
  const c=rel(w.n);if(!c){w.dead=1;return}
  w.m++;
  if(!w.command){w.command={region:'',troops:0,air:'reserve',navy:'reserve'};}
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
  const assignedBonus=assigned/Math.max(1,S.army)*.28;
  const opSupply=clamp(supply+(cmd.navy==='escort'?navyReady*.12:0),12,100);
  const my=(warPower(w)+aid+assigned*.0015)*(opSupply/100)*(order==='attack'?1.14:order==='defend'?.91:1)*(1+airBonus+navyBonus+assignedBonus),en=c.power*1.45*(1+(c.aggr-.4)*.15)*(order==='defend'?.88:1)*(1+(w.enemyPlan&&w.enemyPlan.air==='support'?.035:0)+(w.enemyPlan&&w.enemyPlan.navy==='escort'?.025:0));
  let d=clamp((my-en)/(my+en)*18+rnd(-3.5,3.5),-10,10);
  if(cmd.air==='support'&&airReady>0)d+=Math.min(1.8,airReady*.12);
  if(cmd.air==='patrol'&&airReady>0){w.airDefense=clamp((w.airDefense||0)+Math.min(3,airReady*.18),0,30)}
  if(cmd.navy==='blockade'&&navyReady>0){w.blockade=clamp((w.blockade||0)+Math.min(2.2,navyReady*.14),0,25);enemyEcoHit(w,'infra',Math.min(.8,navyReady*.025))}
  if(cmd.navy==='escort'&&navyReady>0)w.supply=clamp(opSupply+Math.min(8,navyReady*.35),12,100);
  w.p=clamp(w.p+d,0,100);w.aid=aid;w.mine=Math.round(my);w.theirs=Math.round(en);const a0=S.army;w.frontLine=w.frontLine||'Центральный фронт';if(w.m%4===0)w.frontLine=pick(FRONTS);w.encirclement=w.encirclement||0;
  if(w.p>68&&supply>55&&Math.random()<.12){w.encirclement=clamp(w.encirclement+1,0,5);if(w.encirclement===1||w.encirclement===5)log(`⭕ Окружение войск ${w.n}: ${w.encirclement}/5.`)}else if(w.p<45)w.encirclement=Math.max(0,w.encirclement-1);
  const dc=DOCS[S.doc],lossK=(1+Math.max(0,-d)/10)*(dc?dc.loss:1)*(1-advSum('loss'));
  S.army=Math.max(5000,S.army-Math.round((rnd(250,800)*lossK*(en/(my+en))*2+(supply<35?260:0)+w.encirclement*90)*myLS()));
  w.lost=(w.lost||0)+Math.max(0,a0-S.army);w.kills=(w.kills||0)+Math.round((Math.max(0,d)*rnd(260,640)+rnd(80,260))*enLS(w.n));battleEvent(w,d,c);ch({money:-120-(100-supply)*2},false);S.approval=clamp(S.approval+(w.m<=12&&w.p>=40?.35:-.12));S.fuel=clamp(S.fuel-(supply<45?3:1));S.ammo=clamp(S.ammo-(supply<45?3:1));
  if(dc&&dc.ammoS)S.ammo=clamp(S.ammo+dc.ammoS);if(dc&&dc.fuelC)S.fuel=clamp(S.fuel-dc.fuelC);
  c.power=Math.max(10,Math.round(c.power-Math.max(0,d)*(.35+w.encirclement*.12)+Math.max(0,-d)*.1+(d>0?Math.max(1,c.power*.012):0)));
  warCasualties(w,a0);occupyTick(w);warEnemyCiv(w,d);enemyEcoTick(w,c,d);darkTickEnemy(w);enemyStrikes(w,c);if(w.dmg)Object.keys(w.dmg).forEach(k=>{const d=w.dmg[k];d.mil*=.96;d.infra*=.96;d.civ*=.96});if(c.aa!=null)c.aa=Math.max(Math.round(c.power/25),c.aa-.04);
  if(w.m%3===0&&supply<30)log(`🚚 Критический кризис снабжения на фронте с ${w.n}: наступление замедлено.`);if(d>0&&w.m%6===0)log(`🪖 ${w.n} проводит мобилизацию, чтобы удержать фронт.`);c.value=clamp(c.value-.8,-100,100);
  if(w.p>=100){w.won=true;w.wm=0;log(`🏆 Победа над государством ${w.n}! Выбери плоды победы во вкладке «Штаб».`);say('Мы победили в войне!','🎉');toast('🏆 Победа над '+w.n+'!');pause()}
  else if(w.p>=90&&w.encirclement>=4){w.p=100;w.won=true;w.wm=0;log(`🏳️ ${w.n} запросила капитуляцию после окружения основных сил!`);toast('Противник капитулирует');pause()}
  else if(w.p<=0){
   const loss=Math.min(S.money,1200);S.money-=loss;
   ch({approval:-10,stability:-6,legitimacy:-8,threat:-10},false);c.value=clamp(c.value-10,-100,100);c.power=Math.round(c.power*1.1);w.dead=1;
   log(`🏳 Поражение в войне с ${w.n}: вынужденный мир, контрибуция ${fmt(loss)} млн.`);say('Мы проиграли войну…','😢');toast('🏳 Поражение в войне');pause();
  }
 });
 S.wars=S.wars.filter(w=>!w.dead);
}
H.warOrder=(name,order)=>{const w=S.wars.find(x=>x.n===name);if(!w)return;w.order=['attack','defend','balanced'].includes(order)?order:'balanced';if(w.order==='attack')armyAttack(name);log(`📯 Приказ фронту против ${name}: ${{attack:'наступать',defend:'держать оборону',balanced:'сбалансированные действия'}[w.order]}.`);save();render()};
// Приказы войскам — абстрактная игровая система, без реальных координат и маршрутов.
H.warCommand=(name,region,troops,air,navy)=>{
 const w=S.wars.find(x=>x.n===name);if(!w)return;
 const regs=enemyRegs(name),valid=regs.find(x=>x.n===region);
 const count=Math.max(0,Math.min(Math.floor(+troops||0),Math.floor(S.army*.7)));
 w.command=w.command||{};
 w.command.region=valid?valid.n:(regs[0]&&regs[0].n)||'';
 w.command.troops=count;
 w.command.air=['support','patrol','reserve'].includes(air)?air:'support';
 w.command.navy=['escort','blockade','reserve'].includes(navy)?navy:'escort';
 log(`📋 План армии против ${name}: ${w.command.region||'общий фронт'}, ${fmt(count)} солдат; авиация — ${{support:'поддержка',patrol:'патрулирование',reserve:'резерв'}[w.command.air]}, флот — ${{escort:'сопровождение',blockade:'морская блокада',reserve:'резерв'}[w.command.navy]}.`);
 save();render();
};

function peaceAll(free){
 if(!S.wars.length)return;
 if(!free){
  const losing=S.wars.some(w=>!w.won&&w.p<30);
  if(losing){const pay=Math.min(S.money,800);S.money-=pay;ch({approval:-4},false)}else ch({approval:-1},false);
 }
 log('🕊 Заключён мир.');S.wars=[];S.war=!!S.martial;
}
function spoils(name,mode,rid,keep){
 const w=S.wars.find(x=>x.n===name),c=rel(name);if(!w||!c)return;
 const k=w.won?1:.4+.6*w.p/100,W=wi(name);
 if(c.popLeft==null)c.popLeft=W.pop?W.pop*1e6:c.power*3500;
 const gpc=S.gdp/Math.max(1,S.pop)*([0,.25,.55,.9,1.4,2.2][W.inc||2]);
 const resName=RLAB[(W.res||'f')[0]]||'Захвачено';
 const grab=(label,pop,gdp,full,rs)=>{
  S.pop+=pop;S.gdp+=gdp;S.captured=S.captured||[];S.captured.push({name:label,from:name,pop,full:!!full,res:rs||W.res||'f',cont:W.cont});
  S.regions.push({name:label,pop,wealth:40,loyalty:35,unrest:38,industry:36,infra:34,resource:RLAB[(rs||W.res||'f')[0]]||resName,captured:true,from:name,res:rs||W.res||'f'});
 };
 if(mode==='tribute'){const m=Math.round((800+c.power*25)*k);ch({money:m,approval:2},false);c.value=clamp(c.value-30,-100,100);c.power=Math.round(c.power*.8);log(`💰 ${name} выплатил контрибуцию: +${fmt(m)} млн.`)}
 if(mode==='region'){const n=(c.regLost||0)+1,rg=regsOf(name);let R=rg&&rid?rg.find(x=>x.id===rid):null;
  if(R&&taken()[R.id])return;
  if(!R){const all=(WORLD.REGS[name]||WORLD.GEN.map(x=>({n:x[0]+' · '+name,s:x[1],res:x[2]}))),tk=c.regTaken=c.regTaken||[],left=all.filter(r=>!tk.includes(r.n));R=pick(left.length?left:all);tk.push(R.n)}
  else taken()[R.id]=1;
  const basePop=W.pop?W.pop*1e6:c.power*3500;let p=Math.round(Math.min(basePop*(R.s/100),c.popLeft,S.pop*.12));p=Math.max(p,Math.min(60000,c.popLeft));const g=Math.round(Math.min(p*gpc,S.gdp*.1));
  c.popLeft=Math.max(0,c.popLeft-p);c.regLost=n;grab(R.n,p,g,false,R.res);ch({stability:-2,threat:3,legitimacy:-1},false);c.value=clamp(-45,-100,100);c.power=Math.max(10,Math.round(c.power*.8));
  log(`🗺 Вы захватили регион: ${R.n} (${name}). Население +${fmt(p)}, ВВП +${fmt(g)}.`);if(!keep)intlReact(name,'region');
  if(rg&&rg.every(x=>taken()[x.id])){c.annexed=true;S.puppets=S.puppets.filter(x=>x!==name);log(`🏴 Вы захватили все регионы — ${name} исчезла с карты мира.`)}}
 if(mode==='annex'){const p=Math.round(Math.min(c.popLeft,S.pop*.5)),g=Math.round(Math.min(p*gpc*1.1,S.gdp*.35));
  grab(`Земли ${name}`,p,g,true);{const rg=regsOf(name)||[];S.captured[S.captured.length-1].regs=rg.filter(x=>!taken()[x.id]).map(x=>x.n);rg.forEach(x=>taken()[x.id]=1)}c.annexed=true;c.popLeft=0;S.puppets=S.puppets.filter(x=>x!==name);ch({stability:-5,legitimacy:-2,threat:8,rel:-6,reg:4},false);log(`🏴 Полностью захвачено государство ${name}: население +${fmt(p)}, ВВП +${fmt(g)}. Страна исчезла с карты мира, её земли показаны на вашей карте.`);intlReact(name,'annex')}
 if(mode==='puppet'){c.value=60;c.power=Math.max(10,Math.round(c.power*.7));if(!S.puppets.includes(name))S.puppets.push(name);ch({approval:3},false);log(`🎭 ${name} стал вассалом (+70 млн/мес). Его ${regCount(name)} обл. показаны на вашей карте светло-синим.`)}
 if(!keep){S.wars=S.wars.filter(x=>x.n!==name);S.war=S.wars.length>0||!!S.martial}
}
/* Реакция мира на захват: страны одобряют или осуждают (стр. зависит от отношений с жертвой и силы агрессора) */
function intlReact(victim,kind){
 const al=alive().filter(r=>r.name!==victim),V=wi(victim);let cond=0,appr=0,names=[];
 al.forEach(r=>{const W=wi(r.name);const against=(r.value>20||W.cont===V.cont)&&Math.random()<(kind==='annex'?.5:.3)&&r.power>=14;
  const pro=r.value<-25&&Math.random()<.12;
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
function ultRefuse(c){c.value=clamp(c.value-15,-100,100);
 if(S.wars.length<2&&Math.random()<Math.min(.7,.25+c.aggr*.5)){startWar(c.name,true);log(`⚔️ ${c.name} объявил войну после отказа выполнить ультиматум!`);say(`${c.name} напал на нас!`,'😱')}
 else{log(`😤 ${c.name} угрожает, но не решился на войну.`);ch({approval:2},false)}}
function aiBrain(cand,me){
 if(window.__NG_MP||S.out||S.campaignOver)return;
 const A=AIS(),now=nowM(),AL=allies(),weak=weakness(),pup=S.puppets||[],al=alive().filter(r=>!pup.includes(r.name));
 /* 1. Оппортунисты: сильные соседи нападают, когда вы слабы */
 al.forEach(c=>{if(AL.includes(c.name))return;
  if(c.power>me*.85&&weak>=35&&c.aggr>.35&&c.value<15&&nearTo(c.name)){c.intent='Видит вашу слабость и готовит удар';if(Math.random()<.05*c.aggr&&!cand.includes(c))cand.push(c)}
  else if(AL.length>=2&&c.power<me*.6&&c.value<20){c.intent='Не решается нападать: у вас сильные союзники'}});
 /* 2. Коалиция против сверхагрессора */
 if(A.coal.length&&(now>A.coalUntil||S.threat<30)){log('🕊 Коалиция против вас распалась.');A.coal=[]}
 if(!A.coal.length&&(S.threat>=55||(S.captured||[]).length>=3)&&Math.random()<.12){
  const pool=al.filter(c=>c.power>=30&&c.value<35&&!AL.includes(c.name)).sort((a,b)=>b.power-a.power).slice(0,12),mem=[];
  while(pool.length&&mem.length<Math.min(4,pool.length)){const x=pick(pool);if(!mem.includes(x.name))mem.push(x.name)}
  if(mem.length>=3){A.coal=mem;A.coalUntil=now+18;mem.forEach(n=>{const c=rel(n);c.value=clamp(c.value-12,-100,100);c.intent='Участвует в коалиции против вас'});S.threat=clamp(S.threat+4);
   log(`🛡 Против вас сформировалась коалиция: ${mem.join(', ')}.`);say('Мир объединяется против нас!','😰');toast('🛡 Против вас сформировалась коалиция')}}
 if(A.coal.length){const mem=A.coal.map(rel).filter(c=>c&&!c.annexed);mem.forEach(c=>{c.value=clamp(c.value-.6,-100,100);c.intent='Участвует в коалиции против вас'});
  if(!S.wars.length&&mem.length&&Math.random()<.05&&now-(S.aiWarLast==null?-99:S.aiWarLast)>=12){
   S.aiWarLast=now;const lead=[...mem].sort((a,b)=>b.power-a.power)[0];startWar(lead.name,true);
   const hp=mem.find(c=>c!==lead);if(hp)startWar(hp.name,true);
   log(`⚔️ Коалиция начала войну: ${lead.name}${hp?' и '+hp.name:''} атакуют вас!`);say('Коалиция напала на нас!','😱');pause()}}
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
  const bully=al.filter(c=>c.power>me*1.1&&c.value<5&&c.aggr>.45&&nearTo(c.name)&&!AL.includes(c.name)).sort((a,b)=>b.aggr-a.aggr)[0];
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
  if(atk&&dialog(`⚔️ Агрессия против вашего вассала ${n}: ${atk.name} начинает против него войну. Защитить вассала? Если бросить его на произвол, он потеряет доверие к вам.`,'Защитить','Бросить',()=>{startWar(atk.name,false);d.loyalty=clamp(d.loyalty+12);log(`🛡 Вы вступились за вассала ${n} и вступили в войну с ${atk.name}.`)},()=>{d.loyalty=clamp(d.loyalty-15);d.unrest=clamp(d.unrest+8);log(`💔 Вы бросили вассала ${n} без защиты. Его лояльность упала.`)}))A.vev=nowM()}
}
const BEV=[
 [d=>d>2,w=>{w.p=clamp(w.p+3);return `🚀 Танковый прорыв на участке «${w.frontLine}»: линия фронта продвинулась`}],
 [d=>d>0,(w,c)=>{if(c)c.power=Math.max(10,c.power-2);return `🛩 Авиаудар по тылам противника: потери врага растут`}],
 [d=>d>1,w=>`🪖 Наши части взяли укреплённую высоту у «${w.frontLine}»`],
 [d=>d<-2,w=>{w.p=clamp(w.p-3);return `💥 Контрудар противника: мы отступили на участке «${w.frontLine}»`}],
 [d=>d<0,w=>`🌧 Распутица и перебои со снабжением замедлили операции у «${w.frontLine}»`],
 [()=>true,w=>`⚔️ Затяжные бои на участке «${w.frontLine}»`]];
function battleEvent(w,d,c){if(Math.random()>.4)return;const e=pick(BEV.filter(x=>x[0](d)).slice(0,3)),t=e[1](w,c);w.blog=w.blog||[];w.blog.unshift(`${months[S.month].slice(0,3)}, год ${S.year}: ${t}`);w.blog.length=Math.min(w.blog.length,5)}
function warNewsHtml(w){const a=Object.keys(S.dark||{}).length,b=Object.keys(w.dark||{}).length,n=w.news||[];
 const oc=(w.occ||[]),rgo=regsOf(w.n)||[];
 return `<div class="wnews"><b>📰 Новости войны</b>${oc.length?`<small class="muted">🚩 Заняты (заштрихованы на карте): ${oc.map(id=>{const x=rgo.find(z=>z.id===id);return x?String(x.n).replace(/ \(.*\)/,''):id}).join(', ')}. Станут нашими при мире — диктат «Области».</small>`:''}${(a||b)?`<small class="muted">Без света/в разрухе сейчас: у нас ${a} обл., у врага ${b} обл.</small>`:''}${n.length?n.slice(0,6).map(x=>`<div class="wn"><span>${x.m}</span> ${x.t} <small class="muted">· ${x.d}</small></div>`).join(''):'<p class="muted wnolog">Пока тихо. Новости о разрушениях и жертвах появятся после ударов.</p>'}</div>`}
function warCard(w){
 const c=rel(w.n)||{power:0},p=Math.round(w.p),mine=Math.round(w.mine||warPower(w)),theirs=Math.round(w.theirs||c.power*1.45),sum=Math.max(1,mine+theirs),
  st=w.won?['🏆','Победа','ok']:p>=65?['💪','Мы побеждаем','ok']:p>=45?['⚖','Равные силы','mid']:p>=25?['⚠','Мы отступаем','warn']:['🔥','Критическое положение','bad'],
  nm=qn(w.n),sup=Math.round(w.supply??75),ord=w.order||'balanced',allyL=(w.allies||[]);
 const tile=(i,l,v)=>`<div class="wt"><span>${i}</span><small>${l}</small><b>${v}</b></div>`;
 return `<article class="wcard st-${st[2]}"><header class="whead"><div class="wsides"><span class="wside us">🛡 ${S.name}</span><span class="wvsx">⚔</span><span class="wside them">${w.n} 🏴</span></div><div class="wbadge">${st[0]} ${st[1]}</div></header>
 <div class="wmeta">${w.frontLine||'Центральный фронт'} · месяц войны: ${w.m}${w.def?' · на нас напали':''}</div>
 <div class="wforce"><div class="fs us"><small>Наша сила</small><b>${fmt(mine)}</b></div><div class="fbar"><i style="width:${Math.round(mine/sum*100)}%"></i></div><div class="fs them"><small>Сила врага</small><b>${fmt(theirs)}</b></div></div>
 <div class="wtrack"><div class="wfill" style="width:${p}%"></div><div class="wmark" style="left:${p}%"></div></div><div class="wscale"><span>Поражение</span><b>Фронт ${p}%</b><span>Победа</span></div>
 <div class="wtiles">${tile('🚚','Снабжение',sup+'%')}${tile('⭕','Окружение',(w.encirclement||0)+'/5')}${tile('👑','Вассалы','+'+fmt(w.aid||vassalAid()))}${tile('🤝','Союзники',allyL.length?allyL.length:'—')}${tile('🪦','Наши потери',fmt(w.lost||0))}${tile('☠','Потери врага',fmt(w.kills||0))}${tile('🚩','Занято областей',(w.occ||[]).length+'/'+regCount(w.n))}${tile('🏘','Мирные у нас',fmt(w.civDead||0))}${tile('🏚','Мирные у врага',fmt(w.eCiv||0))}${tile('📉','ВВП врага','−'+(w.eco?w.eco.loss:0).toFixed(1)+'%')}${tile('💱','Валюта врага',w.eco?pct((w.eco.r/w.eco.r0-1)*100,0):'—')}</div>
 ${warNewsHtml(w)}
 ${allyL.length?`<div class="wallies">На нашей стороне: ${allyL.map(n=>`<span class="chip">${n}</span>`).join('')}</div>`:''}
 <div class="worders"><button class="${ord==='attack'?'on atk':''}" onclick="H.warOrder(${nm},'attack')">⚔ Наступать</button><button class="${ord==='balanced'?'on bal':''}" onclick="H.warOrder(${nm},'balanced')">⚖ Баланс</button><button class="${ord==='defend'?'on def':''}" onclick="H.warOrder(${nm},'defend')">🛡 Оборона</button></div><div class="actions"><button onclick="armyAttack(${nm})">🪖 Показать атаку пехоты на карте</button></div>
 <div class="mini war-command"><b>📋 План армии и родов войск</b>
 <label>Область назначения: <select id="cmd-reg-${String(S.wars.indexOf(w))}">${(enemyRegs(w.n)||[]).map(r=>`<option value="${String(r.n).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" ${w.command&&w.command.region===r.n?'selected':''}>${r.n}</option>`).join('')}</select></label>
 <label>Солдаты: <input id="cmd-troops-${String(S.wars.indexOf(w))}" type="number" min="0" max="${Math.floor(S.army*.7)}" step="1000" value="${w.command&&w.command.troops||0}" style="width:110px"></label>
 <label>Авиация: <select id="cmd-air-${String(S.wars.indexOf(w))}"><option value="support" ${!w.command||w.command.air==='support'?'selected':''}>Поддержка армии</option><option value="patrol" ${w.command&&w.command.air==='patrol'?'selected':''}>Патрулирование</option><option value="reserve" ${w.command&&w.command.air==='reserve'?'selected':''}>Резерв</option></select></label>
 <label>Флот: <select id="cmd-navy-${String(S.wars.indexOf(w))}"><option value="escort" ${!w.command||w.command.navy==='escort'?'selected':''}>Снабжение и сопровождение</option><option value="blockade" ${w.command&&w.command.navy==='blockade'?'selected':''}>Морская блокада (игровой эффект)</option><option value="reserve" ${w.command&&w.command.navy==='reserve'?'selected':''}>Резерв</option></select></label>
 <button class="primary" onclick="H.warCommand(${nm},document.getElementById('cmd-reg-${String(S.wars.indexOf(w))}').value,document.getElementById('cmd-troops-${String(S.wars.indexOf(w))}').value,document.getElementById('cmd-air-${String(S.wars.indexOf(w))}').value,document.getElementById('cmd-navy-${String(S.wars.indexOf(w))}').value)">📌 Установить план</button>
 <small class="muted">Назначенные части усиливают выбранный участок. Авиация и флот дают игровые бонусы к фронту, снабжению и экономическому давлению. Это абстрактная стратегия.</small></div>
 ${(w.blog&&w.blog.length)?`<ul class="wlog">${w.blog.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="muted wnolog">Боевые донесения появятся в ходе войны.</p>'}
 ${(w.won||w.p>=60)?`<div class="wwin"><p><b>${w.won?'🏆 Полная победа!':'💪 Перевес на фронте'}</b> Решите, чем закончить войну${w.won?` (иначе через ${3-(w.wm||0)} мес. — контрибуция)`:''}:</p><div class="actions"><button class="good" onclick="H.dictate(${nm},'tribute')">💰 Контрибуция</button><button class="primary" onclick="H.dictate(${nm},'puppet')">👑 Вассал</button>${(w.won||w.p>=70)?`<button class="danger" onclick="H.dictate(${nm},'region')">🗺 Области · до ${quota(w.n,w).q}</button>`:'<small class="muted">Области — от 70%</small>'}${w.won?`<button class="danger" onclick="H.dictate(${nm},'annex')">🏴 Захватить всю страну</button>`:''}</div></div>`:''}</article>`}
function warBoard(){return S.wars.length?`<div class="wboard">${S.wars.map(warCard).join('')}</div>`:''}
const warPanel=()=>S.wars.length?`<section class="panel wide"><h2>⚔️ Война</h2>${warBoard()}</section>`:'';
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
H.allyBreak=i=>{const c=S.relations[i];if(!c)return;S.allies=allies().filter(n=>n!==c.name);c.value=clamp(c.value-10,-100,100);log(`💔 Союз с ${c.name} расторгнут.`);save();render()};
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
 const jus=S.just[c.name]===0;
 if(jus)delete S.just[c.name];
 else{ch({approval:-8,legitimacy:-6,rel:-2},false);log('Война без обоснования вызвала возмущение.')}
 startWar(c.name,false);worldReact(c.name,jus?'just':'unj');save();render();
};
H.peace=()=>{if(blocked())return;peaceAll(false);save();render()};
H.spoils=(n,m)=>{spoils(n,m);save();render()};
Object.assign(H,{chooser:hchooser,chf:hchf,startAs:hstartAs,wz:hwz,cc:hcc,pick:hpick,ccClose:hccClose,take:htake,auto:hauto,confirm:hconfirm});
H.dictate=(n,m,rid)=>{const w=S.wars.find(x=>x.n===n);if(!w)return;if(!w.won&&w.p<60)return toast('Диктовать условия можно при перевесе на фронте от 60%');if(m==='region'&&!w.won&&w.p<70)return toast('Отторгнуть область можно при перевесе от 70%');if(m==='annex'&&!w.won)return toast('Полный захват — только при полной победе (100%)');if(m==='region'){const Q=quota(n,w);if(!Q.free)return toast('В этой стране не осталось свободных регионов');if(!rid&&regsOf(n))return H.pick(n);const ids=Array.isArray(rid)?rid.slice(0,Q.q):Array.from({length:Q.q},()=>null),pop0=S.pop;ids.forEach((id,k)=>spoils(n,'region',id,k<ids.length-1));S.wars=S.wars.filter(x=>x.n!==n);S.war=S.wars.length>0||!!S.martial;log(`🗺 Итог войны с ${n}: отнято областей — ${ids.length} (фронт ${Math.round(Q.p)}%), население +${fmt(S.pop-pop0)}.`);save();render();return}spoils(n,m,rid);save();render()};
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
const WF={q:'',c:'all',s:'power',n:30};
const SORTS={power:'по мощи',value:'по отношениям',pop:'по населению',name:'по алфавиту'};
function wlFilter(){let a=S.relations.map((r,i)=>[r,i]).filter(x=>!x[0].annexed&&!x[0].self);const q=WF.q.trim().toLowerCase();
 if(q)a=a.filter(x=>x[0].name.toLowerCase().includes(q));
 const c=WF.c;if(c==='war')a=a.filter(x=>S.wars.some(w=>w.n===x[0].name));else if(c==='friend')a=a.filter(x=>x[0].value>10);else if(c==='enemy')a=a.filter(x=>x[0].value<-20);else if(c==='vassal')a=a.filter(x=>S.puppets.includes(x[0].name));else if(c!=='all')a=a.filter(x=>wi(x[0].name).cont===c);
 const f={power:(x,y)=>y[0].power-x[0].power,value:(x,y)=>y[0].value-x[0].value,pop:(x,y)=>(wi(y[0].name).pop||0)-(wi(x[0].name).pop||0),name:(x,y)=>x[0].name.localeCompare(y[0].name,'ru')}[WF.s]||((x,y)=>0);
 return a.sort(f)}
function dipCard(r,i){const W=wi(r.name);return `<div class="mini"><b>${r.name}</b> <span class="muted">${CONTN[W.cont]||''}</span><br><span class="muted">${r.trait||''}</span><br>${mood(r.value)} (${Math.round(r.value)})<div class="bar"><i style="width:${clamp((r.value+100)/2)}%"></i></div>Мощь: ${r.power} · Нас.: ${W.pop>=1?W.pop.toFixed(W.pop>=10?0:1):W.pop} млн · ${resIcons(W.res)}<br><small class="muted">🧠 ${r.intent||''}</small><div class="actions"><button onclick="diplomacy(${i},'talk')">Переговоры · 100</button><button onclick="diplomacy(${i},'trade')">Торговля · 250</button><button onclick="diplomacy(${i},'sanction')">Санкции</button></div></div>`}
function staffCard(r,i){const W=wi(r.name),atWar=S.wars.some(w=>w.n===r.name),j=S.just[r.name];
 let wb=atWar?'<span class="muted">⚔️ Идёт война</span>':j==null?`<button onclick="H.justify(${i})">Обосновать войну · 30 ⭐</button>`:j>0?`<span class="muted">⏳ Обоснование: ${j} мес.</span>`:`<button class="danger" onclick="H.declare(${i})">Объявить войну · 20 ⭐</button>`;
 if(!atWar&&j==null)wb+=` <button class="danger" onclick="H.declare(${i})">Без обоснования (штрафы)</button>`;
 const ib=['prop','sab','steal'].map(k=>{const nm={prop:'Пропаганда · 150',sab:'Диверсия · 350',steal:'Кража чертежей · 500'}[k],cd=cdLeft('in'+k+i);return `<button onclick="H.intel(${i},'${k}')">${cd>0?'⏳ '+cd+' мес.':nm}</button>`}).join('');
 return `<div class="mini"><b>${r.name}</b> <span class="muted">${CONTN[W.cont]||''}</span><br><span class="muted">${r.trait||''}</span><br>${moodT(r.value)} · мощь ${r.power} · ${resIcons(W.res)}<br><small class="muted">🧠 ${r.intent||''}</small>${S.puppets.includes(r.name)?'<br><small>👑 Вассал</small>':''}${(r.regLost||0)?`<br><small>🗺 Отобрано областей: ${r.regLost}</small>`:''}<div class="actions">${wb}</div><div class="actions">${ib}</div></div>`}
function wlCards(kind){const l=wlFilter(),sh=l.slice(0,WF.n);return (sh.length?sh.map(x=>kind==='dip'?dipCard(x[0],x[1]):staffCard(x[0],x[1])).join(''):'<p class="muted">Никого не найдено</p>')+(l.length>sh.length?`<div class="mini" style="display:flex;align-items:center;justify-content:center"><button onclick="H.wf('n',${WF.n+30},'${kind}')">Показать ещё (${l.length-sh.length})</button></div>`:'')}
function wlPanel(kind){const conts=Object.keys(CONTN).map(k=>`<option value="${k}" ${WF.c===k?'selected':''}>${CONTN[k]}</option>`).join(''),spec=[['all','Все страны'],['war','⚔️ В войне'],['friend','🤝 Друзья'],['enemy','😠 Враги'],['vassal','👑 Вассалы']].map(x=>`<option value="${x[0]}" ${WF.c===x[0]?'selected':''}>${x[1]}</option>`).join('');
 return `<div class="wlbar"><input type="search" placeholder="🔍 Поиск страны…" value="${WF.q.replace(/"/g,'&quot;')}" oninput="H.wf('q',this.value,'${kind}')"><select onchange="H.wf('c',this.value,'${kind}')">${spec}<optgroup label="Часть света">${conts}</optgroup></select><select onchange="H.wf('s',this.value,'${kind}')">${Object.keys(SORTS).map(k=>`<option value="${k}" ${WF.s===k?'selected':''}>Сортировка: ${SORTS[k]}</option>`).join('')}</select></div><p class="muted" id="wlcount-${kind}">В мире ${alive().length} государств</p><div class="cards" id="wl-${kind}">${wlCards(kind)}</div>`}
H.wf=(k,v,kind)=>{WF[k]=v;if(k!=='n')WF.n=30;const e=document.getElementById('wl-'+kind);if(e)e.innerHTML=wlCards(kind)};
const moodT=v=>v>40?'🤝 Друг':v>10?'🙂 Дружелюбен':v>-20?'😐 Нейтрален':v>-50?'🧊 Холоден':'😠 Враждебен';
function staffTab(){
 let h='';
 h+=card('⚔️ Фронты',S.wars.length?warBoard()+`<div class="actions"><button class="danger" onclick="H.peace()">Заключить мир со всеми</button></div><p class="muted">Сила армии: <b>${fmt(warPower())}</b>. Исход зависит от численности, вооружения, подготовки, духа, технологий, доктрины, снабжения и помощи вассалов.</p>`:'<p>Сейчас мы не воюем. '+(S.martial?'Введено военное положение.':'')+'</p>');
 h+=card('🌍 Страны: война и разведка',wlPanel('staff')+`<p class="muted">Шанс разведопераций: ${Math.round((.55+techSum('intel')+advSum('intel')+(S.flags.intel?.15:0))*100)}%. Объявление войны без обоснования: одобрение −8, легитимность −6, отношения −8. Не больше двух войн одновременно.</p>`);
 h+=card('📜 Законы',`<p class="muted">Меняются по одной ступени, раз в 4 месяца. Снижение стоит 20 ⭐.</p><h3>Экономика</h3><div class="cards">${ECOO.map(k=>{const L=ECOL[k],cur=S.law.eco===k,ok=!L.need||L.need();return `<div class="mini ${cur?'party-card':''}"><b>${L.n}</b><small>${L.t}</small><div class="actions">${cur?'<span class="muted">✅ Действует</span>':`<button class="${ok?'primary':''}" onclick="H.law('eco','${k}')">${ok?`${L.pp} ⭐`:'🔒 '+L.why}</button>`}</div></div>`}).join('')}</div><h3>Призыв</h3><div class="cards">${CONO.map(k=>{const L=CONS[k],cur=S.law.con===k,ok=!L.need||L.need();return `<div class="mini ${cur?'party-card':''}"><b>${L.n}</b><small>${L.t}</small><div class="actions">${cur?'<span class="muted">✅ Действует</span>':`<button class="${ok?'primary':''}" onclick="H.law('con','${k}')">${ok?`${L.pp} ⭐`:'🔒 '+L.why}</button>`}</div></div>`}).join('')}</div>`);
 return `<div class="grid">${h}</div>`;
}
function indTab(){
 const L=ECOL[S.law.eco]||ECOL.civ;
 let h=card('🏭 Промышленность',`<div class="cards"><div class="mini">Гражданские заводы<b>${S.civ}</b>доход ${incFlat()>=0?'+':''}${incFlat()} млн/мес относительно базы</div><div class="mini">Военные заводы<b>${S.mil}</b>выпуск ×${(L.out*(1+techSum('mo')+advSum('mo'))).toFixed(2)}</div><div class="mini">Верфи<b>${S.dock}</b>флот: ${S.navy}</div><div class="mini">Слоты стройки<b>${S.build.length} / ${bslotsN()}</b></div></div><p class="muted">Военные заводы расходуют сталь и дают вооружение и боеприпасы. Закон экономики влияет на выпуск и доход. Стройка стоит денег сразу. Заводы строятся около года, остальные объекты — от 4 до 12 месяцев. Военные объекты (бункеры, ПВО, госпитали, аэродромы, базы, ракетные шахты) строятся только на войне.</p>`);
 h+=card('🏗 Очередь строительства',S.build.length?`<div class="cards">${S.build.filter(b=>BUILD[b.t]).map(b=>`<div class="mini party-card"><b>${BUILD[b.t].ic} ${BUILD[b.t].n}</b>осталось ${b.left} мес.<div class="bar"><i style="width:${Math.max(0,Math.min(100,(1-b.left/(b.m||BUILD[b.t].m))*100))}%"></i></div></div>`).join('')}</div>`:'<p>Очередь пуста.</p>');
 h+=card('🏭 Построенные объекты',`<div class="cards">${Object.keys(BUILD).filter(k=>bcount(k)>0).map(k=>`<div class="mini"><b>${BUILD[k].ic} ${BUILD[k].n}</b>${bcount(k)} шт.</div>`).join('')||'<p class="muted">Пока нет особых объектов — стройте электростанции, порты, больницы и военные базы.</p>'}</div>`);
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
 return `<div class="grid">${card('👥 Настроение групп',`<div class="cards">${Object.keys(GR).map(k=>`<div class="mini"><b>${GR[k][1]} ${GR[k][0]}</b>${bar('Довольны',S.gr[k])}</div>`).join('')}</div><p class="muted">Группы реагируют на экономику, законы, бюджет и решения. Ниже 25% — протесты, выше 75% — легитимность растёт.</p>`)}${window.PopAI?card('🧠 Население учится',PopAI.panel(S)):''}${card('💬 Что говорят люди',feedHtml())}${card('Настроение страны',bar('Одобрение',S.approval)+bar('Стабильность',S.stability)+`<p class="muted">Недовольство регионов: ${S.regions.map(r=>`${r.name} ${Math.round(r.unrest)}%`).join(' · ')}</p>`)}</div>`;
}

/* ------------------------ РЫНОК ------------------------ */
const MK={food:['Еда','🌾',45],fuel:['Топливо','⛽',40],steel:['Сталь','🔩',40],energy:['Энергия','⚡',50],equipment:['Вооружение','🔫',35],ammo:['Боеприпасы','💥',30]};
const mkMod=g=>{let m=S.mk.m[g];if(S.war&&['fuel','ammo','equipment'].includes(g))m*=1.25;m*=1+clamp((50-S.trust)*.003,-.1,.15);const al=alive(),ar=al.length?al.reduce((a,r)=>a+r.value,0)/al.length:0;return m*(1-clamp(ar,-40,40)*.0008)};
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
 return `<div class="grid"><section class="panel wide"><h2>🌍 Мировая напряжённость</h2><p class="muted">Общий индикатор того, насколько международная обстановка близка к большой войне. Он рассчитывается по войнам, угрозам, агрессивности государств и дипломатическим отношениям.</p><div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin:16px 0"><div style="font:700 54px/1 'Oswald',sans-serif;color:${stage[2]}">${v}%</div><div style="flex:1;min-width:180px"><b style="font-size:20px;color:${stage[2]}">${stage[0]}</b><div class="muted">${stage[1]}</div></div></div><div style="height:18px;background:#1b2730;border:1px solid #53616a;border-radius:3px;overflow:hidden"><div style="height:100%;width:${v}%;background:linear-gradient(90deg,#4ba77a 0%,#b2a34e 40%,#d18a3b 65%,#c83f4b 100%);transition:width .3s"></div></div><div class="row" style="justify-content:space-between;font-size:12px;color:#9caab2"><span>Мир</span><span>Кризис</span><span>Глобальная война</span></div></section>${card('📊 Факторы напряжённости',`<div class="cards">${factors.map(x=>`<div class="mini"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div>`)}${card('⚔️ Активные конфликты',wars)}${card('🚨 Наиболее напряжённые отношения',enemies)}${card('Как меняется показатель',`<p class="muted">Напряжённость растёт при начале войн, усилении военной угрозы и ухудшении отношений. Снижается постепенно, когда угрозы уходят и дипломатия стабилизируется. Это игровой индикатор, а не реальная статистика.</p><div class="mini"><b>Состояние вашей страны</b>${bar('Военная угроза',S.threat)}${bar('Стабильность',S.stability)}<small>Активные войны: ${(S.wars||[]).length} · Военное положение: ${S.martial?'введено':'не введено'}</small></div>`)}</div>`;
}
function marketTab(){
 const cost=g=>mkBuy(g),tr=g=>{const d=S.mk.m[g]-(S.mk.prev[g]||S.mk.m[g]);return Math.abs(d)<.005?'▬':d>0?'<span class="fxb">▲</span>':'<span class="fxg">▼</span>'};
 return `<div class="grid">${card('💱 Экспорт и импорт ресурсов',`<p class="muted">Покупай нехватающие ресурсы (импорт) и продавай излишки (экспорт). Цены колеблются, растут в войну и при низком доверии рынков, дешевеют при хороших отношениях. Лимит — 30 единиц каждого ресурса за месяц. Импорт — покупка ресурса, экспорт — продажа излишков. Баланс торговли: экспорт <b>${fmt(S.mk.exp)}</b> · импорт <b>${fmt(S.mk.imp)}</b> млн.</p><div class="cards">${Object.keys(MK).map(g=>`<div class="mini"><b>${MK[g][1]} ${MK[g][0]} ${tr(g)}</b>${bar('Запас',S[g])}<small>Импорт (купить): <b>${mkBuy(g)}</b> млн/ед.<br>Экспорт (продать): <b>${mkSell(g)}</b> млн/ед.<br>Лимит на месяц: ${S.mk.q[g]}</small><div class="actions mkact"><button class="primary" onclick="H.mkBuy('${g}',5)">Импорт 5</button><button class="primary" onclick="H.mkBuy('${g}',15)">Импорт 15</button><button onclick="H.mkSell('${g}',5)">Экспорт 5</button><button onclick="H.mkSell('${g}',15)">Экспорт 15</button></div></div>`).join('')}</div>`)}</div>`;
}
const SEA=`<text x="330" y="500" text-anchor="middle" class="maptxt2" style="opacity:.55">ЧЁРНОЕ МОРЕ</text><text x="640" y="430" text-anchor="middle" class="maptxt2" style="opacity:.55">Азовское</text>`;

function hoiTab(){
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
 budTick();taxTick();billsTick();grTick();mkTick();prodTick();buildTick();focusTick();researchTick();justTick();warTick();puppetTick();worldTick();if(window.NGRES)NGRES.tick();
 S.war=S.wars.length>0||!!S.martial;
 if(!S.war)S.threat=clamp(S.threat+(20-S.threat)*.03);
 clampFix();
 evTick();
}

/* ===== МУЛЬТИПЛЕЕР: точка входа для nations.js ===== */
const MPSTART={story:{money:26000,approval:72,stability:78,sup:[42,22,19,17]},easy:{money:22000,approval:67,stability:73,sup:[38,23,20,19]},hard:{money:14500,approval:54,stability:59,sup:[30,28,22,20]},expert:{money:10500,approval:47,stability:50,sup:[29,27,24,20]}};
function mpFresh(diff,name){S=initial();ensure();S.difficulty=DIFFICULTIES[diff]?diff:'normal';const m=MPSTART[S.difficulty];if(m){S.money=m.money;S.approval=m.approval;S.stability=m.stability;m.sup.forEach((v,i)=>S.parties[i].support=v)}if(name)S.name=String(name).slice(0,28);S.history=[];S.history.push(snap())}
/* ================= ВАЛЮТА · ПОТЕРИ ВОЙНЫ · НОВЫЕ ГРАФИКИ (v2) ================= */
const okn=v=>typeof v==='number'&&isFinite(v);
function fxCode(){const w=S.me&&WM[S.me];return w&&w.iso&&window.FXD?FXD.cur(w.iso):'NVT'}
function fxReal(c){const g=window.FXD&&FXD.get(c);return g?g.v:1}
function fxEnsure(){
 const me=S.me||'',cur=fxCode();
 if(!S.fx||S.fx.me!==me||S.fx.cur!==cur){
  const ref=cur==='USD'?'EUR':'USD',refB=(cur==='EUR'||ref==='EUR')?'GBP':'EUR';
  const b=cur==='NVT'?36:fxReal(cur)/fxReal(ref);
  S.fx={me,cur,ref,refB,base:b,base0:b,rate:b,mom:0,shock:0,lastAlert:-99};S.econ=null;
 }
 if(!S.econ)S.econ={pg:S.gdp,last:S.gdp,tr:.002,loss:0,tax:0,gap:0,lossPct:0,peak:0,drag:0,wm:0,war0:null};
}
const fxB=()=>{const F=S.fx;return F.rate*fxReal(F.ref)/fxReal(F.refB)};
function fxMarket(){const F=S.fx;return F.cur==='NVT'?null:fxReal(F.cur)/fxReal(F.ref)}
function fxShock(p){fxEnsure();const F=S.fx;F.base*=1+p*.8;F.rate*=1+p}
function fxRebase(){
 try{
  if(!S.fx||S.fx.cur==='NVT')return;const F=S.fx;
  if((S.history||[]).length>3||(S.wars||[]).length||F.moved)return;
  const nb=fxReal(F.cur)/fxReal(F.ref),k=nb/F.base;if(!isFinite(k)||Math.abs(k-1)<1e-6)return;
  F.base*=k;F.base0*=k;F.rate*=k;
  (S.history||[]).forEach(p=>{if(okn(p.fxA))p.fxA*=k;if(okn(p.fxB))p.fxB*=k});
 }catch(e){}
}
const avgReg=k=>(S.regions||[]).reduce((a,r)=>a+(+r[k]||0),0)/Math.max(1,(S.regions||[]).length);
/* --- потери экономики во время войны --- */
function econWarTick(){
 const E=S.econ,t=S.year*12+S.month,ws=S.wars||[],atWar=ws.length>0;
 // Экономика противника: игровая оценка, привязанная к ходу войны.
 // Индексы начинаются со 100; это не реальные статистические данные стран.
 ws.forEach(w=>{
  if(!w.enemyEcon) w.enemyEcon={gdp:100,fx:100,damage:0,months:0};
  const q=w.enemyEcon,progress=clamp((+w.p||0)/100,0,1);
  const enc=clamp(+w.encirclement||0,0,5);
  const gdpDrop=Math.min(.018,.0025+.006*progress+.001*enc);
  const fxRise=Math.min(.035,.003+.009*progress+.002*enc);
  q.gdp=Math.max(20,q.gdp*(1-gdpDrop));
  q.fx=Math.min(500,q.fx*(1+fxRise));
  q.damage=100-q.gdp;
  q.months=(q.months||0)+1;
 });
 if(atWar&&(!E.war0||E.war0.over)){
  E.war0={t,gdp:S.gdp,infra:avgReg('infra'),ind:avgReg('industry'),emp:S.employment,infl:S.inflation,rate:S.fx.rate,pop:S.pop,army:S.army,tax:S.tax,sold:S.warSold||0,civ:S.warCiv||0};
  E.loss0=E.loss;E.tax0=E.tax;E.peak=0;
  log('📉 Начат учёт экономических потерь войны (вкладка «Графики» → «Война и экономика»).');
 }
 if(!atWar&&E.war0&&!E.war0.over){E.war0.over=true;E.war0.end=t;E.war0.endGdp=S.gdp;E.war0.endRate=S.fx.rate;
  S.fx.base*=1+Math.max(0,S.fx.rate/S.fx.base-1)*.5;
  log(`📊 Война окончена. ВВП ниже довоенной траектории на ${E.lossPct.toFixed(1)}%, накопленные потери выпуска ≈ ${fmt(E.loss-(E.loss0||0))} млрд.`)}
 const post=!!(E.war0&&E.war0.over&&t-E.war0.end<=36);
 if(!atWar&&!post&&E.last>0){const g=S.gdp/E.last-1;if(okn(g))E.tr=clamp(E.tr*.85+g*.15,-.004,.012)}
 let drag=0;
 if(atWar){
  ws.forEach(w=>{drag+=.003+.004*(1-clamp(w.p,0,100)/100)+.001*(w.encirclement||0)});
  drag+=.004*Math.max(0,S.army/Math.max(1,S.pop)*100-.8);
  if(S.energy<30)drag+=.001;if(S.fuel<25)drag+=.001;
  drag=Math.min(.022,drag);
  S.gdp=Math.max(100,S.gdp*(1-drag));E.wm=(E.wm||0)+1;
 }else if(post&&E.pg>S.gdp*1.012&&S.stability>30){
  S.gdp*=1+Math.min(.006,(E.pg/S.gdp-1)*.05);
 }
 E.drag=drag;
 if(atWar||(post&&S.gdp<E.pg*.985))E.pg=Math.max(S.gdp,E.pg*(1+E.tr));else E.pg=S.gdp;
 const gap=Math.max(0,E.pg-S.gdp);
 E.gap=gap;E.lossPct=E.pg>0?gap/E.pg*100:0;E.peak=Math.max(E.peak||0,E.lossPct);
 E.loss+=gap/12;E.tax+=gap*S.tax/100/12*1.12;E.last=S.gdp;
}
/* --- курс национальной валюты --- */
function fxStress(){
 const g=Math.max(1,S.gdp),E=S.econ,ws=S.wars||[];let x=0;
 x+=.020*Math.max(0,S.inflation-6);
 x+=.008*Math.max(0,60-(S.trust==null?70:S.trust));
 x+=.5*Math.max(0,S.debt/g-.15);
 if(S.money<500)x+=.08;
 x+=.006*Math.max(0,50-S.stability);
 x+=.002*Math.max(0,S.threat-40);
 ws.forEach(w=>{x+=.10+.12*(1-clamp(w.p,0,100)/100)+.02*(w.encirclement||0)});
 x+=.010*Math.max(0,E.lossPct||0);
 x+=Math.min(.05,Object.keys(S.restr||{}).length*.01);
 x-=.003*Math.max(0,S.stability-70)+.002*Math.max(0,(S.trust==null?70:S.trust)-75);
 return clamp(x,-.12,1.6,1.6);
}
function fxTick(){
 fxEnsure();econWarTick();
 const F=S.fx,prev=F.rate,t=S.year*12+S.month;
 let r=prev+(F.base*Math.exp(fxStress())-prev)*.16;
 r*=Math.exp(rnd(-.006,.006)*(1+((S.wars||[]).length?1.2:0)));
 r=Math.max(F.base0*.5,r);
 F.rate=r;F.mom=(r/prev-1)*100;if(Math.abs(r/F.base0-1)>.02)F.moved=1;
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
const CHU={g:'econ',p:'all',m:'auto',h:{},hov:{},reg:{}};
function chGroups(){
 const F=S.fx||{cur:'—',ref:'USD',refB:'EUR'},cur=F.cur,ref=F.ref,rb=F.refB;
 return[
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
 if(gid==='econ'){
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
  const g=chGroups().find(z=>z.id===gid),s=g.charts[0].s.slice(0,4);
  k=s.map(z=>{const a=okn(F0[z.k])?F0[z.k]:null,b=okn(L[z.k])?L[z.k]:null,d=dlt(a,b,z.bad);return kpi(z.n,okn(b)?nf(b,z.d,z.u)+(z.u||''):'—','с начала '+d[0],d[1])});
 }
 return `<div class="kpis">${k.join('')}</div>`;
}
function fxRate(v){return v>=1000?fmt(v):v>=100?v.toFixed(1):v>=10?v.toFixed(2):v.toFixed(4)}
function chFxExtra(){
 const F=S.fx,st=FXD.status(),codes=[...FXD.KEY];if(F.cur!=='NVT'&&!codes.includes(F.cur))codes.unshift(F.cur);
 const rows=codes.map(c=>{const g=FXD.get(c);if(!g)return'';return `<tr class="${c===F.cur?'me':''}"><td><b>${c}</b> <span class="muted">${FXD.name(c)}</span></td><td class="r">${fxRate(g.v)}${g.src==='approx'?' ≈':''}</td></tr>`}).join('');
 const m=fxMarket();
 return card('🌍 Реальные курсы валют мира',`<p class="chnote">${st.txt}</p>${m?`<p>Ваша валюта <b>${F.cur}</b>: рынок — 1 ${F.ref} = <b>${fxRate(m)}</b>, в игре сейчас — <b>${fxRate(F.rate)}</b> (${pct((F.rate/m-1)*100)}).</p>`:'<p class="muted">Новария — вымышленное государство, её валюта (талер) в реальном мире не торгуется; реальные курсы ниже даны для сравнения.</p>'}<div style="overflow:auto"><table class="fxt"><tr><th>Валюта</th><th style="text-align:right">за 1 USD</th></tr>${rows}</table></div><p class="chnote">≈ — приблизительное значение (нет в снимке рынка); при подключении к интернету курсы обновляются автоматически.</p><button onclick="fxRefresh()">🔄 Обновить курсы</button>`);
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
 ${chKpis(g.id)}<div class="grid">${g.charts.map((c,i)=>chCard(c,g.id+i)).join('')}</div>${g.extra==='fx'?chFxExtra():''}${g.extra==='war'?chWarExtra():''}</div>`;
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
  return card('💱 Валюта',`<p>1 ${F.ref} = <b>${fxRate(F.rate)} ${F.cur}</b> <span class="${d>0?'dn':'up'}">${pct(d)} с начала игры</span>${(S.wars||[]).length?' · <span class="dn">война давит на курс</span>':''}</p>${m?`<p class="muted">Реальный рынок: 1 ${F.ref} = ${fxRate(m)} ${F.cur}</p>`:''}<button onclick="chGo('fx')">📈 Графики валюты</button> <button onclick="chGo('war')">⚔️ Потери войны</button>`)}catch(e){return''}
}
/* курсы: онлайн-обновление при запуске */
try{if(window.FXD)FXD.fetchLive(ok=>{if(ok){fxRebase();if(tab==='charts'||tab==='finance')render(true)}})}catch(e){}

window.NG={
 get S(){return S},
 begin(diff,name){NG._bak=NG._bak||S;window.__NG_MP=1;pause();mpFresh(diff,name);tab='overview';render()},
 end(){window.__NG_MP=0;pause();if(NG._bak){S=NG._bak;NG._bak=null}tab='overview';render()},
 load(o){NG._bak=NG._bak||S;window.__NG_MP=1;pause();S={...initial(),...o};ensure();tab='overview';render()},
 tick(){monthTick()},
 gainRegion(r){S.captured=S.captured||[];S.captured.push({name:r.name,from:r.from,pop:r.pop,full:!!r.full});S.regions.push({name:r.name,pop:r.pop,wealth:r.wealth||40,loyalty:30,unrest:40,industry:r.industry||36,infra:r.infra||34,resource:r.resource||'Захвачено',captured:true,from:r.from});S.pop+=r.pop;S.gdp+=r.gdp||0;ch({stability:-3,threat:5},false)},
 loseRegion(name,share){if(S.regions.length<=1)return;const i=S.regions.findIndex(x=>x.name===name);if(i<0)return;const r=S.regions[i];S.regions.splice(i,1);S.pop=Math.max(100000,S.pop-r.pop);S.gdp=Math.max(100,S.gdp*(1-(share||0)));S.captured=(S.captured||[]).filter(z=>z.name!==name);if(!r.captured){S.lost=S.lost||[];S.lost.push(name)}ch({approval:-6,stability:-4,legitimacy:-3},false)},
 render,stats,toast,log,say,clamp,fmt,ch,snap,pause,
 income,expenses,myPower,warPower,months,
 setTab(t){tab=t;render()},
 getTab:()=>tab,
 sumHtml:{bar}
};

ensure();if(window.NationsAI)NationsAI.init(S);render();})();
