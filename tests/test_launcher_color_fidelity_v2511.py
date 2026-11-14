#!/usr/bin/env python3
"""HNL icon pixel, OEM safe zone, adaptive and legacy fallback regressions."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import tempfile
import importlib.util
ROOT = Path(__file__).resolve().parents[1]
SCRIPT = (ROOT/'android/scripts/make_launcher_icon.py').read_text(encoding='utf-8')
assert 'original_full_color_image' in SCRIPT
assert 'OUTER_PADDING = 19' in SCRIPT
assert '_cut_out_neutral_plate' not in SCRIPT and 'ImageFilter' not in SCRIPT
assert 'art.putalpha' not in SCRIPT and 'saturation' not in SCRIPT
spec = importlib.util.spec_from_file_location('hnl_launcher', ROOT/'android/scripts/make_launcher_icon.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory(prefix='hnl_launcher_safe_') as tmp:
    module.generate(ROOT, Path(tmp))
    src = Image.open(ROOT/'hnl-logo-512.png').convert('RGBA')
    art = src.crop((19,19,493,493))
    W, S = module.CANVAS, module.ARTWORK_SIZE
    first = (W-S)//2
    image = Image.open(Path(tmp)/'res/drawable/hnlmark_foreground.png').convert('RGBA')
    expected = art.resize((S,S), Image.Resampling.LANCZOS)
    corner_mask=Image.new('L',(S,S),0)
    ImageDraw.Draw(corner_mask).rounded_rectangle((0,0,S-1,S-1),radius=round(S*0.145),fill=255)
    # All strongly colored HNL logo pixels must remain in the geometric mask.
    rgb=expected.load(); ma=corner_mask.load()
    for yy in range(S):
        for xx in range(S):
            r,g,b,a=rgb[xx,yy]
            if ((max(r,g,b)-min(r,g,b)>55 and min(r,g,b)<220) or max(r,g,b)<160):
                assert ma[xx,yy]==255, ('Source logo pixel in cropped corner',xx,yy)
    expected.putalpha(corner_mask)
    expected_on_transparent=Image.new('RGBA',(S,S),(0,0,0,0))
    expected_on_transparent.alpha_composite(expected)
    assert image.size == (W,W)
    assert image.getchannel('A').getbbox() == (first,first,first+S,first+S)
    assert ImageChops.difference(image.crop((first,first,first+S,first+S)),expected_on_transparent).getbbox() is None, 'Original visible RGB changed'
    assert image.getpixel((0,0))[3] == 0 and image.getpixel((W-1,W-1))[3] == 0
    background=Image.open(Path(tmp)/'res/drawable/hnlmark_icon.png').convert('RGBA')
    assert background.getpixel((0,0))[:3]==module.BACKGROUND_RGB
    # Android's 108dp canvas exposes center ~72dp. Both MIUI squircle and the
    # stricter circular mask must not clip BLUE/GOLD (non-neutral) artwork.
    lo=(W-module.VISIBLE_DIAMETER)//2
    hi=lo+module.VISIBLE_DIAMETER
    for mask_type in ('miui_squircle','circle'):
        mask=Image.new('L',(W,W),0)
        painter=ImageDraw.Draw(mask)
        if mask_type=='circle':painter.ellipse((lo,lo,hi-1,hi-1),fill=255)
        else:painter.rounded_rectangle((lo,lo,hi-1,hi-1),radius=52,fill=255)
        visible=mask.load(); artpix=image.load()
        colored=0
        for y in range(first,first+S):
            for x in range(first,first+S):
                r,g,b,a=artpix[x,y]
                if a>240 and ((max(r,g,b)-min(r,g,b)>55 and min(r,g,b)<220) or max(r,g,b)<160):
                    colored+=1
                    assert visible[x,y]>0, f'{mask_type} clips HNL blue/gold at {(x,y)}'
        assert colored>12000
    for density,size in module.DENSITIES:
        legacy_size=round(size*module.LEGACY_RATIO)
        start=(size-legacy_size)//2
        expected=art.resize((legacy_size,legacy_size),Image.Resampling.LANCZOS)
        leg_mask=Image.new('L',(legacy_size,legacy_size),0)
        ImageDraw.Draw(leg_mask).rounded_rectangle((0,0,legacy_size-1,legacy_size-1), radius=max(1,round(legacy_size*0.145)),fill=255)
        expected.putalpha(leg_mask)
        expected_bg=Image.new('RGBA',(legacy_size,legacy_size),(*module.BACKGROUND_RGB,255))
        expected_bg.alpha_composite(expected)
        for name in ('ic_launcher.png','ic_launcher_round.png'):
            actual=Image.open(Path(tmp)/f'res/mipmap-{density}'/name).convert('RGBA')
            assert actual.size==(size,size)
            assert ImageChops.difference(actual.crop((start,start,start+legacy_size,start+legacy_size)),expected_bg).getbbox() is None,(density,name)
    print('PASS: HNL pixel colors original, icon no corner clipping under circular/squircle mask')
