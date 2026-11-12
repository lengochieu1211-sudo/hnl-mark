"""Mobile UI regression for compact layout, camera lock rotation and clean controls."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
P=Path(__file__).resolve().parents[1]
html=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>', '', (P/'index.html').read_text())
html=re.sub(r'<link rel="stylesheet" href="[^"]+">', '', html)
script=(P/'app.js').read_text();css=(P/'style.css').read_text()
mock="""
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async ()=>{
 const c=document.createElement('canvas'); c.width=720;c.height=1280;
 const g=c.getContext('2d');g.fillStyle='#0f4b61';g.fillRect(0,0,720,1280);
 g.fillStyle='#fff';g.font='60px Arial';g.fillText('UP',80,180);
 return c.captureStream(15);
}}});
"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.add_style_tag(content=css);page.evaluate(mock);page.add_script_tag(content=script)
 assert 'mobile-shortcuts' in page.content()
 assert page.locator('.mobile-shortcuts button').count()==4
 assert len(page.locator('.camera-hint').inner_text())<145
 assert page.locator('.preview-help').is_hidden()
 page.screenshot(path=str(P/'mobile-home.png'))
 page.locator('#openCamera').click()
 page.wait_for_function('document.body.classList.contains("hnl-camera-live")')
 assert page.evaluate('getComputedStyle(document.querySelector(".camera-area")).position')=='fixed'
 page.screenshot(path=str(P/'mobile-camera-portrait.png'))
 # Camera gets physically tilted to landscape, while Chrome viewport remains portrait.
 page.evaluate('''() => {for(let i=0;i<3;i++){const e=new Event('deviceorientation');Object.defineProperties(e,{beta:{value:0},gamma:{value:80}});window.dispatchEvent(e)}}''')
 page.wait_for_function('document.getElementById("cameraArea").classList.contains("hnl-turn-left")')
 bounds=page.evaluate('''() => {
 let a=document.getElementById('cameraArea').getBoundingClientRect();
 let s=document.getElementById('stage').getBoundingClientRect();
 let b=document.getElementById('shutterButton').getBoundingClientRect();
 return {area:[a.x,a.y,a.width,a.height],stage:[s.x,s.y,s.width,s.height],btn:[b.x,b.y,b.width,b.height]};}''')
 assert abs(bounds['area'][0])<1 and abs(bounds['area'][1])<1, bounds
 assert abs(bounds['area'][2]-390)<1 and abs(bounds['area'][3]-844)<1, bounds
 sx,sy,sw,sh=bounds['stage'];bx,by,bw,bh=bounds['btn']
 assert sx+sw<bx or bx+bw<sx or sy+sh<by or by+bh<sy, bounds
 assert 0<=bx<390-bw and 0<=by<844-bh,bounds
 page.screenshot(path=str(P/'mobile-camera-locked-landscape.png'))
 page.locator('#burstMode').uncheck()
 page.locator('#shutterButton').click()
 page.wait_for_function('!document.getElementById("cameraReview").hidden')
 assert page.locator('#cameraArea').evaluate('(e)=>e.classList.contains("hnl-turn-left")')
 page.locator('#acceptPhoto').click()
 assert page.evaluate('!document.body.classList.contains("hnl-camera-live")')
 # Opposite tilt must be handled as right-turn when browser locked portrait.
 page.locator('#openCamera').click()
 page.evaluate('''() => {for(let i=0;i<3;i++){const e=new Event('deviceorientation');Object.defineProperties(e,{beta:{value:0},gamma:{value:-80}});window.dispatchEvent(e)}}''')
 page.wait_for_function('document.getElementById("cameraArea").classList.contains("hnl-turn-right")')
 rect=page.locator('#cameraArea').bounding_box();assert abs(rect['x'])<1 and abs(rect['y'])<1 and abs(rect['width']-390)<1,rect
 page.screenshot(path=str(P/'mobile-camera-locked-other-side.png'))
 page.locator('#closeCamera').click();assert page.evaluate('!document.body.classList.contains("hnl-camera-live")')
 print('mobile compact, fullscreen camera, both physical rotations and controls: PASS', bounds,'errors',errors)
 assert not errors
 browser.close()