import { describe, expect, it } from 'vitest';
import { MegaminxLsllSolver, type MegaminxLsllState } from './megaminx-lsll-solver.js';

const solvedState = (): MegaminxLsllState => ({
  edgePermutation: [0, 1, 2, 3, 4, 5],
  edgeOrientation: [0, 0, 0, 0, 0, 0],
  cornerPermutation: [0, 1, 2, 3, 4, 5],
  cornerOrientation: [0, 0, 0, 0, 0, 0],
});

describe('Megaminx LSLL coordinate solver', () => {
  it('keeps the solved state empty', () => {
    const solver = new MegaminxLsllSolver();
    expect(solver.scramble(solvedState())).toBe('');
    expect(solver.solve(solvedState())).toBe('');
  });

  it('round-trips arbitrary reachable states through a generated scramble', () => {
    const solver = new MegaminxLsllSolver();
    const target = solver.stateFromScramble("R U2 R' F' U' F U2' R U R'");
    const scramble = solver.scramble(target);

    expect(solver.stateFromScramble(scramble)).toEqual(target);
  }, 20_000);

  it('accepts direct legal coordinates and rejects invalid parity', () => {
    const solver = new MegaminxLsllSolver();
    const state: MegaminxLsllState = {
      edgePermutation: [1, 2, 0, 3, 4, 5],
      edgeOrientation: [1, 0, 1, 0, 0, 0],
      cornerPermutation: [2, 0, 1, 3, 4, 5],
      cornerOrientation: [1, 2, 0, 0, 0, 0],
    };

    expect(solver.stateFromScramble(solver.scramble(state))).toEqual(state);
    expect(() => solver.scramble({ ...state, edgePermutation: [1, 0, 2, 3, 4, 5] })).toThrow(
      'Megaminx LSLL permutations must be even',
    );
  }, 20_000);
});
