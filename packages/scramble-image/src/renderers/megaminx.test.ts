import { describe, expect, it } from 'vitest';
import {
  applyMegaminxMove,
  createSolvedMegaminxState,
  parseMegaminxAlgorithm,
} from '../../../scramble-puzzle/src/index.js';
import { renderMegaminxState } from './megaminx.js';

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
});
