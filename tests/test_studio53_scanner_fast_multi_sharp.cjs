/** TEST53 offline image processing: two IDs or A4s per photo, smart sharpening,
 * fast bounded shutter and print JPEG preservation. All images are synthetic.
 * Never upload screenshots with real identity documents into public CI. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={})=>{
 const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:p=>{if(!(p in imports))throw Error('Unexpected import: '+p);return imports[p]},
  Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});
 return mod.exports;
};
const edits=load('scannerEdits'),printer=load('scannerPrintLayout');
const {detectMultipleDocumentEdges,validCorners,sharpenScanPixels}=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer});
function synthetic(mode){
 const w=404,h=324,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const grain=5*Math.sin(y*.09+x*.018)+7*Math.cos(x*.25+y*.02),i=(y*w+x)*4;
  let rgb=[153+grain,141+grain,123+grain];
  const left=x>37&&x<171&&y>74&&y<165;
  const right=x>224&&x<364&&y>159&&y<255;
  if(left||right)rgb=mode==='cyan'?[120+grain*.2,191+grain*.15,181+grain*.2]:[244,245,245];
  if(mode==='cyan'&&left&&x>80&&x<110&&y>100&&y<145)rgb=[180,166,147];
  for(let c=0;c<3;c++)data[i+c]=rgb[c];data[i+3]=255;
 }
 return {width:w,height:h,data};
}
for(const kind of ['cyan','paper']){
 const found=detectMultipleDocumentEdges(synthetic(kind),kind==='cyan'?'id-card':'paper');
 assert.equal(found.length,2,`expected two detected regions for ${kind}, found ${found.length}`);
 for(const detection of found)assert.ok(validCorners(detection.corners));
 assert.ok(found[0].corners[0].y<found[1].corners[0].y,'sort by reading order');
}
assert.equal(detectMultipleDocumentEdges(synthetic('cyan'),'paper').length,0,'Do not auto split cyan photo as A4');
(async()=>{
 const width=128,height=80,src=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const a=(y*width+x)*4,v=x<64?85:225;
  src[a]=src[a+1]=src[a+2]=v;src[a+3]=255;
 }
 const off=new Uint8ClampedArray(src),copy=new Uint8ClampedArray(src);
 await sharpenScanPixels(off,width,height,'off');assert.deepEqual(off,src,'off mode must preserve all pixels');
 await sharpenScanPixels(copy,width,height,'text');
 assert.ok(copy[(40*width+63)*4]<src[(40*width+63)*4],'text sharpening darkens dark side of edge');
 assert.ok(copy[(40*width+64)*4]>src[(40*width+64)*4],'text sharpening brightens light side of edge');
 assert.equal(copy[(25*width+20)*4],src[(25*width+20)*4],'Do not invent detail in smooth area');
 const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
 const service=fs.readFileSync(path.join(root,'documentScanner.ts'),'utf8');
 assert.ok(ui.includes("scanPendingFrames.current.length>=3"),'bounded capture queue');
 assert.ok(ui.includes("await putScan(page)"),'original must persist before saved count');
 assert.ok(ui.includes("queueScanEdgeEstimate(page,frame.split,frame.sessionSerial)"),'deferred detection');
 assert.ok(ui.includes("'image/jpeg',.94"),'preserve full-resolution source at good quality');
 assert.ok(ui.includes('aria-label="Tăng độ nét ảnh scan" type="range"'),'live sharpening slider visible');
 assert.ok(ui.includes('Đề xuất vùng để duyệt')&&ui.includes('Thêm vùng bằng tay'));
 assert.ok(service.includes("if(image.type!=='image/jpeg')"),'no double lossy JPEG encode in PDF export');
 assert.ok(service.includes('splitStoredScanPage')&&service.includes('store.add(child)'),'create multiple safe scan rows');
 console.log('PASS TEST53: 2 cyan IDs, 2 paper sheets, sharpening off/text, bounded nonblocking queue, print JPEG');
})().catch(e=>{console.error(e);process.exitCode=1});
