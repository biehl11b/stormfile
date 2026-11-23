"""Ease of use: the Claim tab, Settings and policy entry stay short; the claim walks you to the next step; sections remember
being open; the 5-number policy entry works on its own; and every "What's this?" explains the word and closes cleanly."""
import json, sys
from playwright.sync_api import sync_playwright
from helpers import new_page, start_own, open_settings

out = {}
H = 844
screens = lambda pg: round(pg.evaluate("()=>document.documentElement.scrollHeight") / H, 2)
with sync_playwright() as p:
    b, ctx, pg, errs = new_page(p)
    start_own(pg, 'My house', 'TX')
    # Claim tab before a claim: one screen, one clear button
    pg.click('nav.tabs button[data-tab=claim]'); pg.wait_for_timeout(200)
    out['claim_before_screens'] = screens(pg)
    out['claim_before_short'] = out['claim_before_screens'] <= 1.25 and pg.is_visible('[data-act=startClaim]') and not pg.is_visible('#clNum')
    pg.click('[data-act=startClaim]'); pg.wait_for_timeout(250)
    out['claim_after_screens'] = screens(pg)
    out['claim_after_short'] = out['claim_after_screens'] <= 2.6
    # next step walks forward
    step = lambda: pg.text_content('.nextstep')
    out['step1_report'] = 'Report the damage' in step()
    pg.fill('#clNum', 'C-9'); pg.press('#clNum', 'Tab'); pg.wait_for_timeout(200)
    out['step2_date'] = 'date of loss' in step()
    pg.fill('#clDate', '2027-04-02'); pg.press('#clDate', 'Tab'); pg.wait_for_timeout(200)
    out['step3_lock'] = 'Lock your before-storm record' in step() and pg.is_visible('.nextstep [data-act=lockRecord]')
    pg.click('.nextstep [data-act=lockRecord]'); pg.wait_for_timeout(300)
    out['step4_adjuster'] = 'adjuster is assigned' in step()
    pg.fill('#clAdj', 'Pat Lee'); pg.press('#clAdj', 'Tab'); pg.wait_for_timeout(200)
    out['step5_keep_going'] = 'Write down every call' in step()
    # a section stays open after the screen updates
    pg.click('#sec-log > summary'); pg.wait_for_timeout(150)
    pg.fill('#logNote', 'Called, left voicemail'); pg.click('#addLog button[type=submit]'); pg.wait_for_timeout(300)
    out['section_stays_open'] = pg.evaluate("()=>document.getElementById('sec-log').open") and 'Called, left voicemail' in pg.text_content('#sec-log')
    out['section_status_shown'] = '1 entry' in pg.text_content('#sec-log summary')
    pg.reload(wait_until='networkidle'); pg.wait_for_timeout(400); pg.click('nav.tabs button[data-tab=claim]'); pg.wait_for_timeout(200)
    out['section_remembered_after_reopen'] = pg.evaluate("()=>document.getElementById('sec-log').open")
    # quick policy entry: 5 numbers only
    pg.click('nav.tabs button[data-tab=policy]'); pg.click('text=Enter it by hand'); pg.wait_for_timeout(200)
    visible = pg.evaluate("()=>[...document.querySelectorAll('#policyForm input, #policyForm select')].filter(e=>e.checkVisibility()).length")
    out['quick_fields_visible'] = visible
    out['quick_is_short'] = visible <= 7 and not pg.is_visible('#pf-allPerils')
    pg.select_option('#pf-windType', 'excluded'); pg.wait_for_timeout(100)
    out['wind_amount_hides'] = not pg.is_visible('#pf-windAmt')
    pg.select_option('#pf-windType', 'pct'); pg.wait_for_timeout(100)
    out['wind_amount_shows'] = pg.is_visible('#pf-windAmt')
    for k, v in {'#pf-carrier': 'Gulf Mutual', '#pf-number': 'P-55', '#pf-lim-A': '300000', '#pf-windAmt': '2', '#pf-renewal': '2027-06-01'}.items(): pg.fill(k, v)
    pg.click('#policyForm button[type=submit]'); pg.wait_for_timeout(400)
    v = pg.text_content('#view')
    out['quick_policy_works'] = '$6,000' in v and 'Gulf Mutual' in v
    # What's this?
    pg.click('button.whats[data-term=hurDed] >> nth=0'); pg.wait_for_timeout(200)
    sheet = pg.text_content('.termsheet') if pg.is_visible('.termsheet') else ''
    out['whats_explains'] = '2% of $300,000' in sheet and pg.evaluate("()=>document.activeElement && document.activeElement.dataset.closeterm==='1'")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    out['whats_closes_with_escape'] = not pg.is_visible('.termsheet') and pg.evaluate("()=>document.activeElement && document.activeElement.dataset.term==='hurDed'")
    pg.click('button.whats[data-term=hurDed] >> nth=0'); pg.click('[data-closeterm]'); pg.wait_for_timeout(150)
    out['whats_closes_with_button'] = not pg.is_visible('.termsheet')
    pg.evaluate("()=>{const x=document.createElement('button'); x.dataset.go='resources'; document.getElementById('view').appendChild(x); x.click();}"); pg.wait_for_timeout(200)
    pg.click('#sec-words > summary'); pg.wait_for_timeout(150)
    out['words_to_know'] = all(x in pg.text_content('#sec-words') for x in ['Declarations page', 'Proof of loss', 'Public adjuster', 'Additional living expense'])
    # Settings: short when closed; backup opens itself when one is due
    pg.evaluate("()=>{const x=document.createElement('button'); x.dataset.go='settings'; document.getElementById('view').appendChild(x); x.click();}"); pg.wait_for_timeout(250)
    out['backup_due_opens_itself'] = pg.evaluate("()=>document.getElementById('sec-set-backup').open") and 'Step 1.' in pg.text_content('#sec-set-backup')
    pg.evaluate("()=>document.querySelectorAll('#view details').forEach(d=>d.open=false)"); pg.wait_for_timeout(150)
    out['settings_screens'] = screens(pg)
    out['settings_short'] = out['settings_screens'] <= 1.5
    # every section has a readable name for screen readers
    out['sections_named'] = pg.evaluate("()=>[...document.querySelectorAll('details.sec > summary')].every(s=>s.textContent.trim().length>2)")
    out['errors'] = errs
    b.close()
nums = ('claim_before_screens', 'claim_after_screens', 'settings_screens', 'quick_fields_visible', 'errors')
ok = all(v for k, v in out.items() if k not in nums) and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
