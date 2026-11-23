"""Phone app build: builds www/ the way the store build does, runs it with a stand-in for the phone, and checks the app uses the phone's share sheet, calendar and Face ID."""
import json, os, subprocess, sys, shutil, threading, http.server, functools
from playwright.sync_api import sync_playwright
from helpers import open_claim, open_settings

HERE = os.path.dirname(os.path.abspath(__file__)); NATIVE = os.path.join(HERE, '..', 'native')
stub = os.path.join(NATIVE, 'node_modules/@capacitor/core/dist'); made_stub = not os.path.exists(stub)
os.makedirs(stub, exist_ok=True)
if made_stub: open(os.path.join(stub, 'capacitor.js'), 'w').write('/* stub for tests */')
subprocess.run(['node', 'scripts/prepare-www.mjs'], cwd=NATIVE, check=True, stdout=subprocess.DEVNULL)
if made_stub: shutil.rmtree(os.path.join(NATIVE, 'node_modules'))
WWW = os.path.join(NATIVE, 'www')
shutil.copy(os.path.join(HERE, 'native-mock.js'), os.path.join(WWW, 'vendor/capacitor.js'))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=WWW))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/'
out = {}
calls = lambda pg, plugin=None, fn=None: [c for c in pg.evaluate('()=>window.__calls') if (plugin is None or c[0] == plugin) and (fn is None or c[1] == fn)]
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(600)
    out['bridge_loaded'] = pg.evaluate('()=>!!window.SF_NATIVE && document.documentElement.classList.contains("native")')
    out['follows_phone_text_size'] = any(c[2] == {'value': 1.6} for c in calls(pg, 'TextZoom', 'set'))
    out['no_service_worker'] = pg.evaluate('async()=>!(navigator.serviceWorker && (await navigator.serviceWorker.getRegistrations()).length)')
    out['store_no_test_notes'] = 'Test version' not in pg.text_content('#view')
    # iPhone version talks only about iPhone things (App Store 2.3.10)
    t = pg.text_content('#view')
    out['ios_words'] = 'Face ID or Touch ID' in t and 'fingerprint' not in t and 'Android' not in t
    # older-phone safety nets are in the phone build
    www_html = open(os.path.join(WWW, 'index.html')).read()
    out['older_phone_css'] = 'top:0;right:0;bottom:0;left:0;inset:0' in www_html and 'compat.js' in www_html and os.path.exists(os.path.join(WWW, 'webview-update.html'))
    pg.click('[data-act=agreeOwn]'); pg.wait_for_timeout(300)
    pg.fill('#rnName', 'Coast house'); pg.select_option('#rnState', 'MS'); pg.click('[data-act=saveName]'); pg.wait_for_timeout(300)
    pg.click('nav.tabs button[data-tab=home]'); pg.wait_for_timeout(200)
    out['no_install_card'] = 'Add to Home Screen' not in pg.text_content('#view') and 'Safari can erase' not in pg.text_content('#view')
    # the store version's feedback doesn't ask about price (they already bought it) or the test-only storm alert demo
    open_settings(pg); pg.click('[data-go=feedback]'); pg.wait_for_timeout(300)
    fb = pg.text_content('#view')
    out['feedback_store'] = 'Your feedback' in fb and 'Would you pay' not in fb and 'Storm alerts' not in fb and 'person who shared' not in fb
    # season reminders: calendar access once, then all events added, repeating yearly
    pg.click('nav.tabs button[data-tab=storm]'); pg.click('[data-act=calSeason]'); pg.wait_for_timeout(500)
    ev = calls(pg, 'CapacitorCalendar', 'createEvent')
    out['season_events'] = len(ev) == 9 and all(e[2]['recurrence']['frequency'] == 'yearly' for e in ev) and len(calls(pg, 'CapacitorCalendar', 'requestWriteOnlyCalendarAccess')) == 1 and not calls(pg, 'CapacitorCalendar', 'requestFullCalendarAccess')
    out['season_toast'] = '9 reminders added to your calendar' in pg.text_content('body')
    # one follow-up opens the phone's own new-event screen with two alerts
    open_claim(pg); pg.fill('#fuDate', '2027-01-15'); pg.fill('#fuNote', 'Estimate due'); pg.click('[data-act=calFollow]'); pg.wait_for_timeout(400)
    pr = calls(pg, 'CapacitorCalendar', 'createEventWithPrompt')
    out['followup_prompt'] = len(pr) == 1 and pr[0][2]['alerts'] == [-1440, 0] and 'Estimate due' in pr[0][2]['title']
    # "Send it to my adjuster": the share sheet gets the PDF plus a subject and note, so email apps open ready to send
    open_claim(pg); pg.fill('#clAdj', 'Dana Reyes'); pg.press('#clAdj', 'Tab'); pg.fill('#clAdjEmail', 'dana@example-insurer.com'); pg.press('#clAdjEmail', 'Tab'); pg.wait_for_timeout(200)
    open_claim(pg); n0 = len(calls(pg, 'Share', 'share'))
    pg.click('[data-act=packetSend]'); pg.wait_for_function(f'()=>window.__calls.filter(c=>c[0]==="Share"&&c[1]==="share").length>{n0}', timeout=60000)
    sh = calls(pg, 'Share', 'share')[-1][2]
    out['packet_send_share'] = sh['files'][0].endswith('.pdf') and sh['title'].endswith('claim packet') and 'Hello Dana Reyes,' in sh['text'] \
        and 'Attached is my claim packet (PDF)' in sh['text'] and 'Property: MS' not in sh['text'] and sh.get('dialogTitle') == 'Send the claim packet'
    # backup goes to the share sheet
    open_settings(pg)
    s0, w0 = len(calls(pg, 'Share', 'share')), len(calls(pg, 'Filesystem', 'writeFile'))
    pg.fill('#bk1', 'correct horse 1'); pg.fill('#bk2', 'correct horse 1'); pg.click('[data-act=bkMake]'); pg.wait_for_timeout(1500)
    sh = calls(pg, 'Share', 'share')[s0:]; wf = calls(pg, 'Filesystem', 'writeFile')[w0:]
    out['backup_shared'] = len(sh) == 1 and sh[0][2]['files'][0].startswith('file:///cache/stormfile-out/') and len(wf) == 1
    # Face ID uses the phone's own check
    pg.fill('#pin1', '2468'); pg.fill('#pin2', '2468'); pg.click('[data-act=pinSave]'); pg.wait_for_timeout(600)
    out['bio_offered'] = pg.is_visible('[data-act=bioToggle]')
    pg.click('[data-act=bioToggle]'); pg.wait_for_timeout(400)
    out['bio_uses_phone'] = len(calls(pg, 'NativeBiometric', 'verifyIdentity')) == 1
    # Android back button: goes Home from another tab
    pg.evaluate('()=>window.__back && window.__back()'); pg.wait_for_timeout(200)
    out['back_goes_home'] = pg.evaluate('()=>document.querySelector("nav.tabs button[data-tab=home]").getAttribute("aria-current")') == 'page'
    # government-information notice on Help and resources
    pg.evaluate('()=>document.querySelector(\'[data-go="resources"]\') && document.querySelector(\'[data-go="resources"]\').click()'); pg.wait_for_timeout(300)
    if 'Help in' not in pg.text_content('#view'): open_claim(pg); pg.click('[data-go=resources]'); pg.wait_for_timeout(300)
    out['gov_notice'] = 'isn\u2019t a government app' in pg.text_content('#view')
    # Privacy Policy link opens the web page in the phone's browser (not inside the app)
    opened = []
    ctx.route('https://biehl11b.github.io/**', lambda r: (opened.append(r.request.url), r.fulfill(body='ok')))
    open_settings(pg); pg.evaluate('()=>document.querySelectorAll("details.sec").forEach(d=>d.open=true)')
    pg.click('a[href="privacy.html"]'); pg.wait_for_timeout(600)
    out['privacy_link_web'] = opened[:1] == ['https://biehl11b.github.io/stormfile/privacy.html']
    out['errors'] = [e for e in errs if 'Failed to load resource' not in e]
    # Age check (Texas law now, more states in 2027): only where required; minors and unconfirmed ages see a notice, offline never locks records away
    def age(scn, pre=None):
        c2 = b.new_context(viewport={'width': 390, 'height': 844}); c2.add_init_script('window.__age = ' + json.dumps(scn) + ';' + (pre or ''))
        q = c2.new_page(); q.goto(URL, wait_until='networkidle'); q.wait_for_timeout(700); return c2, q
    gate = lambda q: q.evaluate('()=>document.querySelector("nav.tabs").hidden') and q.is_visible('[data-act=ageCheck]')
    c2, q = age({'required': False}); out['age_not_required_no_prompt'] = not gate(q) and not calls(q, 'AgeSignals', 'requestAgeRange') and q.is_visible('[data-act=agreeOwn]'); c2.close()
    c2, q = age({'required': True, 'status': 'SHARED', 'lower': 18}); r = calls(q, 'AgeSignals', 'requestAgeRange')
    out['age_adult_ok'] = not gate(q) and r and r[0][2] == {'ageGates': [18]} and q.evaluate('()=>localStorage.getItem("stormfile_age_ok")') == '1'; c2.close()
    c2, q = age({'required': True, 'status': 'SHARED', 'lower': 13, 'upper': 15}); out['age_minor_blocked'] = gate(q) and 'StormFile is for adults' in q.text_content('#view'); c2.close()
    c2, q = age({'required': True, 'status': 'NOT_SHARED'})
    ok1 = gate(q) and "Confirm you're 18 or older" in q.text_content('#view')
    q.evaluate('()=>{ window.__age = {required:true, status:"SHARED", lower:18}; }'); q.click('[data-act=ageCheck]'); q.wait_for_timeout(500)
    out['age_declined_then_shared'] = ok1 and not gate(q) and q.is_visible('[data-act=agreeOwn]'); c2.close()
    c2, q = age({'required': True, 'status': 'VERIFICATION_REQUIRED'}); out['age_play_verify'] = gate(q) and 'Open the Play Store' in q.text_content('#view'); c2.close()
    c2, q = age({'required': True, 'fail': 'req'}); out['age_offline_ok'] = not gate(q); c2.close()
    c2, q = age({'required': True, 'fail': 'request'}, 'localStorage.setItem("stormfile_age_ok","1");'); out['age_error_after_verified_ok'] = not gate(q); c2.close()
    # Android version talks only about Android things
    c3 = b.new_context(viewport={'width': 390, 'height': 844}); c3.add_init_script('window.__plat = "android";')
    q = c3.new_page(); q.goto(URL, wait_until='networkidle'); q.wait_for_timeout(600); t = q.text_content('#view')
    ok_start = 'fingerprint or face unlock' in t and 'Face ID' not in t
    q.click('[data-act=agreeOwn]'); q.wait_for_timeout(300); q.fill('#rnName', 'Coast house'); q.select_option('#rnState', 'MS'); q.click('[data-act=saveName]'); q.wait_for_timeout(300)
    open_settings(q); q.evaluate('()=>document.querySelectorAll("details.sec").forEach(d=>d.open=true)'); t = q.text_content('#view')
    out['android_words'] = ok_start and 'Google Drive' in t and 'iCloud' not in t and 'Face ID' not in t and 'Touch ID' not in t and 'iPhone' not in t
    # Android: the phone can't give "add only" calendar access (the calendar list must be read to find the main calendar),
    # so StormFile asks for calendar access once and all 9 season reminders are added (not a calendar file Android can't import)
    q.click('nav.tabs button[data-tab=storm]'); q.click('[data-act=calSeason]'); q.wait_for_timeout(500)
    out['android_calendar'] = len(calls(q, 'CapacitorCalendar', 'createEvent')) == 9 and len(calls(q, 'CapacitorCalendar', 'requestFullCalendarAccess')) == 1 \
        and not calls(q, 'CapacitorCalendar', 'requestWriteOnlyCalendarAccess') and '9 reminders added to your calendar' in q.text_content('body')
    # Android, calendar access not allowed: the calendar's own new-event screen opens once per reminder (no calendar file)
    q.evaluate("()=>{ window.Capacitor.Plugins.CapacitorCalendar.requestFullCalendarAccess = async()=>({result:'denied'}); window.__t=[]; new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>{ if(n.classList&&n.classList.contains('toast')) window.__t.push(n.textContent); }))).observe(document.body,{childList:true}); }")
    q.click('[data-act=calSeason]'); q.wait_for_timeout(3500)
    pr = calls(q, 'CapacitorCalendar', 'createEventWithPrompt')
    out['android_calendar_denied'] = len(pr) == 9 and all(e[2]['recurrence']['frequency'] == 'yearly' for e in pr) and not calls(q, 'Share', 'share') \
        and any('open 9 times' in x for x in q.evaluate('()=>window.__t'))
    c3.close()
    b.close()
srv.shutdown(); shutil.rmtree(WWW, ignore_errors=True)
ok = all(v for k, v in out.items() if k != 'errors') and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
