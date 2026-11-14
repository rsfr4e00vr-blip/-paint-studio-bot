/* Ресурсы ИИ-стран: добыча, истощение недр, нехватка и ЗАКУПКА по решению нейросети.
   У каждой страны (мировой ИИ и противники игрока) есть четыре запаса 0–100: еда, топливо, энергия, сталь.
   - Добыча: из недр страны (коды WORLD.map[страна].res). Нефть, газ и руда ИСТОЩАЮТСЯ, зерно возобновляется.
   - Расход: растёт с размером страны; на войне сильно больше. Производство оружия тоже тратит сталь и топливо.
   - Когда запас падает, нейросеть (общая для всех стран, учится по результатам) решает: что и когда купить на рынке.
     Покупка стоит денег (казна страны или её оборонный бюджет), поэтому бедная страна с пустыми недрами страдает:
     падают стабильность, мощь и ВВП. Правила те же, что у игрока (resources.js): +14 к запасу за покупку.
   - Нейросеть можно выключить в настройках партии — тогда страны покупают по простому правилу «самое дефицитное».
   Состояние нейросети лежит в сохранении (S.resBrain). */
(function(){'use strict';
const C=(v,a,b)=>Math.max(a,Math.min(b,v)),R=(a,b)=>a+Math.random()*(b-a);
const KEYS=['food','fuel','energy','steel'];
const NAME={food:'еда',fuel:'топливо',energy:'энергия',steel:'сталь'};
const ICON={food:'🌾',fuel:'⛽',energy:'⚡',steel:'🏭'};
const K={food:.9,fuel:1.4,energy:1.1,steel:1.0};          // сила месячного дефицита (как у игрока)
const LIFE={fuel:120,energy:170,steel:330};                // запас недр на единицу уровня
const GAIN=14,BASE_COST=500,LOW=30,CRIT=15;
const NIN=12,NH=14,NOUT=5;                                 // действия: 0 — ничего, 1..4 — купить еду/топливо/энергию/сталь
const price={food:1,fuel:1,energy:1,steel:1};              // мировые цены (растут при массовом дефиците)

const mIdx=S=>(S&&S.year!=null)?(S.year*12+(S.month||0)):null;
function codes(name){const w=window.WORLD&&WORLD.map&&WORLD.map[name];return String((w&&w.res)||'f')}
function tiersOf(name){
  const t={food:0,fuel:0,energy:0,steel:0};
  codes(name).split('').forEach(ch=>{
    if(ch==='f')t.food+=2;
    if(ch==='u'){t.fuel+=1;t.energy+=1}
    if(ch==='s')t.steel+=1.2;
    if(ch==='e')t.energy+=1;
    if(ch==='q')t.steel+=1;
  });
  return t;
}
function init(c){
  if(c.rs)return c.rs;
  const t=tiersOf(c.name),left={},max={};
  ['fuel','energy','steel'].forEach(k=>{if(t[k]>0){left[k]=max[k]=t[k]*LIFE[k]*R(.7,1.3)}});
  c.rs={st:{food:R(55,75),fuel:R(55,75),energy:R(55,75),steel:R(55,75)},tier:t,left,max,buy:{food:0,fuel:0,energy:0,steel:0},spent:0,shortM:0,fund:0,last:null};
  return c.rs;
}
/* Сколько единиц уровня добычи реально работает (истощённые недра дают 0) */
function supply(rs,k){
  if(k==='food')return rs.tier.food;
  return rs.left[k]>0?rs.tier[k]:0;
}
const need=c=>.6+Math.max(5,+c.power||20)/200;              // потребность в «уровнях» добычи: больше у крупных стран
const gdpEst=c=>typeof c.gdp==='number'&&c.gdp>0?c.gdp:Math.max(5,+c.power||20)*420;
const costOf=(c,k,war)=>Math.round(C(gdpEst(c)/42000*BASE_COST,15,900)*price[k]*(war?1.25:1));
const canSpend=c=>typeof c.treasury==='number'?Math.max(0,c.treasury)*.06:(c.rs?c.rs.fund:0);
function pay(c,x){if(typeof c.treasury==='number')c.treasury-=x;else c.rs.fund=Math.max(0,c.rs.fund-x)}
function stateValue(rs){const v=KEYS.map(k=>rs.st[k]);const mean=v.reduce((a,b)=>a+b,0)/4;return mean/100+Math.min(...v)/100*2}

function brain(S){if(!S.resBrain||typeof S.resBrain!=='object')S.resBrain={nn:null,steps:0,stat:{},mem:[],buys:{food:0,fuel:0,energy:0,steel:0}};const b=S.resBrain;if(!b.stat)b.stat={};if(!b.mem)b.mem=[];if(!b.buys)b.buys={food:0,fuel:0,energy:0,steel:0};return b}
function feats(rs,c,war,afford){
  const f=[];KEYS.forEach(k=>f.push(C(rs.st[k]/100,0,1)));
  KEYS.forEach(k=>f.push(rs.max[k]?C(rs.left[k]/rs.max[k],0,1):(k==='food'?1:0)));   // сколько недр осталось (0 — своих недр нет)
  f.push(war?1:0,C(afford,0,2)/2,C(KEYS.filter(k=>rs.st[k]<LOW).length/4,0,1),1);
  return f.map(v=>+v.toFixed(3));
}
const eps=b=>Math.max(.04,.25*Math.exp(-b.steps/1500));
function ruleChoice(rs,ok){let best=0,bs=LOW;KEYS.forEach((k,i)=>{if(ok(i+1)&&rs.st[k]<bs){bs=rs.st[k];best=i+1}});return best}

/* Один месяц жизни ресурсов страны. Возвращает true, если была покупка. */
function tick(S,c,atWar){
  const mi=mIdx(S);if(mi==null)return false;
  const rs=init(c);if(rs.m===mi)return false;rs.m=mi;
  const p=Math.max(5,+c.power||20);
  if(typeof c.treasury!=='number')rs.fund=Math.min(p*12,rs.fund+p*(atWar?1.2:.8));
  // 1) добыча и истощение недр
  const nd=need(c);
  KEYS.forEach(k=>{
    const sup=supply(rs,k);
    if(k!=='food'&&rs.left[k]>0){rs.left[k]-=rs.tier[k]*1.4;if(rs.left[k]<=0){rs.left[k]=0;if(window.AIARS&&S.aiWorld&&S.aiWorld.events&&Math.random()<.5){S.aiWorld.events.unshift(`${ICON[k]} ${c.name}: недра истощены (${NAME[k]}) — придётся покупать`);S.aiWorld.events.length=Math.min(S.aiWorld.events.length,80)}}}
    // 2) баланс: добыча − потребность (+ военный расход)
    let d=(sup-nd)*K[k]*.45;
    if(atWar)d-=({food:.4,fuel:1.0,energy:.3,steel:.7})[k];
    rs.st[k]=C(rs.st[k]+d,0,100);
  });
  // 3) решение о покупке: нейросеть (или простое правило, если она выключена)
  const worst=Math.min(...KEYS.map(k=>rs.st[k]));
  let bought=false;
  const tries=worst<CRIT?2:1;
  for(let n=0;n<tries;n++){
    const funds=canSpend(c),mid=costOf(c,'fuel',atWar);
    const ok=i=>i===0||(rs.st[KEYS[i-1]]<92&&funds>=costOf(c,KEYS[i-1],atWar));
    const x=feats(rs,c,atWar,funds/Math.max(1,mid));
    let k;
    if(window.NN&&!NN.off){
      const b=brain(S),net=NN.get(b,'nn',NIN,NH,NOUT,[.05,0,0,0,0]),q=NN.predict(net,x).slice();
      const cold=Math.max(.3,1-b.steps/6000);                                  // стартовая подсказка: когда запас мал — покупать; постепенно уступает опыту
      KEYS.forEach((kk,i)=>{q[i+1]+=C((LOW+8-rs.st[kk])/(LOW+8),0,1)*.9*cold});
      k=NN.choose(q,ok,eps(b));
      if(k<0)k=0;
      // учимся на итоге прошлого решения этой страны
      if(rs.prev&&rs.prev.x){
        const v=stateValue(rs),r=C((v-rs.prev.v)*6-rs.prev.spent/(gdpEst(c)*.012)*3,-2,2),q2=NN.predict(net,x),t=r+.9*Math.max(...q2);
        NN.train(net,rs.prev.x,rs.prev.k,t,.03);NN.remember(b.mem,{x:rs.prev.x,k:rs.prev.k,t:+t.toFixed(3)},120);NN.replay(net,b.mem,2,.015);
        const nm=rs.prev.k===0?'wait':KEYS[rs.prev.k-1],st=b.stat[nm]||(b.stat[nm]={n:0,r:0});st.n++;st.r+=r;b.steps++;
      }
      let spent=0;
      if(k>0){const kk=KEYS[k-1],cost=costOf(c,kk,atWar);pay(c,cost);rs.st[kk]=C(rs.st[kk]+GAIN,0,100);rs.buy[kk]++;rs.spent+=cost;spent=cost;b.buys[kk]++;bought=true}
      rs.prev={x,k,v:stateValue(rs),spent};
    }else{
      k=ruleChoice(rs,ok);
      if(k>0){const kk=KEYS[k-1],cost=costOf(c,kk,atWar);pay(c,cost);rs.st[kk]=C(rs.st[kk]+GAIN,0,100);rs.buy[kk]++;rs.spent+=cost;bought=true}
    }
    if(k<=0)break;
  }
  // 4) последствия нехватки
  const sh=KEYS.filter(k=>rs.st[k]<CRIT).length;
  if(sh){
    rs.shortM++;
    if(typeof c.stability==='number')c.stability=C(c.stability-.25*sh,5,96);
    c.power=Math.max(5,c.power-.12*sh);
    if(typeof c.gdp==='number')c.gdp*=1-.0012*sh;
  }else rs.shortM=Math.max(0,rs.shortM-1);
  return bought;
}
/* Производство оружия зависит от стали и топлива: чем меньше сталь, тем медленнее заводы */
/* Сколько запасов страны в критической нехватке (для урезания военного бюджета) */
function shortage(c){const rs=c&&c.rs;return rs?KEYS.filter(k=>rs.st[k]<CRIT).length:0}
function factor(c,k){const rs=c&&c.rs;if(!rs)return 1;return C(rs.st[k]/LOW,.15,1)}
function use(c,k,amount){const rs=c&&c.rs;if(rs)rs.st[k]=Math.max(0,rs.st[k]-amount)}
/* Мировые цены: чем больше стран в дефиците по ресурсу, тем он дороже (до +40%) */
function updatePrices(S){
  const list=[].concat(S.relations||[],(S.aiWorld&&S.aiWorld.nations)||[]).filter(c=>c&&c.rs&&!c.annexed);
  if(!list.length)return;
  KEYS.forEach(k=>{const low=list.filter(c=>c.rs.st[k]<LOW).length/list.length;price[k]=+(1+C(low*.8,0,.4)).toFixed(3)});
}
function summary(S){
  const b=brain(S),list=[].concat(S.relations||[],(S.aiWorld&&S.aiWorld.nations)||[]).filter(c=>c&&c.rs&&!c.annexed&&!c.self);
  const short={},empty={};KEYS.forEach(k=>{short[k]=list.filter(c=>c.rs.st[k]<LOW).length;empty[k]=list.filter(c=>c.rs.max[k]&&c.rs.left[k]<=0).length});
  const rows=Object.keys(b.stat).map(k=>({k,n:b.stat[k].n,avg:b.stat[k].r/Math.max(1,b.stat[k].n)})).filter(x=>x.n>=10);
  return{steps:b.steps,buys:b.buys,short,empty,total:list.length,price:Object.assign({},price),eps:eps(b),rows,nn:!!(window.NN&&!NN.off)};
}
function line(c){
  if(!c||!c.rs)return '';const rs=c.rs;
  return KEYS.map(k=>{const v=Math.round(rs.st[k]),bad=v<CRIT?'🔴':v<LOW?'🟡':'';return `${ICON[k]}${v}${bad}`}).join(' ');
}
window.AIRES={KEYS,NAME,ICON,init,tick,factor,shortage,use,updatePrices,summary,line,price,costOf,GAIN};
})();
