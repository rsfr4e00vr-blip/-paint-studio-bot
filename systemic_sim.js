/* Unified monthly state simulation: production, labor, households, taxes, budget,
   resources, regions, war and political feedback. Shared rules for player and AI. */
(function(root){
 'use strict';
 const C=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:0));
 const N=(v,d=0)=>Number.isFinite(+v)?+v:d;
 const avg=(xs,d)=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:d;
 const DRAG=.0020, CYC_SD=.0009, EMP_MAX=95.5;
 function player(S){
  const pop=Math.max(1,N(S.pop,1)), war=!!S.war || (Array.isArray(S.wars)&&S.wars.some(w=>w&&!w.ended));
  const regions=Array.isArray(S.regions)?S.regions:[];
  const laborForce=pop*.47, mobilized=Math.max(0,N(S.army))*1.0;
  const workforce=Math.max(0,laborForce-Math.min(laborForce*.22,mobilized*(war?.22:.08)));
  const employment=C(N(S.employment,90)-(war?1.0:0)+(N(S.industry,50)-50)*.012,35,99);
  const laborFactor=C(.55+employment/200,.65,1.04);
  const industrialCapacity=Math.max(0,N(S.civ,3)*1.8+N(S.mil,1)*1.15+N(S.industry,50)*.035);
  const resourceFactor=C(Math.min(N(S.food,50)/55,N(S.fuel,50)/48,N(S.energy,50)/50,N(S.steel,50)/42),.18,1.15);
  const outputFactor=C((.62+industrialCapacity/35)*laborFactor*(.72+resourceFactor*.28),.55,1.35);
  const baseGDP=Math.max(100,N(S.gdp,100));
  const production=baseGDP*outputFactor*.012;
  const foodUse=pop/1e6*(war?2.25:1.75), fuelUse=(industrialCapacity*.11+pop/1e6*.18)*(war?1.35:1), energyUse=industrialCapacity*.10+pop/1e6*.22, steelUse=industrialCapacity*.075+(war?N(S.mil,1)*.08:0);
  const shortages={food:Math.max(0,foodUse-N(S.food,50)*.055),fuel:Math.max(0,fuelUse-N(S.fuel,50)*.055),energy:Math.max(0,energyUse-N(S.energy,50)*.055),steel:Math.max(0,steelUse-N(S.steel,50)*.055)};
  const shortage=Object.values(shortages).reduce((a,b)=>a+b,0);
  const productionEfficiency=C(1-shortage/Math.max(1,foodUse+fuelUse+energyUse+steelUse)*.16,.72,1);
  const output=production*productionEfficiency;
  const wages=output*.34, householdIncome=wages+baseGDP*.002, consumption=householdIncome*C(.68+N(S.approval,50)/500,.65,.88);
  const taxRate=C(N(S.tax,20)/100,.05,.45), taxRevenue=baseGDP*taxRate/12*1.12;
  const militaryCost=war?Math.max(0,N(S.army))*0.0018+N(S.air)*.012+N(S.aa)*.8:Math.max(0,N(S.army))*.00055+N(S.air)*.004;
  const resourcePenalty=shortage*.12;
  const regional=[];
  let weighted=0, weight=0;
  regions.forEach(r=>{
   const rp=Math.max(1,N(r.pop,1)), share=rp/pop, infra=C(N(r.infra,50)/100,.2,1.2), ind=C(N(r.industry,40)/100,.1,1.2);
   const unrest=C(N(r.unrest,10)/100,0,1), loyalty=C(N(r.loyalty,50)/100,0,1);
   const localOutput=output*share*C(.55+infra*.24+ind*.28-unrest*.18,.25,1.25);
   r.regionalGDP=Math.round(localOutput);
   r.productivity=C(N(r.productivity,.75)+(infra-.5)*.0015+(ind-.5)*.0018-unrest*.0012,.3,1.4);
   const localJobs=employment+(ind-.5)*12-unrest*8;
   r.employment=C(localJobs,20,99);
   weighted+=r.productivity*rp;weight+=rp;
   regional.push({name:r.name,gdp:r.regionalGDP,employment:r.employment});
  });
  const regionalProductivity=weight?weighted/weight:.75;
  const deficit=Math.max(0,N(S.lastExp,0)+militaryCost-taxRevenue);
  const debtPressure=C(N(S.debt,0)/Math.max(1,baseGDP*12),0,3);
  // Запущенная экономика: дефицит еды/топлива/энергии/стали и огромный долг тянут ВВП вниз, пока игрок не исправит
  const lowest=Math.min(N(S.food,50),N(S.fuel,50),N(S.energy,50),N(S.steel,50));
  const neglect=Math.max(0,(28-lowest)/28)*.007+Math.max(0,N(S.debt,0)/baseGDP-1)*.004;
  const growth=C((output/baseGDP)*.55-0.006-resourcePenalty*.0007-(war?.004:0)-debtPressure*.0005+(regionalProductivity-.75)*.006-neglect,-.035,.025);
  // Деловой цикл: затухающий случайный процесс (AR(1)) — бумы и рецессии, как в реальной экономике.
  // Постоянный «вычет зрелости» (-DRAG) не даёт ВВП расти без предела; результат: в среднем +2.5–3.5% в год,
  // случайные рецессии в ~1 году из 6–8, безработица около естественной (4–8%), а плохая политика уводит ниже.
  const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  S._cyc=C(.93*N(S._cyc,0)+gauss()*CYC_SD,-.012,.012);
  const cyc=S._cyc;
  S.gdp=Math.max(100,baseGDP*(1+growth-DRAG+cyc));
  S.employment=C(employment+(outputFactor-1)*1.4-(war?1.0:0)+(resourceFactor-.8)*.35+Math.min(0,cyc)*25,35,EMP_MAX);
  S.food=C(N(S.food,50)-foodUse*.025+(N(S.food,50)<35?.3:0),0,100);
  S.fuel=C(N(S.fuel,50)-fuelUse*.03+(N(S.fuel,50)<30?.2:0),0,100);
  S.energy=C(N(S.energy,50)-energyUse*.025,0,100);
  S.steel=C(N(S.steel,50)-steelUse*.03,0,100);
  S._systemic=S._systemic||{months:0,cumulativeOutput:0,cumulativeTaxes:0,cumulativeConsumption:0,last:{}};
  const X=S._systemic;X.months++;X.cumulativeOutput+=output;X.cumulativeTaxes+=taxRevenue;X.cumulativeConsumption+=consumption;
  X.last={output:Math.round(output),wages:Math.round(wages),consumption:Math.round(consumption),taxRevenue:Math.round(taxRevenue),militaryCost:Math.round(militaryCost),shortages,growth:+(growth*100).toFixed(3),resourceFactor:+resourceFactor.toFixed(2),regionalProductivity:+regionalProductivity.toFixed(2),regions};
  S._systemic.last=X.last;
  const unrestDelta=(N(S.inflation,5)>15?.45:0)+(N(S.employment,90)<75?.55:0)+(war?.25:0)+(shortage>.5?.35:0)-(N(S.approval,50)>60?.18:0);
  S.approval=C(N(S.approval,50)-unrestDelta*.32+(N(S.employment,90)-85)*.008,0,100);
  S.stability=C(N(S.stability,50)-unrestDelta*.2+(N(S.employment,90)-85)*.006,0,100);
  S.coupRisk=C(N(S.coupRisk,10)+unrestDelta*.22+(N(S.debt,0)>baseGDP*3?.2:0),0,100);
  if(regions.length) regions.forEach(r=>{r.unrest=C(N(r.unrest,10)+unrestDelta*.12-(N(r.loyalty,50)>65?.08:0),0,100)});
 }
 function nation(n){
  const gdp=Math.max(1,N(n.gdp,1)),pop=Math.max(.01,N(n.pop,1));
  const war=!!n.war, industry=C(N(n.industry,1),.2,2), infra=C(N(n.infrastructure,1),.2,2);
  const food=C(N(n.food,55),0,100),fuel=C(N(n.fuel,55),0,100),energy=C(N(n.energy,55),0,100),steel=C(N(n.steel,55),0,100);
  const resourceFactor=C(Math.min(food/55,fuel/48,energy/50,steel/42),.18,1.15);
  const labor=C(1-N(n.exhaustion,0)/180-(war?.07:0),.55,1.05);
  const output=gdp*.010*C(.68+industry*.20+infra*.12,.65,1.15)*labor*C(.78+resourceFactor*.22,.72,1);
  const consumption=gdp*.0035*pop, taxes=consumption*.18+output*.1;
  const upkeep=(war?gdp*.0038:gdp*.0014)+Math.max(0,N(n.debt,0))*.0008;
  const shortage=(food<25?1:0)+(fuel<25?1:0)+(energy<25?1:0)+(steel<25?1:0);
  const growth=C(output/gdp*.45-.004-(war?.004:0)-shortage*.0015,-.04,.022);
  n.gdp=Math.max(1,gdp*(1+growth));
  n.treasury=C(N(n.treasury,0)+taxes-upkeep,-gdp*.5,gdp*.2);
  if(n.treasury<0){n.debt=N(n.debt,0)+Math.abs(n.treasury);n.treasury=0}
  n.food=C(food-pop*.012+(food<30?.15:0),0,100);n.fuel=C(fuel-(industry*.20+(war?.8:.35)),0,100);
  n.energy=C(energy-(industry*.15),0,100);n.steel=C(steel-(industry*(war?.22:.10)),0,100);
  n.stability=C(N(n.stability,55)-(shortage*.45)-(war?.25:0)+(growth>0?.08:0),0,100);
  n.exhaustion=C(N(n.exhaustion,0)+(war?1.1:-.35),0,100);
  n._systemic={output:Math.round(output),taxes:Math.round(taxes),consumption:Math.round(consumption),growth:+(growth*100).toFixed(3),resourceFactor:+resourceFactor.toFixed(2),shortage};
 }
 root.SystemicSim={tick:player,tickNation:nation};
})(window);
