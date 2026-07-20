import { formatElapsedClock } from '../timer/format';
import type { MultiBlindSolveResult, SolveRecord } from './types';

export interface MultiBlindStatistics {
  bestScore: number | null;
  bestSolve: SolveRecord | null;
  totalCount: number;
  validCount: number;
}

const MULTI_BLIND_MINUTES_PER_CUBE = 10;
const MULTI_BLIND_MAX_TIME_MINUTES = 60;

export const getMultiBlindTimeLimitMs = (attemptedCount: number): number => {
  const normalizedAttemptedCount = Math.max(0, Math.trunc(attemptedCount));
  return (
    Math.min(
      normalizedAttemptedCount * MULTI_BLIND_MINUTES_PER_CUBE,
      MULTI_BLIND_MAX_TIME_MINUTES,
    ) * 60_000
  );
};

export const getMultiBlindMissedCount = (result: MultiBlindSolveResult): number =>
  result.attemptedCount - result.solvedCount;

export const getMultiBlindScore = (result: MultiBlindSolveResult): number =>
  result.solvedCount - getMultiBlindMissedCount(result);

export const getMultiBlindFinalTimeMs = (
  solve: Pick<SolveRecord, 'elapsedMs' | 'multiBlind'>,
): number | null => {
  if (solve.multiBlind === undefined) return null;

  const timePenaltyCount = Math.max(0, Math.trunc(solve.multiBlind.timePenaltyCount ?? 0));
  return Math.floor((solve.elapsedMs + timePenaltyCount * 2_000) / 1_000) * 1_000;
};

export const isMultiBlindSolveDnf = (
  solve: Pick<SolveRecord, 'elapsedMs' | 'multiBlind' | 'penalty'>,
): boolean => {
  if (solve.multiBlind === undefined || solve.penalty === 'dnf') return true;
  return (
    solve.elapsedMs > getMultiBlindTimeLimitMs(solve.multiBlind.attemptedCount) ||
    getMultiBlindScore(solve.multiBlind) < 0 ||
    solve.multiBlind.solvedCount === 1
  );
};

export const formatMultiBlindAttempt = (
  solve: Pick<SolveRecord, 'elapsedMs' | 'multiBlind'>,
): string => {
  if (solve.multiBlind === undefined) return '--';
  const finalTimeMs = getMultiBlindFinalTimeMs(solve);
  if (finalTimeMs === null) return '--';

  const finalTime =
    finalTimeMs < 60_000
      ? `0:${String(Math.floor(finalTimeMs / 1_000)).padStart(2, '0')}`
      : formatElapsedClock(finalTimeMs, 0);

  return `${solve.multiBlind.solvedCount}/${solve.multiBlind.attemptedCount} ${finalTime}`;
};

export const formatMultiBlindSolve = (
  solve: Pick<SolveRecord, 'elapsedMs' | 'multiBlind' | 'penalty'>,
): string => {
  if (solve.multiBlind === undefined) {
    return solve.penalty === 'dnf' ? 'DNF' : formatElapsedClock(solve.elapsedMs, 3);
  }
  return isMultiBlindSolveDnf(solve) ? 'DNF' : formatMultiBlindAttempt(solve);
};

export const compareMultiBlindSolves = (
  a: Pick<SolveRecord, 'elapsedMs' | 'multiBlind' | 'penalty'>,
  b: Pick<SolveRecord, 'elapsedMs' | 'multiBlind' | 'penalty'>,
): number => {
  const aIsDnf = isMultiBlindSolveDnf(a);
  const bIsDnf = isMultiBlindSolveDnf(b);
  if (aIsDnf !== bIsDnf) return aIsDnf ? 1 : -1;
  if (a.multiBlind === undefined || b.multiBlind === undefined) return 0;

  const scoreDifference = getMultiBlindScore(b.multiBlind) - getMultiBlindScore(a.multiBlind);
  if (scoreDifference !== 0) return scoreDifference;

  const timeDifference = (getMultiBlindFinalTimeMs(a) ?? 0) - (getMultiBlindFinalTimeMs(b) ?? 0);
  if (timeDifference !== 0) return timeDifference;

  return getMultiBlindMissedCount(a.multiBlind) - getMultiBlindMissedCount(b.multiBlind);
};

export const calculateMultiBlindStatistics = (
  solvesNewestFirst: readonly SolveRecord[],
): MultiBlindStatistics => {
  const validSolves = solvesNewestFirst.filter(
    (solve) => solve.multiBlind !== undefined && !isMultiBlindSolveDnf(solve),
  );
  const bestSolve =
    validSolves.length === 0 ? null : [...validSolves].sort(compareMultiBlindSolves)[0]!;

  return {
    bestScore:
      bestSolve?.multiBlind === undefined ? null : getMultiBlindScore(bestSolve.multiBlind),
    bestSolve,
    totalCount: solvesNewestFirst.length,
    validCount: validSolves.length,
  };
};
