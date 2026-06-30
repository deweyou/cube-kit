import { FTO_FACES, type FtoFace, type FtoFacelet, type FtoState } from '@cubegin/scramble-puzzle';
import type { HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, type SvgNode } from '../svg/svg-elements.js';

const SOURCE_WIDTH = 480;
const SOURCE_HEIGHT = 240;
const RENDER_SCALE = 2 / 3;
const WIDTH = Math.round(SOURCE_WIDTH * RENDER_SCALE);
const HEIGHT = Math.round(SOURCE_HEIGHT * RENDER_SCALE);
const STROKE = '#000000';
const STROKE_WIDTH = 1.1;

export type FtoColorScheme = Partial<Record<FtoFace, HexColor>>;

const DEFAULT_FTO_COLORS: Record<FtoFace, HexColor> = {
  U: '#ffffff',
  F: '#00dd00',
  BR: '#bbbbbb',
  BL: '#ffaa00',
  D: '#ffff00',
  B: '#0000ff',
  R: '#ff0000',
  L: '#880088',
};

interface Point {
  readonly x: number;
  readonly y: number;
}

type Polygon = readonly Point[];

const FTO_FACE_POLYGONS: Record<FtoFace, readonly Polygon[]> = {
  U: [
    [
      { x: 82.79, y: 77.21 },
      { x: 120, y: 114.42 },
      { x: 157.21, y: 77.21 },
    ],
    [
      { x: 45.58, y: 40 },
      { x: 82.79, y: 77.21 },
      { x: 120, y: 40 },
    ],
    [
      { x: 8.37, y: 2.79 },
      { x: 45.58, y: 40 },
      { x: 82.79, y: 2.79 },
    ],
    [
      { x: 157.21, y: 77.21 },
      { x: 194.42, y: 40 },
      { x: 120, y: 40 },
    ],
    [
      { x: 120, y: 40 },
      { x: 157.21, y: 2.79 },
      { x: 82.79, y: 2.79 },
    ],
    [
      { x: 194.42, y: 40 },
      { x: 231.63, y: 2.79 },
      { x: 157.21, y: 2.79 },
    ],
    [
      { x: 157.21, y: 77.21 },
      { x: 120, y: 40 },
      { x: 82.79, y: 77.21 },
    ],
    [
      { x: 120, y: 40 },
      { x: 82.79, y: 2.79 },
      { x: 45.58, y: 40 },
    ],
    [
      { x: 194.42, y: 40 },
      { x: 157.21, y: 2.79 },
      { x: 120, y: 40 },
    ],
  ],
  F: [
    [
      { x: 157.21, y: 162.79 },
      { x: 120, y: 125.58 },
      { x: 82.79, y: 162.79 },
    ],
    [
      { x: 157.21, y: 162.79 },
      { x: 82.79, y: 162.79 },
      { x: 120, y: 200 },
    ],
    [
      { x: 194.42, y: 200 },
      { x: 120, y: 200 },
      { x: 157.21, y: 237.21 },
    ],
    [
      { x: 82.79, y: 162.79 },
      { x: 45.58, y: 200 },
      { x: 120, y: 200 },
    ],
    [
      { x: 120, y: 200 },
      { x: 45.58, y: 200 },
      { x: 82.79, y: 237.21 },
    ],
    [
      { x: 45.58, y: 200 },
      { x: 8.37, y: 237.21 },
      { x: 82.79, y: 237.21 },
    ],
    [
      { x: 194.42, y: 200 },
      { x: 157.21, y: 162.79 },
      { x: 120, y: 200 },
    ],
    [
      { x: 82.79, y: 237.21 },
      { x: 157.21, y: 237.21 },
      { x: 120, y: 200 },
    ],
    [
      { x: 231.63, y: 237.21 },
      { x: 194.42, y: 200 },
      { x: 157.21, y: 237.21 },
    ],
  ],
  BR: [
    [
      { x: 242.79, y: 8.37 },
      { x: 242.79, y: 82.79 },
      { x: 280, y: 45.58 },
    ],
    [
      { x: 242.79, y: 82.79 },
      { x: 242.79, y: 157.21 },
      { x: 280, y: 120 },
    ],
    [
      { x: 242.79, y: 157.21 },
      { x: 242.79, y: 231.63 },
      { x: 280, y: 194.42 },
    ],
    [
      { x: 280, y: 120 },
      { x: 317.21, y: 82.79 },
      { x: 280, y: 45.58 },
    ],
    [
      { x: 280, y: 194.42 },
      { x: 317.21, y: 157.21 },
      { x: 280, y: 120 },
    ],
    [
      { x: 317.21, y: 157.21 },
      { x: 354.42, y: 120 },
      { x: 317.21, y: 82.79 },
    ],
    [
      { x: 280, y: 194.42 },
      { x: 280, y: 120 },
      { x: 242.79, y: 157.21 },
    ],
    [
      { x: 280, y: 120 },
      { x: 280, y: 45.58 },
      { x: 242.79, y: 82.79 },
    ],
    [
      { x: 317.21, y: 157.21 },
      { x: 317.21, y: 82.79 },
      { x: 280, y: 120 },
    ],
  ],
  BL: [
    [
      { x: 477.21, y: 82.79 },
      { x: 477.21, y: 8.37 },
      { x: 440, y: 45.58 },
    ],
    [
      { x: 477.21, y: 157.21 },
      { x: 477.21, y: 82.79 },
      { x: 440, y: 120 },
    ],
    [
      { x: 440, y: 194.42 },
      { x: 477.21, y: 231.63 },
      { x: 477.21, y: 157.21 },
    ],
    [
      { x: 440, y: 45.58 },
      { x: 402.79, y: 82.79 },
      { x: 440, y: 120 },
    ],
    [
      { x: 402.79, y: 157.21 },
      { x: 440, y: 194.42 },
      { x: 440, y: 120 },
    ],
    [
      { x: 365.58, y: 120 },
      { x: 402.79, y: 157.21 },
      { x: 402.79, y: 82.79 },
    ],
    [
      { x: 477.21, y: 157.21 },
      { x: 440, y: 120 },
      { x: 440, y: 194.42 },
    ],
    [
      { x: 477.21, y: 82.79 },
      { x: 440, y: 45.58 },
      { x: 440, y: 120 },
    ],
    [
      { x: 440, y: 120 },
      { x: 402.79, y: 82.79 },
      { x: 402.79, y: 157.21 },
    ],
  ],
  D: [
    [
      { x: 248.37, y: 237.21 },
      { x: 322.79, y: 237.21 },
      { x: 285.58, y: 200 },
    ],
    [
      { x: 322.79, y: 237.21 },
      { x: 397.21, y: 237.21 },
      { x: 360, y: 200 },
    ],
    [
      { x: 397.21, y: 237.21 },
      { x: 471.63, y: 237.21 },
      { x: 434.42, y: 200 },
    ],
    [
      { x: 360, y: 200 },
      { x: 397.21, y: 237.21 },
      { x: 434.42, y: 200 },
    ],
    [
      { x: 285.58, y: 200 },
      { x: 322.79, y: 237.21 },
      { x: 360, y: 200 },
    ],
    [
      { x: 322.79, y: 162.79 },
      { x: 360, y: 200 },
      { x: 397.21, y: 162.79 },
    ],
    [
      { x: 434.42, y: 200 },
      { x: 397.21, y: 162.79 },
      { x: 360, y: 200 },
    ],
    [
      { x: 360, y: 200 },
      { x: 322.79, y: 162.79 },
      { x: 285.58, y: 200 },
    ],
    [
      { x: 397.21, y: 162.79 },
      { x: 360, y: 125.58 },
      { x: 322.79, y: 162.79 },
    ],
  ],
  B: [
    [
      { x: 322.79, y: 2.79 },
      { x: 248.37, y: 2.79 },
      { x: 285.58, y: 40 },
    ],
    [
      { x: 285.58, y: 40 },
      { x: 322.79, y: 77.21 },
      { x: 360, y: 40 },
    ],
    [
      { x: 322.79, y: 77.21 },
      { x: 360, y: 114.42 },
      { x: 397.21, y: 77.21 },
    ],
    [
      { x: 397.21, y: 2.79 },
      { x: 322.79, y: 2.79 },
      { x: 360, y: 40 },
    ],
    [
      { x: 397.21, y: 77.21 },
      { x: 434.42, y: 40 },
      { x: 360, y: 40 },
    ],
    [
      { x: 471.63, y: 2.79 },
      { x: 397.21, y: 2.79 },
      { x: 434.42, y: 40 },
    ],
    [
      { x: 397.21, y: 2.79 },
      { x: 360, y: 40 },
      { x: 434.42, y: 40 },
    ],
    [
      { x: 322.79, y: 2.79 },
      { x: 285.58, y: 40 },
      { x: 360, y: 40 },
    ],
    [
      { x: 322.79, y: 77.21 },
      { x: 397.21, y: 77.21 },
      { x: 360, y: 40 },
    ],
  ],
  R: [
    [
      { x: 162.79, y: 82.79 },
      { x: 125.58, y: 120 },
      { x: 162.79, y: 157.21 },
    ],
    [
      { x: 162.79, y: 157.21 },
      { x: 200, y: 194.42 },
      { x: 200, y: 120 },
    ],
    [
      { x: 200, y: 194.42 },
      { x: 237.21, y: 231.63 },
      { x: 237.21, y: 157.21 },
    ],
    [
      { x: 162.79, y: 82.79 },
      { x: 162.79, y: 157.21 },
      { x: 200, y: 120 },
    ],
    [
      { x: 200, y: 194.42 },
      { x: 237.21, y: 157.21 },
      { x: 200, y: 120 },
    ],
    [
      { x: 200, y: 45.58 },
      { x: 200, y: 120 },
      { x: 237.21, y: 82.79 },
    ],
    [
      { x: 200, y: 45.58 },
      { x: 162.79, y: 82.79 },
      { x: 200, y: 120 },
    ],
    [
      { x: 237.21, y: 157.21 },
      { x: 237.21, y: 82.79 },
      { x: 200, y: 120 },
    ],
    [
      { x: 237.21, y: 8.37 },
      { x: 200, y: 45.58 },
      { x: 237.21, y: 82.79 },
    ],
  ],
  L: [
    [
      { x: 77.21, y: 157.21 },
      { x: 114.42, y: 120 },
      { x: 77.21, y: 82.79 },
    ],
    [
      { x: 40, y: 194.42 },
      { x: 77.21, y: 157.21 },
      { x: 40, y: 120 },
    ],
    [
      { x: 2.79, y: 231.63 },
      { x: 40, y: 194.42 },
      { x: 2.79, y: 157.21 },
    ],
    [
      { x: 40, y: 120 },
      { x: 77.21, y: 157.21 },
      { x: 77.21, y: 82.79 },
    ],
    [
      { x: 2.79, y: 157.21 },
      { x: 40, y: 194.42 },
      { x: 40, y: 120 },
    ],
    [
      { x: 2.79, y: 82.79 },
      { x: 40, y: 120 },
      { x: 40, y: 45.58 },
    ],
    [
      { x: 77.21, y: 82.79 },
      { x: 40, y: 45.58 },
      { x: 40, y: 120 },
    ],
    [
      { x: 40, y: 120 },
      { x: 2.79, y: 82.79 },
      { x: 2.79, y: 157.21 },
    ],
    [
      { x: 40, y: 45.58 },
      { x: 2.79, y: 8.37 },
      { x: 2.79, y: 82.79 },
    ],
  ],
};

// Facelet order follows the ftocta text net: U/F/BR/BL/D/B/R/L, each 0..8.
const FTO_FACELET_POLYGON_INDEX: Record<FtoFace, readonly number[]> = {
  U: [0, 3, 6, 1, 5, 8, 4, 7, 2],
  F: [0, 3, 1, 6, 5, 4, 7, 2, 8],
  BR: [5, 3, 8, 4, 0, 7, 1, 6, 2],
  BL: [5, 4, 8, 3, 2, 6, 1, 7, 0],
  D: [0, 3, 1, 6, 5, 4, 7, 2, 8],
  B: [0, 3, 6, 1, 5, 8, 4, 7, 2],
  R: [0, 1, 3, 6, 2, 4, 7, 5, 8],
  L: [0, 6, 3, 1, 8, 5, 7, 4, 2],
};

const polygonPath = (points: Polygon): string => {
  const [firstPoint, ...remainingPoints] = points.map(scalePoint);
  if (firstPoint === undefined) return '';

  return [
    `M ${firstPoint.x} ${firstPoint.y}`,
    ...remainingPoints.map((pointValue) => `L ${pointValue.x} ${pointValue.y}`),
    'Z',
  ].join(' ');
};

const scalePoint = (pointValue: Point): Point => ({
  x: roundCoordinate(pointValue.x * RENDER_SCALE),
  y: roundCoordinate(pointValue.y * RENDER_SCALE),
});

const roundCoordinate = (value: number): number => Number(value.toFixed(2));

const colorForSticker = (facelet: FtoFacelet, colors: Record<FtoFace, HexColor>): HexColor =>
  colors[FTO_FACES[facelet] ?? 'U'];

const drawFace = (state: FtoState, face: FtoFace, colors: Record<FtoFace, HexColor>): SvgNode[] => {
  const faceIndex = FTO_FACES.indexOf(face);
  const stickers = state.image[faceIndex];
  const localPolygonIndexes = FTO_FACELET_POLYGON_INDEX[face];
  const facePolygons = FTO_FACE_POLYGONS[face];
  return stickers.map((facelet, stickerIndex) =>
    path({
      d: polygonPath(facePolygons[localPolygonIndexes[stickerIndex]] ?? []),
      fill: colorForSticker(facelet, colors),
      stroke: STROKE,
      'stroke-width': STROKE_WIDTH,
      'stroke-linejoin': 'round',
    }),
  );
};

export const renderFtoState = (state: FtoState, colorScheme: FtoColorScheme = {}): string => {
  const colors: Record<FtoFace, HexColor> = {
    ...DEFAULT_FTO_COLORS,
    ...colorScheme,
  };
  const nodes = FTO_FACES.flatMap((face) => drawFace(state, face, colors));

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
