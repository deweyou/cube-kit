#!/usr/bin/env node
import { defineCommand, runCommand, showUsage, type CommandDef } from 'citty';
import { realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isCliError } from './errors.js';
import { buildSkillInstallCommand, getBundledSkillPath, runInstall } from './install.js';
import { generateScrambles, listScrambleEvents, renderScrambleSvg } from './handlers/scramble.js';
import { listSolverEvents, listSolverMethods, runSolverAssist } from './handlers/solver.js';
import { jsonError, jsonOk, writeJson } from './output.js';

export const main = defineCommand({
  meta: {
    name: 'cubegin',
    version: '0.0.0',
    description: 'Cubegin scramble and solver tools.',
  },
  subCommands: {
    install: defineCommand({
      meta: {
        name: 'install',
        description: 'Install the bundled Cubegin agent skill with npx skills.',
      },
      args: {
        yes: { type: 'boolean', alias: ['y'], description: 'Skip confirmation.' },
        'dry-run': { type: 'boolean', description: 'Print the npx skills command.' },
      },
      async run({ args }) {
        await runInstall({ yes: args.yes, dryRun: args.dryRun });
      },
    }),
    skill: defineCommand({
      meta: {
        name: 'skill',
        description: 'Inspect bundled Cubegin agent skill metadata.',
      },
      subCommands: {
        path: defineCommand({
          meta: { name: 'path', description: 'Print the bundled cubegin skill path.' },
          run() {
            console.log(getBundledSkillPath());
          },
        }),
        info: defineCommand({
          meta: { name: 'info', description: 'Print bundled skill installation information.' },
          run() {
            const skillPath = getBundledSkillPath();
            const command = buildSkillInstallCommand(skillPath);
            console.log('Cubegin CLI skill is bundled at:');
            console.log(`  ${skillPath}`);
            console.log('');
            console.log('Install globally:');
            console.log(`  ${[command.command, ...command.args].join(' ')}`);
          },
        }),
      },
    }),
    scramble: defineCommand({
      meta: { name: 'scramble', description: 'Generate and inspect WCA scrambles.' },
      subCommands: {
        events: defineCommand({
          meta: { name: 'events', description: 'List supported WCA events.' },
          args: {
            json: { type: 'boolean', description: 'Print stable JSON output.' },
          },
          run({ args }) {
            const data = listScrambleEvents();
            if (args.json) {
              writeJson(jsonOk('scramble.events', data));
              return;
            }
            for (const event of data.events) console.log(`${event.id}\t${event.label}`);
          },
        }),
        generate: defineCommand({
          meta: { name: 'generate', description: 'Generate WCA scrambles.' },
          args: {
            event: { type: 'positional', description: 'WCA event id.', required: true },
            count: { type: 'string', description: 'Number of scrambles.', default: '1' },
            'multi-blind-cube-count': {
              type: 'string',
              description: 'Cube count for 333mbld.',
            },
            json: { type: 'boolean', description: 'Print stable JSON output.' },
          },
          async run({ args }) {
            const data = await generateScrambles(args.event, {
              count: Number(args.count),
              multiBlindCubeCount:
                args.multiBlindCubeCount === undefined
                  ? undefined
                  : Number(args.multiBlindCubeCount),
            });
            if (args.json) {
              writeJson(jsonOk('scramble.generate', data));
              return;
            }
            for (const scramble of data.scrambles) console.log(scramble);
          },
        }),
        render: defineCommand({
          meta: { name: 'render', description: 'Render a scramble as SVG.' },
          args: {
            event: { type: 'positional', description: 'WCA event id.', required: true },
            scramble: { type: 'positional', description: 'Scramble string.', required: true },
            output: { type: 'string', alias: ['o'], description: 'Write SVG to a file.' },
            json: { type: 'boolean', description: 'Print stable JSON output.' },
          },
          run({ args }) {
            const data = renderScrambleSvg(args.event, args.scramble);
            if (args.output !== undefined) {
              writeFileSync(args.output, data.svg);
            }
            if (args.json) {
              writeJson(
                jsonOk('scramble.render', {
                  ...data,
                  output: args.output,
                  svg: args.output === undefined ? data.svg : undefined,
                }),
              );
              return;
            }
            if (args.output === undefined) console.log(data.svg);
          },
        }),
      },
    }),
    solver: defineCommand({
      meta: { name: 'solver', description: 'Run auxiliary solve helpers.' },
      subCommands: {
        events: defineCommand({
          meta: { name: 'events', description: 'List solver assist events.' },
          args: {
            json: { type: 'boolean', description: 'Print stable JSON output.' },
          },
          run({ args }) {
            const data = listSolverEvents();
            if (args.json) {
              writeJson(jsonOk('solver.events', data));
              return;
            }
            for (const event of data.events)
              console.log(`${event.id}\t${event.methods.join(', ')}`);
          },
        }),
        methods: defineCommand({
          meta: { name: 'methods', description: 'List solver methods for an event.' },
          args: {
            event: { type: 'positional', description: 'Solver event id.', required: true },
            json: { type: 'boolean', description: 'Print stable JSON output.' },
          },
          run({ args }) {
            const data = listSolverMethods(args.event);
            if (args.json) {
              writeJson(jsonOk('solver.methods', data));
              return;
            }
            for (const method of data.methods) console.log(method);
          },
        }),
        assist: defineCommand({
          meta: { name: 'assist', description: 'Run solver assist methods for a scramble.' },
          args: {
            event: { type: 'positional', description: 'Solver event id.', required: true },
            scramble: { type: 'positional', description: 'Scramble string.', required: true },
            method: {
              type: 'string',
              description: 'Method to run. Repeat by using a comma-separated list.',
            },
            target: {
              type: 'string',
              description: 'Target to solve. Repeat by using a comma-separated list.',
            },
            'max-depth': { type: 'string', description: 'Maximum search depth.' },
            json: { type: 'boolean', description: 'Print stable JSON output.' },
          },
          run({ args }) {
            const data = runSolverAssist(args.event, args.scramble, splitList(args.method), {
              targets: splitList(args.target),
              maxDepth: args.maxDepth === undefined ? undefined : Number(args.maxDepth),
            });
            if (args.json) {
              writeJson(jsonOk('solver.assist', data));
              return;
            }
            for (const result of data.results) {
              console.log(`${result.method}: ${result.solutions.length} solution(s)`);
              for (const solution of result.solutions) {
                console.log(`  ${solution.targetLabel}: ${solution.solution}`);
              }
            }
          },
        }),
      },
    }),
  },
});

export const runCli = async (rawArgs?: readonly string[]): Promise<void> => {
  const args = [...(rawArgs ?? process.argv.slice(2))];
  const helpCommand = resolveHelpCommand(args);
  if (helpCommand) {
    await showUsage(helpCommand.command, helpCommand.parent);
    return;
  }

  try {
    await runCommand(main, { rawArgs: args });
  } catch (error) {
    if (isCliError(error)) {
      writeJson(jsonError(error.code, error.message, error.hints));
      process.exitCode = error.exitCode;
      return;
    }
    if (isCommandParseError(error)) {
      writeJson(jsonError(error.code, error.message));
      process.exitCode = 2;
      return;
    }
    throw error;
  }
};

export const isCliEntrypoint = (moduleUrl: string, argvEntry = process.argv[1]): boolean => {
  if (argvEntry === undefined) return false;

  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(resolve(argvEntry));
  } catch {
    return false;
  }
};

const splitList = (value: string | undefined): readonly string[] =>
  value === undefined
    ? []
    : value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

const resolveHelpCommand = (
  args: readonly string[],
): { readonly command: CommandDef; readonly parent?: CommandDef } | undefined => {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return { command: main };
  }
  if (!(args.includes('--help') || args.includes('-h'))) return undefined;

  let command: CommandDef = main;
  let parent: CommandDef | undefined;
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') break;
    if (arg.startsWith('-')) continue;

    const next = getSubCommand(command, arg);
    if (!next) break;
    parent = command;
    command = next;
  }

  return { command, parent };
};

const getSubCommand = (command: CommandDef, name: string): CommandDef | undefined => {
  const subCommands = command.subCommands;
  if (!subCommands || typeof subCommands !== 'object') return undefined;
  if ('then' in subCommands) return undefined;
  return subCommands[name] as CommandDef | undefined;
};

const isCommandParseError = (
  error: unknown,
): error is { readonly code: string; readonly message: string } =>
  error instanceof Error &&
  'code' in error &&
  typeof error.code === 'string' &&
  error.code.startsWith('E');

/* v8 ignore next 3 */
if (isCliEntrypoint(import.meta.url)) {
  await runCli();
}
