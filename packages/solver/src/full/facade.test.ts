import { createCubeDefinition } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import {
  NoSolverSolutionError,
  FtoSolver,
  PyraminxSolver,
  SkewbSolver,
  SolverError,
  solvePuzzleFull,
  TwoByTwoSolver,
  UnsupportedSolverMoveError,
} from '../index.js';

describe('solvePuzzleFull', () => {
  it('round-trips 2x2 cubie states and evaluates the no-bar predicate', () => {
    const solver = new TwoByTwoSolver();
    const cubies = {
      permutation: [1, 2, 0, 3, 4, 5, 6],
      orientation: [1, 2, 0, 0, 0, 0, 0],
    };

    expect(solver.cubiesFromState(solver.stateFromCubies(cubies))).toEqual(cubies);
    expect(solver.isNoBarState(solver.stateFromScramble("R U R' F2"))).toBeTypeOf('boolean');
  });

  it('evaluates 2x2 no-bar states against the independent sticker model', () => {
    const solver = new TwoByTwoSolver();
    const cube = createCubeDefinition(2, ['222']);
    const faces = ['U', 'R', 'F'] as const;
    const suffixes = ['', '2', "'"] as const;
    let seed = 0x222;

    for (let sample = 0; sample < 200; sample += 1) {
      const moves: string[] = [];
      let previousFace = -1;
      for (let index = 0; index < 11; index += 1) {
        seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
        const face = (seed + previousFace + 1) % faces.length;
        previousFace = face;
        seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
        moves.push(`${faces[face]}${suffixes[seed % suffixes.length]}`);
      }

      const scramble = moves.join(' ');
      const stickerState = cube.applyAlgorithm(cube.createSolvedState(), scramble);
      const isVisuallyBarFree = stickerState.image.every((face) => {
        const [topLeft, topRight, bottomLeft, bottomRight] = face.flat();
        return (
          topLeft !== topRight &&
          topLeft !== bottomLeft &&
          topRight !== bottomRight &&
          bottomLeft !== bottomRight
        );
      });

      expect(solver.isNoBarState(solver.stateFromScramble(scramble)), scramble).toBe(
        isVisuallyBarFree,
      );
    }

    const diagonalOnlyRegression = "U' R' F R' U' F R' U2 F U R2";
    const regressionState = cube.applyAlgorithm(cube.createSolvedState(), diagonalOnlyRegression);
    const isRegressionBarFree = regressionState.image.every((face) => {
      const [topLeft, topRight, bottomLeft, bottomRight] = face.flat();
      return (
        topLeft !== topRight &&
        topLeft !== bottomLeft &&
        topRight !== bottomRight &&
        bottomLeft !== bottomRight
      );
    });
    expect(
      solver.isNoBarState(solver.stateFromScramble(diagonalOnlyRegression)),
      diagonalOnlyRegression,
    ).toBe(isRegressionBarFree);
  });

  it('generates the exact sampled 2x2 state used by no-bar training', () => {
    const solver = new TwoByTwoSolver();
    let seed = 0x222;
    const random = {
      nextInt(maxExclusive: number) {
        seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
        return seed % maxExclusive;
      },
    };
    let checked = 0;

    for (let attempt = 0; attempt < 10_000 && checked < 30; attempt += 1) {
      const target = solver.randomState(random);
      if (!solver.isNoBarState(target)) continue;

      const scramble = solver.generateExactly(target, 11);
      expect(solver.stateFromScramble(scramble), scramble).toEqual(target);
      checked += 1;
    }

    expect(checked).toBe(30);
  });

  it('round-trips Pyraminx cubie states and evaluates the no-bar predicate', () => {
    const solver = new PyraminxSolver();
    const cubies = {
      edgePermutation: [1, 2, 0, 3, 4, 5],
      edgeOrientation: [1, 1, 0, 0, 0, 0],
      cornerOrientation: [1, 0, 2, 0],
      tipOrientation: [2, 0, 1, 0],
    };

    expect(solver.cubiesFromState(solver.stateFromCubies(cubies))).toEqual(cubies);
    expect(solver.isNoBarState(solver.stateFromScramble("U L R' B"))).toBeTypeOf('boolean');
  });

  it('round-trips Skewb cubie states and evaluates the no-bar predicate', () => {
    const solver = new SkewbSolver();
    const cubies = {
      centerPermutation: [1, 2, 0, 3, 4, 5],
      cornerPermutation: [0, 1, 2, 3],
      fixedCornerOrientation: [1, 2, 0, 0],
      cornerOrientation: [1, 2, 0, 0],
    };

    expect(solver.cubiesFromState(solver.stateFromCubies(cubies))).toEqual(cubies);
    expect(solver.isNoBarState(solver.stateFromScramble("R U' B L"))).toBeTypeOf('boolean');
  });

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

  it('solves FTO scrambles through the full solver facade', () => {
    const result = solvePuzzleFull('fto', "U D F B L R BL BR U' BR'");
    const restored = new FtoSolver().stateFromScramble(`${result.scramble} ${result.solution}`);

    expect(result.eventId).toBe('fto');
    expect(result.engine).toBe('fto-three-phase');
    expect(result.solution.length).toBeGreaterThan(0);
    expect(restored).toEqual(new FtoSolver().stateFromScramble(''));
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
