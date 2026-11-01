"""Синтез музыки (120 BPM, A minor) и SFX по events.json -> audio.wav (48 kHz, stereo).
Только numpy, без внешних сэмплов: все звуки сгенерированы, лицензий не требуется."""
import json, sys, wave
import numpy as np

SR = 48000
DUR = 70.0
N = int(SR * DUR)
rng = np.random.default_rng(42)
BEAT = 0.5
BAR = 2.0

L = np.zeros(N); R = np.zeros(N)            # SFX bus
ML = np.zeros(N); MR = np.zeros(N)          # music bus


def tt(n):
    return np.arange(n) / SR


def add(buf_l, buf_r, sig, t0, pan=0.0, gain=1.0):
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    if i0 < 0:
        sig = sig[-i0:]; i0 = 0
    sig = sig[: N - i0]
    gl = np.cos((pan + 1) * np.pi / 4) * gain * 1.41
    gr = np.sin((pan + 1) * np.pi / 4) * gain * 1.41
    buf_l[i0:i0 + len(sig)] += sig * gl
    buf_r[i0:i0 + len(sig)] += sig * gr


def sfx(sig, t0, pan=0.0, gain=1.0):
    add(L, R, sig, t0, pan, gain)


def mus(sig, t0, pan=0.0, gain=1.0):
    add(ML, MR, sig, t0, pan, gain)


def fir_lp(fc, taps=255):
    n = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * fc / SR * n) * np.hamming(taps)
    return h / h.sum()


def lp(x, fc, taps=255):
    return np.convolve(x, fir_lp(fc, taps), mode='same')


def hp(x, fc, taps=255):
    return x - lp(x, fc, taps)


def bp(x, lo, hi, taps=255):
    return lp(hp(x, lo, taps), hi, taps)


def sweep_lp(x, f0, f1, block=2048):
    """block-wise lowpass whose cutoff moves exponentially f0->f1 (overlap-add)."""
    out = np.zeros(len(x) + block)
    hop = block // 2
    win = np.hanning(block)
    nb = max(1, (len(x) - block) // hop + 2)
    xp = np.concatenate([x, np.zeros(block * 2)])
    for b in range(nb):
        s = b * hop
        fc = f0 * (f1 / f0) ** min(1, s / max(1, len(x)))
        seg = xp[s:s + block] * win
        out[s:s + block] += np.convolve(seg, fir_lp(fc, 127), mode='same')
    return out[:len(x)]


def env_exp(n, decay):
    return np.exp(-tt(n) / decay)


def adsr(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def saw(freq, n, phase=0.0):
    ph = (phase + np.cumsum(np.full(n, freq) if np.isscalar(freq) else freq) / SR) % 1.0
    return 2 * ph - 1


def supersaw(freq, n, voices=5, det=0.012):
    s = np.zeros(n)
    for v in range(voices):
        d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * det
        s += saw(freq * (1 + d), n, rng.random())
    return s / voices


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ instruments
def kick(gain=1.0, length=0.45):
    n = int(length * SR); t = tt(n)
    f = 45 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.22)
    s += 0.5 * hp(rng.standard_normal(n), 2000) * np.exp(-t / 0.004)
    return np.tanh(s * 1.6) * gain


def clap(gain=1.0):
    n = int(0.35 * SR); t = tt(n)
    nz = bp(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for k, d in enumerate([0, 0.011, 0.022]):
        i = int(d * SR); e[i:] += np.exp(-(t[: n - i]) / 0.008) * (0.8 if k < 2 else 1)
    e += 0.5 * np.exp(-t / 0.12) * (t > 0.022)
    return nz * e * gain * 0.9


def hat(open_=False, gain=1.0):
    n = int((0.25 if open_ else 0.05) * SR); t = tt(n)
    s = hp(rng.standard_normal(n), 7000, 127) * np.exp(-t / (0.09 if open_ else 0.012))
    return s * gain


def sub808(freq, length, gain=1.0):
    n = int(length * SR); t = tt(n)
    f = freq * (1 + 0.6 * np.exp(-t / 0.03))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    s = np.tanh(s * 2.2) * adsr(n, 0.003, 0.06) * (0.6 + 0.4 * np.exp(-t / 0.5))
    return s * gain


def stab(midis, length, cutoff=2600, gain=1.0):
    n = int(length * SR)
    s = sum(supersaw(note(m), n) for m in midis) / len(midis)
    s = lp(s, cutoff, 127) * adsr(n, 0.004, 0.08) * np.exp(-tt(n) / (length * 0.8))
    return s * gain


def pad(midis, length, gain=1.0):
    n = int(length * SR)
    s = sum(supersaw(note(m), n, 7, 0.008) for m in midis) / len(midis)
    return s * adsr(n, 0.4, 0.5) * gain


def pluck(m, length=0.22, gain=1.0):
    n = int(length * SR); t = tt(n)
    s = saw(note(m), n) * 0.6 + np.sign(np.sin(2 * np.pi * note(m) * t)) * 0.25
    s = lp(s, 4500, 63) * np.exp(-t / 0.08) * adsr(n, 0.002, 0.03)
    return s * gain


def noise_riser(length, f0=300, f1=9000, gain=1.0):
    n = int(length * SR); t = tt(n)
    s = sweep_lp(rng.standard_normal(n), f0, f1) * (t / length) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(200 * (8 ** (t / length))) / SR) * (t / length) ** 3 * 0.3
    return (s * 0.7 + tone) * gain


def crash(gain=1.0, length=2.2):
    n = int(length * SR); t = tt(n)
    return hp(rng.standard_normal(n), 4000, 127) * np.exp(-t / 0.6) * gain * 0.5


def boom(gain=1.0, length=1.6, f0=90, f1=30):
    n = int(length * SR); t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5)
    s += lp(rng.standard_normal(n), 1800, 127) * np.exp(-t / 0.15) * 0.5
    return np.tanh(s * 1.5) * gain


# ------------------------------------------------------------------ music
PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G
ROOTS = [33, 29, 36, 31]                                       # A1 F1 C2 G1 (midi)


def chord_at(t):
    return int((t // BAR) % 4)


def section(t):
    if t < 3.55: return 'intro'
    if t < 8: return 'build'
    if t < 32: return 'A'
    if t < 42: return 'B'
    if t < 50: return 'break'
    if t < 52: return 'rise'
    if t < 55.5: return 'roll'
    if t < 56: return 'silence'
    if t < 67: return 'C'
    return 'outro'


# pads under intro/build/break/outro
for b in range(35):
    t0 = b * BAR; sec = section(t0 + 0.01)
    ci = chord_at(t0)
    if sec in ('intro', 'build'):
        p = pad([m - 12 for m in PROG[ci]] + [PROG[ci][0]], BAR + 0.4, 0.22)
        p = sweep_lp(p, 300 + t0 * 150, 400 + t0 * 300)
        mus(p, t0, 0, 1)
        mus(sub808(note(ROOTS[ci]), BAR, 0.25) * 0.6, t0)
    if sec in ('break', 'rise'):
        p = pad(PROG[ci] + [PROG[ci][0] + 12], BAR + 0.4, 0.2)
        mus(lp(p, 1400 if sec == 'break' else 2600, 127), t0)
        mus(sub808(note(ROOTS[ci]), BAR - 0.05, 0.5), t0)
    if t0 >= 66 and t0 < 70:
        p = pad(PROG[0] + [69], 4.0, 0.22)
        mus(lp(p, 1800, 127) * np.linspace(1, 0, len(p)) ** 1.5, 68.0)
        break

# drums / bass / stabs per 16th
for step in range(int(DUR / (BEAT / 4))):
    t = step * BEAT / 4
    sec = section(t)
    s16 = step % 16           # position within bar (16 per bar? 4 per beat * 4 beats = 16 -> bar = 2s)
    beat_pos = step % 4
    ci = chord_at(t)
    full = sec in ('A', 'B', 'C')
    if sec == 'build' and t >= 4.0 and beat_pos == 0 and t < 7.9:
        mus(lp(kick(0.7), 900, 127), t)
    if full:
        if beat_pos == 0: mus(kick(1.0), t)
        if s16 in (4, 12): mus(clap(0.7), t, 0.05)
        if beat_pos == 2: mus(hat(True, 0.22), t, 0.25)
        if beat_pos in (1, 3): mus(hat(False, 0.18 if sec != 'A' else 0.14), t, -0.2)
        # 808 pattern
        if s16 in (0, 3, 6, 10, 11, 14):
            ln = 0.42 if s16 in (0, 6, 10) else 0.2
            mus(sub808(note(ROOTS[ci] + (12 if s16 == 11 else 0)), ln, 0.75), t)
        # stabs on offbeats
        if s16 in (2, 6, 10, 14) or (sec != 'A' and s16 in (7, 15)):
            mus(stab(PROG[ci], 0.24, 2200 if sec == 'A' else 4200, 0.28), t, 0.3 if s16 % 8 == 2 else -0.3)
        # lead arpeggio in B and C
        if sec in ('B', 'C') and step % 2 == 0:
            tones = PROG[ci] + [PROG[ci][0] + 12]
            seq = [0, 2, 1, 3, 2, 1, 3, 0]
            m = tones[seq[(step // 2) % 8]] + 12
            pl = pluck(m, 0.22, 0.2)
            mus(pl, t, -0.35 if (step // 2) % 2 else 0.35)
            mus(pl * 0.35, t + 0.375, 0.6 if (step // 2) % 2 else -0.6)    # dotted-8th echo
    if sec == 'break' and beat_pos == 2:
        mus(hat(False, 0.08), t, 0.3)
    if sec == 'rise':
        if beat_pos == 0: mus(kick(0.8), t)
        if beat_pos == 2: mus(hat(True, 0.15), t)
    if sec == 'roll':
        # snare roll accelerating 8th -> 16th -> 32nd
        if t < 53.5 and beat_pos % 2 == 0: mus(clap(0.35 + (t - 52) * 0.1), t)
        elif 53.5 <= t < 54.75: mus(clap(0.45 + (t - 52) * 0.08), t)
        if beat_pos == 0: mus(kick(0.85), t)
# 32nd roll 54.75-55.5 and build roll 6-8
for k in range(int(0.75 / (BEAT / 8))):
    mus(clap(0.6 + k * 0.02), 54.75 + k * BEAT / 8)
for k in range(16):
    tk = 6.0 + k * (BEAT / 2 if k < 8 else BEAT / 4)
    if tk < 7.9: mus(lp(clap(0.25 + k * 0.03), 3000, 127), tk)
for k in range(8):
    mus(lp(clap(0.6), 3000, 127), 7.0 + k * BEAT / 8 + 0.0) if 7.0 + k * BEAT / 8 < 7.92 else None

# risers
mus(noise_riser(1.55, 300, 7000, 0.35), 2.0)
mus(noise_riser(2.0, 400, 9000, 0.4), 6.0)
mus(noise_riser(3.5, 300, 11000, 0.5), 52.0)
mus(noise_riser(1.8, 300, 8000, 0.25), 30.2)
mus(noise_riser(1.0, 500, 9000, 0.35), 67.0)

# silence gap 55.5-56 and pre-drop cut 7.92-8.0
for a, b in [(55.5, 56.0), (7.92, 8.0)]:
    i0, i1 = int(a * SR), int(b * SR)
    fade = int(0.01 * SR)
    ML[i0:i0 + fade] *= np.linspace(1, 0, fade); MR[i0:i0 + fade] *= np.linspace(1, 0, fade)
    ML[i0 + fade:i1] = 0; MR[i0 + fade:i1] = 0

# ------------------------------------------------------------------ SFX from timeline
events = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'events.json'))
for e in events:
    t, k, v = e['t'], e['type'], e.get('v', 1)
    pan = float(rng.uniform(-0.3, 0.3))
    if k == 'key':
        n = int(0.03 * SR); tt_ = tt(n)
        s = hp(rng.standard_normal(n), 2500, 63) * np.exp(-tt_ / 0.004) + 0.3 * np.sin(2 * np.pi * (1800 + rng.random() * 900) * tt_) * np.exp(-tt_ / 0.006)
        sfx(s, t, pan, 0.35 * v)
    elif k == 'enter':
        n = int(0.06 * SR); s = hp(rng.standard_normal(n), 1500, 63) * np.exp(-tt(n) / 0.008)
        sfx(s, t, 0, 0.5); sfx(boom(0.6, 1.2, 120, 40), t); sfx(crash(0.25, 1.5), t)
    elif k in ('impact',):
        sfx(boom(0.7 * v), t); sfx(crash(0.3), t, 0.2)
    elif k in ('drop1', 'drop'):
        sfx(boom(1.0, 2.0, 110, 28), t); sfx(crash(0.55, 2.8), t, -0.2); sfx(crash(0.45, 2.8), t, 0.2)
    elif k == 'final':
        sfx(boom(1.0, 2.2, 100, 26), t); sfx(crash(0.5, 2.0), t)
        n = int(1.8 * SR); tl = tt(n)
        bell = sum(np.sin(2 * np.pi * note(m) * tl) for m in (69, 76, 81)) / 3 * np.exp(-tl / 0.7)
        sfx(bell, t, 0, 0.18)
    elif k in ('whoosh', 'whoosh2'):
        ln = 0.55 if k == 'whoosh' else 0.5
        n = int(ln * SR); tl = tt(n)
        nz = rng.standard_normal(n)
        s = sweep_lp(nz, 400, 6000) if k == 'whoosh2' else sweep_lp(nz[::-1], 6000, 500)
        envw = np.sin(np.pi * tl / ln) ** 2
        p0 = -0.8 if rng.random() > 0.5 else 0.8
        st = t - (ln if k == 'whoosh2' else 0.15)
        nh = n // 2
        sfx(s[:nh] * envw[:nh], st, p0, 0.45 * v); sfx(s[nh:] * envw[nh:], st + nh / SR, -p0, 0.45 * v)
    elif k == 'glitch':
        n = int(0.45 * SR); tl = tt(n)
        s = np.sign(np.sin(2 * np.pi * (200 + 1800 * (np.floor(tl * 40) % 5) / 5) * tl))
        s *= (np.floor(tl * 60) % 3 != 0) * np.exp(-tl / 0.3)
        s = np.round(s * 4) / 4 + 0.3 * rng.standard_normal(n) * (np.floor(tl * 30) % 2)
        sfx(lp(s, 6000, 63), t, 0, 0.22)
    elif k == 'tick':
        n = int(0.02 * SR); tl = tt(n)
        sfx(np.sin(2 * np.pi * 3200 * tl) * np.exp(-tl / 0.004), t, pan, 0.25 * v)
    elif k == 'blip':
        n = int(0.09 * SR); tl = tt(n)
        f = 1400 + 900 * tl / 0.09
        sfx(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tl / 0.03), t, pan, 0.22 * v)
    elif k == 'ding':
        n = int(0.9 * SR); tl = tt(n)
        s = (np.sin(2 * np.pi * 1318.5 * tl) + 0.6 * np.sin(2 * np.pi * 1975.5 * tl)) * np.exp(-tl / 0.25)
        sfx(s, t, 0.2, 0.18)
    elif k == 'scan':
        n = int(0.95 * SR); tl = tt(n)
        f = 500 * (5 ** (tl / 0.95))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + 0.3 * np.sign(np.sin(2 * np.pi * 60 * tl)) * hp(rng.standard_normal(n), 3000, 63)
        sfx(s * adsr(n, 0.02, 0.1), t, 0, 0.16)
    elif k == 'granted':
        for i, m in enumerate((84, 88, 91, 96)):
            n = int(0.35 * SR); tl = tt(n)
            sfx(np.sin(2 * np.pi * note(m) * tl) * np.exp(-tl / 0.12), t + i * 0.06, (i - 1.5) * 0.3, 0.16)
    elif k == 'bonus':
        for i, m in enumerate((72, 76, 79, 84, 88, 91)):
            n = int(0.12 * SR); tl = tt(n)
            s = np.sign(np.sin(2 * np.pi * note(m) * tl)) * np.exp(-tl / 0.05)
            sfx(lp(s, 7000, 63), t + i * 0.045, 0, 0.12)
        sfx(boom(0.5, 1.0, 140, 50), t)
    elif k == 'notify':
        for i, m in enumerate((88, 95)):
            n = int(0.5 * SR); tl = tt(n)
            sfx((np.sin(2 * np.pi * note(m) * tl) + 0.3 * np.sin(4 * np.pi * note(m) * tl)) * np.exp(-tl / 0.18), t + i * 0.13, 0.25, 0.2)
    elif k == 'hit':
        sfx(kick(1.0 * v, 0.5), t); sfx(clap(0.5 * v), t); sfx(boom(0.35, 0.8, 160, 60), t, (rng.random() - .5) * 0.6)

# ------------------------------------------------------------------ reverb + mix
def reverb(x, length=2.2, mix=0.18):
    n = int(length * SR)
    ir = rng.standard_normal(n) * np.exp(-tt(n) / (length / 5))
    ir = lp(ir, 6000, 63); ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x + y * mix


# sidechain-like ducking of music on SFX booms: duck music where sfx energy is high (gentle)
env_s = np.convolve(np.abs(L) + np.abs(R), np.ones(2400) / 2400, mode='same')
duck = 1 / (1 + 1.2 * env_s)
ML *= duck; MR *= duck

ML = reverb(ML, 1.6, 0.12); MR = reverb(MR, 1.7, 0.12)
L = reverb(L, 2.0, 0.2); R = reverb(R, 2.1, 0.2)
outL = ML * 0.8 + L
outR = MR * 0.8 + R
# fade out last 0.4 s, gentle limiter
fo = int(0.4 * SR)
outL[-fo:] *= np.linspace(1, 0, fo); outR[-fo:] *= np.linspace(1, 0, fo)
peak = max(np.abs(outL).max(), np.abs(outR).max())
outL /= peak; outR /= peak
outL = np.tanh(outL * 1.4) / np.tanh(1.4); outR = np.tanh(outR * 1.4) / np.tanh(1.4)
st = np.stack([outL, outR], 1) * 0.95
with wave.open(sys.argv[2] if len(sys.argv) > 2 else 'audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print('ok', peak)
