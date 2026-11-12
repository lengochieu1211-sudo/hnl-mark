from pathlib import Path
import re, io, zipfile
from playwright.sync_api import sync_playwright
from PIL import Image

P=Path(__file__).resolve().parents[1]
html=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>','',(P/'index.html').read_text())
html=re.sub(r'<link rel="stylesheet" href="[^"]+">','',html)
js=(P/'app.js').read_text();css=(P/'style.css').read_text()

# The test browser's about:blank has an opaque origin (IndexedDB prohibited by sandbox).
# Use a transaction-complete deterministic substitute to test app's library API.
mock_db='''
window.__libEntries = new Map();
class MockRequest{constructor(result){this.result=result;}}
Object.defineProperty(window,'IDBRequest',{configurable:true,value:MockRequest});
Object.defineProperty(window,'indexedDB',{configurable:true,value:{open:(_db,_version)=>{
 const req=new MockRequest(null);
 setTimeout(()=>{
  const db={objectStoreNames:{contains:(name)=>name==='originals'},createObjectStore(){},transaction:(_name,_mode)=>{
   const tx={objectStore:()=>({get:(id)=>new MockRequest(window.__libEntries.get(id)),getAll:()=>new MockRequest([...window.__libEntries.values()]),put:(v)=>{window.__libEntries.set(v.id,v);return new MockRequest(v.id)},delete:(id)=>{window.__libEntries.delete(id);return new MockRequest()}})};
   setTimeout(()=>tx.oncomplete?.(),15);return tx;
  }}; req.result=db;req.onsuccess?.();
 },0);return req;
}}});
window.__fakeCamCalls=0;
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
 window.__fakeCamCalls++;
 const c=document.createElement('canvas');c.width=1280;c.height=720;
 const g=c.getContext('2d');g.fillStyle='#12345b';g.fillRect(0,0,1280,720);g.fillStyle='#ffd153';g.fillRect(90,130,300,180);
 return c.captureStream(20);
}}});
'''


def setup(page, errors):
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.add_style_tag(content=css)
 page.evaluate(mock_db)
 page.add_script_tag(content=js)
 page.wait_for_timeout(200)

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream'])
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
 page=ctx.new_page(); errors=[];setup(page,errors)
 assert page.locator('#footerBrand').input_value()=='Time Mark'
 assert page.locator('#burstMode').is_checked()
 page.locator('#openCamera').click()
 page.wait_for_function('document.getElementById("cameraControls").hidden===false && document.getElementById("previewCanvas").width>0')
 page.locator('#shutterButton').click()
 page.wait_for_function('document.querySelectorAll(".gallery-card").length===1 && !document.getElementById("cameraControls").hidden')
 page.locator('#shutterButton').click()
 page.wait_for_function('document.querySelectorAll(".gallery-card").length===2 && !document.getElementById("cameraControls").hidden')
 assert page.locator('#cameraShotCount').inner_text()=='2 ảnh'
 assert page.evaluate('window.__libEntries.size')==2
 # IDs are different, both camera source originals preserved
 ids=page.evaluate('Array.from(window.__libEntries.keys())');assert len(ids)==2 and ids[0]!=ids[1]
 page.locator('#cameraLibrary').click()
 page.wait_for_function('document.querySelectorAll("#libraryCards .library-item").length===2')
 page.screenshot(path=str(P/'test-v20-library.png'))
 page.locator('#libraryCards button').first.click()
 page.wait_for_function('document.getElementById("cameraControls").hidden===true')
 page.locator('#overrideCheck').check()
 page.locator('#individualDate').fill('2026-11-12T14:30')
 page.locator('#footerBrand').fill('Time Mark')
 page.wait_for_timeout(700)
 row=page.evaluate('window.__libEntries.get(Array.from(window.__libEntries.keys())[1])')
 print('local photo records:',len(ids),'name:',row.get('name') if row else None)
 # Keep all files in a project backup rather than depending on browser data.
 with page.expect_download(timeout=20000) as d:page.locator('#backupProject').click()
 path=P/'test-v20-project.hnlmark.zip';d.value.save_as(str(path))
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  files=z.namelist();assert 'project.json' in files and len(files)==3
  import json
  meta=json.loads(z.read('project.json'))
  assert len(meta['photos'])==2
  print('backup originals',files,'custom times:',[x.get('customDate') for x in meta['photos']])
 # User changes camera burst mode to single-review, still works.
 page.locator('#openCamera').click()
 page.locator('#burstMode').uncheck()
 page.locator('#shutterButton').click()
 page.wait_for_function('!document.getElementById("cameraReview").hidden && document.querySelectorAll(".gallery-card").length===3')
 page.locator('#acceptPhoto').click()
 with page.expect_download(timeout=20000) as d: page.locator('#saveOne').click()
 exported=d.value.suggested_filename
 assert '_TM-' in exported and exported.endswith('.jpg'),exported
 print('jpg filename',exported)
 assert not errors,errors
 # Import project on a fresh app instance and read photos, settings.
 page2=ctx.new_page();errors2=[];setup(page2,errors2)
 page2.locator('#projectInput').set_input_files(str(path))
 page2.wait_for_function('document.querySelectorAll(".gallery-card").length===2',timeout=15000)
 assert page2.evaluate('window.__libEntries.size')==2
 print('restore',page2.locator('#photoCount').inner_text())
 page2.screenshot(path=str(P/'test-v20-mobile.png'))
 assert not errors2,errors2
 print('PASS burst, thumbnail library, single review, project zip recovery, Time Mark footer, JPG ID')
 ctx.close();browser.close()