import { describe, expect, it } from 'vitest';
import { PyraminxSolver, SkewbSolver, solvePuzzleFull, TwoByTwoSolver } from '../index.js';

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
  });

  it('solves a 2x2 scramble through the full solver facade', () => {
    const result = solvePuzzleFull('222', 'R U F');
    const restored = new TwoByTwoSolver().stateFromScramble(`${result.scramble} ${result.solution}`);

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
    expect([pyraminx, skewb, squareOne, clock].every((result) => result.moveCount > 0)).toBe(
      true,
    );
  });
});
