#!/usr/bin/env python3
"""Prepare the ORIGINAL HNLMark logo as a full-bleed Android adaptive icon.

The previous generator shrank HNL to 196/432 px over a dark navy rectangle:
this created the unwanted thick dark frame. This version never adds
background, borders, recoloring, decorative shapes, or a new logo.
The source PNG in the repository is immutable.
"""
from pathlib import Path
from PIL import Image

def generate(root: Path, app: Path):
    source = root / "hnl-logo-512.png"
    if not source.is_file():
        raise FileNotFoundError(source)
    with Image.open(source) as original:
        img = original.convert("RGBA")
    if img.width != img.height:
        raise ValueError("Expected square original HNLMark artwork")
    drawable = app / "res" / "drawable"
    drawable.mkdir(parents=True, exist_ok=True)
    # Android's launcher itself applies the circle/squircle shape.
    # Full-bleed original, rather than a miniature inside a navy plate.
    background = img.resize((432,432), Image.Resampling.LANCZOS)
    background.save(drawable / "hnlmark_icon.png")
    # Required transparent foreground for adaptive-icon layers.
    # All existing art lives in the background, unchanged in proportion.
    foreground = Image.new("RGBA", (432,432), (0,0,0,0))
    foreground.save(drawable / "hnlmark_foreground.png")
    # A full canvas must be populated; no invented external padding.
    assert background.getbbox() == (0,0,432,432)
    assert background.getpixel((0,0))[:3] != (16,44,75), "Old navy border remains"
    assert foreground.getchannel("A").getbbox() is None
    print("PASS: original HNLMark logo fills Android icon; no added navy border")

if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    generate(root,root / "android/app/src/main")
