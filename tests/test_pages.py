"""Store pages: privacy, terms and help load on a phone with no sideways scrolling, link to each other, and the app links to them."""
import json, sys
from playwright.sync_api import sync_playwright
from helpers import URL

out = {'pages': {}}
with sync_playwright() as p:
    b = p.chromium.launch()
    for scheme in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 360, 'height': 800}, is_mobile=True, has_touch=True, color_scheme=scheme)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        for name, must in [('privacy.html', ['stay on your phone', 'info@coastlinecode.com', 'Location']),
                           ('terms.html', ['not insurance, legal or financial advice', 'Apple', 'Mississippi']),
                           ('support.html', ['Restore from a backup', 'info@coastlinecode.com'])]:
            pg.goto(URL + name, wait_until='networkidle')
            t = pg.text_content('body')
            fits = pg.evaluate('()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth')
            links = pg.eval_on_selector_all('a[href$=".html"]', 'as=>as.map(a=>a.getAttribute("href"))')
            out['pages'][f'{name}-{scheme}'] = all(x in t for x in must) and fits and len(links) >= 2 and 'free' not in t.lower().replace('error-free', '')
        out[f'errors-{scheme}'] = errs
        ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(400)
    out['start_links_terms'] = pg.is_visible('#view a[href="terms.html"]') and pg.is_visible('#view a[href="privacy.html"]')
    b.close()
ok = all(out['pages'].values()) and out['start_links_terms'] and not out['errors-light'] and not out['errors-dark']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
