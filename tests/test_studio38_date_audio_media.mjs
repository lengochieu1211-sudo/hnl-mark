import assert from 'node:assert/strict';
import {mediaLocalDateTime,mediaStoredDateTime} from '../studio-ui/src/services/mediaDateTime.ts';
import {describeMicFailure} from '../studio-ui/src/services/audioDiagnostics.ts';
import {mediaExtension} from '../studio-ui/src/services/mediaExtensions.ts';
assert.equal(mediaLocalDateTime('2026-11-15T10:00:00.000Z'),'2026-11-15T17:00');
assert.equal(mediaStoredDateTime('2026-11-15T17:00','2026-11-15T10:00:00.000Z'),'2026-11-15T10:00:00.000Z');
assert.equal(mediaLocalDateTime('2026-11-15T17:00:00'),'2026-11-15T17:00');
assert.equal(mediaStoredDateTime('2026-11-15T18:00','2026-11-15T17:00:00'),'2026-11-15T18:00:00');
assert.throws(()=>mediaStoredDateTime('not-date','2026-11-15T00:00:00Z'));
assert.match(describeMicFailure({name:'NotReadableError'}),/ứng dụng khác/);
assert.match(describeMicFailure({name:'NotAllowedError'}),/Quyền micro/);
assert.doesNotMatch(describeMicFailure({name:'NotReadableError'}),/Bật quyền/);
for(const [mime,kind,ext] of [
 ['image/webp','photo','webp'],['image/heic','photo','heic'],['video/quicktime','video','mov'],
 ['video/3gpp','video','3gp'],['image/png','photo','png'],['video/mp4','video','mp4']
])assert.equal(mediaExtension(mime,kind),ext);
console.log('PASS TEST38: UTC↔VN local edit, legacy local stamps, microphone errors and original MIME extensions');
