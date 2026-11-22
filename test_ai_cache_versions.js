// Prevent Telegram/WebView from silently loading stale AI code from cache.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('./game.html', 'utf8');
for (const [file, version] of [['ai_arsenal.js', 10], ['ai_nations.js', 40], ['military_map.js', 24]]) {
  assert.ok(html.includes(`/${file}?v=${version}`), `${file} cache version must be ${version}`);
}
console.log('OK: all army-first AI scripts have fresh cache-busting versions');
