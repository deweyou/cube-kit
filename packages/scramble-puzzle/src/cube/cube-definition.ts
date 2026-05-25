import { applyAlgorithm } from '../algorithm.js';
import type { WcaEventId } from '../events.js';
import type { PuzzleDefinition } from '../puzzle-definition.js';
import type { CubeMove } from './cube-move.js';
import { parseCubeAlgorithm } from './cube-parser.js';
import {
  applyCubeMove,
  areCubeStatesEqual,
  createSolvedCubeState,
  type CubeState,
} from './cube-state.js';

export const createCubeDefinition = (
  size: number,
  eventIds: readonly WcaEventId[],
): PuzzleDefinition<CubeState, CubeMove> => {
  const definition: PuzzleDefinition<CubeState, CubeMove> = {
    id: `cube-${size}`,
    eventIds,
    createSolvedState: () => createSolvedCubeState(size),
    parseAlgorithm: parseCubeAlgorithm,
    applyMove: applyCubeMove,
    applyAlgorithm: (state, algorithm) =>
      applyAlgorithm(definition, state, algorithm),
    isSolved: (state) => areCubeStatesEqual(state, createSolvedCubeState(size)),
  };

  return definition;
};
