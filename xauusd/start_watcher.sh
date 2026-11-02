#!/bin/sh
# Startet den Minuten-Waechter als Hintergrundprozess (falls nicht schon aktiv) und setzt den Lese-Offset ans Dateiende.
cd "$(dirname "$0")"
if [ -f minute.pid ] && kill -0 "$(cat minute.pid)" 2>/dev/null; then echo "laeuft bereits (PID $(cat minute.pid))"; else
  nohup python3 -u minute.py >> minute.out 2>&1 &
  echo $! > minute.pid; sleep 3; echo "gestartet (PID $(cat minute.pid))"; fi
[ -f minute.log ] && stat -c %s minute.log > minute.offset || echo 0 > minute.offset
