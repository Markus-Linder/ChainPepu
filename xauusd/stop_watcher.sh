#!/bin/sh
cd "$(dirname "$0")"
[ -f minute.pid ] && kill "$(cat minute.pid)" 2>/dev/null && echo "gestoppt" || echo "lief nicht"
rm -f minute.pid
