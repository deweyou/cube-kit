import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = resolve(packageRoot, 'package.json');

export const syncIconStaticAssetExports = async ({ packageJsonPath: path } = {}) => {
  const targetPackageJsonPath = path ?? packageJsonPath;
  const packageJson = JSON.parse(await readFile(targetPackageJsonPath, 'utf8'));
  const staticAssetExports = packageJson.cubegin?.staticAssetExports ?? {};
  const packageExports = packageJson.exports ?? {};
  const nextExports = { ...packageExports };

  for (const [exportPath, exportTarget] of Object.entries(staticAssetExports)) {
    nextExports[exportPath] = exportTarget;
  }

  if (JSON.stringify(packageExports) === JSON.stringify(nextExports)) return;

  await writeFile(
    targetPackageJsonPath,
    `${JSON.stringify({ ...packageJson, exports: nextExports }, null, 2)}\n`,
    'utf8',
  );
};

/**
 * @param {{ readonly icons: Readonly<Record<string, string>>, readonly outDir: string }} options
 */
export const writeEventIconSvgFiles = async ({ icons, outDir }) => {
  await rm(outDir, { force: true, recursive: true });
  await mkdir(outDir, { recursive: true });

  await Promise.all(
    Object.entries(icons).map(([eventId, iconSvg]) =>
      writeFile(resolve(outDir, `${eventId}.svg`), `${iconSvg}\n`, 'utf8'),
    ),
  );
};

export const copyStaticSvgFiles = async ({ root = packageRoot } = {}) => {
  await Promise.all(
    ['brand'].map(async (groupName) => {
      const outDir = resolve(root, 'dist', groupName, 'svg');

      await rm(outDir, { force: true, recursive: true });
      await cp(resolve(root, 'src', groupName, 'svg'), outDir, { recursive: true });
    }),
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { EVENT_ICON_SVGS } = await import('../dist/events/index.mjs');

  await writeEventIconSvgFiles({
    icons: EVENT_ICON_SVGS,
    outDir: resolve(packageRoot, 'dist/events/svg'),
  });
  await copyStaticSvgFiles();
  await syncIconStaticAssetExports();
}
