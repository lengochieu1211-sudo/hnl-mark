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

  // Video state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecordingStarting, setIsRecordingStarting] = useState(false);
  const startPendingRef = useRef(false);
  const recordStartedAtRef = useRef(0);
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
      try{if(recorderRef.current?.state==='recording')recorderRef.current.stop();}catch{}
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
  useEffect(()=>{const hide=()=>{if(document.hidden&&recorderRef.current?.state==='recording')recorderRef.current.stop();};
    document.addEventListener('visibilitychange',hide);
    return ()=>document.removeEventListener('visibilitychange',hide);},[]);
  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = window.setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
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

  // Tap-to-focus handler
  const handlePreviewTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    if (showVideoQualityPopup) {
      setShowVideoQualityPopup(false);
      return;
    }
    const rect = previewRef.current.getBoundingClientRect();
    const xPct = Math.min(90, Math.max(10, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(90, Math.max(10, ((e.clientY - rect.top) / rect.height) * 100));
    setFocusPoint({ xPct, yPct, key: Date.now() });
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
        ctx.drawImage(live,(canvas.width-w)/2,(canvas.height-h)/2,w,h,0,0,canvas.width,canvas.height);
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Không xuất được ảnh')),'image/jpeg',.95));
        const at=new Date();const item:MediaItem={id:`cam-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`,
          title:`Ảnh HNL ${at.toLocaleString('vi-VN')}`,kind:'photo',origin:'newly-picked',url:URL.createObjectURL(blob),rawBlob:blob,
          createdAt:at.toISOString(),resolutionLabel:`${canvas.width} × ${canvas.height}`,
          sizeLabel:`${(blob.size/1048576).toFixed(1)} MB`,location:watermarkConfig.locationText,
          coordinates:watermarkConfig.coordinates,photoCode:`HNL-${Date.now()}-${i}`,
          customNote:watermarkConfig.customNote,templateId:watermarkConfig.templateId,edits:{...DEFAULT_IMAGE_EDITS}};
        await onCapturePhoto(item);
        if(i<count-1)await new Promise(resolve=>window.setTimeout(resolve,230));
      }
      // Quiet success: only the camera shutter flash and updated thumbnail signal a saved photo.
      return;
    }
    if(isFinalizing||isRecordingStarting||startPendingRef.current)return;
    if(!isRecording){
      startPendingRef.current=true;setIsRecordingStarting(true);
      try{
      const stream=streamRef.current;if(!stream)throw Error('Camera chưa sẵn sàng');
      if(typeof MediaRecorder==='undefined'){triggerTransientToast('Thiết bị không hỗ trợ ghi video WebM.');return;}
      const type=['video/webm;codecs=vp8,opus','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
      if(!type){triggerTransientToast('Không tìm thấy codec video được hỗ trợ.');return;}
      let recordStream=stream;
      // Microphone can be unavailable in MIUI WebView. VIDEO still records silently.
      try {
        const audio=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
        audioStreamRef.current=audio;
        recordStream=new MediaStream([...stream.getVideoTracks(),...audio.getAudioTracks()]);
        setAudioUnavailable(false);
      } catch(e) {
        setAudioUnavailable(true);
        triggerTransientToast('Micro không khả dụng: video sẽ quay không tiếng.');
      }
      if(streamRef.current!==stream||!stream.active){audioStreamRef.current?.getTracks().forEach(t=>t.stop());audioStreamRef.current=null;return;}
      const chosenType=audioStreamRef.current?type:(['video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t))||type);
      const rec=new MediaRecorder(recordStream,{mimeType:chosenType,videoBitsPerSecond:videoSettings.quality==='Tối đa'?8000000:videoSettings.quality==='Cao'?5000000:2500000});
      recorderRef.current=rec;chunksRef.current=[];
      rec.ondataavailable=e=>{if(e.data?.size)chunksRef.current.push(e.data);};
      rec.onerror=()=>triggerTransientToast('Lỗi ghi video; vui lòng kiểm tra lại.');
      rec.onstop=async()=>{
        if(recorderRef.current===rec)recorderRef.current=null;
        audioStreamRef.current?.getTracks().forEach(t=>t.stop());audioStreamRef.current=null;
        setIsFinalizing(true);
        const live=liveRef.current,source=streamRef.current;
        if(live&&source&&source.active){if(live.srcObject!==source)live.srcObject=source;void live.play().catch(()=>{});}
        const chunks=chunksRef.current.splice(0);const blob=new Blob(chunks,{type:rec.mimeType||chosenType});
        setIsRecording(false);
        if(!blob.size){triggerTransientToast('Không ghi được video.');setIsFinalizing(false);return;}
        const date=new Date(),item:MediaItem={id:`video-${Date.now()}`,title:`Video HNL ${date.toLocaleString('vi-VN')}`,
          kind:'video',origin:'newly-picked',rawBlob:blob,url:URL.createObjectURL(blob),createdAt:date.toISOString(),
          durationSec:Math.max(1,Math.round((Date.now()-recordStartedAtRef.current)/1000)),resolutionLabel:`${videoSettings.resolution} · tối đa ${videoSettings.fps} FPS`,
          sizeLabel:`${(blob.size/1048576).toFixed(1)} MB`,location:watermarkConfig.locationText,coordinates:watermarkConfig.coordinates,
          photoCode:`HNL-V${Date.now()}`,customNote:watermarkConfig.customNote,templateId:watermarkConfig.templateId,edits:{...DEFAULT_IMAGE_EDITS}};
        try{await onSaveVideo(item);setLastRecordedVideo(item);setShowVideoReview(false);setIsReviewPlaying(false);}
        catch(e){triggerTransientToast('Không lưu được video gốc: '+String(e));}
        finally{setIsFinalizing(false);}

      };
      rec.start(1000);recordStartedAtRef.current=Date.now();setRecordSeconds(0);setIsRecording(true);setShowVideoQualityPopup(false);
      }catch(e){
        audioStreamRef.current?.getTracks().forEach(t=>t.stop());audioStreamRef.current=null;
        triggerTransientToast('Không khởi tạo được video: '+String(e));
        if(liveRef.current&&streamRef.current?.active)void liveRef.current.play().catch(()=>{});
      }finally{startPendingRef.current=false;setIsRecordingStarting(false);}
    }else if(recorderRef.current?.state==='recording'){setIsFinalizing(true);recorderRef.current.stop();}
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const latestThumb = recentMedia[0]?.url;

  const previewAspectStyle = (): React.CSSProperties => {
    if (aspectRatio === '1:1') return { aspectRatio: '1 / 1', maxHeight: '100%' };
    if (aspectRatio === '4:3') return { aspectRatio: isLandscapeViewport ? '4 / 3' : '3 / 4', maxHeight: '100%' };
    if (aspectRatio === '16:9') return { aspectRatio: isLandscapeViewport ? '16 / 9' : '9 / 16', maxHeight: '100%' };
    return { width: '100%', height: '100%' };
  };

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
            style={{transform:`scale(${zoomLevel}) ${lens==='front'?'scaleX(-1)':''}`,transition:'transform 110ms ease-out'}}
            className="w-full h-full object-cover select-none pointer-events-none" />
          {cameraReady && mode==='video' && audioUnavailable && <div role="status" className="absolute top-2 left-2 right-2 z-20 rounded-lg bg-[#7F1D1D]/85 px-3 py-2 text-center text-xs text-white pointer-events-none">Không ghi được âm thanh từ micro. Video sẽ chỉ có hình.</div>}
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
          <WatermarkOverlay config={watermarkConfig} orientationDeg={0} />

          {/* Recording live timer */}
          {isRecording && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-[#060B14]/80 backdrop-blur-md border border-[#EF4444]/40 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="text-xs font-mono-tabular font-semibold text-white">
                {formatDuration(recordSeconds)}
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
          <div className="flex items-center bg-[#111C30] p-0.5 rounded-xl border border-white/[0.07]">
            <button
              type="button"
              disabled={isRecording || isRecordingStarting || isFinalizing}
              onClick={() => {
                setMode('photo');
                setShowVideoQualityPopup(false);
              }}
              className={`min-h-[34px] px-3.5 rounded-[10px] text-xs font-semibold tracking-wide transition ${
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
              className={`min-h-[34px] px-3.5 rounded-[10px] text-xs font-semibold tracking-wide transition ${
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
            /> : <Images className="w-6 h-6 text-[#E2B74B]" />}
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

          {/* Right: Flip Front / Rear Camera */}
          <button
            type="button"
            disabled={isRecording || isRecordingStarting || isFinalizing}
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
