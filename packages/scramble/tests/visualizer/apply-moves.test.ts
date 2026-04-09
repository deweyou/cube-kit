import { describe, expect, it } from 'vitest';
import { parseMoves, solvedState, applyMove } from '../../src/visualizer/apply-moves';

describe('parseMoves', () => {
  it('parses empty string to empty array', () => {
    expect(parseMoves('')).toEqual([]);
  });

  it('parses "R U R\' U\'"', () => {
    const moves = parseMoves("R U R' U'");
    expect(moves).toHaveLength(4);
    expect(moves[0]).toMatchObject({ face: 'R', dir: 1 });
    expect(moves[1]).toMatchObject({ face: 'U', dir: 1 });
    expect(moves[2]).toMatchObject({ face: 'R', dir: -1 });
    expect(moves[3]).toMatchObject({ face: 'U', dir: -1 });
  });

  it('parses double moves', () => {
    const moves = parseMoves('U2 R2');
    expect(moves[0]).toMatchObject({ face: 'U', dir: 2 });
    expect(moves[1]).toMatchObject({ face: 'R', dir: 2 });
  });

  it('parses wide moves', () => {
    const moves = parseMoves("Rw Uw'");
    expect(moves[0]).toMatchObject({ face: 'R', wide: true, dir: 1 });
    expect(moves[1]).toMatchObject({ face: 'U', wide: true, dir: -1 });
  });
});

describe('solvedState', () => {
  it('3x3 has 6 faces of 9 stickers each', () => {
    const s = solvedState('333');
    expect(s).toHaveLength(6);
    for (const face of s) expect(face).toHaveLength(9);
  });

  it('3x3 solved: each face is a single color', () => {
    const s = solvedState('333');
    for (const face of s) {
      expect(new Set(face).size).toBe(1);
    }
  });

  it('2x2 has 6 faces of 4 stickers each', () => {
    const s = solvedState('222');
    expect(s).toHaveLength(6);
    for (const face of s) expect(face).toHaveLength(4);
  });
});

describe('applyMove', () => {
  it("R then R' returns to solved state", () => {
    let state = solvedState('333');
    state = applyMove(state, parseMoves('R')[0], '333');
    state = applyMove(state, parseMoves("R'")[0], '333');
    const solved = solvedState('333');
    expect(state).toEqual(solved);
  });

  it('U move changes the top face', () => {
    let state = solvedState('333');
    state = applyMove(state, parseMoves('R')[0], '333');
    // After R, top face should have non-uniform colors
    expect(new Set(state[0]).size).toBeGreaterThan(1);
  });

  it("applying 6× (R U R' U') returns to solved (superflip cycles)", () => {
    let state = solvedState('333');
    const seq = parseMoves("R U R' U'");
    for (let i = 0; i < 6; i++) {
      for (const move of seq) {
        state = applyMove(state, move, '333');
      }
    }
    expect(state).toEqual(solvedState('333'));
  });
});
