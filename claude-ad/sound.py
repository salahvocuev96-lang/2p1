# Synthesises music + SFX for claude_spot.mp4 (all sound is generated here, no samples).
# usage: python3 sound.py out.wav
import sys, numpy as np
from scipy.signal import butter, sosfilt
SR = 48000; DUR = 15.0; N = int(SR * DUR)
rng = np.random.default_rng(7)
mus = np.zeros((N, 2)); sfx = np.zeros((N, 2)); duck = np.ones(N)

def T(d): return np.arange(int(SR * d)) / SR
def add(buf, t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if sig.ndim == 1: sig = np.stack([sig * (1 - pan) ** .5, sig * (1 + pan) ** .5], 1) / 2 ** .5 * 1.41
    j = min(N, i + len(sig));
    if i >= N or j <= i: return
    buf[i:j] += sig[:j - i] * gain
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(SR * d))

# ---------------- SFX ----------------
def tick(f=3200, d=.035):           # "тык"
    t = T(d); return (np.sin(2*np.pi*f*t) * np.exp(-t*160) + bp(noise(d), 2000, 9000) * np.exp(-t*400) * .5)
def pop(f0=900, f1=260, d=.09):     # bubbly pop
    t = T(d); f = f1 + (f0 - f1) * np.exp(-t*45); return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*38)
def thock(d=.12):                   # woody hit for word swaps
    t = T(d); f = 180 + 420*np.exp(-t*60)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*30) + bp(noise(d), 1500, 6000)*np.exp(-t*220)*.6
def whoosh(d, f0=300, f1=5000, rev=False):
    x = noise(d); t = T(d); out = np.zeros_like(x); y = 0.0
    fc = f0 * (f1/f0) ** (t/d) if not rev else f1 * (f0/f1) ** (t/d)
    a = 1 - np.exp(-2*np.pi*fc/SR)
    for i in range(len(x)): y += a[i]*(x[i]-y); out[i] = y
    env = np.sin(np.pi*np.clip(t/d, 0, 1)) ** 1.5
    if not rev: env = (t/d) ** 2.2 * np.exp(-((t/d) - 1) ** 2 * 0) ; env[-int(.01*SR):] *= np.linspace(1, 0, int(.01*SR))
    return hp(out, 120) * env * 2.2
def impact(d=1.2, f=48):
    t = T(d); fr = f + 90*np.exp(-t*25)
    return (np.tanh(2.2*np.sin(2*np.pi*np.cumsum(fr)/SR))*np.exp(-t*4.5) + lp(noise(d), 3000)*np.exp(-t*14)*.35)
def shimmer(d=2.4, base=587.33):
    t = T(d); s = np.zeros_like(t)
    for k, m in enumerate([1, 1.5, 2, 2.5198, 3, 4]):
        s += np.sin(2*np.pi*base*m*t + k) * np.exp(-t*(1.4 + k*.5)) / (1 + k*.6)
    return s * (1 - np.exp(-t*80))

# spark draw: 12 rays -> rapid ticks
RORD = [0,6,3,9,1,7,4,10,2,8,5,11]
for k in range(12): add(sfx, .04 + k*.026, tick(2600 + k*120, .03), .32, pan=np.sin(k*1.7)*.6)
add(sfx, .52, whoosh(.52, 250, 7000), .55)                      # zoom-through
add(sfx, .98, thock(), .5, -.2)                                  # "Bring your"
BEAT = [1.18,1.86,2.44,2.96,3.42,3.84,4.22,4.58]
for k, b in enumerate(BEAT):
    add(sfx, b, thock(), .7, -.25)                               # word swap
    add(sfx, b + .02, pop(1100 - k*40, 300), .45, .35)            # image appears
    for j in range(3): add(sfx, b + .05 + j*.035, tick(3800 + j*300, .02), .14, .4)  # tiny letter ticks
add(sfx, 1.40, pop(1600, 600, .07), .3, .5); add(sfx, 4.78, pop(1600, 600, .07), .3, .5)  # mini sparks
add(sfx, 4.63, tick(4200), .2, .5); add(sfx, 4.68, tick(4600), .2, .3)
# grid tiles
for c in range(5):
    for r in range(3):
        if (c, r) == (2, 1): continue
        dist = np.hypot(c-2, r-1); add(sfx, 5.44 + dist*.05, tick(2400 + dist*700, .03), .3, pan=(c-2)*.35)
add(sfx, 5.40, whoosh(.45, 600, 3000, rev=True), .35)            # wild ideas exit
add(sfx, 6.02, whoosh(.70, 200, 9000), .75)                      # zoom in
add(sfx, 6.72, impact(1.0), .85)
add(sfx, 6.80, whoosh(.45, 1500, 4500, rev=True), .2, .3)        # ring paint
add(sfx, 7.02, pop(1500, 500, .08), .35, .5)
add(sfx, 7.55, whoosh(.32, 4000, 500, rev=True), .4)             # shrink to card
add(sfx, 7.90, pop(700, 200, .12), .4)
# carousel: tick each time a card passes front
for i in range(1, 400):
    tt = 7.95 + i*0.003
    if tt > 8.92: break
for i, tt in enumerate(np.linspace(0, 1, 2000)):
    pass
def spin_angle(t):
    p = np.clip((t-7.95)/.97, 0, 1); e = 4*p**3 if p < .5 else 1-(-2*p+2)**3/2
    return (360+360/14)*e
last = 0
for tt in np.arange(7.95, 8.92, 1/SR*40):
    n = int(spin_angle(tt) // (360/14))
    if n > last: last = n; add(sfx, tt, tick(2000 + n*90, .025), .26, pan=.3*np.sin(n))
add(sfx, 8.6, whoosh(.3, 5000, 400, rev=True), .45)              # collapse
# text in + morph
for i in range(14): add(sfx, 8.9 + i*.018, tick(3000 + i*60, .02), .13, -.1 + i*.015)
add(sfx, 9.48, whoosh(.45, 800, 3500, rev=True), .3)
for k in range(3): add(sfx, 9.74 + k*.05, pop(900 + k*200, 400, .07), .25)
add(sfx, 10.0, pop(1800, 700, .08), .4, .2); add(sfx, 10.02, whoosh(.32, 2500, 6000, rev=True), .18)
add(sfx, 10.62, whoosh(.2, 3000, 800, rev=True), .3)
# montage hits
MB = [10.74, 11.14, 11.52, 11.88]
for k, b in enumerate(MB):
    add(sfx, b, impact(.35, 70 + k*6), .55); add(sfx, b, whoosh(.26, 600, 6000, rev=True), .35, -.3 if k % 2 else .3)
    add(sfx, b + .08, thock(), .4)
add(sfx, 12.24, whoosh(.38, 6000, 300, rev=True), .55)           # collapse to dot
add(sfx, 12.60, impact(1.6, 42), 1.0); add(sfx, 12.60, shimmer(2.4), .35)
for k in range(12): add(sfx, 12.6 + k*.014, tick(3000 + k*150, .025), .18, np.sin(k*2.1)*.7)
add(sfx, 13.12, whoosh(.5, 3000, 9000, rev=True), .18, .4)

# ---------------- MUSIC (122 bpm, D major) ----------------
BPM = 122; B = 60 / BPM
def kick():
    t = T(.35); f = 45 + 120*np.exp(-t*35); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)
def hat(o=False):
    d = .2 if o else .045; t = T(d); return hp(noise(d), 7000)*np.exp(-t*(18 if o else 90))
def clap():
    t = T(.18); n = bp(noise(.18), 900, 3500)
    env = sum(np.exp(-np.clip(t - k*.012, 0, None)*60)*(t >= k*.012) for k in range(3)) * np.exp(-t*12); return n*env
def note(f, d, bright=1.0):
    t = T(d); s = sum(np.sin(2*np.pi*f*h*t)/h**1.3 for h in range(1, 7)); s *= np.exp(-t*7) * (1-np.exp(-t*400))
    return lp(s, 2500*bright)
def pad(freqs, d):
    t = T(d); s = np.zeros_like(t)
    for f in freqs:
        for det in (-.12, .0, .13):
            ph = 2*np.pi*f*2**(det/12)*t; s += (2*((ph/(2*np.pi)) % 1) - 1)
    s = lp(s, 1400, 2) / (len(freqs)*3); env = np.minimum(1, t/.25) * np.minimum(1, (d - t)/.2); return s*env
def bass(f, d):
    t = T(d); s = np.tanh(1.5*np.sin(2*np.pi*f*t)) * np.minimum(1, t/.005) * np.exp(-t*3); return lp(s, 600)
hz = lambda m: 440*2**((m-69)/12)
CH = [[62,66,69,73],[59,62,66,69],[55,59,62,66],[57,61,64,69]]   # Dmaj7 Bm7 Gmaj7 A
ROOT = [38, 35, 31, 33]
bar = 4*B
nb = int(12.24 / bar) + 1
for bi in range(nb):
    t0 = bi*bar; ch = CH[bi % 4]
    add(mus, t0, pad([hz(m) for m in ch], bar + .1), .22)
for st in range(int(12.24 / (B/2))):                              # 8th grid
    t0 = st*B/2
    if t0 >= 12.24: break
    bi = int(t0 // bar); ch = CH[bi % 4]
    if t0 >= .98:
        if st % 2 == 0:
            add(mus, t0, kick(), .9); duck[int(t0*SR):int(t0*SR)+int(.22*SR)] = np.minimum(duck[int(t0*SR):int(t0*SR)+int(.22*SR)], np.linspace(.45, 1, int(.22*SR)))
            add(mus, t0, bass(hz(ROOT[bi % 4]), B*.9), .45)
        else:
            add(mus, t0, hat(t0 > 6.7 and st % 4 == 3), .22, .25)
        if st % 4 == 2 and t0 > 3.0: add(mus, t0, clap(), .35, -.1)
    if t0 >= 1.9:                                                 # arp plucks
        m = ch[[0,2,1,3,2,1,3,0][st % 8]] + 12
        add(mus, t0, note(hz(m), .3, .7 + .6*min(1, t0/10)), .16, .5*np.sin(st*.9))
        add(mus, t0 + B/4, note(hz(m+12), .2, .8), .06, -.5*np.sin(st*.9))
# 16th hats riser into the zoom
for i in range(16):
    add(mus, 5.5 + i*B/4*0.5, hat(), .1 + i*.012, .2)
# logo chord
add(mus, 12.6, pad([hz(m) for m in [50, 62, 66, 69, 73, 76]], 2.4), .38)
add(mus, 12.6, bass(hz(38), 2.4), .5)
for k, m in enumerate([74, 78, 81, 85]): add(mus, 12.62 + k*.07, note(hz(m), 1.2, 1.2), .12, (k-1.5)*.3)

mus *= duck[:, None]
mix = mus*0.55 + sfx*0.75
# master: gentle glue + fade out + limiter
fade = np.ones(N); fl = int(.9*SR); fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix /= np.max(np.abs(mix)) / .89
from scipy.io import wavfile
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print('ok', mix.shape)
