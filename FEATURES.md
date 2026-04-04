# Features: better-pwa (The PWA OS Layer)

## 1. 🧠 State of the App Engine
The single source of truth for your application environment.
- **Reactive State:** One object (`isOffline`, `isInstalled`, `hasUpdate`, `permissions`, `storage`).
- **Unified Interface:** Access all environment data through a single, clean API.
- **Auto-Sync:** Environment state is automatically kept in sync across all open tabs.
- **Framework Ready:** Built-in hooks for React, Vue, Svelte, and more.

## 2. 🔄 Deployment & Update Lifecycle
Ownership of the most critical app lifecycle.
- **Custom Update Strategies:** `soft` (background swap), `hard` (forced reload), and `gradual` strategies.
- **Update UX Primitives:** Easy-to-use hooks for showing "new version available" prompts or toasts.
- **Version Tracking:** Keep track of the current app version and its download state.

## 3. 🛂 Permission & Capability Orchestrator
Simplified access to the modern web's most powerful (and restricted) features.
- **Batched Permissions:** Request multiple permissions (`camera`, `file`, `bluetooth`) in a single UI flow.
- **Resilient Fallbacks:** Intelligent handling of permission denials with custom fallback UI hooks.
- **Fugu Bridge:** High-level, promise-based access to File System, Badging, and Window Controls.

## 4. 📡 Data Consistency & Storage Layer
Turning asset caching into a real offline application platform.
- **Offline Mutation Queues:** Track and replay user actions once the network returns.
- **Optimistic UI Hooks:** Easily update your UI state while waiting for background sync.
- **Unified Storage API:** Transparently switches between OPFS, IndexedDB, and memory.
- **Quota Management:** Built-in monitoring and intelligent eviction policies.

## 5. 🏘️ Coordination & Observability
Ensuring your app feels like one cohesive unit across the entire OS.
- **Multi-Tab Sync:** Shared state and coordination between all open browser tabs.
- **Observability Layer:** Global hook for reporting SW crashes, cache failures, and permission events.
- **Security Defaults:** Secure CSP presets and permission policy headers out of the box.
- **Distribution Health:** `better-pwa doctor` CLI to ensure your app is production-ready.

## 6. 🧩 Extensibility & Growth
- **Plugin System:** Extend the runtime with specialized modules for auth, payments, or analytics.
- **Install Intelligence:** Engagement-based install strategies (`pwa.install.optimize()`).
- **Auto-Generating Manifest:** Smart generation of 2026 manifest fields and icon assets.
- **Production-Ready SW Builder:** Optimized `sw.js` without the need for complex build steps.
