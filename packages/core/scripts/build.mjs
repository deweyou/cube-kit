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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const packagesRoot = resolve(repoRoot, 'packages');
const buildRoot = resolve(packageRoot, '.build');
const vendorRoot = resolve(buildRoot, 'vendor');
const generatedConfigPath = resolve(buildRoot, 'public-pack.json');
const packageJsonPath = resolve(packageRoot, 'package.json');
const watch = process.argv.includes('--watch');
const eventIconsPublicSubpath = 'event-icons';
const eventIconsSvgExportPath = `./${eventIconsPublicSubpath}/svg/*`;
const eventIconsSvgExportTarget = `./dist/${eventIconsPublicSubpath}/svg/*`;

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

const isValidSubpath = (subpath) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subpath);

const discoverWorkspacePackages = () => {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'core')
    .map((directoryName) => {
      const directory = resolve(packagesRoot, directoryName.name);
      const packageJsonPath = resolve(directory, 'package.json');
      if (!existsSync(packageJsonPath)) return undefined;
      const packageJson = readJson(packageJsonPath);
      const publicSubpath = packageJson.cubegin?.publicSubpath;
      return {
        directory,
        directoryName: directoryName.name,
        packageJson,
        packageName: packageJson.name,
        publicSubpath,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.directoryName.localeCompare(right.directoryName));
};

const discoverPublicPackages = (workspacePackages) => {
  return workspacePackages
    .filter(({ directoryName, publicSubpath }) => {
      if (!publicSubpath) return false;
      if (!isValidSubpath(publicSubpath)) {
        throw new Error(
          `Invalid cubegin.publicSubpath '${publicSubpath}' in ${directoryName}`,
        );
      }
      return true;
    })
    .sort((left, right) => left.publicSubpath.localeCompare(right.publicSubpath));
};

const collectVendoredPackages = (publicPackages, workspacePackages) => {
  const workspacePackageByName = new Map(
    workspacePackages.map((workspacePackage) => [
      workspacePackage.packageName,
      workspacePackage,
    ]),
  );
  const vendoredPackageByName = new Map();

  const visitPackage = (workspacePackage) => {
    if (vendoredPackageByName.has(workspacePackage.packageName)) return;

    const vendorSubpath = workspacePackage.publicSubpath ?? workspacePackage.directoryName;
    if (!isValidSubpath(vendorSubpath)) {
      throw new Error(
        `Invalid vendored package directory '${vendorSubpath}' in ${workspacePackage.directoryName}`,
      );
    }

    vendoredPackageByName.set(workspacePackage.packageName, {
      ...workspacePackage,
      vendorSubpath,
    });

    for (const dependencyName of Object.keys(workspacePackage.packageJson.dependencies ?? {})) {
      const dependencyPackage = workspacePackageByName.get(dependencyName);
      if (!dependencyPackage) continue;
      visitPackage(dependencyPackage);
    }
  };

  for (const publicPackage of publicPackages) {
    visitPackage(publicPackage);
  }

  return Array.from(vendoredPackageByName.values()).sort((left, right) =>
    left.vendorSubpath.localeCompare(right.vendorSubpath),
  );
};

const syncPackageExports = (publicPackages) => {
  const packageJson = readJson(packageJsonPath);
  const exports = {};

  for (const { publicSubpath } of publicPackages) {
    exports[`./${publicSubpath}`] = `./dist/${publicSubpath}.mjs`;

    if (publicSubpath === eventIconsPublicSubpath) {
      exports[eventIconsSvgExportPath] = eventIconsSvgExportTarget;
    }
  }

  exports['./package.json'] = './package.json';

  const nextPackageJson = {
    ...packageJson,
    exports,
  };

  if (JSON.stringify(packageJson.exports) !== JSON.stringify(exports)) {
    writeFileSync(packageJsonPath, `${JSON.stringify(nextPackageJson, null, 2)}\n`);
  }
};

const prepareBuildTree = (publicPackages, vendoredPackages) => {
  rmSync(buildRoot, { force: true, recursive: true });
  mkdirSync(vendorRoot, { recursive: true });

  for (const vendoredPackage of vendoredPackages) {
    const source = resolve(vendoredPackage.directory, 'src');
    if (!existsSync(source)) {
      throw new Error(`Package ${vendoredPackage.packageName} has no src directory`);
    }
    const destination = resolve(vendorRoot, vendoredPackage.vendorSubpath, 'src');
    cpSync(source, destination, {
      filter: (sourcePath) => !sourcePath.endsWith('.test.ts'),
      recursive: true,
    });
  }

  const aliases = Object.fromEntries(
    vendoredPackages.map(({ packageName, vendorSubpath }) => [
      packageName,
      toPosix(resolve(vendorRoot, vendorSubpath, 'src/index.ts')),
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

const writePublicEventIconSvgFiles = async (publicPackages) => {
  if (watch) return;
  if (!publicPackages.some(({ publicSubpath }) => publicSubpath === eventIconsPublicSubpath))
    return;

  const eventIconsModule = await import(
    pathToFileURL(resolve(packageRoot, `dist/${eventIconsPublicSubpath}.mjs`)).href
  );
  const eventIconsScript = await import(
    pathToFileURL(resolve(packagesRoot, 'event-icons/scripts/write-svg-files.mjs')).href
  );

  await eventIconsScript.writeEventIconSvgFiles({
    icons: eventIconsModule.EVENT_ICON_SVGS,
    outDir: resolve(packageRoot, `dist/${eventIconsPublicSubpath}/svg`),
  });
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

const workspacePackages = discoverWorkspacePackages();
const publicPackages = discoverPublicPackages(workspacePackages);
const vendoredPackages = collectVendoredPackages(publicPackages, workspacePackages);
syncPackageExports(publicPackages);
prepareBuildTree(publicPackages, vendoredPackages);
runPack();
syncPackageExports(publicPackages);
await writePublicEventIconSvgFiles(publicPackages);
assertBundledOutput(publicPackages);
