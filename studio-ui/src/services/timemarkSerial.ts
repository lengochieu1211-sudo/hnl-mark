/**
 * Preserve the original TEST36 Timemark visual ID, while retaining the
 * separate human-readable sequential photo label for other stamp templates.
 * Neither code is an authenticity signature.
 */
import {formattedPhotoSerial} from './photoSerial.ts';

export function captureStampCode(
 templateId:string,showPhotoCode:boolean,prefix:string,sequence:number,stableTimemarkCode:string,
):string{
 // The original Timemark verified-side ID is a time+random 14-character code.
 // Never substitute the short HNL-0001 human counter into this vertical field.
 return templateId==='timemark'||!showPhotoCode
   ?stableTimemarkCode
   :formattedPhotoSerial(prefix,sequence);
}

/** Return a readable vertical label WITHOUT adding artificial trailing zeroes.
 * Already-saved short TEST39/40 IDs stay as stored; their original bytes are
 * never rewritten. Absent IDs use a stable 14-character date-derived fallback.
 */
export function visibleTimemarkCode(codeOverride:string|undefined,timeMs:number,sequence:number):string{
 const raw=String(codeOverride||'').trim().replace(/[^A-Za-z0-9_-]/g,'').toUpperCase();
 if(raw)return raw.slice(0,20);
 const when=Number.isFinite(timeMs)?Math.max(0,Math.floor(timeMs)):0;
 const timePart=when.toString(36).toUpperCase().padStart(9,'0').slice(-9);
 const seq=Number.isSafeInteger(sequence)&&sequence>0?sequence:1;
 const low=when>>>0,high=Math.floor(when/0x100000000)>>>0;
 const mixed=(Math.imul(low^high,2654435761)^Math.imul(seq,2246822519))>>>0;
 return timePart+mixed.toString(36).toUpperCase().padStart(5,'0').slice(-5);
}

/** Separate immutable display ID from the human HNL counter.
 * Legacy items get a deterministic ID from their original local identity,
 * never from mutable date/time, stamp settings or filter values. */
export function mediaTimemarkCode(media:{id:string;photoCode?:string;timemarkCode?:string}):string{
 const valid=(s:string|undefined)=>/^[A-Z0-9]{14}$/.test(s||'')&&!/^HNL/.test(s||'');
 if(valid(media.timemarkCode))return media.timemarkCode!;
 if(valid(media.photoCode))return media.photoCode!;
 let a=2166136261,b=0x9e3779b9;
 for(const ch of String(media.id||'')){
   const n=ch.codePointAt(0)||0;
   a=Math.imul(a^n,16777619);b=Math.imul(b^n,2246822519);
 }
 const part=(n:number)=>(n>>>0).toString(36).toUpperCase().padStart(7,'0');
 return part(a)+part(b);
}
export function mediaStampCode(templateId:string,media:{id:string;photoCode?:string;timemarkCode?:string}):string{
 return templateId==='timemark'?mediaTimemarkCode(media):media.photoCode||'';
}
