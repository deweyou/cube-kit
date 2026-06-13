import { describe, expect, it } from 'vitest';
import {
  applySquareOneMove,
  createSolvedSquareOneState,
  parseSquareOneAlgorithm,
} from '@cubegin/scramble-puzzle';

import { FullCube } from './full-cube.js';

describe('Square-1 full cube coordinate', () => {
  it('starts solved and can copy another cube state', () => {
    const source = new FullCube();
    const target = new FullCube();
    source.doMove(1);

    expect(source.isSolved()).toBe(false);

    target.copy(source);

    expect(target).toMatchObject({
      ul: source.ul,
      ur: source.ur,
      dl: source.dl,
      dr: source.dr,
      ml: source.ml,
    });
  });

  it('applies top turns, slice turns, and bottom turns', () => {
    const cube = new FullCube();
    const states: string[] = [];

    for (const move of [1, 7, 0, -1, -7]) {
      cube.doMove(move);
      states.push(`${cube.ul}:${cube.ur}:${cube.dl}:${cube.dr}:${cube.ml}`);
    }

    expect(new Set(states).size).toBe(states.length);
    expect(cube.isSolved()).toBe(false);
  });

  it('maps solved and moved puzzle states into full cube coordinates', () => {
    const solved = FullCube.fromSquareOneState(createSolvedSquareOneState());
    const movedState = parseSquareOneAlgorithm('(3,0) /').reduce(
      (state, move) => applySquareOneMove(state, move),
      createSolvedSquareOneState(),
    );
    const moved = FullCube.fromSquareOneState(movedState);

    expect(solved.isSolved()).toBe(true);
    expect(moved.isSolved()).toBe(false);
    expect(moved.getShapeIdx()).not.toBe(solved.getShapeIdx());
    expect(moved.getSquare().ml).toBe(1);
  });

  it('sets pieces across all packed faces and middle-layer state', () => {
    const cube = new FullCube();

    cube.setPiece(0, 0xf);
    cube.setPiece(6, 0xe);
    cube.setPiece(12, 0xd);
    cube.setPiece(18, 0xc);
    cube.setPiece(24, 1);

    expect(cube.ul >> 20).toBe(0xf);
    expect(cube.ur >> 20).toBe(0xe);
    expect(cube.dl >> 20).toBe(0xd);
    expect(cube.dr >> 20).toBe(0xc);
    expect(cube.ml).toBe(1);
  });

  it('creates deterministic random cubes and validates random bounds', () => {
    const zeroRandom = { nextInt: () => 0 };
    const cube = FullCube.randomCube(zeroRandom);

    expect(cube).toBeInstanceOf(FullCube);
    expect(() => FullCube.randomCube({ nextInt: (maxExclusive) => maxExclusive })).toThrow(
      '@cubegin/solver: Square-1 random source returned 3678 for max 3678',
    );
  });
});
