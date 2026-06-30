import { applyAlgorithm } from '../algorithm.js';
import type { PuzzleDefinition } from '../puzzle-definition.js';
import { parseFtoAlgorithm, type FtoMove } from './fto-parser.js';
import {
  applyFtoMove,
  areFtoStatesEqual,
  createSolvedFtoState,
  type FtoState,
} from './fto-state.js';

export const createFtoDefinition = (): PuzzleDefinition<FtoState, FtoMove> => {
  const definition: PuzzleDefinition<FtoState, FtoMove> = {
    id: 'face-turning-octahedron',
    eventIds: ['fto'],
    createSolvedState: createSolvedFtoState,
    parseAlgorithm: parseFtoAlgorithm,
    applyMove: applyFtoMove,
    applyAlgorithm: (state, algorithm) => applyAlgorithm(definition, state, algorithm),
    isSolved: (state) => areFtoStatesEqual(state, createSolvedFtoState()),
  };

  return definition;
};
