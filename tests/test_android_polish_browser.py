"""Chromium smoke of APK-only CSS on small and standard handset with mocked camera."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 for w,h in ((390,844),(360,640)):
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=True,has_touch=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script('''() => {}''')
  html=(R/'index.html').read_text(encoding='utf8')
  html=re.sub(r'<script src="[^"]+" defer></script>', '', html)
  html=re.sub(r'<link rel="stylesheet" href="[^"]+">', '', html)
  page.set_content(html)
  for file in ['style.css','android/android-ui.css','camera-controls.css','android/android-camera-v25.css','android/android-select-v25.css','android/android-ux-v251.css','android/android-preview-v253.css','android/android-polish-v257.css']:
   page.add_style_tag(content=(R/file).read_text(encoding='utf8'))
  for file in ['crop-ratios.js','app.js','orientation.js','video.js','camera-controls.js','android/android-camera-v25.js','android/android-select-v25.js','android/android-app.js','android/preview-geometry.js','android/android-ux-v251.js','android/android-polish-v257.js']:
   page.add_script_tag(content=(R/file).read_text(encoding='utf8'))
  page.wait_for_function("document.body.classList.contains('hnl-android-apk')")
  styles=page.evaluate('''() => ({input:getComputedStyle(document.getElementById('projectText')).fontSize,
    select:getComputedStyle(document.querySelector('.apk-select-trigger')).fontSize,
    option:getComputedStyle(document.querySelector('.apk-select-option')||document.querySelector('.apk-select-trigger')).fontSize,
    source:document.getElementById('librarySummary').textContent})''')
  print('STYLES',w,h,styles)
  assert styles['input']=='13px' and styles['select']=='13px',styles
   # Fake native camera track with no camera zoom: ensure digital zoom/center-focus available.
  page.evaluate('''() => {Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async ()=>{
    const c=document.createElement('canvas');c.width=640;c.height=480;
    const g=c.getContext('2d');g.fillStyle='blue';g.fillRect(0,0,640,480);
    return c.captureStream(15);
   }}})}''')
  try:
   page.evaluate('window.HNLVideoStudio.openCamera()')
   page.wait_for_function("document.body.classList.contains('hnl-video-live')",timeout=5000)
  except Exception as err:
    raise AssertionError('Video could not open: '+str(err))
  dock=page.locator('#videoStudio .hnl-camera-dock-adjust');assert dock.is_visible()
  page.locator('#videoSettingsToggle').click()
  page.wait_for_function("document.body.classList.contains('apk-video-quality-open')")
  box=page.locator('#videoQualityPanel').bounding_box();assert box is not None
  assert 0<=box['x']<=w and box['x']+box['width']<=w+1,(w,h,box)
  assert box['y']>=0 and box['y']+box['height']<=h+1,(w,h,box)
  assert page.locator('#videoQualityPanel .apk-video-sheet-header button').is_visible()
  page.screenshot(path=str(R/f'apk-video-settings-{w}x{h}.png'))
  trigger=page.locator('#videoQualityPanel .apk-select-trigger').first
  trigger.click()
  assert page.locator('.apk-select-sheet').is_visible()
  opt_size=page.locator('.apk-select-sheet .apk-select-option').first.evaluate('(el)=>getComputedStyle(el).fontSize')
  assert opt_size=='12.5px',opt_size
  page.locator('.apk-select-sheet .apk-select-close').click()
  page.locator('#videoQualityPanel .apk-video-sheet-header button').click()
  page.wait_for_function("!document.body.classList.contains('apk-video-quality-open')")
  page.screenshot(path=str(R/f'apk-video-{w}x{h}.png'))
  print('PASS APK browser',w,h,'video quality sheet bounds',box,'errors',errors)
  assert not errors,errors
  page.close()
 browser.close()

