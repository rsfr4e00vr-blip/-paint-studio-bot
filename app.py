import asyncio
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
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

@api.get("/")
async def home():
    return FileResponse(INDEX_FILE)

@api.get("/health")
async def health():
    return {"status": "ok"}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🎨 Открыть Paint Studio", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton("ℹ️ Как пользоваться", callback_data="help")],
    ])
    await update.effective_message.reply_text(
        "Привет! Это Paint Studio — мини-рисовалка прямо в Telegram.\n\n"
        "Рисуй пальцем, выбирай цвет и толщину кисти, используй ластик, "
        "фигуры, отмену и повтор. Готовую работу можно скачать в PNG.\n\n"
        "Нажми кнопку ниже, чтобы открыть холст 👇",
        reply_markup=keyboard,
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(
        "Как пользоваться:\n"
        "• Кисть — свободное рисование.\n"
        "• Ластик — стирание.\n"
        "• Линия, прямоугольник и круг — фигуры.\n"
        "• Цвет и размер — настройки инструмента.\n"
        "• Отмена/Повтор — история действий.\n"
        "• Сохранить PNG — скачать рисунок."
    )

async def help_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.message.reply_text(
        "Открой Paint Studio кнопкой в /start. На панели есть кисть, ластик, "
        "фигуры, палитра, размер, отмена, повтор, очистка и сохранение PNG."
    )

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