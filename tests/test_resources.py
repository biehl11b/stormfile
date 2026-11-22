"""State resources: every state has a complete insurance department and emergency agency entry, links are safe, and the screen follows the property's state."""
import json, sys, re
from playwright.sync_api import sync_playwright
from helpers import URL, new_page, start_own

out = {}
with sync_playwright() as p:
    b, ctx, pg, errs = new_page(p)
    start_own(pg, 'Coast house', 'MS')
    pg.click('nav.tabs button[data-tab=claim]'); pg.wait_for_timeout(200)
    out['claim_link'] = 'Claim stuck? Get help in Mississippi' in pg.text_content('#view')
    pg.click('button.linkcard[data-go=resources]'); pg.wait_for_timeout(300)
    v = pg.text_content('#view')
    out['ms_heading'] = 'Help in Mississippi' in v
    out['ms_ins'] = 'Mississippi Insurance Department' in v and '1-800-562-2957' in v
    out['ms_ema'] = 'Mississippi Emergency Management Agency' in v
    out['ms_extras'] = 'Strengthen Mississippi Homes' in v and 'Windstorm Underwriting' in v
    out['national'] = all(x in v for x in ['FEMA disaster assistance', '1-800-621-3362', 'SBA disaster loans', '1-800-659-2955', 'NFIP', '1-877-336-2627', 'National Hurricane Center'])
    out['tel_link'] = pg.get_attribute('a.tel >> nth=0', 'href') == 'tel:+18005622957'
    links = pg.eval_on_selector_all('#view a[target=_blank]', 'els=>els.map(a=>[a.href,a.rel])')
    out['links_https_noopener'] = bool(links) and all(h.startswith('https://') and 'noopener' in r for h, r in links)
    out['complaint_button'] = pg.is_visible('text=File a complaint online')
    # switch state through the screen
    pg.click('[data-act=changeState]'); pg.wait_for_timeout(200)
    pg.select_option('#pState', 'TX'); pg.wait_for_timeout(300)
    v = pg.text_content('#view')
    out['tx_switch'] = 'Help in Texas' in v and '1-800-252-3439' in v and 'TWIA' in v and 'Texas Division of Emergency Management' in v
    # data check via the app's own tables
    pg.evaluate("()=>document.querySelector('[data-act=changeState]').click()"); pg.wait_for_timeout(200)
    opts = pg.eval_on_selector_all('#pState option', 'os=>os.map(o=>o.value).filter(Boolean)')
    missing = []
    for st in opts:
        pg.select_option('#pState', st); pg.wait_for_timeout(120)
        v = pg.text_content('#view')
        ok = 'Insurance department' in v and 'Emergency management' in v and len(pg.query_selector_all('a.tel')) >= 3
        if not ok: missing.append(st)
        pg.evaluate("()=>document.querySelector('[data-act=changeState]').click()"); pg.wait_for_timeout(80)
    out['states_checked'] = len(opts)
    out['states_missing'] = missing
    # storm and settings entry points
    pg.select_option('#pState', 'MS'); pg.wait_for_timeout(150)
    pg.click('nav.tabs button[data-tab=storm]'); pg.wait_for_timeout(200)
    out['storm_link'] = pg.is_visible('button.linkcard[data-go=resources]')
    pg.click('#fbBtn'); pg.wait_for_timeout(200)
    out['settings_link'] = pg.is_visible('button.linkcard[data-go=resources]')
    out['errors'] = errs
    b.close()
ok = all(v for k, v in out.items() if k not in ('errors', 'states_missing', 'states_checked')) and out['states_checked'] == 51 and not out['states_missing'] and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
