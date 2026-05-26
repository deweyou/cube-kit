import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubekit/scramble-puzzle';
import {
  generateFourByFourNoInspectionScramble,
  generateFourByFourScramble,
} from './four-by-four.js';
import type { RandomSource } from '../random-source.js';

describe('4x4 WCA generators', () => {
  it('generates a threephase scramble longer than 30 moves', () => {
    const scramble = generateFourByFourScramble({
      random: createSeededRandom(0x444),
    });

    expect(scramble.split(/\s+/).length).toBeGreaterThan(30);
  }, 60_000);

  it('matches a deterministic threephase regression fixture', () => {
    const scramble = generateFourByFourScramble({
      random: createSeededRandom(0x444),
    });

    expect(scramble).toBe(FOUR_BY_FOUR_SEED_444);
  }, 60_000);

  it('generates parseable 444 scrambles', () => {
    const cube = createCubeDefinition(4, ['444']);
    const scramble = generateFourByFourScramble({
      random: createSeededRandom(0x444_444),
    });

    expect(() => cube.parseAlgorithm(scramble)).not.toThrow();
  }, 60_000);

  it('generates parseable 444bld no-inspection scrambles', () => {
    const cube = createCubeDefinition(4, ['444bld']);
    const scramble = generateFourByFourNoInspectionScramble({
      random: createSeededRandom(0x444_b1d),
    });

    expect(() => cube.parseAlgorithm(scramble)).not.toThrow();
  }, 60_000);

  it('is deterministic for deterministic random sources', () => {
    const first = generateFourByFourNoInspectionScramble({
      random: createSeededRandom(0x5eed_444),
    });
    const second = generateFourByFourNoInspectionScramble({
      random: createSeededRandom(0x5eed_444),
    });

    expect(second).toBe(first);
    expect(first).toBe(FOUR_BY_FOUR_BLD_SEED_5EED_444);
  }, 60_000);

  it('rejects random sources that return out-of-range orientation indexes', () => {
    expect(() =>
      generateFourByFourNoInspectionScramble({
        random: {
          nextInt(maxExclusive) {
            return maxExclusive;
          },
        },
      }),
    ).toThrow('@cubekit/scramble-core: random source returned');
  }, 60_000);
});

const createSeededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

      return state % maxExclusive;
    },
  };
};

const FOUR_BY_FOUR_SEED_444 = [
  'R',
  "F'",
  "D'",
  'B',
  'U',
  'F2',
  "L'",
  'R',
  "B'",
  'D',
  'U2',
  'B2',
  "L'",
  'U2',
  'R',
  'U2',
  'F2',
  'L2',
  'U2',
  'F2',
  'L2',
  'Uw2',
  'Fw2',
  "R'",
  'U2',
  "F'",
  'D2',
  'B',
  'Rw2',
  'R2',
  'B',
  'Uw2',
  "R'",
  'B2',
  "Uw'",
  'R',
  "L'",
  'D',
  'F',
  "Rw'",
  'F2',
  "Rw'",
  "U'",
  'Rw2',
  'Fw',
  'U2',
].join(' ');

const FOUR_BY_FOUR_BLD_SEED_5EED_444 = [
  "R'",
  'B2',
  'L',
  'B2',
  'R2',
  'F2',
  'D2',
  'F2',
  "R'",
  'U2',
  'L',
  "D'",
  'L',
  'R',
  "U'",
  "L'",
  'U',
  "F'",
  'L2',
  'R',
  "D'",
  'Fw2',
  'Rw2',
  'Uw2',
  "D'",
  "L'",
  'D2',
  'U2',
  "R'",
  'Uw2',
  'D',
  "L'",
  'F2',
  'Fw',
  "D'",
  'Rw2',
  'D2',
  'B2',
  'Rw',
  'D',
  'L',
  'F',
  "R'",
  'Uw',
  'L2',
  'z',
  "y'",
].join(' ');
