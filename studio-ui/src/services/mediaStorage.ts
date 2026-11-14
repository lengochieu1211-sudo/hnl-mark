import type {MediaItem} from '../types/hnl';
const NAME='hnlmark-studio-media-v1', STORE='media';
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const req=indexedDB.open(NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});};req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);
});}
export async function storeMedia(item:MediaItem):Promise<void>{
 const db=await openDb();try{const blob=item.rawBlob || (await (await fetch(item.url)).blob());
 const meta={...item,url:'',rawBlob:undefined,stampedBlob:undefined};
 await new Promise<void>((resolve,reject)=>{const tr=db.transaction(STORE,'readwrite');tr.objectStore(STORE).put({id:item.id,meta,blob,stampedBlob:item.stampedBlob});tr.oncomplete=()=>resolve();tr.onerror=()=>reject(tr.error);});}finally{db.close();}
}
export async function loadMedia():Promise<MediaItem[]>{const db=await openDb();try{
 const rows=await new Promise<Array<{id:string,meta:MediaItem,blob:Blob,stampedBlob?:Blob}>>((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 return rows.map(r=>({...r.meta,rawBlob:r.blob,stampedBlob:r.stampedBlob,url:URL.createObjectURL(r.stampedBlob||r.blob)}));
}finally{db.close();}}
export async function removeMedia(ids:string[]):Promise<void>{const db=await openDb();try{
 await new Promise<void>((resolve,reject)=>{const tr=db.transaction(STORE,'readwrite');ids.forEach(id=>tr.objectStore(STORE).delete(id));tr.oncomplete=()=>resolve();tr.onerror=()=>reject(tr.error);});
}finally{db.close();}}
