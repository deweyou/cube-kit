import { describe, expect, it } from 'vitest';
import { calculateSolveStatistics } from './solve-statistics';
import type { SolveRecord } from './types';

const solve = (
  elapsedMs: number,
  index: number,
  penalty: SolveRecord['penalty'] = 'none',
): SolveRecord => ({
  id: String(index),
  sessionId: 'session',
  eventId: '333',
  scramble: 'R U',
  elapsedMs,
  penalty,
  createdAt: index,
});

describe('solve statistics', () => {
  it('counts valid solves and calculates best single with penalties applied', () => {
    const stats = calculateSolveStatistics([
      solve(1000, 4, 'dnf'),
      solve(1200, 3, '+2'),
      solve(900, 2),
      solve(1100, 1),
    ]);

    expect(stats.validCount).toBe(3);
    expect(stats.totalCount).toBe(4);
    expect(stats.bestMs).toBe(900);
    expect(stats.averageMs).toBeNull();
  });

  it('trims best and worst for session averages once there are at least five solves', () => {
    const stats = calculateSolveStatistics([
      solve(5000, 5, 'dnf'),
      solve(1100, 4),
      solve(1200, 3),
      solve(1300, 2),
      solve(900, 1),
    ]);

    expect(stats.averageMs).toBe(1200);
  });

  it('calculates current and best rolling averages', () => {
    const stats = calculateSolveStatistics([
      solve(1000, 6),
      solve(1100, 5),
      solve(1200, 4),
      solve(1300, 3),
      solve(1400, 2),
      solve(1500, 1),
    ]);

    expect(stats.rollingAverages).toEqual([
      { size: 3, currentMs: 1100, bestMs: 1100 },
      { size: 5, currentMs: 1200, bestMs: 1200 },
    ]);
  });

  it('keeps rolling averages as DNF when DNF remains after trimming', () => {
    const stats = calculateSolveStatistics([
      solve(1000, 5, 'dnf'),
      solve(1100, 4, 'dnf'),
      solve(1200, 3),
      solve(1300, 2),
      solve(1400, 1),
    ]);

    expect(stats.rollingAverages.find((average) => average.size === 5)).toEqual({
      size: 5,
      currentMs: null,
      bestMs: null,
    });
  });
});
