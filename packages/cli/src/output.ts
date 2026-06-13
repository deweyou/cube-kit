export interface JsonSuccess<Data> {
  readonly ok: true;
  readonly data: Data;
  readonly meta: {
    readonly command: string;
    readonly version: string;
  };
}

export interface JsonFailure {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly hints: readonly string[];
  };
}

export type JsonOutput<Data> = JsonSuccess<Data> | JsonFailure;

export const CLI_VERSION = '0.0.0';

export const jsonOk = <Data>(command: string, data: Data): JsonSuccess<Data> => ({
  ok: true,
  data,
  meta: {
    command,
    version: CLI_VERSION,
  },
});

export const jsonError = (
  code: string,
  message: string,
  hints: readonly string[] = [],
): JsonFailure => ({
  ok: false,
  error: {
    code,
    message,
    hints,
  },
});

export const writeJson = (value: unknown): void => {
  console.log(JSON.stringify(value, null, 2));
};
