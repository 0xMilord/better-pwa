// test/e2e/monkey.test.ts
import { describe, it, expect } from 'vitest';
import { StateEngine } from '../../packages/core/src/state/engine.js';
import { LifecycleBus } from '../../packages/core/src/lifecycle/bus.js';
import { MutationQueue } from '../../packages/offline/src/index.js';

describe('Monkey Testing', () => {
  describe('StateEngine — random inputs', () => {
    it('handles random key/value combinations', async () => {
      const engine = new StateEngine();
      const keys: (keyof import('../packages/core/src/types.js').PwaState)[] = [
        'isOffline', 'hasUpdate', 'updateStrategy', 'updateProgress', 'tabCount', 'canInstall',
      ];
      const values: unknown[] = [true, false, 0, 1, 100, 'string', null, 'soft', 'hard'];

      for (let i = 0; i < 100; i++) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        const value = values[Math.floor(Math.random() * values.length)];
        // Should not throw even with mismatched types
        try {
          await engine.set(key, value);
        } catch {
          // Expected for type mismatches
        }
      }
      expect(typeof engine.snapshot()).toBe('object');
    });

    it('handles rapid subscribe/unsubscribe', async () => {
      const engine = new StateEngine();
      for (let i = 0; i < 1000; i++) {
        const unsub = engine.subscribe(['isOffline'], () => {});
        unsub();
      }
      await engine.set('isOffline', true);
      // No crash
    });
  });

  describe('LifecycleBus — random transitions', () => {
    it('handles random transition attempts', async () => {
      const bus = new LifecycleBus();
      const states = ['IDLE', 'BOOT', 'READY', 'OFFLINE', 'SYNCING', 'STABLE', 'DEGRADED'] as const;

      bus.registerTransition({
        from: 'IDLE', to: 'BOOT',
        guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
      });
      bus.registerTransition({
        from: 'BOOT', to: 'READY',
        guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
      });
      bus.registerTransition({
        from: 'READY', to: 'STABLE',
        guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
      });

      for (let i = 0; i < 100; i++) {
        const from = states[Math.floor(Math.random() * states.length)];
        const to = states[Math.floor(Math.random() * states.length)];
        if (from !== bus.state()) {
          // Force state change
          bus.registerTransition({
            from: bus.state(), to: from as typeof states[number],
            guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
          });
          await bus.transition(from, { config: null, state: {} as never });
        }
        await bus.transition(to, { config: null, state: {} as never });
      }
    });
  });

  describe('MutationQueue — random operations', () => {
    it('handles random enqueue/replay cycles', async () => {
      const q = new MutationQueue();
      await q.init();

      for (let i = 0; i < 10; i++) {
        const count = Math.floor(Math.random() * 10);
        for (let j = 0; j < count; j++) {
          await q.enqueue({
            type: ['create', 'update', 'delete'][Math.floor(Math.random() * 3)] as never,
            resource: `/api/${Math.random()}`,
            method: ['POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 3)] as never,
            payload: {},
          });
        }
        await q.replay(async () => Math.random() > 0.3);
      }
    });
  });
});
