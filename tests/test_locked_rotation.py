"""Regression: browser stays portrait while physical phone is landscape; user can manually rotate even without motion sensors."""
from playwright.sync_api import sync_playwright
from PIL import Image
from pathlib import Path
import re, io
P=Path(__file__).resolve().parents[1]
html=(P/'index.html').read_text()
html=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>','',html)
html=re.sub(r'<link rel="stylesheet" href="[^"]+">','',html)
css=(P/'style.css').read_text();js=(P/'app.js').read_text()
mock="""
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async ()=>{
 const source=document.createElement('canvas'); source.width=720;source.height=1280;
 const q=source.getContext('2d');q.fillStyle='#222733';q.fillRect(0,0,720,1280);
 q.fillStyle='#ff0000';q.fillRect(0,0,80,80); // orientation marker must rotate with background
 q.fillStyle='#00ff00';q.fillRect(640,1200,80,80);
 window.__source=source;
 return source.captureStream(15);
}}});
"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded');page.add_style_tag(content=css);page.evaluate(mock);page.add_script_tag(content=js)
 page.locator('#openCamera').click()
 page.wait_for_function('document.getElementById("previewCanvas").height>document.getElementById("previewCanvas").width',timeout=15000)
 assert 'DỌC' in page.locator('#cameraOrientation').inner_text()
 assert page.viewport_size['width'] < page.viewport_size['height']
 # Sensor detects physical landscape despite the locked portrait browser viewport.
 page.evaluate('''() => {for(let i=0;i<3;i++) {const e=new Event('deviceorientation');Object.defineProperties(e,{beta:{value:3},gamma:{value:80}});window.dispatchEvent(e)}}''')
 page.wait_for_function('document.getElementById("previewCanvas").width>document.getElementById("previewCanvas").height',timeout=15000)
 assert 'CẢM BIẾN' in page.locator('#cameraOrientation').inner_text()
 assert 'NGANG' in page.locator('#cameraOrientation').inner_text()
 print('sensor while viewport locked:',page.locator('#cameraOrientation').inner_text(),page.locator('#previewDimensions').inner_text())
 assert page.viewport_size['width']==390
 # Check rotating video *and* stamping layer on same canvas, not a CSS transform.
 values=page.evaluate('''() => {const c=document.getElementById('previewCanvas');let g=c.getContext('2d');let p=g.getImageData(c.width-40,40,1,1).data;return {w:c.width,h:c.height,r:p[0],g:p[1],b:p[2]}}''')
 assert values['w']>values['h'], values
 assert values['r']>150 and values['g']<120, values # red top-left moved to top-right
 page.screenshot(path=str(P/'test-sensor-locked.png'),full_page=True)
 page.locator('#shutterButton').click()
 page.wait_for_function('!document.getElementById("cameraReview").hidden',timeout=15000)
 page.locator('#acceptPhoto').click()
 with page.expect_download(timeout=20000) as d:page.locator('#saveOne').click()
 path=P/'test-sensor-locked-export.jpg';d.value.save_as(str(path))
 with Image.open(path) as img:
  assert img.width>img.height
  pix=img.getpixel((img.width-40,40));assert pix[0]>150 and pix[1]<120, pix
 print('sensor export rotated with red anchor at',pix)
 # Motion sensor is unavailable (flat phone); manual rotate is explicit and changes BOTH layers.
 page.locator('#openCamera').click();page.wait_for_function('document.getElementById("previewCanvas").height>document.getElementById("previewCanvas").width')
 page.locator('#rotateCameraOverlay').click()
 page.wait_for_function('document.getElementById("previewCanvas").width>document.getElementById("previewCanvas").height')
 assert 'ĐÃ XOAY' in page.locator('#cameraOrientation').inner_text()
 page.screenshot(path=str(P/'test-manual-locked.png'),full_page=True)
 page.locator('#rotateCameraOverlay').click()
 page.wait_for_function('document.getElementById("previewCanvas").height>document.getElementById("previewCanvas").width')
 assert 'ĐÃ XOAY' in page.locator('#cameraOrientation').inner_text()
 page.locator('#rotateCameraOverlay').click()
 page.wait_for_function('document.getElementById("previewCanvas").width>document.getElementById("previewCanvas").height')
 page.locator('#shutterButton').click()
 page.wait_for_function('!document.getElementById("cameraReview").hidden')
 page.locator('#acceptPhoto').click()
 with page.expect_download(timeout=20000) as d:page.locator('#saveOne').click()
 d.value.save_as(str(P/'test-manual-locked-export.jpg'))
 with Image.open(P/'test-manual-locked-export.jpg') as img:assert img.width>img.height
 print('manual rotate 90/180/270: PASS; errors:',errors)
 assert not errors
 browser.close()