// Save a dated snapshot of the rank data published in index.html.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const start = html.indexOf('const levels = [');
if (start < 0) throw Error('Cannot find const levels array in index.html');
const begin = html.indexOf('[', start);
const end = html.indexOf('\n];', begin);
if (end < 0) throw Error('Cannot find end of levels array');
const expression = html.slice(begin, end + 2);
const rows = vm.runInNewContext(`(${expression})`, Object.create(null), {timeout: 3000});
if (!Array.isArray(rows) || !rows.length || !rows.every(r => Array.isArray(r) && r.length >= 5 && r.slice(0,5).every(v => typeof v === 'string'))) {
  throw Error('Invalid ranking data');
}
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
}).formatToParts(new Date());
const part = type => parts.find(item => item.type === type).value;
const date = process.env.SNAPSHOT_DATE || `${part('year')}-${part('month')}-${part('day')}`;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2026-10-14') throw Error('Invalid snapshot date');
const dir = path.join(root, 'history');
fs.mkdirSync(dir, {recursive: true});
const file = path.join(dir, `${date}.json`);
// Never silently rewrite historical records. Manual re-run is idempotent.
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({date, rows: rows.map(r => r.slice(0,5))}, null, 2) + '\n');
  console.log(`Saved ${date} (${rows.length} levels)`);
} else {
  console.log(`${date} already exists; historical record preserved`);
}
const dates = fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f => f.slice(0,-5)).sort();
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({format:'KGDR-HISTORY-1',dates}, null, 2) + '\n');
