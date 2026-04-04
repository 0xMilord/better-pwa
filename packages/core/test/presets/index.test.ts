// packages/core/test/presets/index.test.ts
import { describe, it, expect } from 'vitest';
import { presets, definePreset } from '../../src/presets/index.js';

describe('presets', () => {
  it('has all expected presets', () => {
    expect(presets).toHaveProperty('saas');
    expect(presets).toHaveProperty('ecommerce');
    expect(presets).toHaveProperty('offline-first');
    expect(presets).toHaveProperty('content');
  });

  it('each preset has required fields', () => {
    for (const preset of Object.values(presets)) {
      expect(preset).toHaveProperty('updateStrategy');
      expect(preset).toHaveProperty('permissionBehavior');
      expect(preset).toHaveProperty('storageEngine');
      expect(preset).toHaveProperty('conflictResolution');
      expect(preset).toHaveProperty('priorityTiers');
      expect(preset.priorityTiers).toHaveProperty('critical');
      expect(preset.priorityTiers).toHaveProperty('high');
      expect(preset.priorityTiers).toHaveProperty('normal');
      expect(preset.priorityTiers).toHaveProperty('low');
    }
  });

  it('saas preset has soft updates', () => {
    expect(presets.saas.updateStrategy).toBe('soft');
  });

  it('ecommerce preset has on-reload updates', () => {
    expect(presets.ecommerce.updateStrategy).toBe('on-reload');
  });

  it('offline-first preset has merge conflict resolution', () => {
    expect(presets['offline-first'].conflictResolution).toBe('merge');
  });
});

describe('definePreset', () => {
  it('returns a preset with defaults', () => {
    const preset = definePreset({});
    expect(preset.updateStrategy).toBe('soft');
    expect(preset.permissionBehavior).toBe('batch');
    expect(preset.storageEngine).toBe('auto');
    expect(preset.conflictResolution).toBe('lww');
  });

  it('overrides defaults', () => {
    const preset = definePreset({ updateStrategy: 'hard' });
    expect(preset.updateStrategy).toBe('hard');
  });
});
