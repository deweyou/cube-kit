const ERROR_PREFIX = '@cubegin/player';

const withPrefix = (message: string): string => `${ERROR_PREFIX}: ${message}`;

export type PlayerErrorCode = 'invalid-formula' | 'unsupported-puzzle';

export class CubeginPlayerError extends Error {
  readonly code: PlayerErrorCode;

  constructor(code: PlayerErrorCode, message: string, options?: ErrorOptions) {
    super(withPrefix(message), options);
    this.name = 'CubeginPlayerError';
    this.code = code;
  }
}

export class UnsupportedPlayerPuzzleError extends CubeginPlayerError {
  readonly eventId: string;

  constructor(eventId: string) {
    super('unsupported-puzzle', `event '${eventId}' is not supported by @cubegin/player yet`);
    this.name = 'UnsupportedPlayerPuzzleError';
    this.eventId = eventId;
  }
}

export class InvalidPlayerFormulaError extends CubeginPlayerError {
  readonly formula: string;

  constructor(formula: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);

    super('invalid-formula', `formula '${formula}' is invalid: ${causeMessage}`, { cause });
    this.name = 'InvalidPlayerFormulaError';
    this.formula = formula;
  }
}
