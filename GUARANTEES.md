---
# Runtime Guarantees: better-pwa

| Metadata | Details |
|----------|---------|
| **Project** | `better-pwa` |
| **Version** | 1.0 (Draft) |
| **Status** | 🟡 In Review |
| **Last Updated** | 2026-04-04 |
| **Owner** | Core Engineering Team |

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Four Pillars](#2-the-four-pillars)
3. [Guarantee 1: Data Durability](#3-guarantee-1-data-durability)
4. [Guarantee 2: Update Safety](#4-guarantee-2-update-safety)
5. [Guarantee 3: Cross-Tab Consistency](#5-guarantee-3-cross-tab-consistency)
6. [Guarantee 4: Permission Resilience](#6-guarantee-4-permission-resilience)
7. [Guarantee 5: Cold Start Integrity](#7-guarantee-5-cold-start-integrity)
8. [Guarantee 6: Schema Evolution](#8-guarantee-6-schema-evolution)
9. [Guarantee 7: Resource Prioritization](#9-guarantee-7-resource-prioritization)
10. [Violation Reporting](#10-violation-reporting)
11. [Scope & Limitations](#11-scope--limitations)
12. [Appendix](#12-appendix)

---

## 1. Overview

This document is the **formal runtime contract** of better-pwa. Every guarantee listed here is:

- **Enforced in code** — not aspirational, not "best effort"
- **Tested in CI** — regression tests guard every guarantee
- **Observable at runtime** — violations emit events and are reportable
- **Versioned** — guarantees are tied to the semver major version

If better-pwa violates any guarantee below without triggering a degradation event, it is a **P0 bug** and will be patched immediately.

---

## 2. The Four Pillars

better-pwa guarantees four things unconditionally. Everything else is a feature; these are **promises**.

| Pillar | Guarantee | In One Sentence |
|--------|-----------|----------------|
| **Data** | User mutations are never lost | Offline or online, every action eventually reaches the server |
| **Updates** | SW updates never break active sessions | New versions deploy without interrupting users mid-flow |
| **Consistency** | All tabs see the same state | Open 1 tab or 10 — the app behaves as one coherent unit |
| **Permissions** | Permission failures never brick the app | Denials are handled gracefully with clear recovery paths |

---

## 3. Guarantee 1: Data Durability

> **If a user performs an action in the app, that action is persisted and eventually delivered — even if the browser crashes, the tab closes, or the network drops for hours.**

### 3.1 Contract

| Guarantee | Specification | Enforcement |
|-----------|---------------|-------------|
| **At-Least-Once Delivery** | Every queued mutation is delivered ≥1 time after reconnect | IDB transaction + replay engine |
| **Crash Durability** | Queue survives browser crash, tab kill, and device reboot | IndexedDB write-before-navigation |
| **No Silent Drops** | If replay fails after max retries, an error event is emitted — never silently dropped | `mutation:failed` event |
| **Order Preservation** | Mutations to the same resource are replayed in FIFO order | Per-resource queue partitioning |
| **Idempotency Support** | Each mutation carries a unique ID for server-side deduplication | UUIDv4 in `MutationEntry.id` |

### 3.2 Violation Conditions

A violation occurs if:
- A mutation is removed from the queue without successful server acknowledgment
- A mutation is lost due to IDB write failure (without retry)
- Replay completes out of order for the same resource

### 3.3 Degradation Behavior

| Condition | Behavior |
|-----------|----------|
| IDB unavailable | Queue falls back to memory with warning; app continues (durability reduced, not broken) |
| Max retries exceeded | Mutation marked `failed`, `mutation:failed` event emitted, app can retry or alert user |
| Browser crashes during write | IDB transaction rolls back; mutation remains in queue for next boot |

---

## 4. Guarantee 2: Update Safety

> **A service worker update will never interrupt an active user session or leave the app in a broken state.**

### 4.1 Contract

| Guarantee | Specification | Enforcement |
|-----------|---------------|-------------|
| **No Mid-Session Interruption** | Active sessions are never terminated by an update (unless `hard` strategy is explicit) | `soft`/`gradual`/`on-reload` strategies defer activation |
| **No Update Loops** | The system detects and prevents infinite update cycles | Hash comparison + cycle detection (max 2 cycles triggers alert) |
| **Rollback on Failure** | If SW activation fails, the previous version is restored | Pre-activation checkpoint, rollback on `skipWaiting` error |
| **Deterministic Rollout** | The same user always receives the same version during gradual rollout | Deterministic hash: `hash(seed + userId) % 100 < rollout%` |
| **Update Visibility** | The app is always notified when an update is available | `update:available` event emitted within 1 SW lifecycle tick |

### 4.2 Violation Conditions

A violation occurs if:
- A SW update causes a blank page, JS error, or broken session
- An update loop triggers (>2 consecutive update cycles)
- A rollback fails and no error is emitted

### 4.3 Degradation Behavior

| Condition | Behavior |
|-----------|----------|
| New SW fails to activate | Previous SW remains active, `sw:activation_failed` event emitted |
| Update detection fails | Polling interval doubles (max 4x), `sw:detection_degraded` event emitted |
| Gradual rollout service unavailable | Falls back to `soft` strategy for all users |

---

## 5. Guarantee 3: Cross-Tab Consistency

> **All open tabs of the app share a single source of truth. No tab ever sees stale or conflicting state.**

### 5.1 Contract

| Guarantee | Specification | Enforcement |
|-----------|---------------|-------------|
| **Atomic State Propagation** | State changes propagate to all tabs within 50ms | BroadcastChannel with acknowledgment |
| **Leader Election** | Only one tab coordinates mutation replay and SW activation | Timeout-based election, re-election on disconnect |
| **No Duplicate Replays** | The same mutation is never replayed twice due to multi-tab coordination | Leader-only replay, deduplication via `revisionId` |
| **Tab Count Accuracy** | Active tab count is accurate even on crash/force-close | `beforeunload` + heartbeat timeout (5s) |
| **State Deduplication** | Duplicate state updates from multiple sources are merged | LRU cache of `revisionId`s (max 100) |

### 5.2 Violation Conditions

A violation occurs if:
- Two tabs hold different values for the same state key (after 50ms propagation window)
- A mutation is replayed by more than one tab
- Tab count is off by >1 for >5 seconds

### 5.3 Degradation Behavior

| Condition | Behavior |
|-----------|----------|
| BroadcastChannel unavailable | Tabs operate independently with warning; no cross-tab guarantees apply |
| Leader tab crashes | Immediate re-election (<100ms); replay resumes from checkpoint |
| State propagation exceeds 50ms | `state:propagation_slow` event emitted; continues attempting sync |

---

## 6. Guarantee 4: Permission Resilience

> **Permission denials never leave the app in an unrecoverable state. Every denial has a defined path forward.**

### 6.1 Contract

| Guarantee | Specification | Enforcement |
|-----------|---------------|-------------|
| **No Silent Denials** | Every denied permission triggers either a fallback UI hook or a `permission:denied` event | Event bus guarantee |
| **Batch Deduplication** | Already-granted permissions are skipped in batch requests | Cached state check before prompt |
| **Retry with Backoff** | Auto-retries follow exponential backoff (1s, 2s, 4s, 8s) — never spam prompts | Backoff scheduler |
| **State Invalidation** | Permission state is re-checked on `visibilitychange` (user may have granted in settings) | Visibility change listener |
| **Cross-Tab Sync** | Permission state is consistent across all tabs | IDB persistence + BroadcastChannel |

### 6.2 Violation Conditions

A violation occurs if:
- A permission denial is silently swallowed (no event, no fallback)
- Auto-retries fire faster than the backoff schedule
- Permission state differs between tabs (after 50ms propagation window)

### 6.3 Degradation Behavior

| Condition | Behavior |
|-----------|----------|
| Browser doesn't support batch requests | Falls back to sequential requests with UX explanation |
| Fallback UI fails to render | `permission:fallback_failed` event emitted; raw denial state exposed to app |
| Backoff state lost (tab close) | Resets on next tab open; no infinite backoff persists |

---

## 7. Guarantee 5: Cold Start Integrity

> **The app boots deterministically regardless of how long it has been since the last session, what state the cache is in, or what updates are pending.**

### 7.1 Contract

| Guarantee | Specification | Enforcement |
|-----------|---------------|-------------|
| **Staged Boot** | Cold start follows a deterministic sequence: hydrate UI → sync critical data → apply updates → replay mutations | `pwa.boot.strategy("staged")` |
| **No Boot Race Conditions** | Each stage completes before the next begins; no parallel initialization | Stage gates with Promise barriers |
| **Stale Cache Handling** | If cache is older than TTL, it is invalidated before use | `cache:max_age` check in SW |
| **Graceful Degradation** | If any stage fails, the app still boots with reduced capability (not broken) | Failure isolation per stage |

### 7.2 Boot Sequence

```
Stage 1: HYDRATE
  → Load cached UI shell
  → Restore last known state
  → Render app skeleton

Stage 2: SYNC CRITICAL
  → Check network connectivity
  → Fetch essential data (config, auth tokens)
  → Validate cache freshness

Stage 3: APPLY UPDATES
  → Check for pending SW updates
  → Apply if strategy permits (no active session)
  → Defer if user is mid-session

Stage 4: REPLAY MUTATIONS
  → Leader tab begins replay
  → Process queue (FIFO, prioritized)
  → Emit sync events
```

### 7.3 Violation Conditions

A violation occurs if:
- A stage begins before the previous stage completed
- Stale cache is served past its TTL without validation
- Boot fails entirely (not degraded — fully broken)

### 7.4 Degradation Behavior

| Condition | Behavior |
|-----------|----------|
| Stage 2 fails (no network) | App boots with cached data, offline mode activated |
| Stage 3 fails (update activation error) | Previous version continues, update deferred |
| Stage 4 fails (replay error) | App boots, `boot:replay_failed` event emitted, queue preserved |

---

## 8. Guarantee 6: Schema Evolution

> **State stored by a previous version of the app remains readable and correct after the app updates — no data loss from schema changes.**

### 8.1 Contract

| Guarantee | Specification | Enforcement |
|-----------|---------------|-------------|
| **Migration Execution** | Registered migrations run before any state is read after version change | `pwa.migrations.register(version, fn)` |
| **No Unmigrated Reads** | State is never served to the app in an outdated schema | Migration gate blocks reads until applied |
| **Migration Atomicity** | If a migration fails, the previous schema is preserved and the app boots with a warning | Transaction-based migration with rollback |
| **Backward Compatibility Window** | Migrations are supported for the previous N versions (default: 3) | Configurable `migrationWindow` |

### 8.2 API

```typescript
pwa.migrations.register("v2", (state) => ({
  ...state,
  // v1 had flat permissions; v2 nests them
  permissions: { granted: state.permissions, denied: [] }
}))

pwa.migrations.register("v3", (state) => ({
  ...state,
  // v2 had boolean isOffline; v3 adds connectionType
  connectionType: state.isOffline ? null : "4g"
}))
```

### 8.3 Violation Conditions

A violation occurs if:
- State is read before migrations complete
- A migration fails and the app crashes (not degraded gracefully)
- Data is lost during migration (previous schema must be preserved)

---

## 9. Guarantee 7: Resource Prioritization

> **Critical resources (auth, checkout, core data) are always synced, cached, and replayed before non-critical resources (analytics, logging, decorative assets).**

### 9.1 Contract

| Guarantee | Specification | Enforcement |
|-----------|---------------|-------------|
| **Priority-Aware Replay** | High-priority mutations are replayed before low-priority ones | Priority queue ordering |
| **Priority-Aware Eviction** | Low-priority cached assets are evicted first under storage pressure | Priority-tagged cache entries |
| **Priority-Aware Sync** | High-priority resources sync first on reconnect; low-priority deferred | Sync scheduler with priority tiers |
| **Default Priority Assignment** | Every resource has a default priority (presets define mappings) | `pwa.priority.set()` API |

### 9.2 API

```typescript
pwa.priority.set({
  critical: ["auth", "checkout", "user-profile"],
  high: ["orders", "messages"],
  normal: ["settings", "preferences"],
  low: ["analytics", "telemetry"]
})
```

### 9.3 Violation Conditions

A violation occurs if:
- A low-priority mutation is replayed before a high-priority one (from the same queue)
- A critical cached asset is evicted while a decorative asset remains

---

## 10. Violation Reporting

### 10.1 Runtime Detection

Every guarantee has a corresponding runtime checker. When a guarantee is at risk:

```typescript
// Automatic event emission
pwa.on("guarantee:at_risk", (event) => {
  console.error(`Guarantee ${event.detail.guarantee} at risk:`, event.detail.reason)
})
```

### 10.2 Violation Event Schema

```typescript
interface GuaranteeViolationEvent {
  guarantee: string        // e.g., "data_durability", "update_safety"
  severity: "warning" | "critical"
  reason: string           // Human-readable description
  context: Record<string, unknown>  // Debug data
  timestamp: number
}
```

### 10.3 CI Enforcement

- All guarantees have integration tests in the CI pipeline
- Guarantee regressions block releases (P0 gate)
- Fuzz testing targets edge cases in replay, sync, and migration logic

---

## 11. Scope & Limitations

### 11.1 What These Guarantees Cover

- Runtime behavior in supported browsers (see [Browser Support](./PRD.md#91-browser-support-matrix))
- Correct usage of the API (misconfiguration may degrade capability but not violate guarantees)
- Server-side cooperation (for data durability, the server must accept idempotent requests)

### 11.2 What These Guarantees Do NOT Cover

- **Browser bugs** — If Chromium drops IndexedDB writes, we degrade gracefully but cannot guarantee durability
- **Server failures** — If the server rejects valid requests, mutations remain queued (not lost)
- **User actions** — Force-killing the browser during an IDB transaction may lose the in-flight write (mitigated by transaction rollback)
- **Network partitions >7 days** — Mutation queue persists, but TTL-expired entries may be evicted (configurable)

### 11.3 Degradation vs. Violation

| Term | Definition |
|------|-----------|
| **Degradation** | A capability is reduced (e.g., no cross-tab sync if BroadcastChannel fails) — no guarantee violated |
| **Violation** | A guarantee is broken (e.g., mutation lost without error event) — P0 bug |

---

## 12. Appendix

### 12.1 Guarantee Summary

| # | Guarantee | Pillar | Enforced By |
|---|-----------|--------|-------------|
| G1 | Data Durability | Data | IDB + replay engine + at-least-once delivery |
| G2 | Update Safety | Updates | Strategy deferral + rollback + cycle detection |
| G3 | Cross-Tab Consistency | Consistency | BroadcastChannel + leader election + deduplication |
| G4 | Permission Resilience | Permissions | Fallback hooks + backoff + state invalidation |
| G5 | Cold Start Integrity | Data | Staged boot + failure isolation |
| G6 | Schema Evolution | Data | Migration gate + atomicity + rollback |
| G7 | Resource Prioritization | Data | Priority queue + tagged cache entries |

### 12.2 Related Documents

- [Product Requirements](./PRD.md)
- [Architecture](./ARCHITECTURE.md)
- [Features](./FEATURES.md)
- [Roadmap](./ROADMAP.md)

### 12.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-04-04 | Core Team | Initial runtime contract |

---

*This document is a binding contract. Violations are P0 bugs. Changes require engineering + product sign-off.*