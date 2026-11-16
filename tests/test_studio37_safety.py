from pathlib import Path
r=Path(__file__).resolve().parents[1]
read=lambda f:(r/f).read_text()
backup=read('studio-ui/src/services/projectBackup.ts')
storage=read('studio-ui/src/services/mediaStorage.ts')
ui=read('studio-ui/src/App.tsx')
cam=read('studio-ui/src/components/camera/CameraApkScreen.tsx')
scanner=read('studio-ui/src/components/scanner/DocumentScannerScreen.tsx')
eng=read('studio-ui/src/services/documentScanner.ts')
video=read('studio-ui/src/services/stampedVideoCapture.ts')
loc=read('studio-ui/src/services/watermarkLocation.ts')
assert 'await storeMediaBatchNew(prepared)' in backup
assert 'await storeMedia(media);loaded.push(media)' not in backup
assert "db.transaction(STORE,'readwrite')" in storage and 'objectStore(STORE).add(row)' in storage
assert 'const token=`gps_${Date.now()}_${crypto.randomUUID()}`;' in loc
assert 'readDeviceGps(3500)' not in cam
assert 'latestGpsRef.current' in cam and 'photoCaptureLock.current' in cam
assert 'autoStampOrientationRef.current' in cam
assert 'cropCapturedCanvas(orientCapturedCanvas(canvas,quarter),aspectRatio)' in cam
assert 'physicalPhotoAngleRef.current,autoStampOrientationRef.current' in cam
assert 'const turn=capturedPhotoTurn(rawWidth,rawHeight,getPhysicalAngle(),getStampAngle());' in video
assert 'const fillScale=Math.max(canvas.width/oriented.width,canvas.height/oriented.height)' in video
assert 'await updateScanBatch(modified,f.id)' in scanner and 'await updateScanBatch(changes)' in scanner
assert "db.transaction(['pages','folders'],'readwrite')" in eng
assert 'const persistMediaRevision=' in ui and 'mediaWriteQueueRef.current.set(id,write)' in ui
assert 'next.captureWatermark=' in ui and 'next.watermarkOverride=' in ui and 'next.stampedBlob=undefined' in ui
assert 'Xem trong thư viện' in cam and 'onSaveVideo(lastRecordedVideo)' not in cam
print('PASS TEST37: atomic restore/reorder, distinct GPS requests, shutter no GPS delay, capture geometry, serialized edits, no duplicate video save')
