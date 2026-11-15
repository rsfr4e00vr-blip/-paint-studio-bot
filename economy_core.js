/* ECONOMY CORE — единое экономическое ядро (одиночная игра, мультиплеер, ИИ-страны).
   Идея: у экономики один порядок расчёта и один арбитр.
   1) begin()  — снимок показателей в начале месяца.
   2) stage()  — каждая старая подсистема (дипломатия, валюта, системная модель, взаимозависимости, война)
                 запускается через журнал: ядро записывает, сколько каждая добавила/отняла у ВВП, казны, инфляции.
   3) debtService() — долг связан с ключевой ставкой, ВВП и казной (проценты + погашение в масштабе экономики).
   4) settle() — арбитр: итоговое изменение ВВП за месяц удерживается в допустимом коридоре,
                 а превышение фиксируется в журнале (видно игроку и серверу).
   Все числа баланса — в CFG. Сервер (nations_server.py) читает те же значения (проверяет test_economy_core.js). */
(function (root) {
  'use strict';
  const N = (v, d = 0) => Number.isFinite(+v) ? +v : d;
  const C = (v, a, b) => Math.max(a, Math.min(b, N(v)));

  const CFG = {
    START_GDP: 42000,
    GDP_MONTH_MAX: 0.012,        // потолок роста ВВП за месяц (≈ +15% в год) — и в одиночной игре, и на сервере
    GDP_MONTH_MIN_PEACE: -0.025, // нижний предел падения в мирное время (кризис, а не обвал)
    GDP_MONTH_MIN_WAR: -0.06,    // нижний предел падения на войне
    DEBT_BASE_RATE: 0.015,       // базовая годовая ставка по госдолгу
    DEBT_RATE_PER_CB: 0.004,     // + 0,4 п.п. на каждый 1% ключевой ставки
    DEBT_RISK_PREMIUM: 0.03,     // надбавка за долг выше 100% ВВП (в год, за каждые 100% сверху)
    DEBT_REPAY_SHARE: 0.0005,    // плановое погашение: 0,05% ВВП в месяц (раньше было «20 млн» для любой страны)
    ACTION_SCALE_MIN: 0.25,      // масштаб разовых действий (стоимость и эффект) — одинаковый для обеих сторон
    ACTION_SCALE_MAX: 8
  };

  const state = (S) => (S._econ = S._econ || { months: 0, last: null, absorbedUp: 0, absorbedDown: 0, interestPaid: 0 });

  /** Единый масштаб экономики: и стоимость, и эффект разовых действий умножаются на него. */
  function scale(S) { return C(N(S.gdp, CFG.START_GDP) / CFG.START_GDP, CFG.ACTION_SCALE_MIN, CFG.ACTION_SCALE_MAX); }

  const snapOf = (S) => ({ gdp: N(S.gdp), money: N(S.money), debt: N(S.debt), infl: N(S.inflation), emp: N(S.employment), appr: N(S.approval), stab: N(S.stability) });

  function begin(S) {
    const E = state(S);
    E._t0 = snapOf(S);
    E._stages = {};
    E._order = [];
  }

  /** Запуск старой подсистемы через журнал: возвращает её результат, ошибки не пропускает наружу. */
  function stage(S, name, fn) {
    const E = state(S);
    if (!E._stages) begin(S);
    const a = snapOf(S);
    let res;
    try { res = fn(); } catch (e) { try { console.error('[EconCore] стадия ' + name, e); } catch (_) {} }
    const b = snapOf(S);
    const row = E._stages[name] || (E._stages[name] = { gdp: 0, money: 0, infl: 0, emp: 0, appr: 0, stab: 0 });
    if (!E._order.includes(name)) E._order.push(name);
    row.gdp += a.gdp > 0 ? (b.gdp / a.gdp - 1) * 100 : 0;   // в % от ВВП на входе в стадию
    row.money += b.money - a.money;
    row.infl += b.infl - a.infl;
    row.emp += b.emp - a.emp;
    row.appr += b.appr - a.appr;
    row.stab += b.stab - a.stab;
    return res;
  }

  /** Ставка по госдолгу (годовая): ключевая ставка + премия за риск. */
  function debtRate(S) {
    const gdp = Math.max(1, N(S.gdp, 1));
    const ratio = N(S.debt) / (gdp);                      // долг к годовому ВВП
    const premium = Math.max(0, ratio - 1) * CFG.DEBT_RISK_PREMIUM;
    const trustPenalty = Math.max(0, 50 - N(S.trust, 70)) * 0.0004;
    return CFG.DEBT_BASE_RATE + N(S.cbRate, 5) * CFG.DEBT_RATE_PER_CB + premium + trustPenalty;
  }

  /** Проценты и погашение. Вызывается вместо старого «долг −20 млн». Возвращает {interest, repay}. */
  function debtService(S) {
    const E = state(S);
    const debt = Math.max(0, N(S.debt));
    if (debt <= 0) return { interest: 0, repay: 0 };
    const interest = debt * debtRate(S) / 12;
    // Проценты не должны мгновенно убивать казну: не больше половины текущих денег + месячного «дохода» экономики
    const cap = Math.max(0, N(S.money)) * 0.5 + N(S.gdp) * CFG.GDP_MONTH_MAX * 0.5;
    const paid = Math.min(interest, cap);
    S.money = N(S.money) - paid;
    if (interest > paid) S.debt = N(S.debt) + (interest - paid);       // непогашенные проценты капитализируются
    E.interestPaid += paid;
    let repay = 0;
    if (N(S.money) > N(S.gdp) * 0.02) {                                // есть запас: гасим по плану
      repay = Math.min(N(S.debt), N(S.gdp) * CFG.DEBT_REPAY_SHARE, Math.max(0, N(S.money) - N(S.gdp) * 0.02));
      S.money -= repay; S.debt -= repay;
    }
    return { interest: paid, repay };
  }

  /** Арбитр: ограничивает итоговое месячное изменение ВВП. g0 — ВВП на начало месяца. */
  function settle(S, g0, atWar) {
    const E = state(S);
    const t0 = E._t0 || snapOf(S);
    const base = N(g0, t0.gdp);
    if (base <= 0) return;
    const lo = atWar ? CFG.GDP_MONTH_MIN_WAR : CFG.GDP_MONTH_MIN_PEACE, hi = CFG.GDP_MONTH_MAX;
    const raw = N(S.gdp) / base - 1;
    let fin = raw, note = 'в коридоре';
    if (raw > hi) { fin = hi; E.absorbedUp += (raw - hi) * base; note = 'рост ограничен потолком'; }
    else if (raw < lo) { fin = lo; E.absorbedDown += (lo - raw) * base; note = 'падение ограничено нижним пределом'; }
    S.gdp = Math.max(100, base * (1 + fin));
    E.months++;
    const stages = {};
    (E._order || []).forEach(k => { const r = E._stages[k]; stages[k] = { gdp: +r.gdp.toFixed(3), money: Math.round(r.money), infl: +r.infl.toFixed(2), emp: +r.emp.toFixed(2), appr: +r.appr.toFixed(2), stab: +r.stab.toFixed(2) }; });
    E.last = { raw: +(raw * 100).toFixed(3), final: +(fin * 100).toFixed(3), note, stages, interest: Math.round(E.interestPaid), debtRate: +(debtRate(S) * 100).toFixed(2) };
    E._stages = null; E._order = null;
  }


  /** Арбитр для ИИ-страны (тот же коридор, что и у игрока). g0 — ВВП страны на начало месяца. */
  function settleNation(n, g0, atWar) {
    const base = N(g0);
    if (!n || base <= 0) return null;
    const lo = atWar ? CFG.GDP_MONTH_MIN_WAR : CFG.GDP_MONTH_MIN_PEACE, hi = CFG.GDP_MONTH_MAX;
    const raw = N(n.gdp, base) / base - 1;
    let fin = raw;
    if (raw > hi) fin = hi; else if (raw < lo) fin = lo;
    if (fin !== raw) {
      const E = n._econ || (n._econ = { absorbedUp: 0, absorbedDown: 0 });
      if (raw > hi) E.absorbedUp += (raw - hi) * base; else E.absorbedDown += (lo - raw) * base;
      n.gdp = Math.max(1, base * (1 + fin));
    }
    n._gdpMonth = +(fin * 100).toFixed(3); n._gdpWar = !!atWar;   // какой коридор применили (война могла закончиться позже в этом же месяце)
    return fin;
  }

  /** Короткий отчёт для сервера (мультиплеер): те же числа, что видит игрок. */
  function report(S) { const E = state(S); return { g: E.last ? E.last.final : 0, up: Math.round(E.absorbedUp), down: Math.round(E.absorbedDown) }; }


  /** Панель «Единый экономический механизм» + краткий гайд (вкладка «Экономика»). Работает одинаково в одиночной игре и мультиплеере. */
  const STAGE_NAMES = { base: 'Базовая формула месяца', diplomacy: 'Торговля и дипломатия', addons: 'Политика, разведка, кризисы, проекты', currency: 'Валюта и курс', systemic: 'Системная модель (выпуск, ресурсы, цикл)', interdep: 'Взаимозависимости отраслей', warEcon: 'Военная экономика' };
  const pct = (v) => (v > 0 ? '+' : '') + N(v).toFixed(2) + '%';
  function panelHtml(S) {
    const E = state(S), L = E.last;
    const fmt = (n) => Math.round(N(n)).toLocaleString('ru-RU');
    let rows = '<p class="muted">Журнал появится после первого игрового месяца.</p>', head = '';
    if (L) {
      head = '<div class="cards"><div class="mini">Итог ВВП за месяц<b>' + pct(L.final) + '</b></div><div class="mini">До арбитра<b>' + pct(L.raw) + '</b></div><div class="mini">Ставка по долгу<b>' + L.debtRate + '% год.</b></div><div class="mini">Проценты за всё время<b>' + fmt(E.interestPaid) + ' млн</b></div></div><p class="muted">Арбитр: ' + L.note + '.</p>';
      rows = '<table class="tbl"><tr><th>Подсистема</th><th>ВВП</th><th>Казна</th><th>Инфляция</th></tr>' + Object.keys(L.stages).map(k => { const r = L.stages[k]; return '<tr><td>' + (STAGE_NAMES[k] || k) + '</td><td>' + pct(r.gdp) + '</td><td>' + (r.money >= 0 ? '+' : '') + fmt(r.money) + '</td><td>' + (r.infl >= 0 ? '+' : '') + r.infl + '</td></tr>'; }).join('') + '</table>';
    }
    const guide = '<details><summary><b>📖 Кратко: как работает экономика</b></summary><ol class="muted">' +
      '<li><b>Один порядок месяца:</b> бюджет → налоги и расходы → базовый рост → дипломатия → политика → валюта → системная модель → взаимозависимости → война → арбитр.</li>' +
      '<li><b>Один арбитр:</b> ВВП за месяц не может вырасти больше ' + (CFG.GDP_MONTH_MAX * 100).toFixed(1) + '% и упасть больше ' + (-CFG.GDP_MONTH_MIN_PEACE * 100).toFixed(1) + '% (на войне — ' + (-CFG.GDP_MONTH_MIN_WAR * 100).toFixed(0) + '%). Тот же потолок проверяет сервер мультиплеера.</li>' +
      '<li><b>Единый масштаб:</b> стоимость и эффект разовых действий умножаются на размер вашей экономики (ВВП ÷ ' + fmt(CFG.START_GDP) + '). Малая и крупная страны получают честную отдачу.</li>' +
      '<li><b>Долг стоит денег:</b> ставка = ' + (CFG.DEBT_BASE_RATE * 100).toFixed(1) + '% + ' + (CFG.DEBT_RATE_PER_CB * 100).toFixed(1) + ' п.п. за каждый 1% ключевой ставки + премия за долг выше ВВП. Плановое погашение — ' + (CFG.DEBT_REPAY_SHARE * 100).toFixed(2) + '% ВВП в месяц.</li>' +
      '<li><b>Журнал выше</b> показывает, сколько каждая подсистема добавила или отняла в этом месяце. Подробный гайд — файл ECONOMY_GUIDE.md.</li></ol></details>';
    return '<section class="panel"><h2>⚖️ Единый экономический механизм</h2>' + head + rows + guide + '</section>';
  }

  root.EconCore = { CFG, scale, begin, stage, debtRate, debtService, settle, settleNation, report, panelHtml };
})(typeof window !== 'undefined' ? window : globalThis);
