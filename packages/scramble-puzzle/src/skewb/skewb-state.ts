import { InvalidMoveError } from '../errors.js';
import {
  SKEWB_AXES,
  SKEWB_FACES,
  type SkewbAxis,
  type SkewbFace,
  type SkewbMove,
  type SkewbMoveAmount,
} from './skewb-parser.js';

export type SkewbFacelet = number;
export type SkewbFaceState = readonly SkewbFacelet[];
export type SkewbImage = readonly SkewbFaceState[];

export interface SkewbState {
  readonly image: SkewbImage;
}

type MutableSkewbImage = SkewbFacelet[][];

const STICKERS_PER_FACE = 5;
const MALFORMED_MOVE = '<malformed>';

const isSkewbAxis = (face: unknown): face is SkewbAxis =>
  typeof face === 'string' && SKEWB_AXES.includes(face as SkewbAxis);

const isMoveAmount = (amount: unknown): amount is SkewbMoveAmount =>
  amount === 1 || amount === 2;

const axisIndex = (face: SkewbAxis): number => SKEWB_AXES.indexOf(face);

const cloneSkewbImage = (image: SkewbImage): MutableSkewbImage =>
  image.map((face) => [...face]);

const freezeSkewbImage = (image: MutableSkewbImage): SkewbImage => {
  const frozenFaces = image.map((face) => Object.freeze([...face]));

  return Object.freeze(frozenFaces);
};

const createSkewbState = (image: MutableSkewbImage): SkewbState => {
  if (
    image.length !== SKEWB_FACES.length ||
    image.some((face) => face.length !== STICKERS_PER_FACE)
  ) {
    throw new RangeError('skewb state must contain 6 faces of 5 stickers');
  }

  for (const face of image) {
    for (const sticker of face) {
      if (
        !Number.isSafeInteger(sticker) ||
        sticker < 0 ||
        sticker >= SKEWB_FACES.length
      ) {
        throw new RangeError(
          'skewb stickers must be integer face indexes from 0 to 5',
        );
      }
    }
  }

  return Object.freeze({
    image: freezeSkewbImage(image),
  });
};

const swapStickers = (
  image: MutableSkewbImage,
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

const turnOnce = (image: MutableSkewbImage, axis: number): void => {
  switch (axis) {
    case 0:
      swapStickers(image, 2, 0, 3, 0, 1, 0);
      swapStickers(image, 2, 4, 3, 2, 1, 3);
      swapStickers(image, 2, 2, 3, 1, 1, 4);
      swapStickers(image, 2, 3, 3, 4, 1, 1);
      swapStickers(image, 4, 4, 5, 3, 0, 4);
      break;
    case 1:
      swapStickers(image, 0, 0, 1, 0, 5, 0);
      swapStickers(image, 0, 2, 1, 2, 5, 1);
      swapStickers(image, 0, 4, 1, 4, 5, 2);
      swapStickers(image, 0, 1, 1, 1, 5, 3);
      swapStickers(image, 4, 1, 2, 2, 3, 4);
      break;
    case 2:
      swapStickers(image, 4, 0, 5, 0, 3, 0);
      swapStickers(image, 4, 3, 5, 4, 3, 3);
      swapStickers(image, 4, 1, 5, 3, 3, 1);
      swapStickers(image, 4, 4, 5, 2, 3, 4);
      swapStickers(image, 2, 3, 0, 1, 1, 4);
      break;
    case 3:
      swapStickers(image, 1, 0, 3, 0, 5, 0);
      swapStickers(image, 1, 4, 3, 4, 5, 3);
      swapStickers(image, 1, 3, 3, 3, 5, 1);
      swapStickers(image, 1, 2, 3, 2, 5, 4);
      swapStickers(image, 0, 2, 2, 4, 4, 3);
      break;
  }
};

const applyRepeatedTurns = (
  image: MutableSkewbImage,
  amount: SkewbMoveAmount,
  turn: () => void,
): void => {
  for (let index = 0; index < amount; index += 1) {
    turn();
  }
};

const validateMove = (move: SkewbMove): SkewbMove => {
  if (typeof move !== 'object' || move === null) {
    throw new InvalidMoveError(MALFORMED_MOVE, 'skewb');
  }

  if (isSkewbAxis(move.face) && isMoveAmount(move.amount)) {
    return move;
  }

  throw new InvalidMoveError(MALFORMED_MOVE, 'skewb');
};

export const createSolvedSkewbState = (): SkewbState =>
  createSkewbState(
    SKEWB_FACES.map((_, face) =>
      Array<SkewbFacelet>(STICKERS_PER_FACE).fill(face),
    ),
  );

export const applySkewbMove = (
  state: SkewbState,
  move: SkewbMove,
): SkewbState => {
  const validMove = validateMove(move);
  const nextImage = cloneSkewbImage(state.image);
  const axis = axisIndex(validMove.face);

  applyRepeatedTurns(nextImage, validMove.amount, () => turnOnce(nextImage, axis));

  return createSkewbState(nextImage);
};

export const areSkewbStatesEqual = (
  a: SkewbState,
  b: SkewbState,
): boolean =>
  a.image.every((face, faceIndexValue) =>
    face.every(
      (sticker, stickerIndex) =>
        sticker === b.image[faceIndexValue]?.[stickerIndex],
    ),
  );

export type { SkewbFace };
