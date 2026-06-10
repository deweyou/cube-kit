import { describe, expect, it, vi } from 'vitest';
import type { ScrambleResult } from '@cubegin/scramble-core';
import { createTimerScramblePrefetcher } from './scramble-prefetcher';
import type { TimerScrambleGenerator } from './scramble-worker-client';

const result = (eventId: ScrambleResult['eventId'], scramble: string): ScrambleResult => ({
  eventId,
  scramble,
});

describe('createTimerScramblePrefetcher', () => {
  it('consumes prefetched scrambles once and never reuses displayed scrambles', async () => {
    const generate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockResolvedValueOnce(result('333', 'prefetched'))
      .mockResolvedValueOnce(result('333', 'direct'));
    const prefetcher = createTimerScramblePrefetcher({ generate });

    await prefetcher.prefetch('333');

    expect(prefetcher.hasReady('333')).toBe(true);
    await expect(prefetcher.consume('333')).resolves.toEqual(result('333', 'prefetched'));
    expect(prefetcher.hasReady('333')).toBe(false);
    await expect(prefetcher.consume('333')).resolves.toEqual(result('333', 'direct'));
  });

  it('waits for an in-flight prefetch before generating directly', async () => {
    let resolvePrefetch: (value: ScrambleResult) => void = () => {};
    const generate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockImplementationOnce(
        () =>
          new Promise<ScrambleResult>((resolve) => {
            resolvePrefetch = resolve;
          }),
      );
    const prefetcher = createTimerScramblePrefetcher({ generate });

    void prefetcher.prefetch('444');
    const consumed = prefetcher.consume('444');
    resolvePrefetch(result('444', 'slow-prefetch'));

    await expect(consumed).resolves.toEqual(result('444', 'slow-prefetch'));
    expect(generate).toHaveBeenCalledOnce();
  });

  it('passes multi-blind cube count through generator options', async () => {
    const generate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockResolvedValue(result('333mbld', 'multi'));
    const prefetcher = createTimerScramblePrefetcher({ generate });

    await prefetcher.consume('333mbld');

    expect(generate).toHaveBeenCalledWith('333mbld', { multiBlindCubeCount: 3 });
  });
});
