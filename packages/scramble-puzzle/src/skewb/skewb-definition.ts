import { applyAlgorithm } from '../algorithm.js';
import type { PuzzleDefinition } from '../puzzle-definition.js';
import { parseSkewbAlgorithm, type SkewbMove } from './skewb-parser.js';
import {
  applySkewbMove,
  areSkewbStatesEqual,
  createSolvedSkewbState,
  type SkewbState,
} from './skewb-state.js';

export const createSkewbDefinition = (): PuzzleDefinition<
  SkewbState,
  SkewbMove
> => {
  const definition: PuzzleDefinition<SkewbState, SkewbMove> = {
    id: 'skewb',
    eventIds: ['skewb'],
    createSolvedState: createSolvedSkewbState,
    parseAlgorithm: parseSkewbAlgorithm,
    applyMove: applySkewbMove,
    applyAlgorithm: (state, algorithm) =>
      applyAlgorithm(definition, state, algorithm),
    isSolved: (state) =>
      areSkewbStatesEqual(state, createSolvedSkewbState()),
  };

  return definition;
};
