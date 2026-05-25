import type { WcaEventId } from '../events.js';

export interface TnoodleScrambleFixture {
  readonly eventId: WcaEventId;
  readonly scramble: string;
  readonly note: string;
}

export const TNOODLE_SCRAMBLE_FIXTURES = [
  { eventId: '333', scramble: "R U R' U'", note: 'basic 3x3 notation' },
  {
    eventId: 'clock',
    scramble:
      'UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+ y2 U1- R2- D3+ L4- ALL5-',
    note: 'clock WCA grammar',
  },
  {
    eventId: 'minx',
    scramble: "R++ D-- R-- D++ R++ D++ R-- D-- R++ D-- U'",
    note: 'megaminx line grammar',
  },
  {
    eventId: 'sq1',
    scramble: '(3,-2) / (0,3) /',
    note: 'square-1 tuple and slash grammar',
  },
] as const satisfies readonly TnoodleScrambleFixture[];
