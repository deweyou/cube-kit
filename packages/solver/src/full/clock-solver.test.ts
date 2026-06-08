import { describe, expect, it } from 'vitest';
import { parseClockAlgorithm } from '@cubegin/scramble-puzzle';
import { ClockSolver } from '../index.js';
import type { RandomSource } from '../random-source.js';

const cyclingRandom = (): RandomSource => {
  let value = 0;

  return {
    nextInt(maxExclusive) {
      const next = value % maxExclusive;
      value += 1;

      return next;
    },
  };
};

describe('ClockSolver', () => {
  it('solves the solved 14-dial state with no turns', () => {
    const solution = new ClockSolver().solveState(Array<number>(14).fill(0));

    expect(solution.nonZeroTurnCount).toBe(0);
    expect(solution.turns.every((turn) => turn === 0)).toBe(true);
  });

  it('formats a random-state solution as parseable Clock notation', () => {
    const solver = new ClockSolver();
    const state = solver.randomState(cyclingRandom());
    const scramble = solver.solution(state);

    expect(parseClockAlgorithm(scramble).length).toBeGreaterThan(0);
    expect(scramble).toContain('y2');
  });

  it('rejects invalid state and random values', () => {
    const solver = new ClockSolver();

    expect(() => solver.solveState([0])).toThrow(RangeError);
    expect(() => solver.solveState([...Array<number>(13).fill(0), 12])).toThrow(RangeError);
    expect(() => solver.randomState({ nextInt: () => 12 })).toThrow(RangeError);
  });
});
