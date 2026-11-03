#!/bin/sh
# Startet den Minuten-Waechter als Hintergrundprozess (falls nicht schon aktiv) und setzt den Lese-Offset ans Dateiende.
# Waehlt einen Python-Interpreter, in dem Pillow funktioniert (System-Pillow kann defekt sein).
cd "$(dirname "$0")"
mkdir -p charts
PY=""
for p in /usr/local/bin/python3 /usr/bin/python3.13 /usr/bin/python3.12 /usr/bin/python3.11 python3; do
  command -v "$p" >/dev/null 2>&1 || continue
  if "$p" -c "from PIL import Image, ImageDraw" >/dev/null 2>&1; then PY="$p"; break; fi
done
[ -z "$PY" ] && PY=python3
command -v "$PY" > python_path 2>/dev/null || echo "$PY" > python_path
echo "python: $PY"
"$PY" selftest.py
if [ -f minute.pid ] && kill -0 "$(cat minute.pid)" 2>/dev/null; then echo "laeuft bereits (PID $(cat minute.pid))"; else
  nohup "$PY" -u minute.py >> minute.out 2>&1 &
  echo $! > minute.pid; sleep 3; echo "gestartet (PID $(cat minute.pid))"; fi
[ -f minute.log ] && stat -c %s minute.log > minute.offset || echo 0 > minute.offset
