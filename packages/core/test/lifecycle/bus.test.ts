// packages/core/test/lifecycle/bus.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LifecycleBus } from '../../src/lifecycle/bus.js';

describe('LifecycleBus', () => {
  let bus: LifecycleBus;

  beforeEach(() => {
    bus = new LifecycleBus();
  });

  describe('state', () => {
    it('starts in IDLE state', () => {
      expect(bus.state()).toBe('IDLE');
    });
  });

  describe('registerTransition + transition', () => {
    it('executes a valid transition', async () => {
      const action = vi.fn();
      bus.registerTransition({
        from: 'IDLE', to: 'BOOT',
        guard: () => true,
        action,
        onFail: () => 'DEGRADED',
      });
      const result = await bus.transition('BOOT', { config: null, state: {} as never });
      expect(result).toBe(true);
      expect(bus.state()).toBe('BOOT');
      expect(action).toHaveBeenCalled();
    });

    it('fails when guard returns false', async () => {
      bus.registerTransition({
        from: 'IDLE', to: 'BOOT',
        guard: () => false,
        action: vi.fn(),
        onFail: () => 'DEGRADED',
      });
      const result = await bus.transition('BOOT', { config: null, state: {} as never });
      expect(result).toBe(false);
      expect(bus.state()).toBe('IDLE');
    });

    it('falls back on action failure', async () => {
      bus.registerTransition({
        from: 'IDLE', to: 'BOOT',
        guard: () => true,
        action: async () => { throw new Error('boot failed'); },
        onFail: () => 'DEGRADED',
      });
      const result = await bus.transition('BOOT', { config: null, state: {} as never });
      expect(result).toBe(false);
      expect(bus.state()).toBe('DEGRADED');
    });

    it('records blocked transitions', async () => {
      const result = await bus.transition('BOOT', { config: null, state: {} as never });
      expect(result).toBe(false);
      const blocked = bus.getBlockedTransitions();
      expect(blocked.length).toBe(1);
      expect(blocked[0]?.blocked).toBe(true);
    });

    it('records blocked transitions with guard failure', async () => {
      bus.registerTransition({
        from: 'IDLE', to: 'BOOT',
        guard: () => false,
        action: vi.fn(),
        onFail: () => 'DEGRADED',
      });
      await bus.transition('BOOT', { config: null, state: {} as never });
      const blocked = bus.getBlockedTransitions();
      expect(blocked.length).toBe(1);
      expect(blocked[0]?.blocked).toBe(true);
    });
  });

  describe('onTransition', () => {
    it('notifies on successful transition', async () => {
      const cb = vi.fn();
      bus.onTransition(cb);
      bus.registerTransition({
        from: 'IDLE', to: 'BOOT',
        guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
      });
      await bus.transition('BOOT', { config: null, state: {} as never });
      expect(cb).toHaveBeenCalledWith('IDLE', 'BOOT', expect.objectContaining({ timestamp: expect.any(Number) }));
    });

    it('does not notify on failed transition', async () => {
      const cb = vi.fn();
      bus.onTransition(cb);
      await bus.transition('BOOT', { config: null, state: {} as never });
      expect(cb).not.toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const unsub = bus.onTransition(vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('stops notifications after unsubscribe', async () => {
      const cb = vi.fn();
      const unsub = bus.onTransition(cb);
      unsub();
      bus.registerTransition({
        from: 'IDLE', to: 'BOOT',
        guard: () => true, action: async () => {}, onFail: () => 'DEGRADED',
      });
      await bus.transition('BOOT', { config: null, state: {} as never });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('emit + on', () => {
    it('emits events to subscribers', () => {
      const cb = vi.fn();
      bus.on('sw:registered', cb);
      bus.emit({ type: 'sw:registered', detail: { swVersion: 'v1' } });
      expect(cb).toHaveBeenCalledWith({ type: 'sw:registered', detail: { swVersion: 'v1' } });
    });

    it('does not emit to wrong event type', () => {
      const cb = vi.fn();
      bus.on('sw:registered', cb);
      bus.emit({ type: 'sw:activated', detail: { swVersion: 'v1' } });
      expect(cb).not.toHaveBeenCalled();
    });

    it('handles errors in listeners gracefully', () => {
      bus.on('sw:registered', () => { throw new Error('boom'); });
      const cb2 = vi.fn();
      bus.on('sw:registered', cb2);
      expect(() => bus.emit({ type: 'sw:registered', detail: { swVersion: 'v1' } })).not.toThrow();
      expect(cb2).toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const unsub = bus.on('sw:registered', vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('stops notifications after unsubscribe', () => {
      const cb = vi.fn();
      const unsub = bus.on('sw:registered', cb);
      unsub();
      bus.emit({ type: 'sw:registered', detail: { swVersion: 'v1' } });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('observe', () => {
    it('returns a subscribe function', () => {
      const observer = bus.observe();
      expect(typeof observer.subscribe).toBe('function');
    });
  });

  describe('destroy', () => {
    it('prevents new subscriptions from working', () => {
      const cb = vi.fn();
      bus.on('sw:registered', cb);
      bus.destroy();
      // After destroy, the internal maps are cleared
      expect(bus.getBlockedTransitions()).toEqual([]);
      expect(bus.state()).toBe('IDLE');
    });
  });
});
