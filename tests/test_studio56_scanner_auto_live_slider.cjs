/** TEST56: automated non-destructive scan after import/capture and live slider.
 * Synthetic image buffers only. Never upload real CCCD or student records to CI. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={})=>{
 const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const compiled=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require:p=>{if(!(p in imports))throw Error('Unexpected import '+p);return imports[p]},
  Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});
 return mod.exports;
};
const edits=load('scannerEdits'),printer=load('scannerPrintLayout');
const svc=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer});
assert.equal(svc.scanSharpnessPercent({sharpness:'off'}),0);
assert.equal(svc.scanSharpnessPercent({sharpness:'auto'}),45);
assert.equal(svc.scanSharpnessPercent({sharpness:'text'}),90);
assert.equal(svc.scanSharpnessPercent({sharpness:'auto',sharpnessLevel:80}),80);
assert.equal(svc.scanSharpnessPercent({sharpness:'auto',sharpnessLevel:-10}),0);
const W=64,H=40,original=new Uint8ClampedArray(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=(y*W+x)*4,v=x<32?82:220;
 original[i]=original[i+1]=original[i+2]=v;original[i+3]=255;
}
(async()=>{
 const zero=new Uint8ClampedArray(original),mid=new Uint8ClampedArray(original),strong=new Uint8ClampedArray(original);
 await svc.sharpenScanPixels(zero,W,H,'auto',undefined,0);
 assert.deepEqual(zero,original,'zero on slider preserves exact pixels');
 await svc.sharpenScanPixels(mid,W,H,'auto',undefined,45);
 await svc.sharpenScanPixels(strong,W,H,'auto',undefined,100);
 const pos=(20*W+31)*4;
 assert.ok(mid[pos]<original[pos]&&strong[pos]<mid[pos],'slider sharpness monotonically strengthens an edge');
 assert.equal(strong[(18*W+10)*4],original[(18*W+10)*4],'smooth areas remain unchanged');
 const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
 const service=fs.readFileSync(path.join(root,'documentScanner.ts'),'utf8');
 assert.ok(ui.includes('created.forEach(p=>queueScanEdgeEstimate(p,\'one\',-1))'),'Import auto-processing');
 assert.ok(ui.includes('autoProcessPending:true'),'persist interrupted jobs');
 const saving=ui.split('const flushCapturedScanQueue=async()=>')[1].split('const captureScanFrame=async()=>')[0];
 assert.ok(saving.indexOf('await putScan(page)')<saving.indexOf('queueScanEdgeEstimate(page,frame.split,frame.sessionSerial)'),'save raw source before processing');
 assert.ok(ui.includes('saveAutomaticScanIfUnedited('),'atomic finish');
 assert.ok(ui.includes('scanCameraOpenRef.current'),'heavy processing waits for closed camera');
 assert.ok(ui.includes('await suggestDocumentEdges(candidate.original,candidate.documentType)'),'revalidate saved jpeg');
 assert.ok(service.includes('current.autoProcessPending')&&service.includes('!shouldApply()'),'never overwrite manual edits');
 assert.ok(ui.includes('previewMaxEdge:760')&&ui.includes('controller.abort()'),'bounded cancellable preview');
 assert.ok(ui.includes('aria-label="Tăng độ nét ảnh scan" type="range"'),'sharpness slider');
 assert.ok(ui.indexOf('Độ bão hòa')<ui.indexOf('Tăng độ nét {scanSharpnessLevelDraft}%'),'sharpness immediately after color');
 console.log('PASS TEST56: source-first automatic scan, safe atomic finishing, continuous sharpening slider and preview');
})().catch(e=>{console.error(e);process.exitCode=1});
