import { describe, expect, it } from 'vitest';
import {
  applyMegaminxMove,
  createSolvedMegaminxState,
  parseMegaminxAlgorithm,
  type MegaminxState,
} from '@cubekit/scramble-puzzle';
import { renderMegaminxState } from './megaminx.js';

const countFill = (svg: string, color: string): number =>
  svg.match(new RegExp(`fill="${color}"`, 'g'))?.length ?? 0;

describe('renderMegaminxState', () => {
  it('renders solved Megaminx state SVG', () => {
    expect(renderMegaminxState(createSolvedMegaminxState())).toContain('<svg');
  });

  it('uses the locally cloned TNoodle preferred Megaminx viewbox', () => {
    const svg = renderMegaminxState(createSolvedMegaminxState());

    expect(svg).toContain('width="304"');
    expect(svg).toContain('height="146"');
    expect(svg).toContain('viewBox="0 0 304 146"');
  });

  it('renders all 12 faces as 11 stickers each', () => {
    const svg = renderMegaminxState(createSolvedMegaminxState());

    expect(svg.match(/<path/g)?.length).toBe(132);
  });

  it('renders moved stickers', () => {
    const [move] = parseMegaminxAlgorithm('R++');
    const moved = applyMegaminxMove(createSolvedMegaminxState(), move);
    const svg = renderMegaminxState(moved);

    expect(svg).toContain('#88ddff');
  });

  it('labels only the orientation faces', () => {
    const svg = renderMegaminxState(createSolvedMegaminxState());

    expect(svg.match(/<text\b/g)?.length).toBe(2);
    expect(svg).toContain('>U</text>');
    expect(svg).toContain('>F</text>');
  });

  it('applies custom face colors', () => {
    const svg = renderMegaminxState(createSolvedMegaminxState(), {
      U: '#101010',
      BL: '#202020',
      DL: '#303030',
    });

    expect(svg).toContain('fill="#101010"');
    expect(svg).toContain('fill="#202020"');
    expect(svg).toContain('fill="#303030"');
  });

  it('uses the U color when a facelet index is outside the Megaminx palette', () => {
    const image = Array.from({ length: 12 }, () => Array.from({ length: 11 }, () => 1));
    image[0][0] = 99;
    const state = { image } as MegaminxState;
    const svg = renderMegaminxState(state, { U: '#123456', BL: '#654321' });

    expect(countFill(svg, '#123456')).toBe(1);
  });
});
