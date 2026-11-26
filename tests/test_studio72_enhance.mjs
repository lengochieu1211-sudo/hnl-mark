import assert from 'node:assert/strict';
import {PHOTO_FILTERS,resolvePhotoEnhance,hasPhotoEnhance,enhanceRows,enhanceRowsV2,photoEnhanceKey} from '../studio-ui/src/services/smartErase.ts';
assert.equal(PHOTO_FILTERS.length,25);
assert.equal(hasPhotoEnhance({photoFilter:'original'}),false);
assert.equal(hasPhotoEnhance({photoFilter:'skin-soft',filterStrength:0}),false);
assert.equal(resolvePhotoEnhance({photoFilter:'skin-soft',filterStrength:50}).skinSmooth,22.5);
assert.equal(resolvePhotoEnhance({photoFilter:'night-hd',enhance:{denoise:0}}).denoise,0);
const w=5,h=5,src=new Uint8ClampedArray(w*h*4);
for(let i=0;i<src.length;i+=4){src.set([120,120,120,255],i);}
src.set([135,135,135,255],48);
const saved=src.slice(),out=new Uint8ClampedArray(src.length);
enhanceRows(src,w,h,0,h,out,resolvePhotoEnhance({enhance:{denoise:100}}));
assert.ok(out[48]<135&&out[48]>120);
assert.deepEqual(src,saved);assert.equal(out[51],255);
const skin=new Uint8ClampedArray([180,135,110,255,50,150,220,255]),lit=new Uint8ClampedArray(8);
enhanceRows(skin,2,1,0,1,lit,resolvePhotoEnhance({enhance:{skinBright:100}}));
assert.ok(lit[0]>skin[0]);assert.equal(lit[4],skin[4]);
const dark=new Uint8ClampedArray([30,30,30,255,245,245,245,255]),bright=new Uint8ClampedArray(8);
enhanceRows(dark,2,1,0,1,bright,resolvePhotoEnhance({enhance:{shadows:100}}));
assert.ok(bright[0]>30&&bright[4]-245<bright[0]-30);
console.log('PASS TEST72: 25 presets, immutable pixels, denoise, chroma mask, shadow lift, intensity and legacy default');

// TEST73: byte-for-byte parity against the TEST72 pixel implementation.
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
function referenceEnhanceRows(src,w,h,y0,count,out,e){
 const sb=e.skinBright/100,sm=e.skinSmooth/100,sh=e.sharpness/100,dn=e.denoise/100,cl=e.clarity/100,ss=e.shadows/100;
 for(let y=y0;y<y0+count;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,o=((y-y0)*w+x)*4,r=src[i],g=src[i+1],b=src[i+2],lum=.299*r+.587*g+.114*b;
  const cb=128-.168736*r-.331264*g+.5*b,cr=128+.5*r-.418688*g-.081312*b;
  const skin=clamp(Math.min((cb-75)/12,(137-cb)/12,(cr-130)/12,(183-cr)/12,(lum-25)/25,(245-lum)/20),0,1);
  const left=x>0?i-4:i,right=x+1<w?i+4:i,up=y>0?i-w*4:i,down=y+1<h?i+w*4:i;
  const weight=(j)=>{const diff=Math.max(Math.abs(src[j]-r),Math.abs(src[j+1]-g),Math.abs(src[j+2]-b));return Math.max(0,1-diff/36);};
  const wl=weight(left),wr=weight(right),wu=weight(up),wd=weight(down),sum=2+wl+wr+wu+wd;
  const smooth=Math.min(.78,.65*dn+.68*sm*skin);
  const light=ss*35*Math.pow(1-lum/255,2)+sb*skin*22*Math.sin(Math.PI*lum/255);
  for(let c=0;c<3;c++){
    const v=src[i+c],avg=(2*v+wl*src[left+c]+wr*src[right+c]+wu*src[up+c]+wd*src[down+c])/sum;
    const detail=v-avg;
    // Do not amplify isolated low-amplitude noise after denoise.
    const boost=Math.abs(detail)>3?clamp(detail,-18,18)*sh*.65*(1-dn*.65)*(1-sm*skin*.7):0;
    const contrast=cl*8*((lum-128)/128)*Math.sin(Math.PI*lum/255);
    out[o+c]=clamp(v+(avg-v)*smooth+boost+light+contrast,0,255);
  }
  out[o+3]=src[i+3];
 }
}

const sample=new Uint8ClampedArray(19*17*4);let seed=17;
for(let i=0;i<sample.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;sample[i]=seed>>>24;}
for(const preset of PHOTO_FILTERS)for(const filterStrength of [0,50,100]){
 const e=resolvePhotoEnhance({photoFilter:preset.id,filterStrength});
 const a=new Uint8ClampedArray(sample.length),b=new Uint8ClampedArray(sample.length);
 referenceEnhanceRows(sample,19,17,0,17,a,e);enhanceRows(sample,19,17,0,17,b,e);assert.deepEqual(b,a,preset.id+':'+filterStrength);
}
for(const key of ['skinBright','skinSmooth','sharpness','denoise','clarity','shadows']){
 const e=resolvePhotoEnhance({enhance:{[key]:100}}),a=new Uint8ClampedArray(sample.length),b=new Uint8ClampedArray(sample.length);
 referenceEnhanceRows(sample,19,17,0,17,a,e);enhanceRows(sample,19,17,0,17,b,e);assert.deepEqual(b,a,key);
}
console.log('PASS TEST73: exact TEST72 pixel parity for 25 presets at 3 strengths and all 6 controls');

// TEST74: all six HD controls must feed live still preview, independently of export.
const {readFileSync}=await import('node:fs');
const camera=readFileSync(new URL('../studio-ui/src/components/camera/CameraApkScreen.tsx',import.meta.url),'utf8');
const liveHD=readFileSync(new URL('../studio-ui/src/services/livePhotoEnhance.ts',import.meta.url),'utf8');
assert.match(camera,/startLivePhotoEnhance\(live,canvas,\(\)=>liveHDSettings.current/);
assert.match(camera,/mode!=='photo'\|\|!cameraHDActive\|\|isPhotoCapturing/);
assert.match(camera,/liveHDSettings.current=\{edits:resolvePhotoEnhance\(cameraFilterEdits\),exposure:exposureFactor,zoom:zoomLevel\}/);
assert.match(camera,/edits:\{\.\.\.DEFAULT_IMAGE_EDITS,\.\.\.cameraFilterEdits\}/);
assert.match(liveHD,/LIVE_HD_MAX_EDGE=720/);assert.match(liveHD,/LIVE_HD_FRAME_MS=83/);
assert.match(liveHD,/enhanceRowsV2\(source.data,width,height,0,height,output.data,settings.edits\)/);
assert.match(liveHD,/window.clearTimeout\(timer\)/);
const portrait=new Uint8ClampedArray([180,135,110,255,190,145,120,255,180,135,110,255]);
const smooth=new Uint8ClampedArray(portrait.length);
enhanceRows(portrait,3,1,0,1,smooth,resolvePhotoEnhance({enhance:{skinSmooth:100}}));
assert.ok(smooth[4]<portrait[4]&&smooth[4]>portrait[0]);
console.log('PASS TEST74: six HD controls wired to bounded live preview, skin smoothing fixture, unchanged still export');

 // TEST75: preserve legacy pixel regression above; V2 opt-in, stronger effect and immutable pixels.
 const renderV2=(pixels,w,h,enhance)=>{const dest=new Uint8ClampedArray(pixels.length);enhanceRowsV2(pixels,w,h,0,h,dest,resolvePhotoEnhance({enhance}));return dest;};
 assert.deepEqual(renderV2(sample,19,17,{}),sample);
 assert.notEqual(photoEnhanceKey({enhance:{skinSmooth:100}}),photoEnhanceKey({enhance:{skinSmooth:100},enhanceVersion:2}));
 const originalPortrait=portrait.slice();
 const smoothV2=renderV2(portrait,3,1,{skinSmooth:100});
 assert.ok(smoothV2[4]<smooth[4]&&smoothV2[4]>=portrait[0]);
 assert.deepEqual(portrait,originalPortrait);
 const edge=new Uint8ClampedArray([20,20,20,255,230,230,230,255,230,230,230,255]);
 assert.deepEqual(renderV2(edge,3,1,{denoise:100}),edge);
 const detailPixels=new Uint8ClampedArray([50,50,50,255,100,100,100,255,50,50,50,255]);
 assert.ok(renderV2(detailPixels,3,1,{sharpness:100})[4]>100);
 assert.ok(renderV2(detailPixels,3,1,{clarity:100})[4]>100);
 assert.ok(renderV2(detailPixels,3,1,{denoise:100})[4]<100);
 assert.ok(renderV2(dark,2,1,{shadows:100})[0]>bright[0]);
 assert.match(camera,/enhanceVersion:2 as const/);
 assert.match(liveHD,/const sw=w\/z,sh=h\/z/);
 assert.match(liveHD,/context.drawImage\(video,sx,sy,sw,sh,0,0,width,height\)/);
 assert.match(liveHD,/key!==lastKey/);
 assert.doesNotMatch(camera,/cameraFilterStrength:p.id==='original'\?0:100,cameraEnhance/);
 console.log('PASS TEST75: versioned V2, stronger smoothing, edge preservation, local detail, adaptive crop-before-downsample preview');
