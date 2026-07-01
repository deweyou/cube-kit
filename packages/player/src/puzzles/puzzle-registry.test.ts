import { describe, expect, it } from 'vitest';
import { getPlayerPuzzleAdapter } from './puzzle-registry.js';

describe('getPlayerPuzzleAdapter', () => {
  it('returns adapters for cube and non-cube player events', () => {
    expect(getPlayerPuzzleAdapter('333')?.type).toBe('cube');
    expect(getPlayerPuzzleAdapter('pyram')?.type).toBe('pyraminx');
    expect(getPlayerPuzzleAdapter('skewb')?.type).toBe('skewb');
    expect(getPlayerPuzzleAdapter('fto')?.type).toBe('fto');
    expect(getPlayerPuzzleAdapter('minx')?.type).toBe('megaminx');
  });

  it('does not return adapters for unsupported player events', () => {
    expect(getPlayerPuzzleAdapter('clock')).toBeUndefined();
    expect(getPlayerPuzzleAdapter('sq1')).toBeUndefined();
  });
});
