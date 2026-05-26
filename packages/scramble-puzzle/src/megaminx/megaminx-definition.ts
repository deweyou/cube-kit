import { applyAlgorithm } from '../algorithm.js';
import type { PuzzleDefinition } from '../puzzle-definition.js';
import { parseMegaminxAlgorithm, type MegaminxMove } from './megaminx-parser.js';
import {
  applyMegaminxMove,
  areMegaminxStatesEqual,
  createSolvedMegaminxState,
  type MegaminxState,
} from './megaminx-state.js';

export const createMegaminxDefinition = (): PuzzleDefinition<MegaminxState, MegaminxMove> => {
  const definition: PuzzleDefinition<MegaminxState, MegaminxMove> = {
    id: 'megaminx',
    eventIds: ['minx'],
    createSolvedState: createSolvedMegaminxState,
    parseAlgorithm: parseMegaminxAlgorithm,
    applyMove: applyMegaminxMove,
    applyAlgorithm: (state, algorithm) => applyAlgorithm(definition, state, algorithm),
    isSolved: (state) => areMegaminxStatesEqual(state, createSolvedMegaminxState()),
  };

  return definition;
};
