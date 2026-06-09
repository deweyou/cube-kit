import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  copyStaticSvgFiles,
  syncIconStaticAssetExports,
  writeEventIconSvgFiles,
} from './write-svg-files.mjs';

void test('writes one SVG file per event icon', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'cubegin-icons-'));
  const outDir = join(tempRoot, 'svg');

  try {
    await writeEventIconSvgFiles({
      icons: {
        333: '<svg viewBox="0 0 24 24"></svg>',
        clock: '<svg viewBox="0 0 24 24"><path></path></svg>',
      },
      outDir,
    });

    assert.deepEqual((await readdir(outDir)).sort(), ['333.svg', 'clock.svg']);
    assert.equal(
      await readFile(join(outDir, '333.svg'), 'utf8'),
      '<svg viewBox="0 0 24 24"></svg>\n',
    );
    assert.equal(
      await readFile(join(outDir, 'clock.svg'), 'utf8'),
      '<svg viewBox="0 0 24 24"><path></path></svg>\n',
    );
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
});

void test('keeps generated SVG package exports after pack metadata sync', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'cubegin-icons-'));
  const packageJsonPath = join(tempRoot, 'package.json');

  try {
    await writeFile(
      packageJsonPath,
      `${JSON.stringify(
        {
          exports: {
            '.': './dist/index.mjs',
            './package.json': './package.json',
          },
          cubegin: {
            staticAssetExports: {
              './brand/svg/*': './dist/brand/svg/*',
              './events/svg/*': './dist/events/svg/*',
            },
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await syncIconStaticAssetExports({ packageJsonPath });

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    assert.equal(packageJson.exports['./brand/svg/*'], './dist/brand/svg/*');
    assert.equal(packageJson.exports['./events/svg/*'], './dist/events/svg/*');
    assert.equal(packageJson.exports['./package.json'], './package.json');
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
});

void test('copies brand SVG files into dist assets', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'cubegin-icons-'));

  try {
    await mkdir(join(tempRoot, 'src/brand/svg'), { recursive: true });
    await writeFile(join(tempRoot, 'src/brand/svg/cubegin-mark.svg'), '<svg></svg>\n', 'utf8');

    await copyStaticSvgFiles({ root: tempRoot });

    const brandFiles = await readdir(join(tempRoot, 'dist/brand/svg'));

    assert.ok(brandFiles.includes('cubegin-mark.svg'));
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
});
