/* Маленькая настоящая нейросеть (MLP: вход → tanh-слой → линейный выход) с онлайн-обучением.
   Её используют: тактик оружия (ai_arsenal.js), стратегический мозг стран (ai_nations.js)
   и население (population_ai.js). Веса — обычные массивы, поэтому лежат прямо в сохранении игры (JSON). */
(function(){'use strict';
const C=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=()=>Math.random()*2-1;
/* make(nin, nh, nout, outBias): outBias — стартовые «знания» (на выходе уже стоят разумные оценки) */
function make(nin,nh,nout,outBias){
  const n={nin,nh,nout,W1:[],b1:[],W2:[],b2:[],steps:0};
  const s1=Math.sqrt(1/nin),s2=Math.sqrt(1/nh);
  for(let i=0;i<nh*nin;i++)n.W1.push(rnd()*s1);
  for(let i=0;i<nh;i++)n.b1.push(0);
  for(let i=0;i<nout*nh;i++)n.W2.push(rnd()*s2*.15);
  for(let i=0;i<nout;i++)n.b2.push(outBias&&outBias[i]!=null?outBias[i]:0);
  return n;
}
function ok(n,nin,nh,nout){
  return !!n&&n.nin===nin&&n.nh===nh&&n.nout===nout&&Array.isArray(n.W1)&&n.W1.length===nin*nh&&n.W2.length===nout*nh&&n.b1.length===nh&&n.b2.length===nout;
}
/* get: берёт сеть из сохранения или создаёт/пересоздаёт, если архитектура изменилась */
function get(holder,key,nin,nh,nout,outBias){
  if(!ok(holder[key],nin,nh,nout))holder[key]=make(nin,nh,nout,outBias);
  return holder[key];
}
function fwd(n,x){
  const h=new Array(n.nh),y=new Array(n.nout);
  for(let j=0;j<n.nh;j++){let a=n.b1[j];const o=j*n.nin;for(let i=0;i<n.nin;i++)a+=n.W1[o+i]*(x[i]||0);h[j]=Math.tanh(a)}
  for(let k=0;k<n.nout;k++){let a=n.b2[k];const o=k*n.nh;for(let j=0;j<n.nh;j++)a+=n.W2[o+j]*h[j];y[k]=a}
  return {h,y};
}
const predict=(n,x)=>fwd(n,x).y;
/* train: один шаг SGD только по выбранному выходу k (так учится Q-функция: меняем оценку сделанного действия) */
function train(n,x,k,target,lr){
  const f=fwd(n,x),err=C(target-f.y[k],-2,2);lr=lr||.03;
  const o2=k*n.nh,dh=new Array(n.nh);
  for(let j=0;j<n.nh;j++){dh[j]=err*n.W2[o2+j]*(1-f.h[j]*f.h[j]);n.W2[o2+j]+=lr*err*f.h[j]}
  n.b2[k]+=lr*err;
  for(let j=0;j<n.nh;j++){const o=j*n.nin,g=lr*dh[j];for(let i=0;i<n.nin;i++)n.W1[o+i]+=g*(x[i]||0);n.b1[j]+=g}
  n.steps++;return err;
}
/* Память опыта: небольшой буфер, из него случайно переучиваемся (replay) — так сеть не забывает старое */
function remember(buf,item,cap){buf.push(item);if(buf.length>cap)buf.shift()}
function replay(n,buf,count,lr){
  if(!buf.length)return;
  for(let i=0;i<count;i++){const m=buf[Math.floor(Math.random()*buf.length)];train(n,m.x,m.k,m.t,lr)}
}
/* Выбор действия: ε-жадно по Q с маской допустимых действий; q — массив оценок, ok(i) — можно ли */
function choose(q,allowed,eps){
  const idx=[];for(let i=0;i<q.length;i++)if(!allowed||allowed(i))idx.push(i);
  if(!idx.length)return -1;
  if(Math.random()<eps)return idx[Math.floor(Math.random()*idx.length)];
  let b=idx[0];for(const i of idx)if(q[i]>q[b])b=i;return b;
}
window.NN={make,get,fwd,predict,train,remember,replay,choose,C};
})();
