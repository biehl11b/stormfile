// Builds www/ for the phone app from the StormFile web app. Copyright (c) 2026 Coastline Code LLC.
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "..");
const www = path.join(root, "www");
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, "vendor"), { recursive: true });
// The app itself, its libraries and fonts (nothing is downloaded from other sites)
for (const f of ["app.js", "privacy.html", "terms.html", "support.html", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) fs.copyFileSync(path.join(site, f), path.join(www, f));
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
fs.writeFileSync(path.join(www, "index.html"), html);
console.log("www ready:", fs.readdirSync(www), fs.readdirSync(path.join(www, "vendor")));
