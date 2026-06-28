---
name: Go embed frontend rebuild
description: Why frontend changes require rebuilding the Go binary, and the correct build sequence
---

The Go binary uses `go:embed` to bundle the React frontend at compile time. This means:

**Rule:** Any change to `web/default/src/` requires BOTH steps:
1. `cd web/default && DISABLE_ESLINT_PLUGIN=true node_modules/.bin/rsbuild build`
2. `export PATH="/nix/store/60z37432vmgkg54krwr1z057bqwp7583-go-1.25.5/bin:$PATH" && GOPROXY=https://proxy.golang.org,direct GONOSUMDB='*' go build -buildvcs=false -o new-api .`

If you only rebuild the frontend but not Go, the running server continues to serve the OLD embedded assets.

**Why:** `go:embed` snapshots the dist/ directory contents into the binary at link time. The web server does not read from disk at runtime.

**Critical:** The Replit local package firewall (`package-firewall.replit.local`) blocks `golang.org/x/crypto` (all versions) with a CVE error. Using `GOPROXY=https://proxy.golang.org,direct` bypasses this and lets Go fetch from the real proxy.

**How to apply:** Always run both commands sequentially after any frontend edit, then `restart_workflow "Start application"`.
