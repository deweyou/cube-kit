export class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly hints: readonly string[];

  constructor(
    code: string,
    message: string,
    { exitCode = 1, hints = [] }: { exitCode?: number; hints?: readonly string[] } = {},
  ) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
    this.hints = hints;
  }
}

export const isCliError = (error: unknown): error is CliError => error instanceof CliError;
