import { describe, expect, it } from 'vitest';
import { WCA_EVENT_IDS, type WcaEventId } from '@cubekit/scramble-puzzle';
import { renderScrambleImage } from './render.js';

const SAMPLE_SCRAMBLES = {
  '333': 'R U',
  '222': 'R U',
  '444': 'Rw U',
  '555': 'Rw U',
  '666': 'Rw U',
  '777': 'Rw U',
  '333bld': 'R U x',
  '333fm': "R' U' F R U F'",
  '333oh': 'R U',
  clock: 'UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+ y2 U1- R2- D3+ L4- ALL5-',
  minx: "R++ D-- R-- D++ R++ D++ R-- D-- R++ D-- U'",
  pyram: "U L R B u' l' r' b'",
  skewb: "R U L B R' U'",
  sq1: '(3,0) / (0,3) /',
  '444bld': 'Rw U x',
  '555bld': 'Rw U x',
  '333mbld': 'R U',
} as const satisfies Record<WcaEventId, string>;

describe('renderScrambleImage', () => {
  it('renders an SVG with a viewBox for every WCA event', () => {
    for (const eventId of WCA_EVENT_IDS) {
      const svg = renderScrambleImage(eventId, SAMPLE_SCRAMBLES[eventId]);

      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');
    }
  });
});
