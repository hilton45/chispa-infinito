import { describe, it, expect } from 'vitest';
import { createInitialState } from '@/core/GameState';
import { D } from '@/utils/Decimal';
import {
  serializeState,
  deserializeState,
  exportSaveString,
  importSaveString,
} from '@/save/SaveManager';

describe('SaveManager Serialization & Checksum', () => {
  it('serializes and deserializes state accurately', () => {
    const state = createInitialState();
    state.energy = D('1.25e45');
    state.generators['atom'] = { owned: 42 };
    state.darkMatterTotal = D(15);

    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.energy.eq(D('1.25e45'))).toBe(true);
    expect(restored.generators['atom'].owned).toBe(42);
    expect(restored.darkMatterTotal.toNumber()).toBe(15);
  });

  it('exports and imports base64 save string with checksum verification', () => {
    const state = createInitialState();
    state.energy = D(999999);
    state.bigBangsTotal = 4;

    const code = exportSaveString(state);
    expect(code.startsWith('CHISPA2:')).toBe(true);

    const imported = importSaveString(code);
    expect(imported.energy.toNumber()).toBe(999999);
    expect(imported.bigBangsTotal).toBe(4);
  });

  it('rejects tampered save strings with invalid checksum', () => {
    const state = createInitialState();
    const code = exportSaveString(state);
    const tampered = code.replace('CHISPA2:', 'CHISPA2:00');
    expect(() => importSaveString(tampered)).toThrow();
  });
});
