/** Real Android WebView MediaStore bridge. No fake Save/Share success. */
import {deliverPickedBatch,type PickedItem,type PickedImportSummary} from './nativePickedBatch';
type MediaCallback=(files:File[])=>Promise<PickedImportSummary>;
type TabCallback=(tab:string)=>void;
let selectedCallback:MediaCallback|undefined, tabCallback:TabCallback|undefined;
const native=()=> (window as any).HNLAndroidBridge as any;
const base64=(blob:Blob):Promise<string>=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).slice(String(reader.result).lastIndexOf(',')+1)||'');reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
let queue:Promise<unknown>=Promise.resolve();
async function nativeTransfer(blob:Blob,name:string,sharing:boolean):Promise<void>{
 const b=native();if(!b)throw Error('Native bridge chưa được cấp');
 const token=sharing?b.beginShare(name,blob.type):b.beginSave(name,blob.type);
 if(!token)throw Error('Không tạo được tệp trên thiết bị');
 try{for(let off=0;off<blob.size;off+=128*1024){const enc=await base64(blob.slice(off,off+128*1024));
 if(!(sharing?b.appendShare(token,enc):b.appendSave(token,enc)))throw Error('Không ghi được phần dữ liệu');}
 if(!(sharing?b.finishShare(token):b.finishSave(token)))throw Error('Android từ chối hoàn tất tệp');}
 catch(e){if(sharing)b.abortShare(token);else b.abortSave(token);throw e;}
}
export function isAndroidApk():boolean{return !!native();}
export async function saveToDevice(blob:Blob,name:string):Promise<void>{if(native()){
 const next=queue.catch(()=>{}).then(()=>nativeTransfer(blob,name,false));queue=next;await next;return;
}const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function shareFromDevice(blob:Blob,name:string):Promise<void>{if(native()){
 const next=queue.catch(()=>{}).then(()=>nativeTransfer(blob,name,true));queue=next;await next;return;
}const f=new File([blob],name,{type:blob.type});if(navigator.canShare?.({files:[f]})){await navigator.share({files:[f],title:'HNL Mark'});return;}
 throw Error('Thiết bị không hỗ trợ chia sẻ trực tiếp. Hãy dùng Lưu vào máy.');}
/** SAF picker grants access to a single user-selected internal/SD folder. */
export function getSaveLocationLabel():string{
 try{return String(native()?.getSaveDestination?.()||'Web: thư mục Tải xuống của trình duyệt');}
 catch{return 'Không đọc được nơi lưu, hãy chọn lại thư mục.';}
}
export function chooseSaveLocation():void{if(!native()?.chooseSaveFolder)throw Error('Chỉ APK Android hỗ trợ chọn thư mục lưu.');native().chooseSaveFolder();}
export function clearSaveLocation():void{native()?.resetSaveFolder?.();window.dispatchEvent(new Event('hnl-studio:save-destination'));}
export function pickDeviceGallery():void{if(native()?.openDeviceGallery)native().openDeviceGallery();else document.querySelector<HTMLInputElement>('#hnl-studio-picker')?.click();}
export function setAndroidCameraActive(active:boolean){try{native()?.cameraState?.(active);}catch{}}
export function setupAndroidBridge(onPicked:MediaCallback,onTab:TabCallback,onBack:()=>boolean):void{
 selectedCallback=onPicked;tabCallback=onTab;
 (window as any).HNLAndroidApp={handleBack:onBack,chooseTab:(tab:string)=>tabCallback?.(tab),openGallery:pickDeviceGallery,
 receivePickedMedia:async (items:PickedItem[],batchId?:string)=>{
   let summary:PickedImportSummary={imported:0,failed:0,errors:[]};
   try{
     summary=await deliverPickedBatch(items,async files=>{
       if(!selectedCallback)throw Error('Thư viện chưa khởi tạo; xin mở lại ứng dụng');
       return selectedCallback(files);
     },fetch,(processed,total)=>window.dispatchEvent(new CustomEvent('hnl-studio:picker-progress',{detail:{processed,total}})));
   }catch(error){summary={imported:0,failed:Array.isArray(items)?items.length:1,errors:[String(error)]};}
   finally{
     if(batchId){
       try{native()?.pickedBatchFinished?.(batchId,summary.imported,summary.failed,summary.errors[0]||'');}
       catch(error){console.warn('Không gửi được xác nhận nhập tệp tới Android:',error);}
     }
     window.dispatchEvent(new CustomEvent('hnl-studio:picker-result',{detail:summary}));
   }
   return summary;
 },setDeviceOrientation:(angle:number,displayAngle?:number)=>window.dispatchEvent(new CustomEvent('hnl-studio:orientation',{detail:{angle,displayAngle}})),
 saveDestinationChanged:()=>window.dispatchEvent(new Event('hnl-studio:save-destination'))};
}
