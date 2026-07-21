import { describe, expect, it } from 'vitest';
import {
  calculateFewestMovesStatistics,
  compareFewestMovesSolves,
  formatFewestMovesMean,
  formatFewestMovesSolve,
  getFewestMovesMean,
  isFewestMovesSolveDnf,
} from './fewest-moves-result';
import type { FewestMovesSolveResult, SolveRecord } from './types';

const result = (
  moveCount: number | null,
  options: Partial<FewestMovesSolveResult> = {},
): FewestMovesSolveResult => ({
  attemptDurationMs: 1_000,
  executionMoveCount: moveCount,
  inverseScrambleReview: 'not-suspected',
  moveCount,
  normalizedSolution: moveCount === null ? null : "R'",
  rawSolution: "R'",
  rulesVersion: 'wca-2026-04-01',
  validationReason: moveCount === null ? 'unsolved' : null,
  validationStatus: moveCount === null ? 'dnf' : 'valid',
  ...options,
});

const solve = (
  id: string,
  moveCount: number | null,
  options: Partial<SolveRecord> = {},
): SolveRecord => ({
  createdAt: Number(id),
  elapsedMs: 1_000,
  eventId: '333fm',
  fewestMoves: result(moveCount),
  id,
  penalty: moveCount === null ? 'dnf' : 'none',
  scramble: 'R',
  sessionId: 'fm',
  ...options,
});

describe('fewest-moves result rules', () => {
  it('formats structured results and keeps legacy values identifiable', () => {
    expect(formatFewestMovesSolve(solve('1', 24))).toBe('24');
    expect(formatFewestMovesSolve(solve('2', null))).toBe('DNF');
    expect(
      formatFewestMovesSolve({ ...solve('3', 24), fewestMoves: undefined, penalty: 'none' }),
    ).toBe('1.000');
    expect(
      formatFewestMovesSolve({ ...solve('4', 24), fewestMoves: undefined, penalty: 'dnf' }),
    ).toBe('DNF');
  });

  it('derives DNF from penalty or validation status', () => {
    expect(isFewestMovesSolveDnf(solve('1', 24))).toBe(false);
    expect(isFewestMovesSolveDnf({ ...solve('2', 24), penalty: 'dnf' })).toBe(true);
    expect(isFewestMovesSolveDnf(solve('3', null))).toBe(true);
    expect(isFewestMovesSolveDnf({ ...solve('4', 24), fewestMoves: undefined })).toBe(true);
    expect(
      isFewestMovesSolveDnf({
        ...solve('5', 24),
        fewestMoves: result(24, { validationStatus: 'dnf' }),
      }),
    ).toBe(true);
  });

  it('ranks valid lower move counts before DNF and legacy records', () => {
    expect(compareFewestMovesSolves(solve('1', 22), solve('2', 24))).toBeLessThan(0);
    expect(compareFewestMovesSolves(solve('1', 24), solve('2', null))).toBeLessThan(0);
    expect(
      compareFewestMovesSolves({ ...solve('1', 24), fewestMoves: undefined }, solve('2', 24)),
    ).toBeGreaterThan(0);
    expect(
      compareFewestMovesSolves(solve('1', 24), {
        ...solve('2', 24),
        fewestMoves: undefined,
      }),
    ).toBeLessThan(0);
    expect(
      compareFewestMovesSolves(
        { ...solve('1', 24), fewestMoves: undefined },
        { ...solve('2', 24), fewestMoves: undefined },
      ),
    ).toBe(0);
    expect(compareFewestMovesSolves(solve('1', null), solve('2', 24))).toBeGreaterThan(0);
    expect(compareFewestMovesSolves(solve('1', null), solve('2', null))).toBe(0);
  });

  it('calculates Mean of 3 and propagates DNF', () => {
    expect(getFewestMovesMean([solve('1', 20), solve('2', 21), solve('3', 22)])).toBe(21);
    expect(getFewestMovesMean([solve('1', 20), solve('2', null), solve('3', 22)])).toBeNull();
    expect(getFewestMovesMean([solve('1', 20), solve('2', 21)])).toBeUndefined();
    expect(formatFewestMovesMean(29.666666)).toBe('29.67');
    expect(formatFewestMovesMean(null)).toBe('DNF');
    expect(formatFewestMovesMean(undefined)).toBe('--');
  });

  it('derives current and best Mean of 3 from structured attempts only', () => {
    const legacy = { ...solve('0', 99), fewestMoves: undefined };
    const statistics = calculateFewestMovesStatistics([
      solve('5', 30),
      legacy,
      solve('4', 31),
      solve('3', 32),
      solve('2', 20),
      solve('1', 21),
    ]);

    expect(statistics).toMatchObject({
      bestMean: 24.333333333333332,
      bestSolve: { id: '2' },
      currentMean: 31,
      totalCount: 5,
      validCount: 5,
      worstSolve: { id: '3' },
    });
  });

  it('reports empty and all-DNF statistics without inventing a mean', () => {
    expect(calculateFewestMovesStatistics([])).toMatchObject({
      bestMean: undefined,
      bestSolve: null,
      currentMean: undefined,
      totalCount: 0,
      validCount: 0,
      worstSolve: null,
    });

    expect(
      calculateFewestMovesStatistics([solve('3', null), solve('2', null), solve('1', null)]),
    ).toMatchObject({
      bestMean: null,
      bestSolve: null,
      currentMean: null,
      totalCount: 3,
      validCount: 0,
      worstSolve: null,
    });
  });
});
