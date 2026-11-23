// Builds www/ for the phone app from the StormFile web app. Copyright (c) 2026 Coastline Code LLC.
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url"; import { oldWebviewCss } from "./old-webview-css.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "..");
const www = path.join(root, "www");
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, "vendor"), { recursive: true });
// The app itself, its libraries and fonts (nothing is downloaded from other sites)
for (const f of ["compat.js", "app.js", "es.js", "privacy.html", "terms.html", "support.html", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) fs.copyFileSync(path.join(site, f), path.join(www, f));
fs.cpSync(path.join(site, "vendor"), path.join(www, "vendor"), { recursive: true });
fs.copyFileSync(path.join(root, "src/native.js"), path.join(www, "native.js"));
const core = ["dist/capacitor.js", "dist/capacitor.min.js"].map(f => path.join(root, "node_modules/@capacitor/core", f)).find(f => fs.existsSync(f));
if (!core) throw new Error("@capacitor/core bundle not found; run npm install first");
fs.copyFileSync(core, path.join(www, "vendor/capacitor.js"));
let html = fs.readFileSync(path.join(site, "index.html"), "utf8");
// Load the phone bridge before the app
if (!html.includes('<script src="app.js"></script>')) throw new Error("index.html no longer loads app.js the expected way");
html = html.replace('<script src="app.js"></script>', '<script src="vendor/capacitor.js"></script><script src="native.js"></script><script src="app.js"></script>');
// The web app's manifest and service worker aren't used inside the phone app
html = html.replace(/<link rel="manifest"[^>]*>\s*/, "");
// PDF receipts are handed to the share sheet, which reads them from blob: addresses
if (!/connect-src 'self'/.test(html)) throw new Error("CSP connect-src not found");
html = html.replace("connect-src 'self'", "connect-src 'self' blob:");
html = html.replace('<meta name="viewport"', '<meta name="format-detection" content="telephone=no"><meta name="viewport"');
// Older Android web viewers (WebView 69-86) skip newer CSS; add the older form right before it (newer phones look the same).
// Learned from KidArmor: on Android 8 and 10 its Welcome screen was drawn off the bottom of the screen without this.
const compat = oldWebviewCss(html); html = compat.css.replace("width:min(240px,70vw)", "width:240px;max-width:70vw;width:min(240px,70vw)");
console.log("older-phone CSS fallbacks added:", compat.changed);
fs.writeFileSync(path.join(www, "index.html"), html);
// Shown instead of StormFile when the phone's Android System WebView is too old to run it (see minWebViewVersion)
fs.writeFileSync(path.join(www, "webview-update.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>StormFile</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#eef2f4;color:#14212b}main{max-width:520px;margin:0 auto;padding:48px 24px}h1{font-size:24px;color:#0d5c7a}p,li{font-size:17px;line-height:1.5}</style></head>
<body><main><h1>One quick update first</h1><p>StormFile needs a newer version of <b>Android System WebView</b>, the part of Android that shows app screens. It's free and takes about a minute.</p>
<ol><li>Open the <b>Google Play Store</b>.</li><li>Search for <b>Android System WebView</b>.</li><li>Tap <b>Update</b>.</li><li>Open StormFile again.</li></ol>
<p>Your StormFile records are safe on this phone. Questions? info@coastlinecode.com · (228) 304-5333</p>
<p lang="es">¿En español? Abra Google Play Store, busque <b>Android System WebView</b>, toque <b>Actualizar</b> y abra StormFile de nuevo. Sus registros están seguros en este teléfono.</p></main></body></html>`);
console.log("www ready:", fs.readdirSync(www), fs.readdirSync(path.join(www, "vendor")));
