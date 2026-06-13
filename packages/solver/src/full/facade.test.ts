import { describe, expect, it } from 'vitest';
import {
  NoSolverSolutionError,
  PyraminxSolver,
  SkewbSolver,
  SolverError,
  solvePuzzleFull,
  TwoByTwoSolver,
  UnsupportedSolverMoveError,
} from '../index.js';

describe('solvePuzzleFull', () => {
  it('solves a 3x3 scramble through the full solver facade', () => {
    const result = solvePuzzleFull('333', "R U R' U'");

    expect(result.eventId).toBe('333');
    expect(result.engine).toBe('min2phase');
    expect(result.solution.length).toBeGreaterThan(0);
    expect(result.moveCount).toBeGreaterThan(0);
  });

  it('returns a restore-direction solution for 4x4 scrambles', () => {
    const result = solvePuzzleFull('444', 'R');

    expect(result.eventId).toBe('444');
    expect(result.engine).toBe('threephase');
    expect(result.solution).toBe("R'");
    expect(result.moveCount).toBe(1);
  }, 20_000);

  it('solves a 2x2 scramble through the full solver facade', () => {
    const result = solvePuzzleFull('222', 'R U F');
    const restored = new TwoByTwoSolver().stateFromScramble(
      `${result.scramble} ${result.solution}`,
    );

    expect(result.eventId).toBe('222');
    expect(result.engine).toBe('two-by-two-coordinate');
    expect(result.solution.length).toBeGreaterThan(0);
    expect(restored).toEqual({ permutation: 0, orientation: 0 });
  });

  it('solves Pyraminx, Skewb, Square-1, and Clock scrambles', () => {
    const pyraminx = solvePuzzleFull('pyram', "U R u'");
    const skewb = solvePuzzleFull('skewb', "R U'");
    const squareOne = solvePuzzleFull('sq1', '(3,0) /');
    const clock = solvePuzzleFull('clock', 'UR1+ y2 DR1-');

    expect(pyraminx.engine).toBe('pyraminx-coordinate');
    expect(skewb.engine).toBe('skewb-coordinate');
    expect(squareOne.engine).toBe('square-one-two-phase');
    expect(clock.engine).toBe('clock-inverse');
    expect(
      new PyraminxSolver().stateFromScramble(`${pyraminx.scramble} ${pyraminx.solution}`),
    ).toEqual({
      edgePerm: 0,
      edgeOrient: 0,
      cornerOrient: 0,
      tips: 0,
    });
    expect(new SkewbSolver().stateFromScramble(`${skewb.scramble} ${skewb.solution}`)).toEqual({
      perm: 0,
      twst: 0,
    });
    expect([pyraminx, skewb, squareOne, clock].every((result) => result.moveCount > 0)).toBe(true);
  });

  it('rejects unsupported full-solver events with a typed solver error', () => {
    expect(() => solvePuzzleFull('333oh' as never, 'R U')).toThrow(SolverError);
    expect(() => solvePuzzleFull('333oh' as never, 'R U')).toThrow(
      'unsupported full solver event: 333oh',
    );
  });

  it('rejects 3x3 rotations and wide moves before invoking min2phase', () => {
    expect(() => solvePuzzleFull('333', 'x')).toThrow(UnsupportedSolverMoveError);
    expect(() => solvePuzzleFull('333', 'Rw')).toThrow(UnsupportedSolverMoveError);
  });

  it('rejects unsupported 4x4 tokens before invoking threephase', () => {
    expect(() => solvePuzzleFull('444', '3Rw')).toThrow(UnsupportedSolverMoveError);
  });

  it('reports depth-limited misses for coordinate full solvers', () => {
    for (const [eventId, scramble, message] of [
      ['222', 'R', 'no 222-full solution for cube within depth 0'],
      ['pyram', 'U', 'no pyraminx-full solution for pyraminx within depth 0'],
      ['skewb', 'R', 'no skewb-full solution for skewb within depth 0'],
      ['sq1', '(3,0) /', 'no sq1-full solution for square-one within depth 0'],
    ] as const) {
      expect(() => solvePuzzleFull(eventId, scramble, { maxDepth: 0 })).toThrow(
        NoSolverSolutionError,
      );
      expect(() => solvePuzzleFull(eventId, scramble, { maxDepth: 0 })).toThrow(message);
    }
  });
});
