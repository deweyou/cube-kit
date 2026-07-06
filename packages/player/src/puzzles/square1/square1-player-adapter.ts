import {
  createSquareOneDefinition,
  type SquareOneMove,
  type SquareOneState,
  type SquareOneTurn,
} from '@cubegin/scramble-puzzle';
import type {
  PlayerMoveAnimation,
  PlayerPuzzleAdapter,
  PlayerRenderableModel,
  PlayerRenderablePiece,
  PlayerRenderableSticker,
  QuaternionLike,
  Vector3Like,
} from '../puzzle-adapter.js';

const SQUARE_ONE_COLORS = {
  B: '#ff8000',
  D: '#ffffff',
  F: '#ff0000',
  L: '#0000ff',
  R: '#00ff00',
  U: '#ffff00',
  border: '#111827',
  cut: '#4b5563',
} as const;

const SIDE_FACES = ['L', 'B', 'R', 'F'] as const;
const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };
const CAMERA_ORBIT = { pitch: 0.64, yaw: 0.56 };
const CAMERA_DISTANCE = 6.2;
const LAYER_HALF_SIZE = 1.05;
const INNER_RADIUS = 0.08;
const CAP_STICKER_EDGE_INSET = 0.035;
const STICKER_INSET_SIZE = 0.085;
const BORDER_LIFT = 0.004;
const SIDE_STICKER_EDGE_INSET_RATIO = 0.075;
const SIDE_STICKER_EDGE_INSET = (LAYER_HALF_SIZE * 2 * SIDE_STICKER_EDGE_INSET_RATIO) / 3;
const SIDE_STICKER_Y_INSET = 0.04;
const SIDE_STICKER_LIFT = 0.006;
const LAYER_THIRD = LAYER_HALF_SIZE / 3;
const TOP_CAP_Y = LAYER_HALF_SIZE;
const TOP_INNER_Y = LAYER_THIRD;
const BOTTOM_CAP_Y = -LAYER_HALF_SIZE;
const BOTTOM_INNER_Y = -LAYER_THIRD;
const MIDDLE_TOP_Y = LAYER_THIRD;
const MIDDLE_BOTTOM_Y = -LAYER_THIRD;
const MIDDLE_FRONT_Z = LAYER_HALF_SIZE;
const MIDDLE_BACK_Z = -LAYER_HALF_SIZE;
const MIDDLE_DIVIDER_WIDTH = 0.028;
const SQUARE_ONE_EDGE_HALF_WIDTH = LAYER_HALF_SIZE * Math.tan(Math.PI / 12);
const MIDDLE_SEAM_X = -SQUARE_ONE_EDGE_HALF_WIDTH;
const MIRRORED_MIDDLE_SEAM_X = -MIDDLE_SEAM_X;
const TOP_INITIAL_ANGLE_DEGREES = 105;
const BOTTOM_INITIAL_ANGLE_DEGREES = -105;
const SLASH_AXIS = {
  x: MIDDLE_FRONT_Z - MIDDLE_BACK_Z,
  y: 0,
  z: MIRRORED_MIDDLE_SEAM_X - MIDDLE_SEAM_X,
} as const satisfies Vector3Like;
const TURN_RADIANS = Math.PI / 6;
const SLASH_DURATION_MULTIPLIER = 1.45;
const CORNER_ANGLES = [45, 135, 225, 315] as const;
const SOLVED_SQUARE_ONE_PIECES = [
  0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15,
] as const;
const SIDE_FACE_START_DEGREES = {
  B: 45,
  F: 225,
  L: 135,
  R: 315,
} as const satisfies Record<SquareOneSideFace, number>;

type SquareOneLayerName = 'top' | 'bottom';
type SquareOneSideFace = (typeof SIDE_FACES)[number];

interface SideBoundarySegment {
  readonly angleEnd: number;
  readonly angleStart: number;
  readonly capEnd: Vector3Like;
  readonly capStart: Vector3Like;
  readonly innerEnd: Vector3Like;
  readonly innerStart: Vector3Like;
}

interface SquareOnePlayerState {
  readonly bottomLayerRotationRadians: number;
  readonly puzzleState: SquareOneState;
  readonly topLayerRotationRadians: number;
}

const pieceId = (piece: number): string => `square1-piece-${piece}`;

const solvedSlotIndexByPiece = SOLVED_SQUARE_ONE_PIECES.reduce((slotIndexByPiece, piece, index) => {
  if (!slotIndexByPiece.has(piece)) slotIndexByPiece.set(piece, index);

  return slotIndexByPiece;
}, new Map<number, number>());

const sticker = (
  id: string,
  face: string,
  color: string,
  polygon: readonly Vector3Like[],
  renderSide?: PlayerRenderableSticker['renderSide'],
): PlayerRenderableSticker => ({
  color,
  face,
  id,
  polygon,
  renderSide,
});

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const rayDirection = (angleDegrees: number): { readonly x: number; readonly z: number } => {
  const radians = degreesToRadians(angleDegrees);

  return {
    x: Math.cos(radians),
    z: -Math.sin(radians),
  };
};

const tangentDirection = (angleDegrees: number): { readonly x: number; readonly z: number } => {
  const radians = degreesToRadians(angleDegrees);

  return {
    x: -Math.sin(radians),
    z: -Math.cos(radians),
  };
};

const rayPoint = (angleDegrees: number, radius: number, y: number): Vector3Like => {
  const direction = rayDirection(angleDegrees);

  return {
    x: direction.x * radius,
    y,
    z: direction.z * radius,
  };
};

const squareBoundaryPoint = (
  angleDegrees: number,
  y: number,
  halfSize = LAYER_HALF_SIZE,
): Vector3Like => {
  const direction = rayDirection(angleDegrees);
  const reach = halfSize / Math.max(Math.abs(direction.x), Math.abs(direction.z));

  return {
    x: direction.x * reach,
    y,
    z: direction.z * reach,
  };
};

const anglesBetween = (startDegrees: number, spanDegrees: number): readonly number[] => {
  const endDegrees = startDegrees + spanDegrees;
  const angles: number[] = [];

  for (const cornerAngle of CORNER_ANGLES) {
    for (let candidate = cornerAngle - 360; candidate < endDegrees + 360; candidate += 360) {
      if (candidate > startDegrees && candidate < endDegrees) angles.push(candidate);
    }
  }

  return angles.sort((left, right) => left - right);
};

const sideBoundarySegments = (
  startDegrees: number,
  spanDegrees: number,
  capY: number,
  innerY: number,
): readonly SideBoundarySegment[] => {
  const angles = [
    startDegrees,
    ...anglesBetween(startDegrees, spanDegrees),
    startDegrees + spanDegrees,
  ];

  return Array.from({ length: angles.length - 1 }, (_, index) => {
    const angleStart = angles[index] ?? startDegrees;
    const angleEnd = angles[index + 1] ?? startDegrees + spanDegrees;

    return {
      angleEnd,
      angleStart,
      capEnd: squareBoundaryPoint(angleEnd, capY),
      capStart: squareBoundaryPoint(angleStart, capY),
      innerEnd: squareBoundaryPoint(angleEnd, innerY),
      innerStart: squareBoundaryPoint(angleStart, innerY),
    };
  });
};

const offsetHorizontalPoint = (
  point: Vector3Like,
  offset: { readonly x: number; readonly z: number },
): Vector3Like => ({
  x: point.x + offset.x,
  y: point.y,
  z: point.z + offset.z,
});

const rotatePointAroundY = (point: Vector3Like, degrees: number): Vector3Like => {
  const radians = degreesToRadians(degrees);
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    x: point.x * cosine + point.z * sine,
    y: point.y,
    z: -point.x * sine + point.z * cosine,
  };
};

const normalizeVector = (vector: Vector3Like): Vector3Like => {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length === 0) return { x: 0, y: 1, z: 0 };

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
};

const rotatePointAroundAxis = (
  point: Vector3Like,
  axis: Vector3Like,
  angleRadians: number,
  pivot: Vector3Like,
): Vector3Like => {
  const normalizedAxis = normalizeVector(axis);
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

const axisAngleQuaternion = (axis: Vector3Like, angleRadians: number): QuaternionLike => {
  const normalizedAxis = normalizeVector(axis);
  const halfAngle = angleRadians / 2;
  const sine = Math.sin(halfAngle);

  return {
    x: normalizedAxis.x * sine,
    y: normalizedAxis.y * sine,
    z: normalizedAxis.z * sine,
    w: Math.cos(halfAngle),
  };
};

const multiplyQuaternions = (left: QuaternionLike, right: QuaternionLike): QuaternionLike => ({
  w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
  x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
  y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
  z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
});

const rotatePolygonAroundY = (
  polygon: readonly Vector3Like[],
  degrees: number,
): readonly Vector3Like[] => polygon.map((point) => rotatePointAroundY(point, degrees));

const orientCapPolygon = (
  polygon: readonly Vector3Like[],
  layer: SquareOneLayerName,
): readonly Vector3Like[] => (layer === 'bottom' ? [...polygon].reverse() : polygon);

const layerCapPolygon = (
  startDegrees: number,
  spanDegrees: number,
  y: number,
  edgeInset = 0,
  sizeInset = 0,
): readonly Vector3Like[] => {
  const endDegrees = startDegrees + spanDegrees;
  const halfSize = LAYER_HALF_SIZE - sizeInset;
  const startTangent = tangentDirection(startDegrees);
  const endTangent = tangentDirection(endDegrees);
  const startOffset = {
    x: startTangent.x * edgeInset,
    z: startTangent.z * edgeInset,
  };
  const endOffset = {
    x: -endTangent.x * edgeInset,
    z: -endTangent.z * edgeInset,
  };

  return [
    offsetHorizontalPoint(rayPoint(startDegrees, INNER_RADIUS + sizeInset, y), startOffset),
    offsetHorizontalPoint(squareBoundaryPoint(startDegrees, y, halfSize), startOffset),
    ...anglesBetween(startDegrees, spanDegrees).map((angle) =>
      squareBoundaryPoint(angle, y, halfSize),
    ),
    offsetHorizontalPoint(squareBoundaryPoint(endDegrees, y, halfSize), endOffset),
    offsetHorizontalPoint(rayPoint(endDegrees, INNER_RADIUS + sizeInset, y), endOffset),
  ];
};

const layerRadialCutPolygon = (
  angleDegrees: number,
  capY: number,
  innerY: number,
): readonly Vector3Like[] => [
  rayPoint(angleDegrees, INNER_RADIUS, capY),
  squareBoundaryPoint(angleDegrees, capY),
  squareBoundaryPoint(angleDegrees, innerY),
  rayPoint(angleDegrees, INNER_RADIUS, innerY),
];

const rectanglePolygon = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  z: number,
): readonly Vector3Like[] => [
  { x: left, y: top, z },
  { x: right, y: top, z },
  { x: right, y: bottom, z },
  { x: left, y: bottom, z },
];

const interpolatePoint = (from: Vector3Like, to: Vector3Like, ratio: number): Vector3Like => ({
  x: from.x + (to.x - from.x) * ratio,
  y: from.y + (to.y - from.y) * ratio,
  z: from.z + (to.z - from.z) * ratio,
});

const polygonCenter = (polygon: readonly Vector3Like[]): Vector3Like => ({
  x: polygon.reduce((total, point) => total + point.x, 0) / polygon.length,
  y: polygon.reduce((total, point) => total + point.y, 0) / polygon.length,
  z: polygon.reduce((total, point) => total + point.z, 0) / polygon.length,
});

const pushPolygonOutward = (
  polygon: readonly Vector3Like[],
  amount: number,
): readonly Vector3Like[] => {
  const center = polygonCenter(polygon);
  const length = Math.hypot(center.x, center.z);

  if (length === 0) return polygon;

  const offsetX = (center.x / length) * amount;
  const offsetZ = (center.z / length) * amount;

  return polygon.map((point) => ({
    x: point.x + offsetX,
    y: point.y,
    z: point.z + offsetZ,
  }));
};

const localizePolygon = (
  polygon: readonly Vector3Like[],
  origin: Vector3Like,
): readonly Vector3Like[] =>
  polygon.map((point) => ({
    x: point.x - origin.x,
    y: point.y - origin.y,
    z: point.z - origin.z,
  }));

const isCornerPiece = (piece: number): boolean => (piece + (piece <= 7 ? 0 : 1)) % 2 === 0;

const sideColor = (sideIndex: number, isTopPiece: boolean): string => {
  // The 2D Square-1 renderer lays top side stickers from the top-face
  // viewpoint. In the 3D player those front/back stickers live on physical side
  // faces, so top-layer B/F must be mirrored to keep solved side faces uniform.
  const normalizedSideIndex = isTopPiece && sideIndex % 2 === 1 ? 4 - sideIndex : sideIndex;
  const face = SIDE_FACES[sideIndex] ?? 'L';
  const physicalFace = SIDE_FACES[normalizedSideIndex] ?? face;

  return SQUARE_ONE_COLORS[physicalFace];
};

const pieceColors = (pieceValue: number): readonly string[] => {
  const isTopPiece = pieceValue <= 7;
  const capColor = isTopPiece ? SQUARE_ONE_COLORS.U : SQUARE_ONE_COLORS.D;
  let piece = pieceValue;

  if (isCornerPiece(piece)) {
    if (!isTopPiece) piece = 15 - piece;

    let firstSideColor = sideColor((Math.trunc(piece / 2) + 3) % 4, isTopPiece);
    let secondSideColor = sideColor(Math.trunc(piece / 2), isTopPiece);

    if (!isTopPiece) {
      const previousFirstSideColor = firstSideColor;

      firstSideColor = secondSideColor;
      secondSideColor = previousFirstSideColor;
    }

    return [capColor, firstSideColor, secondSideColor];
  }

  if (!isTopPiece) piece = 14 - piece;

  return [capColor, sideColor(Math.trunc(piece / 2), isTopPiece)];
};

const sideFaceForColor = (color: string): SquareOneSideFace | 'side' => {
  const face = SIDE_FACES.find((sideFace) => SQUARE_ONE_COLORS[sideFace] === color);

  return face ?? 'side';
};

const sideFaceForSegment = (angleStart: number, angleEnd: number): SquareOneSideFace => {
  const midpoint = ((angleStart + angleEnd) / 2 + 360 * 4) % 360;

  if (midpoint >= 45 && midpoint < 135) return 'B';
  if (midpoint >= 135 && midpoint < 225) return 'L';
  if (midpoint >= 225 && midpoint < 315) return 'F';

  return 'R';
};

const relativeAngleOnSideFace = (
  angleDegrees: number,
  face: SquareOneSideFace,
  midpointDegrees: number,
): number => {
  const faceStart =
    SIDE_FACE_START_DEGREES[face] +
    360 * Math.round((midpointDegrees - (SIDE_FACE_START_DEGREES[face] + 45)) / 360);
  const relative = angleDegrees - faceStart;

  return Math.min(Math.max(relative, 0), 90);
};

const sideFacePoint = (
  face: SquareOneSideFace,
  relativeDegrees: number,
  y: number,
): Vector3Like => {
  const offset = (relativeDegrees / 90) * LAYER_HALF_SIZE * 2;

  if (face === 'F') return { x: -LAYER_HALF_SIZE + offset, y, z: LAYER_HALF_SIZE };
  if (face === 'R') return { x: LAYER_HALF_SIZE, y, z: LAYER_HALF_SIZE - offset };
  if (face === 'B') return { x: LAYER_HALF_SIZE - offset, y, z: -LAYER_HALF_SIZE };

  return { x: -LAYER_HALF_SIZE, y, z: -LAYER_HALF_SIZE + offset };
};

const sideFaceSegmentPolygon = ({
  angleEnd,
  angleStart,
  capEnd,
  capStart,
  innerEnd,
  innerStart,
}: SideBoundarySegment): readonly Vector3Like[] => {
  const face = sideFaceForSegment(angleStart, angleEnd);
  const midpoint = (angleStart + angleEnd) / 2;
  const relativeStart = relativeAngleOnSideFace(angleStart, face, midpoint);
  const relativeEnd = relativeAngleOnSideFace(angleEnd, face, midpoint);

  if (relativeEnd - relativeStart <= 0) return [capStart, capEnd, innerEnd, innerStart];

  return [
    sideFacePoint(face, relativeStart, capStart.y),
    sideFacePoint(face, relativeEnd, capEnd.y),
    sideFacePoint(face, relativeEnd, innerEnd.y),
    sideFacePoint(face, relativeStart, innerStart.y),
  ];
};

const layerYValues = (
  layer: SquareOneLayerName,
): {
  readonly capY: number;
  readonly innerY: number;
  readonly middleY: number;
} =>
  layer === 'top'
    ? { capY: TOP_CAP_Y, innerY: TOP_INNER_Y, middleY: (TOP_CAP_Y + TOP_INNER_Y) / 2 }
    : {
        capY: BOTTOM_CAP_Y,
        innerY: BOTTOM_INNER_Y,
        middleY: (BOTTOM_CAP_Y + BOTTOM_INNER_Y) / 2,
      };

const solvedStartDegreesForPiece = (piece: number): number => {
  const solvedSlotIndex = solvedSlotIndexByPiece.get(piece);
  if (solvedSlotIndex === undefined) return 0;

  const isTopPiece = piece <= 7;
  const halfSlotIndex = solvedSlotIndex % 12;

  return (
    (isTopPiece ? TOP_INITIAL_ANGLE_DEGREES : BOTTOM_INITIAL_ANGLE_DEGREES) + halfSlotIndex * 30
  );
};

const createSideStickers = (
  id: string,
  startDegrees: number,
  spanDegrees: number,
  layer: SquareOneLayerName,
  sideColors: readonly string[],
  origin: Vector3Like,
  rotationDegrees: number,
): readonly PlayerRenderableSticker[] => {
  const yValues = layerYValues(layer);
  const sideSegments = sideBoundarySegments(
    startDegrees,
    spanDegrees,
    yValues.capY,
    yValues.innerY,
  );
  const segmentCount = sideSegments.length;

  return Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const sideColorIndex = Math.min(
      Math.floor((segmentIndex / Math.max(segmentCount, 1)) * sideColors.length),
      sideColors.length - 1,
    );
    const color = sideColors[sideColorIndex] ?? SQUARE_ONE_COLORS.border;
    const sideSegment = sideSegments[segmentIndex];
    const borderPolygon =
      sideSegment === undefined
        ? []
        : rotatePolygonAroundY(sideFaceSegmentPolygon(sideSegment), rotationDegrees);
    const [capStart, capEnd, innerEnd, innerStart] = borderPolygon;
    const yDirection = Math.sign(yValues.capY - yValues.innerY) || 1;
    const colorPolygon =
      capStart === undefined ||
      capEnd === undefined ||
      innerEnd === undefined ||
      innerStart === undefined
        ? borderPolygon
        : pushPolygonOutward(
            [
              {
                ...interpolatePoint(capStart, capEnd, SIDE_STICKER_EDGE_INSET_RATIO),
                y: capStart.y - yDirection * SIDE_STICKER_Y_INSET,
              },
              {
                ...interpolatePoint(capEnd, capStart, SIDE_STICKER_EDGE_INSET_RATIO),
                y: capEnd.y - yDirection * SIDE_STICKER_Y_INSET,
              },
              {
                ...interpolatePoint(innerEnd, innerStart, SIDE_STICKER_EDGE_INSET_RATIO),
                y: innerEnd.y + yDirection * SIDE_STICKER_Y_INSET,
              },
              {
                ...interpolatePoint(innerStart, innerEnd, SIDE_STICKER_EDGE_INSET_RATIO),
                y: innerStart.y + yDirection * SIDE_STICKER_Y_INSET,
              },
            ],
            SIDE_STICKER_LIFT,
          );

    return [
      sticker(
        `${id}-side-border-${segmentIndex}`,
        'border',
        SQUARE_ONE_COLORS.border,
        localizePolygon(borderPolygon, origin),
      ),
      sticker(
        `${id}-side-${segmentIndex}`,
        sideFaceForColor(color),
        color,
        localizePolygon(colorPolygon, origin),
      ),
    ];
  }).flat();
};

const createPiece = (
  piece: number,
  layer: SquareOneLayerName,
  startDegrees: number,
  spanDegrees: number,
  referenceStartDegrees = solvedStartDegreesForPiece(piece),
): PlayerRenderablePiece => {
  const id = pieceId(piece);
  const yValues = layerYValues(layer);
  const colors = pieceColors(piece);
  const capFace = layer === 'top' ? 'U' : 'D';
  const capId = layer === 'top' ? 'u' : 'd';
  const rotationDegrees = startDegrees - referenceStartDegrees;
  const endDegrees = referenceStartDegrees + spanDegrees;
  const capPolygon = rotatePolygonAroundY(
    orientCapPolygon(layerCapPolygon(referenceStartDegrees, spanDegrees, yValues.capY), layer),
    rotationDegrees,
  );
  const origin = {
    ...polygonCenter(capPolygon),
    y: yValues.middleY,
  };
  const stickers: PlayerRenderableSticker[] = [
    sticker(
      `${id}-cap-border`,
      'border',
      SQUARE_ONE_COLORS.border,
      localizePolygon(
        rotatePolygonAroundY(
          orientCapPolygon(
            layerCapPolygon(
              referenceStartDegrees,
              spanDegrees,
              yValues.capY + (layer === 'top' ? 1 : -1) * BORDER_LIFT,
            ),
            layer,
          ),
          rotationDegrees,
        ),
        origin,
      ),
    ),
    sticker(
      `${id}-${capId}`,
      capFace,
      colors[0] ?? SQUARE_ONE_COLORS.U,
      localizePolygon(
        rotatePolygonAroundY(
          orientCapPolygon(
            layerCapPolygon(
              referenceStartDegrees,
              spanDegrees,
              yValues.capY + (layer === 'top' ? 1 : -1) * BORDER_LIFT * 2,
              CAP_STICKER_EDGE_INSET,
              STICKER_INSET_SIZE,
            ),
            layer,
          ),
          rotationDegrees,
        ),
        origin,
      ),
      'front',
    ),
    sticker(
      `${id}-inner-cut`,
      'cut',
      SQUARE_ONE_COLORS.border,
      localizePolygon(
        rotatePolygonAroundY(
          orientCapPolygon(
            layerCapPolygon(referenceStartDegrees, spanDegrees, yValues.innerY),
            layer,
          ),
          rotationDegrees,
        ),
        origin,
      ),
    ),
    sticker(
      `${id}-start-cut`,
      'cut',
      SQUARE_ONE_COLORS.border,
      localizePolygon(
        rotatePolygonAroundY(
          layerRadialCutPolygon(referenceStartDegrees, yValues.capY, yValues.innerY),
          rotationDegrees,
        ),
        origin,
      ),
    ),
    sticker(
      `${id}-end-cut`,
      'cut',
      SQUARE_ONE_COLORS.border,
      localizePolygon(
        rotatePolygonAroundY(
          layerRadialCutPolygon(endDegrees, yValues.capY, yValues.innerY),
          rotationDegrees,
        ),
        origin,
      ),
    ),
    ...createSideStickers(
      id,
      referenceStartDegrees,
      spanDegrees,
      layer,
      colors.slice(1),
      origin,
      rotationDegrees,
    ),
  ];

  return {
    id,
    orientation: IDENTITY_QUATERNION,
    position: origin,
    stickers,
  };
};

const middleFrontBackStickerPolygon = (polygon: readonly Vector3Like[]): readonly Vector3Like[] => {
  const left = Math.min(...polygon.map((point) => point.x));
  const right = Math.max(...polygon.map((point) => point.x));
  const top = Math.max(...polygon.map((point) => point.y));
  const bottom = Math.min(...polygon.map((point) => point.y));
  const z = polygon[0]?.z ?? 0;

  return pushPolygonOutward(
    rectanglePolygon(
      left + SIDE_STICKER_EDGE_INSET,
      top - SIDE_STICKER_Y_INSET,
      right - SIDE_STICKER_EDGE_INSET,
      bottom + SIDE_STICKER_Y_INSET,
      z,
    ),
    SIDE_STICKER_LIFT,
  );
};

const middleExteriorStickerPolygon = (polygon: readonly Vector3Like[]): readonly Vector3Like[] => {
  const x = polygon[0]?.x ?? 0;
  const back = Math.min(...polygon.map((point) => point.z));
  const front = Math.max(...polygon.map((point) => point.z));
  const top = Math.max(...polygon.map((point) => point.y));
  const bottom = Math.min(...polygon.map((point) => point.y));

  return pushPolygonOutward(
    [
      { x, y: top - SIDE_STICKER_Y_INSET, z: back + SIDE_STICKER_EDGE_INSET },
      { x, y: top - SIDE_STICKER_Y_INSET, z: front - SIDE_STICKER_EDGE_INSET },
      { x, y: bottom + SIDE_STICKER_Y_INSET, z: front - SIDE_STICKER_EDGE_INSET },
      { x, y: bottom + SIDE_STICKER_Y_INSET, z: back + SIDE_STICKER_EDGE_INSET },
    ],
    SIDE_STICKER_LIFT,
  );
};

const createMiddlePiece = (id: string, side: 'left' | 'right'): PlayerRenderablePiece => {
  const left = side === 'left' ? -LAYER_HALF_SIZE : MIDDLE_SEAM_X - MIDDLE_DIVIDER_WIDTH / 2;
  const right = side === 'left' ? MIDDLE_SEAM_X + MIDDLE_DIVIDER_WIDTH / 2 : LAYER_HALF_SIZE;
  const backLeft =
    side === 'left' ? -LAYER_HALF_SIZE : MIRRORED_MIDDLE_SEAM_X - MIDDLE_DIVIDER_WIDTH / 2;
  const backRight =
    side === 'left' ? MIRRORED_MIDDLE_SEAM_X + MIDDLE_DIVIDER_WIDTH / 2 : LAYER_HALF_SIZE;
  const front = MIDDLE_FRONT_Z;
  const back = MIDDLE_BACK_Z;
  const origin = { x: (left + right) / 2, y: 0, z: 0 };
  const frontPolygon = [
    { x: left, y: MIDDLE_TOP_Y, z: front },
    { x: right, y: MIDDLE_TOP_Y, z: front },
    { x: right, y: MIDDLE_BOTTOM_Y, z: front },
    { x: left, y: MIDDLE_BOTTOM_Y, z: front },
  ];
  const backPolygon = [
    { x: backRight, y: MIDDLE_TOP_Y, z: back },
    { x: backLeft, y: MIDDLE_TOP_Y, z: back },
    { x: backLeft, y: MIDDLE_BOTTOM_Y, z: back },
    { x: backRight, y: MIDDLE_BOTTOM_Y, z: back },
  ];
  const frontStickerPolygon = middleFrontBackStickerPolygon(frontPolygon);
  const backStickerPolygon = middleFrontBackStickerPolygon(backPolygon);
  const exteriorSideFace = side === 'left' ? 'L' : 'R';
  const exteriorX = side === 'left' ? left : right;
  const exteriorPolygon = [
    { x: exteriorX, y: MIDDLE_TOP_Y, z: back },
    { x: exteriorX, y: MIDDLE_TOP_Y, z: front },
    { x: exteriorX, y: MIDDLE_BOTTOM_Y, z: front },
    { x: exteriorX, y: MIDDLE_BOTTOM_Y, z: back },
  ];
  const exteriorStickerPolygon = middleExteriorStickerPolygon(exteriorPolygon);
  const topCutPolygon = [frontPolygon[0], frontPolygon[1], backPolygon[0], backPolygon[1]];
  const bottomCutPolygon = [frontPolygon[3], backPolygon[2], backPolygon[3], frontPolygon[2]];
  const innerCutPolygon =
    side === 'left'
      ? [frontPolygon[1], backPolygon[0], backPolygon[3], frontPolygon[2]]
      : [frontPolygon[0], backPolygon[1], backPolygon[2], frontPolygon[3]];

  return {
    id,
    orientation: IDENTITY_QUATERNION,
    position: origin,
    stickers: [
      sticker(
        `${id}-front-border`,
        'border',
        SQUARE_ONE_COLORS.border,
        localizePolygon(frontPolygon, origin),
      ),
      sticker(
        `${id}-front`,
        'F',
        SQUARE_ONE_COLORS.F,
        localizePolygon(frontStickerPolygon, origin),
      ),
      sticker(
        `${id}-back-border`,
        'border',
        SQUARE_ONE_COLORS.border,
        localizePolygon(backPolygon, origin),
      ),
      sticker(`${id}-back`, 'B', SQUARE_ONE_COLORS.B, localizePolygon(backStickerPolygon, origin)),
      sticker(
        `${id}-${exteriorSideFace.toLowerCase()}-border`,
        'border',
        SQUARE_ONE_COLORS.border,
        localizePolygon(exteriorPolygon, origin),
      ),
      sticker(
        `${id}-${exteriorSideFace.toLowerCase()}`,
        exteriorSideFace,
        SQUARE_ONE_COLORS[exteriorSideFace],
        localizePolygon(exteriorStickerPolygon, origin),
      ),
      sticker(
        `${id}-top-cut`,
        'cut',
        SQUARE_ONE_COLORS.cut,
        localizePolygon(topCutPolygon, origin),
      ),
      sticker(
        `${id}-bottom-cut`,
        'cut',
        SQUARE_ONE_COLORS.cut,
        localizePolygon(bottomCutPolygon, origin),
      ),
      sticker(
        `${id}-inner-cut`,
        'cut',
        SQUARE_ONE_COLORS.cut,
        localizePolygon(innerCutPolygon, origin),
      ),
      sticker(
        `${id}-top-border`,
        'border',
        SQUARE_ONE_COLORS.border,
        localizePolygon(
          rectanglePolygon(left, MIDDLE_TOP_Y, right, MIDDLE_TOP_Y - 0.025, front + BORDER_LIFT),
          origin,
        ),
      ),
      sticker(
        `${id}-bottom-border`,
        'border',
        SQUARE_ONE_COLORS.border,
        localizePolygon(
          rectanglePolygon(
            left,
            MIDDLE_BOTTOM_Y + 0.025,
            right,
            MIDDLE_BOTTOM_Y,
            front + BORDER_LIFT,
          ),
          origin,
        ),
      ),
    ],
  };
};

const currentStartDegreesForSlot = (
  piece: number,
  layer: SquareOneLayerName,
  startSlot: number,
): { readonly referenceStartDegrees: number; readonly startDegrees: number } => {
  const layerInitialAngleDegrees =
    layer === 'top' ? TOP_INITIAL_ANGLE_DEGREES : BOTTOM_INITIAL_ANGLE_DEGREES;

  return {
    referenceStartDegrees: solvedStartDegreesForPiece(piece),
    startDegrees: layerInitialAngleDegrees + startSlot * 30,
  };
};

const facePieces = (
  pieces: readonly number[],
  layer: SquareOneLayerName,
): readonly PlayerRenderablePiece[] => {
  const renderablePieces: PlayerRenderablePiece[] = [];
  const renderedPieces = new Set<number>();

  for (let slotIndex = 0; slotIndex < pieces.length; slotIndex += 1) {
    const piece = pieces[slotIndex];
    if (piece === undefined || renderedPieces.has(piece)) continue;

    const occupiedSlots = pieces
      .map((slotPiece, occupiedSlot) => (slotPiece === piece ? occupiedSlot : undefined))
      .filter((occupiedSlot): occupiedSlot is number => occupiedSlot !== undefined);
    const startSlot =
      occupiedSlots.length === 2 && occupiedSlots.includes(0) && occupiedSlots.includes(11)
        ? 11
        : (occupiedSlots[0] ?? slotIndex);
    const spanDegrees = occupiedSlots.length * 30;
    const { referenceStartDegrees, startDegrees } = currentStartDegreesForSlot(
      piece,
      layer,
      startSlot,
    );

    renderablePieces.push(
      createPiece(piece, layer, startDegrees, spanDegrees, referenceStartDegrees),
    );
    renderedPieces.add(piece);
  }

  return renderablePieces;
};

const uniquePieceIds = (pieces: readonly number[]): readonly string[] => {
  const ids: string[] = [];

  for (const piece of pieces) {
    const id = pieceId(piece);
    if (!ids.includes(id)) ids.push(id);
  }

  return ids;
};

const slashHalfSlots = (pieces: readonly number[]): readonly number[] => {
  const nextPieces = [...pieces];

  for (let index = 0; index < 6; index += 1) {
    const topIndex = 6 + index;
    const bottomIndex = 12 + index;
    const bottomPiece = nextPieces[bottomIndex];

    nextPieces[bottomIndex] = nextPieces[topIndex] ?? 0;
    nextPieces[topIndex] = bottomPiece ?? 0;
  }

  return nextPieces;
};

const slashAffectedPieceIds = (pieces: readonly number[]): readonly string[] => [
  ...uniquePieceIds(pieces.slice(6, 12)),
  ...uniquePieceIds(pieces.slice(12, 18)),
  'square1-middle-right',
];

const topTurnToRadians = (turn: SquareOneTurn): number => turn * TURN_RADIANS;

const bottomTurnToRadians = (turn: SquareOneTurn): number => turn * TURN_RADIANS;

const pivotMapForIds = (
  ids: readonly string[],
  pivot: Vector3Like,
): Readonly<Record<string, Vector3Like>> => Object.fromEntries(ids.map((id) => [id, pivot]));

const applyPoseToPiece = (
  piece: PlayerRenderablePiece,
  pose:
    | {
        readonly orientation: QuaternionLike;
        readonly position: Vector3Like;
      }
    | undefined,
): PlayerRenderablePiece =>
  pose === undefined
    ? piece
    : {
        ...piece,
        orientation: pose.orientation,
        position: pose.position,
      };

const rotatePieceAroundY = (
  piece: PlayerRenderablePiece,
  angleRadians: number,
): PlayerRenderablePiece => {
  if (angleRadians === 0) return piece;

  const rotation = axisAngleQuaternion({ x: 0, y: 1, z: 0 }, angleRadians);

  return applyPoseToPiece(piece, {
    orientation: multiplyQuaternions(rotation, piece.orientation),
    position: rotatePointAroundAxis(piece.position, { x: 0, y: 1, z: 0 }, angleRadians, {
      x: 0,
      y: 0,
      z: 0,
    }),
  });
};

const slashPoseForPiece = (
  piece: PlayerRenderablePiece,
): {
  readonly orientation: QuaternionLike;
  readonly position: Vector3Like;
} => {
  const rotation = axisAngleQuaternion(SLASH_AXIS, -Math.PI);

  return {
    orientation: multiplyQuaternions(rotation, piece.orientation),
    position: rotatePointAroundAxis(piece.position, SLASH_AXIS, -Math.PI, { x: 0, y: 0, z: 0 }),
  };
};

const layerPiecesForState = (
  pieces: readonly number[],
  layer: SquareOneLayerName,
  layerRotationRadians: number,
): readonly PlayerRenderablePiece[] =>
  facePieces(pieces, layer).map((piece) => rotatePieceAroundY(piece, layerRotationRadians));

const middlePiecesForState = (state: SquareOneState): readonly PlayerRenderablePiece[] => {
  const middleLeft = createMiddlePiece('square1-middle-left', 'left');
  const middleRight = createMiddlePiece('square1-middle-right', 'right');

  if (state.sliceSolved) return [middleLeft, middleRight];

  return [middleLeft, applyPoseToPiece(middleRight, slashPoseForPiece(middleRight))];
};

const createPiecesForPlayerState = (
  state: SquareOnePlayerState,
): readonly PlayerRenderablePiece[] => [
  ...middlePiecesForState(state.puzzleState),
  ...layerPiecesForState(
    state.puzzleState.pieces.slice(0, 12),
    'top',
    state.topLayerRotationRadians,
  ),
  ...layerPiecesForState(
    state.puzzleState.pieces.slice(12),
    'bottom',
    state.bottomLayerRotationRadians,
  ),
];

const targetPoseByPieceId = (
  pieces: readonly PlayerRenderablePiece[],
  ids: readonly string[],
): {
  readonly targetOrientationByPieceId: Readonly<Record<string, QuaternionLike>>;
  readonly targetPositionByPieceId: Readonly<Record<string, Vector3Like>>;
} => {
  const targetOrientationByPieceId: Record<string, QuaternionLike> = {};
  const targetPositionByPieceId: Record<string, Vector3Like> = {};

  for (const id of ids) {
    const piece = pieces.find((candidate) => candidate.id === id);
    if (piece === undefined) continue;

    targetOrientationByPieceId[id] = piece.orientation;
    targetPositionByPieceId[id] = piece.position;
  }

  return {
    targetOrientationByPieceId,
    targetPositionByPieceId,
  };
};

const describeSquareOneMove = (
  move: SquareOneMove,
  state: SquareOnePlayerState,
): PlayerMoveAnimation<SquareOneMove> => {
  if (move.type === 'slash') {
    const affectedPieceIds = slashAffectedPieceIds(state.puzzleState.pieces);
    const targetPuzzleState = {
      sliceSolved: !state.puzzleState.sliceSolved,
      pieces: slashHalfSlots(state.puzzleState.pieces),
    };
    const targetPieces = createPiecesForPlayerState({
      bottomLayerRotationRadians: 0,
      puzzleState: targetPuzzleState,
      topLayerRotationRadians: 0,
    });
    const targets = targetPoseByPieceId(targetPieces, affectedPieceIds);
    const angleRadians = -Math.PI;

    return {
      affectedPieceIds,
      angleRadians,
      axis: SLASH_AXIS,
      durationMultiplier: SLASH_DURATION_MULTIPLIER,
      move,
      pivot: { x: 0, y: 0, z: 0 },
      ...targets,
    };
  }

  const topPieceIds = move.top === 0 ? [] : uniquePieceIds(state.puzzleState.pieces.slice(0, 12));
  const bottomPieceIds =
    move.bottom === 0 ? [] : uniquePieceIds(state.puzzleState.pieces.slice(12));
  const affectedPieceIds = [...topPieceIds, ...bottomPieceIds];
  const angleRadiansByPieceId: Record<string, number> = {};
  const pivotByPieceId = {
    ...pivotMapForIds(topPieceIds, { x: 0, y: layerYValues('top').middleY, z: 0 }),
    ...pivotMapForIds(bottomPieceIds, { x: 0, y: layerYValues('bottom').middleY, z: 0 }),
  };

  for (const id of topPieceIds) angleRadiansByPieceId[id] = topTurnToRadians(move.top);
  for (const id of bottomPieceIds) angleRadiansByPieceId[id] = bottomTurnToRadians(move.bottom);

  return {
    affectedPieceIds,
    angleRadians: 0,
    angleRadiansByPieceId,
    axis: { x: 0, y: 1, z: 0 },
    durationMultiplier: 1 + (Math.max(Math.abs(move.top), Math.abs(move.bottom)) / 6) * 0.4,
    move,
    pivot: { x: 0, y: 0, z: 0 },
    pivotByPieceId,
  };
};

export const createSquareOnePlayerAdapter = (): PlayerPuzzleAdapter<
  SquareOneMove,
  SquareOnePlayerState
> => {
  const definition = createSquareOneDefinition();

  return {
    type: 'square1',
    eventIds: ['sq1'],
    shouldRebuildModelAfterEachMove: true,
    parseFormula: (formula) => definition.parseAlgorithm(formula),
    createInitialState: () => ({
      bottomLayerRotationRadians: 0,
      puzzleState: definition.createSolvedState(),
      topLayerRotationRadians: 0,
    }),
    createRenderableModel: (state): PlayerRenderableModel => ({
      cameraDistance: CAMERA_DISTANCE,
      cameraOrbit: CAMERA_ORBIT,
      pieces: createPiecesForPlayerState(state),
    }),
    describeMove: describeSquareOneMove,
    applyMove: (state, move) => {
      const puzzleState = definition.applyMove(state.puzzleState, move);

      if (move.type === 'slash') {
        return {
          bottomLayerRotationRadians: 0,
          puzzleState,
          topLayerRotationRadians: 0,
        };
      }

      return {
        bottomLayerRotationRadians: 0,
        puzzleState,
        topLayerRotationRadians: 0,
      };
    },
  };
};
