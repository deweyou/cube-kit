export interface UniqueScrambleResult {
  scramble: string;
}

export const generateUniqueScrambleBatch = async <Result extends UniqueScrambleResult>(
  count: number,
  generate: () => Promise<Result>,
): Promise<readonly Result[]> => {
  const results: Result[] = [];
  const seen = new Set<string>();

  while (results.length < count) {
    const scrambleResult = await generate();
    if (seen.has(scrambleResult.scramble)) continue;
    seen.add(scrambleResult.scramble);
    results.push(scrambleResult);
  }

  return results;
};
