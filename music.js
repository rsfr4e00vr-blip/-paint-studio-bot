/* Фоновая музыка игры: мелодия без слов, создаётся прямо в браузере (WebAudio), файлов не нужно.
   Мир — спокойная, мягкие аккорды и перебор. Война — тревожная: низкий гул, марш барабанов, короткая тема.
   Режим переключается сам, когда начинается или заканчивается война. Кнопка ♪ слева внизу: вкл/выкл и громкость. */
(()=>{'use strict';
const mtof=m=>440*Math.pow(2,(m-69)/12);
const PEACE={bpm:72,roots:[45,41,48,43],chords:[[57,60,64],[53,57,60],[55,60,64],[55,59,62]],pent:[72,74,76,79,81,84]};
const WAR={bpm:98,roots:[38,34,31,33],chords:[[62,65,69],[58,62,65],[55,58,62],[57,61,64]],motif:[0,null,3,null,5,null,7,5,3,null,2,null,0,null,-2,null],shift:[0,-2,-5,-3]};

function Engine(ctx,dest){
  const E={ctx,mode:'peace',step:0,next:0,buses:{}};
  const comp=ctx.createDynamicsCompressor();comp.connect(dest);
  const master=ctx.createGain();master.gain.value=.9;master.connect(comp);
  const rev=ctx.createConvolver(),len=Math.floor(ctx.sampleRate*2.6),buf=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}
  rev.buffer=buf;const rg=ctx.createGain();rg.gain.value=.32;rev.connect(rg);rg.connect(master);
  ['peace','war'].forEach(m=>{const g=ctx.createGain();g.gain.value=m==='peace'?1:0;g.connect(master);g.connect(rev);E.buses[m]=g});
  const nb=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  function tone(t,f,dur,type,vol,bus,o={}){
    const osc=ctx.createOscillator(),fl=ctx.createBiquadFilter(),g=ctx.createGain(),a=o.a||.01,r=o.r||.25;
    osc.type=type;osc.frequency.setValueAtTime(f,t);fl.type='lowpass';fl.frequency.value=o.lp||4000;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.setValueAtTime(vol,t+Math.max(a,dur));g.gain.linearRampToValueAtTime(0,t+dur+r);
    osc.connect(fl);fl.connect(g);g.connect(E.buses[bus]);osc.start(t);osc.stop(t+dur+r+.05)}
  function noise(t,dur,vol,bus,ft,f){
    const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=nb;fl.type=ft;fl.frequency.value=f;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);s.connect(fl);fl.connect(g);g.connect(E.buses[bus]);s.start(t,Math.random()*.5);s.stop(t+dur+.05)}
  function kick(t,v){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.32);o.connect(g);g.connect(E.buses.war);o.start(t);o.stop(t+.35)}
  function tom(t,f,v){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(f*1.6,t);o.frequency.exponentialRampToValueAtTime(f,t+.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g);g.connect(E.buses.war);o.start(t);o.stop(t+.4)}
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  function peace(s,t,spb){
    const M=PEACE,bar=Math.floor(s/16),ci=bar%4,k=s%16,ch=M.chords[ci],barLen=spb*16;
    if(k===0){ch.forEach(n=>tone(t,mtof(n),barLen*1.02,'sine',.05,'peace',{a:.9,r:1.4,lp:1800}));ch.forEach(n=>tone(t,mtof(n+12),barLen,'triangle',.018,'peace',{a:1.1,r:1.4,lp:1400}));tone(t,mtof(M.roots[ci]),barLen*.9,'sine',.13,'peace',{a:.05,r:.8,lp:400})}
    if(k%2===0&&Math.random()<.78){const n=pick(ch)+pick([12,12,24]);tone(t,mtof(n),.5,'triangle',.05,'peace',{a:.006,r:.5,lp:3000})}
    if((k===0||k===8||k===12)&&Math.random()<.55)tone(t,mtof(pick(M.pent)),spb*6,'sine',.045,'peace',{a:.12,r:1.1,lp:2500})}
  function war(s,t,spb){
    const M=WAR,bar=Math.floor(s/16),ci=bar%4,k=s%16,ch=M.chords[ci],barLen=spb*16;
    if(k===0){ch.forEach(n=>tone(t,mtof(n-12),barLen*1.02,'sawtooth',.03,'war',{a:.5,r:.9,lp:650}));if(bar%4===0)tone(t,mtof(M.roots[0]+12),spb*6,'sawtooth',.09,'war',{a:.04,r:.8,lp:420})}
    if(k%2===0){const r=M.roots[ci]+((k===6||k===14)?12:0);tone(t,mtof(r),spb*1.6,'sawtooth',.12,'war',{a:.005,r:.12,lp:320})}
    if(k===0||k===8||k===10)kick(t,.95);
    if(k===4||k===12){noise(t,.2,.22,'war','bandpass',1900);tone(t,190,.12,'triangle',.12,'war',{a:.002,r:.08})}
    if(k%2===0)noise(t,.05,.045,'war','highpass',7500);
    if(bar%4===3&&k>=12)tom(t,k===12?110:k===13?130:k===14?150:170,.5);
    const m=M.motif[k];if(m!=null&&bar%2===1)tone(t,mtof(62+m+M.shift[ci]),spb*1.7,'sawtooth',.055,'war',{a:.01,r:.2,lp:1700})}
  E.schedule=function(until){
    const m=E.mode==='war'?WAR:PEACE,spb=60/m.bpm/4;
    while(E.next<until){(E.mode==='war'?war:peace)(E.step,E.next,spb);E.next+=spb;E.step++}};
  E.setMode=function(m){if(m===E.mode)return;E.mode=m;const now=ctx.currentTime;E.step=0;E.next=Math.max(E.next,now+.1);
    Object.keys(E.buses).forEach(k=>{const g=E.buses[k].gain;g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.linearRampToValueAtTime(k===m?1:0,now+2.5)})};
  E.master=master;
  return E}

const Music={Engine};
/* оффлайн-рендер: чтобы послушать пример без игры */
Music.render=async(mode,sec,sr)=>{sr=sr||32000;const ctx=new OfflineAudioContext(1,sr*sec,sr),E=Engine(ctx,ctx.destination);
  if(mode==='war'){E.buses.peace.gain.value=0;E.buses.war.gain.value=1;E.mode='war'}
  E.next=0;E.schedule(sec);return ctx.startRendering()};

/* ---------- живое воспроизведение в игре ---------- */
const KEY='novaria_music_v1';let st={on:true,vol:.45};try{Object.assign(st,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};
let eng=null,timer=0,ui=null;
const inWar=()=>{const S=window.NG&&window.NG.S;return !!S&&((S.wars||[]).some(w=>w&&!w.ended&&!w.over)||(S.mpWars||[]).length>0)};
function start(){
  if(!st.on)return;
  try{
    if(!eng){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=new AC();eng=Engine(ctx,ctx.destination);eng.next=ctx.currentTime+.2;eng.setMode(inWar()?'war':'peace')}
    if(eng.ctx.state==='suspended')eng.ctx.resume();
    eng.master.gain.value=.9*st.vol*2;
    if(!timer)timer=setInterval(()=>{if(!eng||!st.on||eng.ctx.state!=='running')return;eng.setMode(inWar()?'war':'peace');eng.schedule(eng.ctx.currentTime+.35);label()},120)
  }catch(e){}
}
function stop(){if(eng&&eng.ctx.state==='running')eng.ctx.suspend()}
function label(){if(ui&&eng)ui.lab.textContent=eng.mode==='war'?'⚔ тема войны':'🕊 тема мира'}
function build(){
  const css=document.createElement('style');
  css.textContent='#mus-btn{position:fixed;left:10px;right:auto;top:auto;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:10010;width:42px;height:42px;border-radius:50%;border:1px solid #60788b;background:#142331ee;color:#eef4f8;font-size:20px;cursor:pointer}#mus-btn.off{opacity:.55}#mus-pan{position:fixed;left:10px;right:auto;top:auto;bottom:calc(62px + env(safe-area-inset-bottom,0px));z-index:10010;display:none;background:#142331f2;border:1px solid #60788b;border-radius:12px;padding:10px 12px;color:#eef4f8;font:13px system-ui,sans-serif;min-width:190px}#mus-pan input{width:100%}#mus-pan button{margin:6px 0;padding:7px 10px;border-radius:8px;border:1px solid #60788b;background:#263a4b;color:#fff;width:100%}';
  document.head.appendChild(css);
  const b=document.createElement('button');b.id='mus-btn';b.textContent='♪';b.setAttribute('aria-label','Музыка');
  const p=document.createElement('div');p.id='mus-pan';p.innerHTML='<div id="mus-lab" style="margin-bottom:4px">музыка выключена</div><button id="mus-tg"></button><input id="mus-vol" type="range" min="0" max="100">';
  document.body.append(b,p);
  ui={b,p,lab:p.querySelector('#mus-lab'),tg:p.querySelector('#mus-tg'),vol:p.querySelector('#mus-vol')};
  const paint=()=>{ui.tg.textContent=st.on?'🔇 Выключить музыку':'🎵 Включить музыку';ui.b.classList.toggle('off',!st.on);ui.vol.value=Math.round(st.vol*100);if(!st.on)ui.lab.textContent='музыка выключена'};
  b.onclick=()=>{p.style.display=p.style.display==='block'?'none':'block'};
  ui.tg.onclick=()=>{st.on=!st.on;save();paint();if(st.on)start();else stop()};
  ui.vol.oninput=()=>{st.vol=ui.vol.value/100;save();if(eng)eng.master.gain.value=.9*st.vol*2};
  paint();
  /* браузер разрешает звук только после касания — запускаем при первом нажатии */
  const first=()=>{start();label();if(eng){removeEventListener('pointerdown',first,true);removeEventListener('touchend',first,true)}};
  addEventListener('pointerdown',first,true);addEventListener('touchend',first,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(st.on&&eng)start()});
}
Music.start=start;Music.stop=stop;window.Music=Music;
if(document.body)build();else addEventListener('DOMContentLoaded',build);
})();
