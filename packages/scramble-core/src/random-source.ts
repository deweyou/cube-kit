const ERROR_PREFIX = '@cubegin/scramble-core';

export interface RandomSource {
  nextInt(maxExclusive: number): number;
}

export const createMathRandomSource = (): RandomSource => ({
  nextInt(maxExclusive) {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`${ERROR_PREFIX}: random maxExclusive must be a positive safe integer`);
    }

    return Math.floor(Math.random() * maxExclusive);
  },
});
