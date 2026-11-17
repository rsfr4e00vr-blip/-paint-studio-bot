// Run: node test_military_industry_ai.js
const assert=require('node:assert/strict');
global.window=global;
let seed=98765;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
global.WORLD={list:[],map:{},REGS:{'Country A':[{n:'North'},{n:'South'}]}};
require('./nn_core.js');require('./ai_resources.js');require('./ai_arsenal.js');
const S={year:1,month:0,aiCfg:{nn:'std'},aiBrain:{q:{},n:{},steps:0,wins:0,last:[],stat:{},cnt:{},mem:[]},aiWorld:{events:[]}};
const c={name:'Country A',power:100,industry:1.6,treasury:5000,aggr:.8};
const rs=AIRES.init(c);rs.st={food:70,fuel:70,energy:70,steel:70};const featureRich=AIARS.feats({front:50,defAA:0,defStab:60,vs:'p',aggr:.5},c);rs.st.steel=0;const featurePoor=AIARS.feats({front:50,defAA:0,defStab:60,vs:'p',aggr:.5},c);assert.ok(featurePoor[10]<featureRich[10],'нейросеть получает уровень доступных ресурсов как входной признак');rs.st.steel=70;const beforeBuild={...rs.st};const savedRandom=Math.random;Math.random=()=>0;AIARS.manageFactories(S,c,false);Math.random=savedRandom;assert.ok(c.factoryBuilds.length>0,'ИИ должен строить завод при наличии ресурсов');assert.ok(rs.st.steel<beforeBuild.steel&&rs.st.fuel<beforeBuild.fuel&&rs.st.energy<beforeBuild.energy,'ИИ списывает сталь, топливо и энергию при строительстве');
const poor={name:'Poor Country',power:100,industry:1,treasury:5000,ars:{}};const poorRs=AIRES.init(poor);poorRs.st={food:50,fuel:0,energy:0,steel:0};AIARS.manageFactories(S,poor,false);assert.equal((poor.factoryBuilds||[]).length,0,'ИИ не должен начинать стройку без необходимых ресурсов');
for(let m=0;m<240;m++){S.year=1+Math.floor(m/12);S.month=m%12;AIARS.stock(c,false,S)}
assert.ok(c.milFactories&&c.milFactories.length>0,'нейросеть должна строить специализированные заводы');
assert.ok(c.milFactories.every(f=>f.region==='North'||f.region==='South'));
assert.ok(Object.values(c.ars).some(v=>v>0),'производство должно пополнять склад');
const region=c.milFactories[0].region,before=c.milFactories.length,damage=AIARS.damageFactory(S,c,region,10);
assert.ok(damage&&damage.destroyed,'завод должен уничтожаться при сильном ударе');
assert.equal(c.milFactories.length,before-1);
const prod={name:'Country B',power:30,industry:1,treasury:10,ars:{drone:0,rocket:0,mlrs:0,howitzer:0,tank:0,cruise:0,bomber:0},milFactories:[{type:'mlrs',region:'North',hp:100,progress:4}],factoryBuilds:[]};const prs=AIRES.init(prod);prs.st={food:70,fuel:40,energy:40,steel:0};AIARS.factoryTick(S,prod,false);assert.equal(prod.milFactories[0].stalled,true,'ИИ завод должен остановиться без стали');assert.equal(prod.milFactories[0].progress,4,'ИИ сохраняет этап производства');prs.st.steel=40;AIARS.factoryTick(S,prod,false);assert.equal(prod.ars.mlrs,1,'нейросетевой завод выпускает РСЗО');assert.equal(prs.st.steel,37);assert.equal(prs.st.fuel,37);assert.equal(prs.st.energy,36);assert.equal(prod.treasury,6);
console.log('OK: neural AI builds only when resources are available, pays construction and cycle inputs, produces stock and loses factories when bombed');
