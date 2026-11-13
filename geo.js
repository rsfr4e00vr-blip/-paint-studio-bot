/* Карта мира «Симулятора государства»: страны раскрашены по статусу, захваченные земли видны всегда.
   Если границы не загрузились, карта рисует круглые метки по координатам стран (мир остаётся читаемым). */
(()=>{
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('ru-RU');
const W={list:[],by:{},nov:[],ready:false};
let map=null,layers={},cache={},markers=null,fallback=null,worldFailed=false,state={mine:'NOV',status:{},regions:[],onPick:null};
const COL={mine:'#168b68',vassal:'#d4ae4a',vassalO:'#8d7d4a',annex:'#c8662a',annexO:'#7b5195',player:'#3f78c9',war:'#c23b4b',region:'#b89a3f',ai:'#8995a4'};

fetch('/world.json').then(r=>r.json()).then(d=>{W.list=d.countries;W.nov=d.novaria||[];d.countries.forEach(c=>{W.by[c.i]=c;if(c.a)W.by[c.a]=c});W.ready=true;refresh()}).catch(()=>{});

function isoOf(f){const p=(f&&f.properties)||{};const a2=p['ISO3166-1-Alpha-2']||p.ISO_A2||p.iso_a2;if(a2&&a2!=='-99'&&W.by[a2])return a2;const a3=p['ISO3166-1-Alpha-3']||p.ISO_A3||p.iso_a3||p.shapeISO;if(a3&&W.by[a3])return W.by[a3].i;return a2&&a2!=='-99'?a2:''}
function nameOf(f){const p=(f&&f.properties)||{};return String(p.shapeName||p.NAME_1||p.name||p.ADMIN||p.NAME||p.admin||'').trim()}
function statusOf(iso){
  if(!iso)return{k:'ai',col:COL.ai,op:.14,txt:''};
  const s=state.status[iso]||{};
  if(iso===state.mine)return{k:'mine',col:COL.mine,op:.78,txt:'ваша страна'};
  if(s.k==='annexed')return s.mine?{k:'annex',col:COL.annex,op:.72,txt:`аннексирована вами`}:{k:'annexO',col:COL.annexO,op:.5,txt:`аннексирована: ${esc(s.who||'')}`};
  if(s.k==='vassal')return s.mine?{k:'vassal',col:COL.vassal,op:.7,txt:'ваш вассал'}:{k:'vassalO',col:COL.vassalO,op:.5,txt:`вассал: ${esc(s.who||'')}`};
  if(s.k==='player')return{k:'player',col:COL.player,op:.62,txt:`игрок: ${esc(s.who||'')}`};
  if(s.war)return{k:'war',col:COL.war,op:.5,txt:'идёт война'};
  if((state.regions||[]).some(r=>r.iso===iso))return{k:'region',col:COL.region,op:.4,txt:'часть земель захвачена вами'};
  return{k:'ai',col:COL.ai,op:.14,txt:s.depleted?'ресурсы истощены':''};
}
function label(iso,fallbackName){const c=W.by[iso];const st=statusOf(iso);return `${esc(c?c.ru:fallbackName||iso)}${st.txt?' — '+st.txt:''}`}
async function getGeo(layer){if(cache[layer])return cache[layer];const r=await fetch('/api/map/'+layer,{cache:'force-cache'});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();cache[layer]=j;return j}
function status(t){const e=document.getElementById('geoMapStatus');if(e)e.textContent=t}
const NOV_RE=/odes|mykola|kherson|zaporiz|donetsk|luhansk|kharkiv|dnipro|crimea|sevastopol|одес|микол|херсон|запор|донец|луган|харк|дніпр|крим/i;

function init(){
  const el=document.getElementById('novariaGeoMap');if(!el||!window.L)return;
  if(map&&map._container!==el){try{map.remove()}catch(e){}map=null;layers={};markers=null;fallback=null}
  if(map){setTimeout(()=>map.invalidateSize(),80);refresh();return}
  map=L.map(el,{zoomControl:true,scrollWheelZoom:true,worldCopyJump:true,minZoom:2}).setView([48.2,31.2],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap · границы: Natural Earth / geoBoundaries'}).addTo(map);
  markers=L.layerGroup().addTo(map);fallback=L.layerGroup().addTo(map);
  status('Загрузка границ…');
  const jobs=['world','ukraine','russia'].map(k=>getGeo(k).then(d=>[k,d]));
  Promise.allSettled(jobs).then(res=>{let ok=0;
    res.forEach((r,i)=>{const key=['world','ukraine','russia'][i];if(r.status!=='fulfilled'){if(key==='world')worldFailed=true;return}ok++;
      const data=r.value[1];
      if(key==='world'){layers.world=L.geoJSON(data,{style:f=>{const s=statusOf(isoOf(f));return{color:s.k==='ai'?'#7c8792':s.col,weight:s.k==='ai'?.6:1.6,opacity:.9,fillColor:s.col,fillOpacity:s.op}},
        onEachFeature:(f,l)=>{const iso=isoOf(f);l.bindTooltip(()=>label(iso,nameOf(f)),{sticky:true});l.on('click',()=>{if(state.onPick&&iso)state.onPick(iso)})}}).addTo(map)}
      else{layers[key]=L.geoJSON(data,{style:f=>{const n=nameOf(f);const isN=(key==='ukraine'&&NOV_RE.test(n))||(key==='russia'&&/belgorod|белгород/i.test(n));const mineNov=state.mine==='NOV';
          return isN?{color:'#f0d27b',weight:2,fillColor:mineNov?COL.mine:COL.ai,fillOpacity:mineNov?.78:.3}:{color:'#aab4bd',weight:1,fillColor:COL.ai,fillOpacity:.1}},
        onEachFeature:(f,l)=>{const n=nameOf(f);if(n)l.bindTooltip(n,{sticky:true})}}).addTo(map)}});
    status(!ok?'Границы не загрузились: показаны метки стран':worldFailed?'Мировые границы недоступны: показаны метки стран':ok===3?'Карта загружена · цвет показывает статус страны':'Карта загружена частично');
    refresh();view('mine')});
  setTimeout(()=>map&&map.invalidateSize(),120);
}
function emoji(ic,title){return L.marker([0,0],{icon:L.divIcon({className:'geo-ic',html:`<span title="${esc(title)}">${ic}</span>`,iconSize:[26,26]})})}
function refresh(){
  if(!map||!window.L)return;
  if(layers.world)layers.world.setStyle(f=>{const s=statusOf(isoOf(f));return{color:s.k==='ai'?'#7c8792':s.col,weight:s.k==='ai'?.6:1.6,opacity:.9,fillColor:s.col,fillOpacity:s.op}});
  ['ukraine','russia'].forEach(k=>{if(layers[k])layers[k].setStyle(f=>{const n=nameOf(f);const isN=(k==='ukraine'&&NOV_RE.test(n))||(k==='russia'&&/belgorod|белгород/i.test(n));const m=state.mine==='NOV';return isN?{color:'#f0d27b',weight:2,fillColor:m?COL.mine:COL.ai,fillOpacity:m?.78:.3}:{color:'#aab4bd',weight:1,fillColor:COL.ai,fillOpacity:.1}})});
  if(fallback){fallback.clearLayers();if(worldFailed&&W.ready)W.list.forEach(c=>{const s=statusOf(c.i);L.circleMarker([c.lat,c.lon],{radius:Math.max(3,Math.min(14,Math.sqrt(c.g)/6)),color:s.k==='ai'?'#5d6b78':s.col,weight:1,fillColor:s.col,fillOpacity:s.k==='ai'?.45:.85}).bindTooltip(label(c.i)).on('click',()=>{if(state.onPick)state.onPick(c.i)}).addTo(fallback)})}
  if(markers){markers.clearLayers();
    Object.keys(state.status).forEach(iso=>{const s=state.status[iso],c=W.by[iso];if(!c)return;
      if(s.k==='annexed'||s.k==='vassal'){const m=emoji(s.k==='annexed'?(s.mine?'🏴':'⚑'):(s.mine?'👑':'♛'),label(iso));m.setLatLng([c.lat,c.lon]).addTo(markers)}});
    (state.regions||[]).forEach((r,i)=>{const c=W.by[r.iso];if(!c)return;const m=emoji('🗺',`${r.name} (${c.ru}), население ${fmt(r.pop||0)}`);m.setLatLng([c.lat+(i%3)*.6,c.lon+(i%2)*.6]).addTo(markers)});
  }
}
function view(v){
  if(!map)return;
  if(v==='world')map.setView([20,0],2);
  else if(v==='mine'){const c=W.by[state.mine];if(c&&state.mine!=='NOV')map.setView([c.lat,c.lon],c.g>400?4:5);else map.setView([48.2,34.5],5)}
  else if(W.by[v])map.setView([W.by[v].lat,W.by[v].lon],5);
}
function setState(s){state=Object.assign({mine:'NOV',status:{},regions:[],onPick:state.onPick},s||{});refresh()}
function html(){return `<div class="geo-map-tools"><button type="button" onclick="geoMapView('world')">🌍 Весь мир</button><button type="button" onclick="geoMapView('mine')">Моя территория</button><span id="geoMapStatus">Загрузка географических данных…</span></div><div id="novariaGeoMap" class="novaria-geo-map" role="application" aria-label="Интерактивная карта мира"></div><div class="maplegend"><span><i style="background:${COL.mine}"></i>Ваша страна</span><span><i style="background:${COL.vassal}"></i>Ваши вассалы</span><span><i style="background:${COL.annex}"></i>Аннексировано вами</span><span><i style="background:${COL.player}"></i>Другие игроки</span><span><i style="background:${COL.war}"></i>Война</span><span><i style="background:${COL.ai}"></i>Остальные страны</span></div>`}
/* Раздел «Захваченные земли»: что именно вы получили и где это на карте. */
function panel(capturedSP){
  const st=state.status,items=[];
  Object.keys(st).forEach(iso=>{const s=st[iso];if(!s.mine)return;const c=W.by[iso];if(!c)return;
    if(s.k==='annexed')items.push(`<div class="mini"><b>🏴 ${esc(c.ru)}</b>Аннексирована целиком<br><button type="button" onclick="geoMapView('${iso}')">Показать на карте</button></div>`);
    else if(s.k==='vassal')items.push(`<div class="mini"><b>👑 ${esc(c.ru)}</b>Ваш вассал${s.since!=null?` · с месяца ${s.since}`:''}<br><button type="button" onclick="geoMapView('${iso}')">Показать на карте</button></div>`)});
  (state.regions||[]).forEach(r=>{const c=W.by[r.iso];items.push(`<div class="mini"><b>🗺 ${esc(r.name)}</b>Отнята у: ${esc(c?c.ru:r.from||'')}<br>Население: ${fmt(r.pop||0)}${r.res&&r.res.length?`<br>Ресурсы: ${r.res.map(x=>esc(x.label||x.t)).join(', ')}`:''}${c?`<br><button type="button" onclick="geoMapView('${r.iso}')">Показать на карте</button>`:''}</div>`)});
  (capturedSP||[]).forEach(z=>{if((state.regions||[]).some(r=>r.name===z.name))return;items.push(`<div class="mini"><b>${z.full?'🏴':'🗺'} ${esc(z.name)}</b>Отнято у: ${esc(z.from||'')}<br>Население: ${fmt(z.pop||0)}</div>`)});
  return `<section class="panel wide"><h2>🏴 Захваченные земли и вассалы</h2>${items.length?`<div class="cards">${items.join('')}</div>`:'<p class="muted">Пока нет. Выиграйте войну и выберите условия мира: вассал, область или захват всей страны.</p>'}</section>`;
}
window.geoMapView=view;
window.NGGEO={init,html,panel,refresh,setState,view,world:W,statusOf,isoOf,COL,get map(){return map}};
})();
