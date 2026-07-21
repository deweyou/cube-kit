import { formatElapsedClock } from '../timer/format';
import type { SolveRecord } from './types';

export interface FewestMovesStatistics {
  bestMean: number | null | undefined;
  bestSolve: SolveRecord | null;
  currentMean: number | null | undefined;
  totalCount: number;
  validCount: number;
  worstSolve: SolveRecord | null;
}

type FewestMovesSolveLike = Pick<SolveRecord, 'elapsedMs' | 'fewestMoves' | 'penalty'>;

export const isFewestMovesSolveDnf = (solve: FewestMovesSolveLike): boolean =>
  solve.fewestMoves === undefined ||
  solve.penalty === 'dnf' ||
  solve.fewestMoves.validationStatus === 'dnf' ||
  solve.fewestMoves.moveCount === null;

export const formatFewestMovesSolve = (solve: FewestMovesSolveLike): string => {
  if (solve.fewestMoves === undefined) {
    return solve.penalty === 'dnf' ? 'DNF' : formatElapsedClock(solve.elapsedMs, 3);
  }
  return isFewestMovesSolveDnf(solve) ? 'DNF' : String(solve.fewestMoves.moveCount);
};

export const compareFewestMovesSolves = (
  a: FewestMovesSolveLike,
  b: FewestMovesSolveLike,
): number => {
  if (a.fewestMoves === undefined || b.fewestMoves === undefined) {
    if (a.fewestMoves === undefined && b.fewestMoves !== undefined) return 1;
    if (a.fewestMoves !== undefined && b.fewestMoves === undefined) return -1;
    return 0;
  }

  const aIsDnf = isFewestMovesSolveDnf(a);
  const bIsDnf = isFewestMovesSolveDnf(b);
  if (aIsDnf !== bIsDnf) return aIsDnf ? 1 : -1;
  if (aIsDnf) return 0;
  return (a.fewestMoves.moveCount ?? 0) - (b.fewestMoves.moveCount ?? 0);
};

export const getFewestMovesMean = (
  solves: readonly FewestMovesSolveLike[],
): number | null | undefined => {
  if (solves.length !== 3) return undefined;
  if (solves.some(isFewestMovesSolveDnf)) return null;

  return (
    solves.reduce((sum, solve) => sum + (solve.fewestMoves?.moveCount ?? 0), 0) / solves.length
  );
};

export const formatFewestMovesMean = (mean: number | null | undefined): string => {
  if (mean === undefined) return '--';
  if (mean === null) return 'DNF';
  return mean.toFixed(2);
};

export const calculateFewestMovesStatistics = (
  solvesNewestFirst: readonly SolveRecord[],
): FewestMovesStatistics => {
  const structuredSolves = solvesNewestFirst.filter((solve) => solve.fewestMoves !== undefined);
  const validSolves = structuredSolves.filter((solve) => !isFewestMovesSolveDnf(solve));
  const rankedValidSolves = [...validSolves].sort(compareFewestMovesSolves);
  const means: Array<number | null> = [];

  for (let index = 0; index <= structuredSolves.length - 3; index += 1) {
    const mean = getFewestMovesMean(structuredSolves.slice(index, index + 3));
    if (mean !== undefined) means.push(mean);
  }

  const numericMeans = means.filter((mean): mean is number => mean !== null);

  return {
    bestMean:
      numericMeans.length === 0 ? (means.length > 0 ? null : undefined) : Math.min(...numericMeans),
    bestSolve: rankedValidSolves[0] ?? null,
    currentMean: getFewestMovesMean(structuredSolves.slice(0, 3)),
    totalCount: structuredSolves.length,
    validCount: validSolves.length,
    worstSolve: rankedValidSolves.at(-1) ?? null,
  };
};
