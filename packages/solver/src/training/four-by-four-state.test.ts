import { describe, expect, it } from 'vitest';
import {
  createSolvedFourByFourState,
  getFourByFourStateFromScramble,
  scrambleFourByFourState,
} from './four-by-four-state.js';

describe('4x4 training state facade', () => {
  it('keeps internal threephase classes behind a stable state DTO', () => {
    const solved = createSolvedFourByFourState();

    expect(solved.edgePermutation).toHaveLength(24);
    expect(solved.centerColors).toHaveLength(24);
    expect(solved.cornerPermutation).toHaveLength(8);
    expect(solved.cornerOrientation).toHaveLength(8);
  });

  it('scrambles a concrete partial state through threephase', () => {
    const target = getFourByFourStateFromScramble('Rw U');
    const scramble = scrambleFourByFourState(target);

    expect(getFourByFourStateFromScramble(scramble)).toEqual(target);
  }, 30_000);
});
