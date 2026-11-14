#!/usr/bin/env python3
"""TEST21 static checks; Android device runtime is a separate requirement."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
read=lambda p:(root/p).read_text(encoding='utf-8')
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
gradle=read('android/app/build.gradle')
emu=read('.github/workflows/android-emulator-smoke.yml')
for marker in ('getUserMedia({video,audio:false})','getUserMedia({audio:true,video:false})',
               'startPendingRef.current=true','setIsRecordingStarting(true)',
               'if(streamRef.current!==stream||!stream.active)',
               'supportedVideoMime(watermarkConfig.videoFormat',
               'recordStartedAtRef.current=Date.now()','Date.now()-recordStartedAtRef.current',
               'if(live.srcObject!==source)live.srcObject=source',
               'disabled={isRecordingStarting || isFinalizing}'):
    assert marker in cam,marker
assert "versionCode 2530" in gradle and "applicationIdSuffix '.trial2530'" in gradle
assert 'RECORD_AUDIO ignore' in emu and 'mic-denied-video-attempt.png' in emu
assert 'camera-roll-review-attempt.png' in emu
assert "isLandscapeViewport ? 'flex-col w-full' : 'flex-row'" in cam
assert cam.count("isLandscapeViewport ? 'w-full px-1' : 'px-3.5'") == 2
assert 'camera-roll-two-photos.png' in emu and 'camera-roll-swipe-older.png' in emu
assert 'camera-roll-after-relaunch.png' in emu and 'am force-stop vn.hnl.xaydung.hnlmark.trial2530' in emu
assert "const latestThumb = latestItem?.kind === 'photo' ? latestItem.url : null;" in cam
assert 'latestItem?.kind === \'video\' ? <Film' in cam
assert "cameraReady && mode==='video' && isRecording && audioUnavailable" in cam
print('PASS: TEST21 micro fallback, preview, duration, thumbnail and standalone appId')
