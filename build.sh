#!/usr/bin/env bash
set -e
(cd web && npm run build)
cd server
mkdir -p ../release
CGO_ENABLED=0 go build -ldflags="-s -w" -o ../release/rpg-assistant .
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o ../release/rpg-assistant.exe .
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o ../release/rpg-assistant-mac .
