import type { RandomSource } from './random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';

export interface CaseSelectionOptions {
  readonly enabledCaseIds?: readonly string[];
  readonly mode?: 'uniform' | 'natural';
}

export interface ScrambleCaseDefinition {
  readonly id: string;
  readonly naturalWeight?: number;
}

export const selectScrambleCase = <Case extends ScrambleCaseDefinition>(
  cases: readonly Case[],
  options: CaseSelectionOptions,
  random: RandomSource,
): Case => {
  const enabledCases = filterEnabledCases(cases, options.enabledCaseIds);
  if (options.mode !== 'natural') {
    return caseAt(enabledCases, random.nextInt(enabledCases.length));
  }

  const weights = enabledCases.map((scrambleCase) => naturalWeight(scrambleCase));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let selectedWeight = random.nextInt(totalWeight);

  for (let index = 0; index < enabledCases.length; index += 1) {
    selectedWeight -= weights[index] ?? 0;
    if (selectedWeight < 0) return caseAt(enabledCases, index);
  }

  throw new RangeError(`${ERROR_PREFIX}: random source returned an invalid weighted case index`);
};

const filterEnabledCases = <Case extends ScrambleCaseDefinition>(
  cases: readonly Case[],
  enabledCaseIds: readonly string[] | undefined,
): readonly Case[] => {
  if (cases.length === 0) {
    throw new Error(`${ERROR_PREFIX}: case set must contain at least one case`);
  }
  if (enabledCaseIds === undefined) return cases;
  if (enabledCaseIds.length === 0) {
    throw new Error(`${ERROR_PREFIX}: enabledCaseIds must contain at least one case id`);
  }

  const casesById = new Map(cases.map((scrambleCase) => [scrambleCase.id, scrambleCase]));
  const seenIds = new Set<string>();

  return enabledCaseIds.map((caseId) => {
    if (seenIds.has(caseId)) {
      throw new Error(`${ERROR_PREFIX}: duplicate enabled case id '${caseId}'`);
    }
    seenIds.add(caseId);

    const scrambleCase = casesById.get(caseId);
    if (scrambleCase === undefined) {
      throw new Error(`${ERROR_PREFIX}: unknown case id '${caseId}'`);
    }

    return scrambleCase;
  });
};

const naturalWeight = (scrambleCase: ScrambleCaseDefinition): number => {
  const weight = scrambleCase.naturalWeight ?? 1;
  if (!Number.isSafeInteger(weight) || weight <= 0) {
    throw new Error(`${ERROR_PREFIX}: case '${scrambleCase.id}' has an invalid natural weight`);
  }

  return weight;
};

const caseAt = <Case>(cases: readonly Case[], index: number): Case => {
  const scrambleCase = cases[index];
  if (scrambleCase === undefined) {
    throw new RangeError(
      `${ERROR_PREFIX}: random source returned ${index} for max ${cases.length}`,
    );
  }

  return scrambleCase;
};
