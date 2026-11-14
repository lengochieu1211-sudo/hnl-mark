/** Browser-free synthetic document detection regression. Node CommonJS+TypeScript transpile. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
let ts;try{ts=require('../studio-ui/node_modules/typescript');}catch{ts=require('typescript');}
const src=fs.readFileSync(path.join(__dirname,'../studio-ui/src/services/documentScanner.ts'),'utf8');
const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports,Uint8Array,Int32Array,Uint8ClampedArray,Math,Map,Set,Date,console,Number,Error,Array});
const {detectDocumentEdges}=mod.exports;
const W=360,H=300;
const pointInside=(px,py,p)=>{let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if(((p[i][1]>py)!==(p[j][1]>py))&&(px<(p[j][0]-p[i][0])*(py-p[i][1])/(p[j][1]-p[i][1])+p[i][0]))inside=!inside;return inside;};
function scene(name,quad,back=[36,51,59],doc=[241,232,215],noise=5,pattern=false,expected=quad?'estimated':'manual'){
 const pixels=new Uint8ClampedArray(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const inside=quad&&pointInside(x/W,y/H,quad),i=(y*W+x)*4;
  // Non-uniform desk, small lamp gradient and texture; paper may contain print.
  const j=(Math.sin(x*.21+y*.13)+Math.cos(x*.08-y*.14))*noise;
  const from=inside?doc:back;
  for(let c=0;c<3;c++)pixels[i+c]=Math.max(0,Math.min(255,from[c]+j+(pattern&&!inside?Math.sin(x*.037)*12:0)));
  if(inside){
   const ux=x/W,vy=y/H;
   // dark text blocks should not break the sheet contour.
   if(vy>.39&&vy<.45&&ux>.28&&ux<.71||(vy>.52&&vy<.57&&ux>.28&&ux<.64)){
    for(let c=0;c<3;c++)pixels[i+c]=85+j;
   }
  }
  pixels[i+3]=255;
 }
 const res=detectDocumentEdges({width:W,height:H,data:pixels});
 console.log(name,res.confidence,JSON.stringify(res.corners.map(p=>[+p.x.toFixed(3),+p.y.toFixed(3)])));
 if(expected==='estimated'){assert.equal(res.confidence,'estimated',name+' confidence');
  for(let k=0;k<4;k++){
   const p=res.corners[k],a=quad[k];
   assert.ok(Math.hypot(p.x-a[0],p.y-a[1])<.085,name+' corner '+k+' dx='+Math.hypot(p.x-a[0],p.y-a[1]));
  }
 }else{assert.equal(res.confidence,'manual',name+' should not crop uncertain edges');assert.ok(res.corners[0].x<.03);}
}
scene('white-paper',[[.17,.18],[.78,.13],[.86,.85],[.13,.82]]);
scene('vn-id-card',[[.18,.27],[.78,.18],[.85,.69],[.15,.76]],[25,56,45],[219,204,151],10,true);
scene('dark-card',[[.22,.25],[.80,.19],[.83,.75],[.20,.80]],[228,228,228],[55,98,140],4);
scene('rotated-card',[[.33,.12],[.9,.42],[.7,.87],[.1,.59]],[26,45,65],[244,235,226],3);
scene('uniform-unknown',null,[220,225,228],[220,225,228]);
scene('white-on-white-low-contrast',[[.2,.2],[.8,.18],[.82,.8],[.19,.82]],[229,229,229],[234,234,234],1,false,'manual');
scene('document-partly-outside-frame',[[-.11,.19],[.82,.15],[.83,.8],[-.09,.83]],[35,48,66],[235,239,240],2,false,'manual');
console.log('PASS: document quad detector synthetic perspective and manual fallback');
