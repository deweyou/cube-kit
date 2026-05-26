import { describe, expect, it } from 'vitest';
import { applyAlgorithm } from '../algorithm.js';
import { InvalidMoveError, InvalidScrambleError } from '../errors.js';
import { createClockDefinition } from './clock-definition.js';
import { applyClockMove, areClockStatesEqual, createSolvedClockState } from './clock-state.js';
import { parseClockAlgorithm } from './clock-parser.js';

describe('parseClockAlgorithm', () => {
  it('parses TNoodle Clock notation', () => {
    expect(
      parseClockAlgorithm('UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+ y2 U1- R2- D3+ L4- ALL5-'),
    ).toHaveLength(15);
  });

  it('rejects malformed Clock moves', () => {
    expect(() => parseClockAlgorithm('UR7+')).toThrow(InvalidMoveError);
    expect(() => parseClockAlgorithm('UR0-')).toThrow(InvalidMoveError);
    expect(() => parseClockAlgorithm('UR6-')).toThrow(InvalidMoveError);
    expect(() => parseClockAlgorithm('A5+')).toThrow("move 'A5+' is invalid for puzzle 'clock'");
    expect(() => parseClockAlgorithm('y')).toThrow(InvalidMoveError);
  });

  it('parses empty and whitespace algorithms as no moves', () => {
    expect(parseClockAlgorithm('')).toEqual([]);
    expect(parseClockAlgorithm('  \n\t  ')).toEqual([]);
  });
});

describe('Clock state transitions', () => {
  it('creates immutable solved Clock states', () => {
    const state = createSolvedClockState();

    expect(state.positions).toHaveLength(18);
    expect(state.positions.every((position) => position === 0)).toBe(true);
    expect(state.rightSideUp).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.positions)).toBe(true);
    expect(() => {
      (state.positions as number[])[0] = 1;
    }).toThrow(TypeError);
  });

  it('applies a move and its inverse back to solved', () => {
    const definition = createClockDefinition();
    const solved = definition.createSolvedState();
    const [move, inverse] = definition.parseAlgorithm('UR3+ UR3-');
    const restored = definition.applyMove(definition.applyMove(solved, move), inverse);

    expect(definition.isSolved(restored)).toBe(true);
  });

  it('applies algorithms through the Clock definition wrapper', () => {
    const definition = createClockDefinition();
    const solved = definition.createSolvedState();
    const moved = definition.applyAlgorithm(solved, 'UR3+ DR2- y2');
    const restored = definition.applyAlgorithm(moved, 'y2 DR2+ UR3-');

    expect(definition.isSolved(moved)).toBe(false);
    expect(definition.isSolved(restored)).toBe(true);
  });

  it('applies y2 by swapping sides and toggling orientation', () => {
    const [move, rotation] = parseClockAlgorithm('UR3+ y2');
    const moved = applyClockMove(createSolvedClockState(), move);
    const rotated = applyClockMove(moved, rotation);

    expect(rotated.rightSideUp).toBe(false);
    expect(rotated.positions.slice(9)).toEqual(moved.positions.slice(0, 9));
    expect(rotated.positions.slice(0, 9)).toEqual(moved.positions.slice(9));
  });

  it('does not treat the opposite Clock side as solved', () => {
    const definition = createClockDefinition();
    const [rotation] = parseClockAlgorithm('y2');
    const rotated = applyClockMove(definition.createSolvedState(), rotation);

    expect(areClockStatesEqual(definition.createSolvedState(), rotated)).toBe(false);
    expect(definition.isSolved(rotated)).toBe(false);
  });

  it('wraps invalid algorithms through the shared applyAlgorithm helper', () => {
    const definition = createClockDefinition();

    expect(() => applyAlgorithm(definition, definition.createSolvedState(), 'UR7+')).toThrow(
      InvalidScrambleError,
    );
  });

  it('rejects malformed Clock move API inputs', () => {
    const state = createSolvedClockState();

    for (const move of [
      null,
      { type: 'turn', name: 'UR', amount: 1, direction: '*' },
      { type: 'turn', name: 'UR', amount: 7, direction: '+' },
      { type: 'turn', name: 'UR', amount: 0, direction: '-' },
      { type: 'turn', name: 'bogus', amount: 1, direction: '+' },
    ]) {
      expect(() => applyClockMove(state, move as never)).toThrow(InvalidMoveError);
    }
  });

  it('rejects malformed Clock states when applying moves', () => {
    const [turn, rotation] = parseClockAlgorithm('UR1+ y2');

    expect(() =>
      applyClockMove({ positions: [0, 0, 0], rightSideUp: true }, rotation),
    ).toThrow(RangeError);
    expect(() =>
      applyClockMove({ positions: Array(19).fill(0), rightSideUp: true }, turn),
    ).toThrow(RangeError);
  });

  it('compares non-equal Clock states', () => {
    const solved = createSolvedClockState();
    const moved = applyClockMove(solved, parseClockAlgorithm('UR1+')[0]);

    expect(areClockStatesEqual(solved, moved)).toBe(false);
  });

  it('does not treat partial malformed Clock states as solved', () => {
    const definition = createClockDefinition();

    expect(definition.isSolved({ positions: [1], rightSideUp: true })).toBe(false);
  });
});
