export const WCA_EVENT_IDS = [
  '333',
  '222',
  '444',
  '555',
  '666',
  '777',
  '333bld',
  '333fm',
  '333oh',
  'clock',
  'minx',
  'pyram',
  'skewb',
  'sq1',
  '444bld',
  '555bld',
  '333mbld',
] as const;

export type WcaEventId = (typeof WCA_EVENT_IDS)[number];

export type PuzzleId = 'cube' | 'clock' | 'megaminx' | 'pyraminx' | 'skewb' | 'square1';

export interface WcaEventInfo {
  readonly id: WcaEventId;
  readonly label: string;
  readonly puzzleId: PuzzleId;
}

export const WCA_EVENT_INFO = Object.freeze({
  '333': { id: '333', label: '3x3x3 Cube', puzzleId: 'cube' },
  '222': { id: '222', label: '2x2x2 Cube', puzzleId: 'cube' },
  '444': { id: '444', label: '4x4x4 Cube', puzzleId: 'cube' },
  '555': { id: '555', label: '5x5x5 Cube', puzzleId: 'cube' },
  '666': { id: '666', label: '6x6x6 Cube', puzzleId: 'cube' },
  '777': { id: '777', label: '7x7x7 Cube', puzzleId: 'cube' },
  '333bld': { id: '333bld', label: '3x3 Blindfolded', puzzleId: 'cube' },
  '333fm': { id: '333fm', label: '3x3 Fewest Moves', puzzleId: 'cube' },
  '333oh': { id: '333oh', label: '3x3 One-Handed', puzzleId: 'cube' },
  clock: { id: 'clock', label: 'Clock', puzzleId: 'clock' },
  minx: { id: 'minx', label: 'Megaminx', puzzleId: 'megaminx' },
  pyram: { id: 'pyram', label: 'Pyraminx', puzzleId: 'pyraminx' },
  skewb: { id: 'skewb', label: 'Skewb', puzzleId: 'skewb' },
  sq1: { id: 'sq1', label: 'Square-1', puzzleId: 'square1' },
  '444bld': { id: '444bld', label: '4x4 Blindfolded', puzzleId: 'cube' },
  '555bld': { id: '555bld', label: '5x5 Blindfolded', puzzleId: 'cube' },
  '333mbld': { id: '333mbld', label: '3x3 Multi-Blind', puzzleId: 'cube' },
} satisfies Record<WcaEventId, WcaEventInfo>);
