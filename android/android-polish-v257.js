/* APK-only compact library labels + video quality sheet close controls. */
(function(){
'use strict';
const body=document.body, summary=document.getElementById('librarySummary');
const libraryBtn=document.getElementById('openLibrary');
if(libraryBtn)libraryBtn.textContent='▣ Thư viện HNL Mark';
if(summary){
 const shorten=()=>{
  const text=summary.textContent||'',count=text.match(/^\s*(\d+)\s*ảnh/);
  if(count){const label=count[1]+' ảnh';if(text!==label)summary.textContent=label;}
 };
 new MutationObserver(shorten).observe(summary,{childList:true,characterData:true,subtree:true});
 shorten();
}
const modal=document.getElementById('libraryModal');
const help=modal?.querySelector('.library-sheet > p');
if(help)help.textContent='Ảnh được lưu trong ứng dụng này. Hãy sao lưu dự án ZIP trước khi xóa dữ liệu hoặc gỡ APK.';
const panel=document.getElementById('videoQualityPanel');
const gear=document.getElementById('videoSettingsToggle');
if(!panel||!gear)return;
const header=document.createElement('div');header.className='apk-video-sheet-header';
header.innerHTML='<strong>Chất lượng video</strong><button type="button" aria-label="Đóng cài đặt video">Đóng ✕</button>';
panel.prepend(header);
const shade=document.createElement('button');shade.type='button';shade.className='apk-video-quality-shade';
shade.setAttribute('aria-label','Đóng cài đặt video');shade.hidden=true;body.appendChild(shade);
const close=()=>{if(body.classList.contains('apk-video-quality-open'))gear.click();};
shade.addEventListener('click',close);header.querySelector('button').addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&body.classList.contains('apk-video-quality-open')){e.preventDefault();close();}});
const sync=()=>{shade.hidden=!body.classList.contains('apk-video-quality-open');};
new MutationObserver(sync).observe(body,{attributes:true,attributeFilter:['class']});sync();
})();
