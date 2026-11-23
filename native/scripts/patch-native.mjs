// Adds permission explanations, privacy settings and app settings to the generated iPhone and Android projects.
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const which = process.argv[2];
function patchIOS() {
  const f = path.join(root, "ios/App/App/Info.plist"); let s = fs.readFileSync(f, "utf8");
  const add = (key, xml) => { if (!s.includes(`<key>${key}</key>`)) s = s.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${xml}\n</dict>\n</plist>\n`); };
  const str = v => `<string>${v}</string>`;
  add("NSCameraUsageDescription", str("Take photos of your rooms, belongings, receipts and damage. Photos stay on your phone."));
  add("NSPhotoLibraryUsageDescription", str("Add photos of your home, belongings and receipts that are already on your phone. They stay on your phone."));
  add("NSPhotoLibraryAddUsageDescription", str("Save files you choose to share from StormFile."));
  add("NSLocationWhenInUseUsageDescription", str("Adds where each photo was taken to that photo's record, to show it was taken at your property. The location stays on your phone."));
  add("NSFaceIDUsageDescription", str("Use Face ID to unlock your StormFile records."));
  // StormFile adds renewal, follow-up and storm season reminders. It never reads your calendar.
  add("NSCalendarsWriteOnlyAccessUsageDescription", str("StormFile adds the renewal, claim follow-up and storm season reminders you choose to your calendar. It doesn't read your calendar."));
  add("NSCalendarsUsageDescription", str("StormFile adds the renewal, claim follow-up and storm season reminders you choose to your calendar. It doesn't read your calendar."));
  // The calendar plugin's code can also ask for full calendar and Reminders access. StormFile never asks for them,
  // but Apple's upload check requires the text anyway.
  add("NSCalendarsFullAccessUsageDescription", str("StormFile adds the renewal, claim follow-up and storm season reminders you choose to your calendar. It doesn't read your calendar."));
  add("NSRemindersUsageDescription", str("StormFile doesn't use Reminders."));
  add("NSRemindersFullAccessUsageDescription", str("StormFile doesn't use Reminders."));
  add("ITSAppUsesNonExemptEncryption", "<false/>");
  // StormFile is in English and Spanish; this lets the App Store list both languages.
  add("CFBundleLocalizations", "<array><string>en</string><string>es</string></array>");
  fs.writeFileSync(f, s); console.log("iOS Info.plist patched");
  // Age check (Declared Age Range): required by Texas law now and other states in 2027. Needs this entitlement.
  const ent = path.join(root, "ios/App/App/App.entitlements");
  let e = fs.existsSync(ent) ? fs.readFileSync(ent, "utf8") : `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n</dict>\n</plist>\n`;
  if (!e.includes("com.apple.developer.declared-age-range")) e = e.replace(/<dict>/, "<dict>\n\t<key>com.apple.developer.declared-age-range</key>\n\t<true/>");
  fs.writeFileSync(ent, e);
  // iPhone only (it still runs on iPad in iPhone mode). Avoids needing iPad screenshots and iPad review.
  const pbx = path.join(root, "ios/App/App.xcodeproj/project.pbxproj"); let p = fs.readFileSync(pbx, "utf8");
  p = p.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, "TARGETED_DEVICE_FAMILY = 1;"); fs.writeFileSync(pbx, p);
  // Privacy manifest (Apple requires one): no tracking, no data collected, and the system APIs the app's plugins use.
  fs.writeFileSync(path.join(root, "ios/App/App/PrivacyInfo.xcprivacy"), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key><false/>
	<key>NSPrivacyTrackingDomains</key><array/>
	<key>NSPrivacyCollectedDataTypes</key><array/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array></dict>
		<dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array></dict>
	</array>
</dict>
</plist>
`);
}
function patchAndroid() {
  const f = path.join(root, "android/app/src/main/AndroidManifest.xml"); let s = fs.readFileSync(f, "utf8");
  const perms = ["CAMERA", "USE_BIOMETRIC", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "WRITE_CALENDAR", "READ_CALENDAR"];
  const permXml = perms.filter(p => !s.includes(`android.permission.${p}"`)).map(p => `    <uses-permission android:name="android.permission.${p}" />`).join("\n");
  s = s.replace(/<\/manifest>\s*$/, `${permXml}\n</manifest>\n`);
  // Keep records out of Google cloud backups and phone-to-phone transfers (people use StormFile's own locked backup).
  s = s.replace(/android:allowBackup="true"/, 'android:allowBackup="false"');
  if (!s.includes("android:allowBackup=")) s = s.replace("<application", '<application android:allowBackup="false"');
  if (!s.includes("android:dataExtractionRules=")) s = s.replace("<application", '<application android:dataExtractionRules="@xml/data_extraction_rules" android:fullBackupContent="false"');
  const xmlDir = path.join(root, "android/app/src/main/res/xml"); fs.mkdirSync(xmlDir, { recursive: true });
  fs.writeFileSync(path.join(xmlDir, "data_extraction_rules.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup><exclude domain="root" path="." /><exclude domain="database" path="." /><exclude domain="sharedpref" path="." /><exclude domain="file" path="." /><exclude domain="external" path="." /></cloud-backup>\n  <device-transfer><exclude domain="root" path="." /><exclude domain="database" path="." /><exclude domain="sharedpref" path="." /><exclude domain="file" path="." /><exclude domain="external" path="." /></device-transfer>\n</data-extraction-rules>\n`);
  // Start the phone's web viewer before the first screen (see android-src/StormFileApp.java; learned from KidArmor)
  if (!s.includes('android:name=".StormFileApp"')) s = s.replace("<application", '<application android:name=".StormFileApp"');
  // Keep the screen running through any settings change (text size, dark mode, language, rotation, a second screen)
  // instead of restarting it; a restart during start-up left KidArmor's page blank.
  const CFG = "orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|screenLayout|locale|layoutDirection|uiMode|navigation|density|fontScale|touchscreen|mcc|mnc|colorMode|fontWeightAdjustment|grammaticalGender";
  s = s.replace(/<activity\b[^>]*>/g, tag => {
    if (!/android:name="[^"]*MainActivity"/.test(tag)) return tag;
    return /android:configChanges=/.test(tag) ? tag.replace(/android:configChanges="[^"]*"/, `android:configChanges="${CFG}"`) : tag.replace("<activity", `<activity android:configChanges="${CFG}"`);
  });
  if (!s.includes(`android:configChanges="${CFG}"`)) throw new Error("Couldn't set configChanges on MainActivity");
  fs.writeFileSync(f, s); console.log("Android manifest patched");
  const javaDir = path.join(root, "android/app/src/main/java/com/coastlinecode/stormfile");
  fs.copyFileSync(path.join(root, "android-src/StormFileApp.java"), path.join(javaDir, "StormFileApp.java"));
  // SF_LIFE lines show in the phone log even in the store version, so a start-up problem can be traced.
  const ma = path.join(javaDir, "MainActivity.java"); let m = fs.readFileSync(ma, "utf8");
  if (!m.includes("SF_LIFE")) {
    m = m.replace(/(package [^;]+;)/, "$1\nimport android.os.Bundle;\nimport android.util.Log;\nimport android.content.res.Configuration;");
    m = m.replace(/public class MainActivity extends BridgeActivity\s*\{\s*\}/, "public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        Log.i(\"SF_LIFE\", \"onCreate restored=\" + (savedInstanceState != null));\n        super.onCreate(savedInstanceState);\n    }\n    @Override\n    public void onConfigurationChanged(Configuration c) {\n        Log.i(\"SF_LIFE\", \"configuration changed (handled, no restart)\");\n        super.onConfigurationChanged(c);\n    }\n    @Override\n    public void onDestroy() {\n        Log.i(\"SF_LIFE\", \"onDestroy finishing=\" + isFinishing() + \" changingConfig=\" + isChangingConfigurations());\n        super.onDestroy();\n    }\n}");
    if (!m.includes("SF_LIFE")) throw new Error("Couldn't add start-up logging to MainActivity:\n" + m);
    fs.writeFileSync(ma, m);
  }
}
if (which === "ios" || which === "all") patchIOS();
if (which === "android" || which === "all") patchAndroid();
