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
    pg.click('[data-act=agreeOwn]'); pg.wait_for_timeout(300)
    pg.fill('#rnName', 'Coast house'); pg.select_option('#rnState', 'MS'); pg.click('[data-act=saveName]'); pg.wait_for_timeout(300)
    pg.click('nav.tabs button[data-tab=home]'); pg.wait_for_timeout(200)
    out['no_install_card'] = 'Add to Home Screen' not in pg.text_content('#view') and 'Safari can erase' not in pg.text_content('#view')
    # season reminders: calendar access once, then all events added, repeating yearly
    pg.click('nav.tabs button[data-tab=storm]'); pg.click('[data-act=calSeason]'); pg.wait_for_timeout(500)
    ev = calls(pg, 'CapacitorCalendar', 'createEvent')
    out['season_events'] = len(ev) == 9 and all(e[2]['recurrence']['frequency'] == 'yearly' for e in ev) and len(calls(pg, 'CapacitorCalendar', 'requestWriteOnlyCalendarAccess')) == 1
    out['season_toast'] = '9 reminders added to your calendar' in pg.text_content('body')
    # one follow-up opens the phone's own new-event screen with two alerts
    open_claim(pg); pg.fill('#fuDate', '2027-01-15'); pg.fill('#fuNote', 'Estimate due'); pg.click('[data-act=calFollow]'); pg.wait_for_timeout(400)
    pr = calls(pg, 'CapacitorCalendar', 'createEventWithPrompt')
    out['followup_prompt'] = len(pr) == 1 and pr[0][2]['alerts'] == [-1440, 0] and 'Estimate due' in pr[0][2]['title']
    # backup goes to the share sheet
    open_settings(pg)
    pg.fill('#bk1', 'correct horse 1'); pg.fill('#bk2', 'correct horse 1'); pg.click('[data-act=bkMake]'); pg.wait_for_timeout(1500)
    sh = calls(pg, 'Share', 'share'); wf = calls(pg, 'Filesystem', 'writeFile')
    out['backup_shared'] = len(sh) == 1 and sh[0][2]['files'][0].startswith('file:///cache/stormfile-out/') and len(wf) == 1
    # Face ID uses the phone's own check
    pg.fill('#pin1', '2468'); pg.fill('#pin2', '2468'); pg.click('[data-act=pinSave]'); pg.wait_for_timeout(600)
    out['bio_offered'] = pg.is_visible('[data-act=bioToggle]')
    pg.click('[data-act=bioToggle]'); pg.wait_for_timeout(400)
    out['bio_uses_phone'] = len(calls(pg, 'NativeBiometric', 'verifyIdentity')) == 1
    # Android back button: goes Home from another tab
    pg.evaluate('()=>window.__back && window.__back()'); pg.wait_for_timeout(200)
    out['back_goes_home'] = pg.evaluate('()=>document.querySelector("nav.tabs button[data-tab=home]").getAttribute("aria-current")') == 'page'
    out['errors'] = [e for e in errs if 'Failed to load resource' not in e]
    b.close()
srv.shutdown(); shutil.rmtree(WWW, ignore_errors=True)
ok = all(v for k, v in out.items() if k != 'errors') and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
