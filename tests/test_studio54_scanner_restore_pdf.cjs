/** TEST54: ZIP restore retains JPEG MIME and per-page scan metadata,
 * preserving lossless JPEG embedding into PDF. Synthetic bytes only. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
const restore=ui.split('const restoreScans=async(')[1].split('return <section')[0];
assert.ok(restore.includes("processed=new Blob([jpegData],{type:'image/jpeg'})"),'ZIP JPEG must have image/jpeg type');
for(const key of ['sharpness:page.sharpness','documentType:page.documentType','splitParentId:','splitRegionCount:'])
 assert.ok(restore.includes(key),'Restore missing scan metadata '+key);
assert.ok(restore.includes('restoredPageIds=new Map<string,string>()'),'Restore splits must remap parent IDs');
assert.ok(restore.includes('await restoreScanBatch(newFolders,newPages)'),'Restore remains atomic');
const load=(name,imports={})=>{
 const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:p=>{
  if(!(p in imports))throw Error('Unexpected import '+p);return imports[p];},
  Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,
  Math,Map,Set,Date,console,Number,Error,Array,TextEncoder,TextDecoder,
  setTimeout,createImageBitmap:async()=>({width:500,height:300,close(){}})
 });
 return mod.exports;
};
(async()=>{
 const edits=load('scannerEdits'),printer=load('scannerPrintLayout');
 const {createScannerPdf}=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer});
 const jpgBytes=Uint8Array.from([255,216,255,224,72,78,76,45,83,67,65,78,45,53,52,255,217]);
 // JSZip may return a Blob with no MIME; restore must tag JPEG without re-encoding.
 const Zip=require('../studio-ui/node_modules/jszip'),zip=new Zip();
 zip.file('processed/one.jpg',new Blob([jpgBytes],{type:'image/jpeg'}));
 const bytes=await zip.generateAsync({type:'uint8array'});
 const decoded=await Zip.loadAsync(bytes);
 const unpacked=await decoded.file('processed/one.jpg').async('blob');
 const restored=new Blob([unpacked],{type:'image/jpeg'});
 assert.equal(restored.type,'image/jpeg');
 assert.deepEqual(new Uint8Array(await restored.arrayBuffer()),jpgBytes);
 const pdf=await createScannerPdf([restored],{paper:'A4',landscape:false,marginMm:10,
  customWidthMm:210,customHeightMm:297,twoPerPage:false});
 const stream=new Uint8Array(await pdf.arrayBuffer());
 const find=(hay,needle)=>{for(let i=0;i<=hay.length-needle.length;i++)
  if(needle.every((v,j)=>hay[i+j]===v))return i;return -1;};
 assert.ok(find(stream,[...jpgBytes])>=0,'PDF must embed identical JPEG bytes');
 const header=new TextDecoder('latin1').decode(stream);
 assert.ok(header.includes('/DCTDecode'),'JPEG PDF stream required');
 console.log('PASS TEST54: ZIP restored JPEG MIME, direct PDF JPEG bytes, split and sharpening restore metadata');
})().catch(e=>{console.error(e);process.exitCode=1});
