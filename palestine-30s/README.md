# Газа. Ночь — социальный ролик 30 с

- `out/gaza-30s.mp4` — готовое видео (1920×1080, 60 fps, H.264, AAC, 30.000 c).
- `index.html` — исходник анимации (Canvas, свой таймлайн `frame(t)`); открыть в браузере → «Смотреть» (звук `audio/mix.m4a`).
- `STORYBOARD.md` — раскадровка и тайминг по музыке.
- `sfx.py` — взрывы/свист/ветер (numpy). `render.mjs` — покадровый рендер через Playwright + FFmpeg.

Пересборка:
```bash
ffmpeg -y -i ПЕСНЯ.MOV -vn -ac 2 -ar 48000 -af "volume=15dB,apad" -t 30 audio/song.wav
python3 sfx.py
ffmpeg -y -i audio/song.wav -i audio/sfx.wav -filter_complex "[1:a]volume=0.7[x];[0:a][x]amix=inputs=2:normalize=0,alimiter=limit=0.84:level=disabled,afade=t=out:st=29.4:d=0.6" -t 30 audio/mix.wav
PW=$(node -p "require.resolve('playwright')") node render.mjs
```
