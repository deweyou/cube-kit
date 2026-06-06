import {
  PYRAMINX_FACES,
  type PyraminxFace,
  type PyraminxFacelet,
  type PyraminxState,
} from '@cubegin/scramble-puzzle';
import type { HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, type SvgNode } from '../svg/svg-elements.js';

const WIDTH = 370;
const HEIGHT = 146;
const STROKE = '#000000';
const STROKE_WIDTH = 2.5;
const VISIBLE_FACES = ['F', 'L', 'R', 'D'] as const;

export type PyraminxIsometricColorScheme = Partial<Record<PyraminxFace, HexColor>>;

const DEFAULT_PYRAMINX_COLORS: Record<PyraminxFace, HexColor> = {
  F: '#00ff00',
  D: '#ffff00',
  L: '#ff0000',
  R: '#0000ff',
};

interface Point {
  readonly x: number;
  readonly y: number;
}

type Polygon = readonly Point[];

interface StickerPolygon {
  readonly points: Polygon;
  readonly fill: HexColor;
}

interface Segment {
  readonly start: Point;
  readonly end: Point;
}

const FACE_BOUNDARIES: Record<PyraminxFace, Polygon> = {
  F: [
    { x: 90, y: 96 },
    { x: 162, y: 142 },
    { x: 18, y: 142 },
  ],
  D: [
    { x: 202, y: 16 },
    { x: 342, y: 16 },
    { x: 272, y: 138 },
  ],
  L: [
    { x: 90, y: 12 },
    { x: 90, y: 96 },
    { x: 18, y: 142 },
  ],
  R: [
    { x: 90, y: 96 },
    { x: 90, y: 12 },
    { x: 162, y: 142 },
  ],
};

const det = (a: number, b: number, c: number, d: number): number => a * d - b * c;

const lineIntersection = (
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): Point => {
  const firstDet = det(firstStart.x, firstStart.y, firstEnd.x, firstEnd.y);
  const secondDet = det(secondStart.x, secondStart.y, secondEnd.x, secondEnd.y);
  const divisor = det(
    firstStart.x - firstEnd.x,
    firstStart.y - firstEnd.y,
    secondStart.x - secondEnd.x,
    secondStart.y - secondEnd.y,
  );

  return {
    x: det(firstDet, firstStart.x - firstEnd.x, secondDet, secondStart.x - secondEnd.x) / divisor,
    y: det(firstDet, firstStart.y - firstEnd.y, secondDet, secondStart.y - secondEnd.y) / divisor,
  };
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

const createStickerPolygons = (boundary: Polygon): readonly Polygon[] => {
  const edgePoints: Point[] = [];

  for (let index = 0; index < 3; index += 1) {
    const current = boundary[index];
    const next = boundary[(index + 1) % 3];

    edgePoints[index] = {
      x: (1 / 3) * next.x + (2 / 3) * current.x,
      y: (1 / 3) * next.y + (2 / 3) * current.y,
    };
    edgePoints[index + 3] = {
      x: (2 / 3) * next.x + (1 / 3) * current.x,
      y: (2 / 3) * next.y + (1 / 3) * current.y,
    };
  }

  const center = lineIntersection(edgePoints[0], edgePoints[4], edgePoints[2], edgePoints[3]);
  const stickers: Polygon[] = [];

  for (let index = 0; index < 3; index += 1) {
    stickers[3 * index] = [boundary[index], edgePoints[index], edgePoints[3 + ((2 + index) % 3)]];
    stickers[3 * index + 1] = [edgePoints[index], edgePoints[3 + ((index + 2) % 3)], center];
    stickers[3 * index + 2] = [edgePoints[index], edgePoints[index + 3], center];
  }

  return stickers;
};

const colorForSticker = (
  facelet: PyraminxFacelet,
  colors: Record<PyraminxFace, HexColor>,
): HexColor => colors[PYRAMINX_FACES[facelet] ?? 'F'];

const createFaceStickers = (
  state: PyraminxState,
  face: PyraminxFace,
  colors: Record<PyraminxFace, HexColor>,
): readonly StickerPolygon[] => {
  const faceIndex = PYRAMINX_FACES.indexOf(face);
  const stickers = state.image[faceIndex];
  const stickerPolygons = createStickerPolygons(FACE_BOUNDARIES[face]);

  return stickerPolygons.map((polygon, stickerIndex) => ({
    points: polygon,
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

const drawFaces = (state: PyraminxState, colors: Record<PyraminxFace, HexColor>): SvgNode[] => {
  const stickers = VISIBLE_FACES.flatMap((face) => createFaceStickers(state, face, colors));

  return [...drawStickers(stickers), drawLinework(stickers)];
};

export const renderPyraminxIsometricState = (
  state: PyraminxState,
  colorScheme: PyraminxIsometricColorScheme = {},
): string => {
  const colors: Record<PyraminxFace, HexColor> = {
    ...DEFAULT_PYRAMINX_COLORS,
    ...colorScheme,
  };
  const nodes = drawFaces(state, colors);

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
