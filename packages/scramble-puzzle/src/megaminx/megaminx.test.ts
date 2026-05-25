import { describe, expect, it } from 'vitest';
import { applyAlgorithm } from '../algorithm.js';
import { InvalidMoveError, InvalidScrambleError } from '../errors.js';
import { createMegaminxDefinition } from './megaminx-definition.js';
import { parseMegaminxAlgorithm } from './megaminx-parser.js';
import {
  applyMegaminxMove,
  areMegaminxStatesEqual,
  createSolvedMegaminxState,
} from './megaminx-state.js';

describe('parseMegaminxAlgorithm', () => {
  it('parses TNoodle Megaminx notation', () => {
    expect(parseMegaminxAlgorithm("R++ D-- R-- D++ U'")).toHaveLength(5);
    expect(parseMegaminxAlgorithm("U BL2 BR2' R' F L D DR DBR B DBL DL")).toHaveLength(12);
  });

  it('rejects malformed Megaminx moves', () => {
    expect(() => parseMegaminxAlgorithm('R+++')).toThrow(InvalidMoveError);
    expect(() => parseMegaminxAlgorithm('M')).toThrow(
      "move 'M' is invalid for puzzle 'megaminx'",
    );
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
    const [move, inverse] = definition.parseAlgorithm("R++ R--");
    const restored = definition.applyMove(definition.applyMove(solved, move), inverse);

    expect(definition.isSolved(restored)).toBe(true);
  });

  it('keeps big-turn centers compatible with TNoodle state shape', () => {
    const [move] = parseMegaminxAlgorithm('R++');
    const moved = applyMegaminxMove(createSolvedMegaminxState(), move);

    expect(moved.image[0][10]).toBe(11);
    expect(moved.image[4][10]).toBe(10);
  });

  it('wraps invalid algorithms through the shared applyAlgorithm helper', () => {
    const definition = createMegaminxDefinition();

    expect(() =>
      applyAlgorithm(definition, definition.createSolvedState(), 'R+++'),
    ).toThrow(InvalidScrambleError);
  });

  it('compares non-equal Megaminx states', () => {
    const solved = createSolvedMegaminxState();
    const moved = applyMegaminxMove(solved, parseMegaminxAlgorithm('U')[0]);

    expect(areMegaminxStatesEqual(solved, moved)).toBe(false);
  });
});
