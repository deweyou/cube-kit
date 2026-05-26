import type { SquareOneState } from '@cubekit/scramble-puzzle';
import type { HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, rect, type SvgNode } from '../svg/svg-elements.js';

const RADIUS = 32;
const RADIUS_MULTIPLIER = Math.sqrt(2) * Math.cos((15 * Math.PI) / 180);
const MULTIPLIER = 1.4;
const WIDTH = Math.trunc(2 * RADIUS_MULTIPLIER * MULTIPLIER * RADIUS);
const HEIGHT = Math.trunc(4 * RADIUS_MULTIPLIER * MULTIPLIER * RADIUS);
const STROKE = '#000000';
const STROKE_ATTRS = {
  stroke: STROKE,
  'stroke-width': '2px',
  'stroke-miterlimit': 10,
  'stroke-linejoin': 'round',
} as const;
const SQUARE_ONE_FACES = ['L', 'B', 'R', 'F', 'U', 'D'] as const;

export type SquareOneFace = (typeof SQUARE_ONE_FACES)[number];
export type SquareOneColorScheme = Partial<Record<SquareOneFace, HexColor>>;

const DEFAULT_SQUARE_ONE_COLORS: Record<SquareOneFace, HexColor> = {
  L: '#0000ff',
  B: '#ff8000',
  R: '#00ff00',
  F: '#ff0000',
  U: '#ffff00',
  D: '#ffffff',
};

interface Point {
  readonly x: number;
  readonly y: number;
}

type Polygon = readonly Point[];

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const polygonPath = (points: Polygon): string => {
  const [firstPoint, ...remainingPoints] = points;
  if (firstPoint === undefined) return '';

  return [
    `M ${firstPoint.x} ${firstPoint.y}`,
    ...remainingPoints.map((pointValue) => `L ${pointValue.x} ${pointValue.y}`),
    'Z',
  ].join(' ');
};

const translatePolygon = (points: Polygon, translateX: number, translateY: number): Polygon =>
  points.map((pointValue) => ({
    x: pointValue.x + translateX,
    y: pointValue.y + translateY,
  }));

const wedgePolygons = (
  centerX: number,
  centerY: number,
  radius: number,
): readonly [Polygon, Polygon] => {
  const tipX = (Math.sqrt(3) * radius) / 2;
  const tipY = radius / 2;

  return [
    translatePolygon(
      [
        { x: 0, y: 0 },
        { x: radius, y: 0 },
        { x: tipX, y: tipY },
      ],
      centerX,
      centerY,
    ),
    translatePolygon(
      [
        { x: radius, y: 0 },
        { x: MULTIPLIER * radius, y: 0 },
        { x: MULTIPLIER * tipX, y: MULTIPLIER * tipY },
        { x: tipX, y: tipY },
      ],
      centerX,
      centerY,
    ),
  ];
};

const cornerPolygons = (
  centerX: number,
  centerY: number,
  radius: number,
): readonly [Polygon, Polygon, Polygon] => {
  const outerX = radius * (1 + Math.cos(degreesToRadians(75)) / Math.sqrt(2));
  const outerY = (radius * Math.sin(degreesToRadians(75))) / Math.sqrt(2);
  const innerX = radius / 2;
  const innerY = (Math.sqrt(3) * radius) / 2;

  return [
    translatePolygon(
      [
        { x: 0, y: 0 },
        { x: radius, y: 0 },
        { x: outerX, y: outerY },
        { x: innerX, y: innerY },
      ],
      centerX,
      centerY,
    ),
    translatePolygon(
      [
        { x: radius, y: 0 },
        { x: MULTIPLIER * radius, y: 0 },
        { x: MULTIPLIER * outerX, y: MULTIPLIER * outerY },
        { x: outerX, y: outerY },
      ],
      centerX,
      centerY,
    ),
    translatePolygon(
      [
        { x: MULTIPLIER * outerX, y: MULTIPLIER * outerY },
        { x: outerX, y: outerY },
        { x: innerX, y: innerY },
        { x: MULTIPLIER * innerX, y: MULTIPLIER * innerY },
      ],
      centerX,
      centerY,
    ),
  ];
};

const isCornerPiece = (piece: number): boolean => (piece + (piece <= 7 ? 0 : 1)) % 2 === 0;

const getSideColor = (sideIndex: number, colors: Record<SquareOneFace, HexColor>): HexColor =>
  colors[SQUARE_ONE_FACES[sideIndex] ?? 'L'];

const getPieceColors = (
  pieceValue: number,
  colors: Record<SquareOneFace, HexColor>,
): readonly HexColor[] => {
  const isTopPiece = pieceValue <= 7;
  const topColor = isTopPiece ? colors.U : colors.D;
  let piece = pieceValue;

  if (isCornerPiece(piece)) {
    if (!isTopPiece) piece = 15 - piece;

    let firstSideColor = getSideColor((Math.trunc(piece / 2) + 3) % 4, colors);
    let secondSideColor = getSideColor(Math.trunc(piece / 2), colors);

    if (!isTopPiece) {
      const previousFirstSideColor = firstSideColor;

      firstSideColor = secondSideColor;
      secondSideColor = previousFirstSideColor;
    }

    return [topColor, firstSideColor, secondSideColor];
  }

  if (!isTopPiece) piece = 14 - piece;

  return [topColor, getSideColor(Math.trunc(piece / 2), colors)];
};

const drawPiece = (
  piece: number,
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
  colors: Record<SquareOneFace, HexColor>,
): { readonly nodes: readonly SvgNode[]; readonly degrees: number } => {
  const corner = isCornerPiece(piece);
  const pieceColors = getPieceColors(piece, colors);
  const polygons = corner
    ? cornerPolygons(centerX, centerY, radius)
    : wedgePolygons(centerX, centerY, radius);
  const nodes: SvgNode[] = [];

  for (let colorIndex = pieceColors.length - 1; colorIndex >= 0; colorIndex -= 1) {
    nodes.push(
      path({
        d: polygonPath(polygons[colorIndex]),
        fill: pieceColors[colorIndex],
        transform: `rotate(${angleDegrees} ${centerX} ${centerY})`,
        ...STROKE_ATTRS,
      }),
    );
  }

  return {
    nodes,
    degrees: 30 * (corner ? 2 : 1),
  };
};

const drawFace = (
  pieces: readonly number[],
  centerX: number,
  centerY: number,
  initialAngleDegrees: number,
  colors: Record<SquareOneFace, HexColor>,
): SvgNode[] => {
  const nodes: SvgNode[] = [];
  const hasWrappedCorner =
    pieces[0] !== undefined && pieces[11] === pieces[0] && isCornerPiece(pieces[0]);
  let angleDegrees = initialAngleDegrees + (hasWrappedCorner ? 30 : 0);
  const firstPieceIndex = hasWrappedCorner ? 1 : 0;

  for (let pieceIndex = firstPieceIndex; pieceIndex < 12; pieceIndex += 1) {
    if (pieceIndex < 11 && pieces[pieceIndex] === pieces[pieceIndex + 1]) {
      pieceIndex += 1;
    }

    const piece = pieces[pieceIndex];
    if (piece === undefined) continue;

    const drawnPiece = drawPiece(piece, centerX, centerY, RADIUS, angleDegrees, colors);

    nodes.push(...drawnPiece.nodes);
    angleDegrees += drawnPiece.degrees;
  }

  return nodes;
};

const drawMiddleSlice = (
  sliceSolved: boolean,
  colors: Record<SquareOneFace, HexColor>,
): SvgNode[] => {
  const halfSquareWidth = (RADIUS * RADIUS_MULTIPLIER * MULTIPLIER) / Math.sqrt(2);
  const edgeWidth = 2 * RADIUS * MULTIPLIER * Math.sin(degreesToRadians(15));
  const cornerWidth = halfSquareWidth - edgeWidth / 2;
  const sliceX = WIDTH / 2 - halfSquareWidth;
  const sliceY = HEIGHT / 2 - (RADIUS * (MULTIPLIER - 1)) / 2;
  const sliceHeight = RADIUS * (MULTIPLIER - 1);
  const rightSliceWidth = sliceSolved ? 2 * cornerWidth + edgeWidth : cornerWidth + edgeWidth;

  return [
    rect({
      x: sliceX,
      y: sliceY,
      width: rightSliceWidth,
      height: sliceHeight,
      fill: sliceSolved ? colors.F : colors.B,
    }),
    rect({
      x: sliceX,
      y: sliceY,
      width: cornerWidth,
      height: sliceHeight,
      fill: colors.F,
    }),
    rect({
      x: sliceX,
      y: sliceY,
      width: rightSliceWidth,
      height: sliceHeight,
      fill: 'none',
      ...STROKE_ATTRS,
    }),
    rect({
      x: sliceX,
      y: sliceY,
      width: cornerWidth,
      height: sliceHeight,
      fill: 'none',
      ...STROKE_ATTRS,
    }),
  ];
};

export const renderSquareOneState = (
  state: SquareOneState,
  colorScheme: SquareOneColorScheme = {},
): string => {
  const colors: Record<SquareOneFace, HexColor> = {
    ...DEFAULT_SQUARE_ONE_COLORS,
    ...colorScheme,
  };
  const centerX = WIDTH / 2;
  const topCenterY = HEIGHT / 4;
  const bottomCenterY = (HEIGHT / 4) * 3;
  const nodes = [
    ...drawMiddleSlice(state.sliceSolved, colors),
    ...drawFace(state.pieces, centerX, topCenterY, 90 + 15, colors),
    ...drawFace(state.pieces.slice(12), centerX, bottomCenterY, -90 - 15, colors),
  ];

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
