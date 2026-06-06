import {
  cpSync,
  existsSync,
  readFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const packagesRoot = resolve(repoRoot, 'packages');
const buildRoot = resolve(packageRoot, '.build');
const vendorRoot = resolve(buildRoot, 'vendor');
const generatedConfigPath = resolve(buildRoot, 'public-pack.json');
const packageJsonPath = resolve(packageRoot, 'package.json');
const watch = process.argv.includes('--watch');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const toPosix = (path) => path.split(sep).join('/');

const listFiles = (directory) => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    if (entry.isFile()) return [path];
    return [];
  });
};

const discoverPublicPackages = () => {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'core')
    .map((directoryName) => {
      const directory = resolve(packagesRoot, directoryName.name);
      const packageJsonPath = resolve(directory, 'package.json');
      if (!existsSync(packageJsonPath)) return undefined;
      const packageJson = readJson(packageJsonPath);
      const publicSubpath = packageJson.cubegin?.publicSubpath;
      if (!publicSubpath) return undefined;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publicSubpath)) {
        throw new Error(
          `Invalid cubegin.publicSubpath '${publicSubpath}' in ${directoryName.name}`,
        );
      }
      return {
        directory,
        directoryName: directoryName.name,
        packageName: packageJson.name,
        publicSubpath,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.publicSubpath.localeCompare(right.publicSubpath));
};

const syncPackageExports = (publicPackages) => {
  const packageJson = readJson(packageJsonPath);
  const exports = Object.fromEntries(
    publicPackages.map(({ publicSubpath }) => [
      `./${publicSubpath}`,
      `./dist/${publicSubpath}.mjs`,
    ]),
  );
  exports['./package.json'] = './package.json';

  const nextPackageJson = {
    ...packageJson,
    exports,
  };

  if (JSON.stringify(packageJson.exports) !== JSON.stringify(exports)) {
    writeFileSync(packageJsonPath, `${JSON.stringify(nextPackageJson, null, 2)}\n`);
  }
};

const prepareBuildTree = (publicPackages) => {
  rmSync(buildRoot, { force: true, recursive: true });
  mkdirSync(vendorRoot, { recursive: true });

  for (const publicPackage of publicPackages) {
    const source = resolve(publicPackage.directory, 'src');
    if (!existsSync(source)) {
      throw new Error(`Package ${publicPackage.packageName} has no src directory`);
    }
    const destination = resolve(vendorRoot, publicPackage.publicSubpath, 'src');
    cpSync(source, destination, {
      filter: (sourcePath) => !sourcePath.endsWith('.test.ts'),
      recursive: true,
    });
  }

  const aliases = Object.fromEntries(
    publicPackages.map(({ packageName, publicSubpath }) => [
      packageName,
      toPosix(resolve(vendorRoot, publicSubpath, 'src/index.ts')),
    ]),
  );
  const entry = Object.fromEntries(
    publicPackages.map(({ publicSubpath }) => [
      publicSubpath,
      toPosix(resolve(vendorRoot, publicSubpath, 'src/index.ts')),
    ]),
  );

  writeFileSync(
    generatedConfigPath,
    `${JSON.stringify({ alias: aliases, entry, root: toPosix(vendorRoot) }, null, 2)}\n`,
  );
};

const runPack = () => {
  const args = ['vp', 'pack'];
  if (watch) args.push('--watch');
  const command = process.env.npm_execpath ? process.execPath : 'pnpm';
  const commandArgs = process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`vp pack failed with exit code ${String(result.status)}`);
  }
};

const assertBundledOutput = (publicPackages) => {
  if (watch) return;
  const distRoot = resolve(packageRoot, 'dist');
  const outputFiles = publicPackages.map(({ publicSubpath }) =>
    resolve(distRoot, `${publicSubpath}.mjs`),
  );

  for (const outputFile of outputFiles) {
    if (!existsSync(outputFile)) {
      throw new Error(`Missing output file ${relative(packageRoot, outputFile)}`);
    }
  }

  const leakedImports = listFiles(distRoot)
    .filter((file) => file.endsWith('.mjs') || file.endsWith('.mts'))
    .flatMap((file) => {
      const content = readFileSync(file, 'utf8');
      if (!/(from|import|export).*["']@cubegin\//.test(content)) return [];
      return [relative(packageRoot, file)];
    });
  if (leakedImports.length > 0) {
    throw new Error(
      `Published dist must not import unpublished @cubegin packages:\n${leakedImports.join('\n')}`,
    );
  }

  const packageJson = readJson(packageJsonPath);
  if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
    throw new Error('cubegin package.json must not declare runtime dependencies');
  }
  if (Object.hasOwn(packageJson.exports, '.')) {
    throw new Error('cubegin root export must stay private');
  }
};

const publicPackages = discoverPublicPackages();
syncPackageExports(publicPackages);
prepareBuildTree(publicPackages);
runPack();
assertBundledOutput(publicPackages);
