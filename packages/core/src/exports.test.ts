import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface PackageJson {
  readonly exports: Record<string, string>;
}

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageJson;

describe('cubegin package exports', () => {
  it('keeps the package root private and exposes selected public subpaths', () => {
    expect(Object.hasOwn(packageJson.exports, '.')).toBe(false);
    expect(packageJson.exports).toMatchObject({
      './event-icons': './dist/event-icons.mjs',
      './event-icons/svg/*': './dist/event-icons/svg/*',
      './scramble-core': './dist/scramble-core.mjs',
      './scramble-image': './dist/scramble-image.mjs',
      './scramble-puzzle': './dist/scramble-puzzle.mjs',
    });
  });

  it('keeps package metadata importable for npm consumers and tooling', () => {
    expect(packageJson.exports['./package.json']).toBe('./package.json');
  });
});
