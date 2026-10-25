# Rolex Submariner — смена стилей

Ролик 52 с, 1920×1080, 60 fps, H.264 + AAC: `rolex_submariner.mp4`.
Раскадровка: `STORYBOARD.md`.

Этапы: карандаш → бумага → неон → 2D → 2,5D → 3D → разборка (12 подписанных деталей) → сборка → анимация логотипа.

## Файлы
- `index.html` — вся анимация (Canvas 2D, свой таймлайн, без библиотек). Открыть в браузере для превью: пробел — пауза, ←/→ — перемотка, клик — включить звук.
- `gen_audio.py` — музыка 120 BPM и звуковые эффекты (numpy) → `audio.wav`, синхронно с `timeline.json`.
- `render.js` — покадровый рендер через Playwright + FFmpeg.

## Пересборка
```
node render.js video.mp4 4      # кадры → видео (≈10 мин на 4 ядрах), заодно пишет timeline.json
python3 gen_audio.py            # audio.wav
ffmpeg -i video.mp4 -i audio.wav -c:v copy -c:a aac -b:a 192k rolex_submariner.mp4
```

Логотип и название Rolex — товарные знаки Rolex SA. Ролик — учебная/фан-работа; для коммерческого использования нужны права.
