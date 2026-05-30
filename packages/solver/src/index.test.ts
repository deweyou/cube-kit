import { describe, expect, it } from 'vitest';
import {
  SolverError,
  UnsupportedSolverMoveError,
  solveCross,
  solveEOLine,
  solveEOFC,
  solvePetrusS1,
  solveRouxS1,
  solveThreeByThreeAssist,
  solveXCross,
} from './index.js';

describe('@cubekit/solver public API', () => {
  it('exports the 3x3 auxiliary solver facade', () => {
    expect(typeof solveCross).toBe('function');
    expect(typeof solveXCross).toBe('function');
    expect(typeof solveEOLine).toBe('function');
    expect(typeof solveEOFC).toBe('function');
    expect(typeof solveRouxS1).toBe('function');
    expect(typeof solvePetrusS1).toBe('function');
    expect(typeof solveThreeByThreeAssist).toBe('function');
  });

  it('exports solver-specific errors', () => {
    const error = new UnsupportedSolverMoveError('Rw');

    expect(error).toBeInstanceOf(SolverError);
    expect(error.message).toContain('Rw');
  });
});
