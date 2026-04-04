#!/usr/bin/env node
/**
 * bump-versions.js — Bump all workspace packages to a target version.
 * Usage: node scripts/bump-versions.js 1.0.0
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const packagesDir = join(root, 'packages');
const targetVersion = process.argv[2] || '1.0.0';

const packages = readdirSync(packagesDir).filter((d) => {
  const pkgPath = join(packagesDir, d, 'package.json');
  return statSync(pkgPath, { throwIfNoEntry: false })?.isFile();
});

for (const dir of packages) {
  const pkgPath = join(packagesDir, dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const oldVersion = pkg.version;
  pkg.version = targetVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ${pkg.name}: ${oldVersion} → ${targetVersion}`);
}

console.log(`\n✅ Bumped ${packages.length} packages to v${targetVersion}`);
