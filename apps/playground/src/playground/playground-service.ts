import { createDefaultScrambleGenerator, type RandomSource } from '@cubekit/scramble-core';
import { renderScrambleImage } from '@cubekit/scramble-image';
import { createSeededRandomSource } from './seeded-random';
import type {
  PlaygroundGenerateInput,
  PlaygroundGenerateResult,
  PlaygroundManualRenderInput,
  PlaygroundManualRenderResult,
  PlaygroundRenderDiagnostics,
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

      const scrambles = results.map((result, index) => ({
        id: `${result.eventId}-${index + 1}`,
        eventId: result.eventId,
        scramble: result.scramble,
      }));
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
