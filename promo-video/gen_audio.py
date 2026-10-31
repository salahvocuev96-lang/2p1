# Музыка + звуковой дизайн для промо Votsuev (23 c, 120 BPM). Запуск: python3 gen_audio.py
import numpy as np, wave

SR = 48000; DUR = 23.0; N = int(SR * DUR)
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)       # сухой микс
SL = np.zeros(N); SRv = np.zeros(N)    # посыл в реверб
AL = np.zeros(N); AR = np.zeros(N)     # посыл в дилей (арпеджио)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

def put(sig, t0, pan=0.0, rev=0.0, dly=0.0):
    i = int(t0 * SR); n = min(len(sig), N - i)
    if n <= 0: return
    if i < 0: sig = sig[-i:]; n = min(len(sig), N); i = 0
    s = sig[:n]; gl = np.cos((pan + 1) * np.pi / 4); gr = np.sin((pan + 1) * np.pi / 4)
    L[i:i+n] += s * gl; R[i:i+n] += s * gr
    if rev: SL[i:i+n] += s * gl * rev; SRv[i:i+n] += s * gr * rev
    if dly: AL[i:i+n] += s * gl * dly; AR[i:i+n] += s * gr * dly

def lp(x, fc):  # однополюсный ФНЧ, fc может быть массивом
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s += a[i] * (x[i] - s); y[i] = s
    return y

def tt(d): return np.arange(int(d * SR)) / SR
def saw(f, t, ph=0): return 2 * ((f * t + ph) % 1) - 1
def env(t, a, d): return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t * d)

# ---------- гармония ----------
CH = [(0, 4.5, [57, 60, 64, 69], 33), (4.5, 6.5, [53, 57, 60, 65], 29), (6.5, 8.5, [50, 57, 62, 65], 26),
      (8.5, 10.5, [57, 60, 64, 69], 33), (10.5, 12, [53, 57, 60, 65], 29), (12, 13.5, [55, 59, 62, 67], 31),
      (13.5, 15, [48, 55, 60, 64], 36), (15, 16.5, [55, 59, 62, 67], 31), (16.5, 18, [57, 60, 64, 69], 33),
      (18, 19.5, [53, 57, 60, 65], 29), (19.5, 20.5, [55, 59, 62, 67], 31), (20.5, 23, [48, 55, 60, 62, 64, 67], 36)]

def cutoff(t):
    return np.interp(t, [0, 4.4, 4.6, 8.3, 8.5, 13.5, 16.5, 20.5, 23], [500, 900, 700, 1300, 2400, 2800, 2600, 1500, 900])

# пэд
for a, b, notes, root in CH:
    d = b - a + 0.8; t = tt(d); g = np.minimum(1, t / 0.35) * np.clip((d - t) / 0.55, 0, 1)
    sig = sum(saw(mtof(m) * (1 + dt), t, rng.random()) for m in notes for dt in (-0.004, 0, 0.0045))
    sig = lp(sig * g, cutoff(a + t)) * 0.022
    put(sig, a - 0.15, pan=0, rev=0.5)

# бас: дрон до дропа, затем пульс восьмыми с «сайдчейном»
for a, b, notes, root in CH:
    d = b - a; t = tt(d); f = mtof(root + 12 if root < 30 else root)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    if a >= 8.5 and a < 20.5:
        ph = ((a + t) % 0.5) / 0.5; s *= 1 - 0.85 * np.exp(-ph * 9); s = np.tanh(s * 1.8) * 0.16
    else:
        s *= 0.09 * np.minimum(1, t / 0.4) * np.clip((d - t) / 0.3, 0, 1)
    s *= np.minimum(1, t / 0.006) * np.clip((d - t) / 0.006, 0, 1)  # без щелчков на стыках
    put(s, a)

# ---------- ударные ----------
def kick(v=1.0):
    t = tt(0.45); f = 44 + 90 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 7) + 0.3 * rng.standard_normal(len(t)) * np.exp(-t * 300)) * 0.55 * v
def hat(v):
    t = tt(0.06); n = rng.standard_normal(len(t)); n = n - lp(n, 6000)
    return n * np.exp(-t * 70) * v
def clap():
    t = tt(0.3); n = rng.standard_normal(len(t)); n = lp(n - lp(n, 900), 5000)
    e = sum(np.exp(-np.maximum(t - o, 0) * 40) * (t >= o) for o in (0, 0.011, 0.022)) / 3 + np.exp(-t * 14) * 0.4
    return n * e * 0.22

for i in range(int((20.5 - 8.5) / 0.5)):
    put(kick(), 8.5 + i * 0.5)
for i in range(int((20.5 - 9.0) / 1.0)):
    put(clap(), 9.0 + i, rev=0.35)
for i in range(int((8.5 - 4.5) / 0.5)):
    put(hat(0.10), 4.75 + i * 0.5, pan=0.3)
for i in range(int((20.5 - 8.5) / 0.125)):
    tt0 = 8.5 + i * 0.125; put(hat(0.13 if i % 2 else 0.06), tt0, pan=(-0.35 if i % 4 < 2 else 0.35))

# ---------- арпеджио с дилеем ----------
for a, b, notes, root in CH:
    if a < 8.5 or a >= 20.5: continue
    seq = [notes[0] + 12, notes[2] + 12, notes[1] + 24, notes[2] + 12, notes[3] + 12, notes[1] + 12]
    k = 0; x = a
    while x < b - 1e-6:
        t = tt(0.22); f = mtof(seq[k % len(seq)])
        s = lp(saw(f, t) * env(t, 0.002, 16), 3200) * 0.05
        put(s, x, pan=(0.25 if k % 2 else -0.25), rev=0.25, dly=0.6); k += 1; x += 0.125

# ---------- SFX ----------
def noise_sweep(d, f0, f1, shape='up', amp=0.2):
    t = tt(d); n = rng.standard_normal(len(t)); fc = np.geomspace(f0, f1, len(t))
    y = lp(n, fc) - lp(n, fc * 0.35)
    e = (t / d) ** 2 if shape == 'up' else np.exp(-t / d * 4) * np.minimum(1, t / 0.02)
    return y * e * amp
def boom(d=1.6, amp=0.7):
    t = tt(d); f = 34 + 60 * np.exp(-t * 6)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) + lp(rng.standard_normal(len(t)), 400) * np.exp(-t * 5) * 0.6) * amp
def ping(f, d=0.6, amp=0.12):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t)) * env(t, 0.002, 7) * amp
def bell(f, d=2.5, amp=0.12):
    t = tt(d); return sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t * dc) * w for r, dc, w in ((1, 1.6, 1), (2.76, 3, .4), (5.4, 6, .2))) * np.minimum(1, t / .003) * amp
def click(amp=0.05):
    t = tt(0.012); n = rng.standard_normal(len(t)); return (n - lp(n, 3000)) * np.exp(-t * 500) * amp

# Сцена 1: слова, метки, орбита
for i, x in enumerate([0.25, 0.41, 0.62, 0.80]): put(click(0.06), x + 0.05, pan=-0.4, rev=0.2)
put(noise_sweep(1.2, 2500, 9000, 'down', 0.05), 2.3, pan=0.5, rev=0.4)
for i, x in enumerate([2.55, 2.85, 3.15]): put(ping(mtof(84 + [0, 3, 7][i]), 0.5, 0.06), x, pan=0.6, rev=0.5)
put(noise_sweep(0.9, 300, 7000, 'up', 0.18), 3.55, rev=0.3)            # райзер
put(noise_sweep(0.7, 6000, 200, 'down', 0.25), 4.35, rev=0.4)           # проход сквозь туманность
put(boom(1.3, 0.45), 4.5, rev=0.3)
# Сцена 2: ошибки + печать + глитч
for i, x in enumerate([4.95, 5.65, 6.35]):
    t = tt(0.32); s = np.sign(np.sin(2 * np.pi * np.where(t < .12, 880, 622) * t)) * env(t, .002, 9) * 0.05
    put(lp(s, 4000), x + 0.06, pan=[-0.4, 0.4, -0.2][i], rev=0.4)  # сигнал = первый символ строки
    txt = ['Нет сайта — нет доверия', 'Соцсети не заменяют продажи', 'Клиенты уходят к конкурентам'][i]
    for c in range(1, len(txt) + 1):  # щелчок на каждую появившуюся букву (как в коде анимации)
        if txt[c - 1] != ' ': put(click(0.05 if c % 2 else 0.035), x + 0.04 + c * 0.45 / len(txt) + 0.5 / 60, pan=0.2)
gt = 7.8
while gt < 8.42:
    d = 0.02 + rng.random() * 0.05; t = tt(d); s = np.round(rng.standard_normal(len(t)) * 3) / 3
    s = np.repeat(s[::6], 6)[:len(t)] * 0.07; put(s, gt, pan=rng.random() - .5); gt += d + rng.random() * 0.04
put(noise_sweep(0.95, 200, 12000, 'up', 0.3), 7.55, rev=0.3)
# Сцена 3: дроп, слова, сборка сайта, заявки
put(boom(2.0, 0.8), 8.5, rev=0.5)
for x in [8.8, 9.3, 9.8, 10.3]: put(noise_sweep(0.2, 1500, 9000, 'up', 0.07), x, rev=0.2)  # налёт букв → приземление на удар
put(bell(mtof(81), 1.6, 0.06), 10.5, rev=0.6)
put(noise_sweep(1.0, 3000, 12000, 'down', 0.05), 11.15, pan=0.3, rev=0.5)
CLt = [11.95 + j / 60 * 1.45 for j in range(60)]
for j in range(4, 60, 5): put(ping(mtof(84 + [0, 2, 4, 7, 9, 12][(j // 5) % 6]), 0.25, 0.045), CLt[j] + 0.03, pan=0.5, rev=0.3)
# Сцена 4: радар
t = tt(2.9); put(np.sin(2 * np.pi * 110 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 1 * t)) * 0.03 * np.minimum(1, t / .4) * np.clip((2.9 - t) / .4, 0, 1), 13.5)
for i, x in enumerate([14.0, 14.75, 15.5]): put(ping(mtof([88, 91, 96][i]), 0.9, 0.09), x, pan=0.4, rev=0.6)
put(noise_sweep(0.5, 400, 9000, 'up', 0.2), 15.9, rev=0.2)
put(noise_sweep(0.28, 8000, 300, 'down', 0.18), 16.33, rev=0.3)  # короче, чтобы не глушить «тык» блока 01
# Сцена 5: результаты на линии-конвейере — «тик-тик-тик» на переключениях (как в референсе)
def tick(f=3400, amp=0.08):
    t = tt(0.03); n = rng.standard_normal(len(t)); n = n - lp(n, 2500)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 900) * 0.7 + n * np.exp(-t * 1400) * 0.5) * amp
for x0 in (16.63, 17.38, 18.13, 18.88):  # въезд к каждому блоку
    for j in range(5): put(tick(3400 - j * 120, 0.13 * (1 - j * 0.1)), x0 + j * 0.072, pan=-0.3 + j * 0.15, rev=0.15)
    put(noise_sweep(0.36, 9000, 2500, 'down', 0.045), x0, pan=0.3, rev=0.3)
for i, x in enumerate((17.0, 17.75, 18.5, 19.25)):
    put(tick(2600, 0.14), x, rev=0.2); put(tick(4200, 0.08), x + 0.045)
    y = x + 0.03
    while y < x + 0.45: put(click(0.03), y, pan=rng.random() * 1.2 - .6); y += 0.03   # перебор цифр
    put(ping(mtof([76, 79, 84, 88][i]), 0.35, 0.08), x, pan=[-0.5, -0.15, 0.15, 0.5][i], rev=0.3)  # сигнал ровно в момент появления блока
    put(tick(3800, 0.07), x + 0.45)  # тихая фиксация числа
# Финал: втягивание, удар, колокол
put(noise_sweep(0.5, 300, 9000, 'up', 0.28), 20.25, rev=0.3)
put(boom(2.2, 0.75), 20.74, rev=0.6)
for m, d in ((72, 0), (79, 0.03), (88, 0.06)): put(bell(mtof(m), 2.4, 0.07), 20.74 + d, pan=(m - 79) / 20, rev=0.7)
put(noise_sweep(0.45, 2000, 9000, 'up', 0.05), 20.78, pan=0.3, rev=0.4)  # буквы выходят из линии света
put(ping(mtof(88), 0.7, 0.05), 21.35, pan=0.25, rev=0.6)  # «сайт.» вспыхивает оранжевым
put(noise_sweep(0.3, 1500, 7000, 'up', 0.035), 21.25, pan=-0.2, rev=0.3)  # подзаголовок
put(ping(mtof(91), 0.8, 0.05), 21.52, rev=0.6)  # раскрытие плашки Telegram

# ---------- эффекты шины ----------
def delay(x, d, fb):
    k = int(d * SR); y = x.copy()
    for i in range(k, N): y[i] += y[i - k] * fb
    return y
dl = delay(AL, 0.375, 0.35); dr = delay(AR, 0.25, 0.35)
def comb(x, d, fb):
    k = int(d * SR); y = x.copy()
    for i in range(k, N): y[i] += y[i - k] * fb
    return y
def allpass(x, d, g):
    k = int(d * SR); y = np.zeros_like(x)
    for i in range(N): xi = x[i]; yd = y[i - k] if i >= k else 0; xd = x[i - k] if i >= k else 0; y[i] = -g * xi + xd + g * yd
    return y
def reverb(x, off):
    c = sum(comb(x, d + off, 0.78) for d in (0.0297, 0.0371, 0.0411, 0.0437)) / 4
    return lp(allpass(allpass(c, 0.005, 0.7), 0.0017, 0.7), 6000)
rl = reverb(SL + dl * 0.3, 0); rr = reverb(SRv + dr * 0.3, 0.0011)

ML = L + dl * 0.5 + rl * 0.9; MR = R + dr * 0.5 + rr * 0.9
fade = np.ones(N); t = np.arange(N) / SR
fade *= np.clip(t / 0.01, 0, 1); fade *= np.clip((DUR - t) / 1.1, 0, 1) ** 1.5
ML = np.tanh(ML * fade * 1.3); MR = np.tanh(MR * fade * 1.3)
pk = max(np.abs(ML).max(), np.abs(MR).max()); g = 0.89 / pk
out = (np.stack([ML, MR], 1) * g * 32767).astype('<i2')
with wave.open('votsuev-promo.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('peak gain', g)
