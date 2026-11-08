(()=>{
const $=s=>document.querySelector(s),cv=$('#cv'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height;
if(!cv||!$('#dock'))return;
const st=document.createElement('style');st.textContent='.tabs button{font-size:12px;white-space:nowrap}#xt{flex:1;min-width:0;background:var(--p2);color:var(--t);border:1px solid var(--l);border-radius:10px;min-height:38px;padding:0 10px;font:inherit;user-select:text;-webkit-user-select:text}';document.head.appendChild(st);
let mode=null,hist=[];
const tb=document.createElement('button');tb.textContent='✎ Текст';$('.tabs').appendChild(tb);
const pn=document.createElement('div');pn.className='panel';pn.id='p4';
pn.innerHTML='<div class="row"><input id="xt" type="text" placeholder="Твой текст" maxlength="80"><button id="xb">B</button></div>'+
'<div class="row"><select id="xf" style="flex:1"></select><button id="xgo" class="on">Вставить текст</button></div>'+
'<label class="r"><span>Размер</span><input id="xs" type="range" min="12" max="260" value="70"><b id="xsv">70</b></label>'+
'<div class="row" id="xe"></div><div class="row"><button id="xu">↶ Убрать последнее</button></div><div id="xh" style="color:var(--m);font-size:12px"></div>';
$('#dock').appendChild(pn);
[['Обычный','system-ui,sans-serif'],['Книжный','Georgia,serif'],['Моно','monospace'],['Рукописный','"Comic Sans MS","Segoe Print",cursive'],['Жирный','Impact,"Arial Black",sans-serif']].forEach(f=>{const o=document.createElement('option');o.textContent=f[0];o.value=f[1];$('#xf').appendChild(o)});
let bold=false;$('#xb').onclick=e=>{bold=!bold;e.target.classList.toggle('on',bold)};
$('#xs').oninput=e=>$('#xsv').textContent=e.target.value;
'😀 😍 😎 🤩 😂 🥳 😴 🤯 ❤️ 🔥 ⭐ ✨ 🌈 ☀️ 🌙 ⚡ ❄️ 🌸 🌳 🍎 🍕 🐱 🐶 🦄 🐼 🚀 🎈 🎁 👑 💎 🎵'.split(' ').forEach(e=>{const b=document.createElement('button');b.textContent=e;b.dataset.e=e;b.style.fontSize='20px';b.onclick=()=>setMode(mode&&mode.e===e?null:{t:'st',e});$('#xe').appendChild(b)});
function hint(){$('#xh').textContent=mode?'Режим вставки: тапай по холсту. Чтобы двигать и приближать холст, выключи режим (нажми ещё раз ту же кнопку).':'Введи текст и нажми «Вставить текст» или выбери стикер.'}
function setMode(m){mode=m;$('#xgo').classList.toggle('on',!!(m&&m.t==='text'));document.querySelectorAll('#xe button').forEach(b=>b.classList.toggle('on',!!(m&&m.e===b.dataset.e)));hint()}
$('#xgo').onclick=()=>setMode(mode&&mode.t==='text'?null:{t:'text'});setMode(null);
const others=[...document.querySelectorAll('.tabs button')].filter(b=>b!==tb);
others.forEach(b=>b.addEventListener('click',()=>setMode(null)));
tb.onclick=()=>{const was=pn.classList.contains('show');document.querySelectorAll('.panel').forEach(x=>x.classList.remove('show'));document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('on'));if(!was){pn.classList.add('show');tb.classList.add('on')}else setMode(null);window.dispatchEvent(new Event('resize'))};
$('#xu').onclick=()=>{if(hist.length)ctx.putImageData(hist.pop(),0,0)};
function place(e){const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;if(x<0||y<0||x>W||y>H)return;
const txt=$('#xt').value.trim();if(mode.t==='text'&&!txt){$('#xh').textContent='Сначала введи текст в поле выше.';return}
hist.push(ctx.getImageData(0,0,W,H));if(hist.length>10)hist.shift();
const size=+$('#xs').value;ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.textAlign='center';ctx.textBaseline='middle';
if(mode.t==='text'){ctx.font=(bold?'bold ':'')+size+'px '+$('#xf').value;ctx.fillStyle=getComputedStyle($('#cur')).backgroundColor;ctx.fillText(txt,x,y)}
else{ctx.font=size+'px "Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif';ctx.fillText(mode.e,x,y)}
ctx.restore()}
$('#stage').addEventListener('pointerdown',e=>{if(!mode)return;e.stopPropagation();e.preventDefault();place(e)},true);
const sh=document.createElement('button');sh.textContent='📤';sh.title='Поделиться';$('.top').insertBefore(sh,$('#save'));
sh.onclick=()=>cv.toBlob(async b=>{const f=new File([b],'paint-studio.png',{type:'image/png'});try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e.name==='AbortError')return}$('#save').click()},'image/png');
})();
