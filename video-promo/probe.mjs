/* Быстрая проба: снимает кадры на указанных секундах в PNG для визуального разбора.
   node probe.mjs 0.8 2.6 5.5 ... */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const OUT = path.join(HERE, 'out', 'probe');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(SRC, rel);
  if (!f.startsWith(SRC) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
const port = await new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port)));

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-gpu', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
let err = null;
page.on('pageerror', e => { err = e; console.error('PAGE ERROR:', e.message, e.stack?.split('\n')[1] || ''); });
page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
await page.evaluate(() => window.ready);

const times = process.argv.slice(2).map(Number);
const scale = process.argv.includes('--full') ? 1 : 0.5;
for (const t of times) {
  if (isNaN(t)) continue;
  const b64 = await page.evaluate(([t, s]) => {
    window.renderFrame(t);
    const cv = document.getElementById('cv');
    if (s === 1) return cv.toDataURL('image/png');
    const o = document.createElement('canvas');
    o.width = Math.round(1080 * s); o.height = Math.round(1920 * s);
    const x = o.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(cv, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  }, [t, scale]);
  const f = path.join(OUT, `t${t.toFixed(2)}.png`);
  fs.writeFileSync(f, Buffer.from(b64.slice(b64.indexOf(',') + 1), 'base64'));
  console.log('->', f);
}
await browser.close(); server.close();
if (err) process.exit(1);
