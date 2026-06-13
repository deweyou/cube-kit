import { describe, expect, it } from 'vitest';

import { CubieCube, getNParity, getNPerm, SOLVED_FACELETS } from './cubie-cube.js';

describe('min2phase cubie cube', () => {
  it('round-trips solved and coordinate-built cubes through facelets', () => {
    const solved = CubieCube.solved();
    const moved = CubieCube.fromCoordinates(1, 1, 1, 1);

    expect(solved.toFaceCube()).toBe(SOLVED_FACELETS);
    expect(CubieCube.fromFaceCube(solved.toFaceCube())?.verify()).toBe(0);
    expect(CubieCube.fromFaceCube(moved.toFaceCube())?.verify()).toBe(0);
  });

  it('rejects malformed facelet strings', () => {
    expect(CubieCube.fromFaceCube('short')).toBeNull();
    expect(CubieCube.fromFaceCube(`${SOLVED_FACELETS.slice(0, 53)}X`)).toBeNull();

    const badCornerOrientation = replaceFacelet(SOLVED_FACELETS, 8, 'R');
    expect(CubieCube.fromFaceCube(badCornerOrientation)).toBeNull();

    const badCornerCubie = replaceFacelet(SOLVED_FACELETS, 9, 'U');
    expect(CubieCube.fromFaceCube(badCornerCubie)).toBeNull();

    const duplicateEdgeCubie = replaceFacelet(SOLVED_FACELETS, 5, 'D');
    expect(CubieCube.fromFaceCube(duplicateEdgeCubie)?.verify()).toBe(-2);
  });

  it('recognizes flipped edge facelets', () => {
    const facelets = Array.from(SOLVED_FACELETS);
    [facelets[5], facelets[10]] = [facelets[10]!, facelets[5]!];
    const cube = CubieCube.fromFaceCube(facelets.join(''));

    expect(cube?.ep[0]).toBe(0);
    expect(cube?.eo[0]).toBe(1);
    expect(cube?.verify()).toBe(-3);
  });

  it('reports every cubie verification error code', () => {
    expect(new CubieCube([0, 1, 2, 3, 4, 5, 6, 7], [], [0, 0], []).verify()).toBe(-2);
    expect(new CubieCube(undefined, undefined, undefined, [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).verify()).toBe(-3);
    expect(new CubieCube([0, 0, 2, 3, 4, 5, 6, 7]).verify()).toBe(-4);
    expect(new CubieCube(undefined, [1, 0, 0, 0, 0, 0, 0, 0]).verify()).toBe(-5);
    expect(new CubieCube([1, 0, 2, 3, 4, 5, 6, 7]).verify()).toBe(-6);
  });

  it('computes permutation coordinates and parity', () => {
    expect(getNPerm([0, 1, 2, 3], 4)).toBe(0);
    expect(getNPerm([3, 2, 1, 0], 4)).toBe(23);
    expect(getNParity(0, 4)).toBe(0);
    expect(getNParity(1, 4)).toBe(1);
  });
});

const replaceFacelet = (facelets: string, index: number, value: string): string =>
  `${facelets.slice(0, index)}${value}${facelets.slice(index + 1)}`;
