#!/usr/bin/env node
/**
 * build-all.js — Builds all workspace packages using root-level tsup.
 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const packagesDir = join(root, 'packages');
const packages = readdirSync(packagesDir).filter((d) => {
  const pkgPath = join(packagesDir, d, 'package.json');
  return existsSync(pkgPath);
});

let failures = 0;

for (const pkg of packages) {
  const pkgDir = join(packagesDir, pkg);
  const srcIndex = join(pkgDir, 'src', 'index.ts');
  const srcCli = join(pkgDir, 'src', 'cli.ts');
  
  let entry = srcIndex;
  if (pkg === 'cli' && existsSync(srcCli)) {
    entry = `${srcIndex} ${srcCli}`;
  }

  console.log(`\n📦 Building ${pkg}...`);
  try {
    // Run from package directory with tsup from root to avoid both resolution and rootDir issues
    const tsupBin = join(root, 'node_modules', 'tsup', 'dist', 'cli-default.js');
    const tsconfig = join(pkgDir, 'tsconfig.json');
    const cmd = `node "${tsupBin}" src/index.ts${pkg === 'cli' && existsSync(srcCli) ? ' src/cli.ts' : ''} --tsconfig "${tsconfig}" --format esm,cjs --dts --clean --minify`;
    execSync(cmd, { cwd: pkgDir, stdio: 'inherit' });
    console.log(`✅ ${pkg} built successfully`);
  } catch (err) {
    console.error(`❌ ${pkg} build failed`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n❌ ${failures} package(s) failed to build`);
  process.exit(1);
}
console.log(`\n✅ All ${packages.length} packages built successfully`);
