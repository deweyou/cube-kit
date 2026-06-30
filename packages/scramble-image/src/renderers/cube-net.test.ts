import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubegin/scramble-puzzle';
import { renderScrambleImage } from '../render.js';
import { renderCubeNet } from './cube-net.js';

describe('renderCubeNet', () => {
  it('renders a solved 3x3 cube net with 54 stickers', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeNet(cube.createSolvedState());

    expect(svg).toContain('viewBox="0 0 130 98"');
    expect(svg.match(/<rect/g)?.length).toBe(54);
  });

  it('places solved 3x3 face stickers in the net', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeNet(cube.createSolvedState());

    expect(svg).toContain(
      '<rect x="66" y="34" width="10" height="10" fill="#ff0000" stroke="#000000" stroke-width="1" shape-rendering="crispEdges"></rect>',
    );
  });

  it('renders a scrambled state', () => {
    const cube = createCubeDefinition(3, ['333']);
    const state = cube
      .parseAlgorithm('R U')
      .reduce((next, move) => cube.applyMove(next, move), cube.createSolvedState());

    expect(renderCubeNet(state)).toContain('<svg');
  });

  it('honors color overrides', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeNet(cube.createSolvedState(), { R: '#123456' });

    expect(svg).toContain('fill="#123456"');
  });

  it('escapes color attributes provided through renderer options', () => {
    const cube = createCubeDefinition(3, ['333']);
    const unsafeColor = '#fff" onload="alert(1)<&' as '#ffffff';
    const svg = renderCubeNet(cube.createSolvedState(), { R: unsafeColor });

    expect(svg).toContain('fill="#fff&quot; onload=&quot;alert(1)&lt;&amp;"');
    expect(svg).not.toContain('onload="alert');
  });
});

describe('renderScrambleImage', () => {
  it('renders supported cube events', () => {
    const svg = renderScrambleImage('333', 'R U');

    expect(svg).toContain('viewBox="0 0 130 98"');
    expect(svg.match(/<rect/g)?.length).toBe(54);
  });

  it('renders non-cube events through the public image renderer', () => {
    expect(renderScrambleImage('clock', '')).toContain('viewBox=');
  });

  it('wraps invalid cube scrambles', () => {
    expect(() => renderScrambleImage('333', 'not-a-move')).toThrow(
      "scramble 'not-a-move' is invalid",
    );
  });
});
