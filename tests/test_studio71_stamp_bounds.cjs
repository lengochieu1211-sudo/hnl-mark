const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('../studio-ui/node_modules/typescript'),root=path.join(__dirname,'../studio-ui/src');
function load(p,imports={}){const js=ts.transpileModule(fs.readFileSync(path.join(root,p+'.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const m={exports:{}};vm.runInNewContext(js,{module:m,exports:m.exports,require:k=>{if(!(k in imports))throw Error(k);return imports[k]},Date,Math,Number,Array,Error});return m.exports;}
const data=load('data/templates'),fonts=load('services/watermarkFonts'),logo={drawWatermarkLogo:()=>{}};
const independent=load('services/independentStampRenderer',{'../data/templates':data,'./watermarkFonts':fonts,'./watermarkLogo':logo});
const simple=load('services/simpleStampRenderer',{'./watermarkFonts':fonts,'./watermarkLogo':logo});
let n=0;
for(const t of data.WATERMARK_TEMPLATES.filter(t=>!['timemark','none'].includes(t.id)))for(const [width,height] of [[320,240],[240,320],[1920,1080],[1080,1920],[4000,3000],[3000,4000]])for(const orientation of [0,90,-90,180])for(const size of [10,13,32])for(const pos of ['top-left','top-right','bottom-left','bottom-right','bottom-center','custom']){
 const W=Math.abs(orientation)===90?height:width,H=Math.abs(orientation)===90?width:height,rows=[];
 const g={font:'12px sans',textAlign:'left',save(){},restore(){},translate(){},rotate(){},beginPath(){},roundRect(x,y,w,h){assert.ok(x>=-1e-6&&y>=-1e-6&&x+w<=W+1e-6&&y+h<=H+1e-6,'background outside '+t.id)},fill(){},fillRect(x,y,w,h){assert.ok(x>=-1e-6&&y>=-1e-6&&x+w<=W+1e-6&&y+h<=H+1e-6,'simple background outside '+t.id)},measureText(s){return {width:Array.from(s).length*parseFloat(this.font.match(/([\d.]+)px/)[1])*.65}},fillText(s,x,y,max){const w=Math.min(this.measureText(s).width,max??Infinity),left=this.textAlign==='right'?x-w:x;assert.ok(left>=-1e-5&&left+w<=W+1e-5&&y>=0&&y<=H,'text outside '+t.id);rows.push({left,right:left+w,y,s})}};
 const cfg={...data.DEFAULT_WATERMARK_CONFIG,templateId:t.id,fontSizePx:size,positionPreset:pos,customPos:{xPct:99,yPct:99},customTitle:'Tiêu đề công trình rất dài '.repeat(12),locationText:'Địa chỉ công trình rất dài '.repeat(12),customNote:'Ghi chú '.repeat(30),inspectorName:'Người kiểm tra '.repeat(12),coordinates:'10.123456, 106.123456',photoCodePrefix:'HNL'.repeat(20),showPhotoCode:true,showCoordinates:true,showLogo:false};
 if(independent.isIndependentStamp(t.id)){const b=independent.drawIndependentStamp(g,width,height,cfg,orientation,'MÃ-ẢNH-'.repeat(12));assert.ok(b.x>=-1e-6&&b.y>=-1e-6&&b.x+b.w<=width+1e-6&&b.y+b.h<=height+1e-6,'bounds '+t.id);for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(Math.abs(rows[i].y-rows[j].y)<1e-5)assert.ok(rows[i].right<=rows[j].left+1e-6||rows[j].right<=rows[i].left+1e-6,'overlapping columns '+t.id);}
 else simple.drawSimpleStamp(g,width,height,cfg,orientation);
 assert.ok(rows.length>0);n++;
}
console.log('PASS: '+n+' synthetic non-Timemark stamp layout cases; bounds, long text, columns, orientations');
