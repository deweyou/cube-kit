import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubekit/scramble-puzzle';
import { generateTwoByTwoScramble } from './two-by-two.js';
import { TwoByTwoSolver } from '../solvers/two-by-two-solver.js';
import type { RandomSource } from '../random-source.js';

const zeroRandom: RandomSource = { nextInt: () => 0 };

const TNoodleFixtureStates = [
  {
    state: { permutation: 0, orientation: 0 },
    solveIn11: '',
    generate11: "U2 R U' R' U' R' U' R U R U'",
  },
  {
    state: { permutation: 1, orientation: 1 },
    solveIn11: "U F' R2 F R' F U R2 F2 R",
    generate11: "R' F' R U' F' R2 U' F' R2 F U'",
  },
  {
    state: { permutation: 42, orientation: 42 },
    solveIn11: "U2 F' U R2 U R2 F' U' R U2",
    generate11: "R U' R' U2 R U' R2 F U' R2 F",
  },
] as const;

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
    expect(new TwoByTwoSolver().solveIn({ permutation: 0, orientation: 0 }, 0)).toBe('');
  });

  it('returns null when the requested solve depth is too short', () => {
    expect(new TwoByTwoSolver().solveIn({ permutation: 1, orientation: 1 }, 0)).toBeNull();
  });

  it('generates exactly the requested length', () => {
    const scramble = new TwoByTwoSolver().generateExactly({ permutation: 0, orientation: 0 }, 6);

    expect(scramble.split(/\s+/)).toHaveLength(6);
  });

  it.each(TNoodleFixtureStates)(
    'matches pinned TNoodle output for state $state',
    ({ state, solveIn11, generate11 }) => {
      const solver = new TwoByTwoSolver();

      expect(solver.solveIn(state, 11)).toBe(solveIn11);
      expect(solver.generateExactly(state, 11)).toBe(generate11);
    },
  );

  it.each([
    ['permutation', { permutation: 5040, orientation: 0 }],
    ['orientation', { permutation: 0, orientation: 729 }],
  ] as const)('rejects out-of-range %s coordinates', (_, state) => {
    expect(() => new TwoByTwoSolver().solveIn(state, 11)).toThrow(RangeError);
  });

  it.each([-1, 21] as const)('rejects invalid solve length %s', (length) => {
    expect(() => new TwoByTwoSolver().solveIn({ permutation: 0, orientation: 0 }, length)).toThrow(
      RangeError,
    );
  });

  it('rejects invalid random source coordinates', () => {
    const random: RandomSource = { nextInt: (maxExclusive) => maxExclusive };

    expect(() => new TwoByTwoSolver().randomState(random)).toThrow(RangeError);
  });
});
