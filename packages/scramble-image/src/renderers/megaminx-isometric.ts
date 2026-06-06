import {
  MEGAMINX_FACES,
  type MegaminxFace,
  type MegaminxFacelet,
  type MegaminxState,
} from '@cubekit/scramble-puzzle';
import type { HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { path, type SvgNode } from '../svg/svg-elements.js';

const WIDTH = 410;
const HEIGHT = 190;
const PADDING = 8;
const VIEW_GAP = 24;
const FACE_RADIUS = 52;
const ADJACENT_DEPTH = 0.52;
const STROKE = '#000000';
const STROKE_WIDTH = 2.75;

export type MegaminxIsometricColorScheme = Partial<Record<MegaminxFace, HexColor>>;

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

interface FacePlacement {
  readonly face: MegaminxFace;
  readonly boundary: Polygon;
}

interface StickerPolygon {
  readonly points: Polygon;
  readonly fill: HexColor;
}

interface Segment {
  readonly start: Point;
  readonly end: Point;
}

interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

interface ViewSpec {
  readonly centerFace: MegaminxFace;
  readonly faceByEdge: readonly MegaminxFace[];
  readonly rotation: number;
}

interface StickerOrientation {
  readonly mirrored: boolean;
  readonly rotation: number;
}

const VIEW_SPECS: readonly ViewSpec[] = [
  {
    centerFace: 'F',
    faceByEdge: ['DL', 'L', 'U', 'R', 'DR'],
    rotation: Math.PI / 2,
  },
  {
    centerFace: 'B',
    faceByEdge: ['BL', 'DBL', 'D', 'DBR', 'BR'],
    rotation: -Math.PI / 2,
  },
];

const STICKER_ORIENTATIONS: Record<MegaminxFace, StickerOrientation> = {
  U: { mirrored: true, rotation: 1 },
  BL: { mirrored: true, rotation: 2 },
  BR: { mirrored: true, rotation: 1 },
  R: { mirrored: true, rotation: 3 },
  F: { mirrored: false, rotation: 4 },
  L: { mirrored: true, rotation: 0 },
  D: { mirrored: true, rotation: 0 },
  DR: { mirrored: true, rotation: 0 },
  DBR: { mirrored: true, rotation: 2 },
  B: { mirrored: false, rotation: 3 },
  DBL: { mirrored: true, rotation: 4 },
  DL: { mirrored: true, rotation: 1 },
};

const formatCoordinate = (value: number): number => Number(value.toFixed(3));

const wrapPentagonIndex = (index: number): number => (index + 5) % 5;

const wrapStickerIndex = (index: number): number => (index + 10) % 10;

const averagePoint = (first: Point, second: Point): Point => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const pentagon = (rotation: number): Polygon =>
  [0, 1, 2, 3, 4].map((index) => {
    const angle = rotation + (2 * Math.PI * index) / 5;

    return {
      x: FACE_RADIUS * Math.cos(angle),
      y: FACE_RADIUS * Math.sin(angle),
    };
  });

const projectPointToLine = (pointValue: Point, lineStart: Point, lineEnd: Point): Point => {
  const deltaX = lineEnd.x - lineStart.x;
  const deltaY = lineEnd.y - lineStart.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const ratio =
    ((pointValue.x - lineStart.x) * deltaX + (pointValue.y - lineStart.y) * deltaY) / lengthSquared;

  return {
    x: lineStart.x + ratio * deltaX,
    y: lineStart.y + ratio * deltaY,
  };
};

const reflectPointAcrossLine = (pointValue: Point, lineStart: Point, lineEnd: Point): Point => {
  const projected = projectPointToLine(pointValue, lineStart, lineEnd);

  return {
    x: 2 * projected.x - pointValue.x,
    y: 2 * projected.y - pointValue.y,
  };
};

const compressPointAwayFromLine = (
  pointValue: Point,
  lineStart: Point,
  lineEnd: Point,
  scale: number,
): Point => {
  const projected = projectPointToLine(pointValue, lineStart, lineEnd);

  return {
    x: projected.x + (pointValue.x - projected.x) * scale,
    y: projected.y + (pointValue.y - projected.y) * scale,
  };
};

const adjacentBoundary = (centerBoundary: Polygon, edgeIndex: number): Polygon => {
  const lineStart = centerBoundary[edgeIndex];
  const lineEnd = centerBoundary[(edgeIndex + 1) % centerBoundary.length];

  return centerBoundary.map((pointValue) =>
    compressPointAwayFromLine(
      reflectPointAcrossLine(pointValue, lineStart, lineEnd),
      lineStart,
      lineEnd,
      ADJACENT_DEPTH,
    ),
  );
};

const stitchAdjacentBoundaries = (boundaries: readonly Polygon[]): readonly Polygon[] => {
  const sharedOuterPoints = boundaries.map((boundary, vertexIndex) => {
    const currentFacePoint = boundary[wrapPentagonIndex(vertexIndex + 4)];
    const previousBoundary = boundaries[wrapPentagonIndex(vertexIndex - 1)];
    const previousFacePoint = previousBoundary[wrapPentagonIndex(vertexIndex + 1)];

    return averagePoint(currentFacePoint, previousFacePoint);
  });

  return boundaries.map((boundary, edgeIndex) =>
    boundary.map((pointValue, pointIndex) => {
      if (pointIndex === wrapPentagonIndex(edgeIndex + 4)) return sharedOuterPoints[edgeIndex];
      if (pointIndex === wrapPentagonIndex(edgeIndex + 2)) {
        return sharedOuterPoints[wrapPentagonIndex(edgeIndex + 1)];
      }

      return pointValue;
    }),
  );
};

const createViewPlacements = (spec: ViewSpec): readonly FacePlacement[] => {
  const centerBoundary = pentagon(spec.rotation);
  const adjacentBoundaries = stitchAdjacentBoundaries(
    spec.faceByEdge.map((_, edgeIndex) => adjacentBoundary(centerBoundary, edgeIndex)),
  );
  const adjacentPlacements = spec.faceByEdge.map((face, edgeIndex) => ({
    face,
    boundary: adjacentBoundaries[edgeIndex],
  }));

  return [
    {
      face: spec.centerFace,
      boundary: centerBoundary,
    },
    ...adjacentPlacements,
  ];
};

const translatePoint = (pointValue: Point, offsetX: number, offsetY: number): Point => ({
  x: pointValue.x + offsetX,
  y: pointValue.y + offsetY,
});

const translatePolygon = (points: Polygon, offsetX: number, offsetY: number): Polygon =>
  points.map((pointValue) => translatePoint(pointValue, offsetX, offsetY));

const translatePlacements = (
  placements: readonly FacePlacement[],
  offsetX: number,
  offsetY: number,
): readonly FacePlacement[] =>
  placements.map(({ face, boundary }) => ({
    face,
    boundary: translatePolygon(boundary, offsetX, offsetY),
  }));

const boundsForPolygons = (polygons: readonly Polygon[]): Bounds => {
  const points = polygons.flat();
  const xs = points.map((pointValue) => pointValue.x);
  const ys = points.map((pointValue) => pointValue.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const boundsForPlacements = (placements: readonly FacePlacement[]): Bounds =>
  boundsForPolygons(placements.map((placement) => placement.boundary));

const layoutPlacements = (): readonly FacePlacement[] => {
  const views = VIEW_SPECS.map(createViewPlacements);
  const [leftView, rightView] = views;
  const leftBounds = boundsForPlacements(leftView);
  const rightBounds = boundsForPlacements(rightView);
  const leftWidth = leftBounds.maxX - leftBounds.minX;
  const rightWidth = rightBounds.maxX - rightBounds.minX;
  const contentWidth = leftWidth + VIEW_GAP + rightWidth;
  const startX = (WIDTH - contentWidth) / 2;
  const viewHeight = HEIGHT - 2 * PADDING;
  const leftHeight = leftBounds.maxY - leftBounds.minY;
  const rightHeight = rightBounds.maxY - rightBounds.minY;
  const leftOffsetY = PADDING + (viewHeight - leftHeight) / 2 - leftBounds.minY;
  const rightOffsetY = PADDING + (viewHeight - rightHeight) / 2 - rightBounds.minY;

  return [
    ...translatePlacements(leftView, startX - leftBounds.minX, leftOffsetY),
    ...translatePlacements(
      rightView,
      startX + leftWidth + VIEW_GAP - rightBounds.minX,
      rightOffsetY,
    ),
  ];
};

const FACE_PLACEMENTS = layoutPlacements();

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

const stickerIndexForOrientation = (
  stickerIndex: number,
  orientation: StickerOrientation,
): number => {
  if (stickerIndex >= 10) return stickerIndex;

  const offset = 2 * orientation.rotation;
  if (orientation.mirrored) return wrapStickerIndex(offset - stickerIndex);

  return wrapStickerIndex(stickerIndex + offset);
};

const colorForSticker = (
  facelet: MegaminxFacelet,
  colors: Record<MegaminxFace, HexColor>,
): HexColor => colors[MEGAMINX_FACES[facelet] ?? 'U'];

const createFaceStickers = (
  state: MegaminxState,
  placement: FacePlacement,
  colors: Record<MegaminxFace, HexColor>,
): readonly StickerPolygon[] => {
  const faceIndexValue = MEGAMINX_FACES.indexOf(placement.face);
  const stickers = state.image[faceIndexValue];
  const orientation = STICKER_ORIENTATIONS[placement.face];
  const stickerPolygons = createStickerPolygons(placement.boundary);

  return stickerPolygons.map((polygon, stickerIndex) => {
    const stateStickerIndex = stickerIndexForOrientation(stickerIndex, orientation);

    return {
      points: polygon,
      fill: colorForSticker(stickers[stateStickerIndex], colors),
    };
  });
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

const drawFaces = (state: MegaminxState, colors: Record<MegaminxFace, HexColor>): SvgNode[] => {
  const stickers = FACE_PLACEMENTS.flatMap((placement) =>
    createFaceStickers(state, placement, colors),
  );

  return [...drawStickers(stickers), drawLinework(stickers)];
};

export const renderMegaminxIsometricState = (
  state: MegaminxState,
  colorScheme: MegaminxIsometricColorScheme = {},
): string => {
  const colors: Record<MegaminxFace, HexColor> = {
    ...DEFAULT_MEGAMINX_COLORS,
    ...colorScheme,
  };
  const nodes = drawFaces(state, colors);

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
