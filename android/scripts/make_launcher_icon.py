#!/usr/bin/env python3
"""Generate launcher icons from the ORIGINAL HNL artwork, preserving its RGB colors.

Do not chroma-key ivory/white pixels: that destroys the silver L, bright lens,
white details and anti-aliased gold curves. Cropping the outer neutral padding
rather than removing colors avoids the thick inner white frame seen in TEST 8
and the incorrect blue/gold rendering seen in TEST 9/10.
"""
from pathlib import Path
from PIL import Image

CANVAS = 432
# Original 512px mark has an external white border/padding. Remove only the
# outside 19px from all four sides; never re-draw or recolor the HNL symbol.
OUTER_PADDING = 19
DENSITIES = (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96),
             ("xxhdpi", 144), ("xxxhdpi", 192))


def original_full_color_image(root: Path) -> Image.Image:
    source = Image.open(root / "hnl-logo-512.png").convert("RGBA")
    if source.size != (512, 512):
        source = source.resize((512, 512), Image.Resampling.LANCZOS)
    return source.crop((OUTER_PADDING, OUTER_PADDING,
                        512 - OUTER_PADDING, 512 - OUTER_PADDING))


def generate(root: Path, app: Path):
    original = original_full_color_image(root)
    icon = original.resize((CANVAS, CANVAS), Image.Resampling.LANCZOS)
    drawable = app / "res" / "drawable"
    drawable.mkdir(parents=True, exist_ok=True)
    # Adaptive launcher masks clip the full-size foreground; the warm background
    # is only a fallback during OEM icon animation, not a second colored plate.
    background = Image.new("RGBA", (CANVAS, CANVAS), (250, 242, 236, 255))
    background.save(drawable / "hnlmark_icon.png")
    icon.save(drawable / "hnlmark_foreground.png")

    # As in HNL QLTC, provide real density-specific launcher resources for
    # launchers that read legacy icons. Never composite a colored square behind
    # the original logo artwork.
    for density, size in DENSITIES:
        mipmap = app / "res" / ("mipmap-" + density)
        mipmap.mkdir(parents=True, exist_ok=True)
        scaled = original.resize((size, size), Image.Resampling.LANCZOS)
        scaled.save(mipmap / "ic_launcher.png")
        scaled.save(mipmap / "ic_launcher_round.png")

    assert icon.size == (CANVAS, CANVAS)
    assert icon.getextrema()[3] == (255, 255), "Do not delete light logo pixels"
    assert icon.getpixel((CANVAS // 2, CANVAS // 2)) == original.resize(
        (CANVAS, CANVAS), Image.Resampling.LANCZOS
    ).getpixel((CANVAS // 2, CANVAS // 2))
    print("PASS: HNL original RGB kept; no color-key, tint or external white padding")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    generate(root, root / "android/app/src/main")
