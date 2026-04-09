import { describe, expect, it } from 'vitest';
import { generate } from '../../src/generators/index';
import type { WcaEvent } from '../../src/types';

const ALL_EVENTS: WcaEvent[] = [
  '333',
  '222',
  '444',
  '555',
  '666',
  '777',
  '333bf',
  '333fm',
  '333oh',
  '444bf',
  '555bf',
  'minx',
  'pyram',
  'sq1',
  'skewb',
  'clock',
];

describe('all WCA events', () => {
  for (const event of ALL_EVENTS) {
    it(`${event}: generates a non-empty scramble string`, () => {
      const scramble = generate(event);
      expect(typeof scramble).toBe('string');
      expect(scramble.length).toBeGreaterThan(0);
    });
  }

  it('generates different scrambles on repeated calls (randomness)', () => {
    const results = new Set(Array.from({ length: 20 }, () => generate('333')));
    expect(results.size).toBeGreaterThan(10);
  });
});
