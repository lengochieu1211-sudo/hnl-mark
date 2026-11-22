/** TEST59: Retry only untouched failed scanner pages, never manual edits.
 * Synthetic records only, no real photos or personally identifying documents. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={})=>{
 const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports,require:k=>{if(!(k in imports))throw Error('Unexpected '+k);return imports[k]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});return mod.exports;
};
const edits=load('scannerEdits'),print=load('scannerPrintLayout');
const svc=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':print});
const base={id:'old',original:new Blob([Uint8Array.from([255,216])],{type:'image/jpeg'}),
 corners:svc.DEFAULT_CORNERS.map(p=>({...p})),filter:'enhance',detectionConfidence:'manual',autoProcessPending:false};
assert.ok(svc.SCAN_DETECTOR_REVISION>=59);
assert.equal(svc.needsScanDetectorUpgrade(base),true);
for(const variant of [
 {scanDetectorRevision:svc.SCAN_DETECTOR_REVISION},{autoProcessPending:true},{processed:new Blob(['jpg'])},
 {warpGrid:{axis:'vertical',points:[]}},{detectionConfidence:'estimated'},
 {splitParentId:'parent'},{transformOps:['cw']},{original:new Blob([])},
 {corners:base.corners.map((p,i)=>i===0?{...p,x:p.x+.02}:p)}
])assert.equal(svc.needsScanDetectorUpgrade({...base,...variant}),false,'Never retry edited/finished sources');
const source=fs.readFileSync(path.join(root,'documentScanner.ts'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
assert.ok(source.includes('[360,560,760]'),'second pass for uncertain small documents');
assert.ok(source.includes('scanDetectorRevision:SCAN_DETECTOR_REVISION'),'stamp detector attempt');
assert.ok(source.includes('current||!needsScanDetectorUpgrade(current)'),'atomic retry checks');
assert.ok(ui.includes('queueFailedScanDetectorUpgrade(page.id)'));
assert.ok(ui.includes("queueScanEdgeEstimate(queued,'one',-1)"));
assert.ok(ui.includes('scanDirtyDrafts.current.has(page.id)'),'manual draft wins over async retry');
const gradle=fs.readFileSync(path.join(__dirname,'../android/app/build.gradle'),'utf8');
assert.match(gradle,/applicationIdSuffix '\.trial2567'/);
assert.match(gradle,/HNLMark STUDIO 67/);
console.log('PASS TEST59: safe once-per-revision retry, high-resolution fallback, isolated APK identity');
