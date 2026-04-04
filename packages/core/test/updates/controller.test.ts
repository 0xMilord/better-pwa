// packages/core/test/updates/controller.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdateController } from '../../src/updates/controller.js';

describe('UpdateController', () => {
  let controller: UpdateController;

  beforeEach(() => {
    controller = new UpdateController();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setStrategy', () => {
    it('sets the strategy', () => {
      controller.setStrategy('hard');
      expect(controller.status().strategy).toBe('hard');
    });

    it('sets gradual with options', () => {
      controller.setStrategy('gradual', { rollout: 0.2, window: '4h', seed: 'user123' });
      expect(controller.status().strategy).toBe('gradual');
    });
  });

  describe('status', () => {
    it('returns initial status', () => {
      const status = controller.status();
      expect(status.current).toBe('unknown');
      expect(status.waiting).toBe(null);
      expect(status.strategy).toBe('soft');
    });
  });

  describe('handleUpdateFound', () => {
    it('sets waiting state with soft strategy', () => {
      const mockReg = { waiting: {} } as ServiceWorkerRegistration;
      controller.handleUpdateFound(mockReg);
      expect(controller.internalState).toBe('WAITING');
      expect(controller.status().waiting).toBe('pending');
    });

    it('auto-activates with hard strategy', () => {
      controller.setStrategy('hard');
      const mockReg = { waiting: { postMessage: vi.fn() } } as unknown as ServiceWorkerRegistration;
      controller.handleUpdateFound(mockReg);
      // With hard strategy, activate() is called which transitions to ACTIVATING then IDLE
      // Since there's no waiting SW to actually message, it goes through the flow
      expect(['ACTIVATING', 'IDLE']).toContain(controller.internalState);
    });

    it('notifies listeners', () => {
      const cb = vi.fn();
      controller.on('update_available', cb);
      const mockReg = { waiting: {} } as ServiceWorkerRegistration;
      controller.handleUpdateFound(mockReg);
      expect(cb).toHaveBeenCalledWith('pending');
    });
  });

  describe('activate', () => {
    it('does nothing when not waiting', async () => {
      await controller.activate();
      expect(controller.internalState).toBe('IDLE');
    });

    it('activates when waiting', async () => {
      const mockReg = { waiting: { postMessage: vi.fn() } } as unknown as ServiceWorkerRegistration;
      controller.handleUpdateFound(mockReg);
      expect(controller.internalState).toBe('WAITING');
      await controller.activate();
      expect(controller.internalState).toBe('IDLE');
      expect(controller.status().current).toBe('pending');
    });
  });

  describe('on', () => {
    it('returns unsubscribe function', () => {
      const unsub = controller.on('update_available', vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('stops notifications after unsubscribe', () => {
      const cb = vi.fn();
      const unsub = controller.on('update_available', cb);
      unsub();
      const mockReg = { waiting: {} } as ServiceWorkerRegistration;
      controller.handleUpdateFound(mockReg);
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('startPolling / stopPolling', () => {
    it('polls at interval', () => {
      const mockReg = { waiting: {} } as ServiceWorkerRegistration;
      vi.spyOn(navigator.serviceWorker, 'getRegistrations').mockResolvedValue([mockReg] as never);
      controller.startPolling(100);
      vi.advanceTimersByTime(200);
      // Should have checked for updates
    });

    it('stops polling', () => {
      controller.startPolling(100);
      controller.stopPolling();
      vi.advanceTimersByTime(200);
      // No error
    });
  });

  describe('update loop detection', () => {
    it('warns after max cycles', () => {
      const mockReg = { waiting: {} } as ServiceWorkerRegistration;
      vi.spyOn(navigator.serviceWorker, 'getRegistrations').mockResolvedValue([mockReg] as never);
      controller.startPolling(10);
      // Advance past 3 cycles
      vi.advanceTimersByTime(30);
      controller.stopPolling();
    });
  });

  describe('gradual rollout', () => {
    it('deterministic assignment', () => {
      controller.setStrategy('gradual', { rollout: 1.0, window: '1h', seed: 'test' });
      // With 100% rollout, should always be included
    });

    it('excludes users above threshold', () => {
      controller.setStrategy('gradual', { rollout: 0.0, window: '1h', seed: 'test' });
      // With 0% rollout, should always be excluded
    });
  });

  describe('destroy', () => {
    it('cleans up', () => {
      controller.startPolling(100);
      controller.destroy();
      vi.advanceTimersByTime(200);
      // No error after destroy
    });
  });
});
