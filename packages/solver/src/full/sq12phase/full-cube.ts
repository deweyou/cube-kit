import type { SquareOneState } from '@cubegin/scramble-puzzle';
import type { RandomSource } from '../../random-source.js';
import { getShape2Idx, getShapeTables } from './shape.js';
import { createSquareCoordinate, get8Perm, type SquareCoordinate } from './square.js';

const ERROR_PREFIX = '@cubegin/solver';

const SOLVED_UL = 0x011233;
const SOLVED_UR = 0x455677;
const SOLVED_DL = 0x998bba;
const SOLVED_DR = 0xddcffe;
const FACE_MASK = 0xffffff;

const SQUARE_ONE_TO_FULL_CUBE_PIECE = [
  3, 2, 1, 0, 7, 6, 5, 4, 0xa, 0xb, 8, 9, 0xe, 0xf, 0xc, 0xd,
] as const;
const SQUARE_ONE_TO_FULL_CUBE_POSITION = [
  5, 4, 3, 2, 1, 0, 11, 10, 9, 8, 7, 6, 17, 16, 15, 14, 13, 12, 23, 22, 21, 20, 19, 18,
] as const;

export interface SquareOneCoordinateState {
  readonly shapeIndex: number;
  readonly cornerPermutation: readonly number[];
  readonly edgePermutation: readonly number[];
  readonly middleLayer: 0 | 1;
}

export class FullCube {
  private permutationScratch = Array.from({ length: 8 }, () => 0);
  private parityScratch = Array.from({ length: 16 }, () => 0);

  ul = SOLVED_UL;
  ur = SOLVED_UR;
  dl = SOLVED_DL;
  dr = SOLVED_DR;
  ml = 0;

  static randomCube(random: RandomSource): FullCube {
    const { shapeIdx } = getShapeTables();
    const shape = shapeIdx[drawRandomInt(random, 3678)];
    const cube = new FullCube();
    let corners = (0x01234567 << 1) | 0x11111111;
    let edges = 0x01234567 << 1;
    let remainingCorners = 8;
    let remainingEdges = 8;

    for (let index = 0; index < 24; index += 1) {
      if (((shape >> index) & 1) === 0) {
        const randomEdge = drawRandomInt(random, remainingEdges) << 2;
        cube.setPiece(23 - index, (edges >> randomEdge) & 0xf);
        edges = removeNibble(edges, randomEdge);
        remainingEdges -= 1;
      } else {
        const randomCorner = drawRandomInt(random, remainingCorners) << 2;
        const corner = (corners >> randomCorner) & 0xf;
        cube.setPiece(23 - index, corner);
        cube.setPiece(22 - index, corner);
        corners = removeNibble(corners, randomCorner);
        remainingCorners -= 1;
        index += 1;
      }
    }

    cube.ml = drawRandomInt(random, 2);

    return cube;
  }

  static fromCoordinates(state: SquareOneCoordinateState): FullCube {
    validatePermutation('cornerPermutation', state.cornerPermutation);
    validatePermutation('edgePermutation', state.edgePermutation);
    if (state.middleLayer !== 0 && state.middleLayer !== 1) {
      throw new RangeError(`${ERROR_PREFIX}: Square-1 middleLayer must be 0 or 1`);
    }

    const { shapeIdx } = getShapeTables();
    if (
      !Number.isSafeInteger(state.shapeIndex) ||
      state.shapeIndex < 0 ||
      state.shapeIndex >= shapeIdx.length
    ) {
      throw new RangeError(
        `${ERROR_PREFIX}: Square-1 shapeIndex must be an integer from 0 to ${shapeIdx.length - 1}`,
      );
    }

    const shape = shapeIdx[state.shapeIndex] as number;
    const cube = new FullCube();
    let cornerIndex = 0;
    let edgeIndex = 0;
    for (let index = 0; index < 24; index += 1) {
      if (((shape >> index) & 1) === 0) {
        cube.setPiece(23 - index, (state.edgePermutation[edgeIndex] as number) << 1);
        edgeIndex += 1;
      } else {
        const corner = ((state.cornerPermutation[cornerIndex] as number) << 1) | 1;
        cube.setPiece(23 - index, corner);
        cube.setPiece(22 - index, corner);
        cornerIndex += 1;
        index += 1;
      }
    }
    cube.ml = state.middleLayer;
    return cube;
  }

  static fromSquareOneState(state: SquareOneState): FullCube {
    const cube = new FullCube();

    for (let index = 0; index < 24; index += 1) {
      cube.setPiece(
        SQUARE_ONE_TO_FULL_CUBE_POSITION[index],
        SQUARE_ONE_TO_FULL_CUBE_PIECE[state.pieces[index]],
      );
    }

    cube.setPiece(24, state.sliceSolved ? 0 : 1);

    return cube;
  }

  copy(cube: FullCube): void {
    this.ul = cube.ul;
    this.ur = cube.ur;
    this.dl = cube.dl;
    this.dr = cube.dr;
    this.ml = cube.ml;
  }

  isSolved(): boolean {
    return (
      this.ul === SOLVED_UL &&
      this.ur === SOLVED_UR &&
      this.dl === SOLVED_DL &&
      this.dr === SOLVED_DR &&
      this.ml === 0
    );
  }

  doMove(move: number): void {
    let turn = move << 2;

    if (turn > 24) {
      turn = 48 - turn;
      const oldUl = this.ul;
      this.ul = ((this.ul >> turn) | (this.ur << (24 - turn))) & FACE_MASK;
      this.ur = ((this.ur >> turn) | (oldUl << (24 - turn))) & FACE_MASK;
    } else if (turn > 0) {
      const oldUl = this.ul;
      this.ul = ((this.ul << turn) | (this.ur >> (24 - turn))) & FACE_MASK;
      this.ur = ((this.ur << turn) | (oldUl >> (24 - turn))) & FACE_MASK;
    } else if (turn === 0) {
      const oldUr = this.ur;
      this.ur = this.dl;
      this.dl = oldUr;
      this.ml = 1 - this.ml;
    } else if (turn >= -24) {
      turn = -turn;
      const oldDl = this.dl;
      this.dl = ((this.dl << turn) | (this.dr >> (24 - turn))) & FACE_MASK;
      this.dr = ((this.dr << turn) | (oldDl >> (24 - turn))) & FACE_MASK;
    } else {
      turn = 48 + turn;
      const oldDl = this.dl;
      this.dl = ((this.dl >> turn) | (this.dr << (24 - turn))) & FACE_MASK;
      this.dr = ((this.dr >> turn) | (oldDl << (24 - turn))) & FACE_MASK;
    }
  }

  setPiece(index: number, value: number): void {
    if (index < 6) {
      const shift = (5 - index) << 2;
      this.ul &= ~(0xf << shift);
      this.ul |= value << shift;
    } else if (index < 12) {
      const shift = (11 - index) << 2;
      this.ur &= ~(0xf << shift);
      this.ur |= value << shift;
    } else if (index < 18) {
      const shift = (17 - index) << 2;
      this.dl &= ~(0xf << shift);
      this.dl |= value << shift;
    } else if (index < 24) {
      const shift = (23 - index) << 2;
      this.dr &= ~(0xf << shift);
      this.dr |= value << shift;
    } else {
      this.ml = value;
    }
  }

  getShapeIdx(): number {
    const urShape = extractShapeBits(this.ur);
    const ulShape = extractShapeBits(this.ul);
    const drShape = extractShapeBits(this.dr);
    const dlShape = extractShapeBits(this.dl);

    return getShape2Idx(
      (this.getParity() << 24) | (ulShape << 18) | (urShape << 12) | (dlShape << 6) | drShape,
    );
  }

  getShapeIndex(): number {
    return this.getShapeIdx() >> 1;
  }

  getParity(): number {
    const pieces = this.parityScratch;
    let pieceCount = 0;
    pieces[0] = this.pieceAt(0);

    for (let index = 1; index < 24; index += 1) {
      const piece = this.pieceAt(index);
      if (piece !== pieces[pieceCount]) {
        pieceCount += 1;
        pieces[pieceCount] = piece;
      }
    }

    let parity = 0;
    for (let first = 0; first < 16; first += 1) {
      for (let second = first + 1; second < 16; second += 1) {
        if ((pieces[first] as number) > (pieces[second] as number)) {
          parity ^= 1;
        }
      }
    }

    return parity;
  }

  pieces(): readonly number[] {
    return Array.from({ length: 24 }, (_, index) => this.pieceAt(index));
  }

  getSquare(square: SquareCoordinate = createSquareCoordinate()): SquareCoordinate {
    const pieces = this.permutationScratch;

    for (let index = 0; index < 8; index += 1) {
      pieces[index] = this.pieceAt(index * 3 + 1) >> 1;
    }
    square.cornPerm = get8Perm(pieces);

    square.topEdgeFirst = this.pieceAt(0) === this.pieceAt(1);
    let position = square.topEdgeFirst ? 2 : 0;
    let pieceIndex = 0;
    for (; pieceIndex < 4; position += 3, pieceIndex += 1) {
      pieces[pieceIndex] = this.pieceAt(position) >> 1;
    }

    square.botEdgeFirst = this.pieceAt(12) === this.pieceAt(13);
    position = square.botEdgeFirst ? 14 : 12;
    for (; pieceIndex < 8; position += 3, pieceIndex += 1) {
      pieces[pieceIndex] = this.pieceAt(position) >> 1;
    }

    square.edgePerm = get8Perm(pieces);
    square.ml = this.ml;

    return square;
  }

  private pieceAt(index: number): number {
    let piece: number;

    if (index < 6) {
      piece = this.ul >> ((5 - index) << 2);
    } else if (index < 12) {
      piece = this.ur >> ((11 - index) << 2);
    } else if (index < 18) {
      piece = this.dl >> ((17 - index) << 2);
    } else {
      piece = this.dr >> ((23 - index) << 2);
    }

    return piece & 0xf;
  }
}

const extractShapeBits = (face: number): number => {
  let shape = face & 0x111111;
  shape |= shape >> 3;
  shape |= shape >> 6;

  return (shape & 0xf) | ((shape >> 12) & 0x30);
};

const removeNibble = (value: number, shift: number): number => {
  const mask = (1 << shift) - 1;

  return (value & mask) + ((value >> 4) & ~mask);
};

const drawRandomInt = (random: RandomSource, maxExclusive: number): number => {
  const value = random.nextInt(maxExclusive);
  if (!Number.isSafeInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError(
      `${ERROR_PREFIX}: Square-1 random source returned ${value} for max ${maxExclusive}`,
    );
  }

  return value;
};

const validatePermutation = (name: string, permutation: readonly number[]): void => {
  if (
    permutation.length !== 8 ||
    new Set(permutation).size !== 8 ||
    permutation.some((piece) => !Number.isSafeInteger(piece) || piece < 0 || piece >= 8)
  ) {
    throw new RangeError(`${ERROR_PREFIX}: Square-1 ${name} must contain 0 through 7 once`);
  }
};
