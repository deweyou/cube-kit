import {
  MEGAMINX_FACES,
  type MegaminxFace,
  type MegaminxFacelet,
  type MegaminxState,
} from '@cubekit/scramble-puzzle';
import type { HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, text, type SvgNode } from '../svg/svg-elements.js';

// Mirrors TNoodle's preferred unfolded Megaminx SVG layout.
const GAP = 2;
const MINX_RADIUS = 30;
const UNFOLD_HEIGHT = 2 + 3 * Math.sin(0.3 * Math.PI) + Math.sin(0.1 * Math.PI);
const UNFOLD_WIDTH = 4 * Math.cos(0.1 * Math.PI) + 2 * Math.cos(0.3 * Math.PI);
const WIDTH = Math.trunc(UNFOLD_WIDTH * 2 * MINX_RADIUS + 3 * GAP);
const HEIGHT = Math.trunc(UNFOLD_HEIGHT * MINX_RADIUS + 2 * GAP);
const STROKE = '#000000';

export type MegaminxColorScheme = Partial<Record<MegaminxFace, HexColor>>;

const DEFAULT_MEGAMINX_COLORS: Record<MegaminxFace, HexColor> = {
  U: '#ffffff',
  BL: '#ffcc00',
  BR: '#0000b3',
  R: '#dd0000',
  F: '#006600',
  L: '#8a1aff',
  D: '#999999',
  DR: '#ffffb3',
  DBR: '#ff99ff',
  B: '#71e600',
  DBL: '#ff8433',
  DL: '#88ddff',
};

interface Point {
  readonly x: number;
  readonly y: number;
}

type Polygon = readonly Point[];

const pentagon = (centerX: number, centerY: number, pointUp: boolean): Polygon => {
  const angles = [1.3, 1.7, 0.1, 0.5, 0.9].map(
    (angle) => (pointUp ? angle - 0.2 : angle) * Math.PI,
  );

  return angles.map((angle) => ({
    x: centerX + MINX_RADIUS * Math.cos(angle),
    y: centerY + MINX_RADIUS * Math.sin(angle),
  }));
};

const edgeLength = MINX_RADIUS * Math.sqrt(2 * (1 - Math.cos(0.6 * Math.PI)));
const radiusCos18 = MINX_RADIUS * Math.cos(0.1 * Math.PI);
const edgeCos18 = edgeLength * Math.cos(0.1 * Math.PI);
const edgeCos54 = edgeLength * Math.cos(0.3 * Math.PI);
const edgeSin18 = edgeLength * Math.sin(0.1 * Math.PI);
const edgeSin54 = edgeLength * Math.sin(0.3 * Math.PI);
const leftCenterX = GAP + radiusCos18 + edgeCos18 + edgeSin18 / 2;
const leftCenterY = GAP + edgeLength + MINX_RADIUS - edgeSin18;
const shift =
  leftCenterX + edgeSin18 * 0.6 + MINX_RADIUS * (Math.cos(0.1 * Math.PI) + Math.cos(0.2 * Math.PI));

const faceBoundary = (face: MegaminxFace): Polygon => {
  switch (face) {
    case 'U':
      return pentagon(leftCenterX, leftCenterY, true);
    case 'BL':
      return pentagon(leftCenterX - edgeCos54, leftCenterY - edgeSin54, false);
    case 'BR':
      return pentagon(leftCenterX + edgeCos54, leftCenterY - edgeSin54, false);
    case 'R':
      return pentagon(leftCenterX + edgeCos18, leftCenterY + edgeSin18, false);
    case 'F':
      return pentagon(leftCenterX, leftCenterY + edgeLength, false);
    case 'L':
      return pentagon(leftCenterX - edgeCos18, leftCenterY + edgeSin18, false);
    case 'D':
      return pentagon(shift + GAP + radiusCos18 + edgeCos18, GAP + edgeLength + MINX_RADIUS, false);
    case 'DR':
      return pentagon(
        shift + GAP + radiusCos18 + edgeCos18 - edgeCos54,
        GAP + edgeLength + edgeSin54 + MINX_RADIUS,
        true,
      );
    case 'DBR':
      return pentagon(shift + GAP + radiusCos18, GAP + edgeLength - edgeSin18 + MINX_RADIUS, true);
    case 'B':
      return pentagon(shift + GAP + radiusCos18 + edgeCos18, GAP + MINX_RADIUS, true);
    case 'DBL':
      return pentagon(
        shift + GAP + radiusCos18 + 2 * edgeCos18,
        GAP + edgeLength - edgeSin18 + MINX_RADIUS,
        true,
      );
    case 'DL':
      return pentagon(
        shift + GAP + radiusCos18 + edgeCos18 + edgeCos54,
        GAP + edgeLength + edgeSin54 + MINX_RADIUS,
        true,
      );
  }
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
  if (firstPoint === undefined) return '';

  return [
    `M ${firstPoint.x} ${firstPoint.y}`,
    ...remainingPoints.map((pointValue) => `L ${pointValue.x} ${pointValue.y}`),
    'Z',
  ].join(' ');
};

const createStickerPolygons = (boundary: Polygon): readonly Polygon[] => {
  const edgePoints: Point[] = [];

  for (let index = 0; index < 5; index += 1) {
    const current = boundary[index];
    const next = boundary[(index + 1) % 5];

    edgePoints[index] = {
      x: 0.4 * next.x + 0.6 * current.x,
      y: 0.4 * next.y + 0.6 * current.y,
    };
    edgePoints[index + 5] = {
      x: 0.6 * next.x + 0.4 * current.x,
      y: 0.6 * next.y + 0.4 * current.y,
    };
  }

  const innerPentagon: Point[] = [];
  for (let index = 0; index < 5; index += 1) {
    innerPentagon[index] = lineIntersection(
      edgePoints[index],
      edgePoints[5 + ((3 + index) % 5)],
      edgePoints[(index + 1) % 5],
      edgePoints[5 + ((4 + index) % 5)],
    );
  }

  const stickers: Polygon[] = [];
  for (let index = 0; index < 5; index += 1) {
    stickers[2 * index] = [
      boundary[index],
      edgePoints[index],
      innerPentagon[index],
      edgePoints[5 + ((4 + index) % 5)],
    ];
    stickers[2 * index + 1] = [
      edgePoints[index],
      edgePoints[index + 5],
      innerPentagon[(index + 1) % 5],
      innerPentagon[index],
    ];
  }

  stickers[10] = innerPentagon;

  return stickers;
};

const stickerIndexForOrientation = (stickerIndex: number, rotateCounterClockwise: number): number =>
  stickerIndex < 10 ? (stickerIndex + 2 * rotateCounterClockwise) % 10 : stickerIndex;

const faceRotation = (face: MegaminxFace): number => {
  if (face === 'U') return 0;

  return MEGAMINX_FACES.indexOf(face) <= 5 ? 1 : 2;
};

const colorForSticker = (
  facelet: MegaminxFacelet,
  colors: Record<MegaminxFace, HexColor>,
): HexColor => colors[MEGAMINX_FACES[facelet] ?? 'U'];

const drawFace = (
  state: MegaminxState,
  face: MegaminxFace,
  colors: Record<MegaminxFace, HexColor>,
): SvgNode[] => {
  const faceIndexValue = MEGAMINX_FACES.indexOf(face);
  const stickers = state.image[faceIndexValue];
  const rotateCounterClockwise = faceRotation(face);
  const stickerPolygons = createStickerPolygons(faceBoundary(face));

  return stickerPolygons.map((polygon, stickerIndex) => {
    const stateStickerIndex = stickerIndexForOrientation(stickerIndex, rotateCounterClockwise);

    return path({
      d: polygonPath(polygon),
      fill: colorForSticker(stickers[stateStickerIndex], colors),
      stroke: STROKE,
    });
  });
};

const labelNode = (face: MegaminxFace): SvgNode | undefined => {
  if (face !== 'U' && face !== 'F') return undefined;

  const innerPentagon = createStickerPolygons(faceBoundary(face))[10];
  const center = innerPentagon.reduce(
    (sum, pointValue) => ({ x: sum.x + pointValue.x, y: sum.y + pointValue.y }),
    { x: 0, y: 0 },
  );
  const minY = Math.min(...innerPentagon.map((pointValue) => pointValue.y));
  const maxY = Math.max(...innerPentagon.map((pointValue) => pointValue.y));

  return text(
    {
      x: center.x / innerPentagon.length,
      y: center.y / innerPentagon.length,
      style: 'font-family: sans-serif',
      'text-anchor': 'middle',
      dy: `${Math.round(Math.abs(maxY - minY) * 0.2)}px`,
    },
    face,
  );
};

export const renderMegaminxState = (
  state: MegaminxState,
  colorScheme: MegaminxColorScheme = {},
): string => {
  const colors: Record<MegaminxFace, HexColor> = {
    ...DEFAULT_MEGAMINX_COLORS,
    ...colorScheme,
  };
  const nodes: SvgNode[] = [];

  for (const face of MEGAMINX_FACES) {
    nodes.push(...drawFace(state, face, colors));
    const label = labelNode(face);
    if (label !== undefined) nodes.push(label);
  }

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
