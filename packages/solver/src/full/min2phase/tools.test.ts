import { describe, expect, it } from 'vitest';

import { CubieCube } from './cubie-cube.js';
import { fromScramble, isSolvedFaceCube, randomCube, randomState } from './tools.js';
import { SOLVED_FACE_CUBE } from './util.js';

const zeroRandom = { nextInt: () => 0 };

describe('min2phase tools', () => {
  it('converts scrambles into facelet strings', () => {
    expect(fromScramble('')).toBe(SOLVED_FACE_CUBE);
    expect(isSolvedFaceCube(fromScramble(''))).toBe(true);
    expect(isSolvedFaceCube(fromScramble('R U'))).toBe(false);
    expect(CubieCube.fromFaceCube(fromScramble('R U'))?.verify()).toBe(0);
  });

  it('generates valid random cubes through the random-state helper', () => {
    const facelets = randomCube(zeroRandom);

    expect(facelets).toHaveLength(54);
    expect(CubieCube.fromFaceCube(facelets)?.verify()).toBe(0);
  });

  it('uses solved state sentinels for a solved face cube', () => {
    expect(randomState([], [], [], [], zeroRandom)).toBe(SOLVED_FACE_CUBE);
  });

  it('resolves partially unknown permutation and orientation states', () => {
    const facelets = randomState(
      [0, 1, 2, 3, 4, 5, -1, -1],
      [0, 0, 0, 0, 0, 0, -1, -1],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1],
      zeroRandom,
    );

    expect(CubieCube.fromFaceCube(facelets)?.verify()).toBe(0);
  });

  it('resolves a single unknown edge permutation against a random corner permutation', () => {
    const facelets = randomState(null, [], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -1], [], zeroRandom);

    expect(CubieCube.fromFaceCube(facelets)?.verify()).toBe(0);
  });

  it('rejects out-of-range random draws while resolving states', () => {
    expect(() => randomCube({ nextInt: (maxExclusive) => maxExclusive })).toThrow(
      '@cubegin/solver: random source returned 40320 for max 40320',
    );
  });
});
