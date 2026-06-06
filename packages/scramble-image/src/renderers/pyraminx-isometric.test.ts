import { describe, expect, it } from 'vitest';
import { createPyraminxDefinition } from '@cubekit/scramble-puzzle';
import { renderScrambleImage } from '../render.js';
import { renderPyraminxIsometricState } from './pyraminx-isometric.js';
import { renderPyraminxState } from './pyraminx.js';

const countElements = (svg: string, elementName: string): number =>
  svg.match(new RegExp(`<${elementName}\\b`, 'g'))?.length ?? 0;

describe('renderPyraminxIsometricState', () => {
  it('renders a three-face Pyraminx view plus a flat back face', () => {
    const pyraminx = createPyraminxDefinition();
    const svg = renderPyraminxIsometricState(pyraminx.createSolvedState());

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 370 146"');
    expect(countElements(svg, 'path')).toBe(37);
    expect(countElements(svg, 'rect')).toBe(0);
  });

  it('renders all four solved face colors across both Pyraminx views', () => {
    const pyraminx = createPyraminxDefinition();
    const svg = renderPyraminxIsometricState(pyraminx.createSolvedState());

    expect(svg).toContain('fill="#00ff00"');
    expect(svg).toContain('fill="#ffff00"');
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#0000ff"');
  });

  it('draws Pyraminx linework once for clean triangle joins', () => {
    const pyraminx = createPyraminxDefinition();
    const svg = renderPyraminxIsometricState(pyraminx.createSolvedState());

    expect(svg.match(/stroke="#000000"/g)).toHaveLength(1);
    expect(svg).toContain('fill="none" stroke="#000000"');
    expect(svg).not.toMatch(/fill="#[0-9a-f]{6}" stroke="#000000"/);
  });

  it('renders the flat D face as a near-equilateral inverted triangle', () => {
    const pyraminx = createPyraminxDefinition();
    const svg = renderPyraminxIsometricState(pyraminx.createSolvedState(), { D: '#abcdef' });

    expect(svg).toContain('M 202 16 L 248.667 16 L 225.333 56.667 Z" fill="#abcdef"');
  });

  it('keeps F, L, and R sticker orientation aligned with the folded Pyraminx net', () => {
    const pyraminx = createPyraminxDefinition();
    const svg = renderPyraminxIsometricState(pyraminx.createSolvedState(), {
      F: '#123456',
      L: '#654321',
      R: '#fedcba',
    });

    expect(svg).toContain('M 90 96 L 114 111.333 L 66 111.333 Z" fill="#123456"');
    expect(svg).toContain('M 90 12 L 90 40 L 66 55.333 Z" fill="#654321"');
    expect(svg).toContain('M 90 96 L 90 68 L 114 111.333 Z" fill="#fedcba"');
  });

  it('honors Pyraminx color overrides', () => {
    const pyraminx = createPyraminxDefinition();
    const svg = renderPyraminxIsometricState(pyraminx.createSolvedState(), {
      F: '#123456',
      D: '#abcdef',
    });

    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('fill="#abcdef"');
  });

  it('renders a distinct public isometric image for Pyraminx scrambles', () => {
    const pyraminx = createPyraminxDefinition();
    const state = pyraminx.applyAlgorithm(pyraminx.createSolvedState(), 'U L R');
    const publicSvg = renderScrambleImage('pyram', 'U L R', { view: 'isometric' });

    expect(publicSvg).toBe(renderPyraminxIsometricState(state));
    expect(publicSvg).not.toBe(renderPyraminxState(state));
  });
});
