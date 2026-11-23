"""Claim deadlines: due dates are worked out correctly for each Gulf state (calendar and business days), Mississippi says plainly
that none are listed, other states point to their insurance department, the calendar gets them, and the complaint letter uses them."""
import json, sys, datetime
from playwright.sync_api import sync_playwright
from helpers import URL, agree, start_own

# date of loss Fri Aug 27 2027, reported Mon Aug 30 2027, proof of loss Fri Sep 10 2027
EXPECT = {
  'TX': ['Sep 20, 2027', 'Oct 1, 2027', 'Aug 26, 2028', 'Oct 26, 2027'],   # 15 business days, 15 business days, TWIA 365 days (leap year), NFIP 60 days
  'FL': ['Sep 6, 2027', 'Sep 17, 2027', 'Oct 10, 2027', 'Oct 29, 2027', 'Aug 26, 2028', 'Feb 27, 2029'],
  'LA': ['Sep 13, 2027', 'Oct 10, 2027'],
  'AL': ['Sep 14, 2027', 'Oct 10, 2027'],
}
out = {'states': {}}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=datetime.datetime(2027, 11, 1, 10, 0))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(400); agree(pg)
    for i, st in enumerate(['TX', 'FL', 'LA', 'AL', 'MS', 'OR']):
        if i == 0: start_own(pg, 'Place TX', 'TX')
        else:
            pg.click('nav.tabs button[data-tab=home]'); pg.wait_for_timeout(200)
            pg.evaluate("()=>{const d=document.querySelector('details.add'); if(d) d.open=true}")
            pg.fill('#apName', f'Place {st}'); pg.fill('#apAddr', 'Town'); pg.select_option('#apState', st); pg.click('#addProp button[type=submit]'); pg.wait_for_timeout(300)
        pg.click('nav.tabs button[data-tab=claim]'); pg.wait_for_timeout(200)
        out[f'hidden_before_claim_{st}'] = not pg.is_visible('#deadlines')
        pg.fill('#clDate', '2027-08-27'); pg.press('#clDate', 'Tab'); pg.wait_for_timeout(200)
        pg.fill('#clReported', '2027-08-30'); pg.press('#clReported', 'Tab'); pg.wait_for_timeout(150)
        pg.fill('#clProof', '2027-09-10'); pg.press('#clProof', 'Tab'); pg.wait_for_timeout(250)
        v = pg.text_content('#deadlines')
        if st in EXPECT: out['states'][st] = [d for d in EXPECT[st] if d not in v] or True
        elif st == 'MS': out['states'][st] = 'hasn’t found day-by-day deadlines' in v and 'Oct 26, 2027' in v  # NFIP still shown
        else: out['states'][st] = 'doesn’t list Oregon’s claim deadlines yet' in v and 'Oregon Division of Financial Regulation' in v
        out[f'sources_{st}'] = len(pg.query_selector_all('#deadlines a[target=_blank]')) >= 1
    # calendar and complaint letter on the last property (Oregon)
    pg.click('nav.tabs button[data-tab=claim]'); pg.wait_for_timeout(200)
    with pg.expect_download() as dl:
        pg.click('[data-act=calDeadlines]')
    ics = open(dl.value.path()).read()
    out['calendar'] = ics.count('BEGIN:VEVENT') == 1 and 'Claim deadline' in ics and 'TRIGGER:-P1D' in ics  # Oregon: only the flood proof-of-loss date
    pg.fill('#logNote', 'Called adjuster, no answer'); pg.click('#addLog button[type=submit]'); pg.wait_for_timeout(200)
    pg.select_option('#ltKind', 'complaint'); pg.wait_for_timeout(300)
    letter = pg.input_value('#ltOut')
    out['complaint_letter'] = 'Dear Consumer Services' in letter and 'Called adjuster, no answer' in letter and 'I reported the claim on Aug 30, 2027' in letter
    out['complaint_mail_no_adjuster'] = pg.get_attribute('#ltMail', 'href').startswith('mailto:?subject=')
    out['complaint_where_to_send'] = 'Oregon Division of Financial Regulation' in pg.text_content('#view')
    out['errors'] = errs
    b.close()
ok = all(v is True for v in out['states'].values()) and all(v for k, v in out.items() if k not in ('states', 'errors')) and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
