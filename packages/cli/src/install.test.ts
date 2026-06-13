import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildSkillInstallCommand, getBundledSkillPath, runInstall } from './install.js';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

const question = vi.fn(async () => 'n');
const close = vi.fn();

vi.mock('node:readline/promises', () => ({
  createInterface: vi.fn(() => ({ question, close })),
}));

describe('skill install helpers', () => {
  afterEach(() => {
    vi.mocked(spawnSync).mockClear();
    question.mockReset().mockResolvedValue('n');
    close.mockClear();
    vi.restoreAllMocks();
  });

  it('points to the bundled cubegin skill', () => {
    const skillPath = getBundledSkillPath();

    expect(skillPath).toMatch(/skills\/cubegin$/);
    expect(existsSync(skillPath)).toBe(true);
  });

  it('uses npx skills with copy and global install flags', () => {
    const command = buildSkillInstallCommand('/tmp/cubegin/skills/cubegin');

    expect(command).toEqual({
      command: 'npx',
      args: ['skills', 'add', '/tmp/cubegin/skills/cubegin', '--copy', '-g'],
    });
  });

  it('falls back to the nearest expected skill location when no bundled skill is found', () => {
    expect(getBundledSkillPath('/tmp/cubegin/dist/cli')).toBe('/tmp/cubegin/dist/skills/cubegin');
  });

  it('fails clearly when the resolved bundled skill does not exist', async () => {
    await expect(runInstall({ yes: true, skillPath: '/tmp/cubegin-missing-skill' })).rejects.toMatchObject({
      code: 'SKILL_NOT_FOUND',
      exitCode: 1,
    });
  });

  it('prints the install command without spawning npx in dry-run mode', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runInstall({ yes: true, dryRun: true });

    expect(spawnSync).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^npx skills add .+\/skills\/cubegin --copy -g$/),
    );
  });

  it('skips installation when non-interactive confirmation is not forced', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runInstall();

    expect(spawnSync).not.toHaveBeenCalled();
    expect(log.mock.calls.map(([message]) => message)).toEqual([
      'Skipped.',
      '',
      'Install later with:',
      '  cubegin install',
    ]);
  });

  it('uses the interactive answer when stdin and stdout are TTYs', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true });
    question.mockResolvedValueOnce('yes');

    await runInstall();

    expect(question).toHaveBeenCalledWith('Install Cubegin agent skill globally? (Y/n) ');
    expect(close).toHaveBeenCalledTimes(1);
    expect(spawnSync).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['skills', 'add', expect.stringMatching(/skills\/cubegin$/)]),
      { stdio: 'inherit' },
    );
  });

  it('turns a failed npx skills install into a typed CLI error', async () => {
    vi.mocked(spawnSync).mockReturnValueOnce({ status: 13 } as ReturnType<typeof spawnSync>);

    await expect(runInstall({ yes: true })).rejects.toMatchObject({
      code: 'SKILL_INSTALL_FAILED',
      exitCode: 13,
    });
  });

  it('rethrows spawn errors from npx skills', async () => {
    const error = new Error('spawn failed');
    vi.mocked(spawnSync).mockReturnValueOnce({ error, status: null } as ReturnType<typeof spawnSync>);

    await expect(runInstall({ yes: true })).rejects.toBe(error);
  });
});
