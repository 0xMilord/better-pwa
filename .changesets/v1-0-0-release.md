---
"@better-pwa/core": major
"@better-pwa/offline": major
"@better-pwa/storage": major
"@better-pwa/sw-builder": major
"@better-pwa/manifest": major
"better-pwa": major
"@better-pwa/adapter-react": major
"@better-pwa/adapter-vue": major
"@better-pwa/adapter-svelte": major
"@better-pwa/adapter-next": major
"@better-pwa/adapter-vite": major
---

# better-pwa v1.0.0 — Initial Production Release

## 🚀 New

### @better-pwa/core
- **Reactive State Engine** — single source of truth for all PWA environment state (`isOffline`, `isInstalled`, `hasUpdate`, `permissions`, `storage`, `connectionType`)
  - Immutable snapshots (frozen objects), atomic multi-key updates
  - IDB persistence for critical state keys across page reloads
  - BroadcastChannel cross-tab sync within 50ms
  - `pwa.state().snapshot()`, `.subscribe()`, `.set()`, `.reset()`
- **Deterministic Lifecycle State Machine** — formal state machine with guarded transitions
  - States: `IDLE → BOOT → READY → OFFLINE → SYNCING → STABLE → UPDATING → DEGRADED`
  - Every transition has guard fn, action fn, and fallback state
  - `pwa.lifecycle.state()`, `.onTransition()`, `.blockedTransitions()`
- **Lifecycle Event Bus** — typed events for all PWA lifecycle moments
  - Events: `sw:registered`, `sw:activated`, `sw:redundant`, `app:offline`, `app:online`, `update:available`, `permission:changed`, `tab:join`, `tab:leave`, `boot:stage_complete`
  - `pwa.on(event, cb)`, `pwa.observe().subscribe(cb)`
- **Service Worker Registration** — wrapper with fallback handling and update detection
  - Auto-emits lifecycle events on SW state changes
  - `registerServiceWorker()`, `getSwRegistration()`
- **Update Controller** — declarative SW update strategies
  - Strategies: `soft`, `hard`, `gradual`, `on-reload`
  - State machine: `IDLE → DOWNLOADING → WAITING → ACTIVATING → IDLE`
  - Update loop detection (max 2 cycles triggers alert)
  - Gradual rollout with deterministic user assignment via hash
  - `pwa.update().setStrategy()`, `.activate()`, `.status()`
- **Permission Orchestrator** — batched, resilient permission management
  - Batch request API with deduplication (skip already-granted)
  - Exponential backoff retry (1s, 2s, 4s, 8s)
  - Fallback UI hook system with customizable prompts
  - State invalidation on `visibilitychange`
  - `pwa.permissions().request()`, `.status()`, `.on("denied")`
- **Opinionated Presets** — 100 configuration decisions → 1 choice
  - `saas` — soft updates, batch permissions, auto storage, LWW conflicts
  - `ecommerce` — on-reload updates, sequential permissions, manual conflicts
  - `offline-first` — gradual updates, merge conflicts, aggressive caching
  - `content` — soft updates, manual permissions, minimal sync
- **Cold Start Strategy** — deterministic sequential boot pipeline
  - Stages: HYDRATE → SYNC → UPDATE → REPLAY
  - Per-stage timeout and failure isolation
  - Cache freshness validation (date header check)
  - DEGRADED state fallback if hydrate fails
- **State Migrations** — versioned state schema with migration chain
  - `pwa.registerMigration(version, fn)` for schema upgrades
  - Auto-chaining, atomic execution, backward compatibility window
  - `_version` field in state schema

### @better-pwa/offline
- **IDB-Backed Mutation Queue** — durable offline action storage
  - FIFO queue with priority awareness (critical > high > normal > low)
  - Survives page reloads, browser restarts, crashes
  - `MutationQueue.init()`, `.enqueue()`, `.getAll()`, `.replay()`, `.clear()`
- **Replay Engine** — single-pass replay with retry logic
  - Processes queue on demand, respects priority ordering
  - Failed entries requeued within retry limit, moved to failed after max retries
  - Concurrent replay prevention (single-pass guard)

### @better-pwa/storage
- **Unified Storage Abstraction** — OPFS/IDB/memory engine selection
  - Auto-selects best engine: IDB fallback to memory
  - Full CRUD API: `.set()`, `.get()`, `.delete()`, `.keys(pattern)`
  - Quota monitoring via `navigator.storage.estimate()`
  - Eviction policies: LRU, LFU, TTL
  - `StorageEngine.init()`, `.quota()`, `.evict()`, `.onQuotaLow()`

### @better-pwa/sw-builder
- **Config-Driven SW Generation** — Workbox-based service worker builder
  - 5 runtime caching strategies: cache-first, network-first, stale-while-revalidate, network-only, cache-only
  - Automatic precache manifest generation from file glob patterns
  - Custom runtime caching rules with expiration policies
  - SKIP_WAITING message handler for instant updates
  - `generateSw()`, `buildSw()`, `DEFAULT_CONFIG`

### @better-pwa/manifest
- **Web App Manifest Generation** — standards-compliant manifest.json
  - Full PWA manifest fields: name, short_name, start_url, display, theme_color, icons
  - Auto-generate 8 icon sizes (72x72 through 512x512) from source
  - HTML link tag generation for manifest and icons
  - `generateManifest()`, `writeManifest()`, `generateHtmlLinks()`, `generateDefaultIcons()`

### Framework Adapters
- **@better-pwa/adapter-react** — React hooks (`usePwaState()`, `usePwaUpdate()`)
- **@better-pwa/adapter-vue** — Vue composables (`usePwaState()`)
- **@better-pwa/adapter-svelte** — Svelte stores (`pwaState()`)
- **@better-pwa/adapter-next** — Next.js integration stub
- **@better-pwa/adapter-vite** — Vite plugin stub

### Infrastructure
- **npm workspaces monorepo** — 11 packages, shared tooling
- **CI/CD pipelines** — GitHub Actions: lint → test → build → size-check → guarantee tests
- **Release pipeline** — one-command release with changesets, auto-versioning, CHANGELOG generation
- **Bundle size budgets** — enforced per package (core <15KB gzip, offline <8KB, storage <5KB)

## 🧪 Testing

- **176 tests passing** across 16 test files
- **Unit tests** — state engine, lifecycle bus, permissions, updates, presets, cold start, runtime, queue, storage, SW builder, manifest
- **Integration tests** — runtime init flow, guarantee verification
- **Reliability tests** — 10,000 rapid state updates, 10,000 transitions, 1,000 storage ops
- **Monkey tests** — random inputs, random transitions, random enqueue/replay cycles
- **Guarantee tests** — G1 (Data Durability), G2 (Update Safety), G3 (Cross-Tab), G4 (Permission Resilience), G5 (Cold Start), G7 (Resource Prioritization)

## 📚 Documentation

- **Eleventy docs site** — 10 pages built with Nunjucks templates
- Getting Started: Introduction, Quick Start, Installation, Mental Model
- API Reference: createPwa(), pwa.state(), pwa.update, pwa.permissions
- Guarantees overview with runtime contract

## 🐛 Dogfooding

- **SaaS example app** — vanilla JS dashboard demonstrating live state monitoring, offline detection, event logging, update simulation
- **@better-logger/core** — used across all packages for structured flow logging
