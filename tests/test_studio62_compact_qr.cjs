/** R62 synthetic regression: a small rotated QR card must not include wood
 * reflections or bright mugs. No real user's image or QR data is committed. */
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
const scan=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer},'\nexport {findCompactLightCardOnWarmBackground};');
const inside=(x,y,q)=>{
 let sign=0;
 for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
  if(Math.abs(cross)<1e-9)continue;if(sign&&cross*sign<0)return false;sign=Math.sign(cross);}
 return true;
};
const w=360,h=270,quad=[{x:.41,y:.51},{x:.68,y:.32},{x:.82,y:.55},{x:.55,y:.74}];
function scene(card=true){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/(w-1),v=y/(h-1),p=card&&inside(u,v,quad),i=4*(y*w+x);
  const grain=Math.sin(x*.12+y*.21)*4+Math.sin(y*.08-x*.15)*3;
  let rgb=[115+grain,83+grain,52+grain];
  // Two peripheral mugs are brighter than the card and touch image edges.
  if((u<.25||u>.92)&&v>.035&&v<.74)rgb=[212,214,208];
  // Isolated glossy mark must never pull an outer corner into bare wood.
  if(u>.72&&u<.77&&v>.22&&v<.27)rgb=[202,203,194];
  if(p){rgb=[206,214,207];
   if(u>.55&&u<.70&&v>.45&&v<.60&&(x+y)%7<3)rgb=[26,43,52];
  }
  for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,Math.round(rgb[c])));data[i+3]=255;
 }
 return {width:w,height:h,data};
}
const card=scan.findCompactLightCardOnWarmBackground(scene(), 'auto');
assert.ok(card&&card.confidence==='estimated','Find compact paper card on warm wooden table');
assert.ok(scan.validCorners(card.corners),'No crossing corners');
const found=scan.detectDocumentEdges(scene(),'auto');
assert.equal(found.confidence,'estimated','Automatic QR detection');
for(let i=0;i<4;i++){
 const error=Math.hypot(found.corners[i].x-quad[i].x,found.corners[i].y-quad[i].y);
 assert.ok(error<.105,'QR corner '+i+' must not include glossy wood, deviation '+error);
}
assert.equal(scan.findCompactLightCardOnWarmBackground(scene(false),'auto'),null,'Do not treat mugs as a card');
assert.equal(scan.findCompactLightCardOnWarmBackground(scene(),'paper'),null,'Keep paper detector unchanged');
assert.equal(scan.SCAN_DETECTOR_REVISION,62);
const gradle=fs.readFileSync(path.join(__dirname,'../android/app/build.gradle'),'utf8');
assert.match(gradle,/applicationIdSuffix '\.trial2562'/);
assert.match(gradle,/HNLMark STUDIO 62/);
console.log('PASS R62: isolated compact rotated QR, mugs/reflections excluded, previous paper path preserved');
