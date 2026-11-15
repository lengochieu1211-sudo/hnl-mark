import assert from 'node:assert/strict';
import {mediaExtension,stampedArchiveMime} from '../studio-ui/src/services/mediaExtensions.ts';
const cases={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',avif:'image/avif',gif:'image/gif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/x-m4v','3gp':'video/3gpp',ogv:'video/ogg'};
for(const [ext,mime] of Object.entries(cases)){
 const kind=mime.startsWith('video/')?'video':'photo';
 assert.equal(stampedArchiveMime(`media/0007_stamped.${ext}`,`media/0007.${mediaExtension(mime,kind)}`),mime);
}
for(const invalid of ['media/0006_stamped.jpg','../media/0007_stamped.jpg','media/0007_stamped.pdf','media/0007_stamped.jpg?x=1']){
 assert.throws(()=>stampedArchiveMime(invalid,'media/0007.jpg'),undefined,invalid);
}
console.log('PASS TEST42: 14 stamped formats round-trip without MIME forgery, mismatch/zip traversal rejected');
