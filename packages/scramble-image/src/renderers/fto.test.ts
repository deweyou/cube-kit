import { describe, expect, it } from 'vitest';
import {
  applyFtoMove,
  createSolvedFtoState,
  parseFtoAlgorithm,
  type FtoState,
} from '@cubegin/scramble-puzzle';
import { renderFtoState } from './fto.js';

const countFill = (svg: string, color: string): number =>
  svg.match(new RegExp(`fill="${color}"`, 'g'))?.length ?? 0;

describe('renderFtoState', () => {
  it('renders solved FTO state SVG', () => {
    expect(renderFtoState(createSolvedFtoState())).toContain('<svg');
  });

  it('uses the FTO net viewbox at the shared preview scale', () => {
    const svg = renderFtoState(createSolvedFtoState());

    expect(svg).toContain('width="320"');
    expect(svg).toContain('height="160"');
    expect(svg).toContain('viewBox="0 0 320 160"');
  });

  it('renders eight faces as nine path stickers without face labels', () => {
    const svg = renderFtoState(createSolvedFtoState());

    expect(svg.match(/<path/g)?.length).toBe(72);
    expect(svg).not.toContain('<text');
  });

  it('renders moved stickers with FTO colors', () => {
    const [move] = parseFtoAlgorithm('BR');
    const moved = applyFtoMove(createSolvedFtoState(), move);
    const svg = renderFtoState(moved);

    expect(svg).toContain('#bbbbbb');
  });

  it('applies custom face colors and sticker stroke width', () => {
    const svg = renderFtoState(createSolvedFtoState(), {
      U: '#101010',
      F: '#202020',
      BR: '#303030',
      BL: '#404040',
      D: '#505050',
      B: '#606060',
      R: '#707070',
      L: '#808080',
    });

    expect(svg).toContain('fill="#101010"');
    expect(svg).toContain('fill="#808080"');
    expect(svg).toContain('stroke="#000000" stroke-width="1.1" stroke-linejoin="round"');
  });

  it('uses the U color when a facelet index is outside the FTO palette', () => {
    const image = Array.from({ length: 8 }, () => Array.from({ length: 9 }, () => 1));
    image[0][0] = 99;
    const state = { image } as FtoState;
    const svg = renderFtoState(state, { U: '#123456', F: '#654321' });

    expect(countFill(svg, '#123456')).toBe(1);
  });
});
