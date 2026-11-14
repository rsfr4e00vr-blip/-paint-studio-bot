/* Shared diplomacy <-> economy simulation for single-player and multiplayer.
   Deterministic monthly effects; bounded to prevent runaway snowballing. */
(function(root){'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
 function metrics(S){
  const rel=Array.isArray(S.relations)?S.relations.filter(x=>x&&!x.self&&!x.annexed):[];
  const mp=S.mpDiplomacy||{};
  const relAvg=rel.length?rel.reduce((a,x)=>a+clamp(x.value,-100,100),0)/rel.length:0;
  const trade=clamp((mp.tradePartners||0)+(S.tradePartnersCount||0)+rel.filter(x=>(+x.value||0)>=35).length*.25,0,8);
  const allies=clamp((mp.allies||0)+(S.allies||[]).length,0,6);
  const localEmbargoes=rel.filter(x=>(+x.embargo||0)>(+S.month||0)).length;
  const sanctions=clamp((mp.sanctions||0)+(S.sanctionsCount||0)+localEmbargoes,0,6);
  const wars=clamp((mp.wars||0)+(S.wars||[]).length+(S.mpWars||[]).length,0,5);
  const localPacts=Object.values(S.pacts||{}).filter(end=>(+end||0)>(+S.month||0)).length;
  const pact=clamp((mp.pacts||0)+localPacts,0,4);
  const mpAvg=clamp(mp.relationAvg||0,-100,100);
  const relation=clamp((mp.participants>0?relAvg*.3+mpAvg*.7:relAvg),-100,100);
  const trust=clamp(S.trust??70,0,100);
  return {trade,allies,sanctions,wars,pact,relation,trust};
 }
 function tick(S){
  if(!S||S._ecoDipMonth===`${S.year||0}:${S.month||0}:${S.mpMonth||0}`)return metrics(S||{});
  const m=metrics(S),relation=m.relation/100;
  // Diplomacy changes the real economy, but capped to avoid a permanent runaway advantage.
  const tradeBoost=clamp(m.trade*.00012,-.0004,.0010);
  const pactBoost=clamp(m.pact*.00018,0,.00072);
  const allyBoost=clamp(m.allies*.00008,0,.00048);
  const sanctionDrag=clamp(m.sanctions*.00042,0,.0021);
  const warDrag=clamp(m.wars*.00038,0,.0019);
  const relationBoost=clamp(relation*.00045,-.00045,.00045);
  const trustFactor=clamp((m.trust-50)*.000012,-.0006,.0006);
  const growth=tradeBoost+pactBoost+allyBoost+relationBoost+trustFactor-sanctionDrag-warDrag;
  S.gdp=Math.max(100,(+S.gdp||100)*(1+growth));
  S.employment=clamp((+S.employment||90)+tradeBoost*120+sanctionDrag*-55-warDrag*28,-0+50,100);
  S.inflation=clamp((+S.inflation||0)+m.sanctions*.035+m.wars*.025-m.trade*.018-m.pact*.012,0,100);
  S.trust=clamp(m.trust+relation*.055+m.pact*.09-m.sanctions*.22-m.wars*.12,0,100);
  S.stability=clamp((+S.stability||50)+m.pact*.012+m.allies*.008+m.relation*.0008-m.sanctions*.025-m.wars*.018,0,100);
  // Small revenue channel: trade creates taxable activity; sanctions and war disrupt it.
  const fiscal=(+S.gdp||100)*clamp(m.trade*.000025+m.pact*.000018-m.sanctions*.00004-m.wars*.000025,-.0003,.0002);
  S.money=Math.max(0,(+S.money||0)+fiscal);
  S._ecoDipMonth=`${S.year||0}:${S.month||0}:${S.mpMonth||0}`;
  S._ecoDipLast={growth:growth*100,trade:m.trade,allies:m.allies,sanctions:m.sanctions,wars:m.wars,pacts:m.pact,relation:m.relation};
  return m;
 }
 function ai(n){
  const partners=(n.tradePartners||[]).length, allies=(n.allies||[]).length;
  const hostile=clamp(n.hostilePartners||0,0,partners),sanctions=clamp(n.sanctions||0,0,4);
  return clamp(partners*.00013+allies*.00008-hostile*.00028-sanctions*.0004,-.002,.0012);
 }
 function panel(S){
  const m=metrics(S),last=S._ecoDipLast||{};
  const pct=v=>(v>=0?'+':'')+Number(v||0).toFixed(2)+'%';
  const item=(name,val,desc)=>`<div class="mini"><b>${name}</b><strong>${val}</strong><small>${desc}</small></div>`;
  return `<section class="panel"><h2>🌐 Единая система: дипломатия и экономика</h2><p class="muted">Каждый месяц торговля, союзы, отношения, санкции и войны автоматически меняют рост ВВП, занятость, инфляцию, доверие и бюджет.</p><div class="cards">${item('Торговые связи',m.trade.toFixed(1),'Больше партнёров — выше спрос и доходы')}${item('Союзы и пакты',`${m.allies} / ${m.pact}`,'Снижают риски и поддерживают инвестиции')}${item('Санкции',m.sanctions,'Ограничивают экспорт, импорт и доверие')}${item('Военные конфликты',m.wars,'Повышают расходы и нарушают торговлю')}${item('Средние отношения',Math.round(m.relation),'Влияют на доступ к рынкам')}${item('Эффект на рост',pct(last.growth||0),'Суммарный месячный дипломатический эффект')}</div><small class="muted">Баланс ограничен: дипломатия помогает постепенно, а не даёт мгновенный огромный бонус. Война и санкции имеют обратную цену.</small></section>`;
 }
 root.ECODIP={metrics,tick,ai,panel};
})(typeof window!=='undefined'?window:globalThis);
