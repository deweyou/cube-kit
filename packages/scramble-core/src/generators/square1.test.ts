import { describe, expect, it } from 'vitest';
import {
  applySquareOneMove,
  createSolvedSquareOneState,
  createSquareOneDefinition,
  type SquareOneState,
} from '@cubekit/scramble-puzzle';
import { generateSquareOneScramble } from './square1.js';
import { FullCube } from '../solvers/sq12phase/full-cube.js';
import { solveSquareOneStateIn } from '../solvers/sq12phase/search.js';
import type { RandomSource } from '../random-source.js';

const solvedFullCubeRandomSequence = [
  1037, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
] as const;

describe('generateSquareOneScramble', () => {
  it('generates a parseable scramble containing slash moves', () => {
    const scramble = generateSquareOneScramble({
      random: createSeededRandom(0x5eed),
    });
    const squareOne = createSquareOneDefinition();

    expect(scramble).toContain('/');
    expect(() => squareOne.parseAlgorithm(scramble)).not.toThrow();
  });

  it('applies the generated scramble to a non-solved Square-1 state', () => {
    const scramble = generateSquareOneScramble({
      random: createSeededRandom(0xc0ffee),
    });
    const squareOne = createSquareOneDefinition();
    const state = applyAlgorithm(scramble);

    expect(squareOne.isSolved(state)).toBe(false);
    expect(solveSquareOneStateIn(state, 10)).toBeNull();
  });

  it('throws clearly when sampled states never reach WCA minimum distance', () => {
    expect(() =>
      generateSquareOneScramble({
        random: createRepeatingSequenceRandom(solvedFullCubeRandomSequence),
      }),
    ).toThrow(
      '@cubekit/scramble-core: could not generate a Square-1 WCA scramble after 100 attempts',
    );
  });
});

describe('FullCube.randomCube', () => {
  it('draws shape, pieces, and middle layer using TNoodle bounds', () => {
    const calls: number[] = [];

    FullCube.randomCube(createSeededRandom(0x12345678, calls));

    expect(calls[0]).toBe(3678);
    expect(calls.at(-1)).toBe(2);
    expect(calls.slice(1, -1).sort((a, b) => b - a)).toEqual([
      8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1,
    ]);
  });
});

describe('solveSquareOneStateIn', () => {
  it('matches the TNoodle canonical merging fixture', () => {
    const state = applyAlgorithm('(1,0) (2,0) (0,-1) / /');

    expect(solveSquareOneStateIn(state, 1)).toBe('(-3,1)');
    expect(solveSquareOneStateIn(state, 2)).toBe('(-3,1)');
  });

  it.each(['(3,0) / (4,0)', '(3,0) / (1,0)'] as const)(
    'solves TNoodle slashability fixture %s within 3 moves',
    (algorithm) => {
      expect(solveSquareOneStateIn(applyAlgorithm(algorithm), 3)).not.toBeNull();
    },
  );
});

const applyAlgorithm = (algorithm: string): SquareOneState => {
  const squareOne = createSquareOneDefinition();

  return squareOne
    .parseAlgorithm(algorithm)
    .reduce((state, move) => applySquareOneMove(state, move), createSolvedSquareOneState());
};

const createSeededRandom = (seed: number, calls: number[] = []): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      calls.push(maxExclusive);
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

      return state % maxExclusive;
    },
  };
};

const createRepeatingSequenceRandom = (sequence: readonly number[]): RandomSource => {
  let index = 0;

  return {
    nextInt(maxExclusive) {
      const value = sequence[index % sequence.length];
      index += 1;

      if (value >= maxExclusive) {
        throw new RangeError(`test sequence value ${value} is outside max ${maxExclusive}`);
      }

      return value;
    },
  };
};
