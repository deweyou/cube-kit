import {
  buildTaggedModel,
  createFaceletPiece,
  type TaggedRenderableModel,
} from './polyhedron-model.js';
import type { StaticMoveGeometry, StaticStickerGeometry } from './static-polyhedron-data.js';

export interface StaticPolyhedronModelOptions {
  readonly cameraDistance: number;
  readonly colors: Readonly<Record<string, string>>;
  readonly piecesPrefix: string;
  readonly stickerScale?: number;
  readonly stickers: readonly StaticStickerGeometry[];
}

export interface StaticPolyhedronModel {
  readonly model: TaggedRenderableModel['model'];
  readonly pieceIds: readonly string[];
}

const normalizeAngle = (angleRadians: number): number => {
  let normalizedAngle = angleRadians;

  while (normalizedAngle <= -Math.PI) normalizedAngle += Math.PI * 2;
  while (normalizedAngle > Math.PI) normalizedAngle -= Math.PI * 2;

  return normalizedAngle;
};

export const createStaticPolyhedronModel = ({
  cameraDistance,
  colors,
  piecesPrefix,
  stickerScale,
  stickers,
}: StaticPolyhedronModelOptions): StaticPolyhedronModel => {
  const faceCounts = new Map<string, number>();
  const pieces = stickers.map((sticker) => {
    const faceIndex = faceCounts.get(sticker.face) ?? 0;
    const id = `${piecesPrefix}-${sticker.face}-${faceIndex}`;
    const color = colors[sticker.face];

    if (color === undefined) {
      throw new Error(`Missing static polyhedron color for face ${sticker.face}`);
    }

    faceCounts.set(sticker.face, faceIndex + 1);

    return createFaceletPiece({
      color,
      face: sticker.face,
      groups: [],
      id,
      polygon: sticker.polygon,
      stickerScale,
    });
  });
  const taggedModel = buildTaggedModel(pieces, cameraDistance);

  return {
    model: taggedModel.model,
    pieceIds: pieces.map((piece) => piece.piece.id),
  };
};

export const repeatSourceByTarget = (
  sourceByTarget: readonly number[],
  count: number,
): readonly number[] => {
  let repeatedSourceByTarget = Array.from({ length: sourceByTarget.length }, (_value, index) => index);

  for (let index = 0; index < count; index += 1) {
    repeatedSourceByTarget = repeatedSourceByTarget.map(
      (sourcePosition) => sourceByTarget[sourcePosition] ?? sourcePosition,
    );
  }

  return Object.freeze(repeatedSourceByTarget);
};

export const repeatStaticMoveGeometry = (
  moveGeometry: StaticMoveGeometry,
  count: number,
): StaticMoveGeometry => ({
  angleRadians: normalizeAngle(moveGeometry.angleRadians * count),
  axis: moveGeometry.axis,
  sourceByTarget: repeatSourceByTarget(moveGeometry.sourceByTarget, count),
});
