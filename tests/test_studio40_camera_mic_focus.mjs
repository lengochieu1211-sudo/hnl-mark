import assert from 'node:assert/strict';
import {openCameraWithMicrophone,isLiveMicrophone} from '../studio-ui/src/services/cameraMicCapture.ts';
import {scannerTapOnVideo} from '../studio-ui/src/services/scannerFocusGeometry.ts';
const track=(kind,state='live')=>({kind,readyState:state,enabled:true,stopped:false,stop(){this.stopped=true}});
const stream=(v,a)=>({getVideoTracks:()=>v,getAudioTracks:()=>a,getTracks:()=>[...v,...a]});
const video={facingMode:{ideal:'environment'},width:{ideal:1920}};
const success=stream([track('video')],[track('audio')]);let calls=[];
let result=await openCameraWithMicrophone({getUserMedia:async c=>{calls.push(c);return success;}},video);
assert.deepEqual(calls,[{video,audio:true}]);assert.equal(result.stream,success);assert.equal(result.hasLiveMicrophone,true);assert.equal(isLiveMicrophone(success),true);
// An Android NotReadableError must preserve a running CAMERA, not a silent recording.
let failed=Object.assign(new Error('in use'),{name:'NotReadableError'});calls=[];
const fallback=stream([track('video')],[]);
result=await openCameraWithMicrophone({getUserMedia:async c=>{calls.push(c);if(c.audio===true)throw failed;return fallback;}},video);
assert.deepEqual(calls,[{video,audio:true},{video,audio:false}]);
assert.equal(result.hasLiveMicrophone,false);assert.equal(result.microphoneError,failed);
assert.equal(result.stream,fallback);assert.equal(isLiveMicrophone(fallback),false);
// Broken streams are always stopped before trying a new camera-only capture.
const brokenVideo=track('video'),deadMic=track('audio','ended');const broken=stream([brokenVideo],[deadMic]);calls=[];
result=await openCameraWithMicrophone({getUserMedia:async c=>{calls.push(c);return c.audio===true?broken:fallback;}},video);
assert.equal(result.hasLiveMicrophone,false);assert.equal(brokenVideo.stopped,true);assert.equal(deadMic.stopped,true);
// Sensor focus must use content pixels, not whole CSS video/letterbox rect.
let focus=scannerTapOnVideo({clientX:200,clientY:450},{left:0,top:0,width:400,height:900},1920,1080);
assert.ok(focus);assert.ok(Math.abs(focus.x-.5)<1e-10);assert.ok(Math.abs(focus.y-.5)<1e-10);
assert.equal(scannerTapOnVideo({clientX:200,clientY:50},{left:0,top:0,width:400,height:900},1920,1080),null);
focus=scannerTapOnVideo({clientX:200,clientY:500},{left:0,top:0,width:400,height:1000},1080,1920);
assert.ok(focus);assert.equal(Math.round(focus.x*100),50);assert.equal(Math.round(focus.y*100),50);
for(const rect of [{left:15,top:20,width:360,height:650},{left:-280,top:-300,width:940,height:1450}]){
 const center={clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2};
 focus=scannerTapOnVideo(center,rect,1920,1080);
 assert.ok(focus);assert.ok(Math.abs(focus.x-.5)<1e-10&&Math.abs(focus.y-.5)<1e-10);
}
console.log('PASS TEST40 camera/mic combined first, silent-safe fallback, sensor-focus letterbox/zoom mapping');
