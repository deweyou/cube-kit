import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

interface PackageJson {
  readonly bin?: Record<string, string>;
  readonly exports: Record<string, string>;
  readonly files?: readonly string[];
  readonly repository?: {
    readonly type?: string;
    readonly url?: string;
    readonly directory?: string;
  };
}

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageJson;
const packageRoot = fileURLToPath(new URL('..', import.meta.url));

const resolvePackagePath = (packagePath: string) => resolve(packageRoot, packagePath);

const exportedRuntimePaths = (): readonly string[] =>
  Object.entries(packageJson.exports)
    .filter(([, target]) => target.endsWith('.mjs'))
    .map(([, target]) => target);

describe('cubegin package exports', () => {
  it('keeps the package root private and exposes selected public subpaths', () => {
    expect(Object.hasOwn(packageJson.exports, '.')).toBe(false);
    expect(packageJson.exports).toMatchObject({
      './icons': './dist/icons.mjs',
      './icons/brand': './dist/icons/brand.mjs',
      './icons/brand/svg/*': './dist/icons/brand/svg/*',
      './icons/events': './dist/icons/events.mjs',
      './icons/events/svg/*': './dist/icons/events/svg/*',
      './icons/react': './dist/icons/react.mjs',
      './cli': './dist/cli.mjs',
      './scramble-core': './dist/scramble-core.mjs',
      './scramble-image': './dist/scramble-image.mjs',
      './scramble-puzzle': './dist/scramble-puzzle.mjs',
      './solver': './dist/solver.mjs',
    });
  });

  it('keeps package metadata importable for npm consumers and tooling', () => {
    expect(packageJson.exports['./package.json']).toBe('./package.json');
  });

  it('publishes the cubegin binary and bundled agent skills', () => {
    expect(packageJson.bin).toEqual({ cubegin: 'dist/cli.mjs' });
    expect(packageJson.files).toContain('skills');
  });

  it('declares repository metadata that matches trusted publishing provenance', () => {
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/deweyou/cubegin.git',
      directory: 'packages/core',
    });
  });

  it('points every JavaScript export at an importable dist artifact', async () => {
    for (const exportTarget of exportedRuntimePaths()) {
      const artifactPath = resolvePackagePath(exportTarget);
      expect(existsSync(artifactPath), exportTarget).toBe(true);
      await expect(import(`${artifactPath}?t=${Date.now()}`)).resolves.toBeTypeOf('object');
    }
  });

  it('ships an executable cubegin bin backed by the bundled skill', () => {
    const binPath = resolvePackagePath(packageJson.bin?.cubegin ?? '');

    expect(existsSync(binPath)).toBe(true);
    expect(statSync(binPath).mode & 0o111).not.toBe(0);

    const events = spawnSync(process.execPath, [binPath, 'scramble', 'events', '--json'], {
      cwd: packageRoot,
      encoding: 'utf8',
    });
    expect(events.stderr).toBe('');
    expect(events.status).toBe(0);
    expect(JSON.parse(events.stdout)).toMatchObject({
      ok: true,
      meta: { command: 'scramble.events' },
    });

    const install = spawnSync(process.execPath, [binPath, 'install', '--yes', '--dry-run'], {
      cwd: packageRoot,
      encoding: 'utf8',
    });
    expect(install.stderr).toBe('');
    expect(install.status).toBe(0);
    expect(install.stdout.trim()).toBe(
      `npx skills add ${resolvePackagePath('skills/cubegin')} --copy -g`,
    );
  });
});
