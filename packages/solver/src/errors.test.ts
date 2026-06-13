import { describe, expect, it } from 'vitest';

import {
  InvalidSolverScrambleError,
  NoSolverSolutionError,
  SolverError,
  UnknownSolverMethodError,
  UnknownSolverTargetError,
  UnsupportedSolverMoveError,
} from './errors.js';

describe('solver errors', () => {
  it('preserves the invalid scramble cause for callers that surface diagnostics', () => {
    const cause = new Error('bad token');
    const error = new InvalidSolverScrambleError("R X'", cause);

    expect(error).toBeInstanceOf(SolverError);
    expect(error.name).toBe('InvalidSolverScrambleError');
    expect(error.message).toBe("invalid 3x3 solver scramble: R X'");
    expect(error.cause).toBe(cause);
  });

  it('names method and target lookup failures explicitly', () => {
    expect(new UnknownSolverMethodError('beginner').message).toBe(
      'unknown solver method: beginner',
    );
    expect(new UnknownSolverTargetError('cross', 'cyan').message).toBe(
      'unknown cross solver target: cyan',
    );
  });

  it('reports unsupported moves and search depth failures', () => {
    expect(new UnsupportedSolverMoveError('Rw').message).toBe('unsupported solver move: Rw');
    expect(new NoSolverSolutionError('cross', 'white', 6).message).toBe(
      'no cross solution for white within depth 6',
    );
  });
});
