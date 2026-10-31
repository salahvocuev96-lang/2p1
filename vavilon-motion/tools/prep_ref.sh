#!/usr/bin/env bash
# Нарезает видео-референс пользователя на кадры 30 fps для вставок в ролик.
# Запуск: bash tools/prep_ref.sh ПУТЬ/К/ВИДЕО_РЕФЕРЕНСУ.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p refclips
ffmpeg -v error -y -i "$1" -vf fps=30 -q:v 3 refclips/f_%04d.jpg
n=$(ls refclips/f_*.jpg | wc -l)
echo "window.REFN=$n;" > refclips/count.js
echo "ok: $n кадров в refclips/"
