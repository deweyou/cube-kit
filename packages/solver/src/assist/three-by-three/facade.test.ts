import { describe, expect, it } from 'vitest';
import {
  UnknownSolverMethodError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
  solveCross,
  solveThreeByThreeAssist,
} from '../../index.js';

describe('3x3 assist facade', () => {
  it('runs multiple methods in one call', () => {
    const results = solveThreeByThreeAssist('R U', ['cross', 'eoline']);

    expect(results.map((result) => result.method)).toEqual(['cross', 'eoline']);
  });

  it('rejects unknown targets', () => {
    expect(() => solveCross('', { targets: ['bad-target'] })).toThrow(UnknownSolverTargetError);
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
