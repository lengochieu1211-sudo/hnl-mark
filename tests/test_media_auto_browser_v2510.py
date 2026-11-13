"""Chromium with mocked Android MediaStore bridge: photo and camera video auto-saving.
No real Android storage/camera claims from this test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=(ROOT/'index.html').read_text()
 html=re.sub(r'<script src="[^"]+" defer></script>', '',html)
 html=re.sub(r'<link rel="stylesheet" href="[^"]+">', '',html)
 page.set_content(html)
 page.evaluate('''() => {
 window.__deviceSaves=[];const sessions=new Map();let count=0;
 window.HNLAndroidBridge={
  beginSave:(n,m)=>{const key='t'+(++count);sessions.set(key,{name:n,mime:m,bytes:0});return key;},
  appendSave:(key,part)=>{let s=sessions.get(key);if(!s)return false;s.bytes+=atob(part).length;return true;},
  finishSave:(key)=>{const s=sessions.get(key);if(!s)return false;sessions.delete(key);window.__deviceSaves.push(s);return true;},
  abortSave:(key)=>{sessions.delete(key);},
  openDeviceGallery:()=>{},
  cameraState:()=>{},
  beginShare:()=>'',appendShare:()=>false,finishShare:()=>false,abortShare:()=>{},
 };
 const c=document.createElement('canvas');c.width=640;c.height=480;
 const g=c.getContext('2d');g.fillStyle='#496891';g.fillRect(0,0,640,480);let t=0;window.__canvasInterval=setInterval(()=>{g.fillStyle=t++%2?'#496891':'#53789b';g.fillRect(0,0,640,480);},45);
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
  getUserMedia:async constraints=>{
   if(constraints.audio&&!constraints.video)return new MediaStream();
   return c.captureStream(25);
  }
 }});
}''')
 files=['style.css','android/android-ui.css','camera-controls.css','android/android-camera-v25.css','android/android-select-v25.css','android/android-ux-v251.css','android/android-preview-v253.css','android/android-polish-v257.css','android/android-preview-zoom-v259.css']
 for file in files:page.add_style_tag(content=(ROOT/file).read_text())
 files=['crop-ratios.js','app.js','orientation.js','video.js','camera-controls.js','android/android-camera-v25.js','android/android-select-v25.js','android/android-app.js','android/preview-geometry.js','android/android-ux-v251.js','android/android-polish-v257.js','android/android-preview-zoom-v259.js']
 for file in files:page.add_script_tag(content=(ROOT/file).read_text())
 page.wait_for_function("document.body.classList.contains('hnl-android-apk')")
 # Capture image/video using an in-memory camera stream and a fake native bridge.
 page.locator('#openCamera').click()

 try:
  page.wait_for_function("document.body.classList.contains('hnl-camera-live')",timeout=5000)
 except Exception:
  print('DEBUG',page.evaluate("""() => ({body:document.body.className,media:document.getElementById('videoStatus')?.textContent,camera:document.getElementById('cameraStatus')?.textContent,open:document.getElementById('openCamera')?.disabled,video:document.getElementById('cameraVideo')?.readyState,toast:document.getElementById('toast')?.textContent})"""),errors)
  raise
 page.wait_for_function("document.getElementById('cameraVideo').readyState>=2",timeout=8000)
 page.locator('#shutterButton').click()
 page.wait_for_function("window.__deviceSaves.some(x=>x.mime==='image/jpeg')",timeout=15000)
 data=page.evaluate("window.__deviceSaves")
 assert any(s['mime']=='image/jpeg' and s['bytes']>1000 for s in data),data
 # Video capture in mocked browser. After stop, file must be saved without clicking Save.
 page.evaluate("window.HNLVideoStudio.openCamera()")
 page.wait_for_function("document.body.classList.contains('hnl-video-live')",timeout=12000)
 page.locator('#videoRecord').click()
 page.wait_for_function("document.querySelector('#videoStop')&&!document.querySelector('#videoStop').hidden",timeout=10000)
 page.wait_for_timeout(1200)
 page.locator('#videoStop').click()
 page.wait_for_function("window.__deviceSaves.some(x=>x.mime.startsWith('video/'))",timeout=20000)
 saves=page.evaluate("window.__deviceSaves")
 assert any(s['mime'].startswith('video/') and s['bytes']>1000 for s in saves),saves
 assert not errors,errors
 print('PASS mock Android save image and video without manual Save',saves)
 browser.close()
