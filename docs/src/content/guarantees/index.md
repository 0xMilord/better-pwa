---
layout: docs.njk
title: Guarantees
description: The formal runtime contract of better-pwa. Violations are P0 bugs.
prev: null
next:
  title: "Data Durability"
  path: "/guarantees/data-durability/"
---

# Runtime Guarantees

This document is the **formal runtime contract** of better-pwa. Every guarantee is:

- **Enforced in code** — not aspirational
- **Tested in CI** — regression tests guard every guarantee
- **Observable at runtime** — violations emit events
- **Versioned** — tied to semver major version

If better-pwa violates any guarantee below without triggering a degradation event, it is a **P0 bug**.

## The Four Pillars

| Pillar | Guarantee | In One Sentence |
|--------|-----------|----------------|
| **Data** | User mutations are never lost | Every action eventually reaches the server |
| **Updates** | SW updates never break sessions | New versions deploy without interruption |
| **Consistency** | All tabs see the same state | Open 1 tab or 10 — one coherent unit |
| **Permissions** | Failures never brick the app | Denials handled with clear recovery |

## All Guarantees

| # | Name | Enforced By |
|---|------|-------------|
| G1 | [Data Durability](/guarantees/data-durability/) | IDB + replay engine |
| G2 | Update Safety | Strategy deferral + rollback |
| G3 | Cross-Tab Consistency | BroadcastChannel + leader election |
| G4 | Permission Resilience | Fallback hooks + backoff |
| G5 | Cold Start Integrity | Staged boot + failure isolation |
| G6 | Schema Evolution | Migration gate + atomicity |
| G7 | Resource Prioritization | Priority queue + tagged cache |

## Violation Reporting

```typescript
pwa.on("guarantee:at_risk", (event) => {
  console.error(
    `Guarantee ${event.detail.guarantee} at risk:`,
    event.detail.reason
  )
})
```
