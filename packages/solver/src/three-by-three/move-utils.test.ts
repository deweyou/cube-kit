import { describe, expect, it } from 'vitest';
import { UnsupportedSolverMoveError } from '../errors.js';
import { parseThreeByThreeSolverAlgorithm } from './move-utils.js';

describe('3x3 solver move utilities', () => {
  it('accepts face turns and rotations', () => {
    expect(parseThreeByThreeSolverAlgorithm("R U R' U2 x y' z")).toHaveLength(7);
  });

  it('rejects wide moves for the first solver scope', () => {
    expect(() => parseThreeByThreeSolverAlgorithm('Rw')).toThrow(UnsupportedSolverMoveError);
  });
});
