import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

import { CliError } from './errors.js';

export interface SkillInstallCommand {
  readonly command: string;
  readonly args: readonly string[];
}

export interface InstallOptions {
  readonly yes?: boolean;
  readonly dryRun?: boolean;
  readonly skillPath?: string;
}

export const getBundledSkillPath = (start = dirname(fileURLToPath(import.meta.url))): string => {
  const found = findBundledSkillPath(start);
  return found ?? resolve(start, '../skills/cubegin');
};

export const buildSkillInstallCommand = (
  skillPath = getBundledSkillPath(),
): SkillInstallCommand => ({
  command: 'npx',
  args: ['skills', 'add', skillPath, '--copy', '-g'],
});

export const runInstall = async ({
  yes = false,
  dryRun = false,
  skillPath = getBundledSkillPath(),
}: InstallOptions = {}): Promise<void> => {
  if (!existsSync(skillPath)) {
    throw new CliError('SKILL_NOT_FOUND', `Bundled skill not found: ${skillPath}`, { exitCode: 1 });
  }

  const shouldInstall = yes || (await confirmGlobalSkillInstall());
  if (!shouldInstall) {
    console.log('Skipped.');
    console.log('');
    console.log('Install later with:');
    console.log('  cubegin install');
    return;
  }

  const command = buildSkillInstallCommand(skillPath);
  if (dryRun) {
    console.log([command.command, ...command.args.map(shellQuote)].join(' '));
    return;
  }

  const result = spawnSync(command.command, command.args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new CliError('SKILL_INSTALL_FAILED', 'npx skills exited with a non-zero status.', {
      exitCode: result.status ?? 1,
    });
  }
};

const confirmGlobalSkillInstall = async (): Promise<boolean> => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question('Install Cubegin agent skill globally? (Y/n) ');
    return answer.trim() === '' || answer.trim().toLowerCase().startsWith('y');
  } finally {
    readline.close();
  }
};

const findBundledSkillPath = (start: string): string | undefined => {
  let current = start;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = resolve(current, 'skills/cubegin');
    if (existsSync(candidate)) return candidate;

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }

  return undefined;
};

const shellQuote = (value: string): string =>
  /^[A-Za-z0-9_./:@=-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
