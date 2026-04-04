---
layout: docs.njk
title: createPwa()
description: Create and initialize the better-pwa runtime. The single entry point.
prev:
  title: "Mental Model"
  path: "/getting-started/mental-model/"
next:
  title: "pwa.state()"
  path: "/api/pwa-state/"
---

# createPwa(config)

Create and initialize the better-pwa runtime instance.

## Signature

```typescript
function createPwa(config: BetterPwaConfig): BetterPwaRuntime
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `config.preset` | `"saas"` \| `"ecommerce"` \| `"offline-first"` \| `"content"` | No | — | Opinionated preset that configures update strategy, permissions, storage, conflict resolution, and priority tiers |
| `config.swUrl` | `string` | No | — | URL to the service worker file (e.g., `/sw.js`) |
| `config.scope` | `string` | No | `"/"` | Service worker scope |
| `config.version` | `string` | No | `"0.1.0"` | App version for state migrations |
| `config.debug` | `boolean` | No | `false` | Enable debug logging |

## Returns

A `BetterPwaRuntime` instance with the following API surface:

| Method | Description |
|--------|-------------|
| `pwa.init()` | Initialize the runtime. Returns `Promise<this>`. Must be called before using other APIs. |
| `pwa.state()` | Access the reactive state engine |
| `pwa.lifecycle()` | Access the lifecycle state machine |
| `pwa.permissions()` | Access the permission orchestrator |
| `pwa.update()` | Access the update controller |
| `pwa.on(event, cb)` | Subscribe to lifecycle events |
| `pwa.use(plugin)` | Register a plugin |
| `pwa.destroy()` | Clean up all resources |

## Examples

### Minimal

```typescript
import { createPwa } from "@better-pwa/core"

const pwa = createPwa({ preset: "saas" })
await pwa.init()
```

### Full Configuration

```typescript
import { createPwa } from "@better-pwa/core"

const pwa = createPwa({
  preset: "saas",
  swUrl: "/sw.js",
  scope: "/",
  version: "1.0.0",
  debug: true,
})

await pwa.init()

// Check final state
console.log("Lifecycle:", pwa.lifecycle().state())
// → "STABLE"
```

### With Service Worker

```typescript
// In your build step, generate the SW:
import { buildSw } from "@better-pwa/sw-builder"

await buildSw({
  globDirectory: "dist",
  outputPath: "dist/sw.js",
})

// In your app:
const pwa = createPwa({
  preset: "saas",
  swUrl: "/sw.js",
})

await pwa.init()
```

## Lifecycle Flow

When you call `init()`, the following sequence executes:

1. **IDLE → BOOT** — State machine enters boot phase
2. **State engine** — Initialize IDB, BroadcastChannel, network listeners
3. **Migrations** — Run any registered state migrations if version changed
4. **SW registration** — Register service worker (if `swUrl` provided)
5. **Apply preset** — Configure update strategy from preset
6. **Cold start** — Hydrate → Sync → Update → Replay (sequential, guarded)
7. **READY → SYNCING → STABLE** — App is fully operational

If any stage fails, the app degrades gracefully:
- Hydrate fail → DEGRADED
- Sync fail → OFFLINE mode
- Update fail → Continue with current version
- Replay fail → Queue preserved for later

## Errors

| Error | When | Resolution |
|-------|------|-----------|
| `IDB unavailable` | IndexedDB blocked or unsupported | Falls back to in-memory state |
| `SW registration failed` | Service worker URL invalid | Continues without SW |
| `Migration failed` | Migration throws | Logs error, continues with current state |
