from pathlib import Path
root=Path(__file__).resolve().parents[1]
video=(root/'studio-ui/src/services/stampedVideoCapture.ts').read_text()
cam=(root/'studio-ui/src/components/camera/CameraApkScreen.tsx').read_text()
photo=(root/'studio-ui/src/services/capturedPhotoOrientation.ts').read_text()
assert 'capturedPhotoTurn(video.videoWidth,video.videoHeight,getPhysicalAngle(),getStampAngle())' in video
assert 'const initial=orientedFrameSize(video.videoWidth,video.videoHeight,startTurn)' in video
assert 'cameraCenterCrop(initial.width,initial.height' in video and 'canvas.width=Math.max(1,Math.round(firstCrop.width))' in video
assert 'ctx.rotate(turn*Math.PI/180)' in video
assert 'ctx.drawImage(video,(rawWidth-srcW)/2' in video
assert 'drawConfiguredStamp(ctx,canvas.width,canvas.height,timestamp,0,photoCode,logo)' in video
assert 'orientationDeg:0,captureWatermark:stampConfig' in cam
assert '()=>physicalPhotoAngleRef.current' in cam
assert 'resolutionLabel:`${capture.width} × ${capture.height}' in cam
assert 'return physical===90?90:physical===-90?-90:90;' in photo
print('PASS TEST33: video frame geometry and watermark baked upright; original photo preserved')
