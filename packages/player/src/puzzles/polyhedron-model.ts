import type {
  PlayerCameraOrbit,
  PlayerRenderableModel,
  PlayerRenderablePiece,
  PlayerRenderableSticker,
  Vector3Like,
} from './puzzle-adapter.js';

export interface TaggedRenderableModel {
  readonly model: PlayerRenderableModel;
  readonly pieceIdsByGroup: ReadonlyMap<string, readonly string[]>;
}

export interface FaceletPieceOptions {
  readonly id: string;
  readonly face: string;
  readonly color: string;
  readonly groups: readonly string[];
  readonly polygon: readonly Vector3Like[];
  readonly stickerScale?: number;
}

const BORDER_COLOR = '#111827';
const COLORED_STICKER_OFFSET = 0.012;
export const DEFAULT_STICKER_SCALE = 0.84;
const SOLVED_ORIENTATION = { x: 0, y: 0, z: 0, w: 1 };
const ZERO_VECTOR = { x: 0, y: 0, z: 0 };

export const addVectors = (first: Vector3Like, second: Vector3Like): Vector3Like => ({
  x: first.x + second.x,
  y: first.y + second.y,
  z: first.z + second.z,
});

export const subtractVectors = (first: Vector3Like, second: Vector3Like): Vector3Like => ({
  x: first.x - second.x,
  y: first.y - second.y,
  z: first.z - second.z,
});

export const scaleVector = (vector: Vector3Like, scale: number): Vector3Like => ({
  x: vector.x * scale,
  y: vector.y * scale,
  z: vector.z * scale,
});

export const dotVectors = (first: Vector3Like, second: Vector3Like): number =>
  first.x * second.x + first.y * second.y + first.z * second.z;

export const crossVectors = (first: Vector3Like, second: Vector3Like): Vector3Like => ({
  x: first.y * second.z - first.z * second.y,
  y: first.z * second.x - first.x * second.z,
  z: first.x * second.y - first.y * second.x,
});

export const normalizeVector = (vector: Vector3Like): Vector3Like => {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length === 0) return ZERO_VECTOR;

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
};

export const centroidOf = (polygon: readonly Vector3Like[]): Vector3Like =>
  scaleVector(
    polygon.reduce<Vector3Like>((sum, vertex) => addVectors(sum, vertex), ZERO_VECTOR),
    1 / polygon.length,
  );

export const normalOf = (polygon: readonly Vector3Like[]): Vector3Like => {
  const [first, second, third] = polygon;

  if (first === undefined || second === undefined || third === undefined) return ZERO_VECTOR;

  return normalizeVector(crossVectors(subtractVectors(second, first), subtractVectors(third, first)));
};

const outwardNormalOf = (polygon: readonly Vector3Like[]): Vector3Like => {
  const normal = normalOf(polygon);
  const center = centroidOf(polygon);

  return dotVectors(normal, center) >= 0 ? normal : scaleVector(normal, -1);
};

export const scalePolygonFromCenter = (
  polygon: readonly Vector3Like[],
  scale: number,
): readonly Vector3Like[] => {
  const center = centroidOf(polygon);

  return polygon.map((vertex) =>
    addVectors(center, scaleVector(subtractVectors(vertex, center), scale)),
  );
};

export const offsetPolygon = (
  polygon: readonly Vector3Like[],
  normal: Vector3Like,
  distance: number,
): readonly Vector3Like[] => polygon.map((vertex) => addVectors(vertex, scaleVector(normal, distance)));

export const splitTriangleIntoFour = (
  polygon: readonly [Vector3Like, Vector3Like, Vector3Like],
): readonly (readonly Vector3Like[])[] => {
  return splitTriangleIntoGrid(polygon, 2);
};

export const splitTriangleIntoGrid = (
  polygon: readonly [Vector3Like, Vector3Like, Vector3Like],
  subdivisionCount: number,
): readonly (readonly [Vector3Like, Vector3Like, Vector3Like])[] => {
  const [a, b, c] = polygon;
  const points = new Map<string, Vector3Like>();
  const regions: [Vector3Like, Vector3Like, Vector3Like][] = [];

  const pointAt = (bWeight: number, cWeight: number): Vector3Like => {
    const key = `${bWeight}:${cWeight}`;
    const cachedPoint = points.get(key);

    if (cachedPoint !== undefined) return cachedPoint;

    const aWeight = subdivisionCount - bWeight - cWeight;
    const point = {
      x: (a.x * aWeight + b.x * bWeight + c.x * cWeight) / subdivisionCount,
      y: (a.y * aWeight + b.y * bWeight + c.y * cWeight) / subdivisionCount,
      z: (a.z * aWeight + b.z * bWeight + c.z * cWeight) / subdivisionCount,
    };

    points.set(key, point);

    return point;
  };

  for (let bIndex = 0; bIndex < subdivisionCount; bIndex += 1) {
    for (let cIndex = 0; cIndex < subdivisionCount - bIndex; cIndex += 1) {
      regions.push([
        pointAt(bIndex, cIndex),
        pointAt(bIndex + 1, cIndex),
        pointAt(bIndex, cIndex + 1),
      ]);

      if (bIndex + cIndex >= subdivisionCount - 1) continue;

      regions.push([
        pointAt(bIndex + 1, cIndex),
        pointAt(bIndex + 1, cIndex + 1),
        pointAt(bIndex, cIndex + 1),
      ]);
    }
  }

  return regions;
};

export const splitSquareIntoFive = (
  polygon: readonly [Vector3Like, Vector3Like, Vector3Like, Vector3Like],
): readonly (readonly Vector3Like[])[] => {
  const [a, b, c, d] = polygon;
  const ab = scaleVector(addVectors(a, b), 0.5);
  const bc = scaleVector(addVectors(b, c), 0.5);
  const cd = scaleVector(addVectors(c, d), 0.5);
  const da = scaleVector(addVectors(d, a), 0.5);

  return [
    [a, ab, da],
    [b, bc, ab],
    [c, cd, bc],
    [d, da, cd],
    [ab, bc, cd, da],
  ];
};

export const splitPentagonIntoEleven = (
  polygon: readonly [Vector3Like, Vector3Like, Vector3Like, Vector3Like, Vector3Like],
): readonly (readonly Vector3Like[])[] => {
  const center = centroidOf(polygon);
  const innerRing = polygon.map((vertex) =>
    addVectors(center, scaleVector(subtractVectors(vertex, center), 0.34)),
  );
  const middleRing = polygon.map((vertex) =>
    addVectors(center, scaleVector(subtractVectors(vertex, center), 0.68)),
  );
  const regions: (readonly Vector3Like[])[] = [innerRing];

  for (let index = 0; index < polygon.length; index += 1) {
    const nextIndex = (index + 1) % polygon.length;

    regions.push([innerRing[index], innerRing[nextIndex], middleRing[nextIndex], middleRing[index]]);
  }

  for (let index = 0; index < polygon.length; index += 1) {
    const nextIndex = (index + 1) % polygon.length;

    regions.push([middleRing[index], middleRing[nextIndex], polygon[nextIndex], polygon[index]]);
  }

  return regions;
};

export const regularPolygonOnPlane = ({
  center,
  normal,
  phase = 0,
  radius,
  sides,
}: {
  readonly center: Vector3Like;
  readonly normal: Vector3Like;
  readonly phase?: number;
  readonly radius: number;
  readonly sides: number;
}): readonly Vector3Like[] => {
  const normalizedNormal = normalizeVector(normal);
  const reference =
    Math.abs(normalizedNormal.y) > 0.85 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const xBasis = normalizeVector(crossVectors(reference, normalizedNormal));
  const yBasis = normalizeVector(crossVectors(normalizedNormal, xBasis));

  return Array.from({ length: sides }, (_value, index) => {
    const angle = phase + (index / sides) * Math.PI * 2;

    return addVectors(
      center,
      addVectors(scaleVector(xBasis, Math.cos(angle) * radius), scaleVector(yBasis, Math.sin(angle) * radius)),
    );
  });
};

export const createFaceletPiece = ({
  color,
  face,
  groups,
  id,
  polygon,
  stickerScale = DEFAULT_STICKER_SCALE,
}: FaceletPieceOptions): {
  readonly groups: readonly string[];
  readonly piece: PlayerRenderablePiece;
} => {
  const normal = outwardNormalOf(polygon);
  const coloredPolygon = offsetPolygon(
    scalePolygonFromCenter(polygon, stickerScale),
    normal,
    COLORED_STICKER_OFFSET,
  );
  const stickers: PlayerRenderableSticker[] = [
    {
      color: BORDER_COLOR,
      face: `${face}-border`,
      id: `${id}-border`,
      polygon,
    },
    {
      color,
      face,
      id: `${id}-sticker`,
      polygon: coloredPolygon,
    },
  ];

  return {
    groups,
    piece: {
      id,
      orientation: SOLVED_ORIENTATION,
      position: ZERO_VECTOR,
      stickers,
    },
  };
};

export const buildTaggedModel = (
  pieces: readonly {
    readonly groups: readonly string[];
    readonly piece: PlayerRenderablePiece;
  }[],
  cameraDistance: number,
  cameraOrbit?: PlayerCameraOrbit,
): TaggedRenderableModel => {
  const mutableGroups = new Map<string, string[]>();

  for (const piece of pieces) {
    for (const group of piece.groups) {
      const groupPieceIds = mutableGroups.get(group) ?? [];

      groupPieceIds.push(piece.piece.id);
      mutableGroups.set(group, groupPieceIds);
    }
  }

  return {
    model: {
      cameraDistance,
      ...(cameraOrbit === undefined ? {} : { cameraOrbit }),
      pieces: pieces.map((piece) => piece.piece),
    },
    pieceIdsByGroup: mutableGroups,
  };
};
