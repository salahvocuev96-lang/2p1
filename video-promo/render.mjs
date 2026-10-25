/* Детерминированный рендер: кадры из Canvas по времени i/FPS идут напрямую
   в stdin ffmpeg, музыка снимается из OfflineAudioContext в WAV. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.css': 'text/css'
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(SRC, rel);
  if (!f.startsWith(SRC) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const port = await new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port)));
console.log('server :' + port);

const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none',
    '--disable-gpu', '--hide-scrollbars']
});
async function newPage() {
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  pg.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
  pg.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await pg.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  await pg.evaluate(() => window.ready);
  return pg;
}
let page = await newPage();
const V = await page.evaluate(() => window.VIDEO);
console.log('video:', V);

/* ── музыка ── */
if (!process.argv.includes('--no-audio')) {
  console.time('music');
  const b64 = await page.evaluate(() => window.renderMusic());
  fs.writeFileSync(path.join(OUT, 'music.wav'), Buffer.from(b64, 'base64'));
  console.timeEnd('music');
  console.log('music.wav', (fs.statSync(path.join(OUT, 'music.wav')).size / 1048576).toFixed(2), 'MB');
}
if (process.argv.includes('--audio-only')) { await browser.close(); server.close(); process.exit(0); }

/* ── кадры → ffmpeg ── */
const silent = path.join(OUT, 'silent.mp4');
const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(V.FPS), '-i', 'pipe:0',
  '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
  '-pix_fmt', 'yuv420p', '-r', String(V.FPS),
  '-x264-params', 'keyint=60:min-keyint=30', '-movflags', '+faststart', silent]);
ff.stderr.on('data', d => process.stderr.write(d));
const ffDone = new Promise((res, rej) => {
  ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)));
});

const write = buf => new Promise(r => ff.stdin.write(buf) ? r() : ff.stdin.once('drain', r));

console.time('frames');
const only = process.argv.find(a => a.startsWith('--frames='));
const N = only ? Number(only.split('=')[1]) : V.FRAMES;
/* Chromium не переживает тысячу тяжёлых кадров подряд, поэтому страница
   перезапускается чанками. renderFrame(t) детерминирован, продолжение точное. */
const CHUNK = 90;
const grab = i => page.evaluate(i => {
  const V = window.VIDEO;
  window.renderFrame(i / V.FPS);
  return document.getElementById('cv').toDataURL('image/jpeg', 0.96);
}, i);

for (let i = 0; i < N; i++) {
  if (i > 0 && i % CHUNK === 0) {
    await page.close().catch(() => { });
    page = await newPage();
  }
  let d;
  try {
    d = await grab(i);
  } catch (e) {
    console.error(`\n  кадр ${i}: ${e.message.split('\n')[0]} — перезапуск страницы`);
    try { await page.close(); } catch { }
    page = await newPage();
    d = await grab(i);
  }
  await write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
  if (i % 60 === 0) process.stdout.write(`\r  ${i}/${N}  `);
}
ff.stdin.end();
console.log('');
console.timeEnd('frames');
await ffDone;
await browser.close();
server.close();
console.log('ok ->', silent);
