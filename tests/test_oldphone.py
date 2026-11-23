"""Older phones (learned from KidArmor, whose first Google Play build was rejected because older Android phones
couldn't run it): pretends to be an older built-in web viewer that lacks Object.fromEntries, Blob.arrayBuffer/text
and flexbox gap, and checks StormFile still opens, spaces its screens, makes a backup and restores it."""
import json, sys, os
from playwright.sync_api import sync_playwright
from helpers import URL, open_settings, fixtures

OLD = """
delete Object.fromEntries; delete Blob.prototype.arrayBuffer; delete Blob.prototype.text;
(function(){ var d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight');
  Object.defineProperty(Element.prototype, 'scrollHeight', {configurable:true, get:function(){
    if(this.style && this.style.rowGap === '1px' && this.style.flexDirection === 'column') return 0; // flex gap "not supported"
    return d.get.call(this); }}); })();
"""
out = {}
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    ctx.add_init_script(OLD); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: d.accept())
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(600)
    out['polyfills_added'] = pg.evaluate('()=>typeof Object.fromEntries==="function" && typeof Blob.prototype.arrayBuffer==="function" && typeof Blob.prototype.text==="function"')
    out['gap_fallback_on'] = pg.evaluate('()=>document.documentElement.classList.contains("no-flexgap") && (document.getElementById("flexgap-fallback")||{textContent:""}).textContent.includes(".stack>*+*{margin-top:8px}")')
    out['start_screen'] = pg.is_visible('[data-act=agreeOwn]')
    pg.click('[data-act=agreeOwn]'); pg.wait_for_timeout(300)
    pg.fill('#rnName', 'Old phone house'); pg.select_option('#rnState', 'MS'); pg.click('[data-act=saveName]'); pg.wait_for_timeout(300)
    pg.click('nav.tabs button[data-tab=home]'); pg.wait_for_timeout(300)
    # spacing still there: the second card in main sits below the first with a margin
    out['cards_spaced'] = pg.evaluate('()=>{ const c=[...document.querySelectorAll("main .card")].filter(x=>x.offsetParent); if(c.length<2) return true; const a=c[0].getBoundingClientRect(), b2=c[1].getBoundingClientRect(); return b2.top - a.bottom >= 10; }')
    # a room photo (reads the photo's date with Blob.arrayBuffer, which this "older phone" gets from compat.js)
    fx = fixtures(); pg.click('nav.tabs button[data-tab=inventory]'); pg.click('.room-head >> nth=0')
    pg.set_input_files('input[data-roomphoto][data-source=library] >> nth=0', [fx['big']]); pg.wait_for_timeout(2500)
    out['photo_saved'] = pg.evaluate("()=>JSON.parse(localStorage.getItem('stormfile_v4')).properties[0].rooms[0].photoData.length") == 1
    # backup and restore use Blob.arrayBuffer/text, which this "older phone" gets from compat.js
    open_settings(pg); pg.evaluate('()=>document.querySelectorAll("details.sec").forEach(d=>d.open=true)')
    pg.fill('#bk1', 'old phone pass 1'); pg.fill('#bk2', 'old phone pass 1')
    with pg.expect_download() as dl: pg.click('[data-act=bkMake]')
    path = dl.value.path(); out['backup_has_photo'] = os.path.getsize(path) > 50000
    open_settings(pg); pg.set_input_files('#rsFile', path); pg.fill('#rsPass', 'old phone pass 1'); pg.wait_for_timeout(100)
    pg.evaluate("()=>{ window.__toasts=[]; new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>{ if(n.classList&&n.classList.contains('toast')) window.__toasts.push(n.textContent); }))).observe(document.body,{childList:true}); }")
    pg.click('[data-act=rsGo]'); pg.wait_for_timeout(300); pg.click('[data-act=rsGo]'); pg.wait_for_timeout(2500)
    out['restored'] = any('Restored' in t for t in pg.evaluate('()=>window.__toasts'))
    out['errors'] = errs
    b.close()
ok = all(v for k, v in out.items() if k != 'errors') and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
