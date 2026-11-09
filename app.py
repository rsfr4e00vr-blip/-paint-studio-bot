
import asyncio
import os
import re
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse, Response
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, Update
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEBAPP_URL = os.getenv("WEBAPP_URL", "").strip().rstrip("/")
PORT = int(os.getenv("PORT", "10000"))

if not TOKEN:
    raise RuntimeError("Не задан BOT_TOKEN в переменных окружения")
if not WEBAPP_URL.startswith("https://"):
    raise RuntimeError("WEBAPP_URL должен быть публичным HTTPS-адресом Mini App")

api = FastAPI(title="Paint Studio Telegram Bot")

INDEX_FILE = BASE_DIR / "static" / "index.html"
if not INDEX_FILE.exists():
    INDEX_FILE = BASE_DIR / "index.html"

NOCACHE = {"Cache-Control": "no-cache"}


def extra_scripts():
    """Все файлы extras*.js рядом с app.py подключаются автоматически."""
    names = sorted(p.name for p in BASE_DIR.glob("extras*.js"))
    return "".join('<script src="/%s"></script>' % n for n in names)


@api.get("/")
async def home():
    html = INDEX_FILE.read_text(encoding="utf-8")
    tags = extra_scripts()
    if "</body>" in html:
        html = html.replace("</body>", tags + "</body>")
    else:
        html += tags
    return HTMLResponse(html, headers=NOCACHE)


@api.get("/game")
async def game():
    return FileResponse(BASE_DIR / "game.html", media_type="text/html", headers=NOCACHE)


@api.get("/{name}.js")
async def js_file(name: str):
    path = BASE_DIR / (name + ".js")
    if not re.fullmatch(r"[a-z0-9_-]+", name) or not path.exists():
        return Response(status_code=404)
    return FileResponse(path, media_type="text/javascript", headers=NOCACHE)


@api.get("/health")
async def health():
    return {"status": "ok"}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🎨 Открыть Paint Studio", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton("🏛 Симулятор государства", web_app=WebAppInfo(url=WEBAPP_URL + "/game?v=3"))],
        [InlineKeyboardButton("ℹ️ Как пользоваться", callback_data="help")],
    ])
    await update.effective_message.reply_text(
        "Привет! Это Paint Studio — мини-рисовалка прямо в Telegram.\n\n"
        "Рисуй пальцем, выбирай кисти и цвета, добавляй текст и стикеры. "
        "Готовую работу можно скачать в PNG.\n\n"
        "Нажми кнопку ниже, чтобы открыть холст 👇",
        reply_markup=keyboard,
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(
        "Как пользоваться:\n"
        "• Кисти — 15 видов, размер, прозрачность, симметрия.\n"
        "• Фигуры, ластик, заливка, пипетка.\n"
        "• Цвет — палитры и ползунки.\n"
        "• Текст — надписи и стикеры.\n"
        "• Двумя пальцами — приближение и перемещение холста.\n"
        "• ⬇ PNG — сохранить рисунок, 📤 — поделиться."
    )


async def help_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.message.reply_text("Открой Paint Studio кнопкой в /start и рисуй!")


async def main():
    bot = Application.builder().token(TOKEN).build()
    bot.add_handler(CommandHandler("start", start))
    bot.add_handler(CommandHandler("help", help_command))
    bot.add_handler(CallbackQueryHandler(help_button, pattern="^help$"))

    await bot.initialize()
    await bot.start()
    await bot.updater.start_polling(drop_pending_updates=True)

    config = uvicorn.Config(api, host="0.0.0.0", port=PORT, log_level="info")
    server = uvicorn.Server(config)
    try:
        await server.serve()
    finally:
        await bot.updater.stop()
        await bot.stop()
        await bot.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
