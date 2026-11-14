import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi import WebSocket, WebSocketDisconnect
import asyncio, random, string, time
from nations_server import nations_socket, NROOMS, new_code
from telegram import (InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo, InputMediaPhoto, BotCommand, BotCommandScopeDefault, BotCommandScopeAllGroupChats)
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
GROUP_CHAT_LOCKS = {}

# --- Настройки групповой угадайки (меняй здесь) ---
# Таймера раунда нет: раунд идёт, пока художник рисует, и заканчивается, когда слово угадали
# или когда художник бросил холст. Все секунды ниже считаются от ПЕРВОГО штриха художника.
HINT_UNLOCK_SECONDS = 60         # кнопка «Подсказка» открывается через столько секунд после первого штриха
HINT_COOLDOWN_SECONDS = 15       # пауза между открытием букв (для всей группы)
AUTO_HINT_AT = (60, 100, 140)    # секунды от первого штриха, когда бот сам открывает одну букву
DRAWER_PAUSE_SECONDS = 15        # холст не меняется столько секунд — бот пишет «художник задумался»
DRAWER_IDLE_SECONDS = 180        # художник уже рисовал, но бросил холст на столько секунд — раунд заканчивается
DRAWER_START_SECONDS = 240      # сколько ждём самый первый штрих после старта раунда
GROUP_ROOM_KEEP_SECONDS = 3600   # завершённые комнаты группы удаляются из памяти через час
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
                               "word": None, "round": 0, "image": None})
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
        "🎨 *Рисовалка для всей группы!*\n\nВыбери тему слова. Нажавший участник станет художником. После старта его очередь закрепляется за ним: другие игроки не смогут перехватить рисование. Если художник случайно закроет холст, он сможет вернуться по кнопке под игровым сообщением. Остальные угадывают сообщениями в чате.",
        reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")


def _hint_rows(room, room_id):
    """One button per letter: a dash while hidden, the letter once opened."""
    word = room.get("word") or ""
    revealed = room.setdefault("hint_revealed", set())
    rows, line = [], []

    def flush():
        nonlocal line
        for k in range(0, len(line), 8):
            rows.append(line[k:k + 8])
        line = []

    for i, ch in enumerate(word):
        if ch == " ":
            flush()
        elif ch.isalpha():
            if i in revealed:
                line.append(InlineKeyboardButton(ch.upper(), callback_data="tgdraw:noop"))
            else:
                line.append(InlineKeyboardButton("＿", callback_data=f"tgdraw:rev:{room_id}:{i}"))
        else:
            line.append(InlineKeyboardButton(ch, callback_data="tgdraw:noop"))
    flush()
    return rows


def _group_keyboard(room_id, room):
    link = f"https://t.me/{BOT_USERNAME}/{MINI_APP_SHORT_NAME}?startapp=tgdraw_{room_id}"
    rows = [[InlineKeyboardButton("🖌 Открыть / вернуться к рисованию", url=link)]]
    if room.get("hint_open"):
        rows += _hint_rows(room, room_id)
    else:
        rows.append([InlineKeyboardButton("💡 Подсказка", callback_data=f"tgdraw:hint:{room_id}")])
    return InlineKeyboardMarkup(rows)


async def _refresh_group_keyboard(room_id, room, bot):
    if not room.get("tg_message_id"):
        return
    try:
        await bot.edit_message_reply_markup(chat_id=room["tg_chat_id"], message_id=room["tg_message_id"],
                                            reply_markup=_group_keyboard(room_id, room))
    except Exception as exc:
        if "not modified" not in str(exc).lower():
            print(f"Telegram hint keyboard update failed: {exc}")


def _hint_cap(word):
    """Больше половины букв открыть нельзя, но минимум одну."""
    return max(1, sum(ch.isalpha() for ch in word) // 2)


def _hint_wait(room):
    """Сколько секунд осталось до первой подсказки (0 — уже можно, None — художник ещё не начал рисовать)."""
    began = room.get("draw_started")
    if not began:
        return None
    left = HINT_UNLOCK_SECONDS - (time.time() - began)
    return int(left) + 1 if left > 0 else 0


def _round_room(room_id, word, round_token):
    """Комната, если этот раунд всё ещё идёт; иначе None."""
    room = ROOMS.get(room_id)
    if not room or room.get("word") != word or room.get("round_token") != round_token:
        return None
    return room


def _drawer_state(room):
    """waiting — ещё не рисовал, drawing — рисует, paused — задумался, away — вышел с холста."""
    if not room.get("draw_started"):
        return "waiting"
    if room.get("drawer") is None:
        return "away"
    if time.time() - room.get("last_draw", 0) >= DRAWER_PAUSE_SECONDS:
        return "paused"
    return "drawing"


def _status_caption(room, state=None):
    state = state or _drawer_state(room)
    tail = "\nПишите догадки сообщениями в группе."
    return {
        "waiting": "🖌 Художник ещё не начал рисовать…" + tail,
        "drawing": "🎨 Художник рисует!" + tail,
        "paused": "🤔 Художник задумался — холст не меняется." + tail,
        "away": "📴 Художник вышел с холста. Ждём, когда вернётся." + tail,
    }[state]


def _reveal_block(room):
    """Текст отказа, если сейчас открыть букву нельзя, иначе None."""
    revealed = room.setdefault("hint_revealed", set())
    if len(revealed) >= _hint_cap(room.get("word") or ""):
        return "🔒 Больше букв открыть нельзя — дальше думайте сами!"
    cool = HINT_COOLDOWN_SECONDS - (time.time() - room.get("last_reveal", 0))
    if cool > 0:
        return f"⏳ Следующая буква через {int(cool) + 1} сек."
    return None


async def _auto_reveal(room_id, room, bot):
    word = room.get("word")
    if not word:
        return
    revealed = room.setdefault("hint_revealed", set())
    if len(revealed) >= _hint_cap(word):
        return
    left = [i for i, ch in enumerate(word) if ch.isalpha() and i not in revealed]
    room["hint_open"] = True
    if left:
        revealed.add(random.choice(left))
        room["last_reveal"] = time.time()
    await _refresh_group_keyboard(room_id, room, bot)


async def _group_hint_task(room_id, word, round_token, bot):
    """Бот сам открывает по одной букве в заданные секунды (AUTO_HINT_AT) после первого штриха."""
    while True:  # пока художник не начал рисовать, подсказок нет
        await asyncio.sleep(2)
        room = _round_room(room_id, word, round_token)
        if not room:
            return
        if room.get("draw_started"):
            break
    for delay in AUTO_HINT_AT:
        await asyncio.sleep(max(0, room["draw_started"] + delay - time.time()))
        room = _round_room(room_id, word, round_token)
        if not room:
            return
        try:
            await _auto_reveal(room_id, room, bot)
        except Exception as exc:
            print(f"Telegram group hint failed: {exc}")


async def _set_group_caption(room_id, room, bot, caption):
    lock = GROUP_UPDATE_LOCKS.setdefault(room_id, asyncio.Lock())
    async with lock:
        try:
            await bot.edit_message_caption(chat_id=room["tg_chat_id"], message_id=room["tg_message_id"],
                                           caption=caption, reply_markup=_group_keyboard(room_id, room))
        except Exception as exc:
            if "not modified" not in str(exc).lower():
                print(f"Telegram status caption failed: {exc}")


async def _drawer_watchdog(room_id, word, round_token, bot):
    """Бот следит за художником: рисует / задумался / вышел. Бросил холст — раунд заканчивается."""
    warned = False
    shown = "waiting"
    while True:
        await asyncio.sleep(5)
        room = _round_room(room_id, word, round_token)
        if not room:
            return
        started_drawing = bool(room.get("draw_started"))
        limit = DRAWER_IDLE_SECONDS if started_drawing else DRAWER_START_SECONDS
        idle = time.time() - room.get("last_draw", time.time())
        if idle >= limit:
            await _finish_group_round(room, bot,
                f"💤 Художник не рисует — раунд остановлен. Слово было «{word}».\n\nНажмите /drawgroup, чтобы сыграть ещё раз.")
            try:
                await bot.send_message(chat_id=room["tg_chat_id"],
                    text=f"💤 Художник давно ничего не рисовал, поэтому раунд закончен. Слово было «{word}». Новая игра — /drawgroup.")
            except Exception as exc:
                print(f"Telegram idle notice failed: {exc}")
            return
        state = _drawer_state(room)
        if state != shown:
            shown = state
            await _set_group_caption(room_id, room, bot, _status_caption(room, state))
        if idle < limit - 30:
            warned = False
        elif not warned:
            warned = True
            try:
                await bot.send_message(chat_id=room["tg_chat_id"],
                    text=f"⚠️ Художник, рисуй! Если холст не изменится ещё {limit - int(idle)} сек., раунд закончится.")
            except Exception as exc:
                print(f"Telegram idle warning failed: {exc}")


async def _start_group_canvas(chat_id, user_id, word, context, title="🎨 Угадай рисунок!"):
    # A per-chat lock makes the active-round check and creation atomic.
    lock = GROUP_CHAT_LOCKS.setdefault(chat_id, asyncio.Lock())
    async with lock:
        for old_id, old in list(ROOMS.items()):  # чистим давно завершённые комнаты групп
            if (old.get("telegram_group") and not old.get("word")
                    and time.time() - old.get("finished_at", old.get("created_at", 0)) > GROUP_ROOM_KEEP_SECONDS):
                ROOMS.pop(old_id, None)
                GROUP_UPDATE_LOCKS.pop(old_id, None)
        for existing in ROOMS.values():
            if (existing.get("telegram_group") and existing.get("tg_chat_id") == chat_id
                    and existing.get("word")):
                await context.bot.send_message(
                    chat_id=chat_id,
                    text="⏳ Раунд уже идёт! Художник уже выбран. Другой игрок не сможет занять его очередь. Вернуться к холсту можно кнопкой под игровым сообщением."
                )
                return
        room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        round_token = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        room = {"clients": set(), "players": {}, "drawer": None, "word": word, "round": 1,
                "started": time.time(), "draw_started": None, "last_draw": time.time(), "title": title, "last_reveal": 0, "hint_revealed": set(), "round_token": round_token, "image": None, "telegram_group": True,
                "tg_chat_id": chat_id, "tg_drawer_id": user_id, "tg_message_id": None,
                "tg_last_edit": 0.0, "tg_latest_data": None, "tg_scores": {}, "tg_drawer_name": None,
                "round_lock": asyncio.Lock(), "hint_level": 0, "created_at": time.time()}
        ROOMS[room_id] = room
        GROUP_UPDATE_LOCKS[room_id] = asyncio.Lock()
        link = f"https://t.me/{BOT_USERNAME}/{MINI_APP_SHORT_NAME}?startapp=tgdraw_{room_id}"
        keyboard = _group_keyboard(room_id, room)
        bio = BytesIO(_blank_png()); bio.name = "canvas.png"
        sent = await context.bot.send_photo(chat_id=chat_id, photo=bio,
            caption=f"{title}\n\n🖌 Художник открывает холст. Только он может рисовать в этом раунде. Все остальные угадывают слово сообщениями в чате!\n⏱ Таймера нет — раунд идёт, пока художник рисует.\n🏆 За правильный ответ — 10 очков.\n\nЕсли случайно закрыл холст, нажми кнопку «Открыть / вернуться к рисованию» — продолжишь этот же раунд.",
            reply_markup=keyboard)
        room["tg_message_id"] = sent.message_id
        await context.bot.send_message(chat_id=chat_id, text=f"💡 Подсказка откроется через {HINT_UNLOCK_SECONDS} сек. после того, как художник начнёт рисовать. Тогда нажми «Подсказка» — появятся чёрточки по буквам, нажми на чёрточку, и эта буква откроется. Одна буква раз в {HINT_COOLDOWN_SECONDS} сек., и не больше половины слова.")
        asyncio.create_task(_group_hint_task(room_id, word, round_token, context.bot))
    asyncio.create_task(_drawer_watchdog(room_id, word, round_token, context.bot))


async def _finish_group_round(room, bot, caption, reveal_word=None):
    room["word"] = None
    room["finished_at"] = time.time()
    try:
        await bot.edit_message_caption(chat_id=room["tg_chat_id"], message_id=room["tg_message_id"],
            caption=caption, reply_markup=None)
    except Exception as exc:
        print(f"Telegram group round finish update failed: {exc}")


async def drawgroup_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query.message or not query.message.chat:
        await query.answer()
        return
    chat_id = query.message.chat_id
    user_id = query.from_user.id
    parts = (query.data or "").split(":")
    choice = parts[1] if len(parts) > 1 else ""
    if choice not in ("hint", "rev"):
        await query.answer()

    if choice == "noop":
        return
    if choice in ("hint", "rev"):
        room_id = parts[2] if len(parts) > 2 else ""
        room = ROOMS.get(room_id)
        if not room or room.get("tg_chat_id") != chat_id or not room.get("word"):
            await query.answer("Раунд уже завершён.", show_alert=True)
            return
        wait = _hint_wait(room)
        if wait is None:
            await query.answer("🖌 Художник ещё не начал рисовать — подсказки пока закрыты.", show_alert=True)
            return
        if wait > 0:
            await query.answer(f"⏳ Подсказка откроется через {wait} сек.", show_alert=True)
            return
        if choice == "hint":
            room["hint_open"] = True
            await query.answer("Нажми на чёрточку — откроется буква.")
            await _refresh_group_keyboard(room_id, room, context.bot)
            return
        try:
            idx = int(parts[3])
        except (IndexError, ValueError):
            await query.answer()
            return
        block = _reveal_block(room)
        if block:
            await query.answer(block, show_alert=block.startswith("🔒"))
            return
        word = room["word"]
        if 0 <= idx < len(word) and word[idx].isalpha():
            room.setdefault("hint_revealed", set()).add(idx)
            room["last_reveal"] = time.time()
        room["hint_open"] = True
        await query.answer()
        await _refresh_group_keyboard(room_id, room, context.bot)
        return

    if choice == "custom":
        private_link = f"https://t.me/{BOT_USERNAME}?start=custom_{chat_id}"
        await query.edit_message_text("✍️ Чтобы никто в группе не увидел загаданное слово, отправь его боту в личные сообщения:",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("Написать своё слово боту", url=private_link)]]))
        return
    word = random.choice(GROUP_WORDS.get(choice, sum(GROUP_WORDS.values(), [])))
    try:
        await query.edit_message_text(f"🎨 Выбрано слово из темы «{GROUP_CATEGORY_LABELS.get(choice, 'Сюрприз')}». Запускаю групповой холст…")
    except Exception:
        pass
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
    room = next((r for r in ROOMS.values() if r.get("telegram_group") and r.get("tg_chat_id") == chat.id
                 and r.get("word")), None)
    if not room:
        return
    import re
    normalize = lambda value: re.sub(r"[^\w\s]", "", " ".join(value.casefold().replace("ё", "е").split()))
    guess = normalize(msg.text[:100])
    answer = normalize(str(room["word"]))
    if user.id == room.get("tg_drawer_id") or not guess:
        return
    if guess == answer:
        lock = room.setdefault("round_lock", asyncio.Lock())
        async with lock:
            if not room.get("word") or normalize(str(room["word"])) != guess:
                return
            solved_word = str(room["word"])
            scores = GROUP_SCORES.setdefault(chat.id, {})
            names = GROUP_PLAYER_NAMES.setdefault(chat.id, {})
            winner = user.full_name or user.first_name or "Игрок"
            drawer_id = room.get("tg_drawer_id")
            drawer_name = room.get("tg_drawer_name") or "Художник"
            scores[user.id] = scores.get(user.id, 0) + 10
            if drawer_id is not None:
                scores[drawer_id] = scores.get(drawer_id, 0) + 5
            names[user.id] = winner
            if drawer_id is not None:
                names[drawer_id] = drawer_name
            leaderboard = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:5]
            score_lines = [f"• {names.get(pid, 'Игрок')}: {points} очк." for pid, points in leaderboard]
            await _finish_group_round(room, context.bot,
                f"✅ Раунд завершён! {winner} угадал слово «{solved_word}».\n\nНажмите /drawgroup, чтобы сыграть ещё раз.")
            await msg.reply_text(
                f"🎉 Правильно, {winner}! Это «{solved_word}»!\n🏆 +10 очков угадавшему · +5 художнику\n\nТаблица очков:\n" + "\n".join(score_lines)
            )


async def draw_scores_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    if not chat:
        return
    scores = GROUP_SCORES.get(chat.id, {})
    names = GROUP_PLAYER_NAMES.get(chat.id, {})
    if not scores:
        await update.effective_message.reply_text("🏆 Пока нет очков. Сыграйте в /drawgroup!")
        return
    rows = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:10]
    await update.effective_message.reply_text("🏆 *Таблица Paint Studio*\n" + "\n".join(
        f"{i}. {names.get(pid, 'Игрок')} — {points}" for i, (pid, points) in enumerate(rows, 1)), parse_mode="Markdown")


# Backward-compatible alias for older deployments / handler registrations.
drawscores_command = draw_scores_command


async def drawhelp_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(
        "🎨 *Команды групповой рисовалки*\n/drawgroup — начать раунд\n/drawscores — таблица очков\n/drawhelp — помощь\n\nВо время раунда: художник рисует на холсте, остальные пишут догадки в чат. Таймера раунда нет: игра идёт, пока художник рисует. Бот следит за художником и пишет под рисунком, рисует он, задумался или вышел. Кнопка «💡 Подсказка» открывается через минуту после первого штриха: она показывает чёрточки, нажатие на чёрточку открывает букву (раз в 15 сек., не больше половины слова). Если художник долго не рисует, раунд заканчивается сам. Кнопка «Открыть / вернуться к рисованию» возвращает в текущий холст.",
        parse_mode="Markdown")

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
            caption = _status_caption(room, "drawing")
            room_id = next((rid for rid, value in ROOMS.items() if value is room), "")
            link = f"https://t.me/{BOT_USERNAME}/{MINI_APP_SHORT_NAME}?startapp=tgdraw_{room_id}"
            keyboard = _group_keyboard(room_id, room)
            await TG_BOT.edit_message_media(chat_id=room["tg_chat_id"], message_id=room["tg_message_id"],
                media=InputMediaPhoto(media=photo, caption=caption), reply_markup=keyboard)
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
        try:
            tg = Application.builder().token(BOT_TOKEN).build()
            tg.add_handler(CommandHandler("start", start))
            tg.add_handler(CommandHandler("draw", draw_command))
            tg.add_handler(CommandHandler("drawgroup", drawgroup_command))
            tg.add_handler(CommandHandler("guessdraw", drawgroup_command))
            tg.add_handler(CommandHandler("drawscores", draw_scores_command))
            tg.add_handler(CommandHandler("drawhelp", drawhelp_command))
            tg.add_handler(CallbackQueryHandler(drawgroup_callback, pattern=r"^tgdraw:"))
            tg.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, group_text_handler))
            tg.add_handler(CommandHandler("nations", nations_command))
            await tg.initialize()
            # Register slash-command suggestions in Telegram's command menu.
            # Group scope is important: Telegram will suggest these after the user types '/'.
            drawing_commands = [
                BotCommand("drawgroup", "🎮 Сыграть в игру — групповая рисовалка"),
                BotCommand("drawscores", "🏆 Таблица очков рисовалки"),
                BotCommand("drawhelp", "💡 Как играть в рисовалку"),
            ]
            try:
                await tg.bot.set_my_commands(
                    drawing_commands,
                    scope=BotCommandScopeAllGroupChats(),
                    language_code="ru",
                )
                # Also expose commands in private chat command menu.
                await tg.bot.set_my_commands(
                    drawing_commands,
                    scope=BotCommandScopeDefault(),
                    language_code="ru",
                )
            except Exception as exc:
                # A command-menu setup failure must not prevent the bot from starting.
                print(f"Не удалось зарегистрировать slash-команды Telegram: {exc}")
            TG_BOT = tg.bot
            if not BOT_USERNAME:
                me = await tg.bot.get_me()
                BOT_USERNAME = me.username or ""
            await tg.start()
            await tg.updater.start_polling(drop_pending_updates=True)
        except Exception as exc:
            # Ошибка бота Telegram не должна ронять сайт и деплой на Render.
            import traceback
            traceback.print_exc()
            print(f"Telegram-бот не запущен из-за ошибки: {exc!r}. Сайт продолжает работать.")
            if tg is not None:
                try:
                    await tg.shutdown()
                except Exception:
                    pass
            tg = None
            TG_BOT = None
    else:
        print("BOT_TOKEN или WEBAPP_URL не заданы: бот не запущен, работает только сайт.")
    yield
    if tg:
        try:
            await tg.updater.stop()
            await tg.stop()
            await tg.shutdown()
        except Exception as exc:
            print(f"Ошибка при остановке Telegram-бота: {exc!r}")
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


@app.get("/interface-v4.css")
def interface_v4_css():
    return FileResponse(BASE / "interface-v4.css", media_type="text/css")


@app.get("/hoi4-clean-interface.css")
def hoi4_clean_css():
    return FileResponse(BASE / "hoi4-clean-interface.css", media_type="text/css")


@app.get("/nav-fix.css")
def nav_fix_css():
    return FileResponse(BASE / "nav-fix.css", media_type="text/css")


@app.get("/nations.css")
def nations_css():
    return FileResponse(BASE / "nations.css", media_type="text/css")


@app.websocket("/ws/nations/{code}")
async def nations_ws(ws: WebSocket, code: str):
    await nations_socket(ws, code)


@app.get("/world.js")
def world_js():
    return FileResponse(BASE / "world.js", media_type="application/javascript")

@app.get("/world_data.js")
def world_data_js():
    return FileResponse(BASE / "world_data.js", media_type="application/javascript")

@app.get("/ai_arsenal.js")
def ai_arsenal_js():
    return FileResponse(BASE / "ai_arsenal.js", media_type="application/javascript")

@app.get("/ai_nations.js")
def ai_nations_js():
    return FileResponse(BASE / "ai_nations.js", media_type="application/javascript")

@app.get("/nn_core.js")
def nn_core_js():
    return FileResponse(BASE / "nn_core.js", media_type="application/javascript")

@app.get("/population_ai.js")
def population_ai_js():
    return FileResponse(BASE / "population_ai.js", media_type="application/javascript")

@app.get("/resources.js")
def resources_js():
    return FileResponse(BASE / "resources.js", media_type="application/javascript")

@app.get("/fx.js")
def fx_js():
    return FileResponse(BASE / "fx.js", media_type="application/javascript")

@app.get("/charts.css")
def charts_css():
    return FileResponse(BASE / "charts.css", media_type="text/css")

@app.get("/geo.js")
def geo_js():
    return FileResponse(BASE / "geo.js", media_type="application/javascript")

@app.get("/world.json")
def world_json():
    return FileResponse(BASE / "world.json", media_type="application/json")


@app.get("/regions.js")
def regions_js():
    return FileResponse(BASE / "regions.js", media_type="application/javascript")


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
                                      "word": None, "round": 0, "image": None})
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
                    current = room.get("drawer")
                    if current is not None and current is not ws and current in room["clients"]:
                        try:
                            await current.close(code=4001, reason="Художник переподключился")
                        except Exception:
                            pass
                        room["clients"].discard(current)
                        room["players"].pop(current, None)
                    room["drawer"] = ws
                    room["tg_drawer_name"] = name
                await ws.send_json({"type":"joined", "id":player_id, "room":room_id,
                                    "players":[{"name":p["name"],"score":p["score"]} for p in room["players"].values()],
                                    "drawer": room["players"].get(room["drawer"],{}).get("name") if room["drawer"] else None,
                                    "image": room["image"], "telegram_group": bool(room.get("telegram_group")),
                                    "is_drawer": bool(is_group_drawer and room.get("drawer") is ws)})
                if is_group_drawer and room.get("drawer") is ws:
                    if not room.get("word"):
                        await ws.send_json({"type":"notice", "text":"Раунд уже завершён. Новая игра — /drawgroup в группе."})
                    else:
                        if not room.get("draw_started"):
                            room["last_draw"] = time.time()  # время на раскачку считаем с момента, когда открыл холст
                        await ws.send_json({"type":"round", "drawer":name, "round":1, "telegram_group":True})
                        await ws.send_json({"type":"your_word", "word":room.get("word")})
                await room_send(room, {"type":"players","players":[{"name":p["name"],"score":p["score"]} for p in room["players"].values()]}, ws)
            elif ws not in room["players"]:
                continue
            elif kind == "start":
                if room.get("telegram_group"):
                    await ws.send_json({"type":"notice","text":"В групповой игре художник уже выбран создателем раунда. Нельзя перезапустить раунд кнопкой."})
                    continue
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
                room["image"] = None
                await room_send(room, {"type":"round","drawer":room["players"][room["drawer"]]["name"],
                                       "round":room["round"]})
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
                if len(data) < 2_000_000 and room.get("word"):
                    room["last_draw"] = time.time()
                    if not room.get("draw_started"):
                        room["draw_started"] = time.time()
                    room["image"] = data
                    await room_send(room, {"type":"canvas","data":data}, ws)
                    if room.get("telegram_group"):
                        await publish_group_canvas(room, data)
            elif kind == "clear" and ws is room["drawer"]:
                room["last_draw"] = time.time()
                room["image"] = None
                await room_send(room, {"type":"clear"}, ws)
    except WebSocketDisconnect:
        room["clients"].discard(ws)
        room["players"].pop(ws, None)
        if room["drawer"] is ws:
            room["drawer"] = None
            if not room.get("telegram_group"):
                room["word"] = None
        await room_send(room, {"type":"players","players":[{"name":p["name"],"score":p["score"]} for p in room["players"].values()]})
        if not room["clients"] and not room.get("telegram_group"):
            ROOMS.pop(room_id, None)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
