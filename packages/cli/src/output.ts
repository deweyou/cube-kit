import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

interface PackageMetadata {
  readonly version?: unknown;
}

const readNearestPackageVersion = (start = dirname(fileURLToPath(import.meta.url))): string => {
  let current = start;

  for (let depth = 0; depth < 8; depth += 1) {
    const packageJsonPath = resolve(current, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageMetadata;
      if (typeof packageJson.version === 'string') return packageJson.version;
    }

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return '0.0.0';
};

export const CLI_VERSION = readNearestPackageVersion();

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
