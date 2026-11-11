import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi import WebSocket, WebSocketDisconnect
import asyncio, random, string, time
import json
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
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
    ROOMS.setdefault(room_id, {"clients": set(), "players": {}, "drawer": None,
                               "word": None, "round": 0, "ends": 0, "image": None})
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
        "У каждого игрока своя страна и случайная свободная территория. "
        "В комнате работают 24 государства под управлением ИИ; можно начать одному, "
        "а другие игроки могут подключаться даже после старта, пока есть свободные территории.",
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

# GeoJSON is fetched server-side and cached in-process. Each layer is independent:
# a failed regional dataset never blocks the world or Ukraine layers.
_MAP_SOURCES = {
    "world": "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
    "ukraine": "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1.geojson",
    "russia": "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/RUS/ADM1/geoBoundaries-RUS-ADM1.geojson",
}
_MAP_CACHE = {}

def _load_map_geojson(layer: str):
    if layer in _MAP_CACHE:
        return _MAP_CACHE[layer]
    req = Request(_MAP_SOURCES[layer], headers={"User-Agent": "NovariaGame/1.0", "Accept": "application/geo+json,application/json"})
    with urlopen(req, timeout=35) as response:
        raw = response.read(45 * 1024 * 1024 + 1)
    if len(raw) > 45 * 1024 * 1024:
        raise ValueError("GeoJSON layer exceeds size limit")
    data = json.loads(raw.decode("utf-8"))
    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise ValueError("Invalid GeoJSON layer")
    _MAP_CACHE[layer] = data
    return data

@app.get("/api/map/{layer}")
async def map_geojson(layer: str):
    from fastapi import HTTPException
    if layer not in _MAP_SOURCES:
        raise HTTPException(status_code=404, detail="Unknown map layer")
    try:
        return await asyncio.to_thread(_load_map_geojson, layer)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Map data temporarily unavailable: {type(exc).__name__}")



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



# --- Multiplayer drawing rooms ---
ROOMS = {}
WORDS = ["котик", "собака", "самолёт", "пицца", "радуга", "динозавр", "робот", "замок",
         "велосипед", "арбуз", "жираф", "ракета", "снеговик", "пират", "черепаха",
         "зонт", "пингвин", "космонавт", "торт", "пальма", "акула", "единорог",
         "машина", "гитара", "солнце", "корабль", "бабочка", "крокодил", "часы", "гриб"]

async def room_send(room, payload, exclude=None):
    for ws in list(room["clients"]):
        if ws is exclude:
            continue
        try:
            await ws.send_json(payload)
        except Exception:
            room["clients"].discard(ws)

@app.websocket("/ws/draw/{room_id}")
async def draw_socket(ws: WebSocket, room_id: str):
    await ws.accept()
    room_id = room_id.upper()[:8]
    room = ROOMS.setdefault(room_id, {"clients": set(), "players": {}, "drawer": None,
                                      "word": None, "round": 0, "ends": 0, "image": None})
    room["clients"].add(ws)
    player_id = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    try:
        while True:
            msg = await ws.receive_json()
            kind = msg.get("type")
            if kind == "join":
                name = str(msg.get("name", "Игрок"))[:24].strip() or "Игрок"
                room["players"][ws] = {"id": player_id, "name": name, "score": 0}
                await ws.send_json({"type":"joined", "id":player_id, "room":room_id,
                                    "players":[{"name":p["name"],"score":p["score"]} for p in room["players"].values()],
                                    "drawer": room["players"].get(room["drawer"],{}).get("name") if room["drawer"] else None,
                                    "image": room["image"]})
                await room_send(room, {"type":"players","players":[{"name":p["name"],"score":p["score"]} for p in room["players"].values()]}, ws)
            elif ws not in room["players"]:
                continue
            elif kind == "start":
                if len(room["players"]) < 2:
                    await ws.send_json({"type":"notice","text":"Нужно минимум 2 игрока."})
                    continue
                candidates = [p for p in room["players"] if p in room["clients"]]
                previous = room["drawer"]
                if len(candidates) > 1 and previous in candidates:
                    candidates = candidates[candidates.index(previous)+1:] + candidates[:candidates.index(previous)+1]
                room["drawer"] = candidates[0]
                room["word"] = random.choice(WORDS)
                room["round"] += 1
                room["ends"] = time.time() + 80
                room["image"] = None
                await room_send(room, {"type":"round","drawer":room["players"][room["drawer"]]["name"],
                                       "round":room["round"],"seconds":80})
                await room["drawer"].send_json({"type":"your_word","word":room["word"]})
            elif kind == "guess":
                guess = str(msg.get("text",""))[:100].strip()
                if not guess:
                    continue
                if room["word"] and ws is not room["drawer"] and guess.casefold() == room["word"].casefold():
                    room["players"][ws]["score"] += 10
                    if room["drawer"] in room["players"]:
                        room["players"][room["drawer"]]["score"] += 5
                    await room_send(room, {"type":"correct","name":room["players"][ws]["name"],
                                            "word":room["word"],"players":[{"name":p["name"],"score":p["score"]} for p in room["players"].values()]})
                    room["word"] = None
                else:
                    await room_send(room, {"type":"chat","name":room["players"][ws]["name"],"text":guess})
            elif kind == "canvas" and ws is room["drawer"]:
                data = str(msg.get("data",""))
                if len(data) < 2_000_000:
                    room["image"] = data
                    await room_send(room, {"type":"canvas","data":data}, ws)
            elif kind == "clear" and ws is room["drawer"]:
                room["image"] = None
                await room_send(room, {"type":"clear"}, ws)
    except WebSocketDisconnect:
        room["clients"].discard(ws)
        room["players"].pop(ws, None)
        if room["drawer"] is ws:
            room["drawer"] = None
            room["word"] = None
        await room_send(room, {"type":"players","players":[{"name":p["name"],"score":p["score"]} for p in room["players"].values()]})
        if not room["clients"]:
            ROOMS.pop(room_id, None)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
