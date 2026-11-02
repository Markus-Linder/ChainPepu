#!/usr/bin/env python3
"""Wartet auf neue SIGNAL/ERROR-Zeilen in minute.log (Offset in minute.offset), max. N Sekunden.
Gibt die neuen Zeilen aus und endet; ohne Signal endet es nach N Sekunden mit 'TIMEOUT'.
Aufruf: python3 wait_signal.py [sekunden]"""
import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
LOG, OFF, PID = (os.path.join(HERE, f) for f in ("minute.log", "minute.offset", "minute.pid"))
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 560
t0 = time.time()
try: pos = int(open(OFF).read().strip())
except Exception: pos = os.path.getsize(LOG) if os.path.exists(LOG) else 0
while True:
    try:
        pid = int(open(PID).read().strip()); os.kill(pid, 0)
    except Exception:
        print("ERROR|Minuten-Waechter laeuft nicht (Prozess beendet)"); sys.exit(0)
    if os.path.exists(LOG) and os.path.getsize(LOG) > pos:
        with open(LOG) as f:
            f.seek(pos); new = f.read(); pos = f.tell()
        open(OFF, "w").write(str(pos))
        lines = [l for l in new.splitlines() if l.startswith(("SIGNAL|", "ERROR|"))]
        if lines:
            print("\n".join(lines)); sys.exit(0)
    if time.time() - t0 > limit:
        open(OFF, "w").write(str(pos)); print("TIMEOUT"); sys.exit(0)
    time.sleep(2)
