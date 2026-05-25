import { describe, expect, it } from 'vitest';
import {
  applyPyraminxMove,
  createSolvedPyraminxState,
  parsePyraminxAlgorithm,
} from '@cubekit/scramble-puzzle';
import { renderPyraminxState } from './pyraminx.js';

describe('renderPyraminxState', () => {
  it('renders solved Pyraminx state SVG', () => {
    expect(renderPyraminxState(createSolvedPyraminxState())).toContain('<svg');
  });

  it('uses the TNoodle preferred Pyraminx viewbox', () => {
    const svg = renderPyraminxState(createSolvedPyraminxState());

    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="170"');
    expect(svg).toContain('viewBox="0 0 200 170"');
  });

  it('renders four faces as nine path stickers each', () => {
    const svg = renderPyraminxState(createSolvedPyraminxState());

    expect(svg.match(/<path/g)?.length).toBe(36);
  });

  it('renders moved stickers with Pyraminx colors', () => {
    const [move] = parsePyraminxAlgorithm('U');
    const moved = applyPyraminxMove(createSolvedPyraminxState(), move);
    const svg = renderPyraminxState(moved);

    expect(svg).toContain('#0000ff');
  });
});
