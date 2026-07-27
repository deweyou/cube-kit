import { describe, expect, it } from 'vitest';
import { parseCubeAlgorithm } from './cube-parser.js';

describe('parseCubeAlgorithm', () => {
  it('parses face, wide, prefixed wide, rotations, and slices', () => {
    expect(parseCubeAlgorithm("R U2 R' Rw 3Fw2 x y' z M E2 S'")).toEqual([
      { face: 'R', amount: 1, width: 1, isRotation: false },
      { face: 'U', amount: 2, width: 1, isRotation: false },
      { face: 'R', amount: 3, width: 1, isRotation: false },
      { face: 'R', amount: 1, width: 2, isRotation: false },
      { face: 'F', amount: 2, width: 3, isRotation: false },
      {
        face: 'R',
        amount: 1,
        width: Number.POSITIVE_INFINITY,
        isRotation: true,
      },
      {
        face: 'U',
        amount: 3,
        width: Number.POSITIVE_INFINITY,
        isRotation: true,
      },
      {
        face: 'F',
        amount: 1,
        width: Number.POSITIVE_INFINITY,
        isRotation: true,
      },
      { face: 'L', amount: 1, width: 1, isRotation: false, slice: 'M' },
      { face: 'D', amount: 2, width: 1, isRotation: false, slice: 'E' },
      { face: 'F', amount: 3, width: 1, isRotation: false, slice: 'S' },
    ]);
  });

  it('rejects malformed cube moves', () => {
    expect(() => parseCubeAlgorithm('R4')).toThrow("move 'R4' is invalid for puzzle 'cube'");
    expect(() => parseCubeAlgorithm('Q')).toThrow("move 'Q' is invalid for puzzle 'cube'");
    expect(() => parseCubeAlgorithm('r')).toThrow("move 'r' is invalid for puzzle 'cube'");
    expect(() => parseCubeAlgorithm('X')).toThrow("move 'X' is invalid for puzzle 'cube'");
  });

  it('rejects invalid explicit wide move widths', () => {
    for (const move of ['0Rw', '1Rw', '2Rw', '03Rw', '9007199254740992Rw']) {
      expect(() => parseCubeAlgorithm(move)).toThrow(`move '${move}' is invalid for puzzle 'cube'`);
    }
  });

  it('parses empty and whitespace algorithms as no moves', () => {
    expect(parseCubeAlgorithm('')).toEqual([]);
    expect(parseCubeAlgorithm('  \n\t  ')).toEqual([]);
  });
});
