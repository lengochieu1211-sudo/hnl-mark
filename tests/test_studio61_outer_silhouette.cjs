/** TEST61: reject inner printed rectangles and detect the whole visible paper.
 * All images are synthetic. No receipt, QR content, private photo or ID is uploaded. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const base=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={},extra='')=>{
 const src=fs.readFileSync(path.join(base,name+'.ts'),'utf8')+extra;
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:k=>{if(!(k in imports))throw Error('Unexpected '+k);return imports[k]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});
 return mod.exports;
};
const edits=load('scannerEdits'),printer=load('scannerPrintLayout');
const scan=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer},'\nexport {likelyInnerPrintedPanel};');
const contains=(x,y,q)=>{let sign=0;for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];const cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(!sign)sign=Math.sign(cross);else if(cross*sign<0)return false}return true};
function scene(mode='invoice'){
 const w=360,h=mode==='qr'?268:450,data=new Uint8ClampedArray(w*h*4);
 const page=mode==='qr'?
  [{x:.44,y:.51},{x:.68,y:.31},{x:.81,y:.54},{x:.57,y:.75}]:
  [{x:.11,y:.15},{x:.89,y:.14},{x:.92,y:.91},{x:.09,y:.92}];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/(w-1),v=y/(h-1),p=contains(u,v,page),i=4*(y*w+x);
  const grain=(Math.sin(x*.1+y*.23)+Math.sin(y*.06-x*.13))*4;
  let rgb=mode==='qr'?[112+grain,83+grain,49+grain]:[27+grain,30+grain,34+grain];
  if(mode==='qr'&&!p&&(u<.25||u>.9)&&v>.03&&v<.72)rgb=[205,207,203]; // mugs at border
  if(p){
   rgb=mode==='qr'?[206,214,207]:[184,191,192];
   const grid=mode==='invoice'&&u>.2&&u<.83&&v>.29&&v<.8&&(
    Math.abs((v-.29)*24-Math.round((v-.29)*24))<.065||
    Math.abs((u-.2)*14-Math.round((u-.2)*14))<.055);
   if(grid)rgb=[69,107,145]; // dark blue table rulings inside paper
   if(mode==='qr'&&u>.55&&u<.7&&v>.45&&v<.61&&((x+y)%7<3))rgb=[25,45,60];
  }
  for(let c=0;c<3;c++)data[i+c]=Math.round(Math.max(0,Math.min(255,rgb[c])));
  data[i+3]=255;
 }
 return {image:{width:w,height:h,data},page};
}
const invoice=scene('invoice');
const detected=scan.detectDocumentEdges(invoice.image,'auto');
assert.equal(detected.confidence,'estimated','Find whole printed invoice rather than an interior grid');
assert.ok(scan.validCorners(detected.corners));
for(let i=0;i<4;i++)assert.ok(Math.hypot(detected.corners[i].x-invoice.page[i].x,detected.corners[i].y-invoice.page[i].y)<.12,'Outer paper corner '+i);
const inner=[{x:.25,y:.32},{x:.8,y:.32},{x:.8,y:.73},{x:.25,y:.73}];
assert.equal(scan.likelyInnerPrintedPanel(invoice.image,inner),true,'Blue table with white surrounding paper is not a page');
assert.equal(scan.likelyInnerPrintedPanel(invoice.image,invoice.page),false,'Outer edge has dark surrounding background');
const qr=scene('qr'),card=scan.detectDocumentEdges(qr.image,'auto');
assert.equal(card.confidence,'estimated','Detect rotated bright QR card between two bright mugs');
assert.ok(scan.validCorners(card.corners));
for(let i=0;i<4;i++)assert.ok(Math.hypot(card.corners[i].x-qr.page[i].x,card.corners[i].y-qr.page[i].y)<.16,'QR card corner '+i);
assert.ok(scan.SCAN_DETECTOR_REVISION>=61);
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
assert.ok(ui.includes("saveAutomaticScanIfUnedited(page.id,page.corners,null,page.corners"),'Clear stuck pending on failed scan without source rewrite');
assert.ok(ui.includes('editing.autoProcessPending&&!scanDirtyDrafts.current.has(editing.id)'),'Do not claim pending during manual edits');
const gradle=fs.readFileSync(path.join(__dirname,'../android/app/build.gradle'),'utf8');
assert.match(gradle,/applicationIdSuffix '\.trial2575'/);assert.match(gradle,/HNLMark STUDIO 75/);
console.log('PASS TEST61: full receipt silhouette, inner-grid guard, angled QR, persistent-pending recovery, parallel APK');
