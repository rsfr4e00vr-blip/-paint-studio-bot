import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi import WebSocket, WebSocketDisconnect
import asyncio, random, string, time
from nations_server import nations_socket, NROOMS, new_code
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo, InputMediaPhoto
from telegram.ext import Application, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters
from io import BytesIO
import base64, struct, zlib, hmac, hashlib
from urllib.parse import parse_qsl

BASE = Path(__file__).parent
BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
BOT_USERNAME = os.environ.get("BOT_USERNAME", "").lstrip("@")
MINI_APP_SHORT_NAME = os.environ.get("MINI_APP_SHORT_NAME", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "").rstrip("/")
PORT = int(os.environ.get("PORT", "8000"))
TG_BOT = None
GROUP_UPDATE_LOCKS = {}
GROUP_SCORES = {}
GROUP_PLAYER_NAMES = {}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Custom group words are collected privately so the group cannot see the answer.
    if context.args and context.args[0].startswith("custom_"):
        try:
            group_chat_id = int(context.args[0][7:])
        except ValueError:
            await update.message.reply_text("Не удалось определить группу. Запусти /drawgroup ещё раз.")
            return
        context.user_data["custom_group_chat_id"] = group_chat_id
        await update.message.reply_text("✍️ Напиши слово или короткую фразу для раунда. Ответ увидишь только ты — в группе он будет секретом.")
        return
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


# --- Telegram group live drawing ---
GROUP_WORDS = {
    "animals": ["капибара", "хамелеон", "осьминог", "фламинго", "ёж", "ленивец", "кенгуру", "панда", "лиса", "дельфин", "верблюд", "попугай", "аксолотль", "бобр", "страус", "морж", "коала", "пеликан", "тигр", "лемур", "белка", "улитка", "жираф", "крокодил", "пингвин", "черепаха", "акула", "сова", "летучая мышь", "единорог"],
    "food": ["борщ", "вареники", "суши", "бургер", "арбуз", "ананас", "пельмени", "пицца", "пончики", "мороженое", "попкорн", "круассан", "тако", "торт", "банан", "сыр", "шоколад", "лимон", "хот-дог", "блины", "клубника", "каша", "кокос", "печенье", "лапша"],
    "objects": ["телескоп", "зонтик", "наушники", "скейтборд", "будильник", "рюкзак", "фонарик", "робот-пылесос", "корона", "глобус", "компас", "чемодан", "гитара", "пианино", "очки", "ключ", "свеча", "подушка", "самокат", "микроскоп", "клавиатура", "коробка", "магнит", "воздушный шар", "зубная щётка"],
    "places": ["Эйфелева башня", "замок", "вулкан", "маяк", "пирамида", "космическая станция", "аквапарк", "школа", "музей", "остров", "пещера", "водопад", "стадион", "аэропорт", "библиотека", "цирк", "средневековая деревня", "подводный город", "замёрзшее озеро", "небоскрёб"],
    "transport": ["вертолёт", "подводная лодка", "паровоз", "воздушный шар", "трактор", "ракета", "трамвай", "парусник", "монорельс", "велосипед", "танк", "мопед", "грузовик", "снегоход", "дирижабль"],
    "funny": ["кот в короне", "пингвин на скейте", "банан-супергерой", "сонный дракон", "инопланетянин", "танцующий картофель", "пиратский хомяк", "робот-повар", "русалка на велосипеде", "слон на роликах", "космическая пицца", "вампир-вегетарианец", "ленивый ниндзя", "собака-детектив", "единорог-диджей", "зомби на пляже", "рыцарь с арбузом", "улыбающийся кактус", "марсианский автобус", "снежный человек"]
}
GROUP_CATEGORY_LABELS = {"animals":"🐾 Животные", "food":"🍕 Еда", "objects":"🎒 Предметы", "places":"🏰 Места", "transport":"🚀 Транспорт", "funny":"😂 Смешные"}

def _blank_png(width=900, height=600):
    # A valid white RGB PNG; avoids an extra image dependency.
    raw = b"".join(b"\x00" + b"\xff\xff\xff" * width for _ in range(height))
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")

def verified_webapp_user_id(init_data: str):
    """Verify Telegram Mini App initData before granting the group drawing role."""
    if not BOT_TOKEN or not init_data:
        return None
    try:
        fields = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = fields.pop("hash", "")
        if not received_hash:
            return None
        check_string = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
        secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calculated, received_hash):
            return None
        auth_date = int(fields.get("auth_date", "0"))
        if abs(time.time() - auth_date) > 86400:
            return None
        import json
        user = json.loads(fields.get("user", "{}"))
        return str(user.get("id")) if user.get("id") is not None else None
    except Exception:
        return None

async def drawgroup_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.effective_chat or update.effective_chat.type == "private":
        await update.effective_message.reply_text("Эта команда работает в группе Telegram. Добавь бота в группу и напиши /drawgroup.")
        return
    if not BOT_USERNAME or not MINI_APP_SHORT_NAME:
        await update.effective_message.reply_text("Для группового холста настрой MINI_APP_SHORT_NAME в Render и Mini App через @BotFather.")
        return
    keyboard = [[InlineKeyboardButton("🎲 Случайное слово", callback_data="tgdraw:random")]]
    keyboard += [[InlineKeyboardButton(label, callback_data=f"tgdraw:{key}")] for key, label in GROUP_CATEGORY_LABELS.items()]
    keyboard += [[InlineKeyboardButton("✍️ Придумать своё слово", callback_data="tgdraw:custom")]]
    await update.effective_message.reply_text(
        "🎨 *Рисовалка для всей группы!*\n\nВыбери тему слова или придумай своё. После старта рисунок будет обновляться прямо в этом чате — остальные смогут угадывать обычными сообщениями.",
        reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")

async def _start_group_canvas(chat_id, user_id, word, context, title="🎨 Угадай рисунок!"):
    # Keep one active Telegram drawing round per group.
    for old_room in ROOMS.values():
        if old_room.get("telegram_group") and old_room.get("tg_chat_id") == chat_id:
            old_room["word"] = None
    room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    room = {"clients": set(), "players": {}, "drawer": None, "word": word, "round": 1,
            "ends": time.time() + 120, "image": None, "telegram_group": True,
            "tg_chat_id": chat_id, "tg_drawer_id": user_id, "tg_message_id": None,
            "tg_last_edit": 0.0, "tg_latest_data": None, "tg_scores": {}, "tg_drawer_name": None}
    ROOMS[room_id] = room
    GROUP_UPDATE_LOCKS[room_id] = asyncio.Lock()
    link = f"https://t.me/{BOT_USERNAME}/{MINI_APP_SHORT_NAME}?startapp=tgdraw_{room_id}"
    keyboard = InlineKeyboardMarkup([[InlineKeyboardButton("🖌 Открыть холст и рисовать", url=link)]])
    bio = BytesIO(_blank_png()); bio.name = "canvas.png"
    sent = await context.bot.send_photo(chat_id=chat_id, photo=bio,
        caption=f"{title}\n\n🖌 Художник открывает холст. Все остальные угадывают слово сообщениями в чате!\n⏱ Раунд: 120 секунд\n🏆 За правильный ответ — 10 очков.", reply_markup=keyboard)
    room["tg_message_id"] = sent.message_id
    await context.bot.send_message(chat_id=chat_id, text="💡 Подсказка появится постепенно. Пишите версии прямо сюда — бот проверит ответы!")
    asyncio.create_task(_expire_group_round(room_id, word, context.bot))

async def _expire_group_round(room_id, word, bot):
    await asyncio.sleep(120)
    room = ROOMS.get(room_id)
    if not room or room.get("word") != word:
        return
    room["word"] = None
    try:
        await bot.send_message(chat_id=room["tg_chat_id"], text=f"⌛ Время вышло! Загаданное слово: «{word}». Чтобы сыграть снова, напишите /drawgroup.")
        await bot.edit_message_caption(chat_id=room["tg_chat_id"], message_id=room["tg_message_id"],
            caption=f"⌛ Раунд завершён — время вышло. Слово было «{word}».\n\nНажмите /drawgroup, чтобы сыграть ещё раз.")
    except Exception as exc:
        print(f"Telegram group round timeout update failed: {exc}")

async def drawgroup_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if not query.message or not query.message.chat:
        return
    chat_id = query.message.chat_id
    user_id = query.from_user.id
    choice = (query.data or "").split(":", 1)[-1]
    if choice == "custom":
        private_link = f"https://t.me/{BOT_USERNAME}?start=custom_{chat_id}"
        await query.edit_message_text("✍️ Чтобы никто в группе не увидел загаданное слово, отправь его боту в личные сообщения:",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("Написать своё слово боту", url=private_link)]]))
        return
    word = random.choice(GROUP_WORDS.get(choice, sum(GROUP_WORDS.values(), [])))
    await query.edit_message_text(f"🎨 Выбрано слово из темы «{GROUP_CATEGORY_LABELS.get(choice, 'Сюрприз')}». Запускаю групповой холст…")
    await _start_group_canvas(chat_id, user_id, word, context)

async def group_text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    chat = update.effective_chat
    user = update.effective_user
    if not msg or not chat or not user or not msg.text:
        return
    if chat.type == "private":
        group_chat_id = context.user_data.pop("custom_group_chat_id", None)
        if group_chat_id is None:
            return
        word = " ".join(msg.text.strip().split())[:60]
        if len(word) < 2:
            context.user_data["custom_group_chat_id"] = group_chat_id
            await msg.reply_text("Слово слишком короткое. Отправь минимум 2 символа.")
            return
        if not BOT_USERNAME or not MINI_APP_SHORT_NAME:
            await msg.reply_text("Не настроен MINI_APP_SHORT_NAME в Render.")
            return
        await msg.reply_text("✨ Слово принято! Запускаю секретный раунд в группе.")
        await _start_group_canvas(group_chat_id, user.id, word, context, "🎨 Угадай моё слово!")
        return
    room_id = next((rid for rid, room in ROOMS.items() if room.get("telegram_group") and room.get("tg_chat_id") == chat.id and room.get("word")), None)
    if not room_id:
        return
    room = ROOMS[room_id]
    import re
    normalize = lambda value: re.sub(r"[^\w\s]", "", " ".join(value.casefold().replace("ё", "е").split()))
    guess = normalize(msg.text[:100])
    answer = normalize(str(room["word"]))
    if user.id == room.get("tg_drawer_id"):
        return
    if guess == answer:
        scores = GROUP_SCORES.setdefault(chat.id, {})
        names = GROUP_PLAYER_NAMES.setdefault(chat.id, {})
        winner = (user.full_name or user.first_name or "Игрок")
        drawer_name = room.get("tg_drawer_name") or "Художник"
        scores[user.id] = scores.get(user.id, 0) + 10
        scores[room["tg_drawer_id"]] = scores.get(room["tg_drawer_id"], 0) + 5
        names[user.id] = winner
        names[room["tg_drawer_id"]] = drawer_name
        leaderboard = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:5]
        score_lines = [f"• {names.get(player_id, 'Игрок')}: {points} очк." for player_id, points in leaderboard]
        await msg.reply_text(f"🎉 Правильно, {winner}! Это «{room['word']}»!\n🏆 +10 очков угадавшему · +5 художнику\n\nТаблица очков:\n" + "\n".join(score_lines))
        room["word"] = None
        try:
            await context.bot.edit_message_caption(chat_id=chat.id, message_id=room["tg_message_id"],
                caption=f"✅ Раунд завершён! {winner} угадал слово «{room['word'] or answer}».\n\nНажмите /drawgroup, чтобы сыграть ещё раз.")
        except Exception:
            pass

async def publish_group_canvas(room, data):
    if not TG_BOT or not room.get("telegram_group") or not room.get("tg_message_id"):
        return
    room["tg_latest_data"] = data
    now = time.monotonic()
    if now - room.get("tg_last_edit", 0) < 1.7:
        return
    lock = GROUP_UPDATE_LOCKS.setdefault(next((k for k,v in ROOMS.items() if v is room), ""), asyncio.Lock())
    if lock.locked():
        return
    async with lock:
        data = room.get("tg_latest_data")
        if not data or not data.startswith("data:image/"):
            return
        try:
            raw = base64.b64decode(data.split(",", 1)[1])
            photo = BytesIO(raw); photo.name = "drawing.jpg"
            caption = "🎨 Художник рисует!\nПишите догадки сообщениями в группе."
            await TG_BOT.edit_message_media(chat_id=room["tg_chat_id"], message_id=room["tg_message_id"],
                media=InputMediaPhoto(media=photo, caption=caption))
            room["tg_last_edit"] = time.monotonic()
        except Exception as exc:
            # Telegram may reject rapid edits; the next canvas update will retry.
            print(f"Telegram group canvas update failed: {exc}")

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
    global TG_BOT
    if BOT_TOKEN and WEBAPP_URL:
        tg = Application.builder().token(BOT_TOKEN).build()
        tg.add_handler(CommandHandler("start", start))
        tg.add_handler(CommandHandler("draw", draw_command))
        tg.add_handler(CommandHandler("drawgroup", drawgroup_command))
        tg.add_handler(CommandHandler("guessdraw", drawgroup_command))
        tg.add_handler(CallbackQueryHandler(drawgroup_callback, pattern=r"^tgdraw:"))
        tg.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, group_text_handler))
        tg.add_handler(CommandHandler("nations", nations_command))
        await tg.initialize()
        TG_BOT = tg.bot
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
        TG_BOT = None


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



# --- Multiplayer drawing rooms ---
ROOMS = {}
WORDS = list(dict.fromkeys(["котик", "собака", "самолёт", "пицца", "радуга", "динозавр", "робот", "замок",
         "велосипед", "арбуз", "жираф", "ракета", "снеговик", "пират", "черепаха",
         "зонт", "пингвин", "космонавт", "торт", "пальма", "акула", "единорог",
         "машина", "гитара", "солнце", "корабль", "бабочка", "крокодил", "часы", "гриб"] +
         [word for category in GROUP_WORDS.values() for word in category]))

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
                verified_user_id = verified_webapp_user_id(str(msg.get("tg_init_data", ""))) if room.get("telegram_group") else None
                is_group_drawer = bool(room.get("telegram_group") and verified_user_id == str(room.get("tg_drawer_id")))
                if is_group_drawer:
                    room["drawer"] = ws
                    room["tg_drawer_name"] = name
                await ws.send_json({"type":"joined", "id":player_id, "room":room_id,
                                    "players":[{"name":p["name"],"score":p["score"]} for p in room["players"].values()],
                                    "drawer": room["players"].get(room["drawer"],{}).get("name") if room["drawer"] else None,
                                    "image": room["image"], "telegram_group": bool(room.get("telegram_group")),
                                    "is_drawer": is_group_drawer})
                if is_group_drawer:
                    await ws.send_json({"type":"round", "drawer":name, "round":1, "seconds":120, "telegram_group":True})
                    await ws.send_json({"type":"your_word", "word":room.get("word")})
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
                    if room.get("telegram_group"):
                        await publish_group_canvas(room, data)
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
