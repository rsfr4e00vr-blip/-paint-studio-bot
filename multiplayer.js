
(()=>{
const $=s=>document.querySelector(s);
const box=$("#multiBox"), canvas=$("#cv");
let socket=null, room="", myId="", isDrawer=false, isHost=false, applyingRemote=false, syncTimer=null, countdown=null;
function notice(t){$("#multiNotice").textContent=t}
function show(){box.style.display="block"}
function close(){box.style.display="none"}
$("#multiOpen").onclick=show;$("#multiClose").onclick=close;
function send(obj){if(socket&&socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(obj))}
function updateSettings(){send({type:"settings",category:$("#wordCategory").value,duration:Number($("#roundDuration").value)})}
function connect(code){
 if(socket)socket.close();
 room=code.toUpperCase();
 const proto=location.protocol==="https:"?"wss":"ws";
 socket=new WebSocket(`${proto}://${location.host}/ws/draw/${encodeURIComponent(room)}`);
 socket.onopen=()=>send({type:"join",name:$("#playerName").value.trim()||"Игрок"});
 socket.onmessage=e=>{
  const m=JSON.parse(e.data);
  if(m.type==="joined"){
   myId=m.id;isHost=!!m.host;$("#roundStart").hidden=!isHost;$("#multiSetup").hidden=true;$("#multiGame").hidden=false;
   $("#roomLabel").textContent=m.room;$("#playerList").innerHTML="";
   if(m.image)drawRemote(m.image);
   notice("Ты в комнате! Отправь код друзьям.");
   renderPlayers(m.players);if(m.category)$("#wordCategory").value=m.category;if(m.duration)$("#roundDuration").value=String(m.duration);
  } else if(m.type==="players")renderPlayers(m.players);
  else if(m.type==="round"){
   isDrawer=false;$("#stage").style.pointerEvents="none";if(countdown)clearInterval(countdown);
   let left=m.seconds;$("#roundStart").disabled=true;$("#roundStatus").textContent="🎨 Раунд "+m.round+": "+m.drawer+" · "+left+" сек.";countdown=setInterval(()=>{left=Math.max(0,left-1);$("#roundStatus").textContent="🎨 Рисует: "+m.drawer+" · "+left+" сек.";if(!left)clearInterval(countdown)},1000);
   $("#wordCard").textContent=isDrawer?"Ждём секретное слово…":"Угадывай, что рисуют!";
   $("#gameChat").innerHTML="";
   if(!isDrawer)notice("Раунд начался — пиши догадки в чат!");
  } else if(m.type==="your_word"){
   isDrawer=true;$("#stage").style.pointerEvents="auto";$("#wordCard").textContent="ТВОЁ СЛОВО: "+m.word;
   notice("Нарисуй это слово, не называя его!");
  } else if(m.type==="canvas")drawRemote(m.data);
  else if(m.type==="clear"){const c=canvas.getContext("2d");c.clearRect(0,0,canvas.width,canvas.height);}
  else if(m.type==="chat")chat(m.name+": "+m.text);
  else if(m.type==="correct"){chat("🎉 "+m.name+" угадал слово «"+m.word+"»!");renderPlayers(m.players);$("#wordCard").textContent="Угадали: "+m.word;}
  else if(m.type==="round_end"){isDrawer=false;$("#stage").style.pointerEvents="auto";if(countdown)clearInterval(countdown);$("#roundStart").disabled=false;$("#roundStatus").textContent=m.reason;$("#wordCard").textContent="Слово: "+m.word;renderPlayers(m.players);chat("Раунд завершён: "+m.word);}
  else if(m.type==="host"){isHost=!!m.isHost;$("#roundStart").hidden=!isHost;notice(isHost?"Ты теперь ведущий комнаты.":"")}
  else if(m.type==="settings"){ $("#wordCategory").value=m.category;$("#roundDuration").value=String(m.duration); }
  else if(m.type==="notice")notice(m.text);
 };
 socket.onclose=()=>{if(box.style.display==="block")notice("Соединение закрыто. Попробуй войти снова.");};
 socket.onerror=()=>notice("Не удалось подключиться к комнате.");
}
function renderPlayers(players){$("#playerList").innerHTML=(players||[]).map(p=>`<div>👤 ${escapeHtml(p.name)} <b style="float:right">${p.score} очк.</b></div>`).join("")||"Пока никого нет";}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function chat(s){const d=document.createElement("div");d.textContent=s;$("#gameChat").appendChild(d);$("#gameChat").scrollTop=$("#gameChat").scrollHeight;}
function drawRemote(data){applyingRemote=true;const im=new Image();im.onload=()=>{const c=canvas.getContext("2d");c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(im,0,0,canvas.width,canvas.height);applyingRemote=false;};im.src=data;}
$("#roomCreate").onclick=()=>connect(Math.random().toString(36).slice(2,7).toUpperCase());
$("#roomJoin").onclick=()=>{const c=$("#roomCode").value.trim();if(c.length<3)return notice("Введи код комнаты.");connect(c);};
$("#roundStart").onclick=()=>{updateSettings();send({type:"start"});};$("#wordCategory").onchange=updateSettings;$("#roundDuration").onchange=updateSettings;
$("#copyRoom").onclick=async()=>{try{await navigator.clipboard.writeText(room);notice("Код комнаты скопирован: "+room)}catch{prompt("Скопируй код комнаты:",room)}};
$("#roomLeave").onclick=()=>{if(socket)socket.close();socket=null;isDrawer=false;isHost=false;if(countdown)clearInterval(countdown);$("#stage").style.pointerEvents="auto";$("#multiGame").hidden=true;$("#multiSetup").hidden=false;};
$("#canvasClear").onclick=()=>{if(isDrawer){const c=canvas.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,canvas.width,canvas.height);send({type:"clear"});syncCanvas();}};
function guess(){const v=$("#guessInput").value.trim().slice(0,80);if(v){send({type:"guess",text:v});$("#guessInput").value="";}}
$("#guessSend").onclick=guess;$("#guessInput").addEventListener("keydown",e=>{if(e.key==="Enter")guess();});
function syncCanvas(){if(!isDrawer||!socket||socket.readyState!==1||applyingRemote)return;try{send({type:"canvas",data:canvas.toDataURL("image/jpeg",.42)});}catch{}}
$("#stage").addEventListener("pointerup",()=>{if(isDrawer)setTimeout(syncCanvas,180);},true);
$("#stage").addEventListener("pointercancel",()=>{if(isDrawer)setTimeout(syncCanvas,180);},true);
// Telegram Mini App direct-link parameter: draw_<ROOMCODE>.
const tg=window.Telegram&&Telegram.WebApp;
let startParam=(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.start_param)||new URLSearchParams(location.search).get("startapp")||"";
if(startParam.startsWith("draw_")){
 const code=startParam.slice(5).toUpperCase();
 show();$("#roomCode").value=code;
 const user=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;
 if(user&&user.first_name)$("#playerName").value=user.first_name.slice(0,24);
 connect(code);
}
})();
