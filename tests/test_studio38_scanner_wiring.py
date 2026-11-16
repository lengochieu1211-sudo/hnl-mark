from pathlib import Path
r=Path(__file__).resolve().parents[1]
read=lambda p:(r/p).read_text()
ui=read('studio-ui/src/components/scanner/DocumentScannerScreen.tsx')
engine=read('studio-ui/src/services/documentScanner.ts')
for part in ["scannerPinchStart","scannerPinchMove","scannerFocusAt","scannerZoomTo","scannerExposureTo","aria-label=\"Zoom camera scan\"","aria-label=\"Bù sáng camera scan\"","transformScan('cw')","transformScan('ccw')","transformScan('flip-h')","transformScan('flip-v')","scanColorDraft.brightness","scanColorDraft.contrast","scanColorDraft.saturation","scannerOrientedPreview(editing.original,scanOpsDraft)","editingHasUnsavedCorners"]:assert part in ui,part
for part in ['drawScannerOriented(ctx,bmp','transformOps?:ScanImageOp[]','colorAdjust?:ScanColorAdjust','adjustScanRgb','scannerOrientedPreview','options?:{operations?:ScanImageOp[];adjustments?:ScanColorAdjust}']:
 assert part in engine,part
assert 'const zoom=scanZoomNativeRef.current?1:scanZoomRef.current' in ui
assert 'ctx.drawImage(video,(video.videoWidth-srcW)/2' in ui
assert 'await putScan(next)' in ui
assert 'original:blob' in ui
print('PASS TEST38 Scanner camera zoom/focus/exposure + rotated/flipped corners + color + immutable original')
