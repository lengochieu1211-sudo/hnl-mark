import assert from 'node:assert/strict';
import {deliverPickedBatch,isPrivatePickedUrl} from '../studio-ui/src/services/nativePickedBatch.ts';

const root='https://appassets.androidplatform.net/picked/';
const u1=root+'ab12-7f',u2=root+'cc22',u3=root+'d23a';
assert.equal(isPrivatePickedUrl(u1),true);
for(const bad of ['https://evil.example/picked/ab12','file:///tmp/a','https://appassets.androidplatform.net/picked/../abc',root+'abc?x=1','']){
 assert.equal(isPrivatePickedUrl(bad),false,bad);
}
const seen=[],progress=[];
let fetched=0;
const read=async (url,opts)=>{
 fetched++;
 assert.equal(opts.credentials,'same-origin');
 if(url===u2)return {ok:false};
 return {ok:true,blob:async()=>new Blob([url],{type:'image/jpeg'})};
};
const importer=async files=>{
 assert.equal(files.length,1);
 seen.push(files[0].name);
 return files[0].name==='c.jpg'
  ?{imported:0,failed:1,errors:['c.jpg: IndexedDB đầy']}
  :{imported:1,failed:0,errors:[]};
};
const result=await deliverPickedBatch([
 {url:u1,name:'a.jpg',type:'image/jpeg',size:123},
 {url:u2,name:'b.jpg',type:'image/jpeg'},
 {url:u3,name:'c.jpg',type:'image/jpeg'},
 {url:'https://evil.test/picked/foo',name:'bad.jpg',type:'image/jpeg'},
 {url:root+'dd44',name:'wrong.pdf',type:'application/pdf'},
],importer,read,(n,total)=>progress.push(`${n}/${total}`));
assert.equal(result.imported,1);
assert.equal(result.failed,4);
assert.deepEqual(seen,['a.jpg','c.jpg']);
assert.equal(fetched,3,'Invalid URLs must never be fetched');
assert.deepEqual(progress,['1/5','2/5','3/5','4/5','5/5']);
assert.equal(result.errors.length,4);
const empty=await deliverPickedBatch(null,importer,read);
assert.equal(empty.failed,1);
const many=await deliverPickedBatch(Array.from({length:31},(_,i)=>({url:u1,name:`${i}.jpg`,type:'image/jpeg'})),importer,read);
assert.equal(many.imported,30);assert.equal(many.failed,1,'More than 30 must be reported');
console.log('PASS TEST42: native picker delivers valid files after failures, rejects spoofed URLs and reports exact counts');
