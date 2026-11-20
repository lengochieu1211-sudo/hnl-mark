#!/usr/bin/env python3
"""TEST27: scanner must open live camera and persist 1 or many source frames.
Source regression; native Redmi continuous-camera QA remains separate.
"""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
scan=(R/'studio-ui/src/components/scanner/DocumentScannerScreen.tsx').read_text('utf-8')
native=(R/'android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java').read_text('utf-8')
assert 'onClick={startScanCamera}' in scan
assert 'data-hnl-scan-camera="true"' in scan and 'createPortal(' in scan
assert "navigator.mediaDevices.getUserMedia({audio:false,video:{" in scan
assert 'facingMode:{ideal:cameraFacing}' in scan and 'video.srcObject=stream' in scan
assert 'await video.play()' in scan
assert 'scanCaptureLock.current' in scan
assert "'image/jpeg',.94" in scan
handler=scan.split('const captureScanFrame=async()=>')[1].split('const startScanCamera=')[0]
saving=scan.split('const flushCapturedScanQueue=async()=>')[1].split('const captureScanFrame=async()=>')[0]
assert saving.index('await putScan(page)') < saving.index('queueScanEdgeEstimate(page,frame.split,frame.sessionSerial)')
assert 'await suggestDocumentEdges(' not in handler  # Keep the shutter responsive
assert 'estimateScanCornersIfUnedited(page.id,page.corners,detected.corners,' in scan
assert "scanMode==='single'" in scan
assert "setScanMode('continuous')" in scan
assert 'Chụp trang tài liệu' in scan and 'Liên tục' in scan and 'Một trang' in scan
assert 'scanSessionIdsRef.current.push(page.id)' in scan
assert 'setSelection(ids)' in scan
assert 'scanStreamRef.current?.getTracks().forEach(track=>track.stop())' in scan
assert 'Dùng camera hệ thống (dự phòng)' in scan
assert 'cameraInput.current?.click()' in scan
assert 'Manifest.permission.CAMERA' in native and 'RESOURCE_VIDEO_CAPTURE' in native
assert 'trusted(request.getOrigin())' in native
__import__('version_contract').assert_build_identity()
print('PASS: TEST27 scanner real camera single/continuous, saved originals, no forced picker, track teardown and fallback')
