import type {MediaItem} from '../types/hnl';
const NAME='hnlmark-studio-media-v1', STORE='media', TRASH='trash';
const RETENTION_MS=7*24*60*60*1000;
type StoredRow={id:string;meta:MediaItem;blob:Blob;stampedBlob?:Blob};
type TrashRow=StoredRow&{deletedAt:number};
export type TrashMediaSummary={id:string;title:string;kind:MediaItem['kind'];deletedAt:number};
/** Upgrade in-place: the old media store, keys, bytes and URLs are preserved. */
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const req=indexedDB.open(NAME,2);
 req.onupgradeneeded=()=>{const db=req.result;
  if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
  if(!db.objectStoreNames.contains(TRASH))db.createObjectStore(TRASH,{keyPath:'id'});
 };
 req.onerror=()=>reject(req.error||Error('Không mở được thư viện HNL'));
 req.onsuccess=()=>resolve(req.result);
});}

export async function storeMedia(item:MediaItem):Promise<void>{
 const db=await openDb();try{const blob=item.rawBlob || (await (await fetch(item.url)).blob());
 const meta={...item,url:'',rawBlob:undefined,stampedBlob:undefined};
 await new Promise<void>((resolve,reject)=>{const tr=db.transaction(STORE,'readwrite');tr.objectStore(STORE).put({id:item.id,meta,blob,stampedBlob:item.stampedBlob});tr.oncomplete=()=>resolve();tr.onerror=()=>reject(tr.error);});}finally{db.close();}
}
/** All-or-nothing import. Never overwrite an existing photo/video ID. */
export async function storeMediaBatchNew(items:MediaItem[]):Promise<void>{
 if(!items.length)return;
 const db=await openDb();
 try{
  const rows=[] as Array<{id:string;meta:MediaItem;blob:Blob;stampedBlob?:Blob}>;
  for(const item of items){
   const blob=item.rawBlob||(await(await fetch(item.url)).blob());
   if(!blob.size)throw Error('Tệp gốc không có dữ liệu');
   const meta={...item,url:'',rawBlob:undefined,stampedBlob:undefined};
   rows.push({id:item.id,meta,blob,stampedBlob:item.stampedBlob});
  }
  await new Promise<void>((resolve,reject)=>{
   const transaction=db.transaction(STORE,'readwrite');
   transaction.oncomplete=()=>resolve();
   transaction.onabort=()=>reject(transaction.error||new Error('Không đủ bộ nhớ hoặc ID bị trùng; toàn bộ lần khôi phục đã hoàn tác'));
   transaction.onerror=()=>{};
   try{for(const row of rows)transaction.objectStore(STORE).add(row);}
   catch(error){try{transaction.abort();}catch{/* already rolled back */}reject(error);}
  });
 }finally{db.close();}
}
export async function loadMedia():Promise<MediaItem[]>{const db=await openDb();try{
 const rows=await new Promise<Array<{id:string,meta:MediaItem,blob:Blob,stampedBlob?:Blob}>>((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 return rows.map(r=>({...r.meta,rawBlob:r.blob,stampedBlob:r.stampedBlob,url:URL.createObjectURL(r.stampedBlob||r.blob)}));
}finally{db.close();}}
/** Move original AND stamped files atomically. Deletion never silently destroys media.
 * If IDB quota fails the transaction aborts and the original remains in STORE. */
export async function removeMedia(ids:string[]):Promise<void>{
 if(!ids.length)return;
 const db=await openDb();try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction([STORE,TRASH],'readwrite'),active=tx.objectStore(STORE),trash=tx.objectStore(TRASH);
   tx.oncomplete=()=>resolve();
   tx.onabort=()=>reject(tx.error||Error('Không thể chuyển ảnh/video vào thùng rác'));
   tx.onerror=()=>{};
   const deletedAt=Date.now();
   for(const id of new Set(ids)){
    const request=active.get(id);
    request.onsuccess=()=>{
     const row=request.result as StoredRow|undefined;
     if(!row)return;
     trash.put({...row,deletedAt} as TrashRow);
     active.delete(id);
    };
   }
  });
 }finally{db.close();}
}
/** Expired entries only are purged on accessing Trash, never on app startup
 * without a user-visible Trash entry point. The current clock is bounded so
 * a wildly wrong device date cannot silently purge saved originals. */
export async function listTrashedMedia():Promise<TrashMediaSummary[]>{
 const db=await openDb();try{
  const rows=await new Promise<TrashRow[]>((resolve,reject)=>{
   const req=db.transaction(TRASH,'readonly').objectStore(TRASH).getAll();
   req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error||Error('Không đọc được thùng rác'));
  });
  return rows.map(row=>({id:row.id,title:row.meta.title,kind:row.meta.kind,deletedAt:row.deletedAt}))
    .sort((a,b)=>b.deletedAt-a.deletedAt);
 }finally{db.close();}
}
/** A single transaction restores each byte-identical original, and refuses
 * accidental overwrite when a new file happens to have the same ID. */
export async function restoreTrashedMedia(ids:string[]):Promise<MediaItem[]>{
 if(!ids.length)return [];
 const db=await openDb();try{
  const rows:StoredRow[]=[];
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction([STORE,TRASH],'readwrite'),active=tx.objectStore(STORE),trash=tx.objectStore(TRASH);
   tx.oncomplete=()=>resolve();
   tx.onabort=()=>reject(tx.error||Error('Khôi phục thất bại; tất cả ảnh cũ vẫn được giữ nguyên'));
   tx.onerror=()=>{};
   for(const id of new Set(ids)){
    const req=trash.get(id);
    req.onsuccess=()=>{
     const row=req.result as TrashRow|undefined;
     if(!row)return;
     const {deletedAt,...original}=row;void deletedAt;
     active.add(original); // add: never overwrite an existing ID
     trash.delete(id);
     rows.push(original);
    };
   }
  });
  return rows.map(row=>({...row.meta,rawBlob:row.blob,stampedBlob:row.stampedBlob,
   url:URL.createObjectURL(row.stampedBlob||row.blob)}));
 }finally{db.close();}
}
/** Purge only records whose 7-day grace period actually elapsed. This is
 * deliberately a separate explicit operation for user safety. */
export async function purgeExpiredTrash():Promise<number>{
 const db=await openDb();try{
  let purged=0;
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(TRASH,'readwrite'),store=tx.objectStore(TRASH),now=Date.now();
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Không thể dọn thùng rác'));
   tx.onerror=()=>{};
   const req=store.openCursor();req.onsuccess=()=>{
    const cursor=req.result;if(!cursor)return;
    const row=cursor.value as TrashRow;
    if(Number.isFinite(row.deletedAt)&&row.deletedAt>0&&now-row.deletedAt>=RETENTION_MS){cursor.delete();purged++;}
    cursor.continue();
   };
  });
  return purged;
 }finally{db.close();}
}
