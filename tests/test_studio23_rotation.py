#!/usr/bin/env python3
"""Source contract regression for physical/display rotation without requiring hardware."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(x):return (root/x).read_text()
android=read('android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java')
bridge=read('studio-ui/src/services/deviceBridge.ts')
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
simple=read('studio-ui/src/services/simpleStampRenderer.ts')
wm=read('studio-ui/src/components/watermark/WatermarkOverlay.tsx')
video=read('studio-ui/src/services/stampedVideoCapture.ts')
orient=read('studio-ui/src/services/stampOrientation.ts')
assert android.count('setDeviceOrientation(')>=1 and android.count('screenAngle()')>=3
assert 'displayAngle?:number' in bridge and 'detail:{angle,displayAngle}' in bridge
assert 'physicalDegrees+displayDegrees' in orient
assert 'resolveStampOrientation(angle,screen)' in cam
assert '__hnlNativeOrientation' in cam and '__hnlNativeOrientation' in android
assert 'registerDisplayListener' in android and 'unregisterDisplayListener' in android
assert 'lastPublishedDisplayAngle' in android and 'publishOrientation(true)' in android
assert 'isLandscapeViewport ? 0 : orientationDeg' not in cam
assert 'const watermarkTurn: OrientationDeg = normalizeStampAngle(orientationDeg);' in cam
assert 'stampOrientationRef.current' in cam and '()=>stampOrientationRef.current' in cam
assert 'orientation: OrientationDeg | (()=>OrientationDeg)' in video
assert 'activeOrientation' in video
assert 'ctx.rotate(orientation*Math.PI/180)' in simple
assert 'ctx.translate(width,height);ctx.rotate(Math.PI)' in simple
assert 'drawWatermarkLogo(ctx,W,H,config,logo)' in simple
assert 'translate(-50%, -50%) rotate(${orientationDeg}deg)' in wm
assert "transform: orientationDeg === 180 ? 'rotate(180deg)'" not in wm
print('PASS: camera orientation uses clockwise OEL + CCW display; independent display events and 4-direction stamp parity')
