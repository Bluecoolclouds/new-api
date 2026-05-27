---
name: Go embed frontend rebuild
description: Why frontend changes require rebuilding the Go binary, and the correct build sequence
---

The Go binary uses `go:embed` to bundle the React frontend at compile time. This means:

**Rule:** Any change to `web/default/src/` requires BOTH steps:
1. `npm --prefix web/default run build` — produces new hashed JS/CSS in `web/default/dist/`
2. `sleep 25 && go build -o new-api .` — embeds new dist into the binary

If you only rebuild the frontend but not Go, the running server continues to serve the OLD embedded assets. The new hashed filenames won't be served at all, so no UI change is visible.

**Why:** `go:embed` snapshots the dist/ directory contents into the binary at link time. The web server does not read from disk at runtime.

**How to apply:** Always run both commands sequentially after any frontend edit. The `sleep 25` guard avoids a git index.lock race condition in the Replit environment.
