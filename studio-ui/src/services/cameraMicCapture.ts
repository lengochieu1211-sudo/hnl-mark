/** Prefer a single WebView getUserMedia request for VIDEO+MIC.
 * Several Android camera providers cannot start a separate audio-only capture
 * once a video-only stream already owns the camera. If audio fails, keep the
 * preview usable, but never silently claim the video will have audio.
 */
export type CameraMicOpenResult = {stream:MediaStream;hasLiveMicrophone:boolean;microphoneError?:unknown};
export async function openCameraWithMicrophone(
 devices:Pick<MediaDevices,'getUserMedia'>,video:MediaTrackConstraints
):Promise<CameraMicOpenResult>{
 let combined:MediaStream|undefined;
 try{
  combined=await devices.getUserMedia({video,audio:true});
  const videoLive=combined.getVideoTracks().some(t=>t.readyState==='live');
  const audioLive=combined.getAudioTracks().some(t=>t.readyState==='live');
  if(videoLive&&audioLive)return {stream:combined,hasLiveMicrophone:true};
  throw Object.assign(new Error('Thiếu luồng âm thanh hoặc hình từ WebView'),{name:'NotReadableError'});
 }catch(error){
  // The mixed capture cannot be used. Release it before requesting video-only;
  // don't let a failed microphone make the entire camera preview disappear.
  combined?.getTracks().forEach(track=>track.stop());
  const videoOnly=await devices.getUserMedia({video,audio:false});
  return {stream:videoOnly,hasLiveMicrophone:false,microphoneError:error};
 }
}
export function isLiveMicrophone(stream:MediaStream|null|undefined):boolean{
 return !!stream?.getAudioTracks().some(track=>track.readyState==='live'&&track.enabled);
}
