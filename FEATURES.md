---
# Feature Specification: better-pwa

| Metadata | Details |
|----------|---------|
| **Project** | `better-pwa` |
| **Version** | 1.0 (Draft) |
| **Status** | 🟡 In Review |
| **Last Updated** | 2026-04-04 |
| **Owner** | Product & Engineering |

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Feature Matrix](#2-feature-matrix)
3. [State of the App Engine](#3-state-of-the-app-engine)
4. [Deployment & Update Lifecycle](#4-deployment--update-lifecycle)
5. [Permission & Capability Orchestrator](#5-permission--capability-orchestrator)
6. [Data Consistency & Storage Layer](#6-data-consistency--storage-layer)
7. [Coordination & Observability](#7-coordination--observability)
8. [Extensibility & Growth](#8-extensibility--growth)
9. [Feature Flags & Configuration](#9-feature-flags--configuration)
10. [Framework Integration](#10-framework-integration)
11. [CLI & Developer Tools](#11-cli--developer-tools)
12. [Acceptance Criteria Summary](#12-acceptance-criteria-summary)
13. [Appendix](#13-appendix)

---

## 1. Feature Overview

`better-pwa` provides a **complete PWA runtime** that replaces fragmented boilerplate with a unified, production-grade platform. This document specifies every feature, its API surface, behavioral requirements, and acceptance criteria.

### 1.1 Feature Categories

| Category | Features | Maturity Target |
|----------|----------|----------------|
| **Core** | State Engine, Lifecycle Bus, Update Controller | v0.1 |
| **Lifecycle** | Permission Orchestrator, Install Intelligence | v0.2 |
| **Data** | Offline Queue, Storage Abstraction, Conflict Resolution | v0.3 |
| **Platform** | Multi-Tab Sync, Observability, Plugin System | v0.4 |
| **Production** | Security Layer, Distribution Engine, CLI | v1.0 |

---

## 2. Feature Matrix

| Feature ID | Feature Name | Priority | Target Version | Status |
|------------|--------------|----------|----------------|--------|
| F-01 | State of the App Engine | P0 | v0.1 | 🟡 Planned |
| F-02 | Update UX System | P0 | v0.2 | 🟡 Planned |
| F-03 | Permission Orchestrator | P0 | v0.2 | 🟡 Planned |
| F-04 | Offline Mutation Queue | P0 | v0.3 | 🟡 Planned |
| F-04b | Conflict Resolution Extensibility | P1 | v0.3 | 🟡 Planned |
| F-04c | Resource Priority System | P1 | v0.3 | 🟡 Planned |
| F-05 | Storage Abstraction | P1 | v0.3 | 🟡 Planned |
| F-06 | Multi-Tab Sync | P1 | v0.4 | 🟡 Planned |
| F-07 | Observability Layer | P1 | v0.4 | 🟡 Planned |
| F-08 | Plugin System | P1 | v0.4 | 🟡 Planned |
| F-09 | Security Layer | P1 | v1.0 | 🟡 Planned |
| F-10 | Growth Engine | P2 | v1.0 | 🟡 Planned |
| F-11 | CLI & DevTools | P1 | v1.0 | 🟡 Planned |
| F-12 | Framework Adapters | P1 | v0.3-v1.0 | 🟡 Planned |
| F-13 | State Migrations & Versioning | P0 | v0.2 | 🟡 Planned |
| F-14 | Capability Confidence Layer | P2 | v0.4 | 🟡 Planned |
| F-15 | Opinionated Presets | P0 | v0.1 | 🟡 Planned |
| F-16 | Dev-Time Simulator | P1 | v0.2 | 🟡 Planned |

---

## 3. State of the App Engine

**Feature ID:** F-01 | **Priority:** P0 | **Target:** v0.1

### 3.1 Description

A unified, reactive state object that serves as the single source of truth for all application environment variables. Replaces scattered checks (`navigator.onLine`, `window.matchMedia`, IDB queries) with one cohesive API.

### 3.2 State Schema

```typescript
interface PwaState {
  // Network
  isOffline: boolean;                    // Current connectivity status
  connectionType: "slow-2g" | "2g" | "3g" | "4g" | null;

  // Installation
  isInstalled: boolean;                  // PWA installed via prompt or native
  installMethod: "prompt" | "auto" | null;
  canInstall: boolean;                   // beforeinstallprompt available

  // Updates
  hasUpdate: boolean | string;           // true or version string
  updateStrategy: "soft" | "hard" | "gradual" | "on-reload";
  updateProgress: number;                // 0-100 download progress

  // Permissions
  permissions: Record<string, PermissionState>;
  // e.g., { camera: "granted", microphone: "prompt", "file-system": "denied" }

  // Storage
  storage: {
    usage: number;                       // Bytes used
    quota: number;                       // Bytes available
    engine: "opfs" | "idb" | "memory";  // Active storage engine
    utilizationPercent: number;          // usage / quota * 100
  };

  // Environment
  isSecureContext: boolean;              // HTTPS or localhost
  isStandalone: boolean;                 // Display mode
  tabCount: number;                      // Active tabs in this origin
}
```

### 3.3 API Surface

```typescript
// Read current state
const state = pwa.state().snapshot()

// Subscribe to specific keys
const unsubscribe = pwa.state().subscribe(
  ["isOffline", "hasUpdate"],
  (diff) => {
    if (diff.isOffline !== undefined) {
      console.log("Network changed:", diff.isOffline ? "offline" : "online")
    }
    if (diff.hasUpdate) {
      showUpdatePrompt(diff.hasUpdate)
    }
  }
)

// Manual state override (advanced use cases)
await pwa.state().set("hasUpdate", "v2.3.1")

// Reset to defaults
await pwa.state().reset()
```

### 3.4 Behavioral Requirements

| Requirement | Specification |
|-------------|---------------|
| Propagation latency | <50ms across tabs via BroadcastChannel |
| Persistence | Critical state survives page reloads (IDB-backed) |
| Immutability | Snapshots are frozen; mutations produce new objects |
| Atomicity | Multi-key updates fire subscribers once |
| Framework hooks | React: `usePwaState()`, Vue: `usePwaState()`, Svelte: `pwaState` store |

### 3.5 Acceptance Criteria

- [ ] State updates are atomic and consistent across all open tabs
- [ ] No race conditions between Service Worker and main thread state
- [ ] Framework adapters render state changes within 1 animation frame (16ms)
- [ ] State persists across page reloads for `isInstalled` and `permissions`
- [ ] Subscription unsubscribe works correctly, no memory leaks

---

## 4. Deployment & Update Lifecycle

**Feature ID:** F-02 | **Priority:** P0 | **Target:** v0.2

### 4.1 Description

Declarative management of Service Worker update strategies, background swaps, gradual rollouts, and custom UI prompts. Solves the #1 cause of PWA failures in production.

### 4.2 Update Strategies

| Strategy | Behavior | Activation Trigger | Use Case |
|----------|----------|-------------------|----------|
| `soft` | New SW downloads and waits. Activates on next navigation. | User navigates away and returns | Content sites, dashboards, blogs |
| `hard` | Immediate `skipWaiting()` + `window.location.reload()`. | Update detected | Critical bug fixes, security patches |
| `gradual` | X% of sessions receive update over Y hours. | Configurable rollout schedule | Large user bases, A/B testing |
| `on-reload` | Update applies only when all tabs are closed and a new one opens. | All tabs closed, new tab opened | E-commerce, long-session apps |

### 4.3 API Surface

```typescript
// Set strategy
pwa.update.setStrategy("gradual", {
  rollout: 0.2,        // 20% of users
  window: "4h",        // Over 4 hours
  seed: user.id        // Deterministic assignment
})

// Listen for updates
pwa.update.on("update_available", (version) => {
  showToast(`Version ${version} is ready`)
})

// Manual activation
await pwa.update.activate()

// Check current status
const status = pwa.update.status()
// { current: "v2.3.0", waiting: "v2.3.1", strategy: "soft" }
```

### 4.4 Update State Machine

```
[IDLE] ───detect()───▶ [DOWNLOADING] ───ready()───▶ [WAITING]
  ▲                       │                            │
  │                       ▼                            ▼
  │                 [FAILED]                     [ACTIVATING]
  │                       │                            │
  └───────────────────────┴────────────────────────▶ [IDLE]
                         skip()
```

### 4.5 Behavioral Requirements

| Requirement | Specification |
|-------------|---------------|
| Detection interval | Poll SW hash every 60s (configurable) |
| Activation latency | <2s from `activate()` call to page reload |
| No update loops | Detect and prevent infinite update cycles |
| Session awareness | Do not interrupt active transactions during update |
| Rollback support | Revert to previous SW if activation fails |

### 4.6 Acceptance Criteria

- [ ] Update detection within 1 SW lifecycle tick (~60s default)
- [ ] Strategy switching is runtime-configurable without page reload
- [ ] No update loops or double-activations in multi-tab scenarios
- [ ] Gradual rollout assignment is deterministic (same user gets same version)
- [ ] Failed activation triggers rollback and error reporting

---

## 5. Permission & Capability Orchestrator

**Feature ID:** F-03 | **Priority:** P0 | **Target:** v0.2

### 5.1 Description

Batched, state-tracked, and resilient permission management with retry logic and fallback handling. Reduces permission prompts by 60%+.

### 5.2 Supported Capabilities

| Capability | API | Browser Support | Notes |
|------------|-----|-----------------|-------|
| Camera | `navigator.mediaDevices.getUserMedia()` | All modern | Part of standard WebRTC |
| Microphone | `navigator.mediaDevices.getUserMedia()` | All modern | Part of standard WebRTC |
| File System | `window.showOpenFilePicker()` | Chromium 86+ | Fugu API |
| Bluetooth | `navigator.bluetooth.requestDevice()` | Chromium 56+ | Fugu API |
| Geolocation | `navigator.geolocation.getCurrentPosition()` | All modern | Standard API |
| Notifications | `Notification.requestPermission()` | All modern | Standard API |
| Clipboard | `navigator.clipboard.readText()` | Chromium 66+ | Standard API |
| Contacts | `navigator.contacts.select()` | Chromium 89+ | Fugu API |

### 5.3 API Surface

```typescript
// Batch request
const results = await pwa.permissions.request([
  "camera",
  "microphone",
  "file-system"
])
// { camera: "granted", microphone: "denied", "file-system": "prompt" }

// Check cached status (no prompt)
const status = pwa.permissions.status()
// { camera: "granted", microphone: "denied" }

// Handle denials
pwa.permissions.on("denied", (permission, fallback) => {
  fallback.show({
    title: "Camera Access Needed",
    message: "Please enable camera in settings to continue.",
    action: "Open Settings"
  })
})

// Request with context (better UX)
await pwa.permissions.request("camera", {
  reason: "To scan QR codes",
  prePrompt: () => showCustomModal("We need your camera")
})
```

### 5.4 Retry Strategy

| Attempt | Delay | Trigger |
|---------|-------|---------|
| 1 | Immediate | Initial request |
| 2 | 1s | Auto-retry (user may have changed mind) |
| 3 | 2s | Auto-retry |
| 4 | 4s | Auto-retry (final) |
| Manual | User-initiated | "Try Again" button bypasses backoff |

**State Invalidation:** Permission state is re-checked on `visibilitychange` (user may have granted in browser settings).

### 5.5 Behavioral Requirements

| Requirement | Specification |
|-------------|---------------|
| Batch deduplication | Skip already-granted permissions in batch |
| Fallback latency | Fallback UI shown within 200ms of denial |
| Cross-tab sync | Permission state consistent across all tabs |
| Persistence | Permission state cached in IDB (survives reload) |
| Pre-prompt hook | Optional custom UI before browser prompt |

### 5.6 Acceptance Criteria

- [ ] Batch requests reduce permission prompts by 60%+ vs individual requests
- [ ] Fallback UI is shown within 200ms of denial
- [ ] Permission state is consistent across all open tabs
- [ ] Retry backoff respects exponential schedule
- [ ] Pre-prompt hook integrates with any UI framework

---

## 6. Data Consistency & Storage Layer

**Feature ID:** F-04, F-05 | **Priority:** P0, P1 | **Target:** v0.3

### 6.1 Description

Turns asset caching into a real offline application platform. Provides mutation queuing, optimistic updates, conflict resolution, and unified storage abstraction.

### 6.2 Offline Mutation Queue

#### 6.2.1 Queue Architecture

```typescript
interface MutationEntry {
  id: string;                    // UUIDv4
  type: "create" | "update" | "delete";
  resource: string;              // e.g., "/api/orders/123"
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload: unknown;              // Serializable data
  headers?: Record<string, string>;
  timestamp: number;             // ms epoch
  retryCount: number;
  maxRetries: number;            // Default: 5
  conflictStrategy: "lww" | "merge" | "manual";
  metadata?: Record<string, unknown>;
}
```

#### 6.2.2 Replay Engine

```
[Offline Action] ─▶ [Enqueue to IDB] ─▶ [Optimistic UI Update]
                           │
                    (user goes offline)
                           │
                    [Queue persists]
                           │
                    (user comes online)
                           ▼
               ┌──────────────────────┐
               │   Replay Engine      │
               │ 1. Dequeue FIFO      │
               │ 2. Execute request   │
               │ 3. On success: drop  │
               │ 4. On failure: retry │
               └──────────────────────┘
```

#### 6.2.3 Conflict Resolution Strategies

| Strategy | Behavior | When to Use |
|----------|----------|-------------|
| `lww` (Last Write Wins) | Server value wins if conflict detected | Non-critical data, drafts |
| `merge` | Attempt JSON merge patch | Structured data with independent fields |
| `manual` | Queue conflict, emit event for app to resolve | Critical data (orders, payments) |

### 6.3 Storage Abstraction

#### 6.3.1 Engine Hierarchy

```
┌─────────────────────────────────────────────┐
│  Engine Selection Logic                      │
├─────────────────────────────────────────────┤
│  if (supportsOPFS && value.size > 1MB)      │
│    → OPFS (Origin Private File System)      │
│  else if (supportsIDB)                      │
│    → IndexedDB                               │
│  else                                       │
│    → Memory (with console warning)          │
└─────────────────────────────────────────────┘
```

#### 6.3.2 API Surface

```typescript
// Basic CRUD
await pwa.storage.set("user:123", { name: "Alice" })
const user = await pwa.storage.get("user:123")
await pwa.storage.delete("user:123")

// Engine override
await pwa.storage.set("large-file", blob, { engine: "opfs" })

// Quota monitoring
const quota = await pwa.storage.quota()
// { usage: 45_000_000, quota: 2_000_000_000, percent: 2.25 }

// Eviction policies
await pwa.storage.evict("lru")   // Least Recently Used
await pwa.storage.evict("lfu")   // Least Frequently Used
await pwa.storage.evict("ttl")   // Expired entries only

// Key listing
const keys = await pwa.storage.keys("user:*")
```

#### 6.3.3 Quota Management

| Threshold | Action |
|-----------|--------|
| 60% utilization | Emit `storage:quota_low` warning |
| 80% utilization | Trigger automatic eviction (LRU by default) |
| 95% utilization | Block new writes, emit `storage:quota_critical` |

### 6.4 Behavioral Requirements

| Requirement | Specification |
|-------------|---------------|
| Queue durability | Survives page reloads, browser restarts, crashes |
| Replay guarantee | At-least-once delivery (no dropped mutations) |
| Parallelization | Independent mutations (same resource) execute in parallel |
| Backoff schedule | 1s, 2s, 4s, 8s, 16s (max 5 retries) |
| Engine transparency | App can query which engine is active |

### 6.5 Acceptance Criteria

- [ ] Mutation queue survives page reloads and browser restarts
- [ ] Replay engine guarantees at-least-once delivery
- [ ] Conflict resolution strategy is configurable per queue
- [ ] Engine selection is transparent and configurable
- [ ] Quota monitoring triggers eviction before app breaks
- [ ] Eviction policies respect TTL and access patterns

---

### 6.6 Conflict Resolution Extensibility

**Feature ID:** F-04b | **Priority:** P1 | **Target:** v0.3

#### 6.6.1 Description

Built-in strategies (LWW, merge, manual) cover common cases. Production apps need domain-aware conflict resolution — custom logic per resource type, CRDT-style merging, and server-guided resolution.

#### 6.6.2 Custom Resolver Registration

```typescript
// Register a custom resolver for a specific resource pattern
pwa.conflicts.register("orders", {
  strategy: "custom",
  resolve: async (local: MutationEntry, remote: ServerResponse) => {
    // Domain-aware logic: if local has higher total, prefer local
    if (local.payload.total > remote.total) return local
    // If amounts match, merge metadata
    return { ...remote, metadata: { ...remote.metadata, ...local.payload.metadata } }
  }
})

// CRDT-style counter resolver
pwa.conflicts.register("inventory", {
  strategy: "crdt",
  type: "g-counter",  // grow-only counter
  merge: (local: number, remote: number) => Math.max(local, remote)
})

// Wildcard patterns
pwa.conflicts.register("/api/users/*", {
  strategy: "field-level",
  mergeBy: ["updatedAt"]  // Last-write-wins per field
})
```

#### 6.6.3 Resolution Flow

```
[Conflict Detected]
       │
       ▼
┌──────────────────┐
│ Check Registry   │  → Pattern match resource to resolver
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Found?  │──no──▶ [Default Strategy (LWW)]
    └────┬────┘
         │ yes
         ▼
┌──────────────────┐
│ Execute Resolver │  → Custom logic, CRDT merge, or manual queue
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Success?│──no──▶ [Fallback to Manual Queue]
    └────┬────┘
         │ yes
         ▼
   [Resolved Value Applied]
```

#### 6.6.4 Acceptance Criteria

- [ ] Custom resolvers are registered per resource pattern
- [ ] Wildcard patterns match correctly (`/api/users/*`)
- [ ] Failed resolvers fall back to manual queue (no data loss)
- [ ] CRDT-style merges are supported for counters and sets

---

### 6.7 Resource Priority System

**Feature ID:** F-04c | **Priority:** P1 | **Target:** v0.3

#### 6.7.1 Description

Not all resources are equal. Auth tokens and checkout data matter more than analytics events. The priority system ensures critical resources are synced, cached, and replayed first — under network pressure, storage pressure, and boot sequencing.

#### 6.7.2 Priority Tiers

| Tier | Description | Examples | Replay Order |
|------|-------------|----------|-------------|
| `critical` | App unusable if missing | Auth tokens, user profile, checkout | First |
| `high` | Core functionality degraded | Orders, messages, documents | Second |
| `normal` | Standard app data | Settings, preferences, drafts | Third |
| `low` | Nice-to-have | Analytics, telemetry, decorative assets | Last (may be deferred) |

#### 6.7.3 API

```typescript
// Set priority mapping
pwa.priority.set({
  critical: ["auth", "checkout", "user-profile"],
  high: ["orders", "messages"],
  normal: ["settings", "preferences"],
  low: ["analytics", "telemetry"]
})

// Priority affects:
// 1. Mutation replay order (critical first)
// 2. Cache eviction (low evicted first)
// 3. Sync timing (critical synced before low)

// Per-operation priority override
await pwa.storage.set("analytics:event", data, { priority: "low" })
pwa.offline.enqueue(action, { priority: "critical" })
```

#### 6.7.4 Behavioral Requirements

| Requirement | Specification |
|-------------|---------------|
| Replay ordering | Higher-priority mutations are dequeued before lower-priority ones |
| Cache eviction | Under storage pressure, low-priority entries are evicted first |
| Sync ordering | On reconnect, critical resources sync before normal/low |
| Default assignment | Presets define default priority mappings |
| Dynamic reassignment | App can change priorities at runtime |

#### 6.7.5 Acceptance Criteria

- [ ] Critical mutations replay before normal/low (same queue)
- [ ] Low-priority cache entries are evicted before critical ones
- [ ] Priority reassignment at runtime affects subsequent behavior
- [ ] Presets define sensible default priority mappings

---

## 7. Coordination & Observability

**Feature ID:** F-06, F-07 | **Priority:** P1 | **Target:** v0.4

### 7.1 Multi-Tab Sync

#### 7.1.1 Leader Election

```
1. Tab joins BroadcastChannel, announces { type: "tab:join", tabId }
2. If no leader exists, start election timeout (random 50-150ms)
3. First tab to timeout broadcasts { type: "LEADER_CLAIM", tabId }
4. Other tabs acknowledge, store leader tabId
5. On leader disconnect (beforeunload): re-elect
```

#### 7.1.2 Leader Responsibilities

- Orchestrate mutation queue replay (only leader replays)
- Coordinate SW activation timing (prevent multiple reloads)
- Aggregate telemetry before sending to backend
- Manage storage eviction policies

#### 7.1.3 Tab Lifecycle Events

```typescript
pwa.on("tab:join", (event) => console.log(`Tab ${event.detail.tabId} joined`))
pwa.on("tab:leave", (event) => console.log(`Tab ${event.detail.tabId} left`))
pwa.on("tab:leader_change", (event) => {
  console.log(`New leader: ${event.detail.newLeader}`)
})
```

#### 7.1.4 Acceptance Criteria

- [ ] Leader election completes within 100ms
- [ ] State propagation latency <50ms across tabs
- [ ] No duplicate mutation replays during leader transitions
- [ ] Tab count is accurate (handles crashes, force-close)

### 7.2 Observability Layer

#### 7.2.1 Event Bus

```typescript
// Subscribe to all events
pwa.observe().subscribe((event) => {
  analytics.track(event.type, event.detail)
})

// Subscribe to specific events
pwa.on("update:available", (event) => {
  console.log(`Update ${event.detail.version} available`)
})

pwa.on("mutation:failed", (event) => {
  reportError(`Mutation ${event.detail.id} failed`, event.detail.error)
})
```

#### 7.2.2 Built-In Metrics

| Metric | Description | Emitted On |
|--------|-------------|------------|
| `sw.activate_duration` | Time from detection to activation | `update:applied` |
| `mutation.queue_depth` | Current pending mutations | Every 60s |
| `mutation.replay_latency` | Time from online to sync complete | `mutation:synced` |
| `permission.denial_rate` | % of denied requests | Every permission request |
| `storage.quota_utilization` | % of storage used | Every 5min |
| `tab.active_count` | Number of open tabs | Tab join/leave |

#### 7.2.3 Telemetry Adapters

```typescript
interface TelemetryAdapter {
  track(event: string, data: Record<string, unknown>): void
  flush(): Promise<void>
}

// Use Datadog
pwa.telemetry.use(new DatadogAdapter({ apiKey: "..." }))

// Use Sentry
pwa.telemetry.use(new SentryAdapter({ dsn: "..." }))

// Custom
pwa.telemetry.use({
  track(event, data) { myAnalytics.send(event, data) },
  async flush() { await myAnalytics.flush() }
})
```

#### 7.2.4 Acceptance Criteria

- [ ] All lifecycle events are observable and loggable
- [ ] Telemetry adapters do not block main thread (async flush)
- [ ] Metrics are emitted at specified intervals without duplication
- [ ] Observer subscriptions are tree-shakeable (0 cost if unused)

---

## 8. Extensibility & Growth

**Feature ID:** F-08, F-10 | **Priority:** P1, P2 | **Target:** v0.4, v1.0

### 8.1 Plugin System

#### 8.1.1 Plugin Interface

```typescript
interface BetterPwaPlugin {
  name: string
  version: string

  // Lifecycle hooks
  onInit?(pwa: BetterPwaRuntime): void
  onStateChange?(diff: StateDiff, state: PwaState): void
  onLifecycleEvent?(event: LifecycleEvent): void

  // Expose API extensions
  extend?(api: BetterPwaApi): void
}
```

#### 8.1.2 Plugin Registration

```typescript
pwa.use({
  name: "auth-plugin",
  version: "1.0.0",
  onInit(pwa) {
    pwa.state().subscribe(["isOffline"], (diff) => {
      if (diff.isOffline) pauseAuthRefresh()
    })
  },
  extend(api) {
    api.auth = { login, logout, refresh }
  }
})

// Usage
pwa.auth.login({ email, password })
```

#### 8.1.3 Plugin Isolation

- Plugins cannot access internal state directly (only via `pwa.state()`)
- Plugin errors are caught and reported; they do not crash the runtime
- Plugins execute in registration order; no inter-plugin dependencies
- Plugins can be disabled at runtime: `pwa.plugins.disable("auth-plugin")`

### 8.2 Growth Engine

#### 8.2.1 Install Intelligence

```typescript
// Optimize install prompt timing
pwa.install.optimize({
  trigger: "engagement",     // Show after N interactions
  interactionCount: 3,       // N interactions
  minSessionDuration: "30s", // Or after 30s session
  maxPromptFrequency: 1      // Once per session
})

// Listen for install
pwa.on("app:installed", () => {
  analytics.track("PWA Installed", { method: "prompt" })
})

// Manual prompt (custom button)
await pwa.install.prompt()
```

#### 8.2.2 Manifest Engine

- Auto-generates `manifest.json` from config
- Smart icon resizing (512x512 → all required sizes)
- 2026 manifest fields (`share_target`, `protocol_handlers`, `file_handlers`)
- Scope isolation for subpath deployments

### 8.3 Acceptance Criteria

- [ ] Plugins can extend API without modifying core
- [ ] Plugin errors are isolated (no runtime crashes)
- [ ] Install optimization improves prompt conversion by 2x
- [ ] Manifest generation passes Lighthouse PWA audit

---

## 8b. State Migrations & Versioning

**Feature ID:** F-13 | **Priority:** P0 | **Target:** v0.2

### 8b.1 Description

State schema evolves over time. v1 stores `{ permissions: ["granted"] }`, v2 expects `{ permissions: { granted: [], denied: [] } }`. Without migrations, the app breaks its own state on update. Migrations run before any state read — unmigrated reads are blocked.

### 8b.2 API

```typescript
// Register migration from v1 → v2
pwa.migrations.register("v2", (state: PwaStateV1): PwaStateV2 => ({
  ...state,
  permissions: { granted: state.permissions, denied: [] }
}))

// Register migration from v2 → v3
pwa.migrations.register("v3", (state: PwaStateV2): PwaStateV3 => ({
  ...state,
  connectionType: state.isOffline ? null : "4g"
}))

// Chain: v1 → v2 → v3 (auto-applied in order)
// Configurable migration window (how many versions back supported)
pwa.migrations.configure({ window: 3 })  // Support v(N-3) to vN
```

### 8b.3 Migration Execution

```
[App Boots]
    │
    ▼
┌──────────────────┐
│ Read stored      │
│ schema version   │
└────────┬─────────┘
         │
    ┌────┴─────┐
    │Version   │
    │matches?  │──yes──▶ [Continue Boot]
    └────┬─────┘
         │ no
         ▼
┌──────────────────┐
│ Find migration   │
│ chain (v1→v2→v3)│
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Found   │──no──▶ [Boot with Warning, Fresh State]
    └────┬────┘
         │ yes
         ▼
┌──────────────────┐
│ Execute in       │
│ sequence (atomic)│
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Success?│──no──▶ [Rollback, Emit migration:failed]
    └────┬────┘
         │ yes
         ▼
   [Write new schema, Continue Boot]
```

### 8b.4 Acceptance Criteria

- [ ] Migrations execute before any state read
- [ ] Migration chain auto-chains (v1 → v2 → v3)
- [ ] Failed migrations rollback to previous schema
- [ ] Unmigratable state boots with fresh data (no crash)

---

## 8c. Capability Confidence Layer

**Feature ID:** F-14 | **Priority:** P2 | **Target:** v0.4

### 8c.1 Description

"Supported" doesn't mean "usable." Safari may expose `navigator.bluetooth` but it's non-functional. Chrome on low-end Android may have `getUserMedia` but the camera is unavailable. Apps need a **confidence score** — not a boolean.

### 8c.2 API

```typescript
// Check capability confidence
const camera = pwa.capabilities.camera.confidence()
// "full"     — API exists, tested, works
// "partial"  — API exists, some features missing
// "fallback" — API exists, but alternative is better
// "none"     — API doesn't exist

// Detailed report
const report = pwa.capabilities.camera.inspect()
// {
//   apiExists: true,
//   permissionGranted: true,
//   hardwareAvailable: true,
//   tested: true,
//   knownIssues: ["Safari: no device enumeration"],
//   confidence: "partial"
// }

// Adaptive behavior
if (camera.confidence === "full") {
  startVideoCall()
} else if (camera.confidence === "partial") {
  startVideoCallWithWarning()
} else {
  offerAudioOnly()
}
```

### 8c.3 Confidence Determination

```
Capability Confidence = f(
  apiExists,           // Does the API exist in this browser?
  permissionGranted,   // Has the user granted access?
  hardwareAvailable,   // Is the hardware actually present?
  tested,              // Have we run a runtime test?
  browserKnownIssues   // Does this browser have known bugs?
)
```

### 8c.4 Acceptance Criteria

- [ ] Confidence reflects actual usability, not just API presence
- [ ] Known browser issues are documented in `inspect()`
- [ ] Confidence updates dynamically (hardware disconnect, permission revoke)

---

## 8d. Opinionated Presets

**Feature ID:** F-15 | **Priority:** P0 | **Target:** v0.1

### 8d.1 Description

Developers don't want 100 configuration decisions. They want **one decision**: what kind of app am I building? Presets encode best practices for common app types.

### 8d.2 Available Presets

```typescript
createPwa({ preset: "saas" })
// Update strategy: soft (defer until navigation)
// Permissions: batched with fallback
// Storage: OPFS → IDB → Memory
// Conflict resolution: LWW
// Cold start: staged boot
// Priority: critical = ["auth", "user-profile"]

createPwa({ preset: "ecommerce" })
// Update strategy: on-reload (never interrupt checkout)
// Permissions: minimal (geolocation for store finder)
// Storage: IDB (cart persistence)
// Conflict resolution: merge (cart items)
// Cold start: staged, cart-first sync
// Priority: critical = ["cart", "checkout", "auth"]

createPwa({ preset: "offline-first" })
// Update strategy: soft
// Permissions: batched with aggressive retry
// Storage: OPFS → IDB (large offline data)
// Conflict resolution: manual (critical data)
// Cold start: staged, full replay
// Priority: critical = ["all-user-data"]

createPwa({ preset: "content" })
// Update strategy: gradual (10% over 4h)
// Permissions: none by default
// Storage: cache-first, IDB for reading list
// Conflict resolution: LWW
// Cold start: fast hydrate, async sync
// Priority: critical = ["current-article"]
```

### 8d.3 Preset Override

```typescript
// Start with a preset, then override specific decisions
createPwa({
  preset: "saas",
  overrides: {
    updates: { strategy: "gradual", rollout: 0.2 },
    storage: { evictionPolicy: "ttl" },
    permissions: { maxRetries: 5 }
  }
})
```

### 8d.4 Acceptance Criteria

- [ ] Each preset configures all subsystems (updates, permissions, storage, conflicts, boot, priority)
- [ ] Presets are overridable per-key
- [ ] Custom presets can be defined from scratch
- [ ] `better-pwa doctor` warns if preset config is suboptimal

---

## 9. Feature Flags & Configuration

### 9.1 Runtime Configuration

```typescript
// better-pwa.config.ts
export default {
  // Core
  state: {
    persistence: true,         // IDB-backed state
    crossTabSync: true,        // BroadcastChannel sync
  },

  // Updates
  updates: {
    strategy: "soft",          // Default strategy
    detectionInterval: 60_000, // 60s
    gradual: {
      defaultRollout: 0.1,     // 10%
      defaultWindow: "4h",
    },
  },

  // Permissions
  permissions: {
    maxRetries: 3,
    backoffBase: 1000,         // 1s
    fallbackUI: true,          // Show fallback on denial
  },

  // Offline
  offline: {
    queueEnabled: true,
    maxRetries: 5,
    conflictStrategy: "lww",
  },

  // Storage
  storage: {
    defaultEngine: "auto",     // auto | opfs | idb | memory
    evictionPolicy: "lru",
    quotaWarningThreshold: 0.6,
  },

  // Observability
  observability: {
    enabled: true,
    adapters: [],              // TelemetryAdapter[]
  },
}
```

### 9.2 Feature Flags (Runtime Toggles)

| Flag | Default | Description |
|------|---------|-------------|
| `state.persistence` | `true` | Enable IDB-backed state persistence |
| `state.crossTabSync` | `true` | Enable BroadcastChannel sync |
| `updates.autoDetect` | `true` | Automatically poll for SW updates |
| `permissions.fallbackUI` | `true` | Show fallback UI on denial |
| `offline.queue` | `true` | Enable mutation queue |
| `storage.quotaMonitoring` | `true` | Enable quota polling |
| `observability.enabled` | `true` | Enable event bus |

---

## 10. Framework Integration

### 10.1 React Adapter (`@better-pwa/adapter-react`)

```typescript
import { usePwaState, usePwaUpdate } from "@better-pwa/adapter-react"

function App() {
  const { isOffline, hasUpdate } = usePwaState(["isOffline", "hasUpdate"])
  const activateUpdate = usePwaUpdate()

  return (
    <div>
      {isOffline && <Banner>You are offline</Banner>}
      {hasUpdate && (
        <button onClick={activateUpdate}>Update Available</button>
      )}
    </div>
  )
}
```

### 10.2 Vue Adapter (`@better-pwa/adapter-vue`)

```typescript
import { usePwaState } from "@better-pwa/adapter-vue"

const { isOffline, hasUpdate } = usePwaState(["isOffline", "hasUpdate"])
```

### 10.3 Svelte Adapter (`@better-pwa/adapter-svelte`)

```typescript
import { pwaState } from "@better-pwa/adapter-svelte"

const { isOffline, hasUpdate } = pwaState(["isOffline", "hasUpdate"])
```

### 10.4 Acceptance Criteria

- [ ] Framework adapters are tree-shakeable (0 cost if unused)
- [ ] State changes render within 1 animation frame
- [ ] No memory leaks on component unmount
- [ ] SSR-safe (no-op during server render)

---

## 11. CLI & Developer Tools

**Feature ID:** F-11 | **Priority:** P1 | **Target:** v1.0

### 11.1 CLI Commands

| Command | Description | Output |
|---------|-------------|--------|
| `better-pwa init` | Scaffold project with config | Creates `better-pwa.config.ts` |
| `better-pwa build` | Generate SW + manifest | Outputs to `dist/` |
| `better-pwa doctor` | Audit configuration | Health report (pass/warn/fail) |
| `better-pwa preview` | Local dev server with SW | Opens browser |
| `better-pwa audit` | Lighthouse PWA check | Score 0-100 |
| `better-pwa debug` | Interactive state visualization | Opens DevTools panel |

### 11.2 `better-pwa doctor` Output

```
┌─────────────────────────────────────────────┐
│  better-pwa doctor                          │
├─────────────────────────────────────────────┤
│  ✅ Service Worker registered                │
│  ✅ Manifest valid                         │
│  ✅ HTTPS detected                           │
│  ⚠️  OPFS not supported (Safari)            │
│  ✅ Storage quota: 2GB (2.3% used)          │
│  ✅ No pending mutations                     │
│  ✅ All permissions resolved                 │
├─────────────────────────────────────────────┤
│  Health: 94% (1 warning)                    │
└─────────────────────────────────────────────┘
```

### 11.3 `better-pwa debug` DevTools Panel

- Real-time state visualization
- Mutation queue inspector
- Tab coordination graph
- Event stream viewer

### 11.4 `better-pwa simulate` — Dev-Time Simulator

**Feature ID:** F-16 | **Priority:** P1 | **Target:** v0.2

#### 11.4.1 Description

The fastest way to debug a PWA is to **simulate failure conditions locally**. The simulator injects network states, offline events, and SW update triggers — making debugging addictive and demos impressive.

#### 11.4.2 CLI Commands

```bash
# Simulate offline mode
better-pwa simulate offline
better-pwa simulate offline --duration 30s     # Auto-reconnect after 30s
better-pwa simulate offline --random            # Random disconnects

# Simulate slow network
better-pwa simulate slow-network --type 2g
better-pwa simulate slow-network --type 3g
better-pwa simulate slow-network --latency 2000ms

# Simulate SW update
better-pwa simulate update --strategy soft
better-pwa simulate update --strategy hard
better-pwa simulate update --strategy gradual --rollout 0.2

# Simulate permission denial
better-pwa simulate permission-denied --camera
better-pwa simulate permission-denied --all

# Simulate multi-tab scenario
better-pwa simulate multi-tab --tabs 5

# Simulate cold start after 3 days offline
better-pwa simulate cold-start --offline-days 3

# Simulate storage full
better-pwa simulate storage-full --usage 95%

# Reset all simulations
better-pwa simulate reset
```

#### 11.4.3 Programmatic API (for tests)

```typescript
import { simulate } from "better-pwa/testing"

test("handles offline gracefully", async () => {
  const pwa = createPwa({ preset: "saas" })
  
  await simulate.offline(pwa)
  expect(pwa.lifecycle.state()).toBe("OFFLINE")
  
  // Queue mutation while offline
  pwa.offline.enqueue({ type: "create", payload: order })
  
  await simulate.online(pwa)
  await pwa.offline.flush()  // Wait for replay
  
  expect(await pwa.offline.queueDepth()).toBe(0)
})

test("replay order respects priority", async () => {
  await simulate.offline(pwa)
  
  pwa.offline.enqueue(analyticsEvent, { priority: "low" })
  pwa.offline.enqueue(checkoutAction, { priority: "critical" })
  
  await simulate.online(pwa)
  
  // Critical should have been replayed first
  expect(replayOrder[0].priority).toBe("critical")
})
```

#### 11.4.4 Dev Server Integration

When running `better-pwa preview`, a simulation panel appears in the browser:

```
┌─────────────────────────────────────────┐
│  Simulation Panel                       │
├─────────────────────────────────────────┤
│  [ ] Offline                            │
│  [ ] Slow Network (2g ▾)               │
│  [ ] Pending Update                     │
│  [ ] Permission Denied                  │
│  [ ] Storage Full (80%)                 │
│  [ ] Multi-Tab (3 tabs)                 │
│                                         │
│  [Apply] [Reset]                        │
└─────────────────────────────────────────┘
```

#### 11.4.5 Acceptance Criteria

- [ ] All simulations work in `better-pwa preview`
- [ ] Simulations are zero-cost in production builds (tree-shaken)
- [ ] Programmatic API works in Jest/Vitest test suites
- [ ] Simulation state is visible in DevTools panel

---

## 12. Acceptance Criteria Summary

| Feature | Criteria | Status |
|---------|----------|--------|
| **State Engine** | Atomic, cross-tab consistent, <50ms propagation | 🟡 Planned |
| **Update System** | No loops, strategy-switching, rollback on failure | 🟡 Planned |
| **Permissions** | 60%+ prompt reduction, <200ms fallback, retry backoff | 🟡 Planned |
| **Offline Queue** | Durability, at-least-once, configurable conflict resolution | 🟡 Planned |
| **Storage** | Transparent engine selection, quota-aware eviction | 🟡 Planned |
| **Multi-Tab** | <100ms election, <50ms propagation, no duplicate replays | 🟡 Planned |
| **Observability** | All events observable, async telemetry flush | 🟡 Planned |
| **Plugins** | API extension, error isolation, runtime disable | 🟡 Planned |
| **Growth** | 2x install conversion improvement | 🟡 Planned |
| **CLI** | Doctor catches 95% misconfigurations | 🟡 Planned |

---

## 13. Appendix

### 13.1 Glossary

| Term | Definition |
|------|-----------|
| **PWA** | Progressive Web App |
| **SW** | Service Worker |
| **Fugu** | Project Fugu (Chrome capability APIs) |
| **OPFS** | Origin Private File System |
| **IDB** | IndexedDB |
| **LWW** | Last Write Wins |
| **LRU** | Least Recently Used |
| **LFU** | Least Frequently Used |
| **TTL** | Time To Live |

### 13.2 Related Documents

- [Product Requirements](./PRD.md)
- [Architecture](./ARCHITECTURE.md)
- [Roadmap](./ROADMAP.md)

### 13.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-03-XX | Core Team | Initial draft |
| 1.0 | 2026-04-04 | Core Team | FAANG-grade structure, API contracts, ACs |

---

*This document specifies all features. Implementation must satisfy all acceptance criteria before marking complete.*
