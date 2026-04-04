// packages/core/test/runtime/index.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createPwa } from '../../src/runtime/index.js';

describe('createPwa', () => {
  it('creates a runtime instance', () => {
    const pwa = createPwa({});
    expect(pwa).toBeDefined();
    expect(typeof pwa.state).toBe('function');
    expect(typeof pwa.lifecycle).toBe('function');
    expect(typeof pwa.permissions).toBe('function');
    expect(typeof pwa.update).toBe('function');
    expect(typeof pwa.on).toBe('function');
    expect(typeof pwa.use).toBe('function');
    expect(typeof pwa.destroy).toBe('function');
  });

  it('applies preset config', () => {
    const pwa = createPwa({ preset: 'saas' });
    expect(pwa).toBeDefined();
  });

  it('exposes state API', () => {
    const pwa = createPwa({});
    const state = pwa.state();
    expect(typeof state.snapshot).toBe('function');
    expect(typeof state.subscribe).toBe('function');
    expect(typeof state.set).toBe('function');
    expect(typeof state.reset).toBe('function');
  });

  it('exposes lifecycle API', () => {
    const pwa = createPwa({});
    const lifecycle = pwa.lifecycle();
    expect(typeof lifecycle.state).toBe('function');
    expect(typeof lifecycle.onTransition).toBe('function');
    expect(typeof lifecycle.blockedTransitions).toBe('function');
  });

  it('exposes permissions API', () => {
    const pwa = createPwa({});
    const perms = pwa.permissions();
    expect(typeof perms.request).toBe('function');
    expect(typeof perms.status).toBe('function');
    expect(typeof perms.on).toBe('function');
  });

  it('exposes update API', () => {
    const pwa = createPwa({});
    const update = pwa.update();
    expect(typeof update.setStrategy).toBe('function');
    expect(typeof update.on).toBe('function');
    expect(typeof update.activate).toBe('function');
    expect(typeof update.status).toBe('function');
  });

  it('registers plugins', () => {
    const pwa = createPwa({});
    const plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      onInit: vi.fn(),
    };
    pwa.use(plugin);
    // No error means plugin was registered
  });

  it('can be destroyed', async () => {
    const pwa = createPwa({});
    await expect(pwa.destroy()).resolves.not.toThrow();
  });

  it('double destroy is safe', async () => {
    const pwa = createPwa({});
    await pwa.destroy();
    await pwa.destroy();
    // No error
  });
});
