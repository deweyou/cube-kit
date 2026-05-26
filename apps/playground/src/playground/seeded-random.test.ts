import { describe, expect, it } from 'vitest';
import { createSeededRandomSource } from './seeded-random';

describe('createSeededRandomSource', () => {
  it('returns the same sequence for the same seed', () => {
    const first = createSeededRandomSource(123);
    const second = createSeededRandomSource(123);

    expect([first.nextInt(10), first.nextInt(10), first.nextInt(10)]).toEqual([
      second.nextInt(10),
      second.nextInt(10),
      second.nextInt(10),
    ]);
  });

  it('keeps nextInt inside the exclusive upper bound', () => {
    const random = createSeededRandomSource(7);

    for (let index = 0; index < 100; index += 1) {
      const value = random.nextInt(3);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(3);
    }
  });
});
