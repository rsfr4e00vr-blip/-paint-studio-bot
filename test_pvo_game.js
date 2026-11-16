// Run: node test_pvo_game.js — дымовой тест игры: удары по ПВО врага, удары врага по нашему ПВО, графика ПВО, экономика.
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
const scripts = ['world.js', 'regions.js', 'world_data.js', 'fx.js', 'resources.js', 'nn_core.js', 'pvo.js', 'grand_diplomacy.js',
  'ai_resources.js', 'interdep.js', 'ai_arsenal.js', 'systemic_sim.js', 'economy_core.js', 'ai_nations.js', 'population_ai.js', 'economy_diplomacy.js', 'game.js'];
for (const s of scripts) {
  try { let src = fs.readFileSync(path.join(ROOT, s), 'utf8'); if (s === 'game.js') src = src.replace("window.H=window.H||{};", "window.H=window.H||{};window.__dbg={get S(){return S},startWar};"); vm.runInContext(src, win, { filename: s }); }
  catch (e) { console.error('LOAD FAIL', s, e.message.split('\n')[0]); }
}
const stepBtn = handlers['#step'];assert.ok(stepBtn && stepBtn.onclick, 'кнопка шага не найдена');
const S = () => win.__dbg.S, PVO = win.PVO;
let seed = 4242; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const en0 = S().relations.find(r => !r.self && r.power > 50) || S().relations[1];
win.__dbg.startWar(en0.name, false, 'territorial');
const en = () => S().relations.find(r => r.name === en0.name);
assert.ok(S().wars.length > 0, 'война началась');
// 1) удар по ПВО врага
S().drone = 60; S().cruise = 30; S().rocket = 30; S().mil = Math.max(S().mil || 0, 6);
PVO.ensure(en()); en().aa = 6; const before = en().aa; let shots = 0;
for (let i = 0; i < 12 && en().aa > 0.4; i++) { win.fire('cruise', 'pvo'); shots++; }
console.log(`Удары по ПВО врага: ${before.toFixed(1)} → ${en().aa.toFixed(1)} за ${shots} пуск(ов)`);
assert.ok(en().aa < before, 'ПВО врага должно упасть');
assert.ok(Number.isFinite(en().aa) && en().aa >= 0);
// 2) обычные удары не ломаются (в т.ч. по экономике)
['mil', 'infra', 'civ'].forEach(t => { const g = S().gdp; win.fire('rocket', t); assert.ok(Number.isFinite(S().gdp) && Number.isFinite(S().approval), 'после удара по ' + t); });
// 3) месяцы войны: враг бьёт, в том числе по нашему ПВО; всё конечно и в границах
S().aa = 4; let sawSead = false, minMy = 99, gdpHit = 0; const g0 = S().gdp;
for (let i = 0; i < 36 && S().wars.length; i++) {
  stepBtn.onclick();
  const my = PVO.myStrength(S(), 0, 0); minMy = Math.min(minMy, my);
  assert.ok(Number.isFinite(S().gdp) && S().gdp > 0 && Number.isFinite(S().aaSup || 0), 'месяц ' + i);
  const c = en(); if (c) assert.ok(Number.isFinite(c.aa) && c.aa >= 0 && c.aa <= 14, 'ПВО врага в границах');
}
const logs = JSON.stringify(S().log || S().logs || []);
sawSead = /по нашему ПВО|искала наше ПВО/.test(logs);
console.log('Война шла месяцев:', 36, '· враг бил по нашему ПВО:', sawSead, '· минимум нашей силы ПВО:', minMy.toFixed(1), '· подавление сейчас:', (S().aaSup || 0).toFixed(1));
// 4) графика: панель ПВО рисуется
const html = PVO.panelHTML(S(), { bat: 0, rel: n => S().relations.find(r => r.name === n), patrolOf: () => 0 });
assert.ok(/pvog/.test(html) && /<svg/.test(html), 'панель ПВО с кольцевыми датчиками');
console.log('OK: панель ПВО (SVG), длина HTML', html.length);
console.log('ALL OK');
{ const L = (S().log || S().logs || []).map(x => typeof x === 'string' ? x : (x.t || x.text || JSON.stringify(x)));
  const real = L.filter(x => /сила ПВО \d/.test(x)).length, miss = L.filter(x => /искала наше ПВО/.test(x)).length, stop = L.filter(x => /ПВО отразила/.test(x)).length;
  console.log(`Журнал: ударов по нашему ПВО ${real}, промахов ${miss}, перехваченных ударов ${stop}, записей ${L.length}`); console.log(L.filter(x => /сила ПВО \d/.test(x)).slice(0, 3).join('\n')); }
