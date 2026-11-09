import telebot
from telebot import types
import random

# ⚠️ ВСТАВЬ СЮДА СВОЙ ТОКЕН ИЗ BOTFATHER!
TOKEN = "ТВОЙ_ТОКЕН_БОТА"
bot = telebot.TeleBot(TOKEN)

# База данных игроков
players = {}

# Список обычных законов
LAWS = {
    "press": {"name": "Свобода прессы 📝", "cost": 1500, "desc": "+Либералы, -Военные."},
    "tax": {"name": "Военный налог 🪖", "cost": 1000, "desc": "+Военные, --Рабочие. +Налоги."},
    "money": {"name": "Субсидии рабочим 💰", "cost": 2500, "desc": "++Рабочие, +Стабильность."},
    "censorship": {"name": "Тотальная цензура 👁️", "cost": 2000, "desc": "++Стабильность, --Либералы."}
}

# Случайные события (Ивенты)
EVENTS = [
    {
        "text": "🚨 **Народный бунт!**\nРабочие вышли на улицы, требуя повышения зарплат. Что предпримем?",
        "options": [
            {"text": "💸 Раздать субсидии (-1500$)", "effect": {"money": -1500, "factions": {"Рабочие": 25}, "stability": 10}},
            {"text": "🪖 Разогнать армией (+Военные)", "effect": {"money": 0, "factions": {"Военные": 15, "Рабочие": -30}, "stability": -15}}
        ]
    },
    {
        "text": "📰 **Утечка компромата!**\nОппозиционная газета опубликовала секретные расходы вашей администрации.",
        "options": [
            {"text": "🤝 Подкупить редакцию (-1000$)", "effect": {"money": -1000, "stability": 5, "factions": {"Либералы": 10}}},
            {"text": "🔒 Закрыть газету (Цензура)", "effect": {"money": 0, "stability": 15, "factions": {"Либералы": -25, "Военные": 10}}}
        ]
    }
]

def init_player(user_id):
    if user_id not in players:
        players[user_id] = {
            "money": 6000,
            "stability": 70,
            "approval_rating": 60,
            "turns": 0,
            "government_type": "Демократия",
            "palace_level": 1,  # Новое: уровень Дворца
            "black_market_stock": 5, # Новое: госрезервы для рынка
            "factions": {
                "Либералы": {"loyalty": 50, "income": 50},
                "Военные": {"loyalty": 50, "income": 30},
                "Рабочие": {"loyalty": 60, "income": 70}
            },
            "laws": [],
            "current_event": None
        }

# Генератор красивых полосок прогресса
def get_status_bar(value):
    filled = int(max(0, min(100, value)) / 10)
    bar = "🟩" * filled + "🟥" * (10 - filled)
    return f"{bar} ({value}%)"

# Графика для Дворца
def get_palace_emoji(level):
    if level == 1: return "🛖 Деревянная резиденция"
    if level == 2: return "🏡 Укрепленная вилла"
    if level == 3: return "🏢 Правительственный комплекс"
    if level == 4: return "🏰 Роскошный замок правителя"
    return "🏛️ Величественный Дворец Империи"

def process_economy(p):
    p["turns"] += 1
    tax_income = 0
    for name, data in p["factions"].items():
        tax_income += int(data["income"] * (data["loyalty"] / 100))
    
    if "tax" in p["laws"]:
        tax_income += 400
        
    # Бонус от золотого Дворца
    tax_income += p["palace_level"] * 150
    p["money"] += tax_income
    return tax_income

def recalculate_approval(p):
    total = sum(f["loyalty"] for f in p["factions"].values())
    p["approval_rating"] = max(0, min(100, round(total / 3)))
    if p["stability"] < 30:
        p["approval_rating"] = max(0, p["approval_rating"] - 15)

@bot.message_handler(commands=['start'])
def start_game(message):
    init_player(message.from_user.id)
    keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
    keyboard.add(types.KeyboardButton("🏛️ Управление"), types.KeyboardButton("🎲 Следующий Ход"))
    keyboard.add(types.KeyboardButton("🕵️ Шпионаж"), types.KeyboardButton("⚖️ Черный Рынок"))
    
    bot.send_message(
        message.chat.id, 
        "👑 **Приветствуем, Правитель!**\nВы получили бразды правления. Расширяйте влияние, стройте дворец и плетите интриги против соседей!", 
        parse_mode="Markdown", reply_markup=keyboard
    )

# Главный экран
@bot.message_handler(func=lambda msg: msg.text == "🏛️ Управление")
def show_politics(message):
    user_id = message.from_user.id
    init_player(user_id)
    p = players[user_id]
    recalculate_approval(p)
    
    text = (
        f"📋 **ОТЧЕТ О СОСТОЯНИИ ГОСУДАРСТВА**\n"
        f"----------------------------------------\n"
        f"👑 Мой Дворец: `{get_palace_emoji(p['palace_level'])}` (Ур. {p['palace_level']})\n"
        f"💰 Казна: **{p['money']}$** | 📦 Резервы: `{p['black_market_stock']} ед.`\n\n"
        f"📈 Стабильность:\n{get_status_bar(p['stability'])}\n"
        f"👥 Одобрение народа:\n{get_status_bar(p['approval_rating'])}\n\n"
        f"📊 **НАСТРОЕНИЯ ФРАКЦИЙ:**\n"
        f"▪️ Либералы: {get_status_bar(p['factions']['Либералы']['loyalty'])}\n"
        f"▪️ Военные: {get_status_bar(p['factions']['Военные']['loyalty'])}\n"
        f"▪️ Рабочие: {get_status_bar(p['factions']['Рабочие']['loyalty'])}\n"
        f"----------------------------------------\n"
        f"⚙️ **Быстрые действия главы государства:**"
    )
    
    keyboard = types.InlineKeyboardMarkup()
    # Кнопка апгрейда Дворца
    palace_cost = p['palace_level'] * 3000
    keyboard.add(types.InlineKeyboardButton(text=f"🏰 Улучшить Дворец (-{palace_cost}$)", callback_data="action_upgrade_palace"))
    
    # Законы
    for law_id, law_data in LAWS.items():
        if law_id not in p["laws"]:
            keyboard.add(types.InlineKeyboardButton(text=f"📜 {law_data['name']} (-{law_data['cost']}$)", callback_data=f"law_{law_id}"))
            
    bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=keyboard)

# Новый функционал: Шпионаж
@bot.message_handler(func=lambda msg: msg.text == "🕵️ Шпионаж")
def show_spy_menu(message):
    user_id = message.from_user.id
    init_player(user_id)
    
    text = (
        f"🕵️ **МИНИСТЕРСТВО ШПИОНАЖА И ИНТРИГ**\n\n"
        f"Выберите секретную операцию против соседних государств. Учтите, что провал может подорвать стабильность вашей страны!"
    )
    keyboard = types.InlineKeyboardMarkup()
    keyboard.add(types.InlineKeyboardButton(text="💰 Украсть золото соседей (Шанс 60%)", callback_data="spy_steal"))
    keyboard.add(types.InlineKeyboardButton(text="📣 Запустить пропаганду у соседей (Шанс 80%)", callback_data="spy_propaganda"))
    
    bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=keyboard)

# Новый функционал: Черный рынок
@bot.message_handler(func=lambda msg: msg.text == "⚖️ Черный Рынок")
def show_market_menu(message):
    user_id = message.from_user.id
    init_player(user_id)
    p = players[user_id]
    
    text = (
        f"⚖️ **ТЕНЕВОЙ РЫНОК И БИРЖА**\n\n"
        f"Здесь вы можете быстро продать государственные резервы или напечатать фальшивые облигации.\n\n"
        f"📦 Доступно резервов: **{p['black_market_stock']} шт.**\n"
        f"💵 Текущая рыночная цена резерва: **800$ / шт.**"
    )
    keyboard = types.InlineKeyboardMarkup()
    keyboard.add(types.InlineKeyboardButton(text="💰 Продать 1 ед. резервов (+800$)", callback_data="market_sell"))
    keyboard.add(types.InlineKeyboardButton(text="🖨️ Запустить печатный станок (+2000$, -20% Стабильности)", callback_data="market_print"))
    
    bot.send_message(message.chat.id, text, parse_mode="Markdown", reply_markup=keyboard)

# Обработка законов и улучшений
@bot.callback_query_handler(func=lambda call: call.data.startswith('law_') or call.data == "action_upgrade_palace")
def handle_laws_and_upgrades(call):
    user_id = call.from_user.id
    p = players[user_id]
    
    if call.data == "action_upgrade_palace":
        cost = p['palace_level'] * 3000
        if p["money"] < cost:
            bot.answer_callback_query(call.id, "❌ Недостаточно средств для улучшения резиденции!", show_alert=True)
            return
        p["money"] -= cost
        p["palace_level"] += 1
        p["stability"] = min(100, p["stability"] + 15)
        bot.answer_callback_query(call.id, "🏰 Дворец успешно перестроен!")
    else:
        law_id = call.data.replace("law_", "")
        law = LAWS[law_id]
        if p["money"] < law["cost"]:
            bot.answer_callback_query(call.id, "❌ Казна пуста!", show_alert=True)
            return
        p["money"] -= law["cost"]
        p["laws"].append(law_id)
        
        if law_id == "press":
            p["factions"]["Либералы"]["loyalty"] = min(100, p["factions"]["Либералы"]["loyalty"] + 25)
            p["factions"]["Военные"]["loyalty"] = max(0, p["factions"]["Военные"]["loyalty"] - 15)
        elif law_id == "tax":
            p["factions"]["Военные"]["loyalty"] = min(100, p["factions"]["Военные"]["loyalty"] + 20)
            p["factions"]["Рабочие"]["loyalty"] = max(0, p["factions"]["Рабочие"]["loyalty"] - 30)
        elif law_id == "money":
            p["factions"]["Рабочие"]["loyalty"] = min(100, p["factions"]["Рабочие"]["loyalty"] + 30)
            p["stability"] = min(100, p["stability"] + 15)
        elif law_id == "censorship":
            p["stability"] = min(100, p["stability"] + 25)
            p["factions"]["Либералы"]["loyalty"] = max(0, p["factions"]["Либералы"]["loyalty"] - 30)
            
        bot.answer_callback_query(call.id, f"Подписан указ: {law['name']}")

    recalculate_approval(p)
    bot.edit_message_text(chat_id=call.message.chat.id, message_id=call.message.message_id, text="🏛️ Изменения приняты! Откройте «Управление», чтобы обновить экран.")

# Обработка Шпионажа
@bot.callback_query_handler(func=lambda call: call.data.startswith('spy_'))
def handle_spy(call):
    user_id = call.from_user.id
    p = players[user_id]
    mode = call.data.replace("spy_", "")
    
    if mode == "steal":
        if random.random() < 0.60:
            loot = random.randint(1500, 3000)
            p["money"] += loot
            res = f"😎 **Успех!** Ваши агенты обчистили зарубежный банк на **{loot}$**!"
        else:
            p["stability"] = max(0, p["stability"] - 20