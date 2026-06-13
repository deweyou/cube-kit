import { describe, expect, it } from 'vitest';

import { listScrambleEvents, renderScrambleSvg } from './scramble.js';

describe('scramble handlers', () => {
  it('lists WCA events in a stable agent-friendly shape', () => {
    expect(listScrambleEvents().events.slice(0, 2)).toEqual([
      { id: '333', label: '3x3x3 Cube', puzzleId: 'cube' },
      { id: '222', label: '2x2x2 Cube', puzzleId: 'cube' },
    ]);
  });

  it('renders a scramble as SVG', () => {
    expect(renderScrambleSvg('333', "R U R' U'")).toMatchObject({
      eventId: '333',
      format: 'svg',
      svg: expect.stringContaining('<svg'),
    });
  });
});
