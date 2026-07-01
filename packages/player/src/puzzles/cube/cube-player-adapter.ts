import {
  createCubeDefinition,
  type CubeFace,
  type CubeMove,
  type EventId,
} from '@cubegin/scramble-puzzle';
import {
  applySourceByTarget,
  createFaceletTrackingState,
  createIdentitySourceByTarget,
  type FaceletTrackingState,
  type SourceByTarget,
} from '../facelet-tracking.js';
import type {
  PlayerMoveAnimation,
  PlayerPuzzleAdapter,
  PlayerRenderableModel,
  PlayerRenderablePiece,
  PlayerRenderableSticker,
  Vector3Like,
} from '../puzzle-adapter.js';
import { mapCubeMoveToAnimation, type PlayerAxis } from './cube-move-map.js';

const BODY_COLOR = '#111827';
const CUBIE_SIZE = 1;
const STICKER_HALF_SIZE = 0.42;
const STICKER_OFFSET = 0.505;
const SOLVED_ORIENTATION = { x: 0, y: 0, z: 0, w: 1 };
const ZERO_VECTOR = { x: 0, y: 0, z: 0 };

const FACE_COLORS = {
  U: '#ffffff',
  R: '#ff0000',
  F: '#00ff00',
  D: '#ffff00',
  L: '#ff8000',
  B: '#0000ff',
} satisfies Record<CubeFace, string>;

const axisVector = (axis: PlayerAxis): Vector3Like => {
  if (axis === 'x') return { x: 1, y: 0, z: 0 };
  if (axis === 'y') return { x: 0, y: 1, z: 0 };

  return { x: 0, y: 0, z: 1 };
};

const cubePieceId = (x: number, y: number, z: number): string => `cube-${x}-${y}-${z}`;

const cubeCoordinateKey = (x: number, y: number, z: number): string => `${x}:${y}:${z}`;

const centeredCoordinate = (layer: number, size: number): number => layer - (size - 1) / 2;

const isVisibleCubie = (x: number, y: number, z: number, size: number): boolean =>
  x === 0 || x === size - 1 || y === 0 || y === size - 1 || z === 0 || z === size - 1;

const polygonForFace = (face: CubeFace): readonly Vector3Like[] => {
  const a = STICKER_HALF_SIZE;
  const d = STICKER_OFFSET;

  if (face === 'U') {
    return [
      { x: -a, y: d, z: -a },
      { x: a, y: d, z: -a },
      { x: a, y: d, z: a },
      { x: -a, y: d, z: a },
    ];
  }

  if (face === 'D') {
    return [
      { x: -a, y: -d, z: a },
      { x: a, y: -d, z: a },
      { x: a, y: -d, z: -a },
      { x: -a, y: -d, z: -a },
    ];
  }

  if (face === 'R') {
    return [
      { x: d, y: a, z: a },
      { x: d, y: a, z: -a },
      { x: d, y: -a, z: -a },
      { x: d, y: -a, z: a },
    ];
  }

  if (face === 'L') {
    return [
      { x: -d, y: a, z: -a },
      { x: -d, y: a, z: a },
      { x: -d, y: -a, z: a },
      { x: -d, y: -a, z: -a },
    ];
  }

  if (face === 'F') {
    return [
      { x: -a, y: a, z: d },
      { x: a, y: a, z: d },
      { x: a, y: -a, z: d },
      { x: -a, y: -a, z: d },
    ];
  }

  return [
    { x: a, y: a, z: -d },
    { x: -a, y: a, z: -d },
    { x: -a, y: -a, z: -d },
    { x: a, y: -a, z: -d },
  ];
};

const createSticker = (pieceId: string, face: CubeFace): PlayerRenderableSticker => ({
  color: FACE_COLORS[face],
  face,
  id: `${pieceId}-${face}`,
  polygon: polygonForFace(face),
});

const createCubePiece = (x: number, y: number, z: number, size: number): PlayerRenderablePiece => {
  const id = cubePieceId(x, y, z);
  const stickers: PlayerRenderableSticker[] = [];

  if (y === size - 1) stickers.push(createSticker(id, 'U'));
  if (x === size - 1) stickers.push(createSticker(id, 'R'));
  if (z === size - 1) stickers.push(createSticker(id, 'F'));
  if (y === 0) stickers.push(createSticker(id, 'D'));
  if (x === 0) stickers.push(createSticker(id, 'L'));
  if (z === 0) stickers.push(createSticker(id, 'B'));

  return {
    body: { color: BODY_COLOR, size: CUBIE_SIZE, type: 'box' },
    id,
    orientation: SOLVED_ORIENTATION,
    position: {
      x: centeredCoordinate(x, size),
      y: centeredCoordinate(y, size),
      z: centeredCoordinate(z, size),
    },
    stickers,
  };
};

const createCubeModel = (size: number): PlayerRenderableModel => {
  const pieces: PlayerRenderablePiece[] = [];

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let z = 0; z < size; z += 1) {
        if (!isVisibleCubie(x, y, z, size)) continue;

        pieces.push(createCubePiece(x, y, z, size));
      }
    }
  }

  return {
    cameraDistance: size * 2.85,
    pieces,
  };
};

const layerCoordinate = (
  axis: PlayerAxis,
  x: number,
  y: number,
  z: number,
): number => {
  if (axis === 'x') return x;
  if (axis === 'y') return y;

  return z;
};

const getAffectedPieceIds = (
  size: number,
  axis: PlayerAxis,
  layers: readonly number[],
): readonly string[] => {
  const layerSet = new Set(layers);
  const pieceIds: string[] = [];

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let z = 0; z < size; z += 1) {
        if (!isVisibleCubie(x, y, z, size)) continue;
        if (!layerSet.has(layerCoordinate(axis, x, y, z))) continue;

        pieceIds.push(cubePieceId(x, y, z));
      }
    }
  }

  return pieceIds;
};

const createPieceIndexByCoordinate = (model: PlayerRenderableModel): ReadonlyMap<string, number> =>
  new Map(
    model.pieces.map((piece, index) => {
      const [, x, y, z] = piece.id.split('-');

      return [cubeCoordinateKey(Number(x), Number(y), Number(z)), index];
    }),
  );

const createCubeTrackingState = (model: PlayerRenderableModel): FaceletTrackingState =>
  createFaceletTrackingState(model.pieces.map((piece) => piece.id));

const pieceIdsAtPositions = (
  model: PlayerRenderableModel,
  state: FaceletTrackingState,
  positionPieceIds: readonly string[],
): readonly string[] => {
  const piecePositionById = new Map(model.pieces.map((piece, index) => [piece.id, index]));

  return positionPieceIds
    .map((positionPieceId) => {
      const position = piecePositionById.get(positionPieceId);

      return position === undefined ? undefined : state.positionPieceIds[position];
    })
    .filter((pieceId): pieceId is string => pieceId !== undefined);
};

const rotateCoordinate = (
  axis: PlayerAxis,
  angleRadians: number,
  size: number,
  x: number,
  y: number,
  z: number,
): readonly [number, number, number] => {
  const center = (size - 1) / 2;
  const centeredX = x - center;
  const centeredY = y - center;
  const centeredZ = z - center;
  const cos = Math.round(Math.cos(angleRadians));
  const sin = Math.round(Math.sin(angleRadians));

  if (axis === 'x') {
    return [
      x,
      Math.round(centeredY * cos - centeredZ * sin + center),
      Math.round(centeredY * sin + centeredZ * cos + center),
    ];
  }

  if (axis === 'y') {
    return [
      Math.round(centeredX * cos + centeredZ * sin + center),
      y,
      Math.round(-centeredX * sin + centeredZ * cos + center),
    ];
  }

  return [
    Math.round(centeredX * cos - centeredY * sin + center),
    Math.round(centeredX * sin + centeredY * cos + center),
    z,
  ];
};

const createCubeSourceByTarget = (
  size: number,
  model: PlayerRenderableModel,
  animation: ReturnType<typeof mapCubeMoveToAnimation>,
): SourceByTarget => {
  const layerSet = new Set(animation.layers);
  const pieceIndexByCoordinate = createPieceIndexByCoordinate(model);
  const sourceByTarget = createIdentitySourceByTarget(model.pieces.length);

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let z = 0; z < size; z += 1) {
        if (!isVisibleCubie(x, y, z, size)) continue;
        if (!layerSet.has(layerCoordinate(animation.axis, x, y, z))) continue;

        const sourcePosition = pieceIndexByCoordinate.get(cubeCoordinateKey(x, y, z));
        const [targetX, targetY, targetZ] = rotateCoordinate(
          animation.axis,
          animation.angleRadians,
          size,
          x,
          y,
          z,
        );
        const targetPosition = pieceIndexByCoordinate.get(
          cubeCoordinateKey(targetX, targetY, targetZ),
        );

        if (sourcePosition === undefined || targetPosition === undefined) {
          throw new Error(`Missing cube source or target position for ${x},${y},${z}`);
        }

        sourceByTarget[targetPosition] = sourcePosition;
      }
    }
  }

  return Object.freeze(sourceByTarget);
};

export const createCubePlayerAdapter = (
  size: number,
  eventIds: readonly EventId[],
): PlayerPuzzleAdapter<CubeMove, FaceletTrackingState> => {
  const definition = createCubeDefinition(size, eventIds);
  const model = createCubeModel(size);
  const sourceByTargetForMove = (move: CubeMove): SourceByTarget => {
    const animation = mapCubeMoveToAnimation(move, size);

    return createCubeSourceByTarget(size, model, animation);
  };

  return {
    type: 'cube',
    eventIds,
    parseFormula: definition.parseAlgorithm,
    createInitialState: () => createCubeTrackingState(model),
    createRenderableModel: () => model,
    describeMove: (move, state): PlayerMoveAnimation<CubeMove> => {
      const animation = mapCubeMoveToAnimation(move, size);
      const affectedPositionIds = getAffectedPieceIds(size, animation.axis, animation.layers);

      return {
        affectedPieceIds: pieceIdsAtPositions(model, state, affectedPositionIds),
        angleRadians: animation.angleRadians,
        axis: axisVector(animation.axis),
        move,
        pivot: ZERO_VECTOR,
      };
    },
    applyMove: (state, move) => applySourceByTarget(state, sourceByTargetForMove(move)),
  };
};
