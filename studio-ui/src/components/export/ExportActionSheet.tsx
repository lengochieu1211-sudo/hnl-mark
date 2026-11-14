import React,{useEffect,useRef,useState} from 'react';
import {Download,Share2,Files,FolderArchive,CheckCircle2,AlertCircle,Loader2,X,Upload} from 'lucide-react';
import type {MediaItem,WatermarkConfig} from '../../types/hnl';
import {createTimemarkPhoto} from '../../services/timemarkRenderer';
import {isSimpleStamp} from '../../services/simpleStampRenderer';
import {mediaWatermarkConfig} from '../../services/watermarkLocation';
import {stampImportedVideo} from '../../services/importedVideoStamp';
import {saveToDevice,shareFromDevice} from '../../services/deviceBridge';
import {createProjectZip} from '../../services/projectBackup';
interface Props {isOpen:boolean;targetItems:MediaItem[];onClose:()=>void;watermarkConfig:WatermarkConfig;onRestoreBackup?:(file:File)=>Promise<void>;onStampedMedia?:(item:MediaItem,stamped:Blob,config:WatermarkConfig)=>Promise<void>}
export const ExportActionSheet:React.FC<Props>=({isOpen,targetItems,onClose,watermarkConfig,onRestoreBackup,onStampedMedia})=>{
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 const [advanced,setAdvanced]=useState(false);
 const picker=useRef<HTMLInputElement>(null);
 const exportAbort=useRef<AbortController|null>(null);
 useEffect(()=>()=>exportAbort.current?.abort(),[]);
 useEffect(()=>{(window as any).__hnlStudioExporting=busy;return()=>{(window as any).__hnlStudioExporting=false};},[busy]);
 if(!isOpen)return null;
 const close=()=>{if(!busy){setMessage('');setError(false);onClose();}};
 const run=async(task:()=>Promise<void>,success:string)=>{
 if(busy)return;setBusy(true);setError(false);setMessage('Đang xử lý tệp thật…');
 try{await task();setMessage(success);}catch(e){setError(true);setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 };
 const getBlob=async(item:MediaItem)=>item.rawBlob||await(await fetch(item.url)).blob();
 const saveSelected=()=>run(async()=>{
 if(targetItems.length!==1)throw Error('Lưu từng ảnh/video; dùng Xuất nhiều để tạo ZIP.');
 const it=targetItems[0],blob=await getBlob(it);
 const ext=it.kind==='video'?(blob.type.includes('mp4')?'mp4':'webm'):(blob.type.includes('png')?'png':'jpg');
 await saveToDevice(blob,`HNLMark_Original_${Date.now()}.${ext}`);
 },'Đã lưu bản gốc vào máy; dữ liệu ảnh/video gốc không thay đổi.');
 const share=()=>run(async()=>{
 if(targetItems.length!==1)throw Error('Chia sẻ một tệp mỗi lần');const it=targetItems[0],blob=await getBlob(it);
 await shareFromDevice(blob,`HNLMark_Original_${Date.now()}.${it.kind==='video'?(blob.type.includes('mp4')?'mp4':'webm'):(blob.type.includes('png')?'png':'jpg')}`);
 },'Đã gửi yêu cầu mở trình chia sẻ (xác nhận gửi ở ứng dụng đích).');
 const saveStamped=(sharing:boolean)=>run(async()=>{
   if(targetItems.length!==1)throw Error('Vui lòng chọn một ảnh hoặc video.');
   const it=targetItems[0];
   let blob:Blob;
   if(it.kind==='video'){
     const cfg=mediaWatermarkConfig({...watermarkConfig,...it.watermarkOverride},it);
     if(it.isStamped&&!it.stampedBlob){ // Camera source frames were stamped while recording.
       blob=await getBlob(it);
     }else if(it.stampedBlob&&it.stampedConfig&&JSON.stringify({...it.stampedConfig,dateTimeIso:it.stampedConfig.autoTime?'':it.stampedConfig.dateTimeIso})===JSON.stringify({...cfg,dateTimeIso:cfg.autoTime?'':cfg.dateTimeIso})){
       blob=it.stampedBlob;
     }else{
       // Imported video: decode, play and re-encode stamped frames, never modify the source.
       setMessage('Đang phát và chèn Timemark vào video… 0%');
       const controller=new AbortController();exportAbort.current=controller;
       try{
         blob=await stampImportedVideo(await getBlob(it),cfg,it.photoCode,pct=>setMessage(pct>=0?`Đang chèn dấu video… ${pct}%`:`Đang chèn dấu video… ${Math.abs(pct)} giây`),controller.signal);
         if(controller.signal.aborted)throw Error('Đã hủy xử lý video.');
         await onStampedMedia?.(it,blob,cfg);
       }finally{exportAbort.current=null;}
     }
   }else{
     const cfg=mediaWatermarkConfig({...watermarkConfig,...it.captureWatermark,...it.watermarkOverride},it);
     if(!['timemark','none'].includes(cfg.templateId)&&!isSimpleStamp(cfg.templateId))throw Error('Mẫu dấu này chưa có bộ xuất ảnh. Ảnh gốc vẫn được giữ.');
     blob=it.stampedBlob&&!it.watermarkOverride&&it.captureWatermark?.templateId===cfg.templateId&&cfg.locationSource!=='photo'?it.stampedBlob:await createTimemarkPhoto(await getBlob(it),cfg,it.photoCode,it.orientationDeg||0);
   }
   const extension=it.kind==='video'?(blob.type.includes('mp4')?'mp4':'webm'):'jpg';
   const filename=`HNLMark_Timemark_${Date.now()}.${extension}`;
   if(sharing)await shareFromDevice(blob,filename);
   else await saveToDevice(blob,filename);
 },sharing?'Đã mở trình chia sẻ tệp có dấu (xác nhận trong ứng dụng nhận).':'Đã lưu tệp có dấu vào máy.');
 const backup=()=>run(async()=>{const zip=await createProjectZip(targetItems);
 await saveToDevice(zip,`HNLMark_Backup_${Date.now()}.zip`);
 },'Đã tạo ZIP bao gồm ảnh/video GỐC và dữ liệu chỉnh sửa.');
 return <div className="fixed inset-0 z-[410] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={close}>
  <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#0D1729] border border-white/15 p-4 pb-6 shadow-2xl"
    onClick={e=>e.stopPropagation()} style={{paddingBottom:'max(20px,var(--hnl-safe-bottom))'}}>
   <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
    <div><h2 className="text-[15px] font-bold">Lưu & Chia sẻ</h2><p className="text-[11px] text-[#94A3B8]">{targetItems.length} tệp · dữ liệu thật</p></div>
    <button className="min-w-11 min-h-11 rounded-full hover:bg-white/10 grid place-items-center" onClick={close} aria-label="Đóng"><X size={19}/></button>
   </div>
   {message&&<p role="status" className={'mb-3 rounded-xl px-3 py-2 text-xs '+(error?'bg-red-900/30 text-red-200':'bg-[#183326] text-[#A7F3D0]')}>{message}</p>}
    <div className="space-y-2">
     <button disabled={busy||targetItems.length!==1}
       onClick={()=>saveStamped(false)} className="w-full min-h-[52px] flex gap-3 items-center rounded-xl bg-[#E2B74B] text-[#071121] font-semibold text-sm px-4 text-left disabled:opacity-40"><Download size={19}/>Lưu ảnh / video có dấu vào máy</button>
     <button disabled={busy||targetItems.length!==1}
       onClick={()=>saveStamped(true)} className="w-full min-h-[50px] flex gap-3 items-center rounded-xl bg-[#17253D] text-[#E2B74B] font-semibold text-sm px-4 text-left disabled:opacity-40"><Share2 size={19}/>Chia sẻ ảnh / video có dấu</button>
     {targetItems[0]?.kind==='video'&&!targetItems[0]?.isStamped&&<p className="text-xs text-[#94A3B8]">Video nhập từ máy sẽ được phát và xuất lại với dấu Timemark; bản gốc không thay đổi.</p>}
     <button type="button" disabled={busy} aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}
       className="w-full min-h-[40px] px-3 text-left rounded-xl border border-white/10 text-[#AEBBD0] text-xs">{advanced?'Ẩn tùy chọn nâng cao':'Tệp gốc và sao lưu · Tùy chọn nâng cao'}</button>
     {advanced&&<div className="space-y-2">
       <button disabled={busy||targetItems.length!==1} onClick={saveSelected} className="w-full min-h-[44px] flex gap-3 items-center rounded-xl bg-[#17253D] text-white text-sm px-4 text-left disabled:opacity-40"><Download size={19}/>Lưu ảnh/video gốc</button>
       <button disabled={busy||targetItems.length!==1} onClick={share} className="w-full min-h-[44px] flex gap-3 items-center rounded-xl bg-[#17253D] text-white text-sm px-4 text-left disabled:opacity-40"><Share2 size={19}/>Chia sẻ tệp gốc</button>
       <button disabled={busy||!targetItems.length} onClick={backup} className="w-full min-h-[44px] flex gap-3 items-center rounded-xl bg-[#17253D] text-white text-sm px-4 text-left disabled:opacity-40"><FolderArchive size={19}/>Sao lưu dự án ZIP ({targetItems.length})</button>
     </div>}
{onRestoreBackup&&<><input ref={picker} type="file" accept=".zip,application/zip" hidden onChange={e=>{const f=e.target.files?.[0];if(f)run(()=>onRestoreBackup(f),'Đã khôi phục dự án ZIP vào thư viện mới, không xóa dữ liệu cũ.');e.currentTarget.value='';}}/>
      <button disabled={busy} className="w-full min-h-[44px] flex gap-3 items-center px-4 text-sm text-[#94A3B8]" onClick={()=>picker.current?.click()}><Upload size={17}/>Khôi phục dự án ZIP</button></>}
   </div>
   <p className="pt-3 text-[11px] text-[#94A3B8]">Bản gốc luôn được giữ riêng. Xuất Timemark dùng đúng bố cục chữ giờ, ngày và mã dọc; các mẫu khác cần xác minh kết xuất riêng.</p>
   {busy&&<div className="flex items-center justify-between gap-3 mt-2">
      <p className="text-xs text-[#E2B74B] flex items-center gap-2"><Loader2 size={16} className="animate-spin"/>Đang xử lý video…</p>
      {exportAbort.current&&<button type="button" className="min-h-10 px-3 rounded-lg bg-red-900/40 text-red-200 text-xs" onClick={()=>{exportAbort.current?.abort();setMessage('Đang hủy xử lý, video gốc được giữ nguyên…');}}>Hủy xử lý</button>}
    </div>}
  </div>
 </div>;
};
