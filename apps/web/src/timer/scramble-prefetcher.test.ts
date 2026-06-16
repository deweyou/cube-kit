import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScrambleResult } from '@cubegin/scramble-core';
import { WCA_EVENT_IDS } from '@cubegin/shared/wca';
import { createTimerScramblePrefetcher } from './scramble-prefetcher';
import type { TimerScrambleGenerator } from './scramble-worker-client';

const result = (eventId: ScrambleResult['eventId'], scramble: string): ScrambleResult => ({
  eventId,
  scramble,
});

type GenerateMockCall = Parameters<TimerScrambleGenerator['generate']>;

afterEach(() => {
  vi.unstubAllGlobals();
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
    const generate = vi.fn<TimerScrambleGenerator['generate']>().mockImplementationOnce(
      () =>
        new Promise<ScrambleResult>((resolve) => {
          resolvePrefetch = resolve;
        }),
    );
    const prefetcher = createTimerScramblePrefetcher({ generate });

    const prefetch = prefetcher.prefetch('444');
    const consumed = prefetcher.consume('444');
    resolvePrefetch(result('444', 'slow-prefetch'));

    await prefetch;
    await expect(consumed).resolves.toEqual(result('444', 'slow-prefetch'));
    expect(generate).toHaveBeenCalledOnce();
  });

  it('passes multi-blind cube count through generator options', async () => {
    const generate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockResolvedValue(result('333mbld', 'multi'));
    const prefetcher = createTimerScramblePrefetcher({ generate });

    await prefetcher.consume('333mbld', { multiBlindCubeCount: 7 });

    expect(generate).toHaveBeenCalledWith('333mbld', { multiBlindCubeCount: 7 });
  });

  it('does not reuse a ready multi-blind scramble generated for a different cube count', async () => {
    const generate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockResolvedValueOnce(result('333mbld', 'three-cubes'))
      .mockResolvedValueOnce(result('333mbld', 'five-cubes'));
    const prefetcher = createTimerScramblePrefetcher({ generate });

    await prefetcher.prefetch('333mbld', { multiBlindCubeCount: 3 });

    expect(prefetcher.hasReady('333mbld', { multiBlindCubeCount: 3 })).toBe(true);
    expect(prefetcher.hasReady('333mbld', { multiBlindCubeCount: 5 })).toBe(false);
    await expect(prefetcher.consume('333mbld', { multiBlindCubeCount: 5 })).resolves.toEqual(
      result('333mbld', 'five-cubes'),
    );
  });

  it('prefetches warm event switches with the background generator', async () => {
    const foregroundGenerate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockResolvedValue(result('333', 'foreground'));
    const backgroundGenerate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockImplementation((eventId: GenerateMockCall[0]) =>
        Promise.resolve({
          eventId,
          scramble: `warm-${eventId}`,
        }),
      );
    const backgroundDispose = vi.fn();
    const prefetcher = createTimerScramblePrefetcher(
      { generate: foregroundGenerate },
      { backgroundGenerator: { dispose: backgroundDispose, generate: backgroundGenerate } },
    );

    const warmPrefetch = prefetcher.prefetchWarmEvents('333');
    await vi.waitFor(() =>
      expect(backgroundGenerate).toHaveBeenCalledTimes(WCA_EVENT_IDS.length - 1),
    );
    await warmPrefetch;

    const warmEventIds = WCA_EVENT_IDS.filter((eventId) => eventId !== '333');
    expect(foregroundGenerate).not.toHaveBeenCalled();
    expect(backgroundGenerate.mock.calls.map(([eventId]: GenerateMockCall) => eventId)).toEqual(
      warmEventIds,
    );
    expect(backgroundGenerate).toHaveBeenCalledWith('333mbld', { multiBlindCubeCount: 3 });
    await expect(prefetcher.consume('444')).resolves.toEqual(result('444', 'warm-444'));
    expect(foregroundGenerate).not.toHaveBeenCalled();
    expect(backgroundDispose).toHaveBeenCalledOnce();
  });

  it('drops a warm result if that event becomes active before it resolves', async () => {
    const foregroundGenerate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockResolvedValue(result('444', 'direct-444'));
    const backgroundGenerate = vi
      .fn<TimerScrambleGenerator['generate']>()
      .mockImplementation((eventId: GenerateMockCall[0]) =>
        Promise.resolve({
          eventId,
          scramble: `warm-${eventId}`,
        }),
      );
    const prefetcher = createTimerScramblePrefetcher(
      { generate: foregroundGenerate },
      {
        backgroundGenerator: { generate: backgroundGenerate },
        shouldKeepWarmResult: (eventId) => eventId !== '444',
      },
    );

    await prefetcher.prefetchWarmEvents('333');

    await expect(prefetcher.consume('444')).resolves.toEqual(result('444', 'direct-444'));
    expect(foregroundGenerate).toHaveBeenCalledWith('444', { multiBlindCubeCount: undefined });
  });
});
