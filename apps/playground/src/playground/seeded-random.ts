import type { RandomSource } from '@cubekit/scramble-core';

export const createSeededRandomSource = (seed: number): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError(`maxExclusive must be a positive integer, got ${maxExclusive}`);
      }

      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

      return Math.floor((state / 0x100000000) * maxExclusive);
    },
  };
};
