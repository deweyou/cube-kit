import { describe, expect, it } from 'vitest';
import {
  MEGAMINX_FACES,
  createMegaminxDefinition,
  type MegaminxFace,
  type MegaminxState,
} from '@cubegin/scramble-puzzle';
import { renderScrambleImage } from '../render.js';
import { renderMegaminxIsometricState } from './megaminx-isometric.js';
import { renderMegaminxState } from './megaminx.js';

const countElements = (svg: string, elementName: string): number =>
  svg.match(new RegExp(`<${elementName}\\b`, 'g'))?.length ?? 0;

const pathFills = (svg: string): readonly string[] =>
  [...svg.matchAll(/<path\b[^>]*\bfill="([^"]+)"/g)].map((match) => match[1]);

const lineworkSegmentCount = (svg: string): number => {
  const match = svg.match(/<path d="([^"]+)" fill="none" stroke="#000000"/);

  return match?.[1]?.match(/\bM\b/g)?.length ?? 0;
};

const visibleFaceOrder = [
  'F',
  'DL',
  'L',
  'U',
  'R',
  'DR',
  'B',
  'BL',
  'DBL',
  'D',
  'DBR',
  'BR',
] as const;

const firstVisualStickerStateIndex: Record<(typeof visibleFaceOrder)[number], number> = {
  F: 8,
  DL: 2,
  L: 0,
  U: 2,
  R: 6,
  DR: 0,
  B: 6,
  BL: 4,
  DBL: 8,
  D: 0,
  DBR: 4,
  BR: 2,
};

const markedStateForFirstVisualStickers = (): MegaminxState => {
  const megaminx = createMegaminxDefinition();
  const image = megaminx.createSolvedState().image.map((face) => [...face]);
  const faceletIndex = (face: MegaminxFace): number => MEGAMINX_FACES.indexOf(face);

  for (const face of visibleFaceOrder) {
    const markerFace = face === 'U' ? 'F' : 'U';

    image[faceletIndex(face)][firstVisualStickerStateIndex[face]] = faceletIndex(markerFace);
  }

  return { image };
};

describe('renderMegaminxIsometricState', () => {
  it('renders paired Megaminx views covering every face as path stickers', () => {
    const megaminx = createMegaminxDefinition();
    const svg = renderMegaminxIsometricState(megaminx.createSolvedState());

    expect(svg).toMatch(/^<svg width="410" height="190" viewBox="0 0 410 190"/);
    expect(countElements(svg, 'path')).toBe(133);
    expect(countElements(svg, 'rect')).toBe(0);
  });

  it('renders solved colors for all Megaminx faces', () => {
    const megaminx = createMegaminxDefinition();
    const svg = renderMegaminxIsometricState(megaminx.createSolvedState());

    for (const color of [
      '#ffffff',
      '#ffcc00',
      '#0000b3',
      '#dd0000',
      '#006600',
      '#8a1aff',
      '#999999',
      '#ffffb3',
      '#ff99ff',
      '#71e600',
      '#ff8433',
      '#88ddff',
    ]) {
      expect(svg).toContain(`fill="${color}"`);
    }
  });

  it('honors Megaminx color overrides', () => {
    const megaminx = createMegaminxDefinition();
    const svg = renderMegaminxIsometricState(megaminx.createSolvedState(), {
      D: '#654321',
      U: '#123456',
    });

    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('fill="#654321"');
  });

  it('draws Megaminx linework once above filled stickers', () => {
    const megaminx = createMegaminxDefinition();
    const svg = renderMegaminxIsometricState(megaminx.createSolvedState());

    expect(svg.match(/stroke="#000000"/g)).toHaveLength(1);
    expect(svg).toContain('fill="none" stroke="#000000"');
  });

  it('deduplicates side-to-side joins between adjacent Megaminx faces', () => {
    const megaminx = createMegaminxDefinition();
    const svg = renderMegaminxIsometricState(megaminx.createSolvedState());

    expect(lineworkSegmentCount(svg)).toBe(300);
  });

  it('maps Megaminx state stickers to each projected face orientation', () => {
    const svg = renderMegaminxIsometricState(markedStateForFirstVisualStickers());
    const fills = pathFills(svg);

    for (const [faceIndex, face] of visibleFaceOrder.entries()) {
      const expectedMarkerColor = face === 'U' ? '#006600' : '#ffffff';

      expect(fills[faceIndex * 11]).toBe(expectedMarkerColor);
    }
  });

  it('renders a distinct public isometric image for Megaminx scrambles', () => {
    const megaminx = createMegaminxDefinition();
    const scramble = "R++ D-- R-- D++ U'";
    const state = megaminx.applyAlgorithm(megaminx.createSolvedState(), scramble);
    const publicSvg = renderScrambleImage('minx', scramble, { view: 'isometric' });

    expect(publicSvg).toBe(renderMegaminxIsometricState(state));
    expect(publicSvg).not.toBe(renderMegaminxState(state));
  });
});
