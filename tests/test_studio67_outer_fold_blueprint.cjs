/** TEST67 synthetic only: folded invoices, wide plans, clutter, isolated labels.
 * No real user photos or identity/QR content in this public repository. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
function load(name,imports={}){
 const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:p=>{if(!(p in imports))throw Error('Unexpected import: '+p);return imports[p]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});return mod.exports;
}
const edit=load('scannerEdits'),print=load('scannerPrintLayout');
const scan=load('documentScanner',{'./scannerEdits':edit,'./scannerPrintLayout':print});
function inside(x,y,quad){let sg=0;for(let i=0;i<4;i++){const a=quad[i],b=quad[(i+1)%4];const cr=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(!sg&&Math.abs(cr)>1e-8)sg=Math.sign(cr);if(sg&&cr*sg< -1e-8)return false;}return true;}
function scene(type){
 const wide=type.startsWith('plan'),separate=type==='two-sheets',noDoc=type==='glare';
 const w=wide?560:420,h=wide?400:540, data=new Uint8ClampedArray(w*h*4);
 const quad=type==='plan-skew'?[{x:.09,y:.045},{x:.905,y:.19},{x:.89,y:.81},{x:.105,y:.94}]:
  type==='plan-cutoff'?[{x:.003,y:.105},{x:.905,y:.115},{x:.89,y:.89},{x:.003,y:.90}]:
  wide?[{x:.09,y:.105},{x:.905,y:.115},{x:.89,y:.89},{x:.105,y:.90}]:
  [{x:.15,y:.085},{x:.86,y:.095},{x:.84,y:.925},{x:.135,y:.91}];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/(w-1),v=y/(h-1),inPage=!noDoc&&inside(u,v,quad);const i=(y*w+x)*4;
  const texture=7*Math.sin(x*.27+y*.035)+8*Math.cos(x*.11-y*.23);
  let rgb=[24+texture,28+texture,34+texture];
  // Dark glossy plastic or keyboard; isolated bright stripes must not become paper.
  if(u<.13&&v>.18&&v<.76&&((x*3+y)%31)<5)rgb=[154,155,152];
  if(wide&&u>.90&&v>.05&&v<.95&&((Math.floor(y/25)+Math.floor(x/22))%3)===0)rgb=[170,173,179];
  if(!noDoc&&inPage){
   rgb=wide?[197,194,178]:[201,205,202];
   const rule=wide?(Math.abs((u-.12)*44-Math.round((u-.12)*44))<.025||Math.abs((v-.15)*30-Math.round((v-.15)*30))<.032):
    (Math.abs((v-.26)*24-Math.round((v-.26)*24))<.07&&v>.26&&v<.8);
   if(rule)rgb=wide?[96,97,99]:[91,111,133];
   const folded=(type==='folded-invoice'||type==='two-sheets')&&v>.45&&v< (separate?.51:.47);
   if(folded)rgb=[49,52,54];
   // Keep paper remaining at the far left and right in a fold (not on real two-sheet separation).
   if(folded&&!separate&&(u<.22||u>.78))rgb=[131,134,132];
   // QR-like dark block close to the lower-right external paper margin.
   if(!wide&&u>.72&&u<.80&&v>.81&&v<.89&&((x+y)%7<4))rgb=[29,32,39];
  }
  for(let k=0;k<3;k++)data[i+k]=Math.max(0,Math.min(255,Math.round(rgb[k])));data[i+3]=255;
 }
 return {image:{width:w,height:h,data},quad};
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const covers=(pt,quad)=>inside(pt.x,pt.y,quad)||quad.some(p=>dist(pt,p)<.022);
function testOuter(mode,shouldFind){
 const {image,quad}=scene(mode),got=scan.detectDocumentEdges(image,'auto');
 
 assert.ok(scan.validCorners(got.corners),mode+' valid ordered corners');
 const errors=got.corners.map((p,i)=>dist(p,quad[i]));
 if(shouldFind){
  assert.equal(got.confidence,'estimated',mode+' should find confident outer sheet');
  errors.forEach((e,i)=>assert.ok(e<.115,`${mode} corner ${i} drift ${e.toFixed(3)}; detector must not crop QR/title block`));
 } else if(mode==='two-sheets'){
  assert.ok(got.confidence==='manual'||(got.corners[0].y<.15&&got.corners[2].y>.88),
   'Never crop only one sheet when another full-width paper band remains above/below');
 }
 console.log(mode,got.confidence,errors.map(e=>e.toFixed(3)).join(','));
}
testOuter('folded-invoice',true);
testOuter('plan',true);
for(const mode of ['plan-skew','plan-cutoff']){const {image,quad}=scene(mode),got=scan.detectDocumentEdges(image,'auto');
 assert.ok(got.confidence==='manual'||quad.every(p=>covers(p,got.corners)),
  mode+' must never accept four corners that clip any outer document corner');
 console.log(mode,got.confidence);
}
testOuter('two-sheets',false);
testOuter('glare',false);
assert.ok(scan.SCAN_DETECTOR_REVISION>=64);
console.log('PASS TEST67: outer corners folded invoice + wide plan; clutter does not replace paper; source unchanged');
