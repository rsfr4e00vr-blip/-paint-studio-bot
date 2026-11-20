/* Mobile battlefield hardening: bounded combat effects for Telegram WebView.
   Combat state (units, HP, movement and capture) is never derived from FX. */
(function(root){
'use strict';
const LIMIT=84;
const ALLOWED=new Set(['shot','trail','wake','dust','splash','fire','ghost','flash','smoke','boom','ping','flag','hit']);
const LIFE={shot:1.2,trail:1.3,wake:1.9,dust:1.1,splash:.9,fire:.5,ghost:3.4,flash:.18,smoke:2.2,boom:1.1,ping:.45,flag:.45,hit:.35};
function clean(list){
 const out=[];
 for(const f of Array.isArray(list)?list:[]){
  if(!f||!ALLOWED.has(f.kind))continue;
  if(!Number.isFinite(+f.x)||!Number.isFinite(+f.y)||!Number.isFinite(+f.t0))continue;
  const cap=LIFE[f.kind]||.5,life=Math.max(.05,Math.min(cap,Number(f.life)||cap));
  out.push({...f,x:Number(f.x),y:Number(f.y),t0:Number(f.t0),life});
 }
 if(out.length>LIMIT){
  const priority=f=>f.kind==='shot'?3:(f.kind==='boom'||f.kind==='hit'||f.kind==='ghost')?2:1;
  out.sort((a,b)=>priority(b)-priority(a)||b.t0-a.t0);
  out.length=LIMIT;out.sort((a,b)=>a.t0-b.t0);
 }
 return out;
}
function install(core){
 if(!core||!core.MM||core.MM.__battlefieldHardening)return false;
 const mm=core.MM;let effects;
 const wrap=a=>new Proxy(clean(a),{
  get(target,key){
   if(key==='push')return function(...items){const next=clean(target.concat(items));target.length=0;Array.prototype.push.apply(target,next);return target.length};
   return Reflect.get(target,key,target);
  },
  set(target,key,value){if(key==='length'&&Number(value)>LIMIT)value=LIMIT;return Reflect.set(target,key,value,target)}
 });
 Object.defineProperty(mm,'fx',{configurable:true,enumerable:true,get(){return effects},set(v){effects=wrap(v)}});
 effects=wrap(mm.fx);mm.__battlefieldHardening=true;
 mm.trimCombatEffects=()=>{mm.fx=clean(mm.fx);return mm.fx.length};
 return true;
}
const api={install,clean,LIMIT};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root&&root.MilMap&&root.MilMap.core)install(root.MilMap.core);
else if(root)root.addEventListener&&root.addEventListener('load',()=>{if(root.MilMap&&root.MilMap.core)install(root.MilMap.core)},{once:true});
root.BattlefieldHardening=api;
})(typeof window!=='undefined'?window:globalThis);
