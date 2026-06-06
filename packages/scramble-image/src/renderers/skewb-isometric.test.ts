import { describe, expect, it } from 'vitest';
import { createSkewbDefinition } from '@cubegin/scramble-puzzle';
import { renderScrambleImage } from '../render.js';
import { renderSkewbIsometricState } from './skewb-isometric.js';
import { renderSkewbState } from './skewb.js';

const countElements = (svg: string, elementName: string): number =>
  svg.match(new RegExp(`<${elementName}\\b`, 'g'))?.length ?? 0;

describe('renderSkewbIsometricState', () => {
  it('renders paired Skewb views as path stickers', () => {
    const skewb = createSkewbDefinition();
    const svg = renderSkewbIsometricState(skewb.createSolvedState());

    expect(svg).toContain('<svg');
    expect(countElements(svg, 'path')).toBe(31);
    expect(countElements(svg, 'rect')).toBe(0);
  });

  it('renders all six solved face colors across both views', () => {
    const skewb = createSkewbDefinition();
    const svg = renderSkewbIsometricState(skewb.createSolvedState());

    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('fill="#0000ff"');
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#ffff00"');
    expect(svg).toContain('fill="#00ff00"');
    expect(svg).toContain('fill="#ff8000"');
  });

  it('uses thinner linework for the compact Skewb preview', () => {
    const skewb = createSkewbDefinition();
    const svg = renderSkewbIsometricState(skewb.createSolvedState());

    expect(svg).toContain('stroke-width="2.5"');
    expect(svg).not.toContain('stroke-width="4"');
  });

  it('draws black linework once instead of restroking every sticker', () => {
    const skewb = createSkewbDefinition();
    const svg = renderSkewbIsometricState(skewb.createSolvedState());

    expect(svg.match(/stroke="#000000"/g)).toHaveLength(1);
    expect(svg).toContain('fill="none" stroke="#000000"');
    expect(svg).not.toMatch(/fill="#[0-9a-f]{6}" stroke="#000000"/);
  });

  it('honors Skewb color overrides', () => {
    const skewb = createSkewbDefinition();
    const svg = renderSkewbIsometricState(skewb.createSolvedState(), { U: '#123456' });

    expect(svg).toContain('fill="#123456"');
  });

  it('renders a distinct public isometric image for Skewb scrambles', () => {
    const skewb = createSkewbDefinition();
    const state = skewb.applyAlgorithm(skewb.createSolvedState(), 'R U');
    const publicSvg = renderScrambleImage('skewb', 'R U', { view: 'isometric' });

    expect(publicSvg).toBe(renderSkewbIsometricState(state));
    expect(publicSvg).not.toBe(renderSkewbState(state));
  });
});
