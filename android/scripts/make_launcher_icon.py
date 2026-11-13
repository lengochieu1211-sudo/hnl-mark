#!/usr/bin/env python3
"""Build an adaptive HNL icon without the original cream/white square matte.

The original HNL artwork file stays untouched. We retain its actual blue HNL,
metallic L and golden camera pixels; the neutral cream photo background is
removed for the Android launcher. The transparent foreground fits inside a
circle-safe 312px square on a 432px adaptive icon canvas.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

CANVAS = 432
ARTWORK = 312

def _cut_out_neutral_plate(art):
    art = art.convert('RGBA')
    w, h = art.size
    if (w,h)!=(512,512):
        # Preserve the exact design proportions; masks use normalized 512px coordinates.
        art=art.resize((512,512),Image.Resampling.LANCZOS)
    mask=Image.new('L',(512,512),0)
    pixels=art.load();alpha=mask.load()
    for y in range(512):
        for x in range(512):
            r,g,b,_=pixels[x,y]
            maximum=max(r,g,b);minimum=min(r,g,b)
            saturation=0 if maximum==0 else 255*(maximum-minimum)//maximum
            if (saturation>63 and maximum>45) or (maximum<105 and saturation>12):
                alpha[x,y]=255
    painter=ImageDraw.Draw(mask)
    # Preserve metallic L (the pixels are desaturated like the cream backdrop).
    painter.polygon([(313,76),(357,76),(361,251),(368,266),(435,266),
                     (438,300),(385,301),(371,296),(354,285),(340,267),
                     (326,237),(312,199)],fill=255)
    # Preserve golden camera with its white lens, flash and verified-style check.
    painter.polygon([(282,340),(305,335),(312,328),(318,316),(327,310),
                     (371,311),(389,320),(397,333),(415,333),(427,340),
                     (430,414),(422,427),(290,429),(281,414)],fill=255)
    art.putalpha(mask.filter(ImageFilter.GaussianBlur(.85)))
    return art

def generate(root: Path, app: Path):
    source=root/'hnl-logo-512.png'
    artwork=_cut_out_neutral_plate(Image.open(source))
    drawable=app/'res'/'drawable'
    drawable.mkdir(parents=True,exist_ok=True)
    background=Image.new('RGBA',(CANVAS,CANVAS),(10,30,65,255))
    draw=ImageDraw.Draw(background)
    for y in range(CANVAS):
        draw.line((0,y,CANVAS,y),fill=(int(9+y*.010),int(30+y*.032),int(66+y*.042),255))
    background.save(drawable/'hnlmark_icon.png')
    foreground=Image.new('RGBA',(CANVAS,CANVAS),(0,0,0,0))
    foreground.alpha_composite(artwork.resize((ARTWORK,ARTWORK),Image.Resampling.LANCZOS),
                               ((CANVAS-ARTWORK)//2,(CANVAS-ARTWORK)//2))
    foreground.save(drawable/'hnlmark_foreground.png')
    left,top,right,bottom=foreground.getchannel('A').getbbox()
    assert 55<=left<right<=377 and 55<=top<bottom<=377
    assert foreground.getpixel((0,0))[3]==0
    assert background.getpixel((0,0))[:3] != (255,255,255)
    print('PASS: HNL original artwork details retained, white launcher plate removed')

if __name__=='__main__':
    root=Path(__file__).resolve().parents[2]
    generate(root,root/'android/app/src/main')
