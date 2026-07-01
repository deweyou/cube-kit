import { describe, expect, it } from 'vitest';
import { createCubePlayerAdapter } from './cube-player-adapter.js';

const expectMoveUsesTrackedState = (
  adapter: ReturnType<typeof createCubePlayerAdapter>,
  formula: string,
) => {
  const [firstMove, secondMove] = adapter.parseFormula(formula);

  if (firstMove === undefined || secondMove === undefined) {
    throw new Error(`expected two cube moves for ${formula}`);
  }

  const initialState = adapter.createInitialState();
  const afterFirstMove = adapter.applyMove(initialState, firstMove);
  const affectedFromSolved = adapter.describeMove(secondMove, initialState).affectedPieceIds;
  const affectedAfterFirst = adapter.describeMove(secondMove, afterFirstMove).affectedPieceIds;

  expect(affectedAfterFirst).not.toEqual(affectedFromSolved);
};

const stickerColorsByFace = (model: ReturnType<ReturnType<typeof createCubePlayerAdapter>['createRenderableModel']>) => {
  const colorsByFace: Record<string, string> = {};

  for (const piece of model.pieces) {
    for (const sticker of piece.stickers) {
      colorsByFace[sticker.face] = sticker.color;
    }
  }

  return colorsByFace;
};

describe('createCubePlayerAdapter', () => {
  it('creates a stickered cubie model without inter-piece gaps', () => {
    const adapter = createCubePlayerAdapter(3, ['333']);
    const model = adapter.createRenderableModel(adapter.createInitialState());

    expect(model.pieces).toHaveLength(26);

    const corner = model.pieces.find((piece) => piece.id === 'cube-2-2-2');

    expect(corner).toBeDefined();
    expect(corner?.body).toEqual({ color: '#111827', size: 1, type: 'box' });
    expect(corner?.position).toEqual({ x: 1, y: 1, z: 1 });
    expect(corner?.stickers.map((sticker) => sticker.face).sort()).toEqual(['F', 'R', 'U']);

    const frontSticker = corner?.stickers.find((sticker) => sticker.face === 'F');
    const stickerXValues = frontSticker?.polygon.map((vertex) => vertex.x) ?? [];

    expect(Math.max(...stickerXValues)).toBeLessThan(0.5);
    expect(frontSticker?.polygon.every((vertex) => vertex.z > 0.5)).toBe(true);
    expect(stickerColorsByFace(model)).toEqual({
      B: '#0000ff',
      D: '#ffff00',
      F: '#00ff00',
      L: '#ff8000',
      R: '#ff0000',
      U: '#ffffff',
    });
  });

  it('describes affected cubies for face and wide moves', () => {
    const adapter = createCubePlayerAdapter(3, ['333']);
    const state = adapter.createInitialState();
    const [faceMove, wideMove] = adapter.parseFormula('R Rw');

    if (faceMove === undefined || wideMove === undefined) {
      throw new Error('cube parser did not return expected moves');
    }

    const faceAnimation = adapter.describeMove(faceMove, state);
    const wideAnimation = adapter.describeMove(wideMove, state);

    expect(faceAnimation).toMatchObject({
      angleRadians: -Math.PI / 2,
      axis: { x: 1, y: 0, z: 0 },
      pivot: { x: 0, y: 0, z: 0 },
    });
    expect(faceAnimation.affectedPieceIds).toHaveLength(9);
    expect(faceAnimation.affectedPieceIds).toContain('cube-2-2-2');
    expect(faceAnimation.affectedPieceIds).not.toContain('cube-1-2-2');

    expect(wideAnimation.affectedPieceIds).toHaveLength(17);
    expect(wideAnimation.affectedPieceIds).toContain('cube-1-2-2');
    expect(wideAnimation.affectedPieceIds).not.toContain('cube-0-2-2');
  });

  it('tracks cubies through multi-step formulas', () => {
    const adapter = createCubePlayerAdapter(3, ['333']);

    expectMoveUsesTrackedState(adapter, 'R U');
  });
});
