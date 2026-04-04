// packages/sw-builder/test/index.test.ts
import { describe, it, expect } from 'vitest';
import { generateSw, buildSw, DEFAULT_CONFIG } from '../src/index.js';

describe('sw-builder', () => {
  describe('DEFAULT_CONFIG', () => {
    it('has expected defaults', () => {
      expect(DEFAULT_CONFIG.globDirectory).toBe('dist');
      expect(DEFAULT_CONFIG.outputPath).toBe('dist/sw.js');
      expect(DEFAULT_CONFIG.scope).toBe('/');
      expect(Array.isArray(DEFAULT_CONFIG.runtimeCaching)).toBe(true);
    });

    it('has runtime caching rules', () => {
      const rules = DEFAULT_CONFIG.runtimeCaching;
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('pattern');
      expect(rules[0]).toHaveProperty('strategy');
    });
  });

  describe('generateSw', () => {
    it('generates valid SW code', async () => {
      const code = await generateSw();
      expect(code).toContain('workbox');
      expect(code).toContain('precacheAndRoute');
      expect(code).toContain('SKIP_WAITING');
    });

    it('includes custom precache entries', async () => {
      const code = await generateSw({
        globDirectory: 'test/fixtures',
        globPatterns: [],
        runtimeCaching: [],
      });
      expect(code).toContain('precacheAndRoute');
    });

    it('includes runtime caching rules', async () => {
      const code = await generateSw({
        runtimeCaching: [
          {
            pattern: /^\/api\//,
            strategy: 'network-first',
          },
        ],
      });
      expect(code).toContain('NetworkFirst');
    });

    it('includes scope comment', async () => {
      const code = await generateSw({ scope: '/app/' });
      expect(code).toContain('/app/');
    });

    it('includes all strategy types', async () => {
      const code = await generateSw({
        runtimeCaching: [
          { pattern: /a/, strategy: 'cache-first', cacheName: 'cf' },
          { pattern: /b/, strategy: 'network-first', cacheName: 'nf' },
          { pattern: /c/, strategy: 'stale-while-revalidate', cacheName: 'swr' },
          { pattern: /d/, strategy: 'network-only' },
          { pattern: /e/, strategy: 'cache-only' },
        ],
      });
      expect(code).toContain('CacheFirst');
      expect(code).toContain('NetworkFirst');
      expect(code).toContain('StaleWhileRevalidate');
      expect(code).toContain('NetworkOnly');
      expect(code).toContain('CacheOnly');
    });
  });

  describe('buildSw', () => {
    it('writes SW to disk', async () => {
      const { readFileSync, rmSync, mkdirSync, existsSync } = await import('node:fs');
      const { join } = await import('node:path');
      const tmpDir = join(process.cwd(), 'tmp', 'sw-test');
      mkdirSync(tmpDir, { recursive: true });
      const outPath = join(tmpDir, 'sw.js');

      const result = await buildSw({ outputPath: outPath, globPatterns: [] });
      expect(result).toBe(outPath);
      expect(existsSync(outPath)).toBe(true);
      const content = readFileSync(outPath, 'utf-8');
      expect(content).toContain('workbox');
      rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
