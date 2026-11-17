import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import JSZip from 'jszip';
import {ArrowDown,ArrowLeft,ArrowUp,Camera,Download,FileImage,FileText,Folder,FolderPlus,ImagePlus,Loader2,Move,RotateCcw,RotateCw,FlipHorizontal,FlipVertical,Save,ScanLine,Trash2,Upload,X} from 'lucide-react';
import {saveToDevice} from '../../services/deviceBridge';
import {scannerTapOnVideo} from '../../services/scannerFocusGeometry';
import {scannerLiveContainRect,scannerLiveSourceCrop,scannerLiveQuadDelta,scannerLiveBlendQuad,type LiveFrameRect} from '../../services/scannerLiveEdges';
import {SCANNER_LOUPE_IMAGE_SIZE,scannerPointAtPointer,scannerCornerWithOffset,scannerLoupeImageRect,scannerLoupeViewportPosition} from '../../services/scannerMagnifier';
import {
 DEFAULT_CORNERS,createScannerPdf,flattenDocument,listScanFolders,listScans,newScanId,putScan,putScanFolder,
 splitStoredScanPage,addScanRegionManually,suggestMultipleDocumentEdges,
 removeScan,restoreScanBatch,updateScanBatch,estimateScanCornersIfUnedited,suggestDocumentEdges,reconcileSavedScanCorners,detectDocumentEdges,validCorners,scannerOrientedPreview,
 type ScanCorners,type ScanFilter,type ScanSharpness,type ScanFolder,type ScanPage,type ScanPaper,type PdfExportOptions,type ScanDocumentType,type ScanPoint
} from '../../services/documentScanner';
import {scanQuadAfterOp,normalizeScanOps,safeScanOps,safeScanColor,DEFAULT_SCAN_COLOR,type ScanImageOp,type ScanColorAdjust} from '../../services/scannerEdits';

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
 const [scanSharpnessDraft,setScanSharpnessDraft]=useState<ScanSharpness>('auto');
 const [scanOpsDraft,setScanOpsDraft]=useState<ScanImageOp[]>([]);
 const [scanColorDraft,setScanColorDraft]=useState<ScanColorAdjust>({...DEFAULT_SCAN_COLOR});
 const [scanDocumentType,setScanDocumentType]=useState<ScanDocumentType>('auto');
 const [dragFocus,setDragFocus]=useState<ScanPoint|null>(null);
 const [lensViewport,setLensViewport]=useState<{left:number;top:number}|null>(null);
 const [working,setWorking]=useState(false),[notice,setNotice]=useState(''),[problem,setProblem]=useState('');
 const [paper,setPaper]=useState<ScanPaper>('A4'),[landscape,setLandscape]=useState(false);
 const [twoPerPage,setTwoPerPage]=useState(false),[idCardPrintSize,setIdCardPrintSize]=useState(false),[margin,setMargin]=useState(10);
 const [customW,setCustomW]=useState(210),[customH,setCustomH]=useState(297);
 const [draggingId,setDraggingId]=useState<string|null>(null);
 // The file input's capture=environment is only a picker hint on Android WebView.
 // Use an actual in-app MediaStream, kept open across continuous page captures.
 const [scanCameraOpen,setScanCameraOpen]=useState(false);
 const [scanMode,setScanMode]=useState<'single'|'continuous'>('continuous');
 const [scanSplitMode,setScanSplitMode]=useState<'one'|'multiple'>('one');
 const [cameraFacing,setCameraFacing]=useState<'environment'|'user'>('environment');
 const [scanCameraReady,setScanCameraReady]=useState(false);
 const [scanCameraError,setScanCameraError]=useState('');
 const [scanCameraBusy,setScanCameraBusy]=useState(false);
 const [scanPendingCount,setScanPendingCount]=useState(0);
 const [scanQueueError,setScanQueueError]=useState('');
 const [scanCameraNotice,setScanCameraNotice]=useState('');
 const [scanZoom,setScanZoom]=useState(1),[scanZoomMax,setScanZoomMax]=useState(4),[scanNativeZoom,setScanNativeZoom]=useState(false);
 const [scanExposure,setScanExposure]=useState(0),[scanNativeExposure,setScanNativeExposure]=useState(false);
 const [scanFocusPoint,setScanFocusPoint]=useState<{x:number;y:number}|null>(null);
 const scanZoomRef=useRef(1),scanExposureRef=useRef(0),scanZoomNativeRef=useRef(false),scanExposureNativeRef=useRef(false);
 const scanPinchRef=useRef<{distance:number;zoom:number}|null>(null),scanDidPinchRef=useRef(false);
 const scanLastPinchRef=useRef(0);
 const scanCameraCapabilities=useRef<{exposure?:{min:number;max:number;step?:number}}|null>(null);
 const [scanSessionIds,setScanSessionIds]=useState<string[]>([]);
 const scanSessionIdsRef=useRef<string[]>([]);
 const scanVideoRef=useRef<HTMLVideoElement>(null),scanStreamRef=useRef<MediaStream|null>(null);
 const scanCaptureLock=useRef(false);
 const scanCaptureCounter=useRef(0),scanCaptureSessionSerial=useRef(0);
 // Queue at most three raw camera snapshots; JPEG encoding / IDB writing can
 // happen after shutter release without keeping the user's button blocked.
 type ScanPendingFrame={canvas:HTMLCanvasElement;id:string;time:number;folder:string;
  kind:ScanDocumentType;live:ScanCorners|null;mode:'single'|'continuous';split:'one'|'multiple';name:string;sessionSerial:number};
 const scanPendingFrames=useRef<ScanPendingFrame[]>([]),scanSavingRef=useRef(false);
 const scanFinishRequestedRef=useRef(false),scanSessionSavedPages=useRef<ScanPage[]>([]);
 const scanAutoDetectQueue=useRef<Promise<void>>(Promise.resolve());
 const scanDirtyDrafts=useRef<Set<string>>(new Set());
 const scanLiveSnapshotRef=useRef<{corners:ScanCorners;at:number;width:number;height:number;zoom:number;facing:string}|null>(null);
 const scannerEditingIdRef=useRef<string|null>(null);
 scannerEditingIdRef.current=editingId;
 const scanPreviewViewportRef=useRef<HTMLDivElement>(null);
 const [scanLiveCorners,setScanLiveCorners]=useState<ScanCorners|null>(null);
 const [scanLiveFrameRect,setScanLiveFrameRect]=useState<LiveFrameRect|null>(null);
 const [scanLiveStatus,setScanLiveStatus]=useState<'searching'|'tracking'|'unavailable'>('searching');
 const scannerZoomTo=async(value:number)=>{
  const zoom=Math.max(1,Math.min(scanZoomMax,Math.round(value*10)/10));
  scanZoomRef.current=zoom;setScanZoom(zoom);
  scanLiveSnapshotRef.current=null;setScanLiveCorners(null);setScanLiveStatus('searching');
  if(!scanZoomNativeRef.current)return;
  const track=scanStreamRef.current?.getVideoTracks()[0];
  if(!track)return;
  try{await track.applyConstraints({advanced:[{zoom} as MediaTrackConstraintSet]});}
  catch{scanZoomNativeRef.current=false;setScanNativeZoom(false);setScanCameraNotice('Zoom phần cứng không khả dụng, đã chuyển sang phóng to ảnh quét.');}
 };
 const scannerExposureTo=async(value:number)=>{
  const ev=Math.max(-2,Math.min(2,Math.round(value*2)/2));
  scanExposureRef.current=ev;setScanExposure(ev);
  if(!scanExposureNativeRef.current)return;
  const track=scanStreamRef.current?.getVideoTracks()[0];
  const caps=scanCameraCapabilities.current?.exposure;
  if(!track||!caps)return;
  const nativeValue=Math.max(caps.min,Math.min(caps.max,ev));
  try{await track.applyConstraints({advanced:[{exposureCompensation:nativeValue} as MediaTrackConstraintSet]});}
  catch{scanExposureNativeRef.current=false;setScanNativeExposure(false);setScanCameraNotice('Bù sáng cảm biến không hỗ trợ; dùng bù sáng khi xuất JPEG.');}
 };
 const scannerFocusAt=async(event:React.MouseEvent<HTMLVideoElement>)=>{
  if(scanDidPinchRef.current||!scanCameraReady)return;
  const video=event.currentTarget;
  const sensorPoint=scannerTapOnVideo(event,video.getBoundingClientRect(),video.videoWidth,video.videoHeight);
  if(!sensorPoint)return; // Don't focus on black letterboxes.
  const {x,y}=sensorPoint;
  // The ring belongs to the whole clipped viewport, not the smaller raw
  // object-contain rectangle. This also works with CSS digital zoom.
  const parentRect=video.parentElement?.getBoundingClientRect();
  if(parentRect?.width&&parentRect.height){
   setScanFocusPoint({x:(event.clientX-parentRect.left)/parentRect.width,
     y:(event.clientY-parentRect.top)/parentRect.height});
   window.setTimeout(()=>setScanFocusPoint(null),1100);
  }
  const track=scanStreamRef.current?.getVideoTracks()[0];
  if(!track){return;}
  const caps=track.getCapabilities?.() as MediaTrackCapabilities&{pointsOfInterest?:unknown;focusMode?:string[]} | undefined;
  if(!caps||!caps.pointsOfInterest){
   setScanCameraNotice('Camera đang dùng lấy nét tự động; WebView không hỗ trợ chọn điểm AF.');return;
  }
  try{
   const constraint={pointsOfInterest:[{x,y}],...(caps.focusMode?.includes('single-shot')?{focusMode:'single-shot'}:{})} as unknown as MediaTrackConstraintSet;
   await track.applyConstraints({advanced:[constraint]});setScanCameraNotice('Đã yêu cầu lấy nét tại điểm chạm; camera chưa xác nhận kết quả AF.');
  }catch{setScanCameraNotice('Máy không hỗ trợ lấy nét theo điểm; vẫn dùng AF tự động.');}
 };
 const scannerPinchStart=(event:React.TouchEvent<HTMLDivElement>)=>{
  if(event.touches.length!==2)return;
  const [a,b]=[event.touches[0],event.touches[1]];
  scanPinchRef.current={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:scanZoomRef.current};
  scanDidPinchRef.current=true;
 };
 const scannerPinchMove=(event:React.TouchEvent<HTMLDivElement>)=>{
  if(event.touches.length!==2||!scanPinchRef.current)return;
  event.preventDefault();
  const now=Date.now();if(now-scanLastPinchRef.current<55)return;
  scanLastPinchRef.current=now;
  const [a,b]=[event.touches[0],event.touches[1]];
  const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  void scannerZoomTo(scanPinchRef.current.zoom*distance/Math.max(1,scanPinchRef.current.distance));
 };
 const scannerPinchEnd=(event:React.TouchEvent<HTMLDivElement>)=>{
  if(event.touches.length<2){scanPinchRef.current=null;
   window.setTimeout(()=>{scanDidPinchRef.current=false;},250);}
 };

 const importInput=useRef<HTMLInputElement>(null),cameraInput=useRef<HTMLInputElement>(null),restoreInput=useRef<HTMLInputElement>(null);
 const abortProcessing=useRef<AbortController|null>(null),dragPoint=useRef<number|null>(null),dragPointerId=useRef<number|null>(null);
 const dragOffset=useRef<ScanPoint>({x:0,y:0}),stageRef=useRef<HTMLDivElement>(null),sourceImageRef=useRef<HTMLImageElement>(null),lensCanvasRef=useRef<HTMLCanvasElement>(null);
 // Stop tracks on camera close, navigation, facing-mode switch or unmount.
 useEffect(()=>{
  if(!scanCameraOpen)return;
  let canceled=false;
  setScanCameraReady(false);setScanCameraError('');
  const open=async()=>{
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Thiết bị / WebView chưa hỗ trợ camera trực tiếp');
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
     facingMode:{ideal:cameraFacing},width:{ideal:2560},height:{ideal:1920},frameRate:{ideal:30}
    }});
    if(canceled){stream.getTracks().forEach(track=>track.stop());return;}
    scanStreamRef.current=stream;
    const video=scanVideoRef.current;
    if(!video){stream.getTracks().forEach(track=>track.stop());return;}
    video.srcObject=stream;
    // Some Android WebViews do not auto-start a dynamically mounted <video>.
    await video.play();
    if(!canceled){
     const track=stream.getVideoTracks()[0];
     const caps=track?.getCapabilities?.() as MediaTrackCapabilities&{zoom?:{min:number;max:number;step?:number};exposureCompensation?:{min:number;max:number;step?:number}} | undefined;
     const nativeZoom=!!caps?.zoom&&caps.zoom.max>1;
     scanZoomNativeRef.current=nativeZoom;setScanNativeZoom(nativeZoom);
     setScanZoomMax(nativeZoom?Math.min(8,caps!.zoom!.max):4);
     scanZoomRef.current=1;setScanZoom(1);
     const nativeEv=!!caps?.exposureCompensation;
     scanExposureNativeRef.current=nativeEv;setScanNativeExposure(nativeEv);
     scanCameraCapabilities.current={exposure:caps?.exposureCompensation};
     scanExposureRef.current=0;setScanExposure(0);
     setScanCameraReady(true);
    }
   }catch(error){if(!canceled)setScanCameraError('Không mở được camera: '+String(error));}
  };
  void open();
  return ()=>{
   canceled=true;
   scanStreamRef.current?.getTracks().forEach(track=>track.stop());scanStreamRef.current=null;
   if(scanVideoRef.current)scanVideoRef.current.srcObject=null;
  };
 },[scanCameraOpen,cameraFacing]);

 // Analyze a small downsampled live frame about once per second. Both detector
 // passes work entirely offline. No edge is shown as "found" until two nearby
 // estimates agree. Stop on screen close / camera swap / camera not ready.
 useEffect(()=>{
  scanLiveSnapshotRef.current=null;
  setScanLiveCorners(null);setScanLiveFrameRect(null);setScanLiveStatus('searching');
  if(!scanCameraOpen||!scanCameraReady)return;
  let disposed=false,timeout=0,previous:ScanCorners|null=null,tracked:ScanCorners|null=null,streak=0,misses=0;
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx){setScanLiveStatus('unavailable');return;}
  const check=()=>{
   if(disposed)return;
   const video=scanVideoRef.current,viewport=scanPreviewViewportRef.current;
   let nextDelay=800;
   if(video&&viewport&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0){
    const display=scannerLiveContainRect(viewport.clientWidth,viewport.clientHeight,video.videoWidth,video.videoHeight);
    if(display)setScanLiveFrameRect(old=>old&&Math.abs(old.left-display.left)<.5&&Math.abs(old.top-display.top)<.5&&Math.abs(old.width-display.width)<.5&&Math.abs(old.height-display.height)<.5?old:display);
    try{
     const factor=Math.min(1,320/Math.max(video.videoWidth,video.videoHeight));
     const width=Math.max(80,Math.round(video.videoWidth*factor)),height=Math.max(80,Math.round(video.videoHeight*factor));
     if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
     const crop=scannerLiveSourceCrop(video.videoWidth,video.videoHeight,scanZoomNativeRef.current?1:scanZoomRef.current);
     ctx.filter=scanExposureNativeRef.current?'none':`brightness(${Math.max(.35,1+scanExposureRef.current*.2)})`;
     ctx.drawImage(video,crop.left,crop.top,crop.width,crop.height,0,0,width,height);
     ctx.filter='none';
     const start=performance.now();
     const found=detectDocumentEdges(ctx.getImageData(0,0,width,height),scanDocumentType);
     const analysisMs=performance.now()-start;
     if(analysisMs>400)nextDelay=1900;
     else if(analysisMs>170)nextDelay=1150;
     if(found.confidence==='estimated'&&validCorners(found.corners)){
      misses=0;
      if(previous&&scannerLiveQuadDelta(previous,found.corners)<.085){
       streak++;
       if(streak>=2){
        tracked=tracked?scannerLiveBlendQuad(tracked,found.corners):found.corners;
        scanLiveSnapshotRef.current={corners:tracked,at:performance.now(),width:video.videoWidth,
         height:video.videoHeight,zoom:scanZoomRef.current,facing:cameraFacing};
        setScanLiveCorners(tracked);setScanLiveStatus('tracking');
       }
      }else{
       streak=1;tracked=null;scanLiveSnapshotRef.current=null;setScanLiveCorners(null);setScanLiveStatus('searching');
      }
      previous=found.corners;
     }else{
      previous=null;streak=0;misses++;
      if(misses>=2){tracked=null;scanLiveSnapshotRef.current=null;setScanLiveCorners(null);setScanLiveStatus('searching');}
     }
    }catch(error){
     previous=null;streak=0;misses++;
     if(misses>=2){tracked=null;scanLiveSnapshotRef.current=null;setScanLiveCorners(null);setScanLiveStatus('unavailable');}
     console.warn('Scanner live edges unavailable; manual capture remains available:',error);
     nextDelay=2100;
    }
   }
   if(!disposed)timeout=window.setTimeout(check,nextDelay);
  };
  timeout=window.setTimeout(check,500);
  return()=>{disposed=true;scanLiveSnapshotRef.current=null;window.clearTimeout(timeout);};
 },[scanCameraOpen,scanCameraReady,cameraFacing,scanDocumentType]);

 useEffect(()=>{let alive=true;Promise.all([listScans(),listScanFolders()]).then(([p,f])=>{if(alive){setPages(p);setFolders(f);}}).catch(e=>{if(alive)setProblem('Không mở được thư viện quét: '+String(e));});return()=>{alive=false;abortProcessing.current?.abort();};},[]);
 const displayUrls=useMemo(()=>Object.fromEntries(pages.map(p=>[p.id,URL.createObjectURL(p.processed||p.original)])),[pages]);
 useEffect(()=>()=>Object.values(displayUrls).forEach(url=>URL.revokeObjectURL(url)),[displayUrls]);
 const editing=pages.find(p=>p.id===editingId);
 const originalUrl=useMemo(()=>editing?URL.createObjectURL(editing.original):'',[editing?.id,editing?.original]);
 useEffect(()=>()=>{if(originalUrl)URL.revokeObjectURL(originalUrl);},[originalUrl]);
 const [previewScan,setPreviewScan]=useState<{key:string;url:string}|null>(null);
 const scanViewKey=`${editing?.id||''}:${scanOpsDraft.join(',')}`;
 useEffect(()=>{
  if(!editing||!scanOpsDraft.length){setPreviewScan(null);return;}
  let canceled=false,uri='';
  setPreviewScan(null);
  void scannerOrientedPreview(editing.original,scanOpsDraft).then(blob=>{
   if(canceled)return;
   uri=URL.createObjectURL(blob);setPreviewScan({key:scanViewKey,url:uri});
  }).catch(error=>{if(!canceled)setProblem('Không thể xoay/lật ảnh xem trước: '+String(error));});
  return()=>{canceled=true;if(uri)URL.revokeObjectURL(uri);};
 },[editing?.id,editing?.original,scanViewKey]);
 const orientedSourceUrl=scanOpsDraft.length?(previewScan?.key===scanViewKey?previewScan.url:''):originalUrl;
 const processedUrl=editing?displayUrls[editing.id]:undefined;
 const visible=useMemo(()=>pages.filter(p=>currentFolder==='*'||p.folderId===currentFolder).sort((a,b)=>a.order-b.order||a.createdAt-b.createdAt),[pages,currentFolder]);
 const chosen=visible.filter(p=>selection.includes(p.id));
 const scopeName=currentFolder==='*'?'Toàn bộ':currentFolder===''?'Chưa phân loại':folders.find(f=>f.id===currentFolder)?.name||'Thư mục';
 const task=async(label:string,run:()=>Promise<void>)=>{if(working)return;setWorking(true);setProblem('');setNotice(label);try{await run();}catch(e){setProblem(e instanceof Error?e.message:String(e));setNotice('');}finally{setWorking(false);}};
 const importFiles=async(files:FileList|null)=>{if(!files?.length)return;const list=Array.from(files).slice(0,30);
  await task('Đang nhập ảnh gốc…',async()=>{
   const created:ScanPage[]=[];
   for(const file of list){if(!file.type.startsWith('image/'))continue;if(file.size>35*1024*1024)throw Error('Ảnh '+file.name+' vượt giới hạn 35 MB');
    const p:ScanPage={id:newScanId(),folderId:currentFolder==='*'?'':currentFolder,name:fileStem(file.name),original:file,
      corners:emptyCorners(),filter:'enhance',sharpness:'auto',documentType:scanDocumentType,detectionConfidence:'manual',createdAt:Date.now(),order:Date.now()+created.length};
    // Commit unmodified source FIRST; a slow or failed detector cannot lose a picked photo.
    await putScan(p);
    let updated=p;
    try{const detection=await suggestDocumentEdges(file,scanDocumentType);
     updated={...p,corners:detection.corners,detectionConfidence:detection.confidence};
     await putScan(updated);
    }catch(e){console.warn('Tự nhận diện mép thất bại, giữ ảnh gốc:',e);}
    created.push(updated);
   }
   if(!created.length)throw Error('Không có ảnh JPEG/PNG/WebP hợp lệ để quét');
   setPages(prev=>[...prev,...created]);setSelection(created.map(p=>p.id));setEditingId(created[0].id);
   setCornerDraft(created[0].corners.map(p=>({...p})) as ScanCorners);setFilterDraft(created[0].filter);setScanSharpnessDraft(created[0].sharpness||'off');setScanOpsDraft([]);setScanColorDraft({...DEFAULT_SCAN_COLOR});setShowResult(false);
   setNotice(`Đã giữ ${created.length} ảnh gốc trong ứng dụng. Kéo 4 điểm để chỉnh mép giấy.`);
  });
 };
 /** The shutter is released after committing the original, not after expensive
  * JPEG decoding and edge detection. Queue fallback analysis separately so
  * continuous scanning remains responsive and page edits are never replaced. */
 const queueScanEdgeEstimate=(page:ScanPage,splitMode:'one'|'multiple'='one',sessionSerial=scanCaptureSessionSerial.current)=>{
  scanAutoDetectQueue.current=scanAutoDetectQueue.current.catch(()=>{}).then(async()=>{
   // Give the next camera frame and user controls time to paint first.
   await new Promise<void>(resolve=>window.setTimeout(resolve,100));
   if(splitMode==='multiple'){
    const proposed=await suggestMultipleDocumentEdges(page.original,page.documentType);
    if(proposed.length>=2&&!scanDirtyDrafts.current.has(page.id)){
     const regions=await splitStoredScanPage(page.id,page.corners,proposed.map(p=>p.corners),
      ()=>!scanDirtyDrafts.current.has(page.id));
     if(regions.length>=2){
      setPages(prev=>[...prev.filter(p=>p.id!==page.id),...regions]);
      if(scanCaptureSessionSerial.current===sessionSerial){
       scanSessionIdsRef.current.push(...regions.slice(1).map(p=>p.id));
       setScanSessionIds([...scanSessionIdsRef.current]);
      }
      setSelection(prev=>[...new Set([...prev,...regions.map(p=>p.id)])]);
      setScanCameraNotice(`Đã tách ${regions.length} tài liệu từ một ảnh gốc · kiểm tra mép từng tài liệu`);
      if(scannerEditingIdRef.current===page.id){
       setCornerDraft(prev=>prev.every((c,i)=>Math.hypot(c.x-page.corners[i].x,c.y-page.corners[i].y)<1e-6)
        ?regions[0].corners.map(c=>({...c})) as ScanCorners:prev);
      }
      return;
     }
    }
   }
   const detected=await reconcileSavedScanCorners(page.original,page.detectionConfidence==='estimated'?page.corners:null,page.documentType);
   if(!detected||scanDirtyDrafts.current.has(page.id))return;
   // A user moving a handle has priority over an in-flight estimate.
   if(scanDirtyDrafts.current.has(page.id))return;
   const applied=await estimateScanCornersIfUnedited(page.id,page.corners,detected.corners,
    ()=>!scanDirtyDrafts.current.has(page.id));
   if(!applied)return;
   setPages(prev=>prev.map(p=>p.id===page.id&&!p.processed&&
    p.corners.every((c,i)=>Math.hypot(c.x-page.corners[i].x,c.y-page.corners[i].y)<1e-6)
     ?{...p,corners:detected.corners,detectionConfidence:'estimated'}:p));
   if(scannerEditingIdRef.current===page.id){
    setCornerDraft(prev=>prev.every((c,i)=>Math.hypot(c.x-page.corners[i].x,c.y-page.corners[i].y)<1e-6)
     ?detected.corners.map(c=>({...c})) as ScanCorners:prev);
   }
  }).catch(error=>console.warn('Không nhận diện được mép; ảnh gốc vẫn giữ nguyên:',error));
 };
 /** Capture one immutable source JPEG, persist it, and only then detect edges.
  * A failed edge detector must never lose the newly photographed page. */
 /** Save queued camera snapshots in order. A frame remains in memory on
  * storage failure so the user can retry; never display "saved" prematurely. */
 const flushCapturedScanQueue=async()=>{
  if(scanSavingRef.current)return;
  scanSavingRef.current=true;
  setScanQueueError('');
  try{
   while(scanPendingFrames.current.length){
    const frame=scanPendingFrames.current[0];
    try{
     const blob=await new Promise<Blob>((resolve,reject)=>frame.canvas.toBlob(
      b=>b&&b.size?resolve(b):reject(Error('Không thể tạo JPEG từ camera')),'image/jpeg',.94));
     const page:ScanPage={id:frame.id,folderId:frame.folder,name:frame.name,
      original:blob,corners:frame.live||emptyCorners(),filter:'enhance',sharpness:'auto',
      documentType:frame.kind,detectionConfidence:frame.live?'estimated':'manual',
      createdAt:frame.time,order:frame.time};
     await putScan(page);
     scanPendingFrames.current.shift();
     setScanPendingCount(scanPendingFrames.current.length);
     scanSessionSavedPages.current.push(page);
     scanSessionIdsRef.current.push(page.id);
     setScanSessionIds([...scanSessionIdsRef.current]);
     setPages(prev=>[...prev,page]);
     setScanCameraNotice(`Đã lưu ${scanSessionIdsRef.current.length} trang gốc · ${scanPendingFrames.current.length} đang lưu`);
     queueScanEdgeEstimate(page,frame.split,frame.sessionSerial); // Never wait for detection in shutter.
     if(frame.mode==='single'){
      setScanCameraOpen(false);setSelection([page.id]);setEditingId(page.id);
      scannerEditingIdRef.current=page.id;
      setCornerDraft(page.corners.map(p=>({...p})) as ScanCorners);
      setFilterDraft(page.filter);setScanSharpnessDraft(page.sharpness||'off');
      setScanOpsDraft([]);setScanColorDraft({...DEFAULT_SCAN_COLOR});setShowResult(false);
      setNotice('Ảnh gốc đã lưu. Kiểm tra bốn góc rồi làm phẳng khi cần.');
     }
    }catch(error){
     const message='Chưa lưu được ảnh đang chờ. Ảnh vẫn giữ trong hàng đợi; bấm Thử lưu lại: '+String(error);
     setScanQueueError(message);setScanCameraError(message);
     break; // Retain the original uncompressed canvas for a retry.
    }
   }
  }finally{
   scanSavingRef.current=false;
   if(!scanPendingFrames.current.length&&scanFinishRequestedRef.current){
    scanFinishRequestedRef.current=false;
    finishScanCamera();
   }
  }
 };
 const captureScanFrame=async()=>{
  if(scanCaptureLock.current||!scanCameraReady||scanQueueError)return;
  if(scanPendingFrames.current.length>=3){setScanCameraNotice('Bộ nhớ chụp đang đầy (3 ảnh); chờ lưu xong để chụp tiếp.');return;}
  if(scanCaptureCounter.current>=30){setScanCameraError('Tối đa 30 lượt chụp. Bấm Xong để xử lý, rồi quét tiếp.');return;}
  if(scanMode==='single'&&scanPendingFrames.current.length)return;
  const video=scanVideoRef.current;
  if(!video||video.readyState<2||!video.videoWidth||!video.videoHeight){
   setScanCameraError('Khung camera chưa có hình. Hãy thử chụp lại.');return;
  }
  scanCaptureLock.current=true;setScanCameraBusy(true);setScanCameraError('');
  try{
   const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không thể lấy khung ảnh camera');
   const zoom=scanZoomNativeRef.current?1:scanZoomRef.current;
   const srcW=video.videoWidth/zoom,srcH=video.videoHeight/zoom;
   if(!scanExposureNativeRef.current)ctx.filter=`brightness(${Math.max(.35,1+scanExposureRef.current*.2)})`;
   ctx.drawImage(video,(video.videoWidth-srcW)/2,(video.videoHeight-srcH)/2,srcW,srcH,0,0,canvas.width,canvas.height);
   ctx.filter='none';
   const snapshot=scanLiveSnapshotRef.current;
   const live=snapshot&&performance.now()-snapshot.at<1600&&
    snapshot.width===video.videoWidth&&snapshot.height===video.videoHeight&&
    Math.abs(snapshot.zoom-scanZoomRef.current)<.01&&snapshot.facing===cameraFacing&&validCorners(snapshot.corners)
    ?snapshot.corners.map(p=>({...p})) as ScanCorners:null;
   const date=Date.now(),sequence=++scanCaptureCounter.current;
   scanPendingFrames.current.push({canvas,id:newScanId(),time:date,
    name:`Scan_${new Date(date).toISOString().replace(/[:.]/g,'-')}_${sequence}`,
    folder:currentFolder==='*'?'':currentFolder,kind:scanDocumentType,
    live,mode:scanMode,split:scanSplitMode,sessionSerial:scanCaptureSessionSerial.current});
   setScanPendingCount(scanPendingFrames.current.length);
   setScanCameraNotice(`${scanPendingFrames.current.length} ảnh đang lưu · vẫn có thể chụp tiếp`);
  }catch(error){setScanCameraError('Không tạo được ảnh quét; chưa thay đổi thư viện: '+String(error));}
  finally{scanCaptureLock.current=false;setScanCameraBusy(false);}
  if(scanPendingFrames.current.length&&!scanSavingRef.current)void flushCapturedScanQueue();
 };
 const startScanCamera=()=>{
  if(working||scanPendingFrames.current.length)return;
  scanCaptureSessionSerial.current++;scanCaptureCounter.current=0;scanSessionSavedPages.current=[];scanFinishRequestedRef.current=false;
  scanSessionIdsRef.current=[];setScanSessionIds([]);setScanPendingCount(0);setScanQueueError('');
  scanLiveSnapshotRef.current=null;setScanLiveCorners(null);setScanLiveStatus('searching');
  setScanCameraNotice('');setScanCameraError('');setScanCameraReady(false);
  setScanMode('continuous');setCameraFacing('environment');setScanCameraOpen(true);
 };
 const finishScanCamera=()=>{
  if(scanCaptureLock.current||scanPendingFrames.current.length||scanSavingRef.current){
   scanFinishRequestedRef.current=true;
   setScanCameraNotice(`Đang hoàn tất lưu ${scanPendingFrames.current.length} ảnh trước khi đóng…`);
   return;
  }
  const ids=[...scanSessionIdsRef.current];
  setScanCameraOpen(false);
  if(ids.length){
   setSelection(ids);
   const first=scanSessionSavedPages.current.find(p=>p.id===ids[0])||pages.find(p=>p.id===ids[0]);
   if(first){setEditingId(first.id);setCornerDraft(first.corners.map(p=>({...p})) as ScanCorners);
    setFilterDraft(first.filter);setScanSharpnessDraft(first.sharpness||'off');
    setScanOpsDraft(safeScanOps(first.transformOps));setScanColorDraft(safeScanColor(first.colorAdjust));setShowResult(false);}
   setNotice(`Đã lưu ${ids.length} trang gốc. Kiểm tra bốn góc và xuất PDF khi cần.`);
  }
 };
 // After a capture session, show the chosen page rather than leaving the user
 // at the long folder/list section above the editable four-corner preview.
 useEffect(()=>{
  if(scanCameraOpen||!editingId||!scanSessionIds.length)return;
  const id=window.requestAnimationFrame(()=>document.querySelector('[data-hnl-scan-corners]')?.scrollIntoView({behavior:'smooth',block:'start'}));
  return()=>window.cancelAnimationFrame(id);
 },[scanCameraOpen,editingId,scanSessionIds.length]);
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
   await updateScanBatch(modified,f.id);
   setPages(prev=>prev.map(p=>p.folderId===f.id?{...p,folderId:''}:p));
   setFolders(prev=>prev.filter(p=>p.id!==f.id));setCurrentFolder('');setNotice('Đã xóa thư mục, giữ nguyên tất cả ảnh');
  });
 };
 const editPage=(page:ScanPage)=>{if(working)return;setScanDocumentType(page.documentType||'auto');setEditingId(page.id);setCornerDraft(page.corners.map(p=>({...p})) as ScanCorners);setFilterDraft(page.filter);setScanSharpnessDraft(page.sharpness||'off');setScanOpsDraft(safeScanOps(page.transformOps));setScanColorDraft(safeScanColor(page.colorAdjust));setShowResult(false);setProblem('');};
 const transformScan=(op:ScanImageOp)=>{
  if(working||dragPointerId.current!==null)return;
  if(editingId)scanDirtyDrafts.current.add(editingId);
  setCornerDraft(old=>scanQuadAfterOp(old,op));
  setScanOpsDraft(old=>normalizeScanOps([...old,op]));setShowResult(false);
 };
 const updateScanColor=(key:keyof ScanColorAdjust,value:number)=>{
  setScanColorDraft(prev=>({...prev,[key]:value}));setShowResult(false);
 };
 const endCornerDrag=(pointerId:number)=>{
  if(dragPointerId.current!==pointerId)return;
  dragPoint.current=null;dragPointerId.current=null;setDragFocus(null);setLensViewport(null);
 };
 const handleDragCorner=(e:React.PointerEvent<SVGCircleElement>,i:number)=>{
  if(dragPointerId.current!==null)return;
  if(editingId)scanDirtyDrafts.current.add(editingId); // A second finger must not move another corner.
  if(!stageRef.current)return;
  e.preventDefault();e.stopPropagation();
  const picked=scannerPointAtPointer(e,stageRef.current.getBoundingClientRect());
  dragOffset.current={x:cornerDraft[i].x-picked.x,y:cornerDraft[i].y-picked.y};
  dragPoint.current=i;dragPointerId.current=e.pointerId;
  setDragFocus(cornerDraft[i]);
  setLensViewport(scannerLoupeViewportPosition(e,window.innerWidth,window.innerHeight));
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const handlePointerMove=(e:React.PointerEvent<SVGSVGElement>)=>{
  if(dragPoint.current===null||dragPointerId.current!==e.pointerId||!stageRef.current)return;
  e.preventDefault();
  const point=scannerCornerWithOffset(e,stageRef.current.getBoundingClientRect(),dragOffset.current);
  const idx=dragPoint.current;
  setCornerDraft(old=>old.map((p,i)=>i===idx?point:p) as ScanCorners);
  setDragFocus(point);
  setLensViewport(scannerLoupeViewportPosition(e,window.innerWidth,window.innerHeight));
  setShowResult(false);
 };
 // Draw the same <img> users are tracing; this preserves browser EXIF rotation,
 // aspect ratio and 4.5x optical zoom. The crosshair is exactly at the corner.
 useEffect(()=>{
  const canvas=lensCanvasRef.current,img=sourceImageRef.current;
  if(!dragFocus||!canvas||!img||!img.complete||!img.naturalWidth)return;
  const preview=img.getBoundingClientRect();
  if(!preview.width||!preview.height)return;
  const dpr=Math.min(3,Math.max(1,window.devicePixelRatio||1));
  const size=SCANNER_LOUPE_IMAGE_SIZE,px=Math.round(size*dpr);
  if(canvas.width!==px||canvas.height!==px){canvas.width=px;canvas.height=px;}
  const context=canvas.getContext('2d');if(!context)return;
  context.setTransform(dpr,0,0,dpr,0,0);
  context.fillStyle='#071121';context.fillRect(0,0,size,size);
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  context.filter=`brightness(${scanColorDraft.brightness}%) contrast(${scanColorDraft.contrast}%) saturate(${scanColorDraft.saturation}%)`;
  const at=scannerLoupeImageRect(dragFocus,preview.width,preview.height);
  context.drawImage(img,at.left,at.top,at.width,at.height);
 },[dragFocus,orientedSourceUrl,editingId,scanColorDraft]);
 useEffect(()=>{dragPoint.current=null;dragPointerId.current=null;setDragFocus(null);setLensViewport(null);},[editingId,showResult]);
 const applyEdit=async()=>{if(!editing)return;if(!validCorners(cornerDraft)){setProblem('Bốn góc đang giao nhau hoặc quá sát nhau. Hãy kéo lại.');return;}
  await task('Đang làm phẳng và lọc ảnh…',async()=>{const controller=new AbortController();abortProcessing.current=controller;
   try{const blob=await flattenDocument(editing.original,cornerDraft,filterDraft,controller.signal,{operations:scanOpsDraft,adjustments:scanColorDraft,sharpness:scanSharpnessDraft});
    const next:ScanPage={...editing,processed:blob,corners:cornerDraft,filter:filterDraft,sharpness:scanSharpnessDraft,transformOps:[...scanOpsDraft],colorAdjust:{...scanColorDraft},detectionConfidence:'estimated'};await putScan(next);
    setPages(prev=>prev.map(p=>p.id===next.id?next:p));setShowResult(true);setNotice('Đã làm phẳng ảnh và lưu bản scan; ảnh gốc giữ nguyên.');
   }finally{abortProcessing.current=null;}
  });
 };
 const getProcessed=async(p:ScanPage):Promise<Blob>=>{
  if(p.processed)return p.processed;
  const processed=await flattenDocument(p.original,p.corners,p.filter,abortProcessing.current?.signal,{operations:p.transformOps,adjustments:p.colorAdjust,sharpness:p.sharpness||'off'});
  const next={...p,processed};await putScan(next);
  setPages(old=>old.map(item=>item.id===p.id?next:item));return processed;
 };
 const editingHasUnsavedCorners=!!editing&&(cornerDraft.some((p,i)=>Math.abs(p.x-editing.corners[i].x)>1e-6||Math.abs(p.y-editing.corners[i].y)>1e-6)||filterDraft!==editing.filter||scanSharpnessDraft!==(editing.sharpness||'off')||JSON.stringify(scanOpsDraft)!==JSON.stringify(safeScanOps(editing.transformOps))||JSON.stringify(scanColorDraft)!==JSON.stringify(safeScanColor(editing.colorAdjust)));
 const splitCurrentPage=async()=>{
  if(!editing)return;
  if(editingHasUnsavedCorners){setProblem('Hãy lưu hoặc hoàn tác các góc đang chỉnh trước khi tự tách nhiều vùng.');return;}
  await task('Đang tìm nhiều tài liệu trong ảnh gốc…',async()=>{
   const candidates=await suggestMultipleDocumentEdges(editing.original,scanDocumentType);
   if(candidates.length<2){setNotice('Chưa tìm chắc chắn từ 2 vùng; ảnh gốc được giữ. Dùng “Thêm vùng bằng tay”.');return;}
   const saved=await splitStoredScanPage(editing.id,editing.corners,candidates.map(p=>p.corners),
    ()=>!scanDirtyDrafts.current.has(editing.id));
   if(saved.length<2){setNotice('Trang đã chỉnh hoặc đã tách; không ghi đè. Có thể thêm vùng bằng tay.');return;}
   setPages(prev=>[...prev.filter(p=>p.id!==editing.id),...saved]);
   setSelection(prev=>[...new Set([...prev,...saved.map(p=>p.id)])]);
   setCornerDraft(saved[0].corners.map(p=>({...p})) as ScanCorners);
   setNotice(`Đã tách ${saved.length} vùng từ một ảnh. Kiểm tra từng góc trước khi xuất.`);
  });
 };
 const addManualScanRegion=async()=>{
  if(!editing)return;
  await task('Đang thêm vùng quét thủ công…',async()=>{
   const added=await addScanRegionManually(editing);
   setPages(prev=>[...prev,added]);setSelection(prev=>[...new Set([...prev,added.id])]);
   setEditingId(added.id);setCornerDraft(added.corners.map(p=>({...p})) as ScanCorners);
   setFilterDraft(added.filter);setScanSharpnessDraft(added.sharpness||'off');
   setScanOpsDraft(safeScanOps(added.transformOps));setScanColorDraft(safeScanColor(added.colorAdjust));
   setShowResult(false);setNotice('Đã thêm một vùng từ ảnh gốc. Kéo bốn góc để chọn tài liệu tiếp theo.');
  });
 };
 const exportSelected=async(kind:'pdf'|'images')=>{if(!chosen.length)return;
  if(editingHasUnsavedCorners&&chosen.some(p=>p.id===editingId)){
   setProblem('Bốn góc hoặc bộ lọc của ảnh đang chỉnh chưa được lưu. Hãy bấm “Làm phẳng & lưu bản scan” trước khi xuất.');
   return;
  }
  await task(kind==='pdf'?'Đang tạo PDF…':'Đang xuất ảnh…',async()=>{
   if(chosen.length>30)throw Error('Hãy chọn tối đa 30 ảnh mỗi lần xuất để tránh hết RAM trên điện thoại');
   const controller=new AbortController();abortProcessing.current=controller;
   try{const imgs:Blob[]=[];
    for(let i=0;i<chosen.length;i++){setNotice(`Đang chuẩn bị trang ${i+1}/${chosen.length}…`);imgs.push(await getProcessed(chosen[i]));}
    if(kind==='pdf'){
     const opts:PdfExportOptions={paper,landscape,marginMm:margin,customWidthMm:customW,customHeightMm:customH,twoPerPage,idCardPrintSize:twoPerPage&&idCardPrintSize};
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
  await task('Đang sắp xếp trang…',async()=>{await updateScanBatch([{...a,order:b.order},{...b,order:a.order}]);
   setPages(prev=>prev.map(p=>p.id===a.id?{...p,order:b.order}:p.id===b.id?{...p,order:a.order}:p));setNotice('Đã đổi thứ tự trang.');});
 };
 const dropPage=async(targetId:string)=>{if(!draggingId||targetId===draggingId)return;const all=[...visible];const from=all.findIndex(p=>p.id===draggingId),to=all.findIndex(p=>p.id===targetId);if(from<0||to<0)return;
  const [moved]=all.splice(from,1);all.splice(to,0,moved);
  await task('Đang sắp xếp trang…',async()=>{const now=Date.now();const changes=all.map((p,i)=>({...p,order:now+i}));await updateScanBatch(changes);
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
  const restoredPageIds=new Map<string,string>();
  for(const page of parsed.pages){
   if(typeof page.id!=='string'||restoredPageIds.has(page.id))throw Error('ID trang scan trong ZIP thiếu hoặc trùng lặp');
   restoredPageIds.set(page.id,newScanId());
  }
  const newPages:ScanPage[]=[];let restoredBytes=0;
  for(const page of parsed.pages){
   if(!/^original\/[\w-]+\.bin$/.test(page.originalPath)||page.processedPath&&!/^processed\/[\w-]+\.jpg$/.test(page.processedPath))throw Error('Đường dẫn ZIP không hợp lệ');
   const src=zip.file(page.originalPath);if(!src)throw Error('Thiếu ảnh gốc trong ZIP');
   const raw=await src.async('blob');if(raw.size>35*1024*1024)throw Error('Một ảnh vượt giới hạn 35 MB');
   restoredBytes+=raw.size;if(restoredBytes>250*1024*1024)throw Error('Tổng dung lượng giải nén vượt giới hạn 250 MB');
   const original=new Blob([raw],{type:page.originalType?.startsWith('image/')?page.originalType:'image/jpeg'});
   let processed:Blob|undefined;const p=page.processedPath&&zip.file(page.processedPath);
   if(page.processedPath&&!p)throw Error('Thiếu ảnh đã quét trong ZIP');
   if(p){
    // JSZip blobs do not preserve a JPEG MIME type. Keep the exact compressed
    // bytes and tag them so PDF export can embed without a second JPEG encode.
    const jpegData=await p.async('blob');processed=new Blob([jpegData],{type:'image/jpeg'});
    restoredBytes+=processed.size;
   }
   if(restoredBytes>250*1024*1024)throw Error('Tổng dung lượng giải nén vượt giới hạn 250 MB');
   const corners=(page.corners&&Array.isArray(page.corners)&&page.corners.length===4&&validCorners(page.corners)?page.corners:emptyCorners());
   const newPage:ScanPage={id:restoredPageIds.get(page.id)!,folderId:folderMap.get(page.folderId)||'',name:tidy(page.name),original,processed,
    filter:FILTERS.some(x=>x.id===page.filter)?page.filter:'color',corners,
    sharpness:page.sharpness==='text'||page.sharpness==='auto'?page.sharpness:'off',
    documentType:page.documentType==='id-card'||page.documentType==='paper'?page.documentType:'auto',
    detectionConfidence:page.detectionConfidence==='estimated'?'estimated':'manual',
    splitParentId:typeof page.splitParentId==='string'?restoredPageIds.get(page.splitParentId):undefined,
    splitRegionCount:typeof page.splitRegionCount==='number'&&Number.isInteger(page.splitRegionCount)&&page.splitRegionCount>=2&&page.splitRegionCount<=4?page.splitRegionCount:undefined,
    transformOps:safeScanOps(page.transformOps),colorAdjust:safeScanColor(page.colorAdjust),
    order:Number(page.order)||Date.now(),createdAt:Date.now()};
   newPages.push(newPage);
  }
  // A single readwrite transaction ensures all-or-nothing restoration and no overwrite.
  await restoreScanBatch(newFolders,newPages);
  setFolders(old=>[...old,...newFolders]);setPages(old=>[...old,...newPages]);setNotice(`Đã khôi phục ${newPages.length} ảnh quét; giữ nguyên dữ liệu trước đó.`);
 });
 return <section className="mx-auto max-w-6xl px-3 sm:px-5 py-4 pb-8 space-y-4" data-hnl-document-scanner="true">
   <header className="flex items-center gap-2 justify-between">
     <div className="flex items-center gap-2 min-w-0"><button onClick={onBack} className="min-w-10 min-h-10 rounded-lg bg-[#17253D] grid place-items-center" aria-label="Quay lại Thư viện"><ArrowLeft size={19}/></button>
       <div className="min-w-0"><h1 className="font-bold text-[17px] flex items-center gap-2"><ScanLine size={20} className="text-[#E2B74B]"/>Quét tài liệu</h1><p className="text-xs text-[#94A3B8]">Làm phẳng ảnh · Offline · Giữ ảnh gốc</p></div></div>
     <span className="text-xs text-[#E2B74B]">{pages.length} trang</span>
   </header>
   {scanCameraOpen&&createPortal(
    <div data-hnl-scan-camera="true" role="dialog" aria-modal="true" aria-label="Camera quét tài liệu"
      className="fixed inset-0 z-[100] flex flex-col bg-[#030812] text-white" style={{paddingTop:'max(10px,env(safe-area-inset-top))',paddingBottom:'max(12px,env(safe-area-inset-bottom))'}}>
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 pb-2">
        <button disabled={scanCameraBusy} type="button" aria-label="Đóng camera quét" onClick={finishScanCamera}
          className="min-w-10 min-h-10 grid place-items-center rounded-xl bg-[#17253D] disabled:opacity-50"><X size={19}/></button>
        <span className="font-semibold text-sm truncate">Quét tài liệu · {scanSessionIds.length} đã lưu{scanPendingCount?` · ${scanPendingCount} đang lưu`:""}</span>
        <button type="button" disabled={scanCameraBusy} aria-label="Đổi camera trước sau" onClick={()=>setCameraFacing(f=>f==='environment'?'user':'environment')}
          className="min-w-10 min-h-10 grid place-items-center rounded-xl bg-[#17253D] disabled:opacity-50"><RotateCcw size={19}/></button>
      </div>
      <div className="shrink-0 px-3 pb-2 flex justify-center items-center gap-2">
        <label className="text-[12px] text-[#AFC0D6] flex items-center gap-2">Nhận diện
         <select aria-label="Loại tài liệu nhận diện" value={scanDocumentType} onChange={e=>setScanDocumentType(e.target.value as ScanDocumentType)}
          className="min-h-9 bg-[#14243B] border border-white/15 px-2 rounded-lg text-xs text-white">
          <option value="auto">Tự động</option><option value="id-card">CCCD / thẻ</option><option value="paper">Giấy A4 / tài liệu</option>
         </select>
        </label>
      </div>
      <div className="shrink-0 px-3 pb-2 flex items-center justify-center gap-2">
        <span className="text-[11px] text-[#AFC0D6]">Trong một ảnh:</span>
        <button type="button" disabled={scanCaptureLock.current||scanPendingCount>0} onClick={()=>setScanSplitMode('one')}
         aria-pressed={scanSplitMode==='one'} className={`min-h-9 px-3 rounded-lg text-xs ${scanSplitMode==='one'?'bg-[#E2B74B] text-[#06101E]':'bg-[#14243B]'}`}>1 tài liệu</button>
        <button type="button" disabled={scanCaptureLock.current||scanPendingCount>0} onClick={()=>setScanSplitMode('multiple')}
         aria-pressed={scanSplitMode==='multiple'} className={`min-h-9 px-3 rounded-lg text-xs ${scanSplitMode==='multiple'?'bg-[#E2B74B] text-[#06101E]':'bg-[#14243B]'}`}>Nhiều tài liệu</button>
      </div>
      <div className="shrink-0 px-3 pb-3 flex items-center justify-center gap-2">
        <button type="button" disabled={scanCameraBusy} onClick={()=>setScanMode('single')} aria-pressed={scanMode==='single'}
          className={`min-h-10 rounded-lg px-4 text-xs font-semibold border disabled:opacity-50 ${scanMode==='single'?'bg-[#E2B74B] text-[#06101E] border-[#E2B74B]':'bg-[#14243B] text-white border-white/15'}`}>Một trang</button>
        <button type="button" disabled={scanCameraBusy} onClick={()=>setScanMode('continuous')} aria-pressed={scanMode==='continuous'}
          className={`min-h-10 rounded-lg px-4 text-xs font-semibold border disabled:opacity-50 ${scanMode==='continuous'?'bg-[#E2B74B] text-[#06101E] border-[#E2B74B]':'bg-[#14243B] text-white border-white/15'}`}>Liên tục</button>
      </div>
      <div className="shrink-0 px-3 pb-2 grid grid-cols-2 gap-3 text-[11px] text-[#CBD5E1]">
        <label className="flex flex-col gap-1"><span>Zoom {scanZoom.toFixed(1)}× {scanNativeZoom?'· camera':'· số'}</span>
         <input type="range" aria-label="Zoom camera scan" min="1" max={scanZoomMax} step="0.1" value={scanZoom}
          onChange={e=>void scannerZoomTo(Number(e.target.value))} className="w-full accent-[#E2B74B]"/></label>
        <label className="flex flex-col gap-1"><span>Độ sáng {scanExposure>0?'+':''}{scanExposure.toFixed(1)} {scanNativeExposure?'EV':'mức'}</span>
         <input type="range" aria-label="Bù sáng camera scan" min="-2" max="2" step="0.5" value={scanExposure}
          onChange={e=>void scannerExposureTo(Number(e.target.value))} className="w-full accent-[#E2B74B]"/></label>
      </div>
      <div ref={scanPreviewViewportRef} className="relative flex-1 min-h-0 mx-3 rounded-2xl border border-white/15 bg-black overflow-hidden flex items-center justify-center touch-none"
        onTouchStart={scannerPinchStart} onTouchMove={scannerPinchMove} onTouchEnd={scannerPinchEnd} onTouchCancel={scannerPinchEnd}>
        <video ref={scanVideoRef} autoPlay muted playsInline aria-label="Khung camera quét trực tiếp"
          onClick={e=>void scannerFocusAt(e)} className="w-full h-full object-contain"
          style={{transform:!scanNativeZoom?`scale(${scanZoom})`:undefined,filter:!scanNativeExposure?`brightness(${Math.max(.35,1+scanExposure*.2)})`:undefined,transformOrigin:'center center'}}/>
        {scanFocusPoint&&<span aria-hidden="true" className="absolute rounded-full border-2 border-[#E2B74B] size-11 pointer-events-none"
          style={{left:`${scanFocusPoint.x*100}%`,top:`${scanFocusPoint.y*100}%`,transform:'translate(-50%,-50%)'}}/>}
        {!scanLiveCorners&&<div aria-hidden="true" data-hnl-scan-guide="true" className={`pointer-events-none absolute border border-dashed border-[#E2B74B]/65 ${scanDocumentType==='id-card'?'w-[86%] max-h-[80%] aspect-[1.585] rounded-2xl':scanDocumentType==='paper'?'h-[80%] max-w-[80%] aspect-[0.707] rounded-lg':'inset-[8%] rounded-xl'}`}/>}
        {scanLiveCorners&&scanLiveFrameRect&&<svg data-hnl-scan-live-edges="true" aria-label="Đã nhận diện bốn mép tài liệu trên camera" viewBox="0 0 1000 1000" preserveAspectRatio="none"
          className="absolute pointer-events-none z-[3] overflow-visible"
          style={{left:scanLiveFrameRect.left,top:scanLiveFrameRect.top,width:scanLiveFrameRect.width,height:scanLiveFrameRect.height}}>
          <polygon points={scanLiveCorners.map(p=>`${p.x*1000},${p.y*1000}`).join(' ')}
            fill="rgba(52,211,153,.10)" stroke="#34D399" strokeWidth="7" vectorEffect="non-scaling-stroke"/>
          {scanLiveCorners.map((p,i)=><circle key={i} cx={p.x*1000} cy={p.y*1000} r="17" fill="#34D399" stroke="#071121" strokeWidth="5" vectorEffect="non-scaling-stroke"/>)}
        </svg>}
        <span aria-live="off" className={`absolute z-[4] left-3 bottom-3 rounded-lg px-2 py-1 text-xs pointer-events-none ${scanLiveStatus==='tracking'?'bg-emerald-900/85 text-emerald-100':'bg-black/65 text-amber-100'}`}>
          {scanLiveStatus==='tracking'?'Đã phát hiện 4 góc · kiểm tra mép trước khi chụp':scanLiveStatus==='unavailable'?'Chưa quét mép trực tiếp được · vẫn chụp thủ công':'Đưa đủ bốn cạnh giấy vào khung để nhận diện'}
        </span>
        {!scanCameraReady&&!scanCameraError&&<span className="absolute text-sm text-white bg-black/70 rounded-lg px-3 py-2">Đang mở camera…</span>}
        {scanCameraError&&<div role="alert" className="absolute inset-x-3 bottom-3 rounded-xl bg-[#531A21]/95 p-3 text-sm">
          <p>{scanCameraError}</p>
          <button type="button" className="mt-2 min-h-9 rounded-lg bg-white/15 px-3" onClick={()=>{setScanCameraOpen(false);cameraInput.current?.click();}}>Dùng camera hệ thống (dự phòng)</button>
        </div>}
      </div>
      <div className="shrink-0 px-4 pt-3 space-y-2">
        {scanQueueError&&<button type="button" onClick={()=>{setScanQueueError('');setScanCameraError('');void flushCapturedScanQueue();}}
         className="min-h-10 w-full rounded-lg bg-[#E2B74B] text-[#071121] font-semibold text-xs px-3">Thử lưu lại ảnh đang chờ (không xóa ảnh)</button>}
        <p role="status" className="text-xs text-center text-[#AFC0D6] min-h-5">{scanCameraNotice||(scanMode==='continuous'?'Chụp liên tiếp, mỗi trang được lưu ngay.':'Chụp một trang rồi chỉnh mép giấy.')}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="min-w-[72px] text-xs text-[#E2B74B]">{scanSessionIds.length} trang</span>
          <button type="button" aria-label="Chụp trang tài liệu" onClick={()=>void captureScanFrame()}
            disabled={scanCameraBusy||!scanCameraReady||scanPendingCount>=3||!!scanQueueError} className="size-[70px] shrink-0 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40">
            <span className="size-12 rounded-full bg-[#E2B74B]"/>
          </button>
          <button type="button" disabled={scanCameraBusy} onClick={finishScanCamera}
            className="min-h-11 min-w-[78px] rounded-xl bg-[#17253D] px-3 text-xs font-semibold disabled:opacity-40">Xong</button>
        </div>
      </div>
    </div>,document.body)}
   {problem&&<div role="alert" className="rounded-xl bg-red-950/60 border border-red-700/50 text-red-200 p-3 text-xs">{problem}</div>}
   {notice&&<div role="status" className="rounded-xl bg-[#102D2A] border border-emerald-800/40 text-emerald-200 p-3 text-xs">{notice}</div>}
   <div className="grid grid-cols-2 gap-2">
     <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={e=>{void importFiles(e.target.files);e.currentTarget.value='';}} />
     <input ref={importInput} type="file" accept="image/*" multiple hidden onChange={e=>{void importFiles(e.target.files);e.currentTarget.value='';}} />
     <button disabled={working} onClick={startScanCamera} className="min-h-11 flex items-center justify-center gap-2 bg-[#E2B74B] text-[#071121] font-semibold rounded-xl disabled:opacity-50"><Camera size={18}/>Chụp quét</button>
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
     <p className="text-xs text-[#94A3B8]">{editing.detectionConfidence==='estimated'?'Đã ước lượng bốn góc: kiểm tra đủ cả góc bo tròn trước khi lưu.':'Chưa nhận diện chắc chắn: khung gần toàn ảnh để không cắt mất góc. Kéo bốn điểm về mép thực tế.'} Khi kéo sẽ có kính phóng đại 4,5×.</p>
     <label className="flex items-center gap-2 text-xs text-[#CBD5E1]">Loại tài liệu
      <select aria-label="Chọn loại tài liệu để nhận diện lại" value={scanDocumentType} onChange={e=>setScanDocumentType(e.target.value as ScanDocumentType)}
       className="min-h-9 flex-1 rounded-lg border border-white/15 bg-[#14243B] text-white px-2">
       <option value="auto">Tự động</option><option value="id-card">CCCD / thẻ</option><option value="paper">Giấy A4 / tài liệu</option>
      </select></label>
     <div className="flex gap-2"><button onClick={()=>setShowResult(false)} className={`px-3 min-h-9 rounded-lg text-xs ${!showResult?'bg-[#E2B74B] text-[#071121]':'bg-[#17253D]'}`}>Ảnh gốc & góc</button>
       <button disabled={!editing.processed} onClick={()=>setShowResult(true)} className={`px-3 min-h-9 rounded-lg text-xs disabled:opacity-40 ${showResult?'bg-[#E2B74B] text-[#071121]':'bg-[#17253D]'}`}>Ảnh đã làm phẳng</button></div>
     <div className="max-w-xl mx-auto rounded-xl overflow-hidden bg-black border border-white/15">
       {showResult&&editing.processed?<img src={processedUrl} className="block w-full max-h-[55vh] object-contain" alt="Ảnh tài liệu đã làm phẳng"/>:
       <div ref={stageRef} className="relative w-fit max-w-full mx-auto">
         <img ref={sourceImageRef} src={orientedSourceUrl} alt="Ảnh gốc cần chỉnh bốn góc" className="block max-w-full max-h-[52vh] w-auto h-auto" draggable={false}
           style={{filter:`brightness(${scanColorDraft.brightness}%) contrast(${scanColorDraft.contrast}%) saturate(${scanColorDraft.saturation}%)`}}/>
         <svg className="absolute inset-0 w-full h-full touch-none" viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerMove={handlePointerMove} onPointerUp={e=>endCornerDrag(e.pointerId)} onPointerCancel={e=>endCornerDrag(e.pointerId)}>
           <polygon points={cornerDraft.map(p=>`${p.x*1000},${p.y*1000}`).join(' ')} fill="rgba(226,183,75,.12)" stroke="#E2B74B" strokeWidth="5" strokeDasharray="12 6"/>
           {cornerDraft.map((p,i)=><g key={i}>
             <circle cx={p.x*1000} cy={p.y*1000} r="65" fill="transparent" onPointerDown={e=>handleDragCorner(e,i)} onLostPointerCapture={e=>endCornerDrag(e.pointerId)} />
             <circle cx={p.x*1000} cy={p.y*1000} r="28" fill="#E2B74B" stroke="#071121" strokeWidth="7" pointerEvents="none"/>
           </g>)}
         </svg>
         {dragFocus&&lensViewport&&createPortal(
          <div data-hnl-scan-loupe="true" aria-hidden="true"
           className="fixed z-[200] pointer-events-none rounded-full p-[3px] bg-[#E2B74B] shadow-2xl"
           style={{left:lensViewport.left,top:lensViewport.top}}>
           <div className="relative w-[120px] h-[120px] rounded-full overflow-hidden bg-[#071121]">
            <canvas ref={lensCanvasRef} className="block w-[120px] h-[120px]"/>
            <span className="absolute inset-x-0 top-1/2 h-px bg-[#E2B74B]/90"/>
            <span className="absolute inset-y-0 left-1/2 w-px bg-[#E2B74B]/90"/>
            <span className="absolute size-2 rounded-full border border-[#E2B74B] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
           </div>
          </div>,document.body)}
       </div>}
     </div>
     <div className="flex gap-2 items-center justify-between"><button disabled={working} onClick={()=>void task('Đang nhận diện mép giấy…',async()=>{
       if(!editing)return;
       const found=await suggestDocumentEdges(editing.original,scanDocumentType);
       if(!validCorners(found.corners))throw Error('Không thể dựng tứ giác hợp lệ từ ảnh');
       scanDirtyDrafts.current.add(editing.id);
       setCornerDraft(found.corners);setShowResult(false);
       setNotice(found.confidence==='estimated'?'Đã nhận diện tứ giác; hãy xem kỹ từng góc rồi lưu.':'Độ tin cậy thấp; đã giữ khung gần toàn ảnh để tránh cắt mất góc.');
      })} className="text-xs px-3 min-h-9 rounded-lg bg-[#17253D] flex gap-1 items-center disabled:opacity-50"><ScanLine size={15}/>Nhận diện mép</button>
       <button onClick={()=>{if(editingId)scanDirtyDrafts.current.add(editingId);setCornerDraft(emptyCorners());setShowResult(false);}} className="text-xs px-3 min-h-9 rounded-lg bg-[#17253D] flex items-center gap-1"><RotateCcw size={15}/>Đặt lại góc</button></div>
     <div className="rounded-xl border border-white/10 bg-[#101E32] p-2 space-y-2">
      <p className="text-xs font-semibold">Một ảnh có nhiều CCCD / giấy tờ</p>
      <div className="grid grid-cols-2 gap-2">
       <button type="button" disabled={working} onClick={()=>void splitCurrentPage()} className="min-h-10 bg-[#17253D] rounded-lg px-2 text-xs">Nhận diện & tách nhiều vùng</button>
       <button type="button" disabled={working} onClick={()=>void addManualScanRegion()} className="min-h-10 bg-[#17253D] rounded-lg px-2 text-xs">Thêm vùng bằng tay</button>
      </div>
      <p className="text-[10px] text-[#94A3B8]">Mỗi vùng tạo một trang riêng để chỉnh góc; ảnh gốc vẫn có thể dùng lại. Nếu máy không nhận đủ vùng, dùng “Thêm vùng bằng tay”.</p>
     </div>
     <div className="rounded-xl border border-white/10 bg-[#101E32] p-2 space-y-2">
       <p className="text-xs text-[#CBD5E1] font-semibold">Xoay / lật ảnh quét (giữ ảnh gốc)</p>
       <div className="grid grid-cols-4 gap-2">
        <button type="button" disabled={working} onClick={()=>transformScan('ccw')} className="min-h-10 rounded-lg bg-[#17253D] text-[11px] flex gap-1 items-center justify-center disabled:opacity-40"><RotateCcw size={15}/>Trái 90°</button>
        <button type="button" disabled={working} onClick={()=>transformScan('cw')} className="min-h-10 rounded-lg bg-[#17253D] text-[11px] flex gap-1 items-center justify-center disabled:opacity-40"><RotateCw size={15}/>Phải 90°</button>
        <button type="button" disabled={working} onClick={()=>transformScan('flip-h')} className="min-h-10 rounded-lg bg-[#17253D] text-[11px] flex gap-1 items-center justify-center disabled:opacity-40"><FlipHorizontal size={15}/>Lật ngang</button>
        <button type="button" disabled={working} onClick={()=>transformScan('flip-v')} className="min-h-10 rounded-lg bg-[#17253D] text-[11px] flex gap-1 items-center justify-center disabled:opacity-40"><FlipVertical size={15}/>Lật dọc</button>
       </div>
       <p className="text-[10px] text-[#94A3B8]">Bốn điểm mép giấy chuyển theo ảnh. Bấm Lưu bản scan để ghi ảnh đã chỉnh; bản gốc không thay đổi.</p>
     </div>
     <div className="rounded-xl border border-white/10 bg-[#101E32] p-2 space-y-2">
       <div className="flex justify-between items-center"><p className="text-xs font-semibold">Chỉnh màu ảnh scan</p><button disabled={working} onClick={()=>setScanColorDraft({...DEFAULT_SCAN_COLOR})} className="text-[11px] text-[#E2B74B]">Đặt lại màu</button></div>
       {([['brightness','Độ sáng'],['contrast','Tương phản'],['saturation','Độ bão hòa']] as const).map(([key,label])=><label key={key} className="flex gap-3 items-center text-xs">
        <span className="w-[105px] shrink-0">{label} {scanColorDraft[key]}%</span>
        <input aria-label={label+' ảnh scan'} type="range" min="0" max="200" step="5" value={scanColorDraft[key]}
          onChange={e=>updateScanColor(key,Number(e.target.value))} className="flex-1 accent-[#E2B74B] min-w-0"/>
       </label>)}
       <p className="text-[10px] text-[#94A3B8]">Xem trước màu gần đúng. Bản xuất sau khi bấm Làm phẳng & lưu sử dụng cùng các giá trị đã chọn.</p>
     </div>
     <div className="rounded-xl border border-white/10 bg-[#101E32] p-2 space-y-2">
       <label className="text-xs flex items-center justify-between gap-2"><span className="font-semibold">Tăng độ nét khi in / xuất PDF</span>
        <select aria-label="Tăng độ nét ảnh scan" value={scanSharpnessDraft} onChange={e=>{setScanSharpnessDraft(e.target.value as ScanSharpness);setShowResult(false);}}
          className="min-h-9 rounded-lg border border-white/15 bg-[#14243B] text-white px-2 text-xs">
          <option value="off">Giữ nét gốc</option><option value="auto">Thông minh · Tự động</option>
          <option value="text">Rõ nét chữ</option>
        </select></label>
       <p className="text-[10px] text-[#94A3B8]">Tăng nét cục bộ trên bản scan xuất, giảm hạt nền, giữ nguyên JPEG gốc. Không thể khôi phục chữ đã nhòe hoặc mất nét trong ảnh ban đầu.</p>
     </div>
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
     {twoPerPage&&<label className="flex gap-2 items-start text-xs rounded-lg border border-[#E2B74B]/30 p-2 bg-[#E2B74B]/5"><input type="checkbox" checked={idCardPrintSize} onChange={e=>setIdCardPrintSize(e.target.checked)} className="accent-[#E2B74B] mt-0.5"/><span><strong>In CCCD đúng kích thước 85,60 × 53,98 mm</strong><span className="block text-[11px] text-[#94A3B8]">Ảnh scan đã cắt đúng mép thẻ; chọn in 100% / Actual size, không chọn Fit to page.</span></span></label>}
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
