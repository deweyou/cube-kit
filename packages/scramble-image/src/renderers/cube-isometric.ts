import type { CubeFacelet, CubeState } from '@cubekit/scramble-puzzle';
import { DEFAULT_CUBE_COLORS, type HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, type SvgNode } from '../svg/svg-elements.js';

const PADDING = 6;
const VIEW_GAP = 28;
const STROKE = '#000000';
const STROKE_WIDTH = 2.5;
const FACE_ORDER = ['R', 'U', 'F', 'L', 'D', 'B'] as const;

type CubeFace = (typeof FACE_ORDER)[number];

export type CubeIsometricColorScheme = Partial<Record<CubeFacelet, HexColor>>;

interface Point2D {
  readonly x: number;
  readonly y: number;
}

interface Transform {
  readonly topLeft: Point2D;
  readonly topRight: Point2D;
  readonly bottomRight: Point2D;
  readonly bottomLeft: Point2D;
}

interface FaceSpec {
  readonly face: CubeFace;
  readonly transform: Transform;
}

interface StickerPolygon {
  readonly points: readonly Point2D[];
  readonly fill: HexColor;
}

interface Segment {
  readonly start: Point2D;
  readonly end: Point2D;
}

interface ViewGeometry {
  readonly centerX: number;
  readonly topY: number;
  readonly topEdgeY: number;
  readonly centerY: number;
  readonly bottomEdgeY: number;
  readonly bottomY: number;
  readonly topHalfWidth: number;
  readonly bottomHalfWidth: number;
}

const point = (x: number, y: number): Point2D => ({ x, y });

const transformFromCorners = (
  topLeft: Point2D,
  topRight: Point2D,
  bottomRight: Point2D,
  bottomLeft: Point2D,
): Transform => ({ topLeft, topRight, bottomRight, bottomLeft });

const createCornerViewPoints = (geometry: ViewGeometry) => ({
  top: point(geometry.centerX, geometry.topY),
  leftTop: point(geometry.centerX - geometry.topHalfWidth, geometry.topEdgeY),
  rightTop: point(geometry.centerX + geometry.topHalfWidth, geometry.topEdgeY),
  center: point(geometry.centerX, geometry.centerY),
  leftBottom: point(geometry.centerX - geometry.bottomHalfWidth, geometry.bottomEdgeY),
  rightBottom: point(geometry.centerX + geometry.bottomHalfWidth, geometry.bottomEdgeY),
  bottom: point(geometry.centerX, geometry.bottomY),
});

const frontView = createCornerViewPoints({
  centerX: 84,
  topY: 6,
  topEdgeY: 42,
  centerY: 80,
  bottomEdgeY: 116,
  bottomY: 160,
  topHalfWidth: 74,
  bottomHalfWidth: 74,
});

const backView = createCornerViewPoints({
  centerX: 84,
  topY: 6,
  topEdgeY: 42,
  centerY: 80,
  bottomEdgeY: 116,
  bottomY: 160,
  topHalfWidth: 74,
  bottomHalfWidth: 74,
});

const FRONT_VIEW_FACES: readonly FaceSpec[] = [
  {
    face: 'U',
    transform: transformFromCorners(
      frontView.leftTop,
      frontView.top,
      frontView.rightTop,
      frontView.center,
    ),
  },
  {
    face: 'F',
    transform: transformFromCorners(
      frontView.leftTop,
      frontView.center,
      frontView.bottom,
      frontView.leftBottom,
    ),
  },
  {
    face: 'R',
    transform: transformFromCorners(
      frontView.center,
      frontView.rightTop,
      frontView.rightBottom,
      frontView.bottom,
    ),
  },
];

const BACK_VIEW_FACES: readonly FaceSpec[] = [
  {
    face: 'D',
    transform: transformFromCorners(
      backView.leftTop,
      backView.top,
      backView.rightTop,
      backView.center,
    ),
  },
  {
    face: 'B',
    transform: transformFromCorners(
      backView.leftTop,
      backView.center,
      backView.bottom,
      backView.leftBottom,
    ),
  },
  {
    face: 'L',
    transform: transformFromCorners(
      backView.center,
      backView.rightTop,
      backView.rightBottom,
      backView.bottom,
    ),
  },
];

const interpolatePoint = (start: Point2D, end: Point2D, ratio: number): Point2D => ({
  x: start.x + (end.x - start.x) * ratio,
  y: start.y + (end.y - start.y) * ratio,
});

const transformPoint = (pointValue: Point2D, transform: Transform): Point2D => {
  const top = interpolatePoint(transform.topLeft, transform.topRight, pointValue.x);
  const bottom = interpolatePoint(transform.bottomLeft, transform.bottomRight, pointValue.x);

  return interpolatePoint(top, bottom, pointValue.y);
};

const stickerPoints = (row: number, col: number, size: number, transform: Transform) => {
  const left = col / size;
  const right = (col + 1) / size;
  const top = row / size;
  const bottom = (row + 1) / size;

  return [
    transformPoint(point(left, top), transform),
    transformPoint(point(right, top), transform),
    transformPoint(point(right, bottom), transform),
    transformPoint(point(left, bottom), transform),
  ];
};

const polygonPath = (points: readonly Point2D[]): string => {
  const [firstPoint, ...remainingPoints] = points;
  if (!firstPoint) return '';

  return [
    `M ${formatCoordinate(firstPoint.x)} ${formatCoordinate(firstPoint.y)}`,
    ...remainingPoints.map(
      (pointValue) => `L ${formatCoordinate(pointValue.x)} ${formatCoordinate(pointValue.y)}`,
    ),
    'Z',
  ].join(' ');
};

const formatCoordinate = (value: number): number => Number(value.toFixed(3));

const lineworkPath = (segments: readonly Segment[]): string =>
  segments
    .map(
      ({ start, end }) =>
        `M ${formatCoordinate(start.x)} ${formatCoordinate(start.y)} L ${formatCoordinate(
          end.x,
        )} ${formatCoordinate(end.y)}`,
    )
    .join(' ');

const cubeFaceIndex = (face: CubeFace): number => FACE_ORDER.indexOf(face);

const createStickerPolygonsForView = (
  state: CubeState,
  colors: Record<CubeFacelet, HexColor>,
  faces: readonly FaceSpec[],
): readonly StickerPolygon[] => {
  const stickers: StickerPolygon[] = [];

  for (const { face, transform } of faces) {
    const faceIndex = cubeFaceIndex(face);
    const faceImage = state.image[faceIndex];

    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        stickers.push({
          points: stickerPoints(row, col, state.size, transform),
          fill: colors[faceImage[row][col]],
        });
      }
    }
  }

  return stickers;
};

const createStickerPolygons = (
  state: CubeState,
  colors: Record<CubeFacelet, HexColor>,
): readonly StickerPolygon[] => {
  const frontViewStickers = createStickerPolygonsForView(state, colors, FRONT_VIEW_FACES);
  const backViewStickers = createStickerPolygonsForView(state, colors, BACK_VIEW_FACES);
  const [frontMinX, frontMinY, frontMaxX] = boundsFor(frontViewStickers);
  const [backMinX, backMinY] = boundsFor(backViewStickers);
  const frontWidth = frontMaxX - frontMinX;
  const backOffsetX = frontWidth + VIEW_GAP;
  const frontOffsetY = Math.max(0, backMinY - frontMinY);
  const backOffsetY = Math.max(0, frontMinY - backMinY);

  return [
    ...frontViewStickers.map((sticker) => ({
      points: translatePoints(sticker.points, -frontMinX, -frontMinY + frontOffsetY),
      fill: sticker.fill,
    })),
    ...backViewStickers.map((sticker) => ({
      points: translatePoints(sticker.points, backOffsetX - backMinX, -backMinY + backOffsetY),
      fill: sticker.fill,
    })),
  ];
};

const segmentKey = ({ start, end }: Segment): string => {
  const startKey = `${formatCoordinate(start.x)},${formatCoordinate(start.y)}`;
  const endKey = `${formatCoordinate(end.x)},${formatCoordinate(end.y)}`;

  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
};

const createLineworkSegments = (stickers: readonly StickerPolygon[]): readonly Segment[] => {
  const segments = new Map<string, Segment>();

  for (const sticker of stickers) {
    for (let index = 0; index < sticker.points.length; index += 1) {
      const start = sticker.points[index];
      const end = sticker.points[(index + 1) % sticker.points.length];
      const segment = { start, end };

      segments.set(segmentKey(segment), segment);
    }
  }

  return [...segments.values()];
};

const drawStickers = (stickers: readonly StickerPolygon[]): SvgNode[] =>
  stickers.map((sticker) =>
    path({
      d: polygonPath(
        sticker.points.map((pointValue) => ({
          x: pointValue.x + PADDING,
          y: pointValue.y + PADDING,
        })),
      ),
      fill: sticker.fill,
      stroke: 'none',
    }),
  );

const drawLinework = (stickers: readonly StickerPolygon[]): SvgNode =>
  path({
    d: lineworkPath(
      createLineworkSegments(
        stickers.map((sticker) => ({
          points: sticker.points.map((pointValue) => ({
            x: pointValue.x + PADDING,
            y: pointValue.y + PADDING,
          })),
          fill: sticker.fill,
        })),
      ),
    ),
    fill: 'none',
    stroke: STROKE,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': STROKE_WIDTH,
  });

const translatePoints = (
  points: readonly Point2D[],
  offsetX: number,
  offsetY: number,
): readonly Point2D[] =>
  points.map((pointValue) => ({
    x: pointValue.x + offsetX,
    y: pointValue.y + offsetY,
  }));

const boundsFor = (
  stickers: readonly { readonly points: readonly Point2D[] }[],
): readonly [number, number, number, number] => {
  const points = stickers.flatMap((sticker) => sticker.points);

  return [
    Math.min(...points.map((pointValue) => pointValue.x)),
    Math.min(...points.map((pointValue) => pointValue.y)),
    Math.max(...points.map((pointValue) => pointValue.x)),
    Math.max(...points.map((pointValue) => pointValue.y)),
  ];
};

export const renderCubeIsometric = (
  state: CubeState,
  colorScheme: CubeIsometricColorScheme = {},
): string => {
  const colors: Record<CubeFacelet, HexColor> = { ...DEFAULT_CUBE_COLORS, ...colorScheme };
  const stickers = createStickerPolygons(state, colors);
  const [, , maxX, maxY] = boundsFor(stickers);
  const nodes = [...drawStickers(stickers), drawLinework(stickers)];

  return createSvgDocument(Math.ceil(maxX + 2 * PADDING), Math.ceil(maxY + 2 * PADDING), nodes);
};
