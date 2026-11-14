import React,{useRef,useState} from 'react';
import {Download,Share2,Files,FolderArchive,CheckCircle2,AlertCircle,Loader2,X,ShieldCheck,Upload} from 'lucide-react';
import type {MediaItem} from '../../types/hnl';
import {saveToDevice,shareFromDevice} from '../../services/deviceBridge';
import {createProjectZip} from '../../services/projectBackup';
interface Props {isOpen:boolean;targetItems:MediaItem[];onClose:()=>void;onOpenOriginalEngine:()=>void;onRestoreBackup?:(file:File)=>Promise<void>}
export const ExportActionSheet:React.FC<Props>=({isOpen,targetItems,onClose,onOpenOriginalEngine,onRestoreBackup})=>{
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 const picker=useRef<HTMLInputElement>(null);
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
 },'Đã hoàn tất lưu ảnh/video GỐC. Để xuất dấu Timemark dùng bộ xử lý HNL gốc.');
 const share=()=>run(async()=>{
 if(targetItems.length!==1)throw Error('Chia sẻ một tệp mỗi lần');const it=targetItems[0],blob=await getBlob(it);
 await shareFromDevice(blob,`HNLMark_Original_${Date.now()}.${it.kind==='video'?'webm':'jpg'}`);
 },'Đã gửi yêu cầu mở trình chia sẻ (xác nhận gửi ở ứng dụng đích).');
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
    <button disabled={busy||targetItems.length!==1} onClick={saveSelected} className="w-full min-h-[50px] flex items-center gap-3 rounded-xl bg-[#17253D] text-white text-sm px-4 text-left disabled:opacity-40"><Download size={19} className="text-[#E2B74B]"/>Lưu ảnh/video gốc vào máy</button>
    <button disabled={busy||targetItems.length!==1} onClick={share} className="w-full min-h-[50px] flex items-center gap-3 rounded-xl bg-[#17253D] text-white text-sm px-4 text-left disabled:opacity-40"><Share2 size={19}/>Chia sẻ tệp gốc</button>
    <button disabled={busy||!targetItems.length} onClick={backup} className="w-full min-h-[50px] flex items-center gap-3 rounded-xl bg-[#17253D] text-white text-sm px-4 text-left disabled:opacity-40"><FolderArchive size={19}/>Sao lưu dự án ZIP ({targetItems.length})</button>
    <button disabled={busy} onClick={()=>{onOpenOriginalEngine();close();}} className="w-full min-h-[54px] flex items-center gap-3 rounded-xl bg-[#E2B74B] text-[#071121] font-semibold text-sm px-4 text-left"><ShieldCheck size={20}/>Xuất đúng mẫu Timemark bằng engine HNL gốc</button>
    {onRestoreBackup&&<><input ref={picker} type="file" accept=".zip,application/zip" hidden onChange={e=>{const f=e.target.files?.[0];if(f)run(()=>onRestoreBackup(f),'Đã khôi phục dự án ZIP vào thư viện mới, không xóa dữ liệu cũ.');e.currentTarget.value='';}}/>
      <button disabled={busy} className="w-full min-h-[44px] flex gap-3 items-center px-4 text-sm text-[#94A3B8]" onClick={()=>picker.current?.click()}><Upload size={17}/>Khôi phục dự án ZIP</button></>}
   </div>
   <p className="pt-3 text-[11px] text-[#94A3B8]">Ảnh/video gốc không bị ghi đè. Preview React chưa thay thế thuật toán Timemark gốc.</p>
   {busy&&<p className="text-xs text-[#E2B74B] flex items-center gap-2 mt-2"><Loader2 size={16} className="animate-spin"/>Đang xử lý, không đóng ứng dụng</p>}
  </div>
 </div>;
};
