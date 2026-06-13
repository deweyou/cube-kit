import { describe, expect, it } from 'vitest';
import {
  UnknownSolverMethodError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
  solveCross,
  solveThreeByThreeGeneral,
  solveThreeByThreeAssist,
} from '../../index.js';

describe('3x3 assist facade', () => {
  it('runs multiple methods in one call', () => {
    const results = solveThreeByThreeAssist('R U', ['cross', 'eoline']);

    expect(results.map((result) => result.method)).toEqual(['cross', 'eoline']);
  });

  it('routes cstimer-style staged 3x3 helpers', () => {
    const results = solveThreeByThreeAssist('', [
      'cfop-f2l',
      'roux-s2',
      'petrus-s2',
      'zz-f2l',
      'block-222',
      'eo-dr',
      '333-two-phase',
      '333-general',
    ]);

    expect(results.map((result) => result.method)).toEqual([
      'cfop-f2l',
      'roux-s2',
      'petrus-s2',
      'zz-f2l',
      'block-222',
      'eo-dr',
      '333-two-phase',
      '333-general',
    ]);
    expect(
      results.flatMap((result) => result.solutions).every((solution) => solution.depth === 0),
    ).toBe(true);
  });

  it('runs the cstimer-style general 3x3 mask solver for presets and raw masks', () => {
    const rawCornerMask = 'U-U---U-UR-R---R-RF-F---F-FD-D---D-DL-L---L-LB-B---B-B';
    const result = solveThreeByThreeGeneral("R U R' U'", {
      targets: ['Cross', rawCornerMask],
      maxDepth: 7,
    });

    expect(result.method).toBe('333-general');
    expect(result.solutions.map((solution) => solution.targetLabel)).toEqual(['Cross', 'Corner']);
    expect(result.solutions.every((solution) => Number.isSafeInteger(solution.depth))).toBe(true);
  });

  it('rejects unknown targets', () => {
    expect(() => solveCross('', { targets: ['bad-target'] })).toThrow(UnknownSolverTargetError);
    expect(() => solveThreeByThreeGeneral('', { targets: ['bad-target'] })).toThrow(
      UnknownSolverTargetError,
    );
  });

  it('rejects unsupported wide moves before searching', () => {
    expect(() => solveCross('Rw')).toThrow(UnsupportedSolverMoveError);
    expect(() => solveCross('Rw')).toThrow('Rw');
  });

  it('rejects unknown methods at runtime boundaries', () => {
    expect(() => solveThreeByThreeAssist('', ['cross', 'bad' as never])).toThrow(
      UnknownSolverMethodError,
    );
  });
});
