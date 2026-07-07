import {
  MEGAMINX_FACES,
  createMegaminxDefinition,
  type MegaminxFace,
  type MegaminxMove,
  type MegaminxMoveAmount,
  type MegaminxState,
} from '@cubegin/scramble-puzzle';
import {
  affectedPieceIdsForSourceByTarget,
  createFaceletTrackingState,
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

const MEGAMINX_CAMERA_ORBIT = {
  pitch: Math.atan(0.5),
  yaw: 0,
} as const;

const MEGAMINX_STATE_FACE_BY_STATIC_FACE: Partial<Record<MegaminxFace, MegaminxFace>> = {
  B: 'DBR',
  DBL: 'B',
  DBR: 'DR',
  DL: 'DBL',
  DR: 'DL',
};

const MEGAMINX_STATIC_FACE_BY_STATE_FACE: Partial<Record<MegaminxFace, MegaminxFace>> = {
  B: 'DBL',
  DBL: 'DL',
  DBR: 'B',
  DL: 'DR',
  DR: 'DBR',
};

const MEGAMINX_STATE_STICKER_INDEX_BY_STATIC_FACE = {
  U: [8, 7, 0, 1, 10, 9, 3, 2, 4, 5, 6],
  F: [2, 1, 4, 5, 10, 3, 7, 6, 8, 9, 0],
  L: [4, 3, 6, 7, 10, 5, 9, 8, 0, 1, 2],
  BL: [6, 5, 8, 9, 10, 7, 1, 0, 2, 3, 4],
  BR: [8, 7, 0, 1, 10, 9, 3, 2, 4, 5, 6],
  R: [8, 7, 0, 1, 10, 9, 3, 2, 4, 5, 6],
  DBR: [0, 9, 2, 3, 10, 1, 5, 4, 6, 7, 8],
  DR: [8, 7, 0, 1, 10, 9, 3, 2, 4, 5, 6],
  DL: [8, 7, 0, 1, 10, 9, 3, 2, 4, 5, 6],
  DBL: [6, 5, 8, 9, 10, 7, 1, 0, 2, 3, 4],
  B: [4, 3, 6, 7, 10, 5, 9, 8, 0, 1, 2],
  D: [0, 9, 2, 3, 10, 1, 5, 4, 6, 7, 8],
} as const satisfies Record<MegaminxFace, readonly number[]>;

const MEGAMINX_GEOMETRY = STATIC_POLYHEDRON_DATA.megaminx;

const staticFaceForStateFace = (face: MegaminxFace): MegaminxFace =>
  MEGAMINX_STATIC_FACE_BY_STATE_FACE[face] ?? face;

const moveKeyForMove = (move: MegaminxMove): string =>
  move.type === 'face' ? `face:${staticFaceForStateFace(move.face)}` : `big:${move.name}`;

const durationMultiplierForAmount = (amount: MegaminxMoveAmount): number =>
  amount === 2 || amount === 3 ? 1.6 : 1;

const isMegaminxFace = (face: string): face is MegaminxFace =>
  Object.prototype.hasOwnProperty.call(MEGAMINX_COLORS, face);

const stateStickerIndexForStaticSticker = (
  face: MegaminxFace,
  staticStickerIndex: number,
): number => {
  return MEGAMINX_STATE_STICKER_INDEX_BY_STATIC_FACE[face][staticStickerIndex] ?? 10;
};

const colorForStateSticker = (
  state: MegaminxState,
  face: string,
  staticStickerIndex: number,
): string => {
  if (!isMegaminxFace(face)) {
    throw new Error(`Missing megaminx state face for ${face}`);
  }

  const stateFace = MEGAMINX_STATE_FACE_BY_STATIC_FACE[face] ?? face;
  const faceIndex = MEGAMINX_FACES.indexOf(stateFace);
  const stateStickerIndex = stateStickerIndexForStaticSticker(face, staticStickerIndex);
  const facelet = state.image[faceIndex]?.[stateStickerIndex];
  const faceletFace = MEGAMINX_FACES[facelet ?? -1] ?? 'U';

  return MEGAMINX_COLORS[faceletFace];
};

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
  sourceByTarget: SourceByTarget,
  centerPositionByFace: ReadonlyMap<MegaminxFace, number>,
  pieceIds: readonly string[],
): readonly string[] => {
  const affectedPieceIds = new Set(
    affectedPieceIdsForSourceByTarget(createFaceletTrackingState(pieceIds), sourceByTarget),
  );

  if (move.type === 'face') {
    const centerPosition = centerPositionByFace.get(staticFaceForStateFace(move.face));
    const centerPieceId = centerPosition === undefined ? undefined : pieceIds[centerPosition];

    if (centerPieceId !== undefined) affectedPieceIds.add(centerPieceId);
  }

  return [...affectedPieceIds];
};

export const createMegaminxPlayerAdapter = (): PlayerPuzzleAdapter<
  MegaminxMove,
  MegaminxState
> => {
  const definition = createMegaminxDefinition();
  const createModel = (state: MegaminxState) =>
    createStaticPolyhedronModel({
      cameraDistance: 8.2,
      cameraOrbit: MEGAMINX_CAMERA_ORBIT,
      colorForSticker: (sticker, _stickerIndex, faceStickerIndex) =>
        colorForStateSticker(state, sticker.face, faceStickerIndex),
      colors: MEGAMINX_COLORS,
      piecesPrefix: 'megaminx',
      stickers: MEGAMINX_GEOMETRY.stickers,
    });
  const solvedModel = createModel(definition.createSolvedState());
  const centerPositionByFace = createCenterPositionByFace(solvedModel.model.pieces);
  const pieceIds = solvedModel.pieceIds;

  return {
    type: 'megaminx',
    eventIds: ['minx'],
    shouldRebuildModelAfterEachMove: true,
    parseFormula: definition.parseAlgorithm,
    createInitialState: definition.createSolvedState,
    createRenderableModel: (state) => createModel(state).model,
    describeMove: (move): PlayerMoveAnimation<MegaminxMove> => {
      const moveGeometry = MEGAMINX_GEOMETRY.moves[moveKeyForMove(move)];

      if (moveGeometry === undefined) throw new Error(`Missing megaminx move ${moveKeyForMove(move)}`);

      const repeatedMoveGeometry = repeatStaticMoveGeometry(moveGeometry, move.amount);

      return {
        affectedPieceIds: affectedPieceIdsForMove(
          move,
          repeatedMoveGeometry.sourceByTarget,
          centerPositionByFace,
          pieceIds,
        ),
        angleRadians: repeatedMoveGeometry.angleRadians,
        axis: repeatedMoveGeometry.axis,
        durationMultiplier: durationMultiplierForAmount(move.amount),
        move,
        pivot: { x: 0, y: 0, z: 0 },
      };
    },
    applyMove: definition.applyMove,
  };
};
