import { InvalidMoveError } from '../errors.js';
import {
  FTO_FACES,
  type FtoFace,
  type FtoMove,
  type FtoMoveAmount,
  type FtoMoveFace,
} from './fto-parser.js';
import { FTO_FACELET_SOURCE_BY_TARGET, FTO_MOVE_FACE_TO_INDEX } from './fto-cubie.js';

export type FtoFacelet = number;
export type FtoFaceState = readonly FtoFacelet[];
export type FtoImage = readonly FtoFaceState[];

export interface FtoState {
  readonly image: FtoImage;
}

type MutableFtoImage = FtoFacelet[][];

const STICKERS_PER_FACE = 9;
const FACELET_COUNT = FTO_FACES.length * STICKERS_PER_FACE;
const MALFORMED_MOVE = '<malformed>';

const isFtoMoveFace = (face: unknown): face is FtoMoveFace =>
  typeof face === 'string' && Object.hasOwn(FTO_MOVE_FACE_TO_INDEX, face);

const isMoveAmount = (amount: unknown): amount is FtoMoveAmount => amount === 1 || amount === 2;

const freezeFtoImage = (image: MutableFtoImage): FtoImage => {
  const frozenFaces = image.map((face) => Object.freeze([...face]));

  return Object.freeze(frozenFaces);
};

const createFtoState = (image: MutableFtoImage): FtoState => {
  if (
    image.length !== FTO_FACES.length ||
    image.some((face) => face.length !== STICKERS_PER_FACE)
  ) {
    throw new RangeError('FTO state must contain 8 faces of 9 stickers');
  }

  for (const face of image) {
    for (const sticker of face) {
      if (!Number.isSafeInteger(sticker) || sticker < 0 || sticker >= FTO_FACES.length) {
        throw new RangeError('FTO stickers must be integer face indexes from 0 to 7');
      }
    }
  }

  return Object.freeze({
    image: freezeFtoImage(image),
  });
};

const flattenImage = (image: FtoImage): number[] => image.flatMap((face) => [...face]);

const inflateImage = (facelets: readonly number[]): MutableFtoImage =>
  FTO_FACES.map((_, faceIndex) =>
    facelets.slice(faceIndex * STICKERS_PER_FACE, (faceIndex + 1) * STICKERS_PER_FACE),
  );

const validateMove = (move: FtoMove): FtoMove => {
  if (typeof move !== 'object' || move === null) {
    throw new InvalidMoveError(MALFORMED_MOVE, 'face-turning-octahedron');
  }

  if (isFtoMoveFace(move.face) && isMoveAmount(move.amount)) {
    return move;
  }

  throw new InvalidMoveError(MALFORMED_MOVE, 'face-turning-octahedron');
};

const moveIndexFor = (move: FtoMove): number => FTO_MOVE_FACE_TO_INDEX[move.face] + move.amount - 1;

export const createSolvedFtoState = (): FtoState =>
  createFtoState(FTO_FACES.map((_, face) => Array<FtoFacelet>(STICKERS_PER_FACE).fill(face)));

export const applyFtoMove = (state: FtoState, move: FtoMove): FtoState => {
  const validMove = validateMove(move);
  const flatState = flattenImage(state.image);
  if (flatState.length !== FACELET_COUNT) {
    throw new RangeError('FTO state must contain 72 facelets');
  }

  const sourceByTarget = FTO_FACELET_SOURCE_BY_TARGET[moveIndexFor(validMove)];
  const nextFacelets = sourceByTarget.map((sourceFacelet) => flatState[sourceFacelet]);

  return createFtoState(inflateImage(nextFacelets));
};

export const areFtoStatesEqual = (a: FtoState, b: FtoState): boolean =>
  a.image.every((face, faceIndexValue) =>
    face.every((sticker, stickerIndex) => sticker === b.image[faceIndexValue]?.[stickerIndex]),
  );

export type { FtoFace };
