/* HNLMark v2.0.5 - mobile continuous camera, editable local library and compact landscape dock */
(function(){'use strict';
const $=id=>document.getElementById(id), canvas=$('previewCanvas'), stage=$('stage'), ctx=canvas.getContext('2d',{alpha:false});
const defaultConfig={preset:'timemark',timeMode:'original',batchDate:toLocalInput(new Date()),dateFormat:'reference',timeFormat:'24',showDate:true,showTime:true,brandText:'NHẬT KÝ CÔNG TRƯỜNG',footerBrand:'Timemark',footerCaption:'100% Chân thực',showFooter:true,showSerial:true,serialMode:'auto',serialText:'',footerX:.875,footerY:.966,serialX:.981,serialY:.43,projectText:'',addressText:'',noteText:'',symbolType:'construction',logoMode:'inside',fontSize:3.2,accentColor:'#ffcf48',textColor:'#ffffff',bgOpacity:62,logoScale:100,showBackground:false,showShadow:true,outputSize:'original',outputFormat:'jpeg',quality:92,cropRatio:'free',fontFamily:'condensed',fontWeight:900,timeScale:100,dateScale:100,addressScale:100,footerScale:100,serialScale:100,dateColor:'#ffffff',addressColor:'#ffffff',footerColor:'#ffcf48',serialColor:'#ffffff',posX:.32,posY:.898,logoX:.87,logoY:.12,moveTarget:'stamp'};
let saved={};try{saved=JSON.parse(localStorage.getItem('hnlmark-config-v1')||localStorage.getItem('hnl-photomark-config-v3')||'{}')||{};}catch(_){ }
// Migrate old stamp labels in saved preferences AND per-photo settings, even when
// an older one-time migration flag exists. Custom user captions/brands remain intact.
function migrateStampLabels(options){
 if(!options||typeof options!=='object')return options;
 const name=String(options.footerBrand??'').trim().replace(/\s+/g,' ').toLowerCase();
 if(['hnlmark','hnl mark','hnl photomark','hnl photo mark','time mark','timemark'].includes(name))options.footerBrand='Timemark';
 const note=String(options.footerCaption??'').trim().toLowerCase();
 if(['ảnh đã chỉnh sửa','anh da chinh sua','100% chân thực'].includes(note))options.footerCaption='100% Chân thực';
 return options;
}
migrateStampLabels(saved);
if(saved.serialMode==='custom')saved.serialMode='prefix';
const config=Object.assign({},defaultConfig,saved); config.moveTarget='stamp';
let editTool='move',editSelection=null,editDragging=false;const previewSnapshot=document.createElement('canvas');
let photoSequence=0,photos=[],selected=-1,logoImg=null,logoUrl=null,logoFile=null,isRendering=0,toastTimer=null,busy=false;
let cameraActive=false,cameraStream=null,cameraControls=null,cameraRAF=0,cameraFacing='environment',cameraRequest=0,cameraCapturing=false,cameraShotPending=false,cameraShotUniqueId=null,cameraPreviewCode='',cameraLastDraw=0,cameraOrientationKey='';
// Physical posture can differ from the browser viewport when Android auto-rotate is locked.
let cameraSensorPortrait=null,cameraSensorSide=0,cameraSensorAt=0,cameraSensorCandidate='',cameraSensorSamples=0,cameraManualRotation=0;
let cameraSensorCandidateAt=0,cameraSensorSource='',cameraMotionAt=0,cameraOrientationSide=0,cameraOrientationAt=0;
let cameraViewTurn='';
let burstEnabled=true;
const usedSerials=new Set();
let libraryDatabasePromise=null,libraryThumbUrls=[],librarySaveTimers=new Map(),burstCount=0;
const libraryName='HNLMarkLocalLibrary',libraryStore='originals';
function openLibraryDB(){
 if(!('indexedDB' in window))return Promise.reject(Error('Trình duyệt không hỗ trợ thư viện lưu cục bộ.'));
 if(!libraryDatabasePromise)libraryDatabasePromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(libraryName,2);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(libraryStore))db.createObjectStore(libraryStore,{keyPath:'id'});if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets');};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Không mở được thư viện'));
 }).catch(e=>{libraryDatabasePromise=null;throw e;});
 return libraryDatabasePromise;
}
async function libraryTx(mode,make){const db=await openLibraryDB();return new Promise((resolve,reject)=>{
 const t=db.transaction(libraryStore,mode),o=t.objectStore(libraryStore);let result;
 try{result=make(o)}catch(e){reject(e);return;}
 t.oncomplete=()=>resolve(result instanceof IDBRequest?result.result:result);
 t.onerror=()=>reject(t.error||Error('Không thể ghi thư viện ảnh'));
 t.onabort=()=>reject(t.error||Error('Thư viện đã hủy thao tác'));
});}
const libraryGet=id=>libraryTx('readonly',o=>o.get(id));
const libraryList=()=>libraryTx('readonly',o=>o.getAll());
const libraryDelete=id=>libraryTx('readwrite',o=>o.delete(id));
async function logoAsset(method,value){const db=await openLibraryDB();return new Promise((resolve,reject)=>{const tx=db.transaction('assets',method==='get'?'readonly':'readwrite'),o=tx.objectStore('assets');let req;try{req=method==='get'?o.get('custom-logo'):method==='put'?o.put(value,'custom-logo'):o.delete('custom-logo');}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);});}
async function loadStoredLogo(){try{const blob=await logoAsset('get');if(blob){logoFile=new File([blob],'HNL-custom-logo.png',{type:blob.type||'image/png'});if(logoImg?.close)logoImg.close();logoImg=await createImageBitmap(blob);if(logoUrl)URL.revokeObjectURL(logoUrl);logoUrl=URL.createObjectURL(blob);$('logoThumb').replaceChildren();const el=document.createElement('img');el.src=logoUrl;el.alt='Logo';$('logoThumb').appendChild(el);renderPreview();}}catch(_){}}
function photoRecord(p){return {id:p.serialCode,name:p.file.name,blob:p.file,modifiedAt:p.modifiedDate.getTime(),exifISO:p.exifDate?.toISOString()||null,override:p.override,customDate:p.customDate,edits:structuredClone(p.edits),stampConfig:configForPhoto(p),origin:p.origin||'import',savedAt:Date.now()};}
function configForPhoto(p){return {...migrateStampLabels(p.stampConfig||config),moveTarget:'stamp'};}
async function savePhotoRecord(p){
 try{await libraryTx('readwrite',o=>o.put(photoRecord(p)));p.persisted=true;}
 catch(e){p.persisted=false;showToast('Thư viện cục bộ không lưu được: '+(e?.name||'thiếu bộ nhớ')+'. Hãy xuất tệp dự án dự phòng.');}
 updateLibraryCount().catch(()=>{});
}
function scheduleSavePhoto(p=previewIndex()){
 if(!p)return;const id=p.serialCode;clearTimeout(librarySaveTimers.get(id));
 librarySaveTimers.set(id,setTimeout(()=>{librarySaveTimers.delete(id);savePhotoRecord(p).catch(showError);},420));
}
async function updateLibraryCount(){try{const all=await libraryList();const el=$('librarySummary');if(el)el.textContent=all.length+' ảnh đã lưu trên trình duyệt này';}catch(_){if($('librarySummary'))$('librarySummary').textContent='Không khả dụng · nên sao lưu dự án';}}
function stashPhotoSettings(p=previewIndex()) {if(!p)return;p.stampConfig={...config};scheduleSavePhoto(p);}
function selectPhoto(i){
 const former=previewIndex();if(former&&former!==photos[i])stashPhotoSettings(former);
 selected=i;const p=previewIndex();if(p?.stampConfig)Object.assign(config,migrateStampLabels(p.stampConfig));
 if(editTool!=='move')editTool='move';editSelection=null;fillForm();renderGallery();renderPreview();
}
async function showLibrary(){
 if(document.fullscreenElement){try{await document.exitFullscreen();}catch(_){}}
 if($('libraryModal').hidden===false)return;
 $('libraryModal').hidden=false;const list=$('libraryCards');list.replaceChildren();
 libraryThumbUrls.forEach(u=>URL.revokeObjectURL(u));libraryThumbUrls=[];
 try{const saved=(await libraryList()).sort((a,b)=>b.savedAt-a.savedAt);
  $('librarySummary').textContent=saved.length+' ảnh gốc trên thiết bị';
  if(!saved.length){list.textContent='Chưa có ảnh. Hãy chụp hoặc chọn ảnh để lưu vào thư viện.';return;}
  for(const record of saved){const card=document.createElement('div');card.className='library-item';
   const url=URL.createObjectURL(record.blob);libraryThumbUrls.push(url);
   const image=document.createElement('img');image.src=url;image.alt=record.name;
   const title=document.createElement('span');title.textContent=record.name;
   const tag=document.createElement('small');tag.textContent=(record.origin==='camera'?'📷 Đã chụp':'▣ Từ máy')+' · '+(record.customDate||'').replace('T',' ');
   const view=document.createElement('button');view.type='button';view.textContent='Sửa / Xuất';view.addEventListener('click',async()=>{
     let idx=photos.findIndex(p=>p.serialCode===record.id);
     if(idx<0){await appendFiles([new File([record.blob],record.name,{type:record.blob.type||'image/jpeg',lastModified:record.modifiedAt})],{serialCode:record.id,savedRecord:record,silent:true});idx=photos.findIndex(p=>p.serialCode===record.id);}
     if(cameraActive)stopCamera(false);
     if(cameraShotPending)acceptCameraShot();
     selectPhoto(idx);closeLibrary();
     document.querySelector('.viewer')?.scrollIntoView({behavior:'smooth',block:'start'});
   });
   const del=document.createElement('button');del.type='button';del.className='danger-outline';del.textContent='Xóa lưu';del.addEventListener('click',async()=>{
    if(!window.confirm('Xóa vĩnh viễn bản gốc đã lưu của ảnh này khỏi thư viện HNLMark?'))return;
    await libraryDelete(record.id);await showLibraryRefresh();
   });
   const details=document.createElement('div');details.append(title,tag,view,del);card.append(image,details);list.append(card);
  }
 }catch(e){list.textContent='Không đọc được thư viện: '+(e.message||e);}
}
function closeLibrary(){$('libraryModal').hidden=true;libraryThumbUrls.forEach(u=>URL.revokeObjectURL(u));libraryThumbUrls=[];}
async function showLibraryRefresh(){closeLibrary();await showLibrary();}

const SERIAL_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function createPhotoCode(){
  // This is a locally assigned photo ID, NOT a TimeMark verification token.
  let code;
  do {
    const bytes=new Uint8Array(15);
    if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
    code=Array.from(bytes,n=>SERIAL_CHARS[n%SERIAL_CHARS.length]).join('');
  }while(usedSerials.has(code));
  usedSerials.add(code);return code;
}
const textSafe=s=>String(s||'').trim();
const clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
function toLocalInput(d){d=new Date(d);if(!Number.isFinite(d.getTime()))d=new Date();const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());}
function parsedDate(s){if(!s)return null;const d=new Date(s);return Number.isFinite(d.getTime())?d:null;}
function pad(n){return String(n).padStart(2,'0');}
function fmtDate(d){const day=pad(d.getDate()),month=pad(d.getMonth()+1),year=d.getFullYear();switch(config.dateFormat){case'dd-mm-yyyy':return day+'-'+month+'-'+year;case'yyyy-mm-dd':return year+'-'+month+'-'+day;case'dd.month.yyyy':return day+'.'+month+'.'+year;case'reference':return d.getDate()+' Tháng '+(d.getMonth()+1)+', '+year;default:return day+'/'+month+'/'+year;}}
function fmtTime(d){let h=d.getHours();if(config.timeFormat==='12')return pad(h%12||12)+':'+pad(d.getMinutes())+' '+(h>=12?'PM':'AM');return pad(h)+':'+pad(d.getMinutes())+(config.timeFormat==='24s'?':'+pad(d.getSeconds()):'');}
function photoDate(p,settings=config){return (p&&p.override?parsedDate(p.customDate):null)||(settings.timeMode==='custom'?parsedDate(settings.batchDate):null)||(p?p.exifDate||p.modifiedDate:new Date());}
function showToast(msg){const node=$('toast');node.textContent=msg;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),4400);}
function store(){const copy=Object.assign({},config);delete copy.moveTarget;try{localStorage.setItem('hnlmark-config-v1',JSON.stringify(copy));}catch(_){ }}
function showError(e){console.error(e);showToast(e&&e.message?e.message:String(e));}
function readExifTime(buffer){try{const dv=new DataView(buffer),len=dv.byteLength;if(len<12||dv.getUint16(0)!==0xffd8)return null;let p=2;while(p+4<len){if(dv.getUint8(p)!==0xff){p++;continue;}const mark=dv.getUint8(p+1);if(mark===0xda||mark===0xd9)break;if(mark===0x00||mark===0xff){p+=2;continue;}const block=dv.getUint16(p+2,false);if(block<2)break;if(mark===0xe1&&p+10<len&&ascii(dv,p+4,4)==='Exif') {let t=p+10;const le=dv.getUint16(t,false)===0x4949;if(!le&&dv.getUint16(t,false)!==0x4d4d)break;const u16=i=>i+2<=len?dv.getUint16(i,le):0;const u32=i=>i+4<=len?dv.getUint32(i,le):0;const parseIfd=(off,depth)=>{const b=t+off;if(depth>2||b+2>len)return null;let count=Math.min(500,u16(b));let backup=null;for(let i=0;i<count;i++){const row=b+2+i*12;if(row+12>len)break;const tag=u16(row),kind=u16(row+2),qty=u32(row+4);if((tag===0x9003||tag===0x9004||tag===0x0132)&&kind===2&&qty>=19&&qty<100){const at=qty<=4?row+8:t+u32(row+8);if(at+qty<=len){let date=parseExifText(ascii(dv,at,qty));if(date){if(tag===0x9003)return date;backup=backup||date;}}}if(tag===0x8769){const nested=parseIfd(u32(row+8),depth+1);if(nested)return nested;}}return backup;};return parseIfd(u32(t+4),0);}
p+=2+block;}return null;}catch(e){return null;}}
function ascii(dv,i,n){let s='';for(let j=0;j<n&&i+j<dv.byteLength;j++)s+=String.fromCharCode(dv.getUint8(i+j));return s;}
function parseExifText(s){const m=s.match(/(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);if(!m)return null;const d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);return Number.isFinite(d.getTime())&&d.getFullYear()===+m[1]&&d.getMonth()===+m[2]-1?d:null;}
async function extractExif(f){try{return readExifTime(await f.slice(0,512*1024).arrayBuffer());}catch(_){return null;}}
async function getBitmap(p){if(p.bitmap)return p.bitmap;if(p.loading)return p.loading;p.loading=(async()=>{try{if('createImageBitmap'in window)return await createImageBitmap(p.file,{imageOrientation:'from-image'});}catch(_){ }return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Không đọc được '+p.file.name+'. Có thể định dạng HEIC chưa được hỗ trợ.'));image.src=p.url;});})();try{p.bitmap=await p.loading;return p.bitmap;}finally{p.loading=null;}}
function previewIndex(){return photos[selected]||null;}
async function appendFiles(list,opts={}){
 const images=[...list].filter(f=>f.type.startsWith('image/')||/\.(jpg|jpeg|png|webp|heic|heif|bmp)$/i.test(f.name));
 if(!images.length){showToast('Không tìm thấy tệp ảnh hợp lệ.');return;}
 const current=photos.length;
 for(let file of images){
  let savedRecord=opts.savedRecord||null;
  const match=file.name.match(/_TM-([A-Z0-9]{15})(?=[._])/i);
  if(!savedRecord&&match){try{savedRecord=await libraryGet(match[1].toUpperCase());}catch(_){}}
  if(savedRecord){file=new File([savedRecord.blob],savedRecord.name,{type:savedRecord.blob.type||'image/jpeg',lastModified:savedRecord.modifiedAt});}
  else if(match)showToast('Không tìm thấy ảnh gốc của ảnh đã đóng dấu. Cần tệp dự án hoặc ảnh gốc để sửa dấu sạch.');
  const url=URL.createObjectURL(file),exifDate=savedRecord?.exifISO?new Date(savedRecord.exifISO):await extractExif(file);
  const serialCode=savedRecord?.id||(opts.serialCode&&images.length===1?opts.serialCode:createPhotoCode());usedSerials.add(serialCode);
  const p={file,url,serialCode,uniqueId:++photoSequence,exifDate,modifiedDate:new Date(savedRecord?.modifiedAt||file.lastModified||Date.now()),bitmap:null,loading:null,override:!!savedRecord?.override,customDate:savedRecord?.customDate||toLocalInput(exifDate||new Date(file.lastModified||Date.now())),edits:savedRecord?.edits||{operations:[],filters:{brightness:0,contrast:0,saturation:0,warmth:0}},stampConfig:migrateStampLabels(savedRecord?.stampConfig||{...config}),origin:savedRecord?.origin||opts.origin||'import',persisted:!!savedRecord};
  photos.push(p);
  if(!savedRecord&&opts.persist!==false)await savePhotoRecord(p);
 }
 if(!opts.keepCamera)selectPhoto(current);else{selected=photos.length-1;renderGallery();$('photoCount').textContent=photos.length+' ảnh';}
 if(!opts.silent)showToast('Đã thêm '+images.length+' ảnh. Có thể chỉnh ngày giờ riêng rồi xuất.');
}

function removePhoto(i){if(editTool!=='move')setEditTool('move');const p=photos[i];if(!p)return;URL.revokeObjectURL(p.url);if(p.bitmap&&p.bitmap.close)p.bitmap.close();photos.splice(i,1);selected=photos.length?clamp(selected>i?selected-1:selected,0,photos.length-1):-1;if(photos.length)selectPhoto(selected);else{renderGallery();updateSelectionUI();renderPreview();}}
function renderGallery(){const g=$('gallery');g.replaceChildren();photos.forEach((p,i)=>{let b=document.createElement('button');b.className='gallery-card'+(i===selected?' active':'');b.type='button';b.title=p.file.name;b.addEventListener('click',()=>selectPhoto(i));const thumb=document.createElement('img');thumb.src=p.url;thumb.alt=p.file.name;thumb.loading='lazy';const name=document.createElement('span');name.textContent=p.file.name;const close=document.createElement('button');close.type='button';close.className='remove';close.textContent='×';close.title='Bỏ ảnh';close.addEventListener('click',ev=>{ev.stopPropagation();removePhoto(i);});b.append(thumb,name,close);g.appendChild(b);});$('photoCount').textContent=photos.length+' ảnh';$('photoHint').textContent=photos.length?'Chọn ảnh nhỏ để sửa và xem trước. Nút × chỉ bỏ khỏi danh sách, không xóa ảnh gốc.':'Ảnh sẽ xuất hiện tại đây. Mỗi ảnh có thể dùng giờ chụp riêng.';}
function updateSelectionUI(){const p=previewIndex();$('overrideCheck').checked=!!p?.override;$('overrideCheck').disabled=!p;$('individualDate').disabled=!p;$('individualDate').value=p?p.customDate:'';$('individualDateRow').hidden=!(p&&p.override);$('dateSource').textContent=p?(p.override?'Ngày giờ chỉnh riêng':config.timeMode==='custom'?'Ngày giờ chung':p.exifDate?'EXIF · giờ chụp gốc':'Ngày sửa tệp · cần kiểm tra'):'Chưa chọn ảnh';$('resolvedTime').textContent=p?fmtDate(photoDate(p))+' · '+fmtTime(photoDate(p)):'—';$('previewName').textContent=p?p.file.name:'Ảnh minh họa · tải ảnh để bắt đầu';$('photoIndex').textContent=p?(selected+1)+' / '+photos.length:'Chưa có ảnh';$('previousPhoto').disabled=!p||selected===0;$('nextPhoto').disabled=!p||selected===photos.length-1;$('saveOne').disabled=!p;$('saveAll').disabled=!p;$('batchDateRow').hidden=config.timeMode!=='custom';$('serialPreview').textContent=photoSerial(p);updateImageEditor();}
function photoEdits(p){if(!p)return null;if(!p.edits)p.edits={operations:[],filters:{brightness:0,contrast:0,saturation:0,warmth:0}};return p.edits;}
function updateImageEditor(){
 const p=previewIndex(),e=photoEdits(p),ready=!!p&&!cameraActive;
 ['cropTool','repairTool','rotateLeft','rotateRight','resetImageEdit','resetFilters','applyFiltersAll','undoImageEdit'].forEach(id=>{const el=$(id);if(el)el.disabled=!ready||(id==='undoImageEdit'&&!e?.operations.length)||(id==='applyFiltersAll'&&!photos.length);});
 ['brightness','contrast','saturation','warmth'].forEach(id=>{const el=$(id);if(!el)return;el.disabled=!ready;el.value=e?e.filters[id]:0;$(id+'Value').textContent=el.value>0?'+'+el.value:el.value;});
 for(const id of ['cropTool','repairTool'])$(id).classList.toggle('active-tool',editTool===(id==='cropTool'?'crop':'repair'));
 $('cropApply').disabled=!ready||editTool!=='crop'||!regionValid();
 $('repairApply').disabled=!ready||editTool!=='repair'||!regionValid();
 $('cancelEditTool').disabled=editTool==='move';
 $('editModeStatus').textContent=!p?'Chọn một ảnh để bắt đầu chỉnh sửa':editTool==='crop'?'Kéo khoanh vùng muốn GIỮ lại trên ảnh, sau đó nhấn Cắt ảnh.':editTool==='repair'?'Khoanh vùng muốn XÓA / LÀM MỜ; nhấn Xử lý vùng.':(e.operations.length?'Đã chỉnh '+e.operations.length+' bước; có thể hoàn tác.':'Ảnh gốc chưa qua chỉnh cắt/xóa.');
}
function regionValid(){return editSelection&&Math.abs(editSelection.x2-editSelection.x1)>=.016&&Math.abs(editSelection.y2-editSelection.y1)>=.016;}
function normalizeRegion(){if(!regionValid())return null;const r=editSelection;return {x:clamp(Math.min(r.x1,r.x2),0,1),y:clamp(Math.min(r.y1,r.y2),0,1),w:clamp(Math.abs(r.x2-r.x1),0,1),h:clamp(Math.abs(r.y2-r.y1),0,1)};}
function setEditTool(value){editTool=value;editSelection=null;canvas.classList.toggle('edit-select',value!=='move');updateImageEditor();renderPreview();}
function stampFont(size,weight=400){const faces={condensed:'"Arial Narrow","Roboto Condensed",Arial,sans-serif',arial:'Arial,sans-serif',roboto:'Roboto,"Segoe UI",Arial,sans-serif',tahoma:'Tahoma,Arial,sans-serif',verdana:'Verdana,Arial,sans-serif',serif:'Georgia,"Times New Roman",serif',mono:'Consolas,"Courier New",monospace',system:'system-ui,"Segoe UI",sans-serif',trebuchet:'"Trebuchet MS",Arial,sans-serif',impact:'Impact,"Arial Black",sans-serif',times:'"Times New Roman",Times,serif',courier:'"Courier New",Courier,monospace'};const originalWeight=Number(weight)||400,adjust=900-(Number(config.fontWeight)||900);const effectiveWeight=Math.max(400,Math.min(900,Math.round((originalWeight-adjust)/100)*100));return effectiveWeight+' '+Math.max(6,Math.round(size))+'px '+(faces[config.fontFamily]||faces.condensed);}
function fontStack(){return stampFont(16).split('px ').slice(1).join('px ');}
function fillForm(){const ids=['timeMode','batchDate','dateFormat','timeFormat','brandText','projectText','addressText','noteText','symbolType','logoMode','footerBrand','footerCaption','serialMode','serialText','fontFamily','fontWeight','timeScale','dateScale','addressScale','footerScale','serialScale','dateColor','addressColor','footerColor','serialColor','fontSize','fontFamily','fontWeight','timeScale','dateScale','addressScale','footerScale','serialScale','dateColor','addressColor','footerColor','serialColor','accentColor','textColor','bgOpacity','logoScale','outputSize','outputFormat','quality','cropRatio'];ids.forEach(id=>{const el=$(id);if(el)el.value=config[id];});['showDate','showTime','showBackground','showShadow','showFooter','showSerial'].forEach(id=>$(id).checked=!!config[id]);updateOutputs();updatePreset();updatePositionGrid();updateTarget();updateSelectionUI();}
function updateOutputs(){$('fontSizeValue').textContent=Number(config.fontSize).toFixed(1)+'%';$('bgValue').textContent=config.bgOpacity+'%';$('logoScaleValue').textContent=config.logoScale+'%';$('qualityValue').textContent=config.quality+'%';document.querySelectorAll('.image-quality-presets button').forEach(b=>b.classList.toggle('selected',+b.dataset.quality===+config.quality));$('serialPreview').textContent=photoSerial(previewIndex());$('accentLabel').textContent=config.accentColor.toUpperCase();$('textLabel').textContent=config.textColor.toUpperCase();['timeScale','dateScale','addressScale','footerScale','serialScale'].forEach(id=>{$(id+'Value').textContent=config[id]+'%';});['dateColor','addressColor','footerColor','serialColor'].forEach(id=>{$(id+'Label').textContent=config[id].toUpperCase();});}
function updatePreset(){document.querySelectorAll('.preset').forEach(el=>el.classList.toggle('active',el.dataset.preset===config.preset));const extra=$('presetExtra');if(extra&&INDEPENDENT_PRESETS.has(config.preset))extra.open=true;}
function updateTarget(){document.querySelectorAll('#moveTarget button').forEach(el=>el.classList.toggle('active',el.dataset.target===config.moveTarget));updatePositionGrid();}
function updatePositionGrid(){const prefix=config.moveTarget==='logo'?'logo':config.moveTarget==='footer'?'footer':config.moveTarget==='serial'?'serial':'pos',x=config[prefix+'X'],y=config[prefix+'Y'];document.querySelectorAll('#positionGrid button').forEach(el=>el.classList.toggle('active',Math.abs(+el.dataset.x-x)<.01&&Math.abs(+el.dataset.y-y)<.01));}
function changeConfig(name,value){config[name]=value;store();stashPhotoSettings();updateOutputs();updateSelectionUI();renderPreview();}
function ellipsis(g,s,maxWidth){s=String(s||'').replace(/\s+/g,' ').trim();if(g.measureText(s).width<=maxWidth)return s;while(s.length&&g.measureText(s+'…').width>maxWidth)s=s.slice(0,-1);return s+'…';}
function roundRect(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function emojiFor(v){return{construction:'🏗',location:'📍',camera:'📷',check:'✓',clock:'◷',none:''}[v]||'';}
// Rounded shield with a tick, using the EXISTING vertical label color.
function drawShieldCheck(g,size,color){
 g.save();g.scale(size/24,size/24);
 g.strokeStyle=color;g.lineWidth=1.9;g.lineCap='round';g.lineJoin='round';
 g.beginPath();g.moveTo(0,-10);g.lineTo(8,-7);g.lineTo(8,-.5);
 g.bezierCurveTo(8,4.5,4.8,8.4,0,10);
 g.bezierCurveTo(-4.8,8.4,-8,4.5,-8,-.5);
 g.lineTo(-8,-7);g.closePath();g.stroke();
 g.beginPath();g.moveTo(-3.1,0);g.lineTo(-.5,2.6);g.lineTo(4.2,-2.2);g.stroke();
 g.restore();
}
function drawContained(g,img,x,y,w,h){if(!img)return;const iw=img.width||img.naturalWidth,ih=img.height||img.naturalHeight;if(!iw||!ih)return;const ratio=Math.min(w/iw,h/ih);const dw=iw*ratio,dh=ih*ratio;g.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
function stampData(p){const date=photoDate(p),dateString=config.showDate?fmtDate(date):'',timeString=config.showTime?fmtTime(date):'';return{dateString,timeString,weekday:['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][date.getDay()],brand:textSafe(config.brandText),project:textSafe(config.projectText),location:textSafe(config.addressText),note:textSafe(config.noteText).replace(/\n/g,' · ')};}
function photoSerial(p){
  // 15 uppercase alphanumeric characters, as in the reference visual style.
  // The same selected photo keeps its code in preview, single export, and batch ZIP.
  const base=p?.serialCode||'3N6KB4DGN2L2B2B';
  if(config.serialMode==='prefix'){
    const prefix=textSafe(config.serialText).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
    if(prefix)return (prefix+base.slice(prefix.length)).slice(0,15);
  }
  return base;
}
/* TimeMark-style canvas layout, rendered on original photo pixels.
   This is a visual template, not a Timemark verified Photo Code. */
function drawReferenceStamp(g,W,H,p){
  const d=stampData(p),scale=Number(config.fontSize)/3.2;
  // Width-driven metrics preserve the proportions of the 1152x1536 reference.
  // For wide photos limit stamp size so the caption stays readable and balanced.
  const base=Math.max(8,Math.min(W,Math.min(W,H)*1.2)/1152*38*scale);
  const fontTime=base*3.95*Number(config.timeScale)/100, narrow=.66, fDate=base*1.02*Number(config.dateScale)/100, fWeek=base*.96*Number(config.dateScale)/100, fAddress=base*1.01*Number(config.addressScale)/100;
  const padx=Math.max(5,W*.030),pady=Math.max(5,H*.018);
  const timeText=d.timeString || '', dateText=d.dateString || '';
  const timeHeight=timeText?fontTime*1.13:0, dateHeight=dateText?Math.max(base*2.85,fDate*2.8):0, firstHeight=Math.max(timeHeight,dateHeight);
  const addressText=d.location, comments=[d.project,d.note].filter(Boolean);
  const locH=addressText?Math.max(base*1.52,fAddress*1.45):0, commentH=comments.length*base*1.08;
  const gap=addressText?base*.22:0, blockH=firstHeight+gap+locH+commentH;
  // posX / posY represent visual center, not text baseline. Keep side padding.
  let x=clamp(config.posX*W-W*.295,padx,Math.max(padx,W-W*.83-padx));
  let y=clamp(config.posY*H-blockH*.5,pady,Math.max(pady,H-blockH-pady));
  const maxW=Math.max(10,Math.min(W*.78,W-x-padx));
  g.save();g.textAlign='left';g.textBaseline='alphabetic';g.lineJoin='round';
  if(config.showBackground&&Number(config.bgOpacity)>0){
    g.fillStyle='rgba(4,10,17,'+(Number(config.bgOpacity)/155)+')';
    roundRect(g,x-base*.28,y-base*.35,maxW+base*.5,blockH+base*.45,base*.22);g.fill();
  }
  if(config.showShadow){g.shadowColor='rgba(0,0,0,.74)';g.shadowBlur=base*.19;g.shadowOffsetY=base*.095;}
  const white=config.textColor,gold=config.accentColor;
  let barX=x;
  if(timeText){
    g.font=stampFont(fontTime,config.fontWeight);
    // Keep numerals tall and narrow as in the user-supplied screenshot.
    const available=Math.max(base, maxW*.40),rawWidth=g.measureText(timeText).width;
    const squeeze=Math.min(narrow,available/Math.max(rawWidth,1));
    const painted=rawWidth*squeeze;
    g.fillStyle=white;
    g.save();g.translate(x,y+firstHeight*.87);g.scale(squeeze,1);g.fillText(timeText,0,0);g.restore();
    barX=x+painted+base*.86;
  }
  if(dateText){
    const textX=timeText?barX+base*.74:x;
    if(timeText){
      g.save();g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;g.fillStyle=gold;
      roundRect(g,barX,y+base*.20,Math.max(2,base*.105),firstHeight-base*.29,base*.04);g.fill();g.restore();
    }
    const avail=Math.max(base, W-textX-padx-W*.025);
    g.fillStyle=config.dateColor;g.font=stampFont(fDate,400);
    g.fillText(ellipsis(g,dateText,avail),textX,y+firstHeight*.47);
    g.font=stampFont(fWeek,400);
    g.fillText(ellipsis(g,d.weekday,avail),textX,y+firstHeight*.90);
  }
  let cursor=y+firstHeight;
  if(addressText){
    cursor+=gap+base*.30;
    g.fillStyle=config.addressColor;g.font=stampFont(fAddress,400);
    g.fillText(ellipsis(g,addressText,Math.min(maxW,W*.73)),x,cursor+fAddress*1.03);
    cursor+=locH;
  }
  for(const note of comments){
    g.fillStyle=config.addressColor;g.font=stampFont(base*.79*Number(config.addressScale)/100,400);
    g.fillText(ellipsis(g,note,maxW),x,cursor+base*.77);cursor+=base*1.08;
  }
  g.restore();return{x,y,width:maxW,height:blockH};
}
function drawReferenceFooter(g,W,H){
  if(!config.showFooter)return;
  const s=Number(config.fontSize)/3.2,base=Math.max(8,Math.min(W,Math.min(W,H)*1.2)/1152*38*s);
  const margin=Math.max(7,W*.020),allowed=Math.min(W*.42,Math.max(base*9.2,W*.28));
  const brandFont=base*1.20*Number(config.footerScale)/100,captionFont=base*.80*Number(config.footerScale)/100,blockH=brandFont+captionFont*1.46;
  const centeredX=clamp(config.footerX*W,margin+allowed/2,W-margin-allowed/2);
  const centerY=clamp(config.footerY*H,margin+blockH/2,H-margin-blockH/2);
  const x=centeredX-allowed/2,y=centerY-blockH/2;
  g.save();g.textAlign='right';g.textBaseline='alphabetic';
  if(config.showBackground&&Number(config.bgOpacity)>0){g.fillStyle='rgba(0,0,0,'+(Number(config.bgOpacity)/140)+')';roundRect(g,x-base*.12,y-base*.18,allowed+base*.24,blockH+base*.30,base*.19);g.fill();}
  if(config.showShadow){g.shadowColor='rgba(0,0,0,.76)';g.shadowBlur=base*.16;g.shadowOffsetY=base*.07;}
  let caption=textSafe(config.footerCaption),brand=textSafe(config.footerBrand)||'Timemark';
  let textRight=x+allowed;
  if(logoImg&&config.logoMode==='inside'){
    const sz=blockH*.68;
    drawContained(g,logoImg,x,y+base*.12,sz,sz);
  }
  g.font=stampFont(brandFont,700);
  let drawFont=brandFont;
  // Never shorten the brand to "HNL Photo…": fit down to 65%, else ellipsis.
  while(g.measureText(brand).width>allowed-(logoImg&&config.logoMode==='inside'?blockH*.65:0)&&drawFont>brandFont*.65){drawFont-=1;g.font=stampFont(drawFont,700);}
  const brandAvail=allowed-(logoImg&&config.logoMode==='inside'?blockH*.65:0);
  brand=ellipsis(g,brand,brandAvail);
  // The default Timemark wordmark is two-tone: Time uses the chosen accent
  // color, and mark remains white. Both runs share a baseline, fit and right edge.
  // Custom brand names keep the single user-selected footer color.
  if(brand==='Timemark'){
    const markWidth=g.measureText('mark').width;
    g.fillStyle='#ffffff';g.fillText('mark',textRight,y+brandFont*.96);
    g.fillStyle=config.footerColor;g.fillText('Time',textRight-markWidth,y+brandFont*.96);
  }else{
    g.fillStyle=config.footerColor;g.fillText(brand,textRight,y+brandFont*.96);
  }
  g.font=stampFont(captionFont,400);g.fillStyle='rgba(255,255,255,.95)';
  g.fillText(ellipsis(g,caption,allowed),textRight,y+brandFont+captionFont*1.12);
  g.restore();
}
function drawVerticalSerial(g,W,H,p){
  if(!config.showSerial)return;
  const s=Number(config.fontSize)/3.2,base=Math.max(8,Math.min(W,Math.min(W,H)*1.2)/1152*38*s);
  // The right-edge vertical label is separate from the lower-right wordmark.
  // Display text only: not an official authenticity verification.
  const serial=photoSerial(p),brand=textSafe(config.footerBrand)||'Timemark';
  const verticalBrand=brand==='Timemark'?'Timemark Verified':brand;
  const label=serial+'  |  '+verticalBrand;
  const f=base*.58*Number(config.serialScale)/100;
  g.save();g.textBaseline='middle';g.textAlign='center';g.font=stampFont(f,400);
  const labelW=Math.min(g.measureText(label).width,H*.68),maxSpan=Math.max(10,H*.76);
  const text=ellipsis(g,label,maxSpan),len=g.measureText(text).width;
  let x=clamp(config.serialX*W,Math.max(7,f*.8),W-Math.max(7,f*.45));
  let y=clamp(config.serialY*H,Math.max(8,len*.5+f*1.5),Math.max(len*.5+f*1.5,H-len*.5-f*1.5));
  g.translate(x,y);g.rotate(-Math.PI/2);
  if(config.showShadow){g.shadowColor='rgba(0,0,0,.84)';g.shadowBlur=f*.27;}
  g.fillStyle=config.serialColor;g.fillText(text,0,0);
  // Timemark-style shield-check at the START of the vertical photo code.
  // Decorative only: it does not certify authenticity.
  const ix=-len*.5-f*.84;g.save();g.translate(ix,0);
  drawShieldCheck(g,f*1.2,config.serialColor);
  g.restore();g.restore();
}
function drawStamp(g,W,H,p){const d=stampData(p),f=Math.max(9,Math.min(W,H)*Number(config.fontSize)/100),scale=f/24,pad=f*.62,inside=config.logoMode==='inside',symbol=emojiFor(config.symbolType),radius=f*.43;
const isMinimal=config.preset==='minimal',isRibbon=config.preset==='ribbon',isSite=config.preset==='site';const font=s=>Math.round(s)+'px '+fontStack();const maxWidth=W*.90;
const timeF=f*(isMinimal?1.22:isRibbon?1.35:isSite?2.05:2.6),dateF=f*(isMinimal?1.08:1),smallF=f*.90;
g.save();g.textBaseline='middle';let brandH=d.brand||inside?f*1.75:0,mainH=(d.timeString||d.dateString)?Math.max(timeF*1.2,d.dateString&&d.timeString?f*2.25:dateF*1.25):0;
let extra=[];if(d.project&&!isMinimal)extra.push({str:d.project,lead:'▣',color:'text'});if(d.location&&!isMinimal)extra.push({str:d.location,lead:'⌖',color:'text'});if(d.note&&!isMinimal)extra.push({str:d.note,lead:'✎',color:'text'});
if(isMinimal){brandH=inside?f*1.4:0;}
if(isRibbon){brandH=d.brand||inside?f*1.3:0;mainH=Math.max(timeF*1.23,f*1.35);}
const extraH=extra.length*f*1.35;
const measured=[];g.font='700 '+font(f*.95);if(d.brand)measured.push(g.measureText((symbol?symbol+' ':'')+d.brand).width+(inside?f*2.1:0));
g.font='800 '+font(timeF);const tw=g.measureText(d.timeString).width;g.font='600 '+font(dateF);const dw=g.measureText(d.dateString).width;
const totalTimeWidth=d.timeString&&d.dateString?tw+f*.75+dw:Math.max(tw,dw);measured.push(totalTimeWidth);
g.font='500 '+font(smallF);extra.forEach(row=>measured.push(g.measureText(row.str).width+f*1.25));
let sw=Math.min(maxWidth,Math.max(f*7,Math.max(...measured,0)+pad*2+(isRibbon?f*.7:0)));if(isRibbon)sw=Math.max(sw,Math.min(maxWidth,W*.78));let sh=pad*2+brandH+mainH+extraH+(brandH&&mainH?f*.15:0);if(sh<pad*2+f)sh=pad*2+f;
let px=clamp(config.posX*W-sw/2,f*.18,W-sw-f*.18),py=clamp(config.posY*H-sh/2,f*.18,H-sh-f*.18);
if(config.showShadow){g.shadowColor='rgba(0,0,0,.43)';g.shadowBlur=f*.26;g.shadowOffsetY=f*.08;}
if(config.showBackground&&Number(config.bgOpacity)>0){g.fillStyle='rgba(10,21,34,'+(Number(config.bgOpacity)/100)+')';roundRect(g,px,py,sw,sh,radius);g.fill();}
g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;
if(!isMinimal){g.fillStyle=config.accentColor;roundRect(g,px+pad*.35,py+pad,Math.max(2.5,f*.10),sh-2*pad,f*.05);g.fill();}
const ix=px+pad+(isMinimal?0:pad*.3),limit=px+sw-pad,content=limit-ix;let y=py+pad;
if(brandH){const lsize=isMinimal?f*1.2:f*1.5;if(inside){if(logoImg){drawContained(g,logoImg,ix,y,lsize,lsize);}else{g.fillStyle=config.accentColor;roundRect(g,ix,y,lsize,lsize,f*.22);g.fill();g.fillStyle='#172a43';g.font='900 '+font(lsize*.48);g.fillText('HNL',ix+lsize*.1,y+lsize*.51);} }
g.fillStyle=config.textColor;g.font='800 '+font(isRibbon?f*.76:f*.83);const start=ix+(inside?lsize+f*.39:0),prefix=symbol?symbol+'  ':'';const text=ellipsis(g,prefix+d.brand,limit-start);g.fillText(text,start,y+lsize*.51);y+=brandH+(mainH?f*.15:0);}
if(mainH){if(isRibbon){g.fillStyle=config.textColor;g.font='900 '+font(timeF);const both=(d.timeString||'')+(d.timeString&&d.dateString?'  |  ':'')+(d.dateString||'');g.fillText(ellipsis(g,both,content),ix,y+mainH*.48);}else if(isMinimal){g.fillStyle=config.textColor;g.font='800 '+font(timeF);const both=(d.dateString||'')+(d.dateString&&d.timeString?'  •  ':'')+(d.timeString||'');g.fillText(ellipsis(g,both,content),ix,y+mainH*.5);}else{let timeMax=content;if(d.timeString&&d.dateString)timeMax=content*.64;
g.fillStyle=config.textColor;g.font='900 '+font(timeF);const time=ellipsis(g,d.timeString,timeMax);g.fillText(time,ix,y+mainH*.49);if(d.dateString){g.fillStyle=config.accentColor;g.font='800 '+font(dateF);const dx=d.timeString?ix+timeMax+f*.22:ix;g.fillText(ellipsis(g,d.dateString,limit-dx),dx,y+mainH*(d.timeString?.35:.49));if(d.timeString){g.fillStyle=config.textColor;g.font='500 '+font(f*.72);g.fillText(d.weekday,dx,y+mainH*.75);}}}
y+=mainH;}
extra.forEach((item)=>{g.font='500 '+font(smallF);g.fillStyle=config.accentColor;g.fillText(item.lead,ix,y+f*.48);g.fillStyle=config.textColor;g.fillText(ellipsis(g,item.str,content-f*1.3),ix+f*1.1,y+f*.48);y+=f*1.35;});
g.restore();return{x:px,y:py,width:sw,height:sh};}
function drawFloatingLogo(g,W,H){if(config.logoMode!=='floating')return null;const scale=Number(config.logoScale)/100,base=Math.min(W,H)*.13*scale;let width=Math.max(40,base*1.6),height=Math.max(24,base*.7);if(logoImg){const ir=(logoImg.width||logoImg.naturalWidth)/(logoImg.height||logoImg.naturalHeight);if(ir>1){width=Math.min(W*.48,base*2*ir/2);height=width/ir;}else{height=Math.min(H*.25,base*1.1);width=height*ir;} }else{width=base*1.7;height=base*.87;}
width=clamp(width,22,W*.53);height=clamp(height,20,H*.3);const x=clamp(config.logoX*W-width/2,2,W-width-2),y=clamp(config.logoY*H-height/2,2,H-height-2);
g.save();if(logoImg){if(config.showBackground){g.fillStyle='rgba(255,255,255,.82)';roundRect(g,x-5,y-5,width+10,height+10,Math.min(14,W*.012));g.fill();}drawContained(g,logoImg,x,y,width,height);}else{g.fillStyle='rgba(20,37,59,'+(config.bgOpacity/100)+')';roundRect(g,x,y,width,height,Math.min(12,width*.12));g.fill();g.fillStyle=config.accentColor;g.fillRect(x,y,width*.07,height);g.fillStyle=config.textColor;g.font='900 '+Math.round(height*.51)+'px Arial,sans-serif';g.textBaseline='middle';g.fillText('HNL',x+width*.20,y+height*.52);}g.restore();return{x,y,width,height};}
function drawModernStamp(g,W,H,p){
 const d=stampData(p),style=config.preset;
 const size=Math.max(13,Math.min(W,H)*Number(config.fontSize)/105);
 const time=d.timeString,date=d.dateString,location=d.location;
 const main=style==='clock'?time:style==='compact'?[time,date].filter(Boolean).join('  •  '):time;
 const secondary=style==='clock'?'':style==='tech'?[date,d.project||'CAMERA 01'].filter(Boolean).join('  |  '):style==='cinema'?[date,d.note].filter(Boolean).join('  •  '):date;
 const x=clamp(config.posX*W,W*.02,W*.95),y=clamp(config.posY*H,H*.02,H*.96);
 g.save();g.textBaseline='alphabetic';g.textAlign='left';
 const primarySize=size*(style==='cinema'?2.3:style==='compact'?1.1:style==='tech'?1.7:style==='clock'?2.45:1.95);
 g.font=stampFont(primarySize,Number(config.fontWeight)||700);
 const pwidth=g.measureText(main).width;
 const secondarySize=size*(style==='compact'?.66:.83);
 g.font=stampFont(secondarySize,500);
 const p2width=Math.max(g.measureText(secondary).width,g.measureText(style==='clock'?'':location).width);
 const totalWidth=Math.max(pwidth,p2width)+size*1.5;
 const totalHeight=primarySize*1.35+(secondary?secondarySize*1.55:0)+(location&&style!=='clock'?secondarySize*1.35:0);
 const left=clamp(x-totalWidth*.5,Math.max(4,W*.018),Math.max(4,W-totalWidth-W*.018));
 const top=clamp(y-totalHeight*.5,Math.max(4,H*.012),Math.max(4,H-totalHeight-H*.012));
 if(config.showBackground){g.fillStyle='rgba(10,21,34,'+(Number(config.bgOpacity)/100)+')';roundRect(g,left,top,totalWidth,totalHeight,size*.25);g.fill();}
 if(config.showShadow){g.shadowColor='rgba(0,0,0,.7)';g.shadowBlur=size*.2;}
 if(style==='tech'){g.fillStyle=config.accentColor;g.fillRect(left,top,size*.1,totalHeight);}
 if(style==='cinema'){g.fillStyle=config.accentColor;g.fillRect(left,top+totalHeight-size*.13,totalWidth,size*.13);}
 let py=top+primarySize*1.08,px=left+size*.55;
 g.font=stampFont(primarySize,Number(config.fontWeight)||700);g.fillStyle=config.textColor;
 g.fillText(ellipsis(g,main,Math.max(size,W-px-W*.025)),px,py);
 if(secondary){py+=secondarySize*1.55;g.fillStyle=config.dateColor;g.font=stampFont(secondarySize,500);g.fillText(ellipsis(g,secondary,W-px-W*.025),px,py);}
 if(location&&style!=='clock'){py+=secondarySize*1.35;g.fillStyle=config.addressColor;g.font=stampFont(secondarySize*.93,400);g.fillText(ellipsis(g,location,W-px-W*.025),px,py);}
 g.restore();
 if(style!=='clock'&&config.showFooter)drawReferenceFooter(g,W,H);
 if(style!=='clock'&&config.showSerial)drawVerticalSerial(g,W,H,p);
}

// Standalone HNLMark stamp family. Never draws Timemark footer, shield or a
// "Verified" claim. Each preset reads the SAME date/time and photo metadata
// as the existing stamps so library edits, preview and video exports agree.
const INDEPENDENT_PRESETS=new Set(['site-log','inspection','shift','geo','survey','blueprint','bottom-strip','memory','led','journey','corner','metadata']);
function drawIndependentStamp(g,W,H,p){
 const d=stampData(p),style=config.preset;
 const unit=Math.max(8,Math.min(W,H)*Number(config.fontSize)/100);
 const accent=config.accentColor,bright=config.textColor;
 const pad=Math.max(unit*.55,5),margin=Math.max(3,W*.014);
 const wide=style==='bottom-strip'?W*.96:style==='inspection'?W*.71:style==='geo'?W*.75:style==='corner'?W*.48:W*.67;
 const width=clamp(wide,Math.min(W*.28,unit*9),W-margin*2);
 const height=style==='bottom-strip'?unit*4.2:style==='geo'?unit*5:style==='shift'?unit*5.4:style==='led'?unit*5.0:style==='corner'?unit*5.7:style==='memory'?unit*7.4:unit*7.0;
 const left=clamp(Number(config.posX)*W-width*.5,margin,Math.max(margin,W-width-margin));
 const top=clamp(Number(config.posY)*H-height*.5,Math.max(2,H*.01),Math.max(2,H-height-H*.01));
 const time=d.timeString||'',date=d.dateString||'',label=d.project||d.brand||'';
 const location=d.location||'',note=d.note||'';
 const middle=[time,date].filter(Boolean).join(' · ');
 const safe=(x,max)=>ellipsis(g,x,Math.max(2,max));
 const color=(v)=>{g.fillStyle=v;};
 const font=(sz,weight=700,mono=false,serif=false)=>{
  g.font=mono?`${weight} ${Math.max(7,Math.round(sz))}px Consolas,"Courier New",monospace`:serif?`${weight} ${Math.max(7,Math.round(sz))}px Georgia,"Times New Roman",serif`:stampFont(sz,weight);
 };
 const text=(str,x,y,sz,weight,fill,max,mono=false,serif=false)=>{
  if(!str)return;g.fillStyle=fill;font(sz,weight,mono,serif);g.fillText(safe(str,max),x,y);
 };
 const rounded=(x,y,w,h,r,fill,stroke)=>{
  roundRect(g,x,y,w,h,r);if(fill){color(fill);g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=Math.max(1,unit*.065);g.stroke();}
 };
 const shadow=()=>{if(config.showShadow){g.shadowColor='rgba(0,0,0,.58)';g.shadowBlur=unit*.35;g.shadowOffsetY=unit*.12;}};
 const clearShadow=()=>{g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;};
 const widthIn=width-pad*2;
 g.save();g.textBaseline='top';g.textAlign='left';shadow();
 if(style==='site-log'){
  rounded(left,top,width,height,unit*.35,'rgba(12,32,50,.84)');clearShadow();
  color(accent);g.fillRect(left,top,unit*.24,height);
  text('NHẬT KÝ THI CÔNG',left+pad,top+unit*.48,unit*.77,800,accent,widthIn);
  text(time,left+pad,top+unit*1.55,unit*2.12,900,bright,widthIn*.62);
  text(date,left+pad,top+unit*4.04,unit*1.03,750,bright,widthIn);
  text(d.project||location||d.note,left+pad,top+unit*5.43,unit*.75,500,bright,widthIn);
 }else if(style==='inspection'){
  rounded(left,top,width,height,unit*.24,'rgba(246,255,249,.95)','#91c8ac');clearShadow();
  color('#26866c');g.fillRect(left,top,unit*.21,height);
  text('HỒ SƠ ẢNH • NGHIỆM THU',left+pad,top+unit*.44,unit*.76,800,'#277a60',widthIn);
  text(date,left+pad,top+unit*1.70,unit*1.38,850,'#1d3546',widthIn);
  text(time,left+pad,top+unit*3.52,unit*1.64,900,'#1d3546',widthIn);
  text(d.project||location||note,left+pad,top+unit*5.58,unit*.68,550,'#355668',widthIn);
 }else if(style==='shift'){
  rounded(left,top,width,height,unit*.26,'rgba(246,232,192,.94)');clearShadow();
  color('#b77829');g.fillRect(left,top,unit*.23,height);
  text('CA LÀM VIỆC',left+pad,top+unit*.38,unit*.80,800,'#86562a',widthIn);
  text(time,left+pad,top+unit*1.55,unit*2.23,850,'#442b18',widthIn*.72);
  text(date,left+pad,top+unit*4.20,unit*.85,650,'#68503a',widthIn);
 }else if(style==='geo'){
  rounded(left,top,width,height,unit*1.05,'rgba(4,55,69,.85)');clearShadow();
  color('#63e2db');g.beginPath();g.arc(left+unit*1.28,top+unit*1.15,unit*.40,0,Math.PI*2);g.fill();
  text('ĐỊA ĐIỂM ẢNH',left+unit*2.04,top+unit*.72,unit*.76,800,'#8fe6e0',width-unit*2.65);
  text(location||d.project,left+pad,top+unit*2.0,unit*1.00,750,'#ffffff',widthIn);
  text(middle,left+pad,top+unit*3.54,unit*.92,600,'#d2f5f2',widthIn);
 }else if(style==='survey'){
  if(config.showBackground)rounded(left,top,width,height,unit*.16,'rgba(233,248,248,.90)');clearShadow();
  g.strokeStyle=accent;g.lineWidth=Math.max(2,unit*.11);
  const r=unit*.65;g.beginPath();g.moveTo(left,top+r);g.lineTo(left,top);g.lineTo(left+r,top);
  g.moveTo(left+width-r,top+height);g.lineTo(left+width,top+height);g.lineTo(left+width,top+height-r);g.stroke();
  text('KHẢO SÁT HIỆN TRƯỜNG',left+pad,top+unit*.55,unit*.86,800,config.showBackground?'#264f5b':bright,widthIn);
  text(date,left+pad,top+unit*1.88,unit*1.34,800,config.showBackground?'#1b3e52':bright,widthIn);
  text(time,left+pad,top+unit*3.63,unit*1.38,850,config.showBackground?'#1b3e52':bright,widthIn);
  text(d.project||location,left+pad,top+unit*5.53,unit*.73,500,config.showBackground?'#3d6770':bright,widthIn);
 }else if(style==='blueprint'){
  rounded(left,top,width,height,unit*.16,'rgba(11,57,110,.88)','#67b3e5');clearShadow();
  g.strokeStyle='rgba(161,219,244,.45)';g.lineWidth=Math.max(1,unit*.03);g.strokeRect(left+unit*.25,top+unit*.25,width-unit*.5,height-unit*.5);
  text('ẢNH KỸ THUẬT / HIỆN TRƯỜNG',left+pad,top+unit*.59,unit*.76,800,'#8cdbff',widthIn);
  text(date,left+pad,top+unit*2.06,unit*1.36,800,'#ffffff',widthIn,true);
  text(time,left+pad,top+unit*3.74,unit*1.45,850,'#ffffff',widthIn,true);
  text(d.project||location,left+pad,top+unit*5.73,unit*.70,500,'#d5eeff',widthIn,true);
 }else if(style==='bottom-strip'){
  rounded(left,top,width,height,unit*.18,'rgba(14,23,35,.88)');clearShadow();
  color(accent);g.fillRect(left,top,Math.max(3,unit*.18),height);
  const split=width*.56;
  text(date,left+pad,top+unit*.69,unit*1.10,700,'#f4f8ff',split-pad*1.5);
  text(time,left+pad,top+unit*2.24,unit*1.24,850,'#ffffff',split-pad*1.5);
  text(location||d.project||d.brand,left+split,top+unit*1.44,unit*.74,600,'#dfeefb',width-split-pad);
 }else if(style==='memory'){
  rounded(left,top,width,height,unit*.20,'rgba(252,247,233,.92)','#e4d5b7');clearShadow();
  color('#c38c60');g.fillRect(left+pad,top+unit*.78,widthIn,unit*.08);
  text('NGÀY ĐÁNG NHỚ',left+pad,top+unit*1.15,unit*.67,650,'#a9785d',widthIn,true);
  text(date,left+pad,top+unit*2.20,unit*1.50,750,'#704833',widthIn,false,true);
  text(time,left+pad,top+unit*4.47,unit*1.33,600,'#805b42',widthIn,false,true);
  text(note||location,left+pad,top+unit*6.25,unit*.63,500,'#a67e67',widthIn);
 }else if(style==='led'){
  rounded(left,top,width,height,unit*.40,'rgba(8,17,21,.92)','#426d50');clearShadow();
  text(time,left+pad,top+unit*.70,unit*2.40,800,'#a6fbb1',widthIn,true);
  text(date,left+pad,top+unit*3.67,unit*.74,500,'#79b68a',widthIn,true);
 }else if(style==='journey'){
  rounded(left,top,width,height,unit*1.2,'rgba(218,241,232,.92)');clearShadow();
  text('NHẬT KÝ HÀNH TRÌNH',left+pad,top+unit*.73,unit*.77,750,'#286b61',widthIn);
  text(date,left+pad,top+unit*2.06,unit*1.35,800,'#1b4a48',widthIn);
  text(time,left+pad,top+unit*3.90,unit*1.27,750,'#20605e',widthIn);
  text(location||note,left+pad,top+unit*5.80,unit*.70,550,'#36766a',widthIn);
 }else if(style==='corner'){
  clearShadow();g.strokeStyle=accent;g.lineWidth=Math.max(2,unit*.15);g.beginPath();
  g.moveTo(left,top+height*.85);g.lineTo(left,top);g.lineTo(left+width*.28,top);g.stroke();
  if(config.showBackground)rounded(left+unit*.14,top+unit*.25,width-unit*.14,height-unit*.56,unit*.16,'rgba(11,25,42,.55)');
  text(time,left+pad,top+unit*1.03,unit*1.86,850,bright,widthIn);
  text(date,left+pad,top+unit*3.43,unit*.88,700,config.dateColor,widthIn);
  text(location||note,left+pad,top+unit*4.70,unit*.60,500,config.addressColor,widthIn);
 }else if(style==='metadata'){
  rounded(left,top,width,height,unit*.14,'rgba(14,25,34,.87)','#7093a8');clearShadow();
  color('#80bedc');g.fillRect(left,top,width,unit*.12);
  text('ẢNH SỐ  //  THÔNG TIN',left+pad,top+unit*.52,unit*.72,650,'#87b9d3',widthIn,true);
  text('DATE  '+date,left+pad,top+unit*2.04,unit*.94,650,'#f0f6fc',widthIn,true);
  text('TIME  '+time,left+pad,top+unit*3.65,unit*.94,650,'#f0f6fc',widthIn,true);
  text(d.project||location,left+pad,top+unit*5.70,unit*.68,450,'#b4d0e1',widthIn,true);
 }
 g.restore();
 // Unlike the legacy Timemark templates, the optional metadata is unverified
 // user content and contains NO checkmark, Timemark label or brand assertion.
 if(config.showFooter && style!=='bottom-strip')drawIndependentFooter(g,W,H);
 if(config.showSerial)drawIndependentSerial(g,W,H,p);
}
function drawIndependentFooter(g,W,H){
 const unit=Math.max(8,Math.min(W,H)*Number(config.fontSize)/100),margin=Math.max(5,W*.02);
 const textSize=unit*.85*Number(config.footerScale)/100;
 const captionSize=unit*.61*Number(config.footerScale)/100;
 const brand=textSafe(config.footerBrand)==='Timemark'?'HNL Mark':textSafe(config.footerBrand)||'HNL Mark';
 const caption=textSafe(config.footerCaption);
 const w=Math.min(W*.38,Math.max(unit*5,W*.23)),h=textSize+captionSize*1.48+unit*.34;
 const x=clamp(config.footerX*W-w/2,margin,W-w-margin),y=clamp(config.footerY*H-h/2,margin,H-h-margin);
 g.save();g.textAlign='right';g.textBaseline='top';
 if(config.showShadow){g.shadowColor='#000c';g.shadowBlur=unit*.16;}
 g.fillStyle=config.footerColor;g.font=stampFont(textSize,750);g.fillText(ellipsis(g,brand,w),x+w,y);
 g.fillStyle=config.textColor;g.font=stampFont(captionSize,450);g.fillText(ellipsis(g,caption,w),x+w,y+textSize*1.22);
 g.restore();
}
function drawIndependentSerial(g,W,H,p){
 const unit=Math.max(8,Math.min(W,H)*Number(config.fontSize)/100),fontSize=Math.max(8,unit*.55*Number(config.serialScale)/100);
 g.save();g.textAlign='center';g.textBaseline='middle';g.font=stampFont(fontSize,500);
 const mark='ID '+photoSerial(p),label=ellipsis(g,mark,H*.63),len=g.measureText(label).width;
 const x=clamp(config.serialX*W,Math.max(6,fontSize*.7),W-Math.max(6,fontSize*.7));
 const y=clamp(config.serialY*H,len*.5+fontSize,Math.max(len*.5+fontSize,H-len*.5-fontSize));
 g.translate(x,y);g.rotate(-Math.PI/2);
 if(config.showShadow){g.shadowColor='#000b';g.shadowBlur=unit*.15;}
 g.fillStyle=config.serialColor;g.fillText(label,0,0);g.restore();
}

function drawOverlay(g,W,H,p){
 if(config.preset==='none')return;
 if(config.preset==='timemark'){drawReferenceStamp(g,W,H,p);drawReferenceFooter(g,W,H);drawVerticalSerial(g,W,H,p);}
 else if(INDEPENDENT_PRESETS.has(config.preset))drawIndependentStamp(g,W,H,p);
 else if(['clean','tech','cinema','compact','clock'].includes(config.preset))drawModernStamp(g,W,H,p);
 else drawStamp(g,W,H,p);
 drawFloatingLogo(g,W,H);
}
function drawPlaceholder(){const W=1000,H=600;canvas.width=W;canvas.height=H;const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#4c758d');sky.addColorStop(.60,'#9fb5bd');sky.addColorStop(1,'#516778');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);for(let i=0;i<17;i++){const x=i*74-25,bh=115+(i*37)%200;ctx.fillStyle=i%2?'#435e72':'#526f80';ctx.fillRect(x,H-bh,66,bh);ctx.strokeStyle='#a9c0c7';ctx.lineWidth=2;for(let yy=H-bh+18;yy<H-10;yy+=29){ctx.beginPath();ctx.moveTo(x+8,yy);ctx.lineTo(x+60,yy);ctx.stroke();}}ctx.strokeStyle='#d6e2e5';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(640,70);ctx.lineTo(640,520);ctx.moveTo(640,95);ctx.lineTo(900,95);ctx.moveTo(640,95);ctx.lineTo(430,175);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(835,95);ctx.lineTo(835,400);ctx.stroke();ctx.fillStyle='rgba(13,25,40,.35)';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(255,255,255,.91)';ctx.textAlign='center';ctx.font='800 26px Arial';ctx.fillText('ẢNH MINH HỌA',500,63);ctx.font='400 16px Arial';ctx.fillText('Chọn ảnh thật để xem và xuất dấu thời gian',500,92);ctx.textAlign='start';drawOverlay(ctx,W,H,{exifDate:new Date(2026,8,20,9,30,25),modifiedDate:new Date(2026,8,20,9,30,25)});$('previewDimensions').textContent='Bản xem mẫu';}

/* Nondestructive per-photo image operations. Coordinates stay normalized after
   every crop/rotation, so full-size exports and 1400px previews match. */
function canvas2d(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c;}
function regionPx(r,W,H){const x=clamp(Math.floor(r.x*W),0,W-1),y=clamp(Math.floor(r.y*H),0,H-1);return {x,y,w:clamp(Math.round(r.w*W),1,W-x),h:clamp(Math.round(r.h*H),1,H-y)};}
function repairClone(c,op){
 const W=c.width,H=c.height,{x,y,w,h}=regionPx(op.rect,W,H),g=c.getContext('2d',{willReadFrequently:true});
 if(w<2||h<2||w>W*.75||h>H*.75) return;
 const dirs={up:[0,-h-Math.max(4,Math.ceil(h*.12))],down:[0,h+Math.max(4,Math.ceil(h*.12))],left:[-w-Math.max(4,Math.ceil(w*.12)),0],right:[w+Math.max(4,Math.ceil(w*.12)),0]};
 const choices=Object.entries(dirs).filter(([,d])=>x+d[0]>=0&&y+d[1]>=0&&x+d[0]+w<=W&&y+d[1]+h<=H);
 if(!choices.length){repairBlur(c,{x,y,w,h});return;}
 let choice=choices.find(([name])=>name===op.direction);
 if(!choice){
   // Sample only the edited rectangle; a full 12MP getImageData can exhaust mobile RAM.
   const target=g.getImageData(x,y,w,h).data;
   let best=Infinity;
   for(const entry of choices){const [dx,dy]=entry[1],sample=g.getImageData(x+dx,y+dy,w,h).data;let score=0,count=0;
     const step=Math.max(1,Math.round(Math.min(w,h)/18));
     for(let xx=0;xx<w;xx+=step){for(const yy of [0,h-1]){const i=(yy*w+xx)*4;for(let k=0;k<3;k++)score+=Math.abs(target[i+k]-sample[i+k]);count++;}}
     for(let yy=0;yy<h;yy+=step){for(const xx of [0,w-1]){const i=(yy*w+xx)*4;for(let k=0;k<3;k++)score+=Math.abs(target[i+k]-sample[i+k]);count++;}}
     score/=Math.max(1,count);if(score<best){best=score;choice=entry;}
   }
 }
 const [dx,dy]=choice[1],src=g.getImageData(x+dx,y+dy,w,h);
 const original=g.getImageData(x,y,w,h);const srcPx=src.data,old=original.data;
 const feather=Math.max(1,Math.min(14,Math.floor(Math.min(w,h)*.12)));
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
   const dist=Math.min(xx,yy,w-1-xx,h-1-yy);const t=Math.min(1,Math.max(0,(dist+1)/feather));const alpha=.76+.24*t;
   const i=(yy*w+xx)*4;for(let k=0;k<3;k++)old[i+k]=Math.round(old[i+k]*(1-alpha)+srcPx[i+k]*alpha);
 }
 g.putImageData(original,x,y);
}
function repairBlur(c,r){const {x,y,w,h}=r,g=c.getContext('2d');const sample=canvas2d(w,h);sample.getContext('2d').drawImage(c,x,y,w,h,0,0,w,h);const sm=canvas2d(Math.max(1,Math.floor(w/26)),Math.max(1,Math.floor(h/26)));sm.getContext('2d').drawImage(sample,0,0,sm.width,sm.height);g.imageSmoothingEnabled=true;g.drawImage(sm,0,0,sm.width,sm.height,x,y,w,h);}
function editStep(c,op){
 const W=c.width,H=c.height;
 if(op.type==='crop'){const {x,y,w,h}=regionPx(op.rect,W,H);const next=canvas2d(w,h);next.getContext('2d').drawImage(c,x,y,w,h,0,0,w,h);return next;}
 if(op.type==='rotate'){const next=canvas2d(H,W),g=next.getContext('2d');g.translate(op.deg===90?H:0,op.deg===90?0:W);g.rotate(op.deg*Math.PI/180);g.drawImage(c,0,0);return next;}
 if(op.type==='repair'){const r=regionPx(op.rect,W,H);if(op.direction==='blur')repairBlur(c,r);else repairClone(c,op);return c;}
 return c;
}
function applyFilters(c,filters){
 if(!filters||Object.values(filters).every(v=>!Number(v)))return c;
 const out=canvas2d(c.width,c.height),g=out.getContext('2d',{alpha:false});
 g.filter=`brightness(${Math.max(.35,1+filters.brightness/100)}) contrast(${Math.max(.3,1+filters.contrast/100)}) saturate(${Math.max(.2,1+filters.saturation/100)})`;
 g.drawImage(c,0,0);g.filter='none';
 if(filters.warmth){g.globalCompositeOperation='soft-light';g.fillStyle=filters.warmth>0?`rgba(255,136,58,${Math.abs(filters.warmth)/260})`:`rgba(60,156,255,${Math.abs(filters.warmth)/260})`;g.fillRect(0,0,out.width,out.height);g.globalCompositeOperation='source-over';}
 return out;
}
async function buildEditedImage(p,maxSide){
 const img=await getBitmap(p);const s=Math.min(1,maxSide/Math.max(img.width,img.height));let c=canvas2d(Math.round(img.width*s),Math.round(img.height*s));
 c.getContext('2d',{alpha:false}).drawImage(img,0,0,c.width,c.height);
 const edits=photoEdits(p);
 for(const op of edits.operations)c=editStep(c,op);
 return applyFilters(c,edits.filters);
}
function snapshotPreview(){previewSnapshot.width=canvas.width;previewSnapshot.height=canvas.height;previewSnapshot.getContext('2d').drawImage(canvas,0,0);}
function drawEditSelection(){
 if(editTool==='move'||!previewIndex())return;
 const g=ctx,W=canvas.width,H=canvas.height;g.clearRect(0,0,W,H);g.drawImage(previewSnapshot,0,0);
 const r=normalizeRegion();if(!r)return;const x=r.x*W,y=r.y*H,w=r.w*W,h=r.h*H;
 g.save();g.fillStyle='rgba(18,54,99,.23)';g.fillRect(0,0,W,y);g.fillRect(0,y,x,h);g.fillRect(x+w,y,W-x-w,h);g.fillRect(0,y+h,W,H-y-h);
 g.fillStyle='rgba(41,116,245,.08)';g.fillRect(x,y,w,h);g.strokeStyle='#ffcf48';g.lineWidth=Math.max(2,W*.003);g.setLineDash([W*.012,W*.006]);g.strokeRect(x,y,w,h);
 g.restore();
}
async function renderPreview(){
 if(cameraActive)return;const p=previewIndex(),token=++isRendering;updateSelectionUI();
 if(!p){drawPlaceholder();return;}
 $('canvasSpinner').hidden=false;
 try{const edited=await buildEditedImage(p,1400);if(token!==isRendering)return;
   canvas.width=edited.width;canvas.height=edited.height;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(edited,0,0);
   if(editTool==='move')drawOverlay(ctx,canvas.width,canvas.height,p);
   snapshotPreview();drawEditSelection();
   $('previewDimensions').textContent=edited.width+' × '+edited.height+' px (xem trước)';
 }catch(e){canvas.width=720;canvas.height=360;ctx.fillStyle='#12253d';ctx.fillRect(0,0,720,360);ctx.fillStyle='white';ctx.font='17px Arial';ctx.fillText('Không mở được ảnh. Hãy thử JPG hoặc PNG.',20,170);showError(e);}
 finally{if(token===isRendering)$('canvasSpinner').hidden=true;}
}
async function renderBlob(p){
 const restore={...config};if(p?.stampConfig)Object.assign(config,migrateStampLabels(p.stampConfig));
 try{
 const max=config.outputSize==='original'?Infinity:+config.outputSize;
 const edited=await buildEditedImage(p,max);
 const c=canvas2d(edited.width,edited.height),g=c.getContext('2d',{alpha:false});g.drawImage(edited,0,0);
 drawOverlay(g,c.width,c.height,p);
 const mimetype=config.outputFormat==='png'?'image/png':'image/jpeg';
 return await new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error('Không xuất được ảnh (thiếu bộ nhớ hoặc định dạng chưa hỗ trợ).')),mimetype,Number(config.quality)/100));
 }finally{Object.assign(config,restore);}
}
function outputName(p,blob){const stem=p.file.name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,'_').slice(0,65)||'photo';const settings=p.stampConfig||config,d=photoDate(p,settings);const extension=blob?.type==='image/png'?'png':blob?.type==='image/jpeg'?'jpg':settings.outputFormat==='png'?'png':'jpg';return stem+'_HNLMark_'+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'_'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds())+'_TM-'+p.serialCode+'.'+extension;}
function download(blob,name){
 if(window.HNLAndroidApp?.saveBlob){
  window.HNLAndroidApp.saveBlob(blob,name).catch(showError);
  return;
 }
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),40000);
}
function crc32(data){let c=-1;for(const b of data){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^(-1))>>>0;}
function zipStored(entries){const encode=new TextEncoder(),parts=[],central=[];let offset=0;const now=new Date(),dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
for(const entry of entries){const name=encode.encode(entry.name),data=new Uint8Array(entry.bytes),crc=crc32(data),n=data.byteLength;if(offset+n>0xffffffff)throw new Error('ZIP quá 4GB. Hãy chia ảnh thành nhiều đợt.');const local=new Uint8Array(30+name.length),dv=new DataView(local.buffer);dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);dv.setUint16(8,0,true);dv.setUint16(10,dosTime,true);dv.setUint16(12,dosDate,true);dv.setUint32(14,crc,true);dv.setUint32(18,n,true);dv.setUint32(22,n,true);dv.setUint16(26,name.length,true);local.set(name,30);parts.push(local,data);
const cd=new Uint8Array(46+name.length),d=new DataView(cd.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);d.setUint16(10,0,true);d.setUint16(12,dosTime,true);d.setUint16(14,dosDate,true);d.setUint32(16,crc,true);d.setUint32(20,n,true);d.setUint32(24,n,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);cd.set(name,46);central.push(cd);offset+=local.length+n;}
const centralSize=central.reduce((t,c)=>t+c.byteLength,0);const end=new Uint8Array(22),dv=new DataView(end.buffer);dv.setUint32(0,0x06054b50,true);dv.setUint16(8,entries.length,true);dv.setUint16(10,entries.length,true);dv.setUint32(12,centralSize,true);dv.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});}
function progress(label,index,total){$('progress').hidden=false;$('progressLabel').textContent=label;$('progressNumbers').textContent=index+' / '+total;$('progressBar').style.width=Math.round(index/Math.max(1,total)*100)+'%';}
function setBusy(v){busy=v;if($('openCamera'))$('openCamera').disabled=v||cameraActive||cameraShotPending;$('saveOne').disabled=v||!previewIndex();$('saveAll').disabled=v||!previewIndex();$('photoInput').disabled=v;$('logoInput').disabled=v;}
async function saveOne(){if(busy||!previewIndex())return;setBusy(true);progress('Đang tạo ảnh...',0,1);try{const p=previewIndex();const blob=await renderBlob(p);download(blob,outputName(p,blob));progress('Đã tạo ảnh',1,1);showToast('Đã tạo file ảnh. Kiểm tra thư mục Tải xuống của thiết bị.');}catch(e){showError(e);}finally{setBusy(false);setTimeout(()=>$('progress').hidden=true,3000);}}
async function saveAll(){if(busy||!photos.length)return;setBusy(true);let list=[];const count=photos.length;progress('Đang chuẩn bị ảnh...',0,count);try{for(let i=0;i<count;i++){const p=photos[i];progress('Đang xuất '+p.file.name,i,count);const blob=await renderBlob(p);const bytes=await blob.arrayBuffer();list.push({name:(i+1)+'_'+outputName(p,blob),bytes});progress('Đã xử lý',i+1,count);await new Promise(r=>setTimeout(r,0));}const zip=zipStored(list);download(zip,'HNLMark_'+new Date().toISOString().slice(0,10)+'_'+count+'_anh.zip');showToast('Đã đóng gói '+count+' ảnh trong ZIP. Kiểm tra mục Tải xuống.');}catch(e){showError(e);}finally{list=[];setBusy(false);setTimeout(()=>$('progress').hidden=true,3500);}}

/* Camera mode: in-place live preview rendered on the SAME canvas as exported photos.
   Camera frames are held in memory; no upload or network camera service is used. */
// Keep the camera-system fallback available, but display it only if in-browser
// camera is unavailable or a real attempt to open it failed.
function cameraSystemFallback(show){
  const label=$('cameraFallback')?.closest('.camera-fallback');
  if(label)label.hidden=!show;
}
function cameraUi(){
  // The full-screen mobile camera prevents settings and long guidance from crowding the view.
  document.body.classList.toggle('hnl-camera-live',cameraActive||cameraShotPending);
  $('cameraArea').classList.toggle('hnl-capture-screen',cameraActive||cameraShotPending);
  $('cameraControls').hidden=!cameraActive;
  $('cameraReview').hidden=!cameraShotPending;
  $('openCamera').disabled=busy||cameraActive||cameraShotPending;
  $('openCamera').classList.toggle('is-live',cameraActive);
  $('viewBadge').textContent=cameraActive?'Camera & dấu tự xoay theo máy':cameraShotPending?'Kiểm tra ảnh rồi dùng hoặc chụp lại':'Kéo phần đang chọn để đổi vị trí';
  $('saveOne').disabled=busy||cameraActive||!previewIndex();
  $('saveAll').disabled=busy||cameraActive||!previewIndex();
  $('shutterButton').disabled=cameraCapturing;
  if($('burstMode'))$('burstMode').checked=burstEnabled;
  if($('cameraShotCount'))$('cameraShotCount').textContent=burstCount+' ảnh';
  updateImageEditor();
}
function stopCamera(showPrevious=true,preserveReviewLayout=false){
  if(cameraControls){cameraControls.destroy();cameraControls=null;}
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  ++cameraRequest;
  cameraActive=false;
  if(cameraRAF)cancelAnimationFrame(cameraRAF);
  cameraRAF=0;
  if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null;}
  const video=$('cameraVideo');if(video){video.pause();video.srcObject=null;}
  cameraCapturing=false;
  if(!preserveReviewLayout)clearOrientationUi();
  cameraUi();
  if(showPrevious)renderPreview();
}
/* v2.0.4: sensor fusion and fast physical orientation tracking.
   A locked Android browser may report portrait forever even while the phone is
   sideways. Motion gravity (x/y) is the first choice; beta/gamma is fallback.
   Thresholds use hysteresis so a minor hand shake does not flip the UI. */
function devicePortrait(){
  const media=window.matchMedia?.('(orientation: portrait)');
  if(media)return media.matches;
  const orientation=screen.orientation?.type;
  if(orientation)return orientation.startsWith('portrait');
  return window.innerHeight>=window.innerWidth;
}
function acceptPhysicalOrientation(candidate,source){
  if(!candidate||!cameraActive)return;
  const now=performance.now();
  // DeviceOrientation is not as robust as gravity if both APIs are available.
  if(source==='orientation'&&cameraMotionAt&&now-cameraMotionAt<1600)return;
  if(candidate!==cameraSensorCandidate){cameraSensorCandidate=candidate;cameraSensorSamples=1;cameraSensorCandidateAt=now;}
  else cameraSensorSamples++;
  // Three consecutive samples (typically ~50 ms), or two samples over 80 ms.
  if(cameraSensorSamples<3&&!(cameraSensorSamples>=2&&now-cameraSensorCandidateAt>=80))return;
  const portrait=candidate==='portrait',side=portrait?0:(candidate==='landscape-right'?1:-1);
  cameraSensorAt=Date.now();
  if(cameraSensorPortrait!==portrait||cameraSensorSide!==side||cameraSensorSource!==source){
    cameraSensorPortrait=portrait;cameraSensorSide=side;cameraSensorSource=source;
    refreshCameraOrientation();
  }
}
function handleCameraMotion(e){
  if(!cameraActive)return;
  const gravity=e.accelerationIncludingGravity;
  if(!gravity)return;
  if(gravity.x==null||gravity.y==null)return;
  const x=Number(gravity.x),y=Number(gravity.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const ax=Math.abs(x),ay=Math.abs(y),plane=Math.hypot(x,y);
  // Nearly horizontal phones have no reliable left/right gravity direction.
  if(plane<3.5)return;
  cameraMotionAt=performance.now();
  const currentPortrait=cameraSensorPortrait??devicePortrait();
  // Enter the new axis after a modest 12% advantage; retain the current one
  // near the 45 degree boundary. This responds earlier than v2.0.3's 55° gate.
  let candidate='';
  if(ax>ay*1.12&&ax>3.3){
    const orientationSign=cameraOrientationAt&&performance.now()-cameraOrientationAt<1800&&cameraOrientationSide?cameraOrientationSide:Math.sign(x);
    candidate=orientationSign>=0?'landscape-right':'landscape-left';
  }else if(ay>ax*1.12&&ay>3.3)candidate='portrait';
  // Do not erase the last good posture at the 45 degree crossover.
  if(candidate)acceptPhysicalOrientation(candidate,'motion');
}
function handleCameraPosture(e){
  if(!cameraActive)return;
  const beta=Number(e.beta),gamma=Number(e.gamma);
  if(!Number.isFinite(beta)||!Number.isFinite(gamma))return;
  const b=Math.abs(beta),g=Math.abs(gamma);
  if(g>24){cameraOrientationSide=Math.sign(gamma);cameraOrientationAt=performance.now();}
  // Motion gravity has precedence; orientation events are a useful fallback on
  // browsers without DeviceMotion permission or accelerationIncludingGravity.
  if(cameraMotionAt&&performance.now()-cameraMotionAt<1600)return;
  let candidate='';
  if(g>=28&&g>b*1.12)candidate=gamma>=0?'landscape-right':'landscape-left';
  else if(b>=28&&b>g*1.12)candidate='portrait';
  if(candidate)acceptPhysicalOrientation(candidate,'orientation');
}
async function requestCameraSensorPermission(){
  // Safari iOS requires this from a direct button tap; Android resolves
  // without a prompt. Failure must not prevent taking photos or using manual rotate.
  const requests=[];
  for(const api of [window.DeviceMotionEvent,window.DeviceOrientationEvent]){
    if(typeof api?.requestPermission==='function'){
      try{requests.push(Promise.resolve(api.requestPermission()).catch(()=>null));}catch(_){/* optional sensor */}
    }
  }
  if(requests.length)await Promise.all(requests);
}
function cameraGeometry(video){
  const rawW=video.videoWidth,rawH=video.videoHeight;
  // The portrait-locked APK receives a reliable physical angle from Android.
  // DeviceMotion can be unavailable in WebView; use native pose when present.
  const nativeAngle=window.HNLAndroidApp?.getDeviceAngle?.();
  const nativePose=Number.isFinite(nativeAngle)&&[0,90,180,270].includes(nativeAngle);
  const physicalSensor=nativePose||cameraSensorPortrait!==null;
  const expectedPortrait=nativePose?nativeAngle%180===0:(physicalSensor?cameraSensorPortrait:devicePortrait());
  const side=nativePose?(nativeAngle===270?-1:1):cameraSensorSide;
  let baseRotation=0;
  // The video frame might be landscape-native while the phone is portrait,
  // or vice versa. Rotate source pixels, not only the canvas with CSS.
  if((rawH>=rawW)!==expectedPortrait){
    if(physicalSensor&&!expectedPortrait)baseRotation=side===1?90:-90;
    else {
      const angle=Number(screen.orientation?.angle);
      const secondary=screen.orientation?.type?.endsWith('secondary')||false;
      baseRotation=expectedPortrait?(secondary||angle===180?-90:90):(secondary||angle===270?90:-90);
    }
  }
  if(nativePose&&nativeAngle===180)baseRotation=(baseRotation+180)%360;
  const rotation=((baseRotation+cameraManualRotation)%360+360)%360;
  const turns90=rotation===90||rotation===270;
  const width=turns90?rawH:rawW,height=turns90?rawW:rawH;
  return {rawW,rawH,portrait:height>=width,rotation,width,height,
    sensor:physicalSensor,nativeAngle:nativePose?nativeAngle:null,manual:cameraManualRotation!==0};
}
function paintCameraFrame(g,video,frame,W,H){
  const digitalZoom=Math.max(1,cameraControls?.getDigitalZoom?.()||1);
  function drawSource(dw,dh){
    if(digitalZoom<=1)return g.drawImage(video,0,0,dw,dh);
    const sw=video.videoWidth/digitalZoom,sh=video.videoHeight/digitalZoom;
    return g.drawImage(video,(video.videoWidth-sw)/2,(video.videoHeight-sh)/2,sw,sh,0,0,dw,dh);
  }
  g.save();g.filter=cameraControls?.getFilter()||'none';
  if(frame.rotation===90){
    g.translate(W,0);g.rotate(Math.PI/2);drawSource(H,W);
  }else if(frame.rotation===270){
    g.translate(0,H);g.rotate(-Math.PI/2);drawSource(H,W);
  }else if(frame.rotation===180){
    g.translate(W,H);g.rotate(Math.PI);drawSource(W,H);
  }else drawSource(W,H);
  g.restore();
}
function cameraOrientationUi(frame){
  const key=[frame.portrait?'doc':'ngang',frame.rotation,frame.sensor,frame.manual,cameraSensorSource,cameraSensorPortrait,frame.sensor?cameraSensorSide:0,devicePortrait()].join(':');
  if(cameraOrientationKey===key)return;
  cameraOrientationKey=key;
  const el=$('cameraOrientation');
  if(el)el.textContent=(frame.portrait?'DỌC':'NGANG')+' · '+(frame.manual?'ĐÃ XOAY':frame.sensor?'CẢM BIẾN':'MÀN HÌNH');
  stage.classList.toggle('camera-portrait',frame.portrait);
  stage.classList.toggle('camera-landscape',!frame.portrait);
  $('cameraArea').classList.toggle('portrait',frame.portrait);
  $('cameraArea').classList.toggle('landscape',!frame.portrait);
  const screenPortrait=devicePortrait();
  // When the browser stays portrait while the physical handset is landscape,
  // display the *whole live camera* turned in the opposite direction. This
  // includes the canvas, the stamp and every control. Saved pixels are unchanged.
  const turn=window.HNLAndroidApp?'':frame.sensor&&cameraSensorPortrait!==null&&cameraSensorPortrait!==screenPortrait
    ?(cameraSensorSide>=0?'left':'right') : '';
  cameraViewTurn=turn;
  $('cameraArea').classList.toggle('hnl-turn-left',turn==='left');
  $('cameraArea').classList.toggle('hnl-turn-right',turn==='right');
  // The actual handset can be horizontal while CSS remains portrait (rotation lock).
  // Keep the actions in a compact dock on the user's right in BOTH cases.
  const dockRight=!window.HNLAndroidApp&&(cameraSensorPortrait===false||(cameraSensorPortrait===null&&!screenPortrait));
  $('cameraArea').classList.toggle('hnl-landscape-dock',dockRight);
  const btn=$('rotateCameraOverlay');
  if(btn){btn.title='Xoay cả hình camera và dấu HNLMark 90° (đang bù '+cameraManualRotation+'°)';btn.setAttribute('aria-label',btn.title);}
}
function clearOrientationUi(){
  cameraOrientationKey='';
  stage.classList.remove('camera-portrait','camera-landscape');
  $('cameraArea').classList.remove('portrait','landscape','hnl-turn-left','hnl-turn-right','hnl-landscape-dock');
  cameraViewTurn='';
}
function rotateCameraAndStamp(){
  if(!cameraActive||cameraCapturing)return;
  cameraManualRotation=(cameraManualRotation+90)%360;
  cameraLastDraw=0;
  refreshCameraOrientation();
  showToast('Đã xoay ảnh và dấu '+cameraManualRotation+'°.');
}
function refreshCameraOrientation(){
  if(!cameraActive)return;
  const v=$('cameraVideo');
  if(v.readyState<2||!v.videoWidth)return;
  cameraLastDraw=0;
  cameraOrientationUi(cameraGeometry(v));
}
function liveCameraFrame(now){
  if(!cameraActive)return;
  const video=$('cameraVideo');
  if(now-cameraLastDraw>=65&&video.readyState>=2&&video.videoWidth>0){
    cameraLastDraw=now;
    const frame=cameraGeometry(video);
    const factor=Math.min(1,1400/Math.max(frame.width,frame.height));
    const W=Math.max(1,Math.round(frame.width*factor)),H=Math.max(1,Math.round(frame.height*factor));
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    // Both video pixels and HNLMark overlay share the identical upright coordinate plane.
    // No separate CSS rotation: it would rotate the image without rotating the stamp.
    paintCameraFrame(ctx,video,frame,W,H);
    drawOverlay(ctx,W,H,{serialCode:cameraPreviewCode,modifiedDate:new Date(),exifDate:null});
    cameraOrientationUi(frame);
    $('previewDimensions').textContent=frame.width+' × '+frame.height+' px · '+(frame.portrait?'Dọc':'Ngang')+(frame.manual?' · đã xoay 90°':'');
  }
  cameraRAF=requestAnimationFrame(liveCameraFrame);
}
async function startCamera(){
  if(busy||cameraActive)return;
  if(editTool!=='move')setEditTool('move');
  if(cameraShotPending){cameraShotPending=false;cameraShotUniqueId=null;}
  if(!navigator.mediaDevices?.getUserMedia){cameraSystemFallback(true);showToast('Camera trực tiếp không được hỗ trợ. Bạn có thể dùng camera hệ thống.');return;}
  const request=++cameraRequest;
  try{
    $('openCamera').disabled=true;
    $('canvasSpinner').hidden=false;
    $('canvasSpinner').textContent='Đang mở camera · vui lòng cho phép truy cập…';
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:cameraFacing},width:{ideal:1920},height:{ideal:1080}}});
    if(request!==cameraRequest){stream.getTracks().forEach(t=>t.stop());return;}
    cameraStream=stream;
    const video=$('cameraVideo');video.srcObject=stream;video.muted=true;video.playsInline=true;
    await video.play();
    if(request!==cameraRequest){stopCamera();return;}
    cameraSystemFallback(false);
    cameraActive=true;cameraCapturing=false;cameraLastDraw=0;
    if(window.HNLCameraControls){cameraControls=window.HNLCameraControls.create({stage,dock:$('cameraControls'),track:()=>cameraStream?.getVideoTracks()[0],active:()=>cameraActive,rotation:()=>cameraGeometry($('cameraVideo')).rotation});}
    cameraManualRotation=0;cameraSensorPortrait=null;cameraSensorSide=0;cameraSensorAt=0;cameraSensorCandidate='';cameraSensorSamples=0;cameraSensorCandidateAt=0;cameraSensorSource='';cameraMotionAt=0;cameraOrientationSide=0;cameraOrientationAt=0;
    cameraPreviewCode=createPhotoCode();burstCount=0;
    clearOrientationUi();
    ++isRendering;
    $('canvasSpinner').hidden=true;
    $('previewName').textContent='Camera trực tiếp · ảnh chưa lưu';
    $('photoIndex').textContent='Nhấn nút tròn để chụp';
    cameraUi();
    if(window.innerWidth<=950||window.innerHeight<=650)window.scrollTo({top:0,behavior:'instant'});
    cameraRAF=requestAnimationFrame(liveCameraFrame);
  }catch(e){
    if(request!==cameraRequest)return;
    stopCamera(false);
    cameraSystemFallback(true);
    $('canvasSpinner').hidden=true;
    if(e?.name==='NotAllowedError'||e?.name==='PermissionDeniedError')showToast('Chưa cấp quyền camera. Hãy cho phép Camera trong cài đặt trình duyệt hoặc dùng nút dự phòng.');
    else if(e?.name==='NotFoundError')showToast('Không tìm thấy camera. Có thể chọn ảnh từ thư viện.');
    else showToast('Không mở được camera: '+(e?.message||e?.name||'lỗi thiết bị'));
    renderPreview();
  }finally{if(request===cameraRequest)$('canvasSpinner').hidden=true;cameraUi();}
}
async function takeCameraPhoto(){
  if(!cameraActive||cameraCapturing||busy)return;
  const video=$('cameraVideo');if(video.readyState<2||!video.videoWidth){showToast('Camera chưa sẵn sàng.');return;}
  cameraCapturing=true;cameraUi();
  const capturedAt=new Date(),code=cameraPreviewCode;
  try{
    // Use exactly the same rotation as the live preview, and bake orientation
    // into the JPG pixel dimensions (no unreliable EXIF orientation required).
    const frame=cameraGeometry(video);
    const ratio=Math.min(1,4096/Math.max(frame.width,frame.height));
    const snap=document.createElement('canvas');
    snap.width=Math.max(1,Math.round(frame.width*ratio));
    snap.height=Math.max(1,Math.round(frame.height*ratio));
    const shotCtx=snap.getContext('2d',{alpha:false});
    shotCtx.imageSmoothingEnabled=true;shotCtx.imageSmoothingQuality='high';
    paintCameraFrame(shotCtx,video,frame,snap.width,snap.height);
    const blob=await new Promise((resolve,reject)=>snap.toBlob(b=>b?resolve(b):reject(Error('Không tạo được ảnh camera.')),'image/jpeg',.96));
    // Preserve an un-stamped original for later repositioning; stamp is drawn in shared renderOverlay.
    const name='HNLMark_Camera_'+capturedAt.getFullYear()+pad(capturedAt.getMonth()+1)+pad(capturedAt.getDate())+'_'+pad(capturedAt.getHours())+pad(capturedAt.getMinutes())+pad(capturedAt.getSeconds())+'_'+String(capturedAt.getMilliseconds()).padStart(3,'0')+'.jpg';
    const file=new File([blob],name,{type:'image/jpeg',lastModified:capturedAt.getTime()});
    if(burstEnabled){
      await appendFiles([file],{serialCode:code,origin:'camera',silent:true,keepCamera:true});
      burstCount++;cameraPreviewCode=createPhotoCode();cameraLastDraw=0;
      cameraUi();
      showToast('✓ Đã chụp '+burstCount+' ảnh · Tiếp tục chụp hoặc mở Thư viện.');
    }else{
      stopCamera(false,true);
      await appendFiles([file],{serialCode:code,origin:'camera',silent:true});
      cameraShotUniqueId=previewIndex()?.uniqueId||null;
      cameraShotPending=!!cameraShotUniqueId;
      cameraUi();
      showToast('Đã chụp. Chọn Dùng ảnh hoặc Chụp lại.');
    }
  }catch(e){stopCamera();showError(e);}
  finally{cameraCapturing=false;cameraUi();}
}
function acceptCameraShot(){cameraShotPending=false;cameraShotUniqueId=null;clearOrientationUi();cameraUi();showToast('Đã thêm ảnh vào danh sách. Có thể tiếp tục chụp hoặc xuất ảnh.');}
async function retakeCameraShot(){
  const index=photos.findIndex(p=>p.uniqueId===cameraShotUniqueId);
  cameraShotPending=false;cameraShotUniqueId=null;clearOrientationUi();
  if(index>=0)removePhoto(index);
  cameraUi();
  await startCamera();
}

function readStoredProjectZip(buffer){
 const dv=new DataView(buffer),decoder=new TextDecoder(),files=new Map();let pos=0;
 while(pos+30<=buffer.byteLength&&dv.getUint32(pos,true)===0x04034b50){
  const method=dv.getUint16(pos+8,true),size=dv.getUint32(pos+18,true),n=dv.getUint16(pos+26,true),extra=dv.getUint16(pos+28,true),start=pos+30+n+extra;
  if(method!==0||start+size>buffer.byteLength)throw Error('Tệp dự án không hợp lệ hoặc không được hỗ trợ nén.');
  const name=decoder.decode(new Uint8Array(buffer,pos+30,n));files.set(name,buffer.slice(start,start+size));pos=start+size;
 }
 if(!files.has('project.json'))throw Error('Đây không phải tệp dự án HNLMark.');
 return files;
}
async function saveProject(){
 if(busy)return;
 setBusy(true);try{
  // Back up all local originals, including photos not currently open.
  // In-memory photos override older autosaved copies of the same ID.
  let stored=[],partial=false;
  try{stored=await libraryList();}catch(_){partial=true;}
  const combined=new Map();
  for(const row of stored){if(row?.id&&row.blob)combined.set(row.id,row);}
  for(const p of photos)combined.set(p.serialCode,photoRecord(p));
  if(!combined.size){showToast('Chưa có ảnh để sao lưu.');return;}
  const project={app:'HNLMark',version:2,createdAt:new Date().toISOString(),templateConfig:{...config},backupScope:partial?'open-photos-only':'entire-local-library',photos:[]},items=[];
  let index=0;
  for(const row of combined.values()){
   const fn='originals/'+(++index)+'_'+row.id+'.bin';
   project.photos.push({id:row.id,name:row.name,mime:row.blob.type||'image/jpeg',modifiedAt:row.modifiedAt,exifISO:row.exifISO||null,override:!!row.override,customDate:row.customDate,edits:structuredClone(row.edits),stampConfig:migrateStampLabels(row.stampConfig||{...config}),origin:row.origin||'import',file:fn});
   items.push({name:fn,bytes:await row.blob.arrayBuffer()});
  }
  // Include logo stored in IndexedDB even before its UI preview has loaded.
  const backupLogo=logoFile||await logoAsset('get').catch(()=>null);
  if(backupLogo){project.logo='assets/custom-logo.bin';items.push({name:project.logo,bytes:await backupLogo.arrayBuffer()});}
  items.unshift({name:'project.json',bytes:new TextEncoder().encode(JSON.stringify(project,null,2)).buffer});
  const file=zipStored(items),suffix=partial?'-CHI-ANH-DANG-MO':'';
  download(file,'HNLMark-du-an-'+new Date().toISOString().slice(0,10)+suffix+'.hnlmark.zip');
  showToast(partial?'Đã sao lưu '+index+' ảnh ĐANG MỞ. Không đọc được thư viện; bản sao lưu chưa đầy đủ.':'Đã sao lưu '+index+' ảnh gốc trong thư viện và danh sách đang mở, kèm ngày giờ và tùy chỉnh.');
 }catch(e){showError(e);}finally{setBusy(false);}
}
async function importProject(file){
 if(!file)return;
 try{
  const items=readStoredProjectZip(await file.arrayBuffer());const project=JSON.parse(new TextDecoder().decode(items.get('project.json')));
  if(project.app!=='HNLMark'||!Array.isArray(project.photos))throw Error('Sai cấu trúc dự án.');
  if(project.logo&&items.has(project.logo)){const blob=new Blob([items.get(project.logo)],{type:'image/png'});try{await logoAsset('put',blob);await loadStoredLogo();}catch(e){showError(e);}}
  let count=0;
  for(const row of project.photos){const b=items.get(row.file);if(!b)continue;
   const orig=new File([b],row.name,{type:row.mime||'image/jpeg',lastModified:row.modifiedAt||Date.now()});
   const meta={...row,blob:orig,exifISO:row.exifISO,modifiedAt:row.modifiedAt};
   await appendFiles([orig],{savedRecord:meta,silent:true});await savePhotoRecord(previewIndex());count++;
  }
  showToast('Đã khôi phục '+count+' ảnh gốc cùng thiết lập chỉnh sửa.');updateLibraryCount().catch(()=>{});
 }catch(e){showError(e);}
}

function bind(){fillForm();cameraSystemFallback(!navigator.mediaDevices?.getUserMedia);cameraUi();
 $('burstMode').addEventListener('change',e=>{burstEnabled=e.target.checked;showToast(burstEnabled?'Chụp liên tiếp: bật':'Xem lại từng ảnh: bật');});
 $('cameraLibrary').addEventListener('click',showLibrary);
 $('openLibrary').addEventListener('click',showLibrary);
 $('closeLibrary').addEventListener('click',closeLibrary);
 $('libraryModal').addEventListener('click',e=>{if(e.target===$('libraryModal'))closeLibrary();});
 $('backupProject').addEventListener('click',saveProject);
 $('projectInput').addEventListener('change',e=>{importProject(e.target.files?.[0]).catch(showError);e.target.value='';});
 $('toggleCameraFull').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    // Fullscreening #cameraArea resets its CSS transform in Chromium, which
    // breaks physical landscape while Android has rotation lock enabled.
    // Fullscreen the DOCUMENT instead; cameraArea stays an ordinary fixed
    // child and retains its rotated preview, overlays and separate controls.
    else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
    else showToast('Trình duyệt chưa hỗ trợ ẩn thanh hệ thống; camera vẫn mở toàn khung.');
  }catch(_){showToast('Máy không cho ẩn thanh trình duyệt; camera vẫn mở trong vùng xem.');}
 });
 document.addEventListener('fullscreenchange',()=>{
   // Some browsers change orientation or viewport dimensions when entering
   // fullscreen. Recompute source-pixel rotation AND screen transform.
   if(cameraActive){cameraOrientationKey='';cameraLastDraw=0;refreshCameraOrientation();}
 });
 updateLibraryCount().catch(()=>{});loadStoredLogo().catch(()=>{});

document.querySelectorAll('.mobile-shortcuts [data-jump]').forEach(button=>button.addEventListener('click',()=>{
 const target=document.querySelector(button.dataset.jump);
 if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
}));
// A phone rotation changes both the live preview and the next captured image
// without stopping/restarting the camera stream.
window.addEventListener('orientationchange',refreshCameraOrientation);
window.addEventListener('resize',refreshCameraOrientation);
if(screen.orientation?.addEventListener)screen.orientation.addEventListener('change',refreshCameraOrientation);
// Physical motion information is optional; it fails safely if blocked by browser.
window.addEventListener('deviceorientation',handleCameraPosture);
window.addEventListener('devicemotion',handleCameraMotion);
$('rotateCameraOverlay').addEventListener('click',rotateCameraAndStamp);
const orientationMedia=window.matchMedia?.('(orientation: portrait)');
if(orientationMedia?.addEventListener)orientationMedia.addEventListener('change',refreshCameraOrientation);
$('openCamera').addEventListener('click',()=>{
 requestCameraSensorPermission().catch(()=>{});
 if(window.HNLVideoStudio?.isVideoSelected?.())window.HNLVideoStudio.openCamera().catch(showError);
 else startCamera().catch(showError);
});
$('closeCamera').addEventListener('click',()=>stopCamera());
$('flipCamera').addEventListener('click',()=>{cameraFacing=cameraFacing==='environment'?'user':'environment';stopCamera(false);startCamera().catch(showError);});
$('shutterButton').addEventListener('click',()=>takeCameraPhoto().catch(showError));
$('retakePhoto').addEventListener('click',()=>retakeCameraShot().catch(showError));
$('acceptPhoto').addEventListener('click',acceptCameraShot);
$('cameraFallback').addEventListener('change',e=>{const files=e.target.files;if(files?.length){if(cameraActive)stopCamera(false);if(cameraShotPending)acceptCameraShot();appendFiles(files).catch(showError);}e.target.value='';});
window.addEventListener('pagehide',()=>stopCamera(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&cameraActive)stopCamera();});
async function routeMediaFiles(input){
  const files=Array.from(input||[]);
  const images=files.filter(f=>f.type.startsWith('image/')||/\.(jpe?g|png|webp|heic|heif|avif|gif)$/i.test(f.name));
  const videos=files.filter(f=>f.type.startsWith('video/')||/\.(mp4|mov|webm|m4v|ogv)$/i.test(f.name));
  if(images.length)await appendFiles(images);
  if(videos.length){
   if(!window.HNLVideoStudio?.importVideo)throw Error('Bộ xử lý video chưa tải xong. Tải lại trang rồi thử.');
   await window.HNLVideoStudio.importVideo(videos[0]);
   if(videos.length>1)showToast('Đã mở video đầu tiên; hãy xử lý từng video lần lượt ('+videos.length+' video đã chọn).');
  }
  if(!images.length&&!videos.length&&files.length)showToast('Tệp không phải ảnh hoặc video được hỗ trợ.');
 }
 // Native Android Photo Picker returns File objects through the same audited media route.
 // Avoid simulated input clicks from the native tab (no trusted WebView user activation).
 window.HNLMediaImport={acceptFiles:(files)=>routeMediaFiles(files)};
 $('photoInput').addEventListener('change',e=>{const files=Array.from(e.target.files||[]);e.target.value='';routeMediaFiles(files).catch(showError);});
 const dz=$('dropzone');dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('dragging');});dz.addEventListener('dragleave',()=>dz.classList.remove('dragging'));dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('dragging');routeMediaFiles(e.dataTransfer.files).catch(showError);});
const inputs=['timeMode','batchDate','dateFormat','timeFormat','brandText','projectText','addressText','noteText','symbolType','logoMode','footerBrand','footerCaption','serialMode','serialText','fontFamily','fontWeight','timeScale','dateScale','addressScale','footerScale','serialScale','dateColor','addressColor','footerColor','serialColor','fontSize','fontFamily','fontWeight','timeScale','dateScale','addressScale','footerScale','serialScale','dateColor','addressColor','footerColor','serialColor','accentColor','textColor','bgOpacity','logoScale','outputSize','outputFormat','quality','showDate','showTime','showBackground','showShadow','showFooter','showSerial'];inputs.forEach(id=>{const el=$(id);el.addEventListener(['range','text','color','textarea'].includes(el.type)||el.tagName==='TEXTAREA'?'input':'change',()=>{changeConfig(id,el.type==='checkbox'?el.checked:el.value);if(id==='logoMode'&&config.logoMode!=='floating'&&config.moveTarget==='logo'){config.moveTarget='stamp';updateTarget();}});});
$('overrideCheck').addEventListener('change',e=>{const p=previewIndex();if(!p)return;p.override=e.target.checked;if(!p.customDate)p.customDate=toLocalInput(photoDate(p));updateSelectionUI();scheduleSavePhoto(p);renderPreview();});$('individualDate').addEventListener('input',e=>{const p=previewIndex();if(!p)return;p.customDate=e.target.value;updateSelectionUI();scheduleSavePhoto(p);renderPreview();});
document.querySelectorAll('.preset').forEach(el=>el.addEventListener('click',()=>{const previous=config.preset;config.preset=el.dataset.preset;if(INDEPENDENT_PRESETS.has(config.preset)&&config.footerBrand==='Timemark'){config.footerBrand='HNL Mark';$('footerBrand').value=config.footerBrand;}else if(config.preset==='timemark'&&INDEPENDENT_PRESETS.has(previous)&&config.footerBrand==='HNL Mark'){config.footerBrand='Timemark';$('footerBrand').value=config.footerBrand;}updatePreset();store();stashPhotoSettings();renderPreview();}));document.querySelectorAll('#moveTarget button').forEach(el=>el.addEventListener('click',()=>{config.moveTarget=el.dataset.target;if(config.moveTarget==='logo'&&config.logoMode!=='floating'){$('logoMode').value='floating';config.logoMode='floating';}updateTarget();store();stashPhotoSettings();renderPreview();}));document.querySelectorAll('#positionGrid button').forEach(el=>el.addEventListener('click',()=>{const prefix=config.moveTarget==='logo'?'logo':config.moveTarget==='footer'?'footer':config.moveTarget==='serial'?'serial':'pos';config[prefix+'X']=+el.dataset.x;config[prefix+'Y']=+el.dataset.y;updatePositionGrid();store();stashPhotoSettings();renderPreview();}));
// Image editing tools operate on the original image beneath the HNLMark stamp.
$('cropTool').addEventListener('click',()=>setEditTool(editTool==='crop'?'move':'crop'));
$('cropRatio').addEventListener('change',e=>{
 config.cropRatio=e.target.value;store();
 if(previewIndex()&&!cameraActive){setEditTool('crop');}
});
$('cropCenter').addEventListener('click',()=>{
 if(!previewIndex()||cameraActive)return;
 setEditTool('crop');
 editSelection=window.HNLCropRatio.center(config.cropRatio,canvas.width,canvas.height);
 drawEditSelection();updateImageEditor();
});
document.querySelectorAll('.image-quality-presets button').forEach(btn=>btn.addEventListener('click',()=>{
 const quality=Number(btn.dataset.quality);
 $('quality').value=quality;changeConfig('quality',quality);
}));

$('repairTool').addEventListener('click',()=>setEditTool(editTool==='repair'?'move':'repair'));
$('cancelEditTool').addEventListener('click',()=>setEditTool('move'));
function commitPhotoOperation(op){const p=previewIndex();if(!p||cameraActive)return;photoEdits(p).operations.push(op);scheduleSavePhoto(p);editSelection=null;setEditTool('move');updateImageEditor();}
$('cropApply').addEventListener('click',()=>{const r=normalizeRegion();if(!r)return;if(r.w<.045||r.h<.045){showToast('Vùng cắt quá nhỏ.');return;}commitPhotoOperation({type:'crop',rect:r});showToast('Đã cắt ảnh. Có thể Hoàn tác.');});
$('repairApply').addEventListener('click',()=>{const r=normalizeRegion();if(!r)return;commitPhotoOperation({type:'repair',rect:r,direction:$('repairMethod').value});showToast('Đã xử lý vùng chọn (vá/làm mờ). Kiểm tra lại trên ảnh.');});
$('rotateLeft').addEventListener('click',()=>{commitPhotoOperation({type:'rotate',deg:-90});});
$('rotateRight').addEventListener('click',()=>{commitPhotoOperation({type:'rotate',deg:90});});
$('undoImageEdit').addEventListener('click',()=>{const p=previewIndex();if(!p)return;photoEdits(p).operations.pop();scheduleSavePhoto(p);setEditTool('move');showToast('Đã hoàn tác bước chỉnh ảnh cuối.');});
$('resetImageEdit').addEventListener('click',()=>{const p=previewIndex();if(!p)return;p.edits={operations:[],filters:{brightness:0,contrast:0,saturation:0,warmth:0}};scheduleSavePhoto(p);setEditTool('move');updateImageEditor();showToast('Đã khôi phục bản gốc trong trình chỉnh sửa.');});
['brightness','contrast','saturation','warmth'].forEach(id=>{$(id).addEventListener('input',ev=>{const p=previewIndex();if(!p)return;photoEdits(p).filters[id]=Number(ev.target.value);scheduleSavePhoto(p);$(id+'Value').textContent=Number(ev.target.value)>0?'+'+ev.target.value:ev.target.value;renderPreview();});});
$('resetFilters').addEventListener('click',()=>{const p=previewIndex();if(!p)return;photoEdits(p).filters={brightness:0,contrast:0,saturation:0,warmth:0};scheduleSavePhoto(p);updateImageEditor();renderPreview();});
$('applyFiltersAll').addEventListener('click',()=>{const p=previewIndex();if(!p)return;const filters={...photoEdits(p).filters};for(const photo of photos){photoEdits(photo).filters={...filters};scheduleSavePhoto(photo);}showToast('Đã dùng cài đặt màu cho '+photos.length+' ảnh.');renderPreview();});
function selectPosition(e){const r=canvas.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};}
let dragging=false;function move(e){
 if(window.HNLPreviewZoom?.isGesturing?.())return;
 if(editDragging){const pos=selectPosition(e),end=editTool==='crop'?window.HNLCropRatio.fromDrag({x:editSelection.x1,y:editSelection.y1},pos,config.cropRatio,canvas.width,canvas.height):{x2:pos.x,y2:pos.y};editSelection.x2=end.x2;editSelection.y2=end.y2;drawEditSelection();updateImageEditor();return;}
 if(!dragging)return;const r=canvas.getBoundingClientRect();const x=clamp((e.clientX-r.left)/r.width,.02,.98),y=clamp((e.clientY-r.top)/r.height,.02,.98);const prefix=config.moveTarget==='logo'?'logo':config.moveTarget==='footer'?'footer':config.moveTarget==='serial'?'serial':'pos';config[prefix+'X']=x;config[prefix+'Y']=y;updatePositionGrid();renderPreview();
}
canvas.addEventListener('pointerdown',e=>{
 if(cameraActive||!previewIndex())return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
 if(editTool!=='move'){const pos=selectPosition(e);editDragging=true;editSelection={x1:pos.x,y1:pos.y,x2:pos.x,y2:pos.y};drawEditSelection();return;}
 dragging=true; // Dragging a stamp begins on movement, not on a touch that could become a pinch.
});
canvas.addEventListener('pointermove',move);
const end=()=>{dragging=false;if(editDragging){editDragging=false;updateImageEditor();}store();stashPhotoSettings();};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
$('logoInput').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;try{let image;if('createImageBitmap'in window){try{image=await createImageBitmap(file);}catch(_){ }}if(!image){const url=URL.createObjectURL(file);image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Logo không đọc được.'));img.src=url;});URL.revokeObjectURL(url);}if(logoImg&&logoImg.close)logoImg.close();logoImg=image;if(logoUrl)URL.revokeObjectURL(logoUrl);logoUrl=URL.createObjectURL(file);logoFile=file;logoAsset('put',file).catch(showError);$('logoThumb').replaceChildren();const thumb=document.createElement('img');thumb.src=logoUrl;thumb.alt='Logo đã chọn';$('logoThumb').append(thumb);renderPreview();showToast('Đã nạp logo. Chọn "Logo riêng" để kéo logo độc lập.');}catch(error){showError(error);}});
$('clearLogo').addEventListener('click',()=>{if(logoImg&&logoImg.close)logoImg.close();logoImg=null;if(logoUrl)URL.revokeObjectURL(logoUrl);logoUrl=null;logoFile=null;logoAsset('delete').catch(showError);$('logoThumb').textContent='HNL';renderPreview();});
$('resetStyle').addEventListener('click',()=>{const names=['fontSize','fontFamily','fontWeight','timeScale','dateScale','addressScale','footerScale','serialScale','dateColor','addressColor','footerColor','serialColor','accentColor','textColor','bgOpacity','logoScale','showBackground','showShadow','posX','posY','logoX','logoY','footerX','footerY','serialX','serialY'];names.forEach(key=>config[key]=defaultConfig[key]);fillForm();store();renderPreview();showToast('Đã đặt lại kiểu dáng và vị trí.');});$('previousPhoto').addEventListener('click',()=>{if(selected>0){selectPhoto(selected-1);}});$('nextPhoto').addEventListener('click',()=>{if(selected<photos.length-1){selectPhoto(selected+1);}});$('saveOne').addEventListener('click',saveOne);$('saveAll').addEventListener('click',saveAll);
let installEvent=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('installBtn').hidden=false;});$('installBtn').addEventListener('click',async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;$('installBtn').hidden=true;});if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));renderPreview();}
// Shared overlay renderer: Video reuses photo stamp type, logo and layout.
window.HNLVideoBridge={
 drawStamp:(g,w,h,date,serial,scale=1)=>{
  const previous=config.fontSize;
  try{config.fontSize=Math.max(.4,Number(previous)*Math.min(1.4,Math.max(.3,scale||1)));drawOverlay(g,w,h,{serialCode:serial,exifDate:date,modifiedDate:date});}
  finally{config.fontSize=previous;}
},
 photoCameraActive:()=>cameraActive
};
window.HNLPhotoBridge={shareCurrent:async()=>{
  if(!window.HNLAndroidApp?.shareBlob)throw Error('Tính năng chỉ có trên bản Android');
  const p=previewIndex();if(!p)throw Error('Chưa chọn ảnh để chia sẻ');
  const blob=await renderBlob(p);return window.HNLAndroidApp.shareBlob(blob,outputName(p,blob));
}};
bind();
})();