/** TEST57: synthetic gray architectural plan on wood, no private photos. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={})=>{
 const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const code=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,require:k=>{if(!(k in imports))throw Error('Missing '+k);return imports[k]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Math,Map,Set,Date,console,Number,Error,Array});return mod.exports;
};
const edits=load('scannerEdits'),print=load('scannerPrintLayout');
const {detectDocumentEdges,validCorners}=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':print});
const corners=[[.20,.17],[.76,.19],[.89,.84],[.09,.85]].map(([x,y])=>({x,y}));
const inside=(px,py,q)=>{let sign=0;for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],cross=(b.x-a.x)*(py-a.y)-(b.y-a.y)*(px-a.x);if(!sign)sign=Math.sign(cross);else if(cross*sign<0)return false}return true};
function makeScene(withPage=true,background='wood'){
 const w=285,h=360,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,fx=x/(w-1),fy=y/(h-1);
  const grain=5*Math.sin(x*.065+y*.13)+3*Math.cos(x*.045-y*.14);
  const page=withPage&&inside(fx,fy,corners);
  const dark=page&&((y%17===0&&fx>.27&&fx<.79)||(x%18===0&&fy>.35&&fy<.62));
  const base=background==='wood'?[155+grain,137+grain,105+grain]:[171+grain,175+grain,171+grain];
  const rgb=page?(dark?[58,64,59]:[188+grain*.15,195+grain*.15,187+grain*.15]):base;
  for(let c=0;c<3;c++)data[i+c]=Math.round(Math.max(0,Math.min(255,rgb[c])));
  data[i+3]=255;
 }
 return {width:w,height:h,data};
}
for(const kind of ['auto','paper']){
 const result=detectDocumentEdges(makeScene(),kind);
 assert.equal(result.confidence,'estimated','Find gray page on wood '+kind);
 assert.ok(validCorners(result.corners),'Valid 4-vertex paper '+kind);
 for(let i=0;i<4;i++)assert.ok(Math.hypot(result.corners[i].x-corners[i].x,result.corners[i].y-corners[i].y)<.07,'Correct corner '+i+' '+kind);
}
assert.equal(detectDocumentEdges(makeScene(false,'wood'),'paper').confidence,'manual','No paper on wood');
assert.equal(detectDocumentEdges(makeScene(false,'gray'),'auto').confidence,'manual','No forced crop gray background');
console.log('PASS TEST57: neutral sheet on warm wood, empty scenes safe');
