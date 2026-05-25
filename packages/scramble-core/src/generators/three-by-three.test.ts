import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubekit/scramble-puzzle';
import {
  generateMultiBlindScramble,
  generateThreeByThreeFewestMovesScramble,
  generateThreeByThreeNoInspectionScramble,
  generateThreeByThreeScramble,
} from './three-by-three.js';
import type { RandomSource } from '../random-source.js';
import { SearchWCA, INVERSE_SOLUTION } from '../solvers/min2phase/search-wca.js';
import { randomCube, randomState } from '../solvers/min2phase/tools.js';

describe('3x3 WCA generators', () => {
  it('generates a normal scramble within the WCA max length', () => {
    const scramble = generateThreeByThreeScramble({
      random: createSeededRandom(0x333),
    });

    expect(scramble.split(/\s+/).length).toBeLessThanOrEqual(21);
  });

  it('generates a no-inspection scramble with an orientation token', () => {
    const scramble = generateThreeByThreeNoInspectionScramble({
      random: createSeededRandom(0x333b1d),
    });

    expect(scramble).toMatch(/[xyz]|Rw|Fw|Uw/);
  });

  it(
    'does not collide between no-inspection scramble and orientation axes',
    () => {
      for (let seed = 0; seed < 40; seed += 1) {
        const scramble = generateThreeByThreeNoInspectionScramble({
          random: createSeededRandom(0x333b1d + seed),
        });
        const tokens = splitMoves(scramble);
        const orientationStart = tokens.findIndex((move) => move.includes('w'));
        const lastScrambleMove = tokens[orientationStart - 1];
        const firstOrientationMove = tokens[orientationStart];

        expect(
          hasSameAxis(lastScrambleMove, firstOrientationMove),
          scramble,
        ).toBe(false);
      }
    },
    10_000,
  );

  it('generates an FMC scramble with the TNoodle prefix', () => {
    const scramble = generateThreeByThreeFewestMovesScramble({
      random: createSeededRandom(0x333f),
    });

    expect(scramble.startsWith("R' U' F ")).toBe(true);
  });

  it(
    'does not collide between FMC padding and inner scramble axes',
    () => {
      for (let seed = 0; seed < 40; seed += 1) {
        const scramble = generateThreeByThreeFewestMovesScramble({
          random: createSeededRandom(0x333f + seed),
        });
        const tokens = splitMoves(scramble);
        const innerMoves = tokens.slice(3, -3);

        expect(hasSameAxis('F', innerMoves[0]), scramble).toBe(false);
        expect(hasSameAxis(innerMoves.at(-1), "R'"), scramble).toBe(false);
      }
    },
    10_000,
  );

  it('generates one no-inspection-style line per multi-blind cube', () => {
    const scramble = generateMultiBlindScramble({
      random: createSeededRandom(0x333_0003),
      cubeCount: 3,
    });

    expect(scramble.split('\n')).toHaveLength(3);
  });

  it.each([
    ['333', () => generateThreeByThreeScramble({ random: createSeededRandom(1) })],
    [
      '333bld',
      () =>
        generateThreeByThreeNoInspectionScramble({
          random: createSeededRandom(2),
        }),
    ],
    [
      '333fm',
      () =>
        generateThreeByThreeFewestMovesScramble({
          random: createSeededRandom(3),
        }),
    ],
  ] as const)('generates parseable %s scrambles', (eventId, generate) => {
    const cube = createCubeDefinition(3, [eventId]);
    const scramble = generate();

    expect(() => cube.parseAlgorithm(scramble)).not.toThrow();
    expect(() =>
      cube.applyAlgorithm(cube.createSolvedState(), scramble),
    ).not.toThrow();
  });

  it('is deterministic for deterministic random sources', () => {
    const first = generateThreeByThreeNoInspectionScramble({
      random: createSeededRandom(0x5eed),
    });
    const second = generateThreeByThreeNoInspectionScramble({
      random: createSeededRandom(0x5eed),
    });

    expect(second).toBe(first);
  });

  it('randomCube returns a real 54-facelet cube definition', () => {
    const facelets = randomCube(createSeededRandom(0x333_54));

    expect(facelets).toHaveLength(54);
    expect(facelets).not.toContain(':');
    expect(countFacelets(facelets)).toEqual({
      B: 9,
      D: 9,
      F: 9,
      L: 9,
      R: 9,
      U: 9,
    });
  });

  it('randomCube resolves repeated random edge-parity mismatches without retrying forever', () => {
    const facelets = randomCube(createParityMismatchRandom());
    const solution = new SearchWCA().solution(
      facelets,
      21,
      100_000,
      0,
      INVERSE_SOLUTION,
    );

    expect(facelets).toHaveLength(54);
    expect(solution).not.toMatch(/^Error/);
    expect(countFacelets(facelets)).toEqual({
      B: 9,
      D: 9,
      F: 9,
      L: 9,
      R: 9,
      U: 9,
    });
  });

  it('randomState resolves repeated random corner-parity mismatches without retrying forever', () => {
    const facelets = randomState(
      null,
      null,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      null,
      createCornerParityMismatchRandom(),
    );
    const solution = new SearchWCA().solution(
      facelets,
      21,
      100_000,
      0,
      INVERSE_SOLUTION,
    );

    expect(facelets).toHaveLength(54);
    expect(solution).not.toMatch(/^Error/);
    expect(countFacelets(facelets)).toEqual({
      B: 9,
      D: 9,
      F: 9,
      L: 9,
      R: 9,
      U: 9,
    });
  });

  it('SearchWCA solves a real randomCube facelet string', () => {
    const facelets = randomCube(createSeededRandom(0x333_2));
    const solution = new SearchWCA().solution(
      facelets,
      21,
      100_000,
      0,
      INVERSE_SOLUTION,
    );

    expect(solution).not.toMatch(/^Error/);
    expect(() =>
      createCubeDefinition(3, ['333']).parseAlgorithm(solution.trim()),
    ).not.toThrow();
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid multi-blind cubeCount %s', (cubeCount) => {
    expect(() =>
      generateMultiBlindScramble({
        random: createSeededRandom(0x333),
        cubeCount,
      }),
    ).toThrow(
      '@cubekit/scramble-core: multi-blind cubeCount must be a positive safe integer',
    );
  });
});

const countFacelets = (facelets: string): Record<string, number> => {
  const counts: Record<string, number> = {};

  for (const facelet of facelets) {
    counts[facelet] = (counts[facelet] ?? 0) + 1;
  }

  return counts;
};

const splitMoves = (scramble: string): string[] => scramble.trim().split(/\s+/);

const hasSameAxis = (
  firstMove: string | undefined,
  secondMove: string | undefined,
): boolean => {
  if (firstMove === undefined || secondMove === undefined) return false;

  return axisForMove(firstMove) === axisForMove(secondMove);
};

const axisForMove = (move: string): number | undefined => {
  switch (move[0]) {
    case 'U':
    case 'D':
      return 0;
    case 'R':
    case 'L':
      return 1;
    case 'F':
    case 'B':
      return 2;
    default:
      return undefined;
  }
};

const createSeededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

      return state % maxExclusive;
    },
  };
};

const createParityMismatchRandom = (): RandomSource => {
  let edgePermutationDraws = 0;

  return {
    nextInt(maxExclusive) {
      if (maxExclusive === 479_001_600) {
        edgePermutationDraws += 1;
        if (edgePermutationDraws > 4) {
          throw new Error('edge parity retry loop exceeded');
        }

        return 1;
      }

      return 0;
    },
  };
};

const createCornerParityMismatchRandom = (): RandomSource => {
  let cornerPermutationDraws = 0;

  return {
    nextInt(maxExclusive) {
      if (maxExclusive === 40_320) {
        cornerPermutationDraws += 1;
        if (cornerPermutationDraws > 4) {
          throw new Error('corner parity retry loop exceeded');
        }

        return 1;
      }

      return 0;
    },
  };
};
