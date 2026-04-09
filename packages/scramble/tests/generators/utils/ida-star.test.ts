import { describe, expect, it } from 'vitest';
import { idaStar } from '../../../src/generators/utils/ida-star';

// Toy puzzle: state is a number, goal is 0, moves are [-1, +1, +3]
const MOVES = [-1, 1, 3] as const;

function expand(state: number): Array<{ state: number; move: number; cost: number }> {
  return MOVES.map((m) => ({ state: state + m, move: m, cost: 1 }));
}

describe('idaStar', () => {
  it('returns empty path when already at goal', () => {
    const result = idaStar(0, (s) => s === 0, expand, Math.abs, 10);
    expect(result).toEqual([]);
  });

  it('finds a one-step path', () => {
    const result = idaStar(1, (s) => s === 0, expand, Math.abs, 5);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    // applying path from 1 should reach 0
    let state = 1;
    for (const move of result!) state += move;
    expect(state).toBe(0);
  });

  it('finds a multi-step path', () => {
    const result = idaStar(5, (s) => s === 0, expand, Math.abs, 10);
    expect(result).not.toBeNull();
    let state = 5;
    for (const move of result!) state += move;
    expect(state).toBe(0);
  });

  it('returns null when maxDepth is insufficient', () => {
    const result = idaStar(100, (s) => s === 0, expand, Math.abs, 5);
    expect(result).toBeNull();
  });

  it('path is valid (applying moves reaches goal)', () => {
    const start = 7;
    const result = idaStar(start, (s) => s === 0, expand, Math.abs, 20);
    expect(result).not.toBeNull();
    let state = start;
    for (const move of result!) state += move;
    expect(state).toBe(0);
  });
});
