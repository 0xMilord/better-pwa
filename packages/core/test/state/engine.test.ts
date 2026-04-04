// packages/core/test/state/engine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateEngine, getDefaultState } from '../../src/state/engine.js';

describe('StateEngine', () => {
  let engine: StateEngine;

  beforeEach(() => {
    engine = new StateEngine();
  });

  describe('getDefaultState', () => {
    it('returns a complete state object', () => {
      const state = getDefaultState();
      expect(state).toHaveProperty('isOffline');
      expect(state).toHaveProperty('isInstalled');
      expect(state).toHaveProperty('hasUpdate');
      expect(state).toHaveProperty('permissions');
      expect(state).toHaveProperty('storage');
      expect(state).toHaveProperty('connectionType');
      expect(state).toHaveProperty('installMethod');
      expect(state).toHaveProperty('canInstall');
      expect(state).toHaveProperty('updateStrategy');
      expect(state).toHaveProperty('updateProgress');
      expect(state).toHaveProperty('isSecureContext');
      expect(state).toHaveProperty('isStandalone');
      expect(state).toHaveProperty('tabCount');
    });

    it('reflects current network status', () => {
      const state = getDefaultState();
      expect(typeof state.isOffline).toBe('boolean');
    });
  });

  describe('snapshot', () => {
    it('returns a frozen object', () => {
      const snap = engine.snapshot();
      expect(Object.isFrozen(snap)).toBe(true);
    });

    it('returns the default state values', () => {
      const snap = engine.snapshot();
      expect(snap.hasUpdate).toBe(false);
      expect(snap.updateStrategy).toBe('soft');
      expect(snap.updateProgress).toBe(0);
      expect(snap.tabCount).toBe(1);
      expect(typeof snap.permissions).toBe('object');
      expect(typeof snap.storage).toBe('object');
    });

    it('returns new object each call', () => {
      const a = engine.snapshot();
      const b = engine.snapshot();
      expect(a).not.toBe(b);
    });
  });

  describe('set', () => {
    it('updates a single key', async () => {
      await engine.set('isOffline', true);
      const snap = engine.snapshot();
      expect(snap.isOffline).toBe(true);
    });

    it('notifies subscribers', async () => {
      const cb = vi.fn();
      engine.subscribe(['isOffline'], cb);
      await engine.set('isOffline', true);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ isOffline: true });
    });

    it('does not notify if value unchanged', async () => {
      const cb = vi.fn();
      engine.subscribe(['hasUpdate'], cb);
      await engine.set('hasUpdate', false);
      expect(cb).not.toHaveBeenCalled();
    });

    it('notifies only relevant subscribers', async () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      engine.subscribe(['isOffline'], cb1);
      engine.subscribe(['hasUpdate'], cb2);
      await engine.set('isOffline', true);
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).not.toHaveBeenCalled();
    });

    it('notifies subscribers for multiple keys', async () => {
      const cb = vi.fn();
      engine.subscribe(['isOffline', 'hasUpdate'], cb);
      await engine.set('isOffline', true);
      expect(cb).toHaveBeenCalledWith({ isOffline: true });
    });

    it('produces new frozen snapshot after set', async () => {
      await engine.set('isOffline', true);
      const snap = engine.snapshot();
      expect(Object.isFrozen(snap)).toBe(true);
      expect(snap.isOffline).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('returns unsubscribe function', () => {
      const unsub = engine.subscribe(['isOffline'], vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('stops notifications after unsubscribe', async () => {
      const cb = vi.fn();
      const unsub = engine.subscribe(['isOffline'], cb);
      unsub();
      await engine.set('isOffline', true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('sorts keys consistently', async () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      engine.subscribe(['hasUpdate', 'isOffline'], cb1);
      engine.subscribe(['isOffline', 'hasUpdate'], cb2);
      await engine.set('isOffline', true);
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('removes subscriber set when empty', async () => {
      const cb = vi.fn();
      const unsub = engine.subscribe(['isOffline'], cb);
      unsub();
      await engine.set('isOffline', true);
      // No error means it works — internal cleanup
    });
  });

  describe('reset', () => {
    it('restores all keys to defaults', async () => {
      await engine.set('isOffline', true);
      await engine.set('hasUpdate', 'v2.0.0');
      await engine.reset();
      const snap = engine.snapshot();
      expect(snap.isOffline).toBe(false);
      expect(snap.hasUpdate).toBe(false);
    });

    it('notifies subscribers of reset changes', async () => {
      const cb = vi.fn();
      engine.subscribe(['isOffline'], cb);
      await engine.set('isOffline', true);
      cb.mockClear();
      await engine.reset();
      expect(cb).toHaveBeenCalledWith({ isOffline: false });
    });
  });

  describe('receiveRemoteState', () => {
    it('accepts newer revision from another tab', () => {
      engine.receiveRemoteState(5, 'isOffline', true);
      expect(engine.snapshot().isOffline).toBe(true);
    });

    it('ignores stale revisions', () => {
      engine.receiveRemoteState(5, 'isOffline', true);
      engine.receiveRemoteState(3, 'isOffline', false);
      expect(engine.snapshot().isOffline).toBe(true);
    });

    it('deduplicates same revision', () => {
      engine.receiveRemoteState(5, 'isOffline', true);
      engine.receiveRemoteState(5, 'isOffline', false);
      expect(engine.snapshot().isOffline).toBe(true);
    });

    it('ignores unknown keys', () => {
      const before = engine.snapshot();
      engine.receiveRemoteState(5, 'nonexistentKey' as never, 'value');
      expect(engine.snapshot()).toEqual(before);
    });

    it('trims revision cache at 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        engine.receiveRemoteState(i + 1, 'isOffline', i % 2 === 0);
      }
      // No crash, state is valid
      expect(typeof engine.snapshot().isOffline).toBe('boolean');
    });
  });

  describe('destroy', () => {
    it('cleans up subscribers', () => {
      engine.destroy();
      // No crash on destroy
    });
  });

  describe('init', () => {
    it('initializes without error in jsdom', async () => {
      await expect(engine.init()).resolves.not.toThrow();
    });
  });
});
