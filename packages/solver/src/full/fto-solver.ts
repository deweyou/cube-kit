import {
  createFtoCubieFromFacelets,
  createFtoCubieFromState,
  createFtoDefinition,
  FtoCubie,
  FTO_MOVE_CUBIES,
  type FtoState,
} from '@cubegin/scramble-puzzle';
import {
  bitCount,
  CoordinateSearcher,
  createMoveHash,
  createPruningTable,
  MultisetCoordinate,
  type MoveHash,
  type SearchMove,
} from './fto-search.js';

const ERROR_PREFIX = '@cubegin/solver';
const PHASE_1_MOVES = [0, 2, 22, 6, 16, 10, 12, 14] as const;
const PHASE_2_MOVES = [0, 12, 14, 8, 10] as const;
const PHASE_3_MOVES = [8, 10, 12, 14] as const;
const PHASE_1_SOLUTION_COUNT = 1_000;
const PHASE_2_EDGE_RL_MAX_DEPTH = 11;
const MOVE_NAMES = [
  'U',
  "U'",
  'F',
  "F'",
  'BR',
  "BR'",
  'BL',
  "BL'",
  'D',
  "D'",
  'B',
  "B'",
  'R',
  "R'",
  'L',
  "L'",
] as const;

const U = 0;
const F = 9;
const BR = 18;
const BL = 27;
const D = 36;
const B = 45;
const R = 54;
const L = 63;

const CORNER_EXPANSION_FACELETS = [
  [U + 2, R + 2, F + 2, L + 2],
  [U + 5, B + 7, BR + 5, R + 7],
  [U + 7, L + 5, BL + 7, B + 5],
  [BL + 2, D + 2, BR + 2, B + 2],
  [F + 5, D + 7, BL + 5, L + 7],
  [BR + 7, D + 5, F + 7, R + 5],
] as const;

const PHASE_2_NECESSARY_PRUNING = [
  0, 99, 3, 4, 5, 6, 8, 99, 2, 3, 4, 5, 6, 8, 1, 3, 4, 5, 6, 7, 8, 1, 3, 4, 5, 6, 7, 9, 99, 2, 3, 4,
  5, 6, 8, 2, 2, 4, 4, 5, 6, 8, 3, 3, 4, 5, 6, 7, 8, 3, 3, 4, 5, 6, 7, 9, 3, 3, 4, 5, 6, 7, 8, 4, 4,
  4, 5, 6, 7, 8, 4, 4, 5, 6, 7, 8, 9, 4, 4, 5, 6, 7, 8, 9, 4, 4, 5, 6, 7, 8, 9, 4, 4, 5, 6, 7, 8, 9,
  5, 5, 6, 7, 8, 9, 10, 5, 5, 6, 7, 8, 9, 10,
] as const;

interface SymmetryTables {
  readonly cubes: readonly FtoCubie[];
  readonly multiply: readonly (readonly number[])[];
  readonly leftDivide: readonly (readonly number[])[];
  readonly move: readonly (readonly number[])[];
  readonly tetrahedralCubes: readonly FtoCubie[];
}

interface FtoCoordinateTables {
  readonly symmetries: SymmetryTables;
  readonly phase1Edge: MoveHash;
  readonly phase1Rl: MoveHash;
  readonly phase1Pruning: Int8Array;
  readonly phase1Commuting: readonly number[];
  readonly phase2Edge: MoveHash;
  readonly phase2Rl: MoveHash;
  readonly phase2Corner: MoveHash;
  readonly phase2UfMove: readonly (readonly number[])[];
  readonly phase2UfBits: readonly number[];
  readonly phase2CornerBits: readonly number[];
  readonly phase2CornerRecolor: readonly (readonly number[])[];
  readonly phase2SymmetryMap: readonly number[];
  readonly phase2UfRawToStandard: readonly number[];
  readonly phase2UfCoordinate: MultisetCoordinate;
  readonly phase2EdgeRlPruning: Int8Array;
  readonly phase2Commuting: readonly number[];
  readonly phase3Edge: MoveHash;
  readonly phase3Corner: MoveHash;
  readonly phase3EdgePruning: Int8Array;
  readonly phase3CornerPruning: Int8Array;
  readonly phase3Commuting: readonly number[];
  readonly stats: FtoSolverInitializationStats;
}

interface Phase1Candidate {
  readonly cubie: FtoCubie;
  readonly moves: readonly number[];
  readonly leftSymmetry: number;
  readonly rightSymmetry: number;
}

interface Phase2Result {
  readonly cubie: FtoCubie;
  readonly moves: readonly number[];
  readonly candidate: Phase1Candidate;
}

export interface FtoSolverInitializationStats {
  readonly initializationMilliseconds: number;
  readonly estimatedTableBytes: number;
  readonly phase1CoordinateCount: number;
  readonly phase2CoordinateCount: number;
  readonly phase3CoordinateCount: number;
}

let cachedTables: FtoCoordinateTables | undefined;

export class FtoSolver {
  stateFromScramble(scramble: string): FtoState {
    const fto = createFtoDefinition();
    return fto.applyAlgorithm(fto.createSolvedState(), scramble);
  }

  solve(stateOrScramble: FtoState | string): string {
    const state =
      typeof stateOrScramble === 'string'
        ? this.stateFromScramble(stateOrScramble)
        : stateOrScramble;
    const fto = createFtoDefinition();
    if (fto.isSolved(state)) return '';
    const solution = solveCubie(createFtoCubieFromState(state));
    if (!fto.isSolved(fto.applyAlgorithm(state, solution))) {
      throw new Error(`${ERROR_PREFIX}: FTO solution did not restore the fixed color orientation`);
    }
    return solution;
  }

  scramble(state: FtoState): string {
    return invertAlgorithm(this.solve(state));
  }

  getInitializationStats(): FtoSolverInitializationStats {
    return getTables().stats;
  }
}

const solveCubie = (cubie: FtoCubie): string => {
  const tables = getTables();
  const phase1Candidates = solvePhase1(cubie, tables);
  const preferred = completeSolution(phase1Candidates, tables);
  if (isFixedSolved(applyMoves(cubie, preferred))) return formatMoves(preferred);

  const seenSymmetries = new Set<string>();
  const fixedOrientationFirst = [...phase1Candidates].sort(
    (left, right) =>
      Number(left.leftSymmetry !== left.rightSymmetry) -
      Number(right.leftSymmetry !== right.rightSymmetry),
  );
  for (const candidate of fixedOrientationFirst) {
    const symmetryKey = `${candidate.leftSymmetry}:${candidate.rightSymmetry}`;
    if (seenSymmetries.has(symmetryKey)) continue;
    seenSymmetries.add(symmetryKey);
    const moves = completeSolution([candidate], tables);
    if (isFixedSolved(applyMoves(cubie, moves))) return formatMoves(moves);
  }
  throw new Error(`${ERROR_PREFIX}: FTO solver could not restore the fixed color orientation`);
};

const completeSolution = (
  candidates: readonly Phase1Candidate[],
  tables: FtoCoordinateTables,
): readonly number[] => {
  const phase2 = solvePhase2(candidates, tables);
  return [...phase2.candidate.moves, ...phase2.moves, ...solvePhase3(phase2, tables)];
};

const applyMoves = (cubie: FtoCubie, moves: readonly number[]): FtoCubie =>
  moves.reduce((state, move) => FtoCubie.multiply(state, FTO_MOVE_CUBIES[move], null), cubie);

const isFixedSolved = (cubie: FtoCubie): boolean =>
  cubie.toFacelets().every((color, facelet) => color === Math.trunc(facelet / 9));

const getTables = (): FtoCoordinateTables => {
  cachedTables ??= createTables();
  return cachedTables;
};

const createTables = (): FtoCoordinateTables => {
  const start = performance.now();
  const symmetries = createSymmetryTables();
  const identity = new FtoCubie();

  const phase1Edge = createMoveHash(
    identity.ep,
    PHASE_1_MOVES,
    phase1EdgeHash,
    (permutation, move) => applyPermutationMove(permutation, move, 'ep'),
  );
  const phase1Rl = createMoveHash(identity.rl, PHASE_1_MOVES, phase1RlHash, (permutation, move) =>
    applyPermutationMove(permutation, move, 'rl'),
  );
  const phase1EdgeCount = moveHashSize(phase1Edge);
  const phase1RlCount = moveHashSize(phase1Rl);
  const phase1Pruning = createPruningTable(
    phase1EdgeCount * phase1RlCount,
    0,
    14,
    (coordinate, axis) => {
      const edge = coordinate % phase1EdgeCount;
      const rl = Math.trunc(coordinate / phase1EdgeCount);
      return (
        ((phase1Rl.moves[axis] as readonly number[])[rl] as number) * phase1EdgeCount +
        ((phase1Edge.moves[axis] as readonly number[])[edge] as number)
      );
    },
    PHASE_1_MOVES.length,
  );

  const phase2CornerBitsByHash = new Map<string, number>();
  const phase2Edge = createMoveHash(
    identity.ep,
    PHASE_2_MOVES,
    phase2EdgeHash,
    (permutation, move) => applyPermutationMove(permutation, move, 'ep'),
  );
  const phase2Rl = createMoveHash(identity.rl, PHASE_2_MOVES, phase2RlHash, (permutation, move) =>
    applyPermutationMove(permutation, move, 'rl'),
  );
  const phase2Corner = createMoveHash(
    identity,
    PHASE_2_MOVES,
    (state) => phase2CornerHash(state, phase2CornerBitsByHash),
    applyFullMove,
  );
  const phase2UfCoordinate = new MultisetCoordinate([3, 3, 3, 3]);
  const phase2UfRawToStandard: number[] = [];
  const phase2UfStandardToRaw: number[] = [];
  const phase2SymmetryMap: number[] = [];
  const phase2UfMove = PHASE_2_MOVES.map(() => [] as number[]);
  const phase2UfBits: number[] = [];
  const phase2CornerBits: number[] = [];
  const phase2CornerRecolor = symmetries.cubes.map(() => [] as number[]);

  for (let symmetry = 0; symmetry < symmetries.cubes.length; symmetry += 1) {
    const uf = (symmetries.cubes[symmetry] as FtoCubie).uf;
    const firstColor = Math.trunc(uf.indexOf(0) / 3);
    const secondColor = Math.trunc(uf.indexOf(3) / 3);
    phase2SymmetryMap[firstColor * 4 + secondColor] = symmetry;
  }

  standardCoordinates: for (let raw = 0; raw < 42_000; raw += 1) {
    const values = phase2UfCoordinate.set(raw);
    for (let index = 1; index < values.length; index += 1) {
      if ((values[index] as number) > 1) continue standardCoordinates;
      if (values[index] === 1) break;
    }
    phase2UfRawToStandard[raw] = phase2UfStandardToRaw.length;
    phase2UfStandardToRaw.push(raw);
  }

  for (let standard = 0; standard < phase2UfStandardToRaw.length; standard += 1) {
    const values = phase2UfCoordinate.set(phase2UfStandardToRaw[standard] as number);
    phase2UfBits[standard] = packTwoBitValues(values);
    for (let axis = 0; axis < PHASE_2_MOVES.length; axis += 1) {
      const moved = permute(
        values,
        (FTO_MOVE_CUBIES[PHASE_2_MOVES[axis] as number] as FtoCubie).uf,
      ).map((piece) => piece);
      const symmetry = standardizePhase2Uf(moved, phase2SymmetryMap, symmetries);
      const raw = phase2UfCoordinate.get(moved);
      (phase2UfMove[axis] as number[])[standard] =
        ((phase2UfRawToStandard[raw] as number) << 4) | symmetry;
    }
  }

  for (const [hash, coordinate] of phase2Corner.indexByHash) {
    if (typeof hash !== 'string') continue;
    phase2CornerBits[coordinate] = phase2CornerBitsByHash.get(hash) as number;
    for (let symmetry = 0; symmetry < symmetries.cubes.length; symmetry += 1) {
      const symmetryCubie = symmetries.cubes[symmetry] as FtoCubie;
      const cpco: number[] = [];
      for (let position = 0; position < 6; position += 1) {
        const piece = hash.charCodeAt(position);
        cpco[position] = symmetryCubie.cp[piece] as number;
        cpco[position + 6] = (symmetryCubie.co[piece] as number) ^ hash.charCodeAt(position + 6);
      }
      (phase2CornerRecolor[symmetry] as number[])[coordinate] = phase2Corner.indexByHash.get(
        charHash(cpco),
      ) as number;
    }
  }

  const phase2EdgeCount = moveHashSize(phase2Edge);
  const phase2RlCount = moveHashSize(phase2Rl);
  const phase2EdgeRlPruning = createPruningTable(
    phase2EdgeCount * phase2RlCount,
    0,
    PHASE_2_EDGE_RL_MAX_DEPTH - 2,
    (coordinate, axis) => {
      const edge = coordinate % phase2EdgeCount;
      const rl = Math.trunc(coordinate / phase2EdgeCount);
      return (
        ((phase2Rl.moves[axis] as readonly number[])[rl] as number) * phase2EdgeCount +
        ((phase2Edge.moves[axis] as readonly number[])[edge] as number)
      );
    },
    PHASE_2_MOVES.length,
  );

  const phase3Edge = createMoveHash(identity.ep, PHASE_3_MOVES, charHash, (permutation, move) =>
    applyPermutationMove(permutation, move, 'ep'),
  );
  const phase3Corner = createMoveHash(identity, PHASE_3_MOVES, phase3CornerHash, applyFullMove);
  const phase3EdgePruning = createPruningTable(
    moveHashSize(phase3Edge),
    0,
    14,
    (coordinate, axis) => (phase3Edge.moves[axis] as readonly number[])[coordinate] as number,
    PHASE_3_MOVES.length,
  );
  const phase3CornerPruning = createPruningTable(
    moveHashSize(phase3Corner),
    0,
    14,
    (coordinate, axis) => (phase3Corner.moves[axis] as readonly number[])[coordinate] as number,
    PHASE_3_MOVES.length,
  );

  const phase1Commuting = createCommutingMasks(PHASE_1_MOVES);
  const phase2Commuting = createCommutingMasks(PHASE_2_MOVES);
  const phase3Commuting = createCommutingMasks(PHASE_3_MOVES);
  const coordinateEntries =
    countMoveEntries(phase1Edge) +
    countMoveEntries(phase1Rl) +
    countMoveEntries(phase2Edge) +
    countMoveEntries(phase2Rl) +
    countMoveEntries(phase2Corner) +
    phase2UfMove.reduce((sum, moves) => sum + moves.length, 0) +
    phase2CornerRecolor.reduce((sum, coordinates) => sum + coordinates.length, 0) +
    countMoveEntries(phase3Edge) +
    countMoveEntries(phase3Corner);

  return {
    symmetries,
    phase1Edge,
    phase1Rl,
    phase1Pruning,
    phase1Commuting,
    phase2Edge,
    phase2Rl,
    phase2Corner,
    phase2UfMove,
    phase2UfBits,
    phase2CornerBits,
    phase2CornerRecolor,
    phase2SymmetryMap,
    phase2UfRawToStandard,
    phase2UfCoordinate,
    phase2EdgeRlPruning,
    phase2Commuting,
    phase3Edge,
    phase3Corner,
    phase3EdgePruning,
    phase3CornerPruning,
    phase3Commuting,
    stats: {
      initializationMilliseconds: performance.now() - start,
      estimatedTableBytes:
        coordinateEntries * 4 +
        phase1Pruning.byteLength +
        phase2EdgeRlPruning.byteLength +
        phase3EdgePruning.byteLength +
        phase3CornerPruning.byteLength,
      phase1CoordinateCount: phase1EdgeCount * phase1RlCount,
      phase2CoordinateCount:
        phase2EdgeCount * phase2RlCount + moveHashSize(phase2Corner) * phase2UfStandardToRaw.length,
      phase3CoordinateCount: moveHashSize(phase3Edge) + moveHashSize(phase3Corner),
    },
  };
};

const solvePhase1 = (cubie: FtoCubie, tables: FtoCoordinateTables): readonly Phase1Candidate[] => {
  const edgeCount = moveHashSize(tables.phase1Edge);
  const states: (readonly number[])[] = [];
  const symmetries: (readonly [number, number])[] = [];
  for (let left = 0; left < 12; left += 3) {
    const leftApplied = FtoCubie.multiply(tables.symmetries.cubes[left], cubie, null);
    let right = 0;
    let transformed = leftApplied;
    for (; right < 12; right += 1) {
      transformed = FtoCubie.multiply(leftApplied, tables.symmetries.cubes[right], null);
      if (transformed.ep[4] === 4) break;
    }
    const edge = tables.phase1Edge.indexByHash.get(phase1EdgeHash(transformed.ep));
    const rl = tables.phase1Rl.indexByHash.get(phase1RlHash(transformed.rl));
    if (edge === undefined || rl === undefined || right >= 12) {
      throw new Error(`${ERROR_PREFIX}: failed to normalize FTO phase 1 state`);
    }
    states.push([edge, rl]);
    symmetries.push([left, right]);
  }

  const candidates: Phase1Candidate[] = [];
  const searcher = new CoordinateSearcher({
    getPruning: (state) => {
      const coordinates = state as readonly number[];
      return tables.phase1Pruning[
        (coordinates[1] as number) * edgeCount + (coordinates[0] as number)
      ] as number;
    },
    move: (state, axis) => {
      const coordinates = state as readonly number[];
      return [
        (tables.phase1Edge.moves[axis] as readonly number[])[coordinates[0] as number] as number,
        (tables.phase1Rl.moves[axis] as readonly number[])[coordinates[1] as number] as number,
      ];
    },
    axisCount: PHASE_1_MOVES.length,
    commutingMoves: tables.phase1Commuting,
  });

  searcher.solveMulti(states, 0, 12, (solution, sourceIndex) => {
    candidates.push(
      processPhase1Solution(
        solution,
        symmetries[sourceIndex] as readonly [number, number],
        cubie,
        tables,
      ),
    );
    return candidates.length >= PHASE_1_SOLUTION_COUNT;
  });
  if (candidates.length === 0) {
    throw new Error(`${ERROR_PREFIX}: FTO phase 1 search failed`);
  }
  return candidates;
};

const processPhase1Solution = (
  solution: readonly SearchMove[],
  initialSymmetries: readonly [number, number],
  cubie: FtoCubie,
  tables: FtoCoordinateTables,
): Phase1Candidate => {
  const phaseMoves = solution.map(([axis, power]) => (PHASE_1_MOVES[axis] as number) + power);
  const standard = moveToStandard(phaseMoves, tables.symmetries);
  let transformed = cubie;
  const outputMoves: number[] = [];
  for (const move of standard.moves) {
    const outputMove =
      ((
        tables.symmetries.move[
          (tables.symmetries.leftDivide[0] as readonly number[])[initialSymmetries[1]] as number
        ] as readonly number[]
      )[move >> 1] as number) *
        2 +
      (move & 1);
    outputMoves.push(outputMove);
    transformed = FtoCubie.multiply(transformed, FTO_MOVE_CUBIES[outputMove], null);
  }
  const rightSymmetry = (tables.symmetries.leftDivide[initialSymmetries[1]] as readonly number[])[
    standard.rotation
  ] as number;
  transformed = FtoCubie.multiply(
    tables.symmetries.tetrahedralCubes[Math.trunc(initialSymmetries[0] / 12)],
    tables.symmetries.cubes[initialSymmetries[0] % 12],
    transformed,
    tables.symmetries.cubes[rightSymmetry],
    null,
  );
  return {
    cubie: transformed,
    moves: outputMoves,
    leftSymmetry: initialSymmetries[0],
    rightSymmetry,
  };
};

const solvePhase2 = (
  candidates: readonly Phase1Candidate[],
  tables: FtoCoordinateTables,
): Phase2Result => {
  const edgeCount = moveHashSize(tables.phase2Edge);
  const states = candidates.map((candidate) => {
    const edge = tables.phase2Edge.indexByHash.get(phase2EdgeHash(candidate.cubie.ep));
    const rl = tables.phase2Rl.indexByHash.get(phase2RlHash(candidate.cubie.rl));
    const corner = tables.phase2Corner.indexByHash.get(phase2CornerHash(candidate.cubie));
    if (edge === undefined || rl === undefined || corner === undefined) {
      throw new Error(`${ERROR_PREFIX}: FTO phase 2 coordinate is outside the subgroup`);
    }
    return [edge, rl, corner, getPhase2UfCoordinate(candidate.cubie.uf, tables)];
  });
  const searcher = new CoordinateSearcher({
    getPruning: (state) => {
      const coordinate = state as readonly number[];
      const uf = coordinate[3] as number;
      const recoloredCorner = (tables.phase2CornerRecolor[uf & 0xf] as readonly number[])[
        coordinate[2] as number
      ] as number;
      let differences =
        (tables.phase2UfBits[uf >> 4] as number) ^
        (tables.phase2CornerBits[recoloredCorner] as number);
      differences = (differences | (differences >> 1)) & 0x555555;
      const necessaryIndex =
        ((bitCount(differences & 0x3f) << 2) | bitCount(differences & 0xc0c0c0)) * 7 +
        bitCount(differences & 0x3f3f00);
      const edgeRl = tables.phase2EdgeRlPruning[
        (coordinate[1] as number) * edgeCount + (coordinate[0] as number)
      ] as number;
      return Math.max(
        Math.min(PHASE_2_EDGE_RL_MAX_DEPTH, edgeRl),
        PHASE_2_NECESSARY_PRUNING[necessaryIndex] as number,
      );
    },
    move: (state, axis) => {
      const coordinate = state as readonly number[];
      const movedUf = (tables.phase2UfMove[axis] as readonly number[])[
        (coordinate[3] as number) >> 4
      ] as number;
      const colorSymmetry = (tables.symmetries.multiply[movedUf & 0xf] as readonly number[])[
        (coordinate[3] as number) & 0xf
      ] as number;
      return [
        (tables.phase2Edge.moves[axis] as readonly number[])[coordinate[0] as number] as number,
        (tables.phase2Rl.moves[axis] as readonly number[])[coordinate[1] as number] as number,
        (tables.phase2Corner.moves[axis] as readonly number[])[coordinate[2] as number] as number,
        (movedUf & ~0xf) | colorSymmetry,
      ];
    },
    axisCount: PHASE_2_MOVES.length,
    commutingMoves: tables.phase2Commuting,
  });
  const result = searcher.solveMulti(states, 0, 25);
  if (result === undefined) throw new Error(`${ERROR_PREFIX}: FTO phase 2 search failed`);
  const candidate = candidates[result.sourceIndex] as Phase1Candidate;
  let transformed = candidate.cubie;
  const outputMoves: number[] = [];
  for (const [axis, power] of result.solution) {
    const phaseMove = (PHASE_2_MOVES[axis] as number) + power;
    outputMoves.push(
      ((
        tables.symmetries.move[
          (tables.symmetries.leftDivide[0] as readonly number[])[candidate.rightSymmetry] as number
        ] as readonly number[]
      )[phaseMove >> 1] as number) *
        2 +
        (phaseMove & 1),
    );
    transformed = FtoCubie.multiply(transformed, FTO_MOVE_CUBIES[phaseMove], null);
  }
  transformed = FtoCubie.multiply(
    tables.symmetries.tetrahedralCubes[
      (tables.symmetries.leftDivide[0] as readonly number[])[
        Math.trunc(candidate.leftSymmetry / 12)
      ] as number
    ],
    transformed,
    null,
  );
  return { cubie: transformed, moves: outputMoves, candidate };
};

const solvePhase3 = (phase2: Phase2Result, tables: FtoCoordinateTables): readonly number[] => {
  const edge = tables.phase3Edge.indexByHash.get(charHash(phase2.cubie.ep));
  const corner = tables.phase3Corner.indexByHash.get(phase3CornerHash(phase2.cubie));
  if (edge === undefined || corner === undefined) {
    throw new Error(`${ERROR_PREFIX}: FTO phase 3 coordinate is outside the subgroup`);
  }
  const searcher = new CoordinateSearcher({
    getPruning: (state) => {
      const coordinate = state as readonly number[];
      return Math.max(
        tables.phase3EdgePruning[coordinate[0] as number] as number,
        tables.phase3CornerPruning[coordinate[1] as number] as number,
      );
    },
    move: (state, axis) => {
      const coordinate = state as readonly number[];
      return [
        (tables.phase3Edge.moves[axis] as readonly number[])[coordinate[0] as number] as number,
        (tables.phase3Corner.moves[axis] as readonly number[])[coordinate[1] as number] as number,
      ];
    },
    axisCount: PHASE_3_MOVES.length,
    commutingMoves: tables.phase3Commuting,
  });
  return searcher.solve([edge, corner], 0, 25).map(([axis, power]) => {
    const phaseMove = (PHASE_3_MOVES[axis] as number) + power;
    return (
      ((
        tables.symmetries.move[
          (tables.symmetries.leftDivide[0] as readonly number[])[
            phase2.candidate.rightSymmetry
          ] as number
        ] as readonly number[]
      )[phaseMove >> 1] as number) *
        2 +
      (phaseMove & 1)
    );
  });
};

const createSymmetryTables = (): SymmetryTables => {
  const rotationU = new FtoCubie(
    [1, 2, 0, 4, 5, 3],
    [0, 0, 0, 0, 0, 0],
    [2, 0, 1, 5, 3, 4, 10, 11, 6, 7, 8, 9],
    [1, 2, 0, 7, 8, 6, 10, 11, 9, 4, 5, 3],
    [2, 0, 1, 8, 6, 7, 11, 9, 10, 5, 3, 4],
  );
  const rotationR = new FtoCubie(
    [5, 0, 4, 2, 3, 1],
    [1, 1, 0, 1, 1, 0],
    [6, 5, 7, 9, 2, 10, 11, 4, 3, 8, 1, 0],
    [5, 3, 4, 8, 6, 7, 2, 0, 1, 11, 9, 10],
    [4, 5, 3, 7, 8, 6, 1, 2, 0, 10, 11, 9],
  );
  const moveHashes = FTO_MOVE_CUBIES.map((move) => move.ep.join(','));
  const cubes: FtoCubie[] = [];
  const hashes: string[] = [];
  let current = new FtoCubie();
  for (let symmetry = 0; symmetry < 12; symmetry += 1) {
    cubes[symmetry] = current.clone();
    hashes[symmetry] = current.ep.join(',');
    current = FtoCubie.multiply(current, rotationU, null);
    if (symmetry % 3 === 2) {
      current = FtoCubie.multiply(current, rotationR, rotationU, null);
    }
    if (symmetry % 6 === 5) {
      current = FtoCubie.multiply(current, rotationU, rotationR, null);
    }
  }

  const multiply = Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => -1));
  const leftDivide = Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => -1));
  for (let left = 0; left < 12; left += 1) {
    for (let right = 0; right < 12; right += 1) {
      const product = FtoCubie.multiply(cubes[left], cubes[right], null);
      const result = hashes.indexOf(product.ep.join(','));
      (multiply[left] as number[])[right] = result;
      (leftDivide[result] as number[])[right] = left;
    }
  }

  const move = Array.from({ length: 12 }, () => Array.from({ length: 8 }, () => -1));
  for (let symmetry = 0; symmetry < 12; symmetry += 1) {
    for (let axis = 0; axis < 8; axis += 1) {
      const conjugated = FtoCubie.multiply(
        cubes[(leftDivide[0] as readonly number[])[symmetry] as number],
        FTO_MOVE_CUBIES[axis * 2],
        cubes[symmetry],
        null,
      );
      (move[symmetry] as number[])[axis] = moveHashes.indexOf(conjugated.ep.join(',')) >> 1;
    }
  }
  const tetrahedralCubes = cubes.map((cube) => new FtoCubie(cube.cp, cube.co, undefined, cube.uf));
  return { cubes, multiply, leftDivide, move, tetrahedralCubes };
};

const createCommutingMasks = (moves: readonly number[]): readonly number[] =>
  moves.map((move, leftAxis) => {
    let mask = 1 << leftAxis;
    for (let rightAxis = 0; rightAxis < leftAxis; rightAxis += 1) {
      const first = FtoCubie.multiply(
        FTO_MOVE_CUBIES[move],
        FTO_MOVE_CUBIES[moves[rightAxis] as number],
        null,
      );
      const second = FtoCubie.multiply(
        FTO_MOVE_CUBIES[moves[rightAxis] as number],
        FTO_MOVE_CUBIES[move],
        null,
      );
      if (first.equals(second)) mask |= 1 << rightAxis;
    }
    return mask;
  });

const applyPermutationMove = (
  permutation: readonly number[],
  move: number,
  family: 'ep' | 'rl',
): number[] => permute(permutation, (FTO_MOVE_CUBIES[move] as FtoCubie)[family]);

const applyFullMove = (cubie: FtoCubie, move: number): FtoCubie =>
  FtoCubie.multiply(cubie, FTO_MOVE_CUBIES[move], null);

const permute = (values: readonly number[], sourceByTarget: readonly number[]): number[] =>
  sourceByTarget.map((source) => values[source] as number);

const phase1EdgeHash = (edges: readonly number[]): number => {
  let hash = 0;
  let first = -1;
  for (let position = 0; position < edges.length; position += 1) {
    const edge = edges[position] as number;
    if (((0x38 >> edge) & 1) === 0) continue;
    if (first === -1) first = edge;
    hash += (((edge - first + 3) % 3) + 1) << (position * 2);
  }
  return hash;
};

const phase1RlHash = (centers: readonly number[]): number => {
  let hash = 0;
  for (let position = 0; position < centers.length; position += 1) {
    if ((centers[position] as number) < 3) hash |= 1 << position;
  }
  return hash;
};

const phase2EdgeHash = (edges: readonly number[]): number => {
  const edgeToGroup = [0, 1, 2, 3, 3, 3, 0, 1, 1, 2, 2, 0] as const;
  const groups = [
    [0, 6, 11],
    [1, 7, 8],
    [2, 9, 10],
    [3, 4, 5],
  ] as const;
  const offsets = [-1, -1, -1, -1];
  let hash = 0;
  for (let position = 0; position < edges.length; position += 1) {
    const edge = edges[position] as number;
    const group = edgeToGroup[edge] as number;
    const groupIndex = (groups[group] as readonly number[]).indexOf(edge);
    if (offsets[group] === -1) offsets[group] = groupIndex;
    hash += (group * 4 + ((groupIndex - (offsets[group] as number) + 3) % 3)) * 16 ** position;
  }
  return hash;
};

const phase2RlHash = (centers: readonly number[]): number => {
  let hash = 0;
  for (let position = 0; position < centers.length; position += 1) {
    hash |= Math.trunc((centers[position] as number) / 3) << (position * 2);
  }
  return hash;
};

const phase2CornerHash = (cubie: FtoCubie, centerBitsByHash?: Map<string, number>): string => {
  const hash = charHash([...cubie.cp, ...cubie.co]);
  if (centerBitsByHash !== undefined && !centerBitsByHash.has(hash)) {
    const facelets = cubie.toFacelets();
    fillCornerExpansion(facelets, cubie);
    centerBitsByHash.set(hash, phase2RlHash(createFtoCubieFromFacelets(facelets).uf));
  }
  return hash;
};

const fillCornerExpansion = (facelets: number[], cubie: FtoCubie): void => {
  for (let position = 0; position < CORNER_EXPANSION_FACELETS.length; position += 1) {
    const target = CORNER_EXPANSION_FACELETS[position] as readonly number[];
    const source = CORNER_EXPANSION_FACELETS[cubie.cp[position] as number] as readonly number[];
    const orientation = (cubie.co[position] as number) * 2;
    for (let sticker = 0; sticker < target.length; sticker += 1) {
      facelets[target[(sticker + orientation) % target.length] as number] = Math.trunc(
        (source[sticker] as number) / 9,
      );
    }
  }
};

const phase3CornerHash = (cubie: FtoCubie): string => charHash([...cubie.cp, ...cubie.co]);

const charHash = (values: readonly number[]): string => String.fromCharCode(...values);

const packTwoBitValues = (values: readonly number[]): number => {
  let packed = 0;
  for (let index = 0; index < values.length; index += 1) {
    packed |= (values[index] as number) << (index * 2);
  }
  return packed;
};

const standardizePhase2Uf = (
  centers: number[],
  symmetryMap: readonly number[],
  symmetries: SymmetryTables,
): number => {
  const firstColor = centers[0] as number;
  const secondColor = centers.find((color) => color !== firstColor);
  if (secondColor === undefined) throw new Error(`${ERROR_PREFIX}: invalid FTO center coordinate`);
  const symmetry = symmetryMap[firstColor * 4 + secondColor];
  if (symmetry === undefined) throw new Error(`${ERROR_PREFIX}: missing FTO center symmetry`);
  const symmetryCenters = (symmetries.cubes[symmetry] as FtoCubie).uf;
  for (let index = 0; index < centers.length; index += 1) {
    centers[index] = Math.trunc((symmetryCenters[(centers[index] as number) * 3] as number) / 3);
  }
  return symmetry;
};

const getPhase2UfCoordinate = (centers: readonly number[], tables: FtoCoordinateTables): number => {
  const colors = centers.map((piece) => Math.trunc(piece / 3));
  const symmetry = standardizePhase2Uf(colors, tables.phase2SymmetryMap, tables.symmetries);
  const raw = tables.phase2UfCoordinate.get(colors);
  const standard = tables.phase2UfRawToStandard[raw];
  if (standard === undefined) throw new Error(`${ERROR_PREFIX}: invalid FTO center coordinate`);
  return (standard << 4) | symmetry;
};

const moveToStandard = (
  moves: readonly number[],
  symmetries: SymmetryTables,
): { readonly moves: readonly number[]; readonly rotation: number } => {
  const wideToAxis = [4, 5, 3, 2] as const;
  const wideToRotation = [1, 10, 5, 11] as const;
  const standard: number[] = [];
  let symmetry = 0;
  for (const move of moves) {
    let rotation = 0;
    let axis = move >> 1;
    const power = move & 1;
    if (axis >= 8) {
      rotation = wideToRotation[axis - 8] as number;
      axis = wideToAxis[axis - 8] as number;
    }
    if (power === 0) {
      rotation = (symmetries.multiply[rotation] as readonly number[])[rotation] as number;
    }
    standard.push(((symmetries.move[symmetry] as readonly number[])[axis] as number) * 2 + power);
    symmetry = (symmetries.multiply[rotation] as readonly number[])[symmetry] as number;
  }
  return { moves: standard, rotation: symmetry };
};

const formatMoves = (moves: readonly number[]): string =>
  moves.map((move) => MOVE_NAMES[move]).join(' ');

const invertAlgorithm = (algorithm: string): string =>
  algorithm
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map((move) => (move.endsWith("'") ? move.slice(0, -1) : `${move}'`))
    .join(' ');

const moveHashSize = (table: MoveHash): number => table.indexByHash.size;

const countMoveEntries = (table: MoveHash): number =>
  table.moves.reduce((sum, moves) => sum + moves.length, 0);
