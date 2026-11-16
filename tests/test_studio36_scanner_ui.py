#!/usr/bin/env python3
"""Static scanner interaction contract. Browser/device pointer runtime remains separate."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'studio-ui/src/components/scanner/DocumentScannerScreen.tsx').read_text()
engine=(root/'studio-ui/src/services/documentScanner.ts').read_text()
source=(root/'studio-ui/src/services/scannerMagnifier.ts').read_text()
for marker in ['scannerPointAtPointer','scannerCornerWithOffset','scannerLoupeImageRect',
               'scannerLoupeViewportPosition','sourceImageRef','lensCanvasRef',
               'onLostPointerCapture={e=>endCornerDrag(e.pointerId)}',
               'dragPointerId.current!==e.pointerId','context.drawImage(img,at.left,at.top,at.width,at.height)',
               'data-hnl-scan-loupe="true"','createPortal(',"window.devicePixelRatio",'setPointerCapture(e.pointerId)']:
 assert marker in ui,marker
assert "backgroundSize:'450% 450%'" not in ui, 'old CSS zoom is offset near corners'
assert 'scannerLoupeViewportPosition' in source and 'scannerLoupeImageRect' in source
assert 'drawImage' in ui and 'flattenDocument(editing.original,cornerDraft' in ui
assert 'original:Blob' in engine and 'processed?:Blob' in engine
assert 'restoreScanBatch(newFolders,newPages)' in ui
assert "db.transaction(['folders','pages'],'readwrite')" in engine
assert 'pageStore.add(page)' in engine and 'folderStore.add(folder)' in engine
print('PASS TEST36 scanner UI: pixel-accurate portal loupe, pointer-capture guard, original image preserved')
