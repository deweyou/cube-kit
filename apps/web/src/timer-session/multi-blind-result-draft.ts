import type { MultiBlindSolveResult } from '@cubegin/shared/timer-session';

interface ResolveMultiBlindResultDraftOptions {
  attemptedCount: number;
  isDnf: boolean;
  penaltyCount: string;
  solvedCount: string;
}

export const resolveMultiBlindResultDraft = ({
  attemptedCount,
  isDnf,
  penaltyCount,
  solvedCount,
}: ResolveMultiBlindResultDraftOptions): MultiBlindSolveResult | undefined => {
  const solved = Number(solvedCount);
  const penalties = Number(penaltyCount);
  const isValidPair =
    solvedCount.trim() !== '' &&
    Number.isSafeInteger(solved) &&
    solved >= 0 &&
    solved <= attemptedCount &&
    penaltyCount.trim() !== '' &&
    Number.isSafeInteger(penalties) &&
    penalties >= 0 &&
    penalties <= solved;

  if (!isValidPair && !isDnf) return undefined;

  return {
    attemptedCount,
    solvedCount: isValidPair ? solved : 0,
    timePenaltyCount: isValidPair ? penalties : 0,
  };
};
