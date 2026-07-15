export interface SolveAverage {
  standardDeviationMs: number | null;
  valueMs: number | null;
}

const calculateNumericAverage = (
  numericTimes: readonly number[],
  shouldTrim: boolean,
): SolveAverage => {
  const times = [...numericTimes];
  if (shouldTrim && times.length >= 3) {
    const bestIndex = times.reduce<number>(
      (best, time, index) => (time < times[best]! ? index : best),
      0,
    );
    times.splice(bestIndex, 1);

    const worstIndex = times.reduce<number>(
      (worst, time, index) => (time > times[worst]! ? index : worst),
      0,
    );
    times.splice(worstIndex, 1);
  }

  if (times.length === 0) {
    return { standardDeviationMs: null, valueMs: null };
  }

  const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
  const variance = times.reduce((sum, time) => sum + (time - mean) ** 2, 0) / times.length;

  return {
    standardDeviationMs: Math.round(Math.sqrt(variance)),
    valueMs: Math.round(mean),
  };
};

export const calculateSolveAverage = (
  displayedTimes: readonly (number | null)[],
  shouldTrim: boolean,
): SolveAverage => {
  const numericTimes = displayedTimes.filter((time): time is number => time !== null);
  const dnfCount = displayedTimes.length - numericTimes.length;

  if (numericTimes.length === 0 || dnfCount > displayedTimes.length / 2) {
    return { standardDeviationMs: null, valueMs: null };
  }

  return calculateNumericAverage(numericTimes, shouldTrim);
};
