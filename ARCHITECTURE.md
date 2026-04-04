# Architecture: better-pwa

## 1. System Overview
`better-pwa` is a layered "operating system" for web apps, unifying runtime, lifecycle management, and build tools into a single source of truth.

```mermaid
graph TD
    A[App Code] --> B[Adapters: @better-pwa/next, @better-pwa/vite, etc.]
    B --> C[State of the App Engine: pwa.state()]
    C --> D[Lifecycle Controllers]
    D --> E[Update UX Controller]
    D --> F[Permission Orchestrator]
    D --> G[Offline Data Layer (Mutation Queue)]
    D --> H[Capability Bridge (Fugu APIs)]
    D --> I[Storage Abstraction (OPFS/IDB)]
    J[Service Worker] --> K[sw-runtime]
    K --> L[Multi-Tab Sync]
    K --> M[Asset + Data Cache]
    N[Build Tools] --> O[SW Builder]
    O --> P[sw.js (Optimized)]
```

## 2. The Single Source of Truth
### 🧠 State of the App Engine (`pwa.state()`)
A reactive, unified state object that bridges all environment variables:
- `isOffline`: Boolean (Network state).
- `isInstalled`: Boolean (Manifest + PWA state).
- `hasUpdate`: Boolean/String (Update detection).
- `permissions`: Object (Live state of camera, storage, etc.).
- `storage`: Object (Quota, usage, current engine).

## 3. Core Controllers
### 🔄 Update UX Controller
Manages the "Deployment Lifecycle":
- Strategies: `immediate`, `gradual`, `on-reload`.
- State Tracking: Detects new versions, tracks download progress.
- API: `pwa.update.strategy("gradual")`.

### 🛂 Permission Orchestrator
Batching and resilience layer for Fugu APIs:
- API: `pwa.permissions.request(["camera", "file"])`.
- Features: Handles "denied" fallbacks, UI-friendly retry logic, and batched requests.

### 📡 Offline Data Layer
Data consistency for modern PWAs:
- Mutation Queues: Track offline actions for replay.
- Optimistic Updates: Built-in hooks for UI state updates.
- Conflict Resolution: Strategies for merging offline changes.

### 📦 Storage Abstraction Layer
Unified storage API:
- Engine: Automates the hierarchy (OPFS -> IndexedDB -> Memory).
- Quota: Dynamic monitoring and eviction policies.

## 4. Platform Persistence & Sync
### 🏘️ Multi-Tab Sync
- Tab Coordination: Ensures only one tab is the "sync leader."
- State Broadcasting: Synchronizes `pwa.state()` across all open tabs.
- Broadcast Channel: Standardized abstraction for inter-tab communication.

## 5. Extensibility
### 🧩 Plugin System (`pwa.use()`)
Allows developers and the community to extend the runtime:
- **Verticals:** Payments, Auth, Specialized Hardware.
- **Hooks:** Taps into lifecycle events and `pwa.state()`.

## 6. Security & Observability
- **Secure-by-Default:** Built-in CSP presets and permission policy headers.
- **Observe Layer:** Unified hook for reporting SW crashes, cache failures, and permission events.
- **CLI Diagnostics:** `better-pwa doctor` for CI/CD and local development health checks.
