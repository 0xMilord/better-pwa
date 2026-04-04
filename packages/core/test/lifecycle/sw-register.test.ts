// packages/core/test/lifecycle/sw-register.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerServiceWorker, getSwRegistration } from '../../src/lifecycle/sw-register.js';
import { LifecycleBus } from '../../src/lifecycle/bus.js';

describe('registerServiceWorker', () => {
  let bus: LifecycleBus;

  beforeEach(() => {
    bus = new LifecycleBus();
    vi.restoreAllMocks();
  });

  it('registers a service worker', async () => {
    const mockReg = { addEventListener: vi.fn() };
    vi.spyOn(navigator.serviceWorker, 'register').mockResolvedValue(mockReg as never);
    const result = await registerServiceWorker({ swUrl: '/sw.js', scope: '/' }, bus);
    expect(result).toBe(mockReg);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('emits sw:registered event', async () => {
    const cb = vi.fn();
    bus.on('sw:registered', cb);
    vi.spyOn(navigator.serviceWorker, 'register').mockResolvedValue({ addEventListener: vi.fn() } as never);
    await registerServiceWorker({ swUrl: '/sw.js' }, bus);
    expect(cb).toHaveBeenCalled();
  });

  it('emits sw:redundant on registration failure', async () => {
    const cb = vi.fn();
    bus.on('sw:redundant', cb);
    vi.spyOn(navigator.serviceWorker, 'register').mockRejectedValue(new Error('fail'));
    await registerServiceWorker({ swUrl: '/sw.js' }, bus);
    expect(cb).toHaveBeenCalled();
  });

  it('calls onUpdateFound when update found', async () => {
    const onUpdateFound = vi.fn();
    const mockReg = {
      addEventListener: vi.fn((event, cb) => {
        if (event === 'updatefound') cb();
      }),
      installing: {
        addEventListener: vi.fn((event, cb) => {
          if (event === 'statechange') cb();
        }),
        state: 'installed',
      },
    };
    vi.spyOn(navigator.serviceWorker, 'register').mockResolvedValue(mockReg as never);
    const cb = vi.fn();
    bus.on('update:available', cb);
    await registerServiceWorker({ swUrl: '/sw.js', onUpdateFound }, bus);
    expect(onUpdateFound).toHaveBeenCalledWith(mockReg);
    expect(cb).toHaveBeenCalled();
  });
});

describe('getSwRegistration', () => {
  it('returns first registration without scope', async () => {
    const mockReg = { scope: 'https://example.com/' };
    vi.spyOn(navigator.serviceWorker, 'getRegistrations').mockResolvedValue([mockReg] as never);
    const result = await getSwRegistration();
    expect(result).toBe(mockReg);
  });
});
