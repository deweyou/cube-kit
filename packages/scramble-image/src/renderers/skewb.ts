import type { SkewbFace, SkewbFacelet, SkewbState } from '@cubekit/scramble-puzzle';
import type { HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, type SvgNode } from '../svg/svg-elements.js';

const PIECE_SIZE = 30;
const GAP = 3;
const SQRT_THREE_OVER_TWO = Math.sqrt(3) / 2;
const WIDTH = Math.ceil((3 * GAP + 8 * PIECE_SIZE + 1) * SQRT_THREE_OVER_TWO);
const HEIGHT = Math.ceil(2 * GAP + 6 * PIECE_SIZE + 1);
const STROKE = '#000000';
const STROKE_WIDTH = `${1 / PIECE_SIZE}px`;
const SKEWB_RENDER_FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

export type SkewbColorScheme = Partial<Record<SkewbFace, HexColor>>;

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
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

type Polygon = readonly Point[];

const FACE_TRANSFORMS: readonly Transform[] = [
  {
    a: PIECE_SIZE * SQRT_THREE_OVER_TWO,
    b: -PIECE_SIZE / 2,
    c: PIECE_SIZE * SQRT_THREE_OVER_TWO,
    d: PIECE_SIZE / 2,
    e: (PIECE_SIZE * 4 + GAP * 1.5) * SQRT_THREE_OVER_TWO,
    f: PIECE_SIZE,
  },
  {
    a: PIECE_SIZE * SQRT_THREE_OVER_TWO,
    b: -PIECE_SIZE / 2,
    c: 0,
    d: PIECE_SIZE,
    e: (PIECE_SIZE * 7 + GAP * 3) * SQRT_THREE_OVER_TWO,
    f: PIECE_SIZE * 1.5,
  },
  {
    a: PIECE_SIZE * SQRT_THREE_OVER_TWO,
    b: -PIECE_SIZE / 2,
    c: 0,
    d: PIECE_SIZE,
    e: (PIECE_SIZE * 5 + GAP * 2) * SQRT_THREE_OVER_TWO,
    f: PIECE_SIZE * 2.5 + 0.5 * GAP,
  },
  {
    a: 0,
    b: PIECE_SIZE,
    c: -PIECE_SIZE * SQRT_THREE_OVER_TWO,
    d: -PIECE_SIZE / 2,
    e: (PIECE_SIZE * 3 + GAP) * SQRT_THREE_OVER_TWO,
    f: PIECE_SIZE * 4.5 + 1.5 * GAP,
  },
  {
    a: PIECE_SIZE * SQRT_THREE_OVER_TWO,
    b: PIECE_SIZE / 2,
    c: 0,
    d: PIECE_SIZE,
    e: (PIECE_SIZE * 3 + GAP) * SQRT_THREE_OVER_TWO,
    f: PIECE_SIZE * 2.5 + 0.5 * GAP,
  },
  {
    a: PIECE_SIZE * SQRT_THREE_OVER_TWO,
    b: PIECE_SIZE / 2,
    c: 0,
    d: PIECE_SIZE,
    e: PIECE_SIZE * SQRT_THREE_OVER_TWO,
    f: PIECE_SIZE * 1.5,
  },
];

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

const transformPoint = (pointValue: Point, transform: Transform): Point => ({
  x: transform.a * pointValue.x + transform.c * pointValue.y + transform.e,
  y: transform.b * pointValue.x + transform.d * pointValue.y + transform.f,
});

const polygonPath = (points: Polygon): string => {
  const [firstPoint, ...remainingPoints] = points;
  if (firstPoint === undefined) return '';

  return [
    `M ${firstPoint.x} ${firstPoint.y}`,
    ...remainingPoints.map((pointValue) => `L ${pointValue.x} ${pointValue.y}`),
    'Z',
  ].join(' ');
};

const colorForSticker = (facelet: SkewbFacelet, colors: Record<SkewbFace, HexColor>): HexColor =>
  colors[SKEWB_RENDER_FACES[facelet] ?? 'U'];

const drawFace = (
  state: SkewbState,
  face: SkewbFace,
  colors: Record<SkewbFace, HexColor>,
): SvgNode[] => {
  const faceIndex = SKEWB_RENDER_FACES.indexOf(face);
  const stickers = state.image[faceIndex];
  const transform = FACE_TRANSFORMS[faceIndex];

  return FACE_STICKERS.map((polygon, stickerIndex) =>
    path({
      d: polygonPath(polygon.map((pointValue) => transformPoint(pointValue, transform))),
      fill: colorForSticker(stickers[stickerIndex], colors),
      stroke: STROKE,
      'stroke-width': STROKE_WIDTH,
    }),
  );
};

export const renderSkewbState = (state: SkewbState, colorScheme: SkewbColorScheme = {}): string => {
  const colors: Record<SkewbFace, HexColor> = {
    ...DEFAULT_SKEWB_COLORS,
    ...colorScheme,
  };
  const nodes = SKEWB_RENDER_FACES.flatMap((face) => drawFace(state, face, colors));

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
