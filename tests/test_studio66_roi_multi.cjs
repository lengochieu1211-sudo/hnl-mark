/** R63+ TEST66: region-limited detection on synthetic busy document scenes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const base=path.join(__dirname,'../studio-ui/src/services');
function load(name,imports={}){
 const src=fs.readFileSync(path.join(base,name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:k=>{if(!(k in imports))throw Error('Unexpected '+k);return imports[k]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});
 return mod.exports;
}
const edits=load('scannerEdits'),printer=load('scannerPrintLayout');
const scan=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer});
const w=480,h=360;
function scene(withPage=true){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;
  const left=withPage&&x>=50&&x<=200&&y>=58&&y<=305;
  const right=x>=285&&x<=445&&y>=32&&y<=322;
  let rgb=left?[204,207,209]:right?[81,155,201]:[27,29,32];
  // Dense internal blueprint/table lines must not become paper edges.
  if(left&&((x%25===0)||(y%27===0)))rgb=[67,91,111];
  for(let c=0;c<3;c++)data[i+c]=rgb[c];data[i+3]=255;
 }
 return {width:w,height:h,data};
}
const roi=[{x:.05,y:.09},{x:.52,y:.09},{x:.52,y:.96},{x:.05,y:.96}];
const found=scan.detectDocumentEdgesInRegion(scene(),roi,'paper');
assert.ok(found===null||(scan.validCorners(found.corners)&&found.corners.every(p=>p.x<.62)),
 'Never select the unrelated right-side item when user chose left document');
const missing=scan.detectDocumentEdgesInRegion(scene(false),roi,'paper');
assert.equal(missing,null,'Do not create crop where rough selection contains no paper');
const tiny=[{x:.01,y:.01},{x:.05,y:.01},{x:.05,y:.05},{x:.01,y:.05}];
assert.equal(scan.detectDocumentEdgesInRegion(scene(),tiny,'auto'),null,'Unsafe tiny ROIs remain manual');
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
assert.ok(ui.includes('Dò trong vùng chọn'));
assert.ok(ui.includes('addApprovedScanRegions(editing.id'));
assert.ok(!ui.includes('setPages(prev=>[...prev.filter(p=>p.id!==editing.id),...saved])'));
assert.ok(scan.addApprovedScanRegions);
console.log('PASS TEST66: user-chosen ROI cannot claim the unrelated item; unsafe crop rejected; original source never replaced');
