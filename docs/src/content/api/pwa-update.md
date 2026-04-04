---
layout: docs.njk
title: pwa.update
description: "Declarative service worker update strategies"
prev:
  title: "pwa.state()"
  path: "/api/pwa-state/"
next:
  title: "pwa.permissions"
  path: "/api/pwa-permissions/"
---

# pwa.update

Declarative management of service worker update strategies.

## Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `soft` | New SW downloads and waits. Activates on next navigation. | Content sites, dashboards |
| `hard` | Immediate `skipWaiting()` + reload. | Critical bug fixes |
| `gradual` | X% of users get update over Y hours. | Large user bases, A/B testing |
| `on-reload` | Update applies when all tabs close and new one opens. | E-commerce |

## API

### setStrategy()

```typescript
pwa.update().setStrategy("gradual", {
  rollout: 0.2,
  window: "4h",
  seed: user.id,
})
```

### on()

```typescript
pwa.update().on("update_available", (version) => {
  showToast(`Version ${version} is ready`)
})
```

### activate()

```typescript
await pwa.update().activate()
```

Manually activate a waiting service worker. Only works when state is `WAITING`.

### status()

```typescript
const status = pwa.update().status()
// → { current: "v1.0.0", waiting: "v1.0.1", strategy: "soft" }
```

## State Machine

```
IDLE → DOWNLOADING → WAITING → ACTIVATING → IDLE
                ↓
              FAILED → IDLE
```
