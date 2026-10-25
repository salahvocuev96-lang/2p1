/* Замер стоимости кадра в разных местах ролика: node bench.mjs 1 6 11 14 17 21 27 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(SRC, rel);
  if (!f.startsWith(SRC) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
const port = await new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const browser = await chromium.launch({ args: ['--disable-gpu', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => window.ready);

let total = 0;
for (const t of process.argv.slice(2).map(Number)) {
  const i0 = Math.round(t * 30);
  const t0 = Date.now();
  for (let i = i0; i < i0 + 8; i++) {
    const d = await page.evaluate(i => {
      window.renderFrame(i / 30);
      return document.getElementById('cv').toDataURL('image/jpeg', 0.96).length;
    }, i);
  }
  const per = (Date.now() - t0) / 8;
  total += per;
  console.log(`  t=${t}s  ${per.toFixed(0)} мс/кадр`);
}
console.log(`прогноз на 990 кадров: ${(total / process.argv.slice(2).length * 990 / 60000).toFixed(1)} мин`);
await browser.close(); server.close();
