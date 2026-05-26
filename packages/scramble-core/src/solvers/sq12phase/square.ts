const N_PERMUTATIONS = 40320;
const N_MIDDLE_LAYER_STATES = N_PERMUTATIONS * 2;

const FACTORIAL = [1, 1, 2, 6, 24, 120, 720, 5040] as const;

export interface SquareCoordinate {
  edgePerm: number;
  cornPerm: number;
  topEdgeFirst: boolean;
  botEdgeFirst: boolean;
  ml: number;
}

export interface SquareTables {
  squarePrun: Int8Array;
  twistMove: Uint16Array;
  topMove: Uint16Array;
  bottomMove: Uint16Array;
}

let cachedTables: SquareTables | undefined;

export const createSquareCoordinate = (): SquareCoordinate => ({
  edgePerm: 0,
  cornPerm: 0,
  topEdgeFirst: false,
  botEdgeFirst: false,
  ml: 0,
});

export const set8Perm = (pieces: number[], permutation: number): void => {
  let remaining = permutation;
  let value = 0x76543210;

  for (let index = 0; index < 7; index += 1) {
    const factorial = FACTORIAL[7 - index];
    let piece = Math.floor(remaining / factorial);
    remaining -= piece * factorial;
    piece <<= 2;
    pieces[index] = (value >> piece) & 0x7;
    const mask = (1 << piece) - 1;
    value = (value & mask) + ((value >> 4) & ~mask);
  }

  pieces[7] = value;
};

export const get8Perm = (pieces: readonly number[]): number => {
  let permutation = 0;
  let value = 0x76543210;

  for (let index = 0; index < 7; index += 1) {
    const piece = pieces[index] << 2;
    permutation = (8 - index) * permutation + ((value >> piece) & 0x7);
    value -= 0x11111110 << piece;
  }

  return permutation;
};

const createCombinationTable = (): number[][] => {
  const combinations = Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => 0));

  for (let row = 0; row < 12; row += 1) {
    combinations[row][0] = 1;
    combinations[row][row] = 1;

    for (let column = 1; column < row; column += 1) {
      combinations[row][column] = combinations[row - 1][column - 1] + combinations[row - 1][column];
    }
  }

  return combinations;
};

export const get8Comb = (
  pieces: readonly number[],
  combinations = createCombinationTable(),
): number => {
  let combination = 0;
  let remaining = 4;

  for (let index = 0; index < 8; index += 1) {
    if (pieces[index] >= 4) {
      combination += combinations[7 - index][remaining];
      remaining -= 1;
    }
  }

  return combination;
};

const createMoveTables = (): Pick<SquareTables, 'twistMove' | 'topMove' | 'bottomMove'> => {
  const twistMove = new Uint16Array(N_PERMUTATIONS);
  const topMove = new Uint16Array(N_PERMUTATIONS);
  const bottomMove = new Uint16Array(N_PERMUTATIONS);
  const pieces = Array.from({ length: 8 }, () => 0);

  for (let permutation = 0; permutation < N_PERMUTATIONS; permutation += 1) {
    set8Perm(pieces, permutation);
    swap(pieces, 2, 4);
    swap(pieces, 3, 5);
    twistMove[permutation] = get8Perm(pieces);

    set8Perm(pieces, permutation);
    const topPiece = pieces[0];
    pieces[0] = pieces[1];
    pieces[1] = pieces[2];
    pieces[2] = pieces[3];
    pieces[3] = topPiece;
    topMove[permutation] = get8Perm(pieces);

    set8Perm(pieces, permutation);
    const bottomPiece = pieces[4];
    pieces[4] = pieces[5];
    pieces[5] = pieces[6];
    pieces[6] = pieces[7];
    pieces[7] = bottomPiece;
    bottomMove[permutation] = get8Perm(pieces);
  }

  return { twistMove, topMove, bottomMove };
};

const createPruningTable = ({
  twistMove,
  topMove,
  bottomMove,
}: Pick<SquareTables, 'twistMove' | 'topMove' | 'bottomMove'>): Int8Array => {
  const squarePrun = new Int8Array(N_MIDDLE_LAYER_STATES);
  squarePrun.fill(-1);
  squarePrun[0] = 0;

  let depth = 0;
  let done = 1;

  while (done < N_MIDDLE_LAYER_STATES) {
    const inverseFill = depth >= 11;
    const findValue = inverseFill ? -1 : depth;
    const checkValue = inverseFill ? depth : -1;
    depth += 1;

    for (let index = 0; index < N_MIDDLE_LAYER_STATES; index += 1) {
      if (squarePrun[index] !== findValue) continue;

      const ml = index & 1;
      let permutation = index >> 1;

      const twisted = (twistMove[permutation] << 1) | (1 - ml);
      if (squarePrun[twisted] === checkValue) {
        done += 1;
        squarePrun[inverseFill ? index : twisted] = depth;
        if (inverseFill) continue;
      }

      for (let move = 0; move < 4; move += 1) {
        permutation = topMove[permutation];
        const moved = (permutation << 1) | ml;
        if (squarePrun[moved] !== checkValue) continue;

        done += 1;
        squarePrun[inverseFill ? index : moved] = depth;
        if (inverseFill) break;
      }

      if (inverseFill && squarePrun[index] !== findValue) continue;

      for (let move = 0; move < 4; move += 1) {
        permutation = bottomMove[permutation];
        const moved = (permutation << 1) | ml;
        if (squarePrun[moved] !== checkValue) continue;

        done += 1;
        squarePrun[inverseFill ? index : moved] = depth;
        if (inverseFill) break;
      }
    }
  }

  return squarePrun;
};

export const getSquareTables = (): SquareTables => {
  cachedTables ??= (() => {
    const moveTables = createMoveTables();

    return {
      ...moveTables,
      squarePrun: createPruningTable(moveTables),
    };
  })();

  return cachedTables;
};

const swap = (pieces: number[], first: number, second: number): void => {
  const piece = pieces[first];
  pieces[first] = pieces[second];
  pieces[second] = piece;
};
