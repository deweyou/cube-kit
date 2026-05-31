import { createDefaultScrambleGenerator, type RandomSource } from '@cubekit/scramble-core';
import { renderScrambleImage } from '@cubekit/scramble-image';
import {
  solvePuzzleAssist as solvePuzzleAssistCore,
  type PuzzleAssistEventId,
} from '@cubekit/solver';
import { createSeededRandomSource } from './seeded-random';
import type {
  PlaygroundGenerateInput,
  PlaygroundGenerateResult,
  PlaygroundManualRenderInput,
  PlaygroundManualRenderResult,
  PlaygroundRenderDiagnostics,
  PlaygroundScramble,
  PlaygroundSolverInput,
  PlaygroundSolverResult,
  PlaygroundSolverScrambleResult,
} from './types';

export interface PlaygroundServiceOptions {
  readonly seed?: number;
  readonly now?: () => number;
  readonly random?: RandomSource;
}

export const createPlaygroundService = ({
  seed,
  now = () => performance.now(),
  random,
}: PlaygroundServiceOptions = {}) => {
  const randomSource = random ?? createSeededRandomSource(seed ?? Date.now());
  const generator = createDefaultScrambleGenerator({ random: randomSource });

  return {
    async generate(input: PlaygroundGenerateInput): Promise<PlaygroundGenerateResult> {
      const generationStart = now();
      const results = await generator.generateBatch(input.eventId, input.count, {
        multiBlindCubeCount: input.multiBlindCubeCount,
      });
      const generationEnd = now();

      const scrambles = results.flatMap((result, index) =>
        toPlaygroundScrambles({
          eventId: result.eventId,
          scramble: result.scramble,
          index,
        }),
      );
      const selectedScramble = scrambles[0];
      const renderStart = now();
      const svg = selectedScramble
        ? renderScrambleImage(selectedScramble.eventId, selectedScramble.scramble)
        : '';
      const renderEnd = now();

      return {
        scrambles,
        selectedScramble,
        svg,
        generation: {
          durationMs: generationEnd - generationStart,
          count: scrambles.length,
        },
        render: createRenderDiagnostics({
          durationMs: renderEnd - renderStart,
          scramble: selectedScramble?.scramble ?? '',
          svg,
        }),
      };
    },
    renderManual(input: PlaygroundManualRenderInput): PlaygroundManualRenderResult {
      const renderStart = now();

      try {
        const svg = renderScrambleImage(input.eventId, input.scramble);
        const renderEnd = now();

        return {
          svg,
          render: createRenderDiagnostics({
            durationMs: renderEnd - renderStart,
            scramble: input.scramble,
            svg,
          }),
          error: undefined,
        };
      } catch (error) {
        const renderEnd = now();

        return {
          svg: '',
          render: createRenderDiagnostics({
            durationMs: renderEnd - renderStart,
            scramble: input.scramble,
            svg: '',
          }),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    async generateSolverScramble(
      eventId: PuzzleAssistEventId,
    ): Promise<PlaygroundSolverScrambleResult> {
      try {
        const [result] = await generator.generateBatch(eventId, 1);

        return {
          eventId,
          scramble: result?.scramble ?? '',
          error: undefined,
        };
      } catch (error) {
        return {
          eventId,
          scramble: '',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    solvePuzzleAssist(input: PlaygroundSolverInput): PlaygroundSolverResult {
      const solveStart = now();

      try {
        const results = solvePuzzleAssistCore(input.eventId, input.methods, input.scramble, {
          targets: input.targets && input.targets.length > 0 ? input.targets : undefined,
        });
        const solveEnd = now();

        return {
          results,
          diagnostics: createSolverDiagnostics({
            durationMs: solveEnd - solveStart,
            resultCount: countSolutions(results),
          }),
          error: undefined,
        };
      } catch (error) {
        const solveEnd = now();

        return {
          results: [],
          diagnostics: createSolverDiagnostics({
            durationMs: solveEnd - solveStart,
            resultCount: 0,
          }),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
};

const createRenderDiagnostics = ({
  durationMs,
  scramble,
  svg,
}: {
  readonly durationMs: number;
  readonly scramble: string;
  readonly svg: string;
}): PlaygroundRenderDiagnostics => ({
  durationMs,
  scrambleLength: scramble.length,
  svgBytes: new TextEncoder().encode(svg).length,
});

const createSolverDiagnostics = ({
  durationMs,
  resultCount,
}: {
  readonly durationMs: number;
  readonly resultCount: number;
}) => ({
  durationMs,
  resultCount,
});

const countSolutions = (results: readonly { readonly solutions: readonly unknown[] }[]): number =>
  results.reduce((total, result) => total + result.solutions.length, 0);

const toPlaygroundScrambles = ({
  eventId,
  scramble,
  index,
}: {
  readonly eventId: PlaygroundScramble['eventId'];
  readonly scramble: string;
  readonly index: number;
}): PlaygroundScramble[] => {
  if (eventId !== '333mbld') {
    return [
      {
        id: `${eventId}-${index + 1}`,
        eventId,
        scramble,
      },
    ];
  }

  return scramble
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, cubeIndex) => ({
      id: `${eventId}-${index + 1}-${cubeIndex + 1}`,
      eventId,
      scramble: line,
    }));
};
