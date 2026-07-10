import type { EventId } from '@cubegin/shared/events';

export interface CubePlayerPuzzleSupport {
  readonly type: 'cube';
  readonly size: 2 | 3 | 4 | 5 | 6 | 7;
}

export interface NonCubePlayerPuzzleSupport {
  readonly type: 'clock' | 'pyraminx' | 'skewb' | 'fto' | 'megaminx' | 'square1';
}

export interface UnsupportedPlayerPuzzleSupport {
  readonly type: 'unsupported';
}

export type PlayerPuzzleSupport =
  | CubePlayerPuzzleSupport
  | NonCubePlayerPuzzleSupport
  | UnsupportedPlayerPuzzleSupport;

const CUBE_SIZE_BY_EVENT: Readonly<Partial<Record<EventId, CubePlayerPuzzleSupport['size']>>> = {
  '222': 2,
  '333': 3,
  '333bld': 3,
  '333fm': 3,
  '333mbld': 3,
  '333oh': 3,
  '444': 4,
  '444bld': 4,
  '555': 5,
  '555bld': 5,
  '666': 6,
  '777': 7,
};

const NON_CUBE_PUZZLE_BY_EVENT: Readonly<Partial<Record<EventId, NonCubePlayerPuzzleSupport>>> = {
  clock: { type: 'clock' },
  fto: { type: 'fto' },
  minx: { type: 'megaminx' },
  pyram: { type: 'pyraminx' },
  sq1: { type: 'square1' },
  skewb: { type: 'skewb' },
};

export const getPlayerPuzzleSupport = (eventId: EventId): PlayerPuzzleSupport => {
  const size = CUBE_SIZE_BY_EVENT[eventId];

  if (size) return { type: 'cube', size };

  return NON_CUBE_PUZZLE_BY_EVENT[eventId] ?? { type: 'unsupported' };
};
