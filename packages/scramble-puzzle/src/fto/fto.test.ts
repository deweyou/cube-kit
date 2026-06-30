import { describe, expect, it } from 'vitest';
import { applyAlgorithm } from '../algorithm.js';
import { InvalidMoveError, InvalidScrambleError } from '../errors.js';
import { createFtoDefinition } from './fto-definition.js';
import { parseFtoAlgorithm } from './fto-parser.js';
import { applyFtoMove, areFtoStatesEqual, createSolvedFtoState } from './fto-state.js';

const MOVE_INVERSES = [
  ['U', "U'"],
  ['D', "D'"],
  ['F', "F'"],
  ['B', "B'"],
  ['L', "L'"],
  ['R', "R'"],
  ['BL', "BL'"],
  ['BR', "BR'"],
] as const;

describe('parseFtoAlgorithm', () => {
  it('parses FTO face-turn notation', () => {
    expect(parseFtoAlgorithm("U D F B L R BL BR U' BR'")).toEqual([
      { face: 'U', amount: 1 },
      { face: 'D', amount: 1 },
      { face: 'F', amount: 1 },
      { face: 'B', amount: 1 },
      { face: 'L', amount: 1 },
      { face: 'R', amount: 1 },
      { face: 'BL', amount: 1 },
      { face: 'BR', amount: 1 },
      { face: 'U', amount: 2 },
      { face: 'BR', amount: 2 },
    ]);
  });

  it('rejects unsupported FTO notation', () => {
    expect(() => parseFtoAlgorithm('U2')).toThrow(InvalidMoveError);
    expect(() => parseFtoAlgorithm('br')).toThrow(InvalidMoveError);
    expect(() => parseFtoAlgorithm('Rw')).toThrow(InvalidMoveError);
    expect(() => parseFtoAlgorithm('x')).toThrow(InvalidMoveError);
  });

  it('parses empty and whitespace algorithms as no moves', () => {
    expect(parseFtoAlgorithm('')).toEqual([]);
    expect(parseFtoAlgorithm('  \n\t  ')).toEqual([]);
  });
});

describe('FTO state transitions', () => {
  it('creates immutable solved FTO states', () => {
    const state = createSolvedFtoState();

    expect(state.image).toHaveLength(8);
    expect(state.image.every((face) => face.length === 9)).toBe(true);
    expect(state.image[0].every((sticker) => sticker === 0)).toBe(true);
    expect(state.image[7].every((sticker) => sticker === 7)).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.image)).toBe(true);
    expect(Object.isFrozen(state.image[0])).toBe(true);
    expect(() => {
      (state.image[0] as number[])[0] = 1;
    }).toThrow(TypeError);
  });

  it.each(MOVE_INVERSES)('restores solved after %s and %s', (move, inverse) => {
    const definition = createFtoDefinition();

    const moved = definition.applyAlgorithm(definition.createSolvedState(), `${move} ${inverse}`);

    expect(definition.isSolved(moved)).toBe(true);
  });

  it('applies csTimer-derived FTO facelet permutations', () => {
    const [move] = parseFtoAlgorithm('U');
    const moved = applyFtoMove(createSolvedFtoState(), move);

    expect(moved.image[0].every((sticker) => sticker === 0)).toBe(true);
    expect(areFtoStatesEqual(moved, createSolvedFtoState())).toBe(false);
    expect(
      moved.image.flat().reduce<Record<number, number>>((counts, sticker) => {
        counts[sticker] = (counts[sticker] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ 0: 9, 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9 });
  });

  it('wraps invalid algorithms through the shared applyAlgorithm helper', () => {
    const definition = createFtoDefinition();

    expect(() => applyAlgorithm(definition, definition.createSolvedState(), 'U2')).toThrow(
      InvalidScrambleError,
    );
  });

  it('rejects malformed move API inputs', () => {
    const state = createSolvedFtoState();

    for (const move of [
      null,
      { face: 'U', amount: 3 },
      { face: 'X', amount: 1 },
      { face: 'U', amount: '1' },
    ]) {
      expect(() => applyFtoMove(state, move as never)).toThrow(InvalidMoveError);
    }
  });

  it('compares FTO states by sticker image', () => {
    const [move] = parseFtoAlgorithm('BR');

    expect(areFtoStatesEqual(createSolvedFtoState(), createSolvedFtoState())).toBe(true);
    expect(
      areFtoStatesEqual(createSolvedFtoState(), applyFtoMove(createSolvedFtoState(), move)),
    ).toBe(false);
  });

  it('rejects malformed FTO states when applying moves', () => {
    const [move] = parseFtoAlgorithm('U');

    expect(() =>
      applyFtoMove(
        {
          image: [[], [], [], [], [], [], [], []],
        },
        move,
      ),
    ).toThrow(RangeError);
    expect(() =>
      applyFtoMove(
        {
          image: [
            Array(9).fill(99),
            Array(9).fill(1),
            Array(9).fill(2),
            Array(9).fill(3),
            Array(9).fill(4),
            Array(9).fill(5),
            Array(9).fill(6),
            Array(9).fill(7),
          ],
        },
        move,
      ),
    ).toThrow(RangeError);
  });

  it('does not treat partial malformed FTO states as solved', () => {
    const definition = createFtoDefinition();

    expect(definition.isSolved({ image: [[1]] })).toBe(false);
  });
});
