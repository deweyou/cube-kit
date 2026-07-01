import {
  createMegaminxDefinition,
  type MegaminxFace,
  type MegaminxMove,
  type MegaminxMoveAmount,
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

const CENTER_STICKER_VERTEX_COUNT = 5;

const MEGAMINX_COLORS = {
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
} satisfies Record<MegaminxFace, string>;

const MEGAMINX_GEOMETRY = STATIC_POLYHEDRON_DATA.megaminx;

const moveKeyForMove = (move: MegaminxMove): string =>
  move.type === 'face' ? `face:${move.face}` : `big:${move.name}`;

const durationMultiplierForAmount = (amount: MegaminxMoveAmount): number =>
  amount === 2 || amount === 3 ? 1.6 : 1;

const isMegaminxFace = (face: string): face is MegaminxFace =>
  Object.prototype.hasOwnProperty.call(MEGAMINX_COLORS, face);

const createCenterPositionByFace = (
  pieces: ReturnType<typeof createStaticPolyhedronModel>['model']['pieces'],
): ReadonlyMap<MegaminxFace, number> => {
  const centerPositionByFace = new Map<MegaminxFace, number>();

  pieces.forEach((piece, position) => {
    const centerSticker = piece.stickers.find(
      (sticker) =>
        !sticker.face.endsWith('-border') &&
        sticker.polygon.length === CENTER_STICKER_VERTEX_COUNT &&
        isMegaminxFace(sticker.face),
    );

    if (centerSticker !== undefined && isMegaminxFace(centerSticker.face)) {
      centerPositionByFace.set(centerSticker.face, position);
    }
  });

  return centerPositionByFace;
};

const affectedPieceIdsForMove = (
  move: MegaminxMove,
  state: FaceletTrackingState,
  sourceByTarget: SourceByTarget,
  centerPositionByFace: ReadonlyMap<MegaminxFace, number>,
): readonly string[] => {
  const affectedPieceIds = new Set(affectedPieceIdsForSourceByTarget(state, sourceByTarget));

  if (move.type === 'face') {
    const centerPosition = centerPositionByFace.get(move.face);
    const centerPieceId =
      centerPosition === undefined ? undefined : state.positionPieceIds[centerPosition];

    if (centerPieceId !== undefined) affectedPieceIds.add(centerPieceId);
  }

  return [...affectedPieceIds];
};

export const createMegaminxPlayerAdapter = (): PlayerPuzzleAdapter<
  MegaminxMove,
  FaceletTrackingState
> => {
  const definition = createMegaminxDefinition();
  const staticModel = createStaticPolyhedronModel({
    cameraDistance: 8.2,
    colors: MEGAMINX_COLORS,
    piecesPrefix: 'megaminx',
    stickers: MEGAMINX_GEOMETRY.stickers,
  });
  const centerPositionByFace = createCenterPositionByFace(staticModel.model.pieces);
  const sourceByTargetForMove = (move: MegaminxMove): SourceByTarget => {
    const moveGeometry = MEGAMINX_GEOMETRY.moves[moveKeyForMove(move)];

    if (moveGeometry === undefined) throw new Error(`Missing megaminx move ${moveKeyForMove(move)}`);

    return repeatStaticMoveGeometry(moveGeometry, move.amount).sourceByTarget;
  };

  return {
    type: 'megaminx',
    eventIds: ['minx'],
    parseFormula: definition.parseAlgorithm,
    createInitialState: () => createFaceletTrackingState(staticModel.pieceIds),
    createRenderableModel: () => staticModel.model,
    describeMove: (move, state): PlayerMoveAnimation<MegaminxMove> => {
      const moveGeometry = MEGAMINX_GEOMETRY.moves[moveKeyForMove(move)];

      if (moveGeometry === undefined) throw new Error(`Missing megaminx move ${moveKeyForMove(move)}`);

      const repeatedMoveGeometry = repeatStaticMoveGeometry(moveGeometry, move.amount);

      return {
        affectedPieceIds: affectedPieceIdsForMove(
          move,
          state,
          repeatedMoveGeometry.sourceByTarget,
          centerPositionByFace,
        ),
        angleRadians: repeatedMoveGeometry.angleRadians,
        axis: repeatedMoveGeometry.axis,
        durationMultiplier: durationMultiplierForAmount(move.amount),
        move,
        pivot: { x: 0, y: 0, z: 0 },
      };
    },
    applyMove: (state, move) => applySourceByTarget(state, sourceByTargetForMove(move)),
  };
};
