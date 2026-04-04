---
# Product Roadmap: better-pwa

| Metadata | Details |
|----------|---------|
| **Project** | `better-pwa` |
| **Version** | 1.0 (Draft) |
| **Status** | 🟡 In Review |
| **Last Updated** | 2026-04-04 |
| **Owner** | Product & Engineering |
| **Target GA** | Q3 2026 (v1.0) |

---

## Table of Contents

1. [Roadmap Overview](#1-roadmap-overview)
2. [Strategic Themes](#2-strategic-themes)
3. [Phase 1: v0.1 — The Modern Core & State](#3-phase-1-v01--the-modern-core--state)
4. [Phase 2: v0.2 — Update UX & Permissions](#4-phase-2-v02--update-ux--permissions)
5. [Phase 3: v0.3 — Data Consistency & Storage](#5-phase-3-v03--data-consistency--storage)
6. [Phase 4: v0.4 — Platform-Level Coordination](#6-phase-4-v04--platform-level-coordination)
7. [Phase 5: v1.0 — The "Full Stack" Release](#7-phase-5-v10--the-full-stack-release)
8. [Post-v1.0: Future Horizons](#8-post-v10-future-horizons)
9. [Risk & Dependency Mapping](#9-risk--dependency-mapping)
10. [Milestone Tracking](#10-milestone-tracking)
11. [Appendix](#11-appendix)

---

## 1. Roadmap Overview

### 1.1 Timeline Summary

| Phase | Version | Theme | Target Date | Duration |
|-------|---------|-------|-------------|----------|
| **Phase 1** | v0.1 | Modern Core & State | April 2026 | 4 weeks |
| **Phase 2** | v0.2 | Update UX & Permissions | May 2026 | 4 weeks |
| **Phase 3** | v0.3 | Data Consistency & Storage | June 2026 | 4 weeks |
| **Phase 4** | v0.4 | Platform-Level Coordination | July 2026 | 4 weeks |
| **Phase 5** | v1.0 | Full Stack Release | August 2026 | 6 weeks |

### 1.2 Release Philosophy

- **Semantic Versioning:** `v0.x` denotes pre-1.0 (API may change). `v1.0` is API-stable.
- **Incremental Value:** Each phase delivers standalone production value. No phase is blocked by future work.
- **Dogfooding:** Each phase is tested against a real PWA before release.
- **Feature Flags:** Unstable features are gated; stable features remain unaffected by WIP.

---

## 2. Strategic Themes

| Theme | Description | Phases |
|-------|-------------|--------|
| **Foundation** | State engine, SW registration, lifecycle bus | v0.1 |
| **Lifecycle** | Update strategies, permission batching | v0.2 |
| **Data** | Offline queue, storage abstraction, conflict resolution | v0.3 |
| **Platform** | Multi-tab sync, observability, plugin system | v0.4 |
| **Production** | Security, distribution, CLI, growth engine | v1.0 |

### 2.2 Dependency Graph

```
v0.1 (Core) ──────▶ v0.2 (Lifecycle) ──────▶ v0.3 (Data)
     │                      │                       │
     ▼                      ▼                       ▼
  State Engine          Update Controller       Offline Queue
  Lifecycle Bus         Permission Orch.        Storage Abstraction
  SW Builder            Fallback UI             Framework Adapters
                                                  │
                                                  ▼
                     v0.4 (Platform) ◀────────────┘
                          │
                          ▼
                    Multi-Tab Sync
                    Observability
                    Plugin System
                          │
                          ▼
                     v1.0 (Production)
                          │
                          ▼
                    Security Layer
                    Distribution Engine
                    Growth Engine
                    CLI
```

---

## 3. Phase 1: v0.1 — The Modern Core & State

**Target Date:** April 2026 | **Duration:** 4 weeks | **Theme:** Foundation

### 3.1 Objectives

Establish the foundational layer: reactive state engine, basic lifecycle management, and config-driven SW generation.

### 3.2 Deliverables

| ID | Deliverable | Description | Priority | Status |
|----|-------------|-------------|----------|--------|
| D-01 | Core Runtime | SW registration, lifecycle event bus, basic error handling | P0 | 🟡 Planned |
| D-02 | State Engine (v1) | `isOffline`, `isInstalled`, `canInstall` with reactive subscriptions | P0 | 🟡 Planned |
| D-03 | SW Builder | Config-driven `sw.js` generation (precaching + basic cache strategies) | P0 | 🟡 Planned |
| D-04 | Manifest Engine | Basic `manifest.json` generation from config | P1 | 🟡 Planned |
| D-05 | TypeScript Types | Full type definitions for all public APIs | P1 | 🟡 Planned |
| D-15 | Opinionated Presets | `saas`, `ecommerce`, `offline-first`, `content` — 100 decisions → 1 | P0 | 🟡 Planned |
| D-16 | Cold Start Strategy | Staged boot: hydrate → sync → update → replay, with failure isolation | P0 | 🟡 Planned |

### 3.3 Technical Tasks

- [ ] **Core Runtime**
  - [ ] Implement `BetterPwaRuntime` class with init/destroy lifecycle
  - [ ] SW registration wrapper with fallback handling
  - [ ] Lifecycle event bus (typed events, subscribe/unsubscribe)
  - [ ] Error boundary for SW registration failures

- [ ] **State Engine**
  - [ ] Reactive state store (in-memory, immutable snapshots)
  - [ ] Network state listener (`online`/`offline` events, `navigator.connection`)
  - [ ] Install state listener (`beforeinstallprompt`, `appinstalled`)
  - [ ] IDB persistence layer for critical state keys
  - [ ] BroadcastChannel sync for cross-tab state propagation

- [ ] **SW Builder**
  - [ ] esbuild integration for SW bundling
  - [ ] Workbox precaching setup
  - [ ] Config schema (`better-pwa.config.ts`)
  - [ ] Output to `dist/sw.js` with precache manifest injection

- [ ] **Manifest Engine**
  - [ ] JSON manifest generator from config
  - [ ] Icon resizing pipeline (512x512 → all required sizes)
  - [ ] Output to `dist/manifest.json`

- [ ] **Opinionated Presets**
  - [ ] Define `saas`, `ecommerce`, `offline-first`, `content` preset configs
  - [ ] Map each preset to update strategy, permission behavior, storage engine, conflict resolution, priority tiers
  - [ ] Preset override API (merge custom on top of preset)
  - [ ] `better-pwa doctor` validates preset config quality

- [ ] **Cold Start Strategy**
  - [ ] Staged boot sequence: hydrate → sync → update → replay
  - [ ] Per-stage timeout and failure handling
  - [ ] Cache freshness validation (date header check)
  - [ ] DEGRADED state fallback if hydrate fails

### 3.4 Acceptance Criteria

- [ ] `pwa.state().snapshot()` returns accurate `isOffline`, `isInstalled`
- [ ] State updates propagate across tabs within 50ms
- [ ] SW builds successfully with `better-pwa build`
- [ ] Manifest passes basic Lighthouse PWA checks
- [ ] Full TypeScript coverage for public API

### 3.5 Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Safari OPFS incompatibility | High | Medium | Graceful degradation to IDB in v0.1 |
| Workbox version conflicts | Medium | High | Pin Workbox version, isolate in SW bundle |
| Bundle size exceeds 15KB | Medium | High | CI size-check gate, tree-shaking audit |

---

## 4. Phase 2: v0.2 — Update UX & Permissions

**Target Date:** May 2026 | **Duration:** 4 weeks | **Theme:** Lifecycle

### 4.1 Objectives

Solve the two most painful parts of PWA development: update management and permission requests.

### 4.2 Deliverables

| ID | Deliverable | Description | Priority | Status |
|----|-------------|-------------|----------|--------|
| D-06 | Update Controller | `soft`, `hard`, `gradual`, `on-reload` strategies with state machine | P0 | 🟡 Planned |
| D-07 | Permission Orchestrator | Batched requests, state tracking, fallback UI hooks | P0 | 🟡 Planned |
| D-08 | Debug Mode | `pwa.debug()` with real-time state visualization, console diagnostics | P1 | 🟡 Planned |
| D-09 | Logging System | Structured logging with levels (debug, info, warn, error) | P1 | 🟡 Planned |
| D-17 | Deterministic State Machine | Formal lifecycle: IDLE → BOOT → READY → OFFLINE → SYNCING → STABLE → UPDATING | P0 | 🟡 Planned |
| D-18 | State Migrations | Versioned state schema with migration chain, rollback, atomicity | P0 | 🟡 Planned |
| D-19 | Dev-Time Simulator | `better-pwa simulate` CLI + programmatic testing + DevTools panel | P1 | 🟡 Planned |

### 4.3 Technical Tasks

- [ ] **Update Controller**
  - [ ] SW hash polling (configurable interval)
  - [ ] State machine: IDLE → DOWNLOADING → WAITING → ACTIVATING
  - [ ] Strategy implementations (`soft`, `hard`, `gradual`, `on-reload`)
  - [ ] Gradual rollout logic (deterministic user assignment via seed)
  - [ ] Rollback on activation failure
  - [ ] Update loop detection and prevention

- [ ] **Permission Orchestrator**
  - [ ] Batch request API with deduplication (skip already-granted)
  - [ ] Exponential backoff retry logic (1s, 2s, 4s, 8s)
  - [ ] Fallback UI hook system (customizable prompts)
  - [ ] Permission state caching (IDB-backed)
  - [ ] State invalidation on `visibilitychange`
  - [ ] Pre-prompt hook for custom UI

- [ ] **Debug Mode**
  - [ ] `pwa.debug()` toggle
  - [ ] Console state dump (formatted table)
  - [ ] Event stream logging
  - [ ] SW health check endpoint

- [ ] **Deterministic State Machine**
  - [ ] Define all states: IDLE, BOOT, READY, OFFLINE, SYNCING, UPDATING, STABLE, DEGRADED
  - [ ] Implement transition guards (guard fn, action fn, fallback state)
  - [ ] State exposure API: `pwa.lifecycle.state()`, `onTransition()`
  - [ ] Blocked transition tracking: `pwa.lifecycle.blockedTransitions()`
  - [ ] Plugin integration: plugins declare state-dependent behavior

- [ ] **State Migrations**
  - [ ] Migration registry: `pwa.migrations.register(version, fn)`
  - [ ] Auto-chaining (v1 → v2 → v3)
  - [ ] Atomic execution with rollback on failure
  - [ ] Migration gate (no reads until migrations complete)
  - [ ] Configurable migration window (default: 3 versions back)

- [ ] **Dev-Time Simulator**
  - [ ] CLI: `better-pwa simulate offline|slow-network|update|permission-denied|multi-tab|cold-start|storage-full`
  - [ ] Programmatic API: `simulate.offline(pwa)`, `simulate.online(pwa)` for test suites
  - [ ] Dev server integration: simulation panel in `better-pwa preview`
  - [ ] Tree-shakeable (zero cost in production builds)

### 4.4 Acceptance Criteria

- [ ] Update detection within 1 SW lifecycle tick (~60s)
- [ ] No update loops or double-activations in multi-tab scenarios
- [ ] Batch permission requests reduce prompts by 60%+
- [ ] Fallback UI shown within 200ms of denial
- [ ] `pwa.debug()` outputs actionable diagnostics

### 4.5 Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gradual rollout edge cases | Medium | High | Deterministic assignment via hash(seed + userId) |
| Permission batching unsupported by browser | High | Medium | Fallback to sequential requests with UX explanation |
| Debug mode leaks to production | Low | High | Tree-shakeable in production builds |

---

## 5. Phase 3: v0.3 — Data Consistency & Storage

**Target Date:** June 2026 | **Duration:** 4 weeks | **Theme:** Data

### 5.1 Objectives

Build robust offline data capabilities: mutation queuing, replay engine, and unified storage abstraction.

### 5.2 Deliverables

| ID | Deliverable | Description | Priority | Status |
|----|-------------|-------------|----------|--------|
| D-10 | Offline Data Layer | Mutation queue, replay engine, optimistic update hooks | P0 | 🟡 Planned |
| D-11 | Storage Abstraction | Unified API for OPFS, IDB, memory with engine selection | P0 | 🟡 Planned |
| D-12 | Quota & Eviction | Dynamic monitoring, LRU/LFU/TTL eviction policies | P1 | 🟡 Planned |
| D-13 | Framework Adapters | `@better-pwa/next` and `@better-pwa/vite` support | P1 | 🟡 Planned |
| D-20 | Conflict Resolution Extensibility | Custom resolver registration, CRDT-style merging, wildcard patterns | P1 | 🟡 Planned |
| D-21 | Resource Priority System | Priority tiers (critical/high/normal/low) affecting replay, eviction, sync | P1 | 🟡 Planned |

### 5.3 Technical Tasks

- [ ] **Offline Data Layer**
  - [ ] IDB-backed mutation queue (FIFO, durable)
  - [ ] Replay engine (online event trigger, parallel execution)
  - [ ] Conflict resolution strategies (LWW, merge, manual)
  - [ ] Optimistic update API (apply locally, revert on failure)
  - [ ] Queue persistence across page reloads and browser restarts

- [ ] **Storage Abstraction**
  - [ ] OPFS engine implementation
  - [ ] IndexedDB engine implementation
  - [ ] Memory engine (fallback, with warning)
  - [ ] Automatic engine selection logic
  - [ ] Key pattern matching (`keys("user:*")`)

- [ ] **Quota & Eviction**
  - [ ] `navigator.storage.estimate()` polling (5min interval)
  - [ ] Threshold-based eviction (60% warn, 80% evict, 95% block)
  - [ ] LRU, LFU, TTL eviction policies
  - [ ] Configurable eviction settings

- [ ] **Framework Adapters**
  - [ ] React: `usePwaState()`, `usePwaUpdate()` hooks
  - [ ] Vue: `usePwaState()` composable
  - [ ] Svelte: `pwaState` store
  - [ ] Next.js: App Router integration
  - [ ] Vite: Plugin for SW injection

- [ ] **Conflict Resolution Extensibility**
  - [ ] Custom resolver registration: `pwa.conflicts.register(resource, resolver)`
  - [ ] Wildcard pattern matching (`/api/users/*`)
  - [ ] CRDT-style merge types (g-counter, pn-counter, OR-set)
  - [ ] Fallback to manual queue on resolver failure

- [ ] **Resource Priority System**
  - [ ] Priority tier definitions (critical, high, normal, low)
  - [ ] Priority-aware replay queue (critical dequeued first)
  - [ ] Priority-aware cache eviction (low evicted first)
  - [ ] Priority-aware sync scheduler (critical synced first)
  - [ ] Preset default priority mappings
  - [ ] Per-operation priority override API

### 5.4 Acceptance Criteria

- [ ] Mutation queue survives browser restart
- [ ] Replay engine guarantees at-least-once delivery
- [ ] Conflict resolution strategy is configurable per queue
- [ ] Storage engine selection is transparent and configurable
- [ ] Framework adapters are tree-shakeable (0 cost if unused)
- [ ] Quota monitoring triggers eviction before app breaks

### 5.5 Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Replay engine drops mutations | Low | Critical | At-least-once guarantee with IDB transaction safety |
| OPFS API changes in Chrome | Medium | High | Abstract behind adapter, feature-detect |
| Framework adapter churn | Medium | Medium | Pin peer dependency versions, test matrix |

---

## 6. Phase 4: v0.4 — Platform-Level Coordination

**Target Date:** July 2026 | **Duration:** 4 weeks | **Theme:** Platform

### 6.1 Objectives

Enable app-like coordination across tabs, extensibility via plugins, and production observability.

### 6.2 Deliverables

| ID | Deliverable | Description | Priority | Status |
|----|-------------|-------------|----------|--------|
| D-14 | Multi-Tab Sync | Leader election, state broadcasting, tab lifecycle events | P0 | 🟡 Planned |
| D-15 | Observability Layer | Event bus, telemetry adapters, built-in metrics | P0 | 🟡 Planned |
| D-16 | Plugin System | `pwa.use()` architecture, plugin isolation, lifecycle hooks | P1 | 🟡 Planned |
| D-17 | Fugu Bridge (v2) | File System Access, File Handling, Window Controls Overlay | P2 | 🟡 Planned |
| D-22 | Capability Confidence Layer | Per-API confidence score, browser issue database, adaptive behavior | P2 | 🟡 Planned |

### 6.3 Technical Tasks

- [ ] **Multi-Tab Sync**
  - [ ] BroadcastChannel setup with tab ID generation
  - [ ] Leader election algorithm (random timeout, claim broadcast)
  - [ ] State synchronization (deduplication via revisionId)
  - [ ] Tab join/leave events
  - [ ] Leader re-election on disconnect
  - [ ] Leader responsibilities (mutation replay, SW activation)

- [ ] **Observability Layer**
  - [ ] Unified event bus (`pwa.observe()`)
  - [ ] Built-in metrics (activate_duration, queue_depth, replay_latency)
  - [ ] Telemetry adapter interface
  - [ ] Official adapters (Datadog, Sentry)
  - [ ] Async flush (non-blocking main thread)

- [ ] **Plugin System**
  - [ ] `pwa.use(plugin)` registration
  - [ ] Plugin lifecycle hooks (onInit, onStateChange, onLifecycleEvent)
  - [ ] API extension mechanism (`extend()`)
  - [ ] Error isolation (plugin errors don't crash runtime)
  - [ ] Runtime disable/enable (`pwa.plugins.disable()`)

- [ ] **Fugu Bridge**
  - [ ] File System Access API wrapper
  - [ ] File Handling API integration
  - [ ] Window Controls Overlay API
  - [ ] Badging API convenience methods
  - [ ] Feature detection and graceful fallbacks

- [ ] **Capability Confidence Layer**
  - [ ] Confidence scoring: `full`, `partial`, `fallback`, `none`
  - [ ] Browser issue database (Safari BT limitations, Chrome Android quirks)
  - [ ] Hardware availability detection (camera/mic presence check)
  - [ ] Dynamic confidence updates (permission revoke, hardware disconnect)
  - [ ] `pwa.capabilities.[api].inspect()` detailed report API


### 6.4 Acceptance Criteria

- [ ] Leader election completes within 100ms
- [ ] State propagation latency <50ms across tabs
- [ ] No duplicate mutation replays during leader transitions
- [ ] All lifecycle events are observable and loggable
- [ ] Plugins can extend API without modifying core
- [ ] Plugin errors are isolated (no runtime crashes)

### 6.5 Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Leader tab closes during replay | Medium | High | Immediate re-election, resume from last checkpoint |
| Plugin API instability | Medium | High | Strict plugin interface, runtime validation |
| Fugu API browser gaps | High | Medium | Feature-detect, graceful degradation, clear docs |

---

## 7. Phase 5: v1.0 — The "Full Stack" Release

**Target Date:** August 2026 | **Duration:** 6 weeks | **Theme:** Production

### 7.1 Objectives

Achieve production-grade stability: security hardening, distribution tooling, growth features, and comprehensive CLI.

### 7.2 Deliverables

| ID | Deliverable | Description | Priority | Status |
|----|-------------|-------------|----------|--------|
| D-18 | Security Layer | CSP presets, scope isolation, permission policy headers | P0 | 🟡 Planned |
| D-19 | Distribution Engine | `better-pwa doctor` CLI, Lighthouse CI checks, audit tools | P0 | 🟡 Planned |
| D-20 | Push & Background Sync | Production-ready notification and sync management | P0 | 🟡 Planned |
| D-21 | Growth Engine | Engagement-based install strategies, analytics hooks | P1 | 🟡 Planned |
| D-22 | Global CLI | Full project scaffolding, audit tools, interactive debug panel | P1 | 🟡 Planned |
| D-23 | Documentation | Complete API docs, guides, migration guides, troubleshooting | P1 | 🟡 Planned |
| D-24 | Runtime Guarantees | Formal contract: data durability, update safety, cross-tab consistency, permission resilience, cold start integrity | P0 | 🟡 Planned |

### 7.3 Technical Tasks

- [ ] **Security Layer**
  - [ ] CSP preset generator (strict, moderate, relaxed)
  - [ ] `Permissions-Policy` header generation
  - [ ] Manifest scope enforcement (subpath isolation)
  - [ ] Secure defaults audit (no `unsafe-eval`, no inline scripts)

- [ ] **Distribution Engine**
  - [ ] `better-pwa doctor` CLI (configuration audit, health report)
  - [ ] Lighthouse CI integration (PWA score threshold)
  - [ ] Automated misconfiguration detection
  - [ ] CI/CD pipeline examples (GitHub Actions, GitLab CI)

- [ ] **Push & Background Sync**
  - [ ] Push notification subscription management
  - [ ] Background sync event handling
  - [ ] Periodic background sync (Origin Trial support)
  - [ ] Notification click routing to app

- [ ] **Growth Engine**
  - [ ] Install prompt optimization (engagement-based timing)
  - [ ] A/B testing framework for install prompts
  - [ ] Analytics hooks (install conversion, session length)
  - [ ] `pwa.install.optimize()` API

- [ ] **Global CLI**
  - [ ] `better-pwa init` (project scaffolding)
  - [ ] `better-pwa build` (SW + manifest generation)
  - [ ] `better-pwa preview` (local dev server)
  - [ ] `better-pwa audit` (Lighthouse PWA check)
  - [ ] `better-pwa debug` (DevTools panel)

- [ ] **Documentation**
  - [ ] API reference (auto-generated from TypeScript types)
  - [ ] Getting started guides (per framework)
  - [ ] Migration guides (Workbox → better-pwa)
  - [ ] Troubleshooting FAQ
  - [ ] Architecture decision records (ADRs)

- [ ] **Runtime Guarantees**
  - [ ] Data durability enforcement (at-least-once delivery, crash durability, no silent drops)
  - [ ] Update safety enforcement (no mid-session interruption, no update loops, rollback)
  - [ ] Cross-tab consistency enforcement (atomic propagation, leader election, deduplication)
  - [ ] Permission resilience enforcement (no silent denials, batch deduplication, retry backoff)
  - [ ] Cold start integrity enforcement (staged boot, no race conditions, graceful degradation)
  - [ ] Runtime violation detection and reporting (`guarantee:at_risk` events)
  - [ ] CI integration tests for every guarantee (P0 release gate)

### 7.4 Acceptance Criteria

- [ ] CSP presets pass Lighthouse security audit
- [ ] `doctor` CLI catches 95% of misconfigurations
- [ ] Push notifications work reliably across Chromium/Safari/Firefox
- [ ] Install optimization improves prompt conversion by 2x
- [ ] Full documentation coverage for all public APIs
- [ ] Zero known P0/P1 bugs at GA

### 7.5 Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Safari push incompatibility | High | High | Abstract push notifications; clear feature matrix |
| Lighthouse PWA criteria changes | Medium | Medium | Monitor Lighthouse releases, update audit logic |
| Documentation gaps | Medium | High | Dedicated tech writer, dogfooding feedback loop |

---

## 8. Post-v1.0: Future Horizons

### 8.1 v1.x (Post-GA Enhancements)

| Feature | Description | Target |
|---------|-------------|--------|
| **Widget API** | Web app widgets (Windows, macOS desktop widgets) | Q4 2026 |
| **Advanced Caching** | Cache API streaming, custom SW middleware | Q4 2026 |
| **AI-Powered Sync** | ML-based conflict resolution for offline mutations | Q1 2027 |
| **Cross-Origin Sync** | Multi-origin state coordination (enterprise SSO) | Q1 2027 |

### 8.2 Long-Term Vision

- **PWA Standardization:** Contribute patterns back to W3C/WHATWG.
- **Framework Partnerships:** First-class integration with React, Vue, Svelte, Angular.
- **Enterprise Platform:** SSO, MDM integration, compliance reporting.
- **Plugin Marketplace:** Community-driven plugin ecosystem.

---

## 9. Risk & Dependency Mapping

### 9.1 Cross-Phase Dependencies

| Dependency | Source Phase | Target Phase | Risk Level |
|------------|--------------|--------------|------------|
| State Engine | v0.1 | v0.2, v0.3, v0.4 | Critical |
| SW Builder | v0.1 | v0.2, v0.3 | High |
| Update Controller | v0.2 | v0.4 (multi-tab sync) | Medium |
| Offline Queue | v0.3 | v0.4 (leader election) | High |
| Plugin System | v0.4 | v1.0 (growth engine) | Medium |

### 9.2 External Dependencies

| Dependency | Status | Impact | Mitigation |
|------------|--------|--------|------------|
| Workbox v7+ | Stable | SW precaching | Pin version, monitor releases |
| Chromium Fugu APIs | Rolling | Feature availability | Abstract behind adapters |
| Safari OPFS Support | Partial | Storage engine | Graceful degradation to IDB |
| Firefox Service Worker | Stable | SW lifecycle | Test matrix includes Firefox |

### 9.3 Resource Requirements

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|------|---------|---------|---------|---------|---------|
| Engineers | 2 | 2 | 3 | 3 | 4 |
| QA | 0.5 | 0.5 | 1 | 1 | 1.5 |
| Tech Writer | 0 | 0 | 0.5 | 0.5 | 1 |
| Product | 0.5 | 0.5 | 0.5 | 0.5 | 1 |

---

## 10. Milestone Tracking

### 10.1 Key Milestones

| Milestone | Target Date | Success Criteria | Status |
|-----------|-------------|------------------|--------|
| **Core Alpha** | Week 2, Phase 1 | State engine functional, SW builds | 🟡 Planned |
| **v0.1 Beta** | Week 4, Phase 1 | Public API stable, docs draft | 🟡 Planned |
| **v0.1 GA** | End of Phase 1 | Production-ready for early adopters | 🟡 Planned |
| **v0.2 GA** | End of Phase 2 | Update + permissions production-ready | 🟡 Planned |
| **v0.3 GA** | End of Phase 3 | Offline data layer production-ready | 🟡 Planned |
| **v0.4 GA** | End of Phase 4 | Multi-tab + plugins production-ready | 🟡 Planned |
| **v1.0 RC** | Week 5, Phase 5 | Feature complete, bugfix-only | 🟡 Planned |
| **v1.0 GA** | End of Phase 5 | Production-ready, docs complete | 🟡 Planned |

### 10.2 Go/No-Go Criteria (v1.0 GA)

- [ ] All P0 features implemented and tested
- [ ] Zero P0/P1 bugs open
- [ ] Core bundle <15KB (gzip)
- [ ] All acceptance criteria satisfied
- [ ] Documentation complete (API ref, guides, migration)
- [ ] Dogfooding feedback incorporated
- [ ] Security audit passed
- [ ] Lighthouse PWA score ≥95 for reference implementation
- [ ] All runtime guarantees verified by CI integration tests
- [ ] GUARANTEES.md contract is complete and signed off

---

## 11. Appendix

### 11.1 Glossary

| Term | Definition |
|------|-----------|
| **GA** | General Availability |
| **RC** | Release Candidate |
| **P0/P1/P2** | Priority levels (critical, high, medium) |
| **SW** | Service Worker |
| **Fugu** | Project Fugu (Chrome capability APIs) |
| **OPFS** | Origin Private File System |
| **IDB** | IndexedDB |
| **CSP** | Content Security Policy |
| **LWW** | Last Write Wins |
| **LRU** | Least Recently Used |
| **LFU** | Least Frequently Used |
| **TTL** | Time To Live |

### 11.2 Related Documents

- [Product Requirements](./PRD.md)
- [Architecture](./ARCHITECTURE.md)
- [Features](./FEATURES.md)

### 11.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-03-XX | Core Team | Initial draft |
| 1.0 | 2026-04-04 | Core Team | FAANG-grade structure, milestones, risks |

---

*This roadmap is living. Changes require product + engineering alignment and must be communicated to stakeholders.*
