import type { EventId } from '@cubegin/scramble-puzzle';
import { createClockPlayerAdapter } from './clock/clock-player-adapter.js';
import { createCubePlayerAdapter } from './cube/cube-player-adapter.js';
import { createFtoPlayerAdapter } from './fto/fto-player-adapter.js';
import { createMegaminxPlayerAdapter } from './megaminx/megaminx-player-adapter.js';
import type { PlayerPuzzleAdapter } from './puzzle-adapter.js';
import { createPyraminxPlayerAdapter } from './pyraminx/pyraminx-player-adapter.js';
import { createSkewbPlayerAdapter } from './skewb/skewb-player-adapter.js';
import { createSquareOnePlayerAdapter } from './square1/square1-player-adapter.js';

const CUBE_EVENT_GROUPS = [
  { eventIds: ['222'] as const, size: 2 },
  { eventIds: ['333', '333bld', '333fm', '333mbld', '333oh'] as const, size: 3 },
  { eventIds: ['444', '444bld'] as const, size: 4 },
  { eventIds: ['555', '555bld'] as const, size: 5 },
  { eventIds: ['666'] as const, size: 6 },
  { eventIds: ['777'] as const, size: 7 },
] as const;

const PLAYER_ADAPTERS: readonly PlayerPuzzleAdapter[] = [
  ...CUBE_EVENT_GROUPS.map(({ eventIds, size }) => createCubePlayerAdapter(size, eventIds)),
  createClockPlayerAdapter(),
  createPyraminxPlayerAdapter(),
  createSkewbPlayerAdapter(),
  createFtoPlayerAdapter(),
  createMegaminxPlayerAdapter(),
  createSquareOnePlayerAdapter(),
];

export const getPlayerPuzzleAdapter = (eventId: EventId): PlayerPuzzleAdapter | undefined =>
  PLAYER_ADAPTERS.find((adapter) => adapter.eventIds.includes(eventId));
