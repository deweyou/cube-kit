import { describe, expect, it } from 'vitest';
import { applyAlgorithm } from '../algorithm.js';
import { InvalidMoveError, InvalidScrambleError } from '../errors.js';
import { createMegaminxDefinition } from './megaminx-definition.js';
import {
  MEGAMINX_FACES,
  parseMegaminxAlgorithm,
  type MegaminxBigTurnName,
  type MegaminxFace,
} from './megaminx-parser.js';
import {
  applyMegaminxMove,
  areMegaminxStatesEqual,
  createSolvedMegaminxState,
} from './megaminx-state.js';

const FACE_MOVE_SUFFIXES = ['', '2', "2'", "'"] as const;
const BIG_TURN_SUFFIXES = ['+', '++', '--', '-'] as const;
const BIG_TURN_NAMES = ['R', 'D'] as const satisfies readonly MegaminxBigTurnName[];

const FACE_MOVE_INVERSE_SUFFIX: ReadonlyMap<string, string> = new Map([
  ['', "'"],
  ['2', "2'"],
  ["2'", '2'],
  ["'", ''],
]);

const BIG_TURN_INVERSE_SUFFIX: ReadonlyMap<string, string> = new Map([
  ['+', '-'],
  ['++', '--'],
  ['--', '++'],
  ['-', '+'],
]);

const repeatMove = (move: string, count: number): string =>
  Array<string>(count).fill(move).join(' ');

const createSevenLineScramble = (): string =>
  Array.from({ length: 7 }, (_, row) => {
    const moves = Array.from({ length: 10 }, (__, column) => {
      const side = column % 2 === 0 ? 'R' : 'D';
      const suffix = (row + column) % 2 === 0 ? '++' : '--';

      return `${side}${suffix}`;
    });

    moves.push(row % 2 === 0 ? "U'" : 'U');

    return moves.join(' ');
  }).join('\n');

describe('parseMegaminxAlgorithm', () => {
  it('parses TNoodle Megaminx notation', () => {
    expect(parseMegaminxAlgorithm("R++ D-- R-- D++ U'")).toHaveLength(5);
    expect(parseMegaminxAlgorithm("U BL2 BR2' R' F L D DR DBR B DBL DL")).toHaveLength(12);
  });

  it('rejects malformed Megaminx moves', () => {
    expect(() => parseMegaminxAlgorithm('R+++')).toThrow(InvalidMoveError);
    expect(() => parseMegaminxAlgorithm('M')).toThrow("move 'M' is invalid for puzzle 'megaminx'");
    expect(() => parseMegaminxAlgorithm('BL+')).toThrow(InvalidMoveError);
  });

  it('parses empty and whitespace algorithms as no moves', () => {
    expect(parseMegaminxAlgorithm('')).toEqual([]);
    expect(parseMegaminxAlgorithm('  \n\t  ')).toEqual([]);
  });
});

describe('Megaminx state transitions', () => {
  it('creates immutable solved Megaminx states', () => {
    const state = createSolvedMegaminxState();

    expect(state.image).toHaveLength(12);
    expect(state.image.every((face) => face.length === 11)).toBe(true);
    expect(state.image[0].every((sticker) => sticker === 0)).toBe(true);
    expect(state.image[11].every((sticker) => sticker === 11)).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.image)).toBe(true);
    expect(Object.isFrozen(state.image[0])).toBe(true);
    expect(() => {
      (state.image[0] as number[])[0] = 1;
    }).toThrow(TypeError);
  });

  it('applies a move and its inverse back to solved', () => {
    const definition = createMegaminxDefinition();
    const solved = definition.createSolvedState();
    const [move, inverse] = definition.parseAlgorithm('R++ R--');
    const restored = definition.applyMove(definition.applyMove(solved, move), inverse);

    expect(definition.isSolved(restored)).toBe(true);
  });

  it.each(
    MEGAMINX_FACES.flatMap((face) =>
      FACE_MOVE_SUFFIXES.map((suffix) => [`${face}${suffix}`] as const),
    ),
  )('restores solved after five %s face moves', (move) => {
    const definition = createMegaminxDefinition();

    const moved = definition.applyAlgorithm(definition.createSolvedState(), repeatMove(move, 5));

    expect(definition.isSolved(moved)).toBe(true);
  });

  it.each(
    MEGAMINX_FACES.flatMap((face: MegaminxFace) =>
      FACE_MOVE_SUFFIXES.map((suffix) => {
        const inverseSuffix = FACE_MOVE_INVERSE_SUFFIX.get(suffix);
        if (inverseSuffix === undefined) {
          throw new Error(`missing inverse suffix for '${suffix}'`);
        }

        return [`${face}${suffix}`, `${face}${inverseSuffix}`] as const;
      }),
    ),
  )('restores solved after face move %s and inverse %s', (move, inverse) => {
    const definition = createMegaminxDefinition();

    const moved = definition.applyAlgorithm(definition.createSolvedState(), `${move} ${inverse}`);

    expect(definition.isSolved(moved)).toBe(true);
  });

  it.each(
    BIG_TURN_NAMES.flatMap((name) =>
      BIG_TURN_SUFFIXES.map((suffix) => [`${name}${suffix}`] as const),
    ),
  )('restores solved after five %s big turns', (move) => {
    const definition = createMegaminxDefinition();

    const moved = definition.applyAlgorithm(definition.createSolvedState(), repeatMove(move, 5));

    expect(definition.isSolved(moved)).toBe(true);
  });

  it.each(
    BIG_TURN_NAMES.flatMap((name) =>
      BIG_TURN_SUFFIXES.map((suffix) => {
        const inverseSuffix = BIG_TURN_INVERSE_SUFFIX.get(suffix);
        if (inverseSuffix === undefined) {
          throw new Error(`missing inverse suffix for '${suffix}'`);
        }

        return [`${name}${suffix}`, `${name}${inverseSuffix}`] as const;
      }),
    ),
  )('restores solved after big turn %s and inverse %s', (move, inverse) => {
    const definition = createMegaminxDefinition();

    const moved = definition.applyAlgorithm(definition.createSolvedState(), `${move} ${inverse}`);

    expect(definition.isSolved(moved)).toBe(true);
  });

  it('parses and applies a generated seven-line scramble', () => {
    const definition = createMegaminxDefinition();
    const scramble = createSevenLineScramble();

    expect(scramble.split('\n')).toHaveLength(7);
    expect(() => definition.applyAlgorithm(definition.createSolvedState(), scramble)).not.toThrow();
  });

  it('keeps big-turn centers compatible with TNoodle state shape', () => {
    const [move] = parseMegaminxAlgorithm('R++');
    const moved = applyMegaminxMove(createSolvedMegaminxState(), move);

    expect(moved.image[0][10]).toBe(11);
    expect(moved.image[4][10]).toBe(10);
  });

  it('wraps invalid algorithms through the shared applyAlgorithm helper', () => {
    const definition = createMegaminxDefinition();

    expect(() => applyAlgorithm(definition, definition.createSolvedState(), 'R+++')).toThrow(
      InvalidScrambleError,
    );
  });

  it('compares non-equal Megaminx states', () => {
    const solved = createSolvedMegaminxState();
    const moved = applyMegaminxMove(solved, parseMegaminxAlgorithm('U')[0]);

    expect(areMegaminxStatesEqual(solved, moved)).toBe(false);
  });
});
