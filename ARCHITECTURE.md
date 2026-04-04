---
# Architecture Document: better-pwa

| Metadata | Details |
|----------|---------|
| **Project** | `better-pwa` |
| **Version** | 1.0 (Draft) |
| **Status** | 🟡 In Review |
| **Last Updated** | 2026-04-04 |
| **Owner** | Core Engineering Team |

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architectural Principles](#2-architectural-principles)
3. [Package Structure](#3-package-structure)
4. [Layered Architecture](#4-layered-architecture)
5. [Core Components](#5-core-components)
6. [Deterministic State Graph](#6-deterministic-state-graph)
7. [Cold Start Strategy](#7-cold-start-strategy)
8. [Data Flow & State Management](#8-data-flow--state-management)
9. [Service Worker Architecture](#9-service-worker-architecture)
10. [Multi-Tab Coordination](#10-multi-tab-coordination)
11. [Plugin System Design](#11-plugin-system-design)
12. [Security Architecture](#12-security-architecture)
13. [Enterprise Architecture](#13-enterprise-architecture)
14. [Observability & Telemetry](#14-observability--telemetry)
15. [Build & Tooling Pipeline](#15-build--tooling-pipeline)
16. [Performance Budgets](#16-performance-budgets)
17. [Design Decisions & Trade-offs](#17-design-decisions--trade-offs)
18. [Appendix](#18-appendix)

---

## 1. System Overview

`better-pwa` is a **layered operating system for web applications**, unifying runtime state management, lifecycle orchestration, offline data consistency, and build tooling into a single, cohesive platform.

### 1.1 High-Level Architecture

```mermaid
graph TD
    subgraph "Application Layer"
        A[App Code]
        B[Framework Adapters: React, Vue, Svelte]
    end

    subgraph "better-pwa Runtime (Main Thread)"
        C[State Engine: pwa.state()]
        D[Lifecycle Bus]
        E[Update Controller]
        F[Permission Orchestrator]
        G[Offline Data Layer]
        H[Storage Abstraction]
        I[Plugin Registry]
    end

    subgraph "Service Worker Layer"
        J[sw.js (Generated)]
        K[Cache Manager]
        L[Mutation Queue Sync]
        M[Multi-Tab Coordinator]
    end

    subgraph "Build Tools"
        N[SW Builder]
        O[Manifest Engine]
        P[Config Validator]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    G --> L
    C --> M
    N --> J
    O --> J
    P --> N
    J --> K
    M -. BroadcastChannel .-> C
```

### 1.2 Key Architectural Invariants

- **Single Source of Truth:** `pwa.state()` is the *only* API for environment state.
- **Zero-Dependency Core:** No framework code in `@better-pwa/core`.
- **SW Isolation:** Service worker logic is decoupled from main thread runtime.
- **Plugin Extensibility:** All domain-specific features (auth, payments) are plugins.

---

## 2. Architectural Principles

| Principle | Description | Enforcement Mechanism |
|-----------|-------------|----------------------|
| **Separation of Concerns** | Main thread ↔ SW communication is strictly message-based. No shared memory assumptions. | TypeScript interfaces, message schema validation |
| **Reactive by Default** | All state changes propagate via observable streams. | RxJS-like subscriber pattern (custom, zero-dep) |
| **Fail-Safe Defaults** | Degradation paths exist for every browser capability. | Feature detection at runtime, graceful fallbacks |
| **Tree-Shakeable** | Unused features are eliminated at build time. | ESM exports, no side-effectful imports |
| **Size-Budgeted** | Every module has a strict byte limit. | CI size-check gates, automated alerts |

---

## 3. Package Structure

```
@better-pwa/
├── core/                    # Zero-dep runtime (State, Lifecycle, Permissions)
│   ├── src/
│   │   ├── state/           # Reactive state engine
│   │   ├── lifecycle/       # SW registration, event bus
│   │   ├── permissions/     # Batch orchestrator
│   │   ├── updates/         # Update strategies
│   │   └── index.ts         # Public API
│   └── package.json         # "main": "dist/index.js"
│
├── offline/                  # Mutation queue, replay engine
│   ├── src/
│   │   ├── queue/           # IndexedDB-backed FIFO queue
│   │   ├── replay/          # Network retry logic
│   │   └── conflict/        # Resolution strategies
│   └── package.json
│
├── storage/                  # OPFS/IDB/Memory abstraction
│   ├── src/
│   │   ├── engines/         # OPFS, IDB, Memory implementations
│   │   ├── quota/           # Storage monitoring
│   │   └── eviction/        # LRU/LFU/TTL policies
│   └── package.json
│
├── sw-builder/               # Config-driven SW generation
│   ├── src/
│   │   ├── builder/         # esbuild integration
│   │   ├── precache/        # Workbox integration
│   │   └── strategies/      # Cache strategies
│   └── package.json
│
├── manifest/                 # Manifest generation
│   ├── src/
│   │   ├── generator/       # JSON manifest builder
│   │   └── icons/           # Icon resizing, format conversion
│   └── package.json
│
├── adapter-react/            # React hooks & providers
├── adapter-vue/              # Vue composables
├── adapter-svelte/           # Svelte stores
├── adapter-next/             # Next.js integration
├── adapter-vite/             # Vite plugin
│
├── cli/                      # better-pwa CLI
│   ├── src/
│   │   ├── doctor/          # Diagnostics
│   │   ├── init/            # Scaffolding
│   │   └── build/           # SW builder wrapper
│   └── package.json
│
└── plugins/                  # Official plugins (separate repo)
    ├── auth/
    ├── payments/
    └── analytics/
```

---

## 4. Layered Architecture

### 4.1 Layer Model

```
┌─────────────────────────────────────────────┐
│          Application Layer                   │  ← App code + framework adapters
├─────────────────────────────────────────────┤
│          Orchestration Layer                 │  ← State engine, lifecycle bus
├─────────────────────────────────────────────┤
│          Capability Layer                    │  ← Permissions, updates, offline
├─────────────────────────────────────────────┤
│          Infrastructure Layer                │  ← Storage, SW, manifest, CLI
├─────────────────────────────────────────────┤
│          Browser APIs                        │  ← Fugu, Service Worker, IDB
└─────────────────────────────────────────────┘
```

### 4.2 Layer Responsibilities

| Layer | Responsibility | Public API Surface |
|-------|----------------|-------------------|
| **Application** | UI rendering, business logic | Framework hooks (`usePwaState()`) |
| **Orchestration** | State coordination, event routing | `pwa.state()`, `pwa.on()` |
| **Capability** | Feature-specific logic | `pwa.update.*`, `pwa.permissions.*` |
| **Infrastructure** | Storage, SW lifecycle, build | `pwa.storage.*`, CLI commands |
| **Browser** | Native APIs (wrapped) | Internal only (abstracted) |

---

## 5. Core Components

### 5.1 State Engine (`pwa.state()`)

**Purpose:** Unified, reactive source of truth for all environment state.

**Implementation:**
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Observers   │────▶│  State Store │◀────│  Publishers  │
│ (Subscribers)│     │  (In-Memory  │     │ (Network, SW,│
│              │◀────│   + IDB)     │     │  Permissions)│
└──────────────┘     └──────────────┘     └──────────────┘
```

**Key Design Decisions:**
- **Immutability:** State snapshots are frozen. Mutations produce new objects.
- **Atomicity:** Multi-key updates are batched; subscribers fire once.
- **Persistence:** Critical state (`isInstalled`, `permissions`) survives page reloads via IndexedDB.

**TypeScript Contract:**
```typescript
interface StateEngine {
  snapshot(): Readonly<PwaState>
  subscribe(keys: (keyof PwaState)[], cb: (diff: StateDiff) => void): Unsubscribe
  set<T extends keyof PwaState>(key: T, value: PwaState[T]): Promise<void>
  reset(): Promise<void>
}
```

---

### 5.2 Lifecycle Bus

**Purpose:** Centralized event system for all PWA lifecycle events.

**Event Schema:**
```typescript
type LifecycleEvent =
  | { type: "sw:registered"; detail: { swVersion: string } }
  | { type: "sw:activated"; detail: { swVersion: string } }
  | { type: "sw:redundant"; detail: { error?: Error } }
  | { type: "app:installed"; detail: { method: "prompt" | "auto" } }
  | { type: "app:offline"; detail: { timestamp: number } }
  | { type: "app:online"; detail: { timestamp: number; offlineDuration: number } }
  | { type: "update:available"; detail: { version: string; size?: number } }
  | { type: "update:applied"; detail: { version: string } }
  | { type: "permission:changed"; detail: { name: string; state: PermissionState } };
```

**Subscription API:**
```typescript
pwa.on("update:available", (event) => {
  console.log(`Update ${event.detail.version} available`)
})
```

---

### 5.3 Update Controller

**Purpose:** Declarative management of service worker update strategies.

**State Machine:**
```
[IDLE] ──detect()──▶ [DOWNLOADING] ──ready()──▶ [WAITING]
  ▲                    │                           │
  │                    ▼                           ▼
  │              [FAILED]                    [ACTIVATING]
  │                    │                           │
  └────────────────────┴──────────────────────▶ [IDLE]
                    skip()
```

**Implementation Details:**
- Polls SW script byte hash every 60s (configurable).
- Uses `SkipWaiting` message channel for immediate activation.
- Tracks update rollout percentage for `gradual` strategy.

---

### 5.4 Permission Orchestrator

**Purpose:** Batched, resilient permission management.

**Request Flow:**
```
1. App calls pwa.permissions.request(["camera", "microphone"])
2. Orchestrator checks cached state (skip already-granted)
3. Batches remaining into single browser prompt (if supported)
4. On denial: triggers fallback hook, retries with backoff
5. Persists state to IDB, broadcasts to tabs
```

**Retry Strategy:**
- **Exponential backoff:** 1s, 2s, 4s, 8s (max 3 retries)
- **User-initiated override:** Manual retry button bypasses backoff
- **State invalidation:** Re-checks on `visibilitychange` (user may have granted in settings)

---

### 5.5 Offline Data Layer

**Purpose:** Mutation queuing and replay for offline-first apps.

**Queue Architecture:**
```typescript
interface MutationEntry {
  id: string            // UUIDv4
  type: "create" | "update" | "delete"
  payload: unknown      // Serializable data
  timestamp: number     // ms epoch
  retryCount: number    // Increments on failure
  maxRetries: number    // Configurable (default: 5)
  conflictStrategy: "lww" | "merge" | "manual"
}
```

**Replay Engine:**
- Processes queue FIFO on `online` event.
- Parallelizes independent mutations (same resource type).
- On failure: increments `retryCount`, applies backoff, re-queues.
- On success: removes from queue, emits `mutation:synced` event.

---

### 5.6 Storage Abstraction

**Purpose:** Unified API over OPFS, IndexedDB, and memory.

**Engine Selection Logic:**
```
if (supportsOPFS && value.size > 1MB) → OPFS
else if (supportsIDB) → IndexedDB
else → Memory (with warning)
```

**Quota Monitoring:**
- Polls `navigator.storage.estimate()` every 5min.
- Triggers eviction at 80% threshold.
- Emits `storage:quota_low` warning at 60%.

---

## 6. Deterministic State Graph

### 6.1 The App Lifecycle State Machine

All PWA state transitions flow through a formal state machine. This eliminates "random bugs" — every edge case is a defined transition.

```
                          ┌─────────────────────────────────────────────────┐
                          │                                                 │
                          ▼                                                 │
┌──────┐  config   ┌──────────┐  state    ┌─────────┐  network   ┌─────────┐ │
│ IDLE │─────────▶│  BOOT    │───────────▶│ READY   │◀──────────│ OFFLINE │ │
└──────┘          │(staged)  │  restored  │         │  restored  │         │ │
                  └──────────┘            └────┬────┘            └────┬────┘ │
                          │                    │                      │      │
                          │ error              │ update               │ sync  │
                          ▼                    ▼                      ▼      │
                   ┌──────────┐          ┌──────────┐           ┌──────────┐ │
                   │DEGRADED  │          │ UPDATING │           │ SYNCING  │ │
                   │(limited) │          │          │           │          │ │
                   └──────────┘          └────┬─────┘           └────┬─────┘ │
                          │                   │ activation           │ done   │
                          │                   ▼                      ▼      │
                          │             ┌──────────┐           ┌──────────┐ │
                          └────────────▶│ STABLE   │◀──────────│          │ │
                                        │          │           └──────────┘ │
                                        └──────────┘                        │
                                             │                              │
                                             │ error                        │
                                             ▼                              │
                                        ┌──────────┐                        │
                                        │DEGRADED  │────────────────────────┘
                                        └──────────┘
```

### 6.2 State Definitions

| State | Description | Entered When | Exited When |
|-------|-------------|--------------|-------------|
| `IDLE` | Pre-initialization | Runtime created, before `createPwa()` | `createPwa()` called |
| `BOOT` | Initialization in progress | `createPwa()` invoked | All boot stages complete |
| `READY` | App functional, state restored | Boot stages complete, state loaded | Network change, update detected |
| `OFFLINE` | Network lost during session | `navigator.onLine` → false | Network restored |
| `SYNCING` | Replaying mutations, fetching data | Network restored after offline | Queue empty, data fresh |
| `UPDATING` | SW update being applied | Update detected + strategy permits | Activation complete or rollback |
| `STABLE` | App fully synced, no pending actions | Sync complete, no updates | Any trigger event |
| `DEGRADED` | Running with reduced capability | Non-critical failure | Recovery or user action |

### 6.3 Transition Guards

Every transition has a guard condition. No transition is unconditional.

```typescript
type Transition = {
  from: AppState
  to: AppState
  guard: (ctx: TransitionContext) => boolean
  action: (ctx: TransitionContext) => Promise<void>
  onFail: (ctx: TransitionContext) => AppState  // fallback state
}

const transitions: Transition[] = [
  {
    from: "IDLE", to: "BOOT",
    guard: () => config !== null,
    action: runBootSequence,
    onFail: () => "DEGRADED"
  },
  {
    from: "READY", to: "UPDATING",
    guard: () => updateStrategy !== "on-reload" || allTabsIdle,
    action: applySwUpdate,
    onFail: () => "READY"  // defer update
  },
  // ...
]
```

### 6.4 State Exposure API

```typescript
// Current state
pwa.lifecycle.state()  // "STABLE"

// Subscribe to transitions
pwa.lifecycle.onTransition((from, to, metadata) => {
  console.log(`${from} → ${to}`, metadata)
})

// Blocked transitions (for debugging)
pwa.lifecycle.blockedTransitions()  // list of guarded transitions that failed
```

### 6.5 Why This Matters

| Without State Machine | With State Machine |
|-----------------------|-------------------|
| "Sometimes the app is broken after offline" | "Transition OFFLINE → SYNCING → STABLE is tested, guarded, logged" |
| "Updates randomly break sessions" | "Transition READY → UPDATING is guarded by active-session check" |
| Debugging = reading scattered event handlers | Debugging = state transition log |
| Plugin behavior depends on timing | Plugin behavior depends on declared state |

---

## 7. Cold Start Strategy

### 7.1 The Problem

A user opens the app after 3 days offline. The system has:
- A stale precache (old HTML/CSS/JS)
- Pending mutations in the queue
- A new SW version waiting to activate
- Possibly expired auth tokens

Without coordination, the app tries everything at once: render stale UI, replay mutations (which may fail against new API), activate the SW (breaking the session), and refresh auth (which may fail). **Race condition city.**

### 7.2 Staged Boot Sequence

The cold start is a **deterministic, sequential pipeline**. No stage begins until the previous completes.

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGED BOOT SEQUENCE                          │
├──────────┬──────────────────────────┬───────────────────────────┤
│  Stage   │  What Happens            │  Failure Behavior         │
├──────────┼──────────────────────────┼───────────────────────────┤
│ 1.HYDRATE│                          │                           │
│          │  • Load cached UI shell  │  → Show blank with        │
│          │  • Restore last state    │    spinner (no crash)     │
│          │  • Render app skeleton   │                           │
├──────────┼──────────────────────────┼───────────────────────────┤
│ 2.SYNC   │                          │                           │
│          │  • Check network         │  → Enter OFFLINE state    │
│          │  • Fetch critical data   │    with cached data       │
│          │  • Validate auth tokens  │    (degraded, not broken) │
│          │  • Check cache freshness │                           │
├──────────┼──────────────────────────┼───────────────────────────┤
│ 3.UPDATE │                          │                           │
│          │  • Check pending SW      │  → Defer update, continue │
│          │  • Apply if strategy     │    with current version   │
│          │    permits (no session)  │                           │
│          │  • Skip if user active   │                           │
├──────────┼──────────────────────────┼───────────────────────────┤
│ 4.REPLAY │                          │                           │
│          │  • Leader tab starts     │  → Queue preserved,       │
│          │  • Process by priority   │    emit replay_failed     │
│          │  • Emit sync events      │                           │
└──────────┴──────────────────────────┴───────────────────────────┘
```

### 7.3 Implementation

```typescript
async function stagedBoot(config: BootConfig): Promise<AppState> {
  const stages = [
    { name: "hydrate", fn: hydrateUi, timeout: 3000 },
    { name: "sync", fn: syncCritical, timeout: 10000 },
    { name: "update", fn: applyPendingUpdates, timeout: 5000 },
    { name: "replay", fn: replayMutationQueue, timeout: 30000 },
  ]

  for (const stage of stages) {
    try {
      await withTimeout(stage.fn(config), stage.timeout)
      emit("boot:stage_complete", { stage: stage.name })
    } catch (err) {
      emit("boot:stage_failed", { stage: stage.name, error: err })
      if (stage.name === "hydrate") return "DEGRADED"  // Can't boot at all
      if (stage.name === "sync") return enterOfflineMode()  // No network
      if (stage.name === "update") continue  // Defer update
      if (stage.name === "replay") {
        emit("boot:replay_deferred")
        break  // Queue preserved for later
      }
    }
  }

  return "STABLE"
}
```

### 7.4 Cache Freshness Check

During Stage 2 (SYNC), the SW validates cache freshness:

```typescript
// In sw.js
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000  // 7 days

async function validateCache(): Promise<"fresh" | "stale"> {
  const cache = await caches.open("precache-v1")
  const response = await cache.match("/")
  if (!response) return "stale"
  
  const dateHeader = response.headers.get("date")
  if (!dateHeader) return "stale"
  
  const age = Date.now() - new Date(dateHeader).getTime()
  return age < CACHE_MAX_AGE ? "fresh" : "stale"
}
```

If stale, the SW fetches fresh assets before Stage 3 begins — ensuring the user never sees week-old content.

---

## 8. Data Flow & State Management

### 8.1 Main Thread ↔ Service Worker Communication

```
Main Thread                          Service Worker
┌──────────────┐                     ┌──────────────┐
│  pwa.state() │────postMessage()───▶│  sw.js       │
│              │◀────postMessage()───│              │
│              │                     │              │
│  BroadcastChannel ◀──────────────▶│  BroadcastChannel │
└──────────────┘                     └──────────────┘
```

**Message Schema (Internal):**
```typescript
type SWMessage =
  | { type: "SKIP_WAITING"; payload: void }
  | { type: "CACHE_UPDATE"; payload: { urls: string[] } }
  | { type: "MUTATION_ENQUEUE"; payload: MutationEntry }
  | { type: "STATE_SYNC"; payload: Partial<PwaState> }
  | { type: "LEADER_ELECTION"; payload: { tabId: string } };
```

### 6.2 Cross-Tab State Synchronization

```
Tab A (Leader)          BroadcastChannel          Tab B (Follower)
     │                         │                         │
     │──STATE_SYNC────────────▶│────────────────────────▶│
     │                         │                         │
     │◀────ACK─────────────────│◀────────────────────────│
     │                         │                         │
```

**Deduplication Logic:**
- Each state update carries a `revisionId` (UUID).
- Tabs maintain a LRU cache of seen `revisionId`s (max 100).
- Duplicate updates are silently dropped.

---

## 9. Service Worker Architecture

### 9.1 Generated SW Structure

```javascript
// sw.js (Generated by @better-pwa/sw-builder)
import { precacheAndRoute } from "workbox-precaching"
import { registerRoute } from "workbox-routing"
import { betterPwaRuntime } from "@better-pwa/sw-runtime"

// Precache manifest (injected at build time)
precacheAndRoute(self.__WB_MANIFEST)

// Runtime caching strategies
registerRoute(/\/api\/.*/, betterPwaRuntime.networkFirst())
registerRoute(/\.(js|css|png|svg)$/, betterPwaRuntime.cacheFirst())

// Better-PWA runtime hooks
betterPwaRuntime.init({
  onMessage: handleMessage,
  onSync: handleSync,
  onError: reportError,
})
```

### 9.2 SW Runtime Responsibilities

- Intercept fetch requests for offline queueing.
- Handle `sync` and `periodicsync` events.
- Process messages from main thread (skip waiting, cache updates).
- Broadcast state changes to all clients.

---

## 10. Multi-Tab Coordination

### 10.1 Leader Election Algorithm

```
1. Tab joins BroadcastChannel, announces presence
2. If no leader exists, start election timeout (random 50-150ms)
3. First tab to timeout broadcasts LEADER_CLAIM
4. Other tabs acknowledge, store leader tabId
5. On leader disconnect: re-elect (repeat from step 2)
```

**Leader Responsibilities:**
- Orchestrate mutation queue replay.
- Coordinate SW activation timing.
- Aggregate telemetry before sending to backend.

### 10.2 Tab Lifecycle Events

```typescript
type TabEvent =
  | { type: "tab:join"; tabId: string; isLeader: boolean }
  | { type: "tab:leave"; tabId: string }
  | { type: "tab:leader_change"; oldLeader?: string; newLeader: string }
```

---

## 11. Plugin System Design

### 11.1 Plugin Interface

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

### 11.2 Plugin Registration

```typescript
pwa.use({
  name: "auth-plugin",
  version: "1.0.1",
  onInit(pwa) {
    pwa.state.subscribe(["isOffline"], (diff) => {
      if (diff.isOffline) pauseAuthRefresh()
    })
  },
  extend(api) {
    api.auth = { login, logout, refresh }
  }
})
```

**Plugin Isolation:**
- Plugins cannot access internal state directly (only via `pwa.state()`).
- Plugin errors are caught and reported; they do not crash the runtime.
- Plugins are executed in registration order; no inter-plugin dependencies.

---

## 12. Security Architecture

### 12.1 CSP Presets

| Preset | Script Policy | Style Policy | Connect Policy | Use Case |
|--------|--------------|--------------|----------------|----------|
| `strict` | `'self'` only | `'self'` only | `'self'` + API domains | Enterprise, finance |
| `moderate` | `'self'` + hashes | `'self'` + `unsafe-inline` | `'self'` + CDN | SaaS, e-commerce |
| `relaxed` | `'self'` + `unsafe-inline` | `'self'` + `unsafe-inline` | `*` | Prototyping, dev |

### 12.2 Permission Policy Enforcement

Auto-generated `Permissions-Policy` header based on requested capabilities:
```
Permissions-Policy: camera=self, microphone=(), geolocation=self
```

### 12.3 Scope Isolation

Manifest `scope` is enforced at runtime:
- Navigation outside scope triggers warning.
- SW registration fails if scope mismatches.

---

## 13. Enterprise Architecture

### 13.1 Auth Layer Architecture

The auth layer sits between the mutation queue and the network. It intercepts every outbound request to check token validity before transmission.

```
[Mutation Queue] ──▶ [Auth Guard] ──▶ [Network]
                         │
                    Token expired?
                         │
                    [Leader Tab Refreshes]
                         │
                    [Broadcast New Token]
                         │
                    [Resume Queue]
```

**Key Design:**
- Token stored in IDB with expiry timestamp
- Only leader tab performs refresh (prevents 401 storms)
- Pre-replay check: if token expires within 30s, refresh first
- Cross-tab sync: new token broadcast via BroadcastChannel

### 13.2 Network Intelligence Architecture

Network profiling combines passive (`navigator.connection`) and active (request timing) measurement.

```
[navigator.connection] ──▶ ┐
                            ├──▶ [Network Profiler] ──▶ [Profile: slow|unstable|fast]
[Request Timing Data] ───▶ ┘                                │
                                                            ▼
                                                   [Sync Scheduler]
                                                    (adapts behavior)
```

**Behavioral Adaptation:**

| Profile | Sync Behavior | Retry Policy | Parallelism |
|---------|--------------|--------------|-------------|
| `slow` | Defer non-critical | 3 retries, 2x backoff | 1 concurrent |
| `unstable` | Queue-only, no sync | 5 retries, exponential | 2 concurrent |
| `fast` | Aggressive immediate | 5 retries, linear | 5 concurrent |

### 13.3 Audit Pipeline

```
[Event Bus] ──▶ [Audit Interceptor] ──▶ [Hash Chain] ──▶ [IndexedDB]
                                              │
                                        SHA-256(prev_hash + entry)
                                              │
                                        [Tamper Detection]
```

**Hash Chaining:**
Each audit entry includes the SHA-256 hash of the previous entry. Any modification breaks the chain, making tampering detectable.

```
Entry 1: hash("root")
Entry 2: hash(Entry 1 hash + data)
Entry 3: hash(Entry 2 hash + data)
...
```

### 13.4 Policy Engine Architecture

```
[Policy Config] ──▶ [Policy Engine] ──▶ [Runtime Interceptors]
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                         [Storage]      [Network]      [Permissions]
                         Quota check    Offline check  Allowlist check
```

**Interception Points:**
- Storage writes: check against `storageLimit`
- Network requests: check against `offline` policy
- Permission requests: check against allowlist/denylist
- Queue enqueue: check against `maxQueueDepth`

### 13.5 Disaster Recovery Architecture

```
[pwa.recovery.reset()]
        │
        ▼
┌──────────────────┐
| Backup Specified │
| Keys (auth, etc) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
| Wipe IDB, Cache, │
| Queue, State     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
| Restore Backed   │
| Keys             │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
| Re-register SW,  │
| Reset State      │
└──────────────────┘
```

### 13.6 SLA Metrics Architecture

```
[Runtime Events] ──▶ [Metrics Aggregator] ──▶ [IDB Persistence]
                                                    │
                     ┌──────────────────────────────┼──────────────────┐
                     ▼                              ▼                  ▼
              [pwa.metrics.get()]     [Datadog Export]      [Alert Thresholds]
```

**Metrics Collection:**
- Uptime: derived from online/offline state transitions
- Sync success rate: successful replays / total replays
- Replay latency: timestamp from dequeue to server acknowledgment
- Failure rate: failed replays / total replays
- Percentiles (p50, p95, p99) calculated from rolling window (last 1000 entries)

---

## 14. Observability & Telemetry

### 14.1 Event Bus

All lifecycle events flow through a unified observable:

```typescript
pwa.observe().subscribe((event) => {
  // Send to your telemetry backend
  analytics.track(event.type, event.detail)
})
```

### 14.2 Built-In Metrics

| Metric | Description | Emitted On |
|--------|-------------|------------|
| `sw.activate_duration` | Time from detection to activation | `update:applied` |
| `mutation.queue_depth` | Current pending mutations | Every 60s |
| `mutation.replay_latency` | Time from online to sync complete | `mutation:synced` |
| `permission.denial_rate` | % of denied requests | Every permission request |
| `storage.quota_utilization` | % of storage used | Every 5min |

### 14.3 Telemetry Adapters

Pluggable interface for external backends:
```typescript
interface TelemetryAdapter {
  track(event: string, data: Record<string, unknown>): void
  flush(): Promise<void>
}

pwa.telemetry.use(new DatadogAdapter({ apiKey: "..." }))
```

---

## 15. Build & Tooling Pipeline

### 15.1 SW Builder Flow

```
[better-pwa.config.ts]
        │
        ▼
  [Config Validator] ──fail──▶ [CLI Error]
        │ pass
        ▼
  [Manifest Generator]
        │
        ▼
  [Workbox Precache Config]
        │
        ▼
  [esbuild Bundle] ──────────▶ [sw.js]
        │
        ▼
  [Size Check] ──exceed──▶ [Build Fail]
        │ pass
        ▼
  [Output to dist/]
```

### 15.2 CLI Commands

| Command | Description | Exit Code on Failure |
|---------|-------------|---------------------|
| `better-pwa init` | Scaffold project | 1 |
| `better-pwa build` | Generate SW + manifest | 1 |
| `better-pwa doctor` | Audit configuration | 0 (warnings only) |
| `better-pwa preview` | Local dev server with SW | 1 |
| `better-pwa audit` | Lighthouse PWA check | 0-100 (score) |

---

## 16. Performance Budgets

| Asset | Budget (gzip) | Enforcement |
|-------|---------------|-------------|
| `@better-pwa/core` | <15KB | CI size-check, fail on exceed |
| `@better-pwa/offline` | <8KB | CI size-check |
| `@better-pwa/storage` | <5KB | CI size-check |
| `sw.js` (generated) | <50KB | Build warning at 40KB, fail at 50KB |
| State propagation latency | <50ms | Integration test |
| Leader election time | <100ms | Integration test |

---

## 17. Design Decisions & Trade-offs

### 17.1 Why Custom State Engine Instead of RxJS/Redux?

**Decision:** Build lightweight reactive state from scratch.

**Rationale:**
- RxJS adds ~40KB (gzip). Redux requires boilerplate we're eliminating.
- Our state model is simple: atomic key-value updates with subscribers.
- Zero-dependency principle.

**Trade-off:** Less powerful than RxJS (no operators, schedulers). Acceptable for PWA state model.

---

### 17.2 Why IndexedDB for State Persistence Instead of localStorage?

**Decision:** Use IndexedDB for critical state persistence.

**Rationale:**
- localStorage is synchronous (blocks main thread).
- localStorage has ~5MB limit; IDB scales to storage quota.
- IDB supports structured data (no JSON serialization overhead).

**Trade-off:** More complex API. Abstracted behind `pwa.state()` so app code is unaffected.

---

### 17.3 Why Leader Election for Multi-Tab Instead of All-Tab Sync?

**Decision:** Elect one tab as coordinator for mutation replay.

**Rationale:**
- Prevents duplicate API calls (all tabs replaying same queue).
- Reduces browser resource contention.
- Simplifies conflict resolution (one decision-maker).

**Trade-off:** Leader tab must stay open for sync. Mitigation: leader re-election on tab close.

---

### 17.4 Why Workbox for Precaching Instead of Custom SW?

**Decision:** Build on Workbox for asset precaching.

**Rationale:**
- Workbox is battle-tested, handles edge cases we don't want to reimplement.
- Our value is orchestration, not reinventing cache strategies.
- Workbox integrates with existing build tools (Vite, webpack).

**Trade-off:** Adds ~12KB to SW. Acceptable given stability benefits.

---

## 18. Appendix

### 18.1 Glossary

| Term | Definition |
|------|-----------|
| **SW** | Service Worker |
| **Fugu** | Project Fugu (Chrome capability APIs) |
| **OPFS** | Origin Private File System |
| **IDB** | IndexedDB |
| **CSP** | Content Security Policy |
| **LRU** | Least Recently Used |
| **LFU** | Least Frequently Used |
| **TTL** | Time To Live |
| **LWW** | Last Write Wins |

### 18.2 Related Documents

- [Product Requirements](./PRD.md)
- [Features](./FEATURES.md)
- [Roadmap](./ROADMAP.md)
- [Packages & Release](./PACKAGE-RELEASE.md)
- [Guarantees](./GUARANTEES.md)

### 18.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-03-XX | Core Team | Initial draft |
| 1.0 | 2026-04-04 | Core Team | FAANG-grade structure, ADRs, budgets |

---

*This document is the source of truth for better-pwa architecture. Changes require engineering review and must be reflected in implementation.*
