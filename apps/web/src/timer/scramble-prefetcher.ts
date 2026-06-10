import type { GenerateOptions, ScrambleResult } from '@cubegin/scramble-core';
import { WCA_EVENT_IDS, type WcaEventId } from '@cubegin/shared/wca';
import type { TimerScrambleGenerator } from './scramble-worker-client';

const DEFAULT_MULTI_BLIND_CUBE_COUNT = 3;
const PREFETCH_QUEUE_LIMIT = 1;

const getMultiBlindCubeCount = (eventId: WcaEventId): number | undefined =>
  eventId === '333mbld' ? DEFAULT_MULTI_BLIND_CUBE_COUNT : undefined;

export const getTimerScrambleGenerateOptions = (eventId: WcaEventId): GenerateOptions => ({
  multiBlindCubeCount: getMultiBlindCubeCount(eventId),
});

const scheduleIdleTask = (task: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout: 2_000 });
    return () => window.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(task, 250);
  return () => window.clearTimeout(handle);
};

export interface TimerScramblePrefetcher {
  consume(eventId: WcaEventId): Promise<ScrambleResult>;
  dispose(): void;
  hasReady(eventId: WcaEventId): boolean;
  prefetch(eventId: WcaEventId): Promise<void>;
  prefetchIdleEvents(activeEventId: WcaEventId): void;
}

export const createTimerScramblePrefetcher = (
  generator: TimerScrambleGenerator,
): TimerScramblePrefetcher => {
  const queues = new Map<WcaEventId, ScrambleResult[]>();
  const inFlight = new Map<WcaEventId, Promise<void>>();
  let cancelIdlePrefetch: (() => void) | undefined;

  const getQueue = (eventId: WcaEventId) => {
    const existing = queues.get(eventId);
    if (existing) return existing;

    const queue: ScrambleResult[] = [];
    queues.set(eventId, queue);
    return queue;
  };

  const prefetch = (eventId: WcaEventId) => {
    const queue = getQueue(eventId);
    if (queue.length >= PREFETCH_QUEUE_LIMIT) return Promise.resolve();

    const pending = inFlight.get(eventId);
    if (pending) return pending;

    const request = generator
      .generate(eventId, getTimerScrambleGenerateOptions(eventId))
      .then((result) => {
        const latestQueue = getQueue(eventId);
        if (latestQueue.length < PREFETCH_QUEUE_LIMIT) latestQueue.push(result);
      })
      .catch(() => {
        // Background prefetch should never surface as a user-visible error.
      })
      .finally(() => {
        inFlight.delete(eventId);
      });

    inFlight.set(eventId, request);
    return request;
  };

  const consume = async (eventId: WcaEventId) => {
    const queue = getQueue(eventId);
    const ready = queue.shift();
    if (ready) return ready;

    const pending = inFlight.get(eventId);
    if (pending) {
      await pending;
      const prefetched = queue.shift();
      if (prefetched) return prefetched;
    }

    return generator.generate(eventId, getTimerScrambleGenerateOptions(eventId));
  };

  const prefetchIdleEvents = (activeEventId: WcaEventId) => {
    cancelIdlePrefetch?.();

    const eventIds = WCA_EVENT_IDS.filter((eventId) => eventId !== activeEventId);
    let nextIndex = 0;

    const runNext = () => {
      while (nextIndex < eventIds.length && getQueue(eventIds[nextIndex]).length > 0) {
        nextIndex += 1;
      }
      const nextEventId = eventIds[nextIndex];
      if (!nextEventId) return;

      nextIndex += 1;
      void prefetch(nextEventId).finally(() => {
        cancelIdlePrefetch = scheduleIdleTask(runNext);
      });
    };

    cancelIdlePrefetch = scheduleIdleTask(runNext);
  };

  return {
    consume,
    dispose: () => {
      cancelIdlePrefetch?.();
      cancelIdlePrefetch = undefined;
    },
    hasReady: (eventId) => getQueue(eventId).length > 0,
    prefetch,
    prefetchIdleEvents,
  };
};
