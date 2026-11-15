/** Prefer one video+audio WebView session. Some Android WebViews reject mixed
 * getUserMedia even when RECORD_AUDIO was granted: recover audio BEFORE opening
 * the video-only preview, while the camera device is released.
 * Keep microphone streams separate when necessary; never silently promise sound.
 */
export type CameraMicOpenResult = {
 stream:MediaStream;
 hasLiveMicrophone:boolean;
 microphoneStream?:MediaStream;
 microphoneError?:unknown;
};
const stopAll=(stream:MediaStream|undefined)=>stream?.getTracks().forEach(track=>track.stop());
export function isLiveMicrophone(stream:MediaStream|null|undefined):boolean {
 return !!stream?.getAudioTracks().some(track=>track.readyState==='live'&&track.enabled);
}
export async function openCameraWithMicrophone(
 devices:Pick<MediaDevices,'getUserMedia'>,video:MediaTrackConstraints
):Promise<CameraMicOpenResult>{
 let combined:MediaStream|undefined;
 try{
  combined=await devices.getUserMedia({video,audio:true});
  if(combined.getVideoTracks().some(t=>t.readyState==='live')&&isLiveMicrophone(combined))
   return {stream:combined,hasLiveMicrophone:true};
  throw Object.assign(new Error('Luồng camera hoặc micro chưa hoạt động'),{name:'NotReadableError'});
 }catch(combinedError){
  stopAll(combined);
  // Important: ask for the microphone while NO camera track is occupying MIUI.
  // Audio-only after video-only can consistently fail with NotReadableError.
  let microphoneStream:MediaStream|undefined;
  let microphoneError:unknown=combinedError;
  try{
   microphoneStream=await devices.getUserMedia({video:false,audio:true});
   if(!isLiveMicrophone(microphoneStream))
    throw Object.assign(new Error('Không có luồng micro hoạt động'),{name:'NotReadableError'});
  }catch(error){
   stopAll(microphoneStream);microphoneStream=undefined;microphoneError=error;
  }
  try{
   const stream=await devices.getUserMedia({video,audio:false});
   return {stream,hasLiveMicrophone:!!microphoneStream,microphoneStream,
    microphoneError:microphoneStream?undefined:microphoneError};
  }catch(videoError){
   // Some providers cannot open a second camera session while audio-only is
   // active. Release audio and retry normal camera preview rather than blacking out.
   stopAll(microphoneStream);
   if(microphoneStream){
    const stream=await devices.getUserMedia({video,audio:false});
    return {stream,hasLiveMicrophone:false,microphoneError:videoError};
   }
   throw videoError;
  }
 }
}
/** Last-chance recovery at record press: release camera-only BEFORE retrying
 * the combined permission/capture request. Never run two camera owners in parallel.
 */
export async function reopenVideoWithMicrophone(
 devices:Pick<MediaDevices,'getUserMedia'>,video:MediaTrackConstraints,current:MediaStream
):Promise<CameraMicOpenResult>{
 stopAll(current);
 return openCameraWithMicrophone(devices,video);
}
