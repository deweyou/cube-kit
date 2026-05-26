export const parseSeedFromSearch = (search: string): number | undefined => {
  const rawSeed = new URLSearchParams(search).get('seed');
  if (rawSeed === null || rawSeed.trim() === '') return undefined;

  const seed = Number(rawSeed);

  return Number.isSafeInteger(seed) ? seed : undefined;
};

export const getBrowserSeed = (): number | undefined => {
  if (typeof window === 'undefined') return undefined;

  return parseSeedFromSearch(window.location.search);
};
