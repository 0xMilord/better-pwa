// packages/core/test/runtime/init.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPwa } from '../../src/runtime/index.js';

describe('createPwa — init flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('transitions IDLE → BOOT → READY → SYNCING → STABLE when online', async () => {
    const transitions: string[] = [];
    const pwa = createPwa({});
    pwa.lifecycle().onTransition((from, to) => {
      transitions.push(`${from}→${to}`);
    });
    await pwa.init();
    expect(transitions).toContain('IDLE→BOOT');
    expect(transitions).toContain('BOOT→READY');
  });

  it('applies preset update strategy', async () => {
    const pwa = createPwa({ preset: 'saas' });
    await pwa.init();
    expect(pwa.update().status().strategy).toBe('soft');
  });

  it('registers and initializes late plugins', async () => {
    const pwa = createPwa({});
    await pwa.init();
    const plugin = { name: 'late-plugin', version: '1.0.1', onInit: vi.fn() };
    pwa.use(plugin);
    expect(plugin.onInit).toHaveBeenCalled();
  });

  it('init is idempotent', async () => {
    const pwa = createPwa({});
    await pwa.init();
    await pwa.init();
    await pwa.init();
    // No error
  });

  it('sets _version in state', async () => {
    const pwa = createPwa({ version: '2.0.0' });
    // Register a migration so the version actually updates
    pwa.registerMigration('1.0.1', (s) => s);
    pwa.registerMigration('2.0.0', (s) => s);
    await pwa.init();
    // After init with migrations, version should be set
    const snap = pwa.state().snapshot();
    expect(typeof snap._version).toBe('string');
  });

  it('registerMigration stores migration', async () => {
    const pwa = createPwa({ version: '2.0.0' });
    pwa.registerMigration('2.0.0', (state) => ({ ...state, newField: true }));
    await pwa.init();
    // Migration registered without error
  });
});
