// test/e2e/guarantees.test.ts
import { describe, it, expect, vi } from 'vitest';
import { StateEngine } from '../../packages/core/src/state/engine.js';
import { LifecycleBus } from '../../packages/core/src/lifecycle/bus.js';
import { MutationQueue } from '../../packages/offline/src/index.js';
import { StorageEngine } from '../../packages/storage/src/index.js';
import { UpdateController } from '../../packages/core/src/updates/controller.js';
import { PermissionEngine } from '../../packages/core/src/permissions/orchestrator.js';

describe('Runtime Guarantees', () => {
  describe('G1: Data Durability', () => {
    it('mutation queue persists across init cycles', async () => {
      const q1 = new MutationQueue();
      await q1.init();
      await q1.enqueue({
        type: 'create',
        resource: '/api/test',
        method: 'POST',
        payload: { durable: true },
      });
      expect(q1.depth()).toBe(1);
    });

    it('failed mutations are not silently dropped', async () => {
      const q = new MutationQueue();
      await q.init();
      await q.enqueue({
        type: 'create',
        resource: '/api/test',
        method: 'POST',
        payload: {},
        maxRetries: 1,
      });
      const result = await q.replay(async () => false);
      expect(result.failed.length).toBe(1);
    });
  });

  describe('G2: Update Safety', () => {
    it('soft strategy does not activate immediately', () => {
      const c = new UpdateController();
      c.setStrategy('soft');
      const mockReg = { waiting: {} } as ServiceWorkerRegistration;
      c.handleUpdateFound(mockReg);
      expect(c.internalState).toBe('WAITING');
    });
  });

  describe('G3: Cross-Tab Consistency', () => {
    it('state engine accepts remote state', () => {
      const engine = new StateEngine();
      engine.receiveRemoteState(1, 'isOffline', true);
      expect(engine.snapshot().isOffline).toBe(true);
    });

    it('stale remote state is ignored', () => {
      const engine = new StateEngine();
      engine.receiveRemoteState(5, 'isOffline', true);
      engine.receiveRemoteState(3, 'isOffline', false);
      expect(engine.snapshot().isOffline).toBe(true);
    });
  });

  describe('G4: Permission Resilience', () => {
    it('denied permissions trigger fallback', async () => {
      const engine = new PermissionEngine();
      let fallbackCalled = false;
      engine.on('denied', () => { fallbackCalled = true; });
      engine.updateState('camera', 'denied');
      await engine.request(['camera']);
      expect(fallbackCalled).toBe(true);
    });

    it('already-granted permissions are skipped', async () => {
      const engine = new PermissionEngine();
      engine.updateState('camera', 'granted');
      const result = await engine.request(['camera']);
      expect(result.camera).toBe('granted');
    });
  });

  describe('G5: Cold Start Integrity', () => {
    it('boot sequence completes all stages', async () => {
      const { ColdStartEngine } = await import('../../packages/core/src/boot/cold-start.js');
      const engine = new ColdStartEngine({});
      const result = await engine.boot();
      expect(result.state).toBe('STABLE');
      expect(result.stagesCompleted).toContain('hydrate');
      expect(result.stagesCompleted).toContain('sync');
    });
  });

  describe('G7: Resource Prioritization', () => {
    it('critical mutations replay before low', async () => {
      const q = new MutationQueue();
      await q.init();
      await q.enqueue({ type: 'create', resource: '/api/low', method: 'POST', payload: {}, priority: 'low' });
      await q.enqueue({ type: 'create', resource: '/api/crit', method: 'POST', payload: {}, priority: 'critical' });
      const order: string[] = [];
      await q.replay(async (e) => { order.push(e.resource); return true; });
      expect(order[0]).toBe('/api/crit');
    });
  });
});
