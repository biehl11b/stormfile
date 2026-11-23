#!/bin/sh
# Runs every StormFile check against a local copy of the app.
# Usage: sh tests/run-all.sh   (from the project folder)
cd "$(dirname "$0")/.." || exit 1
PORT=${PORT:-8771}
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
export STORMFILE_URL="http://localhost:$PORT/"
cd tests || exit 1
FAIL=0
for t in test_core.py test_seasons.py test_lock_backup.py test_packet.py test_security.py test_layout.py test_resources.py test_pages.py test_native.py test_a11y.py test_deadlines.py test_share.py; do
  printf '%-22s ' "$t"
  if python3 "$t" > "/tmp/stormfile-$t.log" 2>&1; then echo PASS; else echo FAIL; FAIL=1; tail -40 "/tmp/stormfile-$t.log"; fi
done
printf '%-22s ' "security (sample data)"
if SEC_SAMPLE=1 python3 test_security.py > /tmp/stormfile-sec2.log 2>&1; then echo PASS; else echo FAIL; FAIL=1; tail -40 /tmp/stormfile-sec2.log; fi
exit $FAIL
