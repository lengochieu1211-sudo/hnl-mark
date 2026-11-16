import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paintStampPreview} from '../studio-ui/src/services/stampPreviewGeometry.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
globalThis.window={devicePixelRatio:2};
function preview(box,reference){
 const calls=[];
 const ctx={setTransform:(...t)=>calls.push(t)};
 const canvas={width:0,height:0,getContext:()=>ctx};
 let painted;
 paintStampPreview(canvas,box,reference,(_ctx,w,h)=>painted={w,h});
 assert.equal(calls.length,1);
 const [a,b,c,d,x,y]=calls[0];
 assert.equal(b,0);assert.equal(c,0);
 assert.equal(a,d,'Timemark must NEVER be stretched independently on X/Y');
 assert.deepEqual(painted,{w:reference.width,h:reference.height});
 assert.ok(a*reference.width>=canvas.width-1e-7);
 assert.ok(d*reference.height>=canvas.height-1e-7);
 assert.ok(Math.abs(x*2+a*reference.width-canvas.width)<1e-7,'center horizontally');
 assert.ok(Math.abs(y*2+d*reference.height-canvas.height)<1e-7,'center vertically');
 return {a,d,x,y};
}
// Normal photo, camera dọc and ngang, rotation lock mismatch and 180°.
preview({clientWidth:300,clientHeight:400},{width:3000,height:4000});
preview({clientWidth:400,clientHeight:300},{width:4000,height:3000});
preview({clientWidth:300,clientHeight:400},{width:4000,height:3000});
preview({clientWidth:400,clientHeight:300},{width:3000,height:4000});
const mark=source('studio-ui/src/services/timemarkRenderer.ts');
const templates=source('studio-ui/src/data/templates.ts');
const ui=source('studio-ui/src/components/stamps/StampsAndSettingsScreen.tsx');
const camera=source('studio-ui/src/components/camera/CameraApkScreen.tsx');
const video=source('studio-ui/src/services/stampedVideoCapture.ts');
assert.match(mark,/config\.timemarkBackgroundEnabled===true && config\.bgOpacity>0/,
 'Default Timemark must remain transparent');
assert.match(templates,/timemarkBackgroundEnabled: false/);
assert.match(ui,/Khôi phục đúng mẫu Timemark gốc/);
assert.match(ui,/Bật nền tối phía sau chữ Timemark/);
assert.match(mark,/g\.fillText\('mark',right/);
assert.match(mark,/g\.fillText\('Time',right-markWidth/);
assert.match(mark,/g\.fillText\('100% Chân thực'/);
assert.match(mark,/Timemark Verified/);
assert.doesNotMatch(camera,/referenceSize=\{cameraStampReference\}/);
assert.match(video,/const fillScale=Math\.max\(canvas\.width\/oriented\.width,canvas\.height\/oriented\.height\)/,
 'Video canvas must preserve uniform sensor pixel ratio during rotation');
assert.match(video,/ctx\.scale\(fillScale,fillScale\)/);
console.log('PASS TEST44: no stretched camera stamp in 0/90/180, classic Timemark default and video aspect contract');
