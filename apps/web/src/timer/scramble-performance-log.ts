export const getScramblePerformanceNow = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
};

export const getScrambleElapsedMs = (startMs: number) =>
  Math.round((getScramblePerformanceNow() - startMs) * 10) / 10;

export const logScramblePerformance = (event: string, details: Record<string, unknown>) => {
  if (!import.meta.env.DEV || import.meta.env.VITEST || typeof console === 'undefined') return;

  console.info(`[cubegin:scramble] ${event}`, details);
};
