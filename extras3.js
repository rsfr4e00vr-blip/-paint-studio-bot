(()=>{
const $=s=>document.querySelector(s);
const T={'Неон':['#ff4fd8','#8b5cf6','#3df5ff','#fff'],'Лайм':['#c8ff3d','#22d3a0','#0ea5e9','#0b1a05'],'Закат':['#ffd23f','#ff7a45','#ff3d81','#2b0a12'],'Лёд':['#5ee7ff','#5b8cff','#c4b5fd','#06122b']};
const css=':root{--bg:#0b0a14;--p:#16122a;--p2:#ffffff12;--t:#f7f4ff;--m:#a79fc9;--l:#ffffff22;--g1:#ff4fd8;--g2:#8b5cf6;--g3:#3df5ff;--on:#fff;--a:var(--g1)}'+
'html,body{background:#0b0a14;font-family:ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",sans-serif}'+
'.top{background:linear-gradient(#0b0a14,#0b0a1400)}'+
'button{border-radius:14px;background:#ffffff12;border:1px solid #ffffff22;font-weight:600;transition:transform .12s,box-shadow .2s}'+
'button:active{transform:scale(.9)}'+
'button.on{background:linear-gradient(135deg,var(--g1),var(--g2));border-color:transparent;color:var(--on);font-weight:800;box-shadow:0 4px 18px -3px var(--g1)}'+
'.tabs{padding:10px 10px 6px}.tabs button{border-radius:999px}'+
'#dock{background:#16122ad9;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border-top:1px solid #ffffff22;border-radius:24px 24px 0 0;box-shadow:0 -10px 40px -12px var(--g2)}'+
'.panel.show{animation:xup .2s ease-out}@keyframes xup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'+
'.zoom{color:var(--g3);font-weight:800}'+
'#stage{background-color:#0b0a14;background-image:radial-gradient(#ffffff18 1px,transparent 1.5px);background-size:20px 20px}'+
'#stage::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;opacity:.3;background:radial-gradient(circle at 10% 0,var(--g2),transparent 55%),radial-gradient(circle at 95% 100%,var(--g3),transparent 50%)}'+
'#cv{border-radius:10px;box-shadow:0 0 0 2px #ffffff30,0 0 40px -4px var(--g2),0 20px 50px #000c}'+
'input[type=range]:not(.hue){-webkit-appearance:none;appearance:none;height:8px;border-radius:99px;background:linear-gradient(90deg,var(--g1),var(--g3))}'+
'input[type=range]:not(.hue)::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid var(--g1);box-shadow:0 0 14px var(--g1)}'+
'label.r b{color:var(--g3)}'+
'.sw{border:2px solid #ffffff55;transition:transform .12s}.sw.sel{outline:3px solid var(--g3);outline-offset:2px;transform:scale(1.12);box-shadow:0 0 14px var(--g3)}'+
'#cur{border-radius:50%;border:3px solid #ffffff55}'+
'select,#xt,#gp{background:#ffffff12;border:1px solid #ffffff22;border-radius:14px;color:var(--t)}'+
'.th img{border-radius:14px;border:2px solid #ffffff30}'+
'#tm button{width:46px;min-width:46px;height:38px;border-radius:50%;padding:0}';
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
function apply(n,save){const t=T[n]||T['Неон'],r=document.documentElement.style;r.setProperty('--g1',t[0]);r.setProperty('--g2',t[1]);r.setProperty('--g3',t[2]);r.setProperty('--on',t[3]);
document.querySelectorAll('#tm button').forEach(b=>b.style.outline=b.title===n?'3px solid #fff':'none');
if(save)try{localStorage.setItem('psTheme',n)}catch(e){}}
const p3=$('#p3');
if(p3){const row=document.createElement('div');row.className='row';row.id='tm';row.innerHTML='<span style="color:var(--m)">Тема</span>';
Object.keys(T).forEach(n=>{const b=document.createElement('button');b.title=n;b.style.background='linear-gradient(135deg,'+T[n][0]+','+T[n][1]+')';b.style.outlineOffset='2px';b.onclick=()=>apply(n,true);row.appendChild(b)});p3.insertBefore(row,p3.firstChild)}
let cur='Неон';try{cur=localStorage.getItem('psTheme')||cur}catch(e){}
apply(cur);
})();
