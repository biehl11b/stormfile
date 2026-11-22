# Getting StormFile into the App Store and Google Play

The phone apps are built by GitHub Actions ("Build phone apps") whenever the app or the `native/` folder changes. It's the same setup as KidArmor, and it uses the same Apple and Google accounts. The steps below are the parts only the account owner (Josh) can do. Listing text and form answers are in `STORE_LISTING.md`.

## Before either store

1. **Done Nov 22, 2026:** privacy, terms and help pages are live at https://biehl11b.github.io/stormfile/privacy.html, terms.html and support.html, effective November 22, 2026. They move to stormfile.coastlinecode.com once the DNS record below is added.
2. **Web address:** in Bluehost DNS for coastlinecode.com, add a **CNAME** record: host `stormfile`, points to `biehl11b.github.io`. When it shows up, Claude adds the `CNAME` file to the repo and turns on HTTPS in GitHub Pages.
3. **Price: $1.99 one-time download.** On Google, choose **Paid** before the first release, because a free app can't be switched to paid later.

## Google Play (first: Lucas's Pixel)

1. In Play Console (the Coastline Code LLC organization account KidArmor uses), **Create app**: name *StormFile*, app, **Paid**.
2. Make an **upload key** for StormFile (on any computer with Java):
   `keytool -genkeypair -v -keystore stormfile-upload.jks -alias stormfile -keyalg RSA -keysize 2048 -validity 10000`
   Keep the file and its password in a password manager.
3. In GitHub → stormfile repo → **Settings → Secrets and variables → Actions**, add `ANDROID_KEYSTORE_B64` (the file as base64), `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_ALIAS` (`stormfile`).
4. Re-run "Build phone apps" (Actions tab → Run workflow). Download **StormFile-store-bundle** (the `.aab`) from the run's page.
5. Set the price to **$1.99** (Monetize → App pricing), keep **Play App Signing** on, and upload the `.aab` to **Internal testing**. Add Lucas's Google account as a tester and send him the testing link. Internal testers install it without paying.
6. Fill in the store listing, Data safety, content rating, target audience and declarations from `STORE_LISTING.md`. Upload `store/screenshots/android`, `store/play-icon-512.png` and `store/play-feature-1024x500.png`. Then promote the build to **Production**.

Until the signing key is set up, each build still makes a **StormFile-test-apk** you can download from the run page (signed in to GitHub) and install directly on an Android phone. It isn't published anywhere public, since StormFile is a paid app.

## Apple App Store (after KidArmor's Apple account is approved)

1. In **Certificates, Identifiers & Profiles**, register the bundle ID `com.coastlinecode.stormfile`.
2. In **App Store Connect → Apps → +**, create the app: name *StormFile*, bundle ID `com.coastlinecode.stormfile`, SKU `stormfile`, primary language English (U.S.).
3. In GitHub → stormfile repo secrets, add the same App Store Connect key KidArmor uses: `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`.
4. Run "Build phone apps" by hand (Actions tab → Run workflow). The iPhone job builds with Xcode 26 and uploads to **TestFlight** (shows up 10–30 minutes later). No Mac needed.
5. In TestFlight, install it and try: photos, Face ID, a calendar reminder, the claim packet and a backup.
6. Set the price to $1.99 (the Paid Apps agreement and Small Business Program carry over from KidArmor). Fill in the App Store page from `STORE_LISTING.md`, upload `store/screenshots/iphone`, answer App Privacy (**Data Not Collected**), age rating and export compliance, pick the TestFlight build and **Submit for Review**.

## What's already done in the code

- Same web app as the test version, with the tester notes and the storm-alert demo turned off in the store version.
- Uses the phone's own share sheet (backups, PDFs, letters), Face ID / fingerprint, and calendar (reminders that repeat every year).
- Built with Xcode 26 / iOS 26 SDK and targets Android API 36, as the stores require.
- Apple privacy manifest, permission explanations, export-compliance flag; iPhone-only so no iPad screenshots are needed.
- Android: only the permissions StormFile uses; records are kept out of Google cloud backups and phone-to-phone transfers (people use StormFile's own locked backup).
- Fonts and the PDF library are inside the app. StormFile makes no network requests of its own.
- Automated checks: `sh tests/run-all.sh` (features, lock and backup, claim packet, security, phone layouts, state help, store pages and the phone-app build).
