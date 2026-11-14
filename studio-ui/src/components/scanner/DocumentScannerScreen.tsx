import React,{useEffect,useMemo,useRef,useState} from 'react';
import JSZip from 'jszip';
import {ArrowDown,ArrowLeft,ArrowUp,Camera,Download,FileImage,FileText,Folder,FolderPlus,ImagePlus,Loader2,Move,RotateCcw,Save,ScanLine,Trash2,Upload,X} from 'lucide-react';
import {saveToDevice} from '../../services/deviceBridge';
import {
 DEFAULT_CORNERS,createScannerPdf,flattenDocument,listScanFolders,listScans,newScanId,putScan,putScanFolder,
 removeScan,removeScanFolder,suggestDocumentEdges,validCorners,
 type ScanCorners,type ScanFilter,type ScanFolder,type ScanPage,type ScanPaper,type PdfExportOptions
} from '../../services/documentScanner';

type Props={onBack:()=>void};
const FILTERS:{id:ScanFilter;name:string}[]=[
 {id:'color',name:'Màu gốc'}, {id:'enhance',name:'Làm rõ'}, {id:'gray',name:'Thang xám'},
 {id:'bw',name:'Đen trắng'}, {id:'paper',name:'Giấy trắng'},
];
const tidy=(v:string)=>v.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,70)||'Tai_lieu';
const fileStem=(v:string)=>tidy(v.replace(/\.[^.]+$/,''));
const clamp=(n:number)=>Math.max(.001,Math.min(.999,n));
const emptyCorners=()=>DEFAULT_CORNERS.map(p=>({...p})) as ScanCorners;

export const DocumentScannerScreen:React.FC<Props>=({onBack})=>{
 const [folders,setFolders]=useState<ScanFolder[]>([]),[pages,setPages]=useState<ScanPage[]>([]);
 const [currentFolder,setCurrentFolder]=useState('*');
 const [selection,setSelection]=useState<string[]>([]);
 const [folderName,setFolderName]=useState('');
 const [editingId,setEditingId]=useState<string|null>(null),[showResult,setShowResult]=useState(false);
 const [cornerDraft,setCornerDraft]=useState<ScanCorners>(emptyCorners());
 const [filterDraft,setFilterDraft]=useState<ScanFilter>('enhance');
 const [working,setWorking]=useState(false),[notice,setNotice]=useState(''),[problem,setProblem]=useState('');
 const [paper,setPaper]=useState<ScanPaper>('A4'),[landscape,setLandscape]=useState(false);
 const [twoPerPage,setTwoPerPage]=useState(false),[margin,setMargin]=useState(10);
 const [customW,setCustomW]=useState(210),[customH,setCustomH]=useState(297);
 const [draggingId,setDraggingId]=useState<string|null>(null);
 const importInput=useRef<HTMLInputElement>(null),cameraInput=useRef<HTMLInputElement>(null),restoreInput=useRef<HTMLInputElement>(null);
 const abortProcessing=useRef<AbortController|null>(null),dragPoint=useRef<number|null>(null),stageRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{let alive=true;Promise.all([listScans(),listScanFolders()]).then(([p,f])=>{if(alive){setPages(p);setFolders(f);}}).catch(e=>{if(alive)setProblem('Không mở được thư viện quét: '+String(e));});return()=>{alive=false;abortProcessing.current?.abort();};},[]);
 const displayUrls=useMemo(()=>Object.fromEntries(pages.map(p=>[p.id,URL.createObjectURL(p.processed||p.original)])),[pages]);
 useEffect(()=>()=>Object.values(displayUrls).forEach(url=>URL.revokeObjectURL(url)),[displayUrls]);
 const editing=pages.find(p=>p.id===editingId);
 const originalUrl=useMemo(()=>editing?URL.createObjectURL(editing.original):'',[editing?.id,editing?.original]);
 useEffect(()=>()=>{if(originalUrl)URL.revokeObjectURL(originalUrl);},[originalUrl]);
 const processedUrl=editing?displayUrls[editing.id]:undefined;
 const visible=useMemo(()=>pages.filter(p=>currentFolder==='*'||p.folderId===currentFolder).sort((a,b)=>a.order-b.order||a.createdAt-b.createdAt),[pages,currentFolder]);
 const chosen=visible.filter(p=>selection.includes(p.id));
 const scopeName=currentFolder==='*'?'Toàn bộ':currentFolder===''?'Chưa phân loại':folders.find(f=>f.id===currentFolder)?.name||'Thư mục';
 const task=async(label:string,run:()=>Promise<void>)=>{if(working)return;setWorking(true);setProblem('');setNotice(label);try{await run();}catch(e){setProblem(e instanceof Error?e.message:String(e));setNotice('');}finally{setWorking(false);}};
 const importFiles=async(files:FileList|null)=>{if(!files?.length)return;const list=Array.from(files).slice(0,30);
  await task('Đang nhập ảnh gốc…',async()=>{
   const created:ScanPage[]=[];
   for(const file of list){if(!file.type.startsWith('image/'))continue;if(file.size>35*1024*1024)throw Error('Ảnh '+file.name+' vượt giới hạn 35 MB');
    const detection=await suggestDocumentEdges(file);
    const p:ScanPage={id:newScanId(),folderId:currentFolder==='*'?'':currentFolder,name:fileStem(file.name),original:file,
      corners:detection.corners,filter:'enhance',createdAt:Date.now(),order:Date.now()+created.length};
    // Keep source bytes safe before any destructive rendering.
    await putScan(p);created.push(p);
   }
   if(!created.length)throw Error('Không có ảnh JPEG/PNG/WebP hợp lệ để quét');
   setPages(prev=>[...prev,...created]);setSelection(created.map(p=>p.id));setEditingId(created[0].id);
   setCornerDraft(created[0].corners.map(p=>({...p})) as ScanCorners);setFilterDraft(created[0].filter);setShowResult(false);
   setNotice(`Đã giữ ${created.length} ảnh gốc trong ứng dụng. Kéo 4 điểm để chỉnh mép giấy.`);
  });
 };
 const addFolder=async()=>{const name=folderName.trim();if(!name)return;await task('Đang tạo thư mục…',async()=>{
   if(folders.some(f=>f.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('Tên thư mục đã tồn tại');
   const folder:ScanFolder={id:newScanId(),name:name.slice(0,70),createdAt:Date.now()};await putScanFolder(folder);
   setFolders(prev=>[...prev,folder]);setCurrentFolder(folder.id);setFolderName('');setNotice('Đã tạo thư mục '+folder.name);
 });};
 const renameFolder=async()=>{const f=folders.find(f=>f.id===currentFolder);if(!f)return;const name=window.prompt('Tên thư mục mới',f.name)?.trim();if(!name||name===f.name)return;
  await task('Đang đổi tên thư mục…',async()=>{const next={...f,name:name.slice(0,70)};await putScanFolder(next);setFolders(prev=>prev.map(p=>p.id===f.id?next:p));setNotice('Đã đổi tên thư mục');});
 };
 const deleteFolder=async()=>{const f=folders.find(f=>f.id===currentFolder);if(!f)return;if(!window.confirm(`Xóa thư mục “${f.name}”? Ảnh quét sẽ chuyển về Chưa phân loại, không bị xóa.`))return;
  await task('Đang chuyển tài liệu về Chưa phân loại…',async()=>{
   const affected=pages.filter(p=>p.folderId===f.id),modified=affected.map(p=>({...p,folderId:''}));
   for(const p of modified)await putScan(p);
   await removeScanFolder(f.id);setPages(prev=>prev.map(p=>p.folderId===f.id?{...p,folderId:''}:p));
   setFolders(prev=>prev.filter(p=>p.id!==f.id));setCurrentFolder('');setNotice('Đã xóa thư mục, giữ nguyên tất cả ảnh');
  });
 };
 const editPage=(page:ScanPage)=>{setEditingId(page.id);setCornerDraft(page.corners.map(p=>({...p})) as ScanCorners);setFilterDraft(page.filter);setShowResult(false);setProblem('');};
 const handleDragCorner=(e:React.PointerEvent<SVGCircleElement>,i:number)=>{e.preventDefault();e.stopPropagation();dragPoint.current=i;e.currentTarget.setPointerCapture(e.pointerId);};
 const handlePointerMove=(e:React.PointerEvent<SVGSVGElement>)=>{if(dragPoint.current===null||!stageRef.current)return;
  const r=stageRef.current.getBoundingClientRect();const x=clamp((e.clientX-r.left)/r.width),y=clamp((e.clientY-r.top)/r.height),idx=dragPoint.current;
  setCornerDraft(old=>old.map((p,i)=>i===idx?{x,y}:p) as ScanCorners);setShowResult(false);
 };
 const applyEdit=async()=>{if(!editing)return;if(!validCorners(cornerDraft)){setProblem('Bốn góc đang giao nhau hoặc quá sát nhau. Hãy kéo lại.');return;}
  await task('Đang làm phẳng và lọc ảnh…',async()=>{const controller=new AbortController();abortProcessing.current=controller;
   try{const blob=await flattenDocument(editing.original,cornerDraft,filterDraft,controller.signal);
    const next:ScanPage={...editing,processed:blob,corners:cornerDraft,filter:filterDraft};await putScan(next);
    setPages(prev=>prev.map(p=>p.id===next.id?next:p));setShowResult(true);setNotice('Đã làm phẳng ảnh và lưu bản scan; ảnh gốc giữ nguyên.');
   }finally{abortProcessing.current=null;}
  });
 };
 const getProcessed=async(p:ScanPage):Promise<Blob>=>{
  if(p.processed)return p.processed;
  const processed=await flattenDocument(p.original,p.corners,p.filter,abortProcessing.current?.signal);
  const next={...p,processed};await putScan(next);
  setPages(old=>old.map(item=>item.id===p.id?next:item));return processed;
 };
 const exportSelected=async(kind:'pdf'|'images')=>{if(!chosen.length)return;
  await task(kind==='pdf'?'Đang tạo PDF…':'Đang xuất ảnh…',async()=>{
   if(chosen.length>30)throw Error('Hãy chọn tối đa 30 ảnh mỗi lần xuất để tránh hết RAM trên điện thoại');
   const controller=new AbortController();abortProcessing.current=controller;
   try{const imgs:Blob[]=[];
    for(let i=0;i<chosen.length;i++){setNotice(`Đang chuẩn bị trang ${i+1}/${chosen.length}…`);imgs.push(await getProcessed(chosen[i]));}
    if(kind==='pdf'){
     const opts:PdfExportOptions={paper,landscape,marginMm:margin,customWidthMm:customW,customHeightMm:customH,twoPerPage};
     const result=await createScannerPdf(imgs,opts);await saveToDevice(result,`HNLMark_Scan_${Date.now()}.pdf`);
    }else if(imgs.length===1){await saveToDevice(imgs[0],`HNLMark_Scan_${tidy(chosen[0].name)}.jpg`);}else{
     const zip=new JSZip();imgs.forEach((img,i)=>zip.file(`${String(i+1).padStart(2,'0')}_${tidy(chosen[i].name)}.jpg`,img));
     const result=await zip.generateAsync({type:'blob',compression:'STORE'});await saveToDevice(result,`HNLMark_Scan_${Date.now()}.zip`);
    }
    setNotice(kind==='pdf'?'Đã gửi PDF tới bộ nhớ máy.':'Đã lưu ảnh quét vào máy.');
   }finally{abortProcessing.current=null;}
  });
 };
 const movePage=async(id:string,delta:number)=>{const idx=visible.findIndex(p=>p.id===id),other=visible[idx+delta];if(idx<0||!other)return;
  const a=visible[idx],b=other;
  await task('Đang sắp xếp trang…',async()=>{await putScan({...a,order:b.order});await putScan({...b,order:a.order});
   setPages(prev=>prev.map(p=>p.id===a.id?{...p,order:b.order}:p.id===b.id?{...p,order:a.order}:p));setNotice('Đã đổi thứ tự trang.');});
 };
 const dropPage=async(targetId:string)=>{if(!draggingId||targetId===draggingId)return;const all=[...visible];const from=all.findIndex(p=>p.id===draggingId),to=all.findIndex(p=>p.id===targetId);if(from<0||to<0)return;
  const [moved]=all.splice(from,1);all.splice(to,0,moved);
  await task('Đang sắp xếp trang…',async()=>{const now=Date.now();const changes=all.map((p,i)=>({...p,order:now+i}));for(const p of changes)await putScan(p);
   const map=new Map(changes.map(p=>[p.id,p]));setPages(prev=>prev.map(p=>map.get(p.id)||p));});setDraggingId(null);
 };
 const updatePageFolder=async(id:string,folderId:string)=>{const page=pages.find(p=>p.id===id);if(!page)return;
  await task('Đang chuyển thư mục…',async()=>{const next={...page,folderId};await putScan(next);setPages(old=>old.map(p=>p.id===id?next:p));});
 };
 const deletePage=async(id:string)=>{if(!window.confirm('Xóa ảnh quét này khỏi thư viện scan? Không ảnh hưởng ảnh trong Thư viện HNL khác.'))return;
  await task('Đang xóa bản scan…',async()=>{await removeScan(id);setPages(prev=>prev.filter(p=>p.id!==id));setSelection(old=>old.filter(x=>x!==id));if(editingId===id)setEditingId(null);});
 };
 const backupScans=async()=>await task('Đang tạo ZIP sao lưu scan…',async()=>{
   const zip=new JSZip(),data={format:'hnlmark-scan-backup-v1',folders,pages:pages.map(({original,processed,...rest})=>({...rest,originalPath:`original/${rest.id}.bin`,processedPath:processed?`processed/${rest.id}.jpg`:null,originalType:original.type}))};
   zip.file('manifest.json',JSON.stringify(data));for(const p of pages){zip.file(`original/${p.id}.bin`,p.original);if(p.processed)zip.file(`processed/${p.id}.jpg`,p.processed);}
   await saveToDevice(await zip.generateAsync({type:'blob',compression:'STORE'}),`HNLMark_Scan_Backup_${Date.now()}.zip`);setNotice('Đã lưu ZIP sao lưu ảnh gốc và bản scan.');
 });
 const restoreScans=async(file:File)=>await task('Đang kiểm tra bản sao lưu…',async()=>{
  if(file.size>250*1024*1024)throw Error('ZIP vượt giới hạn khôi phục 250 MB');
  const zip=await JSZip.loadAsync(file);const manifestFile=zip.file('manifest.json');if(!manifestFile)throw Error('Không có manifest.json của HNL Mark Scan');
  const parsed=JSON.parse(await manifestFile.async('string')) as {
    format:string;folders:ScanFolder[];pages:Array<Omit<ScanPage,'original'|'processed'>&{originalPath:string;processedPath:string|null;originalType:string}>;
  };
  if(parsed.format!=='hnlmark-scan-backup-v1'||!Array.isArray(parsed.pages)||!Array.isArray(parsed.folders)||parsed.pages.length>80)throw Error('Bản sao lưu scan không hợp lệ');
  const folderMap=new Map<string,string>(),newFolders:ScanFolder[]=[];
  for(const folder of parsed.folders){const id=newScanId();folderMap.set(folder.id,id);newFolders.push({id,name:String(folder.name).slice(0,70),createdAt:Date.now()});}
  const newPages:ScanPage[]=[];
  for(const page of parsed.pages){
   if(!/^original\/[\w-]+\.bin$/.test(page.originalPath)||page.processedPath&&!/^processed\/[\w-]+\.jpg$/.test(page.processedPath))throw Error('Đường dẫn ZIP không hợp lệ');
   const src=zip.file(page.originalPath);if(!src)throw Error('Thiếu ảnh gốc trong ZIP');
   const raw=await src.async('blob');if(raw.size>35*1024*1024)throw Error('Một ảnh vượt giới hạn 35 MB');
   const original=new Blob([raw],{type:page.originalType?.startsWith('image/')?page.originalType:'image/jpeg'});
   let processed:Blob|undefined;const p=page.processedPath&&zip.file(page.processedPath);if(p)processed=await p.async('blob');
   const corners=(page.corners&&Array.isArray(page.corners)&&page.corners.length===4&&validCorners(page.corners)?page.corners:emptyCorners());
   const newPage:ScanPage={id:newScanId(),folderId:folderMap.get(page.folderId)||'',name:tidy(page.name),original,processed,
    filter:FILTERS.some(x=>x.id===page.filter)?page.filter:'color',corners,order:Number(page.order)||Date.now(),createdAt:Date.now()};
   newPages.push(newPage);
  }
  // Save all before updating UI; do not overwrite or delete existing scans.
  for(const f of newFolders)await putScanFolder(f);
  for(const p of newPages)await putScan(p);
  setFolders(old=>[...old,...newFolders]);setPages(old=>[...old,...newPages]);setNotice(`Đã khôi phục ${newPages.length} ảnh quét; giữ nguyên dữ liệu trước đó.`);
 });
 return <section className="mx-auto max-w-6xl px-3 sm:px-5 py-4 pb-8 space-y-4" data-hnl-document-scanner="true">
   <header className="flex items-center gap-2 justify-between">
     <div className="flex items-center gap-2 min-w-0"><button onClick={onBack} className="min-w-10 min-h-10 rounded-lg bg-[#17253D] grid place-items-center" aria-label="Quay lại Thư viện"><ArrowLeft size={19}/></button>
       <div className="min-w-0"><h1 className="font-bold text-[17px] flex items-center gap-2"><ScanLine size={20} className="text-[#E2B74B]"/>Quét tài liệu</h1><p className="text-xs text-[#94A3B8]">Làm phẳng ảnh · Offline · Giữ ảnh gốc</p></div></div>
     <span className="text-xs text-[#E2B74B]">{pages.length} trang</span>
   </header>
   {problem&&<div role="alert" className="rounded-xl bg-red-950/60 border border-red-700/50 text-red-200 p-3 text-xs">{problem}</div>}
   {notice&&<div role="status" className="rounded-xl bg-[#102D2A] border border-emerald-800/40 text-emerald-200 p-3 text-xs">{notice}</div>}
   <div className="grid grid-cols-2 gap-2">
     <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={e=>{void importFiles(e.target.files);e.currentTarget.value='';}} />
     <input ref={importInput} type="file" accept="image/*" multiple hidden onChange={e=>{void importFiles(e.target.files);e.currentTarget.value='';}} />
     <button disabled={working} onClick={()=>cameraInput.current?.click()} className="min-h-11 flex items-center justify-center gap-2 bg-[#E2B74B] text-[#071121] font-semibold rounded-xl disabled:opacity-50"><Camera size={18}/>Chụp quét</button>
     <button disabled={working} onClick={()=>importInput.current?.click()} className="min-h-11 flex items-center justify-center gap-2 bg-[#17253D] text-white rounded-xl disabled:opacity-50"><ImagePlus size={18}/>Chọn nhiều ảnh</button>
   </div>
   <div className="rounded-2xl border border-white/10 bg-[#0D1729] p-3 space-y-2">
     <div className="flex gap-2 items-center"><FolderPlus size={17} className="text-[#E2B74B]"/><h2 className="font-semibold text-sm">Thư mục scan</h2></div>
     <div className="flex gap-2 overflow-x-auto pb-1 hnl-scroll">
       {[{id:'*',name:'Tất cả'}, {id:'',name:'Chưa phân loại'}, ...folders].map(f=><button key={f.id||'root'} onClick={()=>{setCurrentFolder(f.id);setSelection([]);}} className={`min-h-9 whitespace-nowrap px-3 rounded-xl border text-xs ${currentFolder===f.id?'border-[#E2B74B] text-[#E2B74B] bg-[#E2B74B]/10':'border-white/10 bg-[#14223A] text-[#D2DAE6]'}`}>{f.name}</button>)}
     </div>
     <div className="flex items-center gap-2"><input value={folderName} onChange={e=>setFolderName(e.target.value)} maxLength={70} placeholder="Tên thư mục mới (VD: CCCD, Hồ sơ…)" className="min-w-0 flex-1 h-10 bg-[#081323] border border-white/15 rounded-lg px-3 text-xs"/>
       <button disabled={working||!folderName.trim()} onClick={()=>void addFolder()} className="min-h-10 px-3 bg-[#E2B74B] text-[#071121] rounded-lg text-xs font-semibold disabled:opacity-50">Tạo</button></div>
     {folders.some(f=>f.id===currentFolder)&&<div className="flex items-center gap-2"><button onClick={()=>void renameFolder()} className="text-xs text-[#E2B74B]">Đổi tên thư mục</button><button onClick={()=>void deleteFolder()} className="ml-auto text-xs text-red-300">Xóa thư mục (giữ ảnh)</button></div>}
   </div>
   <div className="rounded-2xl border border-white/10 bg-[#0D1729] p-3 space-y-3">
     <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-sm">{scopeName} · {visible.length} trang</h2>
       <button className="text-xs text-[#E2B74B]" onClick={()=>setSelection(selection.length===visible.length?[]:visible.map(p=>p.id))}>{selection.length===visible.length&&visible.length?'Bỏ chọn':'Chọn tất cả'}</button></div>
     {!visible.length&&<p className="text-xs text-[#94A3B8] py-6 text-center">Chưa có tài liệu. Chụp hoặc chọn ảnh từ máy để bắt đầu.</p>}
     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
       {visible.map((page,i)=><div key={page.id} draggable={!working} onDragStart={()=>setDraggingId(page.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void dropPage(page.id);}} onDragEnd={()=>setDraggingId(null)}
         className="rounded-xl overflow-hidden border border-white/10 bg-[#121F34]">
         <button className="w-full relative bg-[#07101F] h-40" onClick={()=>editPage(page)}><img src={displayUrls[page.id]} alt={page.name} className="w-full h-full object-contain"/><span className="absolute top-1 left-1 bg-black/70 rounded px-2 text-xs">{i+1}</span>
           {!page.processed&&<span className="absolute bottom-1 right-1 text-[10px] bg-amber-900/80 px-1.5 rounded">Chưa làm phẳng</span>}</button>
         <div className="p-2 space-y-1"><div className="flex gap-2 items-center"><input type="checkbox" aria-label={`Chọn ${page.name}`} checked={selection.includes(page.id)} onChange={e=>setSelection(old=>e.target.checked?[...old,page.id]:old.filter(id=>id!==page.id))} className="accent-[#E2B74B]"/><span className="truncate text-xs flex-1" title={page.name}>{page.name}</span></div>
           <div className="flex gap-1 items-center justify-between"><button disabled={working||i===0} onClick={()=>void movePage(page.id,-1)} title="Lên một vị trí" className="min-w-8 min-h-8 grid place-items-center disabled:opacity-25"><ArrowUp size={15}/></button>
             <button disabled={working||i===visible.length-1} onClick={()=>void movePage(page.id,1)} title="Xuống một vị trí" className="min-w-8 min-h-8 grid place-items-center disabled:opacity-25"><ArrowDown size={15}/></button>
             <select aria-label="Chuyển ảnh sang thư mục" value={page.folderId} onChange={e=>void updatePageFolder(page.id,e.target.value)} className="min-w-0 max-w-[90px] bg-[#09111E] rounded text-[11px]"><option value="">Chưa phân loại</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
             <button title="Xóa ảnh quét" onClick={()=>void deletePage(page.id)} className="min-w-8 min-h-8 grid place-items-center text-red-300"><Trash2 size={14}/></button>
           </div></div></div>)}
     </div>
     <p className="text-[11px] text-[#94A3B8] flex items-center gap-1"><Move size={13}/>Kéo thả ảnh để đổi thứ tự, hoặc dùng mũi tên trên điện thoại.</p>
   </div>
   {editing&&<div className="rounded-2xl border border-[#E2B74B]/30 bg-[#0D1729] p-3 space-y-3" data-hnl-scan-corners="true">
     <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-sm">Chỉnh 4 góc · {editing.name}</h2><button onClick={()=>setEditingId(null)} className="min-w-9 min-h-9 grid place-items-center" aria-label="Đóng chỉnh góc"><X size={18}/></button></div>
     <p className="text-xs text-[#94A3B8]">Chạm kéo 4 chấm vàng sát mép giấy/thẻ. Nhận diện tự động chỉ là gợi ý, có thể chỉnh lại bất kỳ lúc nào.</p>
     <div className="flex gap-2"><button onClick={()=>setShowResult(false)} className={`px-3 min-h-9 rounded-lg text-xs ${!showResult?'bg-[#E2B74B] text-[#071121]':'bg-[#17253D]'}`}>Ảnh gốc & góc</button>
       <button disabled={!editing.processed} onClick={()=>setShowResult(true)} className={`px-3 min-h-9 rounded-lg text-xs disabled:opacity-40 ${showResult?'bg-[#E2B74B] text-[#071121]':'bg-[#17253D]'}`}>Ảnh đã làm phẳng</button></div>
     <div className="max-w-xl mx-auto rounded-xl overflow-hidden bg-black border border-white/15">
       {showResult&&editing.processed?<img src={processedUrl} className="block w-full max-h-[55vh] object-contain" alt="Ảnh tài liệu đã làm phẳng"/>:
       <div ref={stageRef} className="relative w-fit max-w-full mx-auto">
         <img src={originalUrl} alt="Ảnh gốc cần chỉnh bốn góc" className="block max-w-full max-h-[52vh] w-auto h-auto" draggable={false}/>
         <svg className="absolute inset-0 w-full h-full touch-none" viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerMove={handlePointerMove} onPointerUp={()=>dragPoint.current=null} onPointerCancel={()=>dragPoint.current=null}>
           <polygon points={cornerDraft.map(p=>`${p.x*1000},${p.y*1000}`).join(' ')} fill="rgba(226,183,75,.12)" stroke="#E2B74B" strokeWidth="5" strokeDasharray="12 6"/>
           {cornerDraft.map((p,i)=><circle key={i} cx={p.x*1000} cy={p.y*1000} r="29" fill="#E2B74B" stroke="#071121" strokeWidth="7" onPointerDown={e=>handleDragCorner(e,i)}/>)}
         </svg></div>}
     </div>
     <div className="flex gap-2 items-center justify-between"><button onClick={async()=>{const found=await suggestDocumentEdges(editing.original);setCornerDraft(found.corners);setShowResult(false);setNotice(found.confidence==='estimated'?'Đã ước lượng mép tài liệu; hãy kiểm tra và kéo lại nếu cần.':'Ảnh khó nhận diện tự động, vui lòng kéo 4 góc thủ công.');}} className="text-xs px-3 min-h-9 rounded-lg bg-[#17253D] flex gap-1 items-center"><ScanLine size={15}/>Nhận diện mép</button>
       <button onClick={()=>{setCornerDraft(emptyCorners());setShowResult(false);}} className="text-xs px-3 min-h-9 rounded-lg bg-[#17253D] flex items-center gap-1"><RotateCcw size={15}/>Đặt lại góc</button></div>
     <div className="flex flex-wrap gap-2">{FILTERS.map(f=><button key={f.id} onClick={()=>{setFilterDraft(f.id);setShowResult(false);}} className={`px-3 min-h-9 rounded-lg text-xs border ${filterDraft===f.id?'border-[#E2B74B] text-[#E2B74B] bg-[#E2B74B]/10':'border-white/10 bg-[#14223A]'}`}>{f.name}</button>)}</div>
     <button disabled={working||!validCorners(cornerDraft)} onClick={()=>void applyEdit()} className="min-h-11 w-full rounded-xl bg-[#E2B74B] text-[#071121] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"><Save size={18}/>Làm phẳng & lưu bản scan</button>
   </div>}
   <div className="rounded-2xl bg-[#0D1729] border border-white/10 p-3 space-y-3">
     <h2 className="text-sm font-semibold flex items-center gap-2"><FileText size={18} className="text-[#E2B74B]"/>Xuất PDF / ảnh · {chosen.length} trang chọn</h2>
     <div className="grid grid-cols-2 gap-2"><label className="text-xs text-[#AEBBD0]">Khổ giấy
       <select value={paper} onChange={e=>setPaper(e.target.value as ScanPaper)} className="block w-full mt-1 bg-[#101E32] border border-white/15 rounded-lg h-10 px-2"><option value="A4">A4</option><option value="A5">A5</option><option value="Letter">US Letter</option><option value="custom">Tùy chỉnh (mm)</option></select></label>
       <label className="text-xs text-[#AEBBD0]">Lề giấy (mm)
         <input type="number" min={0} max={30} value={margin} onChange={e=>setMargin(Math.min(30,Math.max(0,Number(e.target.value)||0)))} className="block w-full mt-1 bg-[#101E32] border border-white/15 rounded-lg h-10 px-2"/></label></div>
     {paper==='custom'&&<div className="grid grid-cols-2 gap-2"><label className="text-xs">Rộng (mm)<input type="number" min={60} max={420} value={customW} onChange={e=>setCustomW(Number(e.target.value))} className="block w-full mt-1 bg-[#101E32] border border-white/15 rounded-lg h-10 px-2"/></label>
       <label className="text-xs">Cao (mm)<input type="number" min={60} max={594} value={customH} onChange={e=>setCustomH(Number(e.target.value))} className="block w-full mt-1 bg-[#101E32] border border-white/15 rounded-lg h-10 px-2"/></label></div>}
     <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={landscape} onChange={e=>setLandscape(e.target.checked)} className="accent-[#E2B74B]"/>Khổ giấy ngang</label>
     <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={twoPerPage} onChange={e=>setTwoPerPage(e.target.checked)} className="accent-[#E2B74B]"/>Hai ảnh cạnh nhau trên một trang (CCCD mặt trước/sau)</label>
     <div className="grid grid-cols-2 gap-2"><button disabled={working||!chosen.length} onClick={()=>void exportSelected('pdf')} className="min-h-11 rounded-xl bg-[#E2B74B] text-[#071121] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"><FileText size={18}/>Xuất PDF</button>
       <button disabled={working||!chosen.length} onClick={()=>void exportSelected('images')} className="min-h-11 rounded-xl bg-[#17253D] border border-white/10 text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40"><FileImage size={18}/>Lưu ảnh / ZIP</button></div>
   </div>
   <div className="rounded-2xl bg-[#0D1729] border border-white/10 p-3 space-y-3">
     <h2 className="text-sm font-semibold flex gap-2 items-center"><Folder size={18} className="text-[#E2B74B]"/>An toàn và sao lưu</h2>
     <p className="text-[11px] text-[#94A3B8]">Ảnh CCCD/tài liệu được xử lý và lưu cục bộ trong dữ liệu ứng dụng. Xóa dữ liệu ứng dụng hoặc gỡ APK TEST sẽ có nguy cơ mất bộ scan nếu chưa sao lưu. Không có OCR hay gửi tài liệu lên đám mây.</p>
     <div className="grid grid-cols-2 gap-2"><button disabled={working||!pages.length} onClick={()=>void backupScans()} className="min-h-10 rounded-lg bg-[#17253D] flex items-center justify-center gap-2 text-xs disabled:opacity-40"><Download size={16}/>Sao lưu ZIP</button>
       <button disabled={working} onClick={()=>restoreInput.current?.click()} className="min-h-10 rounded-lg bg-[#17253D] flex items-center justify-center gap-2 text-xs"><Upload size={16}/>Khôi phục ZIP</button></div>
     <input ref={restoreInput} hidden type="file" accept=".zip,application/zip" onChange={e=>{const f=e.target.files?.[0];if(f)void restoreScans(f);e.currentTarget.value='';}}/>
   </div>
   {working&&<div className="sticky bottom-2 bg-[#12253B] border border-[#E2B74B]/40 rounded-xl p-3 flex gap-2 items-center justify-between z-20"><span className="text-xs text-[#E2B74B] flex items-center gap-2"><Loader2 size={16} className="animate-spin"/>Đang xử lý…</span>
     {abortProcessing.current&&<button onClick={()=>abortProcessing.current?.abort()} className="text-xs text-red-300 min-h-9 px-3 rounded-lg bg-red-900/30">Hủy xử lý</button>}</div>}
 </section>;
};
