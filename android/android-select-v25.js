/* APK-only compact select. Native spinner text is oversized on some Android
   skins; the real select remains the source of truth and receives change events. */
(function(){
'use strict';
const nativeSelects=[...document.querySelectorAll('.editor select, #videoQualityPanel select')];
if(!nativeSelects.length)return;
const sheet=document.createElement('div');sheet.className='apk-select-sheet';sheet.hidden=true;
sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
sheet.innerHTML='<div class="apk-select-shade"></div><div class="apk-select-card"><div class="apk-select-head"><strong></strong><button type="button" class="apk-select-close" aria-label="Đóng">✕</button></div><div class="apk-select-list" role="listbox"></div></div>';
document.body.appendChild(sheet);
const close=()=>{
 if(sheet.hidden)return;
 sheet.hidden=true;
 document.body.classList.remove('apk-select-open');
 if(current?.button)current.button.focus({preventScroll:true});
};
sheet.querySelector('.apk-select-shade').addEventListener('click',close);
sheet.querySelector('.apk-select-close').addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden){e.preventDefault();close();}});
let current=null;
function titleFor(select){
 const label=select.id?document.querySelector('label[for="'+select.id+'"]'):null;
 return label?.textContent?.trim()?.replace(/\s+/g,' ')||select.getAttribute('aria-label')||'Chọn tùy chọn';
}
function choose(select,option){
 select.value=option.value;
 select.dispatchEvent(new Event('input',{bubbles:true}));
 select.dispatchEvent(new Event('change',{bubbles:true}));
 if(current?.refresh)current.refresh();
 close();
}
function openSelect(select,button,refresh){
 if(select.disabled||document.body.classList.contains('hnl-camera-live')||document.body.classList.contains('hnl-video-live'))return;
 current={select,button,refresh};
 sheet.querySelector('.apk-select-head strong').textContent=titleFor(select);
 const options=sheet.querySelector('.apk-select-list');options.replaceChildren();
 for(const node of select.children){
  if(node.tagName==='OPTGROUP'){
   const heading=document.createElement('div');heading.className='apk-optgroup';heading.textContent=node.label;options.appendChild(heading);
   for(const option of node.children)makeOption(option);
  }else if(node.tagName==='OPTION')makeOption(node);
 }
 function makeOption(option){
  const item=document.createElement('button');item.type='button';item.className='apk-select-option';
  item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));
  item.disabled=option.disabled||select.disabled;item.textContent=option.textContent.trim();
  if(option.selected)item.classList.add('is-selected');
  item.addEventListener('click',()=>choose(select,option));options.appendChild(item);
 }
 sheet.hidden=false;document.body.classList.add('apk-select-open');
 const selected=options.querySelector('.is-selected');
 if(selected)requestAnimationFrame(()=>selected.scrollIntoView({block:'nearest'}));
}
for(const select of nativeSelects){
 if(select.multiple||select.classList.contains('apk-select-source'))continue;
 const button=document.createElement('button');button.type='button';button.className='apk-select-trigger';
 button.setAttribute('aria-haspopup','listbox');
 button.setAttribute('aria-label',titleFor(select));
 button.innerHTML='<span class="apk-select-value"></span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
 select.classList.add('apk-select-source');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 select.insertAdjacentElement('afterend',button);
 function refresh(){
  const option=select.selectedOptions?.[0];
  button.querySelector('.apk-select-value').textContent=option?.textContent?.trim()||'Chọn';
  button.disabled=select.disabled;
  button.setAttribute('aria-label',titleFor(select)+': '+(option?.textContent?.trim()||'Chọn'));
 }
 refresh();select.addEventListener('change',refresh);
 new MutationObserver(refresh).observe(select,{attributes:true,attributeFilter:['disabled'],childList:true,subtree:true});
 button.addEventListener('click',()=>{refresh();openSelect(select,button,refresh);});
 const label=select.id?document.querySelector('label[for="'+select.id+'"]'):null;
 label?.addEventListener('click',e=>{e.preventDefault();button.click();});
}
window.HNLAndroidCompactSelect={close,isOpen:()=>!sheet.hidden};
})();
