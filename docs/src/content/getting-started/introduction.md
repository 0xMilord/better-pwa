---
layout: docs.njk
title: Introduction
description: What is better-pwa and why does it exist?
prev: null
next:
  title: "Quick Start"
  path: "/getting-started/quick-start/"
---

# Introduction

`better-pwa` transforms Progressive Web Apps from "cached websites" into **production-grade, native-feeling applications**.

## The Problem

PWA tooling is **engineering-complete** but **product-broken**. Workbox handles precaching. Manifest APIs handle installability. But the *orchestration layer* — the thing that turns individual APIs into a cohesive, production-grade application — is absent.

**70%+ of PWA failures** in production stem from update/permission mismanagement. Teams spend **3-5 weeks** per project reimplementing lifecycle management.

## What better-pwa Does

better-pwa owns the full lifecycle of a web app:

```
Your App
   ↓
better-pwa Runtime (one state · one lifecycle)
   ↓
Service Worker + Browser APIs
```

**One state. One lifecycle. Everything else is derived.**

## What You Get

| Without better-pwa | With better-pwa |
|-------------------|----------------|
| Build offline sync from scratch | `pwa.offline.queue(action)` |
| Manual SW hash checking | `pwa.update.setStrategy("soft")` |
| Custom BroadcastChannel code | Auto-synced `pwa.state()` |
| One-off permission prompts | `pwa.permissions.request(["camera", "file"])` |
| Manual `navigator.storage.estimate()` | `pwa.storage.quota()` + auto-eviction |

## When NOT to Use better-pwa

- **Static marketing sites** with no user interaction
- **Apps that don't need offline** or installability
- **Server-rendered apps** where the browser is just a thin client

If your app has users, sessions, or data — you probably need this.
