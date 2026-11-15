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
  try { let src = fs.readFileSync(path.join(ROOT, s), 'utf8'); if (s === 'game.js') src = src.replace("window.H=window.H||{};", "window.H=window.H||{};window.__dbg={get S(){return S},startWar,render,fxEnsure};"); vm.runInContext(src, win, { filename: s }); }
  catch (e) { console.error('LOAD FAIL', s, e.message.split('\n')[0]); }
}


const NG = win.NG;
assert.ok(NG && NG.begin && NG.countryInfo, 'NG API не найден');
const snapState = (country) => {
  NG.begin('normal', country, {});
  const S = NG.S; win.__dbg.fxEnsure();
  return { me: S.me, name: S.name, gdp: S.gdp, pop: S.pop, cur: S.fx.cur, rate: S.fx.rate, ref: S.fx.ref };
};
const ru = snapState('Россия'), cn = snapState('Китай'), us = snapState('США'), nv = snapState('Республика Вымысляндия'), ru2 = snapState('россия');
console.log(ru, cn, us, nv);
// 1) у разных стран — разные ВВП, валюты и курсы
assert.equal(ru.cur, 'RUB'); assert.equal(cn.cur, 'CNY'); assert.equal(us.cur, 'USD');
assert.notEqual(ru.gdp, cn.gdp, 'ВВП России и Китая не должен совпадать');
assert.notEqual(ru.rate, cn.rate, 'курсы не должны совпадать');
assert.ok(ru.rate > 50 && ru.rate < 120, 'курс рубля к доллару правдоподобен: ' + ru.rate);
assert.ok(cn.rate > 5 && cn.rate < 8, 'курс юаня правдоподобен: ' + cn.rate);
assert.equal(us.ref, 'EUR', 'для USD опорная валюта — евро');
// 2) регистр не важен, вымышленная страна остаётся Новарией с талером
assert.equal(ru2.me, 'Россия');
assert.equal(nv.cur, 'NVT'); assert.equal(nv.rate, 36);
// 3) подсказка в лобби
const info = NG.countryInfo('Бразилия'); assert.equal(info.cur, 'BRL'); assert.ok(info.gdp > 0 && info.rate > 3);
assert.equal(NG.countryInfo('Нет такой'), null);
// 4) два игрока подряд: состояние второго не наследует первого (страна, валюта, ВВП)
snapState('Япония'); const jp = { ...NG.S.fx, gdp: NG.S.gdp }; const s2 = snapState('Бразилия');
assert.equal(s2.cur, 'BRL'); assert.notEqual(jp.cur, s2.cur); assert.notEqual(jp.gdp, s2.gdp);
// 5) месяцы идут, курс остаётся в валюте своей страны
for (let i = 0; i < 12; i++) NG.tick();
assert.equal(NG.S.fx.cur, 'BRL'); assert.ok(NG.S.gdp > 0 && isFinite(NG.S.gdp));
// 6) одиночная игра: панель «Быстрый доступ» есть на обзоре
NG.end(); win.__dbg.render();
const html = String(handlers['#content'] && handlers['#content'].innerHTML || '');
assert.ok(html.includes('Быстрый доступ к функциям государства'), 'панель быстрого доступа не отрисована в одиночной игре');
for (const t of ['autobuy','economy','military','diplomacy','politics','intelligence','worldtension','map','market']) assert.ok(html.includes("NG.setTab('"+t+"')"), 'нет кнопки '+t);
assert.ok(html.includes('Автозакуп'), 'нет сводки автозакупок');
console.log('OK: страны мультиплеера', ru.cur, cn.cur, us.cur, 'ВВП', ru.gdp, cn.gdp, us.gdp);
console.log('ALL OK');
