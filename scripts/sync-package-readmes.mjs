import { copyFileSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = resolve(repoRoot, 'packages/core');
const readmeFiles = ['README.md', 'README_ZH.md'];
const shouldWrite = process.argv.includes('--write');

const read = (path) => readFileSync(path, 'utf8');

const outOfSync = [];

for (const file of readmeFiles) {
  const source = resolve(repoRoot, file);
  const destination = resolve(packageRoot, file);

  if (shouldWrite) {
    copyFileSync(source, destination);
    console.log(`Synced ${relative(repoRoot, destination)} from ${file}`);
    continue;
  }

  if (read(source) !== read(destination)) {
    outOfSync.push(`${relative(repoRoot, destination)} must match ${file}`);
  }
}

if (outOfSync.length > 0) {
  throw new Error(
    `Package README files are out of sync. Run 'node scripts/sync-package-readmes.mjs --write'.\n${outOfSync.join(
      '\n',
    )}`,
  );
}
