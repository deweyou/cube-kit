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

const isValidSubpath = (subpath) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subpath);

const resolveSourceExportPath = (exportTarget, packageDirectory) => {
  const match =
    /^\.[/]dist[/](.+?)[/]index\.mjs$/.exec(exportTarget) ??
    /^\.[/](.+?)[/]index\.mjs$/.exec(exportTarget);
  if (!match) return undefined;

  const sourceBasePath = `src/${match[1]}/index`;

  for (const extension of ['.ts', '.tsx']) {
    const sourceExportPath = `${sourceBasePath}${extension}`;
    if (existsSync(resolve(packageDirectory, sourceExportPath))) return sourceExportPath;
  }

  return undefined;
};

const getPublicPackageEntries = (publicPackage) => {
  const entries = [[publicPackage.publicSubpath, 'src/index.ts']];
  const publicJsExports = new Set(publicPackage.packageJson.cubegin?.publicJsExports ?? []);

  for (const [exportPath, exportTarget] of Object.entries(
    publicPackage.packageJson.exports ?? {},
  )) {
    if (exportPath === '.' || exportPath === './package.json') continue;
    if (!publicJsExports.has(exportPath)) continue;
    if (typeof exportTarget !== 'string') continue;

    const sourceExportPath = resolveSourceExportPath(exportTarget, publicPackage.directory);
    if (!sourceExportPath) continue;

    entries.push([`${publicPackage.publicSubpath}/${exportPath.slice(2)}`, sourceExportPath]);
  }

  return entries;
};

const getVendoredAliases = (vendoredPackage) => {
  const aliases = {
    [vendoredPackage.packageName]: toPosix(
      resolve(vendorRoot, vendoredPackage.vendorSubpath, 'src/index.ts'),
    ),
  };

  for (const [exportPath, exportTarget] of Object.entries(
    vendoredPackage.packageJson.exports ?? {},
  )) {
    if (exportPath === '.' || exportPath === './package.json') continue;
    if (typeof exportTarget !== 'string') continue;

    const sourceExportPath = resolveSourceExportPath(exportTarget, vendoredPackage.directory);
    if (!sourceExportPath) continue;

    aliases[`${vendoredPackage.packageName}/${exportPath.slice(2)}`] = toPosix(
      resolve(vendorRoot, vendoredPackage.vendorSubpath, sourceExportPath),
    );
  }

  return aliases;
};

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
        throw new Error(`Invalid cubegin.publicSubpath '${publicSubpath}' in ${directoryName}`);
      }
      return true;
    })
    .sort((left, right) => left.publicSubpath.localeCompare(right.publicSubpath));
};

const collectVendoredPackages = (publicPackages, workspacePackages) => {
  const workspacePackageByName = new Map(
    workspacePackages.map((workspacePackage) => [workspacePackage.packageName, workspacePackage]),
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

  for (const publicPackage of publicPackages) {
    const { packageJson: publicPackageJson, publicSubpath } = publicPackage;

    exports[`./${publicSubpath}`] = `./dist/${publicSubpath}.mjs`;

    for (const [entryName] of getPublicPackageEntries(publicPackage).slice(1)) {
      exports[`./${entryName}`] = `./dist/${entryName}.mjs`;
    }

    for (const [exportPath, exportTarget] of Object.entries(
      publicPackageJson.cubegin?.staticAssetExports ?? {},
    )) {
      exports[`./${publicSubpath}/${exportPath.slice(2)}`] =
        `./dist/${publicSubpath}/${exportTarget.slice('./dist/'.length)}`;
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

  const aliases = Object.assign({}, ...vendoredPackages.map(getVendoredAliases));
  const entry = Object.fromEntries(
    publicPackages.flatMap((publicPackage) =>
      getPublicPackageEntries(publicPackage).map(([entryName, sourceExportPath]) => [
        entryName,
        toPosix(resolve(vendorRoot, publicPackage.publicSubpath, sourceExportPath)),
      ]),
    ),
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

const writePublicStaticAssetFiles = async (publicPackages) => {
  if (watch) return;

  for (const { directory, packageJson, publicSubpath } of publicPackages) {
    const staticAssetExports = packageJson.cubegin?.staticAssetExports ?? {};

    for (const [exportPath, exportTarget] of Object.entries(staticAssetExports)) {
      const source = resolve(directory, exportTarget.replace('./dist/', 'dist/').replace('/*', ''));
      const destination = resolve(
        packageRoot,
        'dist',
        publicSubpath,
        exportPath.slice(2).replace('/*', ''),
      );

      rmSync(destination, { force: true, recursive: true });
      cpSync(source, destination, { recursive: true });
    }
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

const workspacePackages = discoverWorkspacePackages();
const publicPackages = discoverPublicPackages(workspacePackages);
const vendoredPackages = collectVendoredPackages(publicPackages, workspacePackages);
syncPackageExports(publicPackages);
prepareBuildTree(publicPackages, vendoredPackages);
runPack();
syncPackageExports(publicPackages);
await writePublicStaticAssetFiles(publicPackages);
assertBundledOutput(publicPackages);
