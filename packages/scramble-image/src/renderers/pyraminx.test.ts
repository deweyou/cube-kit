import { describe, expect, it } from 'vitest';
import {
  applyPyraminxMove,
  createSolvedPyraminxState,
  parsePyraminxAlgorithm,
  type PyraminxState,
} from '@cubegin/scramble-puzzle';
import { renderPyraminxState } from './pyraminx.js';

const countFill = (svg: string, color: string): number =>
  svg.match(new RegExp(`fill="${color}"`, 'g'))?.length ?? 0;

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

  it('renders explicit sticker outlines', () => {
    const svg = renderPyraminxState(createSolvedPyraminxState());

    expect(svg).toContain('stroke="#000000" stroke-width="1.25" stroke-linejoin="round"');
  });

  it('renders moved stickers with Pyraminx colors', () => {
    const [move] = parsePyraminxAlgorithm('U');
    const moved = applyPyraminxMove(createSolvedPyraminxState(), move);
    const svg = renderPyraminxState(moved);

    expect(svg).toContain('#0000ff');
  });

  it('applies custom face colors', () => {
    const svg = renderPyraminxState(createSolvedPyraminxState(), {
      F: '#101010',
      D: '#202020',
      L: '#303030',
      R: '#404040',
    });

    expect(svg).toContain('fill="#101010"');
    expect(svg).toContain('fill="#202020"');
    expect(svg).toContain('fill="#303030"');
    expect(svg).toContain('fill="#404040"');
  });

  it('uses the F color when a facelet index is outside the Pyraminx palette', () => {
    const image = Array.from({ length: 4 }, () => Array.from({ length: 9 }, () => 1));
    image[0][0] = 99;
    const state = { image } as PyraminxState;
    const svg = renderPyraminxState(state, { F: '#123456', D: '#654321' });

    expect(countFill(svg, '#123456')).toBe(1);
  });
});
