/** Precomputed binomial coefficients table C(n,k) for n,k <= 13 */
const CNK: number[][] = Array.from({ length: 14 }, () =>
  Array.from<number>({ length: 14 }).fill(0),
);
for (let n = 0; n < 14; n++) {
  CNK[n][0] = 1;
  CNK[n][n] = 1;
  for (let k = 1; k < n; k++) {
    CNK[n][k] = CNK[n - 1][k - 1] + CNK[n - 1][k];
  }
}

/** C(n, k) binomial coefficient */
export const Cnk = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  return CNK[n][k];
};

/** Precomputed factorials */
const FACT: number[] = [1];
for (let i = 1; i <= 12; i++) FACT[i] = FACT[i - 1] * i;

/**
 * Compute the Lehmer rank of a permutation (0-based).
 * e.g. rankPerm([0,1,2,3]) = 0, rankPerm([3,2,1,0]) = 23
 */
export const rankPerm = (perm: number[]): number => {
  const n = perm.length;
  let rank = 0;
  const used = Array.from<boolean>({ length: n }).fill(false);
  for (let i = 0; i < n; i++) {
    let cnt = 0;
    for (let j = 0; j < perm[i]; j++) {
      if (!used[j]) cnt++;
    }
    rank += cnt * FACT[n - 1 - i];
    used[perm[i]] = true;
  }
  return rank;
};

/**
 * Reconstruct a permutation from its Lehmer rank.
 * e.g. unrankPerm(0, 4) = [0,1,2,3], unrankPerm(23, 4) = [3,2,1,0]
 */
export const unrankPerm = (rank: number, n: number): number[] => {
  const available: number[] = Array.from({ length: n }, (_, i) => i);
  const perm: number[] = [];
  let r = rank;
  for (let i = n; i > 0; i--) {
    const f = FACT[i - 1];
    const idx = Math.floor(r / f);
    perm.push(available[idx]);
    available.splice(idx, 1);
    r %= f;
  }
  return perm;
};

/**
 * Encode an orientation array as a mixed-radix integer.
 * The last element is considered derived (sum % base = 0) and is NOT encoded.
 * e.g. rankOrientation([0,0,0,0,0,0,0], 3) = 0 for 7 corners base-3
 */
export const rankOrientation = (orientations: number[], base: number): number => {
  let rank = 0;
  for (let i = 0; i < orientations.length - 1; i++) {
    rank = rank * base + orientations[i];
  }
  return rank;
};

/**
 * Decode an orientation rank back to an orientation array of the given length.
 * The last element is set so that sum % base = 0.
 */
export const unrankOrientation = (rank: number, length: number, base: number): number[] => {
  const result = Array.from<number>({ length }).fill(0);
  let r = rank;
  let sum = 0;
  for (let i = length - 2; i >= 0; i--) {
    result[i] = r % base;
    sum += result[i];
    r = Math.floor(r / base);
  }
  result[length - 1] = (base - (sum % base)) % base;
  return result;
};
