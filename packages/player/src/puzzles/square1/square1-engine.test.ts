import { describe, expect, it } from 'vitest';
import { createSolvedSquareOneEngineState } from './square1-engine.js';

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
});
