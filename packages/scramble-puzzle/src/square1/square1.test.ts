import { describe, expect, it } from 'vitest';
import { applyAlgorithm } from '../algorithm.js';
import { InvalidMoveError, InvalidScrambleError } from '../errors.js';
import { createSquareOneDefinition } from './square1-definition.js';
import {
  getSquareOneMoveCost,
  getSquareOneSlashabilityMoveCost,
  parseSquareOneAlgorithm,
  type SquareOneMove,
} from './square1-parser.js';
import {
  applySquareOneMove,
  areSquareOneStatesEqual,
  canSquareOneSlash,
  createSolvedSquareOneState,
  getSquareOneScrambleSuccessors,
  getSquareOneSuccessors,
} from './square1-state.js';

describe('Square-1 parser and state', () => {
  it('parses tuple turns and slash moves', () => {
    expect(parseSquareOneAlgorithm('(3,-2) / (0,3) /')).toHaveLength(4);
  });

  it('applies a valid scramble to the solved state', () => {
    const sq1 = createSquareOneDefinition();
    const state = sq1
      .parseAlgorithm('(3,0) /')
      .reduce((next, move) => sq1.applyMove(next, move), sq1.createSolvedState());

    expect(sq1.isSolved(state)).toBe(false);
  });

  it('rejects malformed and out-of-bounds tuple moves', () => {
    expect(() => parseSquareOneAlgorithm('(0,0)')).toThrow(InvalidMoveError);
    expect(() => parseSquareOneAlgorithm('(7,0)')).toThrow(InvalidMoveError);
    expect(() => parseSquareOneAlgorithm('(-6,0)')).toThrow(InvalidMoveError);
    expect(() => parseSquareOneAlgorithm('(3, -2)')).toThrow(InvalidMoveError);
    expect(() => parseSquareOneAlgorithm('//')).toThrow(InvalidMoveError);
    expect(() => parseSquareOneAlgorithm('junk')).toThrow(InvalidMoveError);
  });

  it('creates the TNoodle solved Square-1 shape as immutable state', () => {
    const state = createSolvedSquareOneState();

    expect(state.sliceSolved).toBe(true);
    expect(state.pieces).toEqual([
      0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15,
    ]);
    expect(canSquareOneSlash(state)).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.pieces)).toBe(true);
    expect(() => {
      (state.pieces as number[])[0] = 99;
    }).toThrow(TypeError);
  });

  it('keeps tuple moves immutable and restores after inverse rotations', () => {
    const solved = createSolvedSquareOneState();
    const [move, inverse] = parseSquareOneAlgorithm('(3,-2) (-3,2)');
    const moved = applySquareOneMove(solved, move);
    const restored = applySquareOneMove(moved, inverse);

    expect(moved).not.toBe(solved);
    expect(moved.pieces).not.toBe(solved.pieces);
    expect(areSquareOneStatesEqual(restored, solved)).toBe(true);
  });

  it('uses TNoodle tuple turn sign direction', () => {
    const solved = createSolvedSquareOneState();
    const [topTurn] = parseSquareOneAlgorithm('(3,0)');
    const [bottomTurn] = parseSquareOneAlgorithm('(0,-2)');

    expect(applySquareOneMove(solved, topTurn).pieces).toEqual([
      6, 6, 7, 0, 0, 1, 2, 2, 3, 4, 4, 5, 8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15,
    ]);
    expect(applySquareOneMove(solved, bottomTurn).pieces).toEqual([
      0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15, 8, 9,
    ]);
  });

  it('toggles sliceSolved and swaps the slice on slash moves', () => {
    const solved = createSolvedSquareOneState();
    const [slash] = parseSquareOneAlgorithm('/');
    const moved = applySquareOneMove(solved, slash);
    const restored = applySquareOneMove(moved, slash);

    expect(moved.sliceSolved).toBe(false);
    expect(moved.pieces.slice(6, 12)).toEqual(solved.pieces.slice(12, 18));
    expect(moved.pieces.slice(12, 18)).toEqual(solved.pieces.slice(6, 12));
    expect(areSquareOneStatesEqual(restored, solved)).toBe(true);
  });

  it('rejects invalid slash moves on unslashable states', () => {
    const [move, slash] = parseSquareOneAlgorithm('(-1,0) /');
    const unslashable = applySquareOneMove(createSolvedSquareOneState(), move);

    expect(canSquareOneSlash(unslashable)).toBe(false);
    expect(() => applySquareOneMove(unslashable, slash)).toThrow(InvalidMoveError);
  });

  it('wraps invalid slash application through shared applyAlgorithm', () => {
    const definition = createSquareOneDefinition();

    expect(() => applyAlgorithm(definition, definition.createSolvedState(), '(-1,0) /')).toThrow(
      InvalidScrambleError,
    );
  });

  it('reports TNoodle successor and scramble-successor sets', () => {
    const solved = createSolvedSquareOneState();
    const [unslashableMove] = parseSquareOneAlgorithm('(-1,0)');
    const unslashable = applySquareOneMove(solved, unslashableMove);
    const successors = getSquareOneSuccessors(solved);
    const scrambleSuccessors = getSquareOneScrambleSuccessors(solved);
    const unslashableSuccessors = getSquareOneSuccessors(unslashable);
    const unslashableScrambleSuccessors = getSquareOneScrambleSuccessors(unslashable);

    expect(successors).toHaveLength(144);
    expect(successors.filter((successor) => successor.move.type === 'slash')).toHaveLength(1);
    expect(scrambleSuccessors).toHaveLength(64);
    expect(scrambleSuccessors.some((successor) => successor.move.type === 'slash')).toBe(true);
    expect(scrambleSuccessors.every((successor) => canSquareOneSlash(successor.state))).toBe(true);
    expect(unslashableSuccessors).toHaveLength(143);
    expect(unslashableScrambleSuccessors).toHaveLength(64);
    expect(unslashableScrambleSuccessors.some((successor) => successor.move.type === 'slash')).toBe(
      false,
    );
  });

  it('reports WCA and slashability move costs', () => {
    const [tuple, slash] = parseSquareOneAlgorithm('(-5,6) /');

    expect(getSquareOneMoveCost(tuple)).toBe(1);
    expect(getSquareOneMoveCost(slash)).toBe(1);
    expect(getSquareOneSlashabilityMoveCost(tuple)).toBe(11);
    expect(getSquareOneSlashabilityMoveCost(slash)).toBeUndefined();
  });

  it('rejects malformed move API inputs in cost helpers', () => {
    const malformedMoves = [
      null,
      42,
      { type: 'tuple', top: 0, bottom: 0 },
      { type: 'tuple', top: 7, bottom: 0 },
      { type: 'tuple', top: 1, bottom: '0' },
      { type: 'slash', top: 0 },
    ];

    for (const move of malformedMoves) {
      expect(() => getSquareOneMoveCost(move as unknown as SquareOneMove)).toThrow(
        InvalidMoveError,
      );
      expect(() => getSquareOneSlashabilityMoveCost(move as unknown as SquareOneMove)).toThrow(
        InvalidMoveError,
      );
    }
  });

  it('rejects malformed move API inputs', () => {
    expect(() =>
      applySquareOneMove(createSolvedSquareOneState(), {
        type: 'tuple',
        top: 0,
        bottom: 0,
      } as SquareOneMove),
    ).toThrow(InvalidMoveError);
  });

  it('does not treat malformed Square-1 states as solved', () => {
    const definition = createSquareOneDefinition();

    expect(definition.isSolved({ sliceSolved: true, pieces: [] } as never)).toBe(false);
  });
});
