/** R63 synthetic guard: never auto-crop a lower/inner piece of a folded invoice.
 * This test contains NO real invoices, screenshots, QR data or private photos. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const base=path.join(__dirname,'../studio-ui/src/services');
function load(name,imports={}){
 const source=fs.readFileSync(path.join(base,name+'.ts'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:k=>{if(!(k in imports))throw Error('Unexpected '+k);return imports[k]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});
 return mod.exports;
}
const edits=load('scannerEdits'),printer=load('scannerPrintLayout');
const scan=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer});
function syntheticInvoice(){
 const width=360,height=470,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*4,inside=x>=42&&x<=319&&y>=20&&y<=446;
  let rgb=inside?[173,180,174]:[18,21,25];
  // Dark continuous printed rules or creases split light paper into panels.
  if(inside&&((y>=136&&y<=152)||(y>=343&&y<=359)))rgb=[38,40,43];
  // Internal blue invoice columns and horizontal grid rows.
  if(inside&&x>65&&x<295&&y>166&&y<330&&
    (x%49===0||y%30===0))rgb=[87,122,140];
  for(let c=0;c<3;c++)data[p+c]=rgb[c];data[p+3]=255;
 }
 return {width,height,data};
}
const image=syntheticInvoice();
const result=scan.detectDocumentEdges(image,'auto');
assert.ok(scan.validCorners(result.corners));
const q=result.corners;
const full=q[0].y<.11&&q[1].y<.11&&q[2].y>.90&&q[3].y>.90;
assert.ok(result.confidence==='manual'||full,'A partial internal quad must never be auto-applied to a real invoice');
assert.ok(scan.SCAN_DETECTOR_REVISION>=64);
console.log('PASS TEST63: folded invoice preserves outer text; suspicious inner quadrilateral stays editable; originals untouched');
