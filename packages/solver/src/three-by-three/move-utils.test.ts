import { describe, expect, it } from 'vitest';
import { UnsupportedSolverMoveError } from '../errors.js';
import { parseThreeByThreeSolverAlgorithm } from './move-utils.js';

describe('3x3 solver move utilities', () => {
  it('accepts face turns', () => {
    expect(parseThreeByThreeSolverAlgorithm("R U R' U2")).toHaveLength(4);
  });

  it('rejects rotations and wide moves for the first solver scope', () => {
    expect(() => parseThreeByThreeSolverAlgorithm('x')).toThrow(UnsupportedSolverMoveError);
    expect(() => parseThreeByThreeSolverAlgorithm('Rw')).toThrow(UnsupportedSolverMoveError);
  });
});
