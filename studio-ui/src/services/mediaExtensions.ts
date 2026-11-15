/** Choose a filename extension from media bytes' declared MIME, never from a
 * presumed JPEG/WebM pipeline. Old ZIP names continue to be recognized. */
export function mediaExtension(mime:string,kind:'photo'|'video',fallbackFilename=''):string{
 const type=mime.toLowerCase().split(';',1)[0].trim();
 const mapping:Record<string,string>={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','image/avif':'avif','image/gif':'gif',
  'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','video/3gpp':'3gp','video/x-m4v':'m4v','video/ogg':'ogv'
 };
 if(mapping[type])return mapping[type];
 const ext=fallbackFilename.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
 if(ext&&new Set(kind==='photo'?['jpg','jpeg','png','webp','heic','heif','avif','gif']:['mp4','m4v','mov','webm','3gp','ogv']).has(ext))return ext;
 return kind==='video'?'webm':'jpg';
}
