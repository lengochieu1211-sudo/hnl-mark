from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
import io,zipfile,json,re
P=Path(__file__).resolve().parents[1]
html=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>','',(P/'index.html').read_text())
html=re.sub(r'<link rel="stylesheet" href="[^"]+">','',html)
css=(P/'style.css').read_text();js=(P/'app.js').read_text()
mock_db='''
window.__libEntries = new Map();
class MockRequest{constructor(result){this.result=result;}}
Object.defineProperty(window,'IDBRequest',{configurable:true,value:MockRequest});
Object.defineProperty(window,'indexedDB',{configurable:true,value:{open:()=>{
 const req=new MockRequest(null);
 setTimeout(()=>{
  const db={objectStoreNames:{contains:(name)=>name==='originals'},createObjectStore(){},transaction:()=>{
   const tx={objectStore:()=>({get:(id)=>new MockRequest(window.__libEntries.get(id)),getAll:()=>new MockRequest([...window.__libEntries.values()]),put:(v)=>{window.__libEntries.set(v.id,v);return new MockRequest(v.id)},delete:(id)=>{window.__libEntries.delete(id);return new MockRequest()}})};
   setTimeout(()=>tx.oncomplete?.(),10);return tx;
  }}; req.result=db;req.onsuccess?.();
 },0);return req;
}}});
'''
img=Image.new('RGB',(560,900), '#b0b7c0')
mem=io.BytesIO();img.save(mem,'JPEG')
old_stamp={'footerBrand':'HNLMark','footerCaption':'Ảnh đã chỉnh sửa','preset':'timemark'}
project={'app':'HNLMark','version':2,'photos':[{'id':'ABCDE12345ABCDE','name':'old.jpg','file':'originals/1.bin','mime':'image/jpeg','modifiedAt':1794485000000,'customDate':'2026-11-12T19:32','stampConfig':old_stamp,'edits':{'operations':[],'filters':{'brightness':0,'contrast':0,'saturation':0,'warmth':0}}}]}
backup=P/'tests'/'_old_photo_fixture.zip'
with zipfile.ZipFile(backup,'w',zipfile.ZIP_STORED) as z:
 z.writestr('project.json',json.dumps(project,ensure_ascii=False));z.writestr('originals/1.bin',mem.getvalue())
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  ctx=b.new_context(accept_downloads=True)
  page=ctx.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css);page.evaluate(mock_db);page.add_script_tag(content=js)
  page.locator('#projectInput').set_input_files(str(backup))
  page.wait_for_function('document.querySelectorAll(".gallery-card").length===1',timeout=12000)
  a=(page.locator('#footerBrand').input_value(),page.locator('#footerCaption').input_value())
  assert a==('Time Mark','100% Chân Thực'),a
  with page.expect_download(timeout=12000) as evt:page.locator('#backupProject').click()
  dest=P/'tests'/'_migrated_project.zip';evt.value.save_as(str(dest))
  with zipfile.ZipFile(dest) as z:
   restored=json.loads(z.read('project.json'))
   p=restored['photos'][0]['stampConfig']
   assert p['footerBrand']=='Time Mark' and p['footerCaption']=='100% Chân Thực',p
  assert not errs,errs
  print('PASS: imported old photo and re-exported ZIP now use Time Mark / 100% Chân Thực')
  ctx.close();b.close()
finally:
 backup.unlink(missing_ok=True)
 (P/'tests'/'_migrated_project.zip').unlink(missing_ok=True)