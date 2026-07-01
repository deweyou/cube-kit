import {
  createFtoDefinition,
  type FtoFace,
  type FtoMove,
  type FtoMoveFace,
  getFtoMoveSourceByTarget,
} from '@cubegin/scramble-puzzle';
import {
  affectedPieceIdsForSourceByTarget,
  applySourceByTarget,
  createFaceletIds,
  createFaceletTrackingState,
  type FaceletTrackingState,
  type SourceByTarget,
} from '../facelet-tracking.js';
import type { PlayerMoveAnimation, PlayerPuzzleAdapter, Vector3Like } from '../puzzle-adapter.js';
import {
  buildTaggedModel,
  centroidOf,
  createFaceletPiece,
  dotVectors,
  normalizeVector,
  splitTriangleIntoGrid,
  type TaggedRenderableModel,
} from '../polyhedron-model.js';

const FTO_COLORS = {
  U: '#ffffff',
  F: '#00dd00',
  BR: '#bbbbbb',
  BL: '#ffaa00',
  D: '#ffff00',
  B: '#0000ff',
  R: '#ff0000',
  L: '#880088',
} satisfies Record<FtoFace, string>;

const VERTICES = {
  TOP: { x: 0, y: 1.35, z: 0 },
  BOTTOM: { x: 0, y: -1.35, z: 0 },
  FRONT: { x: 0, y: 0, z: 1.35 },
  BACK: { x: 0, y: 0, z: -1.35 },
  RIGHT: { x: 1.35, y: 0, z: 0 },
  LEFT: { x: -1.35, y: 0, z: 0 },
} satisfies Record<'TOP' | 'BOTTOM' | 'FRONT' | 'BACK' | 'RIGHT' | 'LEFT', Vector3Like>;

// The FTO cubie state uses these six corner adjacencies:
// U/R/F/L, U/B/BR/R, U/L/BL/B, BL/D/BR/B, F/D/BL/L, BR/D/F/R.
const FACE_POLYGONS = {
  U: [VERTICES.TOP, VERTICES.LEFT, VERTICES.FRONT],
  F: [VERTICES.TOP, VERTICES.RIGHT, VERTICES.BACK],
  BR: [VERTICES.LEFT, VERTICES.BOTTOM, VERTICES.BACK],
  BL: [VERTICES.FRONT, VERTICES.BOTTOM, VERTICES.RIGHT],
  D: [VERTICES.BOTTOM, VERTICES.RIGHT, VERTICES.BACK],
  B: [VERTICES.LEFT, VERTICES.FRONT, VERTICES.BOTTOM],
  R: [VERTICES.TOP, VERTICES.LEFT, VERTICES.BACK],
  L: [VERTICES.TOP, VERTICES.FRONT, VERTICES.RIGHT],
} satisfies Record<FtoFace, readonly [Vector3Like, Vector3Like, Vector3Like]>;

const FACE_ORDER = ['U', 'F', 'BR', 'BL', 'D', 'B', 'R', 'L'] as const satisfies readonly FtoFace[];
const MOVE_FACE_ORDER = ['U', 'D', 'F', 'B', 'L', 'R', 'BL', 'BR'] as const satisfies readonly FtoMoveFace[];
const FACE_TURN_DOT_THRESHOLD = 0.35;
const STICKERS_PER_FACE = 9;
const PIECE_IDS = createFaceletIds('fto', FACE_ORDER, STICKERS_PER_FACE);

// FTO facelets follow the scramble-puzzle ftocta order. The local polygons come
// from the geometric split order, so each face needs this placement map.
const FACELET_POLYGON_INDEX = {
  U: [0, 5, 1, 2, 8, 6, 7, 3, 4],
  F: [0, 5, 1, 2, 8, 6, 7, 3, 4],
  BR: [8, 5, 6, 7, 0, 1, 2, 3, 4],
  BL: [8, 7, 6, 5, 4, 3, 2, 1, 0],
  D: [0, 2, 1, 5, 4, 3, 7, 6, 8],
  B: [4, 7, 3, 2, 8, 6, 5, 1, 0],
  R: [0, 2, 1, 5, 4, 3, 7, 6, 8],
  L: [0, 5, 1, 2, 8, 6, 7, 3, 4],
} satisfies Record<FtoFace, readonly number[]>;

const faceAxis = (face: FtoMoveFace): Vector3Like =>
  normalizeVector(centroidOf(FACE_POLYGONS[face]));

const turnGroupsForPolygon = (polygon: readonly Vector3Like[]): readonly string[] => {
  const center = centroidOf(polygon);

  return MOVE_FACE_ORDER.filter(
    (moveFace) => dotVectors(center, faceAxis(moveFace)) > FACE_TURN_DOT_THRESHOLD,
  ).map((moveFace) => `face:${moveFace}`);
};

const createFtoModel = (): TaggedRenderableModel => {
  const pieces = FACE_ORDER.flatMap((face) => {
    const facePolygons = splitTriangleIntoGrid(FACE_POLYGONS[face], 3);

    return FACELET_POLYGON_INDEX[face].map((polygonIndex, stickerIndex) => {
      const polygon = facePolygons[polygonIndex];

      if (polygon === undefined) {
        throw new Error(`Missing FTO polygon ${polygonIndex} for ${face}`);
      }

      return createFaceletPiece({
        color: FTO_COLORS[face],
        face,
        groups: turnGroupsForPolygon(polygon),
        id: `fto-${face}-${stickerIndex}`,
        polygon,
      });
    });
  });

  return buildTaggedModel(pieces, 5.8);
};

const signedTurnAngle = (amount: FtoMove['amount']): number =>
  amount === 1 ? -(Math.PI * 2) / 3 : (Math.PI * 2) / 3;

export const createFtoPlayerAdapter = (): PlayerPuzzleAdapter<FtoMove, FaceletTrackingState> => {
  const definition = createFtoDefinition();
  const taggedModel = createFtoModel();
  const sourceByTargetForMove = (move: FtoMove): SourceByTarget => getFtoMoveSourceByTarget(move);

  return {
    type: 'fto',
    eventIds: ['fto'],
    parseFormula: definition.parseAlgorithm,
    createInitialState: () => createFaceletTrackingState(PIECE_IDS),
    createRenderableModel: () => taggedModel.model,
    describeMove: (move, state): PlayerMoveAnimation<FtoMove> => {
      const sourceByTarget = sourceByTargetForMove(move);

      return {
        affectedPieceIds: affectedPieceIdsForSourceByTarget(state, sourceByTarget),
        angleRadians: signedTurnAngle(move.amount),
        axis: faceAxis(move.face),
        move,
        pivot: { x: 0, y: 0, z: 0 },
      };
    },
    applyMove: (state, move) => applySourceByTarget(state, sourceByTargetForMove(move)),
  };
};
