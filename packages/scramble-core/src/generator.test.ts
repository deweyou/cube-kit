import { describe, expect, it } from 'vitest';
import { createScrambleGenerator } from './generator.js';
import type { RandomSource } from './random-source.js';

const deterministicRandom: RandomSource = {
  nextInt(maxExclusive) {
    return Math.max(0, maxExclusive - 1);
  },
};

describe('createScrambleGenerator', () => {
  it('throws for generators that are not registered', async () => {
    const generator = createScrambleGenerator({ random: deterministicRandom, generators: {} });

    await expect(generator.generate('333')).rejects.toThrow(
      "@cubekit/scramble-core: event '333' has no generator",
    );
  });
});
