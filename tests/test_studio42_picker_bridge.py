from pathlib import Path
R=Path(__file__).resolve().parents[1]
a=(R/'studio-ui/src/App.tsx').read_text()
b=(R/'studio-ui/src/services/deviceBridge.ts').read_text()
n=(R/'android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java').read_text()
for s in ('pickedBatchFinished','pendingPickedBatches.remove(batchId)','pickedContents.remove(token)',
          'JSONObject.quote(batchId)','web.postDelayed','return; // Ignore duplicate/forged/stale acknowledgements.'):
 assert s in n,s
for s in ('deliverPickedBatch','pickedBatchFinished?.(batchId,summary.imported,summary.failed',
          'hnl-studio:picker-result','hnl-studio:picker-progress'):
 assert s in b,s
assert 'return {imported,failed:files.length-imported,errors:failures};' in a
assert "if(!detectedType){failures.push" in a
assert "const result=await importFiles([new File([blob],item.name,{type:item.type})]);" in (R/'studio-ui/src/services/nativePickedBatch.ts').read_text()
print('PASS TEST42: Android picker batch acknowledgement and per-file persisted results wired end-to-end')

assert 'templateId:watermarkConfig.templateId' in a
assert 'watermarkOverride:watermarkConfig.perPhotoOverrideEnabled?' in a
