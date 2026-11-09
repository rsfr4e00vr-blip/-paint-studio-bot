// Функция перерисовки всего экрана на телефоне
function updateGameUI(state) {
    if (!state) return;

    // Ресурсы
    document.getElementById("money-val").innerText = state.money;
    document.getElementById("stock-val").innerText = state.black_market_stock;

    // Название Дворца
    const palaceNames = {
        1: "🛖 Деревянная изба",
        2: "🏡 Укрепленная вилла",
        3: "🏢 Правительственный комплекс",
        4: "🏰 Роскошный замок",
        5: "🏛️ Величественный Дворец"
    };
    document.getElementById("palace-name").innerText = palaceNames[state.palace_level] || "🏛️ Дворец Империи";

    // Полоски прогресса
    document.getElementById("stability-bar").style.width = state.stability + "%";
    document.getElementById("approval-bar").style.width = state.approval_rating + "%";

    // Меняем цвета полосок при критических значениях
    document.getElementById("stability-bar").style.backgroundColor = state.stability < 30 ? "#e74c3c" : "#2ecc71";
    document.getElementById("approval-bar").style.backgroundColor = state.approval_rating < 30 ? "#e74c3c" : "#2ecc71";

    // Вывод фракций
    const facContainer = document.getElementById("factions-container");
    facContainer.innerHTML = "";
    for (const [name, info] of Object.entries(state.factions)) {
        facContainer.innerHTML += `
            <div style="margin-bottom: 8px;">
                <div class="flex"><span>${name}</span><span>${info.loyalty}%</span></div>
                <div class="bar-container"><div class="bar" style="width: ${info.loyalty}%; background: #34495e;"></div></div>
            </div>
        `;
    }
}

// Запрос на принятие законов
function adoptLaw(lawId) {
    sendPost('/api/enact_law', { law_id: lawId }, (data) => {
        alert(data.message || "Указ подписан!");
        updateGameUI(data.state);
    });
}

// Улучшение дворца
function upgradePalace() {
    sendPost('/api/action_upgrade_palace', {}, (data) => {
        alert("Дворец успешно перестроен!");
        updateGameUI(data.state);
    });
}

// Действия на черном рынке
function makeMarketAction(mode) {
    sendPost('/api/market_action', { mode: mode }, (data) => {
        alert(data.message);
        updateGameUI(data.state);
    });
}

// Запуск шпионажа
function makeSpyAction(mode) {
    sendPost('/api/spy_action', { mode: mode }, (data) => {
        alert(data.message);
        updateGameUI(data.state);
    });
}

// Следующий ход
function nextTurn() {
    sendPost('/api/next_turn', {}, (data) => {
        alert(data.message);
        if(data.game_over) {
            location.reload(); // Перезапуск при проигрыше
        } else {
            updateGameUI(data.state);
        }
    });
}

// Универсальный помощник для отправки запросов на сервер
function sendPost(url, bodyData, onSuccess) {
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
    })
    .then(res => res.json())
    .then(data => {
        if(data.error) alert("Ошибка: " + data.error);
        else onSuccess(data);
    })
    .catch(err => console.error("Сеть:", err));
}

// Первая загрузка данных при старте
window.onload = function() {
    fetch('/api/state').then(res => res.json()).then(state => updateGameUI(state));
};
