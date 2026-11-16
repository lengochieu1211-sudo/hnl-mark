import type {MediaItem, WatermarkConfig} from '../types/hnl';
import {DEFAULT_IMAGE_EDITS} from '../data/mockMedia';
import {DEFAULT_WATERMARK_CONFIG, WATERMARK_TEMPLATES} from '../data/templates';
import {loadMedia,storeMediaBatchNew} from './mediaStorage';

// PROD v2.0.x used a distinct IndexedDB database on this SAME origin.
// Never alter or delete it: it is the last accessible copy of old originals/edits.
const LEGACY_DB='HNLMarkLocalLibrary';
const LEGACY_STORE='originals';
const DONE_KEY='hnlmark-studio-legacy-import-v1';

type LegacyRow={
 id?:unknown;name?:unknown;blob?:unknown;modifiedAt?:unknown;savedAt?:unknown;
 exifISO?:unknown;customDate?:unknown;override?:unknown;edits?:unknown;
 stampConfig?:unknown;origin?:unknown;
};

function positiveDate(value:unknown):Date|null{
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const date=new Date(value);return Number.isFinite(date.getTime())?date:null;
}
function text(value:unknown):string{return typeof value==='string'?value:'';}
function num(value:unknown,fallback:number):number{return typeof value==='number'&&Number.isFinite(value)?value:fallback;}
function clamp(n:number,lo:number,hi:number):number{return Math.max(lo,Math.min(hi,n));}

function openOldDatabase():Promise<IDBDatabase|null>{
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in globalThis)){resolve(null);return;}
  const request=indexedDB.open(LEGACY_DB);
  let created=false;
  request.onupgradeneeded=(event)=>{created=(event.oldVersion===0);};
  request.onsuccess=()=>{
   const db=request.result;
   if(created||!db.objectStoreNames.contains(LEGACY_STORE)){db.close();resolve(null);return;}
   resolve(db);
  };
  request.onerror=()=>reject(request.error||new Error('Không đọc được thư viện HNL Mark cũ'));
  request.onblocked=()=>reject(new Error('Thư viện cũ đang được mở ở một thẻ khác'));
 });
}
async function readOldPhotos():Promise<LegacyRow[]>{
 const db=await openOldDatabase();if(!db)return [];
 try{
  return await new Promise<LegacyRow[]>((resolve,reject)=>{
   const req=db.transaction(LEGACY_STORE,'readonly').objectStore(LEGACY_STORE).getAll();
   req.onsuccess=()=>resolve((req.result||[]) as LegacyRow[]);
   req.onerror=()=>reject(req.error||new Error('Đọc ảnh gốc cũ không thành công'));
  });
 }finally{db.close();}
}
function convertLegacy(row:LegacyRow):MediaItem|null{
 if(typeof row.id!=='string'||!row.id||!(row.blob instanceof Blob)||!row.blob.size)return null;
 const settings=(row.stampConfig&&typeof row.stampConfig==='object'?row.stampConfig:{}) as Record<string,unknown>;
 const recorded=positiveDate(row.override===true?row.customDate:null)
  ||positiveDate(row.exifISO)||positiveDate(row.modifiedAt)||positiveDate(row.savedAt)||new Date();
 const template=text(settings.preset);
 const templateId=WATERMARK_TEMPLATES.some(t=>t.id===template)?template:'timemark';
 const dateTimeIso=[recorded.getFullYear(),String(recorded.getMonth()+1).padStart(2,'0'),String(recorded.getDate()).padStart(2,'0')].join('-')
  +'T'+[recorded.getHours(),recorded.getMinutes(),recorded.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':');
 const stamp:WatermarkConfig={
  ...DEFAULT_WATERMARK_CONFIG,templateId,dateTimeIso,autoTime:false,
  locationText:text(settings.addressText),customTitle:text(settings.projectText),customNote:text(settings.noteText),
  accentColor:text(settings.accentColor)||DEFAULT_WATERMARK_CONFIG.accentColor,
  textColor:text(settings.textColor)||DEFAULT_WATERMARK_CONFIG.textColor,
  bgOpacity:clamp(num(settings.bgOpacity,62)/100,0,1),
  positionPreset:'custom',customPos:{xPct:clamp(num(settings.posX,.32)*100,0,100),yPct:clamp(num(settings.posY,.898)*100,0,100)},
 };
 const rawTitle=text(row.name)||`Anh-cu-${row.id}.jpg`;
 // Do not reinterpret old nondestructive operations: retain the exact settings as
 // migration metadata, alongside byte-identical source image for future editing.
 const legacySource={oldId:row.id,edits:row.edits,stampConfig:row.stampConfig,customDate:row.customDate,override:row.override};
 return {
  id:`legacy-web-${row.id}`,title:rawTitle.replace(/\.[^.]+$/,''),kind:'photo',origin:'saved-project',
  url:'',rawBlob:row.blob,createdAt:recorded.toISOString(),resolutionLabel:'Ảnh từ HNL Mark Web cũ',
  sizeLabel:`${(row.blob.size/(1024*1024)).toFixed(2)} MB`,location:stamp.locationText,coordinates:'',
  photoCode:row.id,customNote:stamp.customNote,templateId,edits:{...DEFAULT_IMAGE_EDITS},
  captureWatermark:stamp,legacySource,
 } as MediaItem & {legacySource:typeof legacySource};
}
/** Import old Web photos once without replacing any current file or touching
 * the legacy database. Batch is atomic: quota/ID conflicts roll back. */
export async function migrateLegacyWebLibrary():Promise<number>{
 if(typeof window==='undefined'||!('indexedDB' in window))return 0;
 try{if(localStorage.getItem(DONE_KEY)==='done')return 0;}catch{/* Private mode */}
 const oldPhotos=await readOldPhotos();if(!oldPhotos.length)return 0;
 const previous=await loadMedia();
 const ids=new Set(previous.map(item=>item.id));
 for(const item of previous){if(item.url.startsWith('blob:'))URL.revokeObjectURL(item.url);}
 const incoming:MediaItem[]=[];
 for(const row of oldPhotos){
  const converted=convertLegacy(row);
  if(!converted)throw new Error('Dữ liệu ảnh HNL Mark cũ chưa hợp lệ. Thư viện cũ vẫn được giữ nguyên.');
  if(!ids.has(converted.id)){incoming.push(converted);ids.add(converted.id);}
 }
 await storeMediaBatchNew(incoming);
 try{localStorage.setItem(DONE_KEY,'done');}catch{/* Safe to retry idempotently */}
 return incoming.length;
}
