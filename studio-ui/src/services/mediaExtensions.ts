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

/** Strictly infer a stamped ZIP entry's MIME from its extension. Older
 * archives are accepted, but a misnamed/foreign file is never silently JPEG.
 */
export function stampedArchiveMime(stampedName:string,originalName:string):string{
 const original=originalName.match(/^media\/(\d{4})\.(?:jpg|jpeg|png|webp|heic|heif|avif|gif|mp4|webm|mov|m4v|3gp|ogv)$/);
 const stamped=stampedName.match(/^media\/(\d{4})_stamped\.(jpg|jpeg|png|webp|heic|heif|avif|gif|mp4|webm|mov|m4v|3gp|ogv)$/);
 if(!original||!stamped||original[1]!==stamped[1])throw Error('Tệp có dấu không khớp tên ảnh/video gốc');
 const ext=stamped[2];
 const types:Record<string,string>={
  jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',
  heic:'image/heic',heif:'image/heif',avif:'image/avif',gif:'image/gif',
  mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/x-m4v',
  '3gp':'video/3gpp',ogv:'video/ogg'
 };
 return types[ext];
}
