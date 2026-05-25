import { InvalidMoveError } from '../errors.js';
import type { CubeFace, CubeMove } from './cube-move.js';

const CUBE_FACES = ['R', 'U', 'F', 'L', 'D', 'B'] as const;

type MutableCubeImage = CubeFacelet[][][];

export type CubeFacelet = CubeFace;
export type CubeFaceState = readonly CubeFacelet[][];
export type CubeImage = readonly CubeFaceState[];

export interface CubeState {
  size: number;
  image: CubeImage;
}

const faceIndex = (face: CubeFace): number => CUBE_FACES.indexOf(face);

const oppositeFace = (face: CubeFace): CubeFace =>
  CUBE_FACES[(faceIndex(face) + 3) % CUBE_FACES.length];

const cloneCubeImage = (image: CubeImage): MutableCubeImage =>
  image.map((face) => face.map((row) => [...row]));

const swap = (
  image: MutableCubeImage,
  first: readonly [number, number, number],
  second: readonly [number, number, number],
  third: readonly [number, number, number],
  fourth: readonly [number, number, number],
  direction: 1 | 3,
): void => {
  const [firstFace, firstRow, firstColumn] = first;
  const [secondFace, secondRow, secondColumn] = second;
  const [thirdFace, thirdRow, thirdColumn] = third;
  const [fourthFace, fourthRow, fourthColumn] = fourth;
  if (direction === 1) {
    const firstSticker = image[firstFace][firstRow][firstColumn];

    image[firstFace][firstRow][firstColumn] =
      image[secondFace][secondRow][secondColumn];
    image[secondFace][secondRow][secondColumn] =
      image[thirdFace][thirdRow][thirdColumn];
    image[thirdFace][thirdRow][thirdColumn] =
      image[fourthFace][fourthRow][fourthColumn];
    image[fourthFace][fourthRow][fourthColumn] = firstSticker;
  } else {
    const fourthSticker = image[fourthFace][fourthRow][fourthColumn];

    image[fourthFace][fourthRow][fourthColumn] =
      image[thirdFace][thirdRow][thirdColumn];
    image[thirdFace][thirdRow][thirdColumn] =
      image[secondFace][secondRow][secondColumn];
    image[secondFace][secondRow][secondColumn] =
      image[firstFace][firstRow][firstColumn];
    image[firstFace][firstRow][firstColumn] = fourthSticker;
  }
};

const rotateFace = (
  image: MutableCubeImage,
  face: CubeFace,
  direction: 1 | 3,
): void => {
  const size = image[0].length;
  const facePosition = faceIndex(face);

  for (let row = 0; row < (size + 1) / 2; row += 1) {
    for (let column = 0; column < size / 2; column += 1) {
      const cycle = [
        [facePosition, row, column],
        [facePosition, column, size - 1 - row],
        [facePosition, size - 1 - row, size - 1 - column],
        [facePosition, size - 1 - column, row],
      ] as const;

      if (direction === 1) {
        swap(image, cycle[0], cycle[1], cycle[2], cycle[3], 1);
      } else {
        swap(image, cycle[0], cycle[1], cycle[2], cycle[3], 3);
      }
    }
  }
};

const slice = (
  face: CubeFace,
  sliceIndex: number,
  image: MutableCubeImage,
): void => {
  const size = image[0].length;
  let sliceFace = face;
  let stateSliceIndex = sliceIndex;
  let direction: 1 | 3 = 1;

  if (face !== 'L' && face !== 'D' && face !== 'B') {
    sliceFace = oppositeFace(face);
    stateSliceIndex = size - 1 - sliceIndex;
    direction = 3;
  }

  for (let position = 0; position < size; position += 1) {
    if (sliceFace === 'L') {
      swap(
        image,
        [faceIndex('U'), position, stateSliceIndex],
        [faceIndex('B'), size - 1 - position, size - 1 - stateSliceIndex],
        [faceIndex('D'), position, stateSliceIndex],
        [faceIndex('F'), position, stateSliceIndex],
        direction,
      );
    } else if (sliceFace === 'D') {
      swap(
        image,
        [faceIndex('L'), size - 1 - stateSliceIndex, position],
        [faceIndex('B'), size - 1 - stateSliceIndex, position],
        [faceIndex('R'), size - 1 - stateSliceIndex, position],
        [faceIndex('F'), size - 1 - stateSliceIndex, position],
        direction,
      );
    } else {
      swap(
        image,
        [faceIndex('U'), stateSliceIndex, position],
        [faceIndex('R'), position, size - 1 - stateSliceIndex],
        [faceIndex('D'), size - 1 - stateSliceIndex, size - 1 - position],
        [faceIndex('L'), size - 1 - position, stateSliceIndex],
        direction,
      );
    }
  }

  if (sliceIndex === 0) {
    rotateFace(image, face, 3);
  } else if (sliceIndex === size - 1) {
    rotateFace(image, oppositeFace(face), 1);
  }
};

const moveSuffix = (amount: CubeMove['amount']): string => {
  if (amount === 2) return '2';
  if (amount === 3) return "'";
  return '';
};

const rotationName = (face: CubeFace): string => {
  if (face === 'R') return 'x';
  if (face === 'U') return 'y';
  if (face === 'F') return 'z';
  return face;
};

const moveToString = (move: CubeMove): string => {
  if (move.isRotation) {
    return `${rotationName(move.face)}${moveSuffix(move.amount)}`;
  }
  if (move.width === 1) return `${move.face}${moveSuffix(move.amount)}`;
  return `${move.width}${move.face}w${moveSuffix(move.amount)}`;
};

const validateMove = (state: CubeState, move: CubeMove): void => {
  if (move.isRotation) {
    if (
      move.width !== Number.POSITIVE_INFINITY ||
      (move.face !== 'R' && move.face !== 'U' && move.face !== 'F')
    ) {
      throw new InvalidMoveError(moveToString(move), 'cube');
    }
    return;
  }

  if (
    !Number.isSafeInteger(move.width) ||
    move.width < 1 ||
    move.width > state.size
  ) {
    throw new InvalidMoveError(moveToString(move), 'cube');
  }
};

export const createSolvedCubeState = (size: number): CubeState => {
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new RangeError(`cube size must be a positive integer: ${size}`);
  }

  return {
    size,
    image: CUBE_FACES.map((face) =>
      Array.from({ length: size }, () => Array<CubeFacelet>(size).fill(face)),
    ),
  };
};

export const applyCubeMove = (state: CubeState, move: CubeMove): CubeState => {
  validateMove(state, move);

  const nextImage = cloneCubeImage(state.image);
  const width = move.isRotation ? state.size : move.width;

  for (let turn = 0; turn < move.amount; turn += 1) {
    for (let sliceIndex = 0; sliceIndex < width; sliceIndex += 1) {
      slice(move.face, sliceIndex, nextImage);
    }
  }

  return {
    size: state.size,
    image: nextImage,
  };
};

export const areCubeStatesEqual = (a: CubeState, b: CubeState): boolean => {
  if (a.size !== b.size) return false;

  for (let face = 0; face < CUBE_FACES.length; face += 1) {
    for (let row = 0; row < a.size; row += 1) {
      for (let column = 0; column < a.size; column += 1) {
        if (a.image[face][row][column] !== b.image[face][row][column]) {
          return false;
        }
      }
    }
  }

  return true;
};
