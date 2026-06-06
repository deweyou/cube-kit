import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..');
const ignoredDirs = new Set([
  '.build',
  '.git',
  '.superpowers',
  '.worktrees',
  'dist',
  'node_modules',
]);

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function listRepositoryFiles(dir = repoRoot) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;

    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRepositoryFiles(entryPath)));
      continue;
    }

    if (entry.isFile()) files.push(entryPath);
  }

  return files;
}

test('repository knowledge base lives under docs', async () => {
  assert.equal(await pathExists(path.join(repoRoot, 'knowledge')), false);
  assert.equal(await pathExists(path.join(repoRoot, 'AGENTS.md')), true);
  assert.equal(await pathExists(path.join(repoRoot, 'docs', 'project-structure.md')), true);
  assert.equal(await pathExists(path.join(repoRoot, 'docs', '.state.md')), true);
  assert.equal(await pathExists(path.join(repoRoot, 'docs', '.todo.md')), true);
});

test('tracked text files do not point agents at the legacy knowledge path', async () => {
  const legacyPathFragment = 'knowledge' + '/';
  const textExtensions = new Set(['.json', '.md', '.sh', '.ts', '.tsx', '.mts', '.mjs']);
  const files = await listRepositoryFiles();
  const offenders = [];

  for (const filePath of files) {
    if (!textExtensions.has(path.extname(filePath))) continue;
    const content = await readFile(filePath, 'utf8');
    if (content.includes(legacyPathFragment)) {
      offenders.push(path.relative(repoRoot, filePath));
    }
  }

  assert.deepEqual(offenders, []);
});
