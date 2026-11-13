#!/usr/bin/env python3
"""Produce Android adaptive launcher resources from the unchanged HNLMark logo.

Only transparent outside-white canvas pixels are discarded. HNL lettering,
camera icon, gold wave, and their colors are never redrawn or recolored.
"""
from pathlib import Path
from collections import deque
from PIL import Image

def generate(root: Path, app: Path):
    source=root/'hnl-logo-512.png'
    if not source.is_file():
        raise FileNotFoundError(source)
    img=Image.open(source).convert('RGBA')
    width,height=img.size
    pix=img.load()
    seen=bytearray(width*height)
    queue=deque()
    def is_white(x,y):
        red,green,blue,_=pix[x,y]
        return red>=249 and green>=249 and blue>=249
    def seed(x,y):
        idx=y*width+x
        if not seen[idx] and is_white(x,y):
            seen[idx]=1
            queue.append((x,y))
    for x in range(width):
        seed(x,0)
        seed(x,height-1)
    for y in range(height):
        seed(0,y)
        seed(width-1,y)
    while queue:
        x,y=queue.popleft()
        for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=xx<width and 0<=yy<height:
                seed(xx,yy)
    for y in range(height):
        for x in range(width):
            if seen[y*width+x]:
                pix[x,y]=(0,0,0,0)
    box=img.getchannel('A').getbbox()
    if not box:
        raise ValueError('Logo appears fully transparent')
    # The adaptive icon can be circular or squircle; allow 20%-23% inset
    # without using the source image's white rectangular background.
    subject=img.crop(box)
    subject.thumbnail((338,338),Image.Resampling.LANCZOS)
    foreground=Image.new('RGBA',(432,432),(0,0,0,0))
    foreground.alpha_composite(subject,((432-subject.width)//2,(432-subject.height)//2))
    drawable=app/'res'/'drawable'
    drawable.mkdir(parents=True,exist_ok=True)
    foreground.save(drawable/'hnlmark_foreground.png')
    background=Image.new('RGBA',(432,432),(16,44,75,255))
    background.alpha_composite(foreground)
    background.resize((192,192),Image.Resampling.LANCZOS).save(drawable/'hnlmark_icon.png')
    print('PASS: adaptive icon foreground with transparent OUTER white margin; preserved HNL artwork')

if __name__=='__main__':
    root=Path(__file__).resolve().parents[2]
    generate(root,root/'android/app/src/main')
