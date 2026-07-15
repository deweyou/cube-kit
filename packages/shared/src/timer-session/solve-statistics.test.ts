import { describe, expect, it } from 'vitest';
import { calculateRollingAverageWindows, calculateSolveStatistics } from './solve-statistics';
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
  it('returns empty statistics for a session without solves', () => {
    const stats = calculateSolveStatistics([]);

    expect(stats).toMatchObject({
      averageMs: null,
      averageStandardDeviationMs: null,
      bestMs: null,
      rollingAverages: [],
      totalCount: 0,
      validCount: 0,
      validRatio: 0,
      worstMs: null,
    });
  });

  it('counts valid solves and calculates best single with penalties applied', () => {
    const stats = calculateSolveStatistics([
      solve(1000, 4, 'dnf'),
      solve(1200, 3, '+2'),
      solve(900, 2),
      solve(1100, 1),
    ]);

    expect(stats.validCount).toBe(3);
    expect(stats.totalCount).toBe(4);
    expect(stats.validRatio).toBe(0.75);
    expect(stats.bestMs).toBe(900);
    expect(stats.worstMs).toBe(3200);
    expect(stats.averageMs).toBe(1733);
    expect(stats.averageStandardDeviationMs).toBe(1040);
  });

  it('accepts multi-blind solve records with scramble arrays', () => {
    const stats = calculateSolveStatistics([
      {
        ...solve(3_000, 1),
        eventId: '333mbld',
        multiBlind: { attemptedCount: 3, solvedCount: 2 },
        scramble: ['cube 1', 'cube 2', 'cube 3'],
      },
    ]);

    expect(stats.validCount).toBe(1);
    expect(stats.bestMs).toBe(3_000);
    expect(stats.worstMs).toBe(3_000);
  });

  it('trims best and worst for session averages once there are at least five solves', () => {
    const stats = calculateSolveStatistics([
      solve(1400, 5),
      solve(1100, 4),
      solve(1200, 3),
      solve(1300, 2),
      solve(900, 1),
    ]);

    expect(stats.averageMs).toBe(1200);
    expect(stats.averageStandardDeviationMs).toBe(82);
  });

  it('marks the session average as DNF only when DNF solves exceed half the session', () => {
    const halfDnfStats = calculateSolveStatistics([
      solve(1000, 4, 'dnf'),
      solve(1100, 3, 'dnf'),
      solve(1200, 2),
      solve(1400, 1),
    ]);
    const overHalfDnfStats = calculateSolveStatistics([
      solve(1000, 5, 'dnf'),
      solve(1100, 4, 'dnf'),
      solve(1200, 3, 'dnf'),
      solve(1300, 2),
      solve(1400, 1),
    ]);

    expect(halfDnfStats.averageMs).toBe(1300);
    expect(halfDnfStats.averageStandardDeviationMs).toBe(100);
    expect(overHalfDnfStats.averageMs).toBeNull();
    expect(overHalfDnfStats.averageStandardDeviationMs).toBeNull();
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
      {
        size: 3,
        currentMs: 1100,
        currentStandardDeviationMs: 82,
        bestMs: 1100,
        bestStandardDeviationMs: 82,
      },
      {
        size: 5,
        currentMs: 1200,
        currentStandardDeviationMs: 82,
        bestMs: 1200,
        bestStandardDeviationMs: 82,
      },
    ]);
  });

  it('includes 50-solve rolling averages for long sessions', () => {
    const stats = calculateSolveStatistics(
      Array.from({ length: 50 }, (_, index) => solve(1000 + index, 50 - index)),
    );

    expect(stats.rollingAverages.map((average) => average.size)).toEqual([3, 5, 12, 50]);
  });

  it('keeps rolling averages valid until DNF solves exceed half the window', () => {
    const stats = calculateSolveStatistics([
      solve(1000, 5, 'dnf'),
      solve(1100, 4, 'dnf'),
      solve(1200, 3),
      solve(1300, 2),
      solve(1400, 1),
    ]);

    expect(stats.rollingAverages.find((average) => average.size === 5)).toEqual({
      size: 5,
      currentMs: 1300,
      currentStandardDeviationMs: 0,
      bestMs: 1300,
      bestStandardDeviationMs: 0,
    });
  });

  it('applies the same DNF threshold to rolling-average detail windows', () => {
    const windows = calculateRollingAverageWindows(
      [
        solve(1000, 5, 'dnf'),
        solve(1100, 4, 'dnf'),
        solve(1200, 3),
        solve(1300, 2),
        solve(1400, 1),
      ],
      'ao5',
    );

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      standardDeviationMs: 0,
      valueMs: 1300,
      valueText: '1.300',
    });
  });

  it('returns no incomplete windows and labels all-DNF windows', () => {
    expect(calculateRollingAverageWindows([solve(1000, 1)], 'ao5')).toEqual([]);

    const windows = calculateRollingAverageWindows(
      [solve(1000, 3, 'dnf'), solve(1100, 2, 'dnf'), solve(1200, 1, 'dnf')],
      'av3',
    );

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      valueMs: null,
      valueText: 'DNF',
      standardDeviationMs: null,
    });
  });

  it('keeps ao1000 and ao10000 valid when DNF solves remain below half', () => {
    const stats = calculateSolveStatistics(
      Array.from({ length: 10_000 }, (_, index) =>
        solve(10_000 + (index % 2_000), 10_000 - index, index % 211 === 0 ? 'dnf' : 'none'),
      ),
    );

    expect(stats.rollingAverages.find((average) => average.size === 1_000)).toMatchObject({
      currentMs: expect.any(Number),
      bestMs: expect.any(Number),
    });
    expect(stats.rollingAverages.find((average) => average.size === 10_000)).toMatchObject({
      currentMs: expect.any(Number),
      bestMs: expect.any(Number),
    });
  });

  it('calculates standard deviation for the same trimmed ao12 window', () => {
    const stats = calculateSolveStatistics(
      Array.from({ length: 12 }, (_, index) => solve(1000 + index * 100, 12 - index)),
    );

    expect(stats.rollingAverages.find((average) => average.size === 12)).toEqual({
      size: 12,
      currentMs: 1550,
      currentStandardDeviationMs: 287,
      bestMs: 1550,
      bestStandardDeviationMs: 287,
    });
  });

  it('only exposes long rolling averages once their required solve count is reached', () => {
    const stats = calculateSolveStatistics(
      Array.from({ length: 1000 }, (_, index) => solve(1000 + index, 1000 - index)),
    );

    expect(stats.rollingAverages.map((average) => average.size)).toEqual([3, 5, 12, 50, 100, 1000]);
  });

  it('builds newest-first ao5 rolling windows with sequence ranges', () => {
    const windows = calculateRollingAverageWindows(
      [
        solve(8423, 6),
        solve(10301, 5),
        solve(9884, 4),
        solve(11037, 3),
        solve(10521, 2),
        solve(12003, 1),
      ],
      'ao5',
    );

    expect(windows[0]).toMatchObject({
      averageType: 'ao5',
      endSequenceNumber: 6,
      startSequenceNumber: 2,
      standardDeviationMs: 264,
      valueMs: 10235,
      valueText: '10.235',
    });
    expect(windows[0]?.componentSolves.map((componentSolve) => componentSolve.id)).toEqual([
      '6',
      '5',
      '4',
      '3',
      '2',
    ]);
    expect(windows[1]).toMatchObject({
      averageType: 'ao5',
      endSequenceNumber: 5,
      startSequenceNumber: 1,
    });
  });

  it('builds untrimmed av3 rolling windows', () => {
    const windows = calculateRollingAverageWindows(
      [solve(9000, 3), solve(12000, 2), solve(15000, 1)],
      'av3',
    );

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      averageType: 'av3',
      endSequenceNumber: 3,
      startSequenceNumber: 1,
      valueMs: 12000,
      valueText: '12.000',
      standardDeviationMs: 2449,
    });
  });
});
