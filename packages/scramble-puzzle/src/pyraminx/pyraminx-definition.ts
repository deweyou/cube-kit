import { applyAlgorithm } from '../algorithm.js';
import type { PuzzleDefinition } from '../puzzle-definition.js';
import { parsePyraminxAlgorithm, type PyraminxMove } from './pyraminx-parser.js';
import {
  applyPyraminxMove,
  arePyraminxStatesEqual,
  createSolvedPyraminxState,
  type PyraminxState,
} from './pyraminx-state.js';

export const createPyraminxDefinition = (): PuzzleDefinition<PyraminxState, PyraminxMove> => {
  const definition: PuzzleDefinition<PyraminxState, PyraminxMove> = {
    id: 'pyraminx',
    eventIds: ['pyram'],
    createSolvedState: createSolvedPyraminxState,
    parseAlgorithm: parsePyraminxAlgorithm,
    applyMove: applyPyraminxMove,
    applyAlgorithm: (state, algorithm) => applyAlgorithm(definition, state, algorithm),
    isSolved: (state) => arePyraminxStatesEqual(state, createSolvedPyraminxState()),
  };

  return definition;
};
