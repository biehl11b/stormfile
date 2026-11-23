"""Accessibility: every control has a name VoiceOver/TalkBack can read, images have text, announcements are spoken,
reduced motion is respected, and every screen still fits with large text (150% and 200%)."""
import json, sys
from playwright.sync_api import sync_playwright
from helpers import URL, agree

SCREENS = ['home', 'policy', 'inventory', 'storm', 'claim', 'feedback', 'settings', 'resources', 'policyForm']
NAMES = """()=>{
  const name = e => { if(e.getAttribute('aria-label')) return e.getAttribute('aria-label');
    const lb = e.getAttribute('aria-labelledby'); if(lb) return lb.split(' ').map(i=>(document.getElementById(i)||{}).textContent||'').join(' ');
    if(e.labels && e.labels.length) return [...e.labels].map(l=>l.textContent).join(' ');
    const t = (e.textContent||'').trim(); if(t) return t;
    const im = e.querySelector && e.querySelector('img[alt]'); if(im && im.alt) return im.alt;
    return e.getAttribute('title') || e.getAttribute('placeholder') || ''; };
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width>0 && r.height>0 && cs.visibility!=='hidden' && cs.display!=='none' && !e.closest('[aria-hidden=true]'); };
  const bad = [];
  document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button]').forEach(e=>{ if(vis(e) && !name(e).trim()) bad.push(e.outerHTML.slice(0,120)); });
  document.querySelectorAll('img').forEach(e=>{ if(vis(e) && !e.hasAttribute('alt')) bad.push('img no alt: '+e.outerHTML.slice(0,100)); });
  document.querySelectorAll('svg').forEach(e=>{ if(vis(e) && !e.closest('button,a,[aria-hidden=true]') && e.getAttribute('aria-hidden')!=='true' && !e.getAttribute('aria-label') && !e.getAttribute('role') && !e.querySelector('title')) bad.push('svg no label: '+e.outerHTML.slice(0,80)); });
  return bad; }"""
FIT = """()=>{const W=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();
  if(r.width>0&&r.right>W+1&&!e.closest('.tblwrap')&&getComputedStyle(e).position!=='fixed')bad.push(e.tagName+'.'+(e.className||'')+' '+Math.round(r.right))});return {sw:document.documentElement.scrollWidth,W,bad:bad.slice(0,3)}}"""
def go(pg, t):
    pg.evaluate("t=>{ const b=document.querySelector('nav.tabs button[data-tab='+t+']'); if(b) b.click(); else { const x=document.createElement('button'); x.dataset.go=t; document.getElementById('view').appendChild(x); x.click(); } }", t)
    pg.wait_for_timeout(250)
out = {'unnamed': {}, 'large_text_overflow': []}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion='reduce')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(400)
    r = pg.evaluate(NAMES)
    if r: out['unnamed']['start'] = r
    agree(pg)
    for t in SCREENS:
        go(pg, t)
        if t == 'inventory': pg.evaluate("()=>{const h=document.querySelector('.room-head'); h&&h.click()}"); pg.wait_for_timeout(200)
        if t == 'claim': pg.evaluate("()=>{const s=document.querySelector('[data-act=startClaim]'); s&&s.click(); document.querySelectorAll('#view details').forEach(d=>d.open=true)}"); pg.wait_for_timeout(200)
        r = pg.evaluate(NAMES)
        if r: out['unnamed'][t] = r
    out['lang_set'] = pg.evaluate("()=>document.documentElement.lang") in ('en', 'es')
    out['toast_is_announced'] = pg.evaluate("()=>{const t=document.getElementById('srLive'); return !!t && t.getAttribute('aria-live')==='polite'}")
    out['zoom_allowed'] = pg.evaluate("()=>!/user-scalable=no|maximum-scale=1(\\.0)?([^0-9]|$)/.test(document.querySelector('meta[name=viewport]').content)")
    out['reduced_motion_respected'] = pg.evaluate("()=>{const s=document.createElement('div'); s.className='spinner'; document.body.appendChild(s); const a=getComputedStyle(s).animationName; s.remove(); const c=document.querySelector('#menuBtn .caret'); return a==='none' && (!c || parseFloat(getComputedStyle(c).transitionDuration)===0)}")
    ctx.close()
    # large text: 150% and 200% text on a 390px phone is about the same as normal text on a 260px or 195px wide screen
    for zoom in (1.5, 2.0):
        ctx = b.new_context(viewport={'width': round(390/zoom), 'height': 700}, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(300); agree(pg)
        for t in SCREENS:
            go(pg, t); r = pg.evaluate(FIT)
            if r['sw'] > r['W'] or r['bad']: out['large_text_overflow'].append({'zoom': zoom, 'screen': t, **r})
        ctx.close()
    out['errors'] = errs
    b.close()
ok = not out['unnamed'] and not out['large_text_overflow'] and out['lang_set'] and out['toast_is_announced'] and out['zoom_allowed'] and out['reduced_motion_respected'] and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
