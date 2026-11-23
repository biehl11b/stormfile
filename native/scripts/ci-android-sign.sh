#!/usr/bin/env bash
# Builds the signed Google Play bundle. Runs as its own step so the signing key
# is never present while packages are being downloaded and installed.
set -euo pipefail
cd android
if [ -z "${ANDROID_KEYSTORE_B64:-}" ]; then
  # No upload key yet: still build the release (store) version so the store test can open it on test phones.
  # It's signed with a throwaway key and named TESTKEY so it can never be mistaken for the Play upload.
  echo "No signing key in secrets yet; building the store version with a throwaway test key (not for upload)"
  TK="$RUNNER_TEMP/testkey.jks"; trap 'rm -f "$TK"' EXIT
  keytool -genkeypair -keystore "$TK" -storepass testkey -alias test -keypass testkey -keyalg RSA -keysize 2048 -validity 30 -dname "CN=StormFile test only" >/dev/null 2>&1
  ./gradlew bundleRelease --no-daemon --stacktrace -Pandroid.injected.signing.store.file="$TK" -Pandroid.injected.signing.store.password=testkey \
    -Pandroid.injected.signing.key.alias=test -Pandroid.injected.signing.key.password=testkey
  cp app/build/outputs/bundle/release/app-release.aab ../out/StormFile-store-TESTKEY.aab
  ls -la ../out; exit 0
fi
KS="$RUNNER_TEMP/upload.jks"
trap 'rm -f "$KS"' EXIT
echo "$ANDROID_KEYSTORE_B64" | base64 -d > "$KS"
./gradlew bundleRelease --no-daemon --stacktrace \
  -Pandroid.injected.signing.store.file="$KS" \
  -Pandroid.injected.signing.store.password="$ANDROID_KEYSTORE_PASSWORD" \
  -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$ANDROID_KEYSTORE_PASSWORD"
cp app/build/outputs/bundle/release/app-release.aab ../out/StormFile-store.aab
ls -la ../out
