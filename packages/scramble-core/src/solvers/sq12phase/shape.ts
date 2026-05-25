const N_SHAPES = 3678;
const N_SHAPE_STATES = N_SHAPES * 2;

const FACE_TURN_METRIC = 0;
const WCA_TURN_METRIC = 1;
const SEARCH_METRIC = WCA_TURN_METRIC;

const HALF_LAYER = [
  0x00, 0x03, 0x06, 0x0c, 0x0f, 0x18, 0x1b, 0x1e, 0x30, 0x33, 0x36, 0x3c, 0x3f,
] as const;

const SOLVED_SHAPE_WITH_PARITY = 0x06dbdb6;

export interface ShapeTables {
  shapeIdx: Int32Array;
  shapePrun: Int8Array;
  shapePrunOpt: Int8Array;
  topMove: Int32Array;
  bottomMove: Int32Array;
  twistMove: Int32Array;
}

let cachedTables: ShapeTables | undefined;

class ShapeCoordinate {
  top = 0;
  bottom = 0;
  parity = 0;

  constructor(private readonly shapeIdx: Int32Array) {}

  getIdx(): number {
    return getShape2IdxFrom(this.shapeIdx, (this.parity << 24) | (this.top << 12) | this.bottom);
  }

  setIdx(index: number): void {
    this.parity = index & 1;
    this.top = this.shapeIdx[index >> 1];
    this.bottom = this.top & 0xfff;
    this.top >>= 12;
  }

  topMove(): number {
    let move = 0;
    let moveParity = 0;

    do {
      if ((this.top & 0x800) === 0) {
        move += 1;
        this.top <<= 1;
      } else {
        move += 2;
        this.top = (this.top << 2) ^ 0x3003;
      }
      moveParity = 1 - moveParity;
    } while ((popCount(this.top & 0x3f) & 1) !== 0);

    if ((popCount(this.top) & 2) === 0) {
      this.parity ^= moveParity;
    }

    return move;
  }

  bottomMove(): number {
    let move = 0;
    let moveParity = 0;

    do {
      if ((this.bottom & 0x800) === 0) {
        move += 1;
        this.bottom <<= 1;
      } else {
        move += 2;
        this.bottom = (this.bottom << 2) ^ 0x3003;
      }
      moveParity = 1 - moveParity;
    } while ((popCount(this.bottom & 0x3f) & 1) !== 0);

    if ((popCount(this.bottom) & 2) === 0) {
      this.parity ^= moveParity;
    }

    return move;
  }

  twistMove(): void {
    const topSlice = this.top & 0x3f;
    const topSliceCorners = popCount(topSlice);
    const bottomSliceCorners = popCount(this.bottom & 0xfc0);
    this.parity ^= 1 & ((topSliceCorners & bottomSliceCorners) >> 1);

    this.top = (this.top & 0xfc0) | ((this.bottom >> 6) & 0x3f);
    this.bottom = (this.bottom & 0x3f) | (topSlice << 6);
  }
}

export const getShape2Idx = (shapeWithParity: number): number =>
  getShape2IdxFrom(getShapeTables().shapeIdx, shapeWithParity);

export const getShapeTables = (): ShapeTables => {
  cachedTables ??= createShapeTables();

  return cachedTables;
};

const createShapeTables = (): ShapeTables => {
  const shapeIdx = createShapeIndex();
  const topMove = new Int32Array(N_SHAPE_STATES);
  const bottomMove = new Int32Array(N_SHAPE_STATES);
  const twistMove = new Int32Array(N_SHAPE_STATES);
  const shape = new ShapeCoordinate(shapeIdx);

  for (let index = 0; index < N_SHAPE_STATES; index += 1) {
    shape.setIdx(index);
    topMove[index] = shape.topMove() | (shape.getIdx() << 4);

    shape.setIdx(index);
    bottomMove[index] = shape.bottomMove() | (shape.getIdx() << 4);

    shape.setIdx(index);
    shape.twistMove();
    twistMove[index] = shape.getIdx();
  }

  const shapePrun = new Int8Array(N_SHAPE_STATES);
  const shapePrunOpt = new Int8Array(N_SHAPE_STATES);
  shapePrun.fill(-1);
  shapePrunOpt.fill(-1);

  shapePrun[getShape2IdxFrom(shapeIdx, 0x0db66db)] = 0;
  shapePrun[getShape2IdxFrom(shapeIdx, 0x1db6db6)] = 0;
  shapePrun[getShape2IdxFrom(shapeIdx, 0x16db6db)] = 0;
  shapePrun[getShape2IdxFrom(shapeIdx, 0x06dbdb6)] = 0;
  shapePrunOpt[getShape2IdxFrom(shapeIdx, SOLVED_SHAPE_WITH_PARITY)] = 0;

  const tables = {
    shapeIdx,
    shapePrun,
    shapePrunOpt,
    topMove,
    bottomMove,
    twistMove,
  };

  initPruning(tables, shapePrun, 4, FACE_TURN_METRIC);
  initPruning(tables, shapePrunOpt, 1, SEARCH_METRIC);

  return tables;
};

const createShapeIndex = (): Int32Array => {
  const shapeIdx = new Int32Array(N_SHAPES);
  let count = 0;

  for (let index = 0; index < 13 * 13 * 13 * 13; index += 1) {
    const dr = HALF_LAYER[index % 13];
    const dl = HALF_LAYER[Math.floor(index / 13) % 13];
    const ur = HALF_LAYER[Math.floor(index / 13 / 13) % 13];
    const ul = HALF_LAYER[Math.floor(index / 13 / 13 / 13)];
    const value = (ul << 18) | (ur << 12) | (dl << 6) | dr;

    if (popCount(value) === 16) {
      shapeIdx[count] = value;
      count += 1;
    }
  }

  return shapeIdx;
};

const initPruning = (
  tables: Pick<ShapeTables, 'topMove' | 'bottomMove' | 'twistMove'>,
  pruning: Int8Array,
  doneStart: number,
  metric: number,
): void => {
  let done = doneStart;
  let previousDone = 0;
  let depth = -1;

  while (done !== previousDone) {
    previousDone = done;
    depth += 1;

    for (let index = 0; index < N_SHAPE_STATES; index += 1) {
      if (pruning[index] !== depth) continue;

      const twisted = tables.twistMove[index];
      if (pruning[twisted] === -1) {
        done += 1;
        pruning[twisted] = depth + 1;
      }

      if (metric === FACE_TURN_METRIC) {
        for (let move = 0, increment = 0, next = index; move !== 12; move += increment) {
          const moved = tables.topMove[next];
          increment = moved & 0xf;
          next = moved >> 4;

          if (pruning[next] === -1) {
            done += 1;
            pruning[next] = depth + 1;
          }
        }

        for (let move = 0, increment = 0, next = index; move !== 12; move += increment) {
          const moved = tables.bottomMove[next];
          increment = moved & 0xf;
          next = moved >> 4;

          if (pruning[next] === -1) {
            done += 1;
            pruning[next] = depth + 1;
          }
        }
      } else if (metric === WCA_TURN_METRIC) {
        for (let move = 0, increment = 0, next = index; move !== 12; move += increment) {
          const movedTop = tables.topMove[next];
          increment = movedTop & 0xf;
          next = movedTop >> 4;

          for (
            let bottomMove = 0, bottomIncrement = 0, bottomNext = next;
            bottomMove !== 12;
            bottomMove += bottomIncrement
          ) {
            const movedBottom = tables.bottomMove[bottomNext];
            bottomIncrement = movedBottom & 0xf;
            bottomNext = movedBottom >> 4;

            if (pruning[bottomNext] === -1) {
              done += 1;
              pruning[bottomNext] = depth + 1;
            }
          }
        }
      }
    }
  }
};

const getShape2IdxFrom = (shapeIdx: Int32Array, shapeWithParity: number): number => {
  const index = binarySearch(shapeIdx, shapeWithParity & 0xffffff);
  if (index < 0) {
    throw new RangeError('@cubekit/scramble-core: invalid Square-1 shape coordinate');
  }

  return (index << 1) | ((shapeWithParity >> 24) & 1);
};

const binarySearch = (values: Int32Array, target: number): number => {
  let low = 0;
  let high = values.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const value = values[middle];

    if (value < target) {
      low = middle + 1;
    } else if (value > target) {
      high = middle - 1;
    } else {
      return middle;
    }
  }

  return -1;
};

export const popCount = (value: number): number => {
  let remaining = value >>> 0;
  let count = 0;

  while (remaining !== 0) {
    remaining &= remaining - 1;
    count += 1;
  }

  return count;
};
