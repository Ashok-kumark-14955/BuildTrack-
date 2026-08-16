#!/bin/sh
set -e
echo "[start.sh] Running npm install --omit=dev..."
npm install --omit=dev
echo "[start.sh] Starting server..."
node dist/server.js
