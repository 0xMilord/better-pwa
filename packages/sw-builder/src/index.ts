/**
 * @better-pwa/sw-builder — Config-driven service worker generation.
 *
 * Generates a production-ready sw.js with:
 * - Workbox precaching
 * - Runtime caching strategies (cache-first, network-first, stale-while-revalidate)
 * - Better-PWA runtime hooks
 */
import { better } from "@better-logger/core";

export interface CacheStrategy {
  pattern: RegExp;
  strategy: "cache-first" | "network-first" | "stale-while-revalidate" | "network-only" | "cache-only";
  cacheName?: string;
  maxEntries?: number;
  maxAgeSeconds?: number;
}

export interface SwBuilderConfig {
  /** Glob directory to precache (default: 'dist') */
  globDirectory?: string;
  /** Glob patterns to precache (default: ['**\/*.{js,css,html,png,svg,woff2}']) */
  globPatterns?: string[];
  /** Runtime caching strategies */
  runtimeCaching?: CacheStrategy[];
  /** Output path for sw.js (default: 'dist/sw.js') */
  outputPath?: string;
  /** SW scope (default: '/') */
  scope?: string;
}

const DEFAULT_CONFIG: Required<SwBuilderConfig> = {
  globDirectory: "dist",
  globPatterns: ["**/*.{js,css,html,png,svg,woff2,json,ico}"],
  runtimeCaching: [
    {
      pattern: /^https:\/\/fonts\.gstatic\.com\//,
      strategy: "cache-first",
      cacheName: "google-fonts",
      maxEntries: 30,
      maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
    },
    {
      pattern: /\/api\//,
      strategy: "network-first",
      maxEntries: 50,
      maxAgeSeconds: 24 * 60 * 60, // 1 day
    },
    {
      pattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      strategy: "cache-first",
      cacheName: "images",
      maxEntries: 100,
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
    },
    {
      pattern: /\.(?:js|css)$/,
      strategy: "stale-while-revalidate",
      cacheName: "static-assets",
      maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
    },
  ],
  outputPath: "dist/sw.js",
  scope: "/",
};

/**
 * Generate the service worker JavaScript.
 *
 * This function generates a complete sw.js that uses Workbox for
 * precaching and runtime caching, with Better-PWA hooks.
 */
async function generateSw(config: SwBuilderConfig = {}): Promise<string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  better.log.info("sw-builder:generate", { outputPath: cfg.outputPath });

  // Generate precache manifest from glob patterns
  const precacheEntries = await globFiles(cfg.globDirectory, cfg.globPatterns);

  // Generate the SW code
  const swCode = generateSwCode({
    precacheEntries,
    runtimeCaching: cfg.runtimeCaching,
    scope: cfg.scope,
  });

  return swCode;
}

/** Build the service worker and write to disk */
async function buildSw(config: SwBuilderConfig = {}): Promise<string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const code = await generateSw(cfg);

  // Write to output path
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");

  mkdirSync(dirname(cfg.outputPath), { recursive: true });
  writeFileSync(cfg.outputPath, code);

  better.log.info("sw-builder:built", { path: cfg.outputPath, size: code.length });
  return cfg.outputPath;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

async function globFiles(directory: string, patterns: string[]): Promise<Array<{ url: string; revision: string | null }>> {
  try {
    const { glob } = await import("glob");
    const { readFileSync } = await import("node:fs");
    const { join, relative } = await import("node:path");
    const { createHash } = await import("node:crypto");

    const entries: Array<{ url: string; revision: string | null }> = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: directory, nodir: true });
      for (const file of files) {
        const fullPath = join(directory, file);
        try {
          const content = readFileSync(fullPath);
          const hash = createHash("md5").update(content).digest("hex");
          entries.push({
            url: relative(directory, file).replace(/\\/g, "/"),
            revision: hash,
          });
        } catch {
          entries.push({ url: relative(directory, file).replace(/\\/g, "/"), revision: null });
        }
      }
    }

    return entries;
  } catch {
    // glob not available — return empty manifest
    return [];
  }
}

function generateSwCode(options: {
  precacheEntries: Array<{ url: string; revision: string | null }>;
  runtimeCaching?: CacheStrategy[];
  scope: string;
}): string {
  const { precacheEntries, runtimeCaching = [], scope } = options;

  // Precache manifest
  const manifest = JSON.stringify(precacheEntries);

  // Runtime caching rules
  const runtimeRules = runtimeCaching
    .map((rule) => {
      const strategyMap: Record<string, string> = {
        "cache-first": "CacheFirst",
        "network-first": "NetworkFirst",
        "stale-while-revalidate": "StaleWhileRevalidate",
        "network-only": "NetworkOnly",
        "cache-only": "CacheOnly",
      };
      const strategyClass = strategyMap[rule.strategy] ?? "StaleWhileRevalidate";
      const cacheName = rule.cacheName ? `'${rule.cacheName}'` : undefined;
      const expiration = rule.maxEntries || rule.maxAgeSeconds
        ? `new CacheExpiration('${rule.cacheName ?? "runtime"}', {${rule.maxEntries ? `maxEntries: ${rule.maxEntries},` : ""}${rule.maxAgeSeconds ? `maxAgeSeconds: ${rule.maxAgeSeconds},` : ""}})`
        : undefined;

      return `registerRoute(
  ${rule.pattern},
  new ${strategyClass}(${cacheName ? `{ cacheName: ${cacheName}, plugins: [${expiration ?? ""}] }` : ""})
);`;
    })
    .join("\n\n");

  return `// better-pwa generated service worker
// DO NOT EDIT THIS FILE DIRECTLY
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });
workbox.core.setCacheNameDetails({ prefix: 'better-pwa' });

// Precache and route
workbox.precaching.precacheAndRoute(${manifest}, {});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !name.startsWith('better-pwa-'))
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Runtime caching strategies
const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly, CacheOnly } = workbox.strategies;
const { CacheExpiration } = workbox.expiration;

${runtimeRules}

// Better-PWA runtime message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Scope: ${scope}
`;
}

export { generateSw, buildSw, DEFAULT_CONFIG };
