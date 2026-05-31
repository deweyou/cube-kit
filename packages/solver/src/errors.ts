export class SolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolverError';
  }
}

export class InvalidSolverScrambleError extends SolverError {
  constructor(scramble: string, cause?: unknown) {
    super(`invalid 3x3 solver scramble: ${scramble}`);
    this.name = 'InvalidSolverScrambleError';
    this.cause = cause;
  }
}

export class UnsupportedSolverMoveError extends SolverError {
  constructor(move: string) {
    super(`unsupported solver move: ${move}`);
    this.name = 'UnsupportedSolverMoveError';
  }
}

export class UnknownSolverMethodError extends SolverError {
  constructor(method: string) {
    super(`unknown solver method: ${method}`);
    this.name = 'UnknownSolverMethodError';
  }
}

export class UnknownSolverTargetError extends SolverError {
  constructor(method: string, target: string) {
    super(`unknown ${method} solver target: ${target}`);
    this.name = 'UnknownSolverTargetError';
  }
}

export class NoSolverSolutionError extends SolverError {
  constructor(method: string, target: string, maxDepth: number) {
    super(`no ${method} solution for ${target} within depth ${maxDepth}`);
    this.name = 'NoSolverSolutionError';
  }
}
