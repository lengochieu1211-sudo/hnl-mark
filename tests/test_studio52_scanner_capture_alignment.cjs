/** TEST52: a green live quad must match the exact saved JPEG, not stale wood.
 * Synthetic card/wood only; never commit real identity documents to CI. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={})=>{const text=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports,require:p=>{if(!(p in imports))throw Error(p);return imports[p]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Math,Map,Set,Date,console,Number,Error,Array});return mod.exports;
};
const edits=load('scannerEdits'),print=load('scannerPrintLayout');
const {detectDocumentEdges,validCorners,selectSavedScanCorners}=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':print});
const corners=[[.33,.38],[.70,.36],[.69,.86],[.31,.87]].map(([x,y])=>({x,y}));
const stale=[[.35,.09],[.73,.05],[.79,.36],[.45,.42]].map(([x,y])=>({x,y}));
function inside(x,y,quad){let sign=0;for(let i=0;i<4;i++){const a=quad[i],b=quad[(i+1)%4],cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(!sign)sign=Math.sign(cross);else if(cross*sign<0)return false}return true}
function frame(withCard){const width=276,height=360,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const px=x/(width-1),py=y/(height-1),i=(y*width+x)*4,grain=8*Math.sin(x*.12+y*.016)+5*Math.cos(x*.36-y*.016),card=withCard&&inside(px,py,corners);
 let colors=card?[115+grain*.2,180+grain*.2,170+grain*.15]:[164+grain,157+grain,138+grain];
 if(card&&px>.4&&px<.55&&py>.52&&py<.70)colors=[33,43,37];
 for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,colors[c]));data[i+3]=255;
 }return {width,height,data};}
const picture=frame(true),detected=detectDocumentEdges(picture,'id-card');
assert.equal(detected.confidence,'estimated');assert.ok(validCorners(detected.corners));
const fix=selectSavedScanCorners(picture,stale,detected,'id-card');
assert.ok(fix&&fix.confidence==='estimated','Replace wrong saved quad above card');
for(let i=0;i<4;i++)assert.ok(Math.hypot(fix.corners[i].x-corners[i].x,fix.corners[i].y-corners[i].y)<.12,'Correct '+i);
// A disconnected cyan patch in the top-right wood must not pull the hull
// away from the actual card, as observed in the provided camera screenshots.
const noisy=frame(true);
for(let y=65;y<74;y++)for(let x=219;x<229;x++){
 const i=(y*noisy.width+x)*4;noisy.data[i]=100;noisy.data[i+1]=181;noisy.data[i+2]=175;
}
const robust=detectDocumentEdges(noisy,'auto');
assert.equal(robust.confidence,'estimated');
for(let i=0;i<4;i++)assert.ok(Math.hypot(robust.corners[i].x-corners[i].x,robust.corners[i].y-corners[i].y)<.12,'No cyan outlier pull '+i);
assert.equal(selectSavedScanCorners(picture,fix.corners,detected,'id-card'),null,'No repeat correction when aligned');
assert.equal(selectSavedScanCorners(picture,stale,{corners:detected.corners,confidence:'manual'},'id-card'),null,'Do not crop from weak detector');
assert.equal(selectSavedScanCorners(frame(false),stale,{corners:detected.corners,confidence:'estimated'},'id-card'),null,'Do not move on wood only');
assert.equal(selectSavedScanCorners(picture,stale,detected,'paper'),null,'Do not override paper live quad without chroma evidence');
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
const handler=ui.split('const captureScanFrame=async()=>')[1].split('const startScanCamera=')[0];
const saving=ui.split('const flushCapturedScanQueue=async()=>')[1].split('const captureScanFrame=async()=>')[0];
assert.ok(saving.includes('await putScan(page)')&&saving.includes('queueScanEdgeEstimate(page,frame.split,frame.sessionSerial)'));
assert.ok(saving.indexOf('await putScan(page)')<saving.indexOf('queueScanEdgeEstimate(page,frame.split,frame.sessionSerial)'),'Save original before recalculation');
assert.ok(!handler.includes('await reconcileSavedScanCorners('),'Do not block camera shutter');
assert.ok(handler.includes('performance.now()-snapshot.at<1600')&&handler.includes('snapshot.width===video.videoWidth'),'Reject stale camera geometry');
assert.ok(ui.includes('scanDirtyDrafts.current.has(page.id)')&&ui.includes('scanDirtyDrafts.current.add(editingId)'),'Never overwrite unsaved manual draft');
assert.ok(fs.readFileSync(path.join(root,'documentScanner.ts'),'utf8').includes('if(!shouldApply()||!current'), 'Check active edits inside IDB transaction');
const gradle=fs.readFileSync(path.join(__dirname,'../android/app/build.gradle'),'utf8');
const emulator=fs.readFileSync(path.join(__dirname,'../.github/workflows/android-emulator-smoke.yml'),'utf8');
assert.match(gradle,/applicationIdSuffix '\.trial2563'/);
assert.match(gradle,/HNLMark STUDIO 63/);
assert.ok(!gradle.includes(".trial2547"),'TEST51 debug identity must be preserved separately');
assert.ok(emulator.includes('HNL_TEST_PACKAGE=vn.hnl.xaydung.hnlmark${TEST_SUFFIX}'),'Emulator targets dynamic TEST52 package ID');
console.log('PASS TEST52: screenshot-shaped stale quad corrected by stored JPEG, no false crop/overwrite, non-blocking shutter');
