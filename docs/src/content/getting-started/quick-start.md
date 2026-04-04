---
layout: docs.njk
title: Quick Start
description: Get better-pwa running in your project in under 5 minutes.
prev:
  title: "Introduction"
  path: "/getting-started/introduction/"
next:
  title: "Installation"
  path: "/getting-started/installation/"
---

# Quick Start

## 1. Install

```bash
npm install @better-pwa/core
```

## 2. Initialize

```typescript
import { createPwa } from "@better-pwa/core"

const pwa = createPwa({
  preset: "saas",        // or "ecommerce", "offline-first", "content"
  swUrl: "/sw.js",       // path to your service worker
})

await pwa.init()
```

That's it. Your app now has:

- **Offline mutation queue** — actions queue when offline, replay when online
- **Update lifecycle** — background SW swaps with zero session interruption
- **Cross-tab sync** — all tabs share a single state via BroadcastChannel
- **Permission orchestration** — batched, retried, with fallback UI

## 3. Use the State

```typescript
// Read current state
const state = pwa.state().snapshot()
console.log(state.isOffline, state.isInstalled)

// Subscribe to changes
const unsub = pwa.state().subscribe(["isOffline"], (diff) => {
  if (diff.isOffline) {
    showOfflineBanner()
  }
})

// Unsubscribe when done
unsub()
```

## 4. React Integration

```bash
npm install @better-pwa/adapter-react
```

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

## What Happens Under the Hood

That `createPwa()` call runs a deterministic boot sequence:

1. **IDLE → BOOT** — Initialize state engine, IDB, BroadcastChannel
2. **State migrations** — Run any registered migrations if version changed
3. **SW registration** — Register service worker, set up update detection
4. **Apply preset** — Configure update strategy, permissions, storage
5. **Cold start** — Hydrate → Sync → Update → Replay (sequential, guarded)
6. **READY → SYNCING → STABLE** — App is fully operational

If any stage fails, the app degrades gracefully — never breaks.
