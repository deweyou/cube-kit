/** Returns a random integer in [0, n) */
export const randomInt = (n: number): number => Math.floor(Math.random() * n);

/** Fisher-Yates in-place shuffle. Mutates and returns the array. */
export const shuffleArray = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Returns a random element from a non-empty array. */
export const randomChoice = <T>(arr: readonly T[]): T => arr[randomInt(arr.length)];
