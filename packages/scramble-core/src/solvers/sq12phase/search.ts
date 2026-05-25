import {
  applySquareOneMove,
  areSquareOneStatesEqual,
  canSquareOneSlash,
  getSquareOneScrambleSuccessors,
  getSquareOneSlashabilityMoveCost,
  parseSquareOneAlgorithm,
  parseSquareOneMove,
  type SquareOneMove,
  type SquareOneState,
} from '@cubekit/scramble-puzzle';
import { FullCube } from './full-cube.js';
import { getShapeTables, popCount } from './shape.js';
import { createSquareCoordinate, getSquareTables } from './square.js';

export const INVERSE_SOLUTION = 0x2;

const ERROR_PREFIX = '@cubekit/scramble-core';
const WCA_TURN_METRIC = 1;
const METRIC = WCA_TURN_METRIC;
const PRUN_INC = METRIC === WCA_TURN_METRIC ? 2 : 1;
const MAX_OPT_LENGTH = 31;

const SQUARE_ONE_TURNS = [
  -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6,
] as const;

interface Phase1SearchState {
  shape: number;
  prunValue: number;
  maxLength: number;
  depth: number;
  lastMove: number;
}

interface Phase2SearchState {
  edge: number;
  corner: number;
  topEdgeFirst: boolean;
  botEdgeFirst: boolean;
  ml: number;
  maxLength: number;
  depth: number;
  lastMove: number;
}

interface BestMoveIndex {
  index: number;
  moveName: string | null;
}

export class Search {
  private readonly move = Array.from({ length: 100 }, () => 0);
  private readonly workingCube = new FullCube();
  private readonly square = createSquareCoordinate();
  private cube: FullCube | undefined;
  private length1 = 0;
  private moveLength1 = 0;
  private maxLength2 = 0;
  private verbose = 0;
  private solutionString: string | null = null;

  solution(cube: FullCube, verbose = 0): string | null {
    this.cube = cube;
    this.verbose = verbose;
    this.solutionString = null;

    const { shapePrun } = getShapeTables();
    const shape = cube.getShapeIdx();

    for (
      this.length1 = shapePrun[shape];
      this.length1 < 100;
      this.length1 += 1
    ) {
      this.maxLength2 = Math.min(31 - this.length1, 17);
      if (
        this.idaPhase1({
          shape,
          prunValue: shapePrun[shape],
          maxLength: this.length1,
          depth: 0,
          lastMove: -1,
        })
      ) {
        break;
      }
    }

    return this.solutionString;
  }

  solutionOpt(cube: FullCube, maxLength: number, verbose = 0): string | null {
    validateSolveLength(maxLength);

    this.cube = cube;
    this.verbose = verbose;
    this.solutionString = null;

    const { shapePrunOpt } = getShapeTables();
    const shape = cube.getShapeIdx();

    for (
      this.length1 = shapePrunOpt[shape] * PRUN_INC;
      this.length1 <= maxLength * PRUN_INC;
      this.length1 += PRUN_INC
    ) {
      if (
        this.phase1Opt({
          shape,
          prunValue: shapePrunOpt[shape],
          maxLength: this.length1,
          depth: 0,
          lastMove: -1,
          lastTurns: 0,
        })
      ) {
        break;
      }
    }

    return this.solutionString;
  }

  private phase1Opt({
    shape,
    maxLength,
    depth,
    lastMove,
    lastTurns,
  }: Phase1SearchState & { lastTurns: number }): boolean {
    const turnBalance =
      count0xf((lastTurns ^ ~0x000000) & 0xff00ff) -
      count0xf((lastTurns ^ ~0x666666) & 0xff00ff);
    if (
      turnBalance < 0 ||
      (turnBalance === 0 && ((lastTurns >> 20) & 0xf) >= 6)
    ) {
      return false;
    }

    const remainingMoves = Math.floor(maxLength / PRUN_INC);
    if (remainingMoves === 0) {
      this.moveLength1 = depth;
      if (this.isSolvedInPhase1()) return true;
      if (maxLength === 0) return false;
    }

    const { shapePrunOpt, topMove, bottomMove, twistMove } = getShapeTables();

    if (lastMove !== 0) {
      const nextShape = twistMove[shape];
      const prun = shapePrunOpt[nextShape];
      if (prun < remainingMoves) {
        this.move[depth] = 0;
        const nextMaxLength = (remainingMoves - 1) * PRUN_INC;
        if (
          this.phase1Opt({
            shape: nextShape,
            prunValue: prun,
            maxLength: nextMaxLength,
            depth: depth + 1,
            lastMove: 0,
            lastTurns: lastTurns << 8,
          })
        ) {
          return true;
        }
      }
    }

    if (lastMove <= 0) {
      let move = 0;
      let nextShape = shape;

      while (true) {
        const moved = move + topMove[nextShape];
        nextShape = moved >> 4;
        move = moved & 0xf;

        if (move >= 12) break;

        const prun = shapePrunOpt[nextShape];
        if (prun * PRUN_INC > maxLength + PRUN_INC - 1) {
          break;
        }
        if (prun * PRUN_INC < maxLength + PRUN_INC - 1) {
          this.move[depth] = move;
          if (
            this.phase1Opt({
              shape: nextShape,
              prunValue: prun,
              maxLength: maxLength - 1,
              depth: depth + 1,
              lastMove: 1,
              lastTurns: lastTurns | (move << 4),
            })
          ) {
            return true;
          }
        }
      }
    }

    if (lastMove <= 1) {
      let move = 0;
      let nextShape = shape;

      while (true) {
        const moved = move + bottomMove[nextShape];
        nextShape = moved >> 4;
        move = moved & 0xf;

        if (move >= 12) break;

        const prun = shapePrunOpt[nextShape];
        if (prun * PRUN_INC > maxLength + PRUN_INC - 1) {
          break;
        }
        if (prun * PRUN_INC < maxLength + PRUN_INC - 1) {
          this.move[depth] = -move;
          if (
            this.phase1Opt({
              shape: nextShape,
              prunValue: prun,
              maxLength: maxLength - 1,
              depth: depth + 1,
              lastMove: 2,
              lastTurns: lastTurns | move,
            })
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private idaPhase1({
    shape,
    prunValue,
    maxLength,
    depth,
    lastMove,
  }: Phase1SearchState): boolean {
    if (prunValue === 0 && maxLength < 4) {
      this.moveLength1 = depth;
      return maxLength === 0 && this.initPhase2();
    }

    const { shapePrun, topMove, bottomMove, twistMove } = getShapeTables();

    if (lastMove !== 0) {
      const nextShape = twistMove[shape];
      const prun = shapePrun[nextShape];
      if (prun < maxLength) {
        this.move[depth] = 0;
        if (
          this.idaPhase1({
            shape: nextShape,
            prunValue: prun,
            maxLength: maxLength - 1,
            depth: depth + 1,
            lastMove: 0,
          })
        ) {
          return true;
        }
      }
    }

    if (lastMove <= 0) {
      let move = 0;
      let nextShape = shape;

      while (true) {
        const moved = move + topMove[nextShape];
        nextShape = moved >> 4;
        move = moved & 0xf;

        if (move >= 12) break;

        const prun = shapePrun[nextShape];
        if (prun > maxLength) {
          break;
        }
        if (prun < maxLength) {
          this.move[depth] = move;
          if (
            this.idaPhase1({
              shape: nextShape,
              prunValue: prun,
              maxLength: maxLength - 1,
              depth: depth + 1,
              lastMove: 1,
            })
          ) {
            return true;
          }
        }
      }
    }

    if (lastMove <= 1) {
      let move = 0;
      let nextShape = shape;

      while (true) {
        const moved = move + bottomMove[nextShape];
        nextShape = moved >> 4;
        move = moved & 0xf;

        if (move >= 6) break;

        const prun = shapePrun[nextShape];
        if (prun > maxLength) {
          break;
        }
        if (prun < maxLength) {
          this.move[depth] = -move;
          if (
            this.idaPhase1({
              shape: nextShape,
              prunValue: prun,
              maxLength: maxLength - 1,
              depth: depth + 1,
              lastMove: 2,
            })
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private isSolvedInPhase1(): boolean {
    const cube = this.requireCube();
    this.workingCube.copy(cube);

    for (let index = 0; index < this.moveLength1; index += 1) {
      this.workingCube.doMove(this.move[index]);
    }

    if (!this.workingCube.isSolved()) return false;

    this.solutionString = this.move2string(this.moveLength1);
    return true;
  }

  private initPhase2(): boolean {
    const cube = this.requireCube();
    this.workingCube.copy(cube);

    for (let index = 0; index < this.moveLength1; index += 1) {
      this.workingCube.doMove(this.move[index]);
    }

    this.workingCube.getSquare(this.square);

    const { squarePrun } = getSquareTables();
    const edge = this.square.edgePerm;
    const corner = this.square.cornPerm;
    const ml = this.square.ml;
    const prun = Math.max(
      squarePrun[(edge << 1) | ml],
      squarePrun[(corner << 1) | ml],
    );

    for (let length = prun; length < this.maxLength2; length += 1) {
      if (
        this.idaPhase2({
          edge,
          corner,
          topEdgeFirst: this.square.topEdgeFirst,
          botEdgeFirst: this.square.botEdgeFirst,
          ml,
          maxLength: length,
          depth: this.moveLength1,
          lastMove: 0,
        })
      ) {
        this.solutionString = this.move2string(length + this.moveLength1);
        return true;
      }
    }

    return false;
  }

  private move2string(length: number): string {
    const outputMoves = Array.from({ length }, () => 0);

    if ((this.verbose & INVERSE_SOLUTION) !== 0) {
      for (let index = length - 1; index >= 0; index -= 1) {
        const move = this.move[index];
        outputMoves[length - 1 - index] =
          move > 0 ? 12 - move : move < 0 ? -12 - move : move;
      }
    } else {
      for (let index = 0; index < length; index += 1) {
        outputMoves[index] = this.move[index];
      }
    }

    let solution = '';
    let top = 0;
    let bottom = 0;

    for (const move of outputMoves) {
      if (move > 0) {
        top = move > 6 ? move - 12 : move;
      } else if (move < 0) {
        bottom = -move > 6 ? -move - 12 : -move;
      } else {
        if (top === 0 && bottom === 0) {
          solution += ' / ';
        } else {
          solution += `(${top},${bottom}) / `;
        }
        top = 0;
        bottom = 0;
      }
    }

    if (top !== 0 || bottom !== 0) {
      solution += `(${top},${bottom})`;
    }

    return solution;
  }

  private idaPhase2({
    edge,
    corner,
    topEdgeFirst,
    botEdgeFirst,
    ml,
    maxLength,
    depth,
    lastMove,
  }: Phase2SearchState): boolean {
    if (maxLength === 0 && !topEdgeFirst && botEdgeFirst) {
      return true;
    }

    const { squarePrun, twistMove, topMove, bottomMove } = getSquareTables();

    if (lastMove !== 0 && topEdgeFirst === botEdgeFirst) {
      const nextEdge = twistMove[edge];
      const nextCorner = twistMove[corner];

      if (
        squarePrun[(nextEdge << 1) | (1 - ml)] < maxLength &&
        squarePrun[(nextCorner << 1) | (1 - ml)] < maxLength
      ) {
        this.move[depth] = 0;
        if (
          this.idaPhase2({
            edge: nextEdge,
            corner: nextCorner,
            topEdgeFirst,
            botEdgeFirst,
            ml: 1 - ml,
            maxLength: maxLength - 1,
            depth: depth + 1,
            lastMove: 0,
          })
        ) {
          return true;
        }
      }
    }

    if (lastMove <= 0) {
      let nextTopEdgeFirst = !topEdgeFirst;
      let nextEdge = nextTopEdgeFirst ? topMove[edge] : edge;
      let nextCorner = nextTopEdgeFirst ? corner : topMove[corner];
      let move = nextTopEdgeFirst ? 1 : 2;
      let edgePrun = squarePrun[(nextEdge << 1) | ml];
      let cornerPrun = squarePrun[(nextCorner << 1) | ml];

      while (move < 12 && edgePrun <= maxLength && edgePrun <= maxLength) {
        if (edgePrun < maxLength && cornerPrun < maxLength) {
          this.move[depth] = move;
          if (
            this.idaPhase2({
              edge: nextEdge,
              corner: nextCorner,
              topEdgeFirst: nextTopEdgeFirst,
              botEdgeFirst,
              ml,
              maxLength: maxLength - 1,
              depth: depth + 1,
              lastMove: 1,
            })
          ) {
            return true;
          }
        }

        nextTopEdgeFirst = !nextTopEdgeFirst;
        if (nextTopEdgeFirst) {
          nextEdge = topMove[nextEdge];
          edgePrun = squarePrun[(nextEdge << 1) | ml];
          move += 1;
        } else {
          nextCorner = topMove[nextCorner];
          cornerPrun = squarePrun[(nextCorner << 1) | ml];
          move += 2;
        }
      }
    }

    if (lastMove <= 1) {
      let nextBotEdgeFirst = !botEdgeFirst;
      let nextEdge = nextBotEdgeFirst ? bottomMove[edge] : edge;
      let nextCorner = nextBotEdgeFirst ? corner : bottomMove[corner];
      let move = nextBotEdgeFirst ? 1 : 2;
      let edgePrun = squarePrun[(nextEdge << 1) | ml];
      let cornerPrun = squarePrun[(nextCorner << 1) | ml];

      while (
        move < (maxLength > 6 ? 6 : 12) &&
        edgePrun <= maxLength &&
        edgePrun <= maxLength
      ) {
        if (edgePrun < maxLength && cornerPrun < maxLength) {
          this.move[depth] = -move;
          if (
            this.idaPhase2({
              edge: nextEdge,
              corner: nextCorner,
              topEdgeFirst,
              botEdgeFirst: nextBotEdgeFirst,
              ml,
              maxLength: maxLength - 1,
              depth: depth + 1,
              lastMove: 2,
            })
          ) {
            return true;
          }
        }

        nextBotEdgeFirst = !nextBotEdgeFirst;
        if (nextBotEdgeFirst) {
          nextEdge = bottomMove[nextEdge];
          edgePrun = squarePrun[(nextEdge << 1) | ml];
          move += 1;
        } else {
          nextCorner = bottomMove[nextCorner];
          cornerPrun = squarePrun[(nextCorner << 1) | ml];
          move += 2;
        }
      }
    }

    return false;
  }

  private requireCube(): FullCube {
    if (!this.cube) {
      throw new Error(`${ERROR_PREFIX}: Square-1 search has no cube state`);
    }

    return this.cube;
  }
}

export const solveSquareOneStateIn = (
  state: SquareOneState,
  maxLength: number,
): string | null => {
  validateSolveLength(maxLength);

  if (!canSquareOneSlash(state)) {
    const bestSlashable = getBestSlashableSuccessor(state);
    if (!bestSlashable) return null;

    return solveWithSlashabilityIn(
      bestSlashable.state,
      maxLength,
      formatSquareOneMove(bestSlashable.move),
      state,
      maxLength - 1,
    );
  }

  const solution = new Search().solutionOpt(
    FullCube.fromSquareOneState(state),
    maxLength,
  );

  return solution === null ? null : solution.trim();
};

const solveWithSlashabilityIn = (
  state: SquareOneState,
  maxLength: number,
  slashabilityMove: string,
  preSlashabilityState: SquareOneState,
  lowerThreshold: number,
): string | null => {
  if (!canSquareOneSlash(state)) return null;
  if (maxLength < lowerThreshold) return null;

  const nextBestSolution = solveSquareOneStateIn(state, maxLength);
  if (nextBestSolution === null) return null;

  const algorithmBuilder = new SquareOneAlgorithmBuilder(preSlashabilityState);
  algorithmBuilder.appendMove(slashabilityMove);
  algorithmBuilder.appendAlgorithm(nextBestSolution);

  if (algorithmBuilder.totalCost > maxLength) {
    return solveWithSlashabilityIn(
      state,
      maxLength - 1,
      slashabilityMove,
      preSlashabilityState,
      lowerThreshold,
    );
  }

  return algorithmBuilder.toString();
};

class SquareOneAlgorithmBuilder {
  private readonly moves: string[] = [];
  private readonly states: SquareOneState[] = [];
  private unNormalizedState: SquareOneState;
  totalCost = 0;

  constructor(originalState: SquareOneState) {
    this.unNormalizedState = originalState;
    this.states.push(originalState);
  }

  appendAlgorithm(algorithm: string): void {
    for (const move of parseSquareOneAlgorithm(algorithm)) {
      this.appendMove(formatSquareOneMove(move));
    }
  }

  appendMove(newMove: string): void {
    const moveIndex = this.findBestIndexForMove(newMove);
    let oldCost: number;
    let newCost: number;

    if (moveIndex.index < this.moves.length) {
      oldCost = 1;
      if (moveIndex.moveName === null) {
        this.moves.splice(moveIndex.index, 1);
        this.states.splice(moveIndex.index + 1, 1);
        newCost = 0;
      } else {
        this.moves[moveIndex.index] = moveIndex.moveName;
        newCost = 1;
      }
    } else {
      oldCost = 0;
      newCost = 1;
      this.moves.push(assertMoveName(moveIndex.moveName));
      this.states.push(this.getState());
    }

    this.totalCost += newCost - oldCost;

    for (
      let index = moveIndex.index + 1;
      index < this.states.length;
      index += 1
    ) {
      this.states[index] = applyMoveName(
        this.states[index - 1],
        this.moves[index - 1],
      );
    }

    this.unNormalizedState = applyMoveName(this.unNormalizedState, newMove);
  }

  getState(): SquareOneState {
    return this.states[this.states.length - 1];
  }

  toString(): string {
    return this.moves.join(' ');
  }

  private findBestIndexForMove(moveName: string): BestMoveIndex {
    const newUnNormalizedState = applyMoveName(
      this.unNormalizedState,
      moveName,
    );
    if (areSquareOneStatesEqual(newUnNormalizedState, this.unNormalizedState)) {
      return { index: 0, moveName: null };
    }

    const canonicalMove = findCanonicalMoveToState(
      this.getState(),
      newUnNormalizedState,
    );
    if (canonicalMove === null) {
      throw new Error(
        `${ERROR_PREFIX}: could not canonicalize Square-1 move ${moveName}`,
      );
    }

    for (
      let lastMoveIndex = this.moves.length - 1;
      lastMoveIndex >= 0;
      lastMoveIndex -= 1
    ) {
      const lastMove = this.moves[lastMoveIndex];
      const stateBeforeLastMove = this.states[lastMoveIndex];
      if (!movesCommute(stateBeforeLastMove, lastMove, canonicalMove)) {
        break;
      }

      const stateAfterLastMove = this.states[lastMoveIndex + 1];
      const stateAfterBoth = applyMoveName(stateAfterLastMove, canonicalMove);

      if (areSquareOneStatesEqual(stateBeforeLastMove, stateAfterBoth)) {
        return { index: lastMoveIndex, moveName: null };
      }

      const alternateLastMove = findCanonicalMoveToState(
        stateBeforeLastMove,
        stateAfterBoth,
      );
      if (alternateLastMove !== null) {
        return { index: lastMoveIndex, moveName: alternateLastMove };
      }
    }

    return { index: this.moves.length, moveName: canonicalMove };
  }
}

const getBestSlashableSuccessor = (
  state: SquareOneState,
): { move: SquareOneMove; state: SquareOneState } | null => {
  let bestMove: { move: SquareOneMove; state: SquareOneState } | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (const successor of getSquareOneScrambleSuccessors(state)) {
    const cost = getSquareOneSlashabilityMoveCost(successor.move);
    if (cost === undefined || cost >= bestCost) continue;

    bestCost = cost;
    bestMove = successor;
  }

  return bestMove;
};

const findCanonicalMoveToState = (
  state: SquareOneState,
  targetState: SquareOneState,
): string | null => {
  for (const successor of getCanonicalMovesByState(state)) {
    if (areSquareOneStatesEqual(successor.state, targetState)) {
      return successor.moveName;
    }
  }

  return null;
};

const getCanonicalMovesByState = (
  state: SquareOneState,
): readonly { moveName: string; state: SquareOneState }[] => {
  const successors: { moveName: string; state: SquareOneState }[] = [];
  const seenStates = new Set<string>([getStateKey(state)]);

  for (const successor of getSuccessorsByName(state)) {
    const stateKey = getStateKey(successor.state);
    if (seenStates.has(stateKey)) continue;

    successors.push(successor);
    seenStates.add(stateKey);
  }

  return successors;
};

const getSuccessorsByName = (
  state: SquareOneState,
): readonly { moveName: string; state: SquareOneState }[] => {
  const successors: { moveName: string; state: SquareOneState }[] = [];

  for (const top of SQUARE_ONE_TURNS) {
    for (const bottom of SQUARE_ONE_TURNS) {
      if (top === 0 && bottom === 0) continue;

      const move = { type: 'tuple', top, bottom } as const;
      successors.push({
        moveName: formatSquareOneMove(move),
        state: applySquareOneMove(state, move),
      });
    }
  }

  if (canSquareOneSlash(state)) {
    const move = { type: 'slash' } as const;
    successors.push({
      moveName: '/',
      state: applySquareOneMove(state, move),
    });
  }

  return successors;
};

const movesCommute = (
  state: SquareOneState,
  firstMove: string,
  secondMove: string,
): boolean => {
  try {
    const firstThenSecond = applyMoveName(
      applyMoveName(state, firstMove),
      secondMove,
    );
    const secondThenFirst = applyMoveName(
      applyMoveName(state, secondMove),
      firstMove,
    );

    return areSquareOneStatesEqual(firstThenSecond, secondThenFirst);
  } catch {
    return false;
  }
};

const applyMoveName = (
  state: SquareOneState,
  moveName: string,
): SquareOneState => applySquareOneMove(state, parseSquareOneMove(moveName));

const formatSquareOneMove = (move: SquareOneMove): string =>
  move.type === 'slash' ? '/' : `(${move.top},${move.bottom})`;

const getStateKey = (state: SquareOneState): string =>
  `${state.sliceSolved ? 1 : 0}:${state.pieces.join(',')}`;

const assertMoveName = (moveName: string | null): string => {
  if (moveName === null) {
    throw new Error(`${ERROR_PREFIX}: Square-1 canonical move is missing`);
  }

  return moveName;
};

const validateSolveLength = (maxLength: number): void => {
  if (
    !Number.isSafeInteger(maxLength) ||
    maxLength < 0 ||
    maxLength > MAX_OPT_LENGTH
  ) {
    throw new RangeError(
      `${ERROR_PREFIX}: Square-1 solve length must be an integer from 0 to ${MAX_OPT_LENGTH}`,
    );
  }
};

const count0xf = (value: number): number => {
  let nibbles = value;
  nibbles &= nibbles >> 1;
  nibbles &= nibbles >> 2;

  return popCount(nibbles & 0x11111111);
};
