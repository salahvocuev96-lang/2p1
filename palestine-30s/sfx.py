"""SFX и сведение: python3 sfx.py song.wav -> audio/sfx.wav (48 кГц стерео, 30.0 c). Только numpy."""
import numpy as np, wave, sys
SR=48000; N=SR*30; rng=np.random.default_rng(7)
def lp(x,fc,order=4):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); return np.fft.irfft(X/np.sqrt(1+(f/fc)**(2*order)),len(x))
def bp(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); return np.fft.irfft(X/np.sqrt(1+(f/hi)**8)/np.sqrt(1+(lo/np.maximum(f,1))**8),len(x))
out=np.zeros((N,2))
def put(sig,t,pan=0.,g=1.):
    i=int(t*SR); s=sig[:max(0,N-i)]; L=np.cos((pan+1)*np.pi/4); R=np.sin((pan+1)*np.pi/4)
    out[i:i+len(s),0]+=s*g*L*1.41; out[i:i+len(s),1]+=s*g*R*1.41
def boom(dur=4.,fc=220,muffle=False):
    n=int(dur*SR); t=np.arange(n)/SR; x=lp(rng.standard_normal(n),fc if not muffle else 110)
    env=np.minimum(1,t/(.004 if not muffle else .02))*(np.exp(-t/.35)+.35*np.exp(-t/1.6))
    sub=np.sin(2*np.pi*np.cumsum(30+30*np.exp(-t*3))/SR)*np.exp(-t/1.1)
    crack=bp(rng.standard_normal(n),900,5000)*np.exp(-t/.06)*(0 if muffle else .5)
    y=x/np.abs(x).max()*env+.8*sub+crack; return y/np.abs(y).max()
def whoosh(dur):
    n=int(dur*SR); t=np.arange(n)/SR; x=bp(rng.standard_normal(n),300,3500)
    tone=np.sin(2*np.pi*np.cumsum(1400-900*(t/dur))/SR)*.25
    y=(x/np.abs(x).max()+tone)*(t/dur)**2.2; return y/np.abs(y).max()
def debris(dur=2.5):
    n=int(dur*SR); y=np.zeros(n)
    for k in range(70):
        i=int(rng.uniform(.1,dur-.1)*SR); m=int(.03*SR); y[i:i+m]+=rng.standard_normal(m)*np.exp(-np.arange(m)/(SR*.006))*rng.uniform(.2,1)*np.exp(-i/SR/1.2)
    return lp(y,2500)/max(1e-9,np.abs(y).max())
# ветер / гул
wind=lp(rng.standard_normal(N),380); wind/=np.abs(wind).max(); tt=np.arange(N)/SR
lfo=.6+.4*np.sin(tt*.7)*np.sin(tt*.31+1)
def win(a,b,fi=.6): return np.clip((tt-a)/fi,0,1)*np.clip((b-tt)/fi,0,1)
bed=wind*lfo*(.25*win(0,3.9,.4)+.3*win(7.0,10.9)+.12*win(12.9,20.2)+.2*win(20.1,30.2,1.2))
out[:,0]+=bed; out[:,1]+=np.roll(bed,900)
# удары по таймлайну видео (в секундах)
put(whoosh(.65),3.10,.25,.55); put(boom(5),3.75,.15,1.0); put(debris(),3.95,.2,.35)
put(whoosh(.35),4.70,-.4,.35); put(boom(3.5),5.04,-.35,.6)
for h,g in[(13.42,.45),(14.12,.5),(15.05,.6)]: put(boom(3,muffle=True),h,-.5,g)
put(boom(2.5,muffle=True),12.86,-.4,.35)
for h,p,g in[(16.74,-.3,.85),(17.07,.5,.55),(18.18,.1,.7),(18.9,-.6,.45),(19.5,.7,.5)]:
    put(whoosh(.32),h-.32,p,.3); put(boom(3.2),h,p,g)
put(boom(4,muffle=True),20.11,0,.35)
out/=np.abs(out).max(); out*=.5
def wr(path,x):
    x=np.clip(x,-1,1); w=wave.open(path,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype('<i2').tobytes()); w.close()
wr('audio/sfx.wav',out)
