#!/usr/bin/env node
/**
 * release.js — One-command release pipeline.
 *
 * Lint → Test → Build → Size → Parse changesets → Bump → Changelog → Commit → Tag → Publish
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const changesDir = join(root, '.changesets');
const packagesDir = join(root, 'packages');
const DRY_RUN = process.argv.includes('--dry-run');

const PKG_DIRS = {
  '@better-pwa/core': 'core',
  '@better-pwa/offline': 'offline',
  '@better-pwa/storage': 'storage',
  '@better-pwa/sw-builder': 'sw-builder',
  '@better-pwa/manifest': 'manifest',
  'better-pwa': 'cli',
  '@better-pwa/adapter-react': 'adapter-react',
  '@better-pwa/adapter-vue': 'adapter-vue',
  '@better-pwa/adapter-svelte': 'adapter-svelte',
  '@better-pwa/adapter-next': 'adapter-next',
  '@better-pwa/adapter-vite': 'adapter-vite',
};

function run(cmd, cwd) {
  console.log(`> ${cmd}`);
  if (DRY_RUN) return '';
  return execSync(cmd, { stdio: 'pipe', cwd: cwd || root }).toString().trim();
}

function parseChangesets() {
  if (!existsSync(changesDir)) return { packages: {} };
  const files = readdirSync(changesDir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) return { packages: {} };

  const packages = {};

  for (const file of files) {
    const content = readFileSync(join(changesDir, file), 'utf-8');
    const parts = content.split(/^---$/m);
    // parts[0] = before frontmatter (usually empty)
    // parts[1] = frontmatter YAML
    // parts[2+] = content/summary

    if (parts.length < 3) continue; // Not a valid changeset

    const fmLines = parts[1].trim().split('\n');
    const summary = parts.slice(2).join('---').trim();

    for (const line of fmLines) {
      const match = line.match(/^"?([^"]+)"?\s*:\s*(\w+)/);
      if (match) {
        const [, pkgName, bumpType] = match;
        const pkg = pkgName.trim();
        if (!packages[pkg]) packages[pkg] = { bump: 'patch', entries: [] };
        if (bumpType === 'major') packages[pkg].bump = 'major';
        else if (bumpType === 'minor' && packages[pkg].bump !== 'major') packages[pkg].bump = 'minor';
        packages[pkg].entries.push({ file, summary });
      }
    }
  }

  return { packages };
}

function bumpVersion(current, bump) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (bump) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: return current;
  }
}

async function main() {
  console.log(`\n🚀 better-pwa release${DRY_RUN ? ' (dry run)' : ''}\n`);

  // Step 1: Lint
  console.log('[1/11] Linting...');
  try { run('npm run lint'); } catch (e) {
    console.error(e.stdout?.toString() || e.message);
    process.exit(1);
  }

  // Step 2: Test
  console.log('[2/11] Running tests...');
  try { run('npm run test'); } catch (e) {
    console.error(e.stdout?.toString() || e.message);
    process.exit(1);
  }

  // Step 3: Build
  console.log('[3/11] Building all packages...');
  try { run('npm run build'); } catch (e) {
    console.error(e.stdout?.toString() || e.message);
    process.exit(1);
  }

  // Step 4: Size check
  console.log('[4/11] Checking bundle sizes...');
  try { run('node scripts/check-sizes.js'); } catch (e) {
    console.error(e.stdout?.toString() || e.message);
    process.exit(1);
  }

  // Step 5: Parse changesets
  console.log('[5/11] Parsing changesets...');
  const { packages } = parseChangesets();
  if (Object.keys(packages).length === 0) {
    console.log('⚠️  No changesets found. Nothing to release.');
    process.exit(0);
  }

  const bumpPlan = {};
  for (const [pkgName, info] of Object.entries(packages)) {
    const dir = PKG_DIRS[pkgName];
    if (!dir) {
      console.log(`⏭️  ${pkgName}: no matching package dir (skipped)`);
      continue;
    }
    const pkgPath = join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const newVersion = bumpVersion(pkg.version, info.bump);
    bumpPlan[pkgName] = { dir, oldVersion: pkg.version, newVersion, bump: info.bump, entries: info.entries };
    console.log(`  ${pkgName}: ${pkg.version} → ${newVersion} (${info.bump})`);
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] Would execute:');
    for (const [pkgName, plan] of Object.entries(bumpPlan)) {
      console.log(`  - Update ${pkgName} to ${plan.newVersion}`);
      console.log(`  - Delete ${plan.entries.length} changeset(s)`);
    }
    console.log('  - Commit on main, tag, push');
    console.log('  - npm publish (changed packages only)');
    console.log('\n✅ Dry run complete. Run without --dry-run to release.');
    process.exit(0);
  }

  // Step 6: Update package.json files + generate CHANGELOG
  console.log('[6/11] Updating versions...');
  const date = new Date().toISOString().split('T')[0];
  const changelogEntries = [];

  for (const [pkgName, plan] of Object.entries(bumpPlan)) {
    const pkgPath = join(packagesDir, plan.dir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    pkg.version = plan.newVersion;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

    changelogEntries.push(`## ${pkgName}@${plan.newVersion} (${date})\n`);
    for (const entry of plan.entries) {
      changelogEntries.push(`- ${entry.summary}`);
    }
    changelogEntries.push('');

    for (const entry of plan.entries) {
      const filePath = join(changesDir, entry.file);
      if (existsSync(filePath)) unlinkSync(filePath);
    }
  }

  // Update root CHANGELOG.md
  const changelogPath = join(root, 'CHANGELOG.md');
  const existing = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf-8') : '# Changelog\n\n';
  const newChangelog = existing.replace('# Changelog\n', `# Changelog\n\n${changelogEntries.join('\n')}`);
  writeFileSync(changelogPath, newChangelog);

  // Step 7: Commit on main
  console.log('[7/11] Committing on main...');
  run('git add .');
  const versionStr = Object.entries(bumpPlan).map(([k, p]) => `${k}@${p.newVersion}`).join(', ');
  run(`git commit -m "chore: release ${versionStr}"`);

  // Step 8: Tag + push
  const firstVersion = Object.values(bumpPlan)[0].newVersion;
  console.log('[8/11] Tagging and pushing...');
  run(`git tag v${firstVersion}`);
  run('git push origin main');
  run(`git push origin v${firstVersion}`);

  // Step 9: Publish changed packages
  console.log('[9/11] Publishing to npm...');
  for (const [pkgName, plan] of Object.entries(bumpPlan)) {
    const pkgDir = join(packagesDir, plan.dir);
    const otp = process.env.NPM_OTP;
    const otpFlag = otp ? ` --otp=${otp}` : '';
    run(`npm publish --access public${otpFlag}`, pkgDir);
    console.log(`✅ Published ${pkgName}@${plan.newVersion}`);
  }

  // Step 10: Post-release verification
  console.log('[10/11] Verifying installs...');
  for (const [pkgName] of Object.entries(bumpPlan)) {
    console.log(`  Verifying ${pkgName}...`);
    const tmpDir = join(root, 'tmp', `_verify_${Date.now()}`);
    run(`mkdir -p "${tmpDir}" && cd "${tmpDir}" && npm init -y && npm install ${pkgName}`);
    run(`rm -rf "${tmpDir}"`);
  }

  console.log(`\n✅ Release complete. Published ${Object.keys(bumpPlan).length} package(s).`);
}

main().catch((err) => {
  console.error('\n❌ Release failed:', err.message);
  process.exit(1);
});
