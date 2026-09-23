---
name: Gateway budget periods
description: Boundary and currency decisions for per-key Gateway budgets
---

**Rule:** Daily and monthly Gateway key limits reset at UTC midnight and the first of the UTC month. Enter and explain budgets as USD, then convert to the application's configured quota units for accounting.

**Why:** A single timezone keeps the same limit consistent across replicas and user locations; quota units match the shared wallet's billing ledger even if the user's preferred display currency differs.

**How to apply:** Keep reporting, warning thresholds, and any new billing paths on the same UTC periods and USD-to-quota conversion. Do not use the user's display-currency conversion for a field labelled USD.