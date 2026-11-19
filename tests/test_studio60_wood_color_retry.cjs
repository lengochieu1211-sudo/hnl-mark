/** TEST60: White-balance and exposure resilient small paper detector,
 * progressive bounded retries and truthful UI progress. Synthetic samples only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const base=path.join(__dirname,'../studio-ui/src/services');
function load(name,imports={}){
 const src=fs.readFileSync(path.join(base,name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:k=>{if(!(k in imports))throw Error('Unexpected import '+k);return imports[k]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});
 return mod.exports;
}
const edit=load('scannerEdits'),print=load('scannerPrintLayout');
const svc=load('documentScanner',{'./scannerEdits':edit,'./scannerPrintLayout':print});
const quad=[[.18,.43],[.91,.42],[.95,.78],[.20,.82]].map(([x,y])=>({x,y}));
const inside=(x,y,q)=>{let sign=0;for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(Math.abs(cross)<1e-6)continue;if(!sign)sign=Math.sign(cross);else if(cross*sign<0)return false;}return true;};
function picture(opts={}){
 const w=360,h=270,data=new Uint8ClampedArray(w*h*4);
 const {paper=true,tint=0,illumination=0,pen=false}=opts;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,fx=x/(w-1),fy=y/(h-1),grain=4*Math.sin(y*.06+x*.045)+3*Math.cos(y*.02-x*.09);
  const isPaper=paper&&inside(fx,fy,quad);
  const line=isPaper&&fx>.27&&fx<.85&&fy>.50&&fy<.73&&(y%19<2||x%50<2);
  const isPen=pen&&!paper&&y<22&&x<150&&x>35;
  let rgb=isPaper?(line?[67,71,72]:[163,167,161+tint]):[144+grain,124+grain,83+grain];
  if(isPen)rgb=[41,85,171];
  for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,Math.round(rgb[c]+illumination)));
  data[i+3]=255;
 }
 return {width:w,height:h,data};
}
for(const tint of [-33,-20,0,24,38])for(const illumination of [-24,0,16])for(const kind of ['auto','paper']){
 const found=svc.detectDocumentEdges(picture({tint,illumination}),kind);
 assert.equal(found.confidence,'estimated','Detect paper wood tint '+tint+', light '+illumination+', kind '+kind);
 assert.ok(svc.validCorners(found.corners));
 for(let i=0;i<4;i++)assert.ok(Math.hypot(found.corners[i].x-quad[i].x,found.corners[i].y-quad[i].y)<.09,'stable corner '+i);
}
for(const empty of [{paper:false},{paper:false,pen:true}]){
 const found=svc.detectDocumentEdges(picture(empty),'auto');
 assert.equal(found.confidence,'manual','Do not hallucinate sheet on wood or from blue pen');
}
const old={original:new Blob(['jpeg'],{type:'image/jpeg'}),corners:svc.DEFAULT_CORNERS,autoProcessPending:false,detectionConfidence:'manual',scanDetectorRevision:59};
assert.ok(svc.SCAN_DETECTOR_REVISION>=60);
assert.equal(svc.needsScanDetectorUpgrade(old),true,'Previous failed page should be retried on engine upgrade');
assert.equal(svc.needsScanDetectorUpgrade({...old,scanDetectorRevision:svc.SCAN_DETECTOR_REVISION}),false,'No repeat after current revision');
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
const source=fs.readFileSync(path.join(base,'documentScanner.ts'),'utf8');
assert.ok(source.includes('[360,560,760]'),'Three bounded detail levels, not unlimited CPU');
assert.ok(ui.includes('editing.autoProcessPending')&&ui.includes('role="status"'),'Show ongoing work instead of prematurely warning');
assert.ok(ui.includes('SCAN_DETECTOR_REVISION'),'Display detector build for accurate bug triage');
const gradle=fs.readFileSync(path.join(__dirname,'../android/app/build.gradle'),'utf8');
assert.match(gradle,/applicationIdSuffix '\.trial2564'/);assert.match(gradle,/HNLMark STUDIO 64/);
console.log('PASS TEST60: wood background, cool/warm sheets, shadows, safe no-page, revision upgrade, progress & APK isolation');
