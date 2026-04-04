---
layout: docs.njk
title: pwa.state()
description: Reactive state engine — single source of truth for all PWA environment state.
prev:
  title: "createPwa()"
  path: "/api/createPwa/"
next:
  title: "pwa.update"
  path: "/api/pwa-update/"
---

# pwa.state()

The reactive state engine. Single source of truth for all PWA environment state.

## Schema

```typescript
interface PwaState {
  isOffline: boolean;
  connectionType: "slow-2g" | "2g" | "3g" | "4g" | null;
  isInstalled: boolean;
  installMethod: "prompt" | "auto" | null;
  canInstall: boolean;
  hasUpdate: boolean | string;
  updateStrategy: "soft" | "hard" | "gradual" | "on-reload";
  updateProgress: number;
  permissions: Record<string, PermissionState>;
  storage: { usage: number; quota: number; engine: string; utilizationPercent: number };
  isSecureContext: boolean;
  isStandalone: boolean;
  tabCount: number;
  _version: string;
}
```

## API

### snapshot()

```typescript
const state = pwa.state().snapshot()
// → Readonly<PwaState>
```

Returns a frozen snapshot. Mutations produce new objects.

### subscribe()

```typescript
const unsub = pwa.state().subscribe(
  ["isOffline", "hasUpdate"],
  (diff) => {
    if (diff.isOffline !== undefined) {
      console.log(diff.isOffline ? "went offline" : "back online")
    }
  }
)
```

| Param | Type | Description |
|-------|------|-------------|
| `keys` | `StateKeys[]` | Which state keys to watch |
| `cb` | `(diff: StateDiff) => void` | Called when any watched key changes |

Returns `Unsubscribe` function.

### set()

```typescript
await pwa.state().set("isOffline", true)
```

Manually override a state key. Triggers subscribers and persists to IDB if critical.

### reset()

```typescript
await pwa.state().reset()
```

Restore all keys to defaults.

## Guarantees

| Guarantee | Spec |
|-----------|------|
| Propagation latency | <50ms across tabs |
| Persistence | Critical state survives page reloads |
| Immutability | Snapshots are frozen |
| Atomicity | Multi-key updates fire subscribers once |
