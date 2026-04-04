---
layout: docs.njk
title: Mental Model
description: Understand how better-pwa works — one state, one lifecycle, everything derived.
prev:
  title: "Installation"
  path: "/getting-started/installation/"
next:
  title: "createPwa()"
  path: "/api/createPwa/"
---

# Mental Model

## One State. One Lifecycle. Everything Derived.

better-pwa is not a framework. It's a **reliability layer** that sits between your app and the browser.

```
Your App
   ↓
better-pwa Runtime
   ├── State Engine     ← Single source of truth
   ├── Lifecycle Bus    ← State machine: IDLE → BOOT → READY → STABLE
   ├── Update Controller ← SW update strategies
   └── Permission Orchestrator ← Batched, retried, with fallbacks
   ↓
Browser APIs (Service Worker, IndexedDB, BroadcastChannel)
```

## The Deterministic State Machine

Every better-pwa instance flows through a formal state machine. This eliminates "random bugs" — every edge case is a defined transition.

```
IDLE → BOOT → READY → STABLE
            ↓
          OFFLINE → SYNCING → STABLE
            ↓
          UPDATING → READY
```

| State | When | What Happens |
|-------|------|-------------|
| **IDLE** | Before init() | Runtime exists but nothing started |
| **BOOT** | During init() | State engine, SW registration, migrations |
| **READY** | After boot | Core is functional, network status determined |
| **STABLE** | After sync | Everything synced, no pending actions |
| **OFFLINE** | Network lost | App continues, mutations queue |
| **SYNCING** | Network restored | Queue replay, data fetch |
| **UPDATING** | SW update detected | Applying new version (strategy-dependent) |

Every transition has a **guard**. If the guard fails, a **fallback state** is entered — never a crash.

## The Reactive State Object

```typescript
const state = pwa.state().snapshot()
// {
//   isOffline: false,
//   isInstalled: true,
//   hasUpdate: false,
//   permissions: { notifications: "granted" },
//   updateStrategy: "soft",
//   ...
// }
```

State changes are:
- **Atomic** — multi-key updates fire subscribers once
- **Immutable** — snapshots are frozen objects
- **Persistent** — critical state survives page reloads (IDB-backed)
- **Cross-tab synced** — BroadcastChannel propagates within 50ms

## How a PWA "Feels Native"

| Native Feature | better-pwa Equivalent |
|---------------|----------------------|
| App never crashes on update | Soft update strategy — new version waits, activates on navigation |
| Data never lost offline | IDB-backed mutation queue, replay on reconnect |
| Settings sync across windows | BroadcastChannel state sync, leader election |
| Permission prompts make sense | Batched requests, pre-prompt context, fallback on denial |
| App starts instantly | Cold start: load cached UI → sync → apply updates → replay |

## What You Control vs What better-pwa Owns

| You Own | better-pwa Owns |
|---------|----------------|
| App logic, UI, routing | SW registration, update detection |
| Business logic | State persistence, cross-tab sync |
| Error boundaries | Permission retry, fallback UI |
| API calls | Offline queuing, replay engine |

The boundary is clear: you write your app, better-pwa handles the environment.
