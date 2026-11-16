/* HNL Mark Studio — integrates the user's AI Studio design with the REAL existing engine.
 * No fake photo, video, Timemark templates or alternative data store.
 */
(function(){
'use strict';
const body=document.body, workspace=document.querySelector('.workspace'), shell=document.querySelector('.shell');
const editor=workspace?.querySelector(':scope > .editor'), viewer=workspace?.querySelector(':scope > .viewer');
if(!shell||!editor||!viewer||document.getElementById('hnlStudioNav'))return;
const panels=Array.from(editor.querySelectorAll(':scope > .panel'));
if(panels.length<7)return;
body.classList.add('hnl-studio-ui');
const keys=['import','presets','date','information','appearance','image-edit','export'];
panels.forEach((p,i)=>p.dataset.hnlStudioPanel=keys[i]||'other');
const path={
 camera:'<path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
 library:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 18 6-6 4 4 3-3 4 4"/>',
 stamp:'<path d="M7 14v-2a5 5 0 0 1 10 0v2l2 2H5l2-2Z"/><path d="M4 19h16v2H4z"/>',
 export:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 edit:'<path d="M3 17.5V21h3.5L20 7.5 16.5 4 3 17.5Z"/><path d="m14.5 6 3.5 3.5"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'
};
const icon=name=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path[name]+'</svg>';
const header=document.createElement('header');
header.id='hnlStudioHeader';header.className='hnl-studio-header';
header.innerHTML='<button type="button" id="hnlStudioHome" class="hnl-studio-brand" aria-label="Trang chủ HNL Mark">'+
 '<img src="./hnl-logo-192.png" width="34" height="34" alt="" decoding="async"><span><b>HNL Mark</b><small>Professional Camera & Timestamp</small></span></button>'+
 '<div class="hnl-studio-header-actions"><button type="button" id="hnlStudioEdit" aria-label="Chỉnh ảnh" title="Chỉnh ảnh">'+icon('edit')+'</button>'+
 '<button type="button" id="hnlStudioAll" aria-label="Tất cả công cụ" title="Tất cả công cụ">'+icon('menu')+'</button></div>';
shell.insertBefore(header,workspace);
const nav=document.createElement('nav');nav.id='hnlStudioNav';nav.className='hnl-studio-nav';nav.setAttribute('aria-label','Điều hướng HNL Mark');
for(const [mode,title,ico] of [['camera','Camera','camera'],['library','Thư viện','library'],['stamps','Cài dấu','stamp'],['export','Xuất','export']]){
 const b=document.createElement('button');b.type='button';b.dataset.hnlStudioTab=mode;
 b.innerHTML=icon(ico)+'<span>'+title+'</span>';b.setAttribute('aria-label',title);
 b.addEventListener('click',()=>navigate(mode));nav.appendChild(b);
}
shell.appendChild(nav);
const caption=document.createElement('p');caption.className='hnl-studio-context';caption.id='hnlStudioContext';
editor.prepend(caption);
const previewHeading=viewer.querySelector('.viewer-top .eyebrow');
if(previewHeading){previewHeading.textContent='HNL MARK · LIVE PREVIEW';previewHeading.classList.add('hnl-studio-eyebrow');}
function mode(view){
 body.dataset.hnlStudioView=view;
 for(const b of nav.querySelectorAll('[data-hnl-studio-tab]')){
  const on=b.dataset.hnlStudioTab===view;b.classList.toggle('is-active',on);
  if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 }
 caption.textContent=view==='stamps'?'Giữ nguyên mẫu Timemark, Timemark Verified và mẫu dấu HNL hiện có.':
 view==='export'?'Lưu và chia sẻ bằng chức năng gốc của HNL Mark.':
 view==='edit'?'Công cụ chỉnh sửa ảnh gốc.':
 view==='all'?'Tất cả tính năng HNL Mark':'Chọn ảnh / video hoặc mở camera để bắt đầu.';
 const i={home:0,stamps:1,edit:5,export:6}[view];
 if(i!==undefined&&window.HNLAndroidSections?.fold)window.HNLAndroidSections.fold(panels[i],true);
 if(innerWidth>=900&&view!=='home'&&view!=='all'&&i!==undefined)
  panels[i].scrollIntoView({behavior:'smooth',block:'start'});
}
function navigate(view){
 if(view==='camera'){document.getElementById('openCamera')?.click();return;}
 if(view==='library'){document.getElementById('openLibrary')?.click();return;}
 mode(view);
}
header.querySelector('#hnlStudioHome').addEventListener('click',()=>mode('home'));
header.querySelector('#hnlStudioEdit').addEventListener('click',()=>mode('edit'));
header.querySelector('#hnlStudioAll').addEventListener('click',()=>mode(body.dataset.hnlStudioView==='all'?'home':'all'));
const modal=document.getElementById('libraryModal');
if(modal)new MutationObserver(()=>{
 const button=nav.querySelector('[data-hnl-studio-tab="library"]');
 if(button)button.classList.toggle('is-active',!modal.hidden);
}).observe(modal,{attributes:true,attributeFilter:['hidden']});
/* Keep the original video editor and Save/Share visible when navigating between UI tabs. */
const videoPanel=document.getElementById('videoPanel');
function syncVideoPanel(){
 const shown=Boolean(videoPanel&&!videoPanel.hidden);
 body.dataset.hnlStudioVideo=shown?'on':'off';
 if(shown&&body.dataset.hnlStudioView!=='home'&&window.HNLAndroidSections?.fold)
  window.HNLAndroidSections.fold(panels[0],true);
}
if(videoPanel)new MutationObserver(syncVideoPanel).observe(videoPanel,{attributes:true,attributeFilter:['hidden']});
syncVideoPanel();
window.HNLStudioUI={navigate,home:()=>mode('home')};
mode('home');
})();