import { describe, expect, it } from 'vitest';

import { generateScrambles, listScrambleEvents, renderScrambleSvg } from './scramble.js';

describe('scramble handlers', () => {
  it('lists events in a stable agent-friendly shape', () => {
    expect(listScrambleEvents().events.slice(0, 2)).toEqual([
      { id: '333', label: '3x3x3 Cube', puzzleId: 'cube' },
      { id: '222', label: '2x2x2 Cube', puzzleId: 'cube' },
    ]);
    expect(listScrambleEvents().events.at(-1)).toEqual({
      id: 'fto',
      label: 'Face-Turning Octahedron',
      puzzleId: 'face-turning-octahedron',
    });
  });

  it('renders a scramble as SVG', () => {
    expect(renderScrambleSvg('333', "R U R' U'")).toMatchObject({
      eventId: '333',
      format: 'svg',
      svg: expect.stringContaining('<svg'),
    });
  });

  it('rejects unknown events with an agent hint', async () => {
    await expect(generateScrambles('777x')).rejects.toMatchObject({
      code: 'UNKNOWN_EVENT',
      exitCode: 3,
      hints: ['Run `cubegin scramble events --json`.'],
    });
  });

  it('rejects non-positive scramble counts', async () => {
    await expect(generateScrambles('333', { count: 0 })).rejects.toMatchObject({
      code: 'INVALID_COUNT',
      exitCode: 2,
    });
  });
});
