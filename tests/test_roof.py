"""Roof proof: the yearly roof check-up (8 views, kept by year, yearly calendar reminder, fingerprint email), photo
fingerprints (SHA-256 of the saved full-size photo, shown in the viewer, the exact photo can be saved, older photos get one
later), the roof coverage questions and their warnings, the record fingerprint at lock, and the roof page and fingerprint
list in the claim packet."""
import json, sys, base64, re, datetime
from urllib.parse import unquote
from playwright.sync_api import sync_playwright
from helpers import URL, start_own, open_claim, fixtures

HEX = re.compile(r'^[0-9a-f]{64}$')
STORED_FP = """async id => { const d = await new Promise((ok,no)=>{ const r = indexedDB.open('stormfile',1); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); });
  const rec = await new Promise(ok=>{ const q = d.transaction('files').objectStore('files').get(id); q.onsuccess=()=>ok(q.result); });
  const h = await crypto.subtle.digest('SHA-256', await rec.blob.arrayBuffer()); return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join(''); }"""
PDF_TEXT = """async b64 => {
  for(const s of ['vendor/pdf.min.js','vendor/pdf.worker.min.js']) await new Promise((ok,no)=>{ const e=document.createElement('script'); e.src=s; e.onload=ok; e.onerror=no; document.head.appendChild(e); });
  const data = Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); const doc = await pdfjsLib.getDocument({data, isEvalSupported:false}).promise;
  let t = ''; for(let i=1;i<=doc.numPages;i++){ const pg = await doc.getPage(i); const c = await pg.getTextContent(); t += c.items.map(x=>x.str).join(' ') + '\\n'; } return t; }"""
out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=datetime.datetime(2026, 11, 25, 10, 0))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(500)
    pg.click('[data-act=agreeOwn]'); pg.wait_for_timeout(300)
    pg.fill('#rnName', 'Roof house'); pg.select_option('#rnState', 'MS'); pg.click('[data-act=saveName]'); pg.wait_for_timeout(300)
    st = lambda: pg.evaluate("()=>JSON.parse(localStorage.getItem('stormfile_v4'))")
    pg.click('nav.tabs button[data-tab=inventory]'); pg.wait_for_timeout(300)
    v = pg.text_content('#view')
    out['roof_card'] = pg.is_visible('#sec-roof') and 'Roof check-up 2026' in v and 'Not started' in v and 'Stay off the roof' in v and v.count('To do') >= 8

    # 1. a roof photo: saved with a fingerprint of the full-size photo
    fx = fixtures()
    pg.set_input_files('input[data-roofphoto=front][data-source=library]', [fx['big']]); pg.wait_for_timeout(2500)
    s = st(); ph = s['properties'][0]['roofBase']['2026']['shots']['front'][0]
    out['roof_photo_saved'] = bool(ph.get('id')) and ph.get('taken', '').startswith('2025-06-14')
    out['fingerprint_is_sha256'] = bool(HEX.match(ph.get('fp', ''))) and pg.evaluate(STORED_FP, ph['id']) == ph['fp']
    out['count_shows'] = '1 of 8 photos for 2026' in pg.text_content('#sec-roof summary')
    pg.set_input_files('input[data-roofphoto=close][data-source=library]', [fx['small']]); pg.wait_for_timeout(1500)
    out['history_logged'] = any('roof check-up 2026: front of the roof' in h['what'] for h in st()['properties'][0]['history'])

    # 2. viewer: fingerprint shown, and the exact saved photo can be saved
    pg.click('#sec-roof .phbtn >> nth=0'); pg.wait_for_timeout(400)
    vt = pg.text_content('.overlay.viewer')
    out['viewer_shows_fp'] = ph['fp'] in vt and 'Photo fingerprint (SHA-256)' in vt
    with pg.expect_download() as dl: pg.click('[data-saveorig]')
    import hashlib
    out['saved_original_matches'] = hashlib.sha256(open(dl.value.path(), 'rb').read()).hexdigest() == ph['fp'] and dl.value.suggested_filename == 'StormFile-photo-' + ph['fp'][:12] + '.jpg'
    pg.click('[data-closeviewer]'); pg.wait_for_timeout(200)

    # 3. email the fingerprints to yourself (a mailto link; no photos)
    href = unquote(pg.get_attribute('#sec-roof a[href^="mailto:"]', 'href') or '')
    out['fingerprint_email'] = 'subject=Roof photo fingerprints - Roof house - 2026' in href and ph['fp'] in href and 'Front of the roof' in href and 'Close-up of the shingles' in href

    # 4. yearly reminder before storm season (Mississippi: May 1)
    with pg.expect_download() as dl: pg.click('[data-act=calRoof]')
    ics = open(dl.value.path()).read()
    out['yearly_reminder'] = 'StormFile: roof check-up' in ics and 'RRULE:FREQ=YEARLY' in ics and '20270501' in ics

    # 5. a photo saved before fingerprints existed gets one the next time the app opens
    s = st(); del s['properties'][0]['roofBase']['2026']['shots']['close'][0]['fp']
    pg.evaluate("s=>localStorage.setItem('stormfile_v4', JSON.stringify(s))", s)
    pg.reload(wait_until='networkidle'); pg.clock.run_for(3000); pg.wait_for_timeout(1500)
    c0 = st()['properties'][0]['roofBase']['2026']['shots']['close'][0]
    out['backfilled'] = bool(HEX.match(c0.get('fp', ''))) and bool(c0.get('fpLate')) and pg.evaluate(STORED_FP, c0['id']) == c0['fp']

    # 6. roof coverage questions and warnings
    pg.evaluate("()=>{ const x=document.createElement('button'); x.dataset.go='policyForm'; document.getElementById('view').appendChild(x); x.click(); }"); pg.wait_for_timeout(300)
    pg.evaluate("()=>document.querySelectorAll('#policyForm details').forEach(d=>d.open=true)")
    for k, val in {'#pf-carrier': 'Orchid', '#pf-lim-A': '300000', '#pf-windAmt': '2', '#pf-roofYear': '2009'}.items(): pg.fill(k, val)
    pg.select_option('#pf-roofPay', 'schedule'); pg.select_option('#pf-roofCosmetic', 'yes')
    pg.click('#policyForm button[type=submit]'); pg.wait_for_timeout(400)
    pg.evaluate("()=>document.querySelectorAll('#view details').forEach(d=>d.open=true)")
    v = pg.text_content('#view')
    out['roof_schedule_warning'] = 'Roof paid on an age schedule' in v and 'about 17 years old' in v
    out['cosmetic_warning'] = 'Cosmetic roof damage' in v
    out['wear_and_tear_note'] = 'Wear and tear' in v and 'roof check-up on the Rooms tab' in v
    # full replacement but past the policy's roof age
    pg.evaluate("()=>{ const x=document.createElement('button'); x.dataset.go='policyForm'; document.getElementById('view').appendChild(x); x.click(); }"); pg.wait_for_timeout(300)
    pg.evaluate("()=>document.querySelectorAll('#policyForm details').forEach(d=>d.open=true)")
    out['answers_kept'] = pg.input_value('#pf-roofPay') == 'schedule' and pg.input_value('#pf-roofCosmetic') == 'yes'
    pg.select_option('#pf-roofPay', 'rc'); pg.fill('#pf-roofRCYears', '15'); pg.select_option('#pf-roofCosmetic', 'no')
    pg.click('#policyForm button[type=submit]'); pg.wait_for_timeout(400)
    pg.evaluate("()=>document.querySelectorAll('#view details').forEach(d=>d.open=true)")
    v = pg.text_content('#view')
    out['past_rc_age_warning'] = 'Roof past full replacement age' in v and 'under 15 years old' in v and 'Cosmetic roof damage' not in v

    # 7. lock: one fingerprint for the whole before-storm record
    open_claim(pg); pg.fill('#clDate', '2026-11-20'); pg.press('#clDate', 'Tab'); pg.wait_for_timeout(200)
    open_claim(pg); pg.click('#sec-lock [data-act=lockRecord]'); pg.wait_for_timeout(800)
    lf = st()['properties'][0]['claim'].get('lockFp', '')
    pg.click('nav.tabs button[data-tab=inventory]'); pg.wait_for_timeout(300)
    out['record_fingerprint'] = bool(HEX.match(lf)) and lf[:16] in pg.text_content('.lockbar')

    # 8. claim packet: roof page, fingerprints under photos and in the list at the end
    open_claim(pg)
    with pg.expect_download(timeout=90000) as dl: pg.click('[data-act=packet]')
    t = pg.evaluate(PDF_TEXT, base64.b64encode(open(dl.value.path(), 'rb').read()).decode())
    flat = re.sub(r'\s+', '', t)
    out['packet_roof_page'] = 'Roof condition record' in t and 'Roof check-up 2026' in t and 'Front of the roof' in t and 'A payment schedule by roof age' not in t and 'Full replacement cost' in t
    out['packet_fingerprints'] = 'Photo fingerprints' in t and ph['fp'] in flat and c0['fp'] in flat and 'code added' in t
    out['packet_record_fp'] = lf in flat and 'Record fingerprint at lock' in t
    # 9. Spanish: the roof check-up and roof questions read in Spanish
    ctx2 = b.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, locale='es-US'); q = ctx2.new_page()
    q.on('pageerror', lambda e: errs.append(str(e)))
    q.goto(URL, wait_until='networkidle'); q.wait_for_timeout(500)
    q.click('[data-act=agreeOwn]'); q.wait_for_timeout(300)
    q.fill('#rnName', 'Casa'); q.select_option('#rnState', 'MS'); q.click('[data-act=saveName]'); q.wait_for_timeout(300)
    q.click('nav.tabs button[data-tab=inventory]'); q.wait_for_timeout(400)
    t = q.text_content('#sec-roof')
    out['spanish_roof'] = 'Revisión del techo 2026' in t and 'Frente del techo' in t and 'No se suba al techo' in t and not re.search(r'Front of the roof|Stay off|Remind me', t)
    q.evaluate("()=>{ const x=document.createElement('button'); x.dataset.go='policyForm'; document.getElementById('view').appendChild(x); x.click(); }"); q.wait_for_timeout(300)
    q.evaluate("()=>document.querySelectorAll('#policyForm details').forEach(d=>d.open=true)")
    t = q.inner_text('#policyForm')
    out['spanish_roof_questions'] = 'Cobertura del techo' in t and '¿Cómo se paga el daño al techo?' in t and 'How is roof damage paid' not in t
    out['errors'] = errs
    b.close()
ok = all(v for k, v in out.items() if k != 'errors') and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
