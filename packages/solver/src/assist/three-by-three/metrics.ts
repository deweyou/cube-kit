import { splitAlgorithm } from '@cubegin/scramble-puzzle';

const moveQuarterTurns = (token: string): number => (token.endsWith('2') ? 2 : 1);

export const countFaceTurnMetric = (algorithm: string): number =>
  splitAlgorithm(algorithm).filter((token) => !/^[xyz]/u.test(token)).length;

export const countQuarterTurnMetric = (algorithm: string): number =>
  splitAlgorithm(algorithm).reduce((total, token) => {
    if (/^[xyz]/u.test(token)) return total;

    return total + moveQuarterTurns(token);
  }, 0);
