// packages/storage/test/engine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageEngine } from '../src/index.js';

describe('StorageEngine', () => {
  let storage: StorageEngine;

  beforeEach(async () => {
    storage = new StorageEngine();
    await storage.init();
  });

  describe('init', () => {
    it('initializes without error', async () => {
      const s = new StorageEngine();
      await expect(s.init()).resolves.not.toThrow();
    });
  });

  describe('engine', () => {
    it('returns active engine type', () => {
      expect(['idb', 'memory']).toContain(storage.engine);
    });
  });

  describe('set / get', () => {
    it('stores and retrieves a value', async () => {
      await storage.set('user:1', { name: 'Alice' });
      const val = await storage.get('user:1');
      expect(val).toEqual({ name: 'Alice' });
    });

    it('returns undefined for missing key', async () => {
      const val = await storage.get('nonexistent');
      expect(val).toBe(undefined);
    });

    it('overwrites existing value', async () => {
      await storage.set('key', 'first');
      await storage.set('key', 'second');
      const val = await storage.get('key');
      expect(val).toBe('second');
    });
  });

  describe('delete', () => {
    it('removes a key', async () => {
      await storage.set('key', 'value');
      await storage.delete('key');
      const val = await storage.get('key');
      expect(val).toBe(undefined);
    });

    it('does nothing for missing key', async () => {
      await expect(storage.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('keys', () => {
    it('lists all keys', async () => {
      await storage.set('user:1', {});
      await storage.set('user:2', {});
      const keys = await storage.keys();
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
    });

    it('filters by pattern', async () => {
      await storage.set('user:1', {});
      await storage.set('user:2', {});
      await storage.set('order:1', {});
      const keys = await storage.keys('user:*');
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).not.toContain('order:1');
    });

    it('returns empty array when no keys', async () => {
      const keys = await storage.keys();
      expect(Array.isArray(keys)).toBe(true);
    });
  });

  describe('quota', () => {
    it('returns quota info', async () => {
      const q = await storage.quota();
      expect(q).toHaveProperty('usage');
      expect(q).toHaveProperty('quota');
      expect(q).toHaveProperty('percent');
    });
  });

  describe('evict', () => {
    it('evicts memory entries', async () => {
      const count = await storage.evict('lru');
      expect(typeof count).toBe('number');
    });

    it('supports all eviction policies', async () => {
      await expect(storage.evict('lru')).resolves.not.toThrow();
      await expect(storage.evict('lfu')).resolves.not.toThrow();
      await expect(storage.evict('ttl')).resolves.not.toThrow();
    });
  });

  describe('onQuotaLow', () => {
    it('returns unsubscribe function', () => {
      const unsub = storage.onQuotaLow(() => {});
      expect(typeof unsub).toBe('function');
    });
  });

  describe('destroy', () => {
    it('cleans up resources', () => {
      storage.destroy();
      // No error
    });
  });
});
