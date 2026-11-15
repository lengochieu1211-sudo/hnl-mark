import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openCameraWithMicrophone,reopenVideoWithMicrophone,isLiveMicrophone} from '../studio-ui/src/services/cameraMicCapture.ts';
const tr=(kind,state='live')=>({kind,readyState:state,enabled:true,muted:false,stopped:false,stop(){this.stopped=true;this.readyState='ended'}});
const mk=(videos=[],audios=[])=>({getVideoTracks:()=>videos,getAudioTracks:()=>audios,getTracks:()=>[...videos,...audios],active:true});
const video={facingMode:{ideal:'environment'},width:{ideal:1920}};
const bad=Object.assign(new Error('Android mixed capture refused'),{name:'NotReadableError'});
// Repro: camera+audio fails despite permission, audio-only succeeds while no
// camera track exists. Recovery must bind both captures into the recorder.
{
 const mic=mk([],[tr('audio')]);const preview=mk([tr('video')]);let calls=[];
 const res=await openCameraWithMicrophone({getUserMedia:async options=>{
  calls.push(options);
  if(options.video!==false&&options.audio===true)throw bad;
  return options.video===false?mic:preview;
 }},video);
 assert.deepEqual(calls,[{video,audio:true},{video:false,audio:true},{video,audio:false}]);
 assert.equal(res.stream,preview);
 assert.equal(res.microphoneStream,mic);
 assert.equal(res.hasLiveMicrophone,true);
 assert.equal(res.microphoneError,undefined);
 assert.equal(isLiveMicrophone(res.microphoneStream),true);
}
// If the separate mic blocks a new camera session, close the mic and return
// a usable camera preview, with sound NOT reported as ready.
{
 const micTrack=tr('audio'),mic=mk([],[micTrack]),preview=mk([tr('video')]);let tries=0;
 const res=await openCameraWithMicrophone({getUserMedia:async opts=>{
  if(opts.video!==false&&opts.audio===true)throw bad;
  if(opts.video===false)return mic;
  tries++;
  if(tries===1)throw Object.assign(new Error('busy'),{name:'NotReadableError'});
  return preview;
 }},video);
 assert.equal(tries,2);assert.equal(micTrack.stopped,true);
 assert.equal(res.hasLiveMicrophone,false);assert.equal(res.microphoneStream,undefined);
 assert.equal(res.stream,preview);
}
// At record-press do not request audio while a video-only camera owns the
// Android camera. The old track must be stopped before the first retry.
{
 const priorTrack=tr('video'),prior=mk([priorTrack]);
 const newStream=mk([tr('video')],[tr('audio')]);let observedStopped=false;
 const res=await reopenVideoWithMicrophone({getUserMedia:async opts=>{
  observedStopped=priorTrack.stopped;
  assert.equal(opts.audio,true);
  return newStream;
 }},video,prior);
 assert.equal(observedStopped,true);assert.equal(res.hasLiveMicrophone,true);
}
const source=readFileSync(new URL('../studio-ui/src/components/camera/CameraApkScreen.tsx',import.meta.url),'utf8');
const java=readFileSync(new URL('../android/app/src/main/java/vn/hnl/xaydung/hnlmark/MainActivity.java',import.meta.url),'utf8');
assert.match(source,/reopenVideoWithMicrophone\(/);
assert.match(source,/audioStreamRef\.current=recovered\.microphoneStream\|\|null/);
assert.match(source,/\.\.\.\(hasAudio\?activeMicrophone!\.getAudioTracks\(\):\[\]\)/);
assert.match(source,/if\(!allowSilentRecording\)throw Error/);
assert.match(java,/PermissionRequest\.RESOURCE_AUDIO_CAPTURE/);
assert.match(java,/Manifest\.permission\.RECORD_AUDIO/);
console.log('PASS TEST47: audio-only-before-video fallback, release-camera retry, no silent false positive');
