import { describe, expect, it } from 'vitest';
import {
  Cnk,
  rankPerm,
  unrankPerm,
  rankOrientation,
  unrankOrientation,
} from '../../../src/generators/utils/coords';

describe('Cnk', () => {
  it('Cnk(0,0) = 1', () => expect(Cnk(0, 0)).toBe(1));
  it('Cnk(n,0) = 1', () => expect(Cnk(7, 0)).toBe(1));
  it('Cnk(n,n) = 1', () => expect(Cnk(5, 5)).toBe(1));
  it('Cnk(12,4) = 495', () => expect(Cnk(12, 4)).toBe(495));
  it('Cnk(8,4) = 70', () => expect(Cnk(8, 4)).toBe(70));
  it('Cnk(4,2) = 6', () => expect(Cnk(4, 2)).toBe(6));
});

describe('rankPerm / unrankPerm', () => {
  it('identity permutation ranks to 0', () => {
    expect(rankPerm([0, 1, 2, 3])).toBe(0);
  });

  it('reversed permutation ranks to (n!-1)', () => {
    expect(rankPerm([3, 2, 1, 0])).toBe(23);
  });

  it('unrankPerm(0, 4) returns identity', () => {
    expect(unrankPerm(0, 4)).toEqual([0, 1, 2, 3]);
  });

  it('unrankPerm(23, 4) returns reversed', () => {
    expect(unrankPerm(23, 4)).toEqual([3, 2, 1, 0]);
  });

  it('round-trips for n=4', () => {
    for (let i = 0; i < 24; i++) {
      expect(rankPerm(unrankPerm(i, 4))).toBe(i);
    }
  });

  it('round-trips for n=8 (spot check)', () => {
    const perm = [3, 0, 7, 2, 5, 1, 6, 4];
    expect(unrankPerm(rankPerm(perm), 8)).toEqual(perm);
  });
});

describe('rankOrientation / unrankOrientation', () => {
  it('all-zero orientation ranks to 0', () => {
    expect(rankOrientation([0, 0, 0, 0, 0, 0, 0], 3)).toBe(0);
  });

  it('round-trips for base-3, length-8 (7 free COs, 1 derived)', () => {
    for (let i = 0; i < 2187; i++) {
      expect(rankOrientation(unrankOrientation(i, 8, 3), 3)).toBe(i);
    }
  });

  it('round-trips for base-2, length-12 (11 free EOs, 1 derived)', () => {
    for (let i = 0; i < 2048; i++) {
      expect(rankOrientation(unrankOrientation(i, 12, 2), 2)).toBe(i);
    }
  });

  it('last element is derived (sum mod base = 0)', () => {
    // unrankOrientation should set last element so total sum % base = 0
    for (let i = 0; i < 100; i++) {
      const o = unrankOrientation(i, 8, 3); // 7 free corners + 1 derived
      expect(o.reduce((a, b) => a + b, 0) % 3).toBe(0);
    }
  });
});
