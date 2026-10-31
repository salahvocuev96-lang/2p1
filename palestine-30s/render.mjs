// Рендер: node render.mjs            -> out/gaza-30s.mp4 (1920x1080, 60 fps, H.264, AAC)
//         node render.mjs --stills 1,4,8  -> кадры-пробы в out/stills/
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const FPS = 60, DUR = 30, N = FPS * DUR;
const args = process.argv.slice(2);
const stills = args[0] === '--stills' ? args[1].split(',').map(Number) : null;
const browser = await chromium.launch({ args: ['--disable-web-security', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('PAGE ERROR', e.message));
await page.goto('file://' + path.join(dir, 'index.html') + '?render');
await page.evaluate(() => window.ready);
fs.mkdirSync(path.join(dir, 'out/stills'), { recursive: true });
const grab = async t => Buffer.from((await page.evaluate(t => window.renderFrame(t), t)).split(',')[1], 'base64');
if (stills) {
  for (const t of stills) fs.writeFileSync(path.join(dir, `out/stills/t${t.toFixed(2)}.jpg`), await grab(t));
} else {
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(dir, 'audio/mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-t', String(DUR), '-movflags', '+faststart',
    path.join(dir, 'out/gaza-30s.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const buf = await grab(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
