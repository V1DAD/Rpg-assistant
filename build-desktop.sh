#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "== web app =="
(cd "$ROOT/web" && npm run build)

echo "== servers =="
cd "$ROOT/server"
mkdir -p "$ROOT/desktop/server" "$ROOT/desktop/server-linux" "$ROOT/desktop/server-win"
export CGO_ENABLED=0
GOOS=linux   GOARCH=amd64 go build -ldflags="-s -w" -o "$ROOT/desktop/server-linux/rpg-assistant" .
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o "$ROOT/desktop/server-win/rpg-assistant.exe" .
cp "$ROOT/desktop/server-linux/rpg-assistant" "$ROOT/desktop/server/rpg-assistant"   # used by `npm start`

echo "== installers =="
cd "$ROOT/desktop"
npm run dist

echo "Done. Look in desktop/dist/"
