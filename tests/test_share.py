"""Household sharing: one phone shares a locked copy, the other scans the QR code from a photo and adds it. Photos and the
policy come along, sharing again updates instead of duplicating, the receiver's own places are kept, and a wrong code or the
wrong kind of file gets a clear message."""
import json, sys, os, tempfile
from playwright.sync_api import sync_playwright
from helpers import URL, agree, start_own, fixtures

TMP = tempfile.mkdtemp(); out = {}
def phone(b):
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(400); agree(pg); return ctx, pg, errs
def settings(pg):
    pg.evaluate("()=>{const x=document.createElement('button'); x.dataset.go='settings'; document.getElementById('view').appendChild(x); x.click();}"); pg.wait_for_timeout(250)
def share(pg, name):
    settings(pg)
    with pg.expect_download() as dl: pg.click('[data-act=shareMake]')
    path = os.path.join(TMP, name); dl.value.save_as(path); pg.wait_for_timeout(500)
    code = pg.text_content('#shareCard p.num').strip()
    pg.locator('#shareCard .qr').screenshot(path=path + '.png'); return path, code
def receive(pg, path, qr=None, code=None):
    settings(pg); pg.evaluate("()=>{document.querySelector('[data-sharerecv]').open=true}")
    pg.set_input_files('#shFile', path)
    if qr: pg.set_input_files('#shScan', qr); pg.wait_for_timeout(1500)
    if code is not None: pg.fill('#shCode', code)
    pg.set_input_files('#shFile', path)  # scanning re-renders nothing, but choose the file again to be safe
    pg.click('[data-act=shareOpen]'); pg.wait_for_timeout(1500)
    return pg.text_content('body')
with sync_playwright() as p:
    b = p.chromium.launch(); fx = fixtures()
    ca, A, ea = phone(b); cb, B, eb = phone(b)
    # phone A: a real place with a policy, a photo and an item
    start_own(A, 'Beach house', 'MS')
    A.click('nav.tabs button[data-tab=policy]'); A.click('text=Enter it by hand')
    for k, v in {'#pf-carrier': 'Orchid', '#pf-number': 'POL-7', '#pf-renewal': '2027-07-30', '#pf-lim-A': '400000', '#pf-lim-C': '100000', '#pf-lim-D': '40000', '#pf-allPerils': '2500', '#pf-windAmt': '2'}.items(): A.fill(k, v)
    A.select_option('#pf-flood', 'no'); A.click('#policyForm button[type=submit]'); A.wait_for_timeout(300)
    out['sender_has_policy'] = A.evaluate("()=>JSON.parse(localStorage.getItem('stormfile_v4')).policies.length") == 1
    A.click('nav.tabs button[data-tab=inventory]'); A.click('.room-head >> nth=0')
    A.set_input_files('input[data-roomphoto][data-source=library] >> nth=0', [fx['big']]); A.wait_for_timeout(2500)
    A.fill('input[name=n] >> nth=0', 'Oak dining table'); A.fill('input[name=v] >> nth=0', '1800'); A.click('form[data-additem] button[type=submit] >> nth=0'); A.wait_for_timeout(300)
    path, code = share(A, 'copy1.json')
    out['code_format'] = len(code) == 19 and code.count('-') == 3
    out['qr_shown'] = A.is_visible('#shareCard .qr svg')
    txt = open(path).read(); out['file_is_locked'] = 'Oak dining table' not in txt and 'POL-7' not in txt
    # phone B already has its own place
    start_own(B, 'My apartment', 'LA')
    body = receive(B, path, qr=path + '.png')
    out['qr_scanned_from_photo'] = 'Added 1 place' in body
    st = B.evaluate("()=>JSON.parse(localStorage.getItem('stormfile_v4'))")
    names = [x['name'] for x in st['properties']]
    out['kept_own_place'] = 'My apartment' in names and 'Beach house' in names and len(names) == 2
    beach = [x for x in st['properties'] if x['name'] == 'Beach house'][0]
    pol = [x for x in st['policies'] if x['id'] == beach['policyId']]
    out['policy_came_along'] = bool(pol) and pol[0]['number'] == 'POL-7'
    out['item_came_along'] = any(it['n'] == 'Oak dining table' for r in beach['rooms'] for it in r['items'])
    pid = [ph for r in beach['rooms'] for ph in (r.get('photoData') or []) if isinstance(ph, dict)][0]['id']
    out['full_photo_came_along'] = B.evaluate("""id=>new Promise(r=>{const q=indexedDB.open('stormfile');q.onsuccess=()=>{const g=q.result.transaction('files').objectStore('files').get(id);g.onsuccess=()=>r(!!(g.result&&g.result.blob&&g.result.blob.size>100000));g.onerror=()=>r(false)}})""", pid)
    out['history_notes_copy'] = any('Shared copy received' in h['what'] for h in beach['history'])
    # A adds an item and shares again: B updates the same place
    A.click('[data-act=shareDone]'); A.click('nav.tabs button[data-tab=inventory]'); A.wait_for_timeout(200)
    if not A.is_visible('form[data-additem]'): A.click('.room-head >> nth=0')
    A.fill('input[name=n] >> nth=0', 'Ceiling fan'); A.fill('input[name=v] >> nth=0', '250'); A.click('form[data-additem] button[type=submit] >> nth=0'); A.wait_for_timeout(300)
    path2, code2 = share(A, 'copy2.json')
    out['new_code_each_time'] = code2 != code
    body = receive(B, path2, code=code2.lower().replace('-', ' '))
    st = B.evaluate("()=>JSON.parse(localStorage.getItem('stormfile_v4'))")
    beach = [x for x in st['properties'] if x['name'] == 'Beach house']
    out['second_share_updates'] = 'Updated 1 place' in body and len(beach) == 1 and len(st['properties']) == 2 and any(it['n'] == 'Ceiling fan' for r in beach[0]['rooms'] for it in r['items'])
    out['policy_not_duplicated'] = sum(1 for x in st['policies'] if x['number'] == 'POL-7') == 1
    # wrong code, and a backup file instead of a shared copy
    body = receive(B, path2, code='AAAA-BBBB-CCCC-DDDD')
    out['wrong_code_message'] = 'That code doesn’t open this file' in body
    settings(A); A.fill('#bk1', 'backup pass 1'); A.fill('#bk2', 'backup pass 1')
    with A.expect_download() as dl: A.click('[data-act=bkMake]')
    bpath = os.path.join(TMP, 'backup.json'); dl.value.save_as(bpath)
    body = receive(B, bpath, code=code2)
    out['backup_file_message'] = 'isn’t a StormFile shared copy' in body or 'doesn’t open this file' in body
    out['sample_cannot_share'] = True
    cc, C, ec = phone(b); settings(C); out['sample_cannot_share'] = not C.is_visible('[data-act=shareMake]') and 'Sample data can’t be shared' in C.text_content('#shareCard')
    out['errors'] = ea + eb + ec
    b.close()
ok = all(v for k, v in out.items() if k != 'errors') and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
