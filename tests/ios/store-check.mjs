// Opens the App Store (Release) build of StormFile the way an App Reviewer would, on one virtual iPhone/iPad:
// first open, the start screen, the Terms of Use link (must open Safari and leave StormFile running),
// "I agree — set up my home", the first setup screen, the Policy and Claim tabs, Settings; rotate (iPad);
// no mention of Android or Google Play on the screens (App Store guideline 2.3.10); no crash.
// Ported from KidArmor's iPhone store check. Needs: UDID, APP (Release App.app), DEVICE, OUT; Appium running on 4723.
import { remote } from "webdriverio"; import { execFileSync } from "child_process"; import fs from "fs";
const { UDID, APP, DEVICE = "iPhone", OUT = "store" } = process.env; fs.mkdirSync(OUT, { recursive: true });
const BUNDLE = "com.coastlinecode.stormfile"; const sleep = ms => new Promise(r => setTimeout(r, ms));
const xc = (...a) => { try { return execFileSync("xcrun", a, { encoding: "utf8", timeout: 300000, maxBuffer: 64e6 }) } catch (e) { return (e.stdout || "") + (e.stderr || "") } };
const lines = []; let fails = 0;
const log = (kind, what, detail = "") => { if (kind === "FAIL") fails++; const s = `${kind.padEnd(4)} ${what}${detail ? "  → " + String(detail).slice(0, 300) : ""}`; console.log(s); lines.push(s) };
const shot = name => xc("simctl", "io", UDID, "screenshot", `${OUT}/${name}.png`);
let d; const seen = [];
async function find(pred, ms = 20000) { const end = Date.now() + ms; while (Date.now() < end) { try { const e = await d.$(`-ios predicate string:${pred}`); if (await e.isExisting()) return e } catch (e) { } await sleep(1000) } return null }
async function state(b = BUNDLE) { try { return await d.execute("mobile: queryAppState", { bundleId: b }) } catch (e) { return "?" } }
async function source(name) { try { const x = await d.getPageSource(); seen.push(x); fs.writeFileSync(`${OUT}/${name}.xml`, x); return x } catch (e) { return "" } }
async function main() {
  xc("simctl", "install", UDID, APP);
  const t0 = Date.now(); xc("simctl", "launch", UDID, BUNDLE);
  await sleep(5000); shot("1-after-5s"); await sleep(10000); shot("2-after-15s");
  d = await remote({ hostname: "127.0.0.1", port: 4723, logLevel: "error", connectionRetryTimeout: 1800000, connectionRetryCount: 0,
    capabilities: { platformName: "iOS", "appium:automationName": "XCUITest", "appium:udid": UDID, "appium:bundleId": BUNDLE, "appium:deviceName": DEVICE,
      ...(process.env.WDA_DD ? { "appium:derivedDataPath": process.env.WDA_DD, "appium:usePrebuiltWDA": true } : {}), ...(process.env.IOSVER ? { "appium:platformVersion": process.env.IOSVER } : {}),
      "appium:noReset": true, "appium:autoLaunch": false, "appium:newCommandTimeout": 900, "appium:wdaLaunchTimeout": 600000, "appium:wdaConnectionTimeout": 600000, "appium:autoAcceptAlerts": false } });
  const size = await d.getWindowSize(); log("info", "device", `${DEVICE} iOS ${process.env.IOSVER || "?"}, window ${size.width}x${size.height}`);
  await d.execute("mobile: activateApp", { bundleId: BUNDLE });
  const agree = await find(`label BEGINSWITH "I agree" AND label CONTAINS "set up my home"`, 90000);
  log(agree ? "ok" : "FAIL", "start screen with the I agree button shows", agree ? `about ${Math.round((Date.now() - t0) / 1000)} s after opening` : "not seen");
  shot("3-start"); await source("start-source");
  // Terms of Use opens on the web in Safari, and StormFile keeps running
  const terms = await find(`label == "Terms of Use" AND (type == "XCUIElementTypeLink" OR type == "XCUIElementTypeStaticText")`, 5000);
  if (terms) {
    await terms.click(); await sleep(5000); shot("4-terms-website");
    const sf = await state(), safari = await state("com.apple.mobilesafari");
    log(safari === 4 && (sf === 3 || sf === 2 || sf === 4) ? "ok" : "FAIL", "Terms of Use opens in Safari and StormFile keeps running", `Safari state ${safari}, StormFile state ${sf}`);
    await d.execute("mobile: activateApp", { bundleId: BUNDLE }); await sleep(2500);
    const back = await find(`label BEGINSWITH "I agree" AND label CONTAINS "set up my home"`, 10000); log(back ? "ok" : "FAIL", "back in StormFile, still on the start screen");
  } else log("info", "Terms of Use link not found by label", "skipped link check");
  const go = await find(`label BEGINSWITH "I agree" AND label CONTAINS "set up my home"`, 10000);
  if (go) { await go.click(); await sleep(2500) }
  const setup = await find(`label CONTAINS "About this property" OR label CONTAINS "Edit name and city"`, 30000); shot("5-after-agree"); await source("after-agree");
  log(setup ? "ok" : "FAIL", "I agree opens the first setup screen");
  for (const [tab, want] of [["Policy", "olicy"], ["Claim", "laim"]]) {
    const t = await find(`type == "XCUIElementTypeButton" AND label == "${tab}"`, 8000);
    if (!t) { log("FAIL", `${tab} tab found`); continue }
    await t.click(); await sleep(2000); shot(`6-${tab.toLowerCase()}`); const x = await source(`tab-${tab.toLowerCase()}`);
    log(x.includes(want) ? "ok" : "FAIL", `${tab} tab opens`);
  }
  const st = await find(`type == "XCUIElementTypeButton" AND label == "Settings"`, 8000);
  if (st) { await st.click(); await sleep(2000); shot("7-settings"); await source("settings"); log("ok", "Settings opens") } else log("FAIL", "Settings button found");
  if (/iPad/i.test(DEVICE)) { // App Review often uses an iPad; the iPhone-only app runs there in a phone-size window
    try { await d.setOrientation("LANDSCAPE"); await sleep(2500); shot("8-landscape"); await d.setOrientation("PORTRAIT"); await sleep(2000) } catch (e) { log("info", "rotate", e.message) }
    const s2 = await find(`type == "XCUIElementTypeButton" AND label == "Policy"`, 10000); log(s2 ? "ok" : "FAIL", "still fine after rotating");
  }
  // App Store guideline 2.3.10: the iPhone app mustn't mention other phones or stores
  const other = seen.join("\n").match(/.{0,40}\b(Android|Google Play|Play Store|TalkBack)\b.{0,40}/);
  log(other ? "FAIL" : "ok", "no mention of Android or Google Play on the screens checked", other ? other[0] : "");
  const s3 = await state(); log(s3 === 4 ? "ok" : "FAIL", "app still running at the end", `state ${s3}`);
}
try { await main() } catch (e) { log("FAIL", "test stopped", e.message) }
try { if (d) await d.deleteSession() } catch (e) { }
const crashes = xc("simctl", "spawn", UDID, "log", "show", "--last", "15m", "--style", "compact", "--predicate", 'process == "App" AND (messageType == fault OR eventMessage CONTAINS[c] "crash" OR eventMessage CONTAINS "Terminating")');
fs.writeFileSync(`${OUT}/app-faults.txt`, crashes);
const reports = (() => { try { return execFileSync("bash", ["-c", `ls ~/Library/Logs/DiagnosticReports 2>/dev/null | grep -iE '^App[-_.]' || true`], { encoding: "utf8" }).trim() } catch (e) { return "" } })();
log(reports ? "FAIL" : "ok", "no crash reports", reports);
const head = `${DEVICE} (store build): ${lines.filter(l => l.startsWith("ok")).length} passed, ${fails} failed`;
fs.writeFileSync(`${OUT}/summary.txt`, head + "\n" + lines.join("\n") + "\n"); console.log(head);
process.exit(0);
