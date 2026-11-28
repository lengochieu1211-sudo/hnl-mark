/** TEST68: stale derived JPEG cannot overwrite newer scan options.
 * Uses synthetic page metadata only; never loads private user images. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
function load(name,imports={}){
 const js=ts.transpileModule(fs.readFileSync(path.join(root,name+'.ts'),'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
 }).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:p=>{
  if(!(p in imports))throw Error('Unexpected import '+p);return imports[p];
 },Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});
 return mod.exports;
}
const edits=load('scannerEdits'),layout=load('scannerPrintLayout');
const scan=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':layout});
const corners=[{x:.1,y:.1},{x:.9,y:.1},{x:.9,y:.9},{x:.1,y:.9}];
const page={id:'test',original:new Blob(['original'],{type:'image/jpeg'}),corners,
 filter:'enhance',sharpness:'auto',sharpnessLevel:45,transformOps:[],
 colorAdjust:{...edits.DEFAULT_SCAN_COLOR},documentType:'paper',detectionConfidence:'estimated'};
const change=(key,val)=>({...page,[key]:val});
assert.equal(scan.unchangedScanProcessingInputs({...page,corners:corners.map(p=>({...p}))},page),true,'identical metadata is safe');
const altered=[
 ['corners',change('corners',[{x:.12,y:.1},...corners.slice(1)])],
 ['filter',change('filter','gray')],
 ['sharpen mode',change('sharpness','text')],
 ['sharpen level',change('sharpnessLevel',87)],
 ['rotation',change('transformOps',['cw'])],
 ['color',change('colorAdjust',{...edits.DEFAULT_SCAN_COLOR,brightness:40})],
 ['fold warp',change('warpGrid',{axis:'vertical',points:corners.concat(corners)})],
 ['document type',change('documentType','id-card')],
 ['detection confidence',change('detectionConfidence','manual')],
 ['source blob',change('original',new Blob(['new-photo-bytes'],{type:'image/jpeg'}))]
];
for(const [name,item] of altered)assert.equal(scan.unchangedScanProcessingInputs(item,page),false,
 'Concurrent '+name+' edit must invalidate stale export');
const service=fs.readFileSync(path.join(root,'documentScanner.ts'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
const gradle=fs.readFileSync(path.join(__dirname,'../android/app/build.gradle'),'utf8');
assert.ok(service.includes("const tx=db.transaction('pages','readwrite'),store=tx.objectStore('pages')"),'atomic scan transaction exists');
assert.ok(service.includes('!unchangedScanProcessingInputs(current,snapshot)'),'atomic guard checks all output settings');
assert.ok(ui.includes('await saveProcessedScanIfCurrent(p.id,latest,processed)'));
assert.ok(!ui.includes('const next={...current,processed,autoProcessPending:false};await putScan(next)'));
assert.ok(gradle.includes("applicationIdSuffix '.trial2576'"),'TEST69 cannot overwrite TEST68');
assert.ok(gradle.includes("'HNLMark STUDIO 76'"));
console.log('PASS TEST68: stale export rejected on corners/filter/sharpness/colors/warp/origin; TEST APK isolated');
