import type { SolvePenalty } from './types';

export const getDisplayedElapsedMs = (elapsedMs: number, penalty: SolvePenalty): number | null => {
  if (penalty === 'dnf') return null;
  if (penalty === '+2') return elapsedMs + 2000;
  return elapsedMs;
};

export const formatMilliseconds = (ms: number): string => (ms / 1000).toFixed(3);

export const getSolveDisplayText = (elapsedMs: number, penalty: SolvePenalty): string => {
  const displayedMs = getDisplayedElapsedMs(elapsedMs, penalty);
  return displayedMs === null ? 'DNF' : formatMilliseconds(displayedMs);
};

export const getReverseSequenceNumber = (total: number, descendingIndex: number): number =>
  total - descendingIndex;
