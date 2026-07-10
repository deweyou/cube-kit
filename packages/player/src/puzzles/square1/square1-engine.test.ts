import { describe, expect, it } from 'vitest';
import {
  commitSquareOneTransform,
  createSolvedSquareOneEngineState,
  describeSquareOneMoveTransform,
  describeSquareOneSlashTransform,
  describeSquareOneTupleTransform,
  type SquareOneEngineMove,
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

  it('uses player renderable piece ids as physical piece ids', () => {
    const state = createSolvedSquareOneEngineState();

    expect([...new Set(state.wedges.map((slot) => slot.pieceId))].sort()).toEqual(
      Array.from({ length: 16 }, (_, piece) => `square1-piece-${piece}`).sort(),
    );
  });

  it('turns (1,0) by one top half-slot clockwise', () => {
    const state = createSolvedSquareOneEngineState();
    const transform = describeSquareOneTupleTransform({ bottom: 0, top: 1 }, state);
    const nextState = commitSquareOneTransform(state, transform);

    expect(transform.operations).toHaveLength(1);
    expect(transform.operations[0]).toMatchObject({
      angleRadians: -Math.PI / 6,
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
      angleRadians: -Math.PI / 6,
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

  it('slashes by swapping the canonical top-right and bottom-left half-slot ranges', () => {
    const state = createSolvedSquareOneEngineState();
    const transform = describeSquareOneSlashTransform(state);
    const nextState = commitSquareOneTransform(state, transform);

    expect(transform.operations).toHaveLength(1);
    expect(transform.operations[0]).toMatchObject({
      angleRadians: -Math.PI,
      affectedPieceIds: expect.arrayContaining(['square1-middle-right']),
      type: 'axis-rotation',
    });
    expect(transform.durationMultiplier).toBeGreaterThan(1);
    expect(nextState.equatorOrientation).toBe(3);
    expect(nextState.wedges.slice(6, 12).map((slot) => slot.pieceId)).toEqual(
      state.wedges.slice(12, 18).map((slot) => slot.pieceId),
    );
    expect(nextState.wedges.slice(12, 18).map((slot) => slot.pieceId)).toEqual(
      state.wedges.slice(6, 12).map((slot) => slot.pieceId),
    );
    expect(nextState.wedges.slice(18).map((slot) => slot.pieceId)).toEqual(
      state.wedges.slice(18).map((slot) => slot.pieceId),
    );
    const slashOperation = transform.operations[0];

    expect(slashOperation?.type).toBe('axis-rotation');
    if (slashOperation?.type !== 'axis-rotation') return;

    expect(slashOperation.affectedPieceIds).not.toContain(state.wedges[18]?.pieceId);
  });

  it('keeps committed tuple state aligned with the expected half-slot rotations', () => {
    const state = createSolvedSquareOneEngineState();
    const turn = { bottom: -2, top: 3, type: 'tuple' } as const satisfies SquareOneEngineMove;
    const transform = describeSquareOneMoveTransform(turn, state);
    const nextState = commitSquareOneTransform(state, transform);

    expect(nextState.equatorOrientation).toBe(state.equatorOrientation);
    expect(nextState.wedges.slice(0, 12).map((slot) => slot.pieceId)).toEqual([
      ...state.wedges.slice(9, 12).map((slot) => slot.pieceId),
      ...state.wedges.slice(0, 9).map((slot) => slot.pieceId),
    ]);
    expect(nextState.wedges.slice(12).map((slot) => slot.pieceId)).toEqual([
      ...state.wedges.slice(14).map((slot) => slot.pieceId),
      ...state.wedges.slice(12, 14).map((slot) => slot.pieceId),
    ]);
  });
});
