import { InvalidMoveError } from '@cubegin/scramble-puzzle';
import { describe, expect, it } from 'vitest';
import type { PlayerRenderablePiece, PlayerRenderableSticker } from '../puzzle-adapter.js';
import { createSquareOnePlayerAdapter } from './square1-player-adapter.js';

const rotatePointByQuaternion = (
  point: { readonly x: number; readonly y: number; readonly z: number },
  quaternion: PlayerRenderablePiece['orientation'],
): { readonly x: number; readonly y: number; readonly z: number } => {
  const vectorQuaternion = {
    w: -quaternion.x * point.x - quaternion.y * point.y - quaternion.z * point.z,
    x: quaternion.w * point.x + quaternion.y * point.z - quaternion.z * point.y,
    y: quaternion.w * point.y + quaternion.z * point.x - quaternion.x * point.z,
    z: quaternion.w * point.z + quaternion.x * point.y - quaternion.y * point.x,
  };

  return {
    x:
      vectorQuaternion.w * -quaternion.x +
      vectorQuaternion.x * quaternion.w +
      vectorQuaternion.y * -quaternion.z -
      vectorQuaternion.z * -quaternion.y,
    y:
      vectorQuaternion.w * -quaternion.y -
      vectorQuaternion.x * -quaternion.z +
      vectorQuaternion.y * quaternion.w +
      vectorQuaternion.z * -quaternion.x,
    z:
      vectorQuaternion.w * -quaternion.z +
      vectorQuaternion.x * -quaternion.y -
      vectorQuaternion.y * -quaternion.x +
      vectorQuaternion.z * quaternion.w,
  };
};

const stickerWorldCenter = (
  piece: PlayerRenderablePiece,
  sticker: PlayerRenderableSticker,
): { readonly x: number; readonly y: number; readonly z: number } => {
  const localCenter = sticker.polygon.reduce(
    (center, point) => ({
      x: center.x + point.x / sticker.polygon.length,
      y: center.y + point.y / sticker.polygon.length,
      z: center.z + point.z / sticker.polygon.length,
    }),
    { x: 0, y: 0, z: 0 },
  );
  const rotatedCenter = rotatePointByQuaternion(localCenter, piece.orientation);

  return {
    x: piece.position.x + rotatedCenter.x,
    y: piece.position.y + rotatedCenter.y,
    z: piece.position.z + rotatedCenter.z,
  };
};

const stickerBounds = (
  sticker: PlayerRenderableSticker,
): {
  readonly maxX: number;
  readonly maxY: number;
  readonly minX: number;
  readonly minY: number;
} => ({
  maxX: Math.max(...sticker.polygon.map((point) => point.x)),
  maxY: Math.max(...sticker.polygon.map((point) => point.y)),
  minX: Math.min(...sticker.polygon.map((point) => point.x)),
  minY: Math.min(...sticker.polygon.map((point) => point.y)),
});

const stickerWorldBounds = (
  piece: PlayerRenderablePiece,
  sticker: PlayerRenderableSticker,
): {
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
} => {
  const worldPoints = stickerWorldPoints(piece, sticker);

  return {
    maxX: Math.max(...worldPoints.map((point) => point.x)),
    maxY: Math.max(...worldPoints.map((point) => point.y)),
    maxZ: Math.max(...worldPoints.map((point) => point.z)),
    minX: Math.min(...worldPoints.map((point) => point.x)),
    minY: Math.min(...worldPoints.map((point) => point.y)),
    minZ: Math.min(...worldPoints.map((point) => point.z)),
  };
};

const stickerWorldPoints = (
  piece: PlayerRenderablePiece,
  sticker: PlayerRenderableSticker,
): readonly { readonly x: number; readonly y: number; readonly z: number }[] =>
  sticker.polygon.map((point) => {
    const rotatedPoint = rotatePointByQuaternion(point, piece.orientation);

    return {
      x: piece.position.x + rotatedPoint.x,
      y: piece.position.y + rotatedPoint.y,
      z: piece.position.z + rotatedPoint.z,
    };
  });

const polygonNormalY = (
  points: readonly { readonly x: number; readonly y: number; readonly z: number }[],
): number => {
  let normalY = 0;

  for (let index = 0; index < points.length; index += 1) {
    const currentPoint = points[index];
    const nextPoint = points[(index + 1) % points.length];

    if (currentPoint === undefined || nextPoint === undefined) continue;
    normalY += (currentPoint.z - nextPoint.z) * (currentPoint.x + nextPoint.x);
  }

  return normalY;
};

const frontSideStickerBounds = (
  model: ReturnType<ReturnType<typeof createSquareOnePlayerAdapter>['createRenderableModel']>,
  predicate: (piece: PlayerRenderablePiece, sticker: PlayerRenderableSticker) => boolean,
): readonly ReturnType<typeof stickerWorldBounds>[] =>
  model.pieces
    .flatMap((piece) =>
      piece.stickers
        .filter((pieceSticker) => predicate(piece, pieceSticker))
        .map((pieceSticker) => stickerWorldBounds(piece, pieceSticker)),
    )
    .filter((bounds) => (bounds.minZ + bounds.maxZ) / 2 > 0.98)
    .sort((left, right) => left.minX - right.minX);

const backSideStickerBounds = (
  model: ReturnType<ReturnType<typeof createSquareOnePlayerAdapter>['createRenderableModel']>,
  predicate: (piece: PlayerRenderablePiece, sticker: PlayerRenderableSticker) => boolean,
): readonly ReturnType<typeof stickerWorldBounds>[] =>
  model.pieces
    .flatMap((piece) =>
      piece.stickers
        .filter((pieceSticker) => predicate(piece, pieceSticker))
        .map((pieceSticker) => stickerWorldBounds(piece, pieceSticker)),
    )
    .filter((bounds) => (bounds.minZ + bounds.maxZ) / 2 < -0.98)
    .sort((left, right) => right.maxX - left.maxX);

const modelBounds = (
  model: ReturnType<ReturnType<typeof createSquareOnePlayerAdapter>['createRenderableModel']>,
): ReturnType<typeof stickerWorldBounds> => {
  const worldPoints = model.pieces.flatMap((piece) =>
    piece.stickers.flatMap((pieceSticker) => stickerWorldPoints(piece, pieceSticker)),
  );

  return {
    maxX: Math.max(...worldPoints.map((point) => point.x)),
    maxY: Math.max(...worldPoints.map((point) => point.y)),
    maxZ: Math.max(...worldPoints.map((point) => point.z)),
    minX: Math.min(...worldPoints.map((point) => point.x)),
    minY: Math.min(...worldPoints.map((point) => point.y)),
    minZ: Math.min(...worldPoints.map((point) => point.z)),
  };
};

const stickerWorldBoundsFor = (
  model: ReturnType<ReturnType<typeof createSquareOnePlayerAdapter>['createRenderableModel']>,
  predicate: (piece: PlayerRenderablePiece, sticker: PlayerRenderableSticker) => boolean,
): ReturnType<typeof stickerWorldBounds> => {
  const worldPoints = model.pieces.flatMap((piece) =>
    piece.stickers
      .filter((pieceSticker) => predicate(piece, pieceSticker))
      .flatMap((pieceSticker) => stickerWorldPoints(piece, pieceSticker)),
  );

  return {
    maxX: Math.max(...worldPoints.map((point) => point.x)),
    maxY: Math.max(...worldPoints.map((point) => point.y)),
    maxZ: Math.max(...worldPoints.map((point) => point.z)),
    minX: Math.min(...worldPoints.map((point) => point.x)),
    minY: Math.min(...worldPoints.map((point) => point.y)),
    minZ: Math.min(...worldPoints.map((point) => point.z)),
  };
};

const polygonArea = (polygon: readonly { readonly x: number; readonly z: number }[]): number => {
  let doubleArea = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const currentPoint = polygon[index];
    const nextPoint = polygon[(index + 1) % polygon.length];

    if (currentPoint === undefined || nextPoint === undefined) continue;
    doubleArea += currentPoint.x * nextPoint.z - nextPoint.x * currentPoint.z;
  }

  return Math.abs(doubleArea) / 2;
};

const isInsideClipEdge = (
  point: { readonly x: number; readonly z: number },
  clipStart: { readonly x: number; readonly z: number },
  clipEnd: { readonly x: number; readonly z: number },
  clipSign: number,
): boolean => {
  const cross =
    (clipEnd.x - clipStart.x) * (point.z - clipStart.z) -
    (clipEnd.z - clipStart.z) * (point.x - clipStart.x);

  return cross * clipSign >= -1e-8;
};

const segmentIntersection = (
  segmentStart: { readonly x: number; readonly z: number },
  segmentEnd: { readonly x: number; readonly z: number },
  clipStart: { readonly x: number; readonly z: number },
  clipEnd: { readonly x: number; readonly z: number },
): { readonly x: number; readonly z: number } => {
  const segmentDelta = {
    x: segmentEnd.x - segmentStart.x,
    z: segmentEnd.z - segmentStart.z,
  };
  const clipDelta = {
    x: clipEnd.x - clipStart.x,
    z: clipEnd.z - clipStart.z,
  };
  const denominator = segmentDelta.x * clipDelta.z - segmentDelta.z * clipDelta.x;

  if (Math.abs(denominator) < 1e-8) return segmentEnd;

  const t =
    ((clipStart.x - segmentStart.x) * clipDelta.z - (clipStart.z - segmentStart.z) * clipDelta.x) /
    denominator;

  return {
    x: segmentStart.x + segmentDelta.x * t,
    z: segmentStart.z + segmentDelta.z * t,
  };
};

const convexPolygonIntersectionArea = (
  subjectPolygon: readonly { readonly x: number; readonly z: number }[],
  clipPolygon: readonly { readonly x: number; readonly z: number }[],
): number => {
  let clippedPolygon = [...subjectPolygon];
  const clipSign =
    polygonArea(clipPolygon) === 0
      ? 1
      : Math.sign(
          clipPolygon.reduce((doubleArea, point, index) => {
            const nextPoint = clipPolygon[(index + 1) % clipPolygon.length];

            return nextPoint === undefined
              ? doubleArea
              : doubleArea + point.x * nextPoint.z - nextPoint.x * point.z;
          }, 0),
        );

  for (let clipIndex = 0; clipIndex < clipPolygon.length; clipIndex += 1) {
    const clipStart = clipPolygon[clipIndex];
    const clipEnd = clipPolygon[(clipIndex + 1) % clipPolygon.length];
    const nextClippedPolygon: typeof clippedPolygon = [];

    if (clipStart === undefined || clipEnd === undefined) continue;
    for (let subjectIndex = 0; subjectIndex < clippedPolygon.length; subjectIndex += 1) {
      const currentPoint = clippedPolygon[subjectIndex];
      const previousPoint =
        clippedPolygon[(subjectIndex + clippedPolygon.length - 1) % clippedPolygon.length];

      if (currentPoint === undefined || previousPoint === undefined) continue;

      const currentInside = isInsideClipEdge(currentPoint, clipStart, clipEnd, clipSign);
      const previousInside = isInsideClipEdge(previousPoint, clipStart, clipEnd, clipSign);

      if (currentInside) {
        if (!previousInside) {
          nextClippedPolygon.push(
            segmentIntersection(previousPoint, currentPoint, clipStart, clipEnd),
          );
        }
        nextClippedPolygon.push(currentPoint);
      } else if (previousInside) {
        nextClippedPolygon.push(
          segmentIntersection(previousPoint, currentPoint, clipStart, clipEnd),
        );
      }
    }

    clippedPolygon = nextClippedPolygon;
    if (clippedPolygon.length === 0) return 0;
  }

  return polygonArea(clippedPolygon);
};

const expectCloseToAll = (values: readonly number[], expected: number, precision = 3): void => {
  for (const value of values) {
    expect(value).toBeCloseTo(expected, precision);
  }
};

const expectPolygonCloseTo = (
  actual: readonly { readonly x: number; readonly y: number; readonly z: number }[],
  expected: readonly { readonly x: number; readonly y: number; readonly z: number }[],
): void => {
  expect(actual).toHaveLength(expected.length);

  for (let index = 0; index < actual.length; index += 1) {
    expect(actual[index]?.x).toBeCloseTo(expected[index]?.x ?? 0, 4);
    expect(actual[index]?.y).toBeCloseTo(expected[index]?.y ?? 0, 4);
    expect(actual[index]?.z).toBeCloseTo(expected[index]?.z ?? 0, 4);
  }
};

const closestHorizontalRadius = (
  piece: PlayerRenderablePiece,
  sticker: PlayerRenderableSticker,
): number =>
  Math.min(...stickerWorldPoints(piece, sticker).map((point) => Math.hypot(point.x, point.z)));

const farthestHorizontalRadius = (
  piece: PlayerRenderablePiece,
  sticker: PlayerRenderableSticker,
): number =>
  Math.max(...stickerWorldPoints(piece, sticker).map((point) => Math.hypot(point.x, point.z)));

const nearestHorizontalGapAtRadius = (
  firstPiece: PlayerRenderablePiece,
  firstSticker: PlayerRenderableSticker,
  secondPiece: PlayerRenderablePiece,
  secondSticker: PlayerRenderableSticker,
  radiusPredicate: (radius: number) => boolean,
): number => {
  let nearestGap = Number.POSITIVE_INFINITY;

  for (const firstPoint of stickerWorldPoints(firstPiece, firstSticker)) {
    for (const secondPoint of stickerWorldPoints(secondPiece, secondSticker)) {
      const firstRadius = Math.hypot(firstPoint.x, firstPoint.z);
      const secondRadius = Math.hypot(secondPoint.x, secondPoint.z);
      const averageRadius = (firstRadius + secondRadius) / 2;

      if (!radiusPredicate(averageRadius)) continue;
      nearestGap = Math.min(
        nearestGap,
        Math.hypot(firstPoint.x - secondPoint.x, firstPoint.z - secondPoint.z),
      );
    }
  }

  return nearestGap;
};

const normalizeHorizontalVector = (vector: {
  readonly x: number;
  readonly z: number;
}): { readonly x: number; readonly z: number } => {
  const length = Math.hypot(vector.x, vector.z);

  return {
    x: vector.x / length,
    z: vector.z / length,
  };
};

const horizontalAngleRadians = (point: { readonly x: number; readonly z: number }): number =>
  Math.atan2(-point.z, point.x);

const normalizedAngleDelta = (fromRadians: number, toRadians: number): number =>
  Math.atan2(Math.sin(toRadians - fromRadians), Math.cos(toRadians - fromRadians));

const rotateWorldPointAroundAxis = (
  point: { readonly x: number; readonly y: number; readonly z: number },
  axis: { readonly x: number; readonly y: number; readonly z: number },
  angleRadians: number,
  pivot: { readonly x: number; readonly y: number; readonly z: number },
): { readonly x: number; readonly y: number; readonly z: number } => {
  const axisLength = Math.hypot(axis.x, axis.y, axis.z);
  const normalizedAxis = {
    x: axis.x / axisLength,
    y: axis.y / axisLength,
    z: axis.z / axisLength,
  };
  const localPoint = {
    x: point.x - pivot.x,
    y: point.y - pivot.y,
    z: point.z - pivot.z,
  };
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);
  const dot =
    normalizedAxis.x * localPoint.x +
    normalizedAxis.y * localPoint.y +
    normalizedAxis.z * localPoint.z;
  const cross = {
    x: normalizedAxis.y * localPoint.z - normalizedAxis.z * localPoint.y,
    y: normalizedAxis.z * localPoint.x - normalizedAxis.x * localPoint.z,
    z: normalizedAxis.x * localPoint.y - normalizedAxis.y * localPoint.x,
  };

  return {
    x: pivot.x + localPoint.x * cosine + cross.x * sine + normalizedAxis.x * dot * (1 - cosine),
    y: pivot.y + localPoint.y * cosine + cross.y * sine + normalizedAxis.y * dot * (1 - cosine),
    z: pivot.z + localPoint.z * cosine + cross.z * sine + normalizedAxis.z * dot * (1 - cosine),
  };
};

describe('createSquareOnePlayerAdapter', () => {
  it('parses Square-1 notation and creates a solved 3D prism model', () => {
    const adapter = createSquareOnePlayerAdapter();
    const moves = adapter.parseFormula('(3,0) / (0,3) /');
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const squareOnePieces = model.pieces.filter((piece) => piece.id.startsWith('square1-piece-'));
    const middlePieces = model.pieces.filter((piece) => piece.id.startsWith('square1-middle-'));

    expect(moves).toHaveLength(4);
    expect(model.cameraOrbit?.pitch).toBeGreaterThan(0);
    expect(model.cameraOrbit?.yaw).toBeGreaterThan(0);
    expect(squareOnePieces).toHaveLength(16);
    expect(middlePieces).toHaveLength(2);
    expect(model.pieces.find((piece) => piece.id === 'square1-piece-0')?.stickers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#111827', id: 'square1-piece-0-side-border-0' }),
        expect.objectContaining({ color: '#ffff00', id: 'square1-piece-0-u' }),
        expect.objectContaining({ color: '#ff8000', id: 'square1-piece-0-side-0' }),
        expect.objectContaining({ color: '#0000ff', id: 'square1-piece-0-side-1' }),
      ]),
    );
    expect(model.pieces.find((piece) => piece.id === 'square1-middle-left')?.stickers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#0000ff', id: 'square1-middle-left-l' }),
        expect.objectContaining({ color: '#111827', id: 'square1-middle-left-front-border' }),
      ]),
    );
    expect(model.pieces.find((piece) => piece.id === 'square1-middle-right')?.stickers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#00ff00', id: 'square1-middle-right-r' }),
      ]),
    );
    expect(model.pieces.find((piece) => piece.id === 'square1-piece-8')?.stickers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#ffffff', id: 'square1-piece-8-d' }),
      ]),
    );
  });

  it('keeps solved side faces color-aligned across top, middle, and bottom layers', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const frontStickerColors = model.pieces.flatMap((piece) =>
      piece.stickers
        .map((pieceSticker) => ({
          color: pieceSticker.color,
          center: stickerWorldCenter(piece, pieceSticker),
          id: pieceSticker.id,
        }))
        .filter(
          ({ color, center, id }) =>
            color !== '#111827' &&
            (id.includes('-side-') || id.endsWith('-front')) &&
            center.z > 0.98,
        )
        .map(({ color }) => color),
    );

    expect(new Set(frontStickerColors)).toEqual(new Set(['#ff0000']));
  });

  it('insets the solved stickers inside a visible black body frame', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const topCorner = model.pieces.find((piece) => piece.id === 'square1-piece-0');
    const middleLeft = model.pieces.find((piece) => piece.id === 'square1-middle-left');
    const capBorder = topCorner?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-0-cap-border',
    );
    const capSticker = topCorner?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-0-u',
    );
    const sideBorder = topCorner?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-0-side-border-0',
    );
    const sideSticker = topCorner?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-0-side-0',
    );
    const middleBorder = middleLeft?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-middle-left-front-border',
    );
    const middleSticker = middleLeft?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-middle-left-front',
    );

    expect(capBorder).toBeDefined();
    expect(capSticker).toBeDefined();
    expect(sideBorder).toBeDefined();
    expect(sideSticker).toBeDefined();
    expect(middleBorder).toBeDefined();
    expect(middleSticker).toBeDefined();

    const sideBorderBounds = stickerBounds(sideBorder as PlayerRenderableSticker);
    const sideStickerBounds = stickerBounds(sideSticker as PlayerRenderableSticker);
    const middleBorderBounds = stickerBounds(middleBorder as PlayerRenderableSticker);
    const middleStickerBounds = stickerBounds(middleSticker as PlayerRenderableSticker);

    expect(
      closestHorizontalRadius(
        topCorner as PlayerRenderablePiece,
        capSticker as PlayerRenderableSticker,
      ),
    ).toBeGreaterThan(
      closestHorizontalRadius(
        topCorner as PlayerRenderablePiece,
        capBorder as PlayerRenderableSticker,
      ) + 0.08,
    );
    expect(
      farthestHorizontalRadius(
        topCorner as PlayerRenderablePiece,
        capBorder as PlayerRenderableSticker,
      ) -
        farthestHorizontalRadius(
          topCorner as PlayerRenderablePiece,
          capSticker as PlayerRenderableSticker,
        ),
    ).toBeGreaterThan(0.06);
    expect(
      farthestHorizontalRadius(
        topCorner as PlayerRenderablePiece,
        capBorder as PlayerRenderableSticker,
      ) -
        farthestHorizontalRadius(
          topCorner as PlayerRenderablePiece,
          sideBorder as PlayerRenderableSticker,
        ),
    ).toBeLessThan(0.02);
    expect(sideBorderBounds.maxY - sideStickerBounds.maxY).toBeGreaterThan(0.03);
    expect(sideStickerBounds.minY - sideBorderBounds.minY).toBeGreaterThan(0.03);
    expect(middleBorderBounds.maxY - middleStickerBounds.maxY).toBeGreaterThan(0.03);
    expect(middleStickerBounds.minY - middleBorderBounds.minY).toBeGreaterThan(0.03);
  });

  it('models the middle layer as trapezoid halves with exposed cut faces', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const middleRight = model.pieces.find((piece) => piece.id === 'square1-middle-right');

    expect(middleRight?.stickers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#4b5563',
          face: 'cut',
          id: 'square1-middle-right-top-cut',
        }),
        expect.objectContaining({
          color: '#4b5563',
          face: 'cut',
          id: 'square1-middle-right-bottom-cut',
        }),
        expect.objectContaining({
          color: '#4b5563',
          face: 'cut',
          id: 'square1-middle-right-inner-cut',
        }),
      ]),
    );
  });

  it('adds black body cut faces to layer pieces for shape-shifted views', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const topCorner = model.pieces.find((piece) => piece.id === 'square1-piece-0');

    expect(topCorner?.stickers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#111827',
          face: 'cut',
          id: 'square1-piece-0-inner-cut',
        }),
        expect.objectContaining({
          color: '#111827',
          face: 'cut',
          id: 'square1-piece-0-start-cut',
        }),
        expect.objectContaining({
          color: '#111827',
          face: 'cut',
          id: 'square1-piece-0-end-cut',
        }),
      ]),
    );
  });

  it('renders the solved front side as a cube-shaped Square-1 grid', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const solvedBounds = modelBounds(model);
    const topLayerStickers = frontSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#ff0000' && pieceSticker.id.includes('-side-'),
    ).filter((bounds) => (bounds.minY + bounds.maxY) / 2 > 0.2);
    const bottomLayerStickers = frontSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#ff0000' && pieceSticker.id.includes('-side-'),
    ).filter((bounds) => (bounds.minY + bounds.maxY) / 2 < -0.2);
    const middleBorders = frontSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#111827' &&
        pieceSticker.id.includes('middle') &&
        pieceSticker.id.endsWith('front-border'),
    );

    expect(topLayerStickers).toHaveLength(3);
    expect(bottomLayerStickers).toHaveLength(3);
    expect(middleBorders).toHaveLength(2);

    const topWidths = topLayerStickers.map((bounds) => bounds.maxX - bounds.minX);
    const bottomWidths = bottomLayerStickers.map((bounds) => bounds.maxX - bounds.minX);
    const middleSeam = (middleBorders[0].maxX + middleBorders[1].minX) / 2;
    const middleStickers = frontSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#ff0000' && pieceSticker.id.endsWith('-front'),
    );
    const width = solvedBounds.maxX - solvedBounds.minX;
    const height = solvedBounds.maxY - solvedBounds.minY;
    const depth = solvedBounds.maxZ - solvedBounds.minZ;
    const middleStickerBounds = {
      maxX: Math.max(...middleStickers.map((bounds) => bounds.maxX)),
      minX: Math.min(...middleStickers.map((bounds) => bounds.minX)),
    };
    const leftInset = topLayerStickers[0].minX - solvedBounds.minX;
    const rightInset = solvedBounds.maxX - topLayerStickers[2].maxX;
    const halfSide = (solvedBounds.maxX - solvedBounds.minX) / 2;
    const expectedFrontSeam = -halfSide * Math.tan(Math.PI / 12);

    expect(model.cameraDistance).toBeGreaterThanOrEqual(6);
    expect(height).toBeCloseTo(width, 2);
    expect(height).toBeCloseTo(depth, 2);
    expectCloseToAll(topWidths, topWidths[0]);
    expectCloseToAll(bottomWidths, bottomWidths[0]);
    expect(middleSeam).toBeCloseTo(expectedFrontSeam, 2);
    expect(middleStickerBounds.minX - solvedBounds.minX).toBeCloseTo(leftInset, 2);
    expect(solvedBounds.maxX - middleStickerBounds.maxX).toBeCloseTo(rightInset, 2);
  });

  it('mirrors the solved back middle row so its second and third cells are merged', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const topLayerStickers = backSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#ff8000' && pieceSticker.id.includes('-side-'),
    ).filter((bounds) => (bounds.minY + bounds.maxY) / 2 > 0.2);
    const middleBorders = backSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#111827' &&
        pieceSticker.id.includes('middle') &&
        pieceSticker.id.endsWith('back-border'),
    );
    const middleStickers = backSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#ff8000' && pieceSticker.id.endsWith('-back'),
    );

    expect(topLayerStickers).toHaveLength(3);
    expect(middleBorders).toHaveLength(2);
    expect(middleStickers).toHaveLength(2);

    const middleSeam = (middleBorders[0].minX + middleBorders[1].maxX) / 2;
    const visualMiddleWidths = middleStickers.map((bounds) => bounds.maxX - bounds.minX);
    const middleLayerBounds = {
      maxX: Math.max(...middleBorders.map((bounds) => bounds.maxX)),
      minX: Math.min(...middleBorders.map((bounds) => bounds.minX)),
    };
    const halfSide = (middleLayerBounds.maxX - middleLayerBounds.minX) / 2;
    const expectedBackSeam = halfSide * Math.tan(Math.PI / 12);

    expect(middleSeam).toBeCloseTo(expectedBackSeam, 2);
    expect(visualMiddleWidths[1]).toBeGreaterThan(visualMiddleWidths[0] * 1.8);
  });

  it('keeps Square-1 cap seams close to an even visual width', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const firstPiece = model.pieces.find((piece) => piece.id === 'square1-piece-3');
    const secondPiece = model.pieces.find((piece) => piece.id === 'square1-piece-4');
    const firstSticker = firstPiece?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-3-u',
    );
    const secondSticker = secondPiece?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-4-u',
    );

    expect(firstPiece).toBeDefined();
    expect(secondPiece).toBeDefined();
    expect(firstSticker).toBeDefined();
    expect(secondSticker).toBeDefined();

    const innerGap = nearestHorizontalGapAtRadius(
      firstPiece as PlayerRenderablePiece,
      firstSticker as PlayerRenderableSticker,
      secondPiece as PlayerRenderablePiece,
      secondSticker as PlayerRenderableSticker,
      (radius) => radius < 0.4,
    );
    const outerGap = nearestHorizontalGapAtRadius(
      firstPiece as PlayerRenderablePiece,
      firstSticker as PlayerRenderableSticker,
      secondPiece as PlayerRenderablePiece,
      secondSticker as PlayerRenderableSticker,
      (radius) => radius > 0.8,
    );

    expect(outerGap / innerGap).toBeLessThan(2);
  });

  it('keeps tuple-rotated top pieces as their physical Square-1 shape', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [turn] = adapter.parseFormula('(1,0)');
    const movedState = adapter.applyMove(adapter.createInitialState(), turn);
    const movedModel = adapter.createRenderableModel(movedState);
    const middleBounds = stickerWorldBoundsFor(
      movedModel,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#111827' &&
        pieceSticker.id.includes('middle') &&
        pieceSticker.face === 'border',
    );
    const topBounds = stickerWorldBoundsFor(
      movedModel,
      (_piece, pieceSticker) =>
        pieceSticker.id.endsWith('-cap-border') && pieceSticker.face === 'border',
    );
    const middleHalfWidth = (middleBounds.maxX - middleBounds.minX) / 2;
    const topHalfWidth = (topBounds.maxX - topBounds.minX) / 2;

    expect(topHalfWidth).toBeGreaterThan(middleHalfWidth + 0.15);
  });

  it('renders positive top tuple turns clockwise by one small slot like the reference image', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [turn] = adapter.parseFormula('(1,0)');
    const initialModel = adapter.createRenderableModel(adapter.createInitialState());
    const movedModel = adapter.createRenderableModel(
      adapter.applyMove(adapter.createInitialState(), turn),
    );
    const initialPiece = initialModel.pieces.find((piece) => piece.id === 'square1-piece-0');
    const movedPiece = movedModel.pieces.find((piece) => piece.id === 'square1-piece-0');
    const initialSticker = initialPiece?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-0-u',
    );
    const movedSticker = movedPiece?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-0-u',
    );

    expect(initialPiece).toBeDefined();
    expect(movedPiece).toBeDefined();
    expect(initialSticker).toBeDefined();
    expect(movedSticker).toBeDefined();

    const initialAngle = horizontalAngleRadians(
      stickerWorldCenter(
        initialPiece as PlayerRenderablePiece,
        initialSticker as PlayerRenderableSticker,
      ),
    );
    const movedAngle = horizontalAngleRadians(
      stickerWorldCenter(
        movedPiece as PlayerRenderablePiece,
        movedSticker as PlayerRenderableSticker,
      ),
    );

    // The scramble-image renderer uses SVG's y-down rotation convention, where
    // increasing the slot angle is the visible clockwise direction.
    expect(normalizedAngleDelta(initialAngle, movedAngle)).toBeCloseTo(Math.PI / 6, 3);
  });

  it('animates slash from the state-defined half swap after a one-slot top turn', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [turn, slash] = adapter.parseFormula('(1,0) /');
    const turnedState = adapter.applyMove(adapter.createInitialState(), turn);
    const animation = adapter.describeMove(slash, turnedState);

    expect(animation.affectedPieceIds).toEqual([
      'square1-piece-3',
      'square1-piece-4',
      'square1-piece-5',
      'square1-piece-6',
      'square1-piece-8',
      'square1-piece-9',
      'square1-piece-10',
      'square1-piece-11',
      'square1-middle-right',
    ]);
  });

  it('lands slash animation on the committed Square-1 state after a one-slot top turn', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [turn, slash] = adapter.parseFormula('(1,0) /');
    const turnedState = adapter.applyMove(adapter.createInitialState(), turn);
    const animation = adapter.describeMove(slash, turnedState);
    const beforeSlashModel = adapter.createRenderableModel(turnedState);
    const afterSlashModel = adapter.createRenderableModel(adapter.applyMove(turnedState, slash));

    for (const pieceIdValue of animation.affectedPieceIds.filter((id) =>
      id.startsWith('square1-piece-'),
    )) {
      const beforePiece = beforeSlashModel.pieces.find((piece) => piece.id === pieceIdValue);
      const afterPiece = afterSlashModel.pieces.find((piece) => piece.id === pieceIdValue);

      expect(beforePiece).toBeDefined();
      expect(afterPiece).toBeDefined();

      const animatedPosition =
        animation.targetPositionByPieceId?.[pieceIdValue] ??
        rotateWorldPointAroundAxis(
          (beforePiece as PlayerRenderablePiece).position,
          animation.axis,
          animation.angleRadians,
          animation.pivot,
        );

      const afterPosition = (afterPiece as PlayerRenderablePiece).position;
      const distance = Math.hypot(
        animatedPosition.x - afterPosition.x,
        animatedPosition.y - afterPosition.y,
        animatedPosition.z - afterPosition.z,
      );

      if (distance > 0.02) {
        throw new Error(
          `${pieceIdValue} lands ${distance.toFixed(4)} away from committed state: ` +
            `before=${JSON.stringify((beforePiece as PlayerRenderablePiece).position)} ` +
            `animated=${JSON.stringify(animatedPosition)} committed=${JSON.stringify(afterPosition)}`,
        );
      }
    }
  });

  it('keeps slash checkpoints compact after a one-slot top turn', () => {
    const adapter = createSquareOnePlayerAdapter();
    let state = adapter.createInitialState();

    for (const move of adapter.parseFormula('(1,0) /')) {
      state = adapter.applyMove(state, move);
    }

    const bounds = modelBounds(adapter.createRenderableModel(state));

    expect(bounds.maxX - bounds.minX).toBeLessThan(3.4);
    expect(bounds.maxY - bounds.minY).toBeLessThan(3.4);
    expect(bounds.maxZ - bounds.minZ).toBeLessThan(3.4);
  });

  it('does not overlap top cap stickers after a one-slot top turn and slash', () => {
    const adapter = createSquareOnePlayerAdapter();
    let state = adapter.createInitialState();

    for (const move of adapter.parseFormula('(1,0) /')) {
      state = adapter.applyMove(state, move);
    }

    const model = adapter.createRenderableModel(state);
    const topCapPolygons = model.pieces.flatMap((piece) =>
      piece.stickers
        .filter(
          (pieceSticker) =>
            (pieceSticker.face === 'U' || pieceSticker.face === 'D') &&
            pieceSticker.color !== '#111827',
        )
        .map((pieceSticker) => {
          const worldPoints = stickerWorldPoints(piece, pieceSticker);
          const normalY = polygonNormalY(worldPoints);

          return {
            id: pieceSticker.id,
            normalY,
            polygon: worldPoints.map((point) => ({
              x: point.x,
              z: point.z,
            })),
            renderSide: pieceSticker.renderSide,
            y: stickerWorldCenter(piece, pieceSticker).y,
          };
        })
        .filter(
          (projectedSticker) =>
            projectedSticker.y > 0.45 &&
            (projectedSticker.renderSide !== 'front' || projectedSticker.normalY > 0.01),
        ),
    );

    for (let leftIndex = 0; leftIndex < topCapPolygons.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < topCapPolygons.length; rightIndex += 1) {
        const left = topCapPolygons[leftIndex];
        const right = topCapPolygons[rightIndex];

        expect(left).toBeDefined();
        expect(right).toBeDefined();
        const overlapArea = convexPolygonIntersectionArea(
          left?.polygon ?? [],
          right?.polygon ?? [],
        );

        if (overlapArea >= 0.001) {
          throw new Error(
            `${left?.id ?? 'unknown'} overlaps ${right?.id ?? 'unknown'} by ${overlapArea}; ` +
              `left=${JSON.stringify(left)} right=${JSON.stringify(right)}`,
          );
        }
      }
    }
  });

  it('keeps slash checkpoints aligned with the Square-1 reference face order', () => {
    const adapter = createSquareOnePlayerAdapter();
    let state = adapter.createInitialState();

    for (const move of adapter.parseFormula('(1,0) /')) {
      state = adapter.applyMove(state, move);
    }

    const model = adapter.createRenderableModel(state);
    const topWhiteEdgePiece = model.pieces.find((piece) => piece.id === 'square1-piece-8');
    const topWhiteSticker = topWhiteEdgePiece?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-piece-8-u',
    );

    expect(topWhiteEdgePiece).toBeDefined();
    expect(topWhiteSticker).toBeDefined();

    const stickerAngle = horizontalAngleRadians(
      stickerWorldCenter(
        topWhiteEdgePiece as PlayerRenderablePiece,
        topWhiteSticker as PlayerRenderableSticker,
      ),
    );

    expect(stickerAngle).toBeGreaterThan(-1.1);
    expect(stickerAngle).toBeLessThan(-0.8);
  });

  it('matches the Square-1 reference middle strip colors after slash checkpoints', () => {
    const adapter = createSquareOnePlayerAdapter();
    let state = adapter.createInitialState();

    for (const move of adapter.parseFormula('(1,0) /')) {
      state = adapter.applyMove(state, move);
    }

    const model = adapter.createRenderableModel(state);
    const frontMiddleColors = model.pieces
      .filter((piece) => piece.id.startsWith('square1-middle-'))
      .flatMap((piece) =>
        piece.stickers
          .map((pieceSticker) => ({
            center: stickerWorldCenter(piece, pieceSticker),
            color: pieceSticker.color,
            face: pieceSticker.face,
          }))
          .filter(
            ({ center, color, face }) =>
              face !== 'border' &&
              face !== 'cut' &&
              color !== '#111827' &&
              center.z > 0.98 &&
              center.y > -0.4 &&
              center.y < 0.4,
          )
          .map(({ color }) => color),
      );

    expect(new Set(frontMiddleColors)).toEqual(new Set(['#ff0000', '#ff8000']));
    expect(frontMiddleColors).not.toContain('#00ff00');
  });

  it('keeps middle piece geometry stable across slash checkpoints', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [slash] = adapter.parseFormula('/');
    const initialModel = adapter.createRenderableModel(adapter.createInitialState());
    const slashedModel = adapter.createRenderableModel(
      adapter.applyMove(adapter.createInitialState(), slash),
    );
    const initialMiddleRight = initialModel.pieces.find(
      (piece) => piece.id === 'square1-middle-right',
    );
    const slashedMiddleRight = slashedModel.pieces.find(
      (piece) => piece.id === 'square1-middle-right',
    );
    const initialTopCut = initialMiddleRight?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-middle-right-top-cut',
    );
    const slashedTopCut = slashedMiddleRight?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-middle-right-top-cut',
    );

    expect(initialTopCut).toBeDefined();
    expect(slashedTopCut).toBeDefined();
    expectPolygonCloseTo(
      (slashedTopCut as PlayerRenderableSticker).polygon,
      (initialTopCut as PlayerRenderableSticker).polygon,
    );
  });

  it('animates slash moves around the right-half turn axis normal to the middle seam', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const [slash] = adapter.parseFormula('/');
    const animation = adapter.describeMove(slash, adapter.createInitialState());
    const frontMiddleBorders = frontSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#111827' &&
        pieceSticker.id.includes('middle') &&
        pieceSticker.id.endsWith('front-border'),
    );
    const backMiddleBorders = backSideStickerBounds(
      model,
      (_piece, pieceSticker) =>
        pieceSticker.color === '#111827' &&
        pieceSticker.id.includes('middle') &&
        pieceSticker.id.endsWith('back-border'),
    );
    const frontSeamX = (frontMiddleBorders[0].maxX + frontMiddleBorders[1].minX) / 2;
    const backSeamX = (backMiddleBorders[0].minX + backMiddleBorders[1].maxX) / 2;
    const frontZ = (frontMiddleBorders[0].minZ + frontMiddleBorders[0].maxZ) / 2;
    const backZ = (backMiddleBorders[0].minZ + backMiddleBorders[0].maxZ) / 2;
    const seamAxis = normalizeHorizontalVector({ x: backSeamX - frontSeamX, z: backZ - frontZ });
    const expectedAxis = normalizeHorizontalVector({
      x: frontZ - backZ,
      z: backSeamX - frontSeamX,
    });
    const actualAxis = normalizeHorizontalVector(animation.axis);
    const seamAlignment = actualAxis.x * seamAxis.x + actualAxis.z * seamAxis.z;
    const alignment = actualAxis.x * expectedAxis.x + actualAxis.z * expectedAxis.z;
    const squareOneReferenceAxisSlope = Math.tan(Math.PI / 12);

    expect(animation.axis.y).toBeCloseTo(0);
    expect(Math.abs(seamAlignment)).toBeLessThan(0.02);
    expect(alignment).toBeGreaterThan(0.99);
    expect(Math.abs(actualAxis.z / actualAxis.x)).toBeCloseTo(squareOneReferenceAxisSlope, 3);
  });

  it('moves the red front slice toward the orange back face during slash moves', () => {
    const adapter = createSquareOnePlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const [slash] = adapter.parseFormula('/');
    const animation = adapter.describeMove(slash, adapter.createInitialState());
    const affectedMiddlePiece = model.pieces.find((piece) => piece.id === 'square1-middle-right');
    const redFrontSticker = affectedMiddlePiece?.stickers.find(
      (pieceSticker) => pieceSticker.id === 'square1-middle-right-front',
    );

    expect(affectedMiddlePiece).toBeDefined();
    expect(redFrontSticker).toBeDefined();

    const startCenter = stickerWorldCenter(
      affectedMiddlePiece as PlayerRenderablePiece,
      redFrontSticker as PlayerRenderableSticker,
    );
    const halfTurnCenter = rotateWorldPointAroundAxis(
      startCenter,
      animation.axis,
      animation.angleRadians / 2,
      animation.pivot,
    );
    const completeTurnCenter = rotateWorldPointAroundAxis(
      startCenter,
      animation.axis,
      animation.angleRadians,
      animation.pivot,
    );

    expect(startCenter.z).toBeGreaterThan(0.9);
    expect(halfTurnCenter.z).toBeLessThan(startCenter.z);
    expect(halfTurnCenter.y).toBeGreaterThan(startCenter.y + 0.2);
    expect(completeTurnCenter.z).toBeLessThan(-0.5);
  });

  it('rotates top and bottom tuple turns around their own face centers', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [move] = adapter.parseFormula('(3,-2)');
    const animation = adapter.describeMove(move, adapter.createInitialState());

    expect(animation.affectedPieceIds).toEqual(
      expect.arrayContaining(['square1-piece-0', 'square1-piece-8']),
    );
    expect(animation.angleRadiansByPieceId?.['square1-piece-0']).toBeCloseTo(Math.PI / 2);
    expect(animation.angleRadiansByPieceId?.['square1-piece-8']).toBeCloseTo(-Math.PI / 3);
    expect(animation.axis).toEqual({ x: 0, y: 1, z: 0 });
    expect(animation.pivotByPieceId?.['square1-piece-0']?.y).toBeGreaterThan(0);
    expect(animation.pivotByPieceId?.['square1-piece-8']?.y).toBeLessThan(0);
  });

  it('animates slash moves as the state-defined half swap', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [slash] = adapter.parseFormula('/');
    const animation = adapter.describeMove(slash, adapter.createInitialState());

    expect(animation.affectedPieceIds).toEqual(
      expect.arrayContaining([
        'square1-piece-4',
        'square1-piece-5',
        'square1-piece-6',
        'square1-piece-7',
        'square1-piece-8',
        'square1-piece-9',
        'square1-piece-10',
        'square1-piece-11',
        'square1-middle-right',
      ]),
    );
    expect(animation.affectedPieceIds).toHaveLength(9);
    expect(animation.axis.y).toBeCloseTo(0);
    expect(Math.hypot(animation.axis.x, animation.axis.z)).toBeGreaterThan(0);
    expect(animation.angleRadians).toBeCloseTo(-Math.PI);
    expect(animation.durationMultiplier).toBeGreaterThan(1);
  });

  it('delegates slashability errors to the Square-1 puzzle definition', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [turn, slash] = adapter.parseFormula('(-1,0) /');
    const unslashable = adapter.applyMove(adapter.createInitialState(), turn);

    expect(() => adapter.applyMove(unslashable, slash)).toThrow(InvalidMoveError);
  });
});
