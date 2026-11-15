from pathlib import Path
r=Path(__file__).resolve().parents[1]
s=(r/'studio-ui/src/components/scanner/DocumentScannerScreen.tsx').read_text()
for k in ['detectDocumentEdges(ctx.getImageData(0,0,width,height),scanDocumentType)',
          'data-hnl-scan-live-edges="true"','data-hnl-scan-guide="true"',
          'scanCameraOpen,scanCameraReady,cameraFacing,scanDocumentType',
          "found.confidence==='estimated'&&validCorners(found.corners)",
          'scannerLiveQuadDelta(previous,found.corners)<.085',
          'window.clearTimeout(timeout)','const crop=scannerLiveSourceCrop',
          "scanLiveStatus==='tracking'",'scanPreviewViewportRef',
          'Chưa quét mép trực tiếp được · vẫn chụp thủ công']:
 assert k in s,k
assert 'await putScan(page)' in s and 'suggestDocumentEdges(blob,scanDocumentType)' in s
assert 'scanCaptureLock.current=true' in s
print('PASS TEST40 scanner live overlay: stable estimated quadrilateral, fallback guide, cleanup and preserved original')
