# Музыка (120 BPM) и звуковой дизайн, синхронные таймлайну из timeline.json.
# python3 gen_audio.py  ->  audio.wav (48 kHz, stereo, 16 bit)
import json, wave, numpy as np

SR = 48000
T = json.load(open('timeline.json'))
DUR = T['DUR']
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
BEAT = 0.5

def add(sig, t0, gain=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N: return
    if i0 < 0: sig = sig[-i0:]; i0 = 0
    n = min(len(sig), N - i0)
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i0:i0 + n] += sig[:n] * gain * l * 1.414
    R[i0:i0 + n] += sig[:n] * gain * r * 1.414

def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.005, r=None, k=6.0):
    t = tt(d); e = np.minimum(1, t / a) if a > 0 else np.ones_like(t)
    return e * np.exp(-t * k) if r is None else e * np.clip((d - t) / r, 0, 1)
def lp(x, a):  # однополюсный ФНЧ
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y
def lp_fast(x, cutoff):  # ФНЧ через FFT
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / cutoff) ** 4), len(x))
def bp_fast(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4) / np.sqrt(1 + (f / hi) ** 4), len(x))
def noise(d): return rng.standard_normal(int(d * SR))
def hz(n): return 440 * 2 ** ((n - 69) / 12)

# ---------- музыка ----------
CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 66]]  # Am7 Fmaj7 Cmaj7 G(#11)
def chord_at(t): return CHORDS[int(t // 2) % 4]

def pad_note(f, d):
    t = tt(d); s = np.zeros_like(t)
    for det in (-0.12, 0.0, 0.11):
        for h in range(1, 7):
            s += np.sin(2 * np.pi * f * (1 + det / 100 * h) * h * t + h) / h ** 1.6
    a = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6)
    return s * a * 0.05

def section_gain(t, name):
    g = {'pad': [(0, .55), (6, .6), (12, .7), (24, .8), (36, .9), (41, .7), (45, 0.0)],
         'arp': [(0, 0), (6, .5), (12, .55), (24, .6), (36, .45), (41, .6), (45, 0)],
         'bass': [(0, 0), (12, .8), (36, .5), (41, .9), (44.25, 0)],
         'kick': [(0, 0), (12, 1), (45, 0)],
         'clap': [(0, 0), (18, .8), (36, 0), (41, .7), (44.25, 0)]}[name]
    v = 0
    for t0, gg in g:
        if t >= t0: v = gg
    return v

# пэд: аккорд на такт с перекрытием
for bar in range(int(45 // 2) + 1):
    t0 = bar * 2.0
    if t0 >= 45: break
    gp = section_gain(t0, 'pad')
    d = min(2.6, 45.2 - t0)
    for i, n in enumerate(chord_at(t0)):
        add(pad_note(hz(n - 12 if i == 0 else n), d), t0, gp, pan=(i - 1.5) * .35)

# арпеджио-маримба на восьмые
def marimba(f, d=0.6):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 7) * np.minimum(1, t / .002)
pattern = [0, 2, 1, 3, 2, 1, 3, 2]
for k in range(int(45 / .25)):
    t0 = k * .25; g = section_gain(t0, 'arp')
    if g <= 0: continue
    ch = chord_at(t0); n = ch[pattern[k % 8]] + 12
    add(marimba(hz(n)), t0, .16 * g, pan=.5 * np.sin(k * .7))
    if t0 >= 12 and k % 2 == 1:  # неоновый пилообразный слой
        t = tt(.18); f = hz(n + 12)
        saw = 2 * ((f * t) % 1) - 1
        add(lp_fast(saw, 2500) * np.exp(-t * 18), t0, .05 * g, pan=-.4)

# бас
for k in range(int(45 / .25)):
    t0 = k * .25; g = section_gain(t0, 'bass')
    if g <= 0: continue
    if 36 <= t0 < 41 and k % 4: continue
    f = hz(chord_at(t0)[0] - 24 + (12 if k % 4 == 2 else 0))
    t = tt(.24)
    s = np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)
    add(s * np.minimum(1, t / .004) * np.exp(-t * 8), t0, .22 * g)

def kick():
    t = tt(.35); f = 45 + 80 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + .3 * noise(.35) * np.exp(-t * 200)
def clap():
    t = tt(.25); n = bp_fast(noise(.25), 900, 5000)
    e = np.exp(-t * 22) + .6 * np.exp(-np.maximum(t - .012, 0) * 40) * (t > .012)
    return n * e / 3
def tick():  # часовой тик
    t = tt(.03)
    return (np.sin(2 * np.pi * 3200 * t) * .5 + bp_fast(noise(.03), 3000, 9000) / 2.5) * np.exp(-t * 260)
def hat():
    t = tt(.06); return bp_fast(noise(.06), 7000, 15000) / 2 * np.exp(-t * 90)

for k in range(int(DUR / BEAT)):
    t0 = k * BEAT
    if t0 < 45: add(tick(), t0, .22 if t0 < 12 else .14, pan=.3)
    g = section_gain(t0, 'kick')
    if g > 0:
        if 12 <= t0 < 18 and k % 2: pass
        elif 36 <= t0 < 41 and k % 4: pass
        else: add(kick(), t0, .55 * g)
    gc = section_gain(t0, 'clap')
    if gc > 0 and k % 2 == 1: add(clap(), t0, .5 * gc, pan=-.1)
for k in range(int(45 / .25)):
    t0 = k * .25
    if 18 <= t0 < 36 and k % 2 == 1: add(hat(), t0, .12, pan=-.35)
    if 41 <= t0 < 44.25: add(hat(), t0, .10 + .1 * (t0 - 41) / 3, pan=.35)
# барабанная дробь перед логотипом
for k in range(16):
    t0 = 44.25 + k * (0.75 / 16)
    add(clap(), t0, .12 + .25 * k / 16)

# ---------- звуковой дизайн ----------
def whoosh(d, lo=300, hi=3000, peak=.5):
    t = tt(d); n = noise(d)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    e = np.where(t / d < peak, (t / d / peak) ** 2, ((1 - t / d) / (1 - peak)) ** 1.5)
    return bp_fast(n, lo, hi) * e / 4
def click(f=2500, d=.02, k=300):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + bp_fast(noise(d), 2000, 9000) / 2) * np.exp(-t * k)
def thump(d=.25, f=90):
    t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 18) + lp_fast(noise(d), 600) * np.exp(-t * 30) * .8)
def tink(f):
    t = tt(1.2); s = sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t * (3 + r * 2)) / r for r in (1, 2.76, 5.4, 8.93))
    return s * np.minimum(1, t / .001) * .5

# 1. карандаш: шорох грифеля по ходу штрихов
P = T['PENCIL']
act = np.zeros(int(6 * SR))
for k, (a, b) in P.items():
    act[int(a * SR):int(b * SR)] = 1
act[int(4.45 * SR):int(5.45 * SR)] = .8  # штриховка
act = lp_fast(act, 12)
gest = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 3.3 * tt(6))) * (0.7 + .3 * np.sin(2 * np.pi * .7 * tt(6)))
scr = bp_fast(noise(6), 1800, 7000) * act * gest
add(scr, 0, .12, pan=.25)
# 2. лист крафта и бумажные приземления
add(whoosh(.9, 200, 2500, .55), 5.9, .9, pan=.4)
for k, land in T['PAPER'].items():
    add(thump(.25, 120), land, .55); add(bp_fast(noise(.12), 1500, 6000) * np.exp(-tt(.12) * 40) / 3, land, .5, pan=.2)
for t0 in T['RATCHET']: add(click(2800, .03, 220), t0, .5, pan=.3)
# 3. неон: выключатель, зажигание трубок, гул
add(click(1400, .05, 120), 11.98, .8); add(thump(.4, 60), 12.0, .6)
for k, (a, b) in T['NEON'].items():
    t = tt(.3); f = 300 + 1600 * t / .3
    z = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.sign(np.sin(2 * np.pi * 50 * t)) * .3 + .7) * np.exp(-t * 9)
    add(z, a, .07, pan=rng.uniform(-.5, .5))
hum_t = tt(6.2); hum = sum(np.sin(2 * np.pi * 100 * h * hum_t) / h for h in (1, 2, 3, 5)) * .5
hum *= np.minimum(1, hum_t / .4) * np.clip((6.2 - hum_t) / .3, 0, 1)
add(hum, 12.0, .03)
# 4. 2D: круговое раскрытие, головка, перевод стрелок
add(whoosh(.8, 500, 6000, .7), 17.75, .8); add(tink(1800), 18.45, .15)
c0, c1, c2, c3 = T['CROWN']
add(click(1700, .04, 160), c0 + .05, .7); add(thump(.2, 140), c1 - .05, .5)
s0, s1 = T['SPIN']
t = s0
while t < s1:
    u = (t - s0) / (s1 - s0); rate = 8 + 30 * np.sin(np.pi * u)
    add(click(3500, .012, 500), t, .18, pan=.4); t += 1 / rate
for i in range(5): add(click(2600, .02, 300), c2 + i * .09, .35, pan=.4)
# 5. 2,5D: широкий whoosh расслоения
add(whoosh(2.2, 150, 2000, .45), 23.9, .9, pan=-.2)
# 6. 3D: низкий свелл + металлический шиммер
t = tt(1.6); sw = np.sin(2 * np.pi * 55 * t) * np.minimum(1, t / 1.2) * np.clip((1.6 - t) / .4, 0, 1)
add(sw, 29.4, .35); add(tink(1320), 31.0, .25, pan=-.3); add(tink(1980), 31.15, .18, pan=.3)
# 7. разборка
add(whoosh(1.6, 200, 4000, .3), 35.9, .9)
for i, t0 in enumerate(sorted(T['EXPLODE'])): add(tink(1500 + i * 140), t0 + .1, .12, pan=(-1) ** i * .4)
# 8. сборка — щелчок на каждую посадку
for i, t0 in enumerate(T['ASSEMBLE']):
    add(click(2200 + i * 60, .03, 200), t0, .55, pan=(-1) ** i * .25); add(thump(.15, 160), t0, .35)
# 9. логотип: райзер, удар, шиммер, ноты букв, блик, финальный аккорд
t = tt(.75); rs = bp_fast(noise(.75), 800, 9000) * (t / .75) ** 2 / 3
add(rs, 44.25, .7)
t = tt(3.0); boom = np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-t * 6)) / SR) * np.exp(-t * 1.6)
add(boom, 45.0, .9); add(lp_fast(noise(1.0), 1500) * np.exp(-tt(1.0) * 5) / 2, 45.0, .6)
for i, t0 in enumerate(T['LOGO_LETTERS']):
    add(tink(hz([69, 72, 76, 79, 81][i])), t0 - .1, .25, pan=(i - 2) * .3)
t = tt(1.0); sp = sum(np.sin(2 * np.pi * (3000 + 4000 * t + k * 700) * t) * .2 for k in range(4)) * np.sin(np.pi * t) ** 2
add(sp, 47.75, .12)
fin = np.zeros(int(4.2 * SR))
for n in (45, 57, 64, 69, 72, 76, 83):  # A — финальный аккорд
    fin += pad_note(hz(n), 4.2) * 1.4
fin *= np.clip((4.2 - tt(4.2)) / 2.2, 0, 1)
add(fin, 47.8, 0.6)
# мягкий пэд-подхват сразу после удара
for n in (57, 64, 69, 72):
    p = pad_note(hz(n), 3.0); add(p * np.clip((3 - tt(3)) / 1.5, 0, 1), 45.0, .8)

# ---------- реверб, мастер ----------
ir_t = tt(1.8); irL = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2); irR = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2)
irL[0] = 0; irR[0] = 0
def conv(x, ir):
    n = len(x) + len(ir); m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)]
wetL = conv(L, irL) * .012; wetR = conv(R, irR) * .012
L2 = L + wetL; R2 = R + wetR
# финальное затухание последних 1.2 с
fade = np.clip((DUR - np.arange(N) / SR) / 1.2, 0, 1); L2 *= fade; R2 *= fade
peak = max(np.abs(L2).max(), np.abs(R2).max())
L2 = np.tanh(L2 / peak * 1.3) / np.tanh(1.3) * .89; R2 = np.tanh(R2 / peak * 1.3) / np.tanh(1.3) * .89
out = (np.stack([L2, R2], 1) * 32767).astype('<i2')
with wave.open('audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('audio.wav', DUR, 's, peak normalized')
