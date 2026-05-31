import { parsePyraminxAlgorithm, type PyraminxMove } from '@cubekit/scramble-puzzle';
import {
  InvalidSolverScrambleError,
  NoSolverSolutionError,
  UnknownSolverTargetError,
} from '../../errors.js';
import {
  binomial,
  indexToOrientation,
  indexToPermutation,
  orientationToIndex,
  permutationToIndex,
} from '../three-by-three/coordinate-utils.js';
import { countFaceTurnMetric, countQuarterTurnMetric } from '../three-by-three/metrics.js';
import type { PuzzleAssistOptions, PuzzleAssistResult, PuzzleAssistSolution } from '../../types.js';

const TARGETS = ['D', 'L', 'R', 'F'] as const;
const TARGET_MOVES = ['LRBU', 'ULBR', 'RUBL', 'LURB'] as const;
const SOLVED_EDGE_PERMUTATIONS = [0, 6, 8] as const;
const SUFFIXES = ['', "'"] as const;
const DEFAULT_MAX_DEPTH = 6;

type PyraminxVTarget = (typeof TARGETS)[number];
type PyraminxTables = Readonly<{
  edgePermutationMoves: readonly (readonly number[])[];
  edgeOrientationMoves: readonly (readonly number[])[];
  centerOrientationMoves: readonly (readonly number[])[];
  pruning: readonly number[];
}>;

let tables: PyraminxTables | undefined;

const cycleThree = (values: number[], first: number, second: number, third: number): void => {
  const value = values[first];
  values[first] = values[second];
  values[second] = values[third];
  values[third] = value;
};

const indexToCombination = (
  values: number[],
  permutation: readonly number[],
  combinationIndex: number,
  orientationIndex: number,
): void => {
  let selected = 2;
  let orientation = orientationIndex;

  for (let position = 0; position < 6; position += 1) {
    if (combinationIndex >= binomial(5 - position, selected)) {
      combinationIndex -= binomial(5 - position, selected);
      selected -= 1;
      values[position] = (permutation[selected] << 1) | (orientation & 1);
      orientation >>= 1;
    } else {
      values[position] = -1;
    }
  }
};

const getMove = (
  combination: number,
  permutationIndex: number,
  orientationIndex: number,
  move: number,
): number => {
  const values = Array<number>(6).fill(-1);
  const permutation = indexToPermutation(permutationIndex, 2, false);

  indexToCombination(values, permutation, combination, orientationIndex);

  switch (move) {
    case 0:
      cycleThree(values, 1, 5, 2);
      values[2] ^= 1;
      values[5] ^= 1;
      break;
    case 1:
      cycleThree(values, 0, 2, 4);
      values[0] ^= 1;
      values[2] ^= 1;
      break;
    case 2:
      cycleThree(values, 3, 4, 5);
      values[3] ^= 1;
      values[4] ^= 1;
      break;
    case 3:
      cycleThree(values, 0, 3, 1);
      values[1] ^= 1;
      values[3] ^= 1;
      break;
  }

  let nextCombination = 0;
  let nextOrientation = 0;
  let selected = 2;
  const nextPermutation = Array<number>(2).fill(0);

  for (let position = 0; position < 6; position += 1) {
    if (values[position] >= 0) {
      nextCombination += binomial(5 - position, selected);
      selected -= 1;
      nextPermutation[selected] = values[position] >> 1;
      nextOrientation |= (values[position] & 1) << (1 - selected);
    }
  }

  return (
    ((2 * nextCombination + permutationToIndex(nextPermutation, 2, false)) << 2) | nextOrientation
  );
};

const createTables = (): PyraminxTables => {
  const edgePermutationMoves = Array.from({ length: 30 }, () => Array<number>(4).fill(0));
  const edgeOrientationMoves = Array.from({ length: 60 }, () => Array<number>(4).fill(0));
  const centerOrientationMoves = Array.from({ length: 27 }, () => Array<number>(4).fill(0));
  const pruning = Array<number>(3240).fill(-1);

  for (let combination = 0; combination < 15; combination += 1) {
    for (let orientation = 0; orientation < 4; orientation += 1) {
      for (let move = 0; move < 4; move += 1) {
        const next = getMove(combination, orientation, orientation, move);
        edgeOrientationMoves[4 * combination + orientation][move] =
          (Math.floor(next / 8) << 2) | (next & 3);
        if (orientation < 2) edgePermutationMoves[2 * combination + orientation][move] = next >> 2;
      }
    }
  }

  for (let orientation = 0; orientation < 27; orientation += 1) {
    for (let move = 0; move < 4; move += 1) {
      const centers = indexToOrientation(orientation, 3, false);
      switch (move) {
        case 0:
          centers[1] = (centers[1] + 1) % 3;
          break;
        case 1:
          centers[2] = (centers[2] + 1) % 3;
          break;
        case 2:
          centers[0] = (centers[0] + 1) % 3;
          break;
      }
      centerOrientationMoves[orientation][move] = orientationToIndex(centers, 3, false);
    }
  }

  pruning[3 * 8] = 0;
  pruning[4 * 8] = 0;
  pruning[0] = 0;

  for (let depth = 0; depth < DEFAULT_MAX_DEPTH; depth += 1) {
    for (let center = 0; center < 27; center += 1) {
      for (let edgePermutation = 0; edgePermutation < 30; edgePermutation += 1) {
        for (let edgeOrientation = 0; edgeOrientation < 4; edgeOrientation += 1) {
          if (pruning[center * 120 + edgePermutation * 4 + edgeOrientation] !== depth) continue;

          for (let move = 0; move < 4; move += 1) {
            let nextCenter = center;
            let nextEdgePermutation = edgePermutation;
            let nextEdgeOrientation = edgeOrientation;

            for (let turn = 0; turn < 2; turn += 1) {
              nextCenter = centerOrientationMoves[nextCenter][move];
              nextEdgeOrientation =
                edgeOrientationMoves[
                  Math.floor(nextEdgePermutation / 2) * 4 + (nextEdgeOrientation % 4)
                ][move] % 4;
              nextEdgePermutation = edgePermutationMoves[nextEdgePermutation][move];

              const nextIndex = nextCenter * 120 + nextEdgePermutation * 4 + nextEdgeOrientation;
              if (pruning[nextIndex] < 0) pruning[nextIndex] = depth + 1;
            }
          }
        }
      }
    }
  }

  return {
    edgePermutationMoves,
    edgeOrientationMoves,
    centerOrientationMoves,
    pruning,
  };
};

const getTables = (): PyraminxTables => {
  tables ??= createTables();

  return tables;
};

const isKnownTarget = (target: string): target is PyraminxVTarget =>
  TARGETS.includes(target as PyraminxVTarget);

const resolveTargets = (targets: readonly string[] | undefined): readonly PyraminxVTarget[] => {
  if (targets === undefined) return TARGETS;

  return targets.map((target) => {
    if (!isKnownTarget(target)) throw new UnknownSolverTargetError('pyraminx-v', target);

    return target;
  });
};

const parsePyraminxSolverAlgorithm = (algorithm: string): readonly PyraminxMove[] => {
  try {
    return parsePyraminxAlgorithm(algorithm);
  } catch (error) {
    throw new InvalidSolverScrambleError(algorithm, error);
  }
};

const applyMoveToCoordinates = (
  targetIndex: number,
  move: PyraminxMove,
  coordinates: { center: number; edgePermutations: number[]; edgeOrientations: number[] },
): void => {
  if (move.type === 'tip') return;

  const moveIndex = TARGET_MOVES[targetIndex].indexOf(move.face);
  if (moveIndex < 0) return;

  const { centerOrientationMoves, edgeOrientationMoves, edgePermutationMoves } = getTables();

  for (let turn = 0; turn < move.amount; turn += 1) {
    coordinates.center = centerOrientationMoves[coordinates.center][moveIndex];
    for (let index = 0; index < coordinates.edgePermutations.length; index += 1) {
      const edgePermutation = coordinates.edgePermutations[index];
      const edgeOrientation = coordinates.edgeOrientations[index];
      coordinates.edgeOrientations[index] =
        edgeOrientationMoves[Math.floor(edgePermutation / 2) * 4 + (edgeOrientation % 4)][
          moveIndex
        ];
      coordinates.edgePermutations[index] = edgePermutationMoves[edgePermutation][moveIndex];
    }
  }
};

const getCoordinates = (algorithm: string, targetIndex: number) => {
  const coordinates = {
    center: 0,
    edgePermutations: [0, 6, 8],
    edgeOrientations: [0, 12, 16],
  };

  for (const move of parsePyraminxSolverAlgorithm(algorithm)) {
    applyMoveToCoordinates(targetIndex, move, coordinates);
  }

  return coordinates;
};

const isCoordinateSolved = (
  coordinates: {
    center: number;
    edgePermutations: readonly number[];
    edgeOrientations: readonly number[];
  },
  solvedIndex: number,
): boolean =>
  coordinates.edgePermutations[solvedIndex] === SOLVED_EDGE_PERMUTATIONS[solvedIndex] &&
  coordinates.edgeOrientations[solvedIndex] === SOLVED_EDGE_PERMUTATIONS[solvedIndex] * 2 &&
  coordinates.center === 0;

const search = (
  edgePermutation: number,
  edgeOrientation: number,
  center: number,
  solvedEdgePermutation: number,
  depth: number,
  lastMove: number,
  sequence: number[],
): boolean => {
  if (depth === 0) {
    return (
      edgePermutation === solvedEdgePermutation &&
      edgeOrientation === solvedEdgePermutation * 2 &&
      center === 0
    );
  }

  const { centerOrientationMoves, edgeOrientationMoves, edgePermutationMoves, pruning } =
    getTables();
  if (pruning[center * 120 + edgePermutation * 4 + (edgeOrientation % 4)] > depth) return false;

  for (let move = 0; move < 4; move += 1) {
    if (move === lastMove) continue;

    let nextEdgePermutation = edgePermutation;
    let nextEdgeOrientation = edgeOrientation;
    let nextCenter = center;

    for (let turn = 0; turn < 2; turn += 1) {
      nextEdgePermutation = edgePermutationMoves[nextEdgePermutation][move];
      nextEdgeOrientation = edgeOrientationMoves[nextEdgeOrientation][move];
      nextCenter = centerOrientationMoves[nextCenter][move];

      if (
        search(
          nextEdgePermutation,
          nextEdgeOrientation,
          nextCenter,
          solvedEdgePermutation,
          depth - 1,
          move,
          sequence,
        )
      ) {
        sequence[depth] = move * 2 + turn;
        return true;
      }
    }
  }

  return false;
};

const sequenceToAlgorithm = (
  targetIndex: number,
  depth: number,
  sequence: readonly number[],
): string => {
  const tokens: string[] = [];

  for (let index = depth; index > 0; index -= 1) {
    const move = sequence[index];
    tokens.push(`${TARGET_MOVES[targetIndex][Math.floor(move / 2)]}${SUFFIXES[move % 2]}`);
  }

  return tokens.join(' ');
};

const solveTarget = (
  scramble: string,
  target: PyraminxVTarget,
  maxDepth: number,
): PuzzleAssistSolution<'pyraminx-v'> => {
  const targetIndex = TARGETS.indexOf(target);
  const coordinates = getCoordinates(scramble, targetIndex);

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    for (let solvedIndex = 0; solvedIndex < SOLVED_EDGE_PERMUTATIONS.length; solvedIndex += 1) {
      const sequence = Array<number>(maxDepth + 1).fill(0);
      if (
        search(
          coordinates.edgePermutations[solvedIndex],
          coordinates.edgeOrientations[solvedIndex],
          coordinates.center,
          SOLVED_EDGE_PERMUTATIONS[solvedIndex],
          depth,
          -1,
          sequence,
        )
      ) {
        const solution = sequenceToAlgorithm(targetIndex, depth, sequence);

        return {
          method: 'pyraminx-v',
          target,
          targetLabel: target,
          setupRotation: '',
          solution,
          depth,
          metric: {
            ftm: countFaceTurnMetric(solution),
            qtm: countQuarterTurnMetric(solution),
          },
        };
      }
    }
  }

  throw new NoSolverSolutionError('pyraminx-v', target, maxDepth);
};

export const isPyraminxVSolved = (
  scramble: string,
  solution: Pick<PuzzleAssistSolution<'pyraminx-v'>, 'solution' | 'target'>,
): boolean => {
  if (!isKnownTarget(solution.target)) return false;

  const targetIndex = TARGETS.indexOf(solution.target);
  const coordinates = getCoordinates(
    [scramble.trim(), solution.solution.trim()].filter(Boolean).join(' '),
    targetIndex,
  );

  return SOLVED_EDGE_PERMUTATIONS.some((_, solvedIndex) =>
    isCoordinateSolved(coordinates, solvedIndex),
  );
};

export const solvePyraminxV = (
  scramble: string,
  options: PuzzleAssistOptions = {},
): PuzzleAssistResult<'pyraminx-v'> => {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const solutions = resolveTargets(options.targets).map((target) =>
    solveTarget(scramble, target, maxDepth),
  );

  return {
    method: 'pyraminx-v',
    scramble,
    solutions,
  };
};
