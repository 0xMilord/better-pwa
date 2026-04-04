#!/usr/bin/env node
/**
 * check-sizes.js — Verifies each package's gzip'd bundle is within its budget.
 * Fails the pipeline if any package exceeds.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const BUDGETS = {
  '@better-pwa/core': 15360,       // 15KB
  '@better-pwa/offline': 8192,     // 8KB
  '@better-pwa/storage': 5120,     // 5KB
  '@better-pwa/sw-builder': 51200, // 50KB
  '@better-pwa/manifest': 5120,    // 5KB — build tool, not runtime
  '@better-pwa/adapter-react': 2048,
  '@better-pwa/adapter-vue': 2048,
  '@better-pwa/adapter-svelte': 2048,
  '@better-pwa/adapter-next': 2048,
  '@better-pwa/adapter-vite': 2048,
};

const PKG_DIRS = {
  '@better-pwa/core': 'core',
  '@better-pwa/offline': 'offline',
  '@better-pwa/storage': 'storage',
  '@better-pwa/sw-builder': 'sw-builder',
  '@better-pwa/manifest': 'manifest',
  '@better-pwa/adapter-react': 'adapter-react',
  '@better-pwa/adapter-vue': 'adapter-vue',
  '@better-pwa/adapter-svelte': 'adapter-svelte',
  '@better-pwa/adapter-next': 'adapter-next',
  '@better-pwa/adapter-vite': 'adapter-vite',
};

let failed = false;

for (const [pkg, budget] of Object.entries(BUDGETS)) {
  const dir = PKG_DIRS[pkg];
  const distPath = join(root, 'packages', dir, 'dist', 'index.js');
  if (!existsSync(distPath)) {
    console.log(`⏭️  ${pkg}: dist not found (skipped)`);
    continue;
  }
  const content = readFileSync(distPath);
  const gzipped = gzipSync(content).length;
  const status = gzipped <= budget ? '✅' : '❌';
  if (gzipped > budget) failed = true;
  console.log(`${status} ${pkg}: ${gzipped}B / ${budget}B`);
}

if (failed) {
  console.error('\n❌ Bundle size budget exceeded');
  process.exit(1);
}
console.log('\n✅ All packages within size budget');
