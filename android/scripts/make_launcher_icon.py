#!/usr/bin/env python3
"""HNL Mark launcher PNGs, using the HNL QLTC legacy-mipmap approach.

No adaptive-icon XML, opaque background layer, dark frame or white border is
provided. Each density PNG is RGBA with transparent rounded corners and the
unmodified HNL logo colors. This is the same resource resolution strategy used
in the connected HNL QLTC Android wrapper.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUTER_PADDING = 19
LEGACY_RATIO = 0.98
DENSITIES = (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96),
             ("xxhdpi", 144), ("xxxhdpi", 192))


def original_full_color_image(root: Path) -> Image.Image:
    source = Image.open(root / "hnl-logo-512.png").convert("RGBA")
    if source.size != (512, 512):
        source = source.resize((512, 512), Image.Resampling.LANCZOS)
    return source.crop((OUTER_PADDING, OUTER_PADDING,
                        512 - OUTER_PADDING, 512 - OUTER_PADDING))


def _centered_art(original: Image.Image, canvas: int, image_size: int) -> Image.Image:
    # Preserve blue/silver/gold pixels exactly (apart from high-quality resize).
    # Only the exterior geometry is masked. Transparent canvas means MIUI
    # cannot expose an unwanted dark adaptive-icon layer around the logo.
    result = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    scaled = original.resize((image_size, image_size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (image_size, image_size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, image_size - 1, image_size - 1),
        radius=max(1, round(image_size * 0.145)), fill=255)
    scaled.putalpha(mask)
    start = (canvas - image_size) // 2
    result.alpha_composite(scaled, (start, start))
    return result


def generate(root: Path, app: Path) -> None:
    original = original_full_color_image(root)
    # Do NOT generate anydpi-v26 adaptive XML/foreground/background overlays.
    # A legacy PNG icon per density matches the proven HNL QLTC arrangement.
    assert not (app / "res/mipmap-anydpi-v26/ic_launcher.xml").exists(),         "Adaptive icon XML would override transparent PNGs on Android 8+"
    for density, size in DENSITIES:
        folder = app / "res" / ("mipmap-" + density)
        folder.mkdir(parents=True, exist_ok=True)
        visible = max(1, round(size * LEGACY_RATIO))
        icon = _centered_art(original, size, visible)
        assert icon.getpixel((0, 0))[3] == 0
        assert icon.getpixel((size - 1, size - 1))[3] == 0
        icon.save(folder / "ic_launcher.png")
        icon.save(folder / "ic_launcher_round.png")
    print("PASS: HNL QLTC-style RGBA launcher; no black/white border layer")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    generate(root, root / "android/app/src/main")
