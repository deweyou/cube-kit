import { describe, expect, it } from 'vitest';
import {
  commitSquareOneTransform,
  createSolvedSquareOneEngineState,
  describeSquareOneSlashTransform,
  describeSquareOneTupleTransform,
} from './square1-engine.js';

describe('Square-1 engine state', () => {
  it('starts with 24 half-slots and 16 physical pieces', () => {
    const state = createSolvedSquareOneEngineState();

    expect(state.wedges).toHaveLength(24);
    expect(new Set(state.wedges.map((slot) => slot.pieceId))).toHaveLength(16);
    expect(state.equatorOrientation).toBe(0);
  });

  it('models corners as two half-slots and edges as one half-slot', () => {
    const state = createSolvedSquareOneEngineState();
    const slotCountsByPiece = new Map<string, number>();

    for (const slot of state.wedges) {
      slotCountsByPiece.set(slot.pieceId, (slotCountsByPiece.get(slot.pieceId) ?? 0) + 1);
    }

    expect([...slotCountsByPiece.values()].sort((left, right) => left - right)).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2,
    ]);
  });

  it('turns (1,0) by one top half-slot clockwise', () => {
    const state = createSolvedSquareOneEngineState();
    const transform = describeSquareOneTupleTransform({ bottom: 0, top: 1 }, state);
    const nextState = commitSquareOneTransform(state, transform);

    expect(transform.operations).toHaveLength(1);
    expect(transform.operations[0]).toMatchObject({
      angleRadians: Math.PI / 6,
      axis: { x: 0, y: 1, z: 0 },
      type: 'axis-rotation',
    });
    expect(nextState.wedges.slice(0, 12).map((slot) => slot.pieceId)).toEqual([
      state.wedges[11]?.pieceId,
      ...state.wedges.slice(0, 11).map((slot) => slot.pieceId),
    ]);
    expect(nextState.wedges.slice(12).map((slot) => slot.pieceId)).toEqual(
      state.wedges.slice(12).map((slot) => slot.pieceId),
    );
  });

  it('turns (0,-1) by one bottom half-slot in the inverse direction', () => {
    const state = createSolvedSquareOneEngineState();
    const transform = describeSquareOneTupleTransform({ bottom: -1, top: 0 }, state);
    const nextState = commitSquareOneTransform(state, transform);

    expect(transform.operations).toHaveLength(1);
    expect(transform.operations[0]).toMatchObject({
      angleRadians: Math.PI / 6,
      axis: { x: 0, y: 1, z: 0 },
      type: 'axis-rotation',
    });
    expect(nextState.wedges.slice(0, 12).map((slot) => slot.pieceId)).toEqual(
      state.wedges.slice(0, 12).map((slot) => slot.pieceId),
    );
    expect(nextState.wedges.slice(12).map((slot) => slot.pieceId)).toEqual([
      ...state.wedges.slice(13).map((slot) => slot.pieceId),
      state.wedges[12]?.pieceId,
    ]);
  });

  it('slashes by swapping the current top-right and bottom-left half-slot ranges', () => {
    const state = createSolvedSquareOneEngineState();
    const transform = describeSquareOneSlashTransform(state);
    const nextState = commitSquareOneTransform(state, transform);

    expect(transform.operations).toHaveLength(1);
    expect(transform.operations[0]).toMatchObject({
      angleRadians: Math.PI,
      type: 'axis-rotation',
    });
    expect(nextState.equatorOrientation).toBe(3);
    expect(nextState.wedges.slice(6, 12).map((slot) => slot.pieceId)).toEqual(
      state.wedges.slice(12, 18).map((slot) => slot.pieceId),
    );
    expect(nextState.wedges.slice(12, 18).map((slot) => slot.pieceId)).toEqual(
      state.wedges.slice(6, 12).map((slot) => slot.pieceId),
    );
  });
});
