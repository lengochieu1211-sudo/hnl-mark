/** Photo code configuration is a human-readable sequential label, NOT a
 * cryptographic photo signature or proof that the content is authentic.
 * Disabled labels keep the existing high-entropy Timemark identifier.
 */
export function formattedPhotoSerial(prefix:string,sequence:number):string{
 const clean=String(prefix||'HNL').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16)||'HNL';
 const seq=Number.isSafeInteger(sequence)&&sequence>0?sequence:1;
 return `${clean}-${String(seq).padStart(4,'0')}`;
}
export function nextPhotoSerialSequence(sequence:number,used=1):number{
 const base=Number.isSafeInteger(sequence)&&sequence>0?sequence:1;
 return Math.min(Number.MAX_SAFE_INTEGER,base+Math.max(0,Math.floor(used)));
}
