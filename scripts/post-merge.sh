#!/bin/bash
set -e

NODE=/nix/store/cikdc61gfwvdma6y0p9b5d5d448aqcv6-nodejs-24.12.0/bin/node
export PATH="$(dirname "$NODE"):$PATH"

cd web/default
node node_modules/.bin/rsbuild build
cd ../..

go build -buildvcs=false -o new-api .
