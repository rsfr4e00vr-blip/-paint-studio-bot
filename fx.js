/* Реальные курсы валют для игры.
   1) Снимок рынка на 13.11.2026 (x-rates.com, 22:15 UTC) — значения в блоке R (единиц валюты за 1 USD).
   2) Для валют, которых нет в снимке, блок A — приблизительные значения (в интерфейсе помечены «≈»).
   3) При запуске игра пробует загрузить живые курсы (open.er-api.com) и кэширует их на 6 часов.
      Если интернета нет — работает снимок. */
(()=>{
'use strict';
const DATE='13.11.2026',SRC='x-rates.com';
/* проверенный снимок рынка */
const R={USD:1,EUR:.9072,GBP:.7569,JPY:159.71,CNY:6.6717,INR:94.288,AUD:1.4763,CAD:1.4270,CHF:.83885,SGD:1.2877,BND:1.2877,
 HKD:7.8458,NZD:1.8101,SEK:10.079,NOK:9.5726,DKK:6.7823,PLN:3.9965,CZK:22.140,HUF:330.99,RON:4.8488,ISK:123.92,
 RUB:82.76,TRY:50.436,ILS:3.2151,SAR:3.75,AED:3.6725,QAR:3.64,KWD:.31148,BHD:.376,OMR:.3849,
 ZAR:16.940,BRL:5.6636,MXN:18.539,ARS:1544.67,CLP:995.14,COP:3316.15,KRW:1336.3,THB:33.910,MYR:4.0857,PHP:63.91,
 IDR:18239.4,PKR:276.60,LKR:332.68,NPR:150.93,KZT:445.53,TWD:32.904,BWP:13.976,MUR:47.62,LYD:6.440,TTD:6.788,IRR:1919841};
/* приблизительные значения (нет в снимке) */
const A={UAH:41.6,EGP:48.5,NGN:1500,KES:129,GHS:11.5,ETB:140,DZD:131,MAD:9.2,TND:2.95,UZS:12100,AZN:1.70,AMD:385,GEL:2.72,
 BYN:3.1,MDL:17.3,RSD:106,BAM:1.774,MKD:56,ALL:85,AFN:68,BDT:122,MMK:2100,VND:26300,KHR:4020,LAK:21700,MNT:3600,BTN:94.288,
 MVR:15.4,TJS:9.4,KGS:87.5,TMT:3.5,IQD:1310,SYP:120,YER:250,JOD:.709,LBP:89500,PEN:3.4,UYU:40,PYG:7600,BOB:6.96,VES:250,
 GTQ:7.7,HNL:26.3,NIO:36.8,CRC:500,DOP:62,JMD:158,HTG:131,CUP:24,BSD:1,BBD:2,BZD:2,XCD:2.7,XOF:595.1,XAF:595.1,KMF:446.3,
 CVE:100.03,STN:22.23,DJF:177.7,ERN:15,GMD:72,GNF:8700,LRD:190,SLE:23,MGA:4500,MWK:1735,MZN:63.9,NAD:16.94,LSL:16.94,
 SZL:16.94,ZMW:24,ZWG:26,RWF:1450,BIF:2950,TZS:2500,UGX:3600,SOS:571,SSP:4500,SDG:600,AOA:920,CDF:2200,MRU:40,SCR:14.5,
 PGK:4.2,FJD:2.25,SBD:8.4,VUV:120,WST:2.75,TOP:2.4,GYD:209,SRD:37,KPW:900};
/* страна (ISO3) → код валюты */
const G={EUR:'AUT BEL CYP EST FIN FRA DEU GRC IRL ITA LVA LTU LUX MLT NLD PRT SVK SVN ESP HRV BGR AND MCO SMR VAT MNE',
 USD:'USA ECU SLV PAN PLW MHL FSM TLS',AUD:'AUS KIR NRU TUV',XOF:'BEN BFA CIV GNB MLI NER SEN TGO',XAF:'CMR CAF TCD COG GNQ GAB',
 XCD:'ATG DMA GRD KNA LCA VCT',CHF:'CHE LIE',NZD:'NZL',ZAR:'ZAF',NAD:'NAM',LSL:'LSO',SZL:'SWZ',
 RUB:'RUS',CNY:'CHN',INR:'IND',GBP:'GBR',KRW:'KOR',PKR:'PAK',TRY:'TUR',IRR:'IRN',ILS:'ISR PSE',UAH:'UKR',JPY:'JPN',KPW:'PRK',
 BRL:'BRA',EGP:'EGY',PLN:'POL',SAR:'SAU',IDR:'IDN',VND:'VNM',DZD:'DZA',CAD:'CAN',THB:'THA',MXN:'MEX',COP:'COL',NGN:'NGA',
 ARS:'ARG',SEK:'SWE',RON:'ROU',ETB:'ETH',CZK:'CZE',NOK:'NOR',KZT:'KAZ',UZS:'UZB',IQD:'IRQ',SYP:'SYR',YER:'YEM',AFN:'AFG',
 BDT:'BGD',PHP:'PHL',MMK:'MMR',MYR:'MYS',SGD:'SGP',MAD:'MAR',TND:'TUN',LYD:'LBY',SDG:'SDN',SSP:'SSD',KES:'KEN',TZS:'TZA',
 UGX:'UGA',AOA:'AGO',CDF:'COD',GHS:'GHA',MGA:'MDG',MZN:'MOZ',ZMW:'ZMB',ZWG:'ZWE',MWK:'MWI',SOS:'SOM',ERN:'ERI',RWF:'RWA',
 BIF:'BDI',SLE:'SLE',LRD:'LBR',GNF:'GIN',GMD:'GMB',MRU:'MRT',BWP:'BWA',DJF:'DJI',KMF:'COM',MUR:'MUS',SCR:'SYC',CVE:'CPV',
 STN:'STP',JOD:'JOR',LBP:'LBN',OMR:'OMN',AED:'ARE',QAR:'QAT',KWD:'KWT',BHD:'BHR',AZN:'AZE',AMD:'ARM',GEL:'GEO',TMT:'TKM',
 TJS:'TJK',KGS:'KGZ',MNT:'MNG',NPR:'NPL',BTN:'BTN',LKR:'LKA',MVR:'MDV',KHR:'KHM',LAK:'LAO',BND:'BRN',PGK:'PNG',FJD:'FJI',
 SBD:'SLB',VUV:'VUT',WST:'WSM',TOP:'TON',BYN:'BLR',MDL:'MDA',DKK:'DNK',ISK:'ISL',HUF:'HUN',RSD:'SRB',BAM:'BIH',MKD:'MKD',
 ALL:'ALB',CUP:'CUB',HTG:'HTI',DOP:'DOM',JMD:'JAM',TTD:'TTO',BSD:'BHS',BBD:'BRB',GTQ:'GTM',HNL:'HND',NIO:'NIC',CRC:'CRI',
 BZD:'BLZ',VES:'VEN',PEN:'PER',CLP:'CHL',BOB:'BOL',PYG:'PRY',UYU:'URY',GYD:'GUY',SRD:'SUR'};
const CUR={};Object.keys(G).forEach(c=>G[c].split(' ').forEach(i=>{CUR[i]=c}));
const NM={USD:'доллар США',EUR:'евро',GBP:'фунт стерлингов',JPY:'иена',CNY:'юань',INR:'рупия',AUD:'австралийский доллар',CAD:'канадский доллар',
 CHF:'швейцарский франк',SGD:'сингапурский доллар',HKD:'гонконгский доллар',NZD:'новозеландский доллар',SEK:'шведская крона',NOK:'норвежская крона',
 DKK:'датская крона',PLN:'злотый',CZK:'чешская крона',HUF:'форинт',RON:'румынский лей',RUB:'рубль',TRY:'турецкая лира',ILS:'шекель',SAR:'саудовский риял',
 AED:'дирхам ОАЭ',ZAR:'рэнд',BRL:'реал',MXN:'мексиканское песо',ARS:'аргентинское песо',CLP:'чилийское песо',COP:'колумбийское песо',KRW:'вона',
 THB:'бат',MYR:'ринггит',PHP:'филиппинское песо',IDR:'рупия (Индонезия)',PKR:'пакистанская рупия',KZT:'тенге',UAH:'гривна',EGP:'египетский фунт',
 NGN:'найра',KES:'кенийский шиллинг',IRR:'иранский риал',QAR:'катарский риал',KWD:'кувейтский динар',BYN:'белорусский рубль',UZS:'сум',VND:'донг',
 TWD:'тайваньский доллар',ISK:'исландская крона',MAD:'марокканский дирхам',GEL:'лари',AZN:'манат',AMD:'драм',NVT:'новарийский талер'};
const KEY=['USD','EUR','GBP','JPY','CNY','INR','CHF','CAD','AUD','TRY','RUB','UAH','BRL','MXN','ZAR','KRW','SAR','ILS','PLN','KZT'];
const S0={live:null,t:0,err:null};
try{const c=JSON.parse(localStorage.getItem('novariaFxLive')||'null');if(c&&c.rates&&c.t){S0.live=c.rates;S0.t=c.t;S0.date=c.date}}catch(e){}
function get(code){
 if(code==='NVT')return{v:36,src:'game'};
 if(S0.live&&S0.live[code]>0)return{v:S0.live[code],src:'live'};
 if(R[code]>0)return{v:R[code],src:'snap'};
 if(A[code]>0)return{v:A[code],src:'approx'};
 return null;
}
function fetchLive(cb,force){
 if(!force&&S0.live&&Date.now()-S0.t<6*3600*1000){cb&&cb(true);return}
 if(typeof fetch!=='function'){cb&&cb(false);return}
 const ctl=typeof AbortController==='function'?new AbortController():null,to=setTimeout(()=>ctl&&ctl.abort(),7000);
 fetch('https://open.er-api.com/v6/latest/USD',ctl?{signal:ctl.signal}:{}).then(r=>r.json()).then(j=>{
  clearTimeout(to);
  if(!j||j.result!=='success'||!j.rates)throw new Error('bad');
  S0.live=j.rates;S0.t=Date.now();S0.err=null;
  const d=new Date(j.time_last_update_utc||Date.now());S0.date=isNaN(d)?'':d.toLocaleString('ru-RU',{timeZone:'UTC'})+' UTC';
  try{localStorage.setItem('novariaFxLive',JSON.stringify({rates:S0.live,t:S0.t,date:S0.date}))}catch(e){}
  cb&&cb(true);
 }).catch(e=>{clearTimeout(to);S0.err=String(e&&e.message||e);cb&&cb(false)});
}
window.FXD={DATE,SRC,CUR,NM,KEY,get,fetchLive,state:S0,
 cur:iso=>CUR[iso]||'USD',
 name:c=>NM[c]||c,
 status(){
  if(S0.live)return{k:'live',txt:'Живые курсы · open.er-api.com · '+(S0.date||'сегодня')};
  return{k:'snap',txt:'Снимок рынка на '+DATE+' · '+SRC+(S0.err?' (онлайн-обновление недоступно)':'')};
 }};
})();
