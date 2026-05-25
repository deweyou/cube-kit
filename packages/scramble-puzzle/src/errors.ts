const ERROR_PREFIX = '@cubekit/scramble-puzzle';

function withPrefix(message: string): string {
  return `${ERROR_PREFIX}: ${message}`;
}

export class ScramblePuzzleError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(withPrefix(message), options);
    this.name = 'ScramblePuzzleError';
  }
}

export class InvalidMoveError extends ScramblePuzzleError {
  constructor(move: string, options?: ErrorOptions) {
    super(`invalid move '${move}'`, options);
    this.name = 'InvalidMoveError';
  }
}

export class InvalidScrambleError extends ScramblePuzzleError {
  constructor(scramble: string, options?: ErrorOptions) {
    super(`invalid scramble '${scramble}'`, options);
    this.name = 'InvalidScrambleError';
  }
}

export class UnregisteredPuzzleError extends ScramblePuzzleError {
  constructor(eventId: string, options?: ErrorOptions) {
    super(`event '${eventId}' is not registered`, options);
    this.name = 'UnregisteredPuzzleError';
  }
}
