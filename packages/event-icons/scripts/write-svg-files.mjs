import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = resolve(packageRoot, 'package.json');
const svgExportPath = './svg/*';
const svgExportTarget = './dist/svg/*';

export const syncEventIconSvgExport = async ({ packageJsonPath: path } = {}) => {
  const targetPackageJsonPath = path ?? packageJsonPath;
  const packageJson = JSON.parse(await readFile(targetPackageJsonPath, 'utf8'));
  const packageExports = packageJson.exports ?? {};

  if (packageExports[svgExportPath] === svgExportTarget) return;

  const nextExports = {};

  for (const [exportPath, exportTarget] of Object.entries(packageExports)) {
    nextExports[exportPath] = exportTarget;
    if (exportPath === '.') {
      nextExports[svgExportPath] = svgExportTarget;
    }
  }

  if (!Object.hasOwn(nextExports, svgExportPath)) {
    nextExports[svgExportPath] = svgExportTarget;
  }

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { EVENT_ICON_SVGS } = await import('../dist/index.mjs');

  await writeEventIconSvgFiles({
    icons: EVENT_ICON_SVGS,
    outDir: resolve(packageRoot, 'dist/svg'),
  });
  await syncEventIconSvgExport();
}
