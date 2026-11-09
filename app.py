import telebot
from telebot import types

# ⚠️ ВСТАВЬ СЮДА СВОЙ ТОКЕН ИЗ BOTFATHER ВМЕСТО КАВЫЧЕК!
TOKEN = "ТВОЙ_ТОКЕН_БОТА"
bot = telebot.TeleBot(TOKEN)

# База данных игроков (хранится в памяти, пока бот запущен)
players = {}

# База доступных законов
LAWS = {
    "press": {"name": "Свобода прессы 📝", "cost": 1500},
    "tax": {"name": "Военный налог 🪖", "cost": 500},
    "money": {"name": "Субсидии рабочим 💰", "cost": 3000}
}

# Функция, которая создает профиль нового игрока
def init_player(user_id):
    if user_id not in players:
        players[user_id] = {
            "money": 5000,
            "stability": 75,
            "approval_rating": 50,
            "government_type": "Демократия",
            "factions": {
                "Либералы": {"loyalty": 60},
                "Военные": {"loyalty": 50},
                "Рабочие": {"loyalty": 70}
            },
            "laws": []  # Принятые законы
        }

# Команда /start — начало игры и выдача главного меню
@bot.message_handler(commands=['start'])
def start_game(message):
    init_player(message.from_user.id)
    
    keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
    keyboard.add(types.KeyboardButton("🏛️ Политика"), types.KeyboardButton("💰 Казна и Баланс"))
    
    bot.send_message(
        message.chat.id, 
        "👑 Добро пожаловать, Господин Правитель! Управляйте своей страной с помощью меню ниже.", 
        reply_markup=keyboard
    )

# Обработка нажатия обычных кнопок на клавиатуре
@bot.message_handler(func=lambda msg: True)
def handle_menu(message):
    user_id = message.from_user.id
    init_player(user_id)
    p = players[user_id]
    
    if message.text == "💰 Казна и Баланс":
        bot.send_message(message.chat.id, f"💵 Бюджет вашей страны: *{p['money']}$*", parse_mode="Markdown")
        
    elif message.text == "🏛️ Политика":
        # Красивый текст с политическим состоянием
        text = (
            f"🏛️ *Политическое меню страны*\n\n"
            f"Режим правления: {p['government_type']}\n"
            f"Одобрение народа: {p['approval_rating']}%\n"
            f"Стабильность государства: {p['stability']}%\n\n"
            f"📊 *Лояльность фракций:*\n"
            f"▪️ Либералы: {p['factions']['Либералы']['loyalty']}%\n"
            f"▪️ Военные: {p['factions']['Военные']['loyalty']}%\n"
            f"▪️ Рабочие: {p['factions']['Рабочие']['loyalty']}%\n\n"
            f"Выберите закон для принятия:"
        )
        
        # Кнопки под текстом для законов
        keyboard = types.InlineKeyboardMarkup()
        for law_id, law_data in LAWS.items():
            if law_id not in p["laws"]:
                btn = types.InlineKeyboardButton(
                    text=f"📜 {law_data['name']} (-{law_data['cost']}$)", 
                    callback_data=f"law_{law_id}"
                )
                keyboard.add(btn)
                
        bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=keyboard)

# Логика, которая срабатывает, когда игрок жмет кнопку с законом
@bot.callback_query_handler(func=lambda call: call.data.startswith('law_'))
def handle_law_buying(call):
    user_id = call.from_user.id
    init_player(user_id)
    p = players[user_id]
    
    law_id = call.data.replace("law_", "")
    law = LAWS[law_id]
    
    # Если этот закон уже как-то успели принять
    if law_id in p["laws"]:
        bot.answer_callback_query(call.id, "Этот закон уже действует!", show_alert=True)
        return

    # Проверка на деньги
    if p["money"] < law["cost"]:
        bot.answer_callback_query(call.id, "❌ В казне не хватает денег на эту реформу!", show_alert=True)
        return
        
    # Списываем деньги и одобряем закон
    p["money"] -= law["cost"]
    p["laws"].append(law_id)
    
    # Эффекты законов (меняем показатели лояльности фракций)
    if law_id == "press":
        p["stability"] -= 5
        p["factions"]["Либералы"]["loyalty"] += 20
        p["factions"]["Военные"]["loyalty"] -= 15
    elif law_id == "tax":
        p["stability"] -= 10
        p["factions"]["Военные"]["loyalty"] += 25
        p["factions"]["Рабочие"]["loyalty"] -= 20
    elif law_id == "money":
        p["stability"] += 15
        p["factions"]["Рабочие"]["loyalty"] += 25
        p["factions"]["Либералы"]["loyalty"] += 5

    # Считаем новое общее одобрение народа
    total = sum(f["loyalty"] for f in p["factions"].values())
    p["approval_rating"] = round(total / 3)

    # Всплывающее окно в ТГ об успехе
    bot.answer_callback_query(call.id, f"✅ Закон '{law['name']}' принят!", show_alert=False)
    
    # Изменяем сообщение: убираем кнопки и пишем, что закон принят
    bot.edit_message_text(
        chat_id=call.message.chat.id, 
        message_id=call.message.message_id, 
        text=f"📜 Вы успешно приняли закон: *{law['name']}*.\nПосмотрите новые параметры, снова нажав кнопку «🏛️ Политика»."
    )

# Запуск бота
if __name__ == '__main__':
    print("Бот успешно запущен!")
    bot.infinity_polling()
