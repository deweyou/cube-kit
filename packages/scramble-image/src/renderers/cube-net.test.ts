import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from '@cubekit/scramble-puzzle';
import { renderCubeNet } from './cube-net.js';

describe('renderCubeNet', () => {
  it('renders a solved 3x3 cube net with 54 stickers', () => {
    const cube = createCubeDefinition(3, ['333']);
    const svg = renderCubeNet(cube.createSolvedState());

    expect(svg).toContain('viewBox="0 0 130 98"');
    expect(svg.match(/<rect/g)?.length).toBe(54);
  });

  it('renders a scrambled state', () => {
    const cube = createCubeDefinition(3, ['333']);
    const state = cube
      .parseAlgorithm('R U')
      .reduce((next, move) => cube.applyMove(next, move), cube.createSolvedState());

    expect(renderCubeNet(state)).toContain('<svg');
  });
});
