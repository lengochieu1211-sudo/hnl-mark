/** TEST58: narrow blue-tinted receipt on warm wood; synthetic image only.
 * No real receipt, bank details or personal photos are committed to GitHub. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={})=>{
 const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:k=>{if(!(k in imports))throw Error('Missing '+k);return imports[k]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Math,Map,Set,Date,console,Number,Error,Array});
 return mod.exports;
};
const edits=load('scannerEdits'),printer=load('scannerPrintLayout');
const {detectDocumentEdges,validCorners}=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':printer});
const expected=[[.18,.43],[.92,.42],[.96,.79],[.18,.82]].map(([x,y])=>({x,y}));
const inside=(x,y,q)=>{let sign=0;for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(Math.abs(cross)<1e-6)continue;if(!sign)sign=Math.sign(cross);else if(Math.sign(cross)!==sign)return false}return true};
function sample(withPaper=true,tint=17){
 const w=360,h=267,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const px=x/(w-1),py=y/(h-1),i=(y*w+x)*4,grain=5*Math.sin(x*.09+y*.03)+4*Math.cos(x*.031-y*.04);
  const page=withPaper&&inside(px,py,expected),text=page&&px>.25&&px<.86&&py>.5&&py<.73&&(y%13<2||x%47<2);
  const rgb=page?(text?[59,66,70]:[156+grain*.14,163+grain*.14,156+grain*.14+tint]):[139+grain,119+grain,83+grain];
  for(let c=0;c<3;c++)data[i+c]=Math.round(Math.max(0,Math.min(255,rgb[c])));
  data[i+3]=255;
 }
 return {width:w,height:h,data};
}
for(const tint of [10,17,23,27])for(const kind of ['auto','paper']){
 const found=detectDocumentEdges(sample(true,tint),kind);
 assert.equal(found.confidence,'estimated','Detect narrow cool paper '+kind+'/'+tint);
 assert.ok(validCorners(found.corners));
 for(let i=0;i<4;i++)assert.ok(Math.hypot(found.corners[i].x-expected[i].x,found.corners[i].y-expected[i].y)<.07,'Corner '+i+' '+kind+'/'+tint);
}
assert.equal(detectDocumentEdges(sample(false),'auto').confidence,'manual','Empty wood must not be auto-cropped');
console.log('PASS TEST58: narrow cool-white receipt on warm wood and safe empty background');
