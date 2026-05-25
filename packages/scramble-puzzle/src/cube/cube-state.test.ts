import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from './cube-definition.js';

describe('cube state transitions', () => {
  it('creates solved states for NxN cubes', () => {
    const cube = createCubeDefinition(3, ['333']);
    const state = cube.createSolvedState();
    expect(cube.isSolved(state)).toBe(true);
  });

  it('R followed by R prime returns to solved', () => {
    const cube = createCubeDefinition(3, ['333']);
    const state = cube.applyMove(
      cube.applyMove(cube.createSolvedState(), cube.parseAlgorithm('R')[0]),
      cube.parseAlgorithm("R'")[0],
    );
    expect(cube.isSolved(state)).toBe(true);
  });

  it('wide moves change a 4x4 state and inverse back to solved', () => {
    const cube = createCubeDefinition(4, ['444']);
    const moved = cube
      .parseAlgorithm("Rw U Rw' U'")
      .reduce(
        (state, move) => cube.applyMove(state, move),
        cube.createSolvedState(),
      );
    expect(cube.isSolved(moved)).toBe(false);
    const restored = cube
      .parseAlgorithm("U Rw U' Rw'")
      .reduce((state, move) => cube.applyMove(state, move), moved);
    expect(cube.isSolved(restored)).toBe(true);
  });
});
