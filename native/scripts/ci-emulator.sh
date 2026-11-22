#!/usr/bin/env bash
# Runs the Android test app on a virtual phone and saves screenshots and the app's console messages.
set -x
mkdir -p emu
adb install -r out/StormFile-test.apk
adb logcat -c
adb shell am start -n com.coastlinecode.stormfile/.MainActivity
sleep 25
adb exec-out screencap -p > emu/1-first-open.png
adb logcat -d > emu/logcat-full.txt
grep -E "Capacitor|chromium|Console|StormFile|AndroidRuntime|FATAL" emu/logcat-full.txt > emu/app-log.txt || true
grep -iE "Uncaught|TypeError|ReferenceError|FATAL EXCEPTION" emu/app-log.txt | grep -v "injecting safe area CSS" | wc -l > emu/error-count.txt || true
grep -o "SF_NATIVE_OK.*" emu/logcat-full.txt > emu/native-ok.txt || echo "NO NATIVE OK LINE" > emu/native-ok.txt
adb shell pidof com.coastlinecode.stormfile > emu/running.txt || echo "NOT RUNNING" > emu/running.txt
ls -la emu
