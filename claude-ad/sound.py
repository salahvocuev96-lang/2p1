# Music + sound design for claude_spot.mp4 — fully synthesised (no samples, no licences).
# Structure follows the picture: spark arp intro -> groove A ("Bring your") -> build (grid) ->
# DROP on earth zoom (6.72) -> tape-stop (carousel collapse) -> marimba breakdown (text morph) ->
# brass-stab montage -> suck-in -> resolved logo chord.
# usage: python3 sound.py out.wav
import sys, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000; DUR = 15.0; N = int(SR * DUR)
rng = np.random.default_rng(11)
BUS = {k: np.zeros((N, 2)) for k in ('drums', 'bass', 'music', 'lead', 'fx', 'verb')}
DUCK = np.ones(N)

def T(d): return np.arange(int(SR * d)) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def st2(sig, pan=0.0, width=0.0):
    if sig.ndim == 2: return sig
    l = sig * np.sqrt((1 - pan) / 2) * 1.414; r = sig * np.sqrt((1 + pan) / 2) * 1.414
    if width:
        d = int(width * SR / 1000); r = np.concatenate([np.zeros(d), r[:-d]]) if d else r
    return np.stack([l, r], 1)
def add(bus, t0, sig, g=1.0, pan=0.0, verb=0.0, width=0.0):
    s = st2(sig, pan, width) * g; i = int(round(t0 * SR))
    if i < 0: s = s[-i:]; i = 0
    j = min(N, i + len(s))
    if j <= i: return
    BUS[bus][i:j] += s[:j - i]
    if verb: BUS['verb'][i:j] += s[:j - i] * verb
def sos(kind, f, o=2): return butter(o, f, kind, fs=SR, output='sos')
def lp(x, f, o=2): return sosfilt(sos('low', min(f, SR / 2.2), o), x, axis=0)
def hp(x, f, o=2): return sosfilt(sos('high', f, o), x, axis=0)
def bp(x, a, b, o=2): return sosfilt(sos('band', [a, min(b, SR / 2.2)], o), x, axis=0)
def noise(d): return rng.standard_normal(int(SR * d))
def sweep_lp(x, f0, f1, curve=2.0, blk=256):   # time-varying lowpass (blockwise, state carried)
    out = np.zeros_like(x); n = len(x); zi = None
    for a in range(0, n, blk):
        p = (a / n) ** curve; f = f0 * (f1 / f0) ** p
        s = sos('low', min(f, SR / 2.2), 2)
        if zi is None: zi = np.zeros((s.shape[0], 2) + x.shape[1:])
        out[a:a + blk], zi = sosfilt(s, x[a:a + blk], axis=0, zi=zi)
    return out
def env_adsr(n_t, a, d, s, r, dur):
    t = n_t; e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((t - dur) / max(r, 1e-4), 0, 1); return e * (1 - rel)
def saw(f, t, det=0.0): ph = f * 2 ** (det / 12) * t + rng.random(); return 2 * (ph % 1) - 1
def supersaw(freqs, d, voices=5, spread=.16):
    t = T(d); L = np.zeros_like(t); R = np.zeros_like(t)
    for f in freqs:
        for v in range(voices):
            det = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            s = saw(f, t, det); pan = (v - (voices - 1) / 2) / voices
            L += s * (1 - pan); R += s * (1 + pan)
    return np.stack([L, R], 1) / (len(freqs) * voices)

# ------------------------------ instruments ------------------------------
def kick(d=.45, punch=1.0):
    t = T(d); f = 44 + 150 * np.exp(-t * 38) + 900 * np.exp(-t * 400)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    s += bp(noise(d), 2000, 8000) * np.exp(-t * 300) * .25 * punch
    return np.tanh(s * 1.8) * .9
def sub808(f, d):
    t = T(d); fr = f * (1 + .6 * np.exp(-t * 30)); s = np.sin(2 * np.pi * np.cumsum(fr) / SR)
    return np.tanh(s * 2.0) * np.exp(-t * 1.6) * np.minimum(1, t / .003)
def clap(d=.32):
    t = T(d); n = bp(noise(d), 900, 5000)
    e = sum(np.exp(-np.clip(t - k * .011, 0, None) * 140) * (t >= k * .011) for k in range(4))
    e += np.exp(-np.clip(t - .033, 0, None) * 18) * (t >= .033) * .55
    return n * e * .8
def hat(d=.05, open_=False):
    d = .26 if open_ else d; t = T(d)
    m = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (3140, 4410, 5230, 6730, 8120)) / 5
    s = lp(hp(m * .3 + noise(d) * .7, 7000, 3), 13000, 2); return s * np.exp(-t * (11 if open_ else 75)) * .8
def shaker(d=.07):
    t = T(d); return hp(noise(d), 5500, 2) * (np.minimum(1, t / .012)) * np.exp(-t * 55)
def snare(d=.22):
    t = T(d); body = np.sin(2 * np.pi * np.cumsum(185 + 60 * np.exp(-t * 40)) / SR) * np.exp(-t * 25)
    return body * .6 + bp(noise(d), 1500, 9000) * np.exp(-t * 22) * .8
def tom(f, d=.4):
    t = T(d); fr = f * (1 + .9 * np.exp(-t * 18)); return np.tanh(1.5 * np.sin(2 * np.pi * np.cumsum(fr) / SR)) * np.exp(-t * 8)
def bass_pluck(f, d):
    t = T(d); s = saw(f, t) * .6 + saw(f, t, .08) * .4 + np.sin(2 * np.pi * f / 2 * t) * .8
    cut = 180 + 1500 * np.exp(-t * 22)
    x = np.zeros_like(s); y = 0; a = 1 - np.exp(-2 * np.pi * cut / SR)
    for i in range(len(s)): y += a[i] * (s[i] - y); x[i] = y
    return np.tanh(x * 1.6) * env_adsr(t, .003, .12, .55, .04, d - .04)
def stab(chord, d=.22, bright=4500):
    s = supersaw([hz(m) for m in chord], d, 5, .14); t = T(d)
    e = env_adsr(t, .002, .09, .25, .05, d - .05)[:, None]
    return lp(s * e, bright) * 1.6
def pad(chord, d, cut=1600):
    s = supersaw([hz(m) for m in chord], d, 5, .2); t = T(d)
    e = (np.minimum(1, t / .35) * np.minimum(1, (d - t) / .4))[:, None]
    return lp(s * e, cut, 2) * 1.3
def fm(f, d, ratio, index, decay, idecay=None, att=.002):
    t = T(d); idecay = idecay or decay * 1.5
    mod = index * np.exp(-t * idecay) * np.sin(2 * np.pi * f * ratio * t)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * decay) * np.minimum(1, t / att)
def pluck(m, d=.5, b=1.0): f = hz(m); return fm(f, d, 2.0, 2.2 * b, 7) * .7 + fm(f * 2, d, 1.0, .8, 12) * .25
def marimba(m, d=.5): f = hz(m); return fm(f, d, 4.0, 2.6, 9, 40) * .8 + np.sin(2 * np.pi * f * T(d)) * np.exp(-T(d) * 6) * .3
def bell(m, d=2.2): f = hz(m); return fm(f, d, 3.5, 3.0, 2.2, 5) * .6 + fm(f * 2.01, d, 1.41, 1.2, 3.5) * .3
def glass(m, d=.18): f = hz(m); return fm(f, d, 7.0, 1.5, 28, 60)
def lead(m, d):
    t = T(d); f = hz(m) * (1 + .004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / .15))
    s = supersaw([hz(m)], d, 7, .12)[:, 0] * .55 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .5
    return lp(s * env_adsr(t, .004, .18, .6, .06, d - .06), 5200)
def brass(chord, d=.42, drop=0.0):
    t = T(d); out = np.zeros((len(t), 2))
    for m in chord:
        f = hz(m) * (1 - drop * np.minimum(1, t / d) ** 2)
        for v, det in enumerate((-.1, 0, .1)):
            ph = np.cumsum(f * 2 ** (det / 12)) / SR + rng.random(); s = 2 * (ph % 1) - 1
            out[:, v % 2] += s; out[:, 1 - v % 2] += s * .6
    cut = 800 + 5200 * np.exp(-t * 9)
    out = np.tanh(out / len(chord) * 1.8)
    e = env_adsr(t, .006, .14, .35, .08, d - .08)[:, None]
    # crude time-varying lowpass via two-band crossfade
    lo = lp(out, 900); hi = lp(out, 6000); w = ((cut - 800) / 5200)[:, None]
    return (lo * (1 - w) + hi * w) * e * 1.3
def riser(d, f0=200, f1=4000, tone=True):
    t = T(d); p = t / d
    n = sweep_lp(bp(noise(d), 300, 12000), f0, f1 * 2, 1.6)
    s = n * p ** 2.2
    if tone: s += np.sin(2 * np.pi * np.cumsum(hz(53) * 2 ** (p * 2.0 * 12 / 12)) / SR) * p ** 3 * .25
    f = int(.015 * SR); s[-f:] *= np.linspace(1, 0, f)
    return s
def boom(d=2.0, f=38):
    t = T(d); fr = f + 70 * np.exp(-t * 14)
    return np.tanh(2.5 * np.sin(2 * np.pi * np.cumsum(fr) / SR)) * np.exp(-t * 2.2) + lp(noise(d), 1800) * np.exp(-t * 9) * .5
def tick(f=3500, d=.02): t = T(d); return np.sin(2 * np.pi * f * t) * np.exp(-t * 260) + hp(noise(d), 4000) * np.exp(-t * 500) * .3
def swish(d, f0, f1):   # short air movement (used sparingly)
    return sweep_lp(hp(noise(d), 300), f0, f1, 1.0) * np.sin(np.pi * T(d) / d) ** 1.2
def rev_tail(sig, d=.45):  # reverse reverb "suck"
    s = st2(sig) if sig.ndim == 1 else sig
    w = fftconvolve(s, IR[:int(SR * d)], axes=0)[:int(SR * d)]
    w = w[::-1] * np.linspace(0, 1, len(w))[:, None] ** 1.5
    return w / (np.max(np.abs(w)) + 1e-9)

# reverb IR (stereo, 2.2 s, darkening)
_t = T(2.2); IR = np.stack([noise(2.2), noise(2.2)], 1) * np.exp(-_t * 3.0)[:, None]
IR = lp(IR, 7000); IR[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))[:, None]; IR /= np.sqrt(np.sum(IR ** 2))

# ------------------------------ harmony / grid ------------------------------
# key: F major (lydian colour)
CH = {'F': [53, 57, 60, 64, 67], 'Dm': [50, 53, 57, 60, 64], 'Bb': [46, 50, 53, 57, 64],
      'C': [48, 55, 57, 60, 62], 'Gm7': [55, 58, 62, 65, 69], 'Fadd9': [41, 53, 60, 65, 67, 69, 72]}
ROOT = {'F': 29, 'Dm': 26, 'Bb': 34, 'C': 24, 'Gm7': 31}
G0 = 0.98; BEAT = (6.72 - G0) / 12      # 12 beats from "Bring your" to the drop -> ~125.4 bpm
def beat(n): return G0 + n * BEAT

# ------------------------------ 0–1.0 intro: spark ------------------------------
RAYS = [60, 64, 65, 67, 69, 72, 74, 76, 77, 79, 81, 84]     # rays play an ascending Fmaj9/lydian run
for k, m in enumerate(RAYS):
    add('lead', .04 + k * .026, pluck(m, .6, .8), .30, pan=np.sin(k * 1.9) * .55, verb=.35)
    add('fx', .04 + k * .026, tick(3000 + k * 160), .10, pan=np.sin(k * 1.9) * .6)
add('music', 0.0, pad(CH['F'], 1.05, 700), .25, verb=.3)
add('fx', 0.48, riser(.50, 300, 9000), .55, width=8)

# ------------------------------ groove A: 0.98 – 4.80 ------------------------------
prog = ['F', 'F', 'Dm', 'Dm', 'Bb', 'Bb', 'C', 'C']   # 2 beats each over 8 beats (0..7), then build bar (8..11) on C
for n in range(8):
    t0 = beat(n); c = prog[n]
    add('drums', t0, kick(), .95); DUCK[int(t0 * SR):int(t0 * SR) + int(.25 * SR)] = np.minimum(DUCK[int(t0 * SR):int(t0 * SR) + int(.25 * SR)], np.linspace(.35, 1, int(.25 * SR)))
    if n % 2 == 1: add('drums', t0, clap(), .55, verb=.18)
    add('drums', t0 + BEAT / 2, hat(open_=(n % 2 == 1)), .28, pan=.2)
    for k in range(4): add('drums', t0 + k * BEAT / 4 + (BEAT * .06 if k % 2 else 0), shaker(), .16 + .06 * (k == 2), pan=-.35)
    # offbeat house bass + syncopated stabs
    add('bass', t0 + BEAT / 2, bass_pluck(hz(ROOT[c] + 12), BEAT * .45), .55)
    if n % 2 == 1: add('bass', t0 + BEAT * .75, bass_pluck(hz(ROOT[c] + 24), BEAT * .22), .35)
    add('music', t0 + BEAT / 2, stab([m + 12 for m in CH[c][1:]], .2, 3800 + n * 250), .22, verb=.25)
    if n % 2 == 0: add('music', t0 + BEAT * .25 * 3.5, stab([m + 12 for m in CH[c][1:]], .12, 3000), .12, verb=.25)
    add('music', t0, pad(CH[c], BEAT * 1.02, 1100), .10)
# word swaps = rising melodic "chops" on the exact cut frames
WORDS = [1.18, 1.86, 2.44, 2.96, 3.42, 3.84, 4.22, 4.58]
CHOP = [69, 72, 74, 77, 79, 81, 84, 86]
for k, (w, m) in enumerate(zip(WORDS, CHOP)):
    add('lead', w, pluck(m, .45, 1.2), .34, pan=.25 * (-1) ** k, verb=.3)
    add('lead', w, marimba(m - 12, .35), .22, pan=-.2 * (-1) ** k)
add('fx', 1.40, glass(96), .18, .5, verb=.4)       # mini spark on apple
add('fx', 2.25, swish(.18, 3000, 600), .12, .4)    # compass spin-in air
add('fx', 3.47, glass(91), .12, -.3, verb=.3)      # jar bubbles
add('fx', 3.52, glass(95), .10, -.2, verb=.3)

# ------------------------------ build: 4.80 – 6.72 ------------------------------
# beats 8..11 on C: kick on every beat, snare roll accelerating, music filter opens, glass ticks on grid
build = np.zeros((int(SR * (6.72 - beat(8))), 2))
for n in range(8, 12):
    t0 = beat(n); add('drums', t0, kick(punch=1.3), .9)
    add('bass', t0 + BEAT / 2, bass_pluck(hz(ROOT['C'] + 12), BEAT * .45), .5)
rolls = []; tt = beat(8); step = BEAT / 2
while tt < 6.60:
    rolls.append(tt); tt += step; step = max(BEAT / 8, step * .86)
for i, tt in enumerate(rolls):
    add('drums', tt, snare(), .16 + .36 * (i / len(rolls)) ** 1.5, verb=.15)
add('music', beat(8), sweep_lp(supersaw([hz(m) for m in CH['C']], 6.62 - beat(8), 7, .22), 400, 9000, 1.8) * .55, 1.0, verb=.25)
add('fx', 5.0, riser(1.62, 200, 11000), .55, width=10)
for c in range(5):                                   # grid tiles: 14 glass ticks on a pentatonic
    for r in range(3):
        if (c, r) == (2, 1): continue
        dist = np.hypot(c - 2, r - 1); m = [84, 86, 89, 91, 93, 96][int(dist * 2.2) % 6]
        add('fx', 5.44 + dist * .05, glass(m), .16, pan=(c - 2) * .35, verb=.3)
add('fx', 5.40, swish(.3, 4000, 900), .14, -.3)       # collage leaves
# 6.62–6.72: everything drops out for a breath (handled by gating below) then...

# ------------------------------ DROP: 6.72 – 8.60 ------------------------------
add('drums', 6.72, boom(2.2, 36), .9)
add('fx', 6.72, hp(noise(1.6), 3000) * np.exp(-T(1.6) * 2.4) * .5, .5, verb=.6, width=12)   # crash wash
dprog = ['F', 'F', 'Bb', 'Bb']
for n in range(4):
    t0 = 6.72 + n * BEAT; c = dprog[n]
    add('drums', t0, kick(punch=1.2), 1.0); DUCK[int(t0 * SR):int(t0 * SR) + int(.25 * SR)] = np.minimum(DUCK[int(t0 * SR):int(t0 * SR) + int(.25 * SR)], np.linspace(.3, 1, int(.25 * SR)))
    if n % 2 == 1: add('drums', t0, clap(), .6, verb=.2)
    for k in range(4): add('drums', t0 + k * BEAT / 4, hat(), .2 + .1 * (k == 2), pan=.25)
    add('bass', t0, sub808(hz(ROOT[c]), BEAT), .6)
    add('music', t0, pad([m + 12 for m in CH[c]], BEAT * 1.05, 2600), .22, verb=.3)
HOOK = [(0, 81, .5), (.5, 84, .5), (1.0, 79, .25), (1.25, 77, .25), (1.5, 81, .5), (2.0, 89, .75), (2.75, 88, .25), (3.0, 86, .5)]
for b, m, l in HOOK:
    add('lead', 6.72 + b * BEAT, lead(m, l * BEAT + .05), .22, verb=.35, width=9)
# earth ring paint + spark
add('fx', 7.02, glass(98), .16, .5, verb=.5)
add('fx', 7.55, swish(.3, 5000, 700), .12)             # earth shrinks to a card
# carousel: ratchet ticks as cards pass the front, pitched up the scale
def spin_angle(t):
    p = np.clip((t - 7.95) / .97, 0, 1); e = 4 * p ** 3 if p < .5 else 1 - (-2 * p + 2) ** 3 / 2
    return (360 + 360 / 14) * e
last = 0; SC = [72, 74, 76, 77, 79, 81, 84, 86, 88, 89, 91, 93, 96, 98, 100]
for tt in np.arange(7.95, 8.6, 1 / 2000):
    n = int(spin_angle(tt) // (360 / 14))
    if n > last: last = n; add('fx', tt, glass(SC[min(n, 14)], .1), .12, pan=.4 * np.sin(n), verb=.2)

# ------------------------------ breakdown: 8.90 – 10.70 ------------------------------
add('music', 8.88, pad(CH['Dm'], 1.0, 1200), .2, verb=.5)
add('music', 9.80, pad(CH['Bb'], 1.0, 1300), .2, verb=.5)
for i in range(14):                                     # "from a thought" letters: marimba run
    add('lead', 8.9 + i * .018, marimba([74, 77, 81, 84][i % 4] - 12 + (i // 4) * 0, .4), .13, pan=-.5 + i * .07, verb=.25)
add('lead', 9.50, marimba(69, .6), .2, verb=.3)         # morph begins
add('fx', 9.52, swish(.42, 900, 3500) * .8, .10, .2)   # letters slide
for k, m in enumerate([72, 76, 79]): add('lead', 9.74 + k * .05, marimba(m, .5), .18, pan=(k - 1) * .4, verb=.3)
add('fx', 10.0, bell(89, 2.0), .26, .1, verb=.6)        # spark on the "i"
add('fx', 10.02, sweep_lp(hp(noise(.32), 1500), 2000, 7000, 1) * np.sin(np.pi * T(.32) / .32) * .4, .3, .2)  # brush underline
add('music', 10.36, riser(.38, 400, 9000, tone=False), .35, width=8)                # into montage

# ------------------------------ montage: 10.74 – 12.24 ------------------------------
MB = [10.74, 11.14, 11.52, 11.88]
MC = [CH['Bb'], CH['C'], CH['Dm'], CH['Gm7']]
for k, (b, c) in enumerate(zip(MB, MC)):
    add('music', b, brass([m + 12 for m in c[1:4]], .42), .42, verb=.35, width=8)
    add('drums', b, kick(punch=1.4), .95); add('drums', b, tom(hz(45 + k * 3)), .5, pan=(-.3, .3)[k % 2])
    add('bass', b, sub808(hz(ROOT['Bb' if k == 0 else 'C' if k == 1 else 'Dm' if k == 2 else 'Gm7']), .38), .55)
    add('drums', b + .2, clap(), .35, verb=.25)
    for j in range(4): add('drums', b + j * .1, hat(), .16, pan=.3)
# collapse to dot: reverse-reverb suck into silence, then logo
add('fx', 12.24, rev_tail(brass([65, 69, 72], .3), .34), .45)

# ------------------------------ logo: 12.60 – 15 ------------------------------
add('drums', 12.60, boom(2.4, 34), 1.0)
add('music', 12.60, pad(CH['Fadd9'], 2.4, 2200), .38, verb=.6, width=10)
add('bass', 12.60, sub808(hz(29), 2.4), .55)
for k, m in enumerate([77, 81, 84, 89]):               # motif answers on bells
    add('lead', 12.62 + k * .09, bell(m, 2.2), .2, pan=(k - 1.5) * .35, verb=.6)
for k in range(12): add('fx', 12.6 + k * .014, tick(3000 + k * 150), .07, pan=np.sin(k * 2.1) * .7)
add('fx', 13.12, swish(.5, 2500, 8000) * .6, .08, .4)  # wordmark slide

# ------------------------------ mix ------------------------------
def gate(bus, a, b, fade=.008):               # silence a window (breaths before hits)
    i, j, f = int(a * SR), int(b * SR), int(fade * SR)
    BUS[bus][i:j] *= 0; BUS[bus][i - f:i] *= np.linspace(1, 0, f)[:, None]
for b in ('drums', 'bass', 'music', 'lead'):
    gate(b, 6.63, 6.715); gate(b, 12.50, 12.595)
# tape-stop on the musical buses as the carousel collapses (8.58 -> 8.88)
def tape_stop(a, b):
    i, j = int(a * SR), int(b * SR); n = j - i
    for k in ('drums', 'bass', 'music', 'lead'):
        x = BUS[k][i:i + n * 2].copy()
        sp = (1 - np.linspace(0, 1, n)) ** 1.4; pos = np.cumsum(sp)
        y = np.stack([np.interp(pos, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
        y *= np.linspace(1, 0, n)[:, None] ** .5
        BUS[k][i:j] = y; BUS[k][j:int(8.885 * SR)] = 0
tape_stop(8.58, 8.86)

music_side = (BUS['music'] + BUS['lead'] * .9 + BUS['bass']) * DUCK[:, None]
dry = BUS['drums'] * .95 + music_side + BUS['fx'] * .8
wet = fftconvolve(BUS['verb'] + BUS['fx'] * .15, IR, axes=0)[:N] * .55
mix = dry + hp(wet, 200)
mix = hp(mix, 28)
# gentle glue compression (RMS envelope) + soft clip
rms = np.sqrt(lp(np.mean(mix ** 2, 1), 12, 1).clip(1e-9))
gain = np.minimum(1, (0.22 / rms) ** 0.35)
mix *= gain[:, None]
f = int(.6 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= np.max(np.abs(mix)) / .9
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print('ok', round(BEAT * 1000, 1), 'ms/beat', round(60 / BEAT, 1), 'bpm')
