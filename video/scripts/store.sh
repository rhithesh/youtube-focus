#!/usr/bin/env bash
# Renders the Chrome Web Store art to out/store/ as 24-bit PNGs (the store rejects alpha).
# Run scripts/capture-ui.sh first if the popup or options page changed.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/store
for id in store-1-youtube store-2-social store-3-goal store-4-goals store-5-popup store-promo-small store-marquee; do
  npx remotion still "$id" "out/store/$id.png" --overwrite --log=error
  # Flatten onto the paper colour and drop the alpha channel.
  ffmpeg -v error -y -f lavfi -i "color=c=0xf3f0e8:s=$(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=s=x:p=0 "out/store/$id.png")" \
    -i "out/store/$id.png" -filter_complex "[0][1]overlay=format=auto,format=rgb24" -frames:v 1 "out/store/$id.tmp.png"
  mv "out/store/$id.tmp.png" "out/store/$id.png"
  echo "$id.png  $(ffprobe -v error -select_streams v -show_entries stream=width,height,pix_fmt -of csv=s=x:p=0 "out/store/$id.png")"
done
