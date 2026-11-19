/* Города на карте мира — реальная застройка, а не значок.
   Размер города задан в единицах карты (зависит от числа жителей), поэтому при приближении он растёт вместе с картой:
   сначала пятно, потом улицы и кварталы, вблизи — отдельные дома, парки, воронки, огонь.
   Чем сильнее разрушения, тем меньше целых домов: руины, воронки, гарь, пожары.
   Производительность: символы строятся лениво (только нужные), на карте — <use>; рисуются только города в кадре,
   достаточно крупные на экране; при панорамировании ничего не перерисовывается, пока набор видимых городов не изменился. */
(()=>{
'use strict';
const LEVELS=6,VARIANTS=6,LV_NAME=['цел','мелкие повреждения','заметные разрушения','тяжёлые разрушения','почти уничтожен','руины'];
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const f=n=>(Math.round(n*100)/100).toString();
const ROOF=['#c9c1b0','#b3ab9b','#d8d0bf','#a39b8c','#bdb4a2','#cfa98a','#9aa3a8'];
const FATE=[0,.08,.22,.42,.68,.93]; /* доля уничтоженных домов по уровням */

const LAY={};
function layout(v){
  if(LAY[v])return LAY[v];
  const R=rng(v*7919+13),ang=(R()-.5)*50,blob=[];
  for(let i=0;i<16;i++){const a=i/16*6.2832,r=8.1+R()*1.5;blob.push([Math.cos(a)*r,Math.sin(a)*r*.88])}
  const parks=[];for(let i=0;i<3;i++){const x=(R()-.5)*11,y=(R()-.5)*9,r=1.4+R()*1.6;parks.push([x,y,r])}
  const rd=[(R()-.5)*3,(R()-.5)*3,(R()-.5)*3,(R()-.5)*3],b=[];
  for(let i=0;i<38;i++){
    const a=R()*6.2832,r=Math.pow(R(),.8)*7.4,x=Math.cos(a)*r,y=Math.sin(a)*r*.86,w=1.1+R()*1.7,h=1.1+R()*1.5,c=ROOF[Math.floor(R()*ROOF.length)],fate=R(),j=R();
    b.push({x,y,w,h,c,fate,j})}
  return LAY[v]={ang,blob,parks,rd,b}}
const blobPath=(L,lv)=>`<path d="M${L.blob.map(p=>f(p[0])+' '+f(p[1])).join('L')}Z" fill="${lv>=4?'#3a352d':'#434d3c'}" stroke="#e9e3cf" stroke-opacity=".65" stroke-width=".55"/>`;
/* подробный символ (город крупный на экране) */
function buildHigh(v,lv){
  const L=layout(v),ang=L.ang,o=[blobPath(L,lv)];
  L.parks.forEach(q=>o.push(`<ellipse cx="${f(q[0])}" cy="${f(q[1])}" rx="${f(q[2])}" ry="${f(q[2]*.8)}" fill="${lv>=3?'#4a4a3a':'#4f6e46'}" opacity=".85"/>`));
  o.push(`<g transform="rotate(${f(ang)})" stroke="${lv>=4?'#6d665b':'#a2a299'}" stroke-width=".55" stroke-linecap="round" fill="none"><path d="M-9 ${f(L.rd[0])}L9 ${f(L.rd[1])}M${f(L.rd[2])} -9L${f(L.rd[3])} 9"/><path d="M-6 -6L6 6" stroke-width=".35"/><ellipse rx="5.2" ry="4.4" stroke-width=".3"/></g>`);
  const bs=[];
  L.b.forEach(q=>{
    const dead=q.fate<FATE[lv],hurt=!dead&&q.fate<FATE[lv]+.22&&lv>=1;
    if(dead){
      bs.push(`<g transform="translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.j*70)})"><polygon points="${f(-q.w*.5)},${f(-q.h*.3)} ${f(q.w*.2)},${f(-q.h*.5)} ${f(q.w*.5)},${f(q.h*.2)} ${f(-q.w*.2)},${f(q.h*.5)}" fill="#2b2622"/><circle cx="${f(q.w*.15)}" cy="${f(q.h*.1)}" r=".28" fill="#7a7063"/><circle cx="${f(-q.w*.25)}" cy="${f(-q.h*.05)}" r=".2" fill="#5c5348"/></g>`)
    }else{
      bs.push(`<g transform="translate(${f(q.x)} ${f(q.y)}) rotate(${f(ang+(q.j>.5?0:8))})"><rect x="${f(-q.w/2+.3)}" y="${f(-q.h/2+.3)}" width="${f(q.w)}" height="${f(q.h)}" fill="#000" opacity=".4"/><rect x="${f(-q.w/2)}" y="${f(-q.h/2)}" width="${f(q.w)}" height="${f(q.h)}" fill="${hurt?'#6e6258':q.c}"/>${hurt?`<path d="M${f(-q.w/2)} ${f(-q.h/4)}L${f(q.w/4)} ${f(q.h/2)}" stroke="#1f1b17" stroke-width=".28"/>`:''}</g>`)}});
  o.push(bs.join(''));
  const R2=rng(v*104729+7);
  if(lv>=3)for(let i=0;i<lv*1.5;i++){const x=(R2()-.5)*13,y=(R2()-.5)*11,r=1.6+R2()*2.2;o.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r*.75)}" fill="#000" opacity=".34"/>`)}
  if(lv>=2)for(let i=0;i<lv*2;i++){const x=(R2()-.5)*14,y=(R2()-.5)*12,r=.7+R2()*1.0;o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#1b1814" stroke="#7b6a55" stroke-width=".28"/>`)}
  if(lv>=3){const n=lv-2;for(let i=0;i<n*2;i++){const x=(R2()-.5)*11,y=(R2()-.5)*9;
    if(lv>=4)o.push(`<circle class="cs-fire" cx="${f(x)}" cy="${f(y)}" r=".7" fill="#ff7a1a"/><circle class="cs-fire2" cx="${f(x)}" cy="${f(y)}" r=".3" fill="#ffe08a"/>`);
    o.push(`<circle class="cs-smoke" cx="${f(x+.8)}" cy="${f(y-1.6)}" r="${f(1.3+R2()*1.2)}" fill="#bfbab2" opacity=".3"/>`)}}
  return o.join('')}
/* средний символ: всё склеено в несколько <path>, мало элементов */
const ell=(x,y,rx,ry)=>`M${f(x-rx)} ${f(y)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2*rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2*rx)} 0`;
function buildMid(v,lv){
  const L=layout(v),ang=L.ang,o=[blobPath(L,lv)];
  o.push(`<path d="${L.parks.map(q=>ell(q[0],q[1],q[2],q[2]*.8)).join('')}" fill="${lv>=3?'#4a4a3a':'#4f6e46'}" opacity=".85"/>`);
  o.push(`<path transform="rotate(${f(ang)})" d="M-9 ${f(L.rd[0])}L9 ${f(L.rd[1])}M${f(L.rd[2])} -9L${f(L.rd[3])} 9M-6 -6L6 6" stroke="${lv>=4?'#6d665b':'#a2a299'}" stroke-width=".5" fill="none"/>`);
  const quad=(q,w,h,deg,dx)=>{const t=deg*Math.PI/180,c=Math.cos(t),s=Math.sin(t);return 'M'+[[-w,-h],[w,-h],[w,h],[-w,h]].map(p=>f(q.x+dx+p[0]*c-p[1]*s)+' '+f(q.y+dx+p[0]*s+p[1]*c)).join('L')+'Z'};
  const sh=[],ok={},hurt=[],dead=[];
  L.b.forEach(q=>{
    const isDead=q.fate<FATE[lv],isHurt=!isDead&&q.fate<FATE[lv]+.22&&lv>=1;
    if(isDead){dead.push(quad(q,q.w*.45,q.h*.35,q.j*70,0));return}
    const deg=ang+(q.j>.5?0:8);sh.push(quad(q,q.w/2,q.h/2,deg,.3));
    if(isHurt)hurt.push(quad(q,q.w/2,q.h/2,deg,0));else(ok[q.c]=ok[q.c]||[]).push(quad(q,q.w/2,q.h/2,deg,0))});
  o.push(`<path d="${sh.join('')}" fill="#000" opacity=".4"/>`);
  Object.keys(ok).forEach(c=>o.push(`<path d="${ok[c].join('')}" fill="${c}"/>`));
  if(hurt.length)o.push(`<path d="${hurt.join('')}" fill="#6e6258"/>`);
  if(dead.length)o.push(`<path d="${dead.join('')}" fill="#2b2622"/>`);
  const R2=rng(v*104729+7);
  if(lv>=3){let d='';for(let i=0;i<lv*1.5;i++){const x=(R2()-.5)*13,y=(R2()-.5)*11,r=1.6+R2()*2.2;d+=ell(x,y,r,r*.75)}o.push(`<path d="${d}" fill="#000" opacity=".34"/>`)}
  if(lv>=2){let d='';for(let i=0;i<lv*2;i++){const x=(R2()-.5)*14,y=(R2()-.5)*12,r=.7+R2()*1.0;d+=ell(x,y,r,r)}o.push(`<path d="${d}" fill="#1b1814" stroke="#7b6a55" stroke-width=".28"/>`)}
  if(lv>=3){let fire='',smoke='';const n=lv-2;for(let i=0;i<n*2;i++){const x=(R2()-.5)*11,y=(R2()-.5)*9;
    if(lv>=4)fire+=ell(x,y,.8,.8);smoke+=ell(x+.8,y-1.6,1.3+R2()*1.2,1.3)}
    if(fire)o.push(`<path d="${fire}" fill="#ff7a1a"/>`);o.push(`<path d="${smoke}" fill="#bfbab2" opacity=".3"/>`)}
  return o.join('')}
/* самый простой символ: город очень мелкий на экране — пятно застройки и след разрушений */
function buildLow(v,lv){
  const L=layout(v),o=[blobPath(L,lv)];
  o.push(`<path transform="rotate(${f(L.ang)})" d="${ell(0,0,5.6,4.6)}" fill="${lv>=4?'#5a5046':'#9a9486'}" opacity=".6"/>`);
  if(lv>=3)o.push(`<path d="${ell(-1.5,1,1.6+lv*.4,1.6+lv*.4)}" fill="${lv>=4?'#ff7a1a':'#2b2622'}" opacity=".85"/>`);
  return o.join('')}
const BUILDERS=[buildLow,buildMid,buildHigh];
const build=(v,lv,tier)=>BUILDERS[tier==null?2:tier](v,lv);
let DEFSEL=null;const DONE=new Set();
function ensure(layer,tier,lv,v){
  const id='cs-'+tier+'-'+lv+'-'+v;if(DONE.has(id))return id;
  if(!DEFSEL||!DEFSEL.isConnected)DEFSEL=layer.querySelector('#csd');
  if(!DEFSEL)return id;
  DEFSEL.insertAdjacentHTML('beforeend','<g id="'+id+'">'+build(v,lv,tier)+'</g>');DONE.add(id);return id}
const defs=()=>'';
const level=c=>c>=90?0:c>=75?1:c>=55?2:c>=35?3:c>=15?4:5;
const hash=s=>{let h=0;s=String(s);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h};
const ref=(cond,id,tier)=>'#cs-'+(tier==null?2:tier)+'-'+level(cond)+'-'+(hash(id)%VARIANTS);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- города внутри областей: сколько, как называются, какого размера ---------- */
const DICT=`Харьковская=Харьков,Изюм,Купянск,Лозовая,Балаклея;Луганская=Луганск,Северодонецк,Лисичанск,Алчевск,Сватово;Донецкая=Донецк,Мариуполь,Краматорск,Славянск,Бахмут;Запорожская=Запорожье,Мелитополь,Бердянск,Энергодар,Токмак;Одесская=Одесса,Измаил,Черноморск,Белгород-Днестровский,Подольск;Николаевская=Николаев,Первомайск,Вознесенск,Южноукраинск,Очаков;Херсонская=Херсон,Новая Каховка,Скадовск,Геническ,Каховка;Крым=Симферополь,Севастополь,Керчь,Ялта,Феодосия;Крымская=Симферополь,Севастополь,Керчь,Ялта,Феодосия;Киевская=Киев,Белая Церковь,Бровары,Ирпень,Бородянка;Днепропетровская=Днепр,Кривой Рог,Каменское,Никополь,Павлоград;Львовская=Львов,Дрогобыч,Червоноград,Стрый,Самбор;Волынская=Луцк,Ковель,Нововолынск;Ровенская=Ровно,Дубно,Острог,Сарны;Закарпатская=Ужгород,Мукачево,Берегово,Хуст;Ивано-Франковская=Ивано-Франковск,Калуш,Коломыя,Надворная;Тернопольская=Тернополь,Чортков,Кременец;Черновицкая=Черновцы,Хотин,Новоселица;Хмельницкая=Хмельницкий,Каменец-Подольский,Шепетовка;Житомирская=Житомир,Бердичев,Коростень,Новоград-Волынский;Черниговская=Чернигов,Нежин,Прилуки,Новгород-Северский;Сумская=Сумы,Конотоп,Шостка,Ахтырка;Винницкая=Винница,Жмеринка,Могилёв-Подольский,Тульчин;Черкасская=Черкассы,Умань,Смела,Золотоноша;Полтавская=Полтава,Кременчуг,Миргород,Лубны;Кировоградская=Кропивницкий,Александрия,Светловодск,Знаменка;Москва=Москва,Зеленоград,Троицк;Московская=Подольск,Балашиха,Химки,Королёв,Мытищи;Санкт-Петербург=Санкт-Петербург,Колпино,Кронштадт;Ленинградская=Гатчина,Выборг,Тосно,Кириши;Калининградская=Калининград,Советск,Черняховск,Балтийск;Карелия=Петрозаводск,Кондопога,Сортавала;Мурманская=Мурманск,Апатиты,Мончегорск,Североморск;Архангельская=Архангельск,Северодвинск,Котлас;Коми=Сыктывкар,Ухта,Воркута;Вологодская=Вологда,Череповец,Великий Устюг;Новгородская=Великий Новгород,Боровичи;Псковская=Псков,Великие Луки;Тверская=Тверь,Ржев,Вышний Волочёк;Смоленская=Смоленск,Вязьма,Рославль;Брянская=Брянск,Клинцы,Новозыбков;Калужская=Калуга,Обнинск,Малоярославец;Тульская=Тула,Новомосковск,Донской;Рязанская=Рязань,Касимов,Скопин;Владимирская=Владимир,Муром,Ковров;Ярославская=Ярославль,Рыбинск,Углич;Ивановская=Иваново,Кинешма,Шуя;Нижегородская=Нижний Новгород,Дзержинск,Арзамас;Курская=Курск,Железногорск,Щигры;Белгородская=Белгород,Старый Оскол,Шебекино,Валуйки;Воронежская=Воронеж,Борисоглебск,Россошь;Ростовская=Ростов-на-Дону,Таганрог,Шахты,Волгодонск;Краснодарский=Краснодар,Сочи,Новороссийск,Армавир;Волгоградская=Волгоград,Волжский,Камышин;Самарская=Самара,Тольятти,Сызрань;Саратовская=Саратов,Энгельс,Балаково;Свердловская=Екатеринбург,Нижний Тагил,Каменск-Уральский;Новосибирская=Новосибирск,Бердск,Искитим;Татарстан=Казань,Набережные Челны,Нижнекамск;Башкортостан=Уфа,Стерлитамак,Салават;Челябинская=Челябинск,Магнитогорск,Златоуст;Пермский=Пермь,Березники,Соликамск;Красноярский=Красноярск,Норильск,Ачинск;Приморский=Владивосток,Находка,Уссурийск;Бавария=Мюнхен,Нюрнберг,Аугсбург,Регенсбург,Вюрцбург;Баден-Вюртемберг=Штутгарт,Карлсруэ,Мангейм,Фрайбург,Ульм;Северный Рейн-Вестфалия=Кёльн,Дюссельдорф,Дортмунд,Эссен,Дуйсбург;Гессен=Франкфурт-на-Майне,Висбаден,Кассель,Дармштадт;Саксония=Дрезден,Лейпциг,Хемниц,Плауэн;Нижняя Саксония=Ганновер,Брауншвейг,Оснабрюк,Ольденбург;Рейнланд-Пфальц=Майнц,Кобленц,Трир,Людвигсхафен;Тюрингия=Эрфурт,Йена,Гера;Бранденбург=Потсдам,Котбус,Франкфурт-на-Одере;Саксония-Анхальт=Магдебург,Галле,Дессау;Шлезвиг-Гольштейн=Киль,Любек,Фленсбург;Мекленбург-Передняя Померания=Росток,Шверин,Штральзунд;Саар=Саарбрюккен,Нойнкирхен;Берлин=Берлин,Шпандау;Гамбург=Гамбург,Харбург;Бремен=Бремен,Бремерхафен;Мазовецкое=Варшава,Радом,Плоцк,Седльце;Малопольское=Краков,Тарнув,Новы-Сонч;Силезское=Катовице,Ченстохова,Гливице,Забже;Великопольское=Познань,Калиш,Конин;Поморское=Гданьск,Гдыня,Слупск;Нижнесилезское=Вроцлав,Легница,Валбжих;Лодзинское=Лодзь,Пётркув-Трыбунальски;Люблинское=Люблин,Замосць,Хелм;Подкарпатское=Жешув,Пшемысль,Кросно;Западно-Поморское=Щецин,Кошалин,Свиноуйсьце;Куявско-Поморское=Быдгощ,Торунь,Влоцлавек;Варминьско-Мазурское=Ольштын,Эльблонг,Элк;Подляское=Белосток,Сувалки;Опольское=Ополе,Кендзежин-Козле;Любушское=Зелёна-Гура,Гожув-Велькопольский;Свентокшиское=Кельце,Скаржиско-Каменна;Калифорния=Лос-Анджелес,Сан-Франциско,Сан-Диего,Сакраменто,Сан-Хосе;Техас=Хьюстон,Даллас,Остин,Сан-Антонио,Эль-Пасо;Флорида=Майами,Орландо,Тампа,Джэксонвилл;Нью-Йорк=Нью-Йорк,Буффало,Рочестер,Олбани;Иллинойс=Чикаго,Рокфорд,Спрингфилд;Вашингтон=Сиэтл,Спокан,Такома;Пенсильвания=Филадельфия,Питтсбург,Аллентаун;Огайо=Колумбус,Кливленд,Цинциннати;Джорджия=Атланта,Саванна,Огаста;Мичиган=Детройт,Гранд-Рапидс,Лансинг;Массачусетс=Бостон,Вустер,Спрингфилд;Аризона=Финикс,Тусон,Меса;Невада=Лас-Вегас,Рино,Хендерсон;Колорадо=Денвер,Колорадо-Спрингс,Боулдер;Аляска=Анкоридж,Фэрбанкс,Джуно`;
const REAL={};DICT.split(';').forEach(s=>{const i=s.indexOf('=');REAL[s.slice(0,i)]=s.slice(i+1).split(',')});
const norm=n=>String(n||'').replace(/ \(.*\)/,'').replace(/ (область|край|штат|провинция|округ)$/i,'').trim();
const CU={
 sl:[['Бел','Крас','Нов','Зар','Верх','Лип','Дубр','Гор','Сос','Мир','Вол','Стар','Зелен','Бор','Ряб','Кам','Яс'],['ов','ск','град','ино','ин','ица','бор','поль','ец','ка']],
 ge:[['Берг','Штайн','Нид','Вальд','Хель','Грюн','Бад','Ост','Нойен','Фрей','Ландс','Брун','Эйк'],['бург','дорф','ау','штадт','хайм','ен','бек','вик','ланд','холм']],
 ro:[['Сан','Вила','Кастель','Монте','Порто','Ла','Ново','Сьерра','Рива','Валь','Кампо','Лозан','Ферр'],['ано','ейра','ето','ела','оса','ена','ино','ара','есте','ора','ита']],
 an:[['Ривер','Оук','Милл','Хилл','Грин','Нью','Бранд','Лейк','Стоун','Бэй','Форест','Эш','Кинг','Ред'],['тон','вилл','ридж','форд','бридж','порт','филд','вуд','бери','хэмптон']],
 ar:[['Эль','Аль','Бени','Дар','Тель','Умм','Рас','Айн'],['Хасан','Бахр','Джабаль','Мансур','Нахр','Кубба','Рамла','Сухна','Фаррух','Салим','Хамра'],'-'],
 tu:[['Ак','Кара','Кызыл','Алма','Сары','Таш','Бай','Куль','Чим'],['сай','тау','кала','куль','бек','шехир','абад','арал','коль','кент']],
 ea:[['Шань','Лун','Хэй','Цзин','Фу','Дун','Сян','Ань','Мин','Хуа','Тянь','Юн','Бао','Чэн','Лин','Нань','Син','Кан'],['шань','хай','цзян','чжоу','фу','ань','син','чэн','лин','нин','тун']],
 sa:[['Рам','Сур','Дхар','Ам','Гопал','Нагар','Кишан','Харид','Бха','Ман'],['пур','абад','гарх','нагар','вади','коте','пали','бад','ганж','пет']],
 se:[['Бан','Кота','Пон','Лам','Сун','Нам','Мае','Пак','Бату','Сри','Чиа'],['донг','кон','бури','буа','нган','йо','минь','гау','лан','ок']],
 af:[['Ка','Мбе','Нда','Ква','Лу','Бама','Зан','Муа','Тама','Окан','Ади','Ген','Бан'],['ко','ла','куа','нга','буту','ра','бе','мба','зи','лу','анда']]};
const SETS={sl:'Россия,Беларусь,Польша,Чехия,Словакия,Сербия,Болгария,Хорватия,Словения,Босния и Герцеговина,Северная Македония,Черногория,Украина,Литва,Латвия,Эстония',
 ge:'Германия,Австрия,Швейцария,Нидерланды,Бельгия,Швеция,Норвегия,Дания,Исландия,Люксембург,Лихтенштейн,Финляндия',
 ro:'Франция,Италия,Испания,Португалия,Румыния,Молдавия,Мальта,Андорра,Сан-Марино,Монако,Греция,Албания,Кипр,Венгрия',
 an:'США,Канада,Великобритания,Ирландия,Австралия,Новая Зеландия',
 ar:'Саудовская Аравия,Египет,Ирак,Иордания,Ливан,Сирия,Йемен,Оман,Катар,Кувейт,Бахрейн,ОАЭ,Ливия,Алжир,Марокко,Тунис,Судан,Мавритания,Иран,Афганистан,Израиль,Палестина',
 tu:'Турция,Казахстан,Узбекистан,Азербайджан,Туркмения,Киргизия,Таджикистан,Монголия,Грузия,Армения',
 ea:'Китай,Япония,Южная Корея,Северная Корея,Тайвань',
 sa:'Индия,Пакистан,Бангладеш,Непал,Шри-Ланка,Бутан,Мальдивы',
 se:'Индонезия,Малайзия,Вьетнам,Таиланд,Филиппины,Мьянма,Камбоджа,Лаос,Сингапур,Бруней,Восточный Тимор'};
const CBY={};Object.keys(SETS).forEach(k=>SETS[k].split(',').forEach(n=>CBY[n]=k));
const CONT={eu:'ge',af:'af',sa:'ro',na:'ro',oc:'an',as:'se'};
const cultureOf=(country,cont)=>CBY[country]||CONT[cont]||'sl';
function genName(cu,R){
  const c=CU[cu]||CU.sl;let n;
  if(cu==='ea'&&R()<.45)n=c[0][Math.floor(R()*c[0].length)]+c[1][Math.floor(R()*c[1].length)];
  else n=c[0][Math.floor(R()*c[0].length)]+(c[2]||'')+c[1][Math.floor(R()*c[1].length)];
  return n.charAt(0).toUpperCase()+n.slice(1)}
/* число городов зависит от населения области: 10 тыс. → 1, 100 тыс. → 3, 1 млн → 4, 10 млн → 6, 40 млн → 8 */
const townCount=pop=>Math.max(1,Math.min(8,Math.round(1+Math.log10(Math.max(pop,1e4)/1e4)*1.6)));
/* Города области. Настоящие названия — где знаю (Украина, Россия, Германия, Польша, часть США), остальные придуманы под культуру страны.
   Возвращает [{name,pop,fate}] от самого большого. fate (0..1) — «невезучесть» города: чем выше, тем сильнее страдает при ударах. */
function towns(key,regionName,pop,country,cont,mainName){
  const n=townCount(pop),R=rng(hash(key)+99),cu=cultureOf(country,cont),real=(REAL[norm(regionName)]||[]).slice(),names=[];
  if(mainName)names.push(mainName);
  real.forEach(x=>{if(names.length<n&&!names.includes(x))names.push(x)});
  let guard=0;while(names.length<n&&guard++<40){const g=genName(cu,R);if(!names.includes(g))names.push(g)}
  const urban=pop*.62,w=names.map((_,i)=>1/Math.pow(i+1,1.25)),tw=w.reduce((a,b)=>a+b,0);
  return names.map((nm,i)=>({name:nm,pop:Math.round(urban*w[i]/tw),fate:(hash(key+'|'+nm)%1000)/1000}));
}
/* состояние города: общий урон области × «невезучесть» + прямые попадания */
function townCond(regionCond,fate,hit){return Math.max(0,Math.min(100,100-(100-regionCond)*(.55+.9*fate)-(hit||0)))}

/* ---------- рисование ---------- */
let ITEMS=[],VER=0,LASTKEY='',LAYER=null;
/* радиус города в единицах карты: 10 тыс. → 0.5, 100 тыс. → 1.25, 1 млн → 2, 10 млн → 2.75 (но не больше доли области) */
function radius(pop,cap){const r=.5+.75*Math.log10(Math.max(1e4,pop||1e4)/1e4);return Math.max(.35,Math.min(r,cap?Math.max(.4,cap*.6):9))}
const MAXVIS=typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(max-width: 700px)').matches?90:160;
/* Выбираем неперекрывающиеся значки: крупные города имеют приоритет,
   а мелкие появляются по мере приближения карты. Координаты проверяются в экранных пикселях. */
function declutter(items,ppu,max=MAXVIS){
  const ordered=items.slice().sort((a,b)=>(b.rw||0)-(a.rw||0)),kept=[];
  for(const c of ordered){
    const sr=(Number(c.rw)||0)*ppu;
    if(sr<1.6)break;
    if(sr<(c.own!=null&&c.main?1.6:3.2))continue;
    const sx=Number(c.x)*ppu,sy=Number(c.y)*ppu;
    /* На большом приближении значки ограничены экранным размером: так соседние города
       становятся видны, а не растут вместе с масштабом до полного наложения. */
    const baseR=Math.min(sr,c.main?10:8.5);
    let chosen=null;
    for(const factor of [1,.82,.66,.5,.36]){
      const r=Math.max(1.5,baseR*.88*factor);
      let overlap=false;
      for(const q of kept){const dx=sx-q.sx,dy=sy-q.sy,min=r+q.r+3;if(dx*dx+dy*dy<min*min){overlap=true;break}}
      if(!overlap){chosen={r};break}
    }
    if(!chosen)continue;
    kept.push({c,sr,sx,sy,r:chosen.r});
    if(kept.length>=max)break;
  }
  return kept;
}
function draw(layer,svg,wz){
  if(!layer)return;
  if(!layer.querySelector('#csi')){layer.innerHTML='<defs id="csd"></defs><g id="csi"></g>';DEFSEL=null;DONE.clear();LASTKEY=''}
  const host=layer.querySelector('#csi'),rect=svg.getBoundingClientRect(),sw=rect.width>20?rect.width:400,ppu=sw/wz.w,
   x0=wz.x-wz.w*.05,y0=wz.y-wz.h*.05,x1=wz.x+wz.w*1.05,y1=wz.y+wz.h*1.05,candidates=[];
  for(const c of ITEMS){
    const sr=c.rw*ppu;
    if(sr<1.6)break;
    if(sr<(c.own!=null&&c.main?1.6:3.2))continue;
    if(c.x<x0||c.x>x1||c.y<y0||c.y>y1)continue;
    candidates.push(c);
  }
  const vis=declutter(candidates,ppu,MAXVIS);
  const lg=Math.round(Math.log2(ppu)*3);
  const parts=vis.map(o=>{const c=o.c,lv=level(c.cond),tier=o.sr<9?0:o.sr<30?1:2;o.lv=lv;o.tier=tier;return c.id+'.'+lv+'.'+tier});
  const key=VER+'|'+lg+'|'+parts.join(',');
  if(key===LASTKEY)return;LASTKEY=key;
  const fs=11/ppu,sk=3/ppu,labelBoxes=[];
  /* Не даём названиям городов перекрывать соседние названия и сами значки. */
  vis.forEach(o=>{
    const c=o.c;let show= o.sr>=10&&(o.sr>=18||(c.own!=null&&c.main));
    if(!show)return;
    const w=Math.max(12,Math.min(16,String(c.name||'').length)*fs*.62*ppu),h=13.5;
    const box={x:o.sx-w/2,y:o.sy+o.r*.95+1,w,h};
    const labelOverlap=labelBoxes.some(b=>box.x<b.x+b.w+2&&box.x+box.w+2>b.x&&box.y<b.y+b.h+2&&box.y+box.h+2>b.y);
    let markerOverlap=false;
    for(const q of vis){if(q===o)continue;const nx=Math.max(box.x,Math.min(q.sx,box.x+box.w)),ny=Math.max(box.y,Math.min(q.sy,box.y+box.h)),dx=q.sx-nx,dy=q.sy-ny;if(dx*dx+dy*dy<(q.r+1)*(q.r+1)){markerOverlap=true;break}}
    if(labelOverlap||markerOverlap)show=false;else labelBoxes.push(box);
    o.showLab=show;
  });
  host.innerHTML=vis.map(o=>{
    const c=o.c,lv=o.lv,tier=o.tier,sr=o.sr,s=o.r/(9*ppu),cl=c.cond<35?'ru':c.cond<75?'dm':'ok',
     sym=ensure(layer,tier,lv,hash(c.id)%VARIANTS),
     tt=`${c.name}${c.sub?' · '+c.sub:''} · ${LV_NAME[lv]} (${Math.round(c.cond)}%)`+(c.pop?` · ${Math.round(c.pop/1000)} тыс. жителей`:'')+(c.own!=null?'. Нажмите, чтобы открыть город и восстановление.':''),
     hit=Math.max(o.r,7)/ppu;
    return `<g class="csat ${cl}" transform="translate(${f(c.x)} ${f(c.y)})" ${c.own!=null?`data-own="1" data-city="${c.own}" data-town="${esc([c.name,c.pop||0,Math.round(c.cond),c.others||''].join('|'))}"`:`data-fc="${esc(c.name)}|${esc(c.sub||'')}|${Math.round(c.cond)}"`}><circle r="${f(hit)}" fill="#000" fill-opacity="0"/><use href="#${sym}" transform="scale(${f(s)})"/>${o.showLab?`<text text-anchor="middle" class="csat-label" y="${f(o.r*.95/ppu+fs*1.05)}" style="font-size:${f(fs)}px;stroke-width:${f(sk)}px">${esc(c.name.length>16?c.name.slice(0,15)+'…':c.name)}</text>`:''}${c.bad&&c.main&&sr>=10?`<text class="csat-bad" x="${f(o.r*.7/ppu)}" y="${f(-o.r*.6/ppu)}" style="font-size:${f(fs)}px;stroke-width:${f(sk*.7)}px">!${c.bad}</text>`:''}<title>${esc(tt)}</title></g>`}).join('');
}

function setItems(items){ITEMS=items.slice().sort((a,b)=>b.rw-a.rw);VER++}
function refresh(svg,wz,W){const layer=svg&&svg.querySelector('#city-markers');if(layer)draw(layer,svg,wz)}
function render(layer,items){LAYER=layer;setItems(items);const sv=layer.ownerSVGElement;if(sv)draw(layer,sv,{x:0,y:0,w:1000,h:575})}
function zoom(svg,z){const layer=(svg&&svg.querySelector('#city-markers'))||LAYER;if(layer&&svg)draw(layer,svg,{x:0,y:0,w:1000*z,h:575*z})}
/* окно города: показываем именно тот город, на который нажали */
function decorate(info){
  const m=document.getElementById('nova-city-pop');if(!m)return;
  const p=String(info||'').split('|'),name=p[0],pop=+p[1]||0,cond=+p[2]||0,others=p[3]||'';
  const h=m.querySelector('h2');if(h)h.textContent='🏙 '+name;
  const st=m.querySelector('.nova-city-pop-stats');
  if(st)st.insertAdjacentHTML('afterbegin',`<span>Жителей в городе: ${Math.round(pop/1000)} тыс.</span><span>Состояние города: ${cond}%</span>`);
  if(others&&st)st.insertAdjacentHTML('afterend',`<p style="margin:4px 0;font-size:12px;color:#c1d0dc">Другие города области: ${esc(others)}</p>`);
}

let toastEl=null,toastT=0;
function toast(msg){
  if(!toastEl){toastEl=document.createElement('div');toastEl.style.cssText='position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:10030;max-width:88vw;background:#142331ee;color:#eef4f8;border:1px solid #60788b;border-radius:12px;padding:9px 13px;font:13px system-ui,sans-serif;pointer-events:none';document.body.appendChild(toastEl)}
  toastEl.textContent=msg;toastEl.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>toastEl.style.display='none',2600)}
function tapForeign(el){const p=String(el.getAttribute('data-fc')||'').split('|');toast(`🛰 ${p[0]}${p[1]?' · '+p[1]:''} · ${LV_NAME[level(+p[2])]} (${p[2]}%)`)}

const st=document.createElement('style');
st.textContent='.csat{cursor:pointer;pointer-events:all}.csat-label{font-family:system-ui,sans-serif;font-weight:700;fill:#fff4d2;paint-order:stroke;stroke:#101923;stroke-linejoin:round;user-select:none;pointer-events:none}.csat-bad{font-family:system-ui,sans-serif;font-weight:800;fill:#ffc56b;stroke:#111923;paint-order:stroke;pointer-events:none}.csat.ru .csat-bad{fill:#ff7777}@keyframes csflick{0%,100%{opacity:.95}50%{opacity:.45}}.cs-fire,.cs-fire2{animation:csflick 1.1s infinite}';
document.head.appendChild(st);

window.CitySat={defs,build,level,ref,zoom,render,refresh,setItems,radius,declutter,decorate,towns,townCond,townCount,cultureOf,tapForeign,toast,LV_NAME};
})();
