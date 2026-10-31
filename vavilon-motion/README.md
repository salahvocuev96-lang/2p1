# Вавилон — 31-секундный лирик-ролик (HTML/Canvas)

Концепт и раскадровка: [STORYBOARD.md](STORYBOARD.md).

## Сборка MP4 (1920×1080, 60 fps, H.264 + AAC, ровно 31 с)

Нужны: Python 3 + numpy, Node 18+, Playwright с Chromium, ffmpeg.

```bash
python3 tools/audio.py ПУТЬ/К/IMG_6767.MP4   # трек + звуковой дизайн → audio/mix.wav, audio-env.js
bash tools/prep_ref.sh ПУТЬ/К/ВИДЕО_РЕФЕРЕНСУ.mp4   # кадры для вставок → refclips/
node render.mjs                               # → out/vavilon_31s.mp4
```

Превью со звуком: откройте `index.html` через локальный сервер (обязательно, иначе браузер не даст обработать кадры-вставки) (`python3 -m http.server`), пробел — играть/пауза.
**T** — отметить момент слова; полученные секунды впишите в `CUE` в начале скрипта `index.html`
и в `CUES` в `tools/audio.py` (там же звуковые акценты), затем пересоберите.

Папки `audio/`, `refclips/` и `out/` не коммитятся: в них трек Miyagi и кадры чужого видео, на которые у проекта нет лицензии.
Шрифты: Playfair Display и JetBrains Mono (SIL OFL, файлы в `fonts/`).
