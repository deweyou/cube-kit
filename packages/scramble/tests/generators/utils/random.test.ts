import { describe, expect, it } from 'vitest';
import { randomInt, shuffleArray, randomChoice } from '../../../src/generators/utils/random';

describe('randomInt', () => {
  it('always returns integer in [0, n)', () => {
    for (let i = 0; i < 1000; i++) {
      const n = 10;
      const v = randomInt(n);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(n);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('covers full range over many calls', () => {
    const n = 6;
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randomInt(n));
    expect(seen.size).toBe(n);
  });
});

describe('shuffleArray', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray([...arr]).length).toBe(arr.length);
  });

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray([...arr]);
    expect(shuffled.sort((a, b) => a - b)).toEqual([...arr].sort((a, b) => a - b));
  });

  it('produces different orders over 100 calls (statistical)', () => {
    const arr = [0, 1, 2, 3, 4];
    const results = new Set(Array.from({ length: 100 }, () => shuffleArray([...arr]).join(',')));
    expect(results.size).toBeGreaterThan(5);
  });
});

describe('randomChoice', () => {
  it('returns an element from the array', () => {
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(randomChoice(arr));
    }
  });

  it('covers all elements over many calls', () => {
    const arr = ['x', 'y', 'z'];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(randomChoice(arr));
    expect(seen.size).toBe(3);
  });
});
