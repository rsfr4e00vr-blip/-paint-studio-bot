// Run: node test_gdp_war_economy.js — ВВП не падает по экспоненте; «военные рельсы» держат ВВП во время войны.
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
function run(label, { rails = false, months, seedInit = 12345 }) {
  let seed = seedInit; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = [];
  if (label !== 'peace') {
    const en = S().relations.find(r => !r.self && r.power > 50) || S().relations[1];
    win.__dbg.startWar(en.name, false, 'territorial');
    if (rails) win.H.warEconOn(true);
  }
  for (let i = 1; i <= months; i++) {
    const g0 = S().gdp, warBefore = S().wars.length > 0;
    stepBtn.onclick();
    rows.push({ i, g0, g1: S().gdp, war: warBefore, rails: !!(S().we && S().we.on) });
  }
  return rows;
}
// 0) Военные рельсы: пока идёт война и режим включён, ВВП ни в одном месяце не падает
{ const r = run('war', { rails: true, months: 12 }); const wm = r.filter(x => x.war && x.rails);
  assert.ok(wm.length >= 2, 'должно быть хотя бы 2 месяца войны на рельсах'); wm.forEach(x => assert.ok(x.g1 >= x.g0 - 1e-6, 'ВВП упал на военных рельсах в месяце ' + x.i));
  assert.ok(S().we.shield > 0, 'режим должен реально поглощать потери'); console.log('OK: военные рельсы, месяцев войны:', wm.length, 'защищено ВВП:', Math.round(S().we.shield)); }
// 1) Мир: ВВП растёт, а не тает
{ const r = run('peace', { months: 48 }); assert.ok(r[47].g1 > r[0].g0, 'в мире ВВП должен расти'); console.log('OK: мир, ВВП', Math.round(r[0].g0), '→', Math.round(r[47].g1)); }
// 2) После войны без рельс ВВП восстанавливается (раньше падал бесконечно: стресс отраслей вычитался каждый месяц)
{ const r = run('war', { months: 48 }); const low = Math.min(...r.map(x => x.g1)); assert.ok(r[47].g1 > low * 1.15, 'после войны ВВП должен восстанавливаться'); assert.ok(r[47].g1 > r[23].g1, 'рост продолжается после просадки'); console.log('OK: война без рельс, минимум', Math.round(low), 'итог', Math.round(r[47].g1)); }
console.log('ALL OK');
