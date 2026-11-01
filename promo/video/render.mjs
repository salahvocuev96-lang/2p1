// Usage:
//   node render.mjs stills <outDir> t1 t2 ...        -> PNG stills
//   node render.mjs events <out.json>                -> audio event list
//   node render.mjs video <out.mp4> <f0> <f1> [fps]  -> frames [f0,f1) as H.264 (no audio)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [mode, outArg, ...rest] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--disable-web-security', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + path.join(here, 'index.html'));
await page.evaluate(() => window.ready);

if (mode === 'stills') {
  fs.mkdirSync(outArg, { recursive: true });
  for (const t of rest) {
    await page.evaluate(t => window.render(t, 1), +t);
    await page.locator('#c').screenshot({ path: path.join(outArg, `t${(+t).toFixed(2).padStart(6, '0')}.png`) });
  }
} else if (mode === 'events') {
  fs.writeFileSync(outArg, JSON.stringify(await page.evaluate(() => window.EVENTS), null, 0));
} else if (mode === 'video') {
  const [f0, f1, fpsArg] = rest.map(Number); const fps = fpsArg || 60;
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), outArg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => window.render(t, 3), f / fps);
    const buf = await page.locator('#c').screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 300 === 0) console.log(`[${outArg}] frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close();
