import { createCubeDefinition, type CubeMove } from '@cubegin/scramble-puzzle';

export type FewestMovesValidationStatus = 'valid' | 'dnf' | 'suspected-inverse';
export type FewestMovesValidationReason =
  | 'syntax'
  | 'unsolved'
  | 'over-80-etm'
  | 'inverse-scramble'
  | null;

export interface FewestMovesValidation {
  rawSolution: string;
  normalizedSolution: string | null;
  moveCount: number | null;
  executionMoveCount: number | null;
  status: FewestMovesValidationStatus;
  reason: FewestMovesValidationReason;
  inverseMatchLength: number;
}

export interface FewestMovesValidationInput {
  scramble: string;
  solution: string;
}

const THREE_BY_THREE = createCubeDefinition(3, ['333fm']);
const TOKEN_PATTERN = /^(\d+)?([A-Za-z])([wW])?(2'?|')?$/u;

const normalizeToken = (token: string): string => {
  const match = token.match(TOKEN_PATTERN);
  if (!match) throw new Error(`Invalid FMC move: ${token}`);

  const [, widthText, rawMove, wideMarker, rawSuffix] = match;
  const lowerMove = rawMove!.toLowerCase();
  const suffix = rawSuffix?.startsWith('2') ? '2' : (rawSuffix ?? '');

  if (lowerMove === 'x' || lowerMove === 'y' || lowerMove === 'z') {
    if (widthText !== undefined || wideMarker !== undefined) {
      throw new Error(`Invalid FMC rotation: ${token}`);
    }
    return `${lowerMove}${suffix}`;
  }

  if (!'rufldb'.includes(lowerMove)) {
    throw new Error(`Invalid FMC face: ${token}`);
  }

  if (wideMarker !== undefined) {
    if (widthText !== undefined && widthText !== '2') {
      throw new Error(`Invalid 3x3 outer-block move: ${token}`);
    }
    return `${lowerMove.toUpperCase()}w${suffix}`;
  }

  if (widthText !== undefined) {
    throw new Error(`Invalid FMC face move: ${token}`);
  }

  return `${lowerMove.toUpperCase()}${suffix}`;
};

const normalizeAlgorithmTokens = (algorithm: string): readonly string[] => {
  const trimmed = algorithm.trim();
  if (trimmed.length === 0) return [];
  return trimmed.split(/\s+/u).map(normalizeToken);
};

const invertToken = (token: string): string => {
  if (token.endsWith('2')) return token;
  if (token.endsWith("'")) return token.slice(0, -1);
  return `${token}'`;
};

const invertTokens = (tokens: readonly string[]): readonly string[] =>
  [...tokens].reverse().map(invertToken);

const countInversePrefix = (
  solutionTokens: readonly string[],
  inverseScrambleTokens: readonly string[],
): number => {
  const count = Math.min(solutionTokens.length, inverseScrambleTokens.length);
  let index = 0;
  while (index < count && solutionTokens[index] === inverseScrambleTokens[index]) index += 1;
  return index;
};

const isSameTokenSequence = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((token, index) => token === b[index]);

const syntaxDnf = (rawSolution: string): FewestMovesValidation => ({
  executionMoveCount: null,
  inverseMatchLength: 0,
  moveCount: null,
  normalizedSolution: null,
  rawSolution,
  reason: 'syntax',
  status: 'dnf',
});

export const validateFewestMovesSolution = ({
  scramble,
  solution,
}: FewestMovesValidationInput): FewestMovesValidation => {
  let scrambleTokens: readonly string[];
  let solutionTokens: readonly string[];
  let solutionMoves: readonly CubeMove[];

  try {
    scrambleTokens = normalizeAlgorithmTokens(scramble);
    solutionTokens = normalizeAlgorithmTokens(solution);
    if (solutionTokens.length === 0) return syntaxDnf(solution);
    THREE_BY_THREE.parseAlgorithm(scrambleTokens.join(' '));
    solutionMoves = THREE_BY_THREE.parseAlgorithm(solutionTokens.join(' '));
  } catch {
    return syntaxDnf(solution);
  }

  const normalizedSolution = solutionTokens.join(' ');
  const moveCount = solutionMoves.reduce((count, move) => count + (move.isRotation ? 0 : 1), 0);
  const executionMoveCount = solutionMoves.length;
  const inverseScrambleTokens = invertTokens(scrambleTokens);
  const inverseMatchLength = countInversePrefix(solutionTokens, inverseScrambleTokens);
  const base = {
    executionMoveCount,
    inverseMatchLength,
    moveCount,
    normalizedSolution,
    rawSolution: solution,
  };

  if (executionMoveCount > 80) {
    return { ...base, reason: 'over-80-etm', status: 'dnf' };
  }

  try {
    const scrambledState = THREE_BY_THREE.applyAlgorithm(
      THREE_BY_THREE.createSolvedState(),
      scrambleTokens.join(' '),
    );
    const restoredState = THREE_BY_THREE.applyAlgorithm(scrambledState, normalizedSolution);
    if (!THREE_BY_THREE.isSolved(restoredState)) {
      return { ...base, reason: 'unsolved', status: 'dnf' };
    }
  } catch {
    return syntaxDnf(solution);
  }

  if (isSameTokenSequence(solutionTokens, inverseScrambleTokens)) {
    return { ...base, reason: 'inverse-scramble', status: 'dnf' };
  }

  if (inverseMatchLength >= 4) {
    return { ...base, reason: 'inverse-scramble', status: 'suspected-inverse' };
  }

  return { ...base, reason: null, status: 'valid' };
};
