#!/usr/bin/env python3
"""Verify real HNL logo color fidelity in Android launcher resources."""
from pathlib import Path
from PIL import Image, ImageChops
import tempfile
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=(ROOT/'android/scripts/make_launcher_icon.py').read_text(encoding='utf-8')
assert 'original_full_color_image' in SCRIPT
assert 'OUTER_PADDING = 19' in SCRIPT
assert '_cut_out_neutral_plate' not in SCRIPT
assert 'ImageFilter' not in SCRIPT
assert 'art.putalpha' not in SCRIPT
assert "foreground.save" not in SCRIPT or 'icon.save(drawable / "hnlmark_foreground.png")' in SCRIPT
spec=importlib.util.spec_from_file_location('hnl_launcher',ROOT/'android/scripts/make_launcher_icon.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory(prefix='hnl_launcher_test_') as tmp:
    module.generate(ROOT,Path(tmp))
    icon_dir=Path(tmp)
    src=Image.open(ROOT/'hnl-logo-512.png').convert('RGBA')
    assert src.size==(512,512)
    # Exact RGB reproduction, with only crop+resize; all cream/silver/gold pixels retained.
    expected=src.crop((19,19,493,493)).resize((432,432),Image.Resampling.LANCZOS)
    icon=Image.open(icon_dir/'res/drawable/hnlmark_foreground.png').convert('RGBA')
    assert icon.size==(432,432)
    assert ImageChops.difference(icon,expected).getbbox() is None,'Pixel colors changed'
    assert icon.getextrema()[3]==(255,255),'White camera/light metal deleted'
    for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
        exact=src.crop((19,19,493,493)).resize((size,size),Image.Resampling.LANCZOS)
        for name in ['ic_launcher.png','ic_launcher_round.png']:
            img=Image.open(icon_dir/f'res/mipmap-{density}'/name).convert('RGBA')
            assert ImageChops.difference(img,exact).getbbox() is None,(density,name)
    print('PASS: original blue/silver/gold/white pixels intact in adaptive + all mipmap icons')
