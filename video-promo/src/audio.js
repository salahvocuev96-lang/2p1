/* Оригинальная музыка и звуковой дизайн для ролика.
   Синтез в OfflineAudioContext (Web Audio) — сторонние фонограммы не используются.
   Экспорт: 48 кГц, стерео, 16 бит PCM WAV (base64). */

(() => {
  const SR = 48000, LEN = 34.0;
  const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4, S16 = BEAT / 4;

  /* границы сцен — на них ставим акценты */
  const B = [4.2, 10.4, 13.0, 15.7, 18.4, 25.0];
  const END = 33.0;

  const CH = [
    { root: 55.00, tri: [220.00, 261.63, 329.63] }, // Am
    { root: 43.65, tri: [174.61, 220.00, 261.63] }, // F
    { root: 65.41, tri: [261.63, 329.63, 392.00] }, // C
    { root: 49.00, tri: [196.00, 246.94, 293.66] }  // G
  ];
  const chordAt = t => CH[Math.floor(t / (BAR * 2)) % 4];

  function makeNoise(ac, sec) {
    const b = ac.createBuffer(1, Math.ceil(SR * sec), SR), d = b.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 2147483648) - 1; }
    return b;
  }
  function makeIR(ac, sec, decay) {
    const n = Math.ceil(SR * sec), b = ac.createBuffer(2, n, SR);
    let s = 777;
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) {
        s = (s * 1103515245 + 12345) >>> 0;
        d[i] = ((s / 2147483648) - 1) * Math.pow(1 - i / n, decay);
      }
    }
    return b;
  }

  async function render() {
    const ac = new OfflineAudioContext(2, Math.ceil(SR * LEN), SR);
    const NOISE = makeNoise(ac, 3);

    const master = ac.createGain(); master.gain.value = 0.50;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 4.5;
    comp.attack.value = 0.004; comp.release.value = 0.20;
    master.connect(comp); comp.connect(ac.destination);

    /* шина реверберации */
    const rev = ac.createConvolver(); rev.buffer = makeIR(ac, 3.2, 2.6);
    const revGain = ac.createGain(); revGain.gain.value = 0.42;
    rev.connect(revGain); revGain.connect(master);

    /* музыкальная шина с «подкачкой» под кик */
    const musBus = ac.createGain(); musBus.gain.value = 1.0;
    const pump = ac.createGain(); pump.gain.value = 1.0;
    musBus.connect(pump); pump.connect(master);

    /* шина эффектов — без подкачки */
    const fxBus = ac.createGain(); fxBus.gain.value = 1.0;
    fxBus.connect(master);

    const noise = (dest, t, dur, type, f0, f1, q, g0) => {
      const s = ac.createBufferSource(); s.buffer = NOISE; s.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = type; bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, t);
      bp.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(g0, t + Math.min(0.012, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(bp); bp.connect(g); g.connect(dest);
      s.start(t); s.stop(t + dur + 0.05);
      return g;
    };
    const tone = (dest, t, dur, type, f0, f1, g0, atk) => {
      const o = ac.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(12, f1), t + dur * 0.9);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(g0, t + (atk === undefined ? 0.006 : atk));
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.05);
      return g;
    };

    /* ── ударные ── */
    const kick = (t, g) => {
      tone(master, t, 0.42, 'sine', 155, 44, 0.95 * g, 0.002);
      noise(master, t, 0.03, 'highpass', 2200, 1800, 0.7, 0.18 * g);
      /* подкачка остальной музыки */
      pump.gain.setValueAtTime(0.42, t);
      pump.gain.linearRampToValueAtTime(1.0, t + BEAT * 0.62);
    };
    const hat = (t, g, open) => {
      const n = noise(master, t, open ? 0.16 : 0.045, 'highpass', 8200, 7600, 0.9, 0.085 * g);
      return n;
    };
    const clap = (t, g) => {
      for (let i = 0; i < 3; i++) noise(master, t + i * 0.011, 0.075, 'bandpass', 1700, 1500, 1.1, 0.30 * g);
      noise(rev, t, 0.22, 'bandpass', 1500, 1200, 1.0, 0.20 * g);
    };
    const impact = (t, g) => {
      tone(master, t, 1.5, 'sine', 95, 28, 1.0 * g, 0.003);
      noise(master, t, 0.55, 'lowpass', 1400, 180, 0.8, 0.32 * g);
      noise(rev, t, 0.9, 'bandpass', 900, 400, 0.8, 0.22 * g);
    };
    const riser = (t, dur, g) => {
      noise(fxBus, t, dur, 'bandpass', 420, 8600, 2.4, 0.26 * g);
      const o = ac.createOscillator(); o.type = 'sawtooth';
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.exponentialRampToValueAtTime(7000, t + dur);
      lp.Q.value = 6;
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(640, t + dur);
      const gg = ac.createGain();
      gg.gain.setValueAtTime(0.0008, t);
      gg.gain.exponentialRampToValueAtTime(0.16 * g, t + dur * 0.92);
      gg.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.1);
      o.connect(lp); lp.connect(gg); gg.connect(fxBus);
      o.start(t); o.stop(t + dur + 0.15);
    };
    const whoosh = (t, dur, g, rev2) => {
      const s = ac.createBufferSource(); s.buffer = NOISE; s.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(rev2 ? 5200 : 500, t);
      bp.frequency.exponentialRampToValueAtTime(rev2 ? 450 : 5600, t + dur);
      const pan = ac.createStereoPanner();
      pan.pan.setValueAtTime(rev2 ? 0.75 : -0.75, t);
      pan.pan.linearRampToValueAtTime(rev2 ? -0.75 : 0.75, t + dur);
      const gg = ac.createGain();
      gg.gain.setValueAtTime(0.0008, t);
      gg.gain.exponentialRampToValueAtTime(0.20 * g, t + dur * 0.55);
      gg.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(bp); bp.connect(pan); pan.connect(gg); gg.connect(fxBus);
      s.start(t); s.stop(t + dur + 0.05);
    };
    const tick = (t, g, f) => {
      tone(fxBus, t, 0.09, 'triangle', f || 2400, (f || 2400) * 0.6, 0.085 * g, 0.001);
      noise(fxBus, t, 0.035, 'highpass', 5200, 4200, 0.8, 0.05 * g);
    };
    const chime = (t, g, base) => {
      [1, 2, 3, 4.2, 5.4].forEach((h, i) => {
        const gg = tone(rev, t + i * 0.012, 2.4 - i * 0.2, 'sine', base * h, base * h, (0.17 / (i + 1)) * g, 0.004);
        tone(master, t + i * 0.012, 1.6 - i * 0.15, 'sine', base * h, base * h, (0.10 / (i + 1)) * g, 0.004);
      });
    };

    /* ── тональные партии ── */
    const pad = (t, dur, freqs, g) => {
      for (const f of freqs) {
        for (const det of [-6, 0, 6]) {
          const o = ac.createOscillator(); o.type = 'sawtooth';
          o.frequency.value = f * Math.pow(2, det / 1200);
          const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
          lp.frequency.setValueAtTime(700, t);
          lp.frequency.linearRampToValueAtTime(1600, t + dur * 0.6);
          lp.Q.value = 0.8;
          const gg = ac.createGain();
          gg.gain.setValueAtTime(0, t);
          gg.gain.linearRampToValueAtTime(0.030 * g, t + dur * 0.28);
          gg.gain.linearRampToValueAtTime(0.0001, t + dur);
          o.connect(lp); lp.connect(gg); gg.connect(musBus);
          const rg = ac.createGain(); rg.gain.value = 0.55; gg.connect(rg); rg.connect(rev);
          o.start(t); o.stop(t + dur + 0.05);
        }
      }
    };
    const subBass = (t, dur, f, g) => {
      tone(musBus, t, dur, 'sine', f, f, 0.42 * g, 0.012);
      tone(musBus, t, dur * 0.7, 'triangle', f * 2, f * 2, 0.07 * g, 0.012);
    };
    const bassPluck = (t, dur, f, g) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.value = f * 0.5;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7;
      lp.frequency.setValueAtTime(1900, t);
      lp.frequency.exponentialRampToValueAtTime(240, t + dur);
      const gg = ac.createGain();
      gg.gain.setValueAtTime(0, t);
      gg.gain.linearRampToValueAtTime(0.19 * g, t + 0.008);
      gg.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(lp); o2.connect(lp); lp.connect(gg); gg.connect(musBus);
      o.start(t); o.stop(t + dur + 0.05); o2.start(t); o2.stop(t + dur + 0.05);
    };
    const arp = (t, f, g, bright) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 9;
      lp.frequency.setValueAtTime(bright * 2600 + 700, t);
      lp.frequency.exponentialRampToValueAtTime(600, t + S16 * 2.6);
      const gg = ac.createGain();
      gg.gain.setValueAtTime(0, t);
      gg.gain.linearRampToValueAtTime(0.085 * g, t + 0.004);
      gg.gain.exponentialRampToValueAtTime(0.0008, t + S16 * 2.4);
      const pan = ac.createStereoPanner();
      pan.pan.value = Math.sin(t * 5.1) * 0.45;
      o.connect(lp); lp.connect(gg); gg.connect(pan); pan.connect(musBus);
      const rg = ac.createGain(); rg.gain.value = 0.30; pan.connect(rg); rg.connect(rev);
      o.start(t); o.stop(t + S16 * 2.6);
    };
    const stab = (t, freqs, g) => {
      for (const f of freqs) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
        lp.frequency.setValueAtTime(4200, t);
        lp.frequency.exponentialRampToValueAtTime(900, t + 0.5);
        const gg = ac.createGain();
        gg.gain.setValueAtTime(0, t);
        gg.gain.linearRampToValueAtTime(0.055 * g, t + 0.006);
        gg.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);
        o.connect(lp); lp.connect(gg); gg.connect(musBus);
        const rg = ac.createGain(); rg.gain.value = 0.5; gg.connect(rg); rg.connect(rev);
        o.start(t); o.stop(t + 0.6);
      }
    };

    /* ───────── аранжировка ───────── */

    /* пэд на всю длительность, аккорд меняется каждые 2 такта */
    for (let t = 0; t < END + 1; t += BAR * 2) {
      const c = chordAt(t + 0.01);
      const lvl = t < 4.2 ? 0.75 : (t >= 30.0 ? 1.15 : 1.0);
      pad(t, BAR * 2 + 0.45, c.tri, lvl);
      pad(t, BAR * 2 + 0.45, c.tri.map(f => f * 2), lvl * 0.35);
    }

    /* бит */
    const beats = Math.ceil(END / BEAT);
    for (let i = 0; i < beats; i++) {
      const t = i * BEAT;
      const inBeat = t >= 4.2 && t < 30.4;
      const full = t >= 10.4;
      if (inBeat) {
        kick(t, t < 10.4 ? 0.82 : (t >= 25.0 ? 1.0 : 0.92));
        hat(t + BEAT / 2, full ? 0.9 : 0.55, i % 4 === 3);
        if (full) hat(t + BEAT / 4, 0.4);
        if (full && i % 2 === 1) clap(t, t >= 25.0 ? 0.95 : 0.8);
        /* бас */
        const c = chordAt(t + 0.01);
        subBass(t, BEAT * 0.9, c.root, t >= 10.4 ? 1.0 : 0.8);
        if (full) {
          bassPluck(t + BEAT * 0.5, BEAT * 0.45, c.root * 2, 0.9);
          if (i % 4 === 2) bassPluck(t + BEAT * 0.75, BEAT * 0.3, c.root * 3, 0.7);
        }
      } else if (t < 4.2) {
        /* интро: только саб-свеллы на сильных долях */
        if (i % 4 === 0) subBass(t, BEAT * 3.2, chordAt(t + 0.01).root, 0.55);
      }
    }

    /* арпеджио 1/16 */
    for (let t = 4.2; t < 30.4; t += S16) {
      const c = chordAt(t + 0.01);
      const n = Math.round(t / S16);
      const pat = [0, 1, 2, 1, 2, 0, 1, 2];
      const oct = (n % 16 < 8) ? 2 : 4;
      const f = c.tri[pat[n % pat.length]] * oct;
      if (n % 2 === 0 || t >= 10.4) {
        const bright = t < 10.4 ? 0.35 : (t < 18.4 ? 0.6 : (t < 25.0 ? 0.6 + (t - 18.4) / 6.6 * 0.4 : 1.0));
        arp(t, f, t < 10.4 ? 0.55 : (t >= 25 ? 1.0 : 0.85), bright);
      }
    }

    /* аккордовые стэбы в финале */
    for (let t = 25.0; t < 30.0; t += BAR) {
      const c = chordAt(t + 0.01);
      stab(t, c.tri.map(f => f * 2), 1.0);
      stab(t + BEAT * 2.5, c.tri.map(f => f * 2), 0.6);
    }

    /* акценты ровно на границах сцен */
    B.forEach((b, i) => {
      riser(b - (i === 0 ? 1.1 : 0.9), (i === 0 ? 1.1 : 0.9), i >= 4 ? 1.0 : 0.8);
      whoosh(b - 0.45, 0.75, 0.9, i % 2 === 1);
      impact(b, i === 0 ? 0.75 : (i === 5 ? 1.0 : 0.85));
    });
    /* дополнительный большой райзер в билде сцены 4 */
    riser(23.4, 1.6, 1.0);

    /* тики на появлении слов */
    const ticks = [
      1.95, 2.10, 2.30, 2.50,            // «Вашему бизнесу нужен сайт?»
      4.80, 4.95, 5.12, 5.30,            // «Современные сайты…»
      10.80, 10.98,                      // «Красивый дизайн»
      13.25,                             // «Удобство»
      15.95, 16.12,                      // «Адаптация под телефон»
      19.45, 19.62, 19.80, 19.98,        // «От идеи до готового сайта»
      26.00, 26.14, 26.30, 26.46         // финальный заголовок
    ];
    ticks.forEach((t, i) => tick(t, 0.75, 2000 + (i % 4) * 420));
    /* клик нажатия в сцене 3B */
    tick(13.0 + 1.45, 1.1, 1500);
    tone(fxBus, 13.0 + 1.5, 0.3, 'sine', 880, 1320, 0.09, 0.004);

    /* финальный чайм и хвост */
    chime(25.95, 1.0, 523.25);
    chime(28.2, 0.55, 783.99);
    impact(30.4, 0.9);
    subBass(30.4, 2.6, 55, 1.1);
    pad(30.2, 3.4, [220, 261.63, 329.63, 440], 1.2);
    whoosh(30.3, 1.6, 0.6, true);

    /* мягкий спад мастера в самом конце */
    master.gain.setValueAtTime(0.50, 31.6);
    master.gain.linearRampToValueAtTime(0.0, 33.0);

    const buf = await ac.startRendering();
    return toWavB64(buf);
  }

  function toWavB64(buf) {
    const nch = buf.numberOfChannels, n = buf.length;
    const data = new DataView(new ArrayBuffer(44 + n * nch * 2));
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); data.setUint32(4, 36 + n * nch * 2, true); ws(8, 'WAVE');
    ws(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
    data.setUint16(22, nch, true); data.setUint32(24, buf.sampleRate, true);
    data.setUint32(28, buf.sampleRate * nch * 2, true); data.setUint16(32, nch * 2, true);
    data.setUint16(34, 16, true); ws(36, 'data'); data.setUint32(40, n * nch * 2, true);
    const chans = []; for (let c = 0; c < nch; c++) chans.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < nch; c++) {
        let v = chans[c][i];
        v = v < -1 ? -1 : v > 1 ? 1 : v;
        data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7FFF, true); o += 2;
      }
    }
    const bytes = new Uint8Array(data.buffer);
    let bin = '', CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    return btoa(bin);
  }

  window.renderMusic = render;
})();
