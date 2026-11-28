#!/usr/bin/env bash
# Builds the App Store version of StormFile and uploads it to App Store Connect (TestFlight).
# Runs only when the App Store Connect API key is saved in GitHub secrets:
#   APPLE_TEAM_ID, ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 (the contents of the AuthKey_XXXX.p8 file)
# The key needs the Admin role so Xcode can create the signing certificate and profile itself.
set -euo pipefail
if [ -z "${ASC_KEY_P8:-}" ] || [ -z "${APPLE_TEAM_ID:-}" ]; then echo "No App Store Connect key in secrets yet; skipping App Store upload"; exit 0; fi
KEYDIR="$RUNNER_TEMP/asc"; mkdir -p "$KEYDIR"; KEY="$KEYDIR/AuthKey_${ASC_KEY_ID}.p8"
trap 'rm -rf "$KEYDIR"' EXIT
# Rebuild the key file from the secret, fixing common copy-paste damage (Windows line ends, lost line breaks,
# smart quotes or spaces, missing BEGIN/END lines). Prints only the shape of the key, never the key.
ASC_KEY_P8="$ASC_KEY_P8" KEY="$KEY" python3 - <<'PY'
import os, re, base64, sys
raw = os.environ["ASC_KEY_P8"]
body = re.sub(r"-----(BEGIN|END)[^-]*-----", " ", raw)
body = re.sub(r"[^A-Za-z0-9+/=]", "", body)
info = "key check: %d characters pasted, BEGIN line %s, END line %s, %d key characters" % (
    len(raw), "found" if "BEGIN PRIVATE KEY" in raw else "MISSING", "found" if "END PRIVATE KEY" in raw else "MISSING", len(body))
try:
    der = base64.b64decode(body, validate=True)
except Exception:
    der = b""
print(info + ", decodes to %d bytes (a good Apple key is 138)" % len(der))
if len(der) < 100 or der[:1] != b"\x30":
    print("::error::The ASC_KEY_P8 secret is not a complete Apple key. Copy the whole AuthKey .p8 file again (all lines, BEGIN to END) into the secret.")
    sys.exit(1)
b64 = base64.b64encode(der).decode()
open(os.environ["KEY"], "w").write("-----BEGIN PRIVATE KEY-----\n" + "\n".join(b64[i:i+64] for i in range(0, len(b64), 64)) + "\n-----END PRIVATE KEY-----\n")
PY
VERSION=$(node -p "require('./package.json').version")
BUILD=$((100 + ${GITHUB_RUN_NUMBER:-1}))
AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
read -r -a T < .xcode-target
cd ios/App
xcodebuild "${T[@]}" -scheme App -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$RUNNER_TEMP/StormFile.xcarchive" archive \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic \
  MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD" "${AUTH[@]}" -quiet
cat > "$RUNNER_TEMP/export.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>${APPLE_TEAM_ID}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
PLIST
xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/StormFile.xcarchive" -exportOptionsPlist "$RUNNER_TEMP/export.plist" -exportPath "$RUNNER_TEMP/export" "${AUTH[@]}"
echo "UPLOADED StormFile $VERSION ($BUILD) to App Store Connect. It appears in TestFlight after Apple finishes processing (usually 10-30 minutes)."
