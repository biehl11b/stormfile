"""Lock and backup: full-size photos, receipts as files, PIN lock, encrypted backup and restore."""
import json, os, sys, tempfile
from playwright.sync_api import sync_playwright
from helpers import URL, new_page, start_own, fixtures

out = {}
with sync_playwright() as p:
    b, ctx, pg, errs = new_page(p, geo=True)
    start_own(pg)
    fx = fixtures()
    # full-size photo goes to the on-phone file store
    pg.click('nav.tabs button[data-tab=inventory]'); pg.click('.room-head >> nth=0')
    pg.set_input_files('input[data-roomphoto][data-source=library] >> nth=0', [fx['big']])
    pg.wait_for_timeout(2500)
    info = pg.evaluate("""async()=>{ const S=JSON.parse(localStorage.getItem('stormfile_v4')); const ph=S.properties[0].rooms[0].photoData[0];
      const d=await new Promise(r=>{const q=indexedDB.open('stormfile');q.onsuccess=()=>r(q.result)});
      const rec=await new Promise(r=>{const g=d.transaction('files').objectStore('files').get(ph.id);g.onsuccess=()=>r(g.result)});
      return {w:ph.w,h:ph.h,thumbLen:ph.src.length,blob:rec&&rec.blob.size,type:rec&&rec.type}}""")
    out['photo_full_size'] = info['w'] == 2048 and info['blob'] > 50000 and info['type'] == 'image/jpeg'
    out['photo_info'] = info
    # tap to view full size
    pg.click('.phbtn >> nth=0'); pg.wait_for_timeout(500)
    out['viewer_opens'] = pg.is_visible('.viewer img')
    out['viewer_uses_full_file'] = pg.evaluate("()=>document.querySelector('.viewer img').src.startsWith('blob:')")
    pg.click('[data-closeviewer]')
    # receipt stored as a file
    pg.fill('input[name=n] >> nth=0', 'Plaid sleeper sofa'); pg.fill('input[name=v] >> nth=0', '2400')
    pg.click('form[data-additem] button[type=submit] >> nth=0'); pg.wait_for_timeout(300)
    pg.set_input_files('input[data-itemreceipt] >> nth=0', [fx['small']]); pg.wait_for_timeout(1200)
    out['receipt_viewable'] = pg.is_visible('button[data-viewfile]')
    # PIN lock
    pg.click('#fbBtn'); pg.fill('#pin1', '2468'); pg.fill('#pin2', '2468'); pg.click('[data-act=pinSave]'); pg.wait_for_timeout(1500)
    pg.reload(wait_until='networkidle'); pg.wait_for_timeout(800)
    out['locked_on_open'] = pg.is_visible('.lockscreen')
    pg.fill('#lockPin', '1111'); pg.click('#lockGo'); pg.wait_for_timeout(1500)
    out['wrong_pin_refused'] = pg.is_visible('.lockscreen') and "isn" in pg.text_content('#lockErr')
    pg.fill('#lockPin', '2468'); pg.click('#lockGo'); pg.wait_for_timeout(1500)
    out['right_pin_unlocks'] = not pg.is_visible('.lockscreen')
    # backup, erase, restore
    pg.click('#fbBtn') if pg.is_visible('#fbBtn') else None
    pg.fill('#bk1', 'correct horse 1'); pg.fill('#bk2', 'correct horse 1')
    with pg.expect_download() as dl:
        pg.click('[data-act=bkMake]')
    path = os.path.join(tempfile.mkdtemp(), 'b.json'); dl.value.save_as(path)
    txt = open(path).read()
    out['backup_is_encrypted'] = '"format":"stormfile"' in txt and 'Plaid sleeper' not in txt and 'Plaid sleeper sofa' not in json.dumps(json.loads(txt))
    out['backup_has_photos_size_kb'] = round(len(txt) / 1024)
    pg.click('[data-act=wipe]'); pg.click('[data-act=wipe]'); pg.wait_for_timeout(800)
    left = pg.evaluate("""async()=>{const d=await new Promise(r=>{const q=indexedDB.open('stormfile');q.onsuccess=()=>r(q.result)});
      return await new Promise(r=>{const g=d.transaction('files').objectStore('files').count();g.onsuccess=()=>r(g.result)})}""")
    out['erase_clears_files'] = left == 0
    pg.evaluate("()=>{const a=document.querySelector('[data-act=agree]'); a&&a.click();}")
    pg.click('#fbBtn'); pg.wait_for_timeout(300)
    pg.evaluate("()=>{document.getElementById('rsFile').closest('details').open=true}")
    pg.set_input_files('#rsFile', path); pg.fill('#rsPass', 'wrong pass 99'); pg.click('[data-act=rsGo]'); pg.wait_for_timeout(1500)
    out['wrong_passphrase_refused'] = "match" in pg.text_content('body')
    pg.fill('#rsPass', 'correct horse 1'); pg.click('[data-act=rsGo]'); pg.wait_for_timeout(2500)
    st = pg.evaluate("()=>JSON.parse(localStorage.getItem('stormfile_v4'))")
    out['restore_brings_back_items'] = any(it['n'] == 'Plaid sleeper sofa' for r in st['properties'][0]['rooms'] for it in r['items'])
    n = pg.evaluate("""async()=>{const d=await new Promise(r=>{const q=indexedDB.open('stormfile');q.onsuccess=()=>r(q.result)});
      return await new Promise(r=>{const g=d.transaction('files').objectStore('files').count();g.onsuccess=()=>r(g.result)})}""")
    out['restore_brings_back_files'] = n >= 2
    out['errors'] = errs
    b.close()
ok = all(v for k, v in out.items() if k not in ('errors', 'photo_info', 'backup_has_photos_size_kb')) and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
