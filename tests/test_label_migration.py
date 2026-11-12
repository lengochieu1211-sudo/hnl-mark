from pathlib import Path
import re
from playwright.sync_api import sync_playwright

P=Path(__file__).resolve().parents[1]
html=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>','',(P/'index.html').read_text())
html=re.sub(r'<link rel="stylesheet" href="[^"]+">','',html)
js=(P/'app.js').read_text()
css=(P/'style.css').read_text()

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream'])
 for saved,expected in [
  (None,('Time Mark','100% Chân Thực')),
  ({'footerBrand':'HNLMark','footerCaption':'Ảnh đã chỉnh sửa'},('Time Mark','100% Chân Thực')),
  ({'footerBrand':'My Project','footerCaption':'Nhật ký công trường'},('My Project','Nhật ký công trường'))
 ]:
  page=b.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.add_style_tag(content=css)
  page.evaluate("(cfg)=>{\n    const entries=new Map();\n    Object.defineProperty(window,'localStorage',{configurable:true,value:{\n      getItem:(key)=>entries.get(key)||null,\n      setItem:(key,val)=>entries.set(key,String(val)),\n      removeItem:(key)=>entries.delete(key)\n    }});\n    if(cfg){localStorage.setItem('hnlmark-config-v1',JSON.stringify(cfg));\n            localStorage.setItem('hnlmark-timemark-brand-migrated','1');}\n  }",saved)
  page.add_script_tag(content=js)
  actual=(page.locator('#footerBrand').input_value(),page.locator('#footerCaption').input_value())
  assert actual==expected,(saved,actual,expected)
  if saved and saved.get('footerBrand')=='HNLMark':
   # Verify the serial stamp shares the same migrated footer label.
   assert 'const serial=photoSerial(p),label=serial+\'  |  \'+(textSafe(config.footerBrand)||\'Time Mark\')' in js
  assert not errors,errors
  page.close()
 b.close()
print('PASS: defaults, old one-time migration flag, custom labels, typography field values')