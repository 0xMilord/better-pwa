---
layout: base.njk
title: better-pwa — Production-grade PWA runtime
description: Ship a PWA with native-level reliability, observability, and user experience using a single, cohesive API surface.
---
<section class="hero">
  <div class="hero-content">
    <h1>better-pwa</h1>
    <p class="hero-tagline">
      <strong>better-pwa is to PWAs what React Query is to server state</strong> — but for the entire app lifecycle.
    </p>
    <div class="hero-actions">
      <a href="/getting-started/quick-start/" class="btn btn-primary">Get Started →</a>
      <a href="https://github.com/0xmilord/better-pwa" class="btn btn-secondary">GitHub</a>
    </div>
    <div class="hero-install">
      <code>npm install @better-pwa/core</code>
    </div>
  </div>
</section>

<section class="features">
  <h2>One line. Everything works.</h2>
  <div class="feature-grid">
    <div class="feature-card">
      <h3>🛡️ Never loses user data</h3>
      <p>Offline mutations queue and replay automatically. IDB-backed durability guarantees.</p>
    </div>
    <div class="feature-card">
      <h3>🔄 Never breaks on update</h3>
      <p>Background service worker swaps with zero session interruption. Soft, hard, gradual strategies.</p>
    </div>
    <div class="feature-card">
      <h3>🪟 Never desyncs across tabs</h3>
      <p>Single source of truth via BroadcastChannel. Leader election, state broadcasting, deduplication.</p>
    </div>
    <div class="feature-card">
      <h3>🔑 Never silently fails permissions</h3>
      <p>Batched, retried, with fallback UI hooks. Exponential backoff, state invalidation on focus.</p>
    </div>
  </div>
</section>

<section class="code-section">
  <h2>Install. One line. Done.</h2>
  <pre><code class="language-ts">import { createPwa } from "@better-pwa/core"

createPwa({ preset: "saas" })</code></pre>
  <p>That one line sets up a service worker, manifest, state engine, offline queue, update lifecycle, multi-tab sync, and permission system. The preset made 100 configuration decisions for you.</p>
</section>

<section class="presets">
  <h2>Presets: 100 decisions → 1 decision</h2>
  <div class="preset-grid">
    <div class="preset-card">
      <h3>SaaS</h3>
      <p>Dashboards, CRMs, admin panels. Soft updates, batch permissions, auto storage.</p>
    </div>
    <div class="preset-card">
      <h3>E-commerce</h3>
      <p>Cart persistence, checkout sync. On-reload updates, manual conflict resolution.</p>
    </div>
    <div class="preset-card">
      <h3>Offline-first</h3>
      <p>Field apps, spotty connectivity. Gradual updates, merge conflict resolution.</p>
    </div>
    <div class="preset-card">
      <h3>Content</h3>
      <p>Blogs, media, reading apps. Soft updates, manual permissions, minimal sync.</p>
    </div>
  </div>
</section>

<section class="guarantees">
  <h2>Runtime Guarantees</h2>
  <p>These aren't best practices. They are <strong>enforced invariants</strong> with runtime violation detection.</p>
  <table class="guarantee-table">
    <thead>
      <tr><th>Guarantee</th><th>What It Means</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>Data Durability</strong></td><td>User actions are never lost — offline or online</td></tr>
      <tr><td><strong>Update Safety</strong></td><td>No broken sessions during deployments</td></tr>
      <tr><td><strong>Cross-Tab Consistency</strong></td><td>One state everywhere, no stale tabs</td></tr>
      <tr><td><strong>Permission Resilience</strong></td><td>Every denial has a recovery path</td></tr>
      <tr><td><strong>Cold Start Integrity</strong></td><td>Deterministic boot regardless of cache state</td></tr>
    </tbody>
  </table>
</section>

<section class="cta">
  <h2>Ready to build?</h2>
  <a href="/getting-started/quick-start/" class="btn btn-primary">Quick Start →</a>
</section>
