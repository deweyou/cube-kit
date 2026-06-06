import { describe, expect, it } from 'vitest';
import { applyAlgorithm } from '../algorithm.js';
import { InvalidMoveError, InvalidScrambleError } from '../errors.js';
import { createPyraminxDefinition } from './pyraminx-definition.js';
import { parsePyraminxAlgorithm } from './pyraminx-parser.js';
import {
  applyPyraminxMove,
  arePyraminxStatesEqual,
  createSolvedPyraminxState,
} from './pyraminx-state.js';

const MOVE_INVERSES = [
  ['U', "U'"],
  ['L', "L'"],
  ['R', "R'"],
  ['B', "B'"],
  ['u', "u'"],
  ['l', "l'"],
  ['r', "r'"],
  ['b', "b'"],
] as const;

describe('parsePyraminxAlgorithm', () => {
  it('parses TNoodle Pyraminx notation', () => {
    expect(parsePyraminxAlgorithm("U L R B u' l' r' b'")).toHaveLength(8);
  });

  it('rejects malformed Pyraminx moves', () => {
    expect(() => parsePyraminxAlgorithm('U2')).toThrow(InvalidMoveError);
    expect(() => parsePyraminxAlgorithm('F')).toThrow("move 'F' is invalid for puzzle 'pyraminx'");
    expect(() => parsePyraminxAlgorithm("uu'")).toThrow(InvalidMoveError);
  });

  it('parses empty and whitespace algorithms as no moves', () => {
    expect(parsePyraminxAlgorithm('')).toEqual([]);
    expect(parsePyraminxAlgorithm('  \n\t  ')).toEqual([]);
  });
});

describe('Pyraminx state transitions', () => {
  it('creates immutable solved Pyraminx states', () => {
    const state = createSolvedPyraminxState();

    expect(state.image).toHaveLength(4);
    expect(state.image.every((face) => face.length === 9)).toBe(true);
    expect(state.image[0].every((sticker) => sticker === 0)).toBe(true);
    expect(state.image[3].every((sticker) => sticker === 3)).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.image)).toBe(true);
    expect(Object.isFrozen(state.image[0])).toBe(true);
    expect(() => {
      (state.image[0] as number[])[0] = 1;
    }).toThrow(TypeError);
  });

  it.each(MOVE_INVERSES)('restores solved after %s and %s', (move, inverse) => {
    const definition = createPyraminxDefinition();

    const moved = definition.applyAlgorithm(definition.createSolvedState(), `${move} ${inverse}`);

    expect(definition.isSolved(moved)).toBe(true);
  });

  it('turns the attached tip during a full face turn', () => {
    const [fullTurn] = parsePyraminxAlgorithm('U');
    const [tipTurn] = parsePyraminxAlgorithm('u');
    const fullTurnState = applyPyraminxMove(createSolvedPyraminxState(), fullTurn);
    const tipTurnState = applyPyraminxMove(createSolvedPyraminxState(), tipTurn);

    expect(fullTurnState.image[0][0]).toBe(tipTurnState.image[0][0]);
    expect(fullTurnState.image[2][3]).toBe(tipTurnState.image[2][3]);
    expect(fullTurnState.image[3][0]).toBe(tipTurnState.image[3][0]);
    expect(arePyraminxStatesEqual(fullTurnState, tipTurnState)).toBe(false);
  });

  it('keeps tip-only turns local to the three tip stickers', () => {
    const [move] = parsePyraminxAlgorithm('u');
    const moved = applyPyraminxMove(createSolvedPyraminxState(), move);
    const changedStickers = moved.image.flatMap((face, faceIndex) =>
      face
        .map((sticker, stickerIndex) => ({ faceIndex, sticker, stickerIndex }))
        .filter(({ faceIndex: index, sticker }) => sticker !== index),
    );

    expect(changedStickers).toEqual([
      { faceIndex: 0, sticker: 3, stickerIndex: 0 },
      { faceIndex: 2, sticker: 0, stickerIndex: 3 },
      { faceIndex: 3, sticker: 2, stickerIndex: 0 },
    ]);
  });

  it('wraps invalid algorithms through the shared applyAlgorithm helper', () => {
    const definition = createPyraminxDefinition();

    expect(() => applyAlgorithm(definition, definition.createSolvedState(), 'U2')).toThrow(
      InvalidScrambleError,
    );
  });

  it('rejects malformed move API inputs', () => {
    const state = createSolvedPyraminxState();

    for (const move of [
      null,
      { type: 'turn', face: 'U', amount: 3 },
      { type: 'tip', face: 'F', amount: 1 },
      { type: 'unknown', face: 'U', amount: 1 },
    ]) {
      expect(() => applyPyraminxMove(state, move as never)).toThrow(InvalidMoveError);
    }
  });

  it('rejects malformed Pyraminx states when applying moves', () => {
    const [move] = parsePyraminxAlgorithm('u');

    expect(() =>
      applyPyraminxMove(
        {
          image: [[], [], [], []],
        },
        move,
      ),
    ).toThrow(RangeError);
    expect(() =>
      applyPyraminxMove(
        {
          image: [Array(9).fill(99), Array(9).fill(1), Array(9).fill(2), Array(9).fill(3)],
        },
        move,
      ),
    ).toThrow(RangeError);
  });

  it('does not treat partial malformed Pyraminx states as solved', () => {
    const definition = createPyraminxDefinition();

    expect(definition.isSolved({ image: [[1]] })).toBe(false);
  });
});
