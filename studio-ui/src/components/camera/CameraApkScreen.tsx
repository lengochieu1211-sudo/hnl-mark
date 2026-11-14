import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Film,
  Grid3X3,
  Images,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  AspectRatioMode,
  CameraLens,
  CameraMode,
  MediaItem,
  OrientationDeg,
  VideoFps,
  VideoQualityLevel,
  VideoResolution,
  VideoSettings,
  WatermarkConfig,
} from '../../types/hnl';
import { DEMO_IMAGES, DEFAULT_IMAGE_EDITS } from '../../data/mockMedia';
import { WatermarkOverlay } from '../watermark/WatermarkOverlay';
import { setAndroidCameraActive } from '../../services/deviceBridge';
import { createStampedVideoCapture } from '../../services/stampedVideoCapture';
import {createTimemarkCode} from '../../services/timemarkRenderer';

interface CameraApkScreenProps {
  watermarkConfig: WatermarkConfig;
  recentMedia: MediaItem[];
  onCloseCamera: () => void;
  onOpenLibrary: () => void;
  onCapturePhoto: (item: MediaItem) => Promise<void>;
  onSaveVideo: (item: MediaItem) => Promise<void>;
  onShareMedia: (item: MediaItem) => void;
  isLandscapeViewport?: boolean;
}

const ORIENTATION_CYCLE: OrientationDeg[] = [0, 90, -90, 180];
const ASPECT_CYCLE: AspectRatioMode[] = ['4:3', '16:9', '1:1', 'full'];

export const CameraApkScreen: React.FC<CameraApkScreenProps> = ({
  watermarkConfig,
  recentMedia,
  onCloseCamera,
  onOpenLibrary,
  onCapturePhoto,
  onSaveVideo,
  onShareMedia,
  isLandscapeViewport = false,
}) => {
  const [mode, setMode] = useState<CameraMode>('photo');
  const [lens, setLens] = useState<CameraLens>('rear');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [burstMode, setBurstMode] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>(watermarkConfig.defaultAspectRatio || '4:3');
  const [orientationDeg, setOrientationDeg] = useState<OrientationDeg>(0);
  const [previewCode,setPreviewCode]=useState(()=>createTimemarkCode());

  // Video state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecordingStarting, setIsRecordingStarting] = useState(false);
  const startPendingRef = useRef(false);
  const recordStartedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const [isPaused,setIsPaused] = useState(false);
  const stampedCaptureRef = useRef<{stop:()=>void}|null>(null);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [showVideoQualityPopup, setShowVideoQualityPopup] = useState<boolean>(false);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    resolution: '1080p',
    fps: 60,
    quality: 'Cao',
  });
  const [lastRecordedVideo, setLastRecordedVideo] = useState<MediaItem | null>(null);
  const [showVideoReview, setShowVideoReview] = useState<boolean>(false);
  const [isReviewPlaying, setIsReviewPlaying] = useState<boolean>(false);
  const [reviewProgressPct, setReviewProgressPct] = useState<number>(0);

  // Transient pinch zoom & tap-to-focus (never permanent clutter)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showZoomBadge, setShowZoomBadge] = useState<boolean>(false);
  const zoomHideTimerRef = useRef<number | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  const [focusPoint, setFocusPoint] = useState<{ xPct: number; yPct: number; key: number } | null>(null);
  const [exposureFactor,setExposureFactor] = useState(1);
  const [focusFeedback,setFocusFeedback] = useState('');
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLVideoElement|null>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const audioStreamRef = useRef<MediaStream|null>(null);
  const recorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [cameraError,setCameraError] = useState<string>('');
  const [cameraReady,setCameraReady] = useState(false);
  const [cameraRetryKey,setCameraRetryKey] = useState(0);
  const [audioUnavailable,setAudioUnavailable] = useState(false);
  useEffect(()=>{
    const changed=(ev:Event)=>{const angle=(ev as CustomEvent<{angle:number}>).detail?.angle;
      if(angle===0)setOrientationDeg(0);else if(angle===90)setOrientationDeg(90);
      else if(angle===180)setOrientationDeg(180);else if(angle===270)setOrientationDeg(-90);
    };
    window.addEventListener('hnl-studio:orientation',changed);
    return ()=>window.removeEventListener('hnl-studio:orientation',changed);
  },[]);
  useEffect(()=>{
    let closed=false;setCameraReady(false);setCameraError('');setAudioUnavailable(false);
    const start=async()=>{
      try{
        if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera WebView không khả dụng trên thiết bị này.');
        const video={facingMode:{ideal:lens==='rear'?'environment':'user'},
          width:{ideal:videoSettings.resolution==='4K'?3840:videoSettings.resolution==='1080p'?1920:1280},
          height:{ideal:videoSettings.resolution==='4K'?2160:videoSettings.resolution==='1080p'?1080:720},
          frameRate:{ideal:videoSettings.fps}};
        // Open camera independently from the microphone. A failed Android audio source
        // must never take away the camera preview or make VIDEO mode a black screen.
        const stream=await navigator.mediaDevices.getUserMedia({video,audio:false});
        if(closed){stream.getTracks().forEach(t=>t.stop());return;}
        streamRef.current=stream;
        if(liveRef.current){liveRef.current.srcObject=stream;await liveRef.current.play().catch(()=>{});}
        setCameraReady(true);setAndroidCameraActive(true);
      }catch(e){if(!closed)setCameraError(e instanceof Error?e.message:String(e));}
    };
    start();
    return ()=>{closed=true;
      try{if(recorderRef.current&&recorderRef.current.state!=='inactive')recorderRef.current.stop();}catch{}
      streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
      audioStreamRef.current?.getTracks().forEach(t=>t.stop());audioStreamRef.current=null;
      setAndroidCameraActive(false);
    };
    // Resolution change requires reopening camera; never modify a stream in use for recording.
  },[lens,videoSettings.resolution,videoSettings.fps,cameraRetryKey]);


  // A hardware Back/close during recording or commit must not silently lose video.
  useEffect(()=>{(window as any).__hnlStudioRecording=isRecording||isRecordingStarting||isFinalizing;
    return ()=>{(window as any).__hnlStudioRecording=false};},[isRecording,isRecordingStarting,isFinalizing]);
  // Stop and preserve what was recorded when the app becomes hidden/locked.
  useEffect(()=>{const hide=()=>{if(document.hidden&&recorderRef.current&&recorderRef.current.state!=='inactive')recorderRef.current.stop();};
    document.addEventListener('visibilitychange',hide);
    return ()=>document.removeEventListener('visibilitychange',hide);},[]);
  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = window.setInterval(() => {
      if(!pausedAtRef.current)setRecordSeconds(Math.floor((Date.now()-recordStartedAtRef.current-pausedTotalRef.current)/1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  const triggerTransientToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2000);
  };

  const triggerZoomUpdate = (nextZoom: number) => {
    const clamped = Math.min(5, Math.max(1, Number(nextZoom.toFixed(2))));
    setZoomLevel(clamped);
    setShowZoomBadge(true);
    if (zoomHideTimerRef.current) window.clearTimeout(zoomHideTimerRef.current);
    zoomHideTimerRef.current = window.setTimeout(() => {
      setShowZoomBadge(false);
    }, 1250);
  };

  // Pinch-to-zoom handlers
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = getTouchDistance(e.touches);
      pinchStartZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dist = getTouchDistance(e.touches);
      const ratio = dist / pinchStartDistRef.current;
      triggerZoomUpdate(pinchStartZoomRef.current * ratio);
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    // Allow wheel zoom inside viewfinder for desktop preview verification
    const delta = e.deltaY < 0 ? 0.18 : -0.18;
    triggerZoomUpdate(zoomLevel + delta);
  };

  // Tap-to-meter and focus: request actual track constraints when provided by WebView.
  // Software metering is used only as a labeled fallback; it affects previews AND exports.
  const handlePreviewTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current || !liveRef.current) return;
    if (showVideoQualityPopup) { setShowVideoQualityPopup(false); return; }
    if(pinchStartDistRef.current)return;
    const rect=previewRef.current.getBoundingClientRect();
    const x=Math.min(.90,Math.max(.10,(e.clientX-rect.left)/rect.width));
    const y=Math.min(.90,Math.max(.10,(e.clientY-rect.top)/rect.height));
    setFocusPoint({xPct:x*100,yPct:y*100,key:Date.now()});
    const track=streamRef.current?.getVideoTracks()[0];
    let hardwareFocused=false;
    if(track && typeof track.getCapabilities==='function'){
      const caps=track.getCapabilities() as MediaTrackCapabilities & {focusMode?:string[];exposureMode?:string[];pointsOfInterest?:unknown};
      const changes:Record<string,unknown>={};
      if(caps.focusMode?.includes('single-shot'))changes.focusMode='single-shot';
      else if(caps.focusMode?.includes('continuous'))changes.focusMode='continuous';
      if(caps.pointsOfInterest!==undefined)changes.pointsOfInterest=[{x,y}];
      if(caps.exposureMode?.includes('continuous'))changes.exposureMode='continuous';
      if(Object.keys(changes).length){
        try { await track.applyConstraints({advanced:[changes as MediaTrackConstraintSet]}); hardwareFocused=true; }
        catch { /* WebView may advertise but reject camera constraints. */ }
      }
    }
    // Spot metering of the clicked camera region: predictable visual fallback on MIUI.
    // No claim of sensor autofocus/exposure adjustment when the hardware API rejects it.
    try{
      const sample=document.createElement('canvas');sample.width=64;sample.height=64;
      const ctx=sample.getContext('2d',{willReadFrequently:true});
      if(ctx){
        ctx.drawImage(liveRef.current,0,0,64,64);
        const sx=Math.min(56,Math.max(0,Math.round(x*64)-4));
        const sy=Math.min(56,Math.max(0,Math.round(y*64)-4));
        const pixels=ctx.getImageData(sx,sy,8,8).data;
        let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
        const average=sum/64;
        setExposureFactor(Math.max(.72,Math.min(1.5,128/Math.max(40,average))));
      }
    }catch{ /* Preserve preview if this WebView blocks pixel reading. */ }
    setFocusFeedback(hardwareFocused?'Đã gửi yêu cầu lấy nét':'Bù sáng tại điểm chạm (lấy nét tự động)');
    const focusKey=Date.now();
    window.setTimeout(()=>setFocusPoint(current=>current&&current.key<=focusKey?null:current),5500);
  };

  const togglePause = () => {
    const recorder=recorderRef.current;
    if(!recorder || !isRecording)return;
    if(recorder.state==='recording' && typeof recorder.pause==='function'){
      try{recorder.pause();pausedAtRef.current=Date.now();setIsPaused(true);}catch(e){triggerTransientToast('Không thể tạm dừng: '+String(e));}
    }else if(recorder.state==='paused' && typeof recorder.resume==='function'){
      try{recorder.resume();pausedTotalRef.current+=Date.now()-pausedAtRef.current;pausedAtRef.current=0;setIsPaused(false);}
      catch(e){triggerTransientToast('Không thể quay tiếp: '+String(e));}
    }
  };

  const handleCycleOrientation = () => {
    const idx = ORIENTATION_CYCLE.indexOf(orientationDeg);
    const next = ORIENTATION_CYCLE[(idx + 1) % ORIENTATION_CYCLE.length];
    setOrientationDeg(next);
    const label = next === 0 ? '0° (Dọc chuẩn)' : next === 90 ? '90° (Ngang phải)' : next === -90 ? '-90° (Ngang trái)' : '180° (Đảo ngược)';
    triggerTransientToast(`Hướng dấu & khung: ${label}`);
  };

  const handleCycleAspect = () => {
    const idx = ASPECT_CYCLE.indexOf(aspectRatio);
    const next = ASPECT_CYCLE[(idx + 1) % ASPECT_CYCLE.length];
    setAspectRatio(next);
  };

  const activeSceneUrl =
    lens === 'rear' ? DEMO_IMAGES.rearConstruction : DEMO_IMAGES.frontEngineer;

  const handleShutterPress = async () => {
    const live=liveRef.current;
    if(!cameraReady||!live||live.readyState<2){triggerTransientToast('Camera chưa sẵn sàng; kiểm tra quyền truy cập.');return;}
    if(mode==='photo'){
      const count=burstMode?3:1;
      setShutterFlash(true);window.setTimeout(()=>setShutterFlash(false),160);
      for(let i=0;i<count;i++){
        const canvas=document.createElement('canvas');canvas.width=live.videoWidth;canvas.height=live.videoHeight;
        const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không khởi tạo được Canvas');
        if(lens==='front'){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
        const w=canvas.width/zoomLevel,h=canvas.height/zoomLevel;
        ctx.filter=`brightness(${exposureFactor})`;
        ctx.drawImage(live,(canvas.width-w)/2,(canvas.height-h)/2,w,h,0,0,canvas.width,canvas.height);
        ctx.filter='none';
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Không xuất được ảnh')),'image/jpeg',.95));
        const at=new Date();const item:MediaItem={id:`cam-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`,
          title:`Ảnh HNL ${at.toLocaleString('vi-VN')}`,kind:'photo',origin:'newly-picked',url:URL.createObjectURL(blob),rawBlob:blob,
          createdAt:at.toISOString(),resolutionLabel:`${canvas.width} × ${canvas.height}`,
          sizeLabel:`${(blob.size/1048576).toFixed(1)} MB`,location:watermarkConfig.locationText,
          coordinates:watermarkConfig.coordinates,photoCode:i===0?previewCode:createTimemarkCode(),
          customNote:watermarkConfig.customNote,templateId:watermarkConfig.templateId,
          orientationDeg:watermarkTurn, captureWatermark:{...watermarkConfig},edits:{...DEFAULT_IMAGE_EDITS}};
        await onCapturePhoto(item);
        setPreviewCode(createTimemarkCode());
        if(i<count-1)await new Promise(resolve=>window.setTimeout(resolve,230));
      }
      // Quiet success: only the camera shutter flash and updated thumbnail signal a saved photo.
      return;
    }
    if(isFinalizing||isRecordingStarting||startPendingRef.current)return;
    if(!isRecording){
      startPendingRef.current=true;setIsRecordingStarting(true);
      try{
      const stream=streamRef.current;if(!stream||!stream.active)throw Error('Camera chưa sẵn sàng');
      if(typeof MediaRecorder==='undefined')throw Error('WebView không hỗ trợ MediaRecorder');
      let audio:MediaStream|null=null;
      try{
        audio=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
        if(!audio.getAudioTracks().some(t=>t.readyState==='live'))throw Error('Không có đường tiếng hoạt động');
        audioStreamRef.current=audio;
        setAudioUnavailable(false);
      }catch(e){
        audio?.getTracks().forEach(t=>t.stop());
        audioStreamRef.current=null;setAudioUnavailable(true);
        triggerTransientToast('Micro không khả dụng. Bật quyền Micro cho HNL Mark trong Cài đặt Android.');
      }
      if(streamRef.current!==stream||!stream.active){
        audioStreamRef.current?.getTracks().forEach(t=>t.stop());audioStreamRef.current=null;return;
      }
      const photoCode=previewCode;
      // Apply physical rotation only if the UI viewport itself is portrait-locked.
      const orientation:OrientationDeg=watermarkTurn;
      const stampConfig={...watermarkConfig};
      const capture=await createStampedVideoCapture(live,stampConfig,orientation,photoCode,lens,zoomLevel,exposureFactor,videoSettings.fps);
      stampedCaptureRef.current=capture;
      const hasAudio=!!audioStreamRef.current?.getAudioTracks().some(t=>t.readyState==='live');
      const recStream=new MediaStream([...capture.stream.getVideoTracks(),...(hasAudio?audioStreamRef.current!.getAudioTracks():[])]);
      const codecs=hasAudio
        ? ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm','video/mp4']
        : ['video/webm;codecs=vp8','video/webm','video/mp4'];
      const type=codecs.find(t=>MediaRecorder.isTypeSupported(t));
      if(!type)throw Error('Codec video có dấu không được hỗ trợ trên WebView.');
      const rec=new MediaRecorder(recStream,{mimeType:type,videoBitsPerSecond:videoSettings.quality==='Tối đa'?8000000:videoSettings.quality==='Cao'?5000000:2500000});
      recorderRef.current=rec;chunksRef.current=[];
      rec.ondataavailable=e=>{if(e.data?.size)chunksRef.current.push(e.data);};
      rec.onerror=()=>triggerTransientToast('Lỗi ghi video; vui lòng kiểm tra lại.');
      rec.onstop=async()=>{
        if(recorderRef.current===rec)recorderRef.current=null;
        stampedCaptureRef.current?.stop();stampedCaptureRef.current=null;
        if(pausedAtRef.current){pausedTotalRef.current+=Date.now()-pausedAtRef.current;pausedAtRef.current=0;}
        setIsPaused(false);
        audioStreamRef.current?.getTracks().forEach(t=>t.stop());audioStreamRef.current=null;
        setIsFinalizing(true);
        const live=liveRef.current,source=streamRef.current;
        if(live&&source&&source.active){if(live.srcObject!==source)live.srcObject=source;void live.play().catch(()=>{});}
        const chunks=chunksRef.current.splice(0);const blob=new Blob(chunks,{type:rec.mimeType||type});
        setIsRecording(false);
        if(!blob.size){triggerTransientToast('Không ghi được video.');setIsFinalizing(false);return;}
        const date=new Date(),item:MediaItem={id:`video-${Date.now()}`,title:`Video HNL ${date.toLocaleString('vi-VN')}`,
          kind:'video',origin:'newly-picked',rawBlob:blob,url:URL.createObjectURL(blob),createdAt:date.toISOString(),
          durationSec:Math.max(1,Math.round((Date.now()-recordStartedAtRef.current-pausedTotalRef.current)/1000)),resolutionLabel:`${videoSettings.resolution} · tối đa ${videoSettings.fps} FPS`,
          sizeLabel:`${(blob.size/1048576).toFixed(1)} MB`,location:watermarkConfig.locationText,coordinates:watermarkConfig.coordinates,
          photoCode,customNote:watermarkConfig.customNote,templateId:watermarkConfig.templateId,
          orientationDeg:orientation,captureWatermark:stampConfig,isStamped:stampConfig.templateId==='timemark',edits:{...DEFAULT_IMAGE_EDITS}};
        try{await onSaveVideo(item);setPreviewCode(createTimemarkCode());setLastRecordedVideo(item);setShowVideoReview(false);setIsReviewPlaying(false);}
        catch(e){triggerTransientToast('Không lưu được video gốc: '+String(e));}
        finally{setIsFinalizing(false);}

      };
      rec.start(1000);pausedAtRef.current=0;pausedTotalRef.current=0;setIsPaused(false);recordStartedAtRef.current=Date.now();setRecordSeconds(0);setIsRecording(true);setShowVideoQualityPopup(false);
      }catch(e){
        stampedCaptureRef.current?.stop();stampedCaptureRef.current=null;
        audioStreamRef.current?.getTracks().forEach(t=>t.stop());audioStreamRef.current=null;
        triggerTransientToast('Không khởi tạo được video: '+String(e));
        if(liveRef.current&&streamRef.current?.active)void liveRef.current.play().catch(()=>{});
      }finally{startPendingRef.current=false;setIsRecordingStarting(false);}
    }else if(recorderRef.current&&recorderRef.current.state!=='inactive'){setIsFinalizing(true);recorderRef.current.stop();}
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const latestItem = recentMedia[0];
  const latestThumb = latestItem?.kind === 'photo' ? latestItem.url : null;

  const previewAspectStyle = (): React.CSSProperties => {
    if (aspectRatio === '1:1') return { aspectRatio: '1 / 1', maxHeight: '100%' };
    if (aspectRatio === '4:3') return { aspectRatio: isLandscapeViewport ? '4 / 3' : '3 / 4', maxHeight: '100%' };
    if (aspectRatio === '16:9') return { aspectRatio: isLandscapeViewport ? '16 / 9' : '9 / 16', maxHeight: '100%' };
    return { width: '100%', height: '100%' };
  };

  const watermarkTurn: OrientationDeg = isLandscapeViewport ? 0 : orientationDeg;
  const iconRotationStyle: React.CSSProperties = {
    transform: isLandscapeViewport ? 'none' : `rotate(${orientationDeg}deg)`,
    transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
  };

  // Render Video Review Overlay (after stopping recording or reopening last video)
  if (showVideoReview && lastRecordedVideo) {
    return (
      <div className="relative w-full h-full bg-[#04070E] text-[#F8FAFC] flex flex-col justify-between select-none overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-3 py-2.5 bg-[#060B14]/90 border-b border-white/10 z-20"
          style={{ paddingTop: 'max(10px, var(--hnl-safe-top))' }}
        >
          <button
            type="button"
            onClick={() => {
              setIsReviewPlaying(false);
              setShowVideoReview(false);
            }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-[#F8FAFC]"
            aria-label="Đóng xem lại video"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center min-w-0">
            <div className="text-sm font-semibold truncate">Xem lại Video</div>
            <div className="text-[11px] text-[#94A3B8] font-mono-tabular">
              {lastRecordedVideo.resolutionLabel} · {formatDuration(lastRecordedVideo.durationSec || 1)}
            </div>
          </div>
          <div className="w-[44px]" />
        </div>

        {/* Video Canvas */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black p-2">
          <div className="relative w-full max-w-2xl h-full max-h-[72vh] rounded-xl overflow-hidden bg-[#08101E]">
            <video
              src={lastRecordedVideo.url}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Scrubber + Save / Share Actions */}
        <div
          className="px-4 py-3 bg-[#091220] border-t border-white/10 space-y-3 z-20"
          style={{ paddingBottom: 'max(14px, var(--hnl-safe-bottom))' }}
        >
          <p className="text-[11px] text-[#94A3B8]">Video được ghi từ camera thực tế. Dùng trình phát ở trên để tua hoặc phát lại.</p>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsReviewPlaying(false);
                setShowVideoReview(false);
              }}
              className="min-h-[44px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-medium text-[#F8FAFC]"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveVideo(lastRecordedVideo);
                setShowVideoReview(false);
              }}
              className="min-h-[44px] px-3 rounded-xl bg-[#E2B74B] hover:bg-[#ECC768] text-[#060B14] text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Lưu thư viện
            </button>
            <button
              type="button"
              onClick={() => onShareMedia(lastRecordedVideo)}
              className="min-h-[44px] px-3 rounded-xl bg-[#162642] hover:bg-[#1E3256] text-xs font-medium text-[#F8FAFC] flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              Chia sẻ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full bg-[#03060B] text-[#F8FAFC] flex ${
        isLandscapeViewport ? 'flex-row' : 'flex-col'
      } overflow-hidden select-none`}
    >
      {/* 1. SLIM TOP TOOLBAR (Portrait: top bar; Landscape: left slim rail) */}
      <div
        className={`z-30 bg-[#060B14]/88 backdrop-blur-md border-white/[0.08] shrink-0 flex ${
          isLandscapeViewport
            ? 'flex-col items-center justify-between w-14 py-3 border-r'
            : 'flex-row items-center justify-between px-2.5 py-1.5 border-b'
        }`}
        style={
          isLandscapeViewport
            ? { paddingLeft: 'var(--hnl-safe-left)' }
            : { paddingTop: 'max(6px, var(--hnl-safe-top))' }
        }
      >
        <button
          type="button"
          onClick={() => {
            if (isRecording || isRecordingStarting || isFinalizing || recorderRef.current?.state==='recording') {
              triggerTransientToast('Hãy dừng quay và chờ lưu video hoàn tất trước khi thoát.');
              return;
            }
            onCloseCamera();
          }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#F8FAFC] hover:bg-white/10 active:scale-95 transition"
          aria-label="Đóng camera về trang chính"
          title="Đóng camera"
        >
          <X className="w-5 h-5" style={iconRotationStyle} />
        </button>

        <div className={`flex items-center gap-1 ${isLandscapeViewport ? 'flex-col' : 'flex-row'}`}>
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition ${
              showGrid ? 'text-[#E2B74B] bg-[#E2B74B]/12' : 'text-[#94A3B8] hover:bg-white/10'
            }`}
            aria-label="Bật tắt lưới bố cục"
            title="Lưới 3×3"
          >
            <Grid3X3 className="w-[19px] h-[19px]" style={iconRotationStyle} />
          </button>

          <button
            type="button"
            onClick={handleCycleOrientation}
            className={`min-w-[44px] min-h-[44px] px-1.5 flex items-center justify-center gap-1 rounded-full transition ${
              orientationDeg !== 0
                ? 'text-[#E2B74B] bg-[#E2B74B]/12'
                : 'text-[#94A3B8] hover:bg-white/10'
            }`}
            aria-label="Xoay thủ công khi khóa xoay Android"
            title="Xoay thủ công 0° / 90° / -90° / 180°"
          >
            <RotateCw className="w-[18px] h-[18px]" style={iconRotationStyle} />
            <span className="text-[11px] font-mono-tabular font-medium">
              {orientationDeg}°
            </span>
          </button>

          <button
            type="button"
            onClick={handleCycleAspect}
            className="min-w-[44px] min-h-[44px] px-2 flex items-center justify-center rounded-full text-[#F8FAFC] hover:bg-white/10 transition text-[12px] font-mono-tabular font-medium"
            aria-label="Đổi tỷ lệ khung hình"
            title="Tỷ lệ khung hình"
          >
            {aspectRatio === 'full' ? 'FULL' : aspectRatio}
          </button>

          {mode === 'video' && (
            <button
              type="button"
              disabled={isRecording || isRecordingStarting || isFinalizing}
               onClick={() => setShowVideoQualityPopup((p) => !p)}
              className={`min-w-[44px] min-h-[44px] px-2 flex items-center justify-center gap-1 rounded-full transition text-[11px] font-mono-tabular font-semibold ${
                showVideoQualityPopup
                  ? 'bg-[#E2B74B] text-[#060B14]'
                  : 'bg-white/[0.08] text-[#E2B74B] hover:bg-white/15'
              }`}
              aria-label="Tùy chỉnh chất lượng video"
              title="Độ phân giải, FPS và chất lượng"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {!isLandscapeViewport && <span>{videoSettings.resolution}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Video Quality Popup (Clean floating popover, zero frame clutter) */}
      {mode === 'video' && showVideoQualityPopup && (
        <div
          className={`absolute z-40 w-[260px] max-w-[calc(100%-24px)] rounded-2xl bg-[#0D1729]/95 backdrop-blur-xl border border-white/15 p-3.5 shadow-2xl space-y-3 ${
            isLandscapeViewport ? 'top-3 left-16' : 'top-14 right-3'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#F8FAFC]">Chất lượng Video</span>
            <button
              type="button"
              onClick={() => setShowVideoQualityPopup(false)}
              className="text-xs text-[#94A3B8] hover:text-white px-1.5 py-0.5"
            >
              Xong
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] text-[#94A3B8]">Độ phân giải</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['720p', '1080p', '4K'] as VideoResolution[]).map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setVideoSettings((s) => ({ ...s, resolution: res }))}
                  className={`min-h-[36px] rounded-lg text-xs font-mono-tabular font-medium transition ${
                    videoSettings.resolution === res
                      ? 'bg-[#E2B74B] text-[#060B14] font-semibold'
                      : 'bg-white/[0.06] text-[#F8FAFC] hover:bg-white/10'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] text-[#94A3B8]">Tốc độ khung hình (FPS)</div>
            <div className="grid grid-cols-3 gap-1.5">
              {([24, 30, 60] as VideoFps[]).map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => setVideoSettings((s) => ({ ...s, fps }))}
                  className={`min-h-[36px] rounded-lg text-xs font-mono-tabular font-medium transition ${
                    videoSettings.fps === fps
                      ? 'bg-[#E2B74B] text-[#060B14] font-semibold'
                      : 'bg-white/[0.06] text-[#F8FAFC] hover:bg-white/10'
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] text-[#94A3B8]">Mức nén &amp; Bitrate</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Chuẩn', 'Cao', 'Tối đa'] as VideoQualityLevel[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setVideoSettings((s) => ({ ...s, quality: q }))}
                  className={`min-h-[36px] rounded-lg text-xs font-medium transition ${
                    videoSettings.quality === q
                      ? 'bg-[#E2B74B] text-[#060B14] font-semibold'
                      : 'bg-white/[0.06] text-[#F8FAFC] hover:bg-white/10'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. LARGE CAMERA VIEWFINDER PREVIEW (No stray white lines or corner frame brackets) */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-[#020408] p-1 sm:p-2 overflow-hidden">
        <div
          ref={previewRef}
          onClick={handlePreviewTap}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheelZoom}
          style={previewAspectStyle()}
          className="relative w-full h-full max-w-full max-h-full overflow-hidden rounded-xl bg-[#070E1A] flex items-center justify-center touch-none cursor-crosshair"
        >
          {/* Live camera stream — never an illustrative/mock photo. */}
          <video ref={liveRef} autoPlay playsInline muted
            aria-label="Khung ngắm camera trực tiếp"
            style={{transform:`scale(${zoomLevel}) ${lens==='front'?'scaleX(-1)':''}`,filter:`brightness(${exposureFactor})`,transition:'transform 110ms ease-out'}}
            className="w-full h-full object-cover select-none pointer-events-none" />
          {cameraReady && mode==='video' && isRecording && audioUnavailable && <div role="status" className="absolute top-14 left-3 z-20 max-w-[70%] rounded-md bg-[#7F1D1D]/90 px-2 py-1 text-left text-[11px] text-white pointer-events-none">Micro tắt · Video không tiếng</div>}
          {!cameraReady && <div className="absolute inset-0 z-10 flex flex-col gap-3 items-center justify-center p-6 bg-[#071121] text-center">
            <p className="text-sm text-[#F8FAFC]">{cameraError||'Đang mở camera thực tế…'}</p>
            <button type="button" onClick={()=>{setCameraError('');setCameraRetryKey(k=>k+1);}} className="rounded-xl bg-[#E2B74B] px-4 py-2 text-[#071121] font-bold text-sm">Thử mở lại camera</button>
          </div>}

          {/* Optional 3x3 Composition Grid */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/18" />
              <div className="border-r border-b border-white/18" />
              <div className="border-b border-white/18" />
              <div className="border-r border-b border-white/18" />
              <div className="border-r border-b border-white/18" />
              <div className="border-b border-white/18" />
              <div className="border-r border-white/18" />
              <div className="border-r border-white/18" />
              <div />
            </div>
          )}

          {/* Watermark sits cleanly ON preview without control occlusion */}
          <WatermarkOverlay config={watermarkConfig} orientationDeg={watermarkTurn} photoCode={previewCode} />

          {/* Recording live timer */}
          {isRecording && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-[#060B14]/80 backdrop-blur-md border border-[#EF4444]/40 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="text-xs font-mono-tabular font-semibold text-white">
                {formatDuration(recordSeconds)}{isPaused?' · TẠM DỪNG':''}
              </span>
              <span className="text-[11px] font-mono-tabular text-[#94A3B8]">
                {videoSettings.resolution}
              </span>
            </div>
          )}

          {/* Transient Zoom Readout (only shown while zooming) */}
          {showZoomBadge && (
            <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-sm text-[#E2B74B] text-xs font-mono-tabular font-semibold pointer-events-none">
              {zoomLevel.toFixed(1)}×
            </div>
          )}

          {/* Transient Tap-to-Focus Reticle */}
          {focusPoint && (
            <div
              key={focusPoint.key}
              style={{ left: `${focusPoint.xPct}%`, top: `${focusPoint.yPct}%` }}
              className="animate-focus-reticle absolute z-20 w-14 h-14 rounded-full border-[1.5px] border-[#E2B74B] pointer-events-none flex items-center justify-center"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E2B74B]" />
            </div>
          )}

          {focusPoint && (
            <div className="absolute z-30 flex items-center gap-2 rounded-lg bg-[#091423]/90 px-2 py-1.5 shadow-lg"
              style={{top:`${Math.min(85,focusPoint.yPct+6)}%`,left:`${Math.max(5,Math.min(45,focusPoint.xPct-20))}%`}}
              onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}>
              <span className="text-[10px] text-[#E2B74B]">Sáng</span>
              <input type="range" min="0.72" max="1.5" step="0.02" value={exposureFactor}
                aria-label="Bù sáng tại điểm chạm" className="w-24 accent-[#E2B74B]"
                onChange={e=>setExposureFactor(Number(e.target.value))}/>
              <span className="text-[10px] tabular-nums">{Math.round(exposureFactor*100)}%</span>
              <span className="sr-only">{focusFeedback}</span>
            </div>
          )}

          {/* Shutter flash feedback */}
          {shutterFlash && (
            <div className="absolute inset-0 z-30 bg-white/75 pointer-events-none transition-opacity duration-100" />
          )}

          {/* Transient feedback toast */}
          {toastMsg && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 max-w-[90%] px-3 py-1.5 rounded-lg bg-[#0B1424]/92 border border-[#E2B74B]/35 text-[12px] text-[#F8FAFC] whitespace-nowrap truncate shadow-lg">
              {toastMsg}
            </div>
          )}
        </div>
      </div>

      {/* 3. FIXED BOTTOM / RIGHT SHUTTER CONTROL CLUSTER */}
      <div
        className={`z-30 bg-[#060B14]/94 backdrop-blur-md border-white/[0.08] shrink-0 flex ${
          isLandscapeViewport
            ? 'flex-col-reverse items-center justify-between w-28 py-3 px-2 border-l'
            : 'flex-col gap-2.5 px-4 pt-2.5 pb-3 border-t'
        }`}
        style={
          isLandscapeViewport
            ? { paddingRight: 'max(8px, var(--hnl-safe-right))' }
            : { paddingBottom: 'max(14px, var(--hnl-safe-bottom))' }
        }
      >
        {/* Mode Switcher (ẢNH / VIDEO) + Burst Toggle + Reopen Last Video */}
        <div
          className={`flex items-center justify-between gap-2 ${
            isLandscapeViewport ? 'flex-col w-full' : 'w-full'
          }`}
        >
          {/* Reopen last recorded video if closed */}
          {lastRecordedVideo && !isRecording && !isLandscapeViewport ? (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="min-h-[36px] px-2.5 rounded-lg bg-[#121F36] text-[11px] font-medium text-[#E2B74B] flex items-center gap-1.5 hover:bg-[#192B4A] transition shrink-0"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Xem video</span>
            </button>
          ) : (
            <div className={isLandscapeViewport ? 'hidden' : 'w-16'} />
          )}

          {/* Mode Toggle */}
          <div className={`flex items-center bg-[#111C30] p-0.5 rounded-xl border border-white/[0.07] ${isLandscapeViewport ? 'flex-col w-full' : 'flex-row'}`}>
            <button
              type="button"
              disabled={isRecording || isRecordingStarting || isFinalizing}
              onClick={() => {
                setMode('photo');
                setShowVideoQualityPopup(false);
              }}
              className={`min-h-[34px] ${isLandscapeViewport ? 'w-full px-1' : 'px-3.5'} rounded-[10px] text-xs font-semibold tracking-wide transition ${
                mode === 'photo'
                  ? 'bg-[#E2B74B] text-[#060B14]'
                  : 'text-[#94A3B8] hover:text-white'
              } disabled:opacity-40`}
            >
              ẢNH
            </button>
            <button
              type="button"
              disabled={isRecording || isRecordingStarting || isFinalizing}
              onClick={() => {if(!isRecording)setMode('video');}}
              className={`min-h-[34px] ${isLandscapeViewport ? 'w-full px-1' : 'px-3.5'} rounded-[10px] text-xs font-semibold tracking-wide transition ${
                mode === 'video'
                  ? 'bg-[#E2B74B] text-[#060B14]'
                  : 'text-[#94A3B8] hover:text-white'
              } disabled:opacity-40`}
            >
              VIDEO
            </button>
          </div>

          {/* Burst mode button */}
          {mode === 'photo' ? (
            <button
              type="button"
              onClick={() => setBurstMode((b) => !b)}
              className={`min-h-[36px] px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition shrink-0 ${
                burstMode
                  ? 'bg-[#E2B74B]/20 text-[#E2B74B] border border-[#E2B74B]/50'
                  : 'bg-white/[0.06] text-[#94A3B8] hover:text-white'
              }`}
              aria-pressed={burstMode}
              title="Bật/tắt chụp liên tiếp"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Liên tiếp</span>
            </button>
          ) : (
            <div className={isLandscapeViewport ? 'hidden' : 'w-16'} />
          )}
        </div>

        {/* Fixed 3-Item Shutter Row (Left: Gallery | Center: Shutter | Right: Flip) */}
        <div
          className={`flex items-center justify-between ${
            isLandscapeViewport ? 'flex-col-reverse gap-4 w-full' : 'w-full max-w-md mx-auto px-2'
          }`}
        >
          {/* Left: Gallery Picker Thumbnail */}
          <button
            type="button"
            disabled={isRecording || isRecordingStarting || isFinalizing}
            onClick={onOpenLibrary}
            className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/25 bg-[#111C30] flex items-center justify-center hover:border-[#E2B74B] active:scale-95 transition disabled:opacity-40"
            aria-label="Xem ảnh, video đã chụp"
            title="Xem lại ảnh và video đã chụp"
          >
            {latestThumb ? <img
              src={latestThumb}
              alt="Ảnh gần nhất trong thư viện HNL Mark"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            /> : latestItem?.kind === 'video' ? <Film className="w-6 h-6 text-[#E2B74B]" aria-label="Video đã quay" /> : <Images className="w-6 h-6 text-[#E2B74B]" />}
            <span className="absolute inset-0 bg-black/20 flex items-end justify-end p-1">
              <Images className="w-3.5 h-3.5 text-white drop-shadow" />
            </span>
          </button>

          {/* Center: Commercial Shutter / Record Button */}
          <button
            type="button"
            disabled={isRecordingStarting || isFinalizing}
             onClick={()=>{handleShutterPress().catch(e=>triggerTransientToast('Lỗi chụp/quay: '+String(e)));}}
            aria-label={
              mode === 'photo'
                ? 'Chụp ảnh'
                : isRecording
                  ? 'Dừng quay video'
                  : 'Bắt đầu quay video'
            }
            className="relative w-[72px] h-[72px] rounded-full border-[3px] border-[#F8FAFC] flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2B74B]"
          >
            {mode === 'photo' ? (
              <span
                className={`w-[58px] h-[58px] rounded-full transition-colors ${
                  burstMode ? 'bg-[#E2B74B]' : 'bg-[#F8FAFC]'
                } flex items-center justify-center`}
              >
                {burstMode && (
                  <span className="text-[11px] font-mono-tabular font-bold text-[#060B14]">×3</span>
                )}
              </span>
            ) : isRecording ? (
              <span className="w-7 h-7 rounded-md bg-[#EF4444] transition-all" />
            ) : (
              <span className="w-[56px] h-[56px] rounded-full bg-[#EF4444] transition-all" />
            )}
          </button>

          {/* While recording, keep the same fixed control slot for Pause/Resume. */}
          {isRecording && <button type="button" onClick={togglePause}
            className="w-12 h-12 rounded-full bg-[#19253D] border border-[#E2B74B]/50 text-[#E2B74B] flex items-center justify-center"
            aria-label={isPaused?'Tiếp tục quay video':'Tạm dừng quay video'}
            title={isPaused?'Tiếp tục quay':'Tạm dừng'}>
            {isPaused?<Play className="w-5 h-5"/>:<Pause className="w-5 h-5"/>}
          </button>}
          {/* Right: Flip Front / Rear Camera */}
          <button
            type="button"
            disabled={isRecording || isRecordingStarting || isFinalizing}
            style={isRecording?{display:'none'}:undefined}
            onClick={() => {
              setLens((l) => (l === 'rear' ? 'front' : 'rear'));
              triggerTransientToast(lens === 'rear' ? 'Đã chuyển Camera trước' : 'Đã chuyển Camera sau');
            }}
            className="w-12 h-12 rounded-full bg-[#111C30] border border-white/10 hover:bg-[#192844] text-[#F8FAFC] flex items-center justify-center active:scale-95 transition disabled:opacity-40"
            aria-label="Đổi camera trước và sau"
            title="Đổi camera trước/sau"
          >
            <RefreshCw className="w-5 h-5" style={iconRotationStyle} />
          </button>
        </div>
      </div>
    </div>
  );
};
