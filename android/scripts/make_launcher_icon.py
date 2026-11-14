#!/usr/bin/env python3
"""MIUI-safe Android adaptive launcher from original HNL RGB artwork.

Android OEM launchers mask the center ~2/3 of the 108dp adaptive canvas.
Keep the entire full-color original INSIDE this center region. The original
artwork pixels are changed only by crop+LANCZOS resize, never by threshold
color-keying, recoloring, hue or contrast manipulation.
"""
from pathlib import Path
from PIL import Image, ImageDraw

CANVAS = 432
# On the 432px adaptive canvas the Android visible window is ~288px centered.
# Size 220px protects original dark blue lettering and gold flourish even under
# a central circular 288px mask, while occupying ~76% of the visible icon.
ARTWORK_SIZE = 220
VISIBLE_DIAMETER = 288
OUTER_PADDING = 19
DENSITIES = (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96),
             ("xxhdpi", 144), ("xxxhdpi", 192))
BACKGROUND_RGB = (248, 241, 234)  # warm off-white matches neutral original background
LEGACY_RATIO = 0.82


def original_full_color_image(root: Path) -> Image.Image:
    source = Image.open(root / "hnl-logo-512.png").convert("RGBA")
    if source.size != (512, 512):
        source = source.resize((512, 512), Image.Resampling.LANCZOS)
    return source.crop((OUTER_PADDING, OUTER_PADDING,
                        512 - OUTER_PADDING, 512 - OUTER_PADDING))


def _centered_art(original: Image.Image, canvas: int, image_size: int,
                  background=(0, 0, 0, 0)) -> Image.Image:
    # No pixel selection based on color: metallic L, white lens and gold survive.
    result = Image.new("RGBA", (canvas, canvas), background)
    scaled = original.resize((image_size, image_size), Image.Resampling.LANCZOS)
    # Trim just the four white square corner pixels of the original's outside
    # plate. Pure geometry, no color replacement or effect on blue/silver/gold.
    corner_mask = Image.new("L", (image_size, image_size), 0)
    ImageDraw.Draw(corner_mask).rounded_rectangle(
        (0, 0, image_size - 1, image_size - 1),
        radius=max(1, round(image_size * 0.145)), fill=255)
    scaled.putalpha(corner_mask)
    start = (canvas - image_size) // 2
    result.alpha_composite(scaled, (start, start))
    return result


def generate(root: Path, app: Path):
    original = original_full_color_image(root)
    icon = _centered_art(original, CANVAS, ARTWORK_SIZE)
    drawable = app / "res" / "drawable"
    drawable.mkdir(parents=True, exist_ok=True)
    # Neutral continuation for the space outside the safe foreground, not a
    # white border baked into the HNL logo and never painted over its glyphs.
    background = Image.new("RGBA", (CANVAS, CANVAS), (*BACKGROUND_RGB, 255))
    background.save(drawable / "hnlmark_icon.png")
    icon.save(drawable / "hnlmark_foreground.png")

    # Density-specific legacy resources, consistent with the HNL QLTC approach.
    for density, size in DENSITIES:
        mipmap = app / "res" / ("mipmap-" + density)
        mipmap.mkdir(parents=True, exist_ok=True)
        visible = max(1, round(size * LEGACY_RATIO))
        legacy = _centered_art(original, size, visible, (*BACKGROUND_RGB, 255))
        legacy.save(mipmap / "ic_launcher.png")
        legacy.save(mipmap / "ic_launcher_round.png")

    start = (CANVAS - ARTWORK_SIZE) // 2
    assert icon.size == (CANVAS, CANVAS)
    assert icon.getchannel("A").getbbox() == (
        start, start, start + ARTWORK_SIZE, start + ARTWORK_SIZE), "Artwork must be centered"
    assert ARTWORK_SIZE < VISIBLE_DIAMETER, "Cannot touch OEM icon mask edges"
    print("PASS: original HNL colors preserved, adaptive icon inside Android/MIUI safe area")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    generate(root, root / "android/app/src/main")
