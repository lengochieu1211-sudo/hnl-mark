import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openCameraWithMicrophone,isLiveMicrophone} from '../studio-ui/src/services/cameraMicCapture.ts';
import {buildStampDetailResetPatch} from '../studio-ui/src/services/watermarkDetailDefaults.ts';
const track=(kind,muted=false)=>({kind,readyState:'live',enabled:true,muted,stopped:false,stop(){this.stopped=true;this.readyState='ended';}});
const stream=(v=[],a=[])=>({getVideoTracks:()=>v,getAudioTracks:()=>a,getTracks:()=>[...v,...a],active:true});
const muted=track('audio',true),broken=stream([track('video')],[muted]);
assert.equal(isLiveMicrophone(broken),false);
const goodMic=stream([],[track('audio')]),videoOnly=stream([track('video')]);
let calls=[];const video={facingMode:{ideal:'environment'}};
const recovered=await openCameraWithMicrophone({getUserMedia:async opts=>{
 calls.push(opts);return opts.audio===true&&opts.video!==false?broken:opts.audio===true?goodMic:videoOnly;
}},video);
assert.deepEqual(calls,[{video,audio:true},{video:false,audio:true},{video,audio:false}]);
assert.equal(muted.stopped,true);
assert.equal(recovered.microphoneStream,goodMic);
assert.equal(recovered.hasLiveMicrophone,true);
const defaults={
 fontKey:'be-vietnam',fontSizePx:13,textColor:'#F8FAFC',accentColor:'#E2B74B',bgOpacity:.72,
 timemarkBackgroundEnabled:false,showLogo:true,logoSide:'left',timemarkLogoEnabled:false,
 logoPosition:'top-right',logoCustomPos:{xPct:85,yPct:15},logoSizePct:12,
 positionPreset:'bottom-left',customPos:{xPct:6,yPct:76},
 customShowDateTime:true,customShowLocation:true,customShowNote:true,
 showCoordinates:true,showPhotoCode:true,
};
const patch=buildStampDetailResetPatch(defaults,'#38BDF8');
assert.equal(patch.accentColor,'#38BDF8');
assert.equal(patch.timemarkLogoEnabled,false);
assert.equal(patch.positionPreset,'bottom-left');
assert.notEqual(patch.customPos,defaults.customPos);
assert.notEqual(patch.logoCustomPos,defaults.logoCustomPos);
for(const key of [
 'templateId','dateTimeIso','autoTime','dateFormat','locationText','coordinates',
 'locationSource','customTitle','customNote','inspectorName','logoImageDataUrl',
 'photoCodePrefix','photoCodeSeq','perPhotoOverrideEnabled','defaultAspectRatio',
 'jpegQuality','videoFormat',
 ]) assert.equal(Object.hasOwn(patch,key),false,'Unsafe detail reset: '+key);
const ui=readFileSync(new URL('../studio-ui/src/components/stamps/StampsAndSettingsScreen.tsx',import.meta.url),'utf8');
const gradle=readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');
assert.match(ui,/Khôi phục mặc định tùy chỉnh dấu/);
assert.match(ui,/buildStampDetailResetPatch\(DEFAULT_WATERMARK_CONFIG,activeTemplate\.accentHex\)/);
assert.match(ui,/activeMedia\.kind==='video'&&!!activeMedia\.isStamped&&!activeMedia\.stampedBlob/);
assert.match(gradle,/applicationIdSuffix '\.trial2546'/);
console.log('PASS TEST48: muted microphone recovery, safe visual-only reset, standalone APK package');
