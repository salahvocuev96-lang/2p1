/* Рекламный ролик «Создаём сайт для вашего бизнеса»
   1080x1920, 30 fps, 33.0 s. Детерминированный таймлайн: renderFrame(t) не зависит
   от истории вызовов, поэтому любой кадр воспроизводим после перемотки. */

const W = 1080, H = 1920, FPS = 30, DUR = 33.0;

/* ───────────────────────── утилиты ───────────────────────── */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

const eOutCubic = t => 1 - Math.pow(1 - t, 3);
const eOutQuint = t => 1 - Math.pow(1 - t, 5);
const eOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const eInExpo = t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10);
const eInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eOutBack = t => { const c = 1.70158, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const eOutElastic = t => t === 0 ? 0 : t === 1 ? 1 :
  Math.pow(2, -9 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;

function prng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ───────────────────────── палитра ───────────────────────── */
const C = {
  bg0: '#05070E', bg1: '#0A1020',
  surf: '#111827', surf2: '#161E33', surf3: '#1C2742',
  line: '#243352',
  blue: '#4F8CFF', violet: '#8B5CF6', cyan: '#22D3EE',
  white: '#FFFFFF', dim: '#8B9BB4', dim2: '#5B6A83'
};
const F = (w, s) => `${w} ${s}px Manrope, "Inter Display", Inter, sans-serif`;

/* ───────────────────────── холсты ───────────────────────── */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha: false });
const sc = document.createElement('canvas'); sc.width = W; sc.height = H;
const sx = sc.getContext('2d', { alpha: false });

const pool = {};
/* Слои, которые не зависят от времени, рисуются один раз и переиспользуются. */
const statics = {};
function staticLayer(key, w, h, draw) {
  let c2 = statics[key];
  if (!c2) {
    c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    draw(c2.getContext('2d'), w, h);
    statics[key] = c2;
  }
  return c2;
}
function off(key, w, h) {
  let o = pool[key];
  if (!o || o.c.width !== w || o.c.height !== h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    o = pool[key] = { c, x: c.getContext('2d') };
  }
  o.x.setTransform(1, 0, 0, 1, 0, 0);
  o.x.clearRect(0, 0, w, h);
  o.x.filter = 'none'; o.x.globalAlpha = 1; o.x.globalCompositeOperation = 'source-over';
  return o;
}

/* ───────────────────────── примитивы ───────────────────────── */
function rr(c, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function fillRR(c, x, y, w, h, r, fill) { rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); }
function strokeRR(c, x, y, w, h, r, col, lw) { rr(c, x, y, w, h, r); c.strokeStyle = col; c.lineWidth = lw || 2; c.stroke(); }

function vgrad(c, x, y, w, h, from, to) {
  const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, from); g.addColorStop(1, to); return g;
}
function dgrad(c, x, y, w, h, from, to) {
  const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, from); g.addColorStop(1, to); return g;
}

/* Абстрактная «фотография» — детерминированная графика-плейсхолдер.
   Результат кешируется: композиция зависит только от seed и размера, а пересчёт
   радиальных градиентов в режиме overlay был самой дорогой операцией рендера. */
const photoCache = new Map();
function drawPhotoInto(c, w, h, seed, r) {
  const R = prng(seed * 7919 + 13);
  const hues = [[C.blue, C.violet], [C.violet, '#F472B6'], [C.cyan, C.blue],
  ['#F59E0B', '#EF4444'], ['#10B981', C.cyan], ['#6366F1', '#22D3EE']];
  const pair = hues[Math.floor(R() * hues.length)];
  c.save();
  rr(c, 0, 0, w, h, r); c.clip();
  c.fillStyle = dgrad(c, 0, 0, w, h, pair[0], pair[1]); c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 3; i++) {
    const cxp = R() * w, cyp = R() * h, rad = (0.25 + R() * 0.5) * Math.max(w, h);
    const g = c.createRadialGradient(cxp, cyp, 0, cxp, cyp, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(5,7,14,0.28)';
  c.beginPath();
  c.moveTo(0, h * (0.55 + R() * 0.2));
  c.lineTo(w, h * (0.35 + R() * 0.25));
  c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
  c.restore();
}
function photo(c, x, y, w, h, seed, r) {
  const rad = r === undefined ? 14 : r;
  const iw = Math.max(2, Math.round(w)), ih = Math.max(2, Math.round(h));
  const key = seed + '|' + iw + '|' + ih + '|' + rad;
  let cv2 = photoCache.get(key);
  if (!cv2) {
    cv2 = document.createElement('canvas'); cv2.width = iw; cv2.height = ih;
    drawPhotoInto(cv2.getContext('2d'), iw, ih, seed, rad);
    photoCache.set(key, cv2);
  }
  c.drawImage(cv2, x, y, w, h);
}

/* текстовые плашки-заглушки внутри макетов */
function bar(c, x, y, w, h, col, r) { fillRR(c, x, y, w, h, r === undefined ? h / 2 : r, col); }

/* ───────────────────────── камера и проекция ───────────────────────── */
const cam = { x: 0, y: 0, z: 0, rot: 0, fov: 1500, focus: 0, dofK: 0 };
function resetCam() { cam.x = 0; cam.y = 0; cam.z = 0; cam.rot = 0; cam.fov = 1500; cam.focus = 0; cam.dofK = 0; }
function pscale(z) { return cam.fov / Math.max(120, cam.fov + z - cam.z); }
function proj(x, y, z) {
  const s = pscale(z);
  let px = (x - cam.x) * s, py = (y - cam.y) * s;
  const co = Math.cos(cam.rot), si = Math.sin(cam.rot);
  return { x: W / 2 + px * co - py * si, y: H / 2 + px * si + py * co, s };
}
function dof(z) { return cam.dofK <= 0 ? 0 : Math.min(26, Math.abs(z - cam.focus) * cam.dofK); }

/* Отрисовка макета с перспективным разворотом вокруг вертикальной оси.
   Источник один раз приводится к экранному размеру и, если нужно, размывается:
   иначе фильтр размытия считался бы заново для каждой вертикальной полосы. */
function blit(c, img, x, y, z, w, h, opt) {
  opt = opt || {};
  const p = proj(x, y, z);
  const s = p.s;
  const dw = w * s, dh = h * s;
  if (dw < 2 || dh < 2) return;
  const yaw = opt.yaw || 0;
  const bl = (opt.blur || 0) + dof(z);

  let src = img;
  if (bl > 0.4 || dw < img.width * 0.75) {
    const tw = Math.max(8, Math.min(img.width, Math.ceil(dw)));
    const th = Math.max(8, Math.min(img.height, Math.ceil(dh)));
    const o = off('blitsrc', tw, th);
    if (bl > 0.4) o.x.filter = `blur(${bl.toFixed(2)}px)`;
    o.x.drawImage(img, 0, 0, tw, th);
    src = o.c;
  }

  c.save();
  c.globalAlpha = opt.alpha === undefined ? 1 : opt.alpha;
  c.translate(p.x, p.y);
  c.rotate(cam.rot + (opt.roll || 0));
  if (opt.shadow) {
    c.save(); c.filter = `blur(${Math.max(6, 28 * s)}px)`;
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(-dw / 2, -dh / 2 + 26 * s, dw, dh); c.restore();
  }
  if (Math.abs(yaw) < 0.02) {
    c.drawImage(src, -dw / 2, -dh / 2, dw, dh);
  } else {
    /* полос ровно столько, сколько нужно для гладкой перспективы при этом угле */
    const N = Math.max(8, Math.min(40, Math.round(Math.abs(yaw) * 66)));
    const D = 2200 * s;
    const sy2 = Math.sin(yaw), cy2 = Math.cos(yaw);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N - 0.5;
      const lz = u * dw * sy2, lx = u * dw * cy2;
      const ss = D / Math.max(60, D + lz);
      pts.push({ x: lx * ss, s: ss });
    }
    const sw2 = src.width / N;
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1];
      if (b.x - a.x <= 0) continue;
      const ms = (a.s + b.s) / 2;
      c.drawImage(src, i * sw2, 0, sw2 + 0.8, src.height,
        a.x, -dh * ms / 2, (b.x - a.x) + 0.9, dh * ms);
    }
  }
  c.restore();
}

/* свечение под объектом */
function glow(c, x, y, z, w, h, col, a) {
  const p = proj(x, y, z), s = p.s;
  c.save(); c.globalAlpha = a; c.filter = `blur(${70 * s}px)`;
  c.fillStyle = col;
  c.beginPath(); c.ellipse(p.x, p.y, w * s / 2, h * s / 2, 0, 0, 6.2832); c.fill();
  c.restore();
}
/* свечение в экранных координатах */
function screenGlow(c, x, y, w, h, col, a) {
  if (a <= 0.002) return;
  c.save(); c.globalAlpha = a; c.filter = 'blur(64px)';
  c.fillStyle = col;
  c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, 6.2832); c.fill();
  c.restore();
}

/* ── кадрирование под 9:16 ──
   Макеты сверстаны в альбомных пропорциях, поэтому в вертикальном кадре их
   положение задаётся явно: ширина в пикселях экрана и экранная высота центра.
   Безопасные полосы: верхняя для заголовка, нижняя для подписей. */
const TITLE_Y = 470, BOTTOM_Y = 1600;
function frameTo(wPx, logicalW, yPx, xShift) {
  const s = wPx / logicalW;
  cam.z = cam.fov - cam.fov / s;
  cam.y = (H / 2 - yPx) / s;
  cam.x = xShift || 0;
}
/* маленькая плашка-рубрика в верхней полосе */
function topChip(c, text, a, col, y) {
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = Math.min(1, a * 1.6);
  const e = eOutQuint(Math.min(1, a));
  c.translate(0, (1 - e) * -26);
  c.font = F(700, 27); c.textAlign = 'center'; c.textBaseline = 'middle';
  const tw = c.measureText(text).width, bw = tw + 72, bh = 60;
  const yy = y === undefined ? 430 : y;
  fillRR(c, W / 2 - bw / 2, yy - bh / 2, bw, bh, bh / 2, 'rgba(10,18,36,0.72)');
  strokeRR(c, W / 2 - bw / 2, yy - bh / 2, bw, bh, bh / 2, col, 1.8);
  c.fillStyle = col;
  c.beginPath(); c.arc(W / 2 - bw / 2 + 28, yy, 6, 0, 6.2832); c.fill();
  c.fillStyle = '#DCE7F8'; c.fillText(text, W / 2 + 14, yy + 1);
  c.textAlign = 'left'; c.restore();
}

/* ───────────────────────── фон ───────────────────────── */
const stars = (() => {
  const R = prng(20251025), a = [];
  for (let i = 0; i < 170; i++) a.push({
    x: (R() - .5) * 3000, y: (R() - .5) * 4200, z: -200 - R() * 1800,
    r: 1 + R() * 2.6, ph: R() * 6.283, sp: .6 + R() * 1.6
  });
  return a;
})();

function drawBG(c, t, mood) {
  c.fillStyle = C.bg0; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W * .5, H * .42, 0, W * .5, H * .42, H * .75);
  g.addColorStop(0, '#0B1428'); g.addColorStop(.55, '#070C18'); g.addColorStop(1, C.bg0);
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  /* ауроры — малое разрешение + blur, дёшево и мягко */
  const o = off('aur', 216, 384), ax = o.x;
  const blobs = [
    { x: .26 + .1 * Math.sin(t * .35), y: .24 + .06 * Math.cos(t * .27), r: .40, col: C.blue, a: .55 },
    { x: .80 + .08 * Math.cos(t * .31), y: .40 + .07 * Math.sin(t * .23), r: .34, col: C.violet, a: .45 },
    { x: .45 + .12 * Math.sin(t * .19 + 2), y: .80 + .05 * Math.cos(t * .33), r: .38, col: C.cyan, a: .26 }
  ];
  for (const b of blobs) {
    const gg = ax.createRadialGradient(b.x * 216, b.y * 384, 0, b.x * 216, b.y * 384, b.r * 384);
    gg.addColorStop(0, b.col); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ax.globalAlpha = b.a * mood; ax.fillStyle = gg; ax.fillRect(0, 0, 216, 384);
  }
  c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = .50;
  c.filter = 'blur(26px)';
  c.drawImage(o.c, 0, 0, W, H); c.restore();

  /* перспективная сетка-пол */
  c.save();
  c.globalAlpha = .30 * mood;
  c.strokeStyle = 'rgba(79,140,255,0.55)'; c.lineWidth = 1.4;
  const horizon = H * 0.60;
  for (let i = 0; i < 22; i++) {
    const k = ((i + (t * 0.22) % 1) / 22);
    const yy = horizon + Math.pow(k, 2.3) * (H * 0.78);
    if (yy > H + 10) continue;
    c.globalAlpha = .26 * mood * Math.pow(k, .8);
    c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke();
  }
  c.globalAlpha = .16 * mood;
  for (let i = -9; i <= 9; i++) {
    c.beginPath(); c.moveTo(W / 2 + i * 26, horizon); c.lineTo(W / 2 + i * 420, H + 60); c.stroke();
  }
  c.restore();

  /* звёздная пыль с параллаксом и DOF */
  c.save();
  for (const s of stars) {
    const p = proj(s.x, s.y, s.z);
    if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) continue;
    const tw = .35 + .65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
    const b = dof(s.z);
    c.globalAlpha = .50 * tw * mood;
    if (b > 0.5) { c.filter = `blur(${Math.min(6, b / 3).toFixed(1)}px)`; } else c.filter = 'none';
    c.fillStyle = '#9FC2FF';
    c.beginPath(); c.arc(p.x, p.y, s.r * p.s, 0, 6.2832); c.fill();
  }
  c.restore();
}

/* ───────────────────────── кинетический текст ───────────────────────── */
/* words: массив строк-слов. Возвращает высоту блока. */
function kinetic(c, lines, opt) {
  const { cx, cy, weight = 800, color = C.white, p, stagger = 0.11,
    mode = 'wipe', align = 'center', lh = 1.08, letter = 0, accentIdx = -1,
    accentColor = C.blue, shadow = true, maxW = W - 140 } = opt;
  c.save();
  /* защита от выхода за безопасные поля: кегль ужимается под самую длинную строку */
  let size = opt.size;
  c.font = F(weight, size);
  let widest = 0;
  for (const ln of lines) widest = Math.max(widest, c.measureText(ln).width + letter * (ln.length - 1));
  if (widest > maxW) size = Math.floor(size * maxW / widest);
  c.font = F(weight, size);
  c.textBaseline = 'alphabetic';
  const lineH = size * lh;
  const total = lines.length;
  let yTop = cy - (total * lineH) / 2 + size * 0.36;
  let idx = 0, count = 0;
  for (const ln of lines) count += ln.split(' ').length;
  let gi = 0;
  for (let li = 0; li < total; li++) {
    const words = lines[li].split(' ');
    const widths = words.map(w => c.measureText(w).width + letter * (w.length - 1));
    const spaceW = c.measureText(' ').width + size * 0.06;
    const totW = widths.reduce((a, b) => a + b, 0) + spaceW * (words.length - 1);
    let x = align === 'center' ? cx - totW / 2 : (align === 'left' ? cx : cx - totW);
    const y = yTop + li * lineH;
    for (let wi = 0; wi < words.length; wi++) {
      const wp = clamp((p - gi * stagger) / 0.46, 0, 1);
      gi++;
      if (wp <= 0) { x += widths[wi] + spaceW; continue; }
      const ww = widths[wi];
      c.save();
      const isAcc = gi - 1 === accentIdx;
      const col = isAcc ? accentColor : color;
      if (mode === 'wipe') {
        const e = eOutQuint(wp);
        c.beginPath(); c.rect(x - 6, y - size, 12 + ww * e, size * 1.5); c.clip();
        c.globalAlpha = Math.min(1, wp * 2.2);
        c.translate(0, (1 - e) * size * 0.16);
      } else if (mode === 'rise') {
        const e = eOutQuint(wp);
        c.beginPath(); c.rect(x - 10, y - size * 1.05, ww + 20, size * 1.45); c.clip();
        c.globalAlpha = Math.min(1, wp * 2.6);
        c.translate(0, (1 - e) * size * 0.95);
      } else if (mode === 'scale') {
        const e = eOutBack(wp);
        c.globalAlpha = Math.min(1, wp * 2.4);
        c.translate(x + ww / 2, y - size * 0.34);
        c.scale(lerp(0.62, 1, e), lerp(0.62, 1, e));
        c.translate(-(x + ww / 2), -(y - size * 0.34));
        if (wp < 1) c.filter = `blur(${(1 - wp) * 7}px)`;
      } else if (mode === 'blurin') {
        const e = eOutExpo(wp);
        c.globalAlpha = Math.min(1, wp * 2);
        c.translate((1 - e) * size * 0.5, 0);
        if (wp < 1) c.filter = `blur(${(1 - e) * 16}px)`;
      }
      if (shadow) { c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 26; c.shadowOffsetY = 6; }
      c.fillStyle = col;
      if (letter) {
        let lx = x;
        for (const ch of words[wi]) { c.fillText(ch, lx, y); lx += c.measureText(ch).width + letter; }
      } else c.fillText(words[wi], x, y);
      /* световой кант на входе слова */
      if (wp > 0.02 && wp < 0.9 && mode === 'wipe') {
        const e = eOutQuint(wp);
        c.shadowBlur = 0;
        const gx = x + ww * e;
        const lg = c.createLinearGradient(gx - 60, 0, gx + 6, 0);
        lg.addColorStop(0, 'rgba(79,140,255,0)'); lg.addColorStop(1, 'rgba(160,200,255,0.85)');
        c.fillStyle = lg; c.fillRect(gx - 60, y - size * 0.92, 66, size * 1.18);
      }
      c.restore();
      x += ww + spaceW;
    }
  }
  c.restore();
  return total * lineH;
}

/* ───────────────────────── макеты интерфейсов ───────────────────────── */
const BW = 1240, BH = 800;   // логический размер окна браузера
const PW = 420, PH = 860;    // логический размер телефона

function chrome(c, w, url, wire) {
  fillRR(c, 0, 0, w, 62, 0, wire ? '#1A2134' : '#0C1222');
  c.fillStyle = wire ? '#2A3550' : '#17203A'; c.fillRect(0, 60, w, 2);
  const dots = ['#FF5F57', '#FEBC2E', '#28C840'];
  for (let i = 0; i < 3; i++) {
    c.beginPath(); c.arc(34 + i * 30, 31, 8.5, 0, 6.2832);
    c.fillStyle = wire ? '#3A465F' : dots[i]; c.fill();
  }
  fillRR(c, 140, 15, w - 230, 32, 16, wire ? '#222C44' : '#141C31');
  if (url && !wire) {
    c.font = F(500, 18); c.fillStyle = C.dim; c.textBaseline = 'middle';
    c.fillText('🔒', 156, 32);
    c.fillStyle = '#B7C6DD'; c.fillText(url, 182, 32);
  }
}

/* Страница интернет-магазина. st: {scroll, reveal, hover, wire, cart} */
function pageShop(c, w, h, st) {
  const sc0 = st.scroll || 0, rev = st.reveal === undefined ? 1 : st.reveal, wire = st.wire;
  const A = wire ? '#2C3A58' : C.blue, S = wire ? '#1A2335' : C.surf2;
  c.save(); c.beginPath(); c.rect(0, 62, w, h - 62); c.clip();
  c.fillStyle = wire ? '#10151F' : '#0A101E'; c.fillRect(0, 62, w, h - 62);
  c.translate(0, 62 - sc0);

  const blk = (i) => clamp((rev - i * 0.085) / 0.3, 0, 1);

  /* шапка сайта */
  let a = blk(0); if (a > 0) {
    c.save(); c.globalAlpha = a; c.translate(0, (1 - eOutQuint(a)) * -40);
    c.fillStyle = wire ? '#141B29' : '#0D1424'; c.fillRect(0, 0, w, 76);
    c.fillStyle = wire ? '#223050' : '#17213A'; c.fillRect(0, 75, w, 1.5);
    if (wire) { bar(c, 48, 28, 130, 20, '#2E3A54', 5); }
    else {
      c.font = F(800, 26); c.fillStyle = C.white; c.textBaseline = 'middle';
      c.fillText('МАГАЗИН', 48, 39);
      c.fillStyle = A; c.beginPath(); c.arc(190, 32, 4, 0, 6.2832); c.fill();
    }
    const nav = ['Каталог', 'О компании', 'Доставка', 'Контакты'];
    let nx = 330;
    for (let i = 0; i < nav.length; i++) {
      if (wire) { bar(c, nx, 32, 92, 12, '#283552', 4); nx += 112; }
      else {
        c.font = F(600, 19); c.fillStyle = i === 0 ? C.white : C.dim;
        c.fillText(nav[i], nx, 39); nx += c.measureText(nav[i]).width + 38;
      }
    }
    /* корзина */
    const cartN = st.cart || 0;
    fillRR(c, w - 150, 20, 100, 38, 19, wire ? '#26314A' : 'rgba(79,140,255,0.16)');
    if (!wire) {
      c.font = F(700, 17); c.fillStyle = C.blue; c.textBaseline = 'middle';
      c.fillText('Корзина', w - 136, 39);
      if (cartN > 0) {
        c.beginPath(); c.arc(w - 58, 26, 11, 0, 6.2832); c.fillStyle = '#F43F5E'; c.fill();
        c.font = F(800, 13); c.fillStyle = '#fff'; c.textAlign = 'center';
        c.fillText(String(cartN), w - 58, 27); c.textAlign = 'left';
      }
    }
    c.restore();
  }

  /* hero */
  a = blk(1); if (a > 0) {
    c.save(); c.globalAlpha = a;
    const e = eOutQuint(a);
    c.translate(0, (1 - e) * 60);
    const hy = 76, hh = 300;
    if (wire) {
      fillRR(c, 48, hy + 24, w - 96, hh - 24, 18, '#161E2E');
      strokeRR(c, 48, hy + 24, w - 96, hh - 24, 18, '#2B3A58', 2);
      bar(c, 90, hy + 92, 420, 30, '#2E3A54', 6);
      bar(c, 90, hy + 138, 320, 30, '#2E3A54', 6);
      bar(c, 90, hy + 196, 190, 44, '#33436A', 10);
    } else {
      c.save();
      rr(c, 48, hy + 24, w - 96, hh - 24, 20); c.clip();
      photo(c, 48, hy + 24, w - 96, hh - 24, 3, 20);
      c.fillStyle = 'rgba(5,8,18,0.58)'; c.fillRect(48, hy + 24, w - 96, hh - 24);
      c.restore();
      strokeRR(c, 48, hy + 24, w - 96, hh - 24, 20, 'rgba(255,255,255,0.10)', 1.5);
      c.font = F(800, 52); c.fillStyle = C.white; c.textBaseline = 'alphabetic';
      c.fillText('Новая коллекция', 90, hy + 150);
      c.font = F(500, 23); c.fillStyle = '#C3D2E8';
      c.fillText('Доставим за один день по всему городу', 90, hy + 192);
      fillRR(c, 90, hy + 218, 200, 52, 26, A);
      c.font = F(700, 20); c.fillStyle = '#071024'; c.textAlign = 'center';
      c.fillText('В каталог', 190, hy + 251); c.textAlign = 'left';
    }
    c.restore();
  }

  /* заголовок секции */
  a = blk(2); if (a > 0) {
    c.save(); c.globalAlpha = a;
    if (wire) bar(c, 48, 424, 250, 26, '#2E3A54', 6);
    else {
      c.font = F(800, 34); c.fillStyle = C.white; c.fillText('Популярное', 48, 448);
      c.font = F(600, 19); c.fillStyle = A; c.fillText('Смотреть все →', w - 210, 446);
    }
    c.restore();
  }

  /* сетка карточек */
  const cols = 4, gap = 24, pad = 48;
  const cw = (w - pad * 2 - gap * (cols - 1)) / cols, ch = 310;
  const names = ['Куртка', 'Кроссовки', 'Сумка', 'Часы', 'Рюкзак', 'Очки', 'Шарф', 'Кепка'];
  const prices = ['6 900 ₽', '8 400 ₽', '4 200 ₽', '12 900 ₽', '5 600 ₽', '3 300 ₽', '2 100 ₽', '1 900 ₽'];
  for (let i = 0; i < 8; i++) {
    const col = i % cols, row = (i / cols) | 0;
    const aa = clamp((rev - 0.26 - i * 0.035) / 0.26, 0, 1);
    if (aa <= 0) continue;
    const x = pad + col * (cw + gap), y = 486 + row * (ch + gap);
    const e = eOutQuint(aa);
    c.save(); c.globalAlpha = aa;
    c.translate(x + cw / 2, y + ch / 2);
    c.scale(lerp(.9, 1, e), lerp(.9, 1, e));
    c.translate(-(x + cw / 2), -(y + ch / 2));
    c.translate(0, (1 - e) * 46);
    const hov = st.hover === i;
    if (hov) { c.shadowColor = 'rgba(79,140,255,0.55)'; c.shadowBlur = 34; }
    fillRR(c, x, y, cw, ch, 18, wire ? '#161E2E' : S);
    c.shadowBlur = 0;
    strokeRR(c, x, y, cw, ch, 18, hov ? A : (wire ? '#2B3A58' : C.line), hov ? 2.2 : 1.4);
    if (wire) {
      fillRR(c, x + 14, y + 14, cw - 28, 170, 12, '#1D2738');
      c.strokeStyle = '#2B3A58'; c.lineWidth = 1.6; c.setLineDash([7, 6]);
      c.beginPath(); c.moveTo(x + 14, y + 14); c.lineTo(x + cw - 14, y + 184);
      c.moveTo(x + cw - 14, y + 14); c.lineTo(x + 14, y + 184); c.stroke(); c.setLineDash([]);
      bar(c, x + 16, y + 202, cw - 70, 16, '#2E3A54', 5);
      bar(c, x + 16, y + 230, 80, 20, '#33436A', 5);
      bar(c, x + 16, y + 266, cw - 32, 30, '#283552', 8);
    } else {
      photo(c, x + 14, y + 14, cw - 28, 170, i + 1, 12);
      c.font = F(600, 19); c.fillStyle = '#D7E2F2'; c.textBaseline = 'alphabetic';
      c.fillText(names[i], x + 16, y + 216);
      c.font = F(800, 24); c.fillStyle = C.white; c.fillText(prices[i], x + 16, y + 250);
      fillRR(c, x + 16, y + 266, cw - 32, 32, 9, hov ? A : 'rgba(79,140,255,0.14)');
      c.font = F(700, 15); c.fillStyle = hov ? '#071024' : C.blue; c.textAlign = 'center';
      c.fillText('В корзину', x + cw / 2, y + 287); c.textAlign = 'left';
    }
    c.restore();
  }

  /* блок «о компании» */
  const ab = clamp((rev - 0.6) / 0.3, 0, 1);
  if (ab > 0) {
    const y = 486 + 2 * (ch + gap);
    c.save(); c.globalAlpha = ab; c.translate(0, (1 - eOutQuint(ab)) * 50);
    fillRR(c, pad, y, w - pad * 2, 230, 20, wire ? '#161E2E' : '#0E1627');
    strokeRR(c, pad, y, w - pad * 2, 230, 20, wire ? '#2B3A58' : C.line, 1.4);
    if (!wire) {
      photo(c, pad + 22, y + 22, 300, 186, 9, 14);
      c.font = F(800, 30); c.fillStyle = C.white; c.fillText('О компании', pad + 350, y + 62);
      c.font = F(400, 20); c.fillStyle = C.dim;
      const txt = ['Работаем с 2015 года и знаем,', 'что нужно вашим покупателям.', 'Своя доставка и пункт выдачи.'];
      txt.forEach((s, i) => c.fillText(s, pad + 350, y + 104 + i * 32));
      const stats = [['12 лет', 'на рынке'], ['4 800', 'заказов'], ['4.9', 'рейтинг']];
      stats.forEach((s, i) => {
        const bx = pad + 350 + i * 185;
        c.font = F(800, 26); c.fillStyle = A; c.fillText(s[0], bx, y + 200);
        c.font = F(500, 15); c.fillStyle = C.dim2; c.fillText(s[1], bx + 78, y + 200);
      });
    } else {
      fillRR(c, pad + 22, y + 22, 300, 186, 14, '#1D2738');
      bar(c, pad + 350, y + 40, 260, 24, '#2E3A54', 6);
      [0, 1, 2].forEach(i => bar(c, pad + 350, y + 88 + i * 30, 420 - i * 60, 14, '#283552', 4));
    }
    c.restore();
  }
  c.restore();
}

/* Меню кафе. st: {reveal, hover, cart, scroll} */
function pageCafe(c, w, h, st) {
  const rev = st.reveal === undefined ? 1 : st.reveal;
  c.save(); c.beginPath(); c.rect(0, 62, w, h - 62); c.clip();
  c.fillStyle = '#0B0F18'; c.fillRect(0, 62, w, h - 62);
  c.translate(0, 62 - (st.scroll || 0));

  /* шапка кафе */
  c.save();
  const hh = 150;
  rr(c, 0, 0, w, hh, 0); c.clip();
  photo(c, 0, -40, w, hh + 60, 21, 0);
  c.fillStyle = 'rgba(6,9,16,0.66)'; c.fillRect(0, 0, w, hh);
  c.restore();
  c.font = F(800, 40); c.fillStyle = C.white; c.textBaseline = 'alphabetic';
  c.fillText('КАФЕ «ЗЕРНО»', 48, 78);
  c.font = F(500, 20); c.fillStyle = '#B9C8DE';
  c.fillText('Завтраки с 8:00 · Доставка 30 минут', 48, 112);
  fillRR(c, w - 190, 52, 140, 44, 22, C.blue);
  c.font = F(700, 19); c.fillStyle = '#071024'; c.textAlign = 'center';
  c.fillText('Заказать', w - 120, 80); c.textAlign = 'left';

  /* вкладки категорий */
  const tabs = ['Завтраки', 'Горячее', 'Десерты', 'Напитки'];
  let tx = 48;
  for (let i = 0; i < tabs.length; i++) {
    const act = i === 0;
    c.font = F(700, 19);
    const tw = c.measureText(tabs[i]).width + 36;
    fillRR(c, tx, 178, tw, 44, 22, act ? 'rgba(79,140,255,0.18)' : '#141C2E');
    if (act) strokeRR(c, tx, 178, tw, 44, 22, C.blue, 1.6);
    c.fillStyle = act ? C.blue : C.dim; c.textAlign = 'center';
    c.fillText(tabs[i], tx + tw / 2, 206); c.textAlign = 'left';
    tx += tw + 14;
  }

  /* строки меню с фото и ценами */
  const items = [
    ['Сырники со сметаной', 'Домашний творог, ягодный соус', '390 ₽', 31],
    ['Паста карбонара', 'Бекон, пармезан, желток', '490 ₽', 32],
    ['Салат «Цезарь»', 'Курица, пармезан, соус', '420 ₽', 33],
    ['Чизкейк Нью-Йорк', 'Классический, с карамелью', '320 ₽', 34],
    ['Капучино', '250 мл, зерно своей обжарки', '180 ₽', 35]
  ];
  for (let i = 0; i < items.length; i++) {
    const aa = clamp((rev - 0.12 - i * 0.1) / 0.3, 0, 1);
    if (aa <= 0) continue;
    const y = 254 + i * 108;
    const e = eOutQuint(aa);
    const hov = st.hover === i;
    c.save(); c.globalAlpha = aa;
    c.translate((1 - e) * 70, 0);
    if (hov) { c.shadowColor = 'rgba(79,140,255,0.5)'; c.shadowBlur = 30; }
    fillRR(c, 48, y, w - 96, 94, 16, hov ? '#17223A' : '#121A2B');
    c.shadowBlur = 0;
    strokeRR(c, 48, y, w - 96, 94, 16, hov ? C.blue : C.line, hov ? 2 : 1.3);
    photo(c, 62, y + 11, 104, 72, items[i][3], 11);
    c.font = F(700, 24); c.fillStyle = C.white; c.textBaseline = 'alphabetic';
    c.fillText(items[i][0], 186, y + 44);
    c.font = F(400, 17); c.fillStyle = C.dim2;
    c.fillText(items[i][1], 186, y + 72);
    c.font = F(800, 27); c.fillStyle = hov ? C.blue : C.white; c.textAlign = 'right';
    c.fillText(items[i][2], w - 180, y + 58); c.textAlign = 'left';
    fillRR(c, w - 158, y + 27, 94, 40, 20, hov ? C.blue : 'rgba(79,140,255,0.14)');
    c.font = F(700, 17); c.fillStyle = hov ? '#071024' : C.blue; c.textAlign = 'center';
    c.fillText('+ Добавить', w - 111, y + 48); c.textAlign = 'left';
    c.restore();
  }
  c.restore();
}

/* мобильная версия — одна колонка */
function pageMobile(c, w, h, st) {
  const rev = st.reveal === undefined ? 1 : st.reveal;
  c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
  c.fillStyle = '#0A101E'; c.fillRect(0, 0, w, h);
  c.translate(0, -(st.scroll || 0));
  /* статус-бар */
  c.font = F(700, 15); c.fillStyle = '#C9D7EC'; c.textBaseline = 'middle';
  c.fillText('9:41', 26, 26);
  for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(201,215,236,' + (i < 3 ? 1 : .35) + ')'; c.fillRect(w - 96 + i * 8, 20 + (3 - i) * 2, 5, 12 - (3 - i) * 2); }
  fillRR(c, w - 52, 19, 28, 14, 4, 'rgba(201,215,236,0.9)');
  /* шапка */
  c.fillStyle = '#0D1424'; c.fillRect(0, 48, w, 58);
  c.font = F(800, 21); c.fillStyle = C.white; c.fillText('МАГАЗИН', 22, 78);
  for (let i = 0; i < 3; i++) { fillRR(c, w - 48, 68 + i * 7, 24, 3, 2, '#9FB4D4'); }
  /* hero */
  let a = clamp(rev / .3, 0, 1);
  c.save(); c.globalAlpha = a; c.translate(0, (1 - eOutQuint(a)) * 30);
  c.save(); rr(c, 18, 120, w - 36, 180, 16); c.clip();
  photo(c, 18, 120, w - 36, 180, 3, 16);
  c.fillStyle = 'rgba(5,8,18,0.55)'; c.fillRect(18, 120, w - 36, 180); c.restore();
  c.font = F(800, 30); c.fillStyle = C.white; c.textBaseline = 'alphabetic';
  c.fillText('Новая', 40, 212); c.fillText('коллекция', 40, 248);
  fillRR(c, 40, 262, 132, 36, 18, C.blue);
  c.font = F(700, 15); c.fillStyle = '#071024'; c.textAlign = 'center';
  c.fillText('В каталог', 106, 285); c.textAlign = 'left';
  c.restore();
  /* одна колонка карточек */
  c.font = F(800, 24); c.fillStyle = C.white;
  if (rev > .3) { c.globalAlpha = clamp((rev - .3) / .2, 0, 1); c.fillText('Популярное', 22, 348); c.globalAlpha = 1; }
  const names = ['Куртка', 'Кроссовки', 'Сумка', 'Часы'];
  const prices = ['6 900 ₽', '8 400 ₽', '4 200 ₽', '12 900 ₽'];
  for (let i = 0; i < 4; i++) {
    const aa = clamp((rev - .36 - i * .09) / .26, 0, 1); if (aa <= 0) continue;
    const y = 372 + i * 128, e = eOutQuint(aa);
    c.save(); c.globalAlpha = aa; c.translate(0, (1 - e) * 40);
    fillRR(c, 18, y, w - 36, 112, 16, C.surf2);
    strokeRR(c, 18, y, w - 36, 112, 16, C.line, 1.3);
    photo(c, 30, y + 12, 88, 88, i + 1, 11);
    c.font = F(600, 18); c.fillStyle = '#D7E2F2'; c.fillText(names[i], 134, y + 44);
    c.font = F(800, 22); c.fillStyle = C.white; c.fillText(prices[i], 134, y + 76);
    fillRR(c, w - 128, y + 36, 98, 38, 19, 'rgba(79,140,255,0.16)');
    c.font = F(700, 15); c.fillStyle = C.blue; c.textAlign = 'center';
    c.fillText('В корзину', w - 79, y + 58); c.textAlign = 'left';
    c.restore();
  }
  /* нижняя панель */
  c.fillStyle = 'rgba(9,14,26,0.96)'; c.fillRect(0, h - 76, w, 76);
  c.fillStyle = '#18213A'; c.fillRect(0, h - 76, w, 1.4);
  const ic = ['Главная', 'Каталог', 'Корзина', 'Профиль'];
  for (let i = 0; i < 4; i++) {
    const bx = (w / 4) * i + w / 8;
    c.fillStyle = i === 1 ? C.blue : '#44546F';
    fillRR(c, bx - 11, h - 58, 22, 22, 6, i === 1 ? C.blue : '#44546F');
    c.font = F(600, 11); c.textAlign = 'center';
    c.fillStyle = i === 1 ? C.blue : '#55657F';
    c.fillText(ic[i], bx, h - 24); c.textAlign = 'left';
  }
  fillRR(c, w / 2 - 60, h - 12, 120, 4, 2, '#3A4868');
  c.restore();
}

/* корпус телефона вокруг экрана */
function phoneFrame(c, w, h, drawScreen) {
  c.clearRect(0, 0, w, h);
  fillRR(c, 0, 0, w, h, 54, '#0B0F19');
  strokeRR(c, 2, 2, w - 4, h - 4, 52, '#2A3752', 3.5);
  strokeRR(c, 7, 7, w - 14, h - 14, 48, 'rgba(120,160,230,0.22)', 1.5);
  c.save();
  rr(c, 14, 14, w - 28, h - 28, 42); c.clip();
  const o = off('phs', w - 28, h - 28);
  drawScreen(o.x, w - 28, h - 28);
  c.drawImage(o.c, 14, 14);
  c.restore();
  /* вырез камеры */
  fillRR(c, w / 2 - 44, 20, 88, 24, 12, '#05070E');
}

/* окно браузера целиком */
function browserFrame(c, w, h, url, wire, drawPage) {
  c.clearRect(0, 0, w, h);
  fillRR(c, 0, 0, w, h, 20, wire ? '#121824' : '#090E1A');
  c.save(); rr(c, 0, 0, w, h, 20); c.clip();
  chrome(c, w, url, wire);
  const o = off('pg_' + w + '_' + h, w, h);
  drawPage(o.x, w, h);
  c.drawImage(o.c, 0, 0);
  c.restore();
  strokeRR(c, 1, 1, w - 2, h - 2, 20, wire ? '#2B3A58' : 'rgba(120,160,230,0.26)', 2);
}

/* ───────────────────────── курсор ───────────────────────── */
function cursor(c, x, y, z, press) {
  const p = proj(x, y, z), s = p.s * (press ? .88 : 1);
  c.save(); c.translate(p.x, p.y); c.scale(s, s);
  c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 14; c.shadowOffsetY = 4;
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(0, 30); c.lineTo(7.5, 23); c.lineTo(12.5, 33.5);
  c.lineTo(18, 31); c.lineTo(13, 20.5); c.lineTo(22, 20); c.closePath();
  c.fillStyle = '#fff'; c.fill();
  c.lineWidth = 2.2; c.strokeStyle = '#0B1220'; c.shadowBlur = 0; c.stroke();
  if (press) {
    c.globalAlpha = .5; c.strokeStyle = C.blue; c.lineWidth = 3;
    c.beginPath(); c.arc(4, 4, 26, 0, 6.2832); c.stroke();
  }
  c.restore();
}

/* ───────────────────────── сцены ───────────────────────── */
const T1 = 4.2, T2 = 10.4, T3A = 13.0, T3B = 15.7, T3 = 18.4, T4 = 25.0;

/* Сцена 1 — пустой каркас браузера + вопрос */
function scene1(c, t) {
  const p = inv(t, 0, T1);
  const ce = eOutCubic(clamp(p / .9, 0, 1));
  frameTo(lerp(880, 1000, ce), BW, lerp(1215, 1150, ce), lerp(-28, 24, ce));
  cam.rot = lerp(-0.045, 0.004, eInOut(clamp(p / .9, 0, 1)));
  cam.focus = 0; cam.dofK = 0.011;
  drawBG(c, t, lerp(.25, .9, clamp(p * 2.2, 0, 1)));

  /* прочерчивающийся каркас окна */
  const dp = inv(t, 0.15, 1.45);
  const o = off('s1w', BW, BH), x = o.x;
  x.clearRect(0, 0, BW, BH);
  const e = eOutQuint(dp);
  x.save();
  x.strokeStyle = 'rgba(79,140,255,0.85)'; x.lineWidth = 3;
  x.shadowColor = C.blue; x.shadowBlur = 18;
  const per = 2 * (BW + BH);
  x.setLineDash([per * e, per]);
  rr(x, 2, 2, BW - 4, BH - 4, 20); x.stroke();
  x.restore();
  if (dp > .55) {
    const f = inv(t, 0.9, 1.7);
    x.globalAlpha = f;
    fillRR(x, 2, 2, BW - 4, BH - 4, 20, 'rgba(9,14,26,0.92)');
    x.globalAlpha = 1;
    x.save(); rr(x, 0, 0, BW, BH, 20); x.clip();
    x.globalAlpha = f; chrome(x, BW, null, false); x.globalAlpha = 1;
    /* набор адреса */
    const url = 'вашбизнес.ру';
    const tp = inv(t, 1.45, 2.75);
    const n = Math.floor(tp * url.length);
    x.font = F(500, 20); x.textBaseline = 'middle';
    x.fillStyle = '#B7C6DD'; x.fillText(url.slice(0, n), 170, 31);
    const cw2 = x.measureText(url.slice(0, n)).width;
    if (t < 3.0 && Math.floor(t * 2.6) % 2 === 0) {
      x.fillStyle = C.blue; x.fillRect(172 + cw2, 20, 2.5, 22);
    }
    /* пустое тело страницы */
    x.globalAlpha = f * .5;
    x.strokeStyle = '#1C2742'; x.lineWidth = 2; x.setLineDash([10, 10]);
    rr(x, 60, 130, BW - 120, BH - 200, 16); x.stroke(); x.setLineDash([]);
    x.globalAlpha = f * .45;
    x.font = F(600, 26); x.fillStyle = '#39496B'; x.textAlign = 'center';
    x.fillText('страница пока пуста', BW / 2, BH / 2 + 10); x.textAlign = 'left';
    x.globalAlpha = 1;
    x.restore();
  }
  glow(c, 0, 0, 0, 1500, 900, C.blue, .13 * clamp(dp * 2, 0, 1));
  blit(c, o.c, 0, 0, 0, BW, BH, { yaw: lerp(.26, .05, eInOut(clamp(p / .92, 0, 1))), shadow: dp > .6, alpha: clamp(dp * 3, 0, 1) });

  /* вопрос */
  const tp = inv(t, 1.95, T1 - 0.05);
  if (tp > 0) {
    screenGlow(c, W / 2, TITLE_Y, 1010, 380, C.blue, .24 * clamp(tp * 2, 0, 1));
    kinetic(c, ['ВАШЕМУ БИЗНЕСУ', 'НУЖЕН САЙТ?'], {
      cx: W / 2, cy: TITLE_Y, size: 94, p: tp, mode: 'wipe',
      stagger: .13, accentIdx: 3, accentColor: C.cyan, letter: -1.5
    });
  }
}

/* Сцена 2 — окно собирает само себя */
function scene2(c, t) {
  const p = inv(t, T1, T2);
  const e = eInOut(p);
  frameTo(lerp(950, 1030, eOutCubic(p)), BW, lerp(1185, 1120, e), lerp(-60, 52, e));
  cam.rot = lerp(0.035, -0.022, e);
  cam.focus = 0; cam.dofK = 0.013;
  drawBG(c, t, .9);

  const rev = clamp(inv(t, T1 + .12, T1 + 2.35), 0, 1);
  const scroll = Math.max(0, eInOut(inv(t, T1 + 2.6, T2 - .25))) * 760;

  /* расфокусированные дубли в глубине — объём */
  const dup2 = staticLayer('dupCafe', BW, BH, (xx, ww, hh) =>
    browserFrame(xx, ww, hh, 'кафе-зерно.ру', false, (yy, w2, h2) =>
      pageCafe(yy, w2, h2, { reveal: 1, scroll: 120 })));
  for (const d of [{ x: -1420, z: 900, yaw: .42, a: .40 }, { x: 1460, z: 1050, yaw: -.46, a: .34 }])
    blit(c, dup2, d.x, 0, d.z, BW, BH, { yaw: d.yaw, alpha: d.a, blur: 3 });

  const o = off('s2m', BW, BH);
  browserFrame(o.x, BW, BH, 'вашбизнес.ру', false, (xx, ww, hh) =>
    pageShop(xx, ww, hh, { reveal: rev, scroll, cart: 0 }));
  glow(c, 0, 0, 0, 1500, 980, C.blue, .17);
  blit(c, o.c, 0, 0, 0, BW, BH, { yaw: lerp(.18, -.16, e), shadow: true });

  /* телефон перед монитором — передний план и мобильная версия того же сайта */
  const pa = clamp(inv(t, T1 + 2.1, T1 + 3.1), 0, 1);
  if (pa > 0) {
    const op = off('s2ph', PW, PH);
    phoneFrame(op.x, PW, PH, (xx, ww, hh) =>
      pageMobile(xx, ww, hh, { reveal: 1, scroll: eInOut(inv(t, T1 + 3.2, T2 - .2)) * 300 }));
    const ee = eOutQuint(pa);
    blit(c, op.c, 410, 405 + (1 - ee) * 560, -150, PW, PH,
      { yaw: -.22, alpha: pa, shadow: true, roll: (1 - ee) * .10 });
  }

  /* текст */
  const tp = inv(t, T1 + .55, T1 + 2.4);
  const out = 1 - inv(t, T2 - .75, T2 - .05);
  if (tp > 0 && out > 0) {
    c.save(); c.globalAlpha = out;
    c.translate(0, (1 - out) * -70);
    screenGlow(c, W / 2, TITLE_Y, 1040, 330, C.violet, .22 * out);
    kinetic(c, ['СОВРЕМЕННЫЕ САЙТЫ', 'ДЛЯ ВАШЕГО БИЗНЕСА'], {
      cx: W / 2, cy: TITLE_Y, size: 76, p: tp, mode: 'rise', stagger: .1, letter: -1
    });
    c.restore();
  }
}

/* Сцена 3A — каталог товаров: сетка набегает каскадом, планы в глубине */
function scene3a(c, t) {
  const p = inv(t, T2, T3A);
  const e = eInOut(p);
  frameTo(lerp(1010, 930, e), BW, lerp(880, 955, e), lerp(80, -60, e));
  cam.rot = lerp(-0.05, 0.03, e);
  cam.focus = 0; cam.dofK = 0.013;
  drawBG(c, t, .85);

  /* два расфокусированных макета по сторонам — глубина и относительное движение */
  const dup3 = staticLayer('dupCafe2', BW, BH, (xx, ww, hh) =>
    browserFrame(xx, ww, hh, 'кафе-зерно.ру', false, (yy, w2, h2) =>
      pageCafe(yy, w2, h2, { reveal: 1, scroll: 150 })));
  for (const d of [{ x: -1680, z: 980, yaw: .5, a: .34 }, { x: 1700, z: 1120, yaw: -.52, a: .28 }])
    blit(c, dup3, d.x, 0, d.z, BW, BH, { yaw: d.yaw, alpha: d.a, blur: 4 });

  /* каскад карточек + бегущая подсветка по сетке */
  const rev = clamp(inv(t, T2 + .05, T2 + 1.9) * .74 + .26, 0, 1);
  const hover = t > T2 + 1.5 ? (1 + Math.floor((t - T2 - 1.5) / .42)) % 8 : -1;
  const o = off('s3a', BW, BH);
  browserFrame(o.x, BW, BH, 'вашбизнес.ру/каталог', false, (xx, ww, hh) =>
    pageShop(xx, ww, hh, { reveal: rev, scroll: 400 + eInOut(inv(t, T2 + .6, T3A)) * 210, hover }));
  glow(c, 0, 0, 0, 1500, 950, C.violet, .15);
  blit(c, o.c, 0, 0, 0, BW, BH, { yaw: lerp(-.3, .2, e), shadow: true });

  /* мягкое боке на переднем плане — ощущение объектива, без перегрузки кадра */
  const R = prng(4242);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const bx = R() * 2400 - 1200, by = R() * 2000 - 1000, bz = -620 - R() * 280;
    const pr = proj(bx, by, bz);
    c.globalAlpha = .07 + .05 * Math.sin(t * 1.3 + i);
    c.filter = `blur(${22 * pr.s}px)`;
    c.fillStyle = i % 2 ? C.cyan : C.blue;
    c.beginPath(); c.arc(pr.x, pr.y, (34 + R() * 30) * pr.s, 0, 6.2832); c.fill();
  }
  c.restore();
}

/* Сцена 3B — меню кафе с интеракцией */
function scene3b(c, t) {
  const p = inv(t, T3A, T3B);
  frameTo(lerp(905, 1020, eOutCubic(p)), BW, lerp(985, 915, eInOut(p)), lerp(-55, 42, eInOut(p)));
  cam.rot = lerp(0.055, -0.018, eInOut(p));
  cam.focus = 0; cam.dofK = 0.013;
  drawBG(c, t, .82);

  const hoverT = inv(t, T3A + .75, T3A + 1.05);
  const press = t > T3A + 1.42 && t < T3A + 1.62;
  const cart = t > T3A + 1.5 ? 1 : 0;
  const hov = hoverT > .5 ? 0 : -1;

  const o = off('s3b', BW, BH);
  browserFrame(o.x, BW, BH, 'кафе-зерно.ру/меню', false, (xx, ww, hh) =>
    pageCafe(xx, ww, hh, { reveal: 1, hover: hov, scroll: 40 }));
  glow(c, 0, 0, 0, 1500, 950, C.cyan, .13);
  blit(c, o.c, 0, 0, 0, BW, BH, { yaw: lerp(.3, -.14, eInOut(p)), shadow: true });

  /* курсор идёт к кнопке строки меню и нажимает (координаты — от центра макета) */
  const BTN = { x: 1129 - BW / 2, y: 323 - BH / 2 };
  if (t > T3A + .3) {
    const mp = eInOut(inv(t, T3A + .3, T3A + 1.4));
    cursor(c, lerp(-260, BTN.x, mp), lerp(330, BTN.y, mp), -40, press);
  }
  /* бейдж корзины вылетает */
  if (cart) {
    const a = inv(t, T3A + 1.5, T3A + 1.85);
    const ee = eOutBack(a);
    const pr = proj(lerp(BTN.x, 150, ee), lerp(BTN.y, -600, ee), -200);
    c.save(); c.globalAlpha = (1 - inv(t, T3B - .45, T3B - .05)) * Math.min(1, a * 2);
    c.translate(pr.x, pr.y); c.scale(pr.s * ee, pr.s * ee);
    c.shadowColor = C.blue; c.shadowBlur = 30;
    fillRR(c, -120, -34, 240, 68, 34, C.blue);
    c.shadowBlur = 0; c.font = F(800, 30); c.fillStyle = '#071024';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('+1 в корзину', 0, 1); c.restore();
  }
}

/* Сцена 3C — десктоп сжимается в телефон */
function scene3c(c, t) {
  const p = inv(t, T3B, T3);
  const m = eInOut(clamp(inv(t, T3B + .25, T3B + 1.55), 0, 1)); // морф
  /* кадр ведёт за объектом: окно шириной ~900 px сжимается в телефон ~455 px */
  const pwNow = lerp(BW, PW, m);
  frameTo(lerp(1000, 500, m), pwNow, lerp(925, 905, m), lerp(42, -24, eInOut(p)));
  cam.rot = lerp(0.03, -0.012, eInOut(p));
  cam.focus = 0; cam.dofK = 0.013;
  drawBG(c, t, .85);

  /* десктоп уходит вглубь и вбок */
  const dAlpha = 1 - clamp(m * 1.5, 0, 1);
  if (dAlpha > 0.01) {
    const o = { c: staticLayer('shopStatic300', BW, BH, (xx, ww, hh) =>
      browserFrame(xx, ww, hh, 'вашбизнес.ру', false, (yy, w2, h2) =>
        pageShop(yy, w2, h2, { reveal: 1, scroll: 300 }))) };
    blit(c, o.c, lerp(0, -760, m), 0, lerp(0, 820, m), BW, BH,
      { yaw: lerp(-.1, .52, m), alpha: dAlpha, shadow: true, blur: m * 5 });
  }
  /* интерполяция габаритов: окно → телефон */
  const pw = lerp(BW, PW, m), ph = lerp(BH, PH, m);
  const q = v => Math.round(v / 20) * 20;
  const o2 = off('s3c_p', q(pw), q(ph));
  const rev = 1;
  if (m < .5) {
    browserFrame(o2.x, q(pw), q(ph), 'вашбизнес.ру', false, (xx, ww, hh) => {
      xx.save(); xx.globalAlpha = 1 - m * 2; pageShop(xx, ww, hh, { reveal: rev, scroll: 300 }); xx.restore();
      xx.globalAlpha = m * 2; pageMobile(xx, ww, hh, { reveal: rev, scroll: 0 }); xx.globalAlpha = 1;
    });
  } else {
    phoneFrame(o2.x, q(pw), q(ph), (xx, ww, hh) =>
      pageMobile(xx, ww, hh, { reveal: rev, scroll: eInOut(inv(t, T3B + 1.7, T3 - .1)) * 330 }));
  }
  glow(c, 0, 0, 0, lerp(1500, 700, m), lerp(950, 1150, m), C.blue, .18);
  blit(c, o2.c, 0, 0, 0, pw, ph,
    { yaw: lerp(-.1, .26 * Math.sin((t - T3B - .9) * 1.15), m), shadow: true });
}

/* общий текст сцены 3 — три кинетические подмены на одной строке */
function scene3Text(c, t) {
  const blocks = [
    { from: T2 + .35, to: T3A, lines: ['КРАСИВЫЙ', 'ДИЗАЙН'], col: C.blue, mode: 'scale', chip: 'ИНТЕРНЕТ-МАГАЗИН' },
    { from: T3A + .2, to: T3B, lines: ['УДОБСТВО'], col: C.cyan, mode: 'blurin', chip: 'МЕНЮ КАФЕ' },
    { from: T3B + .2, to: T3 - .05, lines: ['АДАПТАЦИЯ', 'ПОД ТЕЛЕФОН'], col: C.violet, mode: 'rise', chip: 'МОБИЛЬНАЯ ВЕРСИЯ' }
  ];
  for (const b of blocks) {
    if (t < b.from || t > b.to) continue;
    const inP = inv(t, b.from, b.from + .85);
    const outP = inv(t, b.to - .38, b.to);
    const a = Math.min(1, inP * 1.1) * (1 - outP);
    if (a <= 0.01) continue;
    topChip(c, b.chip, a * clamp(inP * 1.8, 0, 1), b.col, 418);
    c.save();
    c.globalAlpha = a;
    c.translate(0, outP * -60);
    if (outP > 0) c.filter = `blur(${outP * 10}px)`;
    const yb = BOTTOM_Y;
    screenGlow(c, W / 2, yb, 980, 300, b.col, .16 * a);
    /* подложка-полоска */
    c.save();
    c.globalAlpha = a * .9;
    const barW = lerp(0, 150, eOutQuint(inP));
    c.fillStyle = b.col; c.shadowColor = b.col; c.shadowBlur = 22;
    c.fillRect(W / 2 - barW / 2, yb - 160, barW, 5);
    c.restore();
    kinetic(c, b.lines, {
      cx: W / 2, cy: yb, size: b.lines.length > 1 ? 86 : 100, p: inP,
      mode: b.mode, stagger: .12, accentIdx: 0, accentColor: b.col, letter: -1.5
    });
    c.restore();
  }
}

/* Сцена 4 — от вайрфрейма к готовому сайту */
function scene4(c, t) {
  const p = inv(t, T3, T4);
  frameTo(lerp(880, 950, eInOut(p)), BW, lerp(1105, 1055, eInOut(p)), lerp(-42, 46, eInOut(p)));
  cam.rot = lerp(-0.04, 0.03, eInOut(p));
  cam.focus = -120; cam.dofK = 0.009;
  drawBG(c, t, .88);

  const wrev = clamp(inv(t, T3 + .08, T3 + 1.15), 0, 1);   // рисуется вайрфрейм
  const sweep = eInOut(clamp(inv(t, T3 + 1.5, T3 + 3.5), 0, 1)); // полоса проявки

  /* основное окно: два слоя — вайрфрейм и финал, разделённые бегущей маской */
  const ow = off('s4w', BW, BH), comp = off('s4c', BW, BH);
  browserFrame(ow.x, BW, BH, null, true, (xx, ww, hh) =>
    pageShop(xx, ww, hh, { reveal: wrev, scroll: 180, wire: true }));
  const ofnC = staticLayer('shopFinal180', BW, BH, (xx, ww, hh) =>
    browserFrame(xx, ww, hh, 'вашбизнес.ру', false, (yy, w2, h2) =>
      pageShop(yy, w2, h2, { reveal: 1, scroll: 180, cart: 2 })));
  const cx2 = comp.x;
  cx2.drawImage(ow.c, 0, 0);
  const edge = sweep * (BW + 260) - 130;
  cx2.save();
  cx2.beginPath(); cx2.rect(0, 0, Math.max(0, edge), BH); cx2.clip();
  cx2.drawImage(ofnC, 0, 0);
  cx2.restore();
  /* светящаяся кромка проявки */
  if (sweep > 0.001 && sweep < 0.999) {
    const g = cx2.createLinearGradient(edge - 70, 0, edge + 26, 0);
    g.addColorStop(0, 'rgba(79,140,255,0)');
    g.addColorStop(.55, 'rgba(110,180,255,0.55)');
    g.addColorStop(1, 'rgba(230,245,255,0.95)');
    cx2.save(); cx2.globalCompositeOperation = 'lighter';
    cx2.fillStyle = g; cx2.fillRect(edge - 70, 0, 96, BH);
    cx2.restore();
  }
  glow(c, 0, 0, 0, 1500, 980, sweep > .5 ? C.blue : '#3A4A6B', .16);
  blit(c, comp.c, 0, 0, 0, BW, BH, { yaw: lerp(.22, -.2, eInOut(p)), shadow: true });

  /* телефон на переднем плане: сначала каркас, затем готовая мобильная версия */
  const op = off('s4p', PW, PH);
  const mrev = clamp((sweep - .42) / .38, 0, 1);
  phoneFrame(op.x, PW, PH, (xx, ww, hh) => {
    xx.fillStyle = '#10151F'; xx.fillRect(0, 0, ww, hh);
    if (mrev < 1) {
      /* каркас мобильной вёрстки */
      xx.save(); xx.globalAlpha = 1 - mrev;
      xx.strokeStyle = '#2B3A58'; xx.lineWidth = 1.6;
      fillRR(xx, 14, 44, ww - 28, 34, 8, '#1B2435');
      fillRR(xx, 14, 92, ww - 28, 150, 12, '#1D2738');
      xx.setLineDash([7, 6]);
      xx.beginPath(); xx.moveTo(14, 92); xx.lineTo(ww - 14, 242);
      xx.moveTo(ww - 14, 92); xx.lineTo(14, 242); xx.stroke(); xx.setLineDash([]);
      bar(xx, 14, 262, 150, 18, '#2E3A54', 5);
      for (let i = 0; i < 4; i++) fillRR(xx, 14, 292 + i * 104, ww - 28, 92, 12, '#1B2435');
      fillRR(xx, 14, hh - 64, ww - 28, 50, 10, '#1B2435');
      xx.restore();
    }
    if (mrev > 0) {
      xx.save(); xx.globalAlpha = mrev;
      pageMobile(xx, ww, hh, { reveal: mrev, scroll: 0 });
      xx.restore();
    }
  });
  blit(c, op.c, 463, 246, 43, PW, PH, { yaw: -.3, alpha: .97, shadow: true });

  /* подписи этапов — в экранной сетке, лесенкой */
  const steps = [['01', 'ИДЕЯ', T3 + .15], ['02', 'ДИЗАЙН', T3 + 1.6], ['03', 'САЙТ', T3 + 3.4]];
  const out2 = 1 - inv(t, T4 - .5, T4 - .05);
  for (let i = 0; i < 3; i++) {
    const a = clamp(inv(t, steps[i][2], steps[i][2] + .5), 0, 1);
    if (a <= 0 || out2 <= 0) continue;
    const done = t > steps[Math.min(2, i + 1)][2] && i < 2;
    c.save(); c.globalAlpha = a * out2 * (done ? .45 : 1);
    c.translate(118 + (1 - eOutQuint(a)) * -46, 392 + i * 58);
    c.font = F(800, 25); c.fillStyle = C.blue;
    c.textBaseline = 'middle'; c.fillText(steps[i][0], 0, 0);
    c.font = F(700, 29); c.fillStyle = done ? C.dim : C.white;
    c.fillText(steps[i][1], 50, 0);
    c.fillStyle = done ? C.blue : 'rgba(79,140,255,0.35)';
    c.fillRect(-16, -2, 8, 4);
    c.restore();
  }

  /* главный текст */
  const tp = inv(t, T3 + 1.0, T3 + 2.9);
  const out = 1 - inv(t, T4 - .7, T4 - .05);
  if (tp > 0 && out > 0) {
    c.save(); c.globalAlpha = out;
    screenGlow(c, W / 2, BOTTOM_Y, 1060, 320, C.cyan, .20 * out);
    kinetic(c, ['ОТ ИДЕИ', 'ДО ГОТОВОГО САЙТА'], {
      cx: W / 2, cy: BOTTOM_Y, size: 82, p: tp, mode: 'wipe', stagger: .12,
      accentIdx: 3, accentColor: C.cyan, letter: -1.5
    });
    c.restore();
  }
}

/* Сцена 5 — финал */
function scene5(c, t) {
  const p = inv(t, T4, DUR);
  const ce = eOutCubic(clamp(p * 1.3, 0, 1));
  cam.z = lerp(-430, -250, ce) + Math.sin(t * .5) * 12;
  cam.x = lerp(70, -16, ce);
  cam.y = lerp(50, -8, ce);
  cam.rot = lerp(0.022, 0, ce);
  cam.focus = -120; cam.dofK = 0.009;
  drawBG(c, t, 1.0);

  /* экраны слетаются к центру и схлопываются в линию */
  const col = eInOut(clamp(inv(t, T4 - .0, T4 + .85), 0, 1));
  if (col < 1) {
    const items = [
      { img: 'f1', x: -480, y: -620, z: 260, yaw: .4 },
      { img: 'f2', x: 520, y: 150, z: 340, yaw: -.4 },
      { img: 'f3', x: -180, y: 800, z: 120, yaw: .18 }
    ];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const o = off('s5_' + it.img, 520, 360);
      const xx = o.x;
      fillRR(xx, 0, 0, 520, 360, 18, '#0C1322');
      strokeRR(xx, 1, 1, 518, 358, 18, 'rgba(120,160,230,0.3)', 2);
      photo(xx, 16, 16, 488, 200, 50 + i * 5, 12);
      bar(xx, 16, 234, 300, 20, '#2A3550', 6);
      bar(xx, 16, 268, 420, 14, '#1F2B44', 5);
      bar(xx, 16, 294, 360, 14, '#1F2B44', 5);
      bar(xx, 16, 322, 140, 22, C.blue, 8);
      const k = eInOut(col);
      blit(c, o.c, lerp(it.x, 0, k), lerp(it.y, 0, k), lerp(it.z, -120, k),
        lerp(520, 40, k), lerp(360, 6, k),
        { yaw: it.yaw * (1 - k), alpha: 1 - Math.pow(k, 3), blur: k * 6 });
    }
  }
  /* вспышка-линия */
  const fl = Math.max(0, 1 - Math.abs(t - (T4 + .88)) / .42);
  if (fl > 0) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, H / 2 - 120, 0, H / 2 + 120);
    g.addColorStop(0, 'rgba(79,140,255,0)');
    g.addColorStop(.5, `rgba(190,220,255,${.9 * fl})`);
    g.addColorStop(1, 'rgba(79,140,255,0)');
    const lw = lerp(120, W * 1.3, eOutExpo(clamp(inv(t, T4 + .7, T4 + 1.3), 0, 1)));
    c.fillStyle = g; c.fillRect(W / 2 - lw / 2, H / 2 - 120, lw, 240);
    c.restore();
  }

  /* кольцо-ореол */
  const ha = clamp(inv(t, T4 + .8, T4 + 1.6), 0, 1);
  if (ha > 0) {
    glow(c, 0, -170, -60, 1300, 700, C.blue, .17 * ha);
    glow(c, 0, 420, -60, 1100, 520, C.violet, .13 * ha);
  }

  /* три строки финала */
  const TY = 800, SY = 1120, BY = 1345;
  topChip(c, 'ВЕБ-РАЗРАБОТКА', clamp(inv(t, T4 + .75, T4 + 1.35), 0, 1), C.blue, 432);
  const t1 = inv(t, T4 + .85, T4 + 2.2);
  if (t1 > 0) {
    screenGlow(c, W / 2, TY, 1060, 500, C.blue, .20 * Math.min(1, t1 * 2));
    kinetic(c, ['СОЗДАЁМ САЙТ', 'ДЛЯ ВАШЕГО', 'БИЗНЕСА'], {
      cx: W / 2, cy: TY, size: 102, p: t1, mode: 'scale', stagger: .09,
      accentIdx: 1, accentColor: C.blue, letter: -2
    });
  }
  const t2 = inv(t, T4 + 1.9, T4 + 2.9);
  if (t2 > 0) {
    c.save(); c.globalAlpha = Math.min(1, t2 * 1.6);
    const e = eOutQuint(t2);
    c.translate(0, (1 - e) * 36);
    const txt = 'Стоимость обсуждается индивидуально';
    c.font = F(600, 35); c.textAlign = 'center'; c.textBaseline = 'middle';
    const tw = c.measureText(txt).width;
    fillRR(c, W / 2 - tw / 2 - 32, SY - 36, tw + 64, 72, 36, 'rgba(79,140,255,0.10)');
    strokeRR(c, W / 2 - tw / 2 - 32, SY - 36, tw + 64, 72, 36, 'rgba(79,140,255,0.38)', 1.6);
    c.fillStyle = '#C9D9F2'; c.fillText(txt, W / 2, SY + 1);
    c.textAlign = 'left'; c.restore();
  }

  /* CTA-пилюля */
  const t3 = inv(t, T4 + 2.7, T4 + 3.8);
  if (t3 > 0) {
    const e = eOutElastic(clamp(t3 * 1.25, 0, 1));
    const pulse = 1 + .018 * Math.sin((t - T4 - 3.6) * 3.4);
    c.save();
    c.globalAlpha = Math.min(1, t3 * 2.2);
    const bx = W / 2, by = BY;
    c.translate(bx, by); c.scale(e * pulse, e * pulse); c.translate(-bx, -by);
    const txt = 'Напишите мне в личные сообщения';
    c.font = F(800, 38);
    const tw = c.measureText(txt).width;
    const bw = tw + 160, bh = 104;
    c.shadowColor = 'rgba(79,140,255,0.6)'; c.shadowBlur = 46; c.shadowOffsetY = 10;
    const g = c.createLinearGradient(bx - bw / 2, by - bh / 2, bx + bw / 2, by + bh / 2);
    g.addColorStop(0, '#5B9BFF'); g.addColorStop(1, '#8B5CF6');
    fillRR(c, bx - bw / 2, by - bh / 2, bw, bh, bh / 2, g);
    c.shadowBlur = 0;
    /* бумажный самолётик */
    c.save();
    c.translate(bx - bw / 2 + 62, by); c.scale(1.5, 1.5);
    c.fillStyle = '#071024';
    c.beginPath();
    c.moveTo(-14, -2); c.lineTo(15, -13); c.lineTo(5, 14); c.lineTo(0, 3); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, 3); c.lineTo(15, -13); c.lineTo(2, 12); c.closePath();
    c.fillStyle = 'rgba(7,16,36,0.55)'; c.fill();
    c.restore();
    c.font = F(800, 38); c.fillStyle = '#071024';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(txt, bx + 42, by + 2);
    c.textAlign = 'left';
    /* пробег света по пилюле */
    const sw2 = ((t - T4 - 3.1) % 2.6) / 2.6;
    if (sw2 > 0 && sw2 < .5) {
      c.save(); rr(c, bx - bw / 2, by - bh / 2, bw, bh, bh / 2); c.clip();
      c.globalCompositeOperation = 'lighter';
      const sxp = bx - bw / 2 + sw2 * 2 * bw;
      const sg = c.createLinearGradient(sxp - 90, 0, sxp + 90, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(.5, 'rgba(255,255,255,0.32)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sg; c.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      c.restore();
    }
    c.restore();
  }

  /* что именно делаю — короткий ряд услуг */
  const t4 = inv(t, T4 + 3.5, T4 + 4.6);
  if (t4 > 0) {
    const chips = ['Сайты-визитки', 'Интернет-магазины', 'Меню для кафе'];
    c.save(); c.font = F(600, 25); c.textBaseline = 'middle'; c.textAlign = 'center';
    const ws = chips.map(s2 => c.measureText(s2).width + 44);
    const totalW = ws.reduce((a2, b2) => a2 + b2, 0) + 36;
    let cxp = W / 2 - totalW / 2;
    for (let i = 0; i < 3; i++) {
      const a2 = clamp((t4 - i * .13) / .4, 0, 1);
      if (a2 > 0) {
        const e2 = eOutQuint(a2);
        c.save(); c.globalAlpha = Math.min(1, a2 * 1.8);
        c.translate(0, (1 - e2) * 24);
        fillRR(c, cxp, 1572, ws[i], 56, 28, 'rgba(22,32,56,0.78)');
        strokeRR(c, cxp, 1572, ws[i], 56, 28, 'rgba(100,140,210,0.30)', 1.4);
        c.fillStyle = '#9FB4D4'; c.fillText(chips[i], cxp + ws[i] / 2, 1601);
        c.restore();
      }
      cxp += ws[i] + 18;
    }
    c.textAlign = 'left'; c.restore();
  }

  /* лёгкие частицы вверх */
  const R = prng(777);
  const pa = clamp(inv(t, T4 + 1.0, T4 + 2.0), 0, 1);
  if (pa > 0) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const bx2 = R() * W, sp = .5 + R() * 1.4, ph = R() * 10, rr2 = 1 + R() * 2.4;
      const yy = H * 1.05 - (((t - T4) * 60 * sp + ph * 200) % (H * 1.2));
      c.globalAlpha = .20 * pa * (0.4 + 0.6 * Math.sin((t * sp + ph) * 1.7) ** 2);
      c.fillStyle = i % 3 === 0 ? C.cyan : C.blue;
      c.beginPath(); c.arc(bx2, yy, rr2, 0, 6.2832); c.fill();
    }
    c.restore();
  }
}

/* ───────────────────────── переходы ───────────────────────── */
const BOUNDS = [T1, T2, T3A, T3B, T3, T4];
function transitions(c, t) {
  for (const b of BOUNDS) {
    const d = t - b;
    /* световой пробег-вайп */
    if (d > -0.26 && d < 0.34) {
      const k = inv(t, b - 0.26, b + 0.34);
      c.save(); c.globalCompositeOperation = 'lighter';
      const a = Math.sin(k * Math.PI);
      const xw = lerp(-W * .4, W * 1.4, eInOut(k));
      const g = c.createLinearGradient(xw - 300, 0, xw + 140, 0);
      g.addColorStop(0, 'rgba(79,140,255,0)');
      g.addColorStop(.7, `rgba(120,170,255,${.14 * a})`);
      g.addColorStop(1, `rgba(220,238,255,${.30 * a})`);
      c.fillStyle = g;
      c.translate(0, 0);
      c.fillRect(xw - 300, 0, 460, H);
      c.restore();
    }
    /* короткая вспышка на удар */
    if (d > -0.05 && d < 0.2) {
      const a = Math.max(0, 1 - d / 0.2) * (d < 0 ? (1 + d / 0.05) : 1);
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(90,140,220,${0.10 * a})`;
      c.fillRect(0, 0, W, H);
      c.restore();
    }
  }
}

/* ───────────────────────── финальные оверлеи ───────────────────────── */
const grainTiles = (() => {
  const tiles = [];
  for (let k = 0; k < 4; k++) {
    const c2 = document.createElement('canvas'); c2.width = 256; c2.height = 256;
    const x2 = c2.getContext('2d');
    const id = x2.createImageData(256, 256), R = prng(1000 + k * 77);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 110 + (R() * 90 - 45);
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    x2.putImageData(id, 0, 0); tiles.push(c2);
  }
  return tiles;
})();

function overlays(c, t, frame) {
  /* виньетка */
  const g = c.createRadialGradient(W / 2, H * .46, H * .22, W / 2, H * .5, H * .78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.60)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  /* зерно */
  c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.045;
  const tile = grainTiles[frame % 4];
  const pat = c.createPattern(tile, 'repeat');
  c.fillStyle = pat; c.fillRect(0, 0, W, H);
  c.restore();
  /* затемнение на входе и выходе ролика */
  const fin = 1 - inv(t, 0, 0.35);
  const fout = inv(t, DUR - 0.5, DUR);
  if (fin > 0 || fout > 0) {
    c.fillStyle = `rgba(0,0,0,${Math.max(fin, fout)})`;
    c.fillRect(0, 0, W, H);
  }
}

/* ───────────────────────── диспетчер ───────────────────────── */
function drawScene(c, t) {
  resetCam();
  if (t < T1) scene1(c, t);
  else if (t < T2) scene2(c, t);
  else if (t < T3A) { scene3a(c, t); scene3Text(c, t); }
  else if (t < T3B) { scene3b(c, t); scene3Text(c, t); }
  else if (t < T3) { scene3c(c, t); scene3Text(c, t); }
  else if (t < T4) scene4(c, t);
  else scene5(c, t);
  transitions(c, t);
}

/* число подкадров motion blur: больше на быстрых фазах */
function subs(t) {
  for (const b of BOUNDS) if (Math.abs(t - b) < 0.30) return 3;
  if (t > T4 && t < T4 + 1.0) return 3;
  return 1;
}

function renderFrame(t) {
  const frame = Math.round(t * FPS);
  const n = subs(t);
  const shutter = 0.55 / FPS;
  for (let i = 0; i < n; i++) {
    const tt = clamp(t + (n === 1 ? 0 : (i / (n - 1) - 0.5) * shutter), 0, DUR);
    drawScene(sx, tt);
    ctx.globalAlpha = 1 / (i + 1);
    ctx.drawImage(sc, 0, 0);
    ctx.globalAlpha = 1;
  }
  overlays(ctx, t, frame);
}

window.VIDEO = { W, H, FPS, DUR, FRAMES: Math.round(DUR * FPS) };
window.renderFrame = renderFrame;

window.ready = (async () => {
  const defs = [['Manrope', 400], ['Manrope', 600], ['Manrope', 700], ['Manrope', 800]];
  await Promise.all(defs.map(async ([fam, w]) => {
    const f = new FontFace(fam, `url(fonts/manrope-cyrillic-${w}-normal.woff2)`, { weight: String(w) });
    await f.load(); document.fonts.add(f);
  }));
  await document.fonts.ready;
  /* прогрев: один холостой кадр, чтобы шрифты и паттерны были готовы */
  renderFrame(0);
  return true;
})();
