import { describe, expect, it } from 'vitest';
import { WCA_EVENT_IDS, WCA_EVENT_INFO } from './events.js';

describe('WCA event metadata', () => {
  it('contains exactly the 17 supported WCA events', () => {
    expect(WCA_EVENT_IDS).toEqual([
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
    ]);
  });

  it('maps every event to a puzzle id', () => {
    for (const eventId of WCA_EVENT_IDS) {
      expect(WCA_EVENT_INFO[eventId].puzzleId).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('keeps WCA labels and puzzle routing stable', () => {
    expect(WCA_EVENT_INFO).toEqual({
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
    });
    expect(WCA_EVENT_IDS.map((eventId) => WCA_EVENT_INFO[eventId].id)).toEqual(WCA_EVENT_IDS);
    expect(Object.isFrozen(WCA_EVENT_INFO)).toBe(true);
  });
});
