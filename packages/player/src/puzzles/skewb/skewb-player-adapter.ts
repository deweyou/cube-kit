import { createSkewbDefinition, type SkewbFace, type SkewbMove } from '@cubegin/scramble-puzzle';
import {
  affectedPieceIdsForSourceByTarget,
  applySourceByTarget,
  createFaceletTrackingState,
  type FaceletTrackingState,
  type SourceByTarget,
} from '../facelet-tracking.js';
import type { PlayerMoveAnimation, PlayerPuzzleAdapter } from '../puzzle-adapter.js';
import { STATIC_POLYHEDRON_DATA } from '../static-polyhedron-data.js';
import {
  createStaticPolyhedronModel,
  repeatStaticMoveGeometry,
} from '../static-polyhedron-model.js';

const SKEWB_COLORS = {
  U: '#ffffff',
  R: '#0000ff',
  F: '#ff0000',
  D: '#ffff00',
  L: '#00ff00',
  B: '#ff8000',
} satisfies Record<SkewbFace, string>;

const SKEWB_GEOMETRY = STATIC_POLYHEDRON_DATA.skewb;
const SKEWB_STATE_FACE_BY_STATIC_FACE = {
  U: 'U',
  R: 'F',
  F: 'L',
  D: 'D',
  L: 'B',
  B: 'R',
} satisfies Record<SkewbFace, SkewbFace>;
const SKEWB_COLORS_BY_STATIC_FACE = Object.fromEntries(
  Object.entries(SKEWB_STATE_FACE_BY_STATIC_FACE).map(([staticFace, stateFace]) => [
    staticFace,
    SKEWB_COLORS[stateFace],
  ]),
) as Record<SkewbFace, string>;
const moveKeyForMove = (move: SkewbMove): string => `move:${move.face}`;

export const createSkewbPlayerAdapter = (): PlayerPuzzleAdapter<SkewbMove, FaceletTrackingState> => {
  const definition = createSkewbDefinition();
  const staticModel = createStaticPolyhedronModel({
    cameraDistance: 7.2,
    colors: SKEWB_COLORS_BY_STATIC_FACE,
    piecesPrefix: 'skewb',
    stickers: SKEWB_GEOMETRY.stickers,
  });
  const sourceByTargetForMove = (move: SkewbMove): SourceByTarget => {
    const moveGeometry = SKEWB_GEOMETRY.moves[moveKeyForMove(move)];

    if (moveGeometry === undefined) throw new Error(`Missing skewb move ${move.face}`);

    return repeatStaticMoveGeometry(moveGeometry, move.amount).sourceByTarget;
  };

  return {
    type: 'skewb',
    eventIds: ['skewb'],
    parseFormula: definition.parseAlgorithm,
    createInitialState: () => createFaceletTrackingState(staticModel.pieceIds),
    createRenderableModel: () => staticModel.model,
    describeMove: (move, state): PlayerMoveAnimation<SkewbMove> => {
      const moveGeometry = SKEWB_GEOMETRY.moves[moveKeyForMove(move)];

      if (moveGeometry === undefined) throw new Error(`Missing skewb move ${move.face}`);

      const repeatedMoveGeometry = repeatStaticMoveGeometry(moveGeometry, move.amount);

      return {
        affectedPieceIds: affectedPieceIdsForSourceByTarget(
          state,
          repeatedMoveGeometry.sourceByTarget,
        ),
        angleRadians: repeatedMoveGeometry.angleRadians,
        axis: repeatedMoveGeometry.axis,
        move,
        pivot: { x: 0, y: 0, z: 0 },
      };
    },
    applyMove: (state, move) => applySourceByTarget(state, sourceByTargetForMove(move)),
  };
};
