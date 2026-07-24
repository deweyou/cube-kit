import { describe, expect, it } from 'vitest';
import {
  getPuzzleAssistEventId,
  getSolverAssistMethodOption,
  getSolverAssistMethods,
  isSolverAssistEvent,
} from './solver-assist-config';

describe('solver assist configuration', () => {
  it('exposes speed methods for 3x3 and one-handed without advanced mask tools', () => {
    const methods = getSolverAssistMethods('333').map((option) => option.method);

    expect(methods).toEqual([
      'cross',
      'xcross',
      'eoline',
      'roux-s1',
      'roux-s2',
      'cfop-f2l',
      'zz-f2l',
    ]);
    expect(getSolverAssistMethods('333oh').map((option) => option.method)).toEqual(methods);
    expect(methods).not.toContain('333-two-phase');
    expect(methods).not.toContain('333-general');
  });

  it('keeps the fewest-moves method set separate from speed solving', () => {
    expect(getSolverAssistMethods('333fm').map((option) => option.method)).toEqual([
      'cross',
      'xcross',
      'eoline',
      'eofc',
      'petrus-s1',
      'petrus-s2',
      'eo-dr',
      'block-222',
    ]);
    expect(getSolverAssistMethodOption('333fm', 'eo-dr').presentation).toBe('staged');
    expect(getPuzzleAssistEventId('333fm')).toBe('333');
  });

  it('supports the existing auxiliary-solver puzzle events only', () => {
    expect(isSolverAssistEvent('222')).toBe(true);
    expect(isSolverAssistEvent('sq1')).toBe(true);
    expect(isSolverAssistEvent('pyram')).toBe(true);
    expect(isSolverAssistEvent('skewb')).toBe(true);
    expect(isSolverAssistEvent('444')).toBe(false);
    expect(isSolverAssistEvent('333mbld')).toBe(false);
  });
});
