const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, 'city_sat.js'), 'utf8');
const sandbox = {
  window: {},
  document: { createElement: () => ({ textContent: '' }), head: { appendChild() {} } },
  Math, Number, String, Object, Array, Set, Map, JSON,
};
vm.runInNewContext(source, sandbox, { filename: 'city_sat.js' });
const declutter = sandbox.window.CitySat.declutter;
assert.equal(typeof declutter, 'function');
const cities = [
  { id: 'capital', x: 100, y: 100, rw: 5, name: 'Столица', own: 0, main: true },
  { id: 'nearby', x: 102, y: 101, rw: 3, name: 'Ближний город' },
  { id: 'far', x: 140, y: 100, rw: 3, name: 'Дальний город' },
];
const visible = declutter(cities, 2);
assert.deepEqual(Array.from(visible, x => x.c.id), ['capital', 'far']);
const zoomed = declutter(cities, 8);
assert.equal(zoomed[0].c.id, 'capital');
assert.ok(Array.from(zoomed, x => x.c.id).includes('nearby'), 'nearby cities should appear after zooming in');
assert.ok(zoomed.length <= cities.length);
console.log('OK: city markers are decluttered and larger cities keep priority');
