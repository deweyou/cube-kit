export interface RandomSource {
  nextInt(maxExclusive: number): number;
}

export const createMathRandomSource = (): RandomSource => ({
  nextInt(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
  },
});
