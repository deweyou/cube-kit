import { createFtoDefinition } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import { FtoSolver } from './fto-solver.js';

const LONG_SCRAMBLE = "U D F B L R BL BR U' BR' F R' D BL U B' L' BR D' F' U R BL'";

describe('FtoSolver', () => {
  it('solves an arbitrary legal FtoState instead of relying on formula provenance', () => {
    const solver = new FtoSolver();
    const target = solver.stateFromScramble(LONG_SCRAMBLE);
    const solution = solver.solve(target);
    const restored = solver.stateFromScramble(`${LONG_SCRAMBLE} ${solution}`);

    expect(solution.length).toBeGreaterThan(0);
    expect(restored).toEqual(solver.stateFromScramble(''));
  }, 20_000);

  it('inverts a state solution into a scramble that recreates the target state', () => {
    const solver = new FtoSolver();
    const target = solver.stateFromScramble("U F BR' L D' R BL B U'");
    const scramble = solver.scramble(target);

    expect(
      createFtoDefinition().applyAlgorithm(createFtoDefinition().createSolvedState(), scramble),
    ).toEqual(target);
  }, 20_000);

  it('caches platform-independent coordinate tables and reports their footprint', () => {
    const solver = new FtoSolver();
    const first = solver.getInitializationStats();
    const second = solver.getInitializationStats();

    expect(second).toEqual(first);
    expect(first.initializationMilliseconds).toBeGreaterThanOrEqual(0);
    expect(first.estimatedTableBytes).toBeGreaterThan(0);
    expect(first.phase1CoordinateCount).toBeGreaterThan(0);
    expect(first.phase2CoordinateCount).toBeGreaterThan(0);
    expect(first.phase3CoordinateCount).toBeGreaterThan(0);
  });
});
