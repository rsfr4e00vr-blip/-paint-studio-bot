import os
import zipfile

# Содержимое app.py
app_py = '''from flask import Flask, render_template, jsonify, request
import os

app = Flask(__name__, template_folder='.')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
'''

# Содержимое requirements.txt
requirements_txt = '''Flask==3.0.0
gunicorn==21.2.0
'''

# Содержимое render.yaml
render_yaml = '''services:
  - type: web
    name: paint-studio-bot
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
'''

# Содержимое README.txt
readme_txt = '''Paint Studio Bot - Extended Endless Political & Strategy Edition
====================================================================
Фичи:
1. Безлимитный режим кампании (без ограничения в 240 месяцев).
2. Выбор 3 уровней сложности (Лёгкий, Средний, Тяжёлый).
3. Полноценные выборы, партии, рейтинг правительства и революции.
4. Расширенная система случайных событий с последствиями.
5. Готов к развёртыванию на Render.com через Gunicorn.
'''

# Содержимое index.html (Интерфейс + Логика игры)
index_html = '''<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Государственная Стратегия — Бесконечная Кампания</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1a1a2e; color: #e9ecef; margin: 0; padding: 20px; }
        .container { max-width: 950px; margin: 0 auto; background: #16213e; padding: 25px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
        h1, h2, h3 { color: #00fff5; text-align: center; }
        .setup-screen, .game-screen { display: none; }
        .active { display: block; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .card { background: #0f3460; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #1f4068; }
        .card h4 { margin: 0 0 8px 0; color: #e9ecef; }
        .val { font-size: 1.4em; font-weight: bold; color: #00fff5; }
        button { background: #e94560; color: #fff; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: bold; width: 100%; transition: 0.2s; margin-top: 5px; }
        button:hover { background: #ff6b81; }
        .btn-group { display: flex; gap: 10px; margin-top: 15px; }
        .event-box { background: #1b1b2f; border: 2px solid #e94560; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .event-choices { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
        .log-box { background: #0f0f1b; padding: 15px; border-radius: 8px; height: 150px; overflow-y: auto; font-family: monospace; font-size: 0.9em; border: 1px solid #222; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
        .badge-easy { background: #2ed573; color: #000; }
        .badge-medium { background: #ffa502; color: #000; }
        .badge-hard { background: #ff4757; color: #fff; }
    </style>
</head>
<body>

<div class="container">
    <h1>🏛️ Государственный Симулятор</h1>

    <!-- Экран настройки -->
    <div id="setup-screen" class="setup-screen active">
        <h2>Выберите уровень сложности</h2>
        <div class="grid">
            <div class="card">
                <h3>🟢 Лёгкая</h3>
                <p>Много стартовых ресурсов, слабые противники, верный народ.</p>
                <button onclick="startGame('easy')">Старт (Лёгкая)</button>
            </div>
            <div class="card">
                <h3>🟡 Средняя</h3>
                <p>Сбалансированная экономика, нормальные угрозы и ИИ.</p>
                <button onclick="startGame('medium')">Старт (Средняя)</button>
            </div>
            <div class="card">
                <h3>🔴 Тяжёлая</h3>
                <p>Настоящий ад: кризисы, бунты, дорогая армия и сильный ИИ.</p>
                <button onclick="startGame('hard')">Старт (Тяжёлая)</button>
            </div>
        </div>
    </div>

    <!-- Основной экран игры -->
    <div id="game-screen" class="game-screen">
        <div style="display: flex; justify: space-between; align-items: center;">
            <h2>Месяц: <span id="m-count">1</span> <small>(Бесконечный режим)</small></h2>
            <span id="diff-badge" class="badge">Сложность</span>
        </div>

        <div class="grid">
            <div class="card"><h4>💰 Казна</h4><div class="val" id="val-money">1000$</div></div>
            <div class="card"><h4>⚔️ Армия</h4><div class="val" id="val-army">500</div></div>
            <div class="card"><h4>📊 Рейтинг</h4><div class="val" id="val-rating">70%</div></div>
            <div class="card"><h4>🏛️ Партия в власти</h4><div class="val" id="val-party" style="font-size:1.1em">Центристы</div></div>
        </div>

        <!-- Окно события -->
        <div id="event-box" class="event-box" style="display:none;">
            <h3 id="event-title">Событие</h3>
            <p id="event-desc">Описание события...</p>
            <div id="event-choices" class="event-choices"></div>
        </div>

        <div class="btn-group">
            <button onclick="nextMonth()" id="btn-next">▶️ Следующий месяц</button>
            <button onclick="buyArmy()">⚔️ Нанять армию (+100)</button>
            <button onclick="holdCampaign()">📢 Предвыборная кампания</button>
        </div>

        <h3>📜 Журнал событий</h3>
        <div id="log-box" class="log-box"></div>
    </div>
</div>

<script>
let gameState = {
    month: 1,
    money: 1000,
    army: 500,
    rating: 70,
    difficulty: 'medium',
    party: 'Центристы',
    inEvent: false
};

const diffSettings = {
    easy: { money: 3000, army: 1000, rating: 85, income: 400, armyCost: 1, badge: 'badge-easy', label: '🟢 Лёгкая' },
    medium: { money: 1500, army: 500, rating: 70, income: 250, armyCost: 2, badge: 'badge-medium', label: '🟡 Средняя' },
    hard: { money: 600, army: 200, rating: 50, income: 120, armyCost: 4, badge: 'badge-hard', label: '🔴 Тяжёлая' }
};

const events = [
    {
        title: "📉 Экономический кризис",
        desc: "Мировые рынки рухнули! Инфляция бьёт по бюджету.",
        choices: [
            { text: "Выделить субсидии (-300$)", action: (s) => { s.money -= 300; s.rating += 5; log("Субсидии поддержали народ."); } },
            { text: "Ввести режим экономии (-15% рейтинга)", action: (s) => { s.rating -= 15; log("Народ недоволен сокращением расходов."); } }
        ]
    },
    {
        title: "🛡️ Военный переворот",
        desc: "Группа генералов выражает недовольство правительством.",
        choices: [
            { text: "Подкупить офицеров (-400$)", action: (s) => { s.money -= 400; log("Офицеры временно успокоились."); } },
            { text: "Подавить заговор силой (-100 армии)", action: (s) => { s.army -= 100; s.rating -= 10; log("Заговор подавлен, но армия понесла потери."); } }
        ]
    },
    {
        title: "💡 Научный прорыв",
        desc: "Наши учёные совершили открытие в сфере энергетики!",
        choices: [
            { text: "Внедрить технологии (+500$)", action: (s) => { s.money += 500; log("Экономика получила импульс!"); } },
            { text: "Засекретить разработки (+10% рейтинга)", action: (s) => { s.rating += 10; log("Престиж государства вырос."); } }
        ]
    },
    {
        title: "🦠 Эпидемия",
        desc: "Новый вирус распространяется по крупным городам.",
        choices: [
            { text: "Объявить карантин (-200$, +5% рейтинга)", action: (s) => { s.money -= 200; s.rating += 5; log("Карантин снизил убытки от болезни."); } },
            { text: "Игнорировать угрозу (-20% рейтинга)", action: (s) => { s.rating -= 20; log("Эпидемия вызвала панику в обществе."); } }
        ]
    }
];

function startGame(diff) {
    gameState.difficulty = diff;
    const cfg = diffSettings[diff];
    gameState.money = cfg.money;
    gameState.army = cfg.army;
    gameState.rating = cfg.rating;
    
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    const badge = document.getElementById('diff-badge');
    badge.className = `badge ${cfg.badge}`;
    badge.innerText = cfg.label;
    
    log(`Игра началась на уровне сложности: ${cfg.label}`);
    updateUI();
}

function updateUI() {
    document.getElementById('m-count').innerText = gameState.month;
    document.getElementById('val-money').innerText = gameState.money + '$';
    document.getElementById('val-army').innerText = gameState.army;
    document.getElementById('val-rating').innerText = gameState.rating + '%';
    document.getElementById('val-party').innerText = gameState.party;
}

function log(msg) {
    const box = document.getElementById('log-box');
    box.innerHTML = `[Месяц ${gameState.month}] ${msg}<br>` + box.innerHTML;
}

function nextMonth() {
    if (gameState.inEvent) return;
    
    gameState.month++;
    const cfg = diffSettings[gameState.difficulty];
    
    // Доходы и содержание армии
    const upkeep = gameState.army * cfg.armyCost;
    gameState.money += cfg.income - upkeep;
    
    log(`Доход: +${cfg.income}$, Содержание армии: -${upkeep}$`);
    
    // Проверка выборов каждый 24 месяц
    if (gameState.month % 24 === 0) {
        triggerElections();
        updateUI();
        return;
    }
    
    // Шанс случайного события
    if (Math.random() < 0.45) {
        triggerRandomEvent();
    }
    
    checkStatus();
    updateUI();
}

function buyArmy() {
    if (gameState.money >= 150) {
        gameState.money -= 150;
        gameState.army += 100;
        log("Нанято 100 новобранцев (-150$).");
        updateUI();
    } else {
        alert("Недостаточно средств!");
    }
}

function holdCampaign() {
    if (gameState.money >= 200) {
        gameState.money -= 200;
        gameState.rating = Math.min(100, gameState.rating + 12);
        log("Проведена предвыборная кампания (+12% рейтинга, -200$).");
        updateUI();
    } else {
        alert("Недостаточно средств для кампании!");
    }
}

function triggerRandomEvent() {
    gameState.inEvent = true;
    document.getElementById('btn-next').disabled = true;
    
    const ev = events[Math.floor(Math.random() * events.length)];
    document.getElementById('event-title').innerText = ev.title;
    document.getElementById('event-desc').innerText = ev.desc;
    
    const container = document.getElementById('event-choices');
    container.innerHTML = '';
    
    ev.choices.forEach(c => {
        const btn = document.createElement('button');
        btn.innerText = c.text;
        btn.onclick = () => {
            c.action(gameState);
            document.getElementById('event-box').style.display = 'none';
            gameState.inEvent = false;
            document.getElementById('btn-next').disabled = false;
            checkStatus();
            updateUI();
        };
        container.appendChild(btn);
    });
    
    document.getElementById('event-box').style.display = 'block';
}

function triggerElections() {
    log("🏛️ СОСТОЯЛИСЬ ВСЕНАРОДНЫЕ ВЫБОРЫ!");
    if (gameState.rating >= 50) {
        log("🎉 Вы выиграли выборы и остались у власти!");
    } else {
        log("💥 Вы проиграли выборы! Власть перешла к оппозиции.");
        gameState.party = "Оппозиционная коалиция";
        gameState.rating = 40;
    }
}

function checkStatus() {
    if (gameState.rating <= 15) {
        alert("🔥 Революция! Ваш рейтинг упал слишком низко, народ сверг правительство. Игра окончена!");
        location.reload();
    }
    if (gameState.money < -1000) {
        alert("💸 Полное банкротство государства! Игра окончена.");
        location.reload();
    }
}
</script>
</body>
</html>
'''

files = {
    'paint-studio-bot-main/app.py': app_py,
    'paint-studio-bot-main/requirements.txt': requirements_txt,
    'paint-studio-bot-main/render.yaml': render_yaml,
    'paint-studio-bot-main/README.txt': readme_txt,
    'paint-studio-bot-main/index.html': index_html,
}

zip_filename = 'paint-studio-bot-updated.zip'

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for path, content in files.items():
        zipf.writestr(path, content)

print(f"Архив '{zip_filename}' успешно сгенерирован!")