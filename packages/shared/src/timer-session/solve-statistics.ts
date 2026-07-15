import { formatMilliseconds, getDisplayedElapsedMs } from './solve-format';
import { calculateSolveAverage, type SolveAverage } from './solve-average';
import type { SolveRecord } from './types';

export type RollingAverageType =
  | 'av3'
  | 'ao5'
  | 'ao12'
  | 'ao20'
  | 'ao50'
  | 'ao100'
  | 'ao1000'
  | 'ao10000';

export interface RollingAverageStat {
  bestStandardDeviationMs: number | null;
  currentMs: number | null;
  currentStandardDeviationMs: number | null;
  bestMs: number | null;
  size: number;
}

export interface RollingAverageWindow {
  averageType: RollingAverageType;
  componentSolves: SolveRecord[];
  endSequenceNumber: number;
  startSequenceNumber: number;
  standardDeviationMs: number | null;
  valueMs: number | null;
  valueText: string;
}

export interface SolveStatistics {
  averageMs: number | null;
  averageStandardDeviationMs: number | null;
  bestMs: number | null;
  totalCount: number;
  validCount: number;
  validRatio: number;
  worstMs: number | null;
  rollingAverages: RollingAverageStat[];
}

const ROLLING_AVERAGE_SIZES = [3, 5, 12, 50, 100, 1000, 10000] as const;

const ROLLING_AVERAGE_TYPE_SIZES: Record<RollingAverageType, number> = {
  av3: 3,
  ao5: 5,
  ao12: 12,
  ao20: 20,
  ao50: 50,
  ao100: 100,
  ao1000: 1000,
  ao10000: 10000,
};

const getDisplayedTimes = (solves: readonly SolveRecord[]): (number | null)[] =>
  solves.map((solve) => getDisplayedElapsedMs(solve.elapsedMs, solve.penalty));

const calculateSessionAverage = (
  displayedTimes: readonly (number | null)[],
  validTimes: readonly number[],
): SolveAverage => {
  return calculateSolveAverage(displayedTimes, validTimes.length >= 5);
};

export const getRollingAverageTypeSize = (averageType: RollingAverageType): number =>
  ROLLING_AVERAGE_TYPE_SIZES[averageType];

export const calculateRollingAverageWindows = (
  solvesNewestFirst: readonly SolveRecord[],
  averageType: RollingAverageType,
): RollingAverageWindow[] => {
  const size = getRollingAverageTypeSize(averageType);
  if (solvesNewestFirst.length < size) return [];

  const shouldTrim = averageType !== 'av3';
  const total = solvesNewestFirst.length;

  return Array.from({ length: solvesNewestFirst.length - size + 1 }, (_, startIndex) => {
    const componentSolves = solvesNewestFirst.slice(startIndex, startIndex + size);
    const average = calculateSolveAverage(getDisplayedTimes(componentSolves), shouldTrim);
    const endSequenceNumber = total - startIndex;

    return {
      averageType,
      componentSolves,
      endSequenceNumber,
      startSequenceNumber: endSequenceNumber - size + 1,
      standardDeviationMs: average.standardDeviationMs,
      valueMs: average.valueMs,
      valueText: average.valueMs === null ? 'DNF' : formatMilliseconds(average.valueMs),
    };
  });
};

const calculateRollingAverage = (
  displayedTimesNewestFirst: readonly (number | null)[],
  size: number,
): RollingAverageStat | undefined => {
  if (displayedTimesNewestFirst.length < size) return undefined;

  const shouldTrim = size >= 5;
  const current = calculateSolveAverage(displayedTimesNewestFirst.slice(0, size), shouldTrim);
  let best = current;

  for (let start = 1; start <= displayedTimesNewestFirst.length - size; start += 1) {
    const average = calculateSolveAverage(
      displayedTimesNewestFirst.slice(start, start + size),
      shouldTrim,
    );
    if (best.valueMs === null || (average.valueMs !== null && average.valueMs < best.valueMs)) {
      best = average;
    }
  }

  return {
    bestMs: best.valueMs,
    bestStandardDeviationMs: best.standardDeviationMs,
    currentMs: current.valueMs,
    currentStandardDeviationMs: current.standardDeviationMs,
    size,
  };
};

export const calculateSolveStatistics = (
  solvesNewestFirst: readonly SolveRecord[],
): SolveStatistics => {
  const displayedTimes = getDisplayedTimes(solvesNewestFirst);
  const validTimes = displayedTimes.filter((time): time is number => time !== null);
  const totalAverage = calculateSessionAverage(displayedTimes, validTimes);
  const bestMs = validTimes.length > 0 ? Math.min(...validTimes) : null;
  const worstMs = validTimes.length > 0 ? Math.max(...validTimes) : null;
  const rollingAverages = ROLLING_AVERAGE_SIZES.flatMap((size) => {
    const stat = calculateRollingAverage(displayedTimes, size);
    return stat ? [stat] : [];
  });

  return {
    averageMs: totalAverage.valueMs,
    averageStandardDeviationMs: totalAverage.standardDeviationMs,
    bestMs,
    rollingAverages,
    totalCount: solvesNewestFirst.length,
    validCount: validTimes.length,
    validRatio: solvesNewestFirst.length === 0 ? 0 : validTimes.length / solvesNewestFirst.length,
    worstMs,
  };
};
