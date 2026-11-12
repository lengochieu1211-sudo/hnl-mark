"""v2.0.4: motion gravity is responsive even when screen rotation is locked.
Playwright Chromium synthetic motion stream, not a real device sensor measurement.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re

root=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>','',(root/'index.html').read_text())
HTML=re.sub(r'<link rel="stylesheet" href="[^"]+">','',HTML)
CSS=(root/'style.css').read_text()
JS=(root/'app.js').read_text()
mock='''
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
 const c=document.createElement('canvas');c.width=720;c.height=1280;
 const g=c.getContext('2d');g.fillStyle='#5470a0';g.fillRect(0,0,720,1280);
 g.fillStyle='red';g.fillRect(0,0,140,140);return c.captureStream(25);
}}});
'''
def fire(page,name,args,n=4):
 page.evaluate('''({name,args,n})=>{for(let i=0;i<n;i++){
   const e=new Event(name);
   for(const [k,v] of Object.entries(args))Object.defineProperty(e,k,{value:v});
   window.dispatchEvent(e);
 }}''',{'name':name,'args':args,'n':n})
def gravity(page,x,y,z=0,n=4):fire(page,'devicemotion',{'accelerationIncludingGravity':{'x':x,'y':y,'z':z}},n)
def posture(page,beta,gamma,n=4):fire(page,'deviceorientation',{'beta':beta,'gamma':gamma},n)
def state(page):return page.evaluate('''()=>{
 const a=document.getElementById('cameraArea'),c=document.getElementById('previewCanvas');
 return {turn:a.classList.contains('hnl-turn-left')?'left':a.classList.contains('hnl-turn-right')?'right':'none',
 w:c.width,h:c.height,orient:document.getElementById('cameraOrientation').textContent,
 fullscreen:!!document.fullscreenElement};}''')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page=ctx.new_page();errs=[];page.on('pageerror',lambda err:errs.append(str(err)))
 page.set_content(HTML,wait_until='domcontentloaded')
 page.add_style_tag(content=CSS);page.evaluate(mock);page.add_script_tag(content=JS)
 page.locator('#openCamera').click();page.wait_for_function('document.getElementById("previewCanvas").height>document.getElementById("previewCanvas").width')
 assert state(page)['turn']=='none',state(page)
 # v2.0.3 rejected 43 degrees gamma (under 55). v2.0.4 must rotate.
 posture(page,18,43)
 page.wait_for_function('document.getElementById("cameraArea").classList.contains("hnl-turn-left") && document.getElementById("previewCanvas").width>document.getElementById("previewCanvas").height')
 assert state(page)['w']>state(page)['h'],state(page)
 print('PASS: DeviceOrientation 43° (old 55° threshold) turns to landscape')
 # Switch back to portrait via gravity while viewport stays locked.
 page.wait_for_timeout(220)
 gravity(page,0.3,8.7,1.1)
 page.wait_for_function('document.getElementById("previewCanvas").height>document.getElementById("previewCanvas").width')
 assert state(page)['turn']=='none',state(page)
 print('PASS: Gravity returns to portrait with screen locked')
 # Gravity-only sideways detection at 50-60 degrees, viewport still portrait.
 gravity(page,7.8,3.7,3)
 page.wait_for_function('document.getElementById("previewCanvas").width>document.getElementById("previewCanvas").height')
 assert state(page)['turn']=='left',state(page)
 print('PASS: Motion gravity x/y detects physical landscape')
 # Holding the handset near 45° should retain last orientation without jitter.
 for x,y in [(5.0,5.2),(5.4,5.0),(5.1,5.3),(5.2,5.0)]:
  gravity(page,x,y,3,n=3)
 page.wait_for_timeout(130)
 assert state(page)['w']>state(page)['h'] and state(page)['turn']=='left',state(page)
 print('PASS: No direction flicker around 45°')
 # Full must preserve same orientation and pixels.
 page.locator('#toggleCameraFull').click();page.wait_for_function('document.fullscreenElement===document.documentElement')
 assert state(page)['turn']=='left' and state(page)['fullscreen'],state(page)
 print('PASS: Full preserves physical landscape')
 # On returning to portrait, the UI rotates back without restarting camera.
 gravity(page,0.2,9.0,2)
 page.wait_for_function('document.getElementById("previewCanvas").height>document.getElementById("previewCanvas").width')
 assert state(page)['turn']=='none',state(page)
 print('PASS: Portrait transition while Full stays correct')
 # A phone laid flat cannot provide reliable left/right: never auto-flip.
 gravity(page,0.6,0.4,9.7,n=8)
 page.wait_for_timeout(100)
 assert state(page)['turn']=='none',state(page)
 print('PASS: Flat phone does not cause random orientation')
 page.locator('#closeCamera').click();assert not errs,errs
 browser.close()