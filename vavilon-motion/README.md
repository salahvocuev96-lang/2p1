# Вавилон — 31-секундный лирик-ролик (HTML/Canvas)

Концепт и раскадровка: [STORYBOARD.md](STORYBOARD.md).

## Сборка MP4 (1920×1080, 60 fps, H.264 + AAC, ровно 31 с)

Нужны: Python 3 + numpy, Node 18+, Playwright с Chromium, ffmpeg.

```bash
python3 tools/audio.py ПУТЬ/К/IMG_6767.MP4   # трек + звуковой дизайн → audio/mix.wav, audio-env.js
node render.mjs                               # → out/vavilon_31s.mp4
```

Превью со звуком: откройте `index.html` через локальный сервер (`python3 -m http.server`), пробел — играть/пауза.
**T** — отметить момент слова; полученные секунды впишите в `CUE` в начале скрипта `index.html`
и в `CUES` в `tools/audio.py` (там же звуковые акценты), затем пересоберите.

Папки `audio/` и `out/` не коммитятся: в них трек Miyagi, на который у проекта нет лицензии.
Шрифты: Playfair Display и JetBrains Mono (SIL OFL, файлы в `fonts/`).
