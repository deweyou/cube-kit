const ERROR_PREFIX = '@cubegin/solver';

export interface RandomSource {
  readonly nextInt: (maxExclusive: number) => number;
}

export const validateRandomIndex = (value: number, maxExclusive: number): number => {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`${ERROR_PREFIX}: random maxExclusive must be a positive safe integer`);
  }

  if (!Number.isSafeInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError(
      `${ERROR_PREFIX}: random source returned ${value} for max ${maxExclusive}`,
    );
  }

  return value;
};
