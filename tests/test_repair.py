from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
from io import BytesIO
from pathlib import Path
P=Path(__file__).resolve().parents[1]
root=Image.new('RGB',(1000,700),(122,150,167));d=ImageDraw.Draw(root)
d.rectangle((110,150,460,215),fill=(240,80,70));d.text((120,165),'10/11/2026 15:45',fill='white')
buf=BytesIO();root.save(buf,format='JPEG',quality=95)
import re
html=(P/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="[^"]+">','<style>'+(P/'style.css').read_text()+'</style>',html)
html=re.sub(r'<script src="\./app\.js\?v=[^"]+" defer></script>',lambda m:'<script>'+(P/'app.js').read_text()+'</script>',html)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':412,'height':915},accept_downloads=True)
 pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.set_content(html);pg.locator('#photoInput').set_input_files({'name':'stamp-original.jpg','mimeType':'image/jpeg','buffer':buf.getvalue()});pg.wait_for_timeout(350)
 pg.locator('#repairTool').click();pg.locator('#repairMethod').select_option('up')
 x=pg.locator('#previewCanvas');x.scroll_into_view_if_needed();bb=x.bounding_box()
 pg.mouse.move(bb['x']+bb['width']*.10,bb['y']+bb['height']*.20);pg.mouse.down();pg.mouse.move(bb['x']+bb['width']*.49,bb['y']+bb['height']*.35,steps=5);pg.mouse.up()
 assert pg.locator('#repairApply').is_enabled();pg.locator('#repairApply').click();pg.wait_for_timeout(300)
 with pg.expect_download() as d:pg.locator('#saveOne').click()
 d.value.save_as(str(P/'test-repair-output.jpg'))
 im=Image.open(P/'test-repair-output.jpg')
 # The bright red stamp was present before processing and now is replaced with the gray background.
 original=root.getpixel((250,185));after=im.getpixel((250,185));print('Original vs repaired',original,after,'errors',errors)
 assert original[0]>200 and after[0]<180 and not errors
 b.close()