---
name: Go embed frontend rebuild
description: Why frontend changes require rebuilding the Go binary
---

**Rule:** Rebuild the Go executable whenever the frontend is rebuilt; restarting an old executable will still serve the old frontend.

**Why:** The server embeds the compiled frontend assets at compile time rather than reading them from disk at runtime.

**How to apply:** After frontend changes, build the frontend first, then rebuild the Go server. Follow the project's current build instructions in replit.md. If Replit's package firewall blocks a pinned dependency, update to a compatible safe release rather than bypassing the firewall.