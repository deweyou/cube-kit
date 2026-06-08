import { describe, expect, it } from 'vitest';
import { parseSkewbAlgorithm } from '@cubegin/scramble-puzzle';
import { generateSkewbScramble } from './skewb.js';
import { SkewbSolver, type SkewbSolverState } from '@cubegin/solver';
import type { RandomSource } from '../random-source.js';

const zeroRandom: RandomSource = { nextInt: () => 0 };

describe('generateSkewbScramble', () => {
  it('generates an exact 11-move parseable scramble', () => {
    const random = createSequenceRandom({
      4320: [42],
      2187: [1],
      4: Array.from({ length: 200 }, () => 0),
    });

    const scramble = generateSkewbScramble({ random });

    expect(scramble.split(/\s+/)).toHaveLength(11);
    expect(() => parseSkewbAlgorithm(scramble)).not.toThrow();
  });

  it('rejects a solved first state before accepting a WCA-distance state', () => {
    const calls: number[] = [];
    const random = createSequenceRandom(
      {
        4320: [0, 42],
        2187: [0, 1],
        4: Array.from({ length: 200 }, () => 0),
      },
      calls,
    );

    const scramble = generateSkewbScramble({ random });

    expect(calls.filter((maxExclusive) => maxExclusive === 4320)).toHaveLength(2);
    expect(scramble.split(/\s+/)).toHaveLength(11);
  });

  it('throws clearly when no sampled state reaches WCA minimum distance', () => {
    expect(() => generateSkewbScramble({ random: zeroRandom })).toThrow(
      '@cubegin/scramble-core: could not generate a Skewb WCA scramble after 100 attempts',
    );
  });
});

describe('SkewbSolver', () => {
  it('returns an empty solve for the solved state', () => {
    expect(new SkewbSolver().solveIn(createState(), 0, zeroRandom)).toBe('');
  });

  it('returns null when the requested solve depth is too short', () => {
    expect(new SkewbSolver().solveIn(createState({ perm: 42, twst: 1 }), 0, zeroRandom)).toBeNull();
  });

  it('generates exactly the requested length', () => {
    const scramble = new SkewbSolver().generateExactly(
      createState({ perm: 42, twst: 1 }),
      11,
      zeroRandom,
    );

    expect(scramble.split(/\s+/)).toHaveLength(11);
  });

  it('draws TNoodle coordinates in order', () => {
    const calls: number[] = [];
    const random: RandomSource = {
      nextInt(maxExclusive) {
        calls.push(maxExclusive);
        return 0;
      },
    };

    new SkewbSolver().randomState(random);

    expect(calls).toEqual([4320, 2187]);
  });

  it('throws clearly when twist sampling never reaches a solvable state', () => {
    const random = createUnsolvableTwistRandom();

    expect(() => new SkewbSolver().randomState(random)).toThrow(
      '@cubegin/solver: could not sample a solvable Skewb twist after 100 attempts',
    );
  });

  it.each([
    ['perm', createState({ perm: 4320 })],
    ['twst', createState({ twst: 2187 })],
  ] as const)('rejects out-of-range %s coordinates', (_, state) => {
    expect(() => new SkewbSolver().solveIn(state, 11, zeroRandom)).toThrow(RangeError);
  });

  it.each([-1, 13] as const)('rejects invalid solve length %s', (length) => {
    expect(() => new SkewbSolver().solveIn(createState(), length, zeroRandom)).toThrow(RangeError);
  });

  it('rejects invalid random source coordinates', () => {
    const random: RandomSource = { nextInt: (maxExclusive) => maxExclusive };

    expect(() => new SkewbSolver().randomState(random)).toThrow(RangeError);
  });
});

const createState = (overrides: Partial<SkewbSolverState> = {}): SkewbSolverState => ({
  perm: 0,
  twst: 0,
  ...overrides,
});

const createSequenceRandom = (
  valuesByMaxExclusive: Record<number, number[]>,
  calls: number[] = [],
): RandomSource => ({
  nextInt(maxExclusive) {
    calls.push(maxExclusive);

    return valuesByMaxExclusive[maxExclusive]?.shift() ?? 0;
  },
});

const createUnsolvableTwistRandom = (): RandomSource => {
  let twistCalls = 0;

  return {
    nextInt(maxExclusive) {
      if (maxExclusive === 4320) return 0;

      twistCalls += 1;
      if (twistCalls > 101) {
        throw new Error('test guard: unbounded Skewb twist sampling');
      }

      return 1;
    },
  };
};
