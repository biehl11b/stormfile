"""Shared helpers for StormFile's browser tests."""
import os, tempfile
URL = os.environ.get('STORMFILE_URL', 'http://localhost:8771/')

def new_page(p, geo=False):
    b = p.chromium.launch()
    kw = dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    if geo:
        kw.update(permissions=['geolocation'], geolocation={'latitude': 30.3157, 'longitude': -89.2475})
    ctx = b.new_context(**kw)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:160]) if (m.type == 'error' and 'fonts' not in m.text and 'net::' not in m.text and 'ERR_' not in m.text) else None)
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(600)
    agree(pg)
    return b, ctx, pg, errs

def agree(pg):
    """Accept the start screen if it's showing."""
    pg.evaluate("()=>{const a=document.querySelector('[data-act=agree]'); a&&a.click();}")
    pg.wait_for_timeout(200)

def start_own(pg, name='Test house', state='MS'):
    pg.evaluate("()=>{const b=document.querySelector('[data-act=startOwn]'); b&&b.click();}")
    pg.wait_for_timeout(300)
    if pg.is_visible('#rnName'):
        pg.fill('#rnName', name); pg.select_option('#rnState', state); pg.click('[data-act=saveName]'); pg.wait_for_timeout(300)

_FX = None
def fixtures():
    """Make test photos: one large with a camera date, one small."""
    global _FX
    if _FX: return _FX
    from PIL import Image
    d = tempfile.mkdtemp()
    big = Image.effect_noise((3000, 2000), 60).convert('RGB')
    ex = Image.Exif(); ex[0x0132] = '2025:06:14 10:22:00'
    ex.get_ifd(0x8769)[0x9003] = '2025:06:14 10:22:00'
    big.save(os.path.join(d, 'big.jpg'), exif=ex, quality=90)
    Image.new('RGB', (600, 800), (230, 230, 220)).save(os.path.join(d, 'small.jpg'))
    _FX = {'big': os.path.join(d, 'big.jpg'), 'small': os.path.join(d, 'small.jpg')}
    return _FX
