"""Spanish: a Spanish phone opens in Spanish, every screen is translated (only names, policy citations and quotes stay English),
nothing spills sideways on a small phone, letters stay English, messages are read aloud in Spanish, and switching back to
English brings back the exact English text."""
import json, sys, re, datetime
from playwright.sync_api import sync_playwright
from helpers import URL, agree, start_own, open_claim, open_settings

SCREENS = ['home', 'policy', 'inventory', 'storm', 'claim', 'feedback', 'settings', 'resources', 'policyForm']
FIT = """()=>{const W=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();
  if(r.width>0&&r.right>W+1&&!e.closest('.tblwrap')&&getComputedStyle(e).position!=='fixed')bad.push(e.tagName+'.'+(e.className||'')+' '+Math.round(r.right)+' '+(e.textContent||'').trim().slice(0,30))});return {sw:document.documentElement.scrollWidth,W,bad:bad.slice(0,3)}}"""
_STATES = re.findall(r"\['[A-Z]{2}','([A-Za-z .]+)'\]", open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'app.js')).read())
OK_ENGLISH = re.compile("|".join([r"SAMPLE", r"Section ", r"Exclusions", r"Endorsement", r"p\. \d+$", r"^\u201c", r"Gulf Harbor Mutual", r"Coastal Grill",
  r"Baton Rouge", r"Gulfport", r"Long Beach", r"Biloxi", r"Pass Christian", r"Gulf Coast, MS", r"^StormFile", r"^TWIA$", r"^FEMA$", r"Ready\.gov",
  r"Department", r"Division", r"Office", r"Commissioner", r"Administration", r"Agency", r"Management", r"Association", r"Program", r"Homes$", r"Insurance$",
  r"Citizens Property", r"Samsung", r"Ford F-", r"travel trailer", r"Honda", r"^XXXX", r"^S$", r"Loss Settlement", r"Business Income", r"Extra Expense",
  r"Conditions, Vacancy", r"Bureau", r"Emergency", r"Homeland", r"Disaster", r"Services", r"Commerce", r"Regulation", r"Banking", r"Superintendent",
  r"Securities", r"Test place", r"Our house", r"Rental house", r"Coast house"] + ["^" + re.escape(x) + "$" for x in _STATES]))
def go(pg, t):
    pg.evaluate("t=>{ const b=document.querySelector('nav.tabs button[data-tab='+t+']'); if(b) b.click(); else { const x=document.createElement('button'); x.dataset.go=t; document.getElementById('view').appendChild(x); x.click(); } }", t); pg.wait_for_timeout(200)
out = {'overflow': [], 'english_left': []}
with sync_playwright() as p:
    b = p.chromium.launch()
    # 1. a Spanish phone starts in Spanish; layout and coverage on a small phone, sample data and own data
    for mode in ['sample', 'own']:
        ctx = b.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, has_touch=True, locale='es-US', accept_downloads=True)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.clock.install(time=datetime.datetime(2027, 5, 20, 10, 0))
        pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(400)
        if mode == 'sample':
            out['starts_in_spanish'] = pg.evaluate("()=>document.documentElement.lang") == 'es' and 'Esté listo para su reclamo' in pg.text_content('#view')
        agree(pg)
        if mode == 'own':
            start_own(pg, 'Coast house', 'TX')
            open_claim(pg); pg.fill('#clDate', '2027-04-02'); pg.press('#clDate', 'Tab'); pg.fill('#clReported', '2027-04-03'); pg.press('#clReported', 'Tab'); pg.wait_for_timeout(200)
        for t in SCREENS:
            go(pg, t)
            if t == 'inventory': pg.evaluate("()=>document.querySelectorAll('.room-head').forEach(h=>h.click())"); pg.wait_for_timeout(150)
            pg.evaluate("()=>document.querySelectorAll('details').forEach(d=>d.open=true)"); pg.wait_for_timeout(100)
            r = pg.evaluate(FIT)
            if r['sw'] > r['W'] or r['bad']: out['overflow'].append({'mode': mode, 'screen': t, **r})
        left = [m for m in pg.evaluate("()=>[...window.SF_I18N_MISSING]") if re.search('[a-z]{3}', m) and not OK_ENGLISH.search(m) and not re.fullmatch(r'[\w.-]+\.(gov|org|com)', m)]
        out['english_left'] += left
        if mode == 'own':
            # letters stay English, with a Spanish note; a message is announced in Spanish
            open_claim(pg); pg.select_option('#ltKind', 'status'); pg.wait_for_timeout(200)
            out['letter_english'] = 'I’m writing to ask for an update' in pg.input_value('#ltOut') and 'Las cartas van a su compañía de seguros' in pg.text_content('#view')
            open_settings(pg); pg.fill('#bk1', 'abc'); pg.fill('#bk2', 'abc'); pg.click('[data-act=bkMake]'); pg.wait_for_timeout(300)
            live = pg.text_content('#srLive') or ''
            out['toast_spanish'] = any(x in live for x in ['Todavía no hay nada suyo para copiar', 'Use una contraseña de al menos 8 caracteres']) and live in pg.text_content('.toast')
            # back to English: exactly the English text again
            pg.click('[data-lang=en]'); pg.wait_for_timeout(300)
            en_after = pg.text_content('#view'); head = pg.text_content('header')
            out['english_restored'] = 'Language' in en_after and 'Share with your household' in en_after and 'Idioma' not in en_after and 'Ajustes' not in head and pg.evaluate("()=>document.documentElement.lang") == 'en'
            go(pg, 'storm'); txt = pg.text_content('body')
            out['english_everywhere_after'] = 'Seasons in Texas' in txt and 'Temporada' not in txt and 'Inicio' not in pg.text_content('nav.tabs')
            pg.click('#fbBtn'); pg.wait_for_timeout(200); pg.click('[data-lang=es]'); pg.wait_for_timeout(300)
            out['switch_back_to_spanish'] = 'Idioma' in pg.text_content('#view') and 'Inicio' in pg.text_content('nav.tabs')
        out[f'errors_{mode}'] = errs
        ctx.close()
    # 2. an English phone starts in English and can switch from the start screen
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='en-US'); pg = ctx.new_page()
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(300)
    out['english_phone_english'] = 'Be claim-ready before the storm' in pg.text_content('#view')
    pg.click('#view [data-lang=es]'); pg.wait_for_timeout(300)
    out['start_screen_switch'] = 'Esté listo para su reclamo' in pg.text_content('#view')
    pg.reload(wait_until='networkidle'); pg.wait_for_timeout(300)
    out['choice_remembered'] = 'Esté listo para su reclamo' in pg.text_content('#view')
    b.close()
out['english_left'] = sorted(set(out['english_left']))[:200]
ok = not out['overflow'] and not out['english_left'] and all(v for k, v in out.items() if k not in ('overflow', 'english_left') and not k.startswith('errors')) and not out['errors_sample'] and not out['errors_own']
print(json.dumps(out, indent=1, ensure_ascii=False)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
