
(()=>{
const $=s=>document.querySelector(s);
const box=$("#multiBox"), canvas=$("#cv");
let socket=null, room="", myId="", isDrawer=false, applyingRemote=false, syncTimer=null;
function notice(t){$("#multiNotice").textContent=t}
function show(){box.style.display="block"}
function close(){box.style.display="none"}
$("#multiOpen").onclick=show;$("#multiClose").onclick=close;
function send(obj){if(socket&&socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(obj))}
function connect(code, telegramGroup=false){
 if(socket)socket.close();
 room=code.toUpperCase();
 const proto=location.protocol==="https:"?"wss":"ws";
 socket=new WebSocket(`${proto}://${location.host}/ws/draw/${encodeURIComponent(room)}`);
 const s=socket;
 socket.onopen=()=>{const tgUser=window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initDataUnsafe&&Telegram.WebApp.initDataUnsafe.user;send({type:"join",name:$("#playerName").value.trim()||(tgUser&&tgUser.first_name)||"Игрок",tg_init_data:telegramGroup&&window.Telegram&&Telegram.WebApp?Telegram.WebApp.initData:""});};
 socket.onmessage=e=>{if(s!==socket)return;
  const m=JSON.parse(e.data);
  if(m.type==="joined"){
   PS.enterRoom();myId=m.id;$("#multiSetup").hidden=true;$("#multiGame").hidden=false;
   $("#roomLabel").textContent=m.room;$("#playerList").innerHTML="";
   if(m.image)drawRemote(m.image);
   if(m.telegram_group){
    isDrawer=!!m.is_drawer;
    $("#roundStart").hidden=true;
    $("#guessInput").placeholder="Угадывай прямо сообщением в Telegram-группе";
    $("#guessSend").hidden=true;
    // Lock the canvas immediately for every participant except the verified artist.
    PS.lock(!isDrawer);
    $("#stage").setAttribute("aria-disabled",isDrawer?"false":"true");
    notice(isDrawer?"Ты художник! Рисунок виден всей Telegram-группе.":"Ты зритель: холст заблокирован, угадывай сообщениями в группе.");
   }
   else {PS.lock(true);$("#roundStart").hidden=false;$("#guessSend").hidden=false;notice("Ты в комнате! Отправь код друзьям.");}
   renderPlayers(m.players);
  } else if(m.type==="players")renderPlayers(m.players);
  else if(m.type==="round"){
   isDrawer=false;PS.lock(true);$("#stage").setAttribute("aria-disabled","true");
   $("#roundStatus").textContent="🎨 Рисует: "+m.drawer+" · "+m.seconds+" сек.";
   $("#wordCard").textContent=isDrawer?"Ждём секретное слово…":"Угадывай, что рисуют!";
   $("#gameChat").innerHTML="";
   if(!isDrawer)notice(m.telegram_group?"Раунд начался — угадывай обычным сообщением в Telegram-группе!":"Раунд начался — пиши догадки в чат!");
  } else if(m.type==="your_word"){
   isDrawer=true;PS.lock(false);$("#stage").setAttribute("aria-disabled","false");$("#wordCard").textContent="ТВОЁ СЛОВО: "+m.word;
   notice("Нарисуй это слово, не называя его!");
  } else if(m.type==="canvas")drawRemote(m.data);
  else if(m.type==="clear")PS.clearAll();
  else if(m.type==="chat")chat(m.name+": "+m.text);
  else if(m.type==="correct"){chat("🎉 "+m.name+" угадал слово «"+m.word+"»!");renderPlayers(m.players);$("#wordCard").textContent="Угадали: "+m.word;}
  else if(m.type==="notice")notice(m.text);
 };
 socket.onclose=()=>{if(s!==socket)return;socket=null;isDrawer=false;PS.leaveRoom();$("#multiGame").hidden=true;$("#multiSetup").hidden=false;notice("Соединение закрыто. Можно рисовать в своём холсте или войти снова.");};
 socket.onerror=()=>notice("Не удалось подключиться к комнате.");
}
function renderPlayers(players){$("#playerList").innerHTML=(players||[]).map(p=>`<div>👤 ${escapeHtml(p.name)} <b style="float:right">${p.score} очк.</b></div>`).join("")||"Пока никого нет";}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function chat(s){const d=document.createElement("div");d.textContent=s;$("#gameChat").appendChild(d);$("#gameChat").scrollTop=$("#gameChat").scrollHeight;}
function drawRemote(data){applyingRemote=true;PS.setRemote(data,()=>{applyingRemote=false});}
$("#roomCreate").onclick=()=>connect(Math.random().toString(36).slice(2,7).toUpperCase());
$("#roomJoin").onclick=()=>{const c=$("#roomCode").value.trim();if(c.length<3)return notice("Введи код комнаты.");connect(c);};
$("#roundStart").onclick=()=>send({type:"start"});
$("#roomLeave").onclick=()=>{const o=socket;socket=null;if(o)o.close();isDrawer=false;PS.leaveRoom();$("#stage").removeAttribute("aria-disabled");$("#multiGame").hidden=true;$("#multiSetup").hidden=false;};
$("#canvasClear").onclick=()=>{if(isDrawer){PS.clearAll();send({type:"clear"});}};
function guess(){const v=$("#guessInput").value.trim().slice(0,100);if(v&&socket&&socket.readyState===WebSocket.OPEN){send({type:"guess",text:v});$("#guessInput").value="";}}
$("#guessSend").onclick=guess;$("#guessInput").addEventListener("keydown",e=>{if(e.key==="Enter")guess();});
function syncCanvas(){if(!isDrawer||!socket||socket.readyState!==1||applyingRemote)return;try{send({type:"canvas",data:PS.flat(.6)});}catch{}}
PS.onchange=()=>{if(isDrawer)setTimeout(syncCanvas,50)};
setInterval(()=>{if(isDrawer&&PS.stroking)syncCanvas()},800);
// Telegram Mini App direct-link parameter: draw_<ROOMCODE>.
const tg=window.Telegram&&Telegram.WebApp;
let startParam=(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.start_param)||new URLSearchParams(location.search).get("startapp")||"";
if(startParam.startsWith("tgdraw_")){
 const code=startParam.slice(7).toUpperCase();
 show();$("#roomCode").value=code;
 const user=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;
 if(user&&user.first_name)$("#playerName").value=user.first_name.slice(0,24);
 connect(code,true);
} else if(startParam.startsWith("draw_")){
 const code=startParam.slice(5).toUpperCase();
 show();$("#roomCode").value=code;
 const user=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;
 if(user&&user.first_name)$("#playerName").value=user.first_name.slice(0,24);
 connect(code);
}
})();
