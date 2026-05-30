export type MoveTable = readonly (readonly number[])[];

const COMBINATION_LIMIT = 25;

const combinations = Array.from({ length: COMBINATION_LIMIT }, () =>
  Array<number>(COMBINATION_LIMIT).fill(0),
);

for (let i = 0; i < COMBINATION_LIMIT; i += 1) {
  combinations[i][0] = 1;
  combinations[i][i] = 1;

  for (let j = 1; j < i; j += 1) {
    combinations[i][j] = combinations[i - 1][j - 1] + combinations[i - 1][j];
  }
}

export const binomial = (n: number, k: number): number => combinations[n]?.[k] ?? 0;

export const permutationToIndex = (
  permutation: readonly number[],
  length: number,
  even: boolean,
): number => {
  let index = 0;
  const end = even ? length - 2 : length - 1;

  for (let i = 0; i < end; i += 1) {
    index *= length - i;

    for (let j = i + 1; j < length; j += 1) {
      if (permutation[i] > permutation[j]) index += 1;
    }
  }

  return index;
};

const swap = (items: number[], first: number, second: number): void => {
  const value = items[first];
  items[first] = items[second];
  items[second] = value;
};

export const indexToPermutation = (index: number, length: number, even: boolean): number[] => {
  const permutation = Array<number>(length).fill(0);
  let parity = 0;

  if (even) {
    permutation[length - 1] = 1;
    permutation[length - 2] = 0;
  } else {
    permutation[length - 1] = 0;
  }

  const start = even ? length - 3 : length - 2;

  for (let i = start; i >= 0; i -= 1) {
    permutation[i] = index % (length - i);
    parity += permutation[i];
    index = Math.floor(index / (length - i));

    for (let j = i + 1; j < length; j += 1) {
      if (permutation[j] >= permutation[i]) permutation[j] += 1;
    }
  }

  if (even && parity % 2 !== 0) swap(permutation, length - 1, length - 2);

  return permutation;
};

export const flipToIndex = (flip: readonly number[], length: number, zeroSum: boolean): number => {
  let index = 0;
  const limit = zeroSum ? length - 1 : length;

  for (let i = 0; i < limit; i += 1) {
    index = (index << 1) | flip[i];
  }

  return index;
};

export const indexToFlip = (index: number, length: number, zeroSum: boolean): number[] => {
  const flip = Array<number>(length).fill(0);
  let parity = 0;
  const limit = zeroSum ? length - 1 : length;

  for (let i = limit - 1; i >= 0; i -= 1) {
    flip[i] = index & 1;
    parity ^= flip[i];
    index >>= 1;
  }

  if (zeroSum) flip[limit] = parity;

  return flip;
};

export const orientationToIndex = (
  orientation: readonly number[],
  length: number,
  zeroSum: boolean,
): number => {
  let index = 0;
  const limit = zeroSum ? length - 1 : length;

  for (let i = 0; i < limit; i += 1) {
    index = 3 * index + (orientation[i] % 3);
  }

  return index;
};

export const indexToOrientation = (index: number, length: number, zeroSum: boolean): number[] => {
  const orientation = Array<number>(length).fill(0);
  let sum = 0;
  const start = zeroSum ? length - 2 : length - 1;

  for (let i = start; i >= 0; i -= 1) {
    orientation[i] = index % 3;
    index = Math.floor(index / 3);
    sum += orientation[i];
  }

  if (zeroSum) orientation[length - 1] = (3 - (sum % 3)) % 3;

  return orientation;
};

export const combinationToIndex = (
  combination: readonly number[],
  k: number,
  n: number,
): number => {
  let index = 0;

  for (let i = n - 1; i >= 0; i -= 1) {
    if (combination[i] !== 0) {
      index += binomial(i, k);
      k -= 1;
    }
  }

  return index;
};

export const indexToCombination = (index: number, k: number, n: number): number[] => {
  const combination = Array<number>(n).fill(0);

  for (let i = n - 1; i >= 0; i -= 1) {
    if (index >= binomial(i, k)) {
      index -= binomial(i, k);
      combination[i] = 1;
      k -= 1;
    }
  }

  return combination;
};

export const cycleFour = (
  values: number[],
  first: number,
  second: number,
  third: number,
  fourth: number,
): void => {
  const value = values[first];
  values[first] = values[second];
  values[second] = values[third];
  values[third] = values[fourth];
  values[fourth] = value;
};

export const cycleFourWithOrientation = (
  values: number[],
  first: number,
  second: number,
  third: number,
  fourth: number,
  orientation: readonly [number, number, number, number],
): void => {
  const value = values[first];
  values[first] = values[second] + orientation[0];
  values[second] = values[third] + orientation[1];
  values[third] = values[fourth] + orientation[2];
  values[fourth] = value + orientation[3];
};

export const createPruningTable = (
  size: number,
  solvedIndexes: readonly number[],
  maxDepth: number,
  moveTable: MoveTable,
  turnRepeatCount: number,
): number[] => {
  const table = Array<number>(size).fill(-1);

  for (const index of solvedIndexes) {
    table[index] = 0;
  }

  for (let depth = 0; depth < maxDepth; depth += 1) {
    for (let index = 0; index < size; index += 1) {
      if (table[index] !== depth) continue;

      for (let move = 0; move < moveTable[index].length; move += 1) {
        let next = index;

        for (let turn = 0; turn < turnRepeatCount; turn += 1) {
          next = moveTable[next][move];

          if (table[next] < 0) table[next] = depth + 1;
        }
      }
    }
  }

  return table;
};
