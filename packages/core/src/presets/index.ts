/**
 * Opinionated presets — 100 decisions → 1 choice.
 *
 * Each preset defines: update strategy, permission behavior,
 * storage engine, conflict resolution, and priority tiers.
 */
import type { PresetConfig, PresetName } from "../types.js";

const saas: PresetConfig = {
  updateStrategy: "soft",
  permissionBehavior: "batch",
  storageEngine: "auto",
  conflictResolution: "lww",
  priorityTiers: {
    critical: ["auth", "user-profile", "workspace"],
    high: ["documents", "comments", "notifications"],
    normal: ["settings", "preferences", "drafts"],
    low: ["analytics", "telemetry", "tour-state"],
  },
};

const ecommerce: PresetConfig = {
  updateStrategy: "on-reload",
  permissionBehavior: "sequential",
  storageEngine: "auto",
  conflictResolution: "manual",
  priorityTiers: {
    critical: ["auth", "cart", "checkout", "payment"],
    high: ["orders", "wishlist", "addresses"],
    normal: ["reviews", "browsing-history", "recommendations"],
    low: ["analytics", "ab-tests", "decorative-assets"],
  },
};

const offlineFirst: PresetConfig = {
  updateStrategy: "gradual",
  permissionBehavior: "batch",
  storageEngine: "auto",
  conflictResolution: "merge",
  priorityTiers: {
    critical: ["auth", "sync-queue", "local-db"],
    high: ["documents", "media", "forms"],
    normal: ["settings", "cache"],
    low: ["analytics", "logs"],
  },
};

const content: PresetConfig = {
  updateStrategy: "soft",
  permissionBehavior: "manual",
  storageEngine: "auto",
  conflictResolution: "lww",
  priorityTiers: {
    critical: ["config", "content-shell"],
    high: ["articles", "images"],
    normal: ["comments", "bookmarks"],
    low: ["analytics", "recommendations"],
  },
};

const presets: Record<PresetName, PresetConfig> = {
  saas,
  ecommerce,
  offlineFirst,
  content,
};

function definePreset(overrides: Partial<PresetConfig>): PresetConfig {
  return {
    updateStrategy: "soft",
    permissionBehavior: "batch",
    storageEngine: "auto",
    conflictResolution: "lww",
    priorityTiers: {
      critical: [],
      high: [],
      normal: [],
      low: [],
    },
    ...overrides,
  };
}

export { presets, definePreset };
export type { PresetName };
