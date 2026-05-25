import { describe, expect, it } from 'vitest';
import { parsePyraminxAlgorithm } from '@cubekit/scramble-puzzle';
import { generatePyraminxScramble } from './pyraminx.js';
import { PyraminxSolver, type PyraminxSolverState } from '../solvers/pyraminx-solver.js';
import type { RandomSource } from '../random-source.js';

const zeroRandom: RandomSource = { nextInt: () => 0 };
const UNREACHABLE_EDGE_PERM = 1;

describe('generatePyraminxScramble', () => {
  it('generates a parseable scramble with at least 11 moves', () => {
    const random = createSequenceRandom({
      720: [42],
      32: [1],
      81: [1, 0],
    });
    const scramble = generatePyraminxScramble({ random });

    expect(scramble.split(/\s+/).length).toBeGreaterThanOrEqual(11);
    expect(() => parsePyraminxAlgorithm(scramble)).not.toThrow();
  });

  it('rejects a solved first state before accepting a later WCA-distance state', () => {
    const calls: number[] = [];
    const random = createSequenceRandom(
      {
        720: [0, 42],
        32: [0, 1],
        81: [0, 0, 1, 0],
      },
      calls,
    );

    const scramble = generatePyraminxScramble({ random });

    expect(calls.filter((maxExclusive) => maxExclusive === 720)).toHaveLength(2);
    expect(scramble.split(/\s+/).length).toBeGreaterThanOrEqual(11);
    expect(() => parsePyraminxAlgorithm(scramble)).not.toThrow();
  });

  it('throws clearly when no sampled state reaches WCA minimum distance', () => {
    expect(() => generatePyraminxScramble({ random: zeroRandom })).toThrow(
      '@cubekit/scramble-core: could not generate a Pyraminx WCA scramble after 100 attempts',
    );
  });

  it('draws TNoodle coordinates in order after finding reachable edge parity', () => {
    const calls: number[] = [];
    const random: RandomSource = {
      nextInt(maxExclusive) {
        calls.push(maxExclusive);
        return 0;
      },
    };

    new PyraminxSolver().randomState(random);

    expect(calls).toEqual([720, 32, 81, 81]);
  });

  it('throws clearly when edge parity sampling never reaches a reachable permutation', () => {
    const random = createUnreachableEdgePermRandom();

    expect(() => new PyraminxSolver().randomState(random)).toThrow(
      '@cubekit/scramble-core: could not sample a reachable Pyraminx edge permutation after 100 attempts',
    );
  });
});

describe('PyraminxSolver', () => {
  it('returns an empty solve for the solved state with no tips', () => {
    expect(new PyraminxSolver().solveIn(createState(), 0, true, zeroRandom)).toBe('');
  });

  it('counts tips when solving with includingTips enabled', () => {
    expect(new PyraminxSolver().solveIn(createState({ tips: 27 }), 0, true, zeroRandom)).toBeNull();
    expect(new PyraminxSolver().solveIn(createState({ tips: 27 }), 1, true, zeroRandom)).toBe("u'");
  });

  it('appends only unsolved tips after exact main-move generation', () => {
    const scramble = new PyraminxSolver().generateExactly(
      createState({ tips: 78 }),
      11,
      false,
      zeroRandom,
    );

    expect(scramble.split(/\s+/)).toHaveLength(14);
    expect(scramble.endsWith("u' l' r'")).toBe(true);
  });

  it.each([
    ['edgePerm', createState({ edgePerm: 720 })],
    ['edgeOrient', createState({ edgeOrient: 32 })],
    ['cornerOrient', createState({ cornerOrient: 81 })],
    ['tips', createState({ tips: 81 })],
  ] as const)('rejects out-of-range %s coordinates', (_, state) => {
    expect(() => new PyraminxSolver().solveIn(state, 11, true, zeroRandom)).toThrow(RangeError);
  });

  it.each([-1, 21] as const)('rejects invalid solve length %s', (length) => {
    expect(() => new PyraminxSolver().solveIn(createState(), length, true, zeroRandom)).toThrow(
      RangeError,
    );
  });

  it('rejects invalid random source coordinates', () => {
    const random: RandomSource = { nextInt: (maxExclusive) => maxExclusive };

    expect(() => new PyraminxSolver().randomState(random)).toThrow(RangeError);
  });
});

const createState = (overrides: Partial<PyraminxSolverState> = {}): PyraminxSolverState => ({
  edgePerm: 0,
  edgeOrient: 0,
  cornerOrient: 0,
  tips: 0,
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

const createUnreachableEdgePermRandom = (): RandomSource => {
  let edgePermCalls = 0;

  return {
    nextInt(maxExclusive) {
      if (maxExclusive !== 720) return 0;

      edgePermCalls += 1;
      if (edgePermCalls > 101) {
        throw new Error('test guard: unbounded Pyraminx edge parity sampling');
      }

      return UNREACHABLE_EDGE_PERM;
    },
  };
};
