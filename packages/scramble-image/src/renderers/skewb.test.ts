import { describe, expect, it } from 'vitest';
import {
  applySkewbMove,
  createSolvedSkewbState,
  parseSkewbAlgorithm,
} from '@cubekit/scramble-puzzle';
import { renderSkewbState } from './skewb.js';

describe('renderSkewbState', () => {
  it('renders solved Skewb state SVG', () => {
    expect(renderSkewbState(createSolvedSkewbState())).toContain('<svg');
  });

  it('uses the TNoodle preferred Skewb viewbox', () => {
    const svg = renderSkewbState(createSolvedSkewbState());

    expect(svg).toContain('width="217"');
    expect(svg).toContain('height="187"');
    expect(svg).toContain('viewBox="0 0 217 187"');
  });

  it('renders six faces as five path stickers each', () => {
    const svg = renderSkewbState(createSolvedSkewbState());

    expect(svg.match(/<path/g)?.length).toBe(30);
  });

  it('renders moved stickers with Skewb colors', () => {
    const [move] = parseSkewbAlgorithm('R');
    const moved = applySkewbMove(createSolvedSkewbState(), move);
    const svg = renderSkewbState(moved);

    expect(svg).toContain('#ff8000');
  });
});
