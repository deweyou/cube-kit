import { applyAlgorithm } from '../algorithm.js';
import type { PuzzleDefinition } from '../puzzle-definition.js';
import { parseSquareOneAlgorithm, type SquareOneMove } from './square1-parser.js';
import {
  applySquareOneMove,
  areSquareOneStatesEqual,
  createSolvedSquareOneState,
  type SquareOneState,
} from './square1-state.js';

export const createSquareOneDefinition = (): PuzzleDefinition<SquareOneState, SquareOneMove> => {
  const definition: PuzzleDefinition<SquareOneState, SquareOneMove> = {
    id: 'square1',
    eventIds: ['sq1'],
    createSolvedState: createSolvedSquareOneState,
    parseAlgorithm: parseSquareOneAlgorithm,
    applyMove: applySquareOneMove,
    applyAlgorithm: (state, algorithm) => applyAlgorithm(definition, state, algorithm),
    isSolved: (state) => areSquareOneStatesEqual(state, createSolvedSquareOneState()),
  };

  return definition;
};
