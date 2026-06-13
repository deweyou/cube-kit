import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCli } from './index.js';

describe('cubegin command tree', () => {
  const run = async (rawArgs: readonly string[]) => {
    vi.restoreAllMocks();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await runCli(rawArgs);
    return log.mock.calls.map(([message]) => String(message));
  };

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it('prints JSON for scramble events through the command tree', async () => {
    const lines = await run(['scramble', 'events', '--json']);

    expect(JSON.parse(lines.at(-1) ?? '')).toMatchObject({
      ok: true,
      meta: { command: 'scramble.events' },
      data: { events: expect.arrayContaining([expect.objectContaining({ id: '333' })]) },
    });
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a typed JSON error for command validation failures', async () => {
    const lines = await run(['solver', 'methods', '777x', '--json']);

    expect(JSON.parse(lines.at(-1) ?? '')).toEqual({
      ok: false,
      error: {
        code: 'UNKNOWN_SOLVER_EVENT',
        message: 'Unsupported solver event id: 777x',
        hints: ['Run `cubegin solver events --json`.'],
      },
    });
    expect(process.exitCode).toBe(3);
  });

  it('prints skill metadata commands', async () => {
    const [skillPath] = await run(['skill', 'path']);
    expect(skillPath).toMatch(/skills\/cubegin$/);

    const info = await run(['skill', 'info']);
    expect(info).toEqual([
      'Cubegin CLI skill is bundled at:',
      expect.stringMatching(/^  .+\/skills\/cubegin$/),
      '',
      'Install globally:',
      expect.stringMatching(/^  npx skills add .+\/skills\/cubegin --copy -g$/),
    ]);
  });

  it('runs install dry-run through the command tree', async () => {
    const lines = await run(['install', '--yes', '--dry-run']);

    expect(lines).toEqual([expect.stringMatching(/^npx skills add .+\/skills\/cubegin --copy -g$/)]);
  });

  it('prints human-readable event and method lists', async () => {
    expect(await run(['scramble', 'events'])).toContain('333\t3x3x3 Cube');
    expect(await run(['solver', 'events'])).toContain(
      'skewb\tskewb-face',
    );
    const eventsJson = await run(['solver', 'events', '--json']);
    expect(JSON.parse(eventsJson.at(-1) ?? '')).toMatchObject({
      ok: true,
      meta: { command: 'solver.events' },
      data: { events: expect.arrayContaining([expect.objectContaining({ id: 'skewb' })]) },
    });

    expect(await run(['solver', 'methods', 'skewb'])).toEqual(['skewb-face']);

    const json = await run(['solver', 'methods', 'skewb', '--json']);
    expect(JSON.parse(json.at(-1) ?? '')).toMatchObject({
      ok: true,
      meta: { command: 'solver.methods' },
      data: { eventId: 'skewb', methods: ['skewb-face'] },
    });
  });

  it('generates scrambles in human and JSON modes', async () => {
    const human = await run(['scramble', 'generate', '222', '--count', '1']);
    expect(human).toHaveLength(1);
    expect(human[0]).toMatch(/\S/);

    const json = await run(['scramble', 'generate', '222', '--count', '1', '--json']);
    expect(JSON.parse(json.at(-1) ?? '')).toMatchObject({
      ok: true,
      meta: { command: 'scramble.generate' },
      data: { eventId: '222', scrambles: [expect.any(String)] },
    });
  });

  it('renders SVG to stdout, JSON, and a file', async () => {
    const human = await run(['scramble', 'render', '333', "R U R' U'"]);
    expect(human.at(-1)).toContain('<svg');

    const json = await run(['scramble', 'render', '333', "R U R' U'", '--json']);
    expect(JSON.parse(json.at(-1) ?? '')).toMatchObject({
      ok: true,
      meta: { command: 'scramble.render' },
      data: { eventId: '333', svg: expect.stringContaining('<svg') },
    });

    const directory = mkdtempSync(join(tmpdir(), 'cubegin-cli-'));
    try {
      const outputPath = join(directory, 'scramble.svg');
      const written = await run([
        'scramble',
        'render',
        '333',
        "R U R' U'",
        '--output',
        outputPath,
        '--json',
      ]);
      expect(readFileSync(outputPath, 'utf8')).toContain('<svg');
      expect(JSON.parse(written.at(-1) ?? '')).toMatchObject({
        data: { output: outputPath },
      });
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('runs solver assist in JSON and human modes', async () => {
    const json = await run([
      'solver',
      'assist',
      'skewb',
      'R U',
      '--method',
      'skewb-face',
      '--target',
      'U',
      '--max-depth',
      '4',
      '--json',
    ]);
    expect(JSON.parse(json.at(-1) ?? '')).toMatchObject({
      ok: true,
      meta: { command: 'solver.assist' },
      data: { eventId: 'skewb', results: [{ method: 'skewb-face' }] },
    });

    const human = await run([
      'solver',
      'assist',
      'skewb',
      'R U',
      '--method',
      'skewb-face',
      '--target',
      'U',
    ]);
    expect(human[0]).toMatch(/^skewb-face: \d+ solution\(s\)$/);
    expect(human[1]).toMatch(/^  .+: .+/);
  });

  it('rethrows unexpected command failures', async () => {
    await expect(runCli(['missing-command'])).rejects.toThrow();
  });
});
