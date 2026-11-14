#!/usr/bin/env python3
"""TEST17: HNL QLTC-style icon without OEM adaptive black/white ring."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import importlib.util
import tempfile
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=(ROOT/'android/scripts/make_launcher_icon.py').read_text(encoding='utf8')
assert 'LEGACY_RATIO = 0.98' in SCRIPT
assert 'OUTER_PADDING = 19' in SCRIPT
assert 'BACKGROUND_RGB' not in SCRIPT
assert '_cut_out_neutral_plate' not in SCRIPT
assert not (ROOT/'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml').exists()
manifest=(ROOT/'android/app/src/main/AndroidManifest.xml').read_text(encoding='utf8')
assert 'android:icon="@mipmap/ic_launcher"' in manifest
assert 'android:roundIcon="@mipmap/ic_launcher_round"' in manifest
spec=importlib.util.spec_from_file_location('hnlmark_launcher',ROOT/'android/scripts/make_launcher_icon.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory(prefix='hnl_icon17_') as t:
    app=Path(t)
    m.generate(ROOT,app)
    orig=Image.open(ROOT/'hnl-logo-512.png').convert('RGBA').crop((19,19,493,493))
    for density,size in m.DENSITIES:
        visible=round(size*m.LEGACY_RATIO)
        offset=(size-visible)//2
        expected=orig.resize((visible,visible),Image.Resampling.LANCZOS)
        mask=Image.new('L',(visible,visible),0)
        ImageDraw.Draw(mask).rounded_rectangle((0,0,visible-1,visible-1),radius=max(1,round(visible*0.145)),fill=255)
        expected.putalpha(mask)
        expected_clean=Image.new('RGBA',(visible,visible),(0,0,0,0))
        expected_clean.alpha_composite(expected)
        for name in ('ic_launcher.png','ic_launcher_round.png'):
            icon=Image.open(app/f'res/mipmap-{density}'/name).convert('RGBA')
            assert icon.size==(size,size)
            assert icon.getpixel((0,0))[3]==0 and icon.getpixel((size-1,size-1))[3]==0
            box=icon.getchannel('A').getbbox()
            assert box==(offset,offset,offset+visible,offset+visible),(density,name,box)
            got=icon.crop((offset,offset,offset+visible,offset+visible))
            assert ImageChops.difference(got,expected_clean).getbbox() is None, (density,name,'RGB changed')
            # No border pixels: the launcher canvas outside its rounded logo is clear.
            assert icon.mode=='RGBA'
    print('PASS: HNL palette unchanged, RGBA transparent edge, no adaptive black ring')
