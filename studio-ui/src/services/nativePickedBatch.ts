/** Android Photo Picker delivery. The Android-owned URI is temporary, so all
 * selected files must be handled and acknowledged before it can be released.
 * Failures of one file MUST NOT prevent processing later user-selected files.
 */
export type PickedItem={url:string;name:string;type:string;size?:number};
export type PickedImportSummary={imported:number;failed:number;errors:string[]};
export type ImportPicked=(files:File[])=>Promise<PickedImportSummary>;
export const isPrivatePickedUrl=(url:string):boolean=>
 /^https:\/\/appassets\.androidplatform\.net\/picked\/[a-f\d-]+$/.test(url);
export async function deliverPickedBatch(
 items:PickedItem[],importFiles:ImportPicked,
 read:typeof fetch=fetch,
 onProgress?:(processed:number,total:number)=>void,
):Promise<PickedImportSummary>{
 const summary:PickedImportSummary={imported:0,failed:0,errors:[]};
 if(!Array.isArray(items))return {imported:0,failed:1,errors:['Danh sách tệp Android không hợp lệ']};
 const selected=items.slice(0,30);
 for(const [index,item] of selected.entries()){
  try{
   if(!item||!isPrivatePickedUrl(item.url))throw Error('Đường dẫn Android không hợp lệ');
   if(typeof item.name!=='string'||!item.name.trim())throw Error('Tên tệp trống');
   if(!/^(image|video)\//.test(item.type||''))throw Error('Định dạng tệp không hỗ trợ');
   // Reject metadata oversize early; Android WebView cannot hold unlimited blobs.
   if(typeof item.size==='number'&&item.size>500*1024*1024)throw Error('Tệp lớn hơn 500 MB');
   const response=await read(item.url,{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('Không đọc được dữ liệu đã chọn');
   const blob=await response.blob();
   if(!blob.size)throw Error('Tệp trống');
   const result=await importFiles([new File([blob],item.name,{type:item.type})]);
   summary.imported+=result.imported;
   summary.failed+=result.failed;
   summary.errors.push(...result.errors);
   // Do not claim success when an importer returned no persisted record.
   if(!result.imported&&!result.failed){summary.failed++;summary.errors.push(item.name+': không xác nhận được đã lưu');}
  }catch(error){
   summary.failed++;
   summary.errors.push(item?.name+': '+String(error));
  }finally{onProgress?.(index+1,selected.length);}
 }
 if(items.length>selected.length){summary.failed+=items.length-selected.length;summary.errors.push('Chỉ hỗ trợ 30 tệp mỗi lượt chọn');}
 return summary;
}
