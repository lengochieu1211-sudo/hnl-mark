"""HNLMark 2.0.3: real Chromium Fullscreen API must not reset sideways camera rotation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import re

ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>','',(ROOT/'index.html').read_text())
HTML=re.sub(r'<link rel="stylesheet" href="[^"]+">','',HTML)
CSS=(ROOT/'style.css').read_text();JS=(ROOT/'app.js').read_text()
VIDEO="""
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
 window.__cameraOpens=(window.__cameraOpens||0)+1;
 const c=document.createElement('canvas'); c.width=720;c.height=1280;
 const ctx=c.getContext('2d');ctx.fillStyle='#204060';ctx.fillRect(0,0,720,1280);
 ctx.fillStyle='#ff1005';ctx.fillRect(0,0,140,140);
 ctx.fillStyle='#00ff00';ctx.fillRect(580,1140,140,140);
 return c.captureStream(20);
}}});
"""
def setup(page, mock):
 page.set_content(HTML,wait_until='domcontentloaded')
 page.add_style_tag(content=CSS)
 page.evaluate(mock)
 page.add_script_tag(content=JS)
 page.wait_for_timeout(120)

def sensor(page,gamma):
 page.evaluate('''(v)=>{for(let i=0;i<4;i++){
 const e=new Event('deviceorientation');Object.defineProperties(e,{beta:{value:3},gamma:{value:v}});window.dispatchEvent(e)
 }}''',gamma)

def state(page):
 return page.evaluate('''()=>{const a=document.getElementById('cameraArea');const c=document.getElementById('previewCanvas');return {
   full:document.fullscreenElement?.tagName||'',turn:a.classList.contains('hnl-turn-left')?'left':a.classList.contains('hnl-turn-right')?'right':'none',
   transform:getComputedStyle(a).transform,canvas:[c.width,c.height],orientation:document.getElementById('cameraOrientation').textContent,
   fallback:window.getComputedStyle(document.querySelector('.camera-fallback')).display};}''')

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream'])
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
 p=ctx.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));setup(p,VIDEO)
 assert state(p)['fallback']=='none',state(p)
 p.locator('#openCamera').click();p.wait_for_function("document.getElementById('previewCanvas').height>document.getElementById('previewCanvas').width")
 assert state(p)['fallback']=='none'
 sensor(p,80)
 p.wait_for_function("document.getElementById('previewCanvas').width>document.getElementById('previewCanvas').height")
 p.wait_for_function("getComputedStyle(document.getElementById('cameraArea')).transform!=='none'")
 before=state(p);assert before['turn']=='left',before
 p.locator('#toggleCameraFull').click();p.wait_for_function('document.fullscreenElement===document.documentElement')
 p.wait_for_timeout(300)
 after=state(p)
 assert after['full']=='HTML',after
 assert after['turn']=='left',after
 assert after['transform']==before['transform']!='none',(before,after)
 assert after['canvas'][0]>after['canvas'][1],after
 p.screenshot(path=str(ROOT/'test-full-locked-landscape.png'))
 # Source orientation must carry through Full into the captured JPG source (unstamped).
 p.locator('#burstMode').uncheck();p.locator('#shutterButton').click()
 p.wait_for_function('!document.getElementById("cameraReview").hidden')
 p.locator('#acceptPhoto').click()
 assert not p.evaluate('document.fullscreenElement'), 'Full must be closed after accepting shot'
 with p.expect_download(timeout=20000) as down:p.locator('#saveOne').click()
 output=ROOT/'test-full-locked-export.jpg';down.value.save_as(str(output))
 with Image.open(output) as img:
  assert img.width>img.height,(img.width,img.height)
  # Red source origin moves to top-right when camera is rotated clockwise.
  red=img.getpixel((img.width-50,50));assert red[0]>150 and red[1]<90,red
 # Enter and exit fullscreen in portrait without sensor; no sideways CSS transform.
 p.locator('#openCamera').click()
 p.wait_for_function("document.getElementById('previewCanvas').height>document.getElementById('previewCanvas').width")
 p.locator('#toggleCameraFull').click();p.wait_for_function('document.fullscreenElement===document.documentElement')
 assert state(p)['turn']=='none',state(p)
 p.locator('#toggleCameraFull').click();p.wait_for_function('document.fullscreenElement===null')
 assert state(p)['turn']=='none',state(p)
 p.locator('#closeCamera').click()
 assert state(p)['fallback']=='none'
 assert not errs,errs
 print('PASS: Full portrait and locked-landscape keeps rotating frame+stamp, JPEG portrait/landscape, fallback hidden.')
 # No getUserMedia API: fall back displayed at initialization.
 q=ctx.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 setup(q,"Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:undefined});")
 assert state(q)['fallback']!='none',state(q)
 q.locator('#openCamera').click();assert state(q)['fallback']!='none'
 assert not errors,errors
 print('PASS: Unsupported in-browser camera shows system-camera fallback.')
 # Permission denied after an actual attempted camera launch: fallback appears.
 z=ctx.new_page();denied=[];z.on('pageerror',lambda e:denied.append(str(e)))
 setup(z,"Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new DOMException('Camera permission denied','NotAllowedError')}}});")
 assert state(z)['fallback']=='none'
 z.locator('#openCamera').click();z.wait_for_function("getComputedStyle(document.querySelector('.camera-fallback')).display!=='none'")
 assert not denied,denied
 print('PASS: Permission-denied error shows backup camera action, no JS errors.')
 browser.close()