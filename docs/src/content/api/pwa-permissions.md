---
layout: docs.njk
title: pwa.permissions
description: "Batched, state-tracked permission management"
prev:
  title: "pwa.update"
  path: "/api/pwa-update/"
next: null
---

# pwa.permissions

Batched, resilient permission management.

## API

### request()

```typescript
const results = await pwa.permissions().request([
  "camera",
  "microphone",
  "notifications",
])
// → { camera: "granted", microphone: "denied", notifications: "prompt" }
```

With options:

```typescript
await pwa.permissions().request("camera", {
  reason: "To scan QR codes",
  prePrompt: () => showCustomModal("We need camera access"),
  maxRetries: 3,
})
```

### status()

```typescript
const status = pwa.permissions().status()
// → { camera: "granted", microphone: "denied" }
```

Non-blocking. Checks cached state only.

### on("denied")

```typescript
pwa.permissions().on("denied", (permission, fallback) => {
  fallback.show({
    title: "Camera Access Needed",
    message: "Enable camera in settings to continue.",
    action: "Open Settings",
  })
})
```

## Retry Strategy

| Attempt | Delay | Trigger |
|---------|-------|---------|
| 1 | Immediate | Initial request |
| 2 | 1s | Auto-retry |
| 3 | 2s | Auto-retry |
| 4 | 4s | Auto-retry (final) |
| Manual | User-initiated | "Try Again" bypasses backoff |

State invalidation on `visibilitychange` — re-checks if user granted in browser settings.
