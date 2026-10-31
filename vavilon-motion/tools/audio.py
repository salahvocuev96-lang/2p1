#!/usr/bin/env python3
"""Аудио-пайплайн ролика «Вавилон».

1. Берёт дорожку из видео пользователя (трек Miyagi — «Вавилон").
2. Синтезирует тихий звуковой дизайн (саб-удары, райзеры, блики, треск пепла)
   на тех же таймкодах, что и анимация (CUES ниже = CUE в index.html).
3. Сводит в audio/mix.wav ровно 31.000 с (48 кГц, стерео).
4. Пишет audio-env.js — громкость трека на каждый кадр 60 fps,
   чтобы HUD-метр и свечение реагировали на настоящую музыку.

Запуск:  python3 tools/audio.py ПУТЬ_К_ВИДЕО_С_ТРЕКОМ
Нужны: ffmpeg, numpy.
"""
import json, subprocess, sys, pathlib
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR, DUR, FPS = 48000, 31.0, 60
N = int(SR * DUR)
BPM = 161.5
BEAT = 60 / BPM
CUES = dict(son=3.30, pepel=9.01, stars=15.09, vav=21.55, end=27.24)
rng = np.random.default_rng(7)


def load_track(src):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", src, "-vn", "-ac", "2", "-ar", str(SR),
         "-f", "f32le", "-"], check=True, capture_output=True).stdout
    a = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    out = np.zeros((N, 2), np.float32)
    n = min(N, len(a))
    out[:n] = a[:n]
    # мягкий вход (трек начинается с середины песни) и финальное затухание
    fi = int(0.12 * SR)
    out[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo0, fo1 = int(29.75 * SR), N
    out[fo0:fo1] *= (np.cos(np.linspace(0, np.pi, fo1 - fo0)) * .5 + .5)[:, None] ** 1.3
    return out


def env(n, a, d):
    """Огибающая: атака a и экспоненциальный спад d (сек)."""
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def onepole_lp(x, fc):
    """Однополюсный ФНЧ с переменной частотой среза fc (массив)."""
    y = np.zeros_like(x)
    k = 1 - np.exp(-2 * np.pi * np.asarray(fc) / SR)
    k = np.broadcast_to(k, x.shape)
    acc = 0.0
    for i in range(len(x)):
        acc += k[i] * (x[i] - acc)
        y[i] = acc
    return y


def place(buf, sig, t0, pan=0.0, gain=1.0):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    sig = sig[: N - i0]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i0:i0 + len(sig), 0] += sig * l * gain
    buf[i0:i0 + len(sig), 1] += sig * r * gain


def boom(dur=1.4, f0=72, f1=36):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + .25 * np.sin(2 * ph)) * env(n, .004, .45)


def riser(dur, lo=250, hi=7000):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    u = np.linspace(0, 1, n)
    y = onepole_lp(x, lo * (hi / lo) ** (u ** 1.6))
    y -= onepole_lp(y, 120)
    return y / (np.abs(y).max() + 1e-9) * u ** 2.2


def whoosh(dur):
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    shape = np.sin(np.pi * u) ** 2
    y = onepole_lp(rng.standard_normal(n), 300 + 4000 * shape)
    return y / (np.abs(y).max() + 1e-9) * shape


def glint(f=2093.0):
    n = int(.9 * SR)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * m * t) for m, a in ((1, 1), (1.5, .45), (2.01, .3), (3.0, .12)))
    return s * env(n, .002, .22)


def crackle(dur):
    n = int(dur * SR)
    y = np.zeros(n)
    idx = rng.integers(0, n, int(dur * 90))
    y[idx] = rng.uniform(-1, 1, len(idx))
    y = y - onepole_lp(y, 1500)
    u = np.linspace(0, 1, n)
    return y / (np.abs(y).max() + 1e-9) * np.sin(np.pi * u)


def tick(f=3200, d=.03):
    n = int(.12 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t / d) + rng.standard_normal(n) * np.exp(-t / .004) * .4


def thud():
    """Удар камня: низкий тон + грубый шум."""
    n = int(.7 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * (55 + 60 * np.exp(-t * 20)) * t) * np.exp(-t / .16)
    grit = onepole_lp(rng.standard_normal(n), 900) * np.exp(-t / .09)
    return tone + grit * 2.2


def thunder(dur=3.0):
    n = int(dur * SR); t = np.arange(n) / SR
    crack = (rng.standard_normal(n) - onepole_lp(rng.standard_normal(n), 2000)) * np.exp(-t / .06)
    rum = onepole_lp(rng.standard_normal(n), 160) * (1 - np.exp(-t / .05)) * np.exp(-t / .9)
    return crack * .8 + rum / (np.abs(rum).max() + 1e-9) * 1.1


def whoomp(dur=1.2):
    """Вспышка огня: шумовой удар с открывающимся фильтром."""
    n = int(dur * SR); u = np.linspace(0, 1, n)
    y = onepole_lp(rng.standard_normal(n), 200 + 3500 * np.exp(-u * 4))
    return y / (np.abs(y).max() + 1e-9) * (1 - np.exp(-u * 60)) * np.exp(-u * 3.5)


def bed(dur, fc, mod=None):
    n = int(dur * SR); y = onepole_lp(rng.standard_normal(n), fc)
    y /= np.abs(y).max() + 1e-9; u = np.linspace(0, 1, n)
    return y * np.sin(np.pi * u) ** .5 * (mod(u) if mod else 1)


def pad(dur, freqs, swell=True):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    y = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * .3 * t) * .5) for f in freqs) / len(freqs)
    return y * (u ** 1.5 if swell else np.sin(np.pi * u))


def chirp_down(dur, f0, f1):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 4 / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * .4))


def build_sfx():
    s = np.zeros((N, 2), np.float64)
    son, pep, st, vav, end = (CUES[k] for k in ("son", "pepel", "stars", "vav", "end"))
    # ── интро: гул, сердцебиение, моргание
    place(s, pad(3.4, [55, 82.4, 110]), 0, gain=.16)
    for t0 in (.55, 1.75):
        place(s, boom(.35, 60, 40), t0, gain=.22); place(s, boom(.35, 58, 40), t0 + .28, gain=.16)
    for t0 in (1.38, 2.22, 2.85):
        place(s, whoosh(.3), t0, gain=.12)
    place(s, riser(2.0, 180, 4500), son - 2.0, gain=.16)
    place(s, boom(), son, gain=.42)
    # ── сон: колыбельный перебор, ветер с перьями, часы
    box = [1046.5, 1318.5, 1568, 2093, 1568, 1318.5, 1174.7, 1568]
    for k, f in enumerate(box):
        place(s, glint(f), son + .05 + k * BEAT * .75, pan=-.5 + (k % 4) * .33, gain=.07)
    place(s, bed(5.3, 500), son, gain=.07)
    place(s, glint(784), 5.95, gain=.14)  # «звон» появления часов
    beat = 0
    t0 = 5.95
    while t0 < 8.0:
        place(s, tick(3400 if beat % 2 else 2500), t0, pan=-.3 if beat % 2 else .3, gain=.22)
        beat += 1; t0 += BEAT
    t0, dt = 8.0, BEAT / 2
    while t0 < 8.75:  # раскрутка стрелок — ускоряющийся трещоток
        place(s, tick(4200, .012), t0, gain=.16); dt *= .8; t0 += max(dt, .025)
    place(s, whoosh(.9), 8.15, pan=-.5, gain=.2); place(s, whoosh(.9), 8.22, pan=.5, gain=.2)
    # ── пепел: фото падает в огонь, вспышки, треск, рёв
    place(s, whoosh(.5), pep - .45, gain=.18)
    place(s, boom(1.6, 80, 34), pep, gain=.45)
    place(s, whoomp(1.4), pep, gain=.42)
    place(s, crackle(6.2), pep, gain=.16)
    place(s, crackle(6.0), pep + .1, pan=.6, gain=.10)
    place(s, bed(6.2, 220, lambda u: .6 + .4 * np.sin(u * 30) ** 2), pep, gain=.22)
    place(s, whoomp(.9), 12.05, gain=.22)
    place(s, whoomp(1.6), 13.38, gain=.45); place(s, boom(1.2, 70, 34), 13.38, gain=.3)
    place(s, crackle(1.4), 13.38, gain=.2)
    place(s, riser(1.5, 300, 9000), st - 1.5, gain=.2)
    # ── звёзды: гиперпрыжок, метеоры, созвездие, гул галактики
    place(s, boom(1.8, 90, 30), st, gain=.42)
    place(s, chirp_down(2.4, 1800, 120) * .5 + whoosh(2.4) * .6, st, gain=.3)
    for i, t0 in enumerate([15.83, 16.58, 17.32, 18.06, 18.8, 19.55, 20.29]):
        place(s, whoosh(.75), t0 - .05, pan=(.7 if i % 2 else -.7), gain=.2)
        place(s, glint(2637 + 200 * i), t0 + .25, pan=(-.5 if i % 2 else .5), gain=.05)
    place(s, pad(4.2, [110, 164.8, 220, 329.6], swell=False), 17.0, gain=.14)
    for k in range(7):
        place(s, glint([1568, 1760, 2093, 2349, 2637, 3136, 3520][k]), 18.2 + k * BEAT * 2, pan=-.6 + k * .2, gain=.11)
    place(s, riser(.5, 300, 6000), 21.05, gain=.16)  # «втягивание» в последнюю звезду
    place(s, glint(1568), 20.9, gain=.12)
    # ── Вавилон: удар, ярусы-камни по долям, молния, гром
    place(s, boom(1.8, 76, 32), vav, gain=.45)
    for k in range(8):
        place(s, thud(), vav + k * BEAT * .75 + .2, pan=-.4 + (k % 3) * .4, gain=.22)
    place(s, bed(5.5, 300), vav + .3, gain=.06)  # ветер пустыни
    place(s, thunder(), 24.59, gain=.4)
    for k in range(10):
        place(s, glint(1046.5 * (1.5 if k % 2 else 1)), 25.75 + k * .14, pan=-.6 + k * .13, gain=.035)
    # ── обрушение и финал
    place(s, boom(2.2, 60, 28), end, gain=.42)
    place(s, thunder(2.8), end + .05, gain=.25)
    for k in range(22):
        place(s, thud()[: int(.25 * SR)], end + .15 + k * .07 + rng.uniform(0, .05), pan=rng.uniform(-.8, .8), gain=.06)
    place(s, glint(1046.5), end + 1.2, gain=.1); place(s, glint(1568), end + 1.35, gain=.07)
    place(s, pad(3.2, [65.4, 98, 130.8], swell=False), end + .4, gain=.12)
    return s


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    track = load_track(sys.argv[1])
    sfx = build_sfx()
    mix = (track * .8 + sfx * 1.9) * 1.15  # эффекты заметно, но под треком
    peak = np.abs(mix).max()
    if peak > .98:  # мягкий клиппер: тихие места почти не трогает, пики скругляет
        mix = .98 * np.tanh(mix / .98)
    (ROOT / "audio").mkdir(exist_ok=True)
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2",
                    "-i", "-", str(ROOT / "audio" / "mix.wav")], input=pcm.tobytes(), check=True)
    # огибающая громкости трека на кадр
    mono = track.mean(1)
    spf = SR // FPS
    frames = int(DUR * FPS)
    rms = np.array([np.sqrt(np.mean(mono[i * spf:(i + 1) * spf] ** 2) + 1e-12) for i in range(frames)])
    db = 20 * np.log10(rms)
    e = np.clip((db + 30) / 24, 0, 1)
    e = np.convolve(e, np.ones(3) / 3, "same")
    (ROOT / "audio-env.js").write_text(
        "// громкость трека по кадрам (60 fps), сгенерировано tools/audio.py\nwindow.ENV=" +
        json.dumps([round(float(x), 3) for x in e]) + ";\n")
    print("ok: audio/mix.wav", round(len(pcm) / SR, 3), "s; audio-env.js", frames, "frames")


if __name__ == "__main__":
    main()
