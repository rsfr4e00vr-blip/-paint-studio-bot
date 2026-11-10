
(()=>{
const $=s=>document.querySelector(s);
const box=$("#multiBox"), canvas=$("#cv");
let socket=null, room="", myId="", isDrawer=false, applyingRemote=false, syncTimer=null;
function notice(t){$("#multiNotice").textContent=t}
function show(){box.style.display="block"}
function close(){box.style.display="none"}
$("#multiOpen").onclick=show;$("#multiClose").onclick=close;
function send(obj){if(socket&&socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(obj))}
function connect(code){
 if(socket)socket.close();
 room=code.toUpperCase();
 const proto=location.protocol==="https:"?"wss":"ws";
 socket=new WebSocket(`${proto}://${location.host}/ws/draw/${encodeURIComponent(room)}`);
 socket.onopen=()=>send({type:"join",name:$("#playerName").value.trim()||"Игрок"});
 socket.onmessage=e=>{
  const m=JSON.parse(e.data);
  if(m.type==="joined"){
   myId=m.id;$("#multiSetup").hidden=true;$("#multiGame").hidden=false;
   $("#roomLabel").textContent=m.room;$("#playerList").innerHTML="";
   if(m.image)drawRemote(m.image);
   notice("Ты в комнате! Отправь код друзьям.");
   renderPlayers(m.players);
  } else if(m.type==="players")renderPlayers(m.players);
  else if(m.type==="round"){
   isDrawer=false;
   $("#roundStatus").textContent="🎨 Рисует: "+m.drawer+" · "+m.seconds+" сек.";
   $("#wordCard").textContent=isDrawer?"Ждём секретное слово…":"Угадывай, что рисуют!";
   $("#gameChat").innerHTML="";
   if(!isDrawer)notice("Раунд начался — пиши догадки в чат!");
  } else if(m.type==="your_word"){
   isDrawer=true;$("#wordCard").textContent="ТВОЁ СЛОВО: "+m.word;
   notice("Нарисуй это слово, не называя его!");
  } else if(m.type==="canvas")drawRemote(m.data);
  else if(m.type==="clear"){const c=canvas.getContext("2d");c.clearRect(0,0,canvas.width,canvas.height);}
  else if(m.type==="chat")chat(m.name+": "+m.text);
  else if(m.type==="correct"){chat("🎉 "+m.name+" угадал слово «"+m.word+"»!");renderPlayers(m.players);$("#wordCard").textContent="Угадали: "+m.word;}
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
$("#roundStart").onclick=()=>send({type:"start"});
$("#roomLeave").onclick=()=>{if(socket)socket.close();socket=null;isDrawer=false;$("#multiGame").hidden=true;$("#multiSetup").hidden=false;};
$("#canvasClear").onclick=()=>{if(isDrawer){const c=canvas.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,canvas.width,canvas.height);send({type:"clear"});syncCanvas();}};
function guess(){const v=$("#guessInput").value.trim();if(v){send({type:"guess",text:v});$("#guessInput").value="";}}
$("#guessSend").onclick=guess;$("#guessInput").addEventListener("keydown",e=>{if(e.key==="Enter")guess();});
function syncCanvas(){if(!isDrawer||!socket||socket.readyState!==1||applyingRemote)return;try{send({type:"canvas",data:canvas.toDataURL("image/jpeg",.55)});}catch{}}
$("#stage").addEventListener("pointerup",()=>{if(isDrawer)setTimeout(syncCanvas,100);},true);
$("#stage").addEventListener("pointercancel",()=>{if(isDrawer)setTimeout(syncCanvas,100);},true);
})();
