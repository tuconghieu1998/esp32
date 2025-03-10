#!/bin/bash

FFMPEG_PATH=$(which ffmpeg)

RTSP_URL="rtsp://admin:@dmin12sd@192.168.10.165:554/Streaming/Channels/101"
OUTPUT_DIR="./public/hls"

mkdir -p $OUTPUT_DIR

$FFMPEG_PATH -i "$RTSP_URL" \
-c:v libx264 -preset ultrafast -g 50 -sc_threshold 0 \
-b:v 1500k -maxrate 1500k -bufsize 3000k \
-hls_time 2 -hls_list_size 4 -hls_flags delete_segments \
-f hls "$OUTPUT_DIR/live.m3u8"