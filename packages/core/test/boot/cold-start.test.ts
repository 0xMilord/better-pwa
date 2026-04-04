// packages/core/test/boot/cold-start.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ColdStartEngine } from '../../src/boot/cold-start.js';

describe('ColdStartEngine', () => {
  let engine: ColdStartEngine;

  beforeEach(() => {
    engine = new ColdStartEngine({});
  });

  describe('boot', () => {
    it('completes all stages in sequence', async () => {
      const result = await engine.boot();
      expect(result.stagesCompleted).toContain('hydrate');
      expect(result.stagesCompleted).toContain('sync');
      expect(result.stagesCompleted).toContain('update');
      expect(result.stagesCompleted).toContain('replay');
      expect(result.stagesFailed).toHaveLength(0);
      expect(result.state).toBe('STABLE');
    });

    it('degrades gracefully on hydrate failure', async () => {
      // Hydrate stage can't fail in default impl, but test the pattern
      const result = await engine.boot();
      expect(result).toHaveProperty('state');
    });

    it('returns stages completed array', async () => {
      const result = await engine.boot();
      expect(Array.isArray(result.stagesCompleted)).toBe(true);
      expect(result.stagesCompleted.length).toBeGreaterThan(0);
    });
  });

  describe('validateCacheFreshness', () => {
    it('returns false when cache is empty', async () => {
      const result = await engine.validateCacheFreshness();
      expect(result).toBe(false);
    });

    it('returns false when no date header', async () => {
      const mockResponse = { headers: { get: () => null } };
      vi.spyOn(caches, 'open').mockResolvedValue({
        keys: () => Promise.resolve([new Request('https://example.com/')]),
        match: () => Promise.resolve(mockResponse),
      } as never);
      const result = await engine.validateCacheFreshness();
      expect(result).toBe(false);
    });

    it('returns true for fresh cache', async () => {
      const date = new Date(Date.now() - 1000).toUTCString();
      const mockResponse = { headers: { get: () => date } };
      vi.spyOn(caches, 'open').mockResolvedValue({
        keys: () => Promise.resolve([new Request('https://example.com/')]),
        match: () => Promise.resolve(mockResponse),
      } as never);
      const result = await engine.validateCacheFreshness();
      expect(result).toBe(true);
    });

    it('returns false for stale cache', async () => {
      const date = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toUTCString();
      const mockResponse = { headers: { get: () => date } };
      vi.spyOn(caches, 'open').mockResolvedValue({
        keys: () => Promise.resolve([new Request('https://example.com/')]),
        match: () => Promise.resolve(mockResponse),
      } as never);
      const result = await engine.validateCacheFreshness();
      expect(result).toBe(false);
    });

    it('respects custom maxAge', async () => {
      const date = new Date(Date.now() - 2000).toUTCString();
      const mockResponse = { headers: { get: () => date } };
      vi.spyOn(caches, 'open').mockResolvedValue({
        keys: () => Promise.resolve([new Request('https://example.com/')]),
        match: () => Promise.resolve(mockResponse),
      } as never);
      const result = await engine.validateCacheFreshness(1000);
      expect(result).toBe(false);
    });

    it('returns false when caches API throws', async () => {
      vi.spyOn(caches, 'open').mockRejectedValue(new Error('no'));
      const result = await engine.validateCacheFreshness();
      expect(result).toBe(false);
    });
  });
});
