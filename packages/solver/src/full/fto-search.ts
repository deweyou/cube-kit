export type SearchMove = readonly [axis: number, power: number];
export type SearchState = number | readonly number[];

export interface MoveHash {
  readonly moves: readonly (readonly number[])[];
  readonly indexByHash: ReadonlyMap<string | number, number>;
}

export const createMoveHash = <T>(
  initialState: T,
  validMoves: readonly number[],
  hash: (state: T) => string | number,
  move: (state: T, moveIndex: number) => T,
): MoveHash => {
  const states = [initialState];
  const indexByHash = new Map<string | number, number>([[hash(initialState), 0]]);
  const moves = validMoves.map(() => [] as number[]);

  for (let stateIndex = 0; stateIndex < states.length; stateIndex += 1) {
    const current = states[stateIndex] as T;
    for (let axis = 0; axis < validMoves.length; axis += 1) {
      const next = move(current, validMoves[axis] as number);
      const nextHash = hash(next);
      let nextIndex = indexByHash.get(nextHash);
      if (nextIndex === undefined) {
        nextIndex = states.length;
        indexByHash.set(nextHash, nextIndex);
        states.push(next);
      }
      (moves[axis] as number[])[stateIndex] = nextIndex;
    }
  }

  return { moves, indexByHash };
};

export const createPruningTable = (
  size: number,
  initial: number | readonly number[],
  maxDepth: number,
  move: (coordinate: number, axis: number) => number,
  axisCount: number,
  powerCount = 2,
): Int8Array => {
  const pruning = new Int8Array(size);
  pruning.fill(-1);
  const queue = new Uint32Array(size);
  let write = 0;
  for (const coordinate of typeof initial === 'number' ? [initial] : initial) {
    if (pruning[coordinate] !== -1) continue;
    pruning[coordinate] = 0;
    queue[write] = coordinate;
    write += 1;
  }

  let read = 0;
  while (read < write) {
    const coordinate = queue[read] as number;
    const depth = pruning[coordinate] as number;
    read += 1;
    if (depth >= maxDepth) continue;
    for (let axis = 0; axis < axisCount; axis += 1) {
      let next = coordinate;
      for (let power = 0; power < powerCount; power += 1) {
        next = move(next, axis);
        if (next < 0 || pruning[next] !== -1) continue;
        pruning[next] = depth + 1;
        queue[write] = next;
        write += 1;
      }
    }
  }

  for (let index = 0; index < pruning.length; index += 1) {
    if (pruning[index] === -1) pruning[index] = 15;
  }
  return pruning;
};

type SearchCallback = (solution: readonly SearchMove[], sourceIndex: number) => boolean;

export class CoordinateSearcher {
  readonly #getPruning: (state: SearchState) => number;
  readonly #move: (state: SearchState, axis: number) => SearchState;
  readonly #axisCount: number;
  readonly #powerCount: number;
  readonly #commutingMoves: readonly number[];
  #solution: SearchMove[] = [];
  #sourceIndex = 0;
  #callback: SearchCallback = () => true;

  constructor(options: {
    readonly getPruning: (state: SearchState) => number;
    readonly move: (state: SearchState, axis: number) => SearchState;
    readonly axisCount: number;
    readonly powerCount?: number;
    readonly commutingMoves?: readonly number[];
  }) {
    this.#getPruning = options.getPruning;
    this.#move = options.move;
    this.#axisCount = options.axisCount;
    this.#powerCount = options.powerCount ?? 2;
    this.#commutingMoves =
      options.commutingMoves ?? Array.from({ length: options.axisCount }, (_, axis) => 1 << axis);
  }

  solve(state: SearchState, minimumDepth: number, maximumDepth: number): readonly SearchMove[] {
    const result = this.solveMulti([state], minimumDepth, maximumDepth);
    if (result === undefined) throw new Error('coordinate search exhausted its depth bound');
    return result.solution;
  }

  solveMulti(
    states: readonly SearchState[],
    minimumDepth: number,
    maximumDepth: number,
    callback: SearchCallback = () => true,
  ): { readonly solution: readonly SearchMove[]; readonly sourceIndex: number } | undefined {
    this.#solution = [];
    this.#callback = callback;
    for (let depth = minimumDepth; depth <= maximumDepth; depth += 1) {
      for (let sourceIndex = 0; sourceIndex < states.length; sourceIndex += 1) {
        this.#sourceIndex = sourceIndex;
        if (this.#search(states[sourceIndex] as SearchState, depth, 0, -1)) {
          return { solution: [...this.#solution], sourceIndex };
        }
      }
    }
    return undefined;
  }

  #search(state: SearchState, remaining: number, depth: number, lastAxis: number): boolean {
    const pruning = this.#getPruning(state);
    if (pruning > remaining) return false;
    if (remaining === 0) {
      return pruning === 0 && this.#callback(this.#solution, this.#sourceIndex);
    }
    if (pruning === 0 && remaining === 1) return false;

    const resumedMove = this.#solution[depth];
    for (let axis = resumedMove?.[0] ?? 0; axis < this.#axisCount; axis += 1) {
      if (lastAxis >= 0 && (((this.#commutingMoves[lastAxis] as number) >> axis) & 1) !== 0) {
        continue;
      }
      let next = Array.isArray(state) ? [...state] : state;
      for (
        let power = axis === resumedMove?.[0] ? resumedMove[1] : 0;
        power < this.#powerCount;
        power += 1
      ) {
        next = this.#move(next, axis);
        this.#solution[depth] = [axis, power];
        if (this.#search(next, remaining - 1, depth + 1, axis)) return true;
        this.#solution.length = depth;
      }
    }
    return false;
  }
}

export class MultisetCoordinate {
  readonly #counts: readonly number[];
  readonly #cumulative: readonly number[];
  readonly #size: number;

  constructor(counts: readonly number[]) {
    this.#counts = [...counts];
    const cumulative = [0];
    for (const count of counts) cumulative.push((cumulative.at(-1) as number) + count);
    this.#cumulative = cumulative;
    let remaining = cumulative.at(-1) as number;
    let size = 1;
    for (const count of counts) {
      for (let divisor = 1; divisor <= count; divisor += 1) {
        size *= remaining / divisor;
        remaining -= 1;
      }
    }
    this.#size = Math.round(size);
  }

  get(values: readonly number[]): number {
    const counts = [...this.#counts];
    let seen = ~0;
    let coordinate = 0;
    let divisor = 1;
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index] as number;
      coordinate =
        coordinate * (values.length - index) +
        bitCount(seen & ((1 << (this.#cumulative[value] as number)) - 1)) * divisor;
      divisor *= counts[value] as number;
      counts[value] = (counts[value] as number) - 1;
      seen &= ~(1 << ((this.#cumulative[value] as number) + (counts[value] as number)));
    }
    return Math.round(coordinate / divisor);
  }

  set(coordinate: number): number[] {
    const counts = [...this.#counts];
    const values: number[] = [];
    let size = this.#size;
    for (let index = 0; index < this.#cumulative.at(-1)!; index += 1) {
      for (let value = 0; value < counts.length; value += 1) {
        if (counts[value] === 0) continue;
        const nextSize = Math.trunc(
          (size * (counts[value] as number)) / ((this.#cumulative.at(-1) as number) - index),
        );
        if (coordinate < nextSize) {
          counts[value] = (counts[value] as number) - 1;
          values[index] = value;
          size = nextSize;
          break;
        }
        coordinate -= nextSize;
      }
    }
    return values;
  }
}

export const bitCount = (input: number): number => {
  let value = input;
  value -= (value >> 1) & 0x55555555;
  value = (value & 0x33333333) + ((value >> 2) & 0x33333333);
  return (((value + (value >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
};
