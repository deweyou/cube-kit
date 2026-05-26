import { describe, expect, it } from 'vitest';
import { applyAlgorithm } from '../algorithm.js';
import { InvalidMoveError, InvalidScrambleError } from '../errors.js';
import { createSkewbDefinition } from './skewb-definition.js';
import { parseSkewbAlgorithm } from './skewb-parser.js';
import { applySkewbMove, areSkewbStatesEqual, createSolvedSkewbState } from './skewb-state.js';

const MOVE_INVERSES = [
  ['R', "R'"],
  ['U', "U'"],
  ['L', "L'"],
  ['B', "B'"],
] as const;

describe('parseSkewbAlgorithm', () => {
  it('parses TNoodle Skewb fixed-corner notation', () => {
    expect(parseSkewbAlgorithm("R U L B R' U'")).toHaveLength(6);
  });

  it('rejects malformed Skewb moves', () => {
    expect(() => parseSkewbAlgorithm('R2')).toThrow(InvalidMoveError);
    expect(() => parseSkewbAlgorithm('F')).toThrow("move 'F' is invalid for puzzle 'skewb'");
    expect(() => parseSkewbAlgorithm('r')).toThrow(InvalidMoveError);
  });

  it('parses empty and whitespace algorithms as no moves', () => {
    expect(parseSkewbAlgorithm('')).toEqual([]);
    expect(parseSkewbAlgorithm('  \n\t  ')).toEqual([]);
  });
});

describe('Skewb state transitions', () => {
  it('creates immutable solved Skewb states', () => {
    const state = createSolvedSkewbState();

    expect(state.image).toHaveLength(6);
    expect(state.image.every((face) => face.length === 5)).toBe(true);
    expect(state.image[0].every((sticker) => sticker === 0)).toBe(true);
    expect(state.image[5].every((sticker) => sticker === 5)).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.image)).toBe(true);
    expect(Object.isFrozen(state.image[0])).toBe(true);
    expect(() => {
      (state.image[0] as number[])[0] = 1;
    }).toThrow(TypeError);
  });

  it.each(MOVE_INVERSES)('restores solved after %s and %s', (move, inverse) => {
    const definition = createSkewbDefinition();

    const moved = definition.applyAlgorithm(definition.createSolvedState(), `${move} ${inverse}`);

    expect(definition.isSolved(moved)).toBe(true);
  });

  it('matches the TNoodle R turn sticker transition', () => {
    const [move] = parseSkewbAlgorithm('R');
    const moved = applySkewbMove(createSolvedSkewbState(), move);

    expect(moved.image).toEqual([
      [0, 0, 0, 0, 4],
      [2, 2, 1, 2, 2],
      [3, 2, 3, 3, 3],
      [1, 1, 1, 3, 1],
      [4, 4, 4, 4, 5],
      [5, 5, 5, 0, 5],
    ]);
  });

  it('wraps invalid algorithms through the shared applyAlgorithm helper', () => {
    const definition = createSkewbDefinition();

    expect(() => applyAlgorithm(definition, definition.createSolvedState(), 'R2')).toThrow(
      InvalidScrambleError,
    );
  });

  it('rejects malformed move API inputs', () => {
    const state = createSolvedSkewbState();

    for (const move of [
      null,
      { face: 'R', amount: 3 },
      { face: 'F', amount: 1 },
      { face: 'R', amount: '1' },
    ]) {
      expect(() => applySkewbMove(state, move as never)).toThrow(InvalidMoveError);
    }
  });

  it('compares Skewb states by sticker image', () => {
    const [move] = parseSkewbAlgorithm('B');

    expect(areSkewbStatesEqual(createSolvedSkewbState(), createSolvedSkewbState())).toBe(true);
    expect(
      areSkewbStatesEqual(createSolvedSkewbState(), applySkewbMove(createSolvedSkewbState(), move)),
    ).toBe(false);
  });

  it('rejects malformed Skewb states when applying moves', () => {
    const [move] = parseSkewbAlgorithm('R');

    expect(() =>
      applySkewbMove(
        {
          image: [[], [], [], [], [], []],
        },
        move,
      ),
    ).toThrow(RangeError);
    expect(() =>
      applySkewbMove(
        {
          image: [
            Array(5).fill(99),
            Array(5).fill(1),
            Array(5).fill(2),
            Array(5).fill(3),
            Array(5).fill(4),
            Array(5).fill(5),
          ],
        },
        move,
      ),
    ).toThrow(RangeError);
  });

  it('does not treat partial malformed Skewb states as solved', () => {
    const definition = createSkewbDefinition();

    expect(definition.isSolved({ image: [[1]] })).toBe(false);
  });
});
