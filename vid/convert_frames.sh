#!/bin/bash

rm -r ../vid_frames;
mkdir ../vid_frames;

for f in *.mp4; do 
    mkdir ../vid_frames/${f%.*};
    ffmpeg -i $f -r 24 ../vid_frames/${f%.*}/%03d.jpg;
done
