import type { RandomSource } from '../../random-source.js';
import { CubieCube, getNParity, getNPerm } from './cubie-cube.js';
import { drawRandomInt, SOLVED_FACE_CUBE } from './util.js';

const STATE_RANDOM = null;
const STATE_SOLVED: readonly number[] = [];

type RandomStatePart = readonly number[] | null;

export const randomCube = (random: RandomSource): string =>
  randomState(STATE_RANDOM, STATE_RANDOM, STATE_RANDOM, STATE_RANDOM, random);

export const fromScramble = (scramble: string): string =>
  parseMoveIndices(scramble)
    .reduce((cube, move) => multiply(cube, MOVE_CUBES[move] ?? CubieCube.solved()), CubieCube.solved())
    .toFaceCube();

export const isSolvedFaceCube = (facelets: string): boolean =>
  facelets === SOLVED_FACE_CUBE;

export const randomState = (
  cornerPermutation: RandomStatePart,
  cornerOrientation: RandomStatePart,
  edgePermutation: RandomStatePart,
  edgeOrientation: RandomStatePart,
  random: RandomSource,
): string => {
  const epUnknownCount =
    edgePermutation === STATE_RANDOM ? 12 : countUnknown(edgePermutation);
  const cpUnknownCount =
    cornerPermutation === STATE_RANDOM ? 8 : countUnknown(cornerPermutation);

  let parity: number;
  let cpValue: number;
  let epValue: number;

  if (epUnknownCount < 2) {
    if (edgePermutation === STATE_SOLVED) {
      epValue = 0;
      parity = 0;
    } else if (edgePermutation !== STATE_RANDOM) {
      const resolvedEp = materializeState(edgePermutation, 12);
      parity = resolvePerm(resolvedEp, epUnknownCount, -1, random);
      epValue = getNPerm(resolvedEp, 12);
    } else {
      throw new Error('@cubekit/scramble-core: invalid random edge state');
    }

    if (cornerPermutation === STATE_SOLVED) {
      cpValue = 0;
    } else if (cornerPermutation === STATE_RANDOM) {
      cpValue = drawRandomPermutationWithParity(random, 40_320, 8, parity);
    } else {
      const resolvedCp = materializeState(cornerPermutation, 8);
      resolvePerm(resolvedCp, cpUnknownCount, parity, random);
      cpValue = getNPerm(resolvedCp, 8);
    }
  } else {
    if (cornerPermutation === STATE_SOLVED) {
      cpValue = 0;
      parity = 0;
    } else if (cornerPermutation === STATE_RANDOM) {
      cpValue = drawRandomInt(random, 40_320);
      parity = getNParity(cpValue, 8);
    } else {
      const resolvedCp = materializeState(cornerPermutation, 8);
      parity = resolvePerm(resolvedCp, cpUnknownCount, -1, random);
      cpValue = getNPerm(resolvedCp, 8);
    }

    if (edgePermutation === STATE_RANDOM) {
      epValue = drawRandomPermutationWithParity(
        random,
        479_001_600,
        12,
        parity,
      );
    } else {
      const resolvedEp = materializeState(edgePermutation, 12);
      resolvePerm(resolvedEp, epUnknownCount, parity, random);
      epValue = getNPerm(resolvedEp, 12);
    }
  }

  return CubieCube.fromCoordinates(
    cpValue,
    cornerOrientation === STATE_RANDOM
      ? drawRandomInt(random, 2_187)
      : cornerOrientation === STATE_SOLVED
        ? 0
        : resolveOri(materializeState(cornerOrientation, 8), 3, random),
    epValue,
    edgeOrientation === STATE_RANDOM
      ? drawRandomInt(random, 2_048)
      : edgeOrientation === STATE_SOLVED
        ? 0
        : resolveOri(materializeState(edgeOrientation, 12), 2, random),
  ).toFaceCube();
};

const drawRandomPermutationWithParity = (
  random: RandomSource,
  maxExclusive: number,
  pieceCount: number,
  parity: number,
): number => {
  const permutationValue = drawRandomInt(random, maxExclusive);

  return getNParity(permutationValue, pieceCount) === parity
    ? permutationValue
    : flipPermutationParity(permutationValue, pieceCount);
};

const flipPermutationParity = (
  permutationValue: number,
  pieceCount: number,
): number => {
  const permutation = permutationFromIndex(permutationValue, pieceCount);
  const first = permutation[0] ?? 0;
  permutation[0] = permutation[1] ?? 0;
  permutation[1] = first;

  return getNPerm(permutation, pieceCount);
};

const permutationFromIndex = (
  permutationValue: number,
  pieceCount: number,
): number[] => {
  const permutation = Array<number>(pieceCount);
  let index = permutationValue;

  for (let i = pieceCount - 1; i >= 0; i -= 1) {
    permutation[i] = index % (pieceCount - i);
    index = Math.floor(index / (pieceCount - i));

    for (let j = i + 1; j < pieceCount; j += 1) {
      if ((permutation[j] ?? 0) >= (permutation[i] ?? 0)) {
        permutation[j] = (permutation[j] ?? 0) + 1;
      }
    }
  }

  return permutation;
};

const resolveOri = (
  orientations: number[],
  base: number,
  random: RandomSource,
): number => {
  let sum = 0;
  let index = 0;
  let lastUnknown = -1;

  for (let i = 0; i < orientations.length; i += 1) {
    if (orientations[i] === -1) {
      orientations[i] = drawRandomInt(random, base);
      lastUnknown = i;
    }
    sum += orientations[i] ?? 0;
  }

  if (sum % base !== 0 && lastUnknown !== -1) {
    orientations[lastUnknown] =
      (30 + (orientations[lastUnknown] ?? 0) - sum) % base;
  }

  for (let i = 0; i < orientations.length - 1; i += 1) {
    index *= base;
    index += orientations[i] ?? 0;
  }

  return index;
};

const countUnknown = (state: RandomStatePart): number => {
  if (state === STATE_SOLVED) return 0;

  return state?.filter((value) => value === -1).length ?? 0;
};

const resolvePerm = (
  permutation: number[],
  unknownCount: number,
  parity: number,
  random: RandomSource,
): number => {
  const available = Array.from({ length: permutation.length }, (_, index) =>
    permutation.includes(index) ? -1 : index,
  );

  let shuffledCount = 0;
  for (let i = 0; i < available.length; i += 1) {
    if (available[i] === -1) continue;

    const swapIndex = drawRandomInt(random, shuffledCount + 1);
    const value = available[i] ?? -1;
    available[i] = available[swapIndex] ?? -1;
    available[shuffledCount] = value;
    shuffledCount += 1;
  }

  let last = -1;
  let cursor = 0;
  let remainingUnknown = unknownCount;
  while (cursor < permutation.length && remainingUnknown > 0) {
    if (permutation[cursor] === -1) {
      if (remainingUnknown === 2) last = cursor;
      permutation[cursor] = available[(remainingUnknown -= 1)] ?? 0;
    }
    cursor += 1;
  }

  const resolvedParity = getNParity(getNPerm(permutation, permutation.length), permutation.length);
  if (resolvedParity === 1 - parity && last !== -1) {
    const swapIndex = cursor - 1;
    const value = permutation[swapIndex] ?? 0;
    permutation[swapIndex] = permutation[last] ?? 0;
    permutation[last] = value;
  }

  return resolvedParity;
};

const materializeState = (
  state: Exclude<RandomStatePart, null>,
  length: number,
): number[] => {
  if (state === STATE_SOLVED) return Array.from({ length }, (_, index) => index);

  return [...state];
};

const MOVE_CUBES = [
  CubieCube.fromCoordinates(15120, 0, 119750400, 0),
  CubieCube.solved(),
  CubieCube.solved(),
  CubieCube.fromCoordinates(21021, 1494, 323403417, 0),
  CubieCube.solved(),
  CubieCube.solved(),
  CubieCube.fromCoordinates(8064, 1236, 29441808, 550),
  CubieCube.solved(),
  CubieCube.solved(),
  CubieCube.fromCoordinates(9, 0, 5880, 0),
  CubieCube.solved(),
  CubieCube.solved(),
  CubieCube.fromCoordinates(1230, 412, 2949660, 0),
  CubieCube.solved(),
  CubieCube.solved(),
  CubieCube.fromCoordinates(224, 137, 328552, 137),
  CubieCube.solved(),
  CubieCube.solved(),
];

for (let axis = 0; axis < 18; axis += 3) {
  MOVE_CUBES[axis + 1] = multiply(MOVE_CUBES[axis], MOVE_CUBES[axis]);
  MOVE_CUBES[axis + 2] = multiply(MOVE_CUBES[axis + 1], MOVE_CUBES[axis]);
}

const parseMoveIndices = (scramble: string): number[] => {
  const moves: number[] = [];
  let axis = -1;

  for (const character of scramble) {
    switch (character) {
      case 'U':
        axis = 0;
        break;
      case 'R':
        axis = 3;
        break;
      case 'F':
        axis = 6;
        break;
      case 'D':
        axis = 9;
        break;
      case 'L':
        axis = 12;
        break;
      case 'B':
        axis = 15;
        break;
      case '2':
        axis += 1;
        break;
      case "'":
        axis += 2;
        break;
      case ' ':
        if (axis !== -1) moves.push(axis);
        axis = -1;
        break;
      default:
        break;
    }
  }

  if (axis !== -1) moves.push(axis);

  return moves;
};

function multiply(left: CubieCube, right: CubieCube): CubieCube {
  const cp = Array<number>(8);
  const co = Array<number>(8);
  const ep = Array<number>(12);
  const eo = Array<number>(12);

  for (let corner = 0; corner < 8; corner += 1) {
    const rightCorner = right.cp[corner] ?? 0;
    cp[corner] = left.cp[rightCorner] ?? 0;
    co[corner] = ((left.co[rightCorner] ?? 0) + (right.co[corner] ?? 0)) % 3;
  }

  for (let edge = 0; edge < 12; edge += 1) {
    const rightEdge = right.ep[edge] ?? 0;
    ep[edge] = left.ep[rightEdge] ?? 0;
    eo[edge] = (right.eo[edge] ?? 0) ^ (left.eo[rightEdge] ?? 0);
  }

  return new CubieCube(cp, co, ep, eo);
}
