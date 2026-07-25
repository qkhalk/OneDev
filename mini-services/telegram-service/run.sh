#!/bin/bash
cd "$(dirname "$0")"
while true; do
  echo "[$(date)] Starting telegram service..."
  bun index.ts 2>&1
  EXITCODE=$?
  echo "[$(date)] Service exited with code $EXITCODE, restarting in 5s..."
  sleep 5
done
