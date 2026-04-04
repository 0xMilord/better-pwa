# Changelog

## @better-pwa/core@1.0.0 (2026-04-04)

### Breaking Changes
- **Initial production release** — all APIs are new
- State schema includes `_version` field for migration tracking
- `createPwa()` returns unwrapped runtime instance (call `.init()` explicitly)

### New Features
- **Reactive State Engine** — single source of truth for PWA environment state
  - Immutable snapshots, atomic updates, IDB persistence, cross-tab BroadcastChannel sync
  - API: `pwa.state().snapshot()`, `.subscribe(keys, cb)`, `.set(key, value)`, `.reset()`
- **Deterministic Lifecycle State Machine** — guarded transition system
  - 8 states: IDLE, BOOT, READY, OFFLINE, SYNCING, STABLE, UPDATING, DEGRADED
  - Every transition: guard fn + action fn + fallback state
  - API: `pwa.lifecycle.state()`, `.onTransition(cb)`, `.blockedTransitions()`
- **Lifecycle Event Bus** — typed events for all PWA lifecycle moments
  - 15+ event types: sw:registered, sw:activated, app:offline, app:online, update:available, etc.
  - API: `pwa.on(type, cb)`, `pwa.observe().subscribe(cb)`
- **Update Controller** — declarative SW update strategies
  - 4 strategies: soft, hard, gradual, on-reload
  - State machine: IDLE → DOWNLOADING → WAITING → ACTIVATING → IDLE
  - Loop detection (max 2 cycles), gradual rollout with hash-based assignment
- **Permission Orchestrator** — batched, resilient permission management
  - Deduplication of already-granted permissions
  - Exponential backoff: 1s → 2s → 4s → 8s
  - Fallback UI hooks, visibilitychange invalidation
- **State Migrations** — versioned schema upgrades
  - `pwa.registerMigration(version, fn)` with auto-chaining
  - Atomic execution, backward compatibility window
- **Opinionated Presets** — saas, ecommerce, offline-first, content
  - Each preset configures: update strategy, permission behavior, storage engine, conflict resolution, priority tiers
- **Cold Start Strategy** — 4-stage sequential boot pipeline
  - HYDRATE → SYNC → UPDATE → REPLAY with per-stage timeouts
  - Graceful degradation on any stage failure
- **Service Worker Registration** — wrapper with lifecycle event integration
- **Plugin System** — `pwa.use(plugin)` with onInit, onStateChange, onLifecycleEvent hooks

### Bundle Size
- ESM: 17.96 KB (raw) / ~6.1 KB (gzip) — within 15 KB budget ✅

---

## @better-pwa/offline@1.0.0 (2026-04-04)

### New Features
- **IDB-Backed Mutation Queue** — durable offline action storage
  - Priority-aware ordering (critical > high > normal > low)
  - Survives page reloads and browser restarts
  - API: `MutationQueue.init()`, `.enqueue()`, `.getAll()`, `.replay()`, `.clear()`
- **Replay Engine** — single-pass processing with retry logic
  - Failed entries requeued within retry limit
  - Concurrent replay prevention
  - Priority-sorted processing on each replay

### Bundle Size
- ESM: 11.40 KB (raw) / ~4.3 KB (gzip) — within 8 KB budget ✅

---

## @better-pwa/storage@1.0.0 (2026-04-04)

### New Features
- **Unified Storage Abstraction** — OPFS/IDB/memory engine selection
  - Auto-selects best available engine (IDB → memory fallback)
  - Full CRUD: `.set()`, `.get()`, `.delete()`, `.keys(pattern)`
  - Quota monitoring, LRU/LFU/TTL eviction policies
  - API: `StorageEngine.init()`, `.quota()`, `.evict(policy)`, `.onQuotaLow(cb)`

### Bundle Size
- ESM: 11.47 KB (raw) / ~4.3 KB (gzip) — within 5 KB budget ✅

---

## @better-pwa/sw-builder@1.0.0 (2026-04-04)

### New Features
- **Config-Driven SW Generation** — Workbox-based service worker builder
  - 5 caching strategies: cache-first, network-first, stale-while-revalidate, network-only, cache-only
  - Automatic precache manifest from file globs
  - Runtime caching rules with expiration policies
  - SKIP_WAITING message handler
  - API: `generateSw()`, `buildSw()`, `DEFAULT_CONFIG`

### Bundle Size
- ESM: 13.14 KB (raw) / ~5.0 KB (gzip) — within 50 KB budget ✅

---

## @better-pwa/manifest@1.0.0 (2026-04-04)

### New Features
- **Web App Manifest Generation** — standards-compliant manifest.json
  - All PWA fields: name, short_name, start_url, display, theme_color, icons
  - Auto-generate 8 icon sizes from source template
  - HTML link tag generation
  - API: `generateManifest()`, `writeManifest()`, `generateHtmlLinks()`, `generateDefaultIcons()`

### Bundle Size
- ESM: 10.79 KB (raw) / ~4.2 KB (gzip) — within 5 KB budget ✅

---

## better-pwa@1.0.0 (2026-04-04)

### New Features
- **CLI entry point** — `better-pwa` command-line interface
  - Initial stub with version info
  - Full CLI (init, build, doctor, preview, simulate, audit, debug) planned for v1.1

### Bundle Size
- CLI: 585 B (CJS) — minimal footprint ✅

---

## @better-pwa/adapter-react@1.0.0 (2026-04-04)

### New Features
- **React Hooks** — `usePwaState()`, `usePwaUpdate()`
  - Initial stub implementation
  - Full hooks with real state subscription planned for v1.1

### Bundle Size
- ESM: 135 B (raw) — minimal stub ✅

---

## @better-pwa/adapter-vue@1.0.0 (2026-04-04)

### New Features
- **Vue Composables** — `usePwaState()`
  - Initial stub implementation
  - Full composables with reactive integration planned for v1.1

### Bundle Size
- ESM: 75 B (raw) — minimal stub ✅

---

## @better-pwa/adapter-svelte@1.0.0 (2026-04-04)

### New Features
- **Svelte Stores** — `pwaState()`
  - Initial stub implementation
  - Full store integration planned for v1.1

### Bundle Size
- ESM: 65 B (raw) — minimal stub ✅

---

## @better-pwa/adapter-next@1.0.0 (2026-04-04)

### New Features
- **Next.js Integration** — App Router integration stub
  - Initial stub implementation
  - Full integration with RSC and route handlers planned for v1.1

### Bundle Size
- ESM: 45 B (raw) — minimal stub ✅

---

## @better-pwa/adapter-vite@1.0.0 (2026-04-04)

### New Features
- **Vite Plugin** — SW injection during dev and build
  - Initial stub implementation
  - Full plugin with HMR support planned for v1.1

### Bundle Size
- ESM: 78 B (raw) — minimal stub ✅

---

## Infrastructure (v1.0.0)

### CI/CD
- GitHub Actions: `ci.yml` — lint → test → build → size-check → guarantee tests → reliability tests
- GitHub Actions: `release.yml` — verify → build → size-check → test → publish on tag push
- GitHub Actions: `deploy-docs.yml` — Eleventy build → GitHub Pages deploy on push to main

### Release Pipeline
- npm workspaces monorepo (11 packages)
- Changeset-driven versioning with `scripts/release.js`
- One-command release: `npm run release` (lint → test → build → size → version → changelog → commit → tag → publish)
- Dry run support: `npm run release:dry-run`
- Bundle size budget enforcement per package

### Testing
- Vitest + jsdom + fake-indexeddb + broadcastchannel-polyfill
- 176 tests passing across 16 test files
- Coverage thresholds: 65% statements, 55% branches, 60% functions, 70% lines
- Test types: unit, integration, reliability (10K iterations), monkey, guarantee verification

### Documentation
- Eleventy static site with Nunjucks templates
- Dark/light mode via `prefers-color-scheme`
- Sharp, grid-based, mono-font design system
- 10 pages: landing, getting started (4), API reference (4), guarantees

### Dogfooding
- @better-logger/core integrated across all packages for structured flow logging
- SaaS example app — vanilla JS dashboard with live state monitoring
