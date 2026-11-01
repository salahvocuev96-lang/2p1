// usage: node render.js frames out_dir t1 t2 ...   |  node render.js video out.mp4 [fps=120] [dur=15]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('console', m => console.log('page:', m.text()));
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.join(__dirname, 'index.html'));
  await p.evaluate(() => window.ready);
  const stage = await p.$('#stage');
  if (mode === 'frames') {
    require('fs').mkdirSync(out, { recursive: true });
    for (const t of rest) {
      await p.evaluate(t => window.render(+t), t);
      await stage.screenshot({ path: `${out}/t${(+t).toFixed(2).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 85 });
    }
  } else {
    const fps = +(rest[0] || 120), dur = +(rest[1] || 15), N = Math.round(fps * dur);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-vf', fps > 60 ? `tmix=frames=${fps / 60}:weights='1 1',fps=60,format=yuv420p` : 'format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-movflags', '+faststart', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < N; f++) {
      await p.evaluate(t => window.render(t), f / fps);
      const buf = await stage.screenshot({ type: 'jpeg', quality: 96 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 120 === 0) console.log(`frame ${f}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
