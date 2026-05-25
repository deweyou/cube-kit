import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubekit/scramble-puzzle';
import { generateTwoByTwoScramble } from './two-by-two.js';
import { TwoByTwoSolver } from '../solvers/two-by-two-solver.js';
import type { RandomSource } from '../random-source.js';

const zeroRandom: RandomSource = { nextInt: () => 0 };

describe('generateTwoByTwoScramble', () => {
  it('generates an exact 11-move parseable scramble', () => {
    const scramble = generateTwoByTwoScramble({ random: zeroRandom });
    expect(scramble.split(/\s+/)).toHaveLength(11);
    const cube = createCubeDefinition(2, ['222']);
    expect(() => cube.parseAlgorithm(scramble)).not.toThrow();
  });

  it('draws permutation then orientation using TNoodle coordinate bounds', () => {
    const calls: number[] = [];
    const random: RandomSource = {
      nextInt(maxExclusive) {
        calls.push(maxExclusive);
        return 0;
      },
    };

    new TwoByTwoSolver().randomState(random);

    expect(calls).toEqual([5040, 729]);
  });
});

describe('TwoByTwoSolver', () => {
  it('returns an empty solve for the solved state', () => {
    expect(
      new TwoByTwoSolver().solveIn({ permutation: 0, orientation: 0 }, 0),
    ).toBe('');
  });

  it('returns null when the requested solve depth is too short', () => {
    expect(
      new TwoByTwoSolver().solveIn({ permutation: 1, orientation: 1 }, 0),
    ).toBeNull();
  });

  it('generates exactly the requested length', () => {
    const scramble = new TwoByTwoSolver().generateExactly(
      { permutation: 0, orientation: 0 },
      6,
    );

    expect(scramble.split(/\s+/)).toHaveLength(6);
  });
});
