import { describe, expect, it } from 'vitest';
import {
  NoSolverSolutionError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
  solveTwoByTwoFace,
  solveTwoByTwoLayer,
} from '../../index.js';
import { isTwoByTwoFaceSolved, isTwoByTwoLayerSolved } from './face-layer.js';

describe('2x2 auxiliary solvers', () => {
  it('solves a D face target', () => {
    const result = solveTwoByTwoFace('R U', { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('222-face');
    expect(solution.target).toBe('D');
    expect(isTwoByTwoFaceSolved('R U', solution)).toBe(true);
  });

  it('solves a D first-layer target', () => {
    const result = solveTwoByTwoLayer('R U F', { targets: ['D'] });
    const solution = result.solutions[0];

    expect(solution.method).toBe('222-layer');
    expect(solution.target).toBe('D');
    expect(isTwoByTwoLayerSolved('R U F', solution)).toBe(true);
  });

  it('solves all face targets when no target filter is supplied', () => {
    const result = solveTwoByTwoFace('');

    expect(result.solutions.map((solution) => solution.target)).toEqual([
      'D',
      'U',
      'L',
      'R',
      'F',
      'B',
    ]);
    expect(result.solutions.every((solution) => solution.depth === 0)).toBe(true);
  });

  it('solves non-D layer targets', () => {
    const result = solveTwoByTwoLayer('', { targets: ['U', 'L', 'R', 'F', 'B'] });

    expect(result.solutions.map((solution) => solution.target)).toEqual(['U', 'L', 'R', 'F', 'B']);
    expect(result.solutions.every((solution) => solution.depth === 0)).toBe(true);
  });

  it('reports unknown targets and unsupported moves', () => {
    expect(() => solveTwoByTwoFace('', { targets: ['X'] })).toThrow(UnknownSolverTargetError);
    expect(() => solveTwoByTwoFace('D')).toThrow(UnsupportedSolverMoveError);
    expect(() => solveTwoByTwoFace('Rw')).toThrow(UnsupportedSolverMoveError);
  });

  it('reports depth misses', () => {
    expect(() => solveTwoByTwoLayer('R U F', { targets: ['D'], maxDepth: 0 })).toThrow(
      NoSolverSolutionError,
    );
  });

  it('returns false for unknown solved-check targets', () => {
    expect(isTwoByTwoFaceSolved('', { target: 'X', solution: '' })).toBe(false);
    expect(isTwoByTwoLayerSolved('', { target: 'X', solution: '' })).toBe(false);
  });
});
