"""Claim packet: builds a real PDF on the phone with photos, inventory, receipts and history."""
import json, os, sys, tempfile
from playwright.sync_api import sync_playwright
from helpers import new_page, start_own, fixtures, open_claim

out = {}
with sync_playwright() as p:
    b, ctx, pg, errs = new_page(p, geo=True)
    start_own(pg, 'Packet house')
    fx = fixtures()
    # policy by hand
    pg.click('nav.tabs button[data-tab=policy]'); pg.click('text=Enter it by hand'); pg.evaluate("()=>document.querySelectorAll('#policyForm details').forEach(d=>d.open=true)")
    pg.fill('#pf-carrier', 'Test Mutual'); pg.fill('#pf-number', 'HO-123'); pg.fill('#pf-lim-A', '300000'); pg.fill('#pf-allPerils', '2500'); pg.fill('#pf-windAmt', '5')
    pg.select_option('#pf-flood', 'no'); pg.click('#policyForm button[type=submit]'); pg.wait_for_timeout(300)
    # photos, item, receipt
    pg.click('nav.tabs button[data-tab=inventory]'); pg.click('.room-head >> nth=0')
    pg.set_input_files('input[data-roomphoto][data-source=camera] >> nth=0', [fx['big'], fx['small']]); pg.wait_for_timeout(3000)
    pg.fill('input[name=n] >> nth=0', 'Sofa ’s – test'); pg.fill('input[name=v] >> nth=0', '2400'); pg.fill('input[name=y] >> nth=0', '2022')
    pg.click('form[data-additem] button[type=submit] >> nth=0'); pg.wait_for_timeout(300)
    pg.set_input_files('input[data-itemreceipt] >> nth=0', [fx['small']]); pg.wait_for_timeout(1200)
    # claim: expense + lock
    open_claim(pg)
    pg.fill('#clNum', 'CLM-77'); pg.press('#clNum', 'Tab'); pg.wait_for_timeout(200)
    pg.fill('#clDate', '2026-10-20'); pg.press('#clDate', 'Tab'); pg.wait_for_timeout(200)
    pg.fill('#rcAmt', '180'); pg.fill('#rcWhat', 'Hotel 1 night'); pg.set_input_files('#rcFile', fx['small'])
    pg.click('#addReceipt button[type=submit]'); pg.wait_for_timeout(1200)
    pg.click('[data-act=lockRecord]'); pg.wait_for_timeout(300)
    with pg.expect_download(timeout=60000) as dl:
        pg.click('[data-act=packet]')
    path = os.environ.get('PACKET_OUT') or os.path.join(tempfile.mkdtemp(), 'packet.pdf'); dl.value.save_as(path)
    data = open(path, 'rb').read()
    out['is_pdf'] = data[:5] == b'%PDF-'
    out['size_kb'] = round(len(data) / 1024)
    # read it back with the same PDF library to count pages and pull text
    pg.wait_for_timeout(300)
    import base64
    info = pg.evaluate("""async(b64)=>{ const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); const d=await PDFLib.PDFDocument.load(bytes); return {pages:d.getPageCount(), title:d.getTitle()}; }""", base64.b64encode(data).decode())
    out['pages'] = info['pages']; out['title'] = info['title']
    out['enough_pages'] = info['pages'] >= 6
    out['history_logged'] = 'Claim packet PDF made' in pg.text_content('#view')
    # "Send it to my adjuster" on a computer: the PDF downloads and an email opens with the adjuster, subject and a note
    open_claim(pg)
    pg.fill('#clAdj', 'Dana Reyes'); pg.press('#clAdj', 'Tab'); pg.fill('#clAdjEmail', 'dana.reyes@example-insurer.com'); pg.press('#clAdjEmail', 'Tab'); pg.wait_for_timeout(200)
    open_claim(pg)
    out['send_note_shows_email'] = 'dana.reyes@example-insurer.com' in pg.text_content('#view') and 'Send it to my adjuster' in pg.text_content('#view')
    pg.evaluate("""()=>{ window.__mail=[]; window.__clip=null; const c=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(/^mailto:/.test(this.href)){ window.__mail.push(this.href); return; } return c.call(this); };
      try{ Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{ window.__clip=t; }}}); }catch(e){} }""")
    with pg.expect_download(timeout=60000) as dl2:
        pg.click('[data-act=packetSend]')
    out['send_pdf_downloaded'] = dl2.value.suggested_filename.endswith('.pdf')
    pg.wait_for_timeout(500)
    from urllib.parse import unquote
    m = pg.evaluate('()=>window.__mail'); href = unquote(m[0]) if m else ''
    out['send_email_opened'] = len(m) == 1 and href.startswith('mailto:dana.reyes@example-insurer.com?') and 'subject=Claim CLM-77 - claim packet' in href \
        and 'Hello Dana Reyes,' in href and 'Attached is my claim packet (PDF)' in href and 'Policy number: HO-123' in href and 'Claim number: CLM-77' in href and '[Attach StormFile-claim-' in href
    out['send_email_copied'] = pg.evaluate('()=>window.__clip') == 'dana.reyes@example-insurer.com'
    out['send_logged'] = 'Claim packet PDF made and opened to send' in pg.text_content('#view')
    out['errors'] = errs
    b.close()
ok = out['is_pdf'] and out['enough_pages'] and out['history_logged'] and all(v for k, v in out.items() if k.startswith('send_')) and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
