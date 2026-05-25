import {
  createCubeDefinition,
  createSquareOneDefinition,
  type WcaEventId,
} from '@cubekit/scramble-puzzle';
import { renderCubeNet } from './renderers/cube-net.js';
import { renderSquareOneState } from './renderers/square1.js';

const CUBE_SIZE_BY_EVENT = {
  '222': 2,
  '333': 3,
  '333bld': 3,
  '333fm': 3,
  '333oh': 3,
  '333mbld': 3,
  '444': 4,
  '444bld': 4,
  '555': 5,
  '555bld': 5,
  '666': 6,
  '777': 7,
} as Partial<Record<WcaEventId, number>>;

export const renderScrambleImage = (eventId: WcaEventId, scramble: string): string => {
  if (eventId === 'sq1') {
    const squareOne = createSquareOneDefinition();
    const state = squareOne.applyAlgorithm(squareOne.createSolvedState(), scramble);

    return renderSquareOneState(state);
  }

  const size = CUBE_SIZE_BY_EVENT[eventId];

  if (!size) throw new Error(`@cubekit/scramble-image: event '${eventId}' is not renderable yet`);

  const cube = createCubeDefinition(size, [eventId]);
  const state = cube.applyAlgorithm(cube.createSolvedState(), scramble);

  return renderCubeNet(state);
};
