"""Core flows: start screen, own property, policy by hand, photo stamps, record lock, history, letters, reminders, feedback."""
import json, sys
from playwright.sync_api import sync_playwright
from helpers import URL, fixtures

out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True,
                        permissions=['geolocation'], geolocation={'latitude': 30.3157, 'longitude': -89.2475})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(600)
    # start screen
    out['start_screen_first'] = pg.is_visible('[data-act=agreeOwn]') and not pg.is_visible('nav.tabs')
    out['start_says_not_advice'] = "doesn’t sell insurance" in pg.text_content('#view')
    pg.click('[data-act=agreeOwn]'); pg.wait_for_timeout(400)
    out['own_setup_no_sample'] = pg.is_visible('#rnName') and not pg.is_visible('#samplePill')
    pg.fill('#rnName', 'Our house'); pg.fill('#rnAddr', 'Pass Christian')
    pg.click('[data-act=saveName]'); pg.wait_for_timeout(200)
    out['state_required'] = pg.is_visible('#rnName')
    pg.select_option('#rnState', 'MS'); pg.click('[data-act=saveName]'); pg.wait_for_timeout(300)
    # policy by hand, real-looking numbers
    pg.click('text=Enter it by hand')
    for k, v in {'#pf-carrier': 'Orchid', '#pf-number': 'X1', '#pf-renewal': '2027-07-30', '#pf-lim-A': '635000', '#pf-lim-C': '127000', '#pf-lim-D': '63500', '#pf-allPerils': '5000', '#pf-windAmt': '5'}.items():
        pg.fill(k, v)
    pg.select_option('#pf-flood', 'no'); pg.click('#policyForm button[type=submit]'); pg.wait_for_timeout(300)
    v = pg.text_content('#view')
    out['wind_deductible'] = '31,750' in v
    out['flood_gap'] = 'Flood or storm surge' in v
    out['agent_banner'] = 'Confirm anything that surprises you' in v
    with pg.expect_download() as dl:
        pg.click('[data-act=calRenewal]')
    ics = open(dl.value.path()).read()
    out['renewal_ics'] = ics.startswith('BEGIN:VCALENDAR') and ics.count('BEGIN:VEVENT') == 2 and '20270615' in ics
    # photos with stamps
    fx = fixtures()
    pg.click('nav.tabs button[data-tab=inventory]'); pg.click('.room-head >> nth=0')
    pg.set_input_files('input[data-roomphoto][data-source=library] >> nth=0', [fx['big']]); pg.wait_for_timeout(2500)
    v = pg.text_content('#view'); out['exif_date'] = 'Taken Jun 14, 2025' in v; out['gps'] = 'GPS' in v
    pg.fill('input[name=n] >> nth=0', 'Sectional sofa'); pg.fill('input[name=v] >> nth=0', '2400'); pg.fill('input[name=y] >> nth=0', '2022')
    pg.click('form[data-additem] button[type=submit] >> nth=0'); pg.wait_for_timeout(300)
    # claim: lock and history
    pg.click('nav.tabs button[data-tab=claim]')
    pg.click('[data-act=lockRecord]'); pg.wait_for_timeout(200)
    out['lock_needs_date'] = 'Enter the date of loss' in pg.text_content('body')
    pg.fill('#clDate', '2026-10-20'); pg.press('#clDate', 'Tab'); pg.wait_for_timeout(200)
    pg.fill('#clAdj', 'Pat Lee'); pg.press('#clAdj', 'Tab'); pg.wait_for_timeout(150)
    pg.fill('#clAdjEmail', 'pat@example.com'); pg.press('#clAdjEmail', 'Tab'); pg.wait_for_timeout(150)
    pg.click('[data-act=lockRecord]'); pg.wait_for_timeout(300)
    out['locked'] = 'Not locked' not in pg.text_content('#view')
    pg.click('nav.tabs button[data-tab=inventory]'); pg.wait_for_timeout(200)
    if not pg.is_visible('form[data-additem]'): pg.click('.room-head >> nth=0')
    pg.click('button[data-delitem] >> nth=0'); pg.wait_for_timeout(200)
    out['locked_item_not_removable'] = 'locked before-storm record' in pg.text_content('body')
    pg.fill('input[name=n] >> nth=0', 'New TV'); pg.fill('input[name=v] >> nth=0', '900')
    pg.click('form[data-additem] button[type=submit] >> nth=0'); pg.wait_for_timeout(300)
    out['after_claim_marked'] = 'Added after claim' in pg.text_content('#view')
    pg.click('nav.tabs button[data-tab=claim]'); v = pg.text_content('#view')
    out['history'] = all(x in v for x in ['Record history', 'Added Sectional sofa', 'Before-storm record locked', 'Added New TV'])
    # letters
    pg.fill('#logNote', 'Pat said the estimate will be emailed by Friday'); pg.click('#addLog button[type=submit]'); pg.wait_for_timeout(300)
    letter = pg.input_value('#ltOut')
    out['letter_uses_log'] = 'Dear Pat Lee' in letter and 'emailed by Friday' in letter and 'Policy number: X1' in letter
    out['letter_mailto'] = pg.get_attribute('#ltMail', 'href').startswith('mailto:pat%40example.com?subject=')
    pg.select_option('#ltKind', 'supplement'); pg.wait_for_timeout(300)
    pg.fill('#ltExtra', 'Water stain on bedroom ceiling found Oct 25'); pg.wait_for_timeout(200)
    out['letter_switches'] = 'Water stain on bedroom ceiling' in pg.input_value('#ltOut')
    pg.fill('#fuDate', '2026-12-01'); pg.fill('#fuNote', 'Estimate due')
    with pg.expect_download() as dl:
        pg.click('[data-act=calFollow]')
    ics = open(dl.value.path()).read()
    out['followup_ics'] = 'Estimate due' in ics and 'TRIGGER:-P1D' in ics
    # storm season reminders
    pg.click('nav.tabs button[data-tab=storm]')
    with pg.expect_download() as dl:
        pg.click('[data-act=calSeason]')
    ics = open(dl.value.path()).read()
    # Mississippi: hurricane (2 + peak), tornado (2), fall tornado (2), winter (2) = 9 yearly reminders
    out['season_ics'] = ics.count('BEGIN:VEVENT') == 9 and ics.count('RRULE:FREQ=YEARLY') == 9 and 'Mississippi' in ics
    v = pg.text_content('#view'); out['own_storm_no_demo'] = 'Delia' not in v and 'What’s happening?' in v and 'What your phone would show' not in v
    pg.click('[data-level=watch]'); pg.wait_for_timeout(200)
    out['own_storm_stage'] = pg.text_content('h1') == 'Storm on the way' and 'Final checklist' in pg.text_content('#view')
    pg.click('[data-level=none]'); pg.wait_for_timeout(200)
    v = pg.text_content('#view'); out['ms_seasons_shown'] = all(x in v for x in ['Seasons in Mississippi', 'Hurricane season', 'Tornado season', 'Fall tornado season', 'Winter storms'])
    # feedback goes to the business email
    pg.click('#fbBtn'); pg.click('[data-go=feedback]'); pg.click('button[data-fbq=rating] >> nth=4'); pg.wait_for_timeout(200)
    href = pg.get_attribute('#fbMail', 'href')
    out['feedback_email'] = href.startswith('mailto:info@coastlinecode.com') and '5%20Very%20useful' in href
    # nothing says "free"
    import re as _re
    _txt = open('../app.js').read().lower().replace('free up', '').replace('only if free', '')
    out['no_free_claims'] = not _re.search(r'\bfree\b', _txt)
    out['no_prototype_promises'] = not _re.search(r'full app|real app|a few dollars a month|prototype', _txt)
    out['errors'] = errs
    b.close()
ok = all(v for k, v in out.items() if k != 'errors') and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
