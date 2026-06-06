import { describe, expect, it } from 'vitest';
import {
  applySkewbMove,
  createSolvedSkewbState,
  parseSkewbAlgorithm,
  type SkewbState,
} from '@cubegin/scramble-puzzle';
import { renderSkewbState } from './skewb.js';

const countFill = (svg: string, color: string): number =>
  svg.match(new RegExp(`fill="${color}"`, 'g'))?.length ?? 0;

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

  it('applies custom face colors and sticker stroke width', () => {
    const svg = renderSkewbState(createSolvedSkewbState(), {
      U: '#101010',
      R: '#202020',
      F: '#303030',
      D: '#404040',
      L: '#505050',
      B: '#606060',
    });

    expect(svg).toContain('fill="#101010"');
    expect(svg).toContain('fill="#202020"');
    expect(svg).toContain('fill="#303030"');
    expect(svg).toContain('fill="#404040"');
    expect(svg).toContain('fill="#505050"');
    expect(svg).toContain('fill="#606060"');
    expect(svg).toContain('stroke="#000000" stroke-width="1.25" stroke-linejoin="round"');
  });

  it('uses the U color when a facelet index is outside the Skewb palette', () => {
    const image = Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => 1));
    image[0][0] = 99;
    const state = { image } as SkewbState;
    const svg = renderSkewbState(state, { U: '#123456', R: '#654321' });

    expect(countFill(svg, '#123456')).toBe(1);
  });
});
