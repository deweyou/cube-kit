import { describe, expect, it } from 'vitest';
import { validateFewestMovesSolution } from './validate.js';

describe('validateFewestMovesSolution', () => {
  it('normalizes accepted capitalization and derives OBTM and ETM', () => {
    const validation = validateFewestMovesSolution({
      scramble: 'R U',
      solution: "u' r' F F'",
    });

    expect(validation).toEqual({
      executionMoveCount: 4,
      inverseMatchLength: 2,
      moveCount: 4,
      normalizedSolution: "U' R' F F'",
      rawSolution: "u' r' F F'",
      reason: null,
      status: 'valid',
    });
  });

  it('counts rotations only in ETM', () => {
    const validation = validateFewestMovesSolution({
      scramble: 'R',
      solution: "x x' R' F F'",
    });

    expect(validation.status).toBe('valid');
    expect(validation.moveCount).toBe(3);
    expect(validation.executionMoveCount).toBe(5);
  });

  it('returns a syntax DNF for an empty or invalid solution', () => {
    expect(validateFewestMovesSolution({ scramble: 'R', solution: '' })).toMatchObject({
      executionMoveCount: null,
      moveCount: null,
      normalizedSolution: null,
      reason: 'syntax',
      status: 'dnf',
    });
    expect(validateFewestMovesSolution({ scramble: 'R', solution: "R3'" })).toMatchObject({
      reason: 'syntax',
      status: 'dnf',
    });
  });

  it('returns an unsolved DNF when scramble plus solution is not solved', () => {
    expect(validateFewestMovesSolution({ scramble: 'R U', solution: "R'" })).toMatchObject({
      executionMoveCount: 1,
      moveCount: 1,
      reason: 'unsolved',
      status: 'dnf',
    });
  });

  it('returns an over-80 DNF before accepting an otherwise solved sequence', () => {
    const rotations = Array.from({ length: 40 }, () => "x x'").join(' ');
    const validation = validateFewestMovesSolution({
      scramble: 'R',
      solution: `${rotations} R'`,
    });

    expect(validation).toMatchObject({
      executionMoveCount: 81,
      moveCount: 1,
      reason: 'over-80-etm',
      status: 'dnf',
    });
  });

  it('rejects the exact normalized inverse scramble', () => {
    expect(validateFewestMovesSolution({ scramble: "R U2 F'", solution: "F U2 R'" })).toMatchObject(
      {
        inverseMatchLength: 3,
        reason: 'inverse-scramble',
        status: 'dnf',
      },
    );
  });

  it('marks a four-move inverse prefix for review', () => {
    const validation = validateFewestMovesSolution({
      scramble: 'R U F L',
      solution: "L' F' U' R' B B'",
    });

    expect(validation).toMatchObject({
      inverseMatchLength: 4,
      reason: 'inverse-scramble',
      status: 'suspected-inverse',
    });
  });
});
