# Roadmap: better-pwa (The "OS Layer" Path)

## Phase 1: v0.1 - The Modern Core & State
Establishing the foundation and the single source of truth.
- [ ] Core Runtime: SW registration, basic lifecycle bus.
- [ ] State of the App Engine: Initial implementation of `isOffline`, `isInstalled`.
- [ ] SW Builder: Config-driven `sw.js` (precaching + basic strategies).
- [ ] Manifest Engine: Basic `manifest.json` generation.

## Phase 2: v0.2 - Update UX & Permissions (Top Priority)
Focus on the two most painful parts of the PWA lifecycle.
- [ ] Update UX Controller: `soft` vs `hard` reload strategies, `update_available` state.
- [ ] Permission Orchestrator: Batched requests, state tracking for Fugu APIs.
- [ ] Pretty Logging: Advanced console diagnostics and status dashboards.
- [ ] Interactive Debugger: `pwa.debug()` with real-time state visualization.

## Phase 3: v0.3 - Data Consistency & Storage
Building a robust offline experience for modern apps.
- [ ] Offline Data Layer: Initial implementation of mutation queuing and replay logic.
- [ ] Storage Abstraction: Unified API for OPFS, IndexedDB, and memory.
- [ ] Quota & Eviction: Dynamic monitoring and basic management policies.
- [ ] Framework Adapters: `@better-pwa/next` and `@better-pwa/vite` support.

## Phase 4: v0.4 - Platform-Level Coordination
Ensuring the app-like experience holds across tabs and environments.
- [ ] Multi-Tab Sync: Tab coordination and state broadcasting.
- [ ] Observability: Built-in hooks for error reporting and sync analytics.
- [ ] Plugin System: Initial `pwa.use()` architecture for extensibility.
- [ ] Fugu Bridge (v2): File System Access, File Handling, Window Controls Overlay.

## Phase 5: v1.0 - The "Full Stack" Release
Production-grade stability, distribution, and security.
- [ ] Security Layer: CSP presets, scope isolation, and permission policy headers.
- [ ] Distribution Engine: `better-pwa doctor` CLI and Lighthouse-focused CI checks.
- [ ] Push & Background Sync: Production-ready notification and sync management.
- [ ] Growth Engine: Engagement-based install strategies (`pwa.install.optimize()`).
- [ ] Global CLI: Full project scaffolding and audit tools.
