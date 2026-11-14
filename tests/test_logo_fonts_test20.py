#!/usr/bin/env python3
"""HNL Mark TEST21: isolated font and logo settings without rewriting the launcher icon."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
read=lambda f:(r/f).read_text()
fonts=read('studio-ui/src/services/watermarkFonts.ts')
logo=read('studio-ui/src/services/watermarkLogo.ts')
config=read('studio-ui/src/types/hnl.ts')
ui=read('studio-ui/src/components/stamps/StampsAndSettingsScreen.tsx')
renderer=read('studio-ui/src/services/timemarkRenderer.ts')
preview=read('studio-ui/src/components/watermark/OriginalTimemarkOverlay.tsx')
for name in ['be-vietnam','jakarta','jetbrains','roboto','condensed','rounded','light','bold','sans','serif','times','courier','handwriting']:
 assert f"value:'{name}'" in fonts,name
for key in ['logoImageDataUrl','logoPosition','logoCustomPos','logoSizePct','timemarkLogoEnabled']:
 assert key in config and key in ui,key
assert 'normalizeWatermarkLogo' in ui and 'Kéo để đặt logo' in ui
assert 'timemarkLogoEnabled: false' in read('studio-ui/src/data/templates.ts')
assert 'const logo=await loadWatermarkLogo(config)' in renderer
assert 'drawWatermarkLogo(g,W,H,config,logo)' in renderer
assert 'drawOriginalTimemark(ctx,w,h,config,orientationDeg,photoCode,logo)' in preview
assert 'drawConfiguredStamp(ctx,canvas.width,canvas.height,timestamp,activeOrientation,photoCode,logo)' in read('studio-ui/src/services/stampedVideoCapture.ts')
assert 'drawConfiguredStamp(ctx,canvas.width,canvas.height,cfg,0,code,logo)' in read('studio-ui/src/services/importedVideoStamp.ts')
assert 'drawOriginalTimemark(ctx,width,height,config,orientation,code,logo)' in read('studio-ui/src/services/stampRenderer.ts')
assert 'hnlmark-watermark-settings-v1' in read('studio-ui/src/App.tsx')
assert 'logoSrc(config)' in ui and 'logoEnabled(config)' in logo
assert 'logoPosition?: WatermarkPositionPreset' in config
assert "applicationIdSuffix '.trial2527'" in read('android/app/build.gradle')
assert 'HNLMark STUDIO 27' in read('android/app/build.gradle')
assert 'make_launcher_icon.py' not in ''.join(str(p) for p in r.glob('studio-ui/src/services/watermark*.ts'))
print('PASS: TEST21 13 fonts, movable custom logo, timemark opt-in, preview + image/video stamping, settings persistence')
