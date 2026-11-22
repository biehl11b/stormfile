"""State seasons: each state shows the right seasons, Home warns ahead of time, and reminders repeat yearly."""
import json, sys, datetime
from playwright.sync_api import sync_playwright
from helpers import URL, agree, start_own

EXPECT = {  # state: (must show, must not show)
    'MS': (['Hurricane season', 'Tornado season', 'Fall tornado season', 'Winter storms'], ['Wildfire season']),
    'CA': (['Wildfire season', 'Winter storms'], ['Hurricane season', 'Tornado season']),
    'FL': (['Hurricane season', 'Grass and wildfire season'], ['Winter storms', 'Tornado season']),
    'HI': (['Hurricane season'], ['Winter storms', 'Wildfire season']),
    'OR': (['Wildfire season', 'Winter storms'], ['Hurricane season']),
    'TX': (['Hurricane season', 'Grass and wildfire season', 'Tornado season', 'Winter storms'], ['Fall tornado season']),
}
out = {'states': {}}
with sync_playwright() as p:
    b = p.chromium.launch()
    # Pretend today is May 20 so Mississippi's hurricane season is 12 days away.
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.install(time=datetime.datetime(2027, 5, 20, 10, 0))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(500)
    agree(pg); start_own(pg, 'Coast house', 'MS')
    pg.click('nav.tabs button[data-tab=home]'); pg.wait_for_timeout(300)
    v = pg.text_content('#view')
    out['home_heads_up'] = 'Hurricane season' in v and 'Starts in 12 days' in v and 'Tornado season' in v and 'In season now' in v
    for st, (yes, no) in EXPECT.items():
        if st != 'MS':
            pg.click('nav.tabs button[data-tab=home]'); pg.wait_for_timeout(200)
            pg.evaluate("()=>{const d=document.querySelector('details.add'); if(d) d.open=true}")
            pg.fill('#apName', f'Place {st}'); pg.fill('#apAddr', 'Town'); pg.select_option('#apState', st)
            pg.click('#addProp button[type=submit]'); pg.wait_for_timeout(300)
        pg.click('nav.tabs button[data-tab=storm]'); pg.wait_for_timeout(250)
        v = pg.text_content('#view')
        ok = all(x in v for x in yes) and not any(x in v.replace('Grass and wildfire season', '') for x in no if x != 'Wildfire season') \
             and ('Wildfire season' not in no or 'Wildfire season' not in v.replace('Grass and wildfire season', ''))
        out['states'][st] = ok
    # changing a state
    pg.click('[data-act=changeState]'); pg.wait_for_timeout(200)
    out['change_state_prompts'] = pg.is_visible('#pState')
    pg.select_option('#pState', 'AZ'); pg.wait_for_timeout(300)
    out['arizona_monsoon_note'] = 'monsoon' in pg.text_content('#view')
    with pg.expect_download() as dl:
        pg.click('[data-act=calSeason]')
    ics = open(dl.value.path()).read()
    out['az_reminders'] = 'Arizona' in ics and 'RRULE:FREQ=YEARLY' in ics
    out['errors'] = errs
    b.close()
ok = out['home_heads_up'] and all(out['states'].values()) and out['change_state_prompts'] and out['arizona_monsoon_note'] and out['az_reminders'] and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
