import { describe, expect, it } from 'vitest';
import {
  createThreeByThreeTrainingState,
  getThreeByThreeCubieState,
  getThreeByThreeCubieStateFromScramble,
  scrambleThreeByThreeState,
} from './three-by-three-state.js';

const seededRandom = () => {
  let state = 0x333;

  return {
    nextInt(maxExclusive: number) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state % maxExclusive;
    },
  };
};

describe('3x3 training state facade', () => {
  it('constructs a valid constrained state without exposing min2phase internals', () => {
    const state = createThreeByThreeTrainingState(
      {
        cornerPermutation: 'solved',
        cornerOrientation: 'solved',
        edgePermutation: 'random',
        edgeOrientation: 'random',
      },
      seededRandom(),
    );
    const cubies = getThreeByThreeCubieState(state);

    expect(cubies.cornerPermutation).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(cubies.cornerOrientation).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(cubies.edgePermutation).toHaveLength(12);
    expect(cubies.edgeOrientation).toHaveLength(12);
  });

  it('generates a deterministic scramble for a constrained facelet state', () => {
    const firstState = createThreeByThreeTrainingState(
      {
        cornerPermutation: 'solved',
        cornerOrientation: 'solved',
        edgePermutation: 'random',
        edgeOrientation: 'random',
      },
      seededRandom(),
    );
    const secondState = createThreeByThreeTrainingState(
      {
        cornerPermutation: 'solved',
        cornerOrientation: 'solved',
        edgePermutation: 'random',
        edgeOrientation: 'random',
      },
      seededRandom(),
    );

    expect(secondState).toBe(firstState);

    const scramble = scrambleThreeByThreeState(firstState);
    expect(getThreeByThreeCubieStateFromScramble(scramble)).toEqual(
      getThreeByThreeCubieState(firstState),
    );
  });

  it('rejects malformed constraint lengths', () => {
    expect(() =>
      createThreeByThreeTrainingState(
        {
          edgePermutation: [0, 1],
        },
        seededRandom(),
      ),
    ).toThrow('@cubegin/solver: edgePermutation must contain 12 entries');
  });
});
