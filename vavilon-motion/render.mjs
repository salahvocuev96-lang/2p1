// Экспорт: node render.mjs            → out/vavilon_31s.mp4 (1920×1080, 60 fps, H.264, AAC)
//          node render.mjs stills 3.4 9.1 ...  → out/stills/*.jpg (проверочные кадры)
// Нужны: playwright (Chromium), ffmpeg; перед этим: python3 tools/audio.py ВИДЕО_С_ТРЕКОМ
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
// require() находит и локальный, и глобальный playwright (через NODE_PATH)
const { chromium } = createRequire(import.meta.url)('playwright');
const FPS = 60, DUR = 31, N = FPS * DUR; // 1860 кадров: t = i/60, i = 0..1859
const [mode, ...args] = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
await page.goto('file://' + path.join(dir, 'index.html') + '?render=1');
await page.evaluate(() => window.__ready);
const frame = t => page.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/jpeg', 0.95).slice(23); }, t);

if (mode === 'stills') {
  mkdirSync(path.join(dir, process.env.SD||'out/stills'), { recursive: true });
  for (const a of args) writeFileSync(path.join(dir, `${process.env.SD||'out/stills'}/${(+a).toFixed(2).padStart(5, '0')}.jpg`), Buffer.from(await frame(+a), 'base64'));
} else {
  mkdirSync(path.join(dir, 'out'), { recursive: true });
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(dir, 'audio/mix.wav'), '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '256k', '-t', String(DUR), '-movflags', '+faststart', path.join(dir, 'out/vavilon_31s.mp4')],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const buf = Buffer.from(await frame(i / FPS), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  console.log('done: out/vavilon_31s.mp4');
}
await browser.close();
