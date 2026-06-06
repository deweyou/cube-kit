import { describe, expect, it } from 'vitest';
import {
  SolverError,
  UnsupportedSolverMoveError,
  solveCross,
  solveEOLine,
  solveEOFC,
  solvePetrusS1,
  solvePuzzleAssist,
  solvePyraminxV,
  solveRouxS1,
  solveSquareOneShapeFaceTurnMetric,
  solveSquareOneShapeTwistMetric,
  solveThreeByThreeAssist,
  solveTwoByTwoFace,
  solveTwoByTwoLayer,
  solveXCross,
} from './index.js';

describe('@cubegin/solver public API', () => {
  it('exports the 3x3 auxiliary solver facade', () => {
    expect(typeof solveCross).toBe('function');
    expect(typeof solveXCross).toBe('function');
    expect(typeof solveEOLine).toBe('function');
    expect(typeof solveEOFC).toBe('function');
    expect(typeof solveRouxS1).toBe('function');
    expect(typeof solvePetrusS1).toBe('function');
    expect(typeof solveThreeByThreeAssist).toBe('function');
  });

  it('exports auxiliary solver facades for non-3x3 events', () => {
    expect(typeof solveTwoByTwoFace).toBe('function');
    expect(typeof solveTwoByTwoLayer).toBe('function');
    expect(typeof solveSquareOneShapeFaceTurnMetric).toBe('function');
    expect(typeof solveSquareOneShapeTwistMetric).toBe('function');
    expect(typeof solvePyraminxV).toBe('function');
    expect(typeof solvePuzzleAssist).toBe('function');
  });

  it('exports solver-specific errors', () => {
    const error = new UnsupportedSolverMoveError('Rw');

    expect(error).toBeInstanceOf(SolverError);
    expect(error.message).toContain('Rw');
  });
});
