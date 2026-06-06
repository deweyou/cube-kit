import {
  PYRAMINX_FACES,
  type PyraminxFace,
  type PyraminxFacelet,
  type PyraminxState,
} from '@cubegin/scramble-puzzle';
import type { HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, type SvgNode } from '../svg/svg-elements.js';

const PIECE_SIZE = 30;
const GAP = 5;
const WIDTH = 2 * 3 * PIECE_SIZE + 4 * GAP;
const HEIGHT = Math.trunc(2 * 1.5 * Math.sqrt(3) * PIECE_SIZE + 3 * GAP);
const STROKE = '#000000';
const STROKE_WIDTH = 1.25;

export type PyraminxColorScheme = Partial<Record<PyraminxFace, HexColor>>;

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

const triangleBoundary = (x: number, y: number, pointsUp: boolean): Polygon => {
  const radius = Math.trunc(Math.sqrt(3) * PIECE_SIZE);
  const angles = [7 / 6, 11 / 6, 0.5].map((angle) => (pointsUp ? angle + 1 / 3 : angle) * Math.PI);

  return angles.map((angle) => ({
    x: x + radius * Math.cos(angle),
    y: y + radius * Math.sin(angle),
  }));
};

const polygonPath = (points: Polygon): string => {
  const [firstPoint, ...remainingPoints] = points;
  if (firstPoint === undefined) return '';

  return [
    `M ${firstPoint.x} ${firstPoint.y}`,
    ...remainingPoints.map((pointValue) => `L ${pointValue.x} ${pointValue.y}`),
    'Z',
  ].join(' ');
};

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

const faceBoundary = (face: PyraminxFace): Polygon => {
  switch (face) {
    case 'F':
      return triangleBoundary(2 * GAP + 3 * PIECE_SIZE, GAP + Math.sqrt(3) * PIECE_SIZE, true);
    case 'D':
      return triangleBoundary(
        2 * GAP + 3 * PIECE_SIZE,
        2 * GAP + 2 * Math.sqrt(3) * PIECE_SIZE,
        false,
      );
    case 'L':
      return triangleBoundary(GAP + 1.5 * PIECE_SIZE, GAP + (Math.sqrt(3) / 2) * PIECE_SIZE, false);
    case 'R':
      return triangleBoundary(
        3 * GAP + 4.5 * PIECE_SIZE,
        GAP + (Math.sqrt(3) / 2) * PIECE_SIZE,
        false,
      );
  }
};

const colorForSticker = (
  facelet: PyraminxFacelet,
  colors: Record<PyraminxFace, HexColor>,
): HexColor => colors[PYRAMINX_FACES[facelet] ?? 'F'];

const drawFace = (
  state: PyraminxState,
  face: PyraminxFace,
  colors: Record<PyraminxFace, HexColor>,
): SvgNode[] => {
  const faceIndex = PYRAMINX_FACES.indexOf(face);
  const stickers = state.image[faceIndex];
  const stickerPolygons = createStickerPolygons(faceBoundary(face));

  return stickerPolygons.map((polygon, stickerIndex) =>
    path({
      d: polygonPath(polygon),
      fill: colorForSticker(stickers[stickerIndex], colors),
      stroke: STROKE,
      'stroke-width': STROKE_WIDTH,
      'stroke-linejoin': 'round',
    }),
  );
};

export const renderPyraminxState = (
  state: PyraminxState,
  colorScheme: PyraminxColorScheme = {},
): string => {
  const colors: Record<PyraminxFace, HexColor> = {
    ...DEFAULT_PYRAMINX_COLORS,
    ...colorScheme,
  };
  const nodes = PYRAMINX_FACES.flatMap((face) => drawFace(state, face, colors));

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
