/* Global AI for the single-player world: all countries in WORLD.list act every game month. */
(function(){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
function init(S){
 if(!window.WORLD||!Array.isArray(WORLD.list))return;
 const player=S.me||S.name||'Новария';
 if(!S.aiWorld||!Array.isArray(S.aiWorld.nations)||S.aiWorld.version!==1){
  S.aiWorld={version:1,month:0,nations:WORLD.list.filter(c=>c.name!==player).slice(0,194).map(c=>({name:c.name,iso:c.iso||'',pop:Math.max(.02,+c.pop||1),gdp:Math.max(1,(+c.pop||1)*(+c.inc||1)*100),power:Math.max(5,+c.power||15),stability:rnd(42,78),treasury:rnd(300,2200),growth:rnd(.001,.008),relations:rnd(-18,35),allies:[],war:null,owner:null,annexed:false,trait:c.trait||''})),events:[],alliances:[],wars:[],owners:{},player};
 }
 S.aiWorld.player=player;
 // Keep the selected country under human control and never simulate it as an AI.
 S.aiWorld.nations.forEach(n=>{if(n.name===player)n.human=true;else n.human=false});
}
function tick(S){
 init(S);const W=S.aiWorld;if(!W)return;W.month++;
 const alive=W.nations.filter(n=>!n.annexed&&!n.human);
 // Domestic economy and military investment for every AI state.
 alive.forEach(n=>{
  const g=n.growth+(n.stability-55)*.000012+rnd(-.0015,.0015);
  n.gdp=Math.max(1,n.gdp*(1+clamp(g,-.012,.018)));
  n.pop=Math.max(.01,n.pop*(1+rnd(-.0001,.0008)));
  n.treasury=clamp(n.treasury+n.gdp*.0012-rnd(1,Math.max(2,n.gdp*.0008)),0,n.gdp*.12);
  n.stability=clamp(n.stability+rnd(-1.2,.9)+(n.treasury>n.gdp*.04?.25:0),15,95);
  if(n.treasury>n.gdp*.035&&Math.random()<.22)n.power=clamp(n.power+rnd(.1,1.2),3,100);
 });
 // Diplomatic activity: agreements are durable, reciprocal and limited.
 for(let i=0;i<alive.length;i++){
  const a=alive[i];
  if(a.allies.length>0&&Math.random()<.025)a.allies=a.allies.filter(x=>W.nations.some(n=>n.name===x&&!n.annexed));
  if(Math.random()<.018){const candidates=alive.filter(b=>b!==a&&!a.allies.includes(b.name)&&!b.allies.includes(a.name)&&!a.war&&!b.war&&Math.abs(a.power-b.power)<42);
   if(candidates.length){const b=pick(candidates);a.allies.push(b.name);b.allies.push(a.name);W.alliances.push({a:a.name,b:b.name,formed:W.month});W.events.unshift(`🤝 ${a.name} и ${b.name} заключили союз`)} }
 }
 // Wars: expansion is restrained by cooldowns, power balance and alliance support.
 alive.forEach(a=>{
  if(a.war){const w=W.wars.find(x=>x.id===a.war);if(!w){a.war=null;return}return}
  if(Math.random()>.009)return;
  const targets=alive.filter(b=>b!==a&&!b.war&&!b.allies.includes(a.name)&&!a.allies.includes(b.name)&&!W.wars.some(w=>w.a===a.name&&w.b===b.name||w.a===b.name&&w.b===a.name));
  if(!targets.length)return;
  const b=pick(targets),support=(a.allies.length*.12),def=(b.allies.length*.14);
  if(a.power*(1+support)<b.power*(.72+def)||a.treasury<a.gdp*.008)return;
  const id=`${W.month}:${a.name}:${b.name}`;a.war=id;b.war=id;
  W.wars.push({id,a:a.name,b:b.name,started:W.month,score:0});
  W.events.unshift(`⚔️ ${a.name} объявила войну государству ${b.name}`);
 });
 W.wars=W.wars.filter(w=>{
  const a=W.nations.find(n=>n.name===w.a),b=W.nations.find(n=>n.name===w.b);
  if(!a||!b||a.annexed||b.annexed){if(a)a.war=null;if(b)b.war=null;return false}
  const as=a.power*(1+a.allies.length*.1),bs=b.power*(1+b.allies.length*.1);
  w.score+=clamp((as-bs)/Math.max(20,as+bs)*18,-8,8);
  a.treasury=Math.max(0,a.treasury-a.gdp*.0018);b.treasury=Math.max(0,b.treasury-b.gdp*.0018);
  a.power=Math.max(2,a.power-rnd(.1,.8));b.power=Math.max(2,b.power-rnd(.1,.8));
  if(W.month-w.started<3)return true;
  if(Math.abs(w.score)<13&&W.month-w.started<9)return true;
  const winner=w.score>=0?a:b,loser=winner===a?b:a;
  if(winner.power>loser.power*.78&&Math.random()<.72){
   const share=clamp(.08+rnd(0,.12),.08,.2);winner.pop+=loser.pop*share;winner.gdp+=loser.gdp*share*.8;winner.treasury+=loser.treasury*.12;
   loser.pop*=1-share;loser.gdp*=1-share*.8;loser.stability=clamp(loser.stability-12,10,95);
   W.owners[loser.name]=winner.name;
   if(share>.16&&winner.power>loser.power*1.25&&Math.random()<.18){loser.annexed=true;loser.owner=winner.name;winner.pop+=loser.pop;winner.gdp+=loser.gdp;W.events.unshift(`🏴 ${winner.name} полностью аннексировала ${loser.name}`)}
   else W.events.unshift(`🗺 ${winner.name} захватила часть территории ${loser.name}`);
  }else W.events.unshift(`🕊 ${a.name} и ${b.name} заключили мир без изменения границ`);
  a.war=null;b.war=null;return false;
 });
 W.events=W.events.slice(0,80);
 // Player-facing diplomatic reactions and news.
 const p=W.nations.find(n=>n.name===W.player);
 if(p){const nearby=alive.filter(n=>n!==p&&!n.annexed).sort((a,b)=>Math.abs(b.power-p.power)-Math.abs(a.power-p.power));
  if(nearby.length&&W.month%6===0){const n=pick(nearby.slice(0,Math.min(25,nearby.length)));if(n.allies.includes(p.name))W.events.unshift(`🤝 Союзник ${n.name} предлагает совместную торговлю`);else if(n.power>p.power*1.35&&n.relations<-10)W.events.unshift(`⚠️ ${n.name} усиливает давление на ${p.name}`)}
 }
 W.events=W.events.slice(0,80);
}
function panel(S){init(S);const W=S.aiWorld;if(!W)return'';const active=W.nations.filter(n=>!n.annexed).length,aiCount=W.nations.filter(n=>!n.human).length,alliances=W.alliances.length,wars=W.wars.length,top=[...W.nations].filter(n=>!n.annexed).sort((a,b)=>b.gdp-a.gdp).slice(0,8);
 return `<section class="panel wide"><h2>🌐 Мировая система ИИ</h2><p class="muted">Стран под управлением ИИ: ${aiCount} · ваша страна: ${W.player} · независимых: ${active} · союзов: ${alliances} · войн: ${wars} · месяц симуляции: ${W.month}</p><div class="cards">${top.map(n=>`<div class="mini"><b>${n.name}</b><br>ВВП: ${Math.round(n.gdp).toLocaleString('ru-RU')} · армия: ${Math.round(n.power)}<br>Стабильность: ${Math.round(n.stability)}% · казна: ${Math.round(n.treasury)}</div>`).join('')}</div><h3>Последние мировые события</h3><div class="feed">${W.events.slice(0,12).map(e=>`<div>${e}</div>`).join('')||'<span class="muted">Мирная обстановка. ИИ начнёт действовать с течением времени.</span>'}</div></section>`;
}
window.NationsAI={init,tick,panel};
})();
