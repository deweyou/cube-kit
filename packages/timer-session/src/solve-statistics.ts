import { getDisplayedElapsedMs } from './solve-format';
import type { SolveRecord } from './types';

export interface RollingAverageStat {
  currentMs: number | null;
  bestMs: number | null;
  size: number;
}

export interface SolveStatistics {
  averageMs: number | null;
  bestMs: number | null;
  totalCount: number;
  validCount: number;
  rollingAverages: RollingAverageStat[];
}

const ROLLING_AVERAGE_SIZES = [3, 5, 12, 100] as const;

const compareDisplayedMs = (a: number | null, b: number | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
};

const averageDisplayedMs = (
  displayedTimes: readonly (number | null)[],
  shouldTrim: boolean,
): number | null => {
  const times = [...displayedTimes];
  if (shouldTrim && times.length >= 3) {
    const bestIndex = times.reduce(
      (best, time, index) => (compareDisplayedMs(time, times[best]!) < 0 ? index : best),
      0,
    );
    times.splice(bestIndex, 1);

    const worstIndex = times.reduce(
      (worst, time, index) => (compareDisplayedMs(time, times[worst]!) > 0 ? index : worst),
      0,
    );
    times.splice(worstIndex, 1);
  }

  if (times.length === 0 || times.some((time) => time === null)) return null;
  return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
};

const getDisplayedTimes = (solves: readonly SolveRecord[]): (number | null)[] =>
  solves.map((solve) => getDisplayedElapsedMs(solve.elapsedMs, solve.penalty));

const calculateRollingAverage = (
  displayedTimesNewestFirst: readonly (number | null)[],
  size: number,
): RollingAverageStat | undefined => {
  if (displayedTimesNewestFirst.length < size) return undefined;

  const shouldTrim = size >= 5;
  const currentMs = averageDisplayedMs(displayedTimesNewestFirst.slice(0, size), shouldTrim);
  let bestMs = currentMs;

  for (let start = 1; start <= displayedTimesNewestFirst.length - size; start += 1) {
    const averageMs = averageDisplayedMs(displayedTimesNewestFirst.slice(start, start + size), shouldTrim);
    if (bestMs === null || (averageMs !== null && averageMs < bestMs)) {
      bestMs = averageMs;
    }
  }

  return { currentMs, bestMs, size };
};

export const calculateSolveStatistics = (
  solvesNewestFirst: readonly SolveRecord[],
): SolveStatistics => {
  const displayedTimes = getDisplayedTimes(solvesNewestFirst);
  const validTimes = displayedTimes.filter((time): time is number => time !== null);
  const averageMs = averageDisplayedMs(displayedTimes, displayedTimes.length >= 5);
  const bestMs = validTimes.length > 0 ? Math.min(...validTimes) : null;
  const rollingAverages = ROLLING_AVERAGE_SIZES.flatMap((size) => {
    const stat = calculateRollingAverage(displayedTimes, size);
    return stat ? [stat] : [];
  });

  return {
    averageMs,
    bestMs,
    rollingAverages,
    totalCount: solvesNewestFirst.length,
    validCount: validTimes.length,
  };
};
