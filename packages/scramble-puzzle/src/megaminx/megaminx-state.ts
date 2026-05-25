import { InvalidMoveError } from '../errors.js';
import {
  MEGAMINX_FACES,
  type MegaminxBigTurnName,
  type MegaminxFace,
  type MegaminxMove,
  type MegaminxMoveAmount,
} from './megaminx-parser.js';

export type MegaminxFacelet = number;
export type MegaminxFaceState = readonly MegaminxFacelet[];
export type MegaminxImage = readonly MegaminxFaceState[];

export interface MegaminxState {
  readonly image: MegaminxImage;
}

type MutableMegaminxImage = MegaminxFacelet[][];
type StickerReference = readonly [number, number];

const CENTER_INDEX = 10;
const STICKERS_PER_FACE = 11;
const MALFORMED_MOVE = '<malformed>';

const faceIndex = (face: MegaminxFace): number => MEGAMINX_FACES.indexOf(face);

const isMoveAmount = (amount: unknown): amount is MegaminxMoveAmount =>
  amount === 1 || amount === 2 || amount === 3 || amount === 4;

const isMegaminxFace = (face: unknown): face is MegaminxFace =>
  typeof face === 'string' && MEGAMINX_FACES.includes(face as MegaminxFace);

const isBigTurnName = (name: unknown): name is MegaminxBigTurnName =>
  name === 'R' || name === 'D';

const cloneMegaminxImage = (image: MegaminxImage): MutableMegaminxImage =>
  image.map((face) => [...face]);

const freezeMegaminxImage = (
  image: MutableMegaminxImage,
): MegaminxImage => {
  const frozenFaces = image.map((face) => Object.freeze([...face]));

  return Object.freeze(frozenFaces);
};

const createMegaminxState = (image: MutableMegaminxImage): MegaminxState => {
  if (
    image.length !== MEGAMINX_FACES.length ||
    image.some((face) => face.length !== STICKERS_PER_FACE)
  ) {
    throw new RangeError('megaminx state must contain 12 faces of 11 stickers');
  }

  return Object.freeze({
    image: freezeMegaminxImage(image),
  });
};

const cycleStickers = (
  image: MutableMegaminxImage,
  first: StickerReference,
  second: StickerReference,
  third: StickerReference,
  fourth: StickerReference,
  fifth: StickerReference,
): void => {
  const [firstFace, firstSticker] = first;
  const [secondFace, secondSticker] = second;
  const [thirdFace, thirdSticker] = third;
  const [fourthFace, fourthSticker] = fourth;
  const [fifthFace, fifthSticker] = fifth;
  const savedSticker = image[firstFace][firstSticker];

  image[firstFace][firstSticker] = image[secondFace][secondSticker];
  image[secondFace][secondSticker] = image[thirdFace][thirdSticker];
  image[thirdFace][thirdSticker] = image[fourthFace][fourthSticker];
  image[fourthFace][fourthSticker] = image[fifthFace][fifthSticker];
  image[fifthFace][fifthSticker] = savedSticker;
};

const swapOnSide = (
  image: MutableMegaminxImage,
  base: 0 | 6,
  firstFace: number,
  firstSticker: number,
  secondFace: number,
  secondSticker: number,
  thirdFace: number,
  thirdSticker: number,
  fourthFace: number,
  fourthSticker: number,
  fifthFace: number,
  fifthSticker: number,
): void => {
  for (let index = 0; index < 3; index += 1) {
    cycleStickers(
      image,
      [(firstFace + base) % 12, (firstSticker + index) % 10],
      [(secondFace + base) % 12, (secondSticker + index) % 10],
      [(thirdFace + base) % 12, (thirdSticker + index) % 10],
      [(fourthFace + base) % 12, (fourthSticker + index) % 10],
      [(fifthFace + base) % 12, (fifthSticker + index) % 10],
    );
  }
};

const swapOnFace = (
  image: MutableMegaminxImage,
  face: number,
  first: number,
  second: number,
  third: number,
  fourth: number,
  fifth: number,
): void => {
  cycleStickers(
    image,
    [face, first],
    [face, second],
    [face, third],
    [face, fourth],
    [face, fifth],
  );
};

const rotateFaceOnce = (
  image: MutableMegaminxImage,
  face: MegaminxFace,
): void => {
  const position = faceIndex(face);

  swapOnFace(image, position, 0, 8, 6, 4, 2);
  swapOnFace(image, position, 1, 9, 7, 5, 3);
};

const turnFaceOnce = (
  image: MutableMegaminxImage,
  face: MegaminxFace,
): void => {
  const position = faceIndex(face);
  const base: 0 | 6 = position >= 6 ? 6 : 0;

  switch (position % 6) {
    case 0:
      swapOnSide(image, base, 1, 6, 5, 4, 4, 2, 3, 0, 2, 8);
      break;
    case 1:
      swapOnSide(image, base, 0, 0, 2, 0, 9, 6, 10, 6, 5, 2);
      break;
    case 2:
      swapOnSide(image, base, 0, 2, 3, 2, 8, 4, 9, 4, 1, 4);
      break;
    case 3:
      swapOnSide(image, base, 0, 4, 4, 4, 7, 2, 8, 2, 2, 6);
      break;
    case 4:
      swapOnSide(image, base, 0, 6, 5, 6, 11, 0, 7, 0, 3, 8);
      break;
    case 5:
      swapOnSide(image, base, 0, 8, 1, 8, 10, 8, 11, 8, 4, 0);
      break;
  }

  rotateFaceOnce(image, face);
};

const applyRepeatedTurns = (
  image: MutableMegaminxImage,
  amount: MegaminxMoveAmount,
  turn: () => void,
): void => {
  for (let index = 0; index < amount; index += 1) {
    turn();
  }
};

const cycleCenters = (
  image: MutableMegaminxImage,
  firstFace: number,
  secondFace: number,
  thirdFace: number,
  fourthFace: number,
  fifthFace: number,
): void => {
  cycleStickers(
    image,
    [firstFace, CENTER_INDEX],
    [secondFace, CENTER_INDEX],
    [thirdFace, CENTER_INDEX],
    [fourthFace, CENTER_INDEX],
    [fifthFace, CENTER_INDEX],
  );
};

const swapWholeFace = (
  image: MutableMegaminxImage,
  firstFace: number,
  firstSticker: number,
  secondFace: number,
  secondSticker: number,
  thirdFace: number,
  thirdSticker: number,
  fourthFace: number,
  fourthSticker: number,
  fifthFace: number,
  fifthSticker: number,
): void => {
  for (let index = 0; index < 10; index += 1) {
    cycleStickers(
      image,
      [firstFace, (firstSticker + index) % 10],
      [secondFace, (secondSticker + index) % 10],
      [thirdFace, (thirdSticker + index) % 10],
      [fourthFace, (fourthSticker + index) % 10],
      [fifthFace, (fifthSticker + index) % 10],
    );
  }

  cycleCenters(image, firstFace, secondFace, thirdFace, fourthFace, fifthFace);
};

const bigTurnOnce = (
  image: MutableMegaminxImage,
  face: 'D' | 'DBR',
): void => {
  if (face === 'DBR') {
    for (let index = 0; index < 7; index += 1) {
      cycleStickers(
        image,
        [0, (1 + index) % 10],
        [4, (3 + index) % 10],
        [11, (1 + index) % 10],
        [10, (1 + index) % 10],
        [1, (1 + index) % 10],
      );
    }

    cycleCenters(image, 0, 4, 11, 10, 1);
    swapWholeFace(image, 2, 0, 3, 0, 7, 0, 6, 8, 9, 8);
    rotateFaceOnce(image, 'DBR');
    return;
  }

  for (let index = 0; index < 7; index += 1) {
    cycleStickers(
      image,
      [1, (9 + index) % 10],
      [2, (1 + index) % 10],
      [3, (3 + index) % 10],
      [4, (5 + index) % 10],
      [5, (7 + index) % 10],
    );
  }

  cycleCenters(image, 1, 2, 3, 4, 5);
  swapWholeFace(image, 11, 0, 10, 8, 9, 6, 8, 4, 7, 2);
  rotateFaceOnce(image, 'D');
};

const bigTurnFace = (name: MegaminxBigTurnName): 'D' | 'DBR' =>
  name === 'R' ? 'DBR' : 'D';

const validateMove = (move: MegaminxMove): MegaminxMove => {
  if (typeof move !== 'object' || move === null) {
    throw new InvalidMoveError(MALFORMED_MOVE, 'megaminx');
  }

  if (move.type === 'face') {
    if (!isMegaminxFace(move.face) || !isMoveAmount(move.amount)) {
      throw new InvalidMoveError(MALFORMED_MOVE, 'megaminx');
    }

    return move;
  }

  if (
    move.type === 'big-turn' &&
    isBigTurnName(move.name) &&
    isMoveAmount(move.amount)
  ) {
    return move;
  }

  throw new InvalidMoveError(MALFORMED_MOVE, 'megaminx');
};

export const createSolvedMegaminxState = (): MegaminxState =>
  createMegaminxState(
    MEGAMINX_FACES.map((_, face) =>
      Array<MegaminxFacelet>(STICKERS_PER_FACE).fill(face),
    ),
  );

export const applyMegaminxMove = (
  state: MegaminxState,
  move: MegaminxMove,
): MegaminxState => {
  const validMove = validateMove(move);
  const nextImage = cloneMegaminxImage(state.image);

  if (validMove.type === 'face') {
    applyRepeatedTurns(nextImage, validMove.amount, () =>
      turnFaceOnce(nextImage, validMove.face),
    );
  } else {
    applyRepeatedTurns(nextImage, validMove.amount, () =>
      bigTurnOnce(nextImage, bigTurnFace(validMove.name)),
    );
  }

  return createMegaminxState(nextImage);
};

export const areMegaminxStatesEqual = (
  a: MegaminxState,
  b: MegaminxState,
): boolean =>
  a.image.every((face, faceIndexValue) =>
    face.every(
      (sticker, stickerIndex) =>
        sticker === b.image[faceIndexValue]?.[stickerIndex],
    ),
  );
