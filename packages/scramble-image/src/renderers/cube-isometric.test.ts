import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubegin/scramble-puzzle';
import { renderScrambleImage } from '../render.js';
import { renderCubeNet } from './cube-net.js';
import { renderCubeIsometric } from './cube-isometric.js';

const countElements = (svg: string, elementName: string): number =>
  svg.match(new RegExp(`<${elementName}\\b`, 'g'))?.length ?? 0;

describe('renderCubeIsometric', () => {
  it('renders a solved 3x3 cube as two three-face path views', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeIsometric(cube.createSolvedState());

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 336 166"');
    expect(countElements(svg, 'path')).toBe(55);
    expect(countElements(svg, 'rect')).toBe(0);
  });

  it('scales all visible stickers with cube size', () => {
    const two = createCubeDefinition(2, ['222']);
    const seven = createCubeDefinition(7, ['777']);

    expect(countElements(renderCubeIsometric(two.createSolvedState()), 'path')).toBe(25);
    expect(countElements(renderCubeIsometric(seven.createSolvedState()), 'path')).toBe(295);
  });

  it('renders all six solved face colors across both views', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeIsometric(cube.createSolvedState());

    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('fill="#00ff00"');
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#ffff00"');
    expect(svg).toContain('fill="#0000ff"');
    expect(svg).toContain('fill="#ff8000"');
  });

  it('honors cube color overrides', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeIsometric(cube.createSolvedState(), { U: '#123456' });

    expect(svg).toContain('fill="#123456"');
  });

  it('draws cube linework once so face joins have no visual gap', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeIsometric(cube.createSolvedState());

    expect(svg.match(/stroke="#000000"/g)).toHaveLength(1);
    expect(svg).toContain('fill="none" stroke="#000000"');
    expect(svg).not.toMatch(/fill="#[0-9a-f]{6}" stroke="#000000"/);
  });

  it('uses a convex rear projection without face gaps', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeIsometric(cube.createSolvedState());

    expect(svg).toContain('M 182 42 L 206.667 30 L 231.333 42.444');
    expect(svg).toContain('M 182 116 L 182 91.333');
  });

  it('renders a distinct public isometric image for cube scrambles', () => {
    const cube = createCubeDefinition(3, ['333']);
    const state = cube.applyAlgorithm(cube.createSolvedState(), 'R U');
    const direct = renderCubeIsometric(state);
    const publicSvg = renderScrambleImage('333', 'R U', { view: 'isometric' });

    expect(publicSvg).toBe(direct);
    expect(publicSvg).not.toBe(renderCubeNet(state));
  });
});
