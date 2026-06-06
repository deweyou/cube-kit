const ERROR_PREFIX = '@cubegin/scramble-puzzle';

const withPrefix = (message: string): string => `${ERROR_PREFIX}: ${message}`;

export class ScramblePuzzleError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(withPrefix(message), options);
    this.name = 'ScramblePuzzleError';
  }
}

export class InvalidMoveError extends ScramblePuzzleError {
  constructor(move: string, puzzleId: string) {
    super(`move '${move}' is invalid for puzzle '${puzzleId}'`);
    this.name = 'InvalidMoveError';
  }
}

export class InvalidScrambleError extends ScramblePuzzleError {
  constructor(scramble: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);

    super(`scramble '${scramble}' is invalid: ${causeMessage}`, { cause });
    this.name = 'InvalidScrambleError';
  }
}

export class UnregisteredPuzzleError extends ScramblePuzzleError {
  constructor(eventId: string, options?: ErrorOptions) {
    super(`event '${eventId}' is not registered`, options);
    this.name = 'UnregisteredPuzzleError';
  }
}
