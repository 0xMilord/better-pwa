# PRD: better-pwa

## 1. Problem Statement
PWA tooling in 2026 is "engineering-complete" but "product-broken." While APIs exist (Project Fugu), the glue that turns them into a cohesive, production-grade application is missing. Developers struggle with:
- **Update Chaos:** No standard for managing "soft" vs "hard" updates or background swaps.
- **Permission Hell:** Fragmented, one-off permission requests that frustrate users.
- **Data Inconsistency:** Asset caching works, but offline data synchronization and mutation queuing are unsolved.
- **State Fragmentation:** No single source of truth for the "environment state" (offline status, install state, permissions, storage quotas).

## 2. Product Vision
`better-pwa` is the **Operating System Layer** between the browser and the application. It owns the full lifecycle of a web app—from installation and permission orchestration to offline data consistency and update UX—providing a single, reactive "State of the App" engine.

## 3. Target Audience
- **Product Engineers:** Who need to ship "native-feel" apps without the native overhead.
- **Enterprise Teams:** Requiring robust observability, security, and multi-tab coordination.
- **SaaS Builders:** Creating high-reliability, offline-capable tools.

## 4. Core Principles
- **Lifecycle Ownership:** Control every stage (Install -> Update -> Permission -> Sync).
- **Reactive Environment State:** A single source of truth for all app-level environment variables.
- **Zero-Dependency Core:** Pure JS/TS, optimized for 2026.
- **Plugin Architecture:** Core remains lean while allowing extension for auth, payments, and device APIs.
- **Growth-Focused:** Built-in intelligence for install conversion and user engagement.

## 5. Key Features (The "Full Stack" PWA)
- **State of the App Engine:** A unified, reactive state object (`isOffline`, `hasUpdate`, `permissions`, `storage`).
- **Update UX System:** Declarative strategies for background swaps, gradual rollouts, and custom UI prompts.
- **Permission Orchestrator:** Batched, state-tracked, and resilient permission management with retry logic.
- **Offline Data Layer:** Mutation queuing, optimistic updates, and conflict resolution (beyond simple asset caching).
- **Storage Strategy Abstraction:** Unified API for OPFS, IndexedDB, and memory with quota/eviction management.
- **Multi-Tab Sync:** Shared SW state and broadcast channel coordination for app-wide consistency.
- **Observability & Security:** Built-in crash reporting, sync analytics, and "secure-by-default" CSP/Policy presets.

## 6. Success Metrics
- **Product Completeness:** Ability to build, ship, and monitor a PWA using *only* better-pwa.
- **Developer Leverage:** 10x reduction in boilerplate for complex lifecycle tasks (updates, permissions).
- **User Retention:** Improved install rates and session length via better-timed prompts and offline reliability.
