// Fails the build if StormFile's scripts use JavaScript too new for older phones' built-in web viewer
// (Android System WebView 69, see minWebViewVersion in capacitor.config.json) or for iOS 15.
// Learned from KidArmor: Google Play rejected its build 147 ("does not open or load") because older
// Android phones couldn't run newer code and showed a blank screen. Copyright (c) 2026 Coastline Code LLC.
const fs = require("fs"), path = require("path"); const acorn = require(process.argv[2] || "acorn");
const site = path.resolve(__dirname, "../..");
const files = ["compat.js", "es.js", "app.js", "native/src/native.js", "vendor/qrcode.js", "vendor/jsQR.js", "vendor/pdf-lib.min.js", "vendor/pdf.min.js", "vendor/pdf.worker.min.js"];
let bad = 0;
for (const f of files) {
  const c = fs.readFileSync(path.join(site, f), "utf8");
  try { acorn.parse(c, { ecmaVersion: 2019, sourceType: "script", allowReturnOutsideFunction: true }); }
  catch (e) { bad++; const L = c.split("\n")[e.loc.line - 1] || ""; console.error(`TOO NEW FOR OLDER PHONES (${f}, line ${e.loc.line}): ${L.slice(Math.max(0, e.loc.column - 60), e.loc.column + 30)}`); }
  // Regex lookbehind (?<= (?<! only works from iOS 16.4; the iPhone app supports iOS 15.
  const m = c.match(/.{0,40}\(\?<[=!].{0,20}/); if (m) { bad++; console.error(`TOO NEW FOR OLDER IPHONES (${f}): regex lookbehind: ${m[0]}`); }
  // Browser features older viewers don't have (compat.js adds the ones StormFile needs)
  if (f === "app.js" || f === "native/src/native.js") for (const [re, what] of [[/\.replaceAll\(/, "replaceAll (WebView 85)"], [/\.at\(-?\d/, "Array.at (WebView 92)"], [/structuredClone\(/, "structuredClone (WebView 98)"], [/Object\.hasOwn\(/, "Object.hasOwn (WebView 93)"], [/randomUUID\(/, "crypto.randomUUID (WebView 92)"], [/Promise\.any\(/, "Promise.any (WebView 85)"], [/\.findLast\(/, "findLast (WebView 97)"], [/CompressionStream/, "CompressionStream (WebView 80)"]]) {
    if (re.test(c)) { bad++; console.error(`TOO NEW FOR OLDER PHONES (${f}): ${what}`); }
  }
}
if (bad) process.exit(1); console.log("StormFile's scripts work on older phones (Android WebView 69+, iOS 15+)");
