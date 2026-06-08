import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { syncEventIconSvgExport, writeEventIconSvgFiles } from './write-svg-files.mjs';

test('writes one SVG file per event icon', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'cubegin-event-icons-'));
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

test('keeps the generated SVG package export after pack metadata sync', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'cubegin-event-icons-'));
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
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await syncEventIconSvgExport({ packageJsonPath });

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    assert.equal(packageJson.exports['./svg/*'], './dist/svg/*');
    assert.equal(packageJson.exports['./package.json'], './package.json');
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
});
