# AGENTS.md — Production & Development Guide for apinet.cloud (new-api)

> **CRITICAL FOR ALL AI AGENTS**: Read this file in full before proposing, writing, or modifying any code in this repository. This document defines the production environment, non-negotiable operational invariants, custom architecture layers, extension patterns, git hygiene, and upstream synchronization workflows for `apinet.cloud`.

---

## 1. System & Architecture Overview

`new-api` on `apinet` is a high-performance AI API gateway and proxy aggregating 40+ upstream providers behind a unified OpenAI/Claude-compatible API, with user management, dynamic billing, rate limiting, and an administrative dashboard.

- **Host & Path**: `APINET.play2go.cloud` (`ssh apinet`), working directory `/root/apinet`
- **Backend Runtime**: Go 1.22+, Gin web framework, GORM v2 ORM
- **Database**: PostgreSQL 16 on `127.0.0.1:5432` (`newapi` user & db, password in `.env`)
- **Cache & Storage**: Redis on `127.0.0.1:6379` (handles token auth cache, user lookups, IP/GW rate limiting, and performance metrics)
- **Process Manager**: systemd unit `new-api.service` (listening on `127.0.0.1:3000`, reverse-proxied by Nginx)
- **Monitoring & Canary**: `apinet-canary.service` runs `/root/apinet/scripts/canary.py` every 60s, probing active channels
- **Version Control**: Colocated Git + Jujutsu (`jj` v0.25.0 at `/usr/local/bin/jj`). Active branch: `apinet-custom`

```
/root/apinet/
├── controller/     — HTTP controllers (relay, topup, cbr, video_proxy, guest)
├── middleware/     — Gin middlewares (auth, distributor, rate_limit, stats)
├── model/          — GORM models & DB queries (ability, channel, log, user, option)
├── relay/          — Proxy engine & provider adaptors (channel/, task/, common/)
├── service/        — Core business logic (billing, text_quota, quota, channel_select)
├── setting/        — Dynamic system settings and in-memory options
├── scripts/        — Operational daemons (canary.py, healthchecks)
├── router/         — Gin route registries (api, relay, video, web)
└── web/default/    — React 19 administrative dashboard & billing UI
```

---

## 2. Core Operational Invariants (Non-Negotiable Rules)

1. **Billing Quota Invariant**:
   - `1 USD = 500,000 quota units` (`common.QuotaPerUnit`).
   - Every internal calculation, token cost, model ratio, and credit reservation MUST respect this conversion. Never alter `QuotaPerUnit`.

2. **Dynamic Exchange Rate (CBR Oracle) — NEVER HARDCODE RATES**:
   - Russian top-up gateways (FreeKassa, Pally, Plategal) and display settings (`USDExchangeRate`, `custom_currency_exchange_rate`) MUST be dynamically updated via the **5-Source Median Consensus Oracle** in `controller/topup_cbr.go`.
   - The oracle queries:
     1. CBR Mirror JSON (`cbr-xml-daily.ru`)
     2. CBR Official XML (`cbr.ru`)
     3. Open Exchange Rates API (`open.er-api.com`)
     4. ExchangeRate-API v4 (`exchangerate-api.com`)
     5. Coinbase Spot Rates (`api.coinbase.com`)
   - It filters out-of-bounds anomalies (range `[50..200] RUB/USD`) and computes the **mathematical median**, ensuring zero-downtime resilience even if several sources fail.
   - Pally/Plategal unit price formula: `RUB_per_credit = unitPrice / 500,000` (e.g., at 85 ₽/$ -> `0.00017000`).

3. **Channel Status Routing Invariant**:
   - In DB-path routing (`getChannelQuery` in `model/ability.go`), queries MUST filter:
     `channel_id IN (SELECT id FROM channels WHERE status = 1)` (`common.ChannelStatusEnabled`).
   - Disabled channels (`status = 2` manual disable, `status = 3` auto-disable) must NEVER receive production traffic, regardless of whether their abilities are marked `enabled = true`.

4. **Redis & Memory Cache Prerequisite**:
   - The production `.env` MUST specify `MEMORY_CACHE_ENABLED=true` and `REDIS_CONN_STRING=redis://localhost:6379`.
   - Redis eliminates ~15k DB roundtrips/day for auth and token validations.

5. **OpSec & Error Masking**:
   - Upstream URLs, vendor keys, provider accounts, or raw Chinese upstream error bodies must NEVER be exposed to clients.
   - Sanitize via `service/upstream_error.go:NormalizeUpstreamError`.

6. **Safety Rules**:
   - Always use `trash-put` instead of `rm` on local and accessible filesystems.
   - Always use `guisudo` instead of `sudo` for elevated privileges on user hosts.

---

## 3. Customizations Inventory (Monkey Patch Registry)

To maintain clarity between upstream `QuantumNous/new-api` and this production deployment, all custom work is cataloged below:

### A. Isolated Custom Modules (Clean & Non-Conflicting)
- `controller/topup_cbr.go` — 5-source resilient median exchange rate oracle and auto-sync daemon.
- `controller/topup_freekassa.go`, `topup_pally.go`, `topup_platega.go`, `topup_heleket.go` — Russian payment gateway adapters.
- `controller/video_proxy.go` & `router/video-router.go` — White-label persistent video proxy with HTTP 206 Partial Content (Range requests) and Nginx caching.
- `relay/channel/task/together/` — Task adapter for Together.ai video and image generation (Wan 2.6/2.7, Seedream, FLUX).
- `scripts/canary.py` — Background synthetic probe daemon testing channel health every 60s.
- `pkg/guestpolicy/`, `service/guest.go`, `controller/guest.go` — Isolated guest trial engine and contract enforcement.

### B. Core Patches (Upstream Invasions to Preserve During Updates)
- `model/ability.go` (`getChannelQuery`): Subquery filter ensuring disabled channels (`status != 1`) do not receive DB-routed traffic.
- `service/channel_select.go` & `service/upstream_error.go`: `ignoreChannelIds` loop breaker to prevent infinite retry loops during 429/500 cascades.
- `relay/channel/openai/usage.go`: Parsing non-standard Claude `cache_creation_input_tokens` from OpenAI-compatible upstreams.
- `relay/channel/task/suno/adaptor.go`: Lowercased Suno submit actions (`strings.ToLower(info.Action)`).
- `web/default/src/features/dashboard/components/revenue/`: Real-time financial analytics dashboard.
- `web/default/src/features/auth/`: Streamlined login/registration bypassing redundant legal consent blocks.

---

## 4. Extension Philosophy: Native Extension Points vs Core Invasions

When adding new capabilities, **DO NOT monkey-patch core files** like `controller/relay.go`, `service/billing.go`, or `service/text_quota.go`. Use New-API native extension points:

### 1. Gin Middleware Chaining (`middleware/`)
For auth checks, request transformation, trial limits, and security boundaries:
- Implement a standalone middleware function in `middleware/my_feature.go`.
- Register it in `router/` on specific route groups.
- *Example*: Rather than injecting guest trial checks inside `controller/relay.go`, attach a `middleware.GuestShield()` to the Gin route chain.

### 2. Provider Adaptor Registry (`relay/channel/`)
For new upstream AI models or non-standard provider APIs:
- Implement the `Adaptor` interface in `relay/channel/<provider>/adaptor.go`.
- Register the adaptor via `relay.RegisterAdaptor()`.
- Keeps provider conversion logic strictly decoupled from request dispatching.

### 3. Isolated Controllers & Settings (`controller/`, `setting/`, `model/option.go`)
For new integrations, billing methods, or webhooks:
- Add a dedicated controller in `controller/my_feature.go`.
- Register options in `model/option.go` backed by the `options` key-value table.
- Do not modify core database schemas unless strictly necessary.

---

## 5. Git Hygiene & Commit Discipline (Beanp Standard)

### Commit Format
- **Header**: `<subsystem>: <what> (because <why>)` (strictly under 90 chars).
- **One-what, one-why**: The header describes exactly one conceptual change and one causal reason encapsulated in parentheses. Comma-separated lists of changes are forbidden — split into separate commits. Compress to telegraphic precision; defer mechanical detail to the body.
- **Telegraphic `<why>`**: Omit articles (`the`, `a`), use past participles and stative verbs (`crashed`, `lacked`, `blocked`), compress noun phrases. Verbose: `(because the manual model flags were repetitive)`. Telegraphic: `(because manual flags repeated)`.
- **Tone**: Lowercase imperative mood. Never reference chat sessions, reviews, or agent names.
- **Body**: Optional for trivial one-liners. For non-obvious fixes, include 2–4 crisp technical bullet points (e.g. new endpoints, schema migrations, protocol quirks). Never restate the header or dump generic narrative.

### Atomicity & Green Invariant
- **One conceptual change per commit**: A commit addresses exactly one defect fix, one feature addition, or one refactor. "Subsystem" is a boundary constraint, not a grouping instruction — multiple independent fixes within the same subsystem require multiple commits.
- **Green Invariant**: Every commit on a tracked branch MUST pass `go build .` and relevant tests. Never break compilation or test suites — `git bisect` and production deployment depend on this.
- **Verify before committing**: Run `go test` and `go build` before staging and committing. Never commit broken intermediate states.

### Staging Hygiene
- **Explicit staging only**: Never use `git add .`, `git add -A`, or `git commit -a`. Stage target files explicitly (`git add <path>`) or use patch staging (`git add -p`).
- Verify `git status --porcelain` contains only intended files before committing. Never commit local operational artifacts (`.env.bak`, `options-*.sql`, temporary keys).

### Agent-Loop Commit Protocol
- **Work in uncommitted buffers**: Agents must not commit intermediate broken states. Scratch exploration, failed hypotheses, and syntax errors stay in the working tree — never on tracked history.
- **Commit at convergence**: After a logical change is complete, tested, and verified, stage and commit that single change atomically.
- **Squash scratch work per logical change**: If an agent used trial-and-error to reach a fix, squash into one clean commit for that fix. Never squash distinct logical changes together. Never squash across subsystem boundaries.

### Rollback Protocol
- **Atomic revert**: `git revert <sha>`. Format the revert commit header as: `<subsystem>: revert <brief-description> (because <observed regression>)`.
- **Jujutsu Instant Undo**: When using `jj`, you can instantly inspect and reverse any erroneous operation via `jj op log` and `jj op undo`.
- If a sequence of changes fails tests and cannot be fixed forward, discard immediately with `git reset --hard` (or `jj abandon`). Never hack tests to pass.

### Code Comments
- Never add defensive comments explaining what you avoided doing.

---

## 6. Subsystems Registry (apinet)

When crafting commit headers `<subsystem>: <what> (because <why>)`, strictly use the canonical subsystem names:

- `relay`: AI request routing, distributor logic, and provider adaptors (`relay/channel/openai`, `task/together`, `suno`, etc.).
- `billing`: Quota consumption, token calculation, tiered settlement, and pricing formulas (`service/billing.go`, `text_quota.go`).
- `topup`: Payment integrations, payment webhooks, and the CBR exchange rate oracle (`controller/topup_*.go`).
- `model`: GORM data models, channel abilities, database queries, and options (`model/ability.go`, `channel.go`, `option.go`).
- `middleware`: Gin request pipeline middlewares (`auth.go`, `distributor.go`, `rate_limit.go`, `stats.go`).
- `video`: White-label video proxying, chunked streaming, and HTTP 206 Partial Content (`controller/video_proxy.go`, `router/video-router.go`).
- `guest`: Isolated trial service, contract enforcement, and guest quota caps (`pkg/guestpolicy/`, `service/guest.go`, `controller/guest.go`).
- `canary`: Synthetic health probing daemon and automatic channel quarantine (`scripts/canary.py`).
- `web`: Frontend user interface, billing forms, and dashboard (`web/default/`).
- `infra`: Systemd units, Nginx configs, deployment scripts, and Redis configuration.
- `docs`: Developer and agent governance documentation (`AGENTS.md`, `README.md`).

---

## 7. Upstream Synchronization & Rebase Workflow (Jujutsu + Git)

This repository is maintained as a clean commit stack on branch `apinet-custom` on top of upstream `main`.

### Why Rebase over Merge?
Running `git merge upstream/main` creates entangled merge commits that make subsequent updates painful. Because Jujutsu (`jj`) is colocated with Git on `apinet`, we use **linear rebasing**.

### Step-by-Step Upstream Sync:
```bash
cd /root/apinet

# 1. Inspect working copy status (ensure no uncommitted dirty state)
jj status

# 2. Fetch the latest upstream commits
git fetch origin main

# 3. Rebase our custom branch onto fresh upstream
jj rebase -b apinet-custom -d origin/main

# 4. If conflicts arise, list and resolve them cleanly:
jj status
# Edit files to resolve conflict markers (<<< >>>), then:
jj status   # Jujutsu automatically resolves conflicts once markers are gone

# 5. Build and verify test suite
go build -ldflags "-s -w" -o /tmp/new-api-test .
go test ./...

# 6. If anything went wrong, instantly roll back the entire rebase:
jj op log
jj op undo
```

---

## 8. Standard Operating Procedures (Build, Deploy, Verify)

### Building & Deploying the Backend
```bash
ssh apinet "cd /root/apinet && \
  go build -ldflags "-s -w" -o /tmp/new-api-built . && \
  cp /root/apinet/new-api /root/apinet/new-api.bak && \
  mv /tmp/new-api-built /root/apinet/new-api && \
  systemctl restart new-api.service && \
  sleep 3 && systemctl is-active new-api.service"
```

### Health & Log Verification
```bash
# Service status
ssh apinet "systemctl status new-api.service --no-pager -l"

# Real-time canary health check (probes channels every 60s)
ssh apinet "tail -n 25 /root/apinet/logs/canary.log"

# Multi-source CBR Oracle status
ssh apinet "journalctl -u new-api.service -n 50 --no-pager | grep -iE "CBR|Oracle|Consensus""

# Redis cache state
ssh apinet "redis-cli ping && redis-cli dbsize && redis-cli info memory | grep used_memory_human"
```

### Database Access
```bash
ssh apinet "PGPASSWORD=newapi_pass_2024 psql -h 127.0.0.1 -U newapi -d newapi"
```

---

## 9. Preserved Core Coding Conventions

- **JSON Handling**: Always use `common.Marshal()`, `common.Unmarshal()`, `common.DecodeJson()` from `common/json.go`. Never directly call `encoding/json` in business logic.
- **Database Compatibility**: Code must remain compatible with PostgreSQL, MySQL, and SQLite. Use `commonGroupCol` for reserved words and GORM query builders.
- **Frontend**: Located in `web/default/`. Built with React 19, Rsbuild, and Tailwind. Prefer `bun` for frontend package management (`bun install`, `bun run build`).
- **Protected Identifiers**: Maintain project integrity. Do not strip or tamper with core framework attribution headers or project licenses.
