import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi import WebSocket, WebSocketDisconnect
import asyncio, random, string, time
from nations_server import nations_socket, NROOMS, new_code
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

BASE = Path(__file__).parent
BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
BOT_USERNAME = os.environ.get("BOT_USERNAME", "").lstrip("@")
MINI_APP_SHORT_NAME = os.environ.get("MINI_APP_SHORT_NAME", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "").rstrip("/")
PORT = int(os.environ.get("PORT", "8000"))


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Mini App direct links pass draw_<ROOMCODE> as start_param.
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🎨 Paint Studio", web_app=WebAppInfo(url=WEBAPP_URL + "/"))],
        [InlineKeyboardButton("🏛 Симулятор Страны", web_app=WebAppInfo(url=WEBAPP_URL + "/game"))],
    ])
    await update.message.reply_text("Выбери, что открыть:", reply_markup=keyboard)


async def draw_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Post a group invitation that opens the drawing Mini App in Telegram."""
    if not update.effective_chat:
        return
    if not BOT_USERNAME or not MINI_APP_SHORT_NAME:
        await update.effective_message.reply_text(
            "🎨 Чтобы запустить игру в группе, администратору нужно настроить "
            "MINI_APP_SHORT_NAME в Render, а Mini App — в @BotFather."
        )
        return
    room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    draw_room(room_id)
    link = f"https://t.me/{BOT_USERNAME}/{MINI_APP_SHORT_NAME}?startapp=draw_{room_id}"
    keyboard = InlineKeyboardMarkup([[InlineKeyboardButton("🎨 Войти и играть", url=link)]])
    await update.effective_message.reply_text(
        "🎨 *Угадай, что я нарисовал!\n\n*"
        "Нажмите кнопку, чтобы войти в игровую комнату.\n"
        "Когда соберутся минимум два игрока, один начнёт рисовать, остальные будут угадывать!",
        reply_markup=keyboard, parse_mode="Markdown"
    )


async def nations_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Пост в группе: кнопка входа в мультиплеер «Симулятор государства»."""
    if not update.effective_chat:
        return
    code = new_code()
    if BOT_USERNAME and MINI_APP_SHORT_NAME:
        link = f"https://t.me/{BOT_USERNAME}/{MINI_APP_SHORT_NAME}?startapp=nat_{code}"
    else:
        link = f"{WEBAPP_URL}/game?room={code}"
    keyboard = InlineKeyboardMarkup([[InlineKeyboardButton("🌍 Войти в игру", url=link)]])
    await update.effective_message.reply_text(
        f"🏛 Симулятор государства — мультиплеер\nКомната: {code}\n\n"
        "У каждого игрока своя страна. Время идёт одновременно, побеждает тот, "
        "у кого больше очков в конце. Нужно минимум 2 игрока.",
        reply_markup=keyboard,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global BOT_USERNAME
    tg = None
    if BOT_TOKEN and WEBAPP_URL:
        tg = Application.builder().token(BOT_TOKEN).build()
        tg.add_handler(CommandHandler("start", start))
        tg.add_handler(CommandHandler("draw", draw_command))
        tg.add_handler(CommandHandler("nations", nations_command))
        await tg.initialize()
        if not BOT_USERNAME:
            me = await tg.bot.get_me()
            BOT_USERNAME = me.username or ""
        await tg.start()
        await tg.updater.start_polling(drop_pending_updates=True)
    else:
        print("BOT_TOKEN или WEBAPP_URL не заданы: бот не запущен, работает только сайт.")
    yield
    if tg:
        await tg.updater.stop()
        await tg.stop()
        await tg.shutdown()


app = FastAPI(lifespan=lifespan)


@app.get("/")
def paint():
    return FileResponse(BASE / "index.html")


@app.get("/game")
def game():
    return FileResponse(BASE / "game.html")


@app.get("/style.css")
def game_css():
    return FileResponse(BASE / "style.css", media_type="text/css")


@app.get("/multiplayer.css")
def multiplayer_css():
    return FileResponse(BASE / "multiplayer.css", media_type="text/css")


@app.get("/multiplayer.js")
def multiplayer_js():
    return FileResponse(BASE / "multiplayer.js", media_type="application/javascript")


@app.get("/nations.js")
def nations_js():
    return FileResponse(BASE / "nations.js", media_type="application/javascript")


@app.get("/nations.css")
def nations_css():
    return FileResponse(BASE / "nations.css", media_type="text/css")


@app.websocket("/ws/nations/{code}")
async def nations_ws(ws: WebSocket, code: str):
    await nations_socket(ws, code)


@app.get("/game.js")
def game_js():
    return FileResponse(BASE / "game.js", media_type="application/javascript")


@app.get("/health")
def health():
    return PlainTextResponse("ok")



# --- Paint Studio multiplayer drawing rooms (kept separate from nation simulator) ---
ROOMS = {}
WORD_BANKS = {
    "animals": "кот собака жираф пингвин черепаха акула крокодил бабочка слон лиса медведь кенгуру осьминог павлин ёж дельфин сова попугай верблюд лягушка улитка енот тигр лев зебра белка бобр фламинго хамелеон морж тюлень",
    "food": "пицца арбуз торт мороженое банан ананас бургер суши пончик сыр морковь клубника лимон гриб мороженое шоколад бутерброд огурец попкорн круассан пирог картошка виноград вишня кокос яйцо морковь",
    "objects": "зонт часы гитара телефон компьютер очки чемодан подушка лампа ключ корона рюкзак велосипед робот фотоаппарат наушники чашка книга свеча мяч скейтборд самокат будильник микрофон геймпад ножницы кисточка глобус телескоп",
    "nature": "радуга солнце луна звезда вулкан водопад гора пальма кактус цветок дерево облако молния снеговик море остров пустыня гриб снежинка листочек радуга торнадо айсберг костёр пещера планета комета",
    "places": "самолёт ракета корабль поезд автобус метро маяк замок мост аэропорт школа больница цирк музей небоскрёб палатка подводная лодка трактор вертолёт воздушный шар космическая станция ферма вокзал",
    "fun": "динозавр единорог космонавт пират русалка дракон привидение вампир ниндзя супергерой инопланетянин машина времени снежный человек летающий бутерброд танцующий кактус говорящий чайник король обезьян робот-повар кот в сапогах",
}
WORD_BANKS["all"] = " ".join(WORD_BANKS.values())

def draw_room(room_id):
    return ROOMS.setdefault(room_id, {"clients": set(), "players": {}, "drawer": None,
        "word": None, "round": 0, "ends": 0, "image": None, "host": None, "last_drawer": None,
        "duration": 80, "category": "all", "round_task": None})

async def room_send(room, payload, exclude=None):
    for ws in list(room["clients"]):
        if ws is exclude:
            continue
        try:
            await ws.send_json(payload)
        except Exception:
            room["clients"].discard(ws)

async def finish_draw_round(room, reason="Время вышло"):
    if not room.get("word"):
        return
    answer = room["word"]
    room["word"] = None
    room["ends"] = 0
    room["drawer"] = None
    task = room.get("round_task")
    room["round_task"] = None
    if task and task is not asyncio.current_task():
        task.cancel()
    await room_send(room, {"type": "round_end", "word": answer, "reason": reason,
        "players": [{"name": p["name"], "score": p["score"]} for p in room["players"].values()]})

async def draw_round_clock(room, duration):
    try:
        await asyncio.sleep(duration)
        await finish_draw_round(room, "Время вышло")
    except asyncio.CancelledError:
        pass

@app.websocket("/ws/draw/{room_id}")
async def draw_socket(ws: WebSocket, room_id: str):
    await ws.accept()
    room_id = room_id.upper()[:8]
    room = draw_room(room_id)
    room["clients"].add(ws)
    player_id = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    try:
        while True:
            msg = await ws.receive_json()
            kind = msg.get("type")
            if kind == "join":
                name = str(msg.get("name", "Игрок"))[:24].strip() or "Игрок"
                room["players"][ws] = {"id": player_id, "name": name, "score": 0}
                if room["host"] is None:
                    room["host"] = ws
                await ws.send_json({"type": "joined", "id": player_id, "room": room_id,
                    "host": room["host"] is ws,
                    "players": [{"name": p["name"], "score": p["score"]} for p in room["players"].values()],
                    "drawer": room["players"].get(room["drawer"], {}).get("name") if room["drawer"] else None,
                    "image": room["image"], "duration": room["duration"], "category": room["category"]})
                await room_send(room, {"type": "players", "players": [{"name": p["name"], "score": p["score"]} for p in room["players"].values()]}, ws)
                if room["word"]:
                    await ws.send_json({"type": "round", "drawer": room["players"].get(room["drawer"], {}).get("name", "Игрок"),
                        "round": room["round"], "seconds": max(0, int(room["ends"] - time.time()))})
            elif ws not in room["players"]:
                continue
            elif kind == "settings":
                if ws is not room["host"] or room["word"]:
                    continue
                category = str(msg.get("category", "all"))
                duration = int(msg.get("duration", 80))
                room["category"] = category if category in WORD_BANKS else "all"
                room["duration"] = duration if duration in (45, 60, 80, 100, 120) else 80
                await room_send(room, {"type": "settings", "category": room["category"], "duration": room["duration"]})
            elif kind == "start":
                if ws is not room["host"]:
                    await ws.send_json({"type": "notice", "text": "Начать раунд может создатель комнаты."})
                    continue
                if room["word"]:
                    await ws.send_json({"type": "notice", "text": "Раунд уже идёт."})
                    continue
                candidates = [p for p in room["players"] if p in room["clients"]]
                if len(candidates) < 2:
                    await ws.send_json({"type": "notice", "text": "Нужно минимум 2 игрока."})
                    continue
                previous = room.get("last_drawer")
                if previous in candidates:
                    candidates = candidates[candidates.index(previous) + 1:] + candidates[:candidates.index(previous) + 1]
                room["drawer"] = candidates[0]
                room["last_drawer"] = candidates[0]
                words = WORD_BANKS[room["category"]].split()
                room["word"] = random.choice(words)
                room["round"] += 1
                room["ends"] = time.time() + room["duration"]
                room["image"] = None
                await room_send(room, {"type": "round", "drawer": room["players"][room["drawer"]]["name"],
                    "round": room["round"], "seconds": room["duration"]})
                await room["drawer"].send_json({"type": "your_word", "word": room["word"]})
                room["round_task"] = asyncio.create_task(draw_round_clock(room, room["duration"]))
            elif kind == "guess":
                guess = str(msg.get("text", ""))[:80].strip()
                if not guess or not room["word"] or ws is room["drawer"]:
                    continue
                normalize = lambda value: "".join(ch for ch in value.casefold().replace("ё", "е") if ch.isalnum())
                if normalize(guess) == normalize(room["word"]):
                    room["players"][ws]["score"] += 10
                    if room["drawer"] in room["players"]:
                        room["players"][room["drawer"]]["score"] += 5
                    await room_send(room, {"type": "correct", "name": room["players"][ws]["name"],
                        "word": room["word"], "players": [{"name": p["name"], "score": p["score"]} for p in room["players"].values()]})
                    await finish_draw_round(room, "Слово угадано!")
                else:
                    await room_send(room, {"type": "chat", "name": room["players"][ws]["name"], "text": guess})
            elif kind == "canvas" and ws is room["drawer"] and room["word"]:
                data = str(msg.get("data", ""))
                if data.startswith("data:image/") and len(data) < 1_200_000:
                    room["image"] = data
                    await room_send(room, {"type": "canvas", "data": data}, ws)
            elif kind == "clear" and ws is room["drawer"]:
                room["image"] = None
                await room_send(room, {"type": "clear"}, ws)
    except WebSocketDisconnect:
        room["clients"].discard(ws)
        room["players"].pop(ws, None)
        if room["host"] is ws:
            room["host"] = next(iter(room["players"]), None)
            if room["host"]:
                await room["host"].send_json({"type": "host", "isHost": True})
        if room["drawer"] is ws:
            await finish_draw_round(room, "Рисующий отключился")
        await room_send(room, {"type": "players", "players": [{"name": p["name"], "score": p["score"]} for p in room["players"].values()]})
        if not room["clients"]:
            task = room.get("round_task")
            if task:
                task.cancel()
            ROOMS.pop(room_id, None)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
