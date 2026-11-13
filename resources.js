/* Ресурсы регионов: у каждой области свои недра (уголь Донбасса, зерно Днепра и т.д.).
   Нефть, газ, уголь и руда ИСТОЩАЮТСЯ, зерно возобновляемо. Когда недра пустеют, запасы страны
   (топливо, энергия, сталь, еда) начинают падать: страну спасают импорт, разведка недр или захват чужих земель. */
(()=>{
'use strict';
const NAME={g:'зерно',o:'нефть',y:'газ',c:'уголь',e:'руда'};
const ICON={g:'🌾',o:'🛢',y:'🔥',c:'⛏',e:'🪨'};
const LIFE={o:120,y:170,c:300,e:360};                 // «запас» на единицу уровня; расход = уровень × темп в месяц
const FEED={food:{g:1},fuel:{o:1},energy:{y:1,c:.6},steel:{e:1,c:.4}};
const STOCK={food:['Продовольствие','🌾'],fuel:['Топливо','⛽'],energy:['Энергия','⚡'],steel:['Сталь','🏭']};
const K={food:.9,fuel:1.4,energy:1.1,steel:1.0};      // сила месячного дефицита
const IMPORT_COST=500,EXPLORE_COST=900,IMPORT_GAIN=14,CD=6;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const S=()=>window.NG&&NG.S;
const tm=()=>{const s=S();return s?(s.year-1)*12+s.month:0};

function mkRes(t,tier){return t==='g'?{tier,left:null,dead:false}:{tier,left:tier*LIFE[t]*rnd(.7,1.3),max:0,rate:rnd(.8,2.0),dead:false}}
function ensure(){
  const s=S();if(!s)return null;
  if(!s.deposits||!s.deposits.list){
    const WD=window.WORLD_DATA||{novaria:[]};
    s.deposits={list:(WD.novaria||[]).map(r=>{const res={};Object.keys(r.res||{}).forEach(t=>{if(NAME[t])res[t]=mkRes(t,r.res[t])});Object.values(res).forEach(x=>{if(x.left!=null)x.max=x.left});return{id:r.id,name:r.ru,note:r.note||'',res}}),cd:{}};
    s.deposits.base=supply();
  }
  return s.deposits;
}
function supply(){
  const d=S().deposits,out={food:0,fuel:0,energy:0,steel:0};
  (d.list||[]).forEach(r=>Object.keys(r.res).forEach(t=>{const x=r.res[t];if(x.dead)return;for(const k in FEED)if(FEED[k][t])out[k]+=FEED[k][t]*x.tier}));
  return out;
}
function pctLeft(x){return x.left==null?100:Math.max(0,Math.round(100*x.left/Math.max(1,x.max)))}

const API={
  prices:{},
  tick(){
    const s=S();if(!s||s.campaignOver)return;const d=ensure();if(!d)return;
    d.list.forEach(r=>Object.keys(r.res).forEach(t=>{
      const x=r.res[t];if(x.dead||x.left==null)return;
      x.left-=x.tier*x.rate;
      if(x.left<=0){
        x.left=0;x.dead=true;
        s.gdp=Math.max(100,s.gdp*(1-.006*x.tier));
        const msg=`${ICON[t]} ${r.name}: закончилась ${NAME[t]}. Запасы страны начнут падать.`;
        NG.log(msg);NG.say(`В регионе «${r.name}» закончилась ${NAME[t]}`,ICON[t]);NG.toast(msg);
      }
    }));
    const sup=supply(),base=d.base||sup;
    for(const k in K){const b=base[k];if(!b)continue;const ratio=sup[k]/b;const delta=(ratio-1)*K[k];if(Math.abs(delta)>.001)s[k]=clamp(s[k]+delta)}
  },
  gain(name,resList){const d=ensure();if(!d)return;const res={};(resList||[]).forEach(it=>{if(NAME[it.t]){res[it.t]=mkRes(it.t,it.tier||1);if(res[it.t].left!=null)res[it.t].max=res[it.t].left}});if(!Object.keys(res).length)return;d.list.push({id:'c'+d.list.length+'_'+Date.now(),name,note:'Захвачено',res,captured:true});NG.log(`🛢 С землями «${name}» получены месторождения: ${Object.keys(res).map(t=>NAME[t]).join(', ')}.`)},
  lose(){const d=ensure();if(!d||d.list.length<=2)return;const cand=d.list.filter(r=>r.captured);const r=cand.length?cand[cand.length-1]:d.list[Math.floor(Math.random()*d.list.length)];d.list=d.list.filter(x=>x!==r);NG.log(`⛏ Потеряны месторождения региона «${r.name}».`)},
  imp(stock){
    const s=S();if(!s)return;const t=Object.keys(FEED[stock])[0],price=API.prices[t]||1,cost=Math.round(IMPORT_COST*price);
    if(s.money<cost)return NG.toast('Недостаточно средств');
    s.money-=cost;s[stock]=clamp(s[stock]+IMPORT_GAIN);NG.log(`🚢 Импорт: ${STOCK[stock][0].toLowerCase()} +${IMPORT_GAIN} за ${cost} млн.`);NG.toast(`Закуплено: ${STOCK[stock][0].toLowerCase()} +${IMPORT_GAIN}`);NG.render();
  },
  explore(id,t){
    const s=S();if(!s)return;const d=ensure(),r=d.list.find(x=>x.id===id);if(!r||!r.res[t])return;
    const key=id+t;if(d.cd[key]!=null&&tm()-d.cd[key]<CD)return NG.toast(`Разведка недр: подождите ${CD-(tm()-d.cd[key])} мес.`);
    if(s.money<EXPLORE_COST)return NG.toast('Недостаточно средств');
    s.money-=EXPLORE_COST;d.cd[key]=tm();const x=r.res[t];
    if(x.dead){x.dead=false;x.left=x.tier*LIFE[t]*.35;x.max=Math.max(x.max,x.left);NG.log(`🔎 В регионе «${r.name}» найдены новые залежи: ${NAME[t]}.`)}
    else{x.left+=x.tier*LIFE[t]*.25;x.max=Math.max(x.max,x.left);NG.log(`🔎 Разведка недр «${r.name}»: запасы (${NAME[t]}) увеличены.`)}
    NG.toast('Разведка успешна');NG.render();
  },
  panel(){
    const s=S();if(!s)return'';const d=ensure();if(!d||!d.list.length)return'';
    const sup=supply(),base=d.base||sup;
    const stocks=Object.keys(STOCK).map(k=>{const ratio=base[k]?sup[k]/base[k]:1,price=API.prices[Object.keys(FEED[k])[0]]||1;return`<div class="mini"><b>${STOCK[k][1]} ${STOCK[k][0]}</b>${Math.round(s[k])} / 100 · добыча ${Math.round(ratio*100)}% от начальной${price>1.01?`<br><small class="muted">мировая цена ×${price.toFixed(2)}</small>`:''}<div class="actions"><button type="button" onclick="NGRES.imp('${k}')">🚢 Импорт · ${Math.round(IMPORT_COST*price)}</button></div></div>`}).join('');
    const regs=d.list.map(r=>{
      const chips=Object.keys(r.res).map(t=>{const x=r.res[t],p=pctLeft(x);
        const state=x.dead?`<span class="bad">⛔ ${NAME[t]} истощена</span>`:x.left==null?`${ICON[t]} ${NAME[t]} · возобновляется`:`${ICON[t]} ${NAME[t]} · осталось ${p}%`;
        const btn=(x.dead||(x.left!=null&&p<40))?`<button type="button" onclick="NGRES.explore('${esc(r.id)}','${t}')">🔎 Разведка · ${EXPLORE_COST}</button>`:'';
        return`<div style="margin:4px 0">${state}${x.left!=null&&!x.dead?`<div class="bar"><i style="width:${p}%;background:${p<25?'#c23b4b':p<50?'#c9902f':'#2aa56d'}"></i></div>`:''}${btn}</div>`}).join('');
      return`<div class="mini"><b>${esc(r.name)}</b><small class="muted">${esc(r.note)}</small>${chips}</div>`}).join('');
    return`<section class="panel wide"><h2>🛢 Ресурсы регионов</h2><p class="muted">Нефть, газ, уголь и руда истощаются. Когда месторождения пустеют, запасы страны падают: закупайте импорт, ищите новые залежи или захватывайте богатые земли.</p><div class="cards">${stocks}</div><div class="cards" style="margin-top:8px">${regs}</div></section>`;
  },
  depleted(){const d=S()&&S().deposits;if(!d)return[];const o=[];d.list.forEach(r=>Object.keys(r.res).forEach(t=>{if(r.res[t].dead)o.push({region:r.name,t})}));return o}
};
window.NGRES=API;
})();
