'use strict';
const fs = require('fs');
const vm = require('vm');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/world.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(__dirname + '/regions.js', 'utf8'), ctx);
const world = ctx.window.WORLD;
const seeds = ctx.window.WORLD_SEEDS;
const errors = [];
for (const [country, regions] of Object.entries(seeds)) {
  if (!world.map[country]) errors.push(`Unknown country: ${country}`);
  if (!Array.isArray(regions) || regions.length < 2) errors.push(`Too few regions: ${country}`);
  const names = new Set();
  for (const r of regions) {
    if (!r.n || names.has(r.n)) errors.push(`Missing/duplicate region name: ${country}/${r.n}`);
    names.add(r.n);
    if (!r.meta || !['industry_index','agriculture_index','services_index','infrastructure_index','productivity_index'].every(k => Number.isFinite(r.meta[k]) && r.meta[k] >= 0 && r.meta[k] <= 1.5)) errors.push(`Missing/invalid economy profile: ${country}/${r.n}`);
    if (![r.lon, r.lat, r.p].every(Number.isFinite) || r.lon < -180 || r.lon > 180 || r.lat < -90 || r.lat > 90 || r.p < 0)
      errors.push(`Invalid region coordinates/population: ${country}/${r.n}`);
  }
}
const added = ['Дания','Исландия','Ирландия','Румыния','Чехия','Словакия','Венгрия','Хорватия','Сербия','Болгария','Вьетнам','Филиппины','Малайзия','Бангладеш','Ирак','ОАЭ','Кения','Гана','Танзания','Алжир','Тунис','Эфиопия','Перу','Чили','Эквадор','Боливия','Парагвай','Уругвай','Куба','Новая Зеландия'];
for (const country of added) if (!seeds[country] || seeds[country].length < (country === 'Ирландия' ? 4 : 5)) errors.push(`Expansion missing: ${country}`);
const expanded = ['Нигерия','Египет','Пакистан','Иран','Индонезия','Саудовская Аравия','Южная Африка','Аргентина','Казахстан','Колумбия','Южная Корея'];
for (const country of expanded) if (!seeds[country] || seeds[country].length < 7) errors.push(`Missing expanded regions: ${country}`);
const count = Object.values(seeds).reduce((n, a) => n + a.length, 0);
if (Object.keys(seeds).length < 65) errors.push('Expected at least 65 countries with named regions');
if (count < 1350) errors.push('Expected at least 1200 named regions');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${Object.keys(seeds).length} countries, ${count} named regions; all have valid coordinates, population and regional economy profiles.`);
