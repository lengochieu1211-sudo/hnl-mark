/** Portable ORIGINAL-media archive. Never replaces or deletes old media. */
import JSZip from 'jszip';
import type {MediaItem} from '../types/hnl';
import {storeMedia} from './mediaStorage';
interface Entry {name:string;mime:string;size:number;stampedName?:string;meta:Omit<MediaItem,'rawBlob'|'stampedBlob'|'url'>}
const MAX_ARCHIVE_BYTES=512*1024*1024;
export async function createProjectZip(items:MediaItem[]):Promise<Blob>{
 const zip=new JSZip();const manifest:{app:string,format:number,createdAt:string,items:Entry[]}={app:'HNLMark',format:1,createdAt:new Date().toISOString(),items:[]};let total=0;
 for(const item of items){const blob=item.rawBlob||await(await fetch(item.url)).blob();if(!blob.size)throw Error('Ảnh/video gốc trống: '+item.title);
 total+=blob.size;if(total>MAX_ARCHIVE_BYTES)throw Error('Dự án vượt 512MB, hãy chia ra các ZIP nhỏ để không tràn bộ nhớ.');
 const ext=blob.type.startsWith('video/')?(blob.type.includes('mp4')?'mp4':'webm'):blob.type.includes('png')?'png':'jpg';
 const name=`media/${manifest.items.length.toString().padStart(4,'0')}.${ext}`;
 const {rawBlob,stampedBlob,url,...meta}=item;void rawBlob;void url;
 let stampedName: string|undefined;
 if(stampedBlob?.size){
   total+=stampedBlob.size;if(total>MAX_ARCHIVE_BYTES)throw Error('Dự án vượt 512MB, chia ZIP nhỏ hơn.');
   stampedName=`media/${manifest.items.length.toString().padStart(4,'0')}_stamped.jpg`;
   zip.file(stampedName,stampedBlob,{compression:'STORE'});
 }
 zip.file(name,blob,{compression:'STORE'});manifest.items.push({name,mime:blob.type,size:blob.size,stampedName,meta});
 }
 zip.file('manifest.json',JSON.stringify(manifest,null,2));
 return zip.generateAsync({type:'blob',compression:'STORE'});
}
export async function restoreProjectZip(zipBlob:Blob):Promise<MediaItem[]>{
 if(zipBlob.size>MAX_ARCHIVE_BYTES)throw Error('ZIP vượt giới hạn 512MB');
 const zip=await JSZip.loadAsync(zipBlob);const file=zip.file('manifest.json');if(!file)throw Error('Không phải bản sao lưu HNL Mark (thiếu manifest)');
 const manifest=JSON.parse(await file.async('string')) as {app:string;format:number;items:Entry[]};
 if(manifest.app!=='HNLMark'||manifest.format!==1||!Array.isArray(manifest.items)||manifest.items.length>300)throw Error('Cấu trúc dự án không hợp lệ');
 const loaded:MediaItem[]=[];let sum=0;
 for(const entry of manifest.items){
 if(!/^media\/\d{4}\.(jpg|png|mp4|webm)$/.test(entry.name))throw Error('Tên tệp không hợp lệ');
 if(!entry.mime?.match(/^(image|video)\//)||!Number.isSafeInteger(entry.size)||entry.size<=0||entry.size>MAX_ARCHIVE_BYTES)throw Error('Tệp media sai định dạng');
 const data=zip.file(entry.name);if(!data)throw Error('Thiếu '+entry.name);
 const bytes=await data.async('uint8array');sum+=bytes.byteLength;if(bytes.byteLength!==entry.size||sum>MAX_ARCHIVE_BYTES)throw Error('Kích thước media không hợp lệ');
 const raw=new ArrayBuffer(bytes.byteLength);new Uint8Array(raw).set(bytes);
 const blob=new Blob([raw],{type:entry.mime});const id=`restored-${Date.now()}-${loaded.length}-${Math.random().toString(36).slice(2,6)}`;
 let stamped:Blob|undefined;
 if(entry.stampedName){
   if(!/^media\/\d{4}_stamped\.jpg$/.test(entry.stampedName))throw Error('Tệp dấu sai tên');
   const file=zip.file(entry.stampedName);if(!file)throw Error('Thiếu ảnh có dấu');
   stamped=new Blob([await file.async('arraybuffer')],{type:'image/jpeg'});
   sum+=stamped.size;if(sum>MAX_ARCHIVE_BYTES)throw Error('Vượt giới hạn giải nén');
 }
 const media={...entry.meta,id,rawBlob:blob,stampedBlob:stamped,url:URL.createObjectURL(stamped||blob)} as MediaItem;
 await storeMedia(media);loaded.push(media);
 }
 return loaded;
}
