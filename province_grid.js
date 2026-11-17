/* Детализация карты: разбивает существующие административные регионы на игровые провинции.
   Исходные административные регионы и их экономические профили остаются родительскими.
   Новые провинции нужны для карты, фронта и территориального выбора. */
(function(){
'use strict';
const TARGET=3000;
const areaOf=poly=>{let a=0;if(!poly||poly.length<3)return 0;for(let i=0,j=poly.length-1;i<poly.length;j=i++)a+=poly[j][0]*poly[i][1]-poly[i][0]*poly[j][1];return Math.abs(a/2)};
function inRings(x,y,rings){let hit=false;for(const r of rings||[]){for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}}return hit}
function inPoly(x,y,poly){return inRings(x,y,[poly])}
function clip(poly,mx,my,nx,ny){const out=[];for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],da=(a[0]-mx)*nx+(a[1]-my)*ny,db=(b[0]-mx)*nx+(b[1]-my)*ny;if(da<=1e-8)out.push(a);if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}return out}
function voronoiInPoly(points,base){return points.map((p,i)=>{let poly=base.map(q=>[q[0],q[1]]);for(let j=0;j<points.length&&poly.length>2;j++){if(i===j)continue;const q=points[j];poly=clip(poly,(p[0]+q[0])/2,(p[1]+q[1])/2,q[0]-p[0],q[1]-p[1])}return poly})}
function bounds(poly){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of poly){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])}return[x0,y0,x1,y1]}
function samplePoints(C,parent,need){
 const b=bounds(parent),a=Math.max(.001,areaOf(parent)),cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,out=[],seen=new Set();
 const add=(x,y)=>{const k=Math.round(x*1e5)+':'+Math.round(y*1e5);if(seen.has(k)||!inPoly(x,y,parent)||!inRings(x,y,C.rings))return;seen.add(k);out.push([x,y])};
 if(Number.isFinite(C._centerX))add(C._centerX,C._centerY);
 let step=Math.sqrt(a/Math.max(12,need*18));
 for(let pass=0;pass<5&&out.length<need;pass++,step*=.58){const nx=Math.max(2,Math.ceil((b[2]-b[0])/step)),ny=Math.max(2,Math.ceil((b[3]-b[1])/step)),stride=Math.max(1,Math.ceil(Math.sqrt(nx*ny/18000)));for(let ix=0;ix<=nx;ix+=stride)for(let iy=0;iy<=ny;iy+=stride){add(b[0]+(ix+.5)*(b[2]-b[0])/nx,b[1]+(iy+.5)*(b[3]-b[1])/ny);if(out.length>=Math.max(need*5,need+8))break} }
 if(out.length<need){
  const cc=parent.reduce((s,p)=>[s[0]+p[0]/parent.length,s[1]+p[1]/parent.length],[0,0]);
  add(cc[0],cc[1]);
 }
 if(!out.length)return[];
 // Начинаем с точки рядом с центром исходной области, затем выбираем максимально разнесённые точки.
 const pref=C._preferred||[cx,cy];let first=0,bd=Infinity;out.forEach((p,i)=>{const d=(p[0]-pref[0])**2+(p[1]-pref[1])**2;if(d<bd){bd=d;first=i}});
 const chosen=[out[first]],used=new Set([first]);
 while(chosen.length<need&&chosen.length<out.length){let bi=-1,far=-1;for(let i=0;i<out.length;i++){if(used.has(i))continue;let d=Infinity;for(const q of chosen)d=Math.min(d,(out[i][0]-q[0])**2+(out[i][1]-q[1])**2);if(d>far){far=d;bi=i}}if(bi<0)break;used.add(bi);chosen.push(out[bi])}
 return chosen;
}
function distribute(total,weights){const sum=weights.reduce((a,b)=>a+b,0)||weights.length,raw=weights.map(w=>total*(w||1)/sum),out=raw.map(x=>Math.floor(x));let left=total-out.reduce((a,b)=>a+b,0);raw.map((x,i)=>({i,f:x-out[i]})).sort((a,b)=>b.f-a.f).slice(0,left).forEach(x=>out[x.i]++);return out}
function expand(countries,target=TARGET){
 const all=Object.values(countries||{}).filter(C=>C&&C.name&&Array.isArray(C.regs)&&C.regs.length);
 const baseTotal=all.reduce((n,C)=>n+C.regs.length,0);if(baseTotal>=target)return{before:baseTotal,after:baseTotal,target:baseTotal,expanded:0};
 const eligible=all.filter(C=>(Number(C.area)||0)>100||C.regs.length>1),fixed=all.filter(C=>!eligible.includes(C));
 const fixedCount=fixed.reduce((n,C)=>n+C.regs.length,0),eligibleCount=eligible.reduce((n,C)=>n+C.regs.length,0);
 const wanted=Math.max(eligibleCount,target-fixedCount),raw=eligible.map(C=>C.regs.length*wanted/Math.max(1,eligibleCount)),countryTargets=raw.map(x=>Math.floor(x));
 let rem=wanted-countryTargets.reduce((a,b)=>a+b,0);raw.map((x,i)=>({i,f:x-countryTargets[i]})).sort((a,b)=>b.f-a.f).slice(0,rem).forEach(x=>countryTargets[x.i]++);
 let actual=0;
 eligible.forEach((C,ci)=>{
  const old=C.regs.slice(),targetN=Math.max(old.length,countryTargets[ci]),weights=old.map(r=>areaOf(r.cell||[])||Math.max(1,Number(r.s)||1)),alloc=distribute(targetN,weights),next=[];
  old.forEach((r,ri)=>{
   const parent=Array.isArray(r.cell)&&r.cell.length>2?r.cell:null,n=Math.max(1,alloc[ri]);
   if(!parent||n===1){next.push({...r,id:C.iso+':'+next.length,parentId:r.id,parentName:r.parentName||r.n||C.name,baseName:r.baseName||r.n||C.name,childIndex:0});return}
   C._preferred=[r.cx,r.cy];const centers=samplePoints(C,parent,n);delete C._preferred;
   if(centers.length<=1){next.push({...r,id:C.iso+':'+next.length,parentId:r.parentId||r.id,parentName:r.parentName||r.n||C.name,baseName:r.baseName||r.n||C.name,childIndex:0});return}
   const cells=voronoiInPoly(centers,parent),areas=cells.map(areaOf),sum=areas.reduce((a,b)=>a+b,0)||cells.length;
   cells.forEach((cell,j)=>{
    if(!cell||cell.length<3||areaOf(cell)<1e-7)return;
    const baseName=String(r.n||C.name).replace(/ \([^)]*\)$/,'');
    const name=centers.length>1?`${baseName} · провинция ${j+1}`:baseName;
    next.push({...r,id:C.iso+':'+next.length,n:name,parentId:r.parentId||r.id,parentName:r.parentName||baseName,baseName,childIndex:j,
      s:(Number(r.s)||100)*(areas[j]||1)/sum,cell,cx:centers[j][0],cy:centers[j][1],d:'M'+cell.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z',_k:null});
   });
  });
  C.regs=next;C.provinceCount=next.length;actual+=next.length;
 });
 fixed.forEach(C=>{C.provinceCount=C.regs.length;actual+=C.regs.length});
 return{before:baseTotal,after:actual,target,expanded:actual-baseTotal,countries:all.length};
}
window.NovariaProvinceGrid={expand,areaOf,voronoiInPoly};
})();
