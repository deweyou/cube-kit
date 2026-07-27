import { createSkewbDefinition, parseSkewbAlgorithm } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { createDefaultScrambleGenerator } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import { doesSkewbTrainingStateMatch, getSkewbTrainingCaseDefinitions } from './training-skewb.js';

const createSeededRandom = (seed = 0x5ceb): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

const hasCompleteFace = (scramble: string): boolean => {
  const skewb = createSkewbDefinition();
  const state = skewb.applyAlgorithm(skewb.createSolvedState(), scramble);

  return state.image.some((face) => face.every((sticker) => sticker === face[0]));
};

const SKEWB_FACE_BY_COLOR = {
  white: 0,
  blue: 1,
  red: 2,
  yellow: 3,
  green: 4,
  orange: 5,
} as const;

const hasNoCenterBar = (scramble: string): boolean => {
  const skewb = createSkewbDefinition();
  const state = skewb.applyAlgorithm(skewb.createSolvedState(), scramble);

  return state.image.every((face) =>
    face.slice(1).every((cornerSticker) => cornerSticker !== face[0]),
  );
};

describe('Skewb training scrambles', () => {
  it.each(['skewb.l2l', 'skewb.no_bar'] as const)(
    'generates deterministic constrained %s states',
    async (scrambleTypeId) => {
      const first = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);
      const second = await createDefaultScrambleGenerator({
        random: createSeededRandom(),
      }).generateType(scrambleTypeId);

      expect(first).toEqual(second);
      expect(parseSkewbAlgorithm(first.scramble)).toHaveLength(11);
      expect(doesSkewbTrainingStateMatch(scrambleTypeId, first.scramble)).toBe(true);
    },
  );

  it('exposes and honors the complete structured L2L case set', async () => {
    const cases = getSkewbTrainingCaseDefinitions('skewb.l2l');
    const selectedCase = cases[42];
    expect(cases).toHaveLength(540);

    const generated = await createDefaultScrambleGenerator({
      random: createSeededRandom(),
    }).generateType('skewb.l2l', { enabledCaseIds: [selectedCase.id] });

    expect(generated.caseId).toBe(selectedCase.id);
    expect(doesSkewbTrainingStateMatch('skewb.l2l', generated.scramble)).toBe(true);
    expect(hasCompleteFace(generated.scramble)).toBe(true);
  });

  it('preserves a complete face across independently rendered L2L samples', async () => {
    const generator = createDefaultScrambleGenerator({
      random: createSeededRandom(42),
    });

    for (let sample = 0; sample < 30; sample += 1) {
      const generated = await generator.generateType('skewb.l2l');
      expect(hasCompleteFace(generated.scramble)).toBe(true);
    }
  });

  it.each([
    ['white', 'green'],
    ['yellow', 'green'],
    ['red', 'white'],
    ['orange', 'white'],
    ['green', 'white'],
    ['blue', 'white'],
  ] as const)(
    'builds L2L on the requested %s bottom with %s in front',
    async (bottomColor, frontColor) => {
      const generator = createDefaultScrambleGenerator({
        random: createSeededRandom(42),
      });

      for (let sample = 0; sample < 8; sample += 1) {
        const generated = await generator.generateType('skewb.l2l', {
          orientation: { bottomColor, frontColor },
        });
        const skewb = createSkewbDefinition();
        const state = skewb.applyAlgorithm(skewb.createSolvedState(), generated.scramble);
        const targetFace = SKEWB_FACE_BY_COLOR[bottomColor];

        expect(generated.orientation).toEqual({ bottomColor, frontColor });
        expect(state.image[targetFace]?.every((sticker) => sticker === targetFace)).toBe(true);
        expect(doesSkewbTrainingStateMatch('skewb.l2l', generated.scramble)).toBe(true);
      }
    },
    30_000,
  );

  it('keeps no-bar samples center-to-corner bar free in the sticker model', async () => {
    const generator = createDefaultScrambleGenerator({
      random: createSeededRandom(42),
    });

    for (let sample = 0; sample < 30; sample += 1) {
      const generated = await generator.generateType('skewb.no_bar');
      expect(hasNoCenterBar(generated.scramble)).toBe(true);
    }
  });
});
