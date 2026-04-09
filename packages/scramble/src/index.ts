export type { WcaEvent, ImageOptions, ColorScheme, CubeState, VisualizerMode } from './types';
export { DEFAULT_COLOR_SCHEME } from './types';

import type { WcaEvent, ImageOptions } from './types';

/**
 * Pre-initializes precomputation tables for complex puzzles (333, 444).
 * Call this at app startup to avoid latency on the first generateScramble call.
 */
export const warmup = async (): Promise<void> => {
  const { warmupGenerators } = await import('./generators/index');
  await warmupGenerators();
};

/**
 * Generate a WCA-compliant scramble string for the given event.
 */
export const generateScramble = async (event: WcaEvent): Promise<string> => {
  const { generate } = await import('./generators/index');
  return generate(event);
};

/**
 * Generate an SVG string visualizing the cube state after applying the scramble.
 * Returns a complete `<svg>` element as a string.
 */
export const generateScrambleImage = async (
  event: WcaEvent,
  scramble: string,
  options?: ImageOptions,
): Promise<string> => {
  const { generateImage } = await import('./visualizer/index');
  return generateImage(event, scramble, options);
};
