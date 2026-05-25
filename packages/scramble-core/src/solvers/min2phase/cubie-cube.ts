import { SOLVED_FACE_CUBE } from './util.js';

const CORNER_FACELET = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
] as const;

const EDGE_FACELET = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
] as const;

const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

export class CubieCube {
  readonly cp: number[];
  readonly co: number[];
  readonly ep: number[];
  readonly eo: number[];

  constructor(
    cp: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7],
    co: readonly number[] = [0, 0, 0, 0, 0, 0, 0, 0],
    ep: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: readonly number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ) {
    this.cp = [...cp];
    this.co = [...co];
    this.ep = [...ep];
    this.eo = [...eo];
  }

  static solved(): CubieCube {
    return new CubieCube();
  }

  static fromCoordinates(
    cperm: number,
    twist: number,
    eperm: number,
    flip: number,
  ): CubieCube {
    const cube = new CubieCube();
    setNPerm(cube.cp, cperm, 8);
    setTwist(cube.co, twist);
    setNPerm(cube.ep, eperm, 12);
    setFlip(cube.eo, flip);

    return cube;
  }

  static fromFaceCube(facelets: string): CubieCube | null {
    if (facelets.length !== 54) return null;

    const centerColors = [
      facelets[4],
      facelets[13],
      facelets[22],
      facelets[31],
      facelets[40],
      facelets[49],
    ];
    const colors = [...facelets].map((facelet) => centerColors.indexOf(facelet));
    if (colors.some((color) => color < 0)) return null;

    const cp = Array<number>(8).fill(0);
    const co = Array<number>(8).fill(0);
    const ep = Array<number>(12).fill(0);
    const eo = Array<number>(12).fill(0);

    for (let corner = 0; corner < 8; corner += 1) {
      let orientation = 0;
      while (
        orientation < 3 &&
        colors[CORNER_FACELET[corner][orientation]] !== 0 &&
        colors[CORNER_FACELET[corner][orientation]] !== 3
      ) {
        orientation += 1;
      }
      if (orientation === 3) return null;

      const color1 = colors[CORNER_FACELET[corner][(orientation + 1) % 3]];
      const color2 = colors[CORNER_FACELET[corner][(orientation + 2) % 3]];
      const cubie = CORNER_FACELET.findIndex(
        ([, facelet1, facelet2]) =>
          color1 === Math.floor(facelet1 / 9) &&
          color2 === Math.floor(facelet2 / 9),
      );
      if (cubie < 0) return null;

      cp[corner] = cubie;
      co[corner] = orientation % 3;
    }

    for (let edge = 0; edge < 12; edge += 1) {
      const color0 = colors[EDGE_FACELET[edge][0]];
      const color1 = colors[EDGE_FACELET[edge][1]];
      const cubie = EDGE_FACELET.findIndex(
        ([facelet0, facelet1]) =>
          color0 === Math.floor(facelet0 / 9) &&
          color1 === Math.floor(facelet1 / 9),
      );
      if (cubie >= 0) {
        ep[edge] = cubie;
        eo[edge] = 0;
        continue;
      }

      const flippedCubie = EDGE_FACELET.findIndex(
        ([facelet0, facelet1]) =>
          color0 === Math.floor(facelet1 / 9) &&
          color1 === Math.floor(facelet0 / 9),
      );
      if (flippedCubie < 0) return null;

      ep[edge] = flippedCubie;
      eo[edge] = 1;
    }

    return new CubieCube(cp, co, ep, eo);
  }

  toFaceCube(): string {
    const facelets = [...SOLVED_FACE_CUBE];

    for (let corner = 0; corner < 8; corner += 1) {
      const cubie = this.cp[corner];
      const orientation = this.co[corner];

      for (let index = 0; index < 3; index += 1) {
        facelets[CORNER_FACELET[corner][(index + orientation) % 3]] =
          FACE_NAMES[Math.floor(CORNER_FACELET[cubie][index] / 9)] ?? 'U';
      }
    }

    for (let edge = 0; edge < 12; edge += 1) {
      const cubie = this.ep[edge];
      const orientation = this.eo[edge];

      for (let index = 0; index < 2; index += 1) {
        facelets[EDGE_FACELET[edge][(index + orientation) % 2]] =
          FACE_NAMES[Math.floor(EDGE_FACELET[cubie][index] / 9)] ?? 'U';
      }
    }

    return facelets.join('');
  }

  verify(): number {
    const edgeMask = this.ep.reduce((mask, edge) => mask | (1 << edge), 0);
    if (edgeMask !== 0xfff) return -2;
    if (this.eo.reduce((sum, orientation) => sum ^ orientation, 0) !== 0) {
      return -3;
    }

    const cornerMask = this.cp.reduce((mask, corner) => mask | (1 << corner), 0);
    if (cornerMask !== 0xff) return -4;
    if (this.co.reduce((sum, orientation) => sum + orientation, 0) % 3 !== 0) {
      return -5;
    }
    if ((getNParity(getNPerm(this.ep, 12), 12) ^ getNParity(getNPerm(this.cp, 8), 8)) !== 0) {
      return -6;
    }

    return 0;
  }
}

export const getNParity = (index: number, n: number): number => {
  let parity = 0;
  let value = index;

  for (let current = n - 2; current >= 0; current -= 1) {
    parity ^= value % (n - current);
    value = Math.floor(value / (n - current));
  }

  return parity & 1;
};

export const getNPerm = (permutation: readonly number[], n: number): number => {
  let index = 0;

  for (let i = 0; i < n; i += 1) {
    index *= n - i;
    for (let j = i + 1; j < n; j += 1) {
      if ((permutation[j] ?? 0) < (permutation[i] ?? 0)) index += 1;
    }
  }

  return index;
};

const setNPerm = (permutation: number[], index: number, n: number): void => {
  for (let i = n - 1; i >= 0; i -= 1) {
    permutation[i] = index % (n - i);
    index = Math.floor(index / (n - i));
    for (let j = i + 1; j < n; j += 1) {
      if ((permutation[j] ?? 0) >= (permutation[i] ?? 0)) {
        permutation[j] = (permutation[j] ?? 0) + 1;
      }
    }
  }
};

const setTwist = (orientations: number[], index: number): void => {
  let twist = 0;
  let value = index;

  for (let i = 6; i >= 0; i -= 1) {
    const orientation = value % 3;
    orientations[i] = orientation;
    twist += orientation;
    value = Math.floor(value / 3);
  }

  orientations[7] = (15 - twist) % 3;
};

const setFlip = (orientations: number[], index: number): void => {
  let parity = 0;
  let value = index;

  for (let i = 10; i >= 0; i -= 1) {
    const orientation = value & 1;
    orientations[i] = orientation;
    parity ^= orientation;
    value >>= 1;
  }

  orientations[11] = parity;
};

export const SOLVED_FACELETS = SOLVED_FACE_CUBE;
