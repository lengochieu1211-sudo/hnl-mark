#!/usr/bin/env python3
"""Preserve full original HNL artwork inside Android adaptive icon safe zone.

The artwork stays byte-for-byte unchanged in the repository. Android launchers
mask the adaptive icon to circles/squircles; scaling 100% cropped the camera and
HNL corners. Fit the artwork inside the centered safe area rather than painting
a navy/white outline or shrinking the display after launcher clipping.
"""
from pathlib import Path
from PIL import Image

CANVAS = 432
ARTWORK = 232  # within central 2/3 safe area on most adaptive-icon masks

def generate(root: Path, app: Path):
    source = root / "hnl-logo-512.png"
    with Image.open(source) as original:
        artwork = original.convert("RGBA")
    if artwork.width != artwork.height:
        raise ValueError("Expected square original HNLMark artwork")
    drawable = app / "res" / "drawable"
    drawable.mkdir(parents=True, exist_ok=True)
    # Keep a light background close to the original edge, not the old navy ring.
    background = Image.new("RGBA", (CANVAS, CANVAS), (250, 243, 235, 255))
    background.save(drawable / "hnlmark_icon.png")
    foreground = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    fitted = artwork.resize((ARTWORK, ARTWORK), Image.Resampling.LANCZOS)
    inset = (CANVAS - ARTWORK) // 2
    foreground.alpha_composite(fitted, (inset, inset))
    foreground.save(drawable / "hnlmark_foreground.png")
    assert foreground.getchannel("A").getbbox() == (inset, inset, inset + ARTWORK, inset + ARTWORK)
    assert foreground.getpixel((0, 0))[3] == 0
    assert background.getpixel((0, 0))[:3] != (16, 44, 75)
    print("PASS: original HNL logo centered in adaptive icon safe zone; no cropping")

if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    generate(root, root / "android/app/src/main")
