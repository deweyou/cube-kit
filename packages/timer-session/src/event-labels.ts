import type { WcaEventId } from '@cubegin/scramble-puzzle';

export const WCA_EVENT_LABELS: Record<WcaEventId, string> = {
  '333': '3×3×3',
  '222': '2×2×2',
  '444': '4×4×4',
  '555': '5×5×5',
  '666': '6×6×6',
  '777': '7×7×7',
  '333bld': '3BLD',
  '333fm': 'FMC',
  '333oh': '单手',
  clock: 'Clock',
  minx: 'Megaminx',
  pyram: 'Pyraminx',
  skewb: 'Skewb',
  sq1: 'SQ-1',
  '444bld': '4BLD',
  '555bld': '5BLD',
  '333mbld': 'Multi',
};

export const getWcaEventLabel = (eventId: WcaEventId): string => WCA_EVENT_LABELS[eventId];
