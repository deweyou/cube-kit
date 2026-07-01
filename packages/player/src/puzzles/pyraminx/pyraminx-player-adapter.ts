import {
  createPyraminxDefinition,
  type PyraminxFace,
  type PyraminxMove,
} from '@cubegin/scramble-puzzle';
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
import type { StaticMoveGeometry } from '../static-polyhedron-data.js';

const PYRAMINX_COLORS = {
  F: '#00ff00',
  D: '#ffff00',
  L: '#ff0000',
  R: '#0000ff',
} satisfies Record<PyraminxFace, string>;

const PYRAMINX_GEOMETRY = STATIC_POLYHEDRON_DATA.pyraminx;
const moveKeyForMove = (move: PyraminxMove): string => `${move.type}:${move.face}`;

const mergeParallelMoveGeometries = (
  primaryMoveGeometry: StaticMoveGeometry,
  secondaryMoveGeometry: StaticMoveGeometry,
): StaticMoveGeometry => {
  const sourceByTarget = primaryMoveGeometry.sourceByTarget.map((sourcePosition, targetPosition) => {
    if (sourcePosition !== targetPosition) return sourcePosition;

    return secondaryMoveGeometry.sourceByTarget[targetPosition] ?? targetPosition;
  });

  return {
    angleRadians: primaryMoveGeometry.angleRadians,
    axis: primaryMoveGeometry.axis,
    sourceByTarget,
  };
};

const repeatedMoveGeometryForMove = (move: PyraminxMove): StaticMoveGeometry => {
  const moveGeometry = PYRAMINX_GEOMETRY.moves[moveKeyForMove(move)];

  if (moveGeometry === undefined) throw new Error(`Missing pyraminx move ${move.face}`);

  const repeatedMoveGeometry = repeatStaticMoveGeometry(moveGeometry, move.amount);

  if (move.type === 'tip') return repeatedMoveGeometry;

  const tipMoveGeometry = PYRAMINX_GEOMETRY.moves[`tip:${move.face}`];
  if (tipMoveGeometry === undefined) throw new Error(`Missing pyraminx tip move ${move.face}`);

  return mergeParallelMoveGeometries(
    repeatedMoveGeometry,
    repeatStaticMoveGeometry(tipMoveGeometry, move.amount),
  );
};

export const createPyraminxPlayerAdapter = (): PlayerPuzzleAdapter<
  PyraminxMove,
  FaceletTrackingState
> => {
  const definition = createPyraminxDefinition();
  const staticModel = createStaticPolyhedronModel({
    cameraDistance: 6.8,
    colors: PYRAMINX_COLORS,
    piecesPrefix: 'pyraminx',
    stickers: PYRAMINX_GEOMETRY.stickers,
  });
  const sourceByTargetForMove = (move: PyraminxMove): SourceByTarget => {
    return repeatedMoveGeometryForMove(move).sourceByTarget;
  };

  return {
    type: 'pyraminx',
    eventIds: ['pyram'],
    parseFormula: definition.parseAlgorithm,
    createInitialState: () => createFaceletTrackingState(staticModel.pieceIds),
    createRenderableModel: () => staticModel.model,
    describeMove: (move, state): PlayerMoveAnimation<PyraminxMove> => {
      const repeatedMoveGeometry = repeatedMoveGeometryForMove(move);

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
