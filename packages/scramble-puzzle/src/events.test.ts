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
});
