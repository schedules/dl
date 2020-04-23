#!/bin/sh
ffmpeg -i video.ts.mp4 -i audio.ts.m4a -c copy -map 0:0 -map 1:0 -shortest mux.mp4
