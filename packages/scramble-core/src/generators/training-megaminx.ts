import {
  createMegaminxDefinition,
  splitAlgorithm,
  type MegaminxState,
} from '@cubegin/scramble-puzzle';
import {
  MegaminxLsllSolver,
  SubgroupSolver,
  type MegaminxLsllState,
  type SubgroupGenerator,
} from '@cubegin/solver';
import { selectScrambleCase, type ScrambleCaseDefinition } from '../case-selection.js';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/scramble-core';

export type MegaminxTrainingScrambleTypeId = Extract<TrainingScrambleTypeId, `minx.${string}`>;

interface MegaminxTrainingCase extends ScrambleCaseDefinition {
  readonly createState: (random: RandomSource) => MegaminxLsllState;
}

const megaminx = createMegaminxDefinition();
const solvedMegaminx = megaminx.createSolvedState();
const labeledMegaminx: MegaminxState = {
  image: solvedMegaminx.image.map((face, faceIndex) =>
    face.map((_, stickerIndex) => faceIndex * face.length + stickerIndex),
  ),
};
const lsllSolver = new MegaminxLsllSolver();

const enumeratePermutations = (values: readonly number[]): readonly (readonly number[])[] => {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    enumeratePermutations(values.filter((_, candidateIndex) => candidateIndex !== index)).map(
      (suffix) => [value, ...suffix],
    ),
  );
};

const hasEvenParity = (permutation: readonly number[]): boolean => {
  let parity = 0;
  for (let left = 0; left < permutation.length; left += 1) {
    for (let right = left + 1; right < permutation.length; right += 1) {
      if ((permutation[left] as number) > (permutation[right] as number)) parity ^= 1;
    }
  }
  return parity === 0;
};

const EVEN_PERMUTATIONS = enumeratePermutations([0, 1, 2, 3, 4, 5]).filter(hasEvenParity);
const FIXED_LAST_PERMUTATIONS = enumeratePermutations([0, 1, 2, 3, 4])
  .filter(hasEvenParity)
  .map((permutation) => [...permutation, 5]);

const orientationFromCoordinate = (
  coordinate: number,
  freeCount: number,
  modulus: number,
  appendSolved: boolean,
): readonly number[] => {
  let remaining = coordinate;
  const orientation = Array.from({ length: freeCount + (appendSolved ? 1 : 0) }, () => 0);
  let sum = 0;
  for (let index = freeCount - 2; index >= 0; index -= 1) {
    orientation[index] = remaining % modulus;
    sum += orientation[index] as number;
    remaining = Math.floor(remaining / modulus);
  }
  orientation[freeCount - 1] = (modulus - (sum % modulus)) % modulus;
  return orientation;
};

const EDGE_LL_ORIENTATIONS = Array.from({ length: 16 }, (_, coordinate) =>
  orientationFromCoordinate(coordinate, 5, 2, true),
);
const CORNER_LL_ORIENTATIONS = Array.from({ length: 81 }, (_, coordinate) =>
  orientationFromCoordinate(coordinate, 5, 3, true),
);

const LSLL_CASES: readonly MegaminxTrainingCase[] = Array.from(
  { length: 6 * 6 * 2 * 3 },
  (_, coordinate) => {
    const edgeSlot = coordinate % 6;
    const cornerSlot = Math.floor(coordinate / 6) % 6;
    const edgeOrientation = Math.floor(coordinate / 36) % 2;
    const cornerOrientation = Math.floor(coordinate / 72) % 3;
    return {
      id: `minx.lsll.es${edgeSlot}-cs${cornerSlot}-eo${edgeOrientation}-co${cornerOrientation}`,
      createState: (random) => ({
        edgePermutation: randomEvenPermutationWithPiece(edgeSlot, 5, random),
        edgeOrientation: randomOrientationWithFixed(edgeSlot, edgeOrientation, 2, random),
        cornerPermutation: randomEvenPermutationWithPiece(cornerSlot, 5, random),
        cornerOrientation: randomOrientationWithFixed(cornerSlot, cornerOrientation, 3, random),
      }),
    };
  },
);

const PLL_CASES: readonly MegaminxTrainingCase[] = FIXED_LAST_PERMUTATIONS.flatMap(
  (edgePermutation, edgeIndex) =>
    FIXED_LAST_PERMUTATIONS.map((cornerPermutation, cornerIndex) => ({
      id: `minx.pll.e${edgeIndex}-c${cornerIndex}`,
      createState: () => ({
        edgePermutation,
        edgeOrientation: [0, 0, 0, 0, 0, 0],
        cornerPermutation,
        cornerOrientation: [0, 0, 0, 0, 0, 0],
      }),
    })),
).filter(
  (_, index) =>
    index !==
    FIXED_LAST_PERMUTATIONS.findIndex((permutation) =>
      permutation.every((piece, pieceIndex) => piece === pieceIndex),
    ) *
      FIXED_LAST_PERMUTATIONS.length +
      FIXED_LAST_PERMUTATIONS.findIndex((permutation) =>
        permutation.every((piece, pieceIndex) => piece === pieceIndex),
      ),
);

const LL_CASES: readonly MegaminxTrainingCase[] = EDGE_LL_ORIENTATIONS.flatMap(
  (edgeOrientation, edgeIndex) =>
    CORNER_LL_ORIENTATIONS.map((cornerOrientation, cornerIndex) => ({
      id: `minx.ll.eo${edgeIndex}-co${cornerIndex}`,
      createState: (random) => {
        let edgePermutation = randomFixedLastPermutation(random);
        let cornerPermutation = randomFixedLastPermutation(random);
        if (
          edgeIndex === 0 &&
          cornerIndex === 0 &&
          edgePermutation.every((piece, index) => piece === index) &&
          cornerPermutation.every((piece, index) => piece === index)
        ) {
          edgePermutation = FIXED_LAST_PERMUTATIONS[1] as readonly number[];
          cornerPermutation = FIXED_LAST_PERMUTATIONS[2] as readonly number[];
        }
        return { edgePermutation, edgeOrientation, cornerPermutation, cornerOrientation };
      },
    })),
);

const CASES_BY_TYPE: Readonly<
  Record<
    Extract<MegaminxTrainingScrambleTypeId, 'minx.lsll' | 'minx.pll' | 'minx.ll'>,
    readonly MegaminxTrainingCase[]
  >
> = {
  'minx.lsll': LSLL_CASES,
  'minx.pll': PLL_CASES,
  'minx.ll': LL_CASES,
};

const collectAffectedRegion = (algorithms: readonly string[]): ReadonlySet<string> => {
  const affected = new Set<string>();
  for (const algorithm of algorithms) {
    const state = megaminx.applyAlgorithm(labeledMegaminx, algorithm);
    state.image.forEach((face, faceIndex) => {
      face.forEach((sticker, stickerIndex) => {
        if (sticker !== labeledMegaminx.image[faceIndex]?.[stickerIndex]) {
          affected.add(`${faceIndex}:${stickerIndex}`);
        }
      });
    });
  }
  return affected;
};

const LSLL_MACROS = ['U', "R U R'", "F' U F"] as const;
const S2L_MACROS = ["R U R'", "F' U F", "L U L'", "BR U BR'", "BL' U BL"] as const;
const LSLL_REGION = collectAffectedRegion(LSLL_MACROS);
const S2L_REGION = collectAffectedRegion([
  ...S2L_MACROS,
  ...S2L_MACROS.flatMap((first) => S2L_MACROS.map((second) => `${first} ${second}`)),
]);

let ruSolver: SubgroupSolver<MegaminxState> | undefined;

export const generateMegaminxTrainingScramble = (
  scrambleTypeId: MegaminxTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  if (scrambleTypeId === 'minx.subset.ru') {
    return {
      scrambleTypeId,
      eventId: 'minx',
      scramble: generateRuScramble(options.random),
    };
  }
  if (scrambleTypeId === 'minx.s2l') {
    return {
      scrambleTypeId,
      eventId: 'minx',
      scramble: generateS2LScramble(options.random),
    };
  }

  const selectedCase = selectScrambleCase(CASES_BY_TYPE[scrambleTypeId], options, options.random);
  const state = selectedCase.createState(options.random);
  return {
    scrambleTypeId,
    eventId: 'minx',
    scramble: lsllSolver.scramble(state),
    caseId: selectedCase.id,
  };
};

export const getMegaminxTrainingCaseDefinitions = (
  scrambleTypeId: MegaminxTrainingScrambleTypeId,
): readonly ScrambleCaseDefinition[] => {
  if (scrambleTypeId === 'minx.subset.ru' || scrambleTypeId === 'minx.s2l') return [];
  return CASES_BY_TYPE[scrambleTypeId].map(({ id, naturalWeight }) =>
    Object.freeze({ id, ...(naturalWeight === undefined ? {} : { naturalWeight }) }),
  );
};

export const doesMegaminxTrainingStateMatch = (
  scrambleTypeId: MegaminxTrainingScrambleTypeId,
  scramble: string,
): boolean => {
  if (scrambleTypeId === 'minx.subset.ru') {
    return splitAlgorithm(scramble).every((move) => /^(?:U|R)(?:2'?|')?$/.test(move));
  }

  const fullState = megaminx.applyAlgorithm(solvedMegaminx, scramble);
  if (scrambleTypeId === 'minx.s2l') {
    return matchesSolvedOutside(fullState, S2L_REGION);
  }
  if (!matchesSolvedOutside(fullState, LSLL_REGION)) return false;

  const state = lsllSolver.stateFromScramble(scramble);
  if (scrambleTypeId === 'minx.lsll') return !isSolvedLsll(state);
  const lastPiecesFixed = state.edgePermutation[5] === 5 && state.cornerPermutation[5] === 5;
  if (!lastPiecesFixed) return false;
  if (scrambleTypeId === 'minx.pll') {
    return (
      state.edgeOrientation.every((orientation) => orientation === 0) &&
      state.cornerOrientation.every((orientation) => orientation === 0)
    );
  }
  return state.edgeOrientation[5] === 0 && state.cornerOrientation[5] === 0;
};

const generateRuScramble = (random: RandomSource): string => {
  ruSolver ??= createRuSolver();
  return ruSolver.sample(random, { minDepth: 4 }).scramble.join(' ');
};

const createRuSolver = (): SubgroupSolver<MegaminxState> => {
  const moves = ['U', 'U2', "U2'", "U'", 'R', 'R2', "R2'", "R'"];
  const generators: SubgroupGenerator<MegaminxState>[] = moves.map((move) => ({
    id: move,
    inverseId: inverseMegaminxMove(move),
    apply: (state) => megaminx.applyAlgorithm(state, move),
  }));
  return new SubgroupSolver({
    identity: solvedMegaminx,
    generators,
    stateKey: stateKey,
    maxDepth: 5,
    maxStates: 100_000,
  });
};

const generateS2LScramble = (random: RandomSource): string => {
  const blocks: string[] = [];
  for (let index = 0; index < 18; index += 1) {
    const macro = S2L_MACROS[drawRandomInt(random, S2L_MACROS.length)] as string;
    const suffix = ['', '2', "2'", "'"][drawRandomInt(random, 4)] as string;
    blocks.push(macro.replace(' U ', ` U${suffix} `));
  }
  return blocks.join(' ');
};

const randomEvenPermutationWithPiece = (
  position: number,
  piece: number,
  random: RandomSource,
): readonly number[] => {
  const candidates = EVEN_PERMUTATIONS.filter((permutation) => permutation[position] === piece);
  return candidates[drawRandomInt(random, candidates.length)] as readonly number[];
};

const randomFixedLastPermutation = (random: RandomSource): readonly number[] =>
  FIXED_LAST_PERMUTATIONS[
    drawRandomInt(random, FIXED_LAST_PERMUTATIONS.length)
  ] as readonly number[];

const randomOrientationWithFixed = (
  fixedPosition: number,
  fixedValue: number,
  modulus: number,
  random: RandomSource,
): readonly number[] => {
  const orientation = Array.from({ length: 6 }, () => 0);
  orientation[fixedPosition] = fixedValue;
  const freePositions = orientation
    .map((_, index) => index)
    .filter((index) => index !== fixedPosition);
  let sum = fixedValue;
  for (let index = 0; index < freePositions.length - 1; index += 1) {
    const value = drawRandomInt(random, modulus);
    orientation[freePositions[index] as number] = value;
    sum += value;
  }
  orientation[freePositions.at(-1) as number] = (modulus - (sum % modulus)) % modulus;
  return orientation;
};

const matchesSolvedOutside = (state: MegaminxState, affected: ReadonlySet<string>): boolean =>
  state.image.every((face, faceIndex) =>
    face.every(
      (sticker, stickerIndex) =>
        affected.has(`${faceIndex}:${stickerIndex}`) ||
        sticker === solvedMegaminx.image[faceIndex]?.[stickerIndex],
    ),
  );

const isSolvedLsll = (state: MegaminxLsllState): boolean =>
  state.edgePermutation.every((piece, index) => piece === index) &&
  state.edgeOrientation.every((orientation) => orientation === 0) &&
  state.cornerPermutation.every((piece, index) => piece === index) &&
  state.cornerOrientation.every((orientation) => orientation === 0);

const inverseMegaminxMove = (move: string): string => {
  if (move.endsWith("2'")) return move.slice(0, -1);
  if (move.endsWith('2')) return `${move}'`;
  if (move.endsWith("'")) return move.slice(0, -1);
  return `${move}'`;
};

const stateKey = (state: MegaminxState): string => state.image.flatMap((face) => face).join(',');

const drawRandomInt = (random: RandomSource, maxExclusive: number): number => {
  const value = random.nextInt(maxExclusive);
  if (!Number.isSafeInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError(
      `${ERROR_PREFIX}: Megaminx random source returned ${value} for max ${maxExclusive}`,
    );
  }
  return value;
};
