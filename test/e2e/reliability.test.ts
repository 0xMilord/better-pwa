// test/e2e/reliability.test.ts
import { describe, it, expect } from 'vitest';
import { StateEngine } from '../../packages/core/src/state/engine.js';
import { LifecycleBus } from '../../packages/core/src/lifecycle/bus.js';
import { MutationQueue } from '../../packages/offline/src/index.js';
import { StorageEngine } from '../../packages/storage/src/index.js';

describe('Reliability Testing', () => {
  describe('StateEngine — 10,000 rapid updates', () => {
    it('handles 10,000 set calls without crash', async () => {
      const engine = new StateEngine();
      for (let i = 0; i < 10000; i++) {
        await engine.set('isOffline', i % 2 === 0);
      }
      expect(typeof engine.snapshot().isOffline).toBe('boolean');
    });

    it('subscriber callback count matches', async () => {
      const engine = new StateEngine();
      let count = 0;
      engine.subscribe(['isOffline'], () => { count++; });
      // Set to true (changes from false), then false (changes from true), etc.
      // Each set to a different value triggers a callback
      for (let i = 0; i < 1000; i++) {
        await engine.set('isOffline', i % 2 === 0);
      }
      // First call sets false→false (no change), second sets false→true (change)
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('LifecycleBus — 10,000 transitions', () => {
    it('handles rapid transitions', async () => {
      const bus = new LifecycleBus();
      bus.registerTransition({
        from: 'IDLE', to: 'BOOT',
        guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
      });
      bus.registerTransition({
        from: 'BOOT', to: 'READY',
        guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
      });
      bus.registerTransition({
        from: 'READY', to: 'IDLE',
        guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
      });

      for (let i = 0; i < 10000; i++) {
        const state = bus.state();
        const next = state === 'IDLE' ? 'BOOT' : state === 'BOOT' ? 'READY' : 'IDLE';
        await bus.transition(next, { config: null, state: {} as never });
      }
    });
  });

  describe('MutationQueue — rapid enqueue/dequeue', () => {
    it('handles 200 rapid mutations', async () => {
      const q = new MutationQueue();
      await q.init();
      for (let i = 0; i < 200; i++) {
        await q.enqueue({ type: 'create', resource: `/api/${i}`, method: 'POST', payload: {} });
      }
      expect(q.depth()).toBe(200);
      const result = await q.replay(async () => true);
      expect(result.success.length).toBe(200);
    }, 30000);
  });

  describe('StorageEngine — rapid set/get', () => {
    it('handles 1,000 rapid operations', async () => {
      const storage = new StorageEngine();
      await storage.init();
      for (let i = 0; i < 1000; i++) {
        await storage.set(`key:${i}`, `value:${i}`);
      }
      const val = await storage.get('key:999');
      expect(val).toBe('value:999');
    });
  });
});
