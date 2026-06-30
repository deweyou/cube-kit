const U = 0;
const F = 9;
const BR = 18;
const BL = 27;
const D = 36;
const B = 45;
const R = 54;
const L = 63;

const IDENTITY_CORNERS = [0, 1, 2, 3, 4, 5] as const;
const IDENTITY_EDGES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const ZERO_CORNER_ORIENTATION = [0, 0, 0, 0, 0, 0] as const;

const CORNER_FACELETS = [
  [U + 0, R + 0, F + 0, L + 0],
  [U + 4, B + 8, BR + 4, R + 8],
  [U + 8, L + 4, BL + 8, B + 4],
  [BL + 0, D + 0, BR + 0, B + 0],
  [F + 4, D + 8, BL + 4, L + 8],
  [BR + 8, D + 4, F + 8, R + 4],
] as const;

const EDGE_FACELETS = [
  [U + 1, R + 3],
  [U + 3, L + 1],
  [U + 6, B + 6],
  [BL + 1, D + 3],
  [BR + 3, D + 1],
  [F + 6, D + 6],
  [F + 3, R + 1],
  [F + 1, L + 3],
  [BL + 6, L + 6],
  [BL + 3, B + 1],
  [BR + 1, B + 3],
  [BR + 6, R + 6],
] as const;

const CENTER_UF_FACELETS = [
  U + 2,
  U + 5,
  U + 7,
  F + 2,
  F + 5,
  F + 7,
  BR + 2,
  BR + 5,
  BR + 7,
  BL + 2,
  BL + 5,
  BL + 7,
] as const;

const CENTER_RL_FACELETS = [
  D + 2,
  D + 5,
  D + 7,
  B + 2,
  B + 5,
  B + 7,
  L + 2,
  L + 5,
  L + 7,
  R + 2,
  R + 5,
  R + 7,
] as const;

type FtoCubieArray6 = readonly number[];
type FtoCubieArray12 = readonly number[];

export class FtoCubie {
  cp: number[];
  co: number[];
  ep: number[];
  uf: number[];
  rl: number[];

  constructor(
    cp?: FtoCubieArray6,
    co?: FtoCubieArray6,
    ep?: FtoCubieArray12,
    uf?: FtoCubieArray12,
    rl?: FtoCubieArray12,
  ) {
    this.cp = [...(cp ?? IDENTITY_CORNERS)];
    this.co = [...(co ?? ZERO_CORNER_ORIENTATION)];
    this.ep = [...(ep ?? IDENTITY_EDGES)];
    this.uf = [...(uf ?? IDENTITY_EDGES)];
    this.rl = [...(rl ?? IDENTITY_EDGES)];
  }

  toFacelets(divisor = 9): number[] {
    const facelets: number[] = [];
    const cornerOrientations = this.co.map((orientation) => orientation * 2);

    fillFacelets(CORNER_FACELETS, facelets, this.cp, cornerOrientations, divisor);
    fillFacelets(EDGE_FACELETS, facelets, this.ep, [], divisor);
    fillFacelets(CENTER_UF_FACELETS, facelets, this.uf, null, divisor);
    fillFacelets(CENTER_RL_FACELETS, facelets, this.rl, null, divisor);

    return facelets;
  }

  static multiply(...factors: readonly (FtoCubie | null | undefined)[]): FtoCubie {
    const output = factors.at(-1) ?? new FtoCubie();
    const inputs = factors.slice(0, -1).filter((factor): factor is FtoCubie => factor != null);
    let accumulated = inputs.at(-1)?.clone() ?? new FtoCubie();

    for (let index = inputs.length - 2; index >= 0; index -= 1) {
      accumulated = composeCubies(inputs[index], accumulated);
    }

    copyCubie(accumulated, output);
    return output;
  }

  clone(): FtoCubie {
    return new FtoCubie(this.cp, this.co, this.ep, this.uf, this.rl);
  }
}

const fillFacelets = (
  pieces: readonly (readonly number[] | number)[],
  facelets: number[],
  permutation: readonly number[],
  orientation: readonly number[] | null,
  divisor: number,
): void => {
  for (let index = 0; index < pieces.length; index += 1) {
    const cubie = pieces[index];
    const sourceIndex = permutation[index] ?? index;

    if (typeof cubie === 'number') {
      facelets[cubie] = Math.trunc((pieces[sourceIndex] as number) / divisor);
      continue;
    }

    const sourceCubie = pieces[sourceIndex] as readonly number[];
    const cubieOrientation = orientation?.[index] ?? 0;

    for (let sticker = 0; sticker < cubie.length; sticker += 1) {
      facelets[cubie[(sticker + cubieOrientation) % cubie.length]] = Math.trunc(
        sourceCubie[sticker] / divisor,
      );
    }
  }
};

const composeCubies = (a: FtoCubie, b: FtoCubie): FtoCubie => {
  const product = new FtoCubie();

  for (let index = 0; index < 6; index += 1) {
    product.co[index] = a.co[b.cp[index]] ^ b.co[index];
    product.cp[index] = a.cp[b.cp[index]];
  }

  for (let index = 0; index < 12; index += 1) {
    product.ep[index] = a.ep[b.ep[index]];
    product.uf[index] = a.uf[b.uf[index]];
    product.rl[index] = a.rl[b.rl[index]];
  }

  return product;
};

const copyCubie = (source: FtoCubie, target: FtoCubie): void => {
  target.cp = [...source.cp];
  target.co = [...source.co];
  target.ep = [...source.ep];
  target.uf = [...source.uf];
  target.rl = [...source.rl];
};

const createFtoMoveCubies = (): readonly FtoCubie[] => {
  const moveCubies: FtoCubie[] = [];
  const rotU = new FtoCubie(
    [1, 2, 0, 4, 5, 3],
    [0, 0, 0, 0, 0, 0],
    [2, 0, 1, 5, 3, 4, 10, 11, 6, 7, 8, 9],
    [1, 2, 0, 7, 8, 6, 10, 11, 9, 4, 5, 3],
    [2, 0, 1, 8, 6, 7, 11, 9, 10, 5, 3, 4],
  );
  const rotR = new FtoCubie(
    [5, 0, 4, 2, 3, 1],
    [1, 1, 0, 1, 1, 0],
    [6, 5, 7, 9, 2, 10, 11, 4, 3, 8, 1, 0],
    [5, 3, 4, 8, 6, 7, 2, 0, 1, 11, 9, 10],
    [4, 5, 3, 7, 8, 6, 1, 2, 0, 10, 11, 9],
  );
  const rotUi = FtoCubie.multiply(rotU, rotU, null);
  const rotRi = FtoCubie.multiply(rotR, rotR, null);
  const rotL = FtoCubie.multiply(rotUi, rotR, rotU, null);
  const rotF = FtoCubie.multiply(rotR, rotU, rotRi, null);

  moveCubies[0] = new FtoCubie(
    [1, 2, 0, 3, 4, 5],
    [0, 0, 0, 0, 0, 0],
    [2, 0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [1, 2, 0, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [0, 1, 2, 3, 6, 7, 11, 9, 8, 5, 10, 4],
  );
  moveCubies[2] = new FtoCubie(
    [4, 1, 2, 3, 5, 0],
    [1, 0, 0, 0, 1, 0],
    [0, 1, 2, 3, 4, 6, 7, 5, 8, 9, 10, 11],
    [0, 1, 2, 4, 5, 3, 6, 7, 8, 9, 10, 11],
    [0, 9, 10, 3, 4, 5, 2, 7, 1, 8, 6, 11],
  );
  moveCubies[4] = new FtoCubie(
    [0, 5, 2, 1, 4, 3],
    [0, 1, 0, 0, 0, 1],
    [0, 1, 2, 3, 10, 5, 6, 7, 8, 9, 11, 4],
    [0, 1, 2, 3, 4, 5, 7, 8, 6, 9, 10, 11],
    [5, 3, 2, 11, 4, 10, 6, 7, 8, 9, 0, 1],
  );
  moveCubies[6] = new FtoCubie(
    [0, 1, 3, 4, 2, 5],
    [0, 0, 1, 1, 0, 0],
    [0, 1, 2, 8, 4, 5, 6, 7, 9, 3, 10, 11],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 9],
    [8, 1, 7, 2, 0, 5, 6, 3, 4, 9, 10, 11],
  );
  moveCubies[8] = new FtoCubie(
    [0, 1, 2, 5, 3, 4],
    [0, 0, 0, 0, 0, 0],
    [0, 1, 2, 4, 5, 3, 6, 7, 8, 9, 10, 11],
    [0, 1, 2, 3, 9, 10, 5, 7, 4, 8, 6, 11],
    [1, 2, 0, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  );
  moveCubies[10] = new FtoCubie(
    [0, 3, 1, 2, 4, 5],
    [0, 1, 1, 0, 0, 0],
    [0, 1, 10, 3, 4, 5, 6, 7, 8, 2, 9, 11],
    [0, 6, 7, 3, 4, 5, 11, 9, 8, 2, 10, 1],
    [0, 1, 2, 4, 5, 3, 6, 7, 8, 9, 10, 11],
  );
  moveCubies[12] = new FtoCubie(
    [5, 0, 2, 3, 4, 1],
    [1, 1, 0, 0, 0, 0],
    [6, 1, 2, 3, 4, 5, 11, 7, 8, 9, 10, 0],
    [5, 3, 2, 8, 4, 7, 6, 0, 1, 9, 10, 11],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 9],
  );
  moveCubies[14] = new FtoCubie(
    [2, 1, 4, 3, 0, 5],
    [1, 0, 1, 0, 0, 0],
    [0, 8, 2, 3, 4, 5, 6, 1, 7, 9, 10, 11],
    [11, 1, 10, 2, 0, 5, 6, 7, 8, 9, 3, 4],
    [0, 1, 2, 3, 4, 5, 7, 8, 6, 9, 10, 11],
  );
  moveCubies[16] = FtoCubie.multiply(rotU, moveCubies[8], null);
  moveCubies[18] = FtoCubie.multiply(rotF, moveCubies[10], null);
  moveCubies[20] = FtoCubie.multiply(rotR, moveCubies[6], null);
  moveCubies[22] = FtoCubie.multiply(rotL, moveCubies[4], null);

  for (let index = 1; index < 24; index += 2) {
    moveCubies[index] = FtoCubie.multiply(moveCubies[index - 1], moveCubies[index - 1], null);
  }

  return Object.freeze(moveCubies);
};

export const FTO_MOVE_CUBIES = createFtoMoveCubies();

export const FTO_MOVE_FACE_TO_INDEX = {
  U: 0,
  F: 2,
  BR: 4,
  BL: 6,
  D: 8,
  B: 10,
  R: 12,
  L: 14,
} as const;

export const FTO_FACELET_SOURCE_BY_TARGET = Object.freeze(
  Array.from({ length: 16 }, (_, moveIndex) =>
    Object.freeze(FTO_MOVE_CUBIES[moveIndex].toFacelets(1)),
  ),
);
