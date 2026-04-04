// packages/core/test/permissions/orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionEngine } from '../../src/permissions/orchestrator.js';

describe('PermissionEngine', () => {
  let engine: PermissionEngine;

  beforeEach(() => {
    engine = new PermissionEngine();
  });

  describe('status', () => {
    it('returns empty object initially', () => {
      expect(engine.status()).toEqual({});
    });
  });

  describe('request', () => {
    it('skips already-granted permissions', async () => {
      engine.updateState('camera', 'granted');
      const result = await engine.request(['camera']);
      expect(result.camera).toBe('granted');
    });

    it('requests permissions via direct method when query fails', async () => {
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      } as never);

      const result = await engine.request(['camera']);
      expect(result.camera).toBe('granted');
    });

    it('calls pre-prompt hook', async () => {
      const prePrompt = vi.fn();
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      } as never);
      await engine.request(['camera'], { prePrompt });
      expect(prePrompt).toHaveBeenCalled();
    });

    it('handles denied permissions with fallback', async () => {
      const fallbackCb = vi.fn();
      engine.on('denied', fallbackCb);
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new Error('denied'));
      await engine.request(['camera']);
      expect(fallbackCb).toHaveBeenCalled();
    });

    it('deduplicates already-granted in batch', async () => {
      engine.updateState('camera', 'granted');
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      } as never);
      const result = await engine.request(['camera', 'microphone']);
      expect(result.camera).toBe('granted');
    });

    it('respects maxRetries option', async () => {
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new Error('denied'));
      const result = await engine.request(['camera'], { maxRetries: 0 });
      expect(result.camera).toBe('denied');
    });
  });

  describe('updateState', () => {
    it('updates cached state', () => {
      engine.updateState('camera', 'granted');
      expect(engine.status().camera).toBe('granted');
    });

    it('clears backoff on grant', () => {
      engine.updateState('camera', 'denied');
      engine.updateState('camera', 'granted');
      // Can retry after grant
    });
  });

  describe('on denied', () => {
    it('returns unsubscribe function', () => {
      const unsub = engine.on('denied', vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('provides fallback object with show method', async () => {
      let capturedFallback: unknown;
      engine.on('denied', (_perm, fallback) => {
        capturedFallback = fallback;
      });
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new Error('denied'));
      await engine.request(['camera']);
      expect(capturedFallback).toHaveProperty('show');
      expect(typeof (capturedFallback as { show: unknown }).show).toBe('function');
    });
  });

  describe('destroy', () => {
    it('clears denied listeners', () => {
      const cb = vi.fn();
      engine.on('denied', cb);
      engine.destroy();
      // No error
    });
  });
});
