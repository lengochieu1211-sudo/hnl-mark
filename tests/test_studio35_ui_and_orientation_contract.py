from pathlib import Path
root=Path(__file__).resolve().parents[1]
library=(root/'studio-ui/src/components/library/LibraryScreen.tsx').read_text()
app=(root/'studio-ui/src/App.tsx').read_text()
camera=(root/'studio-ui/src/components/camera/CameraApkScreen.tsx').read_text()
photo=(root/'studio-ui/src/services/capturedPhotoOrientation.ts').read_text()
video=(root/'studio-ui/src/services/stampedVideoCapture.ts').read_text()
backup=(root/'studio-ui/src/services/projectBackup.ts').read_text()
assert 'onRestoreBackupFile(file)' in library and 'accept=".zip,application/zip"' in library
assert 'onRestoreBackupJson' not in library
assert 'Interactive State Switcher' not in library
assert 'onRetryLoad()' in library and "libraryLoadError ? 'error'" in library
assert 'const restoreLibraryZip=async(file:File)' in app
assert 'setMediaItems(old=>[...restored,...old])' in app, 'restore must append, not overwrite'
assert 'setLibraryLoadError(' in app and 'retryLibraryLoad' in app
assert 'capturedPhotoTurn(canvas.width,canvas.height' in camera
assert 'orientCapturedCanvas(canvas,quarter)' in camera
assert 'const turn=capturedPhotoTurn(video.videoWidth,video.videoHeight,physicalAngle,startStampAngle)' in video
assert 'const dimensions=orientedFrameSize(video.videoWidth,video.videoHeight,turn)' in video
assert 'ctx.rotate(turn*Math.PI/180)' in video
assert 'drawConfiguredStamp(ctx,canvas.width,canvas.height,timestamp,0,photoCode,logo)' in video
assert 'return 0;' in photo, 'rotation not calibrated for 180 until real-device evidence'
assert 'await storeMedia(media);loaded.push(media)' in backup, 'known partial-restore risk; do not claim atomic'
print('PASS: TEST35 real ZIP restore button, true library reload/error, hidden QA controls; photo/video orientation source contracts')
