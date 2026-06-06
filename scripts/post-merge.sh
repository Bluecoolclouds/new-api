#!/bin/bash
set -e

export PATH="/nix/store/60z37432vmgkg54krwr1z057bqwp7583-go-1.25.5/bin:$PATH"

cd web/default
bun install
DISABLE_ESLINT_PLUGIN=true bun run build
cd ../..

go build -buildvcs=false -o new-api .
