const ERROR_PREFIX = '@cubegin/scramble-core';

export interface UniqueScrambleResult {
  scramble: string;
}

export interface UniqueScrambleBatchOptions {
  maxAttempts?: number;
}

export const generateUniqueScrambleBatch = async <Result extends UniqueScrambleResult>(
  count: number,
  generate: () => Promise<Result>,
  options: UniqueScrambleBatchOptions = {},
): Promise<readonly Result[]> => {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`${ERROR_PREFIX}: batch count must be a non-negative safe integer`);
  }

  const maxAttempts = options.maxAttempts ?? Math.max(count * 10, 100);
  const results: Result[] = [];
  const seen = new Set<string>();

  for (let attempts = 0; results.length < count && attempts < maxAttempts; attempts += 1) {
    const scrambleResult = await generate();
    if (seen.has(scrambleResult.scramble)) continue;
    seen.add(scrambleResult.scramble);
    results.push(scrambleResult);
  }

  if (results.length < count) {
    throw new Error(
      `${ERROR_PREFIX}: generated ${results.length} unique scrambles after ${maxAttempts} attempts`,
    );
  }

  return results;
};
