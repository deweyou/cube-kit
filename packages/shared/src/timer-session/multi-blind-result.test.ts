import { describe, expect, it } from 'vitest';
import {
  calculateMultiBlindStatistics,
  compareMultiBlindSolves,
  formatMultiBlindSolve,
  getMultiBlindFinalTimeMs,
  getMultiBlindMissedCount,
  getMultiBlindScore,
  isMultiBlindSolveDnf,
} from './multi-blind-result';
import type { SolveRecord } from './types';

const multiBlindSolve = ({
  attemptedCount,
  elapsedMs,
  id,
  penalty = 'none',
  solvedCount,
  timePenaltyCount = 0,
}: {
  attemptedCount: number;
  elapsedMs: number;
  id: string;
  penalty?: SolveRecord['penalty'];
  solvedCount: number;
  timePenaltyCount?: number;
}): SolveRecord => ({
  createdAt: Number(id),
  elapsedMs,
  eventId: '333mbld',
  id,
  multiBlind: { attemptedCount, solvedCount, timePenaltyCount },
  penalty,
  scramble: Array.from({ length: attemptedCount }, (_, index) => `cube ${index + 1}`),
  sessionId: 'mbld',
});

describe('multi-blind result', () => {
  it('calculates score, missed count, cumulative penalties, and whole-second time', () => {
    const solve = multiBlindSolve({
      attemptedCount: 5,
      elapsedMs: 2_428_999,
      id: '1',
      solvedCount: 3,
      timePenaltyCount: 2,
    });

    expect(getMultiBlindMissedCount(solve.multiBlind!)).toBe(2);
    expect(getMultiBlindScore(solve.multiBlind!)).toBe(1);
    expect(getMultiBlindFinalTimeMs(solve)).toBe(2_432_000);
    expect(formatMultiBlindSolve(solve)).toBe('3/5 40:32');
  });

  it('treats scaffolded records without a penalty count as zero penalties', () => {
    const solve = multiBlindSolve({
      attemptedCount: 3,
      elapsedMs: 60_999,
      id: '1',
      solvedCount: 2,
    });
    delete (solve.multiBlind as Partial<typeof solve.multiBlind>)?.timePenaltyCount;

    expect(getMultiBlindFinalTimeMs(solve)).toBe(60_000);
    expect(formatMultiBlindSolve(solve)).toBe('2/3 1:00');
  });

  it('keeps the WCA minutes-and-seconds shape for sub-minute results', () => {
    const solve = multiBlindSolve({
      attemptedCount: 3,
      elapsedMs: 5_999,
      id: '1',
      solvedCount: 3,
    });

    expect(formatMultiBlindSolve(solve)).toBe('3/3 0:05');
  });

  it('handles legacy records and empty statistics without inventing an MBLD result', () => {
    const valid = multiBlindSolve({
      attemptedCount: 3,
      elapsedMs: 5_999,
      id: '1',
      solvedCount: 3,
    });
    const legacy: SolveRecord = { ...valid, multiBlind: undefined };
    const legacyDnf: SolveRecord = { ...legacy, id: '2', penalty: 'dnf' };

    expect(getMultiBlindFinalTimeMs(legacy)).toBeNull();
    expect(isMultiBlindSolveDnf(legacy)).toBe(true);
    expect(formatMultiBlindSolve(legacyDnf)).toBe('DNF');
    expect(compareMultiBlindSolves(legacy, valid)).toBeGreaterThan(0);
    expect(compareMultiBlindSolves(valid, legacy)).toBeLessThan(0);
    expect(compareMultiBlindSolves(legacy, legacyDnf)).toBe(0);
    expect(calculateMultiBlindStatistics([])).toEqual({
      bestScore: null,
      bestSolve: null,
      totalCount: 0,
      validCount: 0,
    });
  });

  it('clamps negative cumulative penalties and keeps equal solves tied', () => {
    const solve = multiBlindSolve({
      attemptedCount: 3,
      elapsedMs: 5_999,
      id: '1',
      solvedCount: 3,
      timePenaltyCount: -2,
    });

    expect(getMultiBlindFinalTimeMs(solve)).toBe(5_000);
    expect(compareMultiBlindSolves(solve, solve)).toBe(0);
  });

  it('derives DNF from negative score, exactly one solved cube, or whole-attempt DNF', () => {
    expect(
      isMultiBlindSolveDnf(
        multiBlindSolve({ attemptedCount: 5, elapsedMs: 1_000, id: '1', solvedCount: 2 }),
      ),
    ).toBe(true);
    expect(
      isMultiBlindSolveDnf(
        multiBlindSolve({ attemptedCount: 2, elapsedMs: 1_000, id: '2', solvedCount: 1 }),
      ),
    ).toBe(true);
    expect(
      isMultiBlindSolveDnf(
        multiBlindSolve({
          attemptedCount: 5,
          elapsedMs: 1_000,
          id: '3',
          penalty: 'dnf',
          solvedCount: 5,
        }),
      ),
    ).toBe(true);
    expect(
      formatMultiBlindSolve(
        multiBlindSolve({ attemptedCount: 5, elapsedMs: 1_000, id: '4', solvedCount: 2 }),
      ),
    ).toBe('DNF');
  });

  it('ranks by score, then shorter time, then fewer missed cubes', () => {
    const shorter = multiBlindSolve({
      attemptedCount: 7,
      elapsedMs: 1_800_000,
      id: '1',
      solvedCount: 4,
    });
    const longer = multiBlindSolve({
      attemptedCount: 5,
      elapsedMs: 2_430_000,
      id: '2',
      solvedCount: 3,
    });
    const fewerMissed = multiBlindSolve({
      attemptedCount: 3,
      elapsedMs: 1_800_000,
      id: '3',
      solvedCount: 2,
    });

    expect(compareMultiBlindSolves(shorter, longer)).toBeLessThan(0);
    expect(compareMultiBlindSolves(fewerMissed, shorter)).toBeLessThan(0);
  });

  it('summarizes only structured MBLD attempts and excludes DNF from valid count', () => {
    const best = multiBlindSolve({
      attemptedCount: 5,
      elapsedMs: 2_430_000,
      id: '3',
      solvedCount: 4,
    });
    const valid = multiBlindSolve({
      attemptedCount: 5,
      elapsedMs: 2_400_000,
      id: '2',
      solvedCount: 3,
    });
    const dnf = multiBlindSolve({
      attemptedCount: 5,
      elapsedMs: 2_300_000,
      id: '1',
      solvedCount: 2,
    });
    const legacy: SolveRecord = { ...valid, id: '0', multiBlind: undefined };
    const statistics = calculateMultiBlindStatistics([valid, dnf, legacy, best]);

    expect(statistics).toMatchObject({
      bestScore: 3,
      bestSolve: best,
      totalCount: 4,
      validCount: 2,
    });
    expect(formatMultiBlindSolve(legacy)).toBe('40:00.000');
  });
});
