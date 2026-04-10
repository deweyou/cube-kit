/**
 * Single typed entry point to `cstimer_module`.
 *
 * Every other file in this package MUST go through these wrappers instead of
 * importing `cstimer_module` directly. Keeping the upstream surface area in
 * one place means a single choke point for error handling, type refinement,
 * and future upgrades.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cstimer_module ships CJS with a minimal .d.ts; import works at runtime.
import cstimer from 'cstimer_module';

interface CstimerModule {
  getScrambleTypes: () => string[];
  getScramble: (type: string, length?: number, ...args: unknown[]) => string;
  setSeed: (seed: string) => void;
  getImage: (scramble: string, type?: string) => string;
}

const mod = cstimer as unknown as CstimerModule;

export const rawGetScramble = (type: string, length = 0): string =>
  mod.getScramble(type, length);

export const rawGetImage = (scramble: string, type: string): string =>
  mod.getImage(scramble, type);

export const rawSetSeed = (seed: string): void => {
  mod.setSeed(seed);
};

export const rawGetScrambleTypes = (): string[] => mod.getScrambleTypes();
