import type { SolvePenalty, SolveRecord } from './types';

export const getSolveScrambles = (solve: Pick<SolveRecord, 'scramble'>): string[] =>
  Array.isArray(solve.scramble) ? solve.scramble : [solve.scramble];

export const getPrimarySolveScramble = (solve: Pick<SolveRecord, 'scramble'>): string =>
  getSolveScrambles(solve)[0] ?? '';

export const getDisplayedElapsedMs = (elapsedMs: number, penalty: SolvePenalty): number | null => {
  if (penalty === 'dnf') return null;
  if (penalty === '+2') return elapsedMs + 2000;
  return elapsedMs;
};

export const formatMilliseconds = (ms: number): string => (ms / 1000).toFixed(3);

export const getSolveDisplayText = (elapsedMs: number, penalty: SolvePenalty): string => {
  const displayedMs = getDisplayedElapsedMs(elapsedMs, penalty);
  if (displayedMs === null) return 'DNF';
  const text = formatMilliseconds(displayedMs);
  return penalty === '+2' ? `${text}+` : text;
};

export const getReverseSequenceNumber = (total: number, descendingIndex: number): number =>
  total - descendingIndex;
