import { describe, expect, it } from 'vitest';
import {
  createPruningTable,
  flipToIndex,
  indexToCombination,
  indexToFlip,
  indexToPermutation,
  permutationToIndex,
} from './coordinate-utils.js';

describe('coordinate utilities', () => {
  it('round-trips indexed permutations', () => {
    const permutation = [2, 0, 3, 1];
    const index = permutationToIndex(permutation, 4, false);
    const next = indexToPermutation(index, 4, false);

    expect(next).toEqual(permutation);
  });

  it('round-trips zero-sum edge flips', () => {
    const flips = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const index = flipToIndex(flips, 12, true);

    expect(indexToFlip(index, 12, true)).toEqual(flips);
  });

  it('uses stable combination indexing order', () => {
    expect(indexToCombination(0, 2, 5)).toEqual([1, 1, 0, 0, 0]);
    expect(indexToCombination(9, 2, 5)).toEqual([0, 0, 0, 1, 1]);
  });

  it('builds pruning tables by repeated face turns', () => {
    const moveTable = [[1], [2], [0]] as const;

    expect(createPruningTable(3, [0], 2, moveTable, 1)).toEqual([0, 1, 2]);
  });
});
