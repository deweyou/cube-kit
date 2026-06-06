import type { SkewbFace, SkewbFacelet, SkewbState } from '@cubekit/scramble-puzzle';
import type { HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, type SvgNode } from '../svg/svg-elements.js';

const WIDTH = 404;
const HEIGHT = 168;
const STROKE = '#000000';
const STROKE_WIDTH = 2.5;
const STATE_FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

export type SkewbIsometricColorScheme = Partial<Record<SkewbFace, HexColor>>;

const DEFAULT_SKEWB_COLORS: Record<SkewbFace, HexColor> = {
  U: '#ffffff',
  R: '#0000ff',
  F: '#ff0000',
  D: '#ffff00',
  L: '#00ff00',
  B: '#ff8000',
};

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Transform {
  readonly topLeft: Point;
  readonly topRight: Point;
  readonly bottomRight: Point;
  readonly bottomLeft: Point;
}

type Polygon = readonly Point[];

interface FaceSpec {
  readonly face: SkewbFace;
  readonly transform: Transform;
}

interface StickerPolygon {
  readonly points: Polygon;
  readonly fill: HexColor;
}

interface Segment {
  readonly start: Point;
  readonly end: Point;
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

const FACE_STICKERS: readonly Polygon[] = [
  [
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
  ],
  [
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
  ],
  [
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 0 },
  ],
  [
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: 1 },
  ],
  [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 0 },
  ],
];

const point = (x: number, y: number): Point => ({ x, y });

const transformFromCorners = (
  topLeft: Point,
  topRight: Point,
  bottomRight: Point,
  bottomLeft: Point,
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
  centerX: 90,
  topY: 6,
  topEdgeY: 39,
  centerY: 82,
  bottomEdgeY: 120,
  bottomY: 162,
  topHalfWidth: 72,
  bottomHalfWidth: 66,
});
const backView = createCornerViewPoints({
  centerX: 314,
  topY: 6,
  topEdgeY: 39,
  centerY: 88,
  bottomEdgeY: 120,
  bottomY: 156,
  topHalfWidth: 68,
  bottomHalfWidth: 72,
});

const FACE_SPECS: readonly FaceSpec[] = [
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
    face: 'L',
    transform: transformFromCorners(
      frontView.leftTop,
      frontView.center,
      frontView.bottom,
      frontView.leftBottom,
    ),
  },
  {
    face: 'F',
    transform: transformFromCorners(
      frontView.rightTop,
      frontView.rightBottom,
      frontView.bottom,
      frontView.center,
    ),
  },
  {
    face: 'R',
    transform: transformFromCorners(
      backView.leftTop,
      backView.top,
      backView.center,
      backView.leftBottom,
    ),
  },
  {
    face: 'B',
    transform: transformFromCorners(
      backView.top,
      backView.rightTop,
      backView.rightBottom,
      backView.center,
    ),
  },
  {
    face: 'D',
    transform: transformFromCorners(
      backView.center,
      backView.rightBottom,
      backView.bottom,
      backView.leftBottom,
    ),
  },
];

const interpolatePoint = (start: Point, end: Point, ratio: number): Point => ({
  x: start.x + (end.x - start.x) * ratio,
  y: start.y + (end.y - start.y) * ratio,
});

const transformPoint = (pointValue: Point, transform: Transform): Point => {
  const horizontalRatio = (pointValue.x + 1) / 2;
  const verticalRatio = (pointValue.y + 1) / 2;
  const top = interpolatePoint(transform.topLeft, transform.topRight, horizontalRatio);
  const bottom = interpolatePoint(transform.bottomLeft, transform.bottomRight, horizontalRatio);

  return interpolatePoint(top, bottom, verticalRatio);
};

const polygonPath = (points: Polygon): string => {
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

const colorForSticker = (facelet: SkewbFacelet, colors: Record<SkewbFace, HexColor>): HexColor =>
  colors[STATE_FACE_ORDER[facelet] ?? 'U'];

const createFaceStickers = (
  state: SkewbState,
  faceSpec: FaceSpec,
  colors: Record<SkewbFace, HexColor>,
): readonly StickerPolygon[] => {
  const { face, transform } = faceSpec;
  const faceIndex = STATE_FACE_ORDER.indexOf(face);
  const stickers = state.image[faceIndex];

  return FACE_STICKERS.map((polygon, stickerIndex) => ({
    points: polygon.map((pointValue) => transformPoint(pointValue, transform)),
    fill: colorForSticker(stickers[stickerIndex], colors),
  }));
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
      d: polygonPath(sticker.points),
      fill: sticker.fill,
      stroke: 'none',
    }),
  );

const drawLinework = (stickers: readonly StickerPolygon[]): SvgNode =>
  path({
    d: lineworkPath(createLineworkSegments(stickers)),
    fill: 'none',
    stroke: STROKE,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': STROKE_WIDTH,
  });

export const renderSkewbIsometricState = (
  state: SkewbState,
  colorScheme: SkewbIsometricColorScheme = {},
): string => {
  const colors: Record<SkewbFace, HexColor> = {
    ...DEFAULT_SKEWB_COLORS,
    ...colorScheme,
  };
  const stickers = FACE_SPECS.flatMap((faceSpec) => createFaceStickers(state, faceSpec, colors));
  const nodes = [...drawStickers(stickers), drawLinework(stickers)];

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
