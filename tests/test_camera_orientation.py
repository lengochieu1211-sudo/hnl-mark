from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image
import re, io, zipfile
P=Path(__file__).resolve().parents[1]
html=(P/'index.html').read_text()
html=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>','',html)
html=re.sub(r'<link rel="stylesheet" href="[^"]+">','',html)
css=(P/'style.css').read_text()
js=(P/'app.js').read_text()
mock='''
window.__calls=0;
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async ()=>{
 window.__calls++;
 const cam=document.createElement('canvas'); cam.width=1280;cam.height=720;
 const ctx=cam.getContext('2d');
 ctx.fillStyle='#11384b';ctx.fillRect(0,0,1280,720);
 ctx.fillStyle='#ff5f30';ctx.fillRect(0,0,140,160);
 ctx.fillStyle='#f3eaba';ctx.fillRect(470,220,280,180);
 ctx.fillStyle='#2ecc85';ctx.fillRect(1130,530,150,190);
 const stream=cam.captureStream(20);
 window.__cameraCanvas=cam;
 return stream;
}}});
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,accept_downloads=True)
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.add_style_tag(content=css)
 page.evaluate(mock)
 page.add_script_tag(content=js)
 page.locator('#openCamera').click()
 page.wait_for_function('!document.getElementById("cameraControls").hidden && document.getElementById("previewCanvas").width>0',timeout=15000)
 page.wait_for_function('document.getElementById("previewCanvas").height > document.getElementById("previewCanvas").width',timeout=10000)
 label=page.locator('#cameraOrientation').inner_text();dimensions=page.locator('#previewDimensions').inner_text()
 print('portrait:',label,dimensions)
 # camera buttons MUST sit BELOW canvas and never overlap image in portrait
 bb=page.locator('#stage').bounding_box(); bc=page.locator('#cameraControls').bounding_box(); assert bc['y']>=bb['y']+bb['height']-1, (bb,bc)
 print('portrait dock under image:',round(bb['y']+bb['height']),round(bc['y']))
 assert 'DỌC' in label
 assert '720 × 1280' in dimensions
 page.screenshot(path=str(P/'orientation-portrait-live.png'),full_page=True)
 # Move viewport to landscape *while camera is active*, do not renegotiate tracks.
 page.set_viewport_size({'width':844,'height':390})
 page.wait_for_function('document.getElementById("previewCanvas").width > document.getElementById("previewCanvas").height',timeout=15000)
 label=page.locator('#cameraOrientation').inner_text();dimensions=page.locator('#previewDimensions').inner_text()
 bb=page.locator('#stage').bounding_box(); bc=page.locator('#cameraControls').bounding_box(); assert bc['x']>=bb['x']+bb['width']-1, (bb,bc)
 print('landscape dock right of image:',round(bb['x']+bb['width']),round(bc['x']))
 print('landscape:',label,dimensions,'getUserMedia calls',page.evaluate('window.__calls'))
 assert 'NGANG' in label
 assert '1280 × 720' in dimensions
 assert page.evaluate('window.__calls')==1
 page.screenshot(path=str(P/'orientation-landscape-live.png'),full_page=True)
 # Capture horizontal
 page.locator('#shutterButton').click()
 page.wait_for_function('!document.getElementById("cameraReview").hidden && document.querySelectorAll(".gallery-card").length===1',timeout=15000)
 # Review controls also remain OUTSIDE the photograph and in the right dock.
 bb=page.locator('#stage').bounding_box(); br=page.locator('#cameraReview').bounding_box(); assert br['x']>=bb['x']+bb['width']-1,(bb,br)
 page.locator('#acceptPhoto').click()
 with page.expect_download(timeout=20000) as download:page.locator('#saveOne').click()
 download.value.save_as(str(P/'orientation-landscape-capture.jpg'))
 with Image.open(P/'orientation-landscape-capture.jpg') as img:print('landscape exported',img.size);assert img.width>img.height
 # Capture portrait from landscape-native video, rotated on save
 page.set_viewport_size({'width':390,'height':844})
 page.locator('#openCamera').click()
 page.wait_for_function('document.getElementById("previewCanvas").height > document.getElementById("previewCanvas").width',timeout=15000)
 page.locator('#shutterButton').click()
 page.wait_for_function('!document.getElementById("cameraReview").hidden && document.querySelectorAll(".gallery-card").length===2',timeout=15000)
 code2=page.locator('#serialPreview').inner_text()
 page.locator('#acceptPhoto').click()
 with page.expect_download(timeout=20000) as download:page.locator('#saveOne').click()
 download.value.save_as(str(P/'orientation-portrait-capture.jpg'))
 with Image.open(P/'orientation-portrait-capture.jpg') as img:print('portrait exported',img.size);assert img.height>img.width
 with page.expect_download(timeout=20000) as download:page.locator('#saveAll').click()
 download.value.save_as(str(P/'orientation-batch.zip'))
 with zipfile.ZipFile(P/'orientation-batch.zip') as z:
  assert z.testzip() is None
  sizes=[Image.open(io.BytesIO(z.read(n))).size for n in z.namelist()]
  print('batch:',z.namelist(),sizes)
  assert len(sizes)==2 and sizes[0][0]>sizes[0][1] and sizes[1][1]>sizes[1][0]
 print('playwright JS errors',errors)
 assert not errors
 context.close();browser.close()