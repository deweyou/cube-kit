import { applyAlgorithm } from '../algorithm.js';
import type { PuzzleDefinition } from '../puzzle-definition.js';
import { parseClockAlgorithm, type ClockMove } from './clock-parser.js';
import {
  applyClockMove,
  areClockStatesEqual,
  createSolvedClockState,
  type ClockState,
} from './clock-state.js';

export const createClockDefinition = (): PuzzleDefinition<ClockState, ClockMove> => {
  const definition: PuzzleDefinition<ClockState, ClockMove> = {
    id: 'clock',
    eventIds: ['clock'],
    createSolvedState: createSolvedClockState,
    parseAlgorithm: parseClockAlgorithm,
    applyMove: applyClockMove,
    applyAlgorithm: (state, algorithm) => applyAlgorithm(definition, state, algorithm),
    isSolved: (state) => areClockStatesEqual(state, createSolvedClockState()),
  };

  return definition;
};
