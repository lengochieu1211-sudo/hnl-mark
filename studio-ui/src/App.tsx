import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  FolderOpen,
  MonitorSmartphone,
  Share2,
  Stamp,
} from 'lucide-react';
import {
  AppRoute,
  ImageEdits,
  MediaItem,
  ViewportPreset,
  WatermarkConfig,
} from './types/hnl';
import { DEFAULT_WATERMARK_CONFIG, VIEWPORT_PRESETS } from './data/templates';
import { DEFAULT_IMAGE_EDITS, INITIAL_MEDIA_ITEMS } from './data/mockMedia';
import { HnlLogoPlaceholder } from './components/common/HnlBrandMark';
import { CameraApkScreen } from './components/camera/CameraApkScreen';
import { DocumentScannerScreen } from './components/scanner/DocumentScannerScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { LibraryScreen } from './components/library/LibraryScreen';
import { CameraRollScreen } from './components/library/CameraRollScreen';
import { StampsAndSettingsScreen } from './components/stamps/StampsAndSettingsScreen';
import { ExportScreen } from './components/export/ExportScreen';
import { ExportActionSheet } from './components/export/ExportActionSheet';
import { ViewportTesterModal } from './components/qa/ViewportTesterModal';
import {storeMedia,loadMedia,removeMedia} from './services/mediaStorage';
import {restoreProjectZip} from './services/projectBackup';
import {setupAndroidBridge,saveToDevice,isAndroidApk,pickDeviceGallery} from './services/deviceBridge';
import { createTimemarkPhoto,createTimemarkCode } from './services/timemarkRenderer';

function formatLocalIsoNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function App() {
  // Mở thẳng Camera APK toàn màn hình theo thiết lập đã xác nhận
  const [route, setRoute] = useState<AppRoute>('camera');
  const [reviewMediaId,setReviewMediaId] = useState('');
  const backRef=useRef<()=>boolean>(()=>false);
  const [libraryReady,setLibraryReady]=useState(false);
  const savedIds=useRef(new Set<string>());
  const restoreInput=useRef<HTMLInputElement|null>(null);
  const [stampsSubTab, setStampsSubTab] = useState<'templates' | 'customize' | 'editor'>('templates');

  const [mediaItems, setMediaItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [activeMediaId, setActiveMediaId] = useState<string>('');
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({
    ...DEFAULT_WATERMARK_CONFIG,
    dateTimeIso: formatLocalIsoNow(),
  });

  // Action Sheet state
  const [exportSheetOpen, setExportSheetOpen] = useState<boolean>(false);
  const [exportTargetItems, setExportTargetItems] = useState<MediaItem[]>([]);

  // QA Viewport & Keyboard simulation state
  const [qaModalOpen, setQaModalOpen] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<ViewportPreset>(VIEWPORT_PRESETS[0]);
  const [simulateKeyboard, setSimulateKeyboard] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 393,
    h: typeof window !== 'undefined' ? window.innerHeight : 873,
  });

  useEffect(() => {
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Live clock tick when autoTime is enabled
  useEffect(() => {
    if (!watermarkConfig.autoTime) return;
    const timer = window.setInterval(() => {
      setWatermarkConfig((prev) => ({ ...prev, dateTimeIso: formatLocalIsoNow() }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [watermarkConfig.autoTime]);

  const emptyPreview:MediaItem={id:'no-media',title:'Ảnh minh họa (chưa chọn ảnh)',kind:'photo',origin:'newly-picked',url:'./demo-camera-rear.jpg',createdAt:formatLocalIsoNow(),resolutionLabel:'Chưa có ảnh',sizeLabel:'—',location:'',coordinates:'',photoCode:'',customNote:'',templateId:'timemark',edits:{...DEFAULT_IMAGE_EDITS}};
  useEffect(()=>{
    let alive=true;loadMedia().then(items=>{
      if(!alive)return;
      const newestFirst=[...items].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      setMediaItems(newestFirst);
      if(newestFirst[0])setActiveMediaId(newestFirst[0].id);
    }).catch(err=>{console.error('Không đọc được thư viện:',err);}).finally(()=>{if(alive)setLibraryReady(true);});
    return ()=>{alive=false};
  },[]);
  const importPickedFiles=async (files:File[])=>{
    if(!files.length)return;
    const all:MediaItem[]=[];
    for(const [i,file] of files.entries()){
      const detectedType=file.type.startsWith('image/')||file.type.startsWith('video/')?file.type:
        /\.(mp4|m4v|mov)$/i.test(file.name)?'video/mp4':/\.webm$/i.test(file.name)?'video/webm':
        /\.(jpg|jpeg)$/i.test(file.name)?'image/jpeg':/\.png$/i.test(file.name)?'image/png':'';
      if(!detectedType)continue;
      const mediaFile=file.type===detectedType?file:new File([file],file.name,{type:detectedType,lastModified:file.lastModified});
      const now=new Date();
      const item:MediaItem={id:`import-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}`,
      title:file.name.replace(/\.[^/.]+$/,'')||'Tệp mới chọn',kind:detectedType.startsWith('video/')?'video':'photo',
      origin:'newly-picked',url:URL.createObjectURL(mediaFile),rawBlob:mediaFile,createdAt:now.toISOString(),
      resolutionLabel:detectedType.startsWith('video/')?'Video thiết bị':'Ảnh thiết bị',
      sizeLabel:`${(file.size/1048576).toFixed(1)} MB`,location:'',coordinates:'',photoCode:createTimemarkCode(),
      customNote:'',templateId:'timemark',edits:{...DEFAULT_IMAGE_EDITS}};
      // Persist EACH original before adding to UI; native picker processes sequentially.
      await storeMedia(item);all.push(item);
    }
    if(all.length){setMediaItems(old=>[...all,...old]);setActiveMediaId(all[0].id);setRoute('library');}
  };
  const pickerRef=useRef(importPickedFiles);
  pickerRef.current=importPickedFiles;
  useEffect(()=>{setupAndroidBridge(files=>pickerRef.current(files),(tab)=>{
    if(tab==='capture')setRoute('camera');if(tab==='library')setRoute('library');
    if(tab==='stamp')setRoute('stamps');if(tab==='export')setRoute('export');
  },()=>backRef.current());},[]);
  // Real Android system Back. Recording/finalization must be finished before navigation.
  backRef.current=()=>{
    if(exportSheetOpen){if((window as any).__hnlStudioExporting){alert('Đang xuất video, hãy hoàn tất trước khi rời ứng dụng.');return true;}setExportSheetOpen(false);return true;}
    if(qaModalOpen){setQaModalOpen(false);return true;}
    if((window as any).__hnlStudioRecording===true){alert('Hãy dừng quay và lưu video trước khi thoát camera.');return true;}
    if(route==='review'){setRoute('camera');return true;}
    if(route==='scanner'){setRoute('library');return true;}
    if(route!=='home'){setRoute('home');return true;}
    return false;
  };
  const activeMedia = useMemo(() => {
    return mediaItems.find((m) => m.id === activeMediaId) ?? mediaItems[0];
  }, [mediaItems, activeMediaId]);

  const effectiveViewportW = activePreset.width > 0 ? activePreset.width : windowSize.w;
  const effectiveViewportH = activePreset.height > 0 ? activePreset.height : windowSize.h;
  const isLandscapeViewport = effectiveViewportW > effectiveViewportH * 1.2;

  const updateWatermarkConfig = (patch: Partial<WatermarkConfig>) => {
    setWatermarkConfig((prev) => ({ ...prev, ...patch }));
  };

  // Never show a captured original as safely saved before IndexedDB commits.
  const handleCapturePhoto = async(newPhoto:MediaItem):Promise<void>=>{
    // First commit the original so a failed stamp/export never destroys the shutter result.
    await storeMedia(newPhoto);
    let item=newPhoto;
    try{
      const config=newPhoto.captureWatermark||watermarkConfig;
      if(!['timemark','none'].includes(config.templateId))throw Error('Mẫu dấu này chưa hỗ trợ xuất ảnh thật. Hãy chọn Timemark.');
      if(!newPhoto.rawBlob)throw Error('Không có ảnh gốc để tạo dấu');
      const stamped=await createTimemarkPhoto(newPhoto.rawBlob,config,newPhoto.photoCode,newPhoto.orientationDeg||0);
      item={...newPhoto,stampedBlob:stamped,isStamped:config.templateId!=='none',url:URL.createObjectURL(stamped)};
      await storeMedia(item);
    }catch(e){
      alert('Ảnh gốc đã được giữ trong Thư viện HNL nhưng CHƯA lưu ảnh có dấu: '+String(e));
    }
    setMediaItems(prev=>[item,...prev]);
    setActiveMediaId(item.id);
    setWatermarkConfig(prev=>({...prev,photoCodeSeq:prev.photoCodeSeq+1}));
    if(isAndroidApk()&&item.stampedBlob&&item.isStamped){
      try{await saveToDevice(item.stampedBlob,`HNLMark_Timemark_${Date.now()}.jpg`);}
      catch(e){alert('Ảnh có dấu còn trong Thư viện HNL nhưng chưa lưu xuống máy: '+String(e));}
    }
  };
  const handleSaveVideo = async(newVideo:MediaItem):Promise<void>=>{
    if(savedIds.current.has(newVideo.id))return;
    await storeMedia(newVideo);
    savedIds.current.add(newVideo.id);
    setMediaItems(prev=>[newVideo,...prev]);
    setActiveMediaId(newVideo.id);
    if(isAndroidApk()&&newVideo.rawBlob){
      if(!newVideo.isStamped){alert('Video chưa có dấu, chỉ được giữ trong Thư viện HNL để tránh xuất nhầm.');return;}
      try{await saveToDevice(newVideo.rawBlob,`HNLMark_Timemark_${Date.now()}.${newVideo.rawBlob.type.includes('mp4')?'mp4':'webm'}`);}
      catch(e){alert('Video có dấu vẫn trong Thư viện HNL nhưng chưa lưu xuống máy: '+String(e));}
    }
  };

  const handlePickLocalMedia = (files: FileList | null) => {
    if(!files?.length)return;
    importPickedFiles(Array.from(files)).catch(e=>alert('Không thể nhập ảnh/video: '+String(e)));
  };

  const handleUpdateEdits = (mediaId: string, nextEdits: ImageEdits) => {
    setMediaItems(prev=>prev.map(m=>{
      if(m.id!==mediaId)return m;
      const updated={...m,edits:nextEdits};storeMedia(updated).catch(console.error);return updated;
    }));
  };

  const handleUpdateMediaMetadata = (
    id: string,
    patch: Partial<
      Pick<MediaItem, 'createdAt' | 'location' | 'coordinates' | 'customNote' | 'photoCode' | 'title'>
    >,
  ) => {
    setMediaItems(prev=>prev.map(m=>{
      if(m.id!==id)return m;
      const updated={...m,...patch};storeMedia(updated).catch(console.error);return updated;
    }));
  };

  const handleDeleteItems = async(ids:string[])=>{
    try{
      await removeMedia(ids);
      setMediaItems(prev=>prev.filter(m=>!ids.includes(m.id)));
      if(ids.includes(activeMediaId))setActiveMediaId(mediaItems.find(m=>!ids.includes(m.id))?.id||'');
    }catch(e){alert('Không xóa được ảnh/video; thư viện đang được giữ nguyên: '+String(e));}
  };

  const openExportSheet = (targets: MediaItem[]) => {
    if(!targets.length&&!activeMedia){alert('Chưa có ảnh/video để xuất.');return;}
    setExportTargetItems(targets.length > 0 ? targets : activeMedia?[activeMedia]:[]);
    setExportSheetOpen(true);
  };

  const isFramedQaMode = activePreset.id !== 'fluid';

  const appShellContent = (
    <div className="relative w-full h-full bg-[#060B14] text-[#F8FAFC] flex flex-col overflow-hidden">
      {/* Global web fallback picker: Android native picker is invoked from Library. */}
      <input id="hnl-studio-picker" type="file" accept="image/*,video/*" multiple hidden
        onChange={e=>{handlePickLocalMedia(e.currentTarget.files);e.currentTarget.value='';}} />
      {/* Main Content Area */}
      {route === 'camera' ? (
        <div className="flex-1 min-h-0 w-full h-full">
          <CameraApkScreen
            watermarkConfig={watermarkConfig}
            recentMedia={mediaItems}
            isLandscapeViewport={isLandscapeViewport}
            onCloseCamera={() => setRoute('home')}
            onOpenLibrary={() => {setReviewMediaId(mediaItems[0]?.id||'');setRoute('review');}}
            onCapturePhoto={handleCapturePhoto}
            onSaveVideo={handleSaveVideo}
            onShareMedia={(item) => openExportSheet([item])}
          />
        </div>
      ) : route === 'review' ? (
        <CameraRollScreen
          items={mediaItems}
          initialId={reviewMediaId}
          onBackToCamera={()=>setRoute('camera')}
          onOpenFullLibrary={()=>setRoute('library')}
          onEditMedia={item=>{setActiveMediaId(item.id);setStampsSubTab('editor');setRoute('stamps');}}
          onShareMedia={item=>openExportSheet([item])}
        />
      ) : (
        <>
          {/* Compact Android App Top Bar (Non-sticky to preserve mobile scroll height budget) */}
          <header
            className="shrink-0 px-4 py-2.5 bg-[#09111E] border-b border-white/[0.08] flex items-center justify-between gap-3"
            style={{ paddingTop: 'max(10px, var(--hnl-safe-top))' }}
          >
            <button
              type="button"
              onClick={() => setRoute('home')}
              className="flex items-center gap-2.5 min-w-0 text-left"
            >
              <HnlLogoPlaceholder size="sm" variant="navy-gold" />
              <span className="text-[15px] font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap truncate">
                HNL Mark
              </span>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {!isAndroidApk() && <button
                type="button"
                onClick={() => setQaModalOpen(true)}
                className="min-h-[38px] px-2.5 rounded-xl bg-[#111C30] hover:bg-[#17253D] border border-white/[0.08] text-[12px] font-medium text-[#94A3B8] hover:text-[#E2B74B] flex items-center gap-1.5 whitespace-nowrap"
                title="Kiểm thử 8 kích thước màn hình & bàn phím Android"
              >
                <MonitorSmartphone className="w-4 h-4 text-[#E2B74B]" />
                <span className="hidden sm:inline">
                  {isFramedQaMode ? activePreset.id : 'Viewport QA'}
                </span>
              </button>}
            </div>
          </header>

          {/* Scrollable Workspace */}
          {route==='library' && <div className="px-4 py-2 flex flex-wrap gap-2 items-center bg-[#0B1424] border-b border-white/10">
            <button type="button" onClick={()=>pickDeviceGallery()}
              className="min-h-9 px-3 rounded-xl bg-[#E2B74B] text-[#06101E] text-xs font-semibold">Chọn ảnh / video từ máy</button>
            <button type="button" onClick={()=>setRoute('scanner')}
              className="min-h-9 px-3 rounded-xl bg-[#17253D] text-[#E2B74B] text-xs font-semibold border border-[#E2B74B]/30">Quét tài liệu / CCCD</button>
            <input ref={restoreInput} type="file" accept=".zip,application/zip" hidden
              onChange={e=>{const file=e.target.files?.[0];if(file)restoreProjectZip(file).then(restored=>{
                setMediaItems(old=>[...restored,...old]);if(restored[0])setActiveMediaId(restored[0].id);
                alert('Đã khôi phục '+restored.length+' ảnh/video gốc, không xóa dữ liệu trước đó.');
              }).catch(err=>alert('Lỗi khôi phục ZIP: '+String(err)));e.currentTarget.value='';}}/>
            <button type="button" onClick={()=>restoreInput.current?.click()}
              className="min-h-9 px-3 rounded-xl bg-[#17253D] text-[#E2B74B] text-xs font-semibold">Khôi phục ZIP chứa ảnh gốc</button>
            <span className="text-[11px] text-[#94A3B8]">Không ghi đè thư viện cũ. Thư viện TEST14 được lưu riêng để bảo vệ dữ liệu.</span>
          </div>}
          <main className="flex-1 min-h-0 overflow-y-auto hnl-scroll pb-4">
            {route === 'scanner' && <DocumentScannerScreen onBack={()=>setRoute('library')} />}
            {route === 'home' && (
              <HomeScreen
                activeMedia={activeMedia ?? emptyPreview}
                watermarkConfig={watermarkConfig}
                mediaCount={mediaItems.length}
                onOpenCamera={() => setRoute('camera')}
                onOpenLibrary={() => setRoute('library')}
                onOpenEditor={() => {
                  setStampsSubTab('editor');
                  setRoute('stamps');
                }}
                onOpenStamps={() => {
                  setStampsSubTab('templates');
                  setRoute('stamps');
                }}
                onPickLocalMedia={handlePickLocalMedia}
                onSelectTemplate={(templateId) => updateWatermarkConfig({ templateId })}
              />
            )}

            {route === 'library' && !libraryReady && <div className="p-5 text-[#94A3B8] text-sm">Đang mở thư viện an toàn…</div>}
            {route === 'library' && libraryReady && (
              <LibraryScreen
                items={mediaItems}
                activeMediaId={activeMedia?.id||''}
                watermarkConfig={watermarkConfig}
                onSelectActiveMedia={(item) => setActiveMediaId(item.id)}
                onEditMediaInEditor={(item) => {
                  setActiveMediaId(item.id);
                  setStampsSubTab('editor');
                  setRoute('stamps');
                }}
                onUpdateMediaMetadata={handleUpdateMediaMetadata}
                onDeleteItems={handleDeleteItems}
                onRestoreBackupJson={(restored) => {
                  setMediaItems(restored);
                  if (restored[0]) setActiveMediaId(restored[0].id);
                }}
                onTriggerExportSheet={openExportSheet}
                onOpenCamera={() => setRoute('camera')}
              />
            )}

            {route === 'stamps' && (
              <StampsAndSettingsScreen
                key={stampsSubTab}
                activeMedia={activeMedia ?? emptyPreview}
                config={watermarkConfig}
                initialSubTab={stampsSubTab}
                onChangeConfig={updateWatermarkConfig}
                onUpdateEdits={handleUpdateEdits}
              />
            )}

            {route === 'export' && activeMedia && (
              <ExportScreen
                activeMedia={activeMedia}
                allMedia={mediaItems}
                watermarkConfig={watermarkConfig}
                onOpenActionSheet={openExportSheet}
              />
            )}
          </main>

          {/* Simulated Android Soft Keyboard Spacer (when enabled in QA) */}
          {simulateKeyboard && (
            <div className="shrink-0 h-[210px] bg-[#131924] border-t border-white/15 flex flex-col items-center justify-center px-4 text-center">
              <div className="text-xs font-medium text-[#94A3B8]">
                Bàn phím Android đang mở (Mô phỏng vùng chiếm 210px)
              </div>
              <button
                type="button"
                onClick={() => setSimulateKeyboard(false)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#1E293B] text-xs text-[#E2B74B]"
              >
                Thu gọn bàn phím
              </button>
            </div>
          )}

          {/* Fixed 4-Tab Android Bottom Navigation */}
          <nav
            aria-label="Điều hướng chính"
            className="shrink-0 bg-[#09111E]/95 backdrop-blur-md border-t border-white/[0.08] grid grid-cols-4 items-center"
            style={{
              minHeight: '60px',
              paddingBottom: 'var(--hnl-safe-bottom)',
            }}
          >
            {[
              { id: 'camera' as const, label: 'Camera', icon: Camera },
              { id: 'library' as const, label: 'Thư viện', icon: FolderOpen },
              { id: 'stamps' as const, label: 'Cài dấu', icon: Stamp },
              { id: 'export' as const, label: 'Xuất', icon: Share2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive =
                route === tab.id || (route === 'editor' && tab.id === 'stamps') || (route === 'scanner' && tab.id === 'library');
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'stamps') setStampsSubTab('templates');
                    setRoute(tab.id);
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive ? 'text-[#E2B74B]' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Icon className="w-[20px] h-[20px]" />
                  <span className="text-[11px] font-medium whitespace-nowrap">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      {/* Unified Export Action Sheet */}
      <ExportActionSheet
        onRestoreBackup={async(file)=>{const restored=await restoreProjectZip(file);if(restored.length){setMediaItems(old=>[...restored,...old]);setActiveMediaId(restored[0].id);}}}
        isOpen={exportSheetOpen}
        targetItems={exportTargetItems}
        watermarkConfig={watermarkConfig}
        onStampedMedia={async(item,stamped,stampConfig)=>{
          const updated={...item,stampedBlob:stamped,isStamped:true,stampedConfig:stampConfig,url:URL.createObjectURL(stamped)};
          await storeMedia(updated);
          setMediaItems(old=>old.map(m=>m.id===item.id?updated:m));
        }}
        onClose={() => setExportSheetOpen(false)}
      />

      {/* Responsive & Soft Keyboard QA Modal */}
      <ViewportTesterModal
        isOpen={qaModalOpen}
        activePreset={activePreset}
        simulateKeyboard={simulateKeyboard}
        onSelectPreset={setActivePreset}
        onToggleKeyboard={() => setSimulateKeyboard((k) => !k)}
        onClose={() => setQaModalOpen(false)}
      />
    </div>
  );

  // If QA Viewport frame is active, wrap neatly inside exact pixel container
  if (isFramedQaMode) {
    return (
      <div className="min-h-screen w-full bg-[#030509] flex flex-col items-center justify-center p-4 gap-3 overflow-auto">
        <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
          <span className="font-mono-tabular text-[#E2B74B] font-semibold">
            {activePreset.label}
          </span>
          <button
            type="button"
            onClick={() => setQaModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-[#111C30] border border-white/10 text-white hover:border-[#E2B74B]"
          >
            Đổi kích thước
          </button>
          <button
            type="button"
            onClick={() => {
              setActivePreset(VIEWPORT_PRESETS[0]);
              setSimulateKeyboard(false);
            }}
            className="px-2.5 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            Thoát khung QA
          </button>
        </div>

        <div
          style={{
            width: `${activePreset.width}px`,
            height: `${activePreset.height}px`,
          }}
          className="rounded-[24px] overflow-hidden border border-white/20 shadow-2xl shrink-0"
        >
          {appShellContent}
        </div>
      </div>
    );
  }

  return <div className="w-screen h-[100dvh] overflow-hidden">{appShellContent}</div>;
}
