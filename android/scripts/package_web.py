#!/usr/bin/env python3
"""Bundle the exact repository web core into the local Android APK."""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "android" / "app" / "src" / "main"
WWW = APP / "assets" / "www"
WWW.mkdir(parents=True, exist_ok=True)
resources = [
    "index.html", "style.css", "app.js", "video.js", "orientation.js",
    "crop-ratios.js", "sw.js", "manifest.webmanifest",
    "camera-controls.js", "camera-controls.css",
    "hnl-logo-192.png", "hnl-logo-512.png",
    "hnl-studio-ui.css", "hnl-studio-ui.js",
]
for name in resources:
    source = ROOT / name
    if not source.is_file():
        raise SystemExit(f"Missing web source: {source}")
    shutil.copy2(source, WWW / name)

for addon in ("android-app.js","android-ui.css","android-camera-v25.js","android-camera-v25.css","android-select-v25.js","android-select-v25.css",
              "android-ux-v251.js","android-ux-v251.css",
              "preview-geometry.js","android-preview-v253.css",
              "android-polish-v257.js","android-polish-v257.css",
              "android-preview-zoom-v259.js","android-preview-zoom-v259.css"):
    shutil.copy2(ROOT / "android" / addon, WWW / addon)

# APK-only UI add-ons are loaded after the shared web stylesheet.



index = (WWW / "index.html").read_text(encoding="utf-8")
assert "</head>" in index and "</body>" in index
assert "orientation.js" in index and "video.js" in index
assert "hnl-studio-ui.js" in index and "hnl-studio-ui.css" in index
index = index.replace(
    "</head>",
    '<link rel="stylesheet" href="./android-ui.css"><link rel="stylesheet" href="./camera-controls.css"><link rel="stylesheet" href="./android-camera-v25.css"><link rel="stylesheet" href="./android-select-v25.css"><link rel="stylesheet" href="./android-ux-v251.css"><link rel="stylesheet" href="./android-preview-v253.css"><link rel="stylesheet" href="./android-polish-v257.css"><link rel="stylesheet" href="./android-preview-zoom-v259.css"><link rel="stylesheet" href="./hnl-studio-ui.css?v=20261114"></head>',
    1,
)
index = index.replace(
    "</body>",
    '<script src="./camera-controls.js" defer></script><script src="./android-camera-v25.js" defer></script><script src="./android-select-v25.js" defer></script><script src="./android-app.js" defer></script><script src="./preview-geometry.js" defer></script><script src="./android-ux-v251.js" defer></script><script src="./android-polish-v257.js" defer></script><script src="./android-preview-zoom-v259.js" defer></script></body>',
    1,
)
(WWW / "index.html").write_text(index, encoding="utf-8")

# AI Studio React is the PRIMARY UI in TEST13. The real legacy HNL processing
# core stays at assets/www/index.html as a reversible advanced workspace.
STUDIO = ROOT / "studio-ui"
subprocess.run(["npm", "install", "--no-audit", "--no-fund", "--prefix", str(STUDIO)], check=True)
subprocess.run(["npm", "run", "build", "--prefix", str(STUDIO)], check=True)
DIST=STUDIO/"dist"
if not (DIST/"index.html").is_file():raise SystemExit("Studio Vite build missing")
STUDIO_WWW=WWW/"studio"
if STUDIO_WWW.exists():shutil.rmtree(STUDIO_WWW)
shutil.copytree(DIST,STUDIO_WWW)
for asset in ('demo-camera-front.jpg','demo-camera-rear.jpg','demo-survey.jpg','demo-night.jpg','demo-coastal.jpg'):
    if not (STUDIO_WWW / asset).is_file():
        raise SystemExit(f'AI Studio illustration missing from offline APK: {asset}')
for name in ("hnl-logo-192.png","hnl-logo-512.png"):
    shutil.copy2(ROOT/name,STUDIO_WWW/name)

drawable = APP / "res" / "drawable"
drawable.mkdir(parents=True, exist_ok=True)
from make_launcher_icon import generate
generate(ROOT, APP)

print("PASS: packaged", len(resources), "original web assets + native UI/bridge/icon")
