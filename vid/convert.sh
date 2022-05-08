#!/bin/bash

for f in *.mov; do ffmpeg -i $f ${f%.*}.mp4; done
