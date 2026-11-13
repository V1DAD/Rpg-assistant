#!/usr/bin/env bash
trap 'kill 0' EXIT   # Ctrl+C stops both servers

(cd pb && ./pocketbase serve --http=0.0.0.0:8090) &
(cd web && npm run dev) &

wait