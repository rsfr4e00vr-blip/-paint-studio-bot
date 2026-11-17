/* Novaria integrated city damage, recovery and global systems.
   Data is stored inside the existing campaign state; legacy saves are migrated lazily. */
(function(root){
 'use strict';
 const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
 const num=(v,d=0)=>Number.isFinite(+v)?+v:d;
 const TYPES=[
  ['housing','Жилые кварталы',1.0,1.0],['power','Электросеть',1.5,1.2],
  ['water','Водоснабжение',1.2,1.1],['industry','Промышленность',2.0,1.5],
  ['hospital','Больницы',1.8,1.0],['transport','Транспортные узлы',1.4,1.3]
 ];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function ensure(S){
  if(!S||!Array.isArray(S.regions))return;
  S.novaria=S.novaria&&typeof S.novaria==='object'?S.novaria:{version:1,doctrine:'balanced',influence:20,techRace:0,orgs:[],spies:{},counterIntel:1,crises:[],history:[],aiMemory:{},recoveryBudget:0,program:false};
  const N=S.novaria;
  S.regions.forEach((r,ri)=>{
   if(!Array.isArray(r.assets)){
    r.assets=TYPES.map((t,i)=>({id:`${ri}-${t[0]}`,type:t[0],name:`${t[1]} · ${r.name}`,condition:100,repair:0,priority:t[0]==='power'||t[0]==='water'?2:1,baseCost:Math.round((r.pop||1000000)/1000000*100*t[2]),materials:100,workers:100,history:[]}));
   }
   r.assets.forEach(a=>{a.condition=clamp(a.condition);a.repair=clamp(a.repair);if(!Array.isArray(a.history))a.history=[]});
  });
  if(!Array.isArray(N.history))N.history=[];
  if(!N.aiMemory||typeof N.aiMemory!=='object')N.aiMemory={};
  if(!Array.isArray(N.orgs))N.orgs=[];
  if(!Array.isArray(N.crises))N.crises=[];
  if(!N.spies||typeof N.spies!=='object')N.spies={};
  return N;
 }
 function log(S,msg){S.log=Array.isArray(S.log)?S.log:[];S.log.unshift(`Год ${S.year||1}, ${['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][S.month||0]}: ${msg}`);S.log=S.log.slice(0,100)}
 function addHistory(S,r,a,kind,delta){
  const e={year:S.year||1,month:(S.month||0)+1,kind,delta:Math.round(delta),condition:Math.round(a.condition)};
  a.history.unshift(e);a.history=a.history.slice(0,12);
  S.novaria.history.unshift({region:r.name,asset:a.name,...e});S.novaria.history=S.novaria.history.slice(0,80);
 }
 function applyDamage(S,r,a,amount,reason){
  const old=a.condition;a.condition=clamp(old-amount);if(old!==a.condition){addHistory(S,r,a,reason,old-a.condition);a.repair=100-a.condition}
 }
 function totals(S){
  let all=0,n=0,critical=0;
  (S.regions||[]).forEach(r=>(r.assets||[]).forEach(a=>{all+=a.condition;n++;if(['power','water','transport'].includes(a.type))critical+=a.condition}));
  return {health:n?all/n:100,critical:n?critical/(S.regions.reduce((x,r)=>x+(r.assets||[]).filter(a=>['power','water','transport'].includes(a.type)).length,0)||1):100};
 }
 function tick(S){
  const N=ensure(S);if(!N)return;
  const atWar=!!S.war||(Array.isArray(S.wars)&&S.wars.some(w=>w&&!w.ended));
  // Abstract campaign attrition is deterministic by campaign month, so local MP catch-up produces the same result.
  if(atWar){
   const month=(num(S.year,1)*12+num(S.month,0));
   S.regions.forEach((r,ri)=>{
    if(((month*17+ri*29+ri*ri)%11)===0){
     const assets=r.assets||[];if(assets.length){const ix=(month+ri*3)%assets.length;applyDamage(S,r,assets[ix],1.2+(month%4)*.35,'Военные последствия');}
    }
   });
  }
  // Repair is gradual, budgeted, and constrained by workers and materials.
  let budget=Math.max(0,num(N.recoveryBudget));const program=!!N.program;
  S.regions.forEach(r=>{
   const avg=(r.assets||[]).reduce((x,a)=>x+a.condition,0)/Math.max(1,(r.assets||[]).length);
   r._novaHealth=avg;
   (r.assets||[]).sort((a,b)=>(b.priority||1)-(a.priority||1)).forEach(a=>{
    if(a.condition>=99.9||budget<=0)return;
    const need=(100-a.condition),cost=Math.max(1,a.baseCost*need/100);
    const spend=Math.min(budget,cost,program?cost*.08:cost*.04);
    if(spend<=0)return;
    const materialFactor=clamp(num(S.steel,50)*.9+num(S.industry,50)*.1,10,100)/100;
    const laborFactor=clamp(num(S.employment,90),40,100)/100;
    const gain=Math.min(need,spend/Math.max(1,cost)*100*materialFactor*laborFactor);
    if(gain>0){a.condition=clamp(a.condition+gain);a.repair=100-a.condition;budget-=spend;addHistory(S,r,a,'Восстановление',gain);}
   });
  });
  N.recoveryBudget=budget;
  const t=totals(S),damage=Math.max(0,100-t.health);
  S._novaImpact={health:t.health,damage,critical:t.critical};
  // Infrastructure directly affects production, services and social stability.
  const penalty=damage*.00022;
  if(penalty>0){S.gdp=Math.max(100,num(S.gdp,100)*(1-penalty));S.employment=clamp(num(S.employment,90)-damage*.002,35,99);S.approval=clamp(num(S.approval,50)-damage*.003,0,100);}
  const power=(S.regions||[]).reduce((x,r)=>x+(r.assets||[]).filter(a=>a.type==='power').reduce((q,a)=>q+a.condition,0),0);
  const water=(S.regions||[]).reduce((x,r)=>x+(r.assets||[]).filter(a=>a.type==='water').reduce((q,a)=>q+a.condition,0),0);
  if(power<((S.regions||[]).length*70)){S.energy=clamp(num(S.energy,50)-.35);S.gdp=Math.max(100,S.gdp*.9995)}
  if(water<((S.regions||[]).length*70)){S.pop=Math.max(100000,Math.round(num(S.pop,1000000)*.9998))}
  // Long-term AI decision memory: records outcomes and adjusts policy priorities.
  const key=String(S.name||'country'),mem=N.aiMemory[key]||{months:0,repairWins:0,lastHealth:100,lessons:[]};
  mem.months++;if(t.health>mem.lastHealth+.1)mem.repairWins++;mem.lastHealth=t.health;
  if(mem.months%6===0){mem.lessons.unshift({month:num(S.year)*12+num(S.month),health:Math.round(t.health),debtRatio:+(num(S.debt)/Math.max(1,num(S.gdp))).toFixed(3),war:atWar});mem.lessons=mem.lessons.slice(0,12);}
  N.aiMemory[key]=mem;
  if(program&&N.recoveryBudget<100)N.program=false;
  // Crisis effects have a duration and feed into the existing economy.
  N.crises=N.crises.filter(c=>c.left>0);
  N.crises.forEach(c=>{c.left--;if(c.type==='energy')S.energy=clamp(S.energy-1);if(c.type==='food')S.food=clamp(S.food-1);if(c.type==='finance')S.trust=clamp(num(S.trust,70)-.5)});
 }
 function repair(S,regionIndex,assetIndex){
  const N=ensure(S),r=S.regions[regionIndex],a=r&&r.assets&&r.assets[assetIndex];if(!a)return {ok:false,msg:'Объект не найден'};
  const cost=Math.max(1,Math.round(a.baseCost*(100-a.condition)/100*.08));
  if(a.condition>=99.9)return {ok:false,msg:'Объект уже восстановлен'};
  if(num(S.money)<cost)return {ok:false,msg:'Недостаточно средств'};
  S.money-=cost;N.recoveryBudget+=cost;N.program=true;return {ok:true,msg:`Выделено ${cost} млн на восстановление: ${a.name}`};
 }
 function setDoctrine(S,d){
  const allowed=['balanced','defensive','economic','technology','humanitarian'];if(!allowed.includes(d))return false;ensure(S).doctrine=d;return true;
 }
 function invest(S,kind){
  const N=ensure(S),cost={tech:500,espionage:250,influence:350,organization:200}[kind];if(!cost||num(S.money)<cost)return false;S.money-=cost;
  if(kind==='tech'){N.techRace=clamp(N.techRace+5,0,100);S.tech=clamp(num(S.tech,30)+1)}
  if(kind==='espionage'){N.counterIntel=clamp(N.counterIntel+.2,1,5);N.spies.recon=(N.spies.recon||0)+1}
  if(kind==='influence')N.influence=clamp(N.influence+5);
  if(kind==='organization'&&!N.orgs.includes('Международный совет'))N.orgs.push('Международный совет');
  return true;
 }
 function crisis(S,type){
  const N=ensure(S),allowed=['energy','food','finance'];if(!allowed.includes(type))return false;
  N.crises.push({id:`${type}-${S.year}-${S.month}`,type,left:6});return true;
 }
 function aiPlan(S){
  const N=ensure(S),t=totals(S),mem=N.aiMemory[String(S.name||'country')]||{lastHealth:100,lessons:[]};
  const debtRatio=num(S.debt)/Math.max(1,num(S.gdp));
  if(t.health<92&&num(S.money)>1000){N.program=true;N.recoveryBudget+=Math.min(500,num(S.money)*.015);S.money-=Math.min(500,num(S.money)*.015);}
  if(debtRatio>.8)N.doctrine='economic';
  else if(t.health<80)N.doctrine='humanitarian';
  else if(S.war)N.doctrine='defensive';
  mem.lastDecision={doctrine:N.doctrine,health:Math.round(t.health),debtRatio:+debtRatio.toFixed(2),month:num(S.year)*12+num(S.month)};
  N.aiMemory[String(S.name||'country')]=mem;
 }
 function panel(S){
  const N=ensure(S),t=totals(S),rows=(S.regions||[]).map((r,ri)=>`<details class="nova-region"><summary><b>${esc(r.name)}</b> · состояние ${Math.round(r._novaHealth||100)}%</summary><div class="nova-assets">${(r.assets||[]).map((a,ai)=>`<div class="nova-asset"><div><b>${esc(a.name)}</b><small>${esc(a.type)} · состояние ${Math.round(a.condition)}% · ремонт ${Math.round(100-a.condition)}%</small><div class="nova-meter"><i style="width:${a.condition}%"></i></div><small>Оценка ремонта: ${Math.round(a.baseCost*(100-a.condition)/100)} млн · записей истории: ${a.history.length}</small></div><button onclick="NovaSystems.repair(${ri},${ai})" ${a.condition>=99.9?'disabled':''}>Ремонт</button></div>`).join('')}</div></details>`).join('');
  return `<section class="panel wide"><h2>🏗 Разрушения и восстановление</h2><div class="nova-summary"><b>Среднее состояние объектов: ${Math.round(t.health)}%</b><span>Инфраструктура: ${Math.round(t.critical)}%</span><span>Фонд восстановления: ${Math.round(N.recoveryBudget)} млн</span></div><p class="muted">Повреждения и ремонт хранятся отдельно для каждого инфраструктурного объекта. Восстановление постепенное, зависит от бюджета, материалов и занятости.</p><div class="actions"><button class="primary" onclick="NovaSystems.program()">Госпрограмма восстановления</button><button onclick="NovaSystems.invest('tech')">Технологии −500 млн</button><button onclick="NovaSystems.invest('espionage')">Разведка −250 млн</button><button onclick="NovaSystems.invest('influence')">Влияние −350 млн</button><button onclick="NovaSystems.invest('organization')">Международный совет −200 млн</button></div><div class="nova-doctrine"><label>Военная доктрина / специализация</label><select onchange="NovaSystems.doctrine(this.value)"><option value="balanced" ${N.doctrine==='balanced'?'selected':''}>Сбалансированная</option><option value="defensive" ${N.doctrine==='defensive'?'selected':''}>Оборонительная</option><option value="economic" ${N.doctrine==='economic'?'selected':''}>Экономический приоритет</option><option value="technology" ${N.doctrine==='technology'?'selected':''}>Технологический приоритет</option><option value="humanitarian" ${N.doctrine==='humanitarian'?'selected':''}>Гуманитарный приоритет</option></select></div><h3>Регионы и объекты</h3>${rows||'<p>Нет регионов</p>'}<h3>Глобальные системы</h3><p>Влияние: ${Math.round(N.influence)} · технологическая гонка: ${Math.round(N.techRace)} · контрразведка: ${N.counterIntel.toFixed(1)} · организации: ${N.orgs.map(esc).join(', ')||'нет'}</p><p>Активные кризисы: ${N.crises.map(c=>`${esc(c.type)} (${c.left} мес.)`).join(', ')||'нет'}</p><div class="actions"><button onclick="NovaSystems.crisis('energy')">Событие: энергокризис</button><button onclick="NovaSystems.crisis('food')">Событие: продовольственный кризис</button><button onclick="NovaSystems.crisis('finance')">Событие: финансовый кризис</button></div><h3>Хроника восстановления</h3><div class="nova-history">${N.history.slice(0,12).map(h=>`<div>${h.year}/${h.month} · ${esc(h.region)} · ${esc(h.asset)} · ${esc(h.kind)} · ${h.condition}%</div>`).join('')||'История пока пуста'}</div></section>`;
 }
 root.NovaSystems={ensure,tick,repairAsset:repair,aiPlan,setDoctrine,investAsset:invest,crisisAsset:crisis,panel,
  program(){const S=root.NG&&root.NG.S;if(!S)return;const N=ensure(S),v=Math.min(1000,Math.max(0,num(S.money)*.05));if(v<1){root.NG.toast('Недостаточно средств');return}S.money-=v;N.recoveryBudget+=v;N.program=true;root.NG.toast(`В фонд восстановления направлено ${Math.round(v)} млн`);root.NG.render(true)},
  repair(ri,ai){const S=root.NG&&root.NG.S;if(!S)return;const r=repair(S,ri,ai);root.NG.toast(r.msg);root.NG.render(true)},
  doctrine(d){const S=root.NG&&root.NG.S;if(S&&setDoctrine(S,d)){root.NG.log('Изменена государственная доктрина: '+d);root.NG.render(true)}},
  invest(k){const S=root.NG&&root.NG.S;if(!S)return;root.NG.toast(invest(S,k)?'Инвестиция проведена':'Недостаточно средств');root.NG.render(true)},
  crisis(k){const S=root.NG&&root.NG.S;if(!S)return;crisis(S,k);root.NG.log('Начался кризис: '+k);root.NG.render(true)}
 };
})(window);
