/** TEST51: anonymous wood-grain cyan ID + non-blocking scanner capture. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
const load=(name,imports={})=>{
 const source=fs.readFileSync(path.join(root,name+'.ts'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(js,{module:mod,exports:mod.exports,require:(p)=>{if(!(p in imports))throw Error('Unexpected import '+p);return imports[p]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Math,Map,Set,Date,console,Number,Error,Array});
 return mod.exports;
};
const edits=load('scannerEdits'),print=load('scannerPrintLayout');
const {detectDocumentEdges,validCorners}=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':print});
function contains(x,y,p){let inside=false;for(let i=0,j=3;i<4;j=i++){const a=p[i],b=p[j];if(((a[1]>y)!==(b[1]>y))&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function scene(card){const w=268,h=360,data=new Uint8ClampedArray(w*h*4);
 const quad=[[.29,.18],[.67,.24],[.55,.75],[.15,.69]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,xx=x/w,yy=y/h,inside=card&&contains(xx,yy,quad);
  const grain=8*Math.sin(x*.26+y*.021)+4*Math.sin(x*.04+y*.017)+6*Math.cos(x*.006-y*.06);
  let rgb=[172+grain,163+grain,140+grain];
  if(inside){const mid=yy>.4&&yy<.55;
   rgb=mid?[163+grain*.25,157+grain*.2,143+grain*.1]:[139+grain*.45,190+grain*.25,178+grain*.20];
   if(xx>.44&&xx<.59&&yy>.24&&yy<.42)rgb=[177,168,151];
   if(yy>.60&&yy<.64&&xx>.27&&xx<.48)rgb=[34,49,42];
  }
  for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,rgb[c]));data[i+3]=255;
 }
 return {width:w,height:h,data,quad};
}
const input=scene(true),found=detectDocumentEdges(input,'auto');
assert.equal(found.confidence,'estimated','Cyan ID card on wood should be detected');
assert.ok(validCorners(found.corners));
for(let i=0;i<4;i++){const e=input.quad[i],p=found.corners[i];assert.ok(Math.hypot(p.x-e[0],p.y-e[1])<.09,'corner '+i);}
assert.equal(detectDocumentEdges(scene(false),'auto').confidence,'manual','Wood alone must not get auto-cropped');
const ui=fs.readFileSync(path.join(__dirname,'../studio-ui/src/components/scanner/DocumentScannerScreen.tsx'),'utf8');
const handler=ui.split('const captureScanFrame=async()=>')[1].split('const startScanCamera=')[0];
assert.ok(handler.includes('await putScan(page)')&&handler.includes('queueScanEdgeEstimate(page)'));
assert.ok(!handler.includes('await suggestDocumentEdges('),'Do not block the shutter on edge analysis');
assert.ok(handler.includes('scanLiveStatus'));
const engine=fs.readFileSync(path.join(root,'documentScanner.ts'),'utf8');
assert.ok(engine.includes('current.processed')&&engine.includes('current.corners.some('),'Do not overwrite edited scan');
console.log('PASS TEST51 synthetic wood / cyan card; no-card fallback; non-blocking shutter; edit safety');
