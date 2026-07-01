import {
  createDefaultScrambleGenerator,
  type GenerateOptions,
  type RandomSource,
  type ScrambleGenerator,
} from '@cubegin/scramble-core';
import { renderScrambleImage } from '@cubegin/scramble-image';
import type { EventId } from '@cubegin/shared/events';
import {
  solvePuzzleAssist as solvePuzzleAssistCore,
  solvePuzzleFull as solvePuzzleFullCore,
  type PuzzleAssistEventId,
  type PuzzleFullEventId,
} from '@cubegin/solver';
import { createSeededRandomSource } from './seeded-random';
import type {
  PlaygroundGenerateInput,
  PlaygroundGenerateResult,
  PlaygroundImageView,
  PlaygroundFullSolverInput,
  PlaygroundFullSolverResult,
  PlaygroundManualRenderInput,
  PlaygroundManualRenderResult,
  PlaygroundPlayerScrambleResult,
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
  readonly generator?: ScrambleGenerator;
}

export const createPlaygroundService = ({
  seed,
  now = () => performance.now(),
  random,
  generator: providedGenerator,
}: PlaygroundServiceOptions = {}) => {
  const randomSource = random ?? createSeededRandomSource(seed ?? Date.now());
  const generator = providedGenerator ?? createDefaultScrambleGenerator({ random: randomSource });
  const generateSingleScramble = async <TEventId extends EventId>(
    eventId: TEventId,
    options?: GenerateOptions,
  ): Promise<{
    readonly eventId: TEventId;
    readonly scramble: string;
    readonly error: string | undefined;
  }> => {
    try {
      const [result] = await generator.generateBatch(eventId, 1, options);

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
  };

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
        ? renderScrambleImage(selectedScramble.eventId, selectedScramble.scramble, {
            view: input.imageView,
          })
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
        const svg = renderScrambleImage(input.eventId, input.scramble, { view: input.imageView });
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
      eventId: PuzzleAssistEventId | PuzzleFullEventId,
    ): Promise<PlaygroundSolverScrambleResult> {
      return await generateSingleScramble(eventId);
    },
    async generatePlayerScramble(
      eventId: EventId,
      imageView: PlaygroundImageView = 'net',
    ): Promise<PlaygroundPlayerScrambleResult> {
      const generated = await generateSingleScramble(
        eventId,
        eventId === '333mbld' ? { multiBlindCubeCount: 1 } : undefined,
      );
      const renderStart = now();

      if (generated.error) {
        const renderEnd = now();

        return {
          ...generated,
          svg: '',
          render: createRenderDiagnostics({
            durationMs: renderEnd - renderStart,
            scramble: generated.scramble,
            svg: '',
          }),
        };
      }

      try {
        const svg = renderScrambleImage(generated.eventId, generated.scramble, {
          view: imageView,
        });
        const renderEnd = now();

        return {
          ...generated,
          svg,
          render: createRenderDiagnostics({
            durationMs: renderEnd - renderStart,
            scramble: generated.scramble,
            svg,
          }),
        };
      } catch (error) {
        const renderEnd = now();

        return {
          ...generated,
          svg: '',
          render: createRenderDiagnostics({
            durationMs: renderEnd - renderStart,
            scramble: generated.scramble,
            svg: '',
          }),
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
    solvePuzzleFull(input: PlaygroundFullSolverInput): PlaygroundFullSolverResult {
      const solveStart = now();

      try {
        const result = solvePuzzleFullCore(input.eventId, input.scramble);
        const solveEnd = now();

        return {
          result,
          diagnostics: createSolverDiagnostics({
            durationMs: solveEnd - solveStart,
            resultCount: 1,
          }),
          error: undefined,
        };
      } catch (error) {
        const solveEnd = now();

        return {
          result: undefined,
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
