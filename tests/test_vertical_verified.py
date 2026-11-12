"""Right-edge vertical label is Timemark Verified, without changing two-tone bottom-right."""
import io,re
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>','',(root/'index.html').read_text())
html=re.sub(r'<link rel="stylesheet" href="[^"]+">','',html)
js=(root/'app.js').read_text();css=(root/'style.css').read_text()
mem=io.BytesIO();Image.new('RGB',(1080,1920),(73,84,94)).save(mem,format='PNG')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.add_style_tag(content=css)
 page.evaluate('''() => {window.__draws=[];const fn=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...extra){window.__draws.push({text:String(text),style:String(this.fillStyle)});return fn.call(this,text,x,y,...extra)}}''')
 page.add_script_tag(content=js)
 page.locator('#photoInput').set_input_files({'name':'site.png','mimeType':'image/png','buffer':mem.getvalue()})
 page.wait_for_function('window.__draws.some(x=>x.text.includes("Timemark Verified"))',timeout=20000)
 events=page.evaluate('window.__draws')
 assert any('Timemark Verified' in e['text'] and '|' in e['text'] for e in events),[e for e in events if 'Timemark' in e['text']]
 assert any(e['text']=='Time' and e['style']=='#ffcf48' for e in events),events[-20:]
 assert any(e['text']=='mark' and e['style']=='#ffffff' for e in events),events[-20:]
 assert any(e['text']=='100% Chân thực' for e in events),events[-20:]
 # A custom brand is never force-labeled 'Verified'.
 page.locator('#footerBrand').fill('My Site')
 page.wait_for_function('window.__draws.some(x=>x.text.includes("My Site"))')
 fresh=page.evaluate('window.__draws.slice(-50)')
 assert any(e['text']=='My Site' for e in fresh)
 assert any('My Site' in e['text'] and '|' in e['text'] for e in fresh)
 assert not errors,errors
 browser.close()
print('PASS: serial right label Timemark Verified; footer Timemark Time/yellow + mark/white + 100% Chân thực; custom label unchanged')