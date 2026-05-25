import { describe, expect, it } from 'vitest';
import { createCubeDefinition } from './cube-definition.js';
import type { CubeMove } from './cube-move.js';
import { applyCubeMove, areCubeStatesEqual, createSolvedCubeState } from './cube-state.js';

const asCubeMove = (move: unknown): CubeMove => move as CubeMove;

const faceRows = (face: readonly (readonly string[])[]): readonly string[] =>
  face.map((row) => row.join(''));

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

  it('applies half turns and repeated quarter turns', () => {
    const cube = createCubeDefinition(3, ['333']);
    const halfTurnRestored = cube
      .parseAlgorithm('R2 R2')
      .reduce((state, move) => cube.applyMove(state, move), cube.createSolvedState());
    expect(cube.isSolved(halfTurnRestored)).toBe(true);

    const quarterTurnRestored = cube
      .parseAlgorithm('R R R R')
      .reduce((state, move) => cube.applyMove(state, move), cube.createSolvedState());
    expect(cube.isSolved(quarterTurnRestored)).toBe(true);
  });

  it('applies rotations and inverse rotations', () => {
    const cube = createCubeDefinition(3, ['333']);
    const rotated = cube
      .parseAlgorithm("x y z z' y' x'")
      .reduce((state, move) => cube.applyMove(state, move), cube.createSolvedState());
    expect(cube.isSolved(rotated)).toBe(true);
  });

  it('rotates odd-sized faces with TNoodle integer loop bounds', () => {
    const cube = createCubeDefinition(3, ['333']);
    const moved = cube
      .parseAlgorithm('R U')
      .reduce((state, move) => cube.applyMove(state, move), cube.createSolvedState());

    expect(faceRows(moved.image[1])).toEqual(['UUU', 'UUU', 'FFF']);
  });

  it('wide moves change a 4x4 state and inverse back to solved', () => {
    const cube = createCubeDefinition(4, ['444']);
    const moved = cube
      .parseAlgorithm("Rw U Rw' U'")
      .reduce((state, move) => cube.applyMove(state, move), cube.createSolvedState());
    expect(cube.isSolved(moved)).toBe(false);
    const restored = cube
      .parseAlgorithm("U Rw U' Rw'")
      .reduce((state, move) => cube.applyMove(state, move), moved);
    expect(cube.isSolved(restored)).toBe(true);
  });

  it('rejects impossible apply-time widths', () => {
    expect(() =>
      applyCubeMove(
        createSolvedCubeState(1),
        asCubeMove({ face: 'R', amount: 1, width: 2, isRotation: false }),
      ),
    ).toThrow("move 'Rw' is invalid for puzzle 'cube'");
    expect(() =>
      applyCubeMove(
        createSolvedCubeState(2),
        asCubeMove({ face: 'R', amount: 1, width: 3, isRotation: false }),
      ),
    ).toThrow("move '3Rw' is invalid for puzzle 'cube'");
  });

  it('rejects malformed move objects at apply time', () => {
    const state = createSolvedCubeState(3);

    for (const move of [
      { face: 'Q', amount: 1, width: 1, isRotation: false },
      { face: 'R', amount: 0, width: 1, isRotation: false },
      { face: 'R', amount: 4, width: 1, isRotation: false },
      { face: 'R', amount: 1, width: 1, isRotation: 'false' },
      {
        face: 'R',
        amount: 1,
        width: Number.POSITIVE_INFINITY,
        isRotation: false,
      },
      {
        face: 'L',
        amount: 1,
        width: Number.POSITIVE_INFINITY,
        isRotation: true,
      },
      { face: 'R', amount: 1, width: 1, isRotation: true },
    ]) {
      expect(() => applyCubeMove(state, asCubeMove(move))).toThrow(
        "move '<malformed>' is invalid for puzzle 'cube'",
      );
    }
  });

  it('compares non-equal states', () => {
    const cube = createCubeDefinition(3, ['333']);
    const solved = cube.createSolvedState();
    const moved = cube.applyMove(solved, cube.parseAlgorithm('R')[0]);

    expect(areCubeStatesEqual(solved, moved)).toBe(false);
  });

  it('does not mutate input states and freezes returned state images', () => {
    const cube = createCubeDefinition(3, ['333']);
    const solved = cube.createSolvedState();
    const beforeMove = solved.image;
    const moved = cube.applyMove(solved, cube.parseAlgorithm('R')[0]);

    expect(solved.image).toBe(beforeMove);
    expect(cube.isSolved(solved)).toBe(true);
    expect(cube.isSolved(moved)).toBe(false);
    expect(moved).not.toBe(solved);
    expect(Object.isFrozen(solved.image)).toBe(true);
    expect(Object.isFrozen(solved.image[0])).toBe(true);
    expect(Object.isFrozen(solved.image[0][0])).toBe(true);
    expect(Object.isFrozen(moved.image)).toBe(true);
    expect(Object.isFrozen(moved.image[0])).toBe(true);
    expect(Object.isFrozen(moved.image[0][0])).toBe(true);
    expect(() => {
      (moved.image[0][0] as unknown as string[])[0] = 'U';
    }).toThrow(TypeError);
  });
});
