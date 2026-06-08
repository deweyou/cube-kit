import type { RandomSource } from '../random-source.js';
import { validateRandomIndex } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/solver';
const CLOCK_STATE_LENGTH = 14;
const CLOCK_SOLUTION_LENGTH = 18;
const CLOCK_TURNS = ['UR', 'DR', 'DL', 'UL', 'U', 'R', 'D', 'L', 'ALL'] as const;
const INVERT = [-1, 1, -1, -1, -1, 5, -1, 7, -1, -1, -1, 11] as const;
const LINEARLY_DEPENDENT_MASKS = [
  7695, 42588, 47187, 85158, 86697, 156568, 181700, 209201, 231778,
] as const;

const MOVE_MATRIX: readonly (readonly number[])[] = [
  [0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [11, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 1, 1, 0, 1],
  [0, 0, 11, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [11, 0, 11, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],
  [11, 0, 0, 0, 0, 0, 11, 0, 0, 1, 0, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 11, 0, 11, 0, 1, 1, 1, 1],
  [0, 0, 11, 0, 0, 0, 0, 0, 11, 1, 1, 1, 0, 1],
  [11, 0, 11, 0, 0, 0, 11, 0, 11, 1, 1, 1, 1, 1],
];

export interface ClockSolverSolution {
  readonly turns: readonly number[];
  readonly nonZeroTurnCount: number;
}

const createBinomialTable = (): readonly (readonly number[])[] => {
  const table = Array.from({ length: CLOCK_SOLUTION_LENGTH + 1 }, () =>
    Array<number>(CLOCK_STATE_LENGTH + 1).fill(0),
  );

  for (let n = 0; n <= CLOCK_SOLUTION_LENGTH; n += 1) {
    table[n]![0] = 1;
    for (let k = 1; k <= Math.min(n, CLOCK_STATE_LENGTH); k += 1) {
      table[n]![k] = (table[n - 1]?.[k - 1] ?? 0) + (table[n - 1]?.[k] ?? 0);
    }
  }

  return table;
};

const BINOMIAL = createBinomialTable();

const moduloClock = (value: number): number => ((value % 12) + 12) % 12;

const validateState = (state: readonly number[]): readonly number[] => {
  if (state.length !== CLOCK_STATE_LENGTH) {
    throw new RangeError(
      `${ERROR_PREFIX}: Clock solver state must contain ${CLOCK_STATE_LENGTH} values`,
    );
  }

  for (const value of state) {
    if (!Number.isSafeInteger(value) || value < 0 || value >= 12) {
      throw new RangeError(
        `${ERROR_PREFIX}: Clock solver state values must be integers from 0 to 11`,
      );
    }
  }

  return state;
};

const selectMask = (n: number, k: number, index: number): number => {
  let remaining = k;
  let nextIndex = index;
  let value = 0;

  for (let row = n - 1; row >= 0; row -= 1) {
    if (nextIndex >= (BINOMIAL[row]?.[remaining] ?? 0)) {
      nextIndex -= BINOMIAL[row]?.[remaining] ?? 0;
      remaining -= 1;
      value |= 1 << row;
    }
  }

  return value;
};

const addTo = (
  matrix: number[][],
  sourceRow: number,
  targetRow: number,
  startIndex: number,
  multiplier: number,
): void => {
  const width = matrix[0]?.length ?? 0;

  for (let column = startIndex; column < width; column += 1) {
    matrix[targetRow]![column] = moduloClock(
      (matrix[targetRow]?.[column] ?? 0) + (matrix[sourceRow]?.[column] ?? 0) * multiplier,
    );
  }
};

const swapRows = (matrix: number[][], first: number, second: number): void => {
  const temporary = matrix[first];
  matrix[first] = matrix[second] ?? [];
  matrix[second] = temporary ?? [];
};

const gaussianElimination = (matrix: number[][]): number => {
  const height = CLOCK_STATE_LENGTH;
  const width = matrix[0]?.length ?? 0;

  for (let column = 0; column < width - 1; column += 1) {
    if ((INVERT[matrix[column]?.[column] ?? -1] ?? -1) === -1) {
      let invertibleRow = -1;

      for (let row = column + 1; row < height; row += 1) {
        if ((INVERT[matrix[row]?.[column] ?? -1] ?? -1) !== -1) {
          invertibleRow = row;
          break;
        }
      }

      if (invertibleRow === -1) {
        outer: for (let first = column; first < height - 1; first += 1) {
          for (let second = first + 1; second < height; second += 1) {
            if (
              (INVERT[
                moduloClock((matrix[first]?.[column] ?? 0) + (matrix[second]?.[column] ?? 0))
              ] ?? -1) !== -1
            ) {
              addTo(matrix, second, first, column, 1);
              invertibleRow = first;
              break outer;
            }
          }
        }
      }

      if (invertibleRow === -1) {
        for (let row = column + 1; row < height; row += 1) {
          if ((matrix[row]?.[column] ?? 0) !== 0) return -1;
        }

        return column + 1;
      }

      swapRows(matrix, column, invertibleRow);
    }

    const inverse = INVERT[matrix[column]?.[column] ?? -1] ?? -1;

    for (let nextColumn = column; nextColumn < width; nextColumn += 1) {
      matrix[column]![nextColumn] = moduloClock((matrix[column]?.[nextColumn] ?? 0) * inverse);
    }

    for (let row = column + 1; row < height; row += 1) {
      addTo(matrix, column, row, column, 12 - (matrix[row]?.[column] ?? 0));
    }
  }

  return 0;
};

const backSubstitution = (matrix: number[][]): void => {
  const width = matrix[0]?.length ?? 0;

  for (let row = width - 2; row > 0; row -= 1) {
    for (let previousRow = row - 1; previousRow >= 0; previousRow -= 1) {
      if ((matrix[previousRow]?.[row] ?? 0) !== 0) {
        addTo(matrix, row, previousRow, row, 12 - (matrix[previousRow]?.[row] ?? 0));
      }
    }
  }
};

const solveIn = (rank: number, state: readonly number[]): ClockSolverSolution => {
  let bestNonZeroCount = rank + 1;
  let bestTurns = Array<number>(CLOCK_SOLUTION_LENGTH).fill(0);

  for (let index = 0; index < (BINOMIAL[CLOCK_SOLUTION_LENGTH]?.[rank] ?? 0); index += 1) {
    const selectedMask = selectMask(CLOCK_SOLUTION_LENGTH, rank, index);

    if (LINEARLY_DEPENDENT_MASKS.some((mask) => (selectedMask & mask) === mask)) continue;

    const moveIndexes: number[] = [];
    for (let moveIndex = 0; moveIndex < CLOCK_SOLUTION_LENGTH; moveIndex += 1) {
      if (((selectedMask >> moveIndex) & 1) === 1) moveIndexes.push(moveIndex);
    }

    const matrix = Array.from({ length: CLOCK_STATE_LENGTH }, (_, row) => {
      const values = moveIndexes.map((moveIndex) => MOVE_MATRIX[moveIndex]?.[row] ?? 0);
      values.push(state[row] ?? 0);

      return values;
    });
    const elimination = gaussianElimination(matrix);
    if (elimination !== 0) continue;

    let solved = true;
    for (let row = rank; row < CLOCK_STATE_LENGTH; row += 1) {
      if ((matrix[row]?.[rank] ?? 0) !== 0) {
        solved = false;
        break;
      }
    }
    if (!solved) continue;

    backSubstitution(matrix);

    let nonZeroCount = 0;
    for (let row = 0; row < rank; row += 1) {
      if ((matrix[row]?.[rank] ?? 0) !== 0) nonZeroCount += 1;
    }

    if (nonZeroCount < bestNonZeroCount) {
      const turns = Array<number>(CLOCK_SOLUTION_LENGTH).fill(0);
      for (let row = 0; row < rank; row += 1) {
        const moveIndex = moveIndexes[row];
        if (moveIndex !== undefined) turns[moveIndex] = matrix[row]?.[rank] ?? 0;
      }

      bestTurns = turns;
      bestNonZeroCount = nonZeroCount;
    }
  }

  if (bestNonZeroCount === rank + 1) {
    throw new Error(`${ERROR_PREFIX}: no Clock solution found`);
  }

  return {
    turns: Object.freeze(bestTurns),
    nonZeroTurnCount: bestNonZeroCount,
  };
};

const formatTurn = (turnName: string, rawTurn: number): string | undefined => {
  if (rawTurn === 0) return undefined;

  if (rawTurn <= 6) return `${turnName}${rawTurn}+`;

  return `${turnName}${12 - rawTurn}-`;
};

export class ClockSolver {
  randomState(random: RandomSource): readonly number[] {
    return Object.freeze(
      Array.from({ length: CLOCK_STATE_LENGTH }, () => validateRandomIndex(random.nextInt(12), 12)),
    );
  }

  solveState(state: readonly number[]): ClockSolverSolution {
    return solveIn(CLOCK_STATE_LENGTH, validateState(state));
  }

  solution(state: readonly number[]): string {
    const { turns } = this.solveState(state);
    const firstSide = CLOCK_TURNS.flatMap((turnName, index) => {
      const token = formatTurn(turnName, turns[index] ?? 0);

      return token === undefined ? [] : [token];
    });
    const secondSide = CLOCK_TURNS.flatMap((turnName, index) => {
      const token = formatTurn(turnName, turns[index + CLOCK_TURNS.length] ?? 0);

      return token === undefined ? [] : [token];
    });

    return [...firstSide, 'y2', ...secondSide].join(' ');
  }

  randomStateScramble(random: RandomSource): string {
    return this.solution(this.randomState(random));
  }
}
