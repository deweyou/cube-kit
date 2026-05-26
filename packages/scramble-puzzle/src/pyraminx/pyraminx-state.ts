import { InvalidMoveError } from '../errors.js';
import {
  PYRAMINX_AXES,
  PYRAMINX_FACES,
  type PyraminxAxis,
  type PyraminxFace,
  type PyraminxMove,
  type PyraminxMoveAmount,
} from './pyraminx-parser.js';

export type PyraminxFacelet = number;
export type PyraminxFaceState = readonly PyraminxFacelet[];
export type PyraminxImage = readonly PyraminxFaceState[];

export interface PyraminxState {
  readonly image: PyraminxImage;
}

type MutablePyraminxImage = PyraminxFacelet[][];

const STICKERS_PER_FACE = 9;
const MALFORMED_MOVE = '<malformed>';

const isPyraminxAxis = (face: unknown): face is PyraminxAxis =>
  typeof face === 'string' && PYRAMINX_AXES.includes(face as PyraminxAxis);

const isMoveAmount = (amount: unknown): amount is PyraminxMoveAmount =>
  amount === 1 || amount === 2;

const axisIndex = (face: PyraminxAxis): number => PYRAMINX_AXES.indexOf(face);

const clonePyraminxImage = (image: PyraminxImage): MutablePyraminxImage =>
  image.map((face) => [...face]);

const freezePyraminxImage = (image: MutablePyraminxImage): PyraminxImage => {
  const frozenFaces = image.map((face) => Object.freeze([...face]));

  return Object.freeze(frozenFaces);
};

const createPyraminxState = (image: MutablePyraminxImage): PyraminxState => {
  if (
    image.length !== PYRAMINX_FACES.length ||
    image.some((face) => face.length !== STICKERS_PER_FACE)
  ) {
    throw new RangeError('pyraminx state must contain 4 faces of 9 stickers');
  }

  for (const face of image) {
    for (const sticker of face) {
      if (!Number.isSafeInteger(sticker) || sticker < 0 || sticker >= PYRAMINX_FACES.length) {
        throw new RangeError('pyraminx stickers must be integer face indexes from 0 to 3');
      }
    }
  }

  return Object.freeze({
    image: freezePyraminxImage(image),
  });
};

const swapStickers = (
  image: MutablePyraminxImage,
  firstFace: number,
  firstSticker: number,
  secondFace: number,
  secondSticker: number,
  thirdFace: number,
  thirdSticker: number,
): void => {
  const savedSticker = image[firstFace][firstSticker];
  image[firstFace][firstSticker] = image[secondFace][secondSticker];
  image[secondFace][secondSticker] = image[thirdFace][thirdSticker];
  image[thirdFace][thirdSticker] = savedSticker;
};

const turnTipOnce = (image: MutablePyraminxImage, side: number): void => {
  switch (side) {
    case 0:
      swapStickers(image, 0, 0, 3, 0, 2, 3);
      break;
    case 1:
      swapStickers(image, 0, 6, 2, 6, 1, 0);
      break;
    case 2:
      swapStickers(image, 0, 3, 1, 3, 3, 6);
      break;
    case 3:
      swapStickers(image, 1, 6, 2, 0, 3, 3);
      break;
  }
};

const turnOnce = (image: MutablePyraminxImage, side: number): void => {
  switch (side) {
    case 0:
      swapStickers(image, 0, 8, 3, 8, 2, 2);
      swapStickers(image, 0, 1, 3, 1, 2, 4);
      swapStickers(image, 0, 2, 3, 2, 2, 5);
      break;
    case 1:
      swapStickers(image, 2, 8, 1, 2, 0, 8);
      swapStickers(image, 2, 7, 1, 1, 0, 7);
      swapStickers(image, 2, 5, 1, 8, 0, 5);
      break;
    case 2:
      swapStickers(image, 3, 8, 0, 5, 1, 5);
      swapStickers(image, 3, 7, 0, 4, 1, 4);
      swapStickers(image, 3, 5, 0, 2, 1, 2);
      break;
    case 3:
      swapStickers(image, 1, 8, 2, 2, 3, 5);
      swapStickers(image, 1, 7, 2, 1, 3, 4);
      swapStickers(image, 1, 5, 2, 8, 3, 2);
      break;
  }

  turnTipOnce(image, side);
};

const applyRepeatedTurns = (
  image: MutablePyraminxImage,
  amount: PyraminxMoveAmount,
  turn: () => void,
): void => {
  for (let index = 0; index < amount; index += 1) {
    turn();
  }
};

const validateMove = (move: PyraminxMove): PyraminxMove => {
  if (typeof move !== 'object' || move === null) {
    throw new InvalidMoveError(MALFORMED_MOVE, 'pyraminx');
  }

  if (
    (move.type === 'turn' || move.type === 'tip') &&
    isPyraminxAxis(move.face) &&
    isMoveAmount(move.amount)
  ) {
    return move;
  }

  throw new InvalidMoveError(MALFORMED_MOVE, 'pyraminx');
};

export const createSolvedPyraminxState = (): PyraminxState =>
  createPyraminxState(
    PYRAMINX_FACES.map((_, face) => Array<PyraminxFacelet>(STICKERS_PER_FACE).fill(face)),
  );

export const applyPyraminxMove = (state: PyraminxState, move: PyraminxMove): PyraminxState => {
  const validMove = validateMove(move);
  const nextImage = clonePyraminxImage(state.image);
  const side = axisIndex(validMove.face);

  applyRepeatedTurns(nextImage, validMove.amount, () => {
    if (validMove.type === 'tip') {
      turnTipOnce(nextImage, side);
      return;
    }

    turnOnce(nextImage, side);
  });

  return createPyraminxState(nextImage);
};

export const arePyraminxStatesEqual = (a: PyraminxState, b: PyraminxState): boolean =>
  a.image.every((face, faceIndexValue) =>
    face.every((sticker, stickerIndex) => sticker === b.image[faceIndexValue]?.[stickerIndex]),
  );

export type { PyraminxFace };
