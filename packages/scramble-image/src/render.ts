import {
  createClockDefinition,
  createCubeDefinition,
  createMegaminxDefinition,
  createPyraminxDefinition,
  createSkewbDefinition,
  createSquareOneDefinition,
  WCA_EVENT_INFO,
  type WcaEventId,
} from '@cubegin/scramble-puzzle';
import { renderClockState } from './renderers/clock.js';
import { renderCubeIsometric } from './renderers/cube-isometric.js';
import { renderCubeNet } from './renderers/cube-net.js';
import { renderMegaminxIsometricState } from './renderers/megaminx-isometric.js';
import { renderMegaminxState } from './renderers/megaminx.js';
import { renderPyraminxIsometricState } from './renderers/pyraminx-isometric.js';
import { renderPyraminxState } from './renderers/pyraminx.js';
import { renderSkewbIsometricState } from './renderers/skewb-isometric.js';
import { renderSkewbState } from './renderers/skewb.js';
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

export type ScrambleImageView = 'net' | 'isometric';

export interface ScrambleImageOptions {
  view?: ScrambleImageView;
}

export const renderScrambleImage = (
  eventId: WcaEventId,
  scramble: string,
  options: ScrambleImageOptions = {},
): string => {
  const eventInfo = WCA_EVENT_INFO[eventId];
  const view = options.view ?? 'net';

  switch (eventInfo.puzzleId) {
    case 'cube': {
      const size = CUBE_SIZE_BY_EVENT[eventId];

      if (!size) {
        throw new Error(`@cubegin/scramble-image: event '${eventId}' is not renderable yet`);
      }

      const cube = createCubeDefinition(size, [eventId]);
      const state = cube.applyAlgorithm(cube.createSolvedState(), scramble);

      return view === 'isometric' ? renderCubeIsometric(state) : renderCubeNet(state);
    }
    case 'clock': {
      const clock = createClockDefinition();
      const state = clock.applyAlgorithm(clock.createSolvedState(), scramble);

      return renderClockState(state);
    }
    case 'megaminx': {
      const megaminx = createMegaminxDefinition();
      const state = megaminx.applyAlgorithm(megaminx.createSolvedState(), scramble);

      return view === 'isometric'
        ? renderMegaminxIsometricState(state)
        : renderMegaminxState(state);
    }
    case 'pyraminx': {
      const pyraminx = createPyraminxDefinition();
      const state = pyraminx.applyAlgorithm(pyraminx.createSolvedState(), scramble);

      return view === 'isometric'
        ? renderPyraminxIsometricState(state)
        : renderPyraminxState(state);
    }
    case 'skewb': {
      const skewb = createSkewbDefinition();
      const state = skewb.applyAlgorithm(skewb.createSolvedState(), scramble);

      return view === 'isometric' ? renderSkewbIsometricState(state) : renderSkewbState(state);
    }
    case 'square1': {
      const squareOne = createSquareOneDefinition();
      const state = squareOne.applyAlgorithm(squareOne.createSolvedState(), scramble);

      return renderSquareOneState(state);
    }
  }
};
