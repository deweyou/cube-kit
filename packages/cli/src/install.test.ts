import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildSkillInstallCommand, getBundledSkillPath } from './install.js';

describe('skill install helpers', () => {
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
});
