import {
  addVectors,
  centroidOf,
  crossVectors,
  dotVectors,
  normalizeVector,
  scaleVector,
  subtractVectors,
} from './polyhedron-model.js';
import type { PlayerRenderableModel, Vector3Like } from './puzzle-adapter.js';
import {
  createIdentitySourceByTarget,
  type SourceByTarget,
} from './facelet-tracking.js';

export interface GeometryAffectedPiecesPermutationOptions {
  readonly model: PlayerRenderableModel;
  readonly affectedPieceIds: readonly string[];
  readonly axis: Vector3Like;
  readonly angleRadians: number;
  readonly pivot?: Vector3Like;
  readonly tolerance?: number;
}

const DEFAULT_TOLERANCE = 0.08;
const ZERO_VECTOR = { x: 0, y: 0, z: 0 };

const pieceCenter = (piece: PlayerRenderableModel['pieces'][number]): Vector3Like => {
  const sticker = piece.stickers.find((candidate) => !candidate.face.endsWith('-border')) ?? piece.stickers[0];

  if (sticker === undefined) return piece.position;

  return centroidOf(sticker.polygon);
};

const rotateAroundAxis = (
  point: Vector3Like,
  axis: Vector3Like,
  angleRadians: number,
  pivot: Vector3Like,
): Vector3Like => {
  const normalizedAxis = normalizeVector(axis);
  const offset = subtractVectors(point, pivot);
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const rotatedOffset = addVectors(
    addVectors(
      scaleVector(offset, cos),
      scaleVector(crossVectors(normalizedAxis, offset), sin),
    ),
    scaleVector(normalizedAxis, dotVectors(normalizedAxis, offset) * (1 - cos)),
  );

  return addVectors(rotatedOffset, pivot);
};

const distanceBetween = (first: Vector3Like, second: Vector3Like): number =>
  Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);

const createGeometrySourceByTargetForPositions = ({
  affectedPositions,
  angleRadians,
  axis,
  model,
  pivot,
  tolerance,
}: {
  readonly affectedPositions: readonly number[];
  readonly model: PlayerRenderableModel;
  readonly axis: Vector3Like;
  readonly angleRadians: number;
  readonly pivot: Vector3Like;
  readonly tolerance: number;
}): SourceByTarget => {
  const pieceCenters = model.pieces.map(pieceCenter);
  const nextSourceByTarget = createIdentitySourceByTarget(model.pieces.length);
  const remainingTargets = new Set(affectedPositions);

  for (const sourcePosition of affectedPositions) {
    const sourceCenter = pieceCenters[sourcePosition];

    if (sourceCenter === undefined) {
      throw new Error(`Missing renderable piece center at ${sourcePosition}`);
    }

    const rotatedCenter = rotateAroundAxis(sourceCenter, axis, angleRadians, pivot);
    let bestTarget: number | undefined;
    let bestDistance = Infinity;

    for (const targetPosition of remainingTargets) {
      const targetCenter = pieceCenters[targetPosition];

      if (targetCenter === undefined) continue;

      const distance = distanceBetween(rotatedCenter, targetCenter);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestTarget = targetPosition;
      }
    }

    if (bestTarget === undefined || bestDistance > tolerance) {
      throw new Error(
        `Could not match rotated piece ${sourcePosition} to a target position; best ${bestTarget ?? 'none'} at ${bestDistance.toFixed(4)}`,
      );
    }

    nextSourceByTarget[bestTarget] = sourcePosition;
    remainingTargets.delete(bestTarget);
  }

  return Object.freeze(nextSourceByTarget);
};

export const createGeometrySourceByTargetFromAffectedPieces = ({
  affectedPieceIds,
  angleRadians,
  axis,
  model,
  pivot = ZERO_VECTOR,
  tolerance = DEFAULT_TOLERANCE,
}: GeometryAffectedPiecesPermutationOptions): SourceByTarget => {
  const pieceIndexById = new Map(model.pieces.map((piece, index) => [piece.id, index]));
  const affectedPositions = affectedPieceIds.map((pieceId) => {
    const position = pieceIndexById.get(pieceId);

    if (position === undefined) {
      throw new Error(`Missing affected renderable piece ${pieceId}`);
    }

    return position;
  });

  return createGeometrySourceByTargetForPositions({
    affectedPositions,
    angleRadians,
    axis,
    model,
    pivot,
    tolerance,
  });
};
