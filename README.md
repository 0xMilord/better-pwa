# better-pwa

> **better-pwa is to PWAs what React Query is to server state — but for the entire app lifecycle.**

<div align="center">

[![CI](https://github.com/0xMilord/better-pwa/actions/workflows/ci.yml/badge.svg)](https://github.com/0xMilord/better-pwa/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/0xMilord/better-pwa/branch/main/graph/badge.svg?token=e785e5bb-0776-4d98-a7e3-1b1c9493f0bc)](https://app.codecov.io/gh/0xMilord/better-pwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@better-pwa/core.svg)](https://www.npmjs.com/package/@better-pwa/core)
[![npm downloads](https://img.shields.io/npm/dm/@better-pwa/core.svg)](https://www.npmjs.com/package/@better-pwa/core)
[![Bundle Size](https://badgen.net/bundlephobia/minzip/@better-pwa/core)](https://bundlephobia.com/result?p=@better-pwa/core)
[![TypeScript](https://badgen.net/badge/icon/TypeScript?icon=typescript&label)](https://www.typescriptlang.org/)
[![Docs](https://img.shields.io/badge/docs-eleventy-blue)](https://better-pwa.github.io/docs/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**176 Tests · 90%+ Coverage · 11 Packages · Zero Dependencies Core**

</div>

Add native-grade reliability to your web app in one line.

```ts
import { createPwa } from "better-pwa"

createPwa({ preset: "saas" })
```

That's it. Your app now:

- **Never loses user data** — offline mutations queue and replay automatically
- **Never breaks on update** — background swaps with zero session interruption
- **Never desyncs across tabs** — single source of truth, everywhere
- **Never silently fails permissions** — batched, retried, with fallback UI

> Yes, this sounds too good for one line. [Here's what actually happens under the hood](#under-the-hood).

---

## Mental Model (10 Seconds)

```
Your App
   ↓
better-pwa Runtime (one state · one lifecycle)
   ↓
Service Worker + Browser APIs
```

**One state. One lifecycle. Everything else is derived.**

better-pwa owns the reactive state object (`pwa.state()`) and the lifecycle bus. Every feature — offline sync, updates, permissions, multi-tab coordination — plugs into the same system. No scattered event handlers. No race conditions. Just state transitions you can reason about.

---

## Quick Start

### Install

```bash
npm install better-pwa
```

### One-Line Setup

```ts
import { createPwa } from "better-pwa"

createPwa({
  preset: "saas"  // or "ecommerce", "offline-first", "content"
})
```

### React Integration

```tsx
import { usePwaState } from "@better-pwa/adapter-react"

function App() {
  const { isOffline, hasUpdate } = usePwaState(["isOffline", "hasUpdate"])

  return (
    <>
      {isOffline && <Banner>Working offline — changes will sync</Banner>}
      {hasUpdate && <Banner onClick={() => pwa.update.activate()}>New version ready</Banner>}
      <YourApp />
    </>
  )
}
```

---

## Under the Hood

That one line sets up:

| Subsystem | What It Does |
|-----------|-------------|
| **Service Worker** | Auto-generated, precaching, runtime caching strategies |
| **Manifest** | Icons, installability, 2026 fields (share target, file handlers) |
| **State Engine** | Reactive, IDB-persisted, cross-tab synced via BroadcastChannel |
| **Offline Queue** | IndexedDB-backed mutation queue with replay engine |
| **Update Lifecycle** | Hash polling, skip-waiting, rollback on failure |
| **Multi-Tab Sync** | Leader election, state broadcasting, deduplication |
| **Permission System** | Batch requests, retry with backoff, fallback UI hooks |

The preset made 100 configuration decisions for you. You can override any of them.

---

## Presets (100 Decisions → 1 Decision)

```ts
createPwa({ preset: "saas" })           // Dashboard, CRM, admin panels
createPwa({ preset: "ecommerce" })      // Cart persistence, checkout sync
createPwa({ preset: "offline-first" })  // Field apps, spotty connectivity
createPwa({ preset: "content" })        // Blogs, media, reading apps
```

Each preset configures: update strategy, permission batching, storage priorities, conflict resolution, cold start behavior, security posture, and resource priority tiers.

---

## Guarantees

better-pwa enforces:

| Guarantee | What It Means |
|-----------|--------------|
| **Data Durability** | User actions are never lost — offline or online |
| **Update Safety** | No broken sessions during deployments |
| **Cross-Tab Consistency** | One state everywhere, no stale tabs |
| **Permission Resilience** | Every denial has a recovery path |
| **Cold Start Integrity** | Deterministic boot regardless of cache state |
| **Auth Continuity** | No 401 storms, cross-tab token sync |
| **Audit Completeness** | Every event logged, exportable, tamper-evident |

These are not best practices. They are **enforced invariants** with runtime violation detection. [Full contract →](./GUARANTEES.md)

---

## Simulation (Debug Like a God)

Test every edge case locally. No guesswork, no production surprises.

```bash
better-pwa simulate offline              # Cut the network
better-pwa simulate slow-network --type 2g  # Throttle to 2G
better-pwa simulate update               # Trigger SW update
better-pwa simulate permission-denied    # Deny all permissions
better-pwa simulate multi-tab --tabs 5   # Open 5 coordinated tabs
better-pwa simulate cold-start --offline-days 3  # Simulate 3-day offline gap
better-pwa simulate storage-full --usage 95%  # Fill storage to 95%
```

All simulations work in `better-pwa preview` with an interactive panel. Zero cost in production builds (tree-shaken).

---

## What You Get

| Feature | Without better-pwa | With better-pwa |
|---------|-------------------|----------------|
| Offline mutations | Build from scratch | `pwa.offline.queue(action)` |
| SW updates | Manual hash checking | `pwa.update.setStrategy("soft")` |
| Multi-tab sync | Custom BroadcastChannel | Auto-synced `pwa.state()` |
| Permissions | One-off prompts | `pwa.permissions.request(["camera", "file"])` |
| Storage quota | Manual `navigator.storage.estimate()` | `pwa.storage.quota()` + auto-eviction |
| Install prompt | Timing guesswork | `pwa.install.optimize({ trigger: "engagement" })` |
| Conflict resolution | None | `pwa.conflicts.register("orders", resolver)` |
| Resource priority | Everything equal | `pwa.priority.set({ critical: ["auth"] })` |
| State migrations | Break on update | `pwa.migrations.register("v2", fn)` |
| Audit logs | Build yourself | `pwa.audit.log({ action, status })` |
| Disaster recovery | Refresh and pray | `pwa.recovery.reset({ preserve: ["auth"] })` |

---

## When NOT to Use better-pwa

- **Static marketing sites** with no user interaction
- **Apps that don't need offline** or installability
- **Ultra-simple projects** where lifecycle doesn't matter
- **Server-rendered apps** where the browser is just a thin client

Confidence increases when a tool shows restraint. If your app is a blog with no interactivity, you don't need this. If your app has users, sessions, or data — you probably do.

---

## CLI

```bash
better-pwa init           # Scaffold project
better-pwa build          # Generate SW + manifest
better-pwa doctor         # Audit configuration
better-pwa preview        # Local dev server with SW
better-pwa simulate       # Debug failure scenarios
better-pwa audit          # Lighthouse PWA check
better-pwa debug          # Interactive state visualization
```

---

## Deep Dive

- **[Getting Started →](./docs/getting-started.md)** — Quick start, mental model, first project
- **[Packages & Release →](./PACKAGE-RELEASE.md)** — Monorepo, release pipeline, CI/CD, testing strategy
- **[Guarantees →](./GUARANTEES.md)** — The runtime contract you can depend on
- **[Architecture →](./ARCHITECTURE.md)** — System design, data flow, trade-offs
- **[Features →](./FEATURES.md)** — Complete API reference, acceptance criteria
- **[Roadmap →](./ROADMAP.md)** — Phased delivery timeline
- **[Product Requirements →](./PRD.md)** — Problem statement, goals, success metrics
- **[Documentation Site →](./DOCS.md)** — GitHub Pages docs site blueprint

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chromium (Chrome, Edge, Opera) | 130+ | Full |
| Safari (macOS, iOS) | 18+ | Full (limited OPFS) |
| Firefox | 130+ | Full (limited Fugu) |

Detailed capability matrix: `pwa.capabilities.report()` (coming v1.1)

---

## Philosophy

> **PWAs don't fail because APIs are missing. They fail because orchestration is hard. We made it impossible to mess up.**

better-pwa is not a framework. It's a **reliability layer**. It makes the hard parts of PWAs — offline sync, updates, permissions, multi-tab coordination — feel trivial.

We believe:

- **Reliability should be the default**, not an afterthought
- **Developers should write app logic**, not lifecycle boilerplate
- **The web should feel native** — not "close enough"

---

## Status

**v0.1-alpha** — Core runtime, state engine, SW builder. [See Roadmap →](./ROADMAP.md)

Production target: **Q3 2026 (v1.0)**

---

## License

MIT
