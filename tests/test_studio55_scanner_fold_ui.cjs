/** TEST55: 6-12 control point paper dewarping, short names and UI placement.
 * All geometry is synthetic. Never use customer ID screenshots in CI. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={})=>{const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:p=>{if(!(p in imports))throw Error(p);return imports[p]},
 Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array});
 return mod.exports;
};
const edits=load('scannerEdits'),printer=load('scannerPrintLayout');
const s=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer});
const corners=s.DEFAULT_CORNERS,near=(a,b,e=.0005)=>Math.hypot(a.x-b.x,a.y-b.y)<=e;
assert.equal(s.compactScanRegionName('1000105265_vung_them_vung_them_vung_them',5),'1000105265_V05');
assert.equal(s.compactScanRegionName('1000105265_V02',3),'1000105265_V03');
for(const axis of ['vertical','horizontal'])for(const count of [6,8,10,12]){
 const g=s.initScanWarpGrid(corners,count,axis);
 assert.equal(g.points.length,count);assert.ok(s.validScanWarp(corners,g));
 let bands=s.scanWarpBands(corners,g);assert.equal(bands.length,count/2-1);
 for(const [u,v,p] of [[0,0,corners[0]],[1,0,corners[1]],[1,1,corners[2]],[0,1,corners[3]]])
  assert.ok(near(s.mapScanWarpOutput(u,v,bands,axis),p),'correct corner mapping');
 const moved={axis,points:g.points.map(p=>({...p}))};
 moved.points[1].x+=.025;
 assert.ok(s.validScanWarp(s.scanWarpOuterCorners(moved),moved),'manually bent fold remains valid');
 bands=s.scanWarpBands(s.scanWarpOuterCorners(moved),moved);
 const seam=bands[0].end;
 const p=axis==='vertical'?s.mapScanWarpOutput(seam-1e-8,.4,bands,axis):s.mapScanWarpOutput(.4,seam-1e-8,bands,axis);
 const q=axis==='vertical'?s.mapScanWarpOutput(seam+1e-8,.4,bands,axis):s.mapScanWarpOutput(.4,seam+1e-8,bands,axis);
 assert.ok(near(p,q),'seam must have no gaps');
 for(const op of ['cw','ccw','flip-h','flip-v']){
  const next=s.transformScanWarpGrid(moved,op),outer=s.scanWarpOuterCorners(next);
  assert.ok(s.validScanWarp(outer,next),'transformed grid stays valid: '+op);
  const expected=edits.scanQuadAfterOp(s.scanWarpOuterCorners(moved),op);
  for(let i=0;i<4;i++)assert.ok(near(outer[i],expected[i]),'rotated image and mesh align');
 }
 const wrong={axis,points:moved.points.map(p=>({...p}))};
 wrong.points[1]={...wrong.points[0]};
 assert.ok(!s.validScanWarp(s.scanWarpOuterCorners(wrong),wrong),'zero-width segment rejected');
}
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
assert.ok(ui.includes('aria-label="Số điểm chỉnh nếp gấp"'));
assert.ok(ui.includes('aria-label="Hướng nếp gấp"'));
assert.ok(ui.indexOf('Chỉnh màu ảnh scan')<ui.indexOf('Tăng độ nét khi in / xuất PDF'));
assert.ok(ui.includes('scanWarpDraft?.points||cornerDraft'),'mesh control points on preview');
assert.ok(ui.includes('warpGrid:scanWarpDraft'),'mesh used when flattening');
assert.ok(ui.includes('min-w-0 flex-1 truncate'),'long names stay inside header');
console.log('PASS TEST55: 6-12 point two-axis fold strips, continuity, orientation and concise names/UI');
