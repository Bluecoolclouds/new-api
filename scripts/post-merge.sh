#!/bin/bash
set -e

cd web/default
bun install
DISABLE_ESLINT_PLUGIN=true bun run build
cd ../..

mkdir -p web/classic/dist
if [ ! -f web/classic/dist/index.html ]; then
  printf '<!DOCTYPE html><html><head><title>New API</title></head><body><div id="root"></div></body></html>' > web/classic/dist/index.html
fi

go build -buildvcs=false -o /tmp/new-api-build .
cp /tmp/new-api-build ./new-api
chmod +x ./new-api
