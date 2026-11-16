/** Probe real browser capabilities; never relabel WebM as MP4. */
import type {VideoExportFormat} from '../types/hnl';
export function supportedVideoMime(format:VideoExportFormat,hasAudio:boolean):string{
 if(typeof MediaRecorder==='undefined'||typeof MediaRecorder.isTypeSupported!=='function')throw Error('Thiết bị không hỗ trợ ghi video.');
 const mp4=hasAudio
  ? ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4;codecs="avc1,mp4a.40.2"','video/mp4']
  : ['video/mp4;codecs="avc1.42E01E"','video/mp4'];
 const webm=hasAudio
  ? ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']
  : ['video/webm;codecs=vp8','video/webm'];
 const candidates=format==='mp4'?mp4:format==='webm'?webm:[...mp4,...webm];
 const mime=candidates.find(x=>MediaRecorder.isTypeSupported(x));
 if(!mime)throw Error(format==='mp4'
  ? 'Android WebView này chưa mã hóa được MP4 H.264/AAC. Chọn Tự động hoặc WebM; không đổi đuôi giả thành MP4.'
  :format==='webm'?'Android WebView này không mã hóa được WebM.':'Thiết bị không hỗ trợ codec video có dấu.');
 return mime;
}
export const videoFileExtension=(mime:string)=>mime.startsWith('video/mp4')?'mp4':'webm';
