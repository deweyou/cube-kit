import { describe, expect, it } from 'vitest';

import { createSquareCoordinate, get8Comb, get8Perm, getSquareTables, set8Perm } from './square.js';

describe('Square-1 square coordinate helpers', () => {
  it('creates the solved square coordinate', () => {
    expect(createSquareCoordinate()).toEqual({
      edgePerm: 0,
      cornPerm: 0,
      topEdgeFirst: false,
      botEdgeFirst: false,
      ml: 0,
    });
  });

  it('round-trips 8-piece permutations through ordinal coordinates', () => {
    for (const permutation of [0, 1, 42, 40319]) {
      const pieces = Array.from({ length: 8 }, () => 0);

      set8Perm(pieces, permutation);

      expect(get8Perm(pieces)).toBe(permutation);
      expect([...pieces].sort((left, right) => left - right)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it('computes edge combination coordinates from the high pieces', () => {
    expect(get8Comb([0, 1, 2, 3, 4, 5, 6, 7])).toBe(0);
    expect(get8Comb([4, 5, 6, 7, 0, 1, 2, 3])).toBe(69);
  });

  it('builds and reuses the square pruning and move tables', () => {
    const tables = getSquareTables();

    expect(getSquareTables()).toBe(tables);
    expect(tables.squarePrun).toHaveLength(80640);
    expect(tables.twistMove).toHaveLength(40320);
    expect(tables.topMove[0]).not.toBe(0);
    expect(tables.bottomMove[0]).not.toBe(0);
  });
});
