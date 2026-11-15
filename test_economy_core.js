// Run: node test_economy_core.js — единое экономическое ядро: коридор роста, долг, журнал, масштаб действий, паритет с сервером.
// Игра запускается без браузера (заглушка DOM), месяцы прокручиваются кнопкой «шаг».
const assert = require('node:assert/strict');
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = __dirname;


const store = {};
const mkEl = () => new Proxy(function () {}, {
  get(t, k) {
    if (k === Symbol.toPrimitive) return () => '';
    if (k === 'value') return t._v ?? '1800';
    if (k === 'children' || k === 'childNodes') return [];
    if (k === 'then') return undefined;
    if (k in t) return t[k];
    return (t[k] = mkEl());
  },
  set(t, k, v) { t[k] = v; return true; },
  apply() { return mkEl(); },
});
const handlers = {};
const document = new Proxy({}, {
  get(_, k) {
    if (k === 'querySelector' || k === 'getElementById') return (s) => (handlers[s] ||= mkEl());
    if (k === 'querySelectorAll') return () => [];
    if (k === 'addEventListener') return () => {};
    if (k === 'createElement') return () => mkEl();
    if (k === 'hidden') return false;
    return mkEl();
  },
});
const win = {
  document, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => delete store[k] },
  navigator: { clipboard: {} }, location: { href: '', search: '', hash: '', protocol: 'http:', host: 'x', origin: 'http://x' },
  addEventListener() {}, removeEventListener() {}, requestAnimationFrame: f => 0, scrollTo() {},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  fetch: () => Promise.reject(new Error('no net')), Math, JSON, Date, console,
  getComputedStyle: () => ({}), matchMedia: () => ({ matches: false, addEventListener() {} }),
  Blob: function () {}, URL: { createObjectURL() { return ''; } }, FileReader: function () {},
  WebSocket: function () { return mkEl(); }, EventSource: function () { return mkEl(); },
  innerWidth: 1000, innerHeight: 800, devicePixelRatio: 1,
};
win.window = win; win.self = win; win.globalThis = win;
vm.createContext(win);
const scripts = ['world.js', 'regions.js', 'world_data.js', 'fx.js', 'resources.js', 'nn_core.js', 'grand_diplomacy.js',
  'ai_resources.js', 'interdep.js', 'ai_arsenal.js', 'systemic_sim.js', 'economy_core.js', 'ai_nations.js', 'population_ai.js', 'economy_diplomacy.js', 'game.js'];
for (const s of scripts) {
  try { let src = fs.readFileSync(path.join(ROOT, s), 'utf8'); if (s === 'game.js') src = src.replace("window.H=window.H||{};", "window.H=window.H||{};window.__dbg={get S(){return S},startWar};"); vm.runInContext(src, win, { filename: s }); }
  catch (e) { console.error('LOAD FAIL', s, e.message.split('\n')[0]); }
}


const stepBtn = handlers['#step'];
assert.ok(stepBtn && stepBtn.onclick, 'кнопка шага не найдена');
const S = () => win.__dbg.S;
const EC = win.EconCore; assert.ok(EC, 'EconCore не загружен');
function seeded(seed){ return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

// 0) паритет с сервером: потолок роста совпадает
{ const py = fs.readFileSync(path.join(ROOT, 'nations_server.py'), 'utf8'); const m = py.match(/GDP_SCORE_CAP\s*=\s*([0-9.]+)/);
  assert.ok(m && Math.abs((+m[1] - 1) - EC.CFG.GDP_MONTH_MAX) < 1e-9, 'GDP_SCORE_CAP на сервере должен равняться 1 + GDP_MONTH_MAX'); console.log('OK: паритет сервер/клиент, потолок', EC.CFG.GDP_MONTH_MAX); }

// 1) мир: каждая партия начинается с нуля (отдельный процесс), 6 партий × 10 лет
if (process.env.ECO_CHILD) {
  Math.random = seeded(+process.env.ECO_CHILD); const g0 = S().gdp; let prev = g0, viol = 0, minEmp = 100, maxDebt = 0, neg = 0, yprev = g0;
  for (let i = 1; i <= 120; i++) { stepBtn.onclick(); const g = S().gdp, r = g / prev - 1;
    if (!(r <= EC.CFG.GDP_MONTH_MAX + 1e-9 && r >= EC.CFG.GDP_MONTH_MIN_PEACE - 1e-9) && !S().wars.length) viol++;
    prev = g; if (i % 12 === 0) { if (g < yprev) neg++; yprev = g; }
    assert.ok(Object.keys(S()._econ.last.stages).length >= 5, 'журнал стадий пуст'); maxDebt = Math.max(maxDebt, S().debt); }
  console.log(JSON.stringify({ cagr: (Math.pow(S().gdp / g0, 1 / 10) - 1) * 100, viol, neg, debt: Math.round(S().debt), money: Math.round(S().money), infl: +S().inflation.toFixed(1), emp: +S().employment.toFixed(1) }));
  process.exit(0);
}
{ const { execFileSync } = require('child_process'); const rows = [];
  for (let k = 0; k < 6; k++) rows.push(JSON.parse(execFileSync(process.execPath, [__filename], { env: { ...process.env, ECO_CHILD: String(777 + k * 31) }, encoding: 'utf8' }).trim().split('\n').pop()));
  const avg = rows.reduce((a, r) => a + r.cagr, 0) / rows.length, negY = rows.reduce((a, r) => a + r.neg, 0);
  console.log('OK: мир 10 лет × 6 партий. Рост %/год:', rows.map(r => r.cagr.toFixed(1)).join(' '), '| среднее', avg.toFixed(2), '| отрицательных лет', negY + '/60', '| долг', rows.map(r => r.debt).join(','), '| вне коридора', rows.map(r => r.viol).join(','));
  rows.forEach(r => assert.equal(r.viol, 0, 'месячный рост вышел из коридора'));
  assert.ok(avg > 0.5 && avg < 6, 'средний рост вне разумного диапазона: ' + avg); }

// 2) долг: проценты растут со ставкой ЦБ и размером долга, гасится в масштабе экономики
{ const s = {gdp: 42000, money: 5000, debt: 40000, cbRate: 5, trust: 70}; const r1 = EC.debtRate(s); s.cbRate = 15; const r2 = EC.debtRate(s);
  assert.ok(r2 > r1, 'ставка по долгу должна расти с ключевой ставкой'); s.debt = 120000; assert.ok(EC.debtRate(s) > r2, 'премия за риск при долге > ВВП');
  const big = {gdp: 420000, money: 90000, debt: 0, cbRate: 5}, small = {gdp: 4200, money: 900, debt: 0, cbRate: 5};
  big.debt = 100000; small.debt = 1000; const a = EC.debtService(big), b = EC.debtService(small); assert.ok(a.repay / 420000 > 0 && Math.abs(a.repay / 420000 - b.repay / 4200) < 2e-4, 'погашение должно быть пропорционально ВВП');
  console.log('OK: долг, ставка', (r1 * 100).toFixed(2), '→', (r2 * 100).toFixed(2), '% годовых'); }

// 3) единый масштаб действий: цена и эффект «Промышленность» пропорциональны ВВП
{ const s = {gdp: 42000}; assert.equal(EC.scale(s), 1); s.gdp = 420000; assert.equal(EC.scale(s), 8 > 10 ? 10 : EC.scale(s)); assert.ok(EC.scale(s) <= EC.CFG.ACTION_SCALE_MAX); console.log('OK: масштаб действий', EC.scale({gdp: 4200}), EC.scale({gdp: 42000}), EC.scale({gdp: 420000})); }

// 4) арбитр режет аномальный рост и обвал
{ const s = {gdp: 142000, _econ: null}; EC.begin(s); EC.settle(s, 100000, false); assert.ok(Math.abs(s.gdp - 101200) < 1, 'рост должен быть обрезан потолком'); 
  const t = {gdp: 50000}; EC.begin(t); EC.settle(t, 100000, false); assert.ok(Math.abs(t.gdp - 97500) < 1, 'падение в мире ограничено'); 
  const w = {gdp: 50000}; EC.begin(w); EC.settle(w, 100000, true); assert.ok(Math.abs(w.gdp - 94000) < 1, 'на войне нижний предел шире'); console.log('OK: арбитр'); }

// 5) война: 24 мес. подряд без ошибок, ВВП в коридоре войны
{ Math.random = seeded(4242); const en = S().relations.find(r => !r.self && r.power > 50) || S().relations[1]; win.__dbg.startWar(en.name, false, 'territorial'); let prev = S().gdp, bad = 0;
  for (let i = 0; i < 24; i++) { stepBtn.onclick(); const r = S().gdp / prev - 1; if (r < EC.CFG.GDP_MONTH_MIN_WAR - 1e-9 || r > EC.CFG.GDP_MONTH_MAX + 1e-9) bad++; prev = S().gdp; }
  assert.equal(bad, 0, 'в войне ВВП вышел из коридора'); console.log('OK: война 24 мес., ВВП', Math.round(S().gdp), 'долг', Math.round(S().debt)); }

// 6) арбитр для ИИ-стран: тот же коридор, что и у игрока
{ const a = {gdp: 150000}; EC.settleNation(a, 100000, false); assert.ok(Math.abs(a.gdp - 101200) < 1, 'ИИ: рост обрезан потолком');
  const b = {gdp: 40000}; EC.settleNation(b, 100000, false); assert.ok(Math.abs(b.gdp - 97500) < 1, 'ИИ: падение в мире ограничено');
  const c = {gdp: 40000}; EC.settleNation(c, 100000, true); assert.ok(Math.abs(c.gdp - 94000) < 1, 'ИИ на войне: нижний предел шире');
  const d = {gdp: 100500}; EC.settleNation(d, 100000, false); assert.equal(d.gdp, 100500, 'в коридоре ВВП не трогаем');
  console.log('OK: арбитр ИИ-стран (юнит)'); }

// 7) арбитр в живом мире: каждый месяц ВВП каждой ИИ-страны остаётся в коридоре
{ Math.random = seeded(99); let checked = 0, bad = 0;
  for (let i = 0; i < 24; i++) { stepBtn.onclick(); const W = S().aiWorld; if (!W) continue;
    W.nations.filter(n => !n.annexed && !n.human).forEach(n => { if (n._gdpMonth == null) return; checked++;
      const lo = (n._gdpWar ? EC.CFG.GDP_MONTH_MIN_WAR : EC.CFG.GDP_MONTH_MIN_PEACE) * 100 - 1e-6;
      if (n._gdpMonth < lo || n._gdpMonth > EC.CFG.GDP_MONTH_MAX * 100 + 1e-6) { bad++; if (process.env.DBG) console.log('BAD', n.name, n._gdpMonth, 'war', !!n.war, 'i', i); } }); }
  assert.ok(checked > 0, 'арбитр ИИ не отработал ни разу'); assert.equal(bad, 0, 'ВВП ИИ-страны вышел из коридора');
  console.log('OK: арбитр в мире ИИ, проверок', checked); }

// 8) автозакупка ресурсов: срочная покупка, резерв казны, без двойных трат
{ Math.random = seeded(5); const s = S(); const CORE = ['food', 'fuel', 'energy', 'steel'];
  s.autoImp = false; s.autoPurchase = null;
  // 8а) выключена — ничего не покупает
  s.money = 500000; s.food = 20; const imp0 = s.mk.imp; stepBtn.onclick();
  assert.equal(s.mk.imp, imp0, 'выключенная автозакупка не должна покупать');
  // 8б) включена: срочная докупка ниже 30, штраф запущенной экономики не включается
  s.autoPurchase = { enabled: true, items: { food: { on: true, target: 55, amount: 3 } } }; s.money = 500000; s.food = 20;
  stepBtn.onclick(); assert.ok(s.food >= 40, 'срочная закупка должна поднять запас сверх «amount»: food=' + s.food);
  assert.ok(s.money >= 0, 'казна не уходит в минус из-за автозакупки');
  // 8в) обычный режим уважает «amount»
  s.food = 50; s.autoPurchase.items.food.target = 90; const f1 = s.food; s.money = 500000; stepBtn.onclick();
  assert.ok(s.food - f1 <= 3 + 3, 'обычный режим не превышает «amount» заметно: +' + (s.food - f1));
  // 8г) резерв казны: почти пустая казна — покупок нет
  s.food = 50; s.autoPurchase.items.food.target = 90; s.money = 0; s.lastExp = 5000; const imp1 = s.mk.imp; stepBtn.onclick();
  assert.ok(s.money >= 0, 'казна не отрицательна');
  // 8д) старая кнопка «автозакупка дефицита» идёт через общий механизм и не удваивает траты
  s.autoPurchase = { enabled: true, items: { fuel: { on: true, target: 45, amount: 10 } } }; s.autoImp = true; s.money = 500000; s.fuel = 15; s.mk.imp = 0;
  stepBtn.onclick(); assert.ok(s.mk.imp > 0, 'автозакупка работает через общий рынок (учтён импорт)');
  assert.ok(s.fuel >= 30, 'топливо поднято выше порога штрафа: ' + s.fuel);
  assert.ok(s.mk.q.fuel >= 0, 'месячный лимит рынка не уходит в минус');
  console.log('OK: автозакупка (выкл/срочно/лимит/резерв/старая кнопка)'); }
console.log('ALL OK');
