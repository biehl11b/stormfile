"""Reading a policy PDF (only offered where Claude can read it): the PDF opens with the pdf.js copy bundled in vendor/,
nothing is loaded from another website, its text reaches the reader, and the store app (no Claude) never shows the upload."""
import json, sys, base64
from playwright.sync_api import sync_playwright
from helpers import URL, wait_js

CLAUDE = """
window.__sent = null;
window.claude = { use: async () => ({
  limits: async () => ({ images: { maxCount: 4 } }),
  json: async (prompt, opts) => { window.__sent = { prompt: String(prompt), images: (opts && opts.images || []).length }; throw new Error('stop here'); }
}) };
"""
MAKE_PDF = """async () => {
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor/pdf-lib.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const { PDFDocument, StandardFonts } = window.PDFLib; const d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica);
  const pg = d.addPage([612, 792]);
  const lines = ['HOMEOWNERS DECLARATIONS PAGE', 'Policy number HO-TEST-4471', 'Coverage A Dwelling $312,000', 'Coverage B Other Structures $31,200',
    'Coverage C Personal Property $156,000', 'Coverage D Loss of Use $62,400', 'Hurricane deductible 2% of Coverage A', 'All other perils deductible $1,000',
    'Named insured Pat Example, 101 Beach Blvd, Pass Christian MS', 'Policy period 06/01/2026 to 06/01/2027 12:01 AM standard time'];
  lines.forEach((t, i) => pg.drawText(t, { x: 50, y: 740 - i * 22, size: 12, font: f }));
  return btoa(String.fromCharCode.apply(null, await d.save()));
}"""
out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); ctx.add_init_script(CLAUDE)
    outside = []
    ctx.route('**/*', lambda r: (outside.append(r.request.url), r.abort()) if not r.request.url.startswith(URL) else r.continue_())
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(800)
    pg.click('[data-act=agree]'); pg.wait_for_timeout(300)
    pg.click('nav.tabs button[data-tab=policy]'); pg.wait_for_timeout(400)
    out['upload_shown_with_claude'] = pg.is_visible('label.upload:has(#polUpload)')
    pdf = base64.b64decode(pg.evaluate(MAKE_PDF))
    pg.set_input_files('#polUpload', [{'name': 'declarations.pdf', 'mimeType': 'application/pdf', 'buffer': pdf}])
    wait_js(pg, '()=>!!(window.__sent || /Couldn.t read it/.test(document.body.textContent))', 30000)
    sent = pg.evaluate('()=>window.__sent') or {}
    out['pdf_text_read'] = 'Coverage A Dwelling $312,000' in sent.get('prompt', '') and 'Hurricane deductible 2%' in sent.get('prompt', '')
    out['text_pdf_needs_no_images'] = sent.get('images') == 0
    out['pdfjs_from_app'] = pg.evaluate('()=>[...document.scripts].filter(s=>/pdf(\\.worker)?\\.min\\.js/.test(s.src)).every(s=>s.src.indexOf(location.origin + "/vendor/")===0)')
    out['nothing_from_other_websites'] = not outside
    out['outside_requests'] = outside[:5]
    out['errors'] = errs
    ctx.close()
    # without Claude (the store app and the plain web page) there's no upload button that can't work
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(800)
    pg.click('[data-act=agree]'); pg.wait_for_timeout(300)
    pg.click('nav.tabs button[data-tab=policy]'); pg.wait_for_timeout(400)
    t = pg.text_content('#view')
    out['no_upload_without_claude'] = pg.query_selector('#polUpload') is None and 'Policy reads on this account' not in t and 'Edit policy details' in t
    b.close()
ok = all(v for k, v in out.items() if k not in ('errors', 'outside_requests')) and not out['errors']
print(json.dumps(out, indent=1)); print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
