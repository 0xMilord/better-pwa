# better-pwa

> Add native-grade reliability to your web app in one line.

```ts
import { createPwa } from "better-pwa"

createPwa({ preset: "saas" })
```

That's it. Your app now:

- **Never loses user data** — offline mutations queue and replay automatically
- **Never breaks on update** — background swaps with zero session interruption
- **Never desyncs across tabs** — single source of truth, everywhere
- **Never silently fails permissions** — batched, retried, with fallback UI

---

## Why This Exists

PWAs work in theory. In practice, they fail at the edges:

| Problem | What Happens | What better-pwa Does |
|---------|-------------|---------------------|
| **User goes offline mid-action** | Data lost, frustration | Queues mutations, replays on reconnect |
| **SW update deploys** | Session breaks, blank pages | Background swap, prompt on next navigation |
| **User opens 5 tabs** | Race conditions, duplicate API calls | One source of truth, leader-elected sync |
| **Permission denied** | App broken, no recovery | Batched requests, retry with backoff, fallback UI |
| **Cold start after 3 days offline** | Stale cache, chaos | Staged boot: hydrate → sync critical → replay |

We didn't invent these solutions. We just made them **impossible to get wrong**.

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
  preset: "saas"  // or "ecommerce", "offline-first"
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

### That's Really It

No SW config. No manifest JSON. No lifecycle boilerplate. The preset made 100 decisions for you.

---

## Presets (100 Decisions → 1 Decision)

```ts
createPwa({ preset: "saas" })        // Dashboard, CRM, admin panels
createPwa({ preset: "ecommerce" })   // Cart persistence, checkout sync
createPwa({ preset: "offline-first" }) // Field apps, spotty connectivity
createPwa({ preset: "content" })     // Blogs, media, reading apps
```

Each preset configures:
- Update strategy (soft vs hard vs gradual)
- Permission batching behavior
- Storage engine priorities
- Conflict resolution defaults
- Cold start behavior
- Security posture

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

---

## Deep Dive

- **[Product Requirements](./PRD.md)** — Problem statement, goals, success metrics
- **[Architecture](./ARCHITECTURE.md)** — System design, data flow, trade-offs
- **[Features](./FEATURES.md)** — Complete API reference, acceptance criteria
- **[Roadmap](./ROADMAP.md)** — Phased delivery timeline
- **[Guarantees](./GUARANTEES.md)** — The runtime contract you can depend on

---

## CLI

```bash
better-pwa init           # Scaffold project
better-pwa build          # Generate SW + manifest
better-pwa doctor         # Audit configuration
better-pwa simulate offline  # Simulate offline mode locally
better-pwa audit          # Lighthouse PWA check
```

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chromium (Chrome, Edge, Opera) | 130+ | Full |
| Safari (macOS, iOS) | 18+ | Full (limited OPFS) |
| Firefox | 130+ | Full (limited Fugu) |

---

## Philosophy

> **The web doesn't need more APIs. It needs them glued together correctly.**

better-pwa is not a framework. It's a reliability layer. It makes the hard parts of PWAs — offline sync, updates, permissions, multi-tab coordination — feel trivial.

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
