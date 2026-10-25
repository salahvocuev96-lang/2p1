#!/usr/bin/env bash
# Сведение финальной звуковой дорожки: речь + музыка с приседанием музыки под голос.
set -euo pipefail
cd "$(dirname "$0")"
OUT=out
VO=audio

# Тайминги реплик (с). Длительности натуральные, голос не ускорен.
D1=500; D2=4550; D3=11100; D4=19300; D5=26200

ffmpeg -y -hide_banner -loglevel error \
  -i "$OUT/music.wav" \
  -i "$VO/vo1.wav" -i "$VO/vo2.wav" -i "$VO/vo3.wav" -i "$VO/vo4.wav" -i "$VO/vo5.wav" \
  -filter_complex "
    [1]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${D1}|${D1}[a1];
    [2]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${D2}|${D2}[a2];
    [3]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${D3}|${D3}[a3];
    [4]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${D4}|${D4}[a4];
    [5]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${D5}|${D5}[a5];
    [a1][a2][a3][a4][a5]amix=inputs=5:normalize=0,
      highpass=f=95,
      equalizer=f=250:t=q:w=1.0:g=-2,
      equalizer=f=3200:t=q:w=1.2:g=3,
      acompressor=threshold=-19dB:ratio=3.2:attack=6:release=180:makeup=4,
      alimiter=limit=0.93,
      apad=whole_dur=33.0,atrim=0:33.0,asetpts=N/SR/TB[voc];
    [voc]asplit=2[vomain][vokey];
    [0]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,
      atrim=0:33.0,asetpts=N/SR/TB[mus];
    [mus][vokey]sidechaincompress=threshold=0.04:ratio=10:attack=15:release=380:makeup=1:level_sc=1[duck];
    [duck][vomain]amix=inputs=2:normalize=0,
      alimiter=limit=0.95,volume=-1dB,
      afade=t=out:st=32.5:d=0.5[out]
  " -map "[out]" -c:a pcm_s16le "$OUT/mix.wav"

echo "mix.wav готов:"
ffprobe -v error -show_entries format=duration -show_entries stream=sample_rate,channels -of default=nw=1 "$OUT/mix.wav"
