/** datetime-local has NO timezone. Preserve old timezone-less data, and convert
 * stored UTC/offset instants to the user's actual local wall clock for editing. */
const timezoneSuffix=/(?:Z|[+-]\d{2}:?\d{2})$/i;
const pad=(value:number)=>String(value).padStart(2,'0');
export function mediaLocalDateTime(stored:string):string{
 if(!timezoneSuffix.test(stored))return stored.slice(0,16);
 const d=new Date(stored);
 if(Number.isNaN(d.getTime()))return stored.slice(0,16);
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function mediaStoredDateTime(local:string,oldStored:string):string{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('Ngày giờ không hợp lệ');
 const parsed=new Date(`${local}:00`);
 if(Number.isNaN(parsed.getTime()))throw Error('Ngày giờ không hợp lệ');
 // Keep timezone-less legacy stamps timezone-less, or they'll jump by UTC offset.
 return timezoneSuffix.test(oldStored)?parsed.toISOString():`${local}:00`;
}
