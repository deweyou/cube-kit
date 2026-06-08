import { describe, expect, it } from 'vitest';
import {
  SolverError,
  ClockSolver,
  FourByFourThreephaseSearch,
  UnsupportedSolverMoveError,
  PyraminxSolver,
  SearchWCA,
  SkewbSolver,
  SquareOneFullCube,
  SquareOneSearch,
  TwoByTwoSolver,
  randomCube,
  solveCross,
  solveEOLine,
  solveEOFC,
  solvePetrusS1,
  solvePuzzleAssist,
  solvePuzzleFull,
  solvePyraminxV,
  solveSkewbFace,
  solveSquareOneStateIn,
  solveRouxS1,
  solveSquareOneShapeFaceTurnMetric,
  solveSquareOneShapeTwistMetric,
  solveThreeByThreeAssist,
  solveThreeByThreeGeneral,
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
    expect(typeof solveThreeByThreeGeneral).toBe('function');
    expect(typeof solveThreeByThreeAssist).toBe('function');
  });

  it('exports auxiliary solver facades for non-3x3 events', () => {
    expect(typeof solveTwoByTwoFace).toBe('function');
    expect(typeof solveTwoByTwoLayer).toBe('function');
    expect(typeof solveSquareOneShapeFaceTurnMetric).toBe('function');
    expect(typeof solveSquareOneShapeTwistMetric).toBe('function');
    expect(typeof solvePyraminxV).toBe('function');
    expect(typeof solveSkewbFace).toBe('function');
    expect(typeof solvePuzzleAssist).toBe('function');
  });

  it('exports full solver primitives migrated from scramble-core', () => {
    expect(typeof SearchWCA).toBe('function');
    expect(typeof ClockSolver).toBe('function');
    expect(typeof randomCube).toBe('function');
    expect(typeof TwoByTwoSolver).toBe('function');
    expect(typeof PyraminxSolver).toBe('function');
    expect(typeof SkewbSolver).toBe('function');
    expect(typeof SquareOneFullCube.randomCube).toBe('function');
    expect(typeof SquareOneSearch).toBe('function');
    expect(typeof solveSquareOneStateIn).toBe('function');
    expect(typeof FourByFourThreephaseSearch).toBe('function');
  });

  it('exports the full solver facade', () => {
    expect(typeof solvePuzzleFull).toBe('function');
  });

  it('exports solver-specific errors', () => {
    const error = new UnsupportedSolverMoveError('Rw');

    expect(error).toBeInstanceOf(SolverError);
    expect(error.message).toContain('Rw');
  });
});
