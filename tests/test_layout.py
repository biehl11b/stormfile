"""Layout: every screen fits a phone (no sideways scrolling) at small and large phone widths, in light and dark mode."""
import json, sys
from playwright.sync_api import sync_playwright
from helpers import URL, agree

JS = """()=>{const W=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();
  if(r.width>0&&r.right>W+1&&!e.closest('.tblwrap')&&getComputedStyle(e).position!=='fixed')bad.push(e.tagName+'.'+(e.className||'')+' '+Math.round(r.right))});return {W,sw:document.documentElement.scrollWidth,bad:bad.slice(0,4)}}"""
out = {'problems': []}
with sync_playwright() as p:
    b = p.chromium.launch()
    for width, scheme in [(360, 'light'), (390, 'dark'), (430, 'light')]:
        ctx = b.new_context(viewport={'width': width, 'height': 800}, is_mobile=True, has_touch=True, color_scheme=scheme)
        pg = ctx.new_page(); pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(400)
        r = pg.evaluate(JS)
        if r['sw'] > r['W'] or r['bad']: out['problems'].append({'w': width, 'screen': 'start', **r})
        agree(pg)
        for t in ['home', 'policy', 'inventory', 'storm', 'claim', 'feedback', 'settings', 'resources', 'policyForm']:
            pg.evaluate("t=>{ const b=document.querySelector('nav.tabs button[data-tab='+t+']'); if(b) b.click(); else { document.getElementById('fbBtn').click(); const x=document.querySelector('[data-go='+t+']'); x&&x.click(); } }", t)
            pg.wait_for_timeout(250)
            if t == 'policyForm' and not pg.is_visible('#policyForm'):
                pg.evaluate("()=>{document.querySelector('nav.tabs button[data-tab=policy]').click()}"); pg.wait_for_timeout(200)
                pg.evaluate("()=>{const x=document.querySelector('[data-go=policyForm]'); x&&x.click()}"); pg.wait_for_timeout(200)
            r = pg.evaluate(JS)
            if r['sw'] > r['W'] or r['bad']: out['problems'].append({'w': width, 'screen': t, **r})
        ctx.close()
    b.close()
ok = not out['problems']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
