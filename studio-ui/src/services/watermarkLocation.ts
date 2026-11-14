/** Location provenance is per image. Never silently borrow GPS from another photo. */
import type {MediaItem,WatermarkConfig} from '../types/hnl';
export const formatGps=(lat:number,lng:number)=>`${lat.toFixed(6)}, ${lng.toFixed(6)}`;
export function mediaWatermarkConfig(config:WatermarkConfig,item?:Pick<MediaItem,'location'|'coordinates'>):WatermarkConfig{
 const source=config.locationSource||'manual';
 if(source==='none')return {...config,locationText:'',coordinates:'',showCoordinates:false};
 if(source==='photo')return {...config,locationText:item?.location||'',coordinates:item?.coordinates||''};
 return config;
}
/** Read GPS only from a local JPEG EXIF TIFF GPS IFD, with bounds checks. */
export async function readPhotoExifGps(file:Blob):Promise<string|undefined>{
 if(file.size<16)return undefined;
 const bytes=await file.slice(0,Math.min(file.size,512*1024)).arrayBuffer();
 const a=new DataView(bytes);
 const valid=(off:number,len:number)=>Number.isSafeInteger(off)&&off>=0&&len>=0&&off+len<=a.byteLength;
 if(!valid(0,4)||a.getUint16(0)!==0xFFD8)return undefined;
 let off=2;
 while(valid(off,4)){
  if(a.getUint8(off)!==0xFF)break;
  const marker=a.getUint8(off+1);off+=2;
  if(marker===0xDA||marker===0xD9)break;
  if(!valid(off,2))break;
  const size=a.getUint16(off);if(size<2||!valid(off,size))break;
  const head=off+2, end=off+size;
  if(marker===0xE1&&valid(head,6)&&String.fromCharCode(...new Uint8Array(bytes,head,4))==='Exif'){
   const base=head+6;
   if(!valid(base,8))return undefined;
   const le=a.getUint16(base)===0x4949;
   if(!le&&a.getUint16(base)!==0x4D4D)return undefined;
   const u16=(x:number)=>valid(x,2)?a.getUint16(x,le):NaN;
   const u32=(x:number)=>valid(x,4)?a.getUint32(x,le):NaN;
   if(u16(base+2)!==42)return undefined;
   const find=(ifd:number,tag:number)=>{
    const start=base+ifd;if(!valid(start,2))return undefined;
    const count=u16(start);if(!Number.isFinite(count)||count>1024)return undefined;
    for(let i=0;i<count;i++){
     const p=start+2+i*12;if(!valid(p,12))return undefined;
     if(u16(p)===tag)return {type:u16(p+2),count:u32(p+4),value:p+8};
    }
    return undefined;
   };
   const gpsEntry=find(u32(base+4),0x8825);if(!gpsEntry||gpsEntry.type!==4)return undefined;
   const gpsIfd=u32(gpsEntry.value);
   const ref=(tag:number)=>{
    const entry=find(gpsIfd,tag);if(!entry||entry.type!==2)return undefined;
    const n=entry.count;if(!n||n>8)return undefined;
    const p=n<=4?entry.value:base+u32(entry.value);
    return valid(p,1)?String.fromCharCode(a.getUint8(p)).toUpperCase():undefined;
   };
   const degree=(tag:number)=>{
    const entry=find(gpsIfd,tag);
    if(!entry||entry.type!==5||entry.count!==3)return undefined;
    const start=base+u32(entry.value);if(!valid(start,24))return undefined;
    const v=[0,1,2].map(i=>{
     const p=start+i*8,n=u32(p),d=u32(p+4);return d>0?n/d:NaN;
    });
    return v.every(Number.isFinite)?v[0]+v[1]/60+v[2]/3600:undefined;
   };
   const lat=degree(2),lng=degree(4),ns=ref(1),ew=ref(3);
   if(lat===undefined||lng===undefined||!['N','S'].includes(ns||'')||!['E','W'].includes(ew||''))return undefined;
   const latitude=lat*(ns==='S'?-1:1),longitude=lng*(ew==='W'?-1:1);
   if(Math.abs(latitude)>90||Math.abs(longitude)>180)return undefined;
   return formatGps(latitude,longitude);
  }
  off=end;
 }
 return undefined;
}
/** Only invoked by an explicit user action or when user opted in for device GPS. */
export async function readDeviceGps(timeoutMs=6000):Promise<string>{
 if(!navigator.geolocation)throw Error('Thiết bị không cung cấp GPS cho ứng dụng.');
 return new Promise<string>((resolve,reject)=>navigator.geolocation.getCurrentPosition(
  position=>resolve(formatGps(position.coords.latitude,position.coords.longitude)),
  err=>reject(Error(err.code===1?'Chưa cấp quyền vị trí cho HNL Mark.':'Không lấy được GPS. Hãy bật Vị trí hoặc nhập thủ công.')),
  {enableHighAccuracy:true,timeout:timeoutMs,maximumAge:10000}
 ));
}
