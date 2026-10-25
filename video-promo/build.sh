#!/usr/bin/env bash
# Полная сборка ролика: кадры -> silent.mp4, звук -> mix.wav, затем финальный MP4.
set -euo pipefail
cd "$(dirname "$0")"
OUT=out
FINAL="$OUT/promo-sites-1080x1920.mp4"

if [ "${1:-}" != "--mux-only" ]; then
  node render.mjs              # рендерит music.wav и silent.mp4
fi
./build-audio.sh

# Видео уже в нужном кодеке — перекладываем поток без перекодирования.
ffmpeg -y -hide_banner -loglevel error \
  -i "$OUT/silent.mp4" -i "$OUT/mix.wav" \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart "$FINAL"

echo "=== $FINAL ==="
ffprobe -v error -show_entries format=duration,size,bit_rate \
  -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,pix_fmt,nb_frames,sample_rate,channels \
  -of default=nw=1 "$FINAL"
