/** TEST69 synthetic: overlapping forms and clutter; do not use user screenshots in repo. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let ts;try{ts=require('../studio-ui/node_modules/typescript')}catch{ts=require('typescript')}
const root=path.join(__dirname,'../studio-ui/src/services');
function load(name,imports={}){const src=fs.readFileSync(path.join(root,name+'.ts'),'utf8');const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports,require:p=>{if(!(p in imports))throw Error('Unexpected import '+p);return imports[p]},Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,Float32Array,Blob,Math,Map,Set,Date,console,Number,Error,Array,setTimeout});return mod.exports;}
const edits=load('scannerEdits'),layout=load('scannerPrintLayout'),scanner=load('documentScanner',{'./scannerEdits':edits,'./scannerPrintLayout':layout});
function inside(x,y,q){let sign=0;for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(!sign&&Math.abs(cross)>1e-8)sign=Math.sign(cross);if(sign&&cross*sign < -1e-8)return false;}return true;}
function image(mode){const w=440,h=560,data=new Uint8ClampedArray(w*h*4);
 const upper=[{x:.17,y:.10},{x:.82,y:.12},{x:.86,y:.56},{x:.14,y:.54}];
 const lower=[{x:.10,y:.43},{x:.88,y:.46},{x:.84,y:.91},{x:.09,y:.90}];
 const single=[{x:.16,y:.105},{x:.86,y:.11},{x:.84,y:.91},{x:.135,y:.89}];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const u=x/(w-1),v=y/(h-1),i=4*(y*w+x);let rgb=[35+8*Math.sin(x*.07),40+5*Math.cos(y*.05),43];
 if(u>.9&&((x*3+y*5)%44)<12)rgb=[122,125,128];
 const top=inside(u,v,upper),bottom=inside(u,v,lower),solo=inside(u,v,single);
 if(mode==='overlap'&&(top||bottom)||mode==='single'&&solo){rgb=[204,203,193];if((Math.floor(x/3)+Math.floor(y/20))%19===0)rgb=[125,132,125];}
 if(mode==='overlap'&&top&&bottom&&v>.43&&v<.54)rgb=[196,196,185];
 if(mode==='clutter'&&u>.1&&u<.25&&v>.3&&v<.7)rgb=[175,172,167];
 for(let c=0;c<3;c++)data[i+c]=rgb[c];data[i+3]=255;
 }return {image:{width:w,height:h,data},upper,lower,single};}
for(const mode of ['overlap','single','clutter']){const s=image(mode),r=scanner.detectDocumentEdges(s.image,'auto');const multi=scanner.detectMultipleDocumentEdges(s.image,'auto');console.log(mode,r.confidence,r.corners.map(p=>[+p.x.toFixed(3),+p.y.toFixed(3)]),`multi=${multi.length}`);if(mode==='overlap'){
 assert.ok(r.confidence==='manual'||[...s.upper,...s.lower].every(p=>inside(p.x,p.y,r.corners)), 'Overlapping papers must not silently lose either outer sheet corner');
 const partial=[{x:.085,y:.098},{x:.858,y:.098},{x:.858,y:.918},{x:.085,y:.918}];
 assert.equal(scanner.exposedPaperBeyondQuad(s.image,partial),true,'Missed pale upper/right sheet rim must be rejected');
 assert.equal(multi.length,0,'Overlapping connected papers must not be invented as two independent shapes');
}if(mode==='clutter')assert.equal(r.confidence,'manual','non-doc clutter');if(mode==='single')assert.equal(r.confidence,'estimated','single clear sheet should auto-detect');}

assert.equal(scanner.SCAN_DETECTOR_REVISION,65); console.log('PASS TEST69: overlapping paper rim requires manual review, single page remains automatic, clutter safe');
