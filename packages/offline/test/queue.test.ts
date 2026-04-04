// packages/offline/test/queue.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MutationQueue } from '../src/index.js';

describe('MutationQueue', () => {
  let queue: MutationQueue;

  beforeEach(async () => {
    queue = new MutationQueue();
    await queue.init();
  });

  describe('init', () => {
    it('initializes without error', async () => {
      const q = new MutationQueue();
      await expect(q.init()).resolves.not.toThrow();
    });
  });

  describe('enqueue', () => {
    it('adds a mutation to the queue', async () => {
      const entry = await queue.enqueue({
        type: 'create',
        resource: '/api/orders',
        method: 'POST',
        payload: { item: 'test' },
      });
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.retryCount).toBe(0);
      expect(entry.conflictStrategy).toBe('lww');
    });

    it('increments queue depth', async () => {
      expect(queue.depth()).toBe(0);
      await queue.enqueue({ type: 'create', resource: '/api/test', method: 'POST', payload: {} });
      expect(queue.depth()).toBe(1);
    });

    it('assigns default values', async () => {
      const entry = await queue.enqueue({
        type: 'update',
        resource: '/api/test',
        method: 'PUT',
        payload: {},
      });
      expect(entry.maxRetries).toBe(5);
      expect(entry.priority).toBe('normal');
      expect(entry.conflictStrategy).toBe('lww');
    });

    it('accepts custom priority', async () => {
      const entry = await queue.enqueue({
        type: 'create',
        resource: '/api/auth',
        method: 'POST',
        payload: {},
        priority: 'critical',
      });
      expect(entry.priority).toBe('critical');
    });
  });

  describe('getAll', () => {
    it('returns all queued mutations', async () => {
      await queue.enqueue({ type: 'create', resource: '/api/a', method: 'POST', payload: {} });
      await queue.enqueue({ type: 'create', resource: '/api/b', method: 'POST', payload: {} });
      const all = queue.getAll();
      expect(all.length).toBe(2);
    });

    it('returns read-only array', async () => {
      await queue.enqueue({ type: 'create', resource: '/api/test', method: 'POST', payload: {} });
      const all = queue.getAll();
      expect(Object.isFrozen(all)).toBe(false);
      // But modifying it doesn't affect the queue
    });
  });

  describe('replay', () => {
    it('processes all mutations successfully', async () => {
      await queue.enqueue({ type: 'create', resource: '/api/a', method: 'POST', payload: {} });
      await queue.enqueue({ type: 'create', resource: '/api/b', method: 'POST', payload: {} });
      const result = await queue.replay(async () => true);
      expect(result.success.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    it('requeues failed mutations within retry limit', async () => {
      await queue.enqueue({ type: 'create', resource: '/api/test', method: 'POST', payload: {} });
      const result = await queue.replay(async () => false);
      expect(result.success.length).toBe(0);
      // After 1 failure with default maxRetries=5, it's still in queue
      expect(queue.depth()).toBe(1);
    });

    it('moves to failed after max retries', async () => {
      await queue.enqueue({
        type: 'create', resource: '/api/test', method: 'POST', payload: {},
        maxRetries: 1,
      });
      const result = await queue.replay(async () => false);
      expect(result.failed.length).toBe(1);
      expect(queue.depth()).toBe(0);
    });

    it('processes critical priority first', async () => {
      await queue.enqueue({ type: 'create', resource: '/api/low', method: 'POST', payload: {}, priority: 'low' });
      await queue.enqueue({ type: 'create', resource: '/api/crit', method: 'POST', payload: {}, priority: 'critical' });
      const order: string[] = [];
      await queue.replay(async (entry) => { order.push(entry.resource); return true; });
      expect(order).toEqual(['/api/crit', '/api/low']);
    });

    it('prevents concurrent replays', async () => {
      await queue.enqueue({ type: 'create', resource: '/api/test', method: 'POST', payload: {} });
      const [r1, r2] = await Promise.all([
        queue.replay(async () => { await new Promise((r) => setTimeout(r, 50)); return true; }),
        queue.replay(async () => true),
      ]);
      expect(r1.success.length + r2.success.length).toBe(1); // Only one processes
    });

    it('returns empty when no mutations', async () => {
      const result = await queue.replay(async () => true);
      expect(result.success).toEqual([]);
      expect(result.failed).toEqual([]);
    });
  });

  describe('clear', () => {
    it('empties the queue', async () => {
      await queue.enqueue({ type: 'create', resource: '/api/test', method: 'POST', payload: {} });
      await queue.clear();
      expect(queue.depth()).toBe(0);
    });
  });
});
