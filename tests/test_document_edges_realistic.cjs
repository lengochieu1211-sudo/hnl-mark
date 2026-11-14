/** Realistic deterministic document/CCCD regressions, no biometric/personal data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript');}catch{ts=require('typescript');}
const source=fs.readFileSync(path.join(__dirname,'../studio-ui/src/services/documentScanner.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports,Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Math,Map,Set,Date,console,Number,Error,Array});
const {detectDocumentEdges,validCorners,squareToQuadrilateral}=mod.exports;
const inQuad=(x,y,quad)=>{let inside=false;for(let i=0,j=3;i<4;j=i++){const a=quad[i],b=quad[j];if(((a[1]>y)!==(b[1]>y))&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
function hard(name,opt){const {w=360,h=270,quad,back=[240,240,240],front=[235,235,235],noise=1,shadow=0,clutter=false,glare=false,kind='auto',minConfidence='estimated'}=opt;
 let seed=12993;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return (seed>>>8)/16777215};
 const p=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const uv=[x/w,y/h],inside=quad&&inQuad(...uv,quad),i=(y*w+x)*4;
   let base=inside?front:back;
   const texture=(rnd()-.5)*noise;
   const shade=shadow*((.85*y/h+.15*x/w)-.5);
   const grid=clutter&&!inside&&((x%58)<2||(y%67)<2)?-22:0;
   const flare=glare&&inside&&x/w>.52&&x/w<.8&&y/h<.49?35:0;
   for(let c=0;c<3;c++)p[i+c]=Math.max(0,Math.min(255,base[c]+texture+shade+grid+flare));
   if(inside && x/w>.26 && x/w<.76 && ((y/h>.38&&y/h<.392)||(y/h>.53&&y/h<.542)||(y/h>.62&&y/h<.632))){for(let c=0;c<3;c++)p[i+c]=Math.max(0,front[c]-65+texture)}
   p[i+3]=255;
 }
 const t=Date.now(),result=detectDocumentEdges({width:w,height:h,data:p},kind);
 let err=0;if(quad&&result.confidence==='estimated')err=Math.max(...result.corners.map((v,i)=>Math.hypot(v.x-quad[i][0],v.y-quad[i][1])));
 console.log(name,'confidence='+result.confidence,'maxerror='+err.toFixed(4),'ms='+String(Date.now()-t));
 if(minConfidence==='estimated'){
  assert.equal(result.confidence,'estimated',name);
  assert.ok(err<.095,name+' inaccurate corners: '+err);
 }else if(minConfidence==='manual'){
  assert.equal(result.confidence,'manual',name);
 }
 return result;
}
hard('white-paper-on-light-desk',{quad:[[.15,.17],[.85,.2],[.80,.91],[.11,.83]],front:[240,240,240],back:[231,232,233],noise:1.2,shadow:6,kind:'paper'});
hard('id-card-small-contrast',{quad:[[.21,.24],[.78,.21],[.82,.73],[.20,.79]],front:[181,202,210],back:[176,193,203],noise:1.3,shadow:4,kind:'id-card'});
hard('no-document-grid',{quad:null,back:[210,208,203],noise:3,clutter:true,minConfidence:'manual'});
hard('no-document-noise',{quad:null,back:[200,200,200],noise:26,minConfidence:'manual'});
hard('id-card-glare',{quad:[[.14,.19],[.84,.21],[.86,.78],[.16,.83]],front:[170,203,220],back:[47,62,58],noise:4,shadow:30,glare:true,kind:'id-card'});
console.log('PASS realistic detector regression');
