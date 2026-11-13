#!/usr/bin/env python3
"""Bundle the exact repository web core into the local Android APK."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "android" / "app" / "src" / "main"
WWW = APP / "assets" / "www"
WWW.mkdir(parents=True, exist_ok=True)
resources = [
    "index.html", "style.css", "app.js", "video.js", "orientation.js",
    "crop-ratios.js", "sw.js", "manifest.webmanifest",
    "hnl-logo-192.png", "hnl-logo-512.png",
]
for name in resources:
    source = ROOT / name
    if not source.is_file():
        raise SystemExit(f"Missing web source: {source}")
    shutil.copy2(source, WWW / name)

shutil.copy2(ROOT / "android" / "android-app.js", WWW / "android-app.js")
shutil.copy2(ROOT / "android" / "android-ui.css", WWW / "android-ui.css")

index = (WWW / "index.html").read_text(encoding="utf-8")
assert "</head>" in index and "</body>" in index
assert "orientation.js" in index and "video.js" in index
index = index.replace(
    "</head>",
    '<link rel="stylesheet" href="./android-ui.css"></head>',
    1,
)
index = index.replace(
    "</body>",
    '<script src="./android-app.js" defer></script></body>',
    1,
)
(WWW / "index.html").write_text(index, encoding="utf-8")

drawable = APP / "res" / "drawable"
drawable.mkdir(parents=True, exist_ok=True)
shutil.copy2(ROOT / "hnl-logo-192.png", drawable / "hnlmark_icon.png")
print("PASS: packaged", len(resources), "original web assets + native UI/bridge/icon")
