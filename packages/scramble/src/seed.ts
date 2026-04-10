import { rawSetSeed } from './cstimer.js';

/**
 * Seed `cstimer_module`'s internal CSPRNG so subsequent {@link getScramble}
 * calls are reproducible.
 *
 * `cstimer_module` accepts any string; non-string values will be coerced via
 * `Object.prototype.toString` by the upstream. We take only strings at the
 * type level to keep callers honest.
 */
export const setSeed = (seed: string): void => {
  rawSetSeed(seed);
};
